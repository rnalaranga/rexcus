const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(/alert\('Material "' \+ bomItem\.material \+ '" not found in inventory stock\.'\);/g, "setErrorModal('Material \"' + bomItem.material + '\" not found in inventory stock.');");

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Removed alert in WorkOrders');