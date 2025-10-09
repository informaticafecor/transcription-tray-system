// ============================================
// src/controllers/audio.controller.ts
// ============================================
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
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        throw new AppError('No se proporcionó ningún archivo', StatusCodes.BAD_REQUEST);
      }

      // Verificar cuota diaria
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let quota = await prisma.uploadQuota.findFirst({
        where: {
          userId,
          date: today,
        },
      });

      if (!quota) {
        quota = await prisma.uploadQuota.create({
          data: {
            userId,
            date: today,
            count: 0,
          },
        });
      }

      if (quota.count >= config.limits.maxDailyUploads) {
        throw new AppError(
          `Límite diario alcanzado (${config.limits.maxDailyUploads} archivos)`,
          StatusCodes.TOO_MANY_REQUESTS
        );
      }

      // Subir a Google Drive
      const timestamp = Date.now();
      const filename = `audio_${userId}_${timestamp}_${file.originalname}`;
      
      const { fileId, webViewLink } = await driveService.uploadFile(
        file.buffer,
        filename,
        file.mimetype
      );

      // Crear registro en base de datos
      const audio = await prisma.audio.create({
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

      // Actualizar cuota
      await prisma.uploadQuota.update({
        where: { id: quota.id },
        data: { count: quota.count + 1 },
      });

      // Encolar para procesamiento
      await queueService.addAudioJob({
        audioId: audio.id,
        userId,
        driveFileId: fileId,
        driveFileUrl: webViewLink,
        filename,
      });

      logger.info('Audio subido y encolado exitosamente', {
        audioId: audio.id,
        userId,
        filename,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Audio subido exitosamente y encolado para transcripción',
        data: {
          id: audio.id,
          filename: audio.originalFilename,
          status: audio.status,
          createdAt: audio.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

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

      // Eliminar de Drive si existe
      if (audio.driveFileId) {
        try {
          await driveService.deleteFile(audio.driveFileId);
        } catch (error) {
          logger.warn('Error al eliminar archivo de Drive', { error });
        }
      }

      // Remover de cola si está pendiente
      await queueService.removeJob(id);

      // Eliminar de base de datos
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
}

export default new AudioController();