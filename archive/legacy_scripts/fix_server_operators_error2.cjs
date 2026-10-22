const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.post\('\/api\/production\/machineries\/:id\/operators', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\s*\}\);/;

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
            if (e.message.includes('createdAt') || e.message.includes('Field \\'createdAt\\' doesn\\'t have a default value')) {
              await db.query('INSERT INTO employee_machines (employeeId, machineId, createdAt) VALUES (?, ?, NOW())', [empId, machineId]);
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

if (regex.test(content)) {
    content = content.replace(regex, newPost);
    console.log("Updated operators POST endpoint via regex");
} else {
    console.log("Could not find operators POST endpoint via regex");
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');