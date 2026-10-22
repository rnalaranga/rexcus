import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

start_str = "app.delete('/api/invoices/:id'"
# Find where it ends
si = content.find(start_str)

old_delete = """app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});"""

new_delete = """app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the invoice before deleting to get its payments and amounts
    const [rows]: any = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    
    const invoice = rows[0];
    const existingPayments = invoice.payments ? JSON.parse(invoice.payments) : [];
    
    // References to reverse from GL
    const references = [id];
    existingPayments.forEach((p: any) => references.push(p.id));
    
    // Find Journal Entries to delete
    if (references.length > 0) {
      const [jes]: any = await db.query('SELECT id FROM journal_entries WHERE reference IN (?)', [references]);
      
      if (jes.length > 0) {
        const jeIds = jes.map((je: any) => je.id);
        
        // Find Journal Lines to reverse balances
        const [lines]: any = await db.query('SELECT accountId, debit, credit FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        
        // Let's reverse the balances manually.
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
        } catch(e) { console.error('Error reversing GL balances:', e); }
        
        // Delete the journal lines and entries
        await db.query('DELETE FROM journal_lines WHERE entryId IN (?)', [jeIds]);
        await db.query('DELETE FROM journal_entries WHERE id IN (?)', [jeIds]);
      }
    }
    
    // Finally delete the invoice
    await db.query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});"""

content = content.replace(old_delete, new_delete)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Replaced invoice delete logic")
