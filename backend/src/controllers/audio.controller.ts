// src/controllers/audio.controller.ts - CORREGIDO COMPLETO
import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient, AudioStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import driveService from '../services/drive.service';
import queueService from '../services/queue.service';
import logger from '../utils/logger';
import { config } from '../config/env';

const prisma = new PrismaClient();

export class AudioController {
  async uploadAudio(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('=== INICIO UPLOAD AUDIO ===');
      const userId = req.user!.id;
      const file = req.file;

      logger.info('Usuario:', { userId });
      logger.info('Archivo recibido:', { 
        exists: !!file,
        name: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype
      });

      if (!file) {
        logger.error('No se recibió ningún archivo');
        throw new AppError('No se proporcionó ningún archivo', StatusCodes.BAD_REQUEST);
      }

      // Verificar cuota diaria
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let quota = await prisma.uploadQuota.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (!quota) {
        try {
          quota = await prisma.uploadQuota.create({
            data: {
              userId,
              date: today,
              count: 0,
            },
          });
          logger.info('Cuota creada para usuario');
        } catch (createError: any) {
          logger.warn('Error al crear cuota, buscando de nuevo...', { error: createError.message });
          quota = await prisma.uploadQuota.findFirst({
            where: {
              userId,
              date: {
                gte: today,
                lt: tomorrow
              }
            }
          });
          if (!quota) {
            logger.error('No se pudo crear ni encontrar la cuota');
            throw new AppError('Error al verificar cuota diaria', StatusCodes.INTERNAL_SERVER_ERROR);
          }
        }
      }

      logger.info('Cuota actual:', { 
        quotaId: quota.id,
        count: quota.count, 
        limit: config.limits.maxDailyUploads
      });

      if (quota.count >= config.limits.maxDailyUploads) {
        logger.warn('Límite diario alcanzado');
        throw new AppError(
          `Límite diario alcanzado (${config.limits.maxDailyUploads} archivos)`,
          StatusCodes.TOO_MANY_REQUESTS
        );
      }

      // Subir a Google Drive
      const timestamp = Date.now();
      const filename = `audio_${userId}_${timestamp}_${file.originalname}`;
      logger.info('Subiendo a Google Drive...', { filename });

      let driveResult;
      try {
        driveResult = await driveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype
        );
        logger.info('Archivo subido a Drive', driveResult);
      } catch (driveError: any) {
        logger.error('Error al subir a Drive:', { error: driveError.message });
        throw new AppError('Error al subir archivo a Google Drive', StatusCodes.INTERNAL_SERVER_ERROR);
      }

      const { fileId, webViewLink } = driveResult;

      // Usar transacción
      const result = await prisma.$transaction(async (tx) => {
        const audio = await tx.audio.create({
          data: {
            userId,
            filename,
            originalFilename: file.originalname,
            driveFileId: fileId,
            driveFileUrl: webViewLink,
            status: AudioStatus.PENDING,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        });

        await tx.uploadQuota.update({
          where: { id: quota!.id },
          data: { 
            count: quota!.count + 1
          },
        });

        return audio;
      });

      logger.info('Registro creado en BD y cuota actualizada', { audioId: result.id });

      // Encolar
      try {
        await queueService.addAudioJob({
          audioId: result.id,
          userId,
          driveFileId: fileId,
          driveFileUrl: webViewLink,
          filename,
        });
        logger.info('Audio encolado para procesamiento');
      } catch (queueError: any) {
        logger.error('Error al encolar audio:', { error: queueError.message });
      }

      logger.info('=== FIN UPLOAD AUDIO EXITOSO ===');

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Audio subido exitosamente y encolado para transcripción',
        data: {
          id: result.id,
          filename: result.originalFilename,
          status: result.status,
          createdAt: result.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('=== ERROR EN UPLOAD AUDIO ===', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      next(error);
    }
  }

  // ========== MÉTODO CORREGIDO: getUserAudios ==========
  async getUserAudios(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, limit = 50, offset = 0 } = req.query;

      const where: any = { userId };
      if (status) {
        where.status = status as AudioStatus;
      }

      const [audios, total] = await Promise.all([
        prisma.audio.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            status: true,
            transcriptionText: true,
            
            // ========== AGREGAR ESTOS DOS CAMPOS ==========
            driveTranscriptionFileId: true,
            driveTranscriptionFileUrl: true,
            // ==============================================
            
            errorMessage: true,
            fileSize: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
            processingStarted: true,
            processingFinished: true,
          },
        }),
        prisma.audio.count({ where }),
      ]);

      res.json({
        success: true,
        data: audios,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ========== MÉTODO CORREGIDO: getAllAudios ==========
  async getAllAudios(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, userId, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      if (status) where.status = status as AudioStatus;
      if (userId) where.userId = userId as string;

      const [audios, total] = await Promise.all([
        prisma.audio.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            status: true,
            transcriptionText: true,
            
            // ========== AGREGAR ESTOS DOS CAMPOS ==========
            driveTranscriptionFileId: true,
            driveTranscriptionFileUrl: true,
            // ==============================================
            
            errorMessage: true,
            fileSize: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
            processingStarted: true,
            processingFinished: true,
            userId: true, // Para admin
          },
        }),
        prisma.audio.count({ where }),
      ]);

      res.json({
        success: true,
        data: audios,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAudioById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const audio = await prisma.audio.findUnique({
        where: { id },
      });

      if (!audio) {
        throw new AppError('Audio no encontrado', StatusCodes.NOT_FOUND);
      }

      if (!isAdmin && audio.userId !== userId) {
        throw new AppError('No tienes permiso para ver este audio', StatusCodes.FORBIDDEN);
      }

      res.json({
        success: true,
        data: audio,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAudio(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const audio = await prisma.audio.findUnique({
        where: { id },
      });

      if (!audio) {
        throw new AppError('Audio no encontrado', StatusCodes.NOT_FOUND);
      }

      if (!isAdmin && audio.userId !== userId) {
        throw new AppError('No tienes permiso para eliminar este audio', StatusCodes.FORBIDDEN);
      }

      if (audio.driveFileId) {
        try {
          await driveService.deleteFile(audio.driveFileId);
        } catch (error) {
          logger.warn('Error al eliminar archivo de Drive', { error });
        }
      }

      await queueService.removeJob(id);
      await prisma.audio.delete({
        where: { id },
      });

      logger.info('Audio eliminado exitosamente', { audioId: id, userId });

      res.json({
        success: true,
        message: 'Audio eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const where: any = isAdmin ? {} : { userId };

      const [total, pending, processing, done, error] = await Promise.all([
        prisma.audio.count({ where }),
        prisma.audio.count({ where: { ...where, status: AudioStatus.PENDING } }),
        prisma.audio.count({ where: { ...where, status: AudioStatus.PROCESSING } }),
        prisma.audio.count({ where: { ...where, status: AudioStatus.DONE } }),
        prisma.audio.count({ where: { ...where, status: AudioStatus.ERROR } }),
      ]);

      const queueMetrics = await queueService.getQueueMetrics();

      res.json({
        success: true,
        data: {
          audios: { total, pending, processing, done, error },
          queue: queueMetrics,
        },
      });
    } catch (error) {
      next(error);
    }
  }

/**
 * Descarga el archivo Word de transcripción directamente
 */
async downloadTranscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    // Buscar el audio
    const audio = await prisma.audio.findUnique({
      where: { id },
    });

    // Validaciones
    if (!audio) {
      throw new AppError('Audio no encontrado', StatusCodes.NOT_FOUND);
    }

    if (!isAdmin && audio.userId !== userId) {
      throw new AppError(
        'No tienes permiso para descargar este archivo',
        StatusCodes.FORBIDDEN
      );
    }

    if (!audio.driveTranscriptionFileId) {
      throw new AppError(
        'El archivo de transcripción no está disponible',
        StatusCodes.NOT_FOUND
      );
    }

    logger.info('Descargando transcripción desde Drive', {
      audioId: id,
      fileId: audio.driveTranscriptionFileId,
    });

    // Descargar archivo de Drive
    const fileBuffer = await driveService.downloadFileBuffer(
      audio.driveTranscriptionFileId
    );

    // Preparar nombre del archivo
    const filename = `${audio.originalFilename.replace(/\.[^/.]+$/, '')}_transcription.docx`;

    // Configurar headers para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    res.setHeader('Content-Length', fileBuffer.length);

    // Enviar el archivo
    res.send(fileBuffer);

    logger.info('Transcripción descargada exitosamente', {
      audioId: id,
      filename,
    });
  } catch (error: any) {
    logger.error('Error al descargar transcripción:', {
      audioId: req.params.id,
      error: error.message,
    });
    next(error);
  }
}




}

export default new AudioController();