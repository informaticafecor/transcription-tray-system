// ============================================
// src/routes/audio.routes.ts
// ============================================
import { Router } from 'express';
import audioController from '../controllers/audio.controller';
import callbackController from '../controllers/callback.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Rutas protegidas para usuarios
router.post(
  '/upload',
  authMiddleware,
  uploadMiddleware.single('audio'),
  audioController.uploadAudio
);

router.get('/my-audios', authMiddleware, audioController.getUserAudios);

router.get('/audios/:id', authMiddleware, audioController.getAudioById);

router.delete('/audios/:id', authMiddleware, audioController.deleteAudio);

router.get('/stats', authMiddleware, audioController.getStats);

// Rutas solo para administradores
router.get('/admin/audios', authMiddleware, adminMiddleware, audioController.getAllAudios);

// Callback (no requiere autenticación, usa secret)
router.post('/callback/transcription', callbackController.handleTranscriptionCallback);

// Descargar transcripción
router.get('/audios/:id/download',authMiddleware, audioController.downloadTranscription);

export default router;  