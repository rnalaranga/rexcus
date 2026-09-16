const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

const regex = /const density = 0\.00000785[\s\S]*?let price = qty \* up[\s\S]*?if \(isRod.*?\) \{[\s\S]*?\} else if \(\!isRod.*?\) \{[\s\S]*?\}/;
content = content.replace(regex, "let price = qty * up;");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');