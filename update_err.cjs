const fs = require('fs');
let content = fs.readFileSync('api/src/server.ts', 'utf8');

content = content.replace(
  /res\.status\(500\)\.json\(\{ error: 'Internal Server Error' \}\);/g,
  "res.status(500).json({ error: error.message || 'Internal Server Error', details: error.sqlMessage });"
);

fs.writeFileSync('api/src/server.ts', content, 'utf8');
console.log('Updated server.ts error handling');