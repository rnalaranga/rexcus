const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.put\('\/api\/production\/operations\/:id\/assign', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\r?\n\s*\}\r?\n\}\);/;

const newEndpoint = `app.put('/api/production/operations/:id/assign', async (req, res) => {
  try {
    const { employeeId, machineId, scheduledStart, scheduledEnd, isLocked } = req.body;
    
    const toMysqlDt = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n) => n.toString().padStart(2, '0');
      return \`\${d.getFullYear()}-\${pad(d.getMonth()+1)}-\${pad(d.getDate())} \${pad(d.getHours())}:\${pad(d.getMinutes())}:00\`;
    };

    let query = 'UPDATE work_order_operations SET employeeId=?, machineId=?';
    let params = [employeeId || null, machineId || null];
    
    if (scheduledStart !== undefined) {
      query += ', scheduledStart=?, scheduledEnd=?';
      params.push(toMysqlDt(scheduledStart), toMysqlDt(scheduledEnd));
    }
    
    if (isLocked !== undefined) {
      query += ', isLocked=?';
      params.push(isLocked ? 1 : 0);
    }
    
    query += ' WHERE id=?';
    params.push(req.params.id);
    
    await db.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

if(regex.test(code)) {
    code = code.replace(regex, newEndpoint);
    fs.writeFileSync('api/src/server.ts', code, 'utf8');
    console.log('Assignment endpoint patched');
} else {
    console.log("Could not find match for regex");
}