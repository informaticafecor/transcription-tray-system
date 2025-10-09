// ============================================
// src/services/drive.service.ts
// ============================================
import { google, drive_v3 } from 'googleapis';
import { config } from '../config/env';
import logger from '../utils/logger';
import { Readable } from 'stream';

class DriveService {
  private drive: drive_v3.Drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.google.serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const fileMetadata: drive_v3.Schema$File = {
        name: filename,
        parents: [config.google.driveFolderId],
      };

      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = response.data.id!;
      const webViewLink = response.data.webViewLink!;

      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      logger.info('Archivo subido a Drive exitosamente', {
        fileId,
        filename,
      });

      return { fileId, webViewLink };
    } catch (error: any) {
      logger.error('Error al subir archivo a Drive:', error);
      throw new Error(`Error al subir archivo a Google Drive: ${error.message}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
      logger.info('Archivo eliminado de Drive', { fileId });
    } catch (error: any) {
      logger.error('Error al eliminar archivo de Drive:', error);
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }
}

export default new DriveService();