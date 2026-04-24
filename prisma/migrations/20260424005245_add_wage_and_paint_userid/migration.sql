-- AlterTable
ALTER TABLE `paint_ledger_entries` ADD COLUMN `user_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `schedule_workers` ADD COLUMN `wage` DECIMAL(12, 2) NULL;

-- CreateIndex
CREATE INDEX `idx_paint_ledger_user` ON `paint_ledger_entries`(`user_id`);

-- AddForeignKey
ALTER TABLE `paint_ledger_entries` ADD CONSTRAINT `paint_ledger_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
