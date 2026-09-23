const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// The file now probably has:
// style={{ left: leftPx, width: w, backgroundColor: ... }}
// style={{ left: leftPx, width: w }}
// I will use regex to fix it
content = content.replace(
  /style=\{\{ left: leftPx, width: w, backgroundColor:.*?\}\}\n\s*style=\{\{ left: leftPx, width: w \}\}/g,
  `style={{ left: leftPx, width: w, backgroundColor: op.woPriority==='Urgent'?'#fee2e2':op.woPriority==='High'?'#ffedd5':'#dbeafe', borderColor: op.woPriority==='Urgent'?'#ef4444':op.woPriority==='High'?'#f97316':'#3b82f6', zIndex: 40 }}`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Fixed duplicate style props');