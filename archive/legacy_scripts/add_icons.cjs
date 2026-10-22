const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const iconsToAdd = ['Package', 'Wrench', 'ListChecks'];
const importLineRegex = /import\s+\{([^}]+)\}\s+from\s+'lucide-react'/;
const match = content.match(importLineRegex);

if (match) {
  let existingIcons = match[1].split(',').map(i => i.trim());
  let newIcons = [...existingIcons];
  
  iconsToAdd.forEach(icon => {
    if (!existingIcons.includes(icon)) {
      newIcons.push(icon);
    }
  });
  
  content = content.replace(importLineRegex, `import { ${newIcons.join(', ')} } from 'lucide-react'`);
  fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
  console.log('Icons added.');
}