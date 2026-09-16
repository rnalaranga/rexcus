const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

content = content.replace(/onClick=\{autoGenerateCustomerQuote\}\s+className="text-purple-600/g, 'onClick={handleOpenMarginModal} className="text-purple-600');

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');