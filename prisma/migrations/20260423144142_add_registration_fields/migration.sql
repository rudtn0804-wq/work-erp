-- AlterTable
ALTER TABLE `users` ADD COLUMN `address` VARCHAR(255) NULL,
    ADD COLUMN `face_descriptor` TEXT NULL,
    ADD COLUMN `profile_photo` TEXT NULL,
    ADD COLUMN `registration_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    ADD COLUMN `rejection_reason` TEXT NULL,
    MODIFY `role` ENUM('admin', 'leader', 'worker') NOT NULL DEFAULT 'worker';
