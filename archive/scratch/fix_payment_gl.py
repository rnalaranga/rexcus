import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

# 1. Update SELECT query to fetch taxAmount and subtotal
sel_find = "const [rows]: any = await db.query('SELECT payments, paidAmount, total, customerId FROM invoices WHERE id = ?', [id]);"
sel_rep = "const [rows]: any = await db.query('SELECT payments, paidAmount, subtotal, taxAmount, total, customerId FROM invoices WHERE id = ?', [id]);"
content = content.replace(sel_find, sel_rep)

# 2. Add fallback for missing accounts and fix tax lookup
gl_find = """        const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
        const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
        const [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        
        if (cashAcc.length > 0 && salesAcc.length > 0) {"""

gl_rep = """        const [salesAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code IN ("3000", "4000") OR name LIKE "%Sales%" OR name LIKE "%Revenue%" LIMIT 1');
        const [taxAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE name LIKE "%Tax Payable%" OR code = "2200" OR isTaxAccount = 1 LIMIT 1');
        let [cashAcc] = await db.query('SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1');
        
        // Auto-create Cash Account if it doesn't exist
        if (cashAcc.length === 0) {
          const cashId = 'ACC-' + Date.now().toString().slice(-6);
          await db.query('INSERT IGNORE INTO chart_of_accounts (id, code, name, type, subtype, balance, createdAt) VALUES (?, "1000", "Cash and Equivalents", "Asset", "Cash", 0, NOW())', [cashId]);
          cashAcc = [{ id: cashId }];
        }
        
        if (salesAcc.length > 0) {"""
content = content.replace(gl_find, gl_rep)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Fixed Invoice Payment GL")
