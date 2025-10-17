-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "audios" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "drive_file_id" TEXT,
    "drive_file_url" TEXT,
    "status" "AudioStatus" NOT NULL DEFAULT 'PENDING',
    "transcription_text" TEXT,
    "error_message" TEXT,
    "file_size" INTEGER,
    "duration" DOUBLE PRECISION,
    "mime_type" TEXT,
    "processing_started" TIMESTAMP(3),
    "processing_finished" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_quotas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audios_user_id_idx" ON "audios"("user_id");

-- CreateIndex
CREATE INDEX "audios_status_idx" ON "audios"("status");

-- CreateIndex
CREATE INDEX "audios_created_at_idx" ON "audios"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "upload_quotas_user_id_key" ON "upload_quotas"("user_id");

-- CreateIndex
CREATE INDEX "upload_quotas_user_id_date_idx" ON "upload_quotas"("user_id", "date");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");
