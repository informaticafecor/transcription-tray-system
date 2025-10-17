// src/utils/logger.ts - CORREGIDO
import winston from 'winston';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

if (!fs.existsSync(config.logging.filePath)) {
  fs.mkdirSync(config.logging.filePath, { recursive: true });
}

// Función para serializar objetos con referencias circulares
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Manejar metadata con referencias circulares
    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length > 0) {
      try {
        const cleanMetadata: any = {};
        for (const key of metadataKeys) {
          if (key === 'stack') {
            cleanMetadata[key] = metadata[key];
          } else if (metadata[key] instanceof Error) {
            cleanMetadata[key] = {
              message: metadata[key].message,
              stack: metadata[key].stack
            };
          } else if (typeof metadata[key] === 'object') {
            try {
              cleanMetadata[key] = JSON.parse(JSON.stringify(metadata[key], getCircularReplacer()));
            } catch {
              cleanMetadata[key] = String(metadata[key]);
            }
          } else {
            cleanMetadata[key] = metadata[key];
          }
        }
        msg += ` ${JSON.stringify(cleanMetadata)}`;
      } catch (error) {
        msg += ' [Error serializing metadata]';
      }
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: { service: 'transcription-tray-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (config.env !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;