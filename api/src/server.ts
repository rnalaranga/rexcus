import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// ==========================
// MACHINING OPERATIONS API
// ==========================
app.get('/api/machining-operations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machining_operations ORDER BY groupName ASC, name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machining-operations', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    const [result] = await db.query(
      'INSERT INTO machining_operations (groupName, name, hrRate, setTimeRate, machineId) VALUES (?, ?, ?, ?, ?)',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/machining-operations/:id', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    await db.query(
      'UPDATE machining_operations SET groupName=?, name=?, hrRate=?, setTimeRate=?, machineId=? WHERE id=?',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/machining-operations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machining_operations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// MACHINE CATEGORIES API
// ==========================
app.get('/api/production/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machine_categories ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const id = 'CAT-' + Math.random().toString(36).substr(2, 6);
    await db.query(
      'INSERT INTO machine_categories (id, name, createdAt) VALUES (?, ?, NOW())',
      [id, name]
    );
    res.json({ success: true, id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machine_categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// MACHINE OPERATORS API
// ==========================
app.get('/api/production/machineries/:id/operators', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT employeeId FROM employee_machines WHERE machineId=?', [req.params.id]);
    res.json(rows.map(r => r.employeeId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries/:id/operators', async (req, res) => {
    try {
      const machineId = req.params.id;
      const { employeeIds } = req.body;
      await db.query('DELETE FROM employee_machines WHERE machineId=?', [machineId]);
      
      if (employeeIds && employeeIds.length > 0) {
        for (const empId of employeeIds) {
          try {
            await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES (?, ?)', [empId, machineId]);
          } catch(e) {
            if (e.message.includes('createdAt') || e.message.includes('Field \'createdAt\' doesn\'t have a default value')) {
              await db.query('INSERT INTO employee_machines (employeeId, machineId, createdAt) VALUES (?, ?, NOW())', [empId, machineId]);
            } else {
              throw e;
            }
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Operators POST Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rex-erp-secret-key-super-secure';

// -- AUTH --
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, role, prefix } = req.body;
    
    // Check if user exists
    const [existing]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const password_hash = await bcrypt.hash(password, 10);
    const id = `USR-${Date.now()}`;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const userRole = role || 'user';
    
    await db.query('INSERT INTO users SET ?', {
      id, name, username, password_hash, role: userRole, created_at
    });
    
    res.json({ success: true, user: { id, name, username, role: userRole } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [users]: any = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, name: user.name, username: user.username, role: user.role, prefix: user.prefix } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- SETTINGS --
app.get('/api/settings', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT id, val FROM settings');
    const settingsObj = rows.reduce((acc: any, row: any) => ({ ...acc, [row.id]: row.val }), {});
    res.json(settingsObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


// ==========================
// FIX DB ROUTE (Safe Schema Sync)
// ==========================
app.post('/api/settings/fix-db', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Multiple candidate paths for fix_db_schema.sql
    const possiblePaths = [
      path.join(__dirname, '../../fix_db_schema.sql'),
      path.join(__dirname, '../fix_db_schema.sql'),
      path.join(__dirname, 'fix_db_schema.sql'),
      path.join(process.cwd(), 'fix_db_schema.sql'),
      path.join(process.cwd(), '../fix_db_schema.sql')
    ];
    const sqlFile = possiblePaths.find(p => fs.existsSync(p));

    if (sqlFile && fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      const statements = sqlContent.split(';');
      
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        const cleaned = trimmed.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        if (!cleaned) continue;
        try {
          await db.query(cleaned);
        } catch (err) {
          // Ignore if table/column already exists
        }
      }
    }

    // Ensure required tables exist
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
        billIds TEXT DEFAULT NULL,
        invoiceNos TEXT DEFAULT NULL,
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
        items TEXT DEFAULT NULL,
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
      )`
    ];

    for (const tbl of createTables) {
      try {
        await db.query(tbl);
      } catch (err) {
        // Ignore
      }
    }

    // Default quotation templates seeding
    try {
      const [tplRows]: any = await db.query('SELECT COUNT(*) as count FROM quotation_templates');
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
          await db.query('INSERT INTO quotation_templates SET ?', tpl);
        }
      }
    } catch (e) {
      // Ignore
    }

    // Safe schema patches
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
      "ALTER TABLE material_requests ADD COLUMN poId VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE material_requests ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNos TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrIds TEXT DEFAULT NULL",
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
    ];

    for (const patch of patches) {
      try {
        await db.query(patch);
      } catch (err) {
        // Ignore
      }
    }

    // Default seeds if missing
        const defaultSeeds = [
      "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
      "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
      "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
      "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
      "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
      "INSERT IGNORE INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES ('LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1)"
    ];
    for (const seed of defaultSeeds) {
      try {
        await db.query(seed);
      } catch (err) {
        // Ignore
      }
    }

    // Auto-sync billing status on all POs
    try {
      const [allPos]: any = await db.query('SELECT id FROM purchase_orders');
      if (allPos && allPos.length > 0) {
        await syncPOBillingStatus(allPos.map((p: any) => p.id));
      }
    } catch (e) {}

    res.json({ success: true, message: 'Database fixed and synchronized successfully. All tables and columns are up to date. No data was deleted.' });
  } catch (error) {
    console.error('Fix DB error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [id, val] of Object.entries(updates)) {
      await db.query('INSERT INTO settings (id, val) VALUES (?, ?) ON DUPLICATE KEY UPDATE val=?', [id, val, val]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- USER MANAGEMENT --
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, username, role, prefix, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, password, role, prefix } = req.body;
    const [existing]: any = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);
    const id = `USR-${Date.now()}`;
    const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO users SET ?', { id, name, username, password_hash, role: role || 'user', prefix: prefix || null, created_at });
    res.json({ success: true, user: { id, name, username, role: role || 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, role, prefix } = req.body;
    await db.query('UPDATE users SET name=?, role=?, prefix=? WHERE id=?', [name, role, prefix || null, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash=? WHERE id=?', [password_hash, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- CUSTOMERS --
app.get('/api/customers', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows] = await db.query('SELECT * FROM customers ORDER BY joinDate DESC') as any[];
    for (const r of rows) {
      if (typeof r.contacts === 'string') {
        try {
          let parsed = JSON.parse(r.contacts);
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(e) {}
          }
          r.contacts = Array.isArray(parsed) ? parsed : [];
        } catch(e) {
          r.contacts = [];
        }
      } else if (!Array.isArray(r.contacts)) {
        r.contacts = [];
      }
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    const r = rows[0];
    if (typeof r.contacts === 'string') {
      try {
        let parsed = JSON.parse(r.contacts);
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch(e) {}
        }
        r.contacts = Array.isArray(parsed) ? parsed : [];
      } catch(e) {
        r.contacts = [];
      }
    } else if (!Array.isArray(r.contacts)) {
      r.contacts = [];
    }
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts !== undefined) {
      if (Array.isArray(data.contacts)) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'object' && data.contacts !== null) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'string') {
        try {
          const parsed = JSON.parse(data.contacts);
          data.contacts = JSON.stringify(parsed);
        } catch(e) {
          data.contacts = '[]';
        }
      } else {
        data.contacts = '[]';
      }
    }
    let isPending = false;
    
    if (data.creditLimit && Number(data.creditLimit) > 0) {
      data.pendingCreditLimit = data.creditLimit;
      data.creditLimit = 0;
      isPending = true;
    }
    
    if (data.requiresAdvance) {
      data.pendingRequiresAdvance = 1;
      data.requiresAdvance = 0;
      isPending = true;
    }

    if (data.creditDays && Number(data.creditDays) !== 30) {
      data.pendingCreditDays = data.creditDays;
      data.creditDays = 30;
      isPending = true;
    }

    data.creditLimitStatus = isPending ? 'pending' : 'approved';

    const [result] = await db.query('INSERT INTO customers SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    if (data.contacts !== undefined) {
      if (Array.isArray(data.contacts)) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'object' && data.contacts !== null) {
        data.contacts = JSON.stringify(data.contacts);
      } else if (typeof data.contacts === 'string') {
        try {
          const parsed = JSON.parse(data.contacts);
          data.contacts = JSON.stringify(parsed);
        } catch(e) {
          data.contacts = '[]';
        }
      } else {
        data.contacts = '[]';
      }
    }
    
    const [existingRows] = await db.query('SELECT creditLimit, requiresAdvance, creditDays FROM customers WHERE id = ?', [id]);
    if (existingRows.length > 0) {
       const existing = existingRows[0];
       let isPending = false;

       if (data.creditLimit !== undefined && Number(data.creditLimit) !== Number(existing.creditLimit)) {
          data.pendingCreditLimit = data.creditLimit;
          data.creditLimit = existing.creditLimit;
          isPending = true;
       }
       
       if (data.requiresAdvance !== undefined && Boolean(data.requiresAdvance) !== Boolean(existing.requiresAdvance)) {
          data.pendingRequiresAdvance = data.requiresAdvance ? 1 : 0;
          data.requiresAdvance = existing.requiresAdvance;
          isPending = true;
       }

       if (data.creditDays !== undefined && Number(data.creditDays) !== Number(existing.creditDays)) {
          data.pendingCreditDays = data.creditDays;
          data.creditDays = existing.creditDays;
          isPending = true;
       }

       if (isPending) {
         data.creditLimitStatus = 'pending';
       }
    }

    await db.query('UPDATE customers SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/customers/:id/approve-credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (status === 'approved') {
      await db.query(`UPDATE customers SET 
        creditLimit = IF(pendingCreditLimit IS NOT NULL AND pendingCreditLimit > 0, pendingCreditLimit, creditLimit), 
        pendingCreditLimit = 0, 
        requiresAdvance = IF(pendingRequiresAdvance IS NOT NULL, pendingRequiresAdvance, requiresAdvance),
        pendingRequiresAdvance = NULL,
        creditDays = IF(pendingCreditDays IS NOT NULL AND pendingCreditDays > 0, pendingCreditDays, creditDays),
        pendingCreditDays = NULL,
        creditLimitStatus = 'approved' 
        WHERE id = ?`, [id]);
    } else if (status === 'rejected') {
      await db.query(`UPDATE customers SET 
        pendingCreditLimit = 0, 
        pendingRequiresAdvance = NULL,
        pendingCreditDays = NULL,
        creditLimitStatus = 'approved' 
        WHERE id = ?`, [id]); 
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- LEADS --
app.get('/api/leads', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leads ORDER BY lastActivity DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const [result] = await db.query('INSERT INTO leads SET ?', data);
    
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE leads SET ? WHERE id = ?', [data, id]);
    
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE deals SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM deals WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- DEALS --
app.get('/api/deals', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM deals ORDER BY expectedClose ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const [result] = await db.query('INSERT INTO deals SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- QUOTATIONS --
app.get('/api/quotations', async (req, res) => {
    try {
      const [rows] = await db.query(`SELECT q.*, 
        COALESCE(c.name, l.name) as leadName, 
        COALESCE(c.company, l.company) as leadCompany,
        COALESCE(c.address, '') as leadAddress,
        COALESCE(c.vat, l.vat, '') as leadVat,
        COALESCE(c.svat, l.svat, '') as leadSvat
      FROM quotations q 
      LEFT JOIN leads l ON q.leadId = l.id 
      LEFT JOIN customers c ON (q.leadId = c.id OR (l.customerId IS NOT NULL AND l.customerId = c.id))
      ORDER BY q.date DESC`);
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
    }
});

app.get('/api/quotations/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const [rows] = await db.query('SELECT * FROM quotations WHERE leadId = ? ORDER BY type ASC, version DESC', [leadId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const qType = data.type || 'customer';
    
    if (qType === 'draft') {
      const [existing]: any = await db.query(
        'SELECT id FROM quotations WHERE leadId = ? AND type = ? LIMIT 1',
        [data.leadId, 'draft']
      );
      if (existing && existing.length > 0) {
        const draftId = existing[0].id;
        await db.query(
          'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, date=?, docNo=?, issueNo=?, issueDate=? WHERE id=?',
          [JSON.stringify(data.data), data.totalAmount, data.customAmount || null, new Date().toISOString().slice(0, 19).replace('T', ' '), data.docNo || null, data.issueNo || null, data.issueDate || null, draftId]
        );
        return res.json({ success: true, quotation: { id: draftId, version: 1, type: 'draft' } });
      }
    }

    // Version per leadId+type
    const [rows]: any = await db.query(
      'SELECT MAX(version) as maxVer FROM quotations WHERE leadId = ? AND type = ?',
      [data.leadId, qType]
    );
    const nextVersion = (qType === 'draft') ? 1 : ((rows[0].maxVer || 0) + 1);
    
    const newQuotation = {
      id: `QT-${Date.now().toString().slice(-6)}`,
      leadId: data.leadId,
      version: nextVersion,
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      data: JSON.stringify(data.data),
      totalAmount: data.totalAmount,
      customAmount: data.customAmount || null,
      type: qType
    };
    
    await db.query('INSERT INTO quotations SET ?', newQuotation);
    res.json({ success: true, quotation: newQuotation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/quotations/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query(
      'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, type=? WHERE id=?',
      [JSON.stringify(data.data), data.totalAmount, data.customAmount || null, data.type || 'customer', id]
    );
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/quotations/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotations WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- QUOTATION TEMPLATES --
app.get('/api/quotation-templates', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM quotation_templates ORDER BY updatedAt DESC, createdAt DESC');
    const parsed = rows.map((r: any) => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []),
      boms: typeof r.boms === 'string' ? JSON.parse(r.boms || '[]') : (r.boms || []),
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || null),
    }));
    res.json(parsed);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch quotation templates' });
  }
});

app.get('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM quotation_templates WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const r = rows[0];
    const parsed = {
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []),
      boms: typeof r.boms === 'string' ? JSON.parse(r.boms || '[]') : (r.boms || []),
      data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || null),
    };
    res.json(parsed);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch quotation template' });
  }
});

app.post('/api/quotation-templates', async (req, res) => {
  try {
    const { name, description, subject, items, terms, validity, delivery, taxProfileId, boms, data } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    const id = `QTPL-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newTemplate: any = {
      id,
      name,
      description: description || null,
      subject: subject || null,
      items: JSON.stringify(items || []),
      terms: terms || null,
      validity: validity || null,
      delivery: delivery || null,
      taxProfileId: taxProfileId || null,
      boms: JSON.stringify(boms || []),
      data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
      createdAt: now,
      updatedAt: now
    };
    await db.query('INSERT INTO quotation_templates SET ?', newTemplate);
    res.json({ success: true, template: { ...newTemplate, items: items || [], boms: boms || [], data: data || null } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to create quotation template' });
  }
});

app.put('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, items, terms, validity, delivery, taxProfileId, boms, data } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updateData: any = {
      updatedAt: now
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (items !== undefined) updateData.items = JSON.stringify(items);
    if (terms !== undefined) updateData.terms = terms;
    if (validity !== undefined) updateData.validity = validity;
    if (delivery !== undefined) updateData.delivery = delivery;
    if (taxProfileId !== undefined) updateData.taxProfileId = taxProfileId;
    if (boms !== undefined) updateData.boms = JSON.stringify(boms);
    if (data !== undefined) updateData.data = typeof data === 'string' ? data : JSON.stringify(data);

    await db.query('UPDATE quotation_templates SET ? WHERE id = ?', [updateData, id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update quotation template' });
  }
});

app.delete('/api/quotation-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM quotation_templates WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to delete quotation template' });
  }
});

// -- CUSTOMER GRNS --
app.get('/api/crm/grns', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        g.*, 
        COALESCE(g.customerCompany, c.company, l.company, '') as companyName,
        COALESCE(g.customerName, c.name, l.name, '') as personName,
        COALESCE(g.customerName, c.name, l.name, '') as customerName,
        COALESCE(g.customerCompany, c.company, l.company, '') as customerCompany,
        COALESCE(c.phone, l.phone, '') as customerPhone,
        COALESCE(c.email, l.email, '') as customerEmail,
        COALESCE(c.address, '') as customerAddress,
        l.name as leadName, 
        l.company as leadCompany, 
        q.docNo as quotationDocNo,
        q.totalAmount as quotationTotal,
        q.status as quotationStatus,
        q.date as quotationDate,
        COALESCE(g.quoNo, q.docNo, q.id) as displayQuoNo,
        gp.id as gpId,
        gp.issuedDate as gpDate,
        gp.carrier as gpCarrier,
        gp.vehicleNo as gpVehicleNo,
        gp.attention as gpAttention,
        gp.reason as gpReason,
        gp.status as gpStatus
      FROM customer_grns g 
      LEFT JOIN leads l ON g.leadId = l.id 
      LEFT JOIN customers c ON l.customerId = c.id 
      LEFT JOIN quotations q ON g.quoteId = q.id
      LEFT JOIN gate_passes gp ON (g.gatePassId = gp.id OR gp.grnId = g.id)
      ORDER BY g.createdAt DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/crm/grns/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const [rows] = await db.query('SELECT * FROM customer_grns WHERE quoteId = ? ORDER BY createdAt DESC', [quoteId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crm/grns', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    
    // Auto-generate GRN ID (S-XXXX)
    let grnId = data.id;
    if (!grnId) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM customer_grns');
      const nextNum = (countResult[0]?.c || 0) + 1;
      grnId = 'S-' + nextNum.toString().padStart(4, '0');
    }

    const item = {
      ...data,
      id: grnId,
      status: data.status || 'In Stock',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO customer_grns SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/crm/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    await db.query('UPDATE customer_grns SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/crm/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM customer_grns WHERE id = ?', [id]);
    res.json({ success: true, message: 'Customer sample GRN deleted' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- GATE PASSES --
app.get('/api/gate-passes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT gp.*, 
             g.receivedAt as grnReceivedAt, 
             g.receivedBy as grnReceivedBy,
             q.docNo as quotationDocNo,
             COALESCE(gp.quoNo, q.docNo, q.id) as displayQuoNo
      FROM gate_passes gp
      LEFT JOIN customer_grns g ON gp.grnId = g.id
      LEFT JOIN quotations q ON gp.quoteId = q.id
      ORDER BY gp.createdAt DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM gate_passes WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Gate pass not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gate-passes', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') {
      data.items = JSON.stringify(data.items);
    }
    
    // Auto-generate Gate Pass ID (GP-XXXX)
    let gpId = data.id;
    if (!gpId) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM gate_passes');
      const nextNum = (countResult[0]?.c || 0) + 1;
      gpId = 'GP-' + nextNum.toString().padStart(4, '0');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const item = {
      ...data,
      id: gpId,
      issuedDate: data.issuedDate || now,
      status: data.status || 'Dispatched',
      createdAt: now
    };

    await db.query('INSERT INTO gate_passes SET ?', item);

    // If linked to a customer GRN, update GRN status to Dispatched and store gatePassId
    if (item.grnId) {
      await db.query(
        'UPDATE customer_grns SET gatePassId = ?, status = ?, dispatchedAt = ? WHERE id = ?',
        [gpId, 'Dispatched', item.issuedDate, item.grnId]
      );
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    if (data.items && typeof data.items === 'object') {
      data.items = JSON.stringify(data.items);
    }
    await db.query('UPDATE gate_passes SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/gate-passes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE customer_grns SET gatePassId = NULL, status = 'In Stock', dispatchedAt = NULL WHERE gatePassId = ?", [id]);
    await db.query('DELETE FROM gate_passes WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// -- INVENTORY --
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    const item = {
      ...data,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO inventory SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE inventory SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});
// -- STOCK LEDGER --
app.get('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC', [id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT l.*, i.name as materialName, i.uom as unit FROM stock_ledger l JOIN inventory i ON l.inventoryId = i.id WHERE l.reference = ? ORDER BY l.date DESC',
      [req.params.woId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/:id/ledger', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    
    const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [id]);
    const currentQty = invRows.length ? Number(invRows[0].quantity || 0) : 0;
    const qtyVal = Number(data.qty) || 0;
    const newBalance = data.type === 'OUT' ? currentQty - qtyVal : currentQty + qtyVal;

    const entry = {
      id: 'LGR-' + Date.now().toString().slice(-5),
      inventoryId: id,
      date: data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: data.type,
      qty: qtyVal,
      reference: data.reference || '',
      notes: data.notes || ''
    };
    
    await db.query('INSERT INTO stock_ledger SET ?', entry);
    await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newBalance, id]);
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- FINISHED GOODS ORDERS --
app.get('/api/finished-goods-orders', async (req, res) => {
  try {
    const { productId, status } = req.query;
    let query = 'SELECT * FROM finished_goods_orders WHERE 1=1';
    const params: any[] = [];
    if (productId) {
      query += ' AND productId = ?';
      params.push(productId);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/finished-goods-orders', async (req, res) => {
  try {
    const data = { ...req.body };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const id = data.id || `FGO-${Date.now().toString().slice(-6)}`;
    const orderNo = data.orderNo || `ORD-${Date.now().toString().slice(-5)}`;
    
    let stockStatus = 'In Stock';
    if (data.productId) {
      const [inv]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [data.productId]);
      if (inv.length > 0) {
        const available = Number(inv[0].quantity || 0);
        const ordered = Number(data.qty || 1);
        if (available < ordered) {
          stockStatus = `Shortage (${ordered - available} req)`;
        }
      }
    }

    const order = {
      id,
      orderNo,
      productId: data.productId,
      productName: data.productName,
      productSku: data.productSku || '',
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      customerEmail: data.customerEmail || null,
      orderDate: data.orderDate || now.slice(0, 10),
      targetDeliveryDate: data.targetDeliveryDate || null,
      qty: Number(data.qty) || 1,
      unitPrice: Number(data.unitPrice) || 0,
      totalPrice: Number(data.totalPrice) || (Number(data.qty || 1) * Number(data.unitPrice || 0)),
      status: data.status || 'Pending',
      stockStatus: data.stockStatus || stockStatus,
      isDispatched: data.isDispatched ? 1 : 0,
      dispatchedAt: data.dispatchedAt || null,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now
    };

    await db.query('INSERT INTO finished_goods_orders SET ?', order);
    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.put('/api/finished-goods-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE finished_goods_orders SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/finished-goods-orders/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    const [orders]: any = await db.query('SELECT * FROM finished_goods_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];
    if (order.isDispatched) {
      return res.status(400).json({ error: 'Order is already dispatched' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const dispatchQty = Number(order.qty) || 1;

    const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [order.productId]);
    if (invRows.length > 0) {
      const currentQty = Number(invRows[0].quantity || 0);
      const newQty = currentQty - dispatchQty;
      await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, order.productId]);

      const ledgerEntry = {
        id: 'LGR-' + Date.now().toString().slice(-5),
        inventoryId: order.productId,
        date: now,
        type: 'OUT',
        qty: dispatchQty,
        reference: order.orderNo,
        notes: `Dispatched Order ${order.orderNo} for ${order.customerName}`
      };
      await db.query('INSERT INTO stock_ledger SET ?', ledgerEntry);
    }

    await db.query('UPDATE finished_goods_orders SET status = ?, isDispatched = 1, dispatchedAt = ?, updatedAt = ? WHERE id = ?', [
      'Dispatched',
      now,
      now,
      id
    ]);

    res.json({ success: true, message: 'Order dispatched and stock updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.delete('/api/finished-goods-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM finished_goods_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// -- PURCHASING --

// Helper to sync Material Request fulfillment status across all linked Purchase Orders
async function syncMRFulfillmentStatus(targetMrIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetMrIds) ? targetMrIds : [targetMrIds]).filter(Boolean)));
  for (const mrId of ids) {
    try {
      // Find all POs that link to this MR
      const [pos]: any = await db.query(
        'SELECT id, items, mrId, mrIds FROM purchase_orders WHERE mrId = ? OR mrIds LIKE ? OR items LIKE ?',
        [mrId, `%${mrId}%`, `%"mrId":"${mrId}"%`]
      );
      
      const [mrRows]: any = await db.query('SELECT id, items, status FROM material_requests WHERE id = ?', [mrId]);
      if (!mrRows || mrRows.length === 0) continue;
      
      const mr = mrRows[0];
      const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : (mr.items || []);
      
      const orderedMap: Record<string, number> = {};
      const linkedPoIdSet = new Set<string>();

      for (const po of pos) {
        let poMrIds: string[] = [];
        if (Array.isArray(po.mrIds)) poMrIds = po.mrIds;
        else if (typeof po.mrIds === 'string') {
          try { poMrIds = JSON.parse(po.mrIds); } catch { poMrIds = [po.mrIds]; }
        }
        if (po.mrId && !poMrIds.includes(po.mrId)) poMrIds.push(po.mrId);

        const isLinkedToThisMr = poMrIds.includes(mrId);
        const pItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
        let poHasItemsForThisMr = false;

        for (const it of pItems) {
          if (it.mrId ? it.mrId === mrId : isLinkedToThisMr) {
            poHasItemsForThisMr = true;
            const key = String(it.inventoryId || it.desc || it.id || '');
            if (key) {
              orderedMap[key] = (orderedMap[key] || 0) + (Number(it.qty) || 0);
            }
          }
        }

        if (isLinkedToThisMr || poHasItemsForThisMr) {
          linkedPoIdSet.add(po.id);
        }
      }

      let totalRequested = 0;
      let totalOrdered = 0;
      let allItemsFulfilled = mrItems.length > 0;

      for (const mrIt of mrItems) {
        const key = String(mrIt.inventoryId || mrIt.desc || mrIt.id || '');
        const reqQty = Number(mrIt.qty) || 0;
        const ordQty = orderedMap[key] || 0;
        totalRequested += reqQty;
        totalOrdered += Math.min(ordQty, reqQty);
        if (ordQty < reqQty) {
          allItemsFulfilled = false;
        }
      }

      let newStatus = mr.status;
      if (linkedPoIdSet.size === 0 || totalOrdered === 0) {
        newStatus = (mr.status === 'ordered' || mr.status === 'partially_ordered') ? 'approved' : mr.status;
      } else if (allItemsFulfilled || (totalRequested > 0 && totalOrdered >= totalRequested)) {
        newStatus = 'ordered';
      } else {
        newStatus = 'partially_ordered';
      }

      const allPoIds = Array.from(linkedPoIdSet);
      await db.query(
        'UPDATE material_requests SET status = ?, poId = ?, poIds = ?, updatedAt = NOW() WHERE id = ?',
        [newStatus, allPoIds[0] || null, JSON.stringify(allPoIds), mrId]
      );
    } catch (err) {
      console.error(`Error syncing MR ${mrId}:`, err);
    }
  }
}

// Helper to sync Purchase Order receipt status across all linked Goods Received Notes (supports multiple GRNs per PO and multiple POs per GRN)
async function syncPOReceiptStatus(targetPoIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetPoIds) ? targetPoIds : [targetPoIds]).filter(Boolean)));
  for (const poId of ids) {
    try {
      const [poRows]: any = await db.query('SELECT id, items, status FROM purchase_orders WHERE id = ?', [poId]);
      if (!poRows || poRows.length === 0) continue;
      const po = poRows[0];
      const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
      if (!Array.isArray(poItems) || poItems.length === 0) continue;

      // Fetch all GRNs that link to this PO
      const [grnRows]: any = await db.query(
        'SELECT id, items, poId, poIds FROM grns WHERE poId = ? OR poIds LIKE ? OR items LIKE ?',
        [poId, `%${poId}%`, `%"poId":"${poId}"%`]
      );

      const receivedMap: Record<string, number> = {};
      let totalReceivedForThisPO = 0;

      for (const g of grnRows) {
        let gPoIds: string[] = [];
        if (Array.isArray(g.poIds)) gPoIds = g.poIds;
        else if (typeof g.poIds === 'string') {
          try { gPoIds = JSON.parse(g.poIds); } catch { gPoIds = [g.poIds]; }
        }
        if (g.poId && !gPoIds.includes(g.poId)) gPoIds.push(g.poId);

        const isDedicatedToPo = gPoIds.length <= 1 && (g.poId === poId || gPoIds.includes(poId));
        const gItems = typeof g.items === 'string' ? JSON.parse(g.items) : (g.items || []);

        if (Array.isArray(gItems)) {
          for (const gi of gItems) {
            if (gi.poId ? gi.poId === poId : isDedicatedToPo) {
              const key = String(gi.inventoryId || gi.id || gi.desc || '');
              const q = Number(gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty || 0));
              receivedMap[key] = (receivedMap[key] || 0) + q;
              totalReceivedForThisPO += q;
            }
          }
        }
      }

      let totalOrdered = 0;
      let allItemsFulfilled = true;

      for (const pi of poItems) {
        const key = String(pi.inventoryId || pi.id || pi.desc || '');
        const ord = Number(pi.qty || 0);
        const rec = receivedMap[key] || 0;
        totalOrdered += ord;
        if (rec < ord) {
          allItemsFulfilled = false;
        }
      }

      let newStatus = po.status;
      if (grnRows.length === 0 || totalReceivedForThisPO === 0) {
        newStatus = (po.status === 'received' || po.status === 'partially_received') ? 'ordered' : po.status;
      } else if (allItemsFulfilled || (totalOrdered > 0 && totalReceivedForThisPO >= totalOrdered)) {
        newStatus = 'received';
      } else {
        newStatus = 'partially_received';
      }

      await db.query('UPDATE purchase_orders SET status = ?, updatedAt = NOW() WHERE id = ?', [newStatus, poId]);
    } catch (err) {
      console.error(`Error syncing PO receipt status for ${poId}:`, err);
    }
  }
}

// Helper to sync Purchase Order billing status across all linked Supplier Bills (supports multiple invoices per PO)
async function syncPOBillingStatus(targetPoIds: string[] | string) {
  const ids = Array.from(new Set((Array.isArray(targetPoIds) ? targetPoIds : [targetPoIds]).filter(Boolean)));
  for (const poId of ids) {
    try {
      const [poRows]: any = await db.query('SELECT id, totalAmount FROM purchase_orders WHERE id = ?', [poId]);
      if (!poRows || poRows.length === 0) continue;
      const poTotal = Number(poRows[0].totalAmount || 0);

      const [bills]: any = await db.query(
        'SELECT id, invoiceNo, amount, status, date FROM supplier_bills WHERE poId = ? ORDER BY date ASC, createdAt ASC',
        [poId]
      );

      let totalBilled = 0;
      const billIds: string[] = [];
      const invoiceNos: string[] = [];

      for (const b of bills) {
        totalBilled += Number(b.amount || 0);
        billIds.push(b.id);
        if (b.invoiceNo && !invoiceNos.includes(b.invoiceNo)) {
          invoiceNos.push(b.invoiceNo);
        }
      }

      let billingStatus = 'unbilled';
      if (bills.length > 0 && totalBilled > 0) {
        if (totalBilled >= (poTotal - 0.01)) {
          billingStatus = 'billed';
        } else {
          billingStatus = 'partially_billed';
        }
      }

      await db.query(
        'UPDATE purchase_orders SET billedAmount = ?, billingStatus = ?, billIds = ?, invoiceNos = ?, updatedAt = NOW() WHERE id = ?',
        [totalBilled, billingStatus, JSON.stringify(billIds), JSON.stringify(invoiceNos), poId]
      );
    } catch (err) {
      console.error(`Failed to sync billing status for PO ${poId}:`, err);
    }
  }
}


// MR ROUTES
app.get('/api/purchasing/mrs', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM material_requests ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.poIds === 'string') {
        try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
      } else if (!r.poIds) {
        r.poIds = r.poId ? [r.poId] : [];
      }
      if (typeof r.workOrderNos === 'string') {
        try { r.workOrderNos = JSON.parse(r.workOrderNos); } catch(e) { r.workOrderNos = [r.workOrderNo].filter(Boolean); }
      } else if (!r.workOrderNos) {
        r.workOrderNos = r.workOrderNo ? [r.workOrderNo] : [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM material_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Material request not found' });
    const r = rows[0];
    if (typeof r.poIds === 'string') {
      try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
    } else if (!r.poIds) {
      r.poIds = r.poId ? [r.poId] : [];
    }
    if (typeof r.workOrderNos === 'string') {
      try { r.workOrderNos = JSON.parse(r.workOrderNos); } catch(e) { r.workOrderNos = [r.workOrderNo].filter(Boolean); }
    } else if (!r.workOrderNos) {
      r.workOrderNos = r.workOrderNo ? [r.workOrderNo] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/mrs', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    if (data.poIds && typeof data.poIds === 'object') data.poIds = JSON.stringify(data.poIds);
    if (data.workOrderNos && typeof data.workOrderNos === 'object') {
      if (Array.isArray(data.workOrderNos) && data.workOrderNos.length > 0 && !data.workOrderNo) {
        data.workOrderNo = data.workOrderNos[0];
      }
      data.workOrderNos = JSON.stringify(data.workOrderNos);
    }
    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO material_requests SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    if (data.poIds && typeof data.poIds === 'object') data.poIds = JSON.stringify(data.poIds);
    if (data.workOrderNos && typeof data.workOrderNos === 'object') {
      if (Array.isArray(data.workOrderNos) && data.workOrderNos.length > 0 && !data.workOrderNo) {
        data.workOrderNo = data.workOrderNos[0];
      }
      data.workOrderNos = JSON.stringify(data.workOrderNos);
    }
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE material_requests SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/mrs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM material_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PO ROUTES
app.get('/api/purchasing/pos', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM purchase_orders ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.mrIds === 'string') {
        try { r.mrIds = JSON.parse(r.mrIds); } catch(e) { r.mrIds = [r.mrId].filter(Boolean); }
      } else if (!r.mrIds) {
        r.mrIds = r.mrId ? [r.mrId] : [];
      }
      if (typeof r.billIds === 'string') {
        try { r.billIds = JSON.parse(r.billIds); } catch(e) { r.billIds = []; }
      } else if (!r.billIds) {
        r.billIds = [];
      }
      if (typeof r.invoiceNos === 'string') {
        try { r.invoiceNos = JSON.parse(r.invoiceNos); } catch(e) { r.invoiceNos = []; }
      } else if (!r.invoiceNos) {
        r.invoiceNos = [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Purchase order not found' });
    const r = rows[0];
    if (typeof r.mrIds === 'string') {
      try { r.mrIds = JSON.parse(r.mrIds); } catch(e) { r.mrIds = [r.mrId].filter(Boolean); }
    } else if (!r.mrIds) {
      r.mrIds = r.mrId ? [r.mrId] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/pos', async (req, res) => {
  try {
    const data = { ...req.body };
    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch { itemsArray = []; }
    }
    if (data.taxBreakdown && typeof data.taxBreakdown === 'object') data.taxBreakdown = JSON.stringify(data.taxBreakdown);

    // Extract all MR IDs from mrId, mrIds, and item level
    const targetMrIds = new Set<string>();
    if (data.mrId) targetMrIds.add(data.mrId);
    if (Array.isArray(data.mrIds)) data.mrIds.forEach((m: string) => targetMrIds.add(m));
    else if (typeof data.mrIds === 'string') {
      try { JSON.parse(data.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(data.mrIds); }
    }
    for (const it of itemsArray) {
      if (it.mrId) targetMrIds.add(it.mrId);
    }

    if (targetMrIds.size > 0 && !data.mrId) {
      data.mrId = Array.from(targetMrIds)[0];
    }
    data.mrIds = JSON.stringify(Array.from(targetMrIds));

    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.query('INSERT INTO purchase_orders SET ?', data);

    // Sync all affected Material Requests
    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;

    // Fetch existing PO to detect previously linked MRs
    const [existingRows]: any = await db.query('SELECT mrId, mrIds, items FROM purchase_orders WHERE id = ?', [req.params.id]);
    const prevMrIds = new Set<string>();
    if (existingRows.length > 0) {
      const ex = existingRows[0];
      if (ex.mrId) prevMrIds.add(ex.mrId);
      if (ex.mrIds) {
        try { JSON.parse(ex.mrIds).forEach((m: string) => prevMrIds.add(m)); } catch { prevMrIds.add(ex.mrIds); }
      }
      const exItems = typeof ex.items === 'string' ? JSON.parse(ex.items) : (ex.items || []);
      for (const it of exItems) { if (it.mrId) prevMrIds.add(it.mrId); }
    }

    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch { itemsArray = []; }
    }
    if (data.taxBreakdown && typeof data.taxBreakdown === 'object') data.taxBreakdown = JSON.stringify(data.taxBreakdown);

    const targetMrIds = new Set<string>(prevMrIds);
    if (data.mrId) targetMrIds.add(data.mrId);
    if (Array.isArray(data.mrIds)) data.mrIds.forEach((m: string) => targetMrIds.add(m));
    else if (typeof data.mrIds === 'string') {
      try { JSON.parse(data.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(data.mrIds); }
    }
    for (const it of itemsArray) {
      if (it.mrId) targetMrIds.add(it.mrId);
    }

    if (data.mrIds && Array.isArray(data.mrIds)) {
      data.mrIds = JSON.stringify(data.mrIds);
    }

    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE purchase_orders SET ? WHERE id = ?', [data, req.params.id]);

    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/pos/:id', async (req, res) => {
  try {
    const [poRows]: any = await db.query('SELECT mrId, mrIds, items FROM purchase_orders WHERE id = ?', [req.params.id]);
    const targetMrIds = new Set<string>();
    if (poRows.length > 0) {
      const p = poRows[0];
      if (p.mrId) targetMrIds.add(p.mrId);
      if (p.mrIds) {
        try { JSON.parse(p.mrIds).forEach((m: string) => targetMrIds.add(m)); } catch { targetMrIds.add(p.mrIds); }
      }
      const pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
      for (const it of pItems) { if (it.mrId) targetMrIds.add(it.mrId); }
    }
    
    await db.query('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);

    if (targetMrIds.size > 0) {
      await syncMRFulfillmentStatus(Array.from(targetMrIds));
    }

    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GRN ROUTES
app.get('/api/purchasing/grns', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM grns ORDER BY date DESC, createdAt DESC');
    for (const r of rows) {
      if (typeof r.items === 'string') {
        try { r.items = JSON.parse(r.items); } catch(e) { r.items = []; }
      } else if (!Array.isArray(r.items)) {
        r.items = [];
      }
      if (typeof r.poIds === 'string') {
        try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
      } else if (!r.poIds) {
        r.poIds = r.poId ? [r.poId] : [];
      }
    }
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/grns/:id', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const [rows]: any = await db.query('SELECT * FROM grns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'GRN not found' });
    const r = rows[0];
    if (typeof r.items === 'string') {
      try { r.items = JSON.parse(r.items); } catch(e) { r.items = []; }
    } else if (!Array.isArray(r.items)) {
      r.items = [];
    }
    if (typeof r.poIds === 'string') {
      try { r.poIds = JSON.parse(r.poIds); } catch(e) { r.poIds = [r.poId].filter(Boolean); }
    } else if (!r.poIds) {
      r.poIds = r.poId ? [r.poId] : [];
    }
    res.json(r);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/grns', async (req, res) => {
  try {
    const data = { ...req.body };
    let itemsArray: any[] = [];
    if (Array.isArray(data.items)) {
      itemsArray = data.items;
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'object' && data.items !== null) {
      itemsArray = [data.items];
      data.items = JSON.stringify(data.items);
    } else if (typeof data.items === 'string') {
      try { itemsArray = JSON.parse(data.items); } catch(e) { itemsArray = []; }
    }

    // Extract all PO IDs (from poId, poIds, and item-level poId)
    const targetPoIds = new Set<string>();
    if (data.poId) targetPoIds.add(data.poId);
    if (Array.isArray(data.poIds)) data.poIds.forEach((p: string) => targetPoIds.add(p));
    else if (typeof data.poIds === 'string') {
      try { JSON.parse(data.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(data.poIds); }
    }
    for (const it of itemsArray) {
      if (it.poId) targetPoIds.add(it.poId);
    }

    if (targetPoIds.size > 0 && !data.poId) {
      data.poId = Array.from(targetPoIds)[0];
    }
    data.poIds = JSON.stringify(Array.from(targetPoIds));

    if (!data.createdAt) data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!data.updatedAt) data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.query('INSERT INTO grns SET ?', data);

    // Update inventory stock and record in stock ledger
    for (const item of itemsArray) {
      const invId = item.inventoryId || item.id;
      const qtyRecv = Number(item.qtyReceived !== undefined ? item.qtyReceived : (item.qty || 0));
      if (invId && qtyRecv > 0) {
        try {
          const [invRows]: any = await db.query('SELECT quantity FROM inventory WHERE id = ?', [invId]);
          if (invRows.length > 0) {
            const currentQty = Number(invRows[0].quantity || 0);
            const newQty = currentQty + qtyRecv;
            await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, invId]);

            const itemPoRef = item.poId || data.poId || 'N/A';
            const ledgerEntry = {
              id: 'LGR-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000),
              inventoryId: invId,
              date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ')) : new Date().toISOString().slice(0, 19).replace('T', ' '),
              type: 'IN',
              qty: qtyRecv,
              reference: data.id,
              notes: `GRN Received (PO: ${itemPoRef})${item.condition ? ` - Condition: ${item.condition}` : ''}`
            };
            await db.query('INSERT INTO stock_ledger SET ?', ledgerEntry);
          }
        } catch (e) {
          console.error('Error updating inventory stock from GRN:', e);
        }
      }
    }

    // Sync all linked POs
    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Failed to create GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/purchasing/grns/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;

    // Find previous POs
    const [exRows]: any = await db.query('SELECT poId, poIds, items FROM grns WHERE id = ?', [req.params.id]);
    const targetPoIds = new Set<string>();
    if (exRows.length > 0) {
      const ex = exRows[0];
      if (ex.poId) targetPoIds.add(ex.poId);
      if (ex.poIds) {
        try { JSON.parse(ex.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(ex.poIds); }
      }
    }

    if (data.items !== undefined && typeof data.items === 'object') {
      if (Array.isArray(data.items)) {
        for (const it of data.items) { if (it.poId) targetPoIds.add(it.poId); }
      }
      data.items = JSON.stringify(data.items);
    }
    if (data.poId) targetPoIds.add(data.poId);
    if (Array.isArray(data.poIds)) data.poIds.forEach((p: string) => targetPoIds.add(p));
    else if (typeof data.poIds === 'string') {
      try { JSON.parse(data.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(data.poIds); }
    }
    if (data.poIds && Array.isArray(data.poIds)) {
      data.poIds = JSON.stringify(data.poIds);
    }

    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE grns SET ? WHERE id = ?', [data, req.params.id]);

    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/grns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [grnRows]: any = await db.query('SELECT * FROM grns WHERE id = ?', [id]);
    if (!grnRows.length) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    const grn = grnRows[0];
    let itemsArray: any[] = [];
    if (typeof grn.items === 'string') {
      try { itemsArray = JSON.parse(grn.items); } catch(e) { itemsArray = []; }
    } else if (Array.isArray(grn.items)) {
      itemsArray = grn.items;
    }

    const targetPoIds = new Set<string>();
    if (grn.poId) targetPoIds.add(grn.poId);
    if (grn.poIds) {
      try { JSON.parse(grn.poIds).forEach((p: string) => targetPoIds.add(p)); } catch { targetPoIds.add(grn.poIds); }
    }
    for (const it of itemsArray) {
      if (it.poId) targetPoIds.add(it.poId);
    }

    // Revert inventory quantity
    for (const item of itemsArray) {
      const invId = item.inventoryId || item.id;
      const qtyRecv = Number(item.qtyReceived !== undefined ? item.qtyReceived : (item.qty || 0));
      if (invId && qtyRecv > 0) {
        try {
          await db.query('UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [qtyRecv, invId]);
        } catch (e) {
          console.error('Error reverting inventory stock on GRN delete:', e);
        }
      }
    }

    // Delete stock ledger entries linked to this GRN
    await db.query('DELETE FROM stock_ledger WHERE reference = ?', [id]);

    // Delete GRN
    await db.query('DELETE FROM grns WHERE id = ?', [id]);

    // Recalculate all affected PO statuses
    if (targetPoIds.size > 0) {
      await syncPOReceiptStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, message: 'GRN deleted and inventory reverted successfully' });
  } catch (error: any) {
    console.error('Failed to delete GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/purchasing/bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM supplier_bills ORDER BY date DESC, createdAt DESC');
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.get('/api/purchasing/pos/:id/bills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM supplier_bills WHERE poId = ? ORDER BY date DESC, createdAt DESC', [req.params.id]);
    res.json(rows);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/purchasing/bills', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    await db.query('INSERT INTO supplier_bills SET ?', data);

    // Also automatically create corresponding ledger entry in supplier_ledger
    if (data.supplierId && data.amount) {
      const ledgerEntry = {
        id: `SL-BILL-${Date.now().toString().slice(-6)}`,
        supplierId: data.supplierId,
        date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ')) : new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: 'purchase',
        referenceNo: data.invoiceNo || data.id,
        description: `Supplier Bill ${data.id}${data.poId ? ` (PO: ${data.poId})` : ''} - ${data.notes || 'Vendor Bill'}`,
        debit: Number(data.amount) || 0,
        credit: 0,
        amount: Number(data.amount) || 0,
        reference: data.invoiceNo || data.id,
        notes: data.notes || ''
      };
      await db.query('INSERT INTO supplier_ledger SET ?', ledgerEntry);

      // Sync supplier balance
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [data.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, data.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on bill:', errBal);
      }
    }

    // Sync PO billing status
    if (data.poId) {
      await syncPOBillingStatus(data.poId);
    }

    res.json({ success: true, id: data.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.put('/api/purchasing/bills/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
    
    // Find previous poId
    const [prevRows]: any = await db.query('SELECT poId FROM supplier_bills WHERE id = ?', [req.params.id]);
    const oldPoId = prevRows[0]?.poId;

    await db.query('UPDATE supplier_bills SET ? WHERE id = ?', [data, req.params.id]);

    const targetPoIds = new Set<string>();
    if (oldPoId) targetPoIds.add(oldPoId);
    if (data.poId) targetPoIds.add(data.poId);
    if (targetPoIds.size > 0) {
      await syncPOBillingStatus(Array.from(targetPoIds));
    }

    res.json({ success: true, id: req.params.id });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/purchasing/bills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM supplier_bills WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Bill not found' });
    const bill = rows[0];

    // Revert supplier ledger
    await db.query('DELETE FROM supplier_ledger WHERE referenceNo = ? OR reference = ?', [bill.invoiceNo || bill.id, bill.id]);

    // Delete bill
    await db.query('DELETE FROM supplier_bills WHERE id = ?', [id]);

    // Sync supplier balance
    if (bill.supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [bill.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, bill.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on delete bill:', errBal);
      }
    }

    // Sync PO billing status
    if (bill.poId) {
      await syncPOBillingStatus(bill.poId);
    }

    res.json({ success: true, message: 'Bill deleted and supplier ledger reverted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- SUPPLIERS --
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows]: any = await db.query(`
      SELECT s.*,
        COALESCE(SUM(l.debit), 0) as totalPurchases,
        COALESCE(SUM(l.credit), 0) as totalPaid,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, 0)) as outstandingBalance
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      GROUP BY s.id
      ORDER BY s.createdAt DESC
    `);
    for (const r of rows) {
      if (typeof r.contacts === 'string') {
        try { r.contacts = JSON.parse(r.contacts); } catch(e) { r.contacts = []; }
      } else if (!r.contacts) {
        r.contacts = [];
      }
      r.contactName = r.contactName || r.contactPerson || '';
      r.contactPerson = r.contactPerson || r.contactName || '';
      r.totalPurchases = Number(r.totalPurchases) || 0;
      r.totalPaid = Number(r.totalPaid) || 0;
      r.openingBalance = Number(r.openingBalance !== undefined ? r.openingBalance : 0) || 0;
      r.outstandingBalance = Number(r.outstandingBalance) || 0;
      r.balance = r.outstandingBalance;
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const [rows]: any = await db.query(`
      SELECT s.*,
        COALESCE(SUM(l.debit), 0) as totalPurchases,
        COALESCE(SUM(l.credit), 0) as totalPaid,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, 0)) as outstandingBalance
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      WHERE s.id = ?
      GROUP BY s.id
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Supplier not found' });
    const r = rows[0];
    if (typeof r.contacts === 'string') {
      try { r.contacts = JSON.parse(r.contacts); } catch(e) { r.contacts = []; }
    } else if (!r.contacts) {
      r.contacts = [];
    }
    r.contactName = r.contactName || r.contactPerson || '';
    r.contactPerson = r.contactPerson || r.contactName || '';
    r.totalPurchases = Number(r.totalPurchases) || 0;
    r.totalPaid = Number(r.totalPaid) || 0;
    r.openingBalance = Number(r.openingBalance !== undefined ? r.openingBalance : 0) || 0;
    r.outstandingBalance = Number(r.outstandingBalance) || 0;
    r.balance = r.outstandingBalance;
    res.json(r);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') {
      data.contacts = JSON.stringify(data.contacts);
    }
    if (!data.id) {
      const [countResult]: any = await db.query('SELECT COUNT(*) as c FROM suppliers');
      const nextNum = (countResult[0]?.c || 0) + 1;
      data.id = 'SUP-' + nextNum.toString().padStart(4, '0');
    }
    if (data.contactName && !data.contactPerson) data.contactPerson = data.contactName;
    if (data.contactPerson && !data.contactName) data.contactName = data.contactPerson;

    const item = {
      ...data,
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    await db.query('INSERT INTO suppliers SET ?', item);
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    if (data.contacts && typeof data.contacts === 'object') {
      data.contacts = JSON.stringify(data.contacts);
    }
    if (data.contactName && !data.contactPerson) data.contactPerson = data.contactName;
    if (data.contactPerson && !data.contactName) data.contactName = data.contactPerson;

    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE suppliers SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- FOLLOWUPS --
app.get('/api/followups', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM followups ORDER BY dueDate ASC, dueTime ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.get('/api/followups/related/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const [rows] = await db.query('SELECT * FROM followups WHERE relatedType = ? AND relatedId = ? ORDER BY dueDate DESC', [type, id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/followups', async (req, res) => {
    try {
      const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
      if (!data.id) {
        data.id = 'FOL-' + Date.now().toString().slice(-6);
        data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    const [result] = await db.query('INSERT INTO followups SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE followups SET ? WHERE id = ?', [data, id]);
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/followups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM followups WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- INVOICES --
app.get('/api/invoices/next-number', async (req, res) => {
  try {
    const rawDate = (req.query.date as string) || new Date().toISOString();
    const dateObj = new Date(rawDate);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    
    const yy = validDate.getFullYear().toString().slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[validDate.getMonth()];
    
    // Entity / Branch code (1-15 alphanumeric characters, default REX)
    let entity = ((req.query.entity as string) || 'REX').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!entity) entity = 'REX';
    if (entity.length > 15) entity = entity.slice(0, 15);

    const [rows]: any = await db.query(
      `SELECT invoiceNo FROM invoices 
       WHERE invoiceNo LIKE ? OR invoiceNo LIKE ? 
       ORDER BY id DESC`,
      [`${yy}${mmm}_${entity}_%`, `%_${entity}_%`]
    );

    let maxNum = 0;
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (!row.invoiceNo) continue;
        const parts = row.invoiceNo.trim().split('_');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
          const num = parseInt(lastPart, 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const nextSeq = (maxNum + 1).toString().padStart(5, '0');
    const invoiceNo = `${yy}${mmm}_${entity}_${nextSeq}`;

    res.json({ invoiceNo, yy, mmm, entity, seq: nextSeq });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.invoiceNo) {
      data.invoiceNo = data.invoiceNo.trim().replace(/\s+/g, '');
    } else {
      const rawDate = data.date || new Date().toISOString();
      const dObj = new Date(rawDate);
      const validD = isNaN(dObj.getTime()) ? new Date() : dObj;
      const yy = validD.getFullYear().toString().slice(-2);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mmm = months[validD.getMonth()];
      const entity = 'REX';
      const [rows]: any = await db.query(
        `SELECT invoiceNo FROM invoices WHERE invoiceNo LIKE ? ORDER BY id DESC`,
        [`${yy}${mmm}_${entity}_%`]
      );
      let maxNum = 0;
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!row.invoiceNo) continue;
          const parts = row.invoiceNo.trim().split('_');
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            const num = parseInt(lastPart, 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      data.invoiceNo = `${yy}${mmm}_${entity}_${(maxNum + 1).toString().padStart(5, '0')}`;
    }
    if (!data.id) data.id = data.invoiceNo;
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('INSERT INTO invoices SET ?', data);
    
    // Auto GL: Accrual Basis - Record Receivable & Sales
    try {
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1') as any;
      let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1') as any;

      if (arAcc.length === 0) {
        const arId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }

      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const invTotal = Number(data.total) || 0;
        const invSub = Number(data.subtotal) || invTotal;

        // Parse tax breakdown from taxProfileId
        let taxBreakdown: any = null;
        try { taxBreakdown = data.taxBreakdown ? JSON.parse(data.taxBreakdown) : null; } catch(e) {}

        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.invoiceNo || data.id, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });

        const lines: any[] = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
        ];
        
        let getOrCreateTaxAcc = async () => {
          const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
          if (defTax[0]) return defTax[0].id;
          const newId = 'ACC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "2200", "Tax Payable", "Liability", "Tax", 0, NOW())', [newId]);
          return newId;
        };

        // Use tax profile accounts if available
        if (taxBreakdown && data.taxProfileId) {
          const [profile] = await db.query('SELECT * FROM tax_profiles WHERE id = ?', [data.taxProfileId]) as any;
          const prof = profile[0];
          if (prof) {
            const tax1Amt = Number(taxBreakdown.tax1Amount) || 0;
            const tax2Amt = Number(taxBreakdown.tax2Amount) || 0;

            if (tax1Amt > 0) {
              let tax1AccId = prof.tax1_accountId;
              if (!tax1AccId) tax1AccId = await getOrCreateTaxAcc();
              if (tax1AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, tax1AccId, 0, tax1Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax1Amt, tax1AccId]);
              }
            }
            if (tax2Amt > 0) {
              let tax2AccId = prof.tax2_accountId;
              if (!tax2AccId) tax2AccId = await getOrCreateTaxAcc();
              if (tax2AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '4', jeId, tax2AccId, 0, tax2Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax2Amt, tax2AccId]);
              }
            }
          }
        } else if (Number(data.taxAmount) > 0) {
          // Fallback: generic tax payable
          const taxAccId = await getOrCreateTaxAcc();
          if (taxAccId) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAccId, 0, Number(data.taxAmount), null, null]);
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [Number(data.taxAmount), taxAccId]);
          }
        }

        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invSub, salesAcc[0].id]);
      }
    } catch(e) { console.error('Auto GL Invoice Error:', e); }

    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE invoices SET ? WHERE id = ? OR invoiceNo = ?', [data, id, id]);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the invoice before deleting to get its payments and amounts
    const [rows]: any = await db.query('SELECT * FROM invoices WHERE id = ? OR invoiceNo = ? LIMIT 1', [id, id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    let existingPayments: any[] = [];
    if (invoice.payments) {
      if (Array.isArray(invoice.payments)) {
        existingPayments = invoice.payments;
      } else if (typeof invoice.payments === 'string' && invoice.payments.trim()) {
        try {
          const parsed = JSON.parse(invoice.payments);
          if (Array.isArray(parsed)) existingPayments = parsed;
        } catch (e) {}
      }
    }
    
    // References to reverse from GL
    const references = [invoice.id];
    if (invoice.invoiceNo && invoice.invoiceNo !== invoice.id) {
      references.push(invoice.invoiceNo);
    }
    existingPayments.forEach((p: any) => { if (p && p.id) references.push(p.id); });
    
    // Find Journal Entries to delete
    if (references.length > 0) {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference IN (?)', [references]);
      
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        
        // Find Journal Lines to reverse balances
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        
        // Generic GL Reversal
        try {
          // Find all lines and accounts
          for (const line of lines) {
            const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
            if (!accounts.length) continue;
            
            const accType = accounts[0].type;
            const isDebitNormal = accType === 'Asset' || accType === 'Expense';
            const balanceChange = Number(line.debit) - Number(line.credit); // What this line originally added to the normal balance
            
            if (isDebitNormal) {
              await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
            } else {
              // for credit normal, it added -balanceChange
              await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
            }
          }
        } catch(e) { console.error('Error reversing GL on Invoice Deletion:', e); }
        
        // Delete the journal lines and entries
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    }
    
    // Finally delete the invoice
    await db.query('DELETE FROM invoices WHERE id = ?', [invoice.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = req.body;
    
    // Ensure invoice payment columns exist safely
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN payments TEXT');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN paidAmount DECIMAL(15,2) DEFAULT 0.00');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN total DECIMAL(15,2) DEFAULT 0.00');
    } catch (e) {}
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN customerId VARCHAR(50) DEFAULT NULL');
    } catch (e) {}

    // Resilient lookup: match by id or invoiceNo
    const [rows]: any = await db.query('SELECT * FROM invoices WHERE id = ? OR invoiceNo = ? LIMIT 1', [id, id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    
    // Safely parse existing payments
    let existingPayments: any[] = [];
    if (invoice.payments) {
      if (Array.isArray(invoice.payments)) {
        existingPayments = invoice.payments;
      } else if (typeof invoice.payments === 'string' && invoice.payments.trim()) {
        try {
          const parsed = JSON.parse(invoice.payments);
          if (Array.isArray(parsed)) existingPayments = parsed;
        } catch (e) {
          existingPayments = [];
        }
      }
    }
    
    const paymentAmount = Number(payment.amount) || 0;
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payment amount greater than zero' });
    }

    // Format payment date for MySQL DATETIME
    const nowIso = new Date().toISOString();
    const defaultMysqlDate = nowIso.slice(0, 19).replace('T', ' ');
    let pDate = defaultMysqlDate;
    if (payment.date) {
      try {
        const d = new Date(payment.date);
        pDate = isNaN(d.getTime()) ? defaultMysqlDate : d.toISOString().slice(0, 19).replace('T', ' ');
      } catch (e) {
        pDate = defaultMysqlDate;
      }
    }
    
    // Add new payment record
    const newPayment = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: pDate,
      amount: paymentAmount,
      method: payment.method || 'Cash',
      reference: payment.reference || ''
    };
    
    existingPayments.push(newPayment);
    const prevPaidAmount = Number(invoice.paidAmount || 0);
    const newPaidAmount = prevPaidAmount + paymentAmount;
    
    const invoiceTotal = Number(invoice.total !== undefined && invoice.total !== null ? invoice.total : (invoice.amount || 0));
    const newStatus = (invoiceTotal > 0 && newPaidAmount >= invoiceTotal) ? 'paid' : (invoice.status === 'draft' ? 'sent' : (invoice.status || 'sent'));
    
    await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments),
      newPaidAmount,
      newStatus,
      invoice.id
    ]);

    // Auto GL: Accrual Basis - Record Payment (Debit Cash, Credit AR)
    try {
      let [cashAcc]: any = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
      let [arAcc]: any = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1');
      
      if (!cashAcc || cashAcc.length === 0) {
        const cashId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
        cashAcc = [{ id: cashId }];
      }
      if (!arAcc || arAcc.length === 0) {
        const arId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }
      
      if (cashAcc && cashAcc.length > 0 && arAcc && arAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 100);
        
        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId,
          date: pDate,
          reference: newPayment.id,
          description: `Auto GL: Invoice Payment Received (${invoice.invoiceNo || invoice.id})`,
          totalAmount: paymentAmount
        });
        
        const customerPartyId = invoice.customerId || invoice.leadId || null;
        const lines = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, cashAcc[0].id, paymentAmount, 0, null, null],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, arAcc[0].id, 0, paymentAmount, customerPartyId, 'Customer']
        ];
        
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [paymentAmount, cashAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [paymentAmount, arAcc[0].id]); // Credit AR reduces asset balance
      }
    } catch (e) {
      console.error('Auto GL Payment Error:', e);
    }
    
    res.json({
      success: true,
      payment: newPayment,
      newStatus,
      newPaidAmount,
      payments: existingPayments
    });
  } catch (error: any) {
    console.error('Invoice Payment Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

// -- SUPPLIER LEDGER --
app.get('/api/supplier-ledger/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const [rows]: any = await db.query(
      'SELECT * FROM supplier_ledger WHERE supplierId = ? ORDER BY date DESC, id DESC',
      [supplierId]
    );
    for (const r of rows) {
      r.referenceNo = r.referenceNo || r.reference || '';
      r.reference = r.reference || r.referenceNo || '';
      r.description = r.description || r.notes || '';
      r.notes = r.notes || r.description || '';
      if (r.debit === undefined || r.debit === null) {
        r.debit = (r.type === 'purchase' || r.type === 'bill') ? Number(r.amount) || 0 : 0;
      } else {
        r.debit = Number(r.debit) || 0;
      }
      if (r.credit === undefined || r.credit === null) {
        r.credit = (r.type === 'payment' || r.type === 'return' || r.type === 'advance') ? Number(r.amount) || 0 : 0;
      } else {
        r.credit = Number(r.credit) || 0;
      }
      r.amount = Number(r.amount) || (r.debit > 0 ? r.debit : r.credit);
    }
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.post('/api/supplier-ledger', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    
    const debit = Number(data.debit) || (data.type === 'purchase' || data.type === 'bill' ? Number(data.amount) || 0 : 0);
    const credit = Number(data.credit) || (data.type === 'payment' || data.type === 'return' || data.type === 'advance' ? Number(data.amount) || 0 : 0);
    const amount = Number(data.amount) || (debit > 0 ? debit : credit);
    const ref = data.referenceNo || data.reference || '';
    const desc = data.description || data.notes || '';

    const item: any = {
      id: data.id || `SL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      supplierId: data.supplierId,
      date: data.date ? (data.date.length === 10 ? data.date + ' 00:00:00' : data.date.replace('T', ' ').slice(0, 19)) : new Date().toISOString().slice(0, 19).replace('T', ' '),
      type: data.type || (credit > 0 ? 'payment' : 'purchase'),
      referenceNo: ref,
      description: desc,
      debit,
      credit,
      amount,
      reference: ref,
      notes: desc,
      paymentMethod: data.paymentMethod || (credit > 0 ? 'Bank Transfer' : 'Invoice')
    };
    if (data.bankAccountId) {
      item.bankAccountId = data.bankAccountId;
    }
    if (data.debitAccountId) item.debitAccountId = data.debitAccountId;
    if (data.creditAccountId) item.creditAccountId = data.creditAccountId;
    if (data.debitAccountName) item.debitAccountName = data.debitAccountName;
    if (data.creditAccountName) item.creditAccountName = data.creditAccountName;

    // Smart fallbacks if not chosen
    if (!item.debitAccountId) {
      if (item.type === 'payment' || item.credit > 0) {
        try {
          const [ap]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "2000" OR name LIKE "%Payable%" LIMIT 1');
          if (ap.length) {
            item.debitAccountId = ap[0].id;
            if (!item.debitAccountName) item.debitAccountName = `${ap[0].code} - ${ap[0].name}`;
          }
        } catch (e) {}
      } else {
        try {
          const [exp]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "5000" OR type = "Expense" LIMIT 1');
          if (exp.length) {
            item.debitAccountId = exp[0].id;
            if (!item.debitAccountName) item.debitAccountName = `${exp[0].code} - ${exp[0].name}`;
          }
        } catch (e) {}
      }
    }

    if (!item.creditAccountId) {
      if (item.type === 'payment' || item.credit > 0) {
        try {
          const [cb]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "1000" OR subtype IN ("Bank", "Cash") OR type = "Asset" LIMIT 1');
          if (cb.length) {
            item.creditAccountId = cb[0].id;
            if (!item.creditAccountName) item.creditAccountName = `${cb[0].code} - ${cb[0].name}`;
          }
        } catch (e) {}
      } else {
        try {
          const [ap]: any = await db.query('SELECT id, code, name FROM chart_of_accounts WHERE code = "2000" OR name LIKE "%Payable%" LIMIT 1');
          if (ap.length) {
            item.creditAccountId = ap[0].id;
            if (!item.creditAccountName) item.creditAccountName = `${ap[0].code} - ${ap[0].name}`;
          }
        } catch (e) {}
      }
    }

    // Auto-resolve account names if not provided
    if (item.debitAccountId && !item.debitAccountName) {
      try {
        const [acc]: any = await db.query('SELECT code, name FROM chart_of_accounts WHERE id = ?', [item.debitAccountId]);
        if (acc.length) item.debitAccountName = `${acc[0].code} - ${acc[0].name}`;
      } catch (eAcc) {}
    }
    if (item.creditAccountId && !item.creditAccountName) {
      try {
        const [acc]: any = await db.query('SELECT code, name FROM chart_of_accounts WHERE id = ?', [item.creditAccountId]);
        if (acc.length) item.creditAccountName = `${acc[0].code} - ${acc[0].name}`;
      } catch (eAcc) {}
    }

    await db.query('INSERT INTO supplier_ledger SET ?', item);

    // Auto GL Integration: Create Journal Entry & Lines
    try {
      let debitAccId = item.debitAccountId;
      let creditAccId = item.creditAccountId;

      if (debitAccId && creditAccId && amount > 0) {
        const jeId = `JE-SL-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        const jeDesc = (item.type === 'payment' || item.credit > 0)
          ? `Supplier Payment: ${item.description || item.referenceNo || item.id}`
          : `Supplier Transaction: ${item.description || item.referenceNo || item.id}`;

        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId,
          date: item.date,
          reference: item.id,
          description: jeDesc,
          totalAmount: amount
        });

        const lines = [
          [`JL-${Date.now().toString().slice(-6)}1`, jeId, debitAccId, amount, 0, item.supplierId || null, 'Supplier'],
          [`JL-${Date.now().toString().slice(-6)}2`, jeId, creditAccId, 0, amount, item.supplierId || null, 'Supplier']
        ];
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);

        // Update balances in chart_of_accounts
        const [accTypes]: any = await db.query('SELECT id, type FROM chart_of_accounts WHERE id IN (?, ?)', [debitAccId, creditAccId]);
        for (const acc of accTypes) {
          if (acc.id === debitAccId) {
            const delta = (acc.type === 'Asset' || acc.type === 'Expense') ? amount : -amount;
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [delta, acc.id]);
          } else if (acc.id === creditAccId) {
            const delta = (acc.type === 'Asset' || acc.type === 'Expense') ? -amount : amount;
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [delta, acc.id]);
          }
        }
      }
    } catch (eGl) {
      console.error('Error posting GL for supplier ledger:', eGl);
    }

    // If payment, settle open unpaid supplier bills
    if ((item.type === 'payment' || item.credit > 0) && item.supplierId) {
      try {
        const [openBills]: any = await db.query(
          'SELECT id, amount FROM supplier_bills WHERE supplierId = ? AND status = "unpaid" ORDER BY date ASC',
          [item.supplierId]
        );
        let remCredit = item.credit;
        for (const bill of openBills) {
          if (remCredit <= 0) break;
          await db.query('UPDATE supplier_bills SET status = "paid", updatedAt = NOW() WHERE id = ?', [bill.id]);
          remCredit -= Number(bill.amount);
        }
      } catch (e) {
        console.error('Error settling supplier bills on payment:', e);
      }
    }

    // Recalculate and sync suppliers balance
    if (item.supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [item.supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, item.supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on ledger insert:', errBal);
      }
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/supplier-ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing]: any = await db.query('SELECT supplierId FROM supplier_ledger WHERE id = ?', [id]);
    const supplierId = existing[0]?.supplierId;

    // Reverse GL entries
    try {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference = ?', [id]);
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        for (const line of lines) {
          const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
          if (!accounts.length) continue;
          const accType = accounts[0].type;
          const isDebitNormal = accType === 'Asset' || accType === 'Expense';
          const balanceChange = Number(line.debit) - Number(line.credit);
          if (isDebitNormal) {
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
          } else {
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
          }
        }
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    } catch (eGl) {
      console.error('Error reversing GL on ledger delete:', eGl);
    }

    await db.query('DELETE FROM supplier_ledger WHERE id = ?', [id]);

    if (supplierId) {
      try {
        const [balRes]: any = await db.query(
          `SELECT (COALESCE(s.openingBalance, 0) + COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0)) as bal
           FROM suppliers s
           LEFT JOIN supplier_ledger l ON s.id = l.supplierId
           WHERE s.id = ?
           GROUP BY s.id`,
          [supplierId]
        );
        if (balRes.length) {
          await db.query('UPDATE suppliers SET balance = ?, updatedAt = NOW() WHERE id = ?', [balRes[0].bal, supplierId]);
        }
      } catch (errBal) {
        console.error('Error syncing supplier balance on ledger delete:', errBal);
      }
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});


// ==========================================
// FINANCE & ACCOUNTING MODULE
// ==========================================

// Chart of Accounts
app.get('/api/finance/accounts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.post('/api/finance/accounts/import', async (req, res) => {
  try {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) return res.status(400).json({ error: 'Invalid data' });
    
    for (const acc of accounts) {
      const data = {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || null,
        balance: acc.balance || 0,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      
      const [existing] = await db.query('SELECT id FROM chart_of_accounts WHERE code = ?', [data.code]);
      if (existing.length > 0) {
        data.updatedAt = data.createdAt;
        delete data.createdAt;
        await db.query('UPDATE chart_of_accounts SET ? WHERE id = ?', [data, existing[0].id]);
      } else {
        await db.query('INSERT INTO chart_of_accounts SET ?', data);
      }
    }
    res.json({ success: true, count: accounts.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/accounts', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO chart_of_accounts SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/accounts/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    data.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('UPDATE chart_of_accounts SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/finance/accounts/:id', async (req, res) => {
  try {
    const [used] = await db.query('SELECT COUNT(*) as cnt FROM journal_lines WHERE accountId = ?', [req.params.id]);
    if (used[0].cnt > 0) return res.status(400).json({ error: 'Account has transactions and cannot be deleted.' });
    await db.query('DELETE FROM chart_of_accounts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/accounts/:id/ledger', async (req, res) => {
  try {
    const [account] = await db.query('SELECT * FROM chart_of_accounts WHERE id = ?', [req.params.id]);
    const [lines] = await db.query(
      `SELECT jl.*, je.date, je.reference, je.description as entryDescription
       FROM journal_lines jl
       JOIN journal_entries je ON jl.entryId = je.id
       WHERE jl.accountId = ?
       ORDER BY je.date ASC`,
      [req.params.id]
    );
    // Calculate running balance
    let runningBalance = 0;
    const acc = account[0];
    const isDebitNormal = acc && (acc.type === 'Asset' || acc.type === 'Expense');
    const linesWithBalance = lines.map((l: any) => {
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      if (isDebitNormal) runningBalance += debit - credit;
      else runningBalance += credit - debit;
      return { ...l, runningBalance };
    });
    res.json({ account: acc, lines: linesWithBalance });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/party/:id/ledger', async (req, res) => {
  try {
    const [lines] = await db.query(
      `SELECT jl.*, je.date, je.reference, je.description as entryDescription
       FROM journal_lines jl
       JOIN journal_entries je ON jl.entryId = je.id
       WHERE jl.partyId = ?
       ORDER BY je.date ASC`,
      [req.params.id]
    );
    let runningBalance = 0;
    const linesWithBalance = lines.map((l: any) => {
      const debit = Number(l.debit || 0);
      const credit = Number(l.credit || 0);
      runningBalance += debit - credit;
      return { ...l, runningBalance };
    });
    res.json({ lines: linesWithBalance, balance: runningBalance });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Taxes
app.get('/api/finance/taxes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_rates');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/tax-profiles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_profiles');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/tax-profiles', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('INSERT INTO tax_profiles SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    await db.query('UPDATE tax_profiles SET ? WHERE id = ?', [data, id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM tax_profiles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/taxes', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);
    data.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query('INSERT INTO tax_rates SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/finance/taxes/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Journal Entries
app.delete('/api/finance/journals/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const entryId = req.params.id;
    // Get all lines to revert balances
    const [lines] = await conn.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId = ?', [entryId]);
    
    // Begin Transaction
    await conn.beginTransaction();
    
    // Revert balances
    for (const line of lines) {
      const [accRows] = await conn.query('SELECT type, balance FROM chart_of_accounts WHERE id = ?', [line.accountId]);
      if (accRows.length > 0) {
        const type = accRows[0].type.toLowerCase();
        let isDebitNormal = type.includes('asset') || type.includes('expense');
        let currentBalance = Number(accRows[0].balance);
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        
        // Revert the change that was applied
        const balanceChange = debit - credit;
        if (isDebitNormal) {
          currentBalance -= balanceChange;
        } else {
          currentBalance += balanceChange; // wait, for credit normal: originally balance += (credit-debit) = -balanceChange. Revert: balance -= -balanceChange = +balanceChange
        }
        
        await conn.query('UPDATE chart_of_accounts SET balance = ? WHERE id = ?', [currentBalance, line.accountId]);
      }
    }
    
    // Delete lines and entry
    await conn.query('DELETE FROM journal_lines WHERE entryId = ?', [entryId]);
    await conn.query('DELETE FROM journal_entries WHERE id = ?', [entryId]);
    
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

app.get('/api/finance/journals', async (req, res) => {
  try {
    const [entries] = await db.query('SELECT * FROM journal_entries ORDER BY date DESC');
    const [lines] = await db.query('SELECT * FROM journal_lines');
    
    // Group lines by entry
    const result = entries.map(entry => {
      entry.lines = lines.filter(l => l.entryId === entry.id);
      return entry;
    });
    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/journals', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id, date, reference, description, totalAmount, lines, createdBy } = req.body;
    
    const entryData = {
      id, date, reference, description, totalAmount, createdBy, status: 'posted',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    await conn.query('INSERT INTO journal_entries SET ?', entryData);
    
    for (const line of lines) {
      await conn.query('INSERT INTO journal_lines SET ?', {
        id: line.id,
        entryId: id,
        accountId: line.accountId, partyType: line.partyType || null, partyId: line.partyId || null, costCenterId: line.costCenterId || null,
        description: line.description || '',
        debit: line.debit || 0,
        credit: line.credit || 0
      });
      
      // Update account balances
      const balanceChange = Number(line.debit || 0) - Number(line.credit || 0);
      
      // Note: In real accounting, Assets/Expenses increase with Debit. Liabilities/Equity/Revenue increase with Credit.
      // For simplicity in this ledger, we just track the raw balance change, or we adjust based on type.
      // Let's adjust based on account type.
      const [accRows] = await conn.query('SELECT type, balance FROM chart_of_accounts WHERE id = ?', [line.accountId]);
      if (accRows.length > 0) {
        const type = accRows[0].type.toLowerCase();
        let isDebitNormal = type.includes('asset') || type.includes('expense');
        // If it's a normal debit account, balance = balance + debit - credit
        // If it's a normal credit account, balance = balance + credit - debit
        let newBalance = Number(accRows[0].balance);
        if (isDebitNormal) {
          newBalance += balanceChange;
        } else {
          newBalance -= balanceChange;
        }
        await conn.query('UPDATE chart_of_accounts SET balance = ? WHERE id = ?', [newBalance, line.accountId]);
      }
    }
    
    await conn.commit();
    res.json({ success: true });
  } catch (error) { 
    await conn.rollback();
    res.status(500).json({ error: error.message }); 
  } finally {
    conn.release();
  }
});



// ==========================================
// FINANCIAL REPORTS (GL, P&L, BS, Trial Balance)
// ==========================================
app.get('/api/finance/reports/trial-balance', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts ORDER BY code ASC');
    const [lines] = await db.query('SELECT accountId, SUM(debit) as totalDebit, SUM(credit) as totalCredit FROM journal_lines GROUP BY accountId');
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    const result = accounts.map(acc => {
      const line = lines.find(l => l.accountId === acc.id) || { totalDebit: 0, totalCredit: 0 };
      const debit = Number(line.totalDebit);
      const credit = Number(line.totalCredit);
      let netDebit = 0;
      let netCredit = 0;
      
      // Calculate net balance for TB
      if (debit > credit) { netDebit = debit - credit; totalDebit += netDebit; }
      else if (credit > debit) { netCredit = credit - debit; totalCredit += netCredit; }
      
      return { ...acc, debit: netDebit, credit: netCredit };
    });
    
    res.json({ accounts: result.filter(a => a.debit > 0 || a.credit > 0), totalDebit, totalCredit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/finance/reports/expenses', async (req, res) => { try { const [lines] = await db.query('SELECT jl.*, je.date, je.reference, ca.name as accountName, ca.code as accountCode FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id WHERE ca.type = \'Expense\' ORDER BY je.date DESC'); let total = 0; lines.forEach(l => total += Number(l.debit) - Number(l.credit)); res.json({ lines, total }); } catch(e){ res.status(500).json({error:e.message}); } });

app.get('/api/finance/reports/pnl', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts WHERE type IN ("Revenue", "Expense") ORDER BY code ASC');
    let totalRevenue = 0;
    let totalExpense = 0;
    
    accounts.forEach(acc => {
      if (acc.type === 'Revenue') totalRevenue += Number(acc.balance);
      if (acc.type === 'Expense') totalExpense += Number(acc.balance);
    });
    
    res.json({
      revenue: accounts.filter(a => a.type === 'Revenue'),
      expenses: accounts.filter(a => a.type === 'Expense'),
      totalRevenue,
      totalExpense,
      netProfit: totalRevenue - totalExpense
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/finance/reports/balance-sheet', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts WHERE type IN ("Asset", "Liability", "Equity", "Revenue", "Expense") ORDER BY code ASC');
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    let netProfit = 0;
    
    accounts.forEach(acc => {
      if (acc.type === 'Revenue') netProfit += Number(acc.balance);
      if (acc.type === 'Expense') netProfit -= Number(acc.balance);
      
      if (acc.type === 'Asset') totalAssets += Number(acc.balance);
      if (acc.type === 'Liability') totalLiabilities += Number(acc.balance);
      if (acc.type === 'Equity') totalEquity += Number(acc.balance);
    });
    
    // In BS, Retained Earnings (Net Profit) is added to Equity
    totalEquity += netProfit;
    
    res.json({
      assets: accounts.filter(a => a.type === 'Asset'),
      liabilities: accounts.filter(a => a.type === 'Liability'),
      equity: accounts.filter(a => a.type === 'Equity'),
      totalAssets,
      totalLiabilities,
      totalEquity,
      netProfit,
      isBalanced: totalAssets === (totalLiabilities + totalEquity)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});



// ==========================================
// FINANCE DASHBOARD METRICS
// ==========================================
app.get('/api/finance/dashboard', async (req, res) => {
  try {
    const [accounts] = await db.query('SELECT * FROM chart_of_accounts');
    
    let totalCash = 0;
    let totalAR = 0;
    let totalAP = 0;
    let revenue = 0;
    let expenses = 0;
    
    accounts.forEach(acc => {
      const type = acc.type.toLowerCase();
      const subtype = acc.subtype ? acc.subtype.toLowerCase() : '';
      const name = acc.name ? acc.name.toLowerCase() : '';
      const bal = Number(acc.balance);
      
      if (subtype.includes('bank') || subtype.includes('cash') || name.includes('bank') || name.includes('cash')) totalCash += bal;
      if (subtype.includes('receivable') || name.includes('receivable')) totalAR += bal;
      if ((subtype.includes('payable') || name.includes('payable')) && !subtype.includes('tax') && !name.includes('tax')) totalAP += bal;
      if (type === 'revenue') revenue += bal;
      if (type === 'expense') expenses += bal;
    });
    
    const [bills] = await db.query('SELECT SUM(amount) as pendingAP FROM supplier_bills WHERE status = "unpaid"');
    const [invoices] = await db.query('SELECT SUM(total - IFNULL(paidAmount, 0)) as pendingAR FROM invoices WHERE status != "paid" AND status != "draft"');

    res.json({
      cash: totalCash,
      ar: totalAR || Number(invoices[0]?.pendingAR || 0),
      ap: totalAP || Number(bills[0]?.pendingAP || 0),
      profit: revenue - expenses,
      revenue,
      expenses
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});



// ==========================================
// ENTERPRISE ACCOUNTING API
// ==========================================
app.get('/api/finance/cost-centers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cost_centers');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/reports/aged', async (req, res) => {
  try {
    // Basic aged logic grouping by party
    const [lines] = await db.query('SELECT jl.*, je.date FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id WHERE jl.partyId IS NOT NULL');
    // In a real system, we cross-reference this against payments to find 'unpaid' portions
    // Here we return the raw tagged lines for the frontend to aggregate
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// TAX REPORT & CUSTOM REPORT BUILDER
// ==========================================
app.get('/api/finance/reports/tax', async (req, res) => {
  try {
    // Basic tax report logic: Get all tax accounts and their balances
    const [taxAccounts] = await db.query('SELECT * FROM chart_of_accounts WHERE isTaxAccount = true');
    // Also get journal lines hitting tax accounts for detailed breakdown
    const [taxLines] = await db.query('SELECT jl.*, je.date, je.reference FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id WHERE ca.isTaxAccount = true ORDER BY je.date DESC');
    
    let totalTaxPayable = 0;
    taxAccounts.forEach(acc => {
      totalTaxPayable += Number(acc.balance);
    });

    res.json({ taxAccounts, taxLines, totalTaxPayable });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/reports/custom', async (req, res) => {
  try {
    const { startDate, endDate, accountTypes, costCenterId } = req.body;
    let query = 'SELECT jl.*, je.date, je.reference, ca.name as accountName, ca.code as accountCode, ca.type as accountType, cc.name as costCenterName FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id JOIN chart_of_accounts ca ON jl.accountId = ca.id LEFT JOIN cost_centers cc ON jl.costCenterId = cc.id WHERE 1=1';
    const params = [];
    
    if (startDate) { query += ' AND je.date >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND je.date <= ?'; params.push(endDate); }
    if (accountTypes && accountTypes.length > 0) {
      query += ' AND ca.type IN (?)';
      params.push(accountTypes);
    }
    if (costCenterId) { query += ' AND jl.costCenterId = ?'; params.push(costCenterId); }
    
    query += ' ORDER BY je.date DESC';
    const [lines] = await db.query(query, params);
    res.json(lines);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



app.get('/api/finance/reports/aging', async (req, res) => {
  try {
    const type = req.query.type; // 'ar' or 'ap'
    let query = '';
    
    if (type === 'ar') {
      query = `
      SELECT 
        i.customerId as partyId,
        COALESCE(p.name, p.company, l.name, l.company, 'Unknown') as partyName,
        SUM(i.total - COALESCE(i.paidAmount, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) <= 30 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 31 AND 60 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 61 AND 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) > 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90plus'
      FROM invoices i
      LEFT JOIN customers p ON i.customerId = p.id 
      LEFT JOIN leads l ON i.customerId = l.id
      WHERE i.status != 'paid' AND i.status != 'draft'
      GROUP BY i.customerId, partyName 
      HAVING balance > 0
      `;
    } else {
      query = `
      SELECT 
        s.id as partyId,
        s.name as partyName,
        (COALESCE(SUM(l.debit), 0) - COALESCE(SUM(l.credit), 0) + COALESCE(s.openingBalance, s.balance, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) <= 30 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) BETWEEN 31 AND 60 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) BETWEEN 61 AND 90 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) as 'bucket90',
        (SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(l.date, s.createdAt)) > 90 THEN (COALESCE(l.debit, 0) - COALESCE(l.credit, 0)) ELSE 0 END) + COALESCE(s.openingBalance, s.balance, 0)) as 'bucket90plus'
      FROM suppliers s
      LEFT JOIN supplier_ledger l ON s.id = l.supplierId
      GROUP BY s.id, s.name, s.openingBalance, s.balance, s.createdAt
      HAVING balance > 0
      `;
    }
    
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});



app.post('/api/finance/cost-centers', async (req, res) => {
  try {
    const { id, code, name, department, isActive } = req.body;
    await db.query(
      'INSERT INTO cost_centers (id, code, name, department, isActive) VALUES (?, ?, ?, ?, ?)',
      [id, code, name, department, isActive]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// PRODUCTION - MACHINERY
// ==========================================
app.get('/api/production/machineries', async (req, res) => {
    try {
      const [machineries] = await db.query('SELECT * FROM machineries ORDER BY createdAt DESC');
      let empMachines = [];
      try {
        const [rows] = await db.query('SELECT em.machineId, em.employeeId, e.name FROM employee_machines em JOIN employees e ON em.employeeId = e.id');
        empMachines = rows;
      } catch(e) {
        console.error("Error fetching employee_machines:", e);
      }
      
      const enriched = machineries.map(m => ({
        ...m,
        operators: empMachines.filter(em => em.machineId === m.id).map(em => em.name)
      }));
      
      res.json(enriched);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });


app.put('/api/production/machineries/:id', async (req, res) => {
  try {
    const { status, lastMaintenance } = req.body;
    await db.query(
      'UPDATE machineries SET status = ?, lastMaintenance = ? WHERE id = ?',
      [status, lastMaintenance, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries', async (req, res) => {
  try {
    const { id, name, type, model, status, hourlyCost } = req.body;
    await db.query(
      'INSERT INTO machineries (id, name, type, model, status, hourlyCost, lastMaintenance) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, name, type, model, status, hourlyCost]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});




// ==========================
// SKILLS API
// ==========================
app.get('/api/hr/skills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM skills ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/skills', async (req, res) => {
  try {
    const { id, name, category, description } = req.body;
    await db.query(
      'INSERT INTO skills (id, name, category, description) VALUES (?, ?, ?, ?)',
      [id, name, category, description]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/skills/:id', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    await db.query(
      'UPDATE skills SET name=?, category=?, description=? WHERE id=?',
      [name, category, description, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/skills/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_skills WHERE skillId = ?', [req.params.id]);
    await db.query('DELETE FROM skills WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/skills', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { skillIds } = req.body;
    
    await db.query('DELETE FROM employee_skills WHERE employeeId = ?', [employeeId]);
    if (skillIds && skillIds.length > 0) {
      const values = skillIds.map(sId => [employeeId, sId]);
      await db.query('INSERT INTO employee_skills (employeeId, skillId) VALUES ?', [values]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// HUMAN RESOURCES (HR) API
// ==========================
app.get('/api/hr/employees', async (req, res) => {
  try {
    const [employees] = await db.query('SELECT * FROM employees ORDER BY createdAt DESC');
    const [machineAssignments] = await db.query('SELECT employeeId, machineId FROM employee_machines');
    const [skillAssignments] = await db.query('SELECT employeeId, skillId FROM employee_skills');
    
    const enriched = employees.map(emp => ({
      ...emp,
      machineIds: machineAssignments.filter(a => a.employeeId === emp.id).map(a => a.machineId),
      skillIds: skillAssignments.filter(a => a.employeeId === emp.id).map(a => a.skillId)
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees', async (req, res) => {
  try {
    const { id, name, role, phone, email, status, skills } = req.body;
    await db.query(
      'INSERT INTO employees (id, name, role, phone, email, status, skills) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, role, phone, email, status, JSON.stringify(skills || [])]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/employees/:id', async (req, res) => {
  try {
    const { name, role, phone, email, status, skills } = req.body;
    await db.query(
      'UPDATE employees SET name=?, role=?, phone=?, email=?, status=?, skills=? WHERE id=?',
      [name, role, phone, email, status, JSON.stringify(skills || []), req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/employees/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [req.params.id]);
    await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/machines', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { machineIds } = req.body; // Array of machine IDs
    
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [employeeId]);
    
    if (machineIds && machineIds.length > 0) {
      const values = machineIds.map(mId => [employeeId, mId]);
      await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES ?', [values]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.put('/api/production/machineries/:id', async (req, res) => {
  try {
    const { status, lastMaintenance } = req.body;
    await db.query(
      'UPDATE machineries SET status = ?, lastMaintenance = ? WHERE id = ?',
      [status, lastMaintenance, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries', async (req, res) => {
  try {
    const { id, name, type, model, status, hourlyCost } = req.body;
    await db.query(
      'INSERT INTO machineries (id, name, type, model, status, hourlyCost, lastMaintenance) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [id, name, type, model, status, hourlyCost]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});




// ==========================
// SKILLS API
// ==========================
app.get('/api/hr/skills', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM skills ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/skills', async (req, res) => {
  try {
    const { id, name, category, description } = req.body;
    await db.query(
      'INSERT INTO skills (id, name, category, description) VALUES (?, ?, ?, ?)',
      [id, name, category, description]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/skills/:id', async (req, res) => {
  try {
    const { name, category, description } = req.body;
    await db.query(
      'UPDATE skills SET name=?, category=?, description=? WHERE id=?',
      [name, category, description, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/skills/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_skills WHERE skillId = ?', [req.params.id]);
    await db.query('DELETE FROM skills WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/skills', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { skillIds } = req.body;
    
    await db.query('DELETE FROM employee_skills WHERE employeeId = ?', [employeeId]);
    if (skillIds && skillIds.length > 0) {
      const values = skillIds.map(sId => [employeeId, sId]);
      await db.query('INSERT INTO employee_skills (employeeId, skillId) VALUES ?', [values]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// HUMAN RESOURCES (HR) API
// ==========================
app.get('/api/hr/employees', async (req, res) => {
  try {
    const [employees] = await db.query('SELECT * FROM employees ORDER BY createdAt DESC');
    const [machineAssignments] = await db.query('SELECT employeeId, machineId FROM employee_machines');
    const [skillAssignments] = await db.query('SELECT employeeId, skillId FROM employee_skills');
    
    const enriched = employees.map(emp => ({
      ...emp,
      machineIds: machineAssignments.filter(a => a.employeeId === emp.id).map(a => a.machineId),
      skillIds: skillAssignments.filter(a => a.employeeId === emp.id).map(a => a.skillId)
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees', async (req, res) => {
  try {
    const { id, name, role, phone, email, status, skills } = req.body;
    await db.query(
      'INSERT INTO employees (id, name, role, phone, email, status, skills) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, role, phone, email, status, JSON.stringify(skills || [])]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/hr/employees/:id', async (req, res) => {
  try {
    const { name, role, phone, email, status, skills } = req.body;
    await db.query(
      'UPDATE employees SET name=?, role=?, phone=?, email=?, status=?, skills=? WHERE id=?',
      [name, role, phone, email, status, JSON.stringify(skills || []), req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hr/employees/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [req.params.id]);
    await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hr/employees/:id/machines', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { machineIds } = req.body; // Array of machine IDs
    
    await db.query('DELETE FROM employee_machines WHERE employeeId = ?', [employeeId]);
    
    if (machineIds && machineIds.length > 0) {
      const values = machineIds.map(mId => [employeeId, mId]);
      await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES ?', [values]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// PRODUCTION / WORK ORDERS API
// ==========================
app.get('/api/production/work-orders', async (req, res) => {
  try {
    const [wos] = await db.query('SELECT * FROM work_orders ORDER BY createdAt DESC');
    const [ops] = await db.query('SELECT * FROM work_order_operations ORDER BY stepNumber ASC');
    const [qcs] = await db.query('SELECT * FROM qc_inspections');
    const [empRows]: any = await db.query('SELECT id, name FROM employees');
    
    // Resolve customer names from leads table
    let leadMap: Record<string, string> = {};
    try {
      const [leads]: any = await db.query('SELECT id, name, company FROM leads');
      leads.forEach((l: any) => { leadMap[l.id] = l.name || l.company || l.id; });
    } catch(e) {}

    const enriched = (wos as any[]).map((wo: any) => ({
      ...wo,
      customerName: leadMap[wo.customerId] || wo.customerId || null,
      operations: (ops as any[]).filter((o: any) => o.workOrderId === wo.id).map((o: any) => ({
        ...o,
        employeeName: empRows.find((e: any) => e.id === o.employeeId)?.name || null,
        qc: (qcs as any[]).filter((q: any) => q.operationId === o.id)
      }))
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { title, customerId, priority, deadline, operations, bom, sourceQuoteId, notes, attachments } = req.body;

    // Duplicate check
    if (sourceQuoteId) {
      const [existing] = await db.query('SELECT id FROM work_orders WHERE quoteId = ? LIMIT 1', [sourceQuoteId]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'DUPLICATE', existingId: existing[0].id, message: 'A Work Order already exists for this quotation.' });
      }
    }

    const woId = 'WO-' + Date.now().toString().slice(-5);

    await db.query(
      'INSERT INTO work_orders (id, title, customerId, quoteId, priority, plannedStartDate, deadline, bom, notes, attachments) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
      [woId, title, customerId || null, sourceQuoteId || null, priority || 'Normal', deadline || null, bom ? JSON.stringify(bom) : null, notes || null, attachments ? JSON.stringify(attachments) : null]
    );

    if (operations && operations.length > 0) {
      const opValues = operations.map((op, i) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId, i + 1, op.operationName, op.machineId || null, op.employeeId || null, op.plannedHours || 0
      ]);
      await db.query(
        'INSERT INTO work_order_operations (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours) VALUES ?',
        [opValues]
      );
    }

    res.json({ success: true, id: woId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM work_order_operations WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/production/work-orders/:id/attachments', async (req, res) => {
  try {
    const { attachments } = req.body;
    await db.query('UPDATE work_orders SET attachments = ? WHERE id = ?', [JSON.stringify(attachments), req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/production/operations/:id/assign', async (req, res) => {
  try {
    const { employeeId, machineId, scheduledStart, scheduledEnd, isLocked } = req.body;
    
    const toMysqlDt = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };

    let query = 'UPDATE work_order_operations SET employeeId=?, machineId=?';
    let params = [employeeId || null, machineId || null];
    
    if (scheduledStart !== undefined) {
      query += ', scheduledStart=?, scheduledEnd=?';
      params.push(toMysqlDt(scheduledStart), toMysqlDt(scheduledEnd));
    }
    
    if (isLocked !== undefined) {
      query += ', isLocked=?';
      params.push(isLocked ? 1 : 0);
    }
    
    query += ' WHERE id=?';
    params.push(req.params.id);
    
    await db.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/production/operations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const opId = req.params.id;
    
    if (status === 'In Progress') {
      await db.query('UPDATE work_order_operations SET status=?, startTime=NOW() WHERE id=?', [status, opId]);
    } else if (status === 'Completed' || status === 'QC Pending') {
      // Calculate actual hours if startTime exists
      await db.query('UPDATE work_order_operations SET status=?, endTime=NOW(), actualHours=TIMESTAMPDIFF(MINUTE, startTime, NOW())/60.0 WHERE id=?', [status, opId]);
    } else {
      await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [status, opId]);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/operations/:id/qc', async (req, res) => {
  try {
    const { inspectedBy, status, defectReason, notes } = req.body;
    const qcId = 'QC-' + Date.now().toString().slice(-4);
    const opId = req.params.id;
    
    await db.query(
      'INSERT INTO qc_inspections (id, operationId, inspectedBy, status, defectReason, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [qcId, opId, inspectedBy, status, defectReason, notes]
    );
    
    // Update operation status based on QC
    const nextOpStatus = status === 'Pass' ? 'Completed' : 'Rework Required';
    await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [nextOpStatus, opId]);
    
    if (status === 'Fail') {
       // Log Rework
       await db.query('INSERT INTO rework_logs (id, qcId, status) VALUES (?, ?, ?)', ['RWK-' + Date.now().toString().slice(-4), qcId, 'Pending']);
    }
    
    res.json({ success: true, qcId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


  // SYSTEM STATS ROUTE
  // ==========================
  app.get('/api/system/stats', (req, res) => {
    const os = require('os');
    const { exec } = require('child_process');

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    // Rough approximation for cross-platform CPU usage
    const cpuPercent = cpus.length > 0 ? (loadAvg[0] / cpus.length) * 100 : 0;

    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'wmic logicaldisk get size,freespace,caption' : 'df -k /';

    exec(cmd, (error, stdout) => {
      let storagePercent = 0;
      let totalStorage = 0;
      let usedStorage = 0;

      if (!error && stdout) {
        if (isWin) {
          const lines = stdout.trim().split('\n').slice(1);
          for (let line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              const free = parseInt(parts[1]) || 0;
              const total = parseInt(parts[2]) || 0;
              if (total > 0) {
                totalStorage = total;
                usedStorage = total - free;
                storagePercent = (usedStorage / totalStorage) * 100;
              }
              break;
            }
          }
        } else {
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            if (parts.length >= 5) {
              totalStorage = parseInt(parts[1]) * 1024 || 0;
              usedStorage = parseInt(parts[2]) * 1024 || 0;
              storagePercent = parseFloat(parts[4].replace('%', '')) || 0;
            }
          }
        }
      }

      res.json({
        ram: { total: totalMem, used: usedMem, percent: memPercent },
        cpu: { percent: Math.min(cpuPercent, 100) },
        storage: { total: totalStorage, used: usedStorage, percent: storagePercent },
        network: { 
           ping: Math.floor(Math.random() * 20 + 10), // 10-30 ms mock
           download: (Math.random() * 50 + 50).toFixed(1), // 50-100 Mbps mock
           upload: (Math.random() * 20 + 10).toFixed(1) // 10-30 Mbps mock
        }
      });
    });
  });

async function runStartupMigrations() {
  const patches = [
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
    "ALTER TABLE material_requests ADD COLUMN poId VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN poIds TEXT DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNo VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE material_requests ADD COLUMN workOrderNos TEXT DEFAULT NULL",
    "ALTER TABLE purchase_orders ADD COLUMN mrIds TEXT DEFAULT NULL",
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
    "ALTER TABLE invoices ADD COLUMN bankDetails TEXT DEFAULT NULL"
  ];
  for (const p of patches) {
    try { await db.query(p); } catch (e) {}
  }

  const seeds = [
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt1_absorbed', 'Option 1: VAT & SSCL Absorbed (Total Value)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt2_sscl_absorbed_vat_sep', 'Option 2: SSCL Absorbed + VAT Separate', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_opt3_both_separate', 'Option 3: Both SSCL & VAT Separate (2 Lines)', 'SSCL', 2.50, 'VAT', 18.00, 1, 1, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, tax2_name, tax2_rate, tax2_compound, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat_sscl', 'Option 2: SSCL Absorbed + VAT Separate (Standard)', 'SSCL', 2.50, 'VAT', 18.00, 1, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT INTO tax_profiles (id, name, tax1_name, tax1_rate, accountId, tax1_show_separately, tax2_show_separately) VALUES ('tp_vat18', 'VAT Only (18% Separate)', 'VAT', 18, NULL, 0, 1) ON DUPLICATE KEY UPDATE name=VALUES(name), tax1_show_separately=VALUES(tax1_show_separately), tax2_show_separately=VALUES(tax2_show_separately)",
    "INSERT IGNORE INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES ('LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1)",
    "INSERT IGNORE INTO settings (id, val) VALUES ('company_bank_details', '[{\"id\":\"bank_hnb\",\"bankName\":\"Hatton National Bank\",\"branchName\":\"Negombo\",\"accountName\":\"Rex Industries (Pvt) Ltd\",\"accountNumber\":\"011010078028\",\"swiftCode\":\"HNBLLKLX\",\"isDefault\":true}]')",
    "INSERT IGNORE INTO settings (id, val) VALUES ('quotation_terms_presets', '[{\"id\":\"tc_std_30d\",\"name\":\"Standard 30 Days Credit\",\"paymentTerms\":\"30 days from date of delivery\",\"validity\":\"30 Days\",\"delivery\":\"2-3 weeks from confirmed PO\",\"isDefault\":true},{\"id\":\"tc_50_adv\",\"name\":\"50% Advance + Balance on Delivery\",\"paymentTerms\":\"50% Advance with confirmed PO, balance 50% upon delivery\",\"validity\":\"14 Days\",\"delivery\":\"10-15 working days\",\"isDefault\":false},{\"id\":\"tc_cod\",\"name\":\"Immediate Payment on Delivery (COD)\",\"paymentTerms\":\"100% on delivery against invoice\",\"validity\":\"30 Days\",\"delivery\":\"3-5 working days / Ex-stock\",\"isDefault\":false},{\"id\":\"tc_milestone\",\"name\":\"Progressive Milestone Payment\",\"paymentTerms\":\"30% Advance, 40% on dispatch, 30% after installation & sign-off\",\"validity\":\"30 Days\",\"delivery\":\"4-6 weeks from approved drawings\",\"isDefault\":false}]')"
  ];
  for (const s of seeds) {
    try { await db.query(s); } catch (e) {}
  }


  try {
    const [allPos]: any = await db.query('SELECT id FROM purchase_orders');
    if (allPos && allPos.length > 0) {
      await syncPOBillingStatus(allPos.map((p: any) => p.id));
    }
  } catch (e) {}
}

app.listen(PORT, async () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  try {
    await runStartupMigrations();
  } catch (e) {
    console.error('Startup migration error:', e);
  }
});





app.get('/api/currencies', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM currencies');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/currencies/sync', async (req, res) => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/LKR');
    const data = await response.json();
    if (data && data.rates) {
      const [existing] = await db.query('SELECT code FROM currencies');
      const existingCodes = existing.map(c => c.code);
      if (!existingCodes.includes('LKR')) {
        await db.query('INSERT INTO currencies (code, name, symbol, exchangeRate, isBase) VALUES (?, ?, ?, ?, ?)', ['LKR', 'Sri Lankan Rupee', 'Rs', 1.0, 1]);
      }
      for (const code of existingCodes) {
        if (data.rates[code] && code !== 'LKR') {
          await db.query('UPDATE currencies SET exchangeRate = ?, lastUpdated = NOW() WHERE code = ?', [1 / data.rates[code], code]);
        }
      }
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to fetch rates' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/currencies', async (req, res) => {
  try {
    await db.query('INSERT INTO currencies SET ?', req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/currencies/:code', async (req, res) => {
  try {
    await db.query('DELETE FROM currencies WHERE code = ?', [req.params.code]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-sync currencies daily
setInterval(async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/LKR');
    const data = await response.json();
    if (data && data.rates) {
      const [existing] = await db.query('SELECT code FROM currencies');
      for (const row of existing) {
        const code = row.code;
        if (data.rates[code] && code !== 'LKR') {
          await db.query('UPDATE currencies SET exchangeRate = ?, lastUpdated = NOW() WHERE code = ?', [1 / data.rates[code], code]);
        }
      }
      console.log('Auto-synced currencies successfully.');
    }
  } catch (err) { console.error('Failed to auto-sync currencies:', err); }
}, 24 * 60 * 60 * 1000);
