USE rex_erp;

DROP TABLE IF EXISTS followups;
CREATE TABLE followups (
  id VARCHAR(50) PRIMARY KEY,
  relatedType VARCHAR(50),
  relatedId VARCHAR(50),
  relatedName VARCHAR(255),
  type VARCHAR(50),
  subject VARCHAR(255),
  notes TEXT,
  dueDate DATETIME,
  dueTime VARCHAR(20),
  priority VARCHAR(20),
  assignedTo VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  outcome VARCHAR(255),
  completedAt DATETIME,
  createdAt DATETIME
);

DROP TABLE IF EXISTS suppliers;
CREATE TABLE suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  contactPerson VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  taxId VARCHAR(100),
  balance DECIMAL(15, 2) DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME
);
