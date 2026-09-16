const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'1234',database:'rex_erp'});
  await c.query('DROP TABLE IF EXISTS work_order_operations');
  await c.query(`CREATE TABLE work_order_operations (
    id VARCHAR(50) PRIMARY KEY,
    workOrderId VARCHAR(50),
    stepNumber INT,
    operationName VARCHAR(100),
    machineId VARCHAR(50),
    employeeId VARCHAR(50),
    plannedHours DECIMAL(10,2) DEFAULT 0,
    actualHours DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    startTime DATETIME,
    endTime DATETIME,
    notes TEXT
  )`);
  console.log('work_order_operations re-created successfully');
  c.end();
}
run();