const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace('const [newWO, setNewWO] = useState({', 'const [newWO, setNewWO] = useState<any>({');

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('WorkOrders typed as any');