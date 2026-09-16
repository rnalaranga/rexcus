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
    CREATE TABLE IF NOT EXISTS machineries (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100),
      type VARCHAR(50),
      model VARCHAR(100),
      status VARCHAR(20) DEFAULT 'Active',
      hourlyCost DECIMAL(10,2) DEFAULT 0,
      lastMaintenance DATE,
      createdAt DATETIME
    )
  `);
  console.log("Table machineries created");
  
  // Insert some dummies
  await conn.query(`INSERT IGNORE INTO machineries (id, name, type, model, status, hourlyCost, lastMaintenance) VALUES 
    ('MAC-001', 'Heavy Duty Lathe', 'Lathe', 'Mazak QTE-100', 'Active', 1500.00, '2026-08-10'),
    ('MAC-002', 'CNC Milling Machine', 'Milling', 'Haas VF-2', 'Maintenance', 2500.00, '2026-09-01'),
    ('MAC-003', 'Hydraulic Press', 'Press', 'Amada 100T', 'Active', 800.00, '2026-07-15')
  `);
  
  await conn.end();
}
setup().catch(console.error);
