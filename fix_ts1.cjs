const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// The error says attachments does not exist in type 'SetStateAction<...>'
// Let's add it to the initial state with a proper type if needed, or just add it to the initial object.
const stateMatch = "title: '', customerId: '', priority: 'Normal', deadline: '',\n      notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: ''";
if (content.includes(stateMatch)) {
    content = content.replace(stateMatch, "title: '', customerId: '', priority: 'Normal', deadline: '',\n      notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: '', attachments: [] as any[]");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('WorkOrders fixed');