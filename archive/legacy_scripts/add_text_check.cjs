const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  /\{empOps\.map\(\(op:any, i:number\) => \{/g,
  `{empOps.length > 0 && <div className="absolute top-0 left-0 z-50 text-red-500 text-xs font-bold bg-white p-1">RENDER: {empOps.length} ops</div>}
                            {empOps.map((op:any, i:number) => {`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Added plain text render check');