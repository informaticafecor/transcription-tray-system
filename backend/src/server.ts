
// ============================================
// src/server.ts
// ============================================
import app from './app';
import { config } from './config/env';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Base de datos conectada exitosamente');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Servidor iniciado en puerto ${config.port}`);
      logger.info(`Ambiente: ${config.env}`);
      logger.info(`API disponible en: http://localhost:${config.port}${config.apiPrefix}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Señal ${signal} recibida, cerrando servidor...`);
      
      server.close(async () => {
        logger.info('Servidor HTTP cerrado');
        
        await prisma.$disconnect();
        logger.info('Conexión a base de datos cerrada');
        
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();