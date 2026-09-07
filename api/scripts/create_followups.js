const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '1234', database: 'rex_erp' });
  await db.query(`
    CREATE TABLE IF NOT EXISTS followups (
      id VARCHAR(50) PRIMARY KEY,
      relatedType VARCHAR(20) NOT NULL,
      relatedId VARCHAR(50) NOT NULL,
      relatedName VARCHAR(200),
      type VARCHAR(30) NOT NULL,
      subject VARCHAR(300) NOT NULL,
      notes TEXT,
      dueDate DATETIME NOT NULL,
      dueTime VARCHAR(10),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      assignedTo VARCHAR(100),
      outcome TEXT,
      completedAt DATETIME,
      createdAt DATETIME NOT NULL
    )
  `);
  console.log('followups table created');
  await db.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
