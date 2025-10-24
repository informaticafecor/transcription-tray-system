// ============================================
// src/workers/audio.worker.ts - ACTUALIZADO
// ============================================
import { Worker, Job } from 'bullmq';
import { PrismaClient, AudioStatus } from '@prisma/client';
import { config } from '../config/env';
import logger from '../utils/logger';
import transcriptorService from '../services/transcriptor.service';
import { AudioJobData } from '../services/queue.service';

const prisma = new PrismaClient();

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

const worker = new Worker<AudioJobData>(
  config.queue.name,
  async (job: Job<AudioJobData>) => {
    const { audioId, userId, driveFileId, driveFileUrl, filename } = job.data; // driveFileId es lo importante
    
    logger.info('Procesando audio desde worker', { jobId: job.id, audioId });

    try {
      // Actualizar estado a PROCESSING
      await prisma.audio.update({
        where: { id: audioId },
        data: {
          status: AudioStatus.PROCESSING,
          processingStarted: new Date(),
        },
      });

      // Construir callback URL
      const callbackUrl = `${config.frontend.baseUrl.replace(/:\d+$/, ':3000')}${config.callback.path}`;

      // ========== ENVIAR file_id EN LUGAR DE file_url ==========
      const response = await transcriptorService.requestTranscription({
        audioId,
        userId,
        driveFileId,    // CAMBIO: Enviamos el ID del archivo
        driveFileUrl,   // Lo enviamos también por compatibilidad (opcional)
        filename,
        callbackUrl,
      });
      // =========================================================

      if (!response.success) {
        throw new Error(response.message || 'Error al solicitar transcripción');
      }

      logger.info('Solicitud de transcripción enviada exitosamente', {
        audioId,
        transcriptionId: response.transcriptionId,
      });

      // Actualizar progreso del job
      await job.updateProgress(100);

      return {
        success: true,
        audioId,
        transcriptionId: response.transcriptionId,
      };
    } catch (error: any) {
      logger.error('Error en worker al procesar audio:', {
        audioId,
        error: error.message,
      });

      // Actualizar estado a ERROR
      await prisma.audio.update({
        where: { id: audioId },
        data: {
          status: AudioStatus.ERROR,
          errorMessage: error.message,
          processingFinished: new Date(),
        },
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: config.queue.concurrency,
  }
);

// Event listeners (sin cambios)
worker.on('completed', (job) => {
  logger.info('Worker completó el job exitosamente', {
    jobId: job.id,
    audioId: job.data.audioId,
  });
});

worker.on('failed', (job, error) => {
  logger.error('Worker falló al procesar job', {
    jobId: job?.id,
    audioId: job?.data?.audioId,
    error: error.message,
  });
});

worker.on('error', (error) => {
  logger.error('Error en el worker:', error);
});

// Manejo de señales de cierre
process.on('SIGTERM', async () => {
  logger.info('Recibida señal SIGTERM, cerrando worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Recibida señal SIGINT, cerrando worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info('Audio worker iniciado', {
  queueName: config.queue.name,
  concurrency: config.queue.concurrency,
});

export default worker;