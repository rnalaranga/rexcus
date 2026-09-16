const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

content = content.replace(/alert\('Switched to Job Quotation\. Click Save Job to generate version\.'\);/g, "");
content = content.replace(/alert\('Switched to Customer Quotation\. Click Save Customer to generate version\.'\);/g, "");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');
console.log('Removed alerts');