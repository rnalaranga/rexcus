const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /app\.get\('\/api\/quotations', async \(req, res\) => \{[\s\S]*?res\.json\(rows\);/m;

const newRoute = `app.get('/api/quotations', async (req, res) => {
    try {
      const [rows] = await db.query(\`
        SELECT q.*, 
               COALESCE(l.name, c.name) as leadName, 
               COALESCE(l.company, c.company) as leadCompany 
        FROM quotations q 
        LEFT JOIN leads l ON q.leadId = l.id 
        LEFT JOIN customers c ON q.leadId = c.id
        ORDER BY q.date DESC
      \`);
      res.json(rows);`;

content = content.replace(regex, newRoute);

fs.writeFileSync('api/src/server.ts', content, 'utf8');