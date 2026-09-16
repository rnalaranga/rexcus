const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');

// Replace all <input type="number" with <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
// Also handle <input required type="number"
content = content.replace(
  /type="number"/g, 
  'type="number" min="0" onKeyDown={e => { if(e.key === \'-\' || e.key === \'e\') e.preventDefault() }}'
);

fs.writeFileSync('src/pages/inventory/Inventory.tsx', content, 'utf8');