async function testCSV() {
  const csvText = 'Type(product/service),Name,SKU,Description,UnitPrice,UnitCost,Quantity,UOM(pcs/kg/m),Location,ReorderLevel\n' +
'product,Sample Item,SKU-001,Description here,1500,1000,10,pcs,Store A,5\n' +
'product,Sample Item 2,SKU-002,Description here 2,1500,1000,10,pcs,Store A,5';
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
  for (let i = 1; i < lines.length; i++) {
    let row = []; let cur = ''; let inQuote = false;
    for (let char of lines[i]) {
      if (char === '"') inQuote = !inQuote;
      else if (char === ',' && !inQuote) { row.push(cur); cur = ''; }
      else cur += char;
    }
    row.push(cur);
    if (row.length < 2) continue;
    const type = (row[0]||'').toLowerCase() === 'service' ? 'service' : 'product';
    const name = row[1]; const sku = row[2] || ''; const description = row[3] || '';
    const unitPrice = Number(row[4]) || 0; const unitCost = Number(row[5]) || 0;
    const quantity = Number(row[6]) || 0; const uom = row[7] || 'pcs';
    const location = row[8] || ''; const reorderLevel = Number(row[9]) || 0;
    if (!name) continue;
    
    const payload = {
      id: 'INV-' + Date.now().toString().slice(-4) + i,
      type, name, sku, description, unitPrice, unitCost, quantity, uom, location, reorderLevel, status: 'active', suppliers: JSON.stringify([])
    };
    
    try {
      const res = await fetch('https://erp.rexgroup.lk/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      console.log('Row', i, 'Status:', res.status, 'Body:', text);
    } catch (err) {
      console.log('Row', i, 'Error:', err.message);
    }
  }
}
testCSV();
