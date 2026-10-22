const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

// Fix 1: Enrich work-orders GET with customer name from leads
const old = `app.get('/api/production/work-orders', async (req, res) => {
    try {
      const [wos] = await db.query('SELECT * FROM work_orders ORDER BY createdAt DESC');
      const [ops] = await db.query('SELECT * FROM work_order_operations ORDER BY stepNumber ASC');
      const [qcs] = await db.query('SELECT * FROM qc_inspections');
      
      const enriched = wos.map(wo => ({
        ...wo,
        operations: ops.filter(o => o.workOrderId === wo.id).map(o => ({
          ...o,
          qc: qcs.filter(q => q.operationId === o.id)
        }))
      }));
      
      res.json(enriched);`;

const newCode = `app.get('/api/production/work-orders', async (req, res) => {
    try {
      const [wos] = await db.query('SELECT * FROM work_orders ORDER BY createdAt DESC');
      const [ops] = await db.query('SELECT * FROM work_order_operations ORDER BY stepNumber ASC');
      const [qcs] = await db.query('SELECT * FROM qc_inspections');
      const [empRows] = await db.query('SELECT id, name FROM employees');
      
      // Resolve customer names from leads table
      let leadMap: Record<string, string> = {};
      try {
        const [leads]: any = await db.query('SELECT id, name, company FROM leads');
        leads.forEach((l: any) => { leadMap[l.id] = l.name || l.company || l.id; });
      } catch(e) {}

      const enriched = wos.map((wo: any) => ({
        ...wo,
        customerName: leadMap[wo.customerId] || wo.customerId || null,
        operations: ops.filter((o: any) => o.workOrderId === wo.id).map((o: any) => ({
          ...o,
          employeeName: empRows.find((e: any) => e.id === o.employeeId)?.name || null,
          qc: qcs.filter((q: any) => q.operationId === o.id)
        }))
      }));
      
      res.json(enriched);`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  console.log('SUCCESS: work-orders GET enriched');
} else {
  console.log('FAILED: could not find work-orders GET');
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');