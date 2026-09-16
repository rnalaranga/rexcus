const fs = require('fs');
let text = fs.readFileSync('api/src/server.ts', 'utf8');

// Fix catching errors typed as unknown
text = text.replace(/catch \((e|error|err)\) \{/g, 'catch ($1: any) {');

// We have many TS errors in server.ts related to db.query returning QueryResult instead of array.
// Instead of complex regex, let's just globally replace db.query( with db.query<any>(
// Wait, mysql2/promise .query allows .query<RowDataPacket[]> etc.
text = text.replace(/db\.query\(/g, 'db.query<any>(');

fs.writeFileSync('api/src/server.ts', text);