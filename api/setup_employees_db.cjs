const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'rex_erp'
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100),
      role VARCHAR(50),
      phone VARCHAR(50),
      email VARCHAR(100),
      status VARCHAR(20) DEFAULT 'Active',
      skills TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await conn.query(`
    CREATE TABLE IF NOT EXISTS employee_machines (
      employeeId VARCHAR(50),
      machineId VARCHAR(50),
      PRIMARY KEY (employeeId, machineId)
    )
  `);

  // Insert dummy data
  await conn.query(`INSERT IGNORE INTO employees (id, name, role, phone, email, status, skills) VALUES 
    ('EMP-001', 'Sunil Perera', 'Senior Operator', '0771234567', 'sunil@rex.lk', 'Active', '["Lathe Operation", "CNC Programming"]'),
    ('EMP-002', 'Kamal Silva', 'Technician', '0719876543', 'kamal@rex.lk', 'Active', '["Welding", "Press Operation"]')
  `);
  
  await conn.query(`INSERT IGNORE INTO employee_machines (employeeId, machineId) VALUES 
    ('EMP-001', 'MAC-001'),
    ('EMP-001', 'MAC-002'),
    ('EMP-002', 'MAC-003')
  `);
  
  console.log("Employees tables created");
  await conn.end();
}
setup().catch(console.error);
