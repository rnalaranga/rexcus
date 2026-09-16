const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Replace all <input type="number" with <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
content = content.replace(
  /<input\s+type="number"/g, 
  '<input type="number" min="0" onKeyDown={e => { if(e.key === \'-\' || e.key === \'e\') e.preventDefault() }}'
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');