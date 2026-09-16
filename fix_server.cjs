const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

// Remove the entire duplicated block (from the second GET work-orders at line ~1507 through the POST)
// We want to keep only the first GET (line 1312) and inject new POST/DELETE/PATCH after it

// Find the second occurrence of GET work-orders and remove that duplicate block + old POST
const marker = "// ==========================\n// PRODUCTION / WORK ORDERS API\n// ==========================\n";
const idx = content.indexOf(marker);
if (idx !== -1) {
  // Find where the new correct POST endpoint ends (after the PATCH attachments block)
  const patchEnd = content.indexOf("});", content.indexOf("PATCH attachments")) + 3;
  // Remove from marker to end of PATCH block
  content = content.slice(0, idx) + content.slice(patchEnd);
}

// Now add our new endpoints after the existing GET (first one)
const newEndpoints = `
// DELETE work order
app.delete('/api/production/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM work_order_operations WHERE workOrderId = ?', [id]);
    await db.query('DELETE FROM work_orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH attachments for a work order
app.patch('/api/production/work-orders/:id/attachments', async (req, res) => {
  try {
    const { attachments } = req.body;
    await db.query('UPDATE work_orders SET attachments = ? WHERE id = ?', [JSON.stringify(attachments), req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

`;

// Find the POST work-orders and update it with duplicate check + sourceQuoteId + attachments
const oldPost = `app.post('/api/production/work-orders', async (req, res) => {
  try {
    const { title, customerId, priority, deadline, operations, bom, sourceQuoteId, notes, attachments } = req.body;

    // Duplicate check — prevent creating more than one WO per quotation
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
      const opValues = operations.map((op: any, i: number) => [
        'OP-' + Date.now().toString().slice(-4) + '-' + i,
        woId, i + 1, op.operationName, op.machineId || null, op.employeeId || null, op.plannedHours || 0
      ]);
      await db.query(
        'INSERT INTO work_order_operations (id, workOrderId, stepNumber, operationName, machineId, employeeId, plannedHours) VALUES ?',
        [opValues]
      );
    }

    res.json({ success: true, id: woId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

// Insert our new DELETE/PATCH before the existing POST
if (content.includes(oldPost) && !content.includes("DELETE work order")) {
  content = content.replace(oldPost, newEndpoints + oldPost);
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');
console.log('Done. Lines:', content.split('\n').length);