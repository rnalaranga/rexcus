const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.get\('\/api\/production\/machineries', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\s*\}\);/;

const newGet = `app.get('/api/production/machineries', async (req, res) => {
    try {
      const [machineries] = await db.query('SELECT * FROM machineries ORDER BY createdAt DESC');
      let empMachines = [];
      try {
        const [rows] = await db.query('SELECT em.machineId, em.employeeId, e.name FROM employee_machines em JOIN employees e ON em.employeeId = e.id');
        empMachines = rows;
      } catch(e) {
        console.error("Error fetching employee_machines:", e);
      }
      
      const enriched = machineries.map(m => ({
        ...m,
        operators: empMachines.filter(em => em.machineId === m.id).map(em => em.name)
      }));
      
      res.json(enriched);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });`;

if (regex.test(content)) {
    content = content.replace(regex, newGet);
    console.log("Updated machineries GET endpoint via regex");
} else {
    console.log("Could not find machineries GET endpoint via regex");
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');