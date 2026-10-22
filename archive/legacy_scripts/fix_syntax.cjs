const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.delete\('\/api\/customers\/:id', async \(req, res\) => \{[\s\S]*?\}\);\s*\}(\s*\});?\s*\}\s*catch\s*\(error\)\s*\{\s*console\.error\(error\);\s*res\.status\(500\)\.json\([^)]+\);\s*\}\s*\});?/g;

const fixed = `
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;

code = code.replace(regex, fixed);
fs.writeFileSync('api/src/server.ts', code);
console.log('done');
