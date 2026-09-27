const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const target1 = "const [rows]: any = await db.query('SELECT payments, paidAmount, total FROM invoices WHERE id = ?', [id]);";
const rep1 = "const [rows]: any = await db.query('SELECT payments, paidAmount, total, customerId FROM invoices WHERE id = ?', [id]);";
code = code.replace(target1, rep1);

const target2 = `    await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments),
      newPaidAmount,
      newStatus,
      id
    ]);
    
    res.json({ success: true, payment: newPayment, newStatus, newPaidAmount });`;

const rep2 = `    await db.query('UPDATE invoices SET payments = ?, paidAmount = ?, status = ? WHERE id = ?', [
      JSON.stringify(existingPayments),
      newPaidAmount,
      newStatus,
      id
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

    res.json({ success: true, payment: newPayment, newStatus, newPaidAmount });`;

code = code.replace(target2, rep2);


// PHASE 1: WORK ORDER COMPLETION
const target3 = `      if (status === 'In Progress') {
        await db.query('UPDATE work_order_operations SET status=?, startTime=NOW() WHERE id=?', [status, opId]);
      } else if (status === 'Completed' || status === 'QC Pending') {
        // Calculate actual hours if startTime exists
        await db.query('UPDATE work_order_operations SET status=?, endTime=NOW(), actualHours=TIMESTAMPDIFF(MINUTE, startTime, NOW())/60.0 WHERE id=?', [status, opId]);
      } else {
        await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [status, opId]);
      }`;

const rep3 = `      if (status === 'In Progress') {
        await db.query('UPDATE work_order_operations SET status=?, startTime=NOW() WHERE id=?', [status, opId]);
      } else if (status === 'Completed' || status === 'QC Pending') {
        // Calculate actual hours if startTime exists
        await db.query('UPDATE work_order_operations SET status=?, endTime=NOW(), actualHours=TIMESTAMPDIFF(MINUTE, startTime, NOW())/60.0 WHERE id=?', [status, opId]);
      } else {
        await db.query('UPDATE work_order_operations SET status=? WHERE id=?', [status, opId]);
      }
      
      // AUTO INVENTORY / FINISHED PRODUCT ON WO COMPLETION
      if (status === 'Completed') {
        try {
          const [ops] = await db.query('SELECT workOrderId, status FROM work_order_operations WHERE workOrderId = (SELECT workOrderId FROM work_order_operations WHERE id = ?)', [opId]);
          const allComplete = ops.every(o => o.status === 'Completed');
          if (allComplete && ops.length > 0) {
            const woId = ops[0].workOrderId;
            const [wo] = await db.query('SELECT status, title, bom FROM work_orders WHERE id = ?', [woId]);
            if (wo.length > 0 && wo[0].status !== 'Completed') {
              await db.query('UPDATE work_orders SET status = ? WHERE id = ?', ['Completed', woId]);
              
              const bom = wo[0].bom ? JSON.parse(wo[0].bom) : [];
              let totalMaterialCost = 0;
              for (const item of bom) {
                if (!item.material) continue;
                const [inv] = await db.query('SELECT id, quantity, unitCost FROM inventory WHERE name = ? OR sku = ? LIMIT 1', [item.material, item.material]);
                if (inv.length > 0) {
                  const usedQty = Number(item.qty) || 0;
                  totalMaterialCost += usedQty * Number(inv[0].unitCost || 0);
                  const newBalance = Number(inv[0].quantity) - usedQty;
                  const entry = { id: 'LGR-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100), inventoryId: inv[0].id, type: 'OUT', quantity: usedQty, balance: newBalance, reference: woId, notes: 'Auto-deducted from WO', date: new Date().toISOString().slice(0, 19).replace('T', ' ') };
                  await db.query('INSERT INTO stock_ledger SET ?', entry);
                  await db.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newBalance, inv[0].id]);
                }
              }
              
              const finishedId = 'INV-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
              const finishedItem = {
                id: finishedId, type: 'finished_product', name: wo[0].title + ' (Finished)', quantity: 1, unitCost: totalMaterialCost, unitPrice: totalMaterialCost * 1.5, status: 'active', createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '), updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
              };
              await db.query('INSERT INTO inventory SET ?', finishedItem);
              
              const inEntry = { id: 'LGR-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100), inventoryId: finishedId, type: 'IN', quantity: 1, balance: 1, reference: woId, notes: 'Auto-added from WO', date: new Date().toISOString().slice(0, 19).replace('T', ' ') };
              await db.query('INSERT INTO stock_ledger SET ?', inEntry);
              
              const [cogsAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "5000" LIMIT 1');
              if (cogsAcc.length > 0) {
                const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
                await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: new Date().toISOString().slice(0, 10), reference: woId, description: 'Auto GL: WO Completion COGS', status: 'posted' });
                await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit) VALUES ?', [[['JL-' + Date.now().toString().slice(-5) + '5', jeId, cogsAcc[0].id, totalMaterialCost, 0]]]);
              }
            }
          }
        } catch (e) { console.error('Auto Inventory WO Error:', e); }
      }`;

code = code.replace(target3, rep3);

// PHASE 4: LEAD TO CUSTOMER CONVERSION
const target4 = `app.put('/api/leads/:id/stage', async (req, res) => {`;
const rep4 = `app.post('/api/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const [leads] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    
    const lead = leads[0];
    const customerId = 'CUST-' + Date.now().toString().slice(-4);
    
    await db.query('INSERT INTO customers (id, name, company, email, phone, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())', [
      customerId, lead.name, lead.company, lead.email, lead.phone, 'active'
    ]);
    
    await db.query('UPDATE leads SET stage = ? WHERE id = ?', ['Won', id]);
    
    res.json({ success: true, customerId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leads/:id/stage', async (req, res) => {`;
code = code.replace(target4, rep4);

fs.writeFileSync('api/src/server.ts', code, 'utf8');
console.log('Phases 1, 3, 4 applied');