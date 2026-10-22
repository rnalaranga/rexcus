const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const endpoints = `
// ==========================
// MACHINE OPERATORS API
// ==========================
app.get('/api/production/machineries/:id/operators', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT employeeId FROM employee_machines WHERE machineId=?', [req.params.id]);
    res.json(rows.map(r => r.employeeId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/production/machineries/:id/operators', async (req, res) => {
  try {
    const machineId = req.params.id;
    const { employeeIds } = req.body;
    await db.query('DELETE FROM employee_machines WHERE machineId=?', [machineId]);
    
    if (employeeIds && employeeIds.length > 0) {
      const inserts = employeeIds.map(empId => [empId, machineId]);
      await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES ?', [inserts]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

`;

const anchor = "const PORT = process.env.PORT || 3000;";
if (content.includes(anchor) && !content.includes('/api/production/machineries/:id/operators')) {
    content = content.replace(anchor, endpoints + anchor);
    fs.writeFileSync('api/src/server.ts', content, 'utf8');
    console.log('Restored machine operators endpoints');
} else {
    console.log('Could not find anchor or endpoints already exist');
}