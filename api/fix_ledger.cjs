const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
  "ORDER BY date DESC, createdAt DESC",
  "ORDER BY date DESC"
);

fs.writeFileSync('src/server.ts', content, 'utf8');