ALTER TABLE invoices ADD COLUMN deliveryDate date DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN placeOfSupply varchar(100) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN quotationNo varchar(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN dispatchNo varchar(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN orderNo varchar(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN poNo varchar(50) DEFAULT NULL;
