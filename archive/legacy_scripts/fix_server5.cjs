const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const newGet = `
app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT l.*, i.name as materialName, i.uom as unit FROM stock_ledger l JOIN inventory i ON l.inventoryId = i.id WHERE l.reference = ? ORDER BY l.createdAt DESC',
      [req.params.woId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;

const marker = "app.post('/api/inventory/:id/ledger', async (req, res) => {";
if (content.includes(marker)) {
    content = content.replace(marker, newGet + "\n" + marker);
    fs.writeFileSync('api/src/server.ts', content, 'utf8');
    console.log("Success add ledger endpoint!");
} else {
    console.log("Failed to find ledger marker");
}