const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /await db\.query\('UPDATE invoices SET payments = \?, paidAmount = \?, status = \? WHERE id = \?', \[\s*JSON\.stringify\(existingPayments\),\s*newPaidAmount,\s*newStatus,\s*id\s*\]\);/;

const replacer = `await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
        JSON.stringify(existingPayments),
        newPaidAmount,
        newStatus,
        id
      ]);

      // Auto GL: Record Payment
      try {
        const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" LIMIT 1');
        const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" LIMIT 1');
        if (arAcc.length > 0 && cashAcc.length > 0) {
          const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
          const pmtAmount = Number(payment.amount);
          await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: newPayment.date, reference: newPayment.id, description: 'Auto GL: Invoice Payment Received', totalAmount: pmtAmount });
          
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [
            [
              ['JL-' + Date.now().toString().slice(-5) + '1', jeId, cashAcc[0].id, pmtAmount, 0, null, null],
              ['JL-' + Date.now().toString().slice(-5) + '2', jeId, arAcc[0].id, 0, pmtAmount, invoice.customerId || null, 'Customer']
            ]
          ]);
        }
      } catch (e) { console.error('Auto GL Payment Error:', e); }`;

code = code.replace(regex, replacer);
fs.writeFileSync('api/src/server.ts', code);
console.log('done');
