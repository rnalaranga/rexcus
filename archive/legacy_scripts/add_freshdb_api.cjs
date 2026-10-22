const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const newEndpoint = `
// ==========================================
// DANGER ZONE: FRESH DB
// ==========================================
app.post('/api/settings/fresh-db', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== '0715719676@Bcg') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tablesToTruncate = [
      'leads', 'deals', 'customers', 'quotations', 'invoices', 
      'supplier_bills', 'purchase_orders', 'grns', 'work_orders', 
      'material_requests', 'qc_inspections', 'rework_logs', 
      'journal_entries', 'journal_lines', 'followups', 'inventory', 'suppliers'
    ];

    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const table of tablesToTruncate) {
      try {
        await db.query('TRUNCATE TABLE ' + table);
      } catch(e) {
        console.error('Failed to truncate ' + table, e.message);
      }
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    res.json({ success: true, message: 'Database wiped successfully' });
  } catch (error) {
    console.error(error);
    await db.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});
`;

code = code.replace(
  /app\.put\('\/api\/settings', async \(req, res\) => \{[\s\S]*?\}\);/,
  match => match + '\n' + newEndpoint
);

fs.writeFileSync('api/src/server.ts', code);
console.log('done');
