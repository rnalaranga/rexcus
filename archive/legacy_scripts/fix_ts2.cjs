const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Fix the TS18047 error for ev.target
content = content.replace(/dataUrl: ev\.target\.result/g, "dataUrl: ev.target?.result as string");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');
console.log('QuotationBuilder fixed');