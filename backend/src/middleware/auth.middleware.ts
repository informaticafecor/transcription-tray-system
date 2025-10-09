// ============================================
// src/middleware/auth.middleware.ts
// ============================================
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import axios from 'axios';
import { config } from '../config/env';
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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
      return;
    }

    const token = authHeader.substring(7);

    const response = await axios.post(
      config.services.authVerifyUrl,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }
    );

    if (!response.data || !response.data.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Token inválido o expirado',
      });
      return;
    }

    req.user = {
      id: response.data.user.id,
      email: response.data.user.email,
      role: response.data.user.role || 'user',
    };

    next();
  } catch (error: any) {
    logger.error('Error en autenticación:', error);

    if (error.response?.status === 401) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Token inválido o expirado',
      });
      return;
    }

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

  if (req.user.role !== 'admin') {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Acceso denegado: se requieren privilegios de administrador',
    });
    return;
  }

  next();
};