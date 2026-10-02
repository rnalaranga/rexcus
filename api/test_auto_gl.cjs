const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({ user: 'root', password: '1234', database: 'rex_erp' });
  
  const data = { id: 'INV-TEST-1', total: 1000, subtotal: 800, taxAmount: 200, date: '2026-10-02', customerId: 'CUST-1' };
  
  try {
      const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" LIMIT 1');
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "4000" LIMIT 1');
      const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1');
      
      console.log('arAcc:', arAcc);
      console.log('salesAcc:', salesAcc);
      console.log('taxAcc:', taxAcc);
      
      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const totalAmount = Number(data.total) || Number(data.amount) || 0;
        const subtotal = Number(data.subtotal) || totalAmount;
        const taxAmount = Number(data.taxAmount) || 0;
        
        console.log('Inserting into journal_entries...');
        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Generated', totalAmount, status: 'posted' });
        console.log('Success JE');
        
        const lines = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, totalAmount, 0, 'Customer Invoice ' + data.id, data.customerId || null, null, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, subtotal, 'Sales Revenue for ' + data.id, null, null, null]
        ];
        
        if (taxAmount > 0 && taxAcc.length > 0) {
          lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAcc[0].id, 0, taxAmount, 'Tax Liability for ' + data.id, null, null, null]);
        }
        
        console.log('Inserting into journal_lines...', lines);
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, description, partyId, costCenterId, partyType) VALUES ?', [lines]);
        console.log('Success JL');
        
        // UPDATE BALANCES
        console.log('Updating balances...');
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [totalAmount, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [subtotal, salesAcc[0].id]);
        if (taxAmount > 0 && taxAcc.length > 0) {
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [taxAmount, taxAcc[0].id]);
        }
        console.log('Success Balances');
      }
  } catch(e) {
      console.error('Error:', e);
  }
  process.exit(0);
})();
