const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');
const initRegex = /function initProcState\(\) \{[\s\S]*?return init\n  \}/;
content = content.replace(initRegex, "");
fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');