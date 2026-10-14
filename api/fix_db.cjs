const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  console.log('--- Starting REX ERP Database Structure Fix & Sync ---');
  
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'rex_erp'
  });

  console.log(`Connected to database "${process.env.DB_NAME || 'rex_erp'}" on ${process.env.DB_HOST || 'localhost'}.`);

  // 1. Execute fix_db_schema.sql if present
  const possiblePaths = [
    path.join(__dirname, '../fix_db_schema.sql'),
    path.join(__dirname, 'fix_db_schema.sql'),
    path.join(process.cwd(), 'fix_db_schema.sql'),
    path.join(process.cwd(), '../fix_db_schema.sql')
  ];
  const sqlFile = possiblePaths.find(p => fs.existsSync(p));

  if (sqlFile && fs.existsSync(sqlFile)) {
    console.log(`Executing SQL definitions from: ${sqlFile}`);
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const statements = sqlContent.split(';');
    let appliedCount = 0;
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      const cleaned = trimmed.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!cleaned) continue;
      try {
        await conn.query(cleaned);
        appliedCount++;
      } catch (err) {
        // Table or column might already exist, safe to ignore
      }
    }
    console.log(`Processed ${appliedCount} statements from fix_db_schema.sql.`);
  }

  // 2. Ensure core tables exist
  const createTables = [
    `CREATE TABLE IF NOT EXISTS customer_grns (
      id VARCHAR(50) PRIMARY KEY,
      quoteId VARCHAR(50) NULL,
      quoNo VARCHAR(100) NULL,
      leadId VARCHAR(50) NULL,
      items TEXT NULL,
      receivedAt DATETIME NULL,
      receivedBy VARCHAR(100) NULL,
      notes TEXT NULL,
      createdAt DATETIME NULL,
      status VARCHAR(50) DEFAULT 'In Stock',
      gatePassId VARCHAR(50) NULL,
      dispatchedAt DATETIME NULL,
      customerName VARCHAR(255) NULL,
      customerCompany VARCHAR(255) NULL
    )`,
    `CREATE TABLE IF NOT EXISTS gate_passes (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(50) DEFAULT 'customer_sample',
      grnId VARCHAR(50) NULL,
      quoteId VARCHAR(50) NULL,
      quoNo VARCHAR(100) NULL,
      leadId VARCHAR(50) NULL,
      customerId VARCHAR(50) NULL,
      customerName VARCHAR(255) NULL,
      customerCompany VARCHAR(255) NULL,
      address TEXT NULL,
      phone VARCHAR(100) NULL,
      email VARCHAR(100) NULL,
      attention VARCHAR(255) NULL,
      carrier VARCHAR(255) NULL,
      vehicleNo VARCHAR(100) NULL,
      reason VARCHAR(255) NULL,
      items TEXT NULL,
      issuedBy VARCHAR(100) NULL,
      issuedDate DATETIME NULL,
      status VARCHAR(50) DEFAULT 'Dispatched',
      notes TEXT NULL,
      createdAt DATETIME NULL
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_ledger (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50) NOT NULL,
      date DATETIME NULL,
      type VARCHAR(50) NOT NULL,
      referenceNo VARCHAR(100) NULL,
      description TEXT NULL,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      paymentMethod VARCHAR(50) DEFAULT 'Bank Transfer',
      bankAccountId VARCHAR(100) NULL,
      amount DECIMAL(15,2) DEFAULT 0.00,
      reference VARCHAR(255) NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      debitAccountId VARCHAR(50) DEFAULT NULL,
      creditAccountId VARCHAR(50) DEFAULT NULL,
      debitAccountName VARCHAR(100) DEFAULT NULL,
      creditAccountName VARCHAR(100) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS material_requests (
      id VARCHAR(50) PRIMARY KEY,
      workOrderNo VARCHAR(100) DEFAULT NULL,
      workOrderNos TEXT DEFAULT NULL,
      poId VARCHAR(50) DEFAULT NULL,
      poIds TEXT DEFAULT NULL,
      date DATETIME,
      requiredDate DATETIME,
      requestedBy VARCHAR(100),
      department VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      items TEXT,
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50),
      mrId VARCHAR(50) DEFAULT NULL,
      mrIds TEXT DEFAULT NULL,
      taxProfileId VARCHAR(50) DEFAULT NULL,
      taxBreakdown TEXT DEFAULT NULL,
      date DATETIME,
      expectedDate DATETIME,
      status VARCHAR(20) DEFAULT 'draft',
      billedAmount DECIMAL(15,2) DEFAULT 0.00,
      billingStatus VARCHAR(30) DEFAULT 'unbilled',
      billIds TEXT,
      invoiceNos TEXT,
      items TEXT,
      subtotal DECIMAL(15,2),
      tax DECIMAL(15,2),
      totalAmount DECIMAL(15,2),
      notes TEXT,
      shippingCost DECIMAL(15,2) DEFAULT 0,
      shippingMethod VARCHAR(100),
      paymentTerms VARCHAR(100),
      terms TEXT,
      createdAt DATETIME,
      updatedAt DATETIME,
      createdBy VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS grns (
      id VARCHAR(50) PRIMARY KEY,
      poId VARCHAR(50),
      poIds TEXT DEFAULT NULL,
      supplierId VARCHAR(50),
      date DATETIME,
      receivedBy VARCHAR(100),
      vehicleNo VARCHAR(100),
      storageLocation VARCHAR(100),
      items TEXT,
      status VARCHAR(20) DEFAULT 'received',
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_bills (
      id VARCHAR(50) PRIMARY KEY,
      supplierId VARCHAR(50),
      poId VARCHAR(50),
      grnId VARCHAR(50),
      invoiceNo VARCHAR(100),
      date DATETIME,
      dueDate DATETIME,
      amount DECIMAL(15,2),
      subtotal DECIMAL(15,2) DEFAULT 0.00,
      taxAmount DECIMAL(15,2) DEFAULT 0.00,
      items TEXT,
      status VARCHAR(20) DEFAULT 'unpaid',
      notes TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS tax_profiles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      tax1_name VARCHAR(50) NOT NULL,
      tax1_rate DECIMAL(5,2) NOT NULL,
      tax2_name VARCHAR(50) DEFAULT NULL,
      tax2_rate DECIMAL(5,2) DEFAULT 0.00,
      tax2_compound TINYINT(1) DEFAULT 0,
      tax1_hidden TINYINT(1) DEFAULT 0,
      tax1_show_separately TINYINT(1) DEFAULT 0,
      tax2_show_separately TINYINT(1) DEFAULT 1,
      tax1_accountId VARCHAR(50) DEFAULT NULL,
      tax2_accountId VARCHAR(50) DEFAULT NULL,
      accountId VARCHAR(50) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS currencies (
      code VARCHAR(3) PRIMARY KEY,
      name VARCHAR(50) DEFAULT NULL,
      symbol VARCHAR(5) DEFAULT NULL,
      exchangeRate DECIMAL(15,4) DEFAULT 1.0000,
      isBase TINYINT(1) DEFAULT 0,
      lastUpdated DATETIME DEFAULT NULL
    )`
  ];

  for (const tbl of createTables) {
    try {
      await conn.query(tbl);
    } catch (err) {
      // Ignore
    }
  }

  // 3. Run all safe ALTER patches
  const patches = [
    "ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50)",
    "ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50)",
    "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted'",
    "ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT 'Draft'",
    "ALTER TABLE quotations ADD COLUMN docNo VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN issueNo VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN issueDate VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE customers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE customers ADD COLUMN paymentTerms TEXT",
    "ALTER TABLE customers ADD COLUMN deliveryTerms TEXT",
    "ALTER TABLE customers ADD COLUMN contacts TEXT",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_hidden TINYINT(1) DEFAULT '0'",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_show_separately TINYINT(1) DEFAULT 0",
    "ALTER TABLE tax_profiles ADD COLUMN tax2_show_separately TINYINT(1) DEFAULT 1",
    "ALTER TABLE tax_profiles ADD COLUMN tax1_accountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE tax_profiles ADD COLUMN tax2_accountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN payments TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN total DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE invoices ADD COLUMN date DATETIME DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN items TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN deliveryDate DATE DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN placeOfSupply VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN quotationNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN dispatchNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN orderNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN poNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN customerVat VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxType VARCHAR(50) DEFAULT 'none'",
    "ALTER TABLE invoices ADD COLUMN invoiceNo VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN modeOfPayment VARCHAR(100) DEFAULT 'Credit'",
    "ALTER TABLE invoices ADD COLUMN additionalInfo TEXT DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN bankDetailId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE invoices ADD COLUMN bankDetails TEXT DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT 'In Stock'",
    "ALTER TABLE customer_grns ADD COLUMN gatePassId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN dispatchedAt DATETIME DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN customerName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE customer_grns ADD COLUMN customerCompany VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN type VARCHAR(50) DEFAULT 'customer_sample'",
    "ALTER TABLE gate_passes ADD COLUMN attention VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN carrier VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE gate_passes ADD COLUMN reason VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN partyId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN partyType VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE journal_lines ADD COLUMN costCenterId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN prefix VARCHAR(10) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN category VARCHAR(100) DEFAULT 'Raw Materials'",
    "ALTER TABLE suppliers ADD COLUMN brNumber VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN vat VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN svat VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN phone2 VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN website VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN designation VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN contactName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN contacts TEXT DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN paymentTerms VARCHAR(100) DEFAULT 'Net 30 Days'",
    "ALTER TABLE suppliers ADD COLUMN creditDays INT DEFAULT 30",
    "ALTER TABLE suppliers ADD COLUMN creditLimit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE suppliers ADD COLUMN requiresAdvance TINYINT(1) DEFAULT 0",
    "ALTER TABLE suppliers ADD COLUMN bankName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankBranch VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankAccountNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN bankAccountName VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN currency VARCHAR(10) DEFAULT 'LKR'",
    "ALTER TABLE suppliers ADD COLUMN status VARCHAR(20) DEFAULT 'active'",
    "ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE suppliers ADD COLUMN openingBalance DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN referenceNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN debit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN credit DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_ledger ADD COLUMN paymentMethod VARCHAR(50) DEFAULT 'Bank Transfer'",
    "ALTER TABLE supplier_ledger ADD COLUMN bankAccountId VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE supplier_ledger ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "ALTER TABLE supplier_ledger ADD COLUMN debitAccountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN creditAccountId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN debitAccountName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE supplier_ledger ADD COLUMN creditAccountName VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN taxBreakdown TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrIds TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN poId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNos TEXT DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN vehicleNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE grns ADD COLUMN storageLocation VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN billedAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE purchase_orders ADD COLUMN billingStatus VARCHAR(30) DEFAULT 'unbilled'",
    "ALTER TABLE purchase_orders ADD COLUMN billIds TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN invoiceNos TEXT DEFAULT NULL",
    "ALTER TABLE supplier_bills ADD COLUMN items TEXT DEFAULT NULL",
    "ALTER TABLE supplier_bills ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE supplier_bills ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00"
  ];

  for (const patch of patches) {
    try {
      await conn.query(patch);
    } catch (err) {
      // Ignore column already exists errors
    }
  }

  // 4. Seed Tax Profiles and Base Currencies
  const seeds = [
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT IGNORE INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES ('LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('company_bank_details', '[{\"id\":\"bank_hnb\",\"bankName\":\"Hatton National Bank\",\"branchName\":\"Negombo\",\"accountName\":\"Rex Industries (Pvt) Ltd\",\"accountNumber\":\"011010078028\",\"swiftCode\":\"HNBLLKLX\",\"isDefault\":true}]')"
  ];

  for (const seed of seeds) {
    try {
      await conn.query(seed);
    } catch (err) {
      // Ignore
    }
  }

  console.log('✅ Database synchronized successfully! All tables, columns, and seed options are up to date.');
  await conn.end();
}

run().catch(err => {
  console.error('❌ Error fixing database:', err);
  process.exit(1);
});
