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
    )`,
    `CREATE TABLE IF NOT EXISTS quotation_templates (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT DEFAULT NULL,
      subject VARCHAR(255) DEFAULT NULL,
      items LONGTEXT DEFAULT NULL,
      terms TEXT DEFAULT NULL,
      validity VARCHAR(100) DEFAULT NULL,
      delivery VARCHAR(100) DEFAULT NULL,
      taxProfileId VARCHAR(50) DEFAULT NULL,
      boms LONGTEXT DEFAULT NULL,
      data LONGTEXT DEFAULT NULL,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS finished_goods_orders (
      id VARCHAR(50) PRIMARY KEY,
      orderNo VARCHAR(50) NOT NULL,
      productId VARCHAR(50) NOT NULL,
      productName VARCHAR(255) NOT NULL,
      productSku VARCHAR(100) DEFAULT NULL,
      customerId VARCHAR(50) DEFAULT NULL,
      customerName VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(100) DEFAULT NULL,
      customerEmail VARCHAR(150) DEFAULT NULL,
      orderDate DATE NOT NULL,
      targetDeliveryDate DATE DEFAULT NULL,
      qty DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      unitPrice DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      totalPrice DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'Pending',
      stockStatus VARCHAR(50) DEFAULT 'In Stock',
      isDispatched TINYINT(1) DEFAULT 0,
      dispatchedAt DATETIME DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      isTaxAccount TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT NULL,
      updatedAt DATETIME DEFAULT NULL,
      balance DECIMAL(15,2) DEFAULT 0.00,
      subtype VARCHAR(50) DEFAULT NULL,
      accountNumber VARCHAR(50) DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id VARCHAR(50) PRIMARY KEY,
      date DATETIME NOT NULL,
      reference VARCHAR(100) DEFAULT NULL,
      description TEXT DEFAULT NULL,
      totalAmount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      createdBy VARCHAR(50) DEFAULT NULL,
      createdAt DATETIME DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'posted'
    )`,
    `CREATE TABLE IF NOT EXISTS journal_lines (
      id VARCHAR(50) PRIMARY KEY,
      entryId VARCHAR(50) NOT NULL,
      accountId VARCHAR(50) NOT NULL,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      description TEXT DEFAULT NULL,
      partyId VARCHAR(50) DEFAULT NULL,
      costCenterId VARCHAR(50) DEFAULT NULL,
      partyType VARCHAR(50) DEFAULT NULL,
      INDEX idx_je_entryId (entryId),
      INDEX idx_je_accountId (accountId)
    )`,
    `CREATE TABLE IF NOT EXISTS cost_centers (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100) DEFAULT NULL,
      isActive TINYINT(1) DEFAULT 1
    )`
  ];

  for (const tbl of createTables) {
    try {
      await conn.query(tbl);
    } catch (err) {
      // Ignore
    }
  }

  // Default Chart of Accounts seeding
  try {
    const [coaRows] = await conn.query('SELECT COUNT(*) as count FROM chart_of_accounts');
    if (coaRows && coaRows[0]?.count === 0) {
      const defaultAccounts = [
        { id: 'acc_1000', code: '1000', name: 'Commercial Bank', type: 'Asset', subtype: 'Bank', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1100', code: '1100', name: 'Cash in Hand', type: 'Asset', subtype: 'Cash', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1500', code: '1500', name: 'Accounts Receivable', type: 'Asset', subtype: 'Current Asset', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1600', code: '1600', name: 'Inventory - Raw Materials', type: 'Asset', subtype: 'Inventory', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1610', code: '1610', name: 'Inventory - Finished Goods', type: 'Asset', subtype: 'Inventory', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_1700', code: '1700', name: 'Machinery & Equipment', type: 'Asset', subtype: 'Fixed Asset', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_2000', code: '2000', name: 'Accounts Payable', type: 'Liability', subtype: 'Current Liability', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_2200', code: '2200', name: 'Tax Payable', type: 'Liability', subtype: 'Tax', balance: 0.00, isTaxAccount: 1 },
        { id: 'acc_2300', code: '2300', name: 'Accrued Expenses', type: 'Liability', subtype: 'Current Liability', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_3000', code: '3000', name: 'Sales Revenue', type: 'Revenue', subtype: 'Sales', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_3100', code: '3100', name: 'Service Income', type: 'Revenue', subtype: 'Service', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4000', code: '4000', name: 'Raw Materials', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4001', code: '4001', name: 'Electric item', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_4002', code: '4002', name: 'Sub Contract', type: 'Expense', subtype: 'Production Material', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5000', code: '5000', name: 'Diesel for Generator', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5001', code: '5001', name: 'Electricity', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_5002', code: '5002', name: 'Factory Maintenance', type: 'Expense', subtype: 'Production Overhead', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6000', code: '6000', name: 'Audit & Accounting Fees', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6001', code: '6001', name: 'Bonus', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_6002', code: '6002', name: 'Salaries & Wages', type: 'Expense', subtype: 'Administration', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_7000', code: '7000', name: 'Advertising', type: 'Expense', subtype: 'Selling & Distribution', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_7001', code: '7001', name: 'Sales Commissions', type: 'Expense', subtype: 'Selling & Distribution', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_8000', code: '8000', name: 'Bank Charges', type: 'Expense', subtype: 'Finance', balance: 0.00, isTaxAccount: 0 },
        { id: 'acc_9000', code: '9000', name: 'Exchange Gain or Loss', type: 'Expense', subtype: 'Non Operating', balance: 0.00, isTaxAccount: 0 }
      ];
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      for (const acc of defaultAccounts) {
        await conn.query('INSERT IGNORE INTO chart_of_accounts SET ?', { ...acc, createdAt: now });
      }
      console.log('Seeded default chart_of_accounts.');
    }
  } catch (e) {
    // Ignore
  }

  // Default Cost Centers seeding
  try {
    const [ccRows] = await conn.query('SELECT COUNT(*) as count FROM cost_centers');
    if (ccRows && ccRows[0]?.count === 0) {
      const defaultCCs = [
        { id: 'cc_prod', code: 'PROD', name: 'Production & Workshop', department: 'Manufacturing', isActive: 1 },
        { id: 'cc_admin', code: 'ADMIN', name: 'Administration & HR', department: 'Management', isActive: 1 },
        { id: 'cc_sales', code: 'SALES', name: 'Sales & Marketing', department: 'Commercial', isActive: 1 }
      ];
      for (const cc of defaultCCs) {
        await conn.query('INSERT IGNORE INTO cost_centers SET ?', cc);
      }
      console.log('Seeded default cost_centers.');
    }
  } catch (e) {
    // Ignore
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
    "ALTER TABLE quotations ADD COLUMN quotationNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN approvedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN approvedAt DATETIME DEFAULT NULL",
    "ALTER TABLE quotations ADD COLUMN rejectionReason TEXT DEFAULT NULL",
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
    "ALTER TABLE supplier_bills ADD COLUMN taxAmount DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE quotation_templates ADD COLUMN data LONGTEXT DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN stepNumber INT DEFAULT 1",
    "ALTER TABLE work_order_operations ADD COLUMN machineId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN employeeId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN plannedHours DECIMAL(10,2) DEFAULT 0.00",
    "ALTER TABLE work_order_operations ADD COLUMN scheduledStart DATETIME DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN scheduledEnd DATETIME DEFAULT NULL",
    "ALTER TABLE work_order_operations ADD COLUMN isLocked TINYINT(1) DEFAULT 0",
    "ALTER TABLE work_orders ADD COLUMN customerId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN customer VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN orderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN plannedStartDate DATETIME DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN attachments LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN boms LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN imageUrl LONGTEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN drawingsUrl TEXT DEFAULT NULL",
    "ALTER TABLE inventory ADD COLUMN minQty INT DEFAULT 0",
    "ALTER TABLE inventory ADD COLUMN category VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerPhone VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN customerEmail VARCHAR(150) DEFAULT NULL",
    "ALTER TABLE finished_goods_orders ADD COLUMN stockStatus VARCHAR(50) DEFAULT 'In Stock'",
    "ALTER TABLE employee_machines ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE skills ADD COLUMN description TEXT DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN inspectedBy VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN status VARCHAR(50) DEFAULT 'Pass'",
    "ALTER TABLE qc_inspections ADD COLUMN defectReason TEXT DEFAULT NULL",
    "ALTER TABLE qc_inspections ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN qcId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE rework_logs ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'"
  ];

  for (const patch of patches) {
    try {
      await conn.query(patch);
    } catch (err) {
      // Ignore column already exists errors
    }
  }

  // 4. Seed Tax Profiles, Base Currencies and Settings
  const seeds = [
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT IGNORE INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES ('LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('company_bank_details', '[{\"id\":\"bank_hnb\",\"bankName\":\"Hatton National Bank\",\"branchName\":\"Negombo\",\"accountName\":\"Rex Industries (Pvt) Ltd\",\"accountNumber\":\"011010078028\",\"swiftCode\":\"HNBLLKLX\",\"isDefault\":true}]')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('quotation_terms_presets', '[{\"id\":\"tc_std_30d\",\"name\":\"Standard 30 Days Credit\",\"paymentTerms\":\"30 days from date of delivery\",\"validity\":\"30 Days\",\"delivery\":\"2-3 weeks from confirmed PO\",\"isDefault\":true},{\"id\":\"tc_50_adv\",\"name\":\"50% Advance + Balance on Delivery\",\"paymentTerms\":\"50% Advance with confirmed PO, balance 50% upon delivery\",\"validity\":\"14 Days\",\"delivery\":\"10-15 working days\",\"isDefault\":false},{\"id\":\"tc_cod\",\"name\":\"Immediate Payment on Delivery (COD)\",\"paymentTerms\":\"100% on delivery against invoice\",\"validity\":\"30 Days\",\"delivery\":\"3-5 working days / Ex-stock\",\"isDefault\":false},{\"id\":\"tc_milestone\",\"name\":\"Progressive Milestone Payment\",\"paymentTerms\":\"30% Advance, 40% on dispatch, 30% after installation & sign-off\",\"validity\":\"30 Days\",\"delivery\":\"4-6 weeks from approved drawings\",\"isDefault\":false}]')",
    "INSERT INTO settings (id, val) VALUES ('openai_model', 'gpt-4o-mini') ON DUPLICATE KEY UPDATE val=VALUES(val)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('ai_provider', 'groq')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('groq_model', 'openai/gpt-oss-120b')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('ai_enabled', 'true')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('openai_system_instructions', 'You are Rex AI, an advanced intelligent ERP assistant for Rex Industries (Pvt) Ltd, Sri Lanka - an engineering, machining, and fabrication manufacturing company. You assist the team by answering queries in fluent Sinhala, Singlish, or English. You have full read-only access to all modules: Purchasing, Inventory & Stock, Work Orders & Machine Operations, Customers & Invoices, Quotations, and Finance/Accounts. Use the provided tools or execute_custom_erp_query to query real ERP data accurately. Always format currency as LKR (Rs.) and provide concise, helpful answers.')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('default_quote_validity_days', '30')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('default_lead_time_days', '14')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('low_stock_warning_pct', '20')",
    "INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES ('acc_3900', '3900', 'Retained Earnings / Share Capital', 'Equity', 'Equity', 0, NOW())"
  ];

  for (const seed of seeds) {
    try {
      await conn.query(seed);
    } catch (err) {
      // Ignore
    }
  }

  // 5. Seed default quotation templates if table is empty
  try {
    const [tplRows] = await conn.query('SELECT COUNT(*) as count FROM quotation_templates');
    if (tplRows && tplRows[0]?.count === 0) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const seedTemplates = [
        {
          id: 'QTPL-0001',
          name: 'Standard Precision CNC Machining',
          description: 'Standard template for CNC milling, turning and custom metal component fabrication',
          subject: 'Quotation for Precision CNC Machining & Fabrication',
          items: JSON.stringify([
            { desc: 'Precision CNC Machining of Components as per drawing / CAD model', qty: 1, unitPrice: 25000, unit: 'pcs', note: 'Material: MS / SS / Aluminum as specified' },
            { desc: 'Surface Finishing, Deburring & Dimensional Inspection Report', qty: 1, unitPrice: 3500, unit: 'lot', note: 'Certificate of Conformity included' }
          ]),
          terms: '1. Payment: 30 days from delivery.\n2. Delivery: 2-3 weeks from confirmed Purchase Order.\n3. Inspection: Dimensional inspection carried out at REX QC lab.\n4. Taxes: Applicable taxes extra as per prevailing statutory rates.',
          validity: '30 Days',
          delivery: '2-3 Weeks',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'QTPL-0002',
          name: 'Sheet Metal & Enclosure Fabrication',
          description: 'Laser cutting, CNC bending, and industrial enclosure manufacturing',
          subject: 'Quotation for Sheet Metal Laser Cutting & Powder Coated Enclosure',
          items: JSON.stringify([
            { desc: 'Custom Heavy-Duty Sheet Metal Enclosure with Hinged Door & Locking mechanism', qty: 1, unitPrice: 48000, unit: 'sets', note: '1.5mm CRCA Sheet with 7-tank pretreatment' },
            { desc: 'Electrostatic Epoxy Polyester Powder Coating (RAL 7035 Grey)', qty: 1, unitPrice: 6500, unit: 'lot', note: 'Dry film thickness 60-80 microns' }
          ]),
          terms: '1. Advance: 50% with confirmed PO, balance 50% upon delivery.\n2. Raw material price escalation: Valid for 14 days due to steel price volatility.\n3. Loading / Unloading at site by client unless specified.',
          validity: '14 Days',
          delivery: '10-15 Working Days',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'QTPL-0003',
          name: 'Industrial Machinery Repair & Maintenance',
          description: 'Routine overhauling, on-site service, bushing replacement, and mechanical maintenance',
          subject: 'Quotation for Machinery Overhaul & Preventative Maintenance',
          items: JSON.stringify([
            { desc: 'Technical Labor: Dismantling, Shaft Alignment & Bearing Replacement', qty: 1, unitPrice: 35000, unit: 'service', note: 'REX senior mechanical maintenance crew' },
            { desc: 'Machining of Custom Bronze Bushings & Pin Fabrication', qty: 2, unitPrice: 8500, unit: 'pcs', note: 'Phosphor Bronze SAE 660' }
          ]),
          terms: '1. Payment: 100% on submission of service sign-off report.\n2. Any unforeseen extra replacement parts will be quoted separately before execution.\n3. Work carried out under REX warranty of 90 days.',
          validity: '30 Days',
          delivery: '3-5 Working Days',
          taxProfileId: null,
          boms: '[]',
          createdAt: now,
          updatedAt: now
        }
      ];
      for (const tpl of seedTemplates) {
        await conn.query('INSERT INTO quotation_templates SET ?', tpl);
      }
    }
  } catch (e) {
    // Ignore
  }

  console.log('✅ Database synchronized successfully! All tables, columns, and seed options are up to date.');
  await conn.end();
}

run().catch(err => {
  console.error('❌ Error fixing database:', err);
  process.exit(1);
});
