const mysql = require('./api/node_modules/mysql2/promise');

async function checkVat() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'rex_erp'
  });

  const [bills] = await conn.query('SELECT id, billNo, vatAmount, totalVat, amount, status, date FROM supplier_bills');
  console.log('Total bills:', bills.length);
  const vatBills = bills.filter(b => Number(b.vatAmount || 0) > 0 || Number(b.totalVat || 0) > 0);
  console.log('Bills with VAT:', vatBills.length);
  vatBills.forEach(b => console.log('Bill:', b.id, b.billNo, 'vatAmount:', b.vatAmount, 'totalVat:', b.totalVat, 'amt:', b.amount));

  const [accs] = await conn.query("SELECT id, code, name, type, balance FROM chart_of_accounts WHERE name LIKE '%VAT%' OR code IN ('1300', '1690', '2150', '2100')");
  console.log('VAT Accounts:');
  console.table(accs);

  const [allAccs] = await conn.query("SELECT id, code, name, type, balance FROM chart_of_accounts WHERE name LIKE '%VAT%' OR name LIKE '%Tax%'");
  console.log('Tax Accounts:');
  console.table(allAccs);

  const [glVat] = await conn.query("SELECT * FROM general_ledger WHERE accountId IN ('acc_1300', 'acc_1690', 'acc_2150') OR description LIKE '%VAT%' OR description LIKE '%Bill%' LIMIT 20");
  console.log('GL entries:', glVat.length);
  glVat.forEach(g => console.log(g.date, g.accountId, g.accountCode, g.accountName, 'Debit:', g.debit, 'Credit:', g.credit, g.description));

  await conn.end();
}

checkVat().catch(console.error);
