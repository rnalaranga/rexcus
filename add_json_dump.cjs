const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  /\{\/\* debug banner \*\/\}\n\s*<div className="bg-red-500 text-white text-xs p-2">[\s\S]*?<\/div>/,
  `{/* debug banner */}
                <div className="bg-red-500 text-white text-xs p-2 overflow-auto max-h-40">
                  <pre>
                    Assigned: {JSON.stringify(assigned.map(o => ({ id: o.id, eId: o.employeeId, s: o.scheduledStart })), null, 2)}
                  </pre>
                </div>`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Updated debug banner to dump assigned JSON');