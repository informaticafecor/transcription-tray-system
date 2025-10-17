/*
  Warnings:

  - You are about to drop the `upload_quotas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "upload_quotas";

-- CreateTable
CREATE TABLE "UploadQuota" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadQuota_user_id_key" ON "UploadQuota"("user_id");

-- CreateIndex
CREATE INDEX "UploadQuota_user_id_idx" ON "UploadQuota"("user_id");

-- CreateIndex
CREATE INDEX "UploadQuota_date_idx" ON "UploadQuota"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UploadQuota_user_id_date_key" ON "UploadQuota"("user_id", "date");
