-- CreateTable
CREATE TABLE `paint_ledger_entries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `source_row` INTEGER NULL,
    `work_date` DATE NULL,
    `site_address` TEXT NULL,
    `material_spec` VARCHAR(255) NULL,
    `amount` DECIMAL(12, 2) NULL,
    `payment_status` VARCHAR(120) NULL,
    `memo` TEXT NULL,
    `supplied_materials` TEXT NULL,
    `labor_cost` DECIMAL(12, 2) NULL,
    `fuel_cost` DECIMAL(12, 2) NULL,
    `material_cost` DECIMAL(12, 2) NULL,
    `owner_category` VARCHAR(30) NULL,
    `is_day_off` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `paint_ledger_entries_source_row_key`(`source_row`),
    INDEX `idx_paint_ledger_work_date`(`work_date`),
    INDEX `idx_paint_ledger_owner`(`owner_category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
