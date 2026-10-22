const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const oldPost = `app.post('/api/production/machineries/:id/operators', async (req, res) => {
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
  });`;

const newPost = `app.post('/api/production/machineries/:id/operators', async (req, res) => {
    try {
      const machineId = req.params.id;
      const { employeeIds } = req.body;
      await db.query('DELETE FROM employee_machines WHERE machineId=?', [machineId]);
      
      if (employeeIds && employeeIds.length > 0) {
        for (const empId of employeeIds) {
          try {
            await db.query('INSERT INTO employee_machines (employeeId, machineId) VALUES (?, ?)', [empId, machineId]);
          } catch(e) {
            if (e.message.includes('createdAt')) {
              await db.query('INSERT INTO employee_machines (employeeId, machineId, createdAt) VALUES (?, ?, NOW())', [empId, machineId]);
            } else if (e.message.includes('updatedAt')) {
              await db.query('INSERT INTO employee_machines (employeeId, machineId, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [empId, machineId]);
            } else {
              throw e;
            }
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Operators POST Error:", error);
      res.status(500).json({ error: error.message });
    }
  });`;

if (content.includes(oldPost)) {
    content = content.replace(oldPost, newPost);
    console.log("Updated operators POST endpoint");
} else {
    console.log("Could not find operators POST endpoint");
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');