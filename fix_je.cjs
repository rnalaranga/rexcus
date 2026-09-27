const fs = require('fs');
let code = fs.readFileSync('api/src/server.ts', 'utf8');

// Fix Phase 2 (Invoice Auto GL)
code = code.replace(
  /{[\s\n]*id: jeId, date: data\.date, reference: data\.id, description: 'Auto GL: Invoice Generated', status: 'posted'[\s\n]*}/g,
  "{ id: jeId, date: data.date, reference: data.id, description: 'Auto GL: Invoice Generated', totalAmount: totalAmount }"
);

// Fix Phase 3 (Payment Auto GL)
// The payment logic has pAmt calculated AFTER the journal_entries insert, so we need to inject it.
code = code.replace(
  /const pAmt = Number\(payment\.amount\);[\s\S]*?await db\.query\('INSERT INTO journal_entries SET \?', \{[\s\S]*?id: jeId, date: payment\.date \|\| new Date\(\)\.toISOString\(\)\.slice\(0, 10\), reference: newPayment\.id, description: 'Auto GL: Payment Received for ' \+ id, status: 'posted'[\s\S]*?\}\);/g,
  "// THIS REGEX IS WRONG, DO IT MANUALLY"
);

fs.writeFileSync('api/src/server.ts', code, 'utf8');