const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'1234',database:'rex_erp'});
  let out = '';

  const tables = ['machining_operations', 'machine_categories', 'rework_logs', 'suppliers'];
  
  for (const t of tables) {
    const [create] = await c.query(`SHOW CREATE TABLE ${t}`);
    out += create[0]['Create Table'] + ';\n\n';
    
    const [rows] = await c.query(`SELECT * FROM ${t}`);
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      const inserts = rows.map(r => {
        const vals = keys.map(k => r[k] === null ? 'NULL' : c.escape(r[k]));
        return `(${vals.join(', ')})`;
      }).join(',\n  ');
      out += `INSERT INTO \`${t}\` (\`${keys.join('`, `')}\`) VALUES\n  ${inserts};\n\n`;
    }
  }

  // machineries (REPLACE INTO since table might exist)
  const [machRows] = await c.query('SELECT * FROM machineries');
  if (machRows.length > 0) {
    const keys = Object.keys(machRows[0]);
    const inserts = machRows.map(r => {
      const vals = keys.map(k => r[k] === null ? 'NULL' : c.escape(r[k]));
      return `(${vals.join(', ')})`;
    }).join(',\n  ');
    out += `REPLACE INTO \`machineries\` (\`${keys.join('`, `')}\`) VALUES\n  ${inserts};\n\n`;
  }

  fs.writeFileSync('missing_tables_data.sql', out, 'utf8');
  console.log('Generated missing_tables_data.sql');
  c.end();
}
run();