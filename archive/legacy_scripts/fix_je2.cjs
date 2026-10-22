const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

// Phase 2 Invoices
code = code.replace(
  "id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Generated', status: 'posted'",
  "id: jeId, date: data.date || new Date().toISOString().slice(0, 10), reference: data.id, description: 'Auto GL: Invoice Generated', totalAmount: Number(data.total) || 0"
);

// Phase 3 Payments
code = code.replace(
  "id: jeId, date: payment.date || new Date().toISOString().slice(0, 10), reference: newPayment.id, description: 'Auto GL: Payment Received for ' + id, status: 'posted'",
  "id: jeId, date: payment.date || new Date().toISOString().slice(0, 10), reference: newPayment.id, description: 'Auto GL: Payment Received for ' + id, totalAmount: Number(payment.amount) || 0"
);

// Phase 1 WO Completion
code = code.replace(
  "id: jeId, date: new Date().toISOString().slice(0, 10), reference: woId, description: 'Auto GL: WO Completion COGS', status: 'posted'",
  "id: jeId, date: new Date().toISOString().slice(0, 10), reference: woId, description: 'Auto GL: WO Completion COGS', totalAmount: totalMaterialCost"
);

fs.writeFileSync('api/src/server.ts', code, 'utf8');
console.log('Fixed journal_entries missing totalAmount error');