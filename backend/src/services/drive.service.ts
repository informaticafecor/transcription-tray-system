// src/services/drive.service.ts - VERSIÓN OAUTH2
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';
import logger from '../utils/logger';
import { Readable } from 'stream';

class DriveService {
  private drive: drive_v3.Drive | null = null;
  private oauth2Client: OAuth2Client | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initializeDrive();
  }

  private initializeDrive(): void {
    try {
      // Verificar que tengamos las credenciales OAuth2
      if (!config.google.clientId || !config.google.clientSecret || !config.google.refreshToken) {
        logger.error('Faltan credenciales OAuth2 en el .env');
        this.initialized = false;
        return;
      }

      // Crear cliente OAuth2
      this.oauth2Client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // Redirect URI para aplicaciones de escritorio
      );

      // Configurar el refresh token
      this.oauth2Client.setCredentials({
        refresh_token: config.google.refreshToken
      });

      // Inicializar Drive API con OAuth2
      this.drive = google.drive({ 
        version: 'v3', 
        auth: this.oauth2Client 
      });

      this.initialized = true;
      logger.info('Google Drive service inicializado con OAuth2');

      // Verificar que funciona obteniendo info de la cuota
      this.verifyConnection();
    } catch (error: any) {
      logger.error('Error al inicializar Google Drive:', {
        message: error.message
      });
      this.initialized = false;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      const response = await this.drive!.about.get({
        fields: 'storageQuota, user'
      });
      logger.info('Conexión verificada con Drive', {
        user: response.data.user?.emailAddress,
        quotaUsed: response.data.storageQuota?.usage,
        quotaLimit: response.data.storageQuota?.limit
      });
    } catch (error) {
      logger.error('Error verificando conexión:', error);
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    if (!this.initialized || !this.drive) {
      throw new Error('Google Drive service no está inicializado. Verifica las credenciales OAuth2.');
    }

    try {
      logger.info('Subiendo archivo a Google Drive con OAuth2', { 
        filename, 
        size: buffer.length,
        folderId: config.google.driveFolderId 
      });

      // Metadata del archivo
      const fileMetadata: drive_v3.Schema$File = {
        name: filename,
        parents: [config.google.driveFolderId] // Ahora SÍ funcionará con tu carpeta
      };

      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      // Subir el archivo - ahora como TU usuario
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, webViewLink, webContentLink, name, size'
      });

      const fileId = response.data.id!;
      const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      // Opcional: Hacer el archivo público
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          }
        });
        logger.info('Permisos públicos establecidos');
      } catch (permError) {
        logger.warn('No se pudieron establecer permisos públicos:', permError);
      }

      logger.info('Archivo subido exitosamente con OAuth2', { 
        fileId, 
        filename,
        webViewLink,
        size: response.data.size
      });

      return { fileId, webViewLink };

    } catch (error: any) {
      logger.error('Error al subir archivo:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      
      // Intentar refrescar el token si es un error de autenticación
      if (error.code === 401) {
        logger.info('Token expirado, intentando refrescar...');
        try {
          const { credentials } = await this.oauth2Client!.refreshAccessToken();
          this.oauth2Client!.setCredentials(credentials);
          logger.info('Token refrescado exitosamente');
          // Reintentar la subida
          return this.uploadFile(buffer, filename, mimeType);
        } catch (refreshError) {
          logger.error('Error al refrescar token:', refreshError);
        }
      }
      
      throw new Error(`Error al subir archivo: ${error.message}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.initialized || !this.drive) {
      logger.warn('Intento de eliminar archivo sin Drive inicializado');
      return;
    }

    try {
      await this.drive.files.delete({ fileId });
      logger.info('Archivo eliminado de Drive', { fileId });
    } catch (error: any) {
      logger.error('Error al eliminar archivo:', {
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
        fields: 'id, name, mimeType, size, webViewLink, createdTime, modifiedTime'
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

  // Método auxiliar para listar archivos (útil para debug)
  async listFiles(limit: number = 10): Promise<drive_v3.Schema$File[]> {
    if (!this.initialized || !this.drive) {
      return [];
    }

    try {
      const response = await this.drive.files.list({
        pageSize: limit,
        fields: 'files(id, name, mimeType, size, parents, webViewLink)',
        q: `'${config.google.driveFolderId}' in parents and trashed = false`
      });
      return response.data.files || [];
    } catch (error: any) {
      logger.error('Error al listar archivos:', error.message);
      return [];
    }
  }
}

export default new DriveService();