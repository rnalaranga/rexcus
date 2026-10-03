const mysql = require('mysql2/promise');
async function run() {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'rex_erp' });
    await conn.query(
        CREATE TABLE IF NOT EXISTS customer_grns (
            id VARCHAR(50) PRIMARY KEY,
            quoteId VARCHAR(50),
            quoNo VARCHAR(50),
            customerName VARCHAR(150),
            items TEXT,
            receivedAt DATETIME,
            receivedBy VARCHAR(100),
            notes TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    );
    console.log("Table created");
    process.exit(0);
}
run();
