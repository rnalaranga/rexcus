const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const newEndpoint = `
app.get('/api/inventory/ledger/wo/:woId', async (req, res) => {
  try {
    const { woId } = req.params;
    // Join with inventory to get the item name
    const [rows] = await db.query(
      'SELECT l.*, i.name as materialName, i.unit FROM stock_ledger l JOIN inventory i ON l.inventoryId = i.id WHERE l.reference = ? ORDER BY l.createdAt DESC',
      [woId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
`;

content = content.replace("// -- SUPPLIER LEDGER --", newEndpoint + "\n// -- SUPPLIER LEDGER --");

fs.writeFileSync('api/src/server.ts', content, 'utf8');