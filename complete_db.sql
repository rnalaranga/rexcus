CREATE DATABASE IF NOT EXISTS rex_erp;
USE rex_erp;

-- Keep existing
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  vat VARCHAR(50),
  svat VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  segment VARCHAR(50) DEFAULT 'sme',
  industry VARCHAR(100),
  lifetimeValue DECIMAL(15, 2) DEFAULT 0,
  totalRevenue DECIMAL(15, 2) DEFAULT 0,
  openDeals INT DEFAULT 0,
  lastOrder DATETIME,
  joinDate DATETIME,
  accountManager VARCHAR(100),
  avatar VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  vat VARCHAR(50),
  svat VARCHAR(50),
  stage VARCHAR(50) DEFAULT 'new',
  priority VARCHAR(50) DEFAULT 'medium',
  source VARCHAR(100),
  value DECIMAL(15, 2) DEFAULT 0,
  probability INT DEFAULT 10,
  assignedTo VARCHAR(100),
  lastActivity DATETIME
);

CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  customerId VARCHAR(50),
  customerName VARCHAR(255),
  company VARCHAR(255),
  value DECIMAL(15, 2) DEFAULT 0,
  stage VARCHAR(50) DEFAULT 'open',
  probability INT DEFAULT 50,
  priority VARCHAR(50) DEFAULT 'medium',
  expectedClose DATETIME,
  owner VARCHAR(100),
  product VARCHAR(255),
  lastUpdated DATETIME
);

-- Missing Tables (Added)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(100) PRIMARY KEY,
  val LONGTEXT
);

CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(50) PRIMARY KEY,
  leadId VARCHAR(50),
  version INT DEFAULT 1,
  date DATETIME,
  data LONGTEXT,
  totalAmount DECIMAL(15, 2) DEFAULT 0,
  customAmount DECIMAL(15, 2),
  type VARCHAR(50) DEFAULT 'main'
);

CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  sku VARCHAR(100),
  category VARCHAR(100),
  supplier VARCHAR(255),
  unitCost DECIMAL(15, 2) DEFAULT 0,
  price DECIMAL(15, 2) DEFAULT 0,
  stock INT DEFAULT 0,
  minStock INT DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id VARCHAR(50) PRIMARY KEY,
  inventoryId VARCHAR(50),
  type VARCHAR(20),
  qty INT,
  date DATETIME,
  reference VARCHAR(255),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  contactPerson VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  taxId VARCHAR(100),
  balance DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id VARCHAR(50) PRIMARY KEY,
  supplierId VARCHAR(50),
  date DATETIME,
  type VARCHAR(20),
  amount DECIMAL(15, 2),
  reference VARCHAR(255),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(50) PRIMARY KEY,
  leadId VARCHAR(50),
  type VARCHAR(50),
  notes TEXT,
  date DATETIME,
  createdAt DATETIME
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(50) PRIMARY KEY,
  quotationId VARCHAR(50),
  leadId VARCHAR(50),
  amount DECIMAL(15, 2),
  status VARCHAR(50),
  dueDate DATETIME,
  createdAt DATETIME
);

-- Try adding vat and svat to existing tables just in case they were already created
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS svat VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vat VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS svat VARCHAR(50);
