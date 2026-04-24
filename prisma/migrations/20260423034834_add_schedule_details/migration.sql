-- AlterTable
ALTER TABLE `schedules` ADD COLUMN `estimated_work_unit` DECIMAL(4, 2) NOT NULL DEFAULT 1.0,
    ADD COLUMN `work_location` VARCHAR(160) NULL,
    ADD COLUMN `work_type` VARCHAR(50) NULL;
