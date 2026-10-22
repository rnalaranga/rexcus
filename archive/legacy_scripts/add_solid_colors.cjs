const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  /className=\{`absolute top-2 bottom-2 rounded-lg border cursor-grab active:cursor-grabbing px-2 py-1 overflow-hidden transition-all hover:z-30 hover:shadow-lg hover:-translate-y-0.5 select-none \$\{blockCls\}`\}/g,
  `className={\`absolute top-2 bottom-2 rounded-lg border-2 cursor-grab active:cursor-grabbing px-2 py-1 overflow-hidden transition-all hover:z-30 hover:shadow-lg hover:-translate-y-0.5 select-none \${blockCls}\`}
                                  style={{ left: leftPx, width: w, backgroundColor: op.woPriority==='Urgent'?'#fee2e2':op.woPriority==='High'?'#ffedd5':'#dbeafe', borderColor: op.woPriority==='Urgent'?'#ef4444':op.woPriority==='High'?'#f97316':'#3b82f6', zIndex: 40 }}`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Forced solid background colors');