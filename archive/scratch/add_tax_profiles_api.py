import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

# Add tax profiles API after taxes API
taxes_api = """app.get('/api/finance/taxes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_rates');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});"""

new_api = """app.get('/api/finance/taxes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_rates');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/finance/tax-profiles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tax_profiles');
    res.json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/finance/tax-profiles', async (req, res) => {
  try {
    const data = req.body;
    await db.query('INSERT INTO tax_profiles SET ?', data);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/finance/tax-profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM tax_profiles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});"""

content = content.replace(taxes_api, new_api)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Added tax-profiles API")
