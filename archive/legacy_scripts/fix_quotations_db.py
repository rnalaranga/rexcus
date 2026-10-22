with open('api/src/server.ts', 'r') as f:
    code = f.read()

patch = "'ALTER TABLE quotations ADD COLUMN docNo VARCHAR(255) DEFAULT NULL',\n    'ALTER TABLE quotations ADD COLUMN issueNo VARCHAR(255) DEFAULT NULL',\n    'ALTER TABLE quotations ADD COLUMN issueDate VARCHAR(255) DEFAULT NULL'"
code = code.replace("'ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL'", "'ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL',\n    " + patch)

# For POST /api/quotations
# It expects { id, customerId, leadId, type, data: snapshot, totalAmount, customAmount, selectedProfileId, taxEnabled, docNo, issueNo, issueDate }
# Let's check how POST /api/quotations saves.
