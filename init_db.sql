CREATE DATABASE IF NOT EXISTS rex_erp;
USE rex_erp;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
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
