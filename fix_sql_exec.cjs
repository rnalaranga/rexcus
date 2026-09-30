const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const sqlCode = `
    // Execute complete_db.sql to ensure all tables and columns are created
    const sqlScript = require('fs').readFileSync('../complete_db.sql', 'utf8');
    const statements = sqlScript.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await db.query(stmt);
      } catch (err) {
        // ignore errors like duplicate column
      }
    }
`;

code = code.replace(
  /const sqlScript = require\('fs'\)\.readFileSync\('\.\.\/complete_db\.sql', 'utf8'\);\s*await db\.query\(sqlScript\);/,
  sqlCode
);

fs.writeFileSync('api/src/server.ts', code);
console.log('done');
