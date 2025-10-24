// ============================================
// src/app/models/audio.model.ts
// ============================================
export enum AudioStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  ERROR = 'ERROR'
}

/*export interface Audio {
  id: string;
  userId?: string;
  filename: string;
  originalFilename: string;
  status: AudioStatus;
  transcriptionText?: string;
  errorMessage?: string;
  fileSize?: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  processingStarted?: Date;
  processingFinished?: Date;
}*/

export interface Audio {
  id: string;
  filename: string;
  originalFilename: string;
  //status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  status: AudioStatus;  // ✅ CAMBIO: Usar el enum en lugar de string literal
  transcriptionText?: string;
  
  // ========== CAMPOS NUEVOS ==========
  driveTranscriptionFileId?: string;
  driveTranscriptionFileUrl?: string;
  // ===================================
  
  errorMessage?: string;
  fileSize?: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  processingStarted?: string;
  processingFinished?: string;
}

export interface AudioUploadResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    filename: string;
    status: AudioStatus;
    createdAt: Date;
  };
}

export interface AudioListResponse {
  success: boolean;
  data: Audio[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface StatsResponse {
  success: boolean;
  data: {
    audios: {
      total: number;
      pending: number;
      processing: number;
      done: number;
      error: number;
    };
    queue?: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  };
}