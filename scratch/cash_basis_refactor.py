import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

# 1. Remove Auto GL from Invoice Creation
create_find_start = "    try {\n      const [arAcc] = await db.query('SELECT id FROM chart_of_accounts"
create_find_end = "    } catch (e) { console.error('Auto GL Invoice Error:', e); }"

start_idx = content.find(create_find_start)
end_idx = content.find(create_find_end) + len(create_find_end)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + "    // Auto GL removed from creation for Cash-Basis accounting" + content[end_idx:]

# 2. Rewrite Invoice Payment Auto GL to hit Cash, Sales, Tax
pay_gl_find = """        const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("1100", "1500") OR name LIKE "%Receivable%" LIMIT 1');
        const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
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
          // Cash gets Debit (+), AR gets Credit (-)
          await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [pmtAmount, cashAcc[0].id]);
          await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [pmtAmount, arAcc[0].id]);
        }"""

pay_gl_rep = """        const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
        const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
        const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        
        if (cashAcc.length > 0 && salesAcc.length > 0) {
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
        }"""
content = content.replace(pay_gl_find, pay_gl_rep)

# 3. Rewrite Aging Query
old_ar_query = """      SELECT 
        jl.partyId,
        COALESCE(p.name, p.company, l.name, l.company, 'Unknown') as partyName,
        SUM(jl.debit - jl.credit) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) <= 30 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 31 AND 60 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 61 AND 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) > 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90plus'
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entryId = je.id
      JOIN chart_of_accounts ca ON jl.accountId = ca.id
      LEFT JOIN customers p ON jl.partyId = p.id 
      LEFT JOIN leads l ON jl.partyId = l.id
      WHERE jl.partyType = 'Customer' AND (ca.name LIKE "%Receivable%" OR ca.code IN ("1100", "1500"))
      GROUP BY jl.partyId, partyName 
      HAVING balance > 0"""

new_ar_query = """      SELECT 
        i.customerId as partyId,
        COALESCE(p.name, p.company, l.name, l.company, 'Unknown') as partyName,
        SUM(i.total - COALESCE(i.paidAmount, 0)) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) <= 30 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 31 AND 60 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) BETWEEN 61 AND 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), i.date) > 90 THEN (i.total - COALESCE(i.paidAmount, 0)) ELSE 0 END) as 'bucket90plus'
      FROM invoices i
      LEFT JOIN customers p ON i.customerId = p.id 
      LEFT JOIN leads l ON i.customerId = l.id
      WHERE i.status != 'paid' AND i.status != 'draft'
      GROUP BY i.customerId, partyName 
      HAVING balance > 0"""
content = content.replace(old_ar_query, new_ar_query)

# 4. Remove Invoice Delete Reversal of GL since it never hit GL
del_gl_find = """        // Let's reverse the balances manually.
        // Wait, since we know exactly how they were added, we can use the same logic:
        // Asset/Expense normally +Debit, -Credit.
        // Liability/Equity/Revenue normally -Debit, +Credit.
        // However, in our system, ALL balances were just absolute positive numbers!
        // Invoice Creation: AR (+), Sales (+), Tax (+)
        // Payment: Cash (+), AR (-)
        
        // To precisely reverse them:
        // We know what accounts were used:
        try {
          const [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("1100", "1500") OR name LIKE "%Receivable%" LIMIT 1');
          const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
          const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1');
          const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
          
          const totalAmount = Number(invoice.total) || Number(invoice.amount) || 0;
          const subtotal = Number(invoice.subtotal) || totalAmount;
          const taxAmount = Number(invoice.taxAmount) || 0;
          const totalPaid = Number(invoice.paidAmount) || 0;
          
          if (arAcc.length > 0) {
            // Reverse invoice AR addition: Subtract totalAmount
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [totalAmount, arAcc[0].id]);
            // Reverse payment AR subtraction: Add totalPaid
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [totalPaid, arAcc[0].id]);
          }
          if (salesAcc.length > 0) {
            // Reverse invoice Sales addition: Subtract subtotal
            await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [subtotal, salesAcc[0].id]);
          }
          if (taxAcc.length > 0 && taxAmount > 0) {
             await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [taxAmount, taxAcc[0].id]);
          }
          if (cashAcc.length > 0 && totalPaid > 0) {
             // Reverse payment Cash addition: Subtract totalPaid
             await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [totalPaid, cashAcc[0].id]);
          }
        } catch(e) { console.error('Error reversing GL balances:', e); }"""

del_gl_rep = """        // Cash Basis GL Reversal on Invoice Deletion
        // Invoice creation never hit GL. Only Payments hit GL (Cash, Sales, Tax).
        try {
          const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
          const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
          const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
          
          const invTotal = Number(invoice.total) || 1;
          const invTax = Number(invoice.taxAmount) || 0;
          
          let totalSalesReversed = 0;
          let totalTaxReversed = 0;
          let totalCashReversed = 0;
          
          existingPayments.forEach((p: any) => {
             const pmtAmount = Number(p.amount);
             const pmtTax = pmtAmount * (invTax / invTotal);
             const pmtSales = pmtAmount - pmtTax;
             totalCashReversed += pmtAmount;
             totalTaxReversed += pmtTax;
             totalSalesReversed += pmtSales;
          });
          
          if (cashAcc.length > 0 && totalCashReversed > 0) {
             await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [totalCashReversed, cashAcc[0].id]);
          }
          if (salesAcc.length > 0 && totalSalesReversed > 0) {
             await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [totalSalesReversed, salesAcc[0].id]);
          }
          if (taxAcc.length > 0 && totalTaxReversed > 0) {
             await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [totalTaxReversed, taxAcc[0].id]);
          }
        } catch(e) { console.error('Error reversing Cash Basis GL:', e); }"""
content = content.replace(del_gl_find, del_gl_rep)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Applied Cash Basis Accounting")
