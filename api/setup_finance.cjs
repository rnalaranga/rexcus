const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/.env" });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "1234",
    database: process.env.DB_NAME || "rex_erp"
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      isTaxAccount BOOLEAN DEFAULT FALSE,
      createdAt DATETIME,
      updatedAt DATETIME
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tax_rates (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      rate DECIMAL(5,2) NOT NULL,
      accountId VARCHAR(50),
      createdAt DATETIME
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id VARCHAR(50) PRIMARY KEY,
      date DATETIME NOT NULL,
      reference VARCHAR(100),
      description TEXT,
      totalAmount DECIMAL(15,2) NOT NULL,
      createdBy VARCHAR(50),
      createdAt DATETIME
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS journal_lines (
      id VARCHAR(50) PRIMARY KEY,
      entryId VARCHAR(50) NOT NULL,
      accountId VARCHAR(50) NOT NULL,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      description TEXT,
      partyId VARCHAR(50),
      costCenterId VARCHAR(50)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cost_centers (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      isActive BOOLEAN DEFAULT TRUE
    )
  `);
  
  // Seed basic accounts
  await conn.query(`
    INSERT IGNORE INTO chart_of_accounts (id, code, name, type, createdAt) VALUES 
    ('ACC-001', '1000', 'Cash', 'Asset', NOW()),
    ('ACC-002', '1100', 'Accounts Receivable', 'Asset', NOW()),
    ('ACC-003', '2000', 'Accounts Payable', 'Liability', NOW()),
    ('ACC-004', '4000', 'Sales Revenue', 'Revenue', NOW()),
    ('ACC-005', '5000', 'Cost of Goods Sold', 'Expense', NOW()),
    ('ACC-006', '5100', 'Operating Expenses', 'Expense', NOW())
  `);

  console.log("Finance tables created.");
  await conn.end();
}

run().catch(console.error);
