// src/services/drive.service.ts - CORREGIDO PARA CARPETAS COMPARTIDAS
import { google, drive_v3 } from 'googleapis';
import { config } from '../config/env';
import logger from '../utils/logger';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

class DriveService {
  private drive: drive_v3.Drive | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initializeDrive();
  }

  private initializeDrive(): void {
    try {
      const credentialsPath = path.resolve(config.google.serviceAccountPath);
      
      if (!fs.existsSync(credentialsPath)) {
        logger.warn('Archivo de credenciales de Google Drive no encontrado');
        this.initialized = false;
        return;
      }

      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);

      if (!credentials.type || credentials.type !== 'service_account') {
        logger.warn('Archivo de credenciales inválido o temporal');
        this.initialized = false;
        return;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      logger.info('Google Drive service inicializado correctamente');
    } catch (error: any) {
      logger.error('Error al inicializar Google Drive:', {
        message: error.message
      });
      this.initialized = false;
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    if (!this.initialized || !this.drive) {
      throw new Error('Google Drive service no está inicializado. Verifica las credenciales.');
    }

    try {
      logger.info('Subiendo archivo a Google Drive', { 
        filename, 
        size: buffer.length,
        folderId: config.google.driveFolderId 
      });

      // Metadata del archivo
      const fileMetadata: drive_v3.Schema$File = {
        name: filename,
        parents: [config.google.driveFolderId], // La carpeta que compartiste
      };

      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      // Subir el archivo
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink, name',
        supportsAllDrives: true, // IMPORTANTE: Soporta drives compartidos
      });

      const fileId = response.data.id!;
      const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      logger.info('Archivo subido a Drive exitosamente', { 
        fileId, 
        filename,
        webViewLink 
      });

      return { fileId, webViewLink };
    } catch (error: any) {
      logger.error('Error al subir archivo a Drive:', {
        message: error.message,
        filename,
        code: error.code,
        errors: error.errors
      });
      
      // Mensaje de error más específico
      let errorMessage = error.message;
      if (error.code === 404) {
        errorMessage = 'Carpeta de Drive no encontrada. Verifica el GOOGLE_DRIVE_FOLDER_ID en .env';
      } else if (error.message.includes('storage quota')) {
        errorMessage = 'Error de cuota de almacenamiento. Asegúrate de compartir la carpeta con la Service Account';
      }
      
      throw new Error(`Error al subir archivo a Google Drive: ${errorMessage}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.initialized || !this.drive) {
      logger.warn('Intento de eliminar archivo sin Google Drive inicializado');
      return;
    }

    try {
      await this.drive.files.delete({ 
        fileId,
        supportsAllDrives: true 
      });
      logger.info('Archivo eliminado de Drive', { fileId });
    } catch (error: any) {
      logger.error('Error al eliminar archivo de Drive:', {
        message: error.message,
        fileId
      });
    }
  }

  async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File | null> {
    if (!this.initialized || !this.drive) {
      return null;
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, webViewLink',
        supportsAllDrives: true
      });
      return response.data;
    } catch (error: any) {
      logger.error('Error al obtener metadata:', {
        message: error.message,
        fileId
      });
      return null;
    }
  }
}

export default new DriveService();