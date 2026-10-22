const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  /\{\/\* header \*\/\}\n\s*<div className="flex items-center justify-between px-4 py-3/,
  `{/* debug banner */}
                <div className="bg-red-500 text-white text-xs p-2">
                  Debug: Assigned Ops: {assigned.length} | First Assignee: {assigned[0]?.employeeId} | Match: {employees.some(e => e.id === assigned[0]?.employeeId) ? 'YES' : 'NO'} | LeftPx: {assigned[0]?.scheduledStart ? ((new Date(assigned[0].scheduledStart).getHours() - START_HOUR) * PPH) : 'Unscheduled'}
                </div>
                {/* header */}
                <div className="flex items-center justify-between px-4 py-3`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Added debug banner');