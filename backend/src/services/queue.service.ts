// ============================================
// src/services/queue.service.ts
// ============================================
import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface AudioJobData {
  audioId: string;
  userId: string;
  driveFileId: string;
  driveFileUrl: string;
  filename: string;
}

class QueueService {
  public queue: Queue<AudioJobData>;
  private queueEvents: QueueEvents;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    this.queue = new Queue<AudioJobData>(config.queue.name, {
      connection,
      defaultJobOptions: {
        attempts: config.queue.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.queue.retryDelay,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 50,
          age: 7 * 24 * 3600,
        },
      },
    });

    this.queueEvents = new QueueEvents(config.queue.name, { connection });
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.info('Job completado exitosamente', { jobId });
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('Job falló', { jobId, failedReason });
    });
  }

  async addAudioJob(data: AudioJobData): Promise<string> {
    try {
      const job = await this.queue.add('process-audio', data, {
        jobId: data.audioId,
      });

      logger.info('Audio agregado a la cola', {
        jobId: job.id,
        audioId: data.audioId,
      });

      return job.id!;
    } catch (error: any) {
      logger.error('Error al agregar job a la cola:', error);
      throw new Error(`Error al encolar audio: ${error.message}`);
    }
  }

  async getQueueMetrics(): Promise<any> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return { waiting, active, completed, failed, delayed };
    } catch (error: any) {
      logger.error('Error al obtener métricas de la cola:', error);
      return null;
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info('Job removido de la cola', { jobId });
      }
    } catch (error: any) {
      logger.error('Error al remover job:', error);
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
  }
}

export default new QueueService();