const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const statusEndpoint = `
app.put('/api/quotations/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE quotations SET status=? WHERE id=?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
`;

content = content.replace(
  "app.delete('/api/quotations/:id', async (req, res) => {",
  statusEndpoint + "\napp.delete('/api/quotations/:id', async (req, res) => {"
);

fs.writeFileSync('src/server.ts', content, 'utf8');