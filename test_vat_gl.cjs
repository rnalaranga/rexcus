const mysql = require('./api/node_modules/mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '1234', database: 'rex_erp' });
  
  const [bills] = await conn.query('SELECT id, invoiceNo, amount, taxAmount, taxBreakdown FROM supplier_bills');
  console.log('Supplier bills count:', bills.length);
  bills.forEach(b => console.log(b));

  const [invoices] = await conn.query('SELECT id, invoiceNo, grandTotal, taxAmount, taxBreakdown FROM invoices');
  console.log('Invoices count:', invoices.length);

  const [coa] = await conn.query("SELECT id, code, name, type, balance FROM chart_of_accounts WHERE name LIKE '%VAT%' OR code IN ('1300', '1690', '2210')");
  console.log('VAT Accounts:');
  console.table(coa);

  const [jl] = await conn.query("SELECT jl.*, je.date as jeDate, je.reference FROM journal_lines jl JOIN journal_entries je ON jl.entryId = je.id WHERE jl.accountId IN ('acc_1300', 'acc_1690', 'acc_2210')");
  console.log('Journal lines for VAT accounts:', jl.length);
  console.table(jl);

  await conn.end();
}

test().catch(console.error);
