const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const endpoints = `
// ==========================
// MACHINE CATEGORIES API
// ==========================
app.get('/api/production/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machine_categories ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const id = 'CAT-' + Math.random().toString(36).substr(2, 6);
    await db.query(
      'INSERT INTO machine_categories (id, name, createdAt) VALUES (?, ?, NOW())',
      [id, name]
    );
    res.json({ success: true, id, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machine_categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

`;

const anchor = "const PORT = process.env.PORT || 3000;";
if (content.includes(anchor) && !content.includes('/api/production/categories')) {
    content = content.replace(anchor, endpoints + anchor);
    fs.writeFileSync('api/src/server.ts', content, 'utf8');
    console.log('Restored production/categories endpoints');
} else {
    console.log('Could not find anchor or endpoints already exist');
}