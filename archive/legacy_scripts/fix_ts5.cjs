const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace("notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: ''\n    })", "notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: '', attachments: []\n    })");

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('WorkOrders initial state fixed');