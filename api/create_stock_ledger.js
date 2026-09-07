
const mysql = require('mysql2/promise');
async function main() {
  const connection = await mysql.createConnection({ host: 'localhost', user: 'root', password: '1234', database: 'rex_erp' });
  await connection.execute('CREATE TABLE IF NOT EXISTS stock_ledger (id INT AUTO_INCREMENT PRIMARY KEY, inventoryId INT NOT NULL, date DATETIME NOT NULL, type VARCHAR(50) NOT NULL, qty DECIMAL(10,2) NOT NULL, balance DECIMAL(10,2) NOT NULL, reference VARCHAR(255), notes TEXT, createdAt DATETIME NOT NULL)');
  console.log('stock_ledger table created');
  process.exit(0);
}
main();
