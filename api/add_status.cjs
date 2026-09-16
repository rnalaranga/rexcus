const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'1234',database:'rex_erp'});
  try {
    await c.query('ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT "Draft"');
    console.log("Status column added");
  } catch (e) {
    if(e.code === 'ER_DUP_FIELDNAME') console.log("Already exists");
    else console.error(e);
  }
  c.end();
}
run();