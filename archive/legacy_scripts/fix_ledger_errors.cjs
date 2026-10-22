const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

// Fix 1: GET /api/inventory/:id/ledger
content = content.replace("ORDER BY date DESC, createdAt DESC", "ORDER BY date DESC");

// Fix 2: GET /api/inventory/ledger/wo/:woId
content = content.replace("ORDER BY l.createdAt DESC", "ORDER BY l.date DESC");

// Fix 3: POST /api/inventory/:id/ledger
const oldBalanceLogic = `      // Get latest balance
      const [rows]: any = await db.query('SELECT balance FROM stock_ledger WHERE inventoryId = ? ORDER BY date DESC, createdAt DESC LIMIT 1', [id]);
      const currentBalance = rows.length > 0 ? Number(rows[0].balance) : 0;
      
      const newBalance = type === 'IN' ? currentBalance + Number(qty) : currentBalance - Number(qty);
      
      const entry = {
        id: 'LGR-' + Date.now().toString().slice(-4),
        inventoryId: id,
        date: date || new Date(),
        type,
        qty: Number(qty),
        balance: newBalance,
        reference: reference || null,
        notes: notes || null
      };`;

const newBalanceLogic = `      const entry = {
        id: 'LGR-' + Date.now().toString().slice(-4),
        inventoryId: id,
        date: date || new Date(),
        type,
        qty: Number(qty),
        reference: reference || null,
        notes: notes || null
      };`;

if (content.includes(oldBalanceLogic)) {
    content = content.replace(oldBalanceLogic, newBalanceLogic);
    console.log("Fixed POST ledger logic");
} else {
    // try a regex just in case
    const reBalance = /\s*\/\/ Get latest balance[\s\S]*?notes: notes \|\| null\s*\};/;
    if (reBalance.test(content)) {
        content = content.replace(reBalance, newBalanceLogic);
        console.log("Fixed POST ledger logic via regex");
    } else {
        console.log("Could not find POST ledger logic to replace");
    }
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');