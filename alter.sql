ALTER TABLE purchase_orders ADD COLUMN shippingCost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN shippingMethod VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN paymentTerms VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN terms TEXT;

ALTER TABLE grns ADD COLUMN vehicleNo VARCHAR(100);
ALTER TABLE grns ADD COLUMN storageLocation VARCHAR(100);

ALTER TABLE material_requests ADD COLUMN priority VARCHAR(50);
