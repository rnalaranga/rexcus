import mysql.connector
import json

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="rex_erp"
)

cursor = db.cursor()

# Create table
cursor.execute('''
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
''')

db.commit()
cursor.close()
db.close()
print("Table created")
