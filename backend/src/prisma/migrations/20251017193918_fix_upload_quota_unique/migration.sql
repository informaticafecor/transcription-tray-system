/*
  Warnings:

  - You are about to drop the `UploadQuota` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "UploadQuota";

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

-- CreateIndex
CREATE INDEX "upload_quotas_user_id_idx" ON "upload_quotas"("user_id");

-- CreateIndex
CREATE INDEX "upload_quotas_date_idx" ON "upload_quotas"("date");

-- CreateIndex
CREATE UNIQUE INDEX "upload_quotas_user_id_date_key" ON "upload_quotas"("user_id", "date");
