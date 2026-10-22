const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

// 1. UPDATE POST /api/invoices
const invoiceRegex = /app\.post\('\/api\/invoices', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, id: data\.id \}\);\r?\n\s*\} catch \(error\) \{/;

const newInvoice = `app.post('/api/invoices', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO invoices SET ?', data);
    
    try {
      const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" LIMIT 1');
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "4000" LIMIT 1');
      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Generated', status: 'posted'
        });
        const totalAmount = Number(data.total) || 0;
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [
          [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, totalAmount, 0, data.customerId || null, 'Customer'],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, totalAmount, null, null]
          ]
        ]);
      }
    } catch (e) { console.error('Auto GL Invoice Error:', e); }

    res.json({ success: true, id: data.id });
  } catch (error) {`;

if (invoiceRegex.test(code)) {
  code = code.replace(invoiceRegex, newInvoice);
} else {
  console.log("Could not find POST /api/invoices to replace");
}

// 2. UPDATE POST /api/invoices/:id/payments
const paymentRegex = /const \[rows\]: any = await db\.query\('SELECT payments, paidAmount, total FROM invoices WHERE id = \?', \[id\]\);([\s\S]*?)await db\.query\('UPDATE invoices SET payments = \?, paidAmount = \?, status = \? WHERE id = \?', \[\s*JSON\.stringify\(existingPayments\), newPaidAmount, newStatus, id\s*\]\);\r?\n\s*res\.json\(\{ success: true \}\);/;

const newPayment = `const [rows]: any = await db.query('SELECT payments, paidAmount, total, customerId FROM invoices WHERE id = ?', [id]);$1await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments), newPaidAmount, newStatus, id
    ]);
    
    try {
      const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" LIMIT 1');
      const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" LIMIT 1');
      if (arAcc.length > 0 && cashAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        await db.query('INSERT INTO journal_entries SET ?', {
          id: jeId, date: payment.date || new Date().toISOString().slice(0, 10), reference: newPayment.id, description: 'Auto GL: Payment Received for ' + id, status: 'posted'
        });
        const pAmt = Number(payment.amount);
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [
          [
            ['JL-' + Date.now().toString().slice(-5) + '3', jeId, cashAcc[0].id, pAmt, 0, null, null],
            ['JL-' + Date.now().toString().slice(-5) + '4', jeId, arAcc[0].id, 0, pAmt, rows[0].customerId || null, 'Customer']
          ]
        ]);
      }
    } catch (e) { console.error('Auto GL Payment Error:', e); }

    res.json({ success: true });`;

if (paymentRegex.test(code)) {
  code = code.replace(paymentRegex, newPayment);
} else {
  console.log("Could not find POST payments to replace");
}

fs.writeFileSync('api/src/server.ts', code, 'utf8');
console.log('Finance auto-GL applied');