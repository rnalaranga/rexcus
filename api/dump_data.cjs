const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'1234',database:'rex_erp'});
  const [rows] = await c.query('SELECT * FROM machining_operations');
  const inserts = rows.map(r => `(${r.id}, ${c.escape(r.groupName)}, ${c.escape(r.name)}, ${r.hrRate}, ${r.setTimeRate}, ${r.machineId ? c.escape(r.machineId) : 'NULL'})`).join(',\n  ');
  console.log(`INSERT INTO \`machining_operations\` (\`id\`, \`groupName\`, \`name\`, \`hrRate\`, \`setTimeRate\`, \`machineId\`) VALUES\n  ${inserts};`);
  c.end();
}
run();