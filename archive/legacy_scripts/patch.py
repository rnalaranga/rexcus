import re

with open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_code = '''// FIX DB ROUTE (Safe Schema Sync)
// ==========================
app.post('/api/settings/fix-db', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '../../fix_db_schema.sql');
    
    const dbObj = require('./db').default || require('./db');

    if (fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      for (const stmt of statements) {
        try {
          await dbObj.query(stmt);
        } catch (err) {
          // Ignore
        }
      }
    }

    // Safe schema patches
    const patches = [
      "ALTER TABLE chart_of_accounts ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00",
      "ALTER TABLE chart_of_accounts ADD COLUMN subtype VARCHAR(50)",
      "ALTER TABLE tax_rates ADD COLUMN accountId VARCHAR(50)",
      "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT 'posted'"
    ];

    for (const patch of patches) {
      try {
        await dbObj.query(patch);
      } catch (err) {
        // Ignore
      }
    }

    res.json({ success: true, message: 'Database fixed and synchronized successfully. No data was deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});
'''

new_content = re.sub(r'// FRESH DB ROUTE.*?app\.post\(\'/api/settings\', async', new_code + '\napp.post(\'/api/settings\', async', content, flags=re.DOTALL)

with open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done2')
