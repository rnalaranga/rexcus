const mysql = require('mysql2/promise');

async function run() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'rex_erp'
  });

  console.log('Running suppliers table migration...');

  const cols = [
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
    "ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT NULL"
  ];

  for (const sql of cols) {
    try {
      await db.query(sql);
      console.log('Executed:', sql);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Already exists, skipped:', sql);
      } else {
        console.warn('Notice:', err.message);
      }
    }
  }

  const [colsDesc] = await db.query('DESCRIBE suppliers');
  console.log('Current suppliers table fields:', colsDesc.map(c => c.Field));

  await db.end();
  console.log('Suppliers migration completed successfully.');
}

run().catch(console.error);
