const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');
content = content.replace(/formatCurrency\(val, true\)/g, 'formatCurrency(val)');
fs.writeFileSync('src/pages/inventory/Inventory.tsx', content, 'utf8');