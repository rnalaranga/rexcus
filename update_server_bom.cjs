const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /const \{ title, customerId, priority, deadline, operations \} = req\.body;\s*const woId = 'WO-' \+ Date\.now\(\)\.toString\(\)\.slice\(-5\);\s*await db\.query\(\s*'INSERT INTO work_orders \(id, title, customerId, priority, plannedStartDate, deadline\) VALUES \(\?, \?, \?, \?, NOW\(\), \?\)',\s*\[woId, title, customerId \|\| null, priority, deadline \|\| null\]\s*\);/;

const newCode = `const { title, customerId, priority, deadline, operations, bom } = req.body;
      const woId = 'WO-' + Date.now().toString().slice(-5);
      
      await db.query(
        'INSERT INTO work_orders (id, title, customerId, priority, plannedStartDate, deadline, bom) VALUES (?, ?, ?, ?, NOW(), ?, ?)',
        [woId, title, customerId || null, priority, deadline || null, bom ? JSON.stringify(bom) : null]
      );`;

content = content.replace(regex, newCode);

fs.writeFileSync('api/src/server.ts', content, 'utf8');