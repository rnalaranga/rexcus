const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const newRoute = `
// ==========================
// FRESH DB ROUTE
// ==========================
app.post('/api/settings/fresh-db', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== '0715719676@Bcg') {
      return res.status(403).json({ success: false, error: 'Invalid password' });
    }

    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '../../complete_db.sql');
    
    if (fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      const statements = sqlContent.split(';').filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try {
          // Check if statement contains CREATE TABLE or ALTER
          if (stmt.toUpperCase().includes('CREATE') || stmt.toUpperCase().includes('ALTER')) {
            // we use the existing global db pool here
          }
        } catch (err) {
          // ignore
        }
      }
    }

    // Truncate transactional tables, preserve users/settings/chart_of_accounts etc.
    const tablesToWipe = [
      'leads', 'deals', 'quotations', 'followups', 'invoices',
      'journal_entries', 'journal_lines', 'supplier_bills',
      'purchase_orders', 'material_requests', 'grns',
      'stock_ledger', 'supplier_ledger', 'rework_logs', 'qc_inspections',
      'work_order_operations', 'work_orders'
    ];
    
    // We do NOT truncate users, customers, chart_of_accounts, suppliers, inventory, machineries, etc.

    const dbObj = require('./db').default || require('./db');
    
    await dbObj.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tablesToWipe) {
      try {
        await dbObj.query(\`TRUNCATE TABLE \${table}\`);
      } catch (err) {
        console.warn(\`Could not truncate \${table}:\`, err.message);
      }
    }
    await dbObj.query('SET FOREIGN_KEY_CHECKS = 1');

    res.json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    console.error(error);
    const dbObj = require('./db').default || require('./db');
    try { await dbObj.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}
    res.status(500).json({ success: false, error: error.message });
  }
});
`;

if (!code.includes('/api/settings/fresh-db')) {
  code = code.replace(/app\.post\('\/api\/settings',/, newRoute + "\napp.post('/api/settings',");
  fs.writeFileSync('api/src/server.ts', code);
  console.log('Route added');
} else {
  console.log('Route already exists');
}
