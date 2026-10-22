import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

find_del = """        // Cash Basis GL Reversal on Invoice Deletion
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

rep_del = """        // Generic GL Reversal
        try {
          // Find all lines and accounts
          for (const line of lines) {
            const [accounts]: any = await db.query('SELECT type FROM chart_of_accounts WHERE id = ?', [line.accountId]);
            if (!accounts.length) continue;
            
            const accType = accounts[0].type;
            const isDebitNormal = accType === 'Asset' || accType === 'Expense';
            const balanceChange = Number(line.debit) - Number(line.credit); // What this line originally added to the normal balance
            
            if (isDebitNormal) {
              await db.query('UPDATE chart_of_accounts SET balance = balance - ? WHERE id = ?', [balanceChange, line.accountId]);
            } else {
              // for credit normal, it added -balanceChange
              await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [balanceChange, line.accountId]);
            }
          }
        } catch(e) { console.error('Error reversing GL on Invoice Deletion:', e); }"""

content = content.replace(find_del, rep_del)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Updated Invoice Deletion Reversal")
