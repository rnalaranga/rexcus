const mysql = require('mysql2/promise');
(async () => {
  const db = await mysql.createConnection({ user: 'root', password: '1234', database: 'rex_erp' });
  const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" LIMIT 1');
  const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "4000" LIMIT 1');
  console.log('arAcc:', arAcc);
  console.log('salesAcc:', salesAcc);
  process.exit(0);
})();
