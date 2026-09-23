const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost',user:'root',password:'1234',database:'rex_erp'}).then(async c => {
  await c.query("UPDATE work_order_operations SET employeeId='EMP-001', scheduledStart='2026-09-17 10:00:00' WHERE id='OP-7177-0'");
  console.log('Done');
  c.end();
});