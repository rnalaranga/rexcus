const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');
content = content.replace('min="0" onKeyDown={e => { if(e.key === \'-\' || e.key === \'e\') e.preventDefault() }} min="0.01"', 'min="0" onKeyDown={e => { if(e.key === \'-\' || e.key === \'e\') e.preventDefault() }}');
fs.writeFileSync('src/pages/inventory/Inventory.tsx', content, 'utf8');