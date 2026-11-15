const mysql = require('./api/node_modules/mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'rex_erp'
  });

  const [cols] = await conn.query("SHOW COLUMNS FROM supplier_bills");
  console.log("Columns of supplier_bills:", cols.map(c => c.Field));

  const [bills] = await conn.query("SELECT * FROM supplier_bills LIMIT 5");
  console.log("Sample bills:", bills);

  const [accs] = await conn.query("SELECT id, code, name, type, balance FROM chart_of_accounts WHERE name LIKE '%VAT%' OR code IN ('1300', '1690', '2150', '2100')");
  console.log("VAT Accounts:", accs);

  await conn.end();
}

check().catch(console.error);
