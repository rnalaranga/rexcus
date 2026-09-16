const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const endpoints = `
// ==========================
// MACHINING OPERATIONS API
// ==========================
app.get('/api/machining-operations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM machining_operations ORDER BY groupName ASC, name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machining-operations', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    const [result] = await db.query(
      'INSERT INTO machining_operations (groupName, name, hrRate, setTimeRate, machineId) VALUES (?, ?, ?, ?, ?)',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/machining-operations/:id', async (req, res) => {
  try {
    const { groupName, name, hrRate, setTimeRate, machineId } = req.body;
    await db.query(
      'UPDATE machining_operations SET groupName=?, name=?, hrRate=?, setTimeRate=?, machineId=? WHERE id=?',
      [groupName, name, hrRate || 0, setTimeRate || 0, machineId || null, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/machining-operations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM machining_operations WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

`;

const anchor = "const PORT = process.env.PORT || 3000;";
if (content.includes(anchor) && !content.includes('/api/machining-operations')) {
    content = content.replace(anchor, endpoints + anchor);
    fs.writeFileSync('api/src/server.ts', content, 'utf8');
    console.log('Restored machining-operations endpoints');
} else {
    console.log('Could not find anchor or endpoints already exist');
}