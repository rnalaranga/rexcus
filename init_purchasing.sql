CREATE TABLE IF NOT EXISTS material_requests (
  id VARCHAR(50) PRIMARY KEY,
  date DATETIME,
  requiredDate DATETIME,
  requestedBy VARCHAR(100),
  department VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  items JSON,
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY,
  supplierId VARCHAR(50),
  date DATETIME,
  expectedDate DATETIME,
  status VARCHAR(20) DEFAULT 'draft',
  items JSON,
  subtotal DECIMAL(15,2),
  tax DECIMAL(15,2),
  totalAmount DECIMAL(15,2),
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME,
  createdBy VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS grns (
  id VARCHAR(50) PRIMARY KEY,
  poId VARCHAR(50),
  supplierId VARCHAR(50),
  date DATETIME,
  receivedBy VARCHAR(100),
  items JSON,
  status VARCHAR(20) DEFAULT 'received',
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS supplier_bills (
  id VARCHAR(50) PRIMARY KEY,
  supplierId VARCHAR(50),
  poId VARCHAR(50),
  grnId VARCHAR(50),
  invoiceNo VARCHAR(100),
  date DATETIME,
  dueDate DATETIME,
  amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'unpaid',
  notes TEXT,
  createdAt DATETIME,
  updatedAt DATETIME
);
