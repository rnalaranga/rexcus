const mysql = require('./api/node_modules/mysql2/promise');

async function checkDatabases() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234'
  });

  const [dbs] = await conn.query("SHOW DATABASES");
  console.log("Databases:", dbs.map(d => d.Database));

  for (const dbObj of dbs) {
    const db = dbObj.Database;
    if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db)) continue;
    try {
      const [t] = await conn.query(`SELECT COUNT(*) as c FROM \`${db}\`.supplier_bills`);
      console.log(`DB ${db} has ${t[0].c} supplier_bills`);
      const [co] = await conn.query(`SELECT COUNT(*) as c FROM \`${db}\`.chart_of_accounts`);
      console.log(`DB ${db} has ${co[0].c} chart_of_accounts`);
    } catch (e) {
      console.log(`DB ${db}:`, e.message);
    }
  }

  await conn.end();
}

checkDatabases().catch(console.error);
