-- 1. Character Set Fix (For Sinhala & Special Characters in Inventory)
ALTER DATABASE rex_erp CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
ALTER TABLE inventory CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Migrate Inventory Types (Changes 'product' to 'raw_material')
UPDATE inventory SET type = 'raw_material' WHERE type = 'product';

-- 3. Fix Invoices Table (Adds missing columns for Finance Automation)
ALTER TABLE invoices 
ADD COLUMN customerId VARCHAR(50) NULL,
ADD COLUMN payments TEXT NULL,
ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN total DECIMAL(15,2) DEFAULT 0,
ADD COLUMN date DATE NULL;