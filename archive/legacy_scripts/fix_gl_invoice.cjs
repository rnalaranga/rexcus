const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const regex = /const jeId = 'JE-' \+ Date\.now\(\)\.toString\(\)\.slice\(-5\) \+ Math\.floor\(Math\.random\(\)\*100\);\s*await db\.query\('INSERT INTO journal_entries SET \?', \{ id: jeId, date: data\.date, reference: data\.id, \s*description: 'Auto GL: Invoice Generated', totalAmount: totalAmount \}\);\s*const totalAmount = Number\(data\.total\) \|\| 0;/g;

const replacer = `const jeId = 'JE-' + Date.now().toString().slice(-5) + Math.floor(Math.random()*100);
          const totalAmount = Number(data.total) || 0;
          await db.query('INSERT INTO journal_entries SET ?', { id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Generated', totalAmount });`;

code = code.replace(regex, replacer);
fs.writeFileSync('api/src/server.ts', code);
console.log('done');
