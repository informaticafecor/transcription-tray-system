// ============================================
// src/controllers/callback.controller.ts - COMPLETO ACTUALIZADO
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

      // ========== EXTRAER DATOS DEL BODY ==========
      const {
        audio_id,
        status,
        transcription_text,
        transcription_file_id,    // ✅ ID del Word en Drive
        transcription_file_url,   // ✅ URL del Word en Drive
        error_message,
        duration,
      } = req.body;
      // ============================================

      // ========== LOG TEMPORAL PARA DEBUG ==========
      logger.info('📥 Datos recibidos en callback:', {
        audio_id,
        status,
        hasText: !!transcription_text,
        textLength: transcription_text?.length || 0,
        hasFileId: !!transcription_file_id,
        hasFileUrl: !!transcription_file_url,
        transcription_file_id,
        transcription_file_url,
      });
      // ============================================

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

      // ========== PREPARAR DATOS PARA ACTUALIZAR ==========
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Si completó exitosamente
      if (newStatus === AudioStatus.DONE) {
        updateData.transcriptionText = transcription_text;
        updateData.processingFinished = new Date();
        
        // ========== GUARDAR CAMPOS DEL WORD (camelCase) ==========
        if (transcription_file_id) {
          updateData.driveTranscriptionFileId = transcription_file_id;
        }
        if (transcription_file_url) {
          updateData.driveTranscriptionFileUrl = transcription_file_url;
        }
        // =========================================================
        
        if (duration) {
          updateData.duration = parseFloat(duration);
        }
      }

      // Si hubo error
      if (newStatus === AudioStatus.ERROR) {
        updateData.errorMessage = error_message || 'Error desconocido en la transcripción';
        updateData.processingFinished = new Date();
      }
      // ====================================================

      // Actualizar en la base de datos
      await prisma.audio.update({
        where: { id: audio_id },
        data: updateData,
      });

      logger.info('Callback de transcripción procesado', {
        audioId: audio_id,
        status: newStatus,
        hasTranscription: !!transcription_text,
        hasTranscriptionFile: !!transcription_file_id,
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