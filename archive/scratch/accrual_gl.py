import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

# 1. Add Auto GL back to POST /api/invoices
find_post_inv = """    await db.query('INSERT INTO invoices SET ?', data);
    res.json({ success: true, id: docNo });"""

rep_post_inv = """    await db.query('INSERT INTO invoices SET ?', data);
    
    // Auto GL: Accrual Basis - Record Receivable & Sales
    try {
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
      const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
      let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1');
      
      if (arAcc.length === 0) {
        const arId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }
      
      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const invTotal = Number(data.total) || 0;
        const invTax = Number(data.taxAmount) || 0;
        const invSub = Number(data.subtotal) || invTotal;
        
        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: docNo, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });
        
        const lines = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
        ];
        
        if (invTax > 0 && taxAcc.length > 0) {
          lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAcc[0].id, 0, invTax, null, null]);
        }
        
        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invSub, salesAcc[0].id]);
        if (invTax > 0 && taxAcc.length > 0) {
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTax, taxAcc[0].id]);
        }
      }
    } catch(e) { console.error('Auto GL Invoice Error:', e); }

    res.json({ success: true, id: docNo });"""

content = content.replace(find_post_inv, rep_post_inv)

# 2. Fix POST /api/invoices/:id/payments Auto GL logic (Debit Cash, Credit AR)
find_pmt_gl = """      // Auto GL: Record Payment
      try {
        const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
        const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
        let [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        
        // Auto-create Cash Account if it doesn't exist
        if (cashAcc.length === 0) {
          const cashId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
          cashAcc = [{ id: cashId }];
        }
        
        if (salesAcc.length > 0) {
          const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
          const pmtAmount = Number(payment.amount);
          
          // Proportionally split the payment between Sales and Tax
          const invTotal = Number(invoice.total) || 1; // avoid div by zero
          const invTax = Number(invoice.taxAmount) || 0;
          const invSub = Number(invoice.subtotal) || invTotal;
          
          const pmtTax = pmtAmount * (invTax / invTotal);
          const pmtSales = pmtAmount - pmtTax;
          
          await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: newPayment.date, reference: newPayment.id, description: 'Auto GL: Invoice Payment Received (Cash Basis Sales)', totalAmount: pmtAmount });
          
          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, cashAcc[0].id, pmtAmount, 0, null, null],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, pmtSales, invoice.customerId || null, 'Customer']
          ];
          
          if (pmtTax > 0 && taxAcc.length > 0) {
             lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAcc[0].id, 0, pmtTax, null, null]);
          }
          
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
          
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, cashAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtSales, salesAcc[0].id]);
          if (pmtTax > 0 && taxAcc.length > 0) {
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtTax, taxAcc[0].id]);
          }
        }
      } catch (e) { console.error('Auto GL Payment Error:', e); }"""

rep_pmt_gl = """      // Auto GL: Accrual Basis - Record Payment (Debit Cash, Credit AR)
      try {
        let [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1');
        
        if (cashAcc.length === 0) {
          const cashId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
          cashAcc = [{ id: cashId }];
        }
        if (arAcc.length === 0) {
          const arId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
          arAcc = [{ id: arId }];
        }
        
        if (cashAcc.length > 0 && arAcc.length > 0) {
          const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
          const pmtAmount = Number(payment.amount);
          
          await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: newPayment.date, reference: newPayment.id, description: 'Auto GL: Invoice Payment Received', totalAmount: pmtAmount });
          
          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, cashAcc[0].id, pmtAmount, 0, null, null],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, arAcc[0].id, 0, pmtAmount, invoice.customerId || null, 'Customer']
          ];
          
          await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
          
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, cashAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [pmtAmount, arAcc[0].id]); // Credit AR reduces asset balance
        }
      } catch (e) { console.error('Auto GL Payment Error:', e); }"""

content = content.replace(find_pmt_gl, rep_pmt_gl)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Updated to Accrual GL")
