const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /\/\/ Get latest balance[\s\S]*?createdAt: new Date\(\)\.toISOString\(\)\.slice\(0, 19\)\.replace\('T', ' '\)\s*\};/;

const newLogic = `const entry = {
        id: 'LGR-' + Date.now().toString().slice(-5),
        inventoryId: id,
        date: data.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: data.type,
        qty: data.qty,
        reference: data.reference || '',
        notes: data.notes || ''
      };`;

if (regex.test(content)) {
    content = content.replace(regex, newLogic);
    console.log("Fixed POST ledger logic via regex");
} else {
    console.log("Could not find POST ledger logic via regex");
}

fs.writeFileSync('api/src/server.ts', content, 'utf8');