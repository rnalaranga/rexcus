const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

const sqlCode = `
    // Execute complete_db.sql to ensure all tables and columns are created
    const sqlScript = require('fs').readFileSync('../complete_db.sql', 'utf8');
    await db.query(sqlScript);
`;

code = code.replace(/await db\.query\('SET FOREIGN_KEY_CHECKS = 0'\);/, sqlCode + '\n    await db.query(\'SET FOREIGN_KEY_CHECKS = 0\');');

fs.writeFileSync('api/src/server.ts', code);
console.log('done');
