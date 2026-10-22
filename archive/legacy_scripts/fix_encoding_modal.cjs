const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');
content = content.replace(/\? AI Quote Generation/g, '✨ AI Quote Generation');
fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');