// ============================================
// src/middleware/upload.middleware.ts
// ============================================
import multer from 'multer';
import { Request } from 'express';
import { config } from '../config/env';

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = config.limits.allowedAudioTypes;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido. Tipos aceptados: ${allowedTypes.join(', ')}`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.limits.maxFileSizeMB * 1024 * 1024,
  },
});