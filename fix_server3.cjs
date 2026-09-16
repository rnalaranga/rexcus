const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const oldPostFull = `app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { title, customerId, priority, deadline, operations } = req.body;
    const woId = 'WO-' + Date.now().toString().slice(-5);
    
    await db.query(
      'INSERT INTO work_orders (id, title, customerId, priority, plannedStartDate, deadline) VALUES (?, ?, ?, ?, NOW(), ?)',
      [woId, title, customerId || null, priority, deadline || null]
    );

    if (operations && operations.length > 0) {
      const opValues = operations.map((op, i) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId,
        i + 1, // stepNumber
        op.operationName,
        op.machineId || null,
        op.employeeId || null,
        op.plannedHours || 0
      ]);
      
      await db.query(
        'INSERT INTO work_order_operations (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours) VALUES ?',
        [opValues]
      );
    }
    
    res.json({ success: true, id: woId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

const newCode = `app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { title, customerId, priority, deadline, operations, bom, sourceQuoteId, notes, attachments } = req.body;

    // Duplicate check
    if (sourceQuoteId) {
      const [existing] = await db.query('SELECT id FROM work_orders WHERE quoteId = ? LIMIT 1', [sourceQuoteId]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'DUPLICATE', existingId: existing[0].id, message: 'A Work Order already exists for this quotation.' });
      }
    }

    const woId = 'WO-' + Date.now().toString().slice(-5);

    await db.query(
      'INSERT INTO work_orders (id, title, customerId, quoteId, priority, plannedStartDate, deadline, bom, notes, attachments) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)',
      [woId, title, customerId || null, sourceQuoteId || null, priority || 'Normal', deadline || null, bom ? JSON.stringify(bom) : null, notes || null, attachments ? JSON.stringify(attachments) : null]
    );

    if (operations && operations.length > 0) {
      const opValues = operations.map((op, i) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId, i + 1, op.operationName, op.machineId || null, op.employeeId || null, op.plannedHours || 0
      ]);
      await db.query(
        'INSERT INTO work_order_operations (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours) VALUES ?',
        [opValues]
      );
    }

    res.json({ success: true, id: woId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM work_order_operations WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/production/work-orders/:id/attachments', async (req, res) => {
  try {
    const { attachments } = req.body;
    await db.query('UPDATE work_orders SET attachments = ? WHERE id = ?', [JSON.stringify(attachments), req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;

if (content.includes(oldPostFull)) {
  content = content.replace(oldPostFull, newCode);
  fs.writeFileSync('api/src/server.ts', content, 'utf8');
  console.log('Replaced successfully!');
} else {
    console.log('Could not find exact match');
}