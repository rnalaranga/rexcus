const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

code = code.replace(
  /INSERT INTO customers \(id, name, company, email, phone, status, createdAt\) VALUES \(\?, \?, \?, \?, \?, \?, NOW\(\)\)/g,
  'INSERT INTO customers (id, name, company, email, phone, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, NOW())'
);

fs.writeFileSync('api/src/server.ts', code, 'utf8');
console.log('Fixed Phase 4 customers schema mismatch');