const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '1234';
  const database = process.env.DB_NAME || 'rex_erp';

  const conn = await mysql.createConnection({ host, user, password, database });
  
  const sql = `
CREATE TABLE IF NOT EXISTS machining_operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  groupName VARCHAR(100),
  name VARCHAR(100),
  hrRate DECIMAL(10,2) DEFAULT 0,
  setTimeRate DECIMAL(10,2) DEFAULT 0
);
  `;
  
  await conn.query(sql);
  
  const [rows] = await conn.query("SELECT COUNT(*) as count FROM machining_operations");
  if (rows[0].count === 0) {
    const EXCEL_PROCESSES = [
      { group: 'General',    items: [{ name: 'Parting', rate: 500 }] },
      { group: 'Milling',    items: [{ name: 'Manual Milling', rate: 2500 }, { name: 'Gear Hobbing', rate: 2500 }] },
      { group: 'Man Lathe',  items: [{ name: 'Normal', rate: 2500 }, { name: 'Blue 800x3000', rate: 3000 }, { name: 'Japan Heavy', rate: 4000 }, { name: 'Coping Lathe', rate: 5000 }, { name: 'Shaping', rate: 2500 }]},
      { group: 'CNC Milling', items: [{ name: '3 Axis', rate: 4500 }, { name: '4 Axis', rate: 5000 }, { name: '5 Axis', rate: 7500 }, { name: '3 Axis 1600 Bed', rate: 7000 }]},
      { group: 'CNC Lathe', items: [{ name: 'Turning', rate: 5500 }, { name: 'Turnmill', rate: 6000 }, { name: 'WEDM', rate: 2500 }, { name: 'EDM', rate: 2500 }, { name: 'Hardening', rate: 1500 }, { name: 'Surface Grinding', rate: 1500 }, { name: 'Cylindricle grinding', rate: 1500 }, { name: 'Knife Grinder', rate: 2500 }]},
      { group: 'Welding', items: [{ name: 'Tig (SS/AL)', rate: 1500 }, { name: 'Mig (SS/MS/UTP)', rate: 1200 }, { name: 'Arc (SS/MS/UTP)', rate: 1100 }, { name: 'Laser Welding', rate: 2500 }]},
      { group: 'Fabrication', items: [{ name: 'Shearing (per cut)', rate: 200 }, { name: 'Bending (per bend)', rate: 200 }, { name: 'Hand work/handling', rate: 500 }]}
    ];
    for (let g of EXCEL_PROCESSES) {
      for (let item of g.items) {
        await conn.query("INSERT INTO machining_operations (groupName, name, hrRate, setTimeRate) VALUES (?, ?, ?, ?)", [g.group, item.name, item.rate, item.rate]);
      }
    }
  }

  await conn.end();
  console.log("machining_operations table created and seeded.");
}
run();
