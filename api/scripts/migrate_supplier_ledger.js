const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'rex_erp'
  });

  console.log('--- Migrating supplier_ledger and suppliers table ---');

  // Check columns of supplier_ledger
  const [ledgerCols] = await pool.query('DESCRIBE supplier_ledger');
  const existingLedgerCols = ledgerCols.map(c => c.Field.toLowerCase());

  const ledgerAlterations = [
    { name: 'referenceNo', query: "ALTER TABLE supplier_ledger ADD COLUMN referenceNo VARCHAR(100) AFTER type" },
    { name: 'description', query: "ALTER TABLE supplier_ledger ADD COLUMN description TEXT AFTER referenceNo" },
    { name: 'debit', query: "ALTER TABLE supplier_ledger ADD COLUMN debit DECIMAL(15,2) DEFAULT 0.00 AFTER description" },
    { name: 'credit', query: "ALTER TABLE supplier_ledger ADD COLUMN credit DECIMAL(15,2) DEFAULT 0.00 AFTER debit" },
    { name: 'paymentMethod', query: "ALTER TABLE supplier_ledger ADD COLUMN paymentMethod VARCHAR(50) DEFAULT 'Bank Transfer' AFTER credit" },
    { name: 'bankAccountId', query: "ALTER TABLE supplier_ledger ADD COLUMN bankAccountId VARCHAR(100) AFTER paymentMethod" },
    { name: 'createdAt', query: "ALTER TABLE supplier_ledger ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'updatedAt', query: "ALTER TABLE supplier_ledger ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
  ];

  for (const alt of ledgerAlterations) {
    if (!existingLedgerCols.includes(alt.name.toLowerCase())) {
      console.log(`Adding ${alt.name} to supplier_ledger...`);
      try {
        await pool.query(alt.query);
        console.log(`Successfully added ${alt.name}`);
      } catch (e) {
        console.error(`Error adding ${alt.name}:`, e.message);
      }
    } else {
      console.log(`Column ${alt.name} already exists in supplier_ledger.`);
    }
  }

  // Check suppliers table for openingBalance
  const [supCols] = await pool.query('DESCRIBE suppliers');
  const existingSupCols = supCols.map(c => c.Field.toLowerCase());

  if (!existingSupCols.includes('openingbalance')) {
    console.log('Adding openingBalance to suppliers table...');
    try {
      await pool.query("ALTER TABLE suppliers ADD COLUMN openingBalance DECIMAL(15,2) DEFAULT 0.00 AFTER balance");
      console.log('Successfully added openingBalance to suppliers.');
    } catch (e) {
      console.error('Error adding openingBalance:', e.message);
    }
  }

  console.log('--- Migration completed successfully ---');
  await pool.end();
}

migrate().catch(console.error);
