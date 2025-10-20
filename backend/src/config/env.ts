// ============================================
// src/config/env.ts
// ============================================
import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('/api/v1'),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  GOOGLE_DRIVE_FOLDER_ID: Joi.string().required(),

  // Actualiza estos campos de Google:
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(), 
  GOOGLE_REFRESH_TOKEN: Joi.string().required(),



  TRANSCRIPTOR_URL: Joi.string().uri().required(),
  AUTH_VERIFY_URL: Joi.string().uri().required(),
  FRONTEND_BASE_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().required(),
  CALLBACK_SECRET: Joi.string().min(32).required(),
  CALLBACK_PATH: Joi.string().default('/api/v1/callback/transcription'),
  MAX_DAILY_UPLOADS: Joi.number().default(5),
  MAX_FILE_SIZE_MB: Joi.number().default(50),
  ALLOWED_AUDIO_TYPES: Joi.string().default('audio/mpeg,audio/wav,audio/mp4'),
  QUEUE_NAME: Joi.string().default('audioQueue'),
  QUEUE_CONCURRENCY: Joi.number().default(5),
  QUEUE_RETRY_ATTEMPTS: Joi.number().default(3),
  QUEUE_RETRY_DELAY: Joi.number().default(5000),
  JWT_SECRET: Joi.string().min(32).required(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  apiPrefix: envVars.API_PREFIX as string,
  database: {
    url: envVars.DATABASE_URL as string,
  },
  redis: {
    url: envVars.REDIS_URL as string,
    host: envVars.REDIS_HOST as string,
    port: envVars.REDIS_PORT as number,
  },
  google: {
    serviceAccountPath: envVars.GOOGLE_SERVICE_ACCOUNT_JSON_PATH as string,
    driveFolderId: envVars.GOOGLE_DRIVE_FOLDER_ID as string,

    clientId: envVars.GOOGLE_CLIENT_ID as string,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET as string,
    refreshToken: envVars.GOOGLE_REFRESH_TOKEN as string,


  },
  services: {
    transcriptorUrl: envVars.TRANSCRIPTOR_URL as string,
    authVerifyUrl: envVars.AUTH_VERIFY_URL as string,
  },
  frontend: {
    baseUrl: envVars.FRONTEND_BASE_URL as string,
    corsOrigins: (envVars.CORS_ORIGINS as string).split(','),
  },
  callback: {
    secret: envVars.CALLBACK_SECRET as string,
    path: envVars.CALLBACK_PATH as string,
  },
  limits: {
    maxDailyUploads: envVars.MAX_DAILY_UPLOADS as number,
    maxFileSizeMB: envVars.MAX_FILE_SIZE_MB as number,
    allowedAudioTypes: (envVars.ALLOWED_AUDIO_TYPES as string).split(','),
  },
  queue: {
    name: envVars.QUEUE_NAME as string,
    concurrency: envVars.QUEUE_CONCURRENCY as number,
    retryAttempts: envVars.QUEUE_RETRY_ATTEMPTS as number,
    retryDelay: envVars.QUEUE_RETRY_DELAY as number,
  },
  jwt: {
    secret: envVars.JWT_SECRET as string,
  },
  logging: {
    level: envVars.LOG_LEVEL as string,
    filePath: envVars.LOG_FILE_PATH as string,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },
};