const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

content = content.replace('<th className="px-3 py-2.5 w-28">Hr Rate</th>', '<th className="px-3 py-2.5 w-32">Hr Rate</th>');

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');