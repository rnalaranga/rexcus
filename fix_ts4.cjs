const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace('const [newWO, setNewWO] = useState<any>({', 'const [newWO, setNewWO] = useState<{ title: string; customerId: string; priority: string; deadline: string; notes: string; sourceQuoteId: string; jobQty: number; docNo: string; subject: string; attachments: any[] }>({');

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('WorkOrders typed properly');