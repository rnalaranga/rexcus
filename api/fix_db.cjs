const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'rex_erp'
  });
  
  const queries = `
CREATE TABLE IF NOT EXISTS material_requests (
  id VARCHAR(50) PRIMARY KEY,
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
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY,
  supplierId VARCHAR(50),
  date DATETIME,
  expectedDate DATETIME,
  status VARCHAR(20) DEFAULT 'draft',
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
);
CREATE TABLE IF NOT EXISTS grns (
  id VARCHAR(50) PRIMARY KEY,
  poId VARCHAR(50),
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
);
CREATE TABLE IF NOT EXISTS supplier_bills (
  id VARCHAR(50) PRIMARY KEY,
  supplierId VARCHAR(50),
  poId VARCHAR(50),
  grnId VARCHAR(50),
  invoiceNo VARCHAR(100),
  date DATETIME,
  dueDate DATETIME,
  amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'unpaid',
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);
`.split(';');

  for(let q of queries) {
    if(q.trim()) {
      await conn.query(q);
      console.log('Executed query successfully');
    }
  }
  await conn.end();
}
run().catch(console.error);
