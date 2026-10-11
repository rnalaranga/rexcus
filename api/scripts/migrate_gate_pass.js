const mysql = require('mysql2/promise');

async function run() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'rex_erp'
  });

  console.log('Running gate pass migration...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS gate_passes (
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
    )
  `);

  try {
    await db.query('ALTER TABLE customer_grns ADD COLUMN gatePassId VARCHAR(50) NULL');
    console.log('Added gatePassId column to customer_grns');
  } catch (e) {
    console.log('gatePassId column check: ' + e.message);
  }

  try {
    await db.query('ALTER TABLE customer_grns ADD COLUMN dispatchedAt DATETIME NULL');
    console.log('Added dispatchedAt column to customer_grns');
  } catch (e) {
    console.log('dispatchedAt column check: ' + e.message);
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
