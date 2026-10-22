const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.post\('\/api\/customers', async \(req, res\) => \{[\s\S]*?app\.put\('\/api\/customers\/:id', async \(req, res\) => \{/g;

const fixed = `app.post('/api/customers', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO customers SET ?', data);
    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {`;

code = code.replace(regex, fixed);
fs.writeFileSync('api/src/server.ts', code);
console.log('done');
