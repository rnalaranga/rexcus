const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');
content = content.replace(/else setProcState\(initProcState\(\)\)/g, '');
fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');