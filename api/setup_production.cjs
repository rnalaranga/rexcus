const mysql = require("mysql2/promise");
require("dotenv").config({ path: "api/.env" });

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '1234';
  const database = process.env.DB_NAME || 'rex_erp';

  const conn = await mysql.createConnection({ host, user, password, database, multipleStatements: true });
  
  const sql = `
CREATE TABLE IF NOT EXISTS work_orders (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200),
  quoteId VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'Medium',
  status VARCHAR(20) DEFAULT 'Pending',
  startDate DATETIME,
  deadline DATETIME,
  bom TEXT,
  operations TEXT,
  progress INT DEFAULT 0,
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS work_order_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId VARCHAR(50),
  operationName VARCHAR(100),
  workCenter VARCHAR(50),
  estimatedHours DECIMAL(10,2) DEFAULT 0,
  actualHours DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Pending',
  operatorId VARCHAR(50),
  notes TEXT,
  startTime DATETIME,
  endTime DATETIME
);

CREATE TABLE IF NOT EXISTS qc_inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId VARCHAR(50),
  operationId INT,
  inspector VARCHAR(100),
  date DATETIME,
  result VARCHAR(20),
  remarks TEXT,
  createdAt DATETIME
);

CREATE TABLE IF NOT EXISTS rework_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId VARCHAR(50),
  operationId INT,
  reason TEXT,
  hours DECIMAL(10,2),
  cost DECIMAL(10,2),
  createdAt DATETIME
);
  `;

  await conn.query(sql);
  await conn.end();
  console.log("Production tables created.");
}
run();
