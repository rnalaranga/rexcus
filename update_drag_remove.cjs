const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Make timeline blocks draggable
content = content.replace(
  /<div key=\{i\} className=\{\`absolute top-2 bottom-2 rounded-lg border shadow-sm p-1\.5 overflow-hidden transition-all hover:z-30 hover:scale-105 hover:shadow-md cursor-pointer \$\{isUrgent \? 'bg-red-500\/10 border-red-500\/30' : 'bg-surface border-theme-subtle hover:border-blue-500\/50'\}\`\} style=\{\{ left: l, width: w \}\}>/g,
  `<div key={i} draggable onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }} className={\`absolute top-2 bottom-2 rounded-lg border shadow-sm p-1.5 overflow-hidden transition-all hover:z-30 hover:scale-105 hover:shadow-md cursor-grab active:cursor-grabbing \${isUrgent ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-theme-subtle hover:border-blue-500/50'}\`} style={{ left: l, width: w }}>`
);

// 2. Make Unassigned Queue a drop zone
content = content.replace(
  /<div className="p-3 overflow-y-auto flex-1 space-y-3 bg-surface\/30">/,
  `<div className="p-3 overflow-y-auto flex-1 space-y-3 bg-surface/30" onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-rex-500/5'); }} onDragLeave={(e) => e.currentTarget.classList.remove('bg-rex-500/5')} onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-rex-500/5'); const opId = e.dataTransfer.getData('opId'); if (opId) handleAssignOperation(opId, 'employeeId', '', ''); }}>`
);

// 3. Ensure handleAssignOperation properly clears scheduledStart if passed empty string
content = content.replace(
  /if \(scheduledStart\) \{[\s\S]*?payload\.scheduledEnd = d\.toISOString\(\);\n\s*\}/,
  `if (scheduledStart !== undefined) {
      if (scheduledStart === '') {
        payload.scheduledStart = null;
        payload.scheduledEnd = null;
      } else {
        payload.scheduledStart = scheduledStart;
        const d = new Date(scheduledStart);
        d.setMinutes(d.getMinutes() + (Number(op.plannedHours) * 60));
        payload.scheduledEnd = d.toISOString();
      }
    }`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Update Complete');