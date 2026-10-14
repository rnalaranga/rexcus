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
    `prefix` varchar(10) DEFAULT NULL,
    `paymentTerms` text,
    `deliveryTerms` text,
      `contacts` text,
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
  `poIds` text,
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
  `workOrderNo` varchar(100) DEFAULT NULL,
  `workOrderNos` text,
  `poId` varchar(50) DEFAULT NULL,
  `poIds` text,
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
  `mrId` varchar(50) DEFAULT NULL,
  `mrIds` text,
  `taxProfileId` varchar(50) DEFAULT NULL,
  `taxBreakdown` text,
  `date` datetime DEFAULT NULL,
  `expectedDate` datetime DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  `billedAmount` decimal(15,2) DEFAULT '0.00',
  `billingStatus` varchar(30) DEFAULT 'unbilled',
  `billIds` text,
  `invoiceNos` text,
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
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `taxAmount` decimal(15,2) DEFAULT '0.00',
  `items` text,
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
    `prefix` varchar(10) DEFAULT NULL,
  `prefix` varchar(10) DEFAULT NULL,
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
    `tax1_hidden` tinyint(1) DEFAULT '0',
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
  `status` varchar(50) DEFAULT 'In Stock',
    `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Patches from server.ts
ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50);
ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50);
ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted';
ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL;
ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL;

ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT 'In Stock';

ALTER TABLE customers ADD COLUMN paymentTerms TEXT;
ALTER TABLE customers ADD COLUMN deliveryTerms TEXT;

ALTER TABLE tax_profiles ADD COLUMN tax1_hidden TINYINT(1) DEFAULT '0';

ALTER TABLE customers ADD COLUMN contacts TEXT;
ALTER TABLE tax_profiles ADD COLUMN tax1_show_separately TINYINT(1) DEFAULT 0;
ALTER TABLE tax_profiles ADD COLUMN tax2_show_separately TINYINT(1) DEFAULT 1;
ALTER TABLE tax_profiles ADD COLUMN tax1_accountId VARCHAR(50) DEFAULT NULL;
ALTER TABLE tax_profiles ADD COLUMN tax2_accountId VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN invoiceNo VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN docNo VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN issueNo VARCHAR(255) DEFAULT NULL;
ALTER TABLE quotations ADD COLUMN issueDate VARCHAR(255) DEFAULT NULL;

ALTER TABLE journal_lines ADD COLUMN partyId VARCHAR(50) DEFAULT NULL;
ALTER TABLE journal_lines ADD COLUMN partyType VARCHAR(50) DEFAULT NULL;
ALTER TABLE journal_lines ADD COLUMN costCenterId VARCHAR(50) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `gate_passes` (
  `id` VARCHAR(50) PRIMARY KEY,
  `type` VARCHAR(50) DEFAULT 'customer_sample',
  `grnId` VARCHAR(50) NULL,
  `quoteId` VARCHAR(50) NULL,
  `quoNo` VARCHAR(100) NULL,
  `leadId` VARCHAR(50) NULL,
  `customerId` VARCHAR(50) NULL,
  `customerName` VARCHAR(255) NULL,
  `customerCompany` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(100) NULL,
  `email` VARCHAR(100) NULL,
  `attention` VARCHAR(255) NULL,
  `carrier` VARCHAR(255) NULL,
  `vehicleNo` VARCHAR(100) NULL,
  `reason` VARCHAR(255) NULL,
  `items` TEXT NULL,
  `issuedBy` VARCHAR(100) NULL,
  `issuedDate` DATETIME NULL,
  `status` VARCHAR(50) DEFAULT 'Dispatched',
  `notes` TEXT NULL,
  `createdAt` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `supplier_ledger` (
  `id` VARCHAR(50) PRIMARY KEY,
  `supplierId` VARCHAR(50) NOT NULL,
  `date` DATETIME NULL,
  `type` VARCHAR(50) NOT NULL,
  `referenceNo` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `debit` DECIMAL(15,2) DEFAULT 0.00,
  `credit` DECIMAL(15,2) DEFAULT 0.00,
  `paymentMethod` VARCHAR(50) DEFAULT 'Bank Transfer',
  `bankAccountId` VARCHAR(100) NULL,
  `amount` DECIMAL(15,2) DEFAULT 0.00,
  `reference` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `debitAccountId` VARCHAR(50) DEFAULT NULL,
  `creditAccountId` VARCHAR(50) DEFAULT NULL,
  `debitAccountName` VARCHAR(100) DEFAULT NULL,
  `creditAccountName` VARCHAR(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE invoices ADD COLUMN modeOfPayment VARCHAR(100) DEFAULT 'Credit';
ALTER TABLE invoices ADD COLUMN additionalInfo TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN bankDetailId VARCHAR(50) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN bankDetails TEXT DEFAULT NULL;

ALTER TABLE customer_grns ADD COLUMN gatePassId VARCHAR(50) DEFAULT NULL;
ALTER TABLE customer_grns ADD COLUMN dispatchedAt DATETIME DEFAULT NULL;
ALTER TABLE customer_grns ADD COLUMN customerName VARCHAR(255) DEFAULT NULL;
ALTER TABLE customer_grns ADD COLUMN customerCompany VARCHAR(255) DEFAULT NULL;

ALTER TABLE gate_passes ADD COLUMN type VARCHAR(50) DEFAULT 'customer_sample';
ALTER TABLE gate_passes ADD COLUMN attention VARCHAR(255) DEFAULT NULL;
ALTER TABLE gate_passes ADD COLUMN carrier VARCHAR(255) DEFAULT NULL;
ALTER TABLE gate_passes ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL;
ALTER TABLE gate_passes ADD COLUMN reason VARCHAR(255) DEFAULT NULL;

ALTER TABLE suppliers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN category VARCHAR(100) DEFAULT 'Raw Materials';
ALTER TABLE suppliers ADD COLUMN brNumber VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN vat VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN svat VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN phone2 VARCHAR(50) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN website VARCHAR(255) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN designation VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN contactName VARCHAR(255) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN contacts TEXT DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN paymentTerms VARCHAR(100) DEFAULT 'Net 30 Days';
ALTER TABLE suppliers ADD COLUMN creditDays INT DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN creditLimit DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE suppliers ADD COLUMN requiresAdvance TINYINT(1) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN bankName VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN bankBranch VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN bankAccountNo VARCHAR(100) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN bankAccountName VARCHAR(255) DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN currency VARCHAR(10) DEFAULT 'LKR';
ALTER TABLE suppliers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT NULL;
ALTER TABLE suppliers ADD COLUMN openingBalance DECIMAL(15,2) DEFAULT 0.00;

ALTER TABLE purchase_orders ADD COLUMN mrId VARCHAR(50) DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN taxBreakdown TEXT DEFAULT NULL;

ALTER TABLE material_requests ADD COLUMN poId VARCHAR(50) DEFAULT NULL;
ALTER TABLE material_requests ADD COLUMN poIds TEXT DEFAULT NULL;

ALTER TABLE grns ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL;
ALTER TABLE grns ADD COLUMN storageLocation VARCHAR(100) DEFAULT NULL;

ALTER TABLE material_requests ADD COLUMN workOrderNo VARCHAR(100) DEFAULT NULL;
ALTER TABLE material_requests ADD COLUMN workOrderNos TEXT DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN mrIds TEXT DEFAULT NULL;
ALTER TABLE grns ADD COLUMN poIds TEXT DEFAULT NULL;

ALTER TABLE purchase_orders ADD COLUMN billedAmount DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE purchase_orders ADD COLUMN billingStatus VARCHAR(30) DEFAULT 'unbilled';
ALTER TABLE purchase_orders ADD COLUMN billIds TEXT DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN invoiceNos TEXT DEFAULT NULL;
ALTER TABLE supplier_bills ADD COLUMN items TEXT DEFAULT NULL;
ALTER TABLE supplier_bills ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE supplier_bills ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00;

-- Default tax profile options (Sri Lanka VAT & SSCL options)
INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately);
INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately);
INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately);
INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately);
INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately);

