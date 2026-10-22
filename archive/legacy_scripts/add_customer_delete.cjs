const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const newRoute = `
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;

if (!code.includes('app.delete(\'/api/customers')) {
  code = code.replace(/app\.post\('\/api\/customers', [\s\S]*?\}\);\s*/, match => match + '\n' + newRoute + '\n');
  fs.writeFileSync('api/src/server.ts', code);
  console.log('Customer delete route added');
} else {
  console.log('Route already exists');
}
