// ============================================
// src/controllers/callback.controller.ts
// ============================================
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PrismaClient, AudioStatus } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config/env';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class CallbackController {
  async handleTranscriptionCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Verificar secret del callback
      const callbackSecret = req.headers['x-callback-secret'] || req.body.callback_secret;

      if (callbackSecret !== config.callback.secret) {
        throw new AppError('Callback no autorizado', StatusCodes.UNAUTHORIZED);
      }

      const {
        audio_id,
        status,
        transcription_text,
        error_message,
        duration,
      } = req.body;

      if (!audio_id) {
        throw new AppError('audio_id es requerido', StatusCodes.BAD_REQUEST);
      }

      // Buscar el audio
      const audio = await prisma.audio.findUnique({
        where: { id: audio_id },
      });

      if (!audio) {
        throw new AppError('Audio no encontrado', StatusCodes.NOT_FOUND);
      }

      // Determinar el nuevo estado
      let newStatus: AudioStatus;
      if (status === 'completed' || status === 'done') {
        newStatus = AudioStatus.DONE;
      } else if (status === 'error' || status === 'failed') {
        newStatus = AudioStatus.ERROR;
      } else {
        newStatus = AudioStatus.PROCESSING;
      }

      // Actualizar el registro
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === AudioStatus.DONE) {
        updateData.transcriptionText = transcription_text;
        updateData.processingFinished = new Date();
        if (duration) updateData.duration = parseFloat(duration);
      }

      if (newStatus === AudioStatus.ERROR) {
        updateData.errorMessage = error_message || 'Error desconocido en la transcripción';
        updateData.processingFinished = new Date();
      }

      await prisma.audio.update({
        where: { id: audio_id },
        data: updateData,
      });

      logger.info('Callback de transcripción procesado', {
        audioId: audio_id,
        status: newStatus,
        hasTranscription: !!transcription_text,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Callback procesado exitosamente',
        audio_id,
        status: newStatus,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CallbackController();