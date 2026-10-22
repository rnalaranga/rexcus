const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

content = content.replace(
  "await db.query('SELECT * FROM inventory ORDER BY date DESC');",
  "await db.query('SELECT * FROM inventory ORDER BY createdAt DESC');"
);

fs.writeFileSync('api/src/server.ts', content, 'utf8');