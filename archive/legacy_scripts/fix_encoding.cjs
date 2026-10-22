const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Replace weird broken bullet with pipe
content = content.replace(/\?/g, '|');

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');