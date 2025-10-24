// src/middleware/auth.middleware.ts - CORREGIDO PARA BYPASS
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,  
  next: NextFunction
): Promise<void> => {
  try {
    // BYPASS TEMPORAL: Crear usuario fake para pruebas
    // Esto permite que el sistema funcione sin el sistema de autenticación externo
    
    req.user = {
      id: 'hola9',
      email: 'informecor@gmail.com',
      role: 'user',
    };

    logger.debug('Usuario de prueba autenticado correctamente');
    next();
  } catch (error: any) {
    logger.error('Error en autenticación:', {
      message: error.message || 'Error desconocido',
      stack: error.stack
    });

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error al verificar autenticación',
    });
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Usuario no autenticado',
    });
    return;
  }

  // Para pruebas, permitir acceso admin
  req.user.role = 'admin';
  next();
};