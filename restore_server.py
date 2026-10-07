import re

with open('api/src/server.ts', 'r') as f:
    code = f.read()

# 1. Add patches to fix-db (around line 235)
patches_code = """
  // Run quick patches
  const patches = [
    'ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT "Draft"',
    'ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT ""',
    'ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT "In Stock"',
    'ALTER TABLE customers ADD COLUMN paymentTerms TEXT',
    'ALTER TABLE customers ADD COLUMN deliveryTerms TEXT',
    'ALTER TABLE customers ADD COLUMN contacts TEXT',
    'ALTER TABLE tax_profiles ADD COLUMN tax1_hidden TINYINT(1) DEFAULT 0',
    'ALTER TABLE tax_profiles ADD COLUMN tax1_show_separately TINYINT(1) DEFAULT 0',
    'ALTER TABLE tax_profiles ADD COLUMN tax2_show_separately TINYINT(1) DEFAULT 1',
    'ALTER TABLE tax_profiles ADD COLUMN tax1_accountId VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE tax_profiles ADD COLUMN tax2_accountId VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE invoices ADD COLUMN invoiceNo VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE invoices ADD COLUMN taxProfileId VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL'
  ];
  for (const p of patches) {
    try { await dbObj.query(p); } catch (e) {}
  }
"""
code = code.replace("const patches = [\n    'ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT \"Draft\"',\n    'ALTER TABLE users ADD COLUMN prefix VARCHAR(10) DEFAULT \"\"',\n    'ALTER TABLE customer_grns ADD COLUMN status VARCHAR(50) DEFAULT \"In Stock\"',\n    'ALTER TABLE customers ADD COLUMN paymentTerms TEXT',\n    'ALTER TABLE customers ADD COLUMN deliveryTerms TEXT',\n    'ALTER TABLE customers ADD COLUMN contacts TEXT',\n    'ALTER TABLE tax_profiles ADD COLUMN tax1_hidden TINYINT(1) DEFAULT 0'\n  ];\n  for (const p of patches) {\n    try { await dbObj.query(p); } catch (e) {}\n  }", patches_code.strip())

# 2. Add next-number endpoint before /api/invoices
next_number_code = """
app.get('/api/invoices/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `INV/${year}/`;
    const rows = await db.query('SELECT invoiceNo FROM invoices WHERE invoiceNo LIKE ? ORDER BY invoiceNo DESC LIMIT 1', [`${prefix}%`]) as any;
    if (rows && rows.length > 0 && rows[0].invoiceNo) {
      const lastNo = rows[0].invoiceNo;
      const numMatch = lastNo.match(/\d+$/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0]) + 1;
        return res.json({ invoiceNo: `${prefix}${nextNum.toString().padStart(4, '0')}` });
      }
    }
    res.json({ invoiceNo: `${prefix}0001` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/invoices', async (req, res) => {
"""
code = code.replace("app.get('/api/invoices', async (req, res) => {", next_number_code.strip())

# 3. Update GL logic in POST /api/invoices
gl_logic_old = """
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
"""

gl_logic_new = """
    // Auto GL: Accrual Basis - Record Receivable & Sales
    try {
      const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1') as any;
      let [arAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1100" OR name LIKE "%Accounts Receivable%" LIMIT 1') as any;

      if (arAcc.length === 0) {
        const arId = 'ACC-' + Date.now().toString().slice(-6);
        await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1100", "Accounts Receivable", "Asset", "Accounts Receivable", 0, NOW())', [arId]);
        arAcc = [{ id: arId }];
      }

      if (arAcc.length > 0 && salesAcc.length > 0) {
        const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
        const invTotal = Number(data.total) || 0;
        const invSub = Number(data.subtotal) || invTotal;

        // Parse tax breakdown from taxProfileId
        let taxBreakdown: any = null;
        try { taxBreakdown = data.taxBreakdown ? JSON.parse(data.taxBreakdown) : null; } catch(e) {}

        await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.invoiceNo || data.id, description: 'Auto GL: Invoice Issued', totalAmount: invTotal });

        const lines: any[] = [
          ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
          ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
        ];
        
        let getOrCreateTaxAcc = async () => {
          const [defTax] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" LIMIT 1') as any;
          if (defTax[0]) return defTax[0].id;
          const newId = 'ACC-' + Date.now().toString().slice(-6) + Math.floor(Math.random()*10);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "2200", "Tax Payable", "Liability", "Tax", 0, NOW())', [newId]);
          return newId;
        };

        // Use tax profile accounts if available
        if (taxBreakdown && data.taxProfileId) {
          const [profile] = await db.query('SELECT * FROM tax_profiles WHERE id = ?', [data.taxProfileId]) as any;
          const prof = profile[0];
          if (prof) {
            const tax1Amt = Number(taxBreakdown.tax1Amount) || 0;
            const tax2Amt = Number(taxBreakdown.tax2Amount) || 0;

            if (tax1Amt > 0) {
              let tax1AccId = prof.tax1_accountId;
              if (!tax1AccId) tax1AccId = await getOrCreateTaxAcc();
              if (tax1AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, tax1AccId, 0, tax1Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax1Amt, tax1AccId]);
              }
            }
            if (tax2Amt > 0) {
              let tax2AccId = prof.tax2_accountId;
              if (!tax2AccId) tax2AccId = await getOrCreateTaxAcc();
              if (tax2AccId) {
                lines.push(['JL-' + Date.now().toString().slice(-5) + '4', jeId, tax2AccId, 0, tax2Amt, null, null]);
                await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [tax2Amt, tax2AccId]);
              }
            }
          }
        } else if (Number(data.taxAmount) > 0) {
          // Fallback: generic tax payable
          const taxAccId = await getOrCreateTaxAcc();
          if (taxAccId) {
            lines.push(['JL-' + Date.now().toString().slice(-5) + '3', jeId, taxAccId, 0, Number(data.taxAmount), null, null]);
            await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [Number(data.taxAmount), taxAccId]);
          }
        }

        await db.query('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, partyId, partyType) VALUES ?', [lines]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invTotal, arAcc[0].id]);
        await db.query('UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?', [invSub, salesAcc[0].id]);
      }
    } catch(e) { console.error('Auto GL Invoice Error:', e); }
"""
if gl_logic_old.strip() in code:
    code = code.replace(gl_logic_old.strip(), gl_logic_new.strip())
else:
    print("Could not find GL logic!")

with open('api/src/server.ts', 'w') as f:
    f.write(code)

print("Done")
