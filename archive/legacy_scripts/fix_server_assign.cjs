const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const opStatusAPI = `app.put('/api/production/operations/:id/status', async (req, res) => {`;
const assignAPI = `app.put('/api/production/operations/:id/assign', async (req, res) => {
  try {
    const { employeeId, machineId } = req.body;
    await db.query('UPDATE work_order_operations SET employeeId=?, machineId=? WHERE id=?', [employeeId || null, machineId || null, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/production/operations/:id/status', async (req, res) => {`;

if (content.includes(opStatusAPI)) {
    content = content.replace(opStatusAPI, assignAPI);
    console.log("Added operations/:id/assign endpoint");
} else {
    console.log("Could not find opStatusAPI");
}
fs.writeFileSync('api/src/server.ts', content, 'utf8');