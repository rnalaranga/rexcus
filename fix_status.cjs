const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const newEndpoint = `
app.put('/api/quotations/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE quotations SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});
`;

code = code.replace(
  /app\.put\('\/api\/quotations\/update\/:id', async \(req, res\) => \{[\s\S]*?\}\);/,
  match => match + '\n' + newEndpoint
);

fs.writeFileSync('api/src/server.ts', code);
console.log('done');
