const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

code = code.replace(
  /app\.post\('\/api\/leads', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, id: data\.id \}\);/,
  `app.post('/api/leads', async (req, res) => {
  try {
    const data = req.body;
    const [result] = await db.query('INSERT INTO leads SET ?', data);
    
    // Auto-create customer
    const custId = data.id.replace('LEAD', 'CUST');
    const custData = {
      id: custId,
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      vat: data.vat,
      svat: data.svat,
      status: 'active',
      joinDate: new Date()
    };
    await db.query('INSERT IGNORE INTO customers SET ?', custData);
    
    res.json({ success: true, id: data.id, customerId: custId });`
);

code = code.replace(
  /app\.put\('\/api\/leads\/:id', async \(req, res\) => \{[\s\S]*?await db\.query\('UPDATE leads SET \? WHERE id = \?', \[data, id\]\);/,
  `app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await db.query('UPDATE leads SET ? WHERE id = ?', [data, id]);
    
    // Auto-update customer
    const custId = id.replace('LEAD', 'CUST');
    const custData = {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      vat: data.vat,
      svat: data.svat
    };
    await db.query('UPDATE customers SET ? WHERE id = ?', [custData, custId]);`
);

fs.writeFileSync('api/src/server.ts', code);
console.log('done');
