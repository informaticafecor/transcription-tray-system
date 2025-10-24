// ============================================
// src/services/transcriptor.service.ts - ACTUALIZADO
// ============================================
import axios from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface TranscriptionRequest {
  audioId: string;
  userId: string;
  driveFileId: string;     // CAMBIO: Ahora enviamos file_id
  driveFileUrl?: string;   // Opcional, para compatibilidad
  filename: string;
  callbackUrl: string;
}

class TranscriptorService {
  private readonly baseUrl: string;
  private readonly timeout: number = 120000;

  constructor() {
    this.baseUrl = config.services.transcriptorUrl;
  }

  async requestTranscription(data: TranscriptionRequest): Promise<any> {
    try {
      // ========== PAYLOAD ACTUALIZADO ==========
      const payload = {
        audio_id: data.audioId,
        user_id: data.userId,
        file_id: data.driveFileId,           // CAMBIO: Enviamos file_id
        filename: data.filename,
        callback_url: data.callbackUrl,
        callback_secret: config.callback.secret,
      };
      // =========================================

      logger.info('Enviando solicitud de transcripción', {
        audioId: data.audioId,
        fileId: data.driveFileId,            // NUEVO LOG
        transcriptorUrl: this.baseUrl,
      });

      const response = await axios.post(this.baseUrl, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.callback.secret,
        },
      });

      logger.info('Respuesta del sistema de transcripción recibida', {
        audioId: data.audioId,
        status: response.status,
      });

      return {
        success: true,
        transcriptionId: response.data.transcription_id || data.audioId,
        message: response.data.message,
      };
    } catch (error: any) {
      logger.error('Error al solicitar transcripción:', {
        audioId: data.audioId,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }
}

export default new TranscriptorService();