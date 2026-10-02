const mysql = require('mysql2/promise');
(async () => {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '1234', database: 'rex_erp' });
  // find an invoice
  const [invoices] = await db.query('SELECT id, total FROM invoices LIMIT 1');
  if (!invoices.length) return console.log("No invoice");
  const inv = invoices[0];
  console.log("Found invoice", inv.id, "total", inv.total);
  
  // Call the endpoint equivalent logic
  const pmtAmount = 100;
  
  const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
  const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
  let [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
  
  if (cashAcc.length === 0) {
    const cashId = 'ACC-' + Date.now().toString().slice(-6);
    await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
    cashAcc = [{ id: cashId }];
  }
  
  if (salesAcc.length > 0) {
    console.log("Sales", salesAcc[0].id, "Cash", cashAcc[0].id, "Tax", taxAcc.length ? taxAcc[0].id : "None");
    try {
      const jeId = 'JE-TEST';
      await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: new Date(), reference: 'TEST', description: 'Test', totalAmount: pmtAmount });
      console.log("Inserted JE");
      const lines = [
        ['JL-TEST1', jeId, cashAcc[0].id, pmtAmount, 0, null, null],
        ['JL-TEST2', jeId, salesAcc[0].id, 0, pmtAmount, null, 'Customer']
      ];
      await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
      console.log("Inserted JL");
      await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, cashAcc[0].id]);
      await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, salesAcc[0].id]);
      console.log("Updated balances");
    } catch(e) {
      console.error(e);
    }
  }
  process.exit(0);
})();
