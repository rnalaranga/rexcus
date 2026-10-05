CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
  `id` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `isTaxAccount` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `balance` decimal(15,2) DEFAULT '0.00',
  `subtype` varchar(50) DEFAULT NULL,
  `accountNumber` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `cost_centers` (
  `id` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `company` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `status` varchar(50) DEFAULT 'active',
  `segment` varchar(50) DEFAULT 'sme',
  `industry` varchar(100) DEFAULT NULL,
  `lifetimeValue` decimal(15,2) DEFAULT '0.00',
  `totalRevenue` decimal(15,2) DEFAULT '0.00',
  `openDeals` int(11) DEFAULT '0',
  `lastOrder` datetime DEFAULT NULL,
  `joinDate` datetime DEFAULT NULL,
  `accountManager` varchar(100) DEFAULT NULL,
  `avatar` varchar(10) DEFAULT NULL,
  `vat` varchar(50) DEFAULT NULL,
  `svat` varchar(50) DEFAULT NULL,
  `brNumber` varchar(50) DEFAULT NULL,
  `phone2` varchar(50) DEFAULT NULL,
  `rating` int(11) DEFAULT '0',
  `creditLimit` decimal(15,2) DEFAULT '0.00',
  `creditDays` int(11) DEFAULT '30',
  `financeContactName` varchar(100) DEFAULT NULL,
  `financeContactEmail` varchar(100) DEFAULT NULL,
  `financeContactPhone` varchar(50) DEFAULT NULL,
  `bankName` varchar(100) DEFAULT NULL,
  `bankBranch` varchar(100) DEFAULT NULL,
  `bankAccountNo` varchar(50) DEFAULT NULL,
  `requiresAdvance` tinyint(1) DEFAULT '0',
  `pendingRequiresAdvance` tinyint(1) DEFAULT NULL,
  `pendingCreditLimit` decimal(15,2) DEFAULT '0.00',
  `pendingCreditDays` int(11) DEFAULT NULL,
  `creditLimitStatus` varchar(50) DEFAULT 'approved',
  `currency` varchar(3) DEFAULT 'LKR',
  `isForeign` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `deals` (
  `id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `value` decimal(15,2) DEFAULT '0.00',
  `stage` varchar(50) DEFAULT 'open',
  `probability` int(11) DEFAULT '50',
  `priority` varchar(50) DEFAULT 'medium',
  `expectedClose` datetime DEFAULT NULL,
  `owner` varchar(100) DEFAULT NULL,
  `product` varchar(255) DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `employee_machines` (
  `employeeId` varchar(50) NOT NULL DEFAULT '',
  `machineId` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`employeeId`,`machineId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `employee_skills` (
  `employeeId` varchar(50) NOT NULL DEFAULT '',
  `skillId` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`employeeId`,`skillId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  `skills` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `followups` (
  `id` varchar(50) NOT NULL,
  `relatedType` varchar(50) DEFAULT NULL,
  `relatedId` varchar(50) DEFAULT NULL,
  `relatedName` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `notes` text,
  `dueDate` datetime DEFAULT NULL,
  `dueTime` varchar(20) DEFAULT NULL,
  `priority` varchar(20) DEFAULT NULL,
  `assignedTo` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `outcome` varchar(255) DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `grns` (
  `id` varchar(50) NOT NULL,
  `poId` varchar(50) DEFAULT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `receivedBy` varchar(100) DEFAULT NULL,
  `items` text,
  `status` varchar(20) DEFAULT 'received',
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `vehicleNo` varchar(100) DEFAULT NULL,
  `storageLocation` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `unitCost` decimal(15,2) DEFAULT '0.00',
  `unitPrice` decimal(15,2) DEFAULT '0.00',
  `quantity` int(11) DEFAULT '0',
  `reorderLevel` int(11) DEFAULT '0',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `type` varchar(50) DEFAULT 'product',
  `description` text,
  `status` varchar(50) DEFAULT 'active',
  `uom` varchar(50) DEFAULT NULL,
  `suppliers` longtext,
  `location` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` varchar(50) NOT NULL,
  `quotationId` varchar(50) DEFAULT NULL,
  `leadId` varchar(50) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `payments` text,
  `paidAmount` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) DEFAULT '0.00',
  `date` date DEFAULT NULL,
  `items` text,
  `taxAmount` decimal(15,2) DEFAULT '0.00',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` varchar(50) NOT NULL,
  `date` datetime NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `description` text,
  `totalAmount` decimal(15,2) NOT NULL,
  `createdBy` varchar(50) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `status` varchar(50) DEFAULT 'posted',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `journal_lines` (
  `id` varchar(50) NOT NULL,
  `entryId` varchar(50) NOT NULL,
  `accountId` varchar(50) NOT NULL,
  `debit` decimal(15,2) DEFAULT '0.00',
  `credit` decimal(15,2) DEFAULT '0.00',
  `description` text,
  `partyId` varchar(50) DEFAULT NULL,
  `costCenterId` varchar(50) DEFAULT NULL,
  `partyType` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `leads` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `stage` varchar(50) DEFAULT 'new',
  `priority` varchar(50) DEFAULT 'medium',
  `source` varchar(100) DEFAULT NULL,
  `value` decimal(15,2) DEFAULT '0.00',
  `probability` int(11) DEFAULT '10',
  `assignedTo` varchar(100) DEFAULT NULL,
  `lastActivity` datetime DEFAULT NULL,
  `vat` varchar(50) DEFAULT NULL,
  `svat` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `machine_categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `machineries` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  `hourlyCost` decimal(10,2) DEFAULT '0.00',
  `lastMaintenance` date DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `machining_operations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupName` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `hrRate` decimal(10,2) DEFAULT '0.00',
  `setTimeRate` decimal(10,2) DEFAULT '0.00',
  `machineId` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `material_requests` (
  `id` varchar(50) NOT NULL,
  `date` datetime DEFAULT NULL,
  `requiredDate` datetime DEFAULT NULL,
  `requestedBy` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'medium',
  `status` varchar(20) DEFAULT 'pending',
  `items` text,
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` varchar(50) NOT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `expectedDate` datetime DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  `items` text,
  `subtotal` decimal(15,2) DEFAULT NULL,
  `tax` decimal(15,2) DEFAULT NULL,
  `totalAmount` decimal(15,2) DEFAULT NULL,
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `createdBy` varchar(100) DEFAULT NULL,
  `shippingCost` decimal(15,2) DEFAULT '0.00',
  `shippingMethod` varchar(100) DEFAULT NULL,
  `paymentTerms` varchar(100) DEFAULT NULL,
  `terms` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `qc_inspections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` varchar(50) DEFAULT NULL,
  `operationId` int(11) DEFAULT NULL,
  `inspector` varchar(100) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `result` varchar(20) DEFAULT NULL,
  `remarks` text,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `quotations` (
  `id` varchar(50) NOT NULL,
  `leadId` varchar(50) DEFAULT NULL,
  `version` int(11) DEFAULT '1',
  `date` datetime DEFAULT NULL,
  `data` longtext,
  `totalAmount` decimal(15,2) DEFAULT '0.00',
  `customAmount` decimal(15,2) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'main',
  `status` varchar(50) DEFAULT 'Draft',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `rework_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` varchar(50) DEFAULT NULL,
  `operationId` int(11) DEFAULT NULL,
  `reason` text,
  `hours` decimal(10,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` varchar(100) NOT NULL,
  `val` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `skills` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `stock_ledger` (
  `id` varchar(50) NOT NULL,
  `inventoryId` varchar(50) DEFAULT NULL,
  `type` varchar(20) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `supplier_bills` (
  `id` varchar(50) NOT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `poId` varchar(50) DEFAULT NULL,
  `grnId` varchar(50) DEFAULT NULL,
  `invoiceNo` varchar(100) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'unpaid',
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `supplier_ledger` (
  `id` varchar(50) NOT NULL,
  `supplierId` varchar(50) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `type` varchar(20) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `contactPerson` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `taxId` varchar(100) DEFAULT NULL,
  `balance` decimal(15,2) DEFAULT '0.00',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `tax_rates` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `rate` decimal(5,2) NOT NULL,
  `accountId` varchar(50) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'user',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `work_order_operations` (
  `id` varchar(50) NOT NULL,
  `workOrderId` varchar(50) DEFAULT NULL,
  `stepNumber` int(11) DEFAULT NULL,
  `operationName` varchar(100) DEFAULT NULL,
  `machineId` varchar(50) DEFAULT NULL,
  `employeeId` varchar(50) DEFAULT NULL,
  `plannedHours` decimal(10,2) DEFAULT '0.00',
  `actualHours` decimal(10,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT 'Pending',
  `startTime` datetime DEFAULT NULL,
  `endTime` datetime DEFAULT NULL,
  `notes` text,
  `scheduledStart` datetime DEFAULT NULL,
  `scheduledEnd` datetime DEFAULT NULL,
  `isLocked` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `work_orders` (
  `id` varchar(50) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `quoteId` varchar(50) DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'Medium',
  `status` varchar(20) DEFAULT 'Pending',
  `startDate` datetime DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `bom` text,
  `operations` text,
  `progress` int(11) DEFAULT '0',
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  `customerId` varchar(50) DEFAULT NULL,
  `plannedStartDate` datetime DEFAULT NULL,
  `attachments` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


ALTER TABLE invoices ADD COLUMN customerId VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN payments TEXT;
ALTER TABLE invoices ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN total DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN date DATE DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN items TEXT;
ALTER TABLE invoices ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE invoices ADD COLUMN notes TEXT;

ALTER TABLE customers ADD COLUMN creditLimit DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN creditDays INT(11) DEFAULT 30;

ALTER TABLE customers ADD COLUMN brNumber VARCHAR(50) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN phone2 VARCHAR(50) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN rating INT(11) DEFAULT 0;

ALTER TABLE customers ADD COLUMN financeContactName VARCHAR(100) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN financeContactEmail VARCHAR(100) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN financeContactPhone VARCHAR(50) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN bankName VARCHAR(100) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN bankBranch VARCHAR(100) DEFAULT NULL;
ALTER TABLE customers ADD COLUMN bankAccountNo VARCHAR(50) DEFAULT NULL;

ALTER TABLE customers ADD COLUMN requiresAdvance TINYINT(1) DEFAULT 0;
ALTER TABLE customers ADD COLUMN pendingCreditLimit DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE customers ADD COLUMN creditLimitStatus VARCHAR(50) DEFAULT 'approved';

ALTER TABLE customers ADD COLUMN accountManager VARCHAR(100) DEFAULT NULL;

ALTER TABLE customers ADD COLUMN pendingRequiresAdvance TINYINT(1) DEFAULT NULL;

ALTER TABLE customers ADD COLUMN pendingCreditDays INT(11) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `currencies` (
  `code` varchar(3) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `symbol` varchar(5) DEFAULT NULL,
  `exchangeRate` decimal(15,4) DEFAULT '1.0000',
  `isBase` tinyint(1) DEFAULT '0',
  `lastUpdated` datetime DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE customers ADD COLUMN currency VARCHAR(3) DEFAULT 'LKR';

ALTER TABLE customers ADD COLUMN isForeign TINYINT(1) DEFAULT 0;

ALTER TABLE invoices ADD COLUMN deliveryDate DATE DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN placeOfSupply VARCHAR(100) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN quotationNo VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN dispatchNo VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN orderNo VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN poNo VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN customerVat VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN taxType VARCHAR(50) DEFAULT 'none';

CREATE TABLE IF NOT EXISTS `tax_profiles` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tax1_name` varchar(50) NOT NULL,
  `tax1_rate` decimal(5,2) NOT NULL,
  `tax2_name` varchar(50) DEFAULT NULL,
  `tax2_rate` decimal(5,2) DEFAULT '0.00',
  `tax2_compound` tinyint(1) DEFAULT '0',
  `accountId` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
ALTER TABLE leads ADD COLUMN description TEXT DEFAULT NULL;
ALTER TABLE leads ADD COLUMN customerId VARCHAR(50) DEFAULT NULL;

INSERT IGNORE INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId) VALUES ('tp_vat18', 'VAT (18%)', 'VAT', 18, NULL);
INSERT IGNORE INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, accountId) VALUES ('tp_vat_sscl', 'VAT (18%) + SSCL (2.5%)', 'SSCL', 2.5, 'VAT', 18, 1, NULL);

CREATE TABLE IF NOT EXISTS `customer_grns` (
  `id` varchar(50) NOT NULL,
  `quoteId` varchar(50) DEFAULT NULL,
  `quoNo` varchar(100) DEFAULT NULL,
  `leadId` varchar(50) DEFAULT NULL,
  `items` text,
  `receivedAt` datetime DEFAULT NULL,
  `receivedBy` varchar(100) DEFAULT NULL,
  `notes` text,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Patches from server.ts
ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50);
ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50);
ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted';
