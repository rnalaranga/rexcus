const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

// Fix OUT entry
code = code.replace(
  "type: 'OUT', quantity: usedQty, balance: newBalance,",
  "type: 'OUT', qty: usedQty,"
);

// Fix IN entry
code = code.replace(
  "type: 'IN', quantity: 1, balance: 1,",
  "type: 'IN', qty: 1,"
);

fs.writeFileSync('api/src/server.ts', code, 'utf8');
console.log('Fixed stock_ledger schema mismatch');