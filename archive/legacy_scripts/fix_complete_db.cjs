const fs = require('fs');
let content = fs.readFileSync('complete_db.sql', 'utf8');

const oldTable = `CREATE TABLE IF NOT EXISTS inventory (
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
);`;

const newTable = `CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50) DEFAULT 'product',
  name VARCHAR(255),
  sku VARCHAR(100),
  description TEXT,
  unitPrice DECIMAL(15, 2) DEFAULT 0,
  unitCost DECIMAL(15, 2) DEFAULT 0,
  quantity INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  uom VARCHAR(50),
  suppliers LONGTEXT,
  location VARCHAR(255),
  reorderLevel INT DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME
);`;

content = content.replace(oldTable, newTable);
fs.writeFileSync('complete_db.sql', content, 'utf8');