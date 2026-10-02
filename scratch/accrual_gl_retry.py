import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

find_post_inv = """    await db.query('INSERT INTO invoices SET ?', data);
    
    // Auto GL removed from creation for Cash-Basis accounting

    res.json({ success: true, id: data.id });"""

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
        
        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });
        
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

    res.json({ success: true, id: data.id });"""

content = content.replace(find_post_inv, rep_post_inv)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Updated POST /api/invoices with Accrual GL")
