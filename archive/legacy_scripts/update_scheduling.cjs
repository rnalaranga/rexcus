const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Update handleAssignOperation
content = content.replace(
  /const handleAssignOperation = async \(opId: string, field: 'employeeId'\|'machineId', val: string\) => \{[\s\S]*?fetchData\(\); \/\/ Refresh Gantt chart\n\s*if \(trackWO\) refreshTrackWO\(\);\n\s*\}/,
  `const handleAssignOperation = async (opId: string, field: 'employeeId'|'machineId', val: string, scheduledStart?: string) => {
    let op = trackWO?.operations?.find((o:any) => o.id === opId);
    if (!op) {
      for (const wo of workOrders) {
        if (wo.operations) {
          const found = wo.operations.find((o:any) => o.id === opId);
          if (found) { op = found; break; }
        }
      }
    }
    if (!op) return;

    const payload: any = {
      employeeId: field === 'employeeId' ? val : op.employeeId,
      machineId: field === 'machineId' ? val : op.machineId
    };

    if (scheduledStart) {
      payload.scheduledStart = scheduledStart;
      const d = new Date(scheduledStart);
      d.setMinutes(d.getMinutes() + (Number(op.plannedHours) * 60));
      payload.scheduledEnd = d.toISOString();
    }

    await fetch(API + '/production/operations/' + opId + '/assign', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    
    fetchData(); // Refresh Gantt chart
    if (trackWO) refreshTrackWO();
  }`
);

// 2. Update Gantt drop handler
content = content.replace(
  /onDrop=\{\(e\) => \{[\s\S]*?if \(opId\) handleAssignOperation\(opId, 'employeeId', emp.id\);\n\s*\}\}/,
  `onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('bg-blue-500/10');
                              const opId = e.dataTransfer.getData('opId');
                              
                              const rect = e.currentTarget.getBoundingClientRect();
                              const dropX = e.clientX - rect.left - 200; // 200 is employee info width
                              let droppedHour = Math.floor(dropX / PIXELS_PER_HOUR) + START_HOUR;
                              if (droppedHour < START_HOUR) droppedHour = START_HOUR;
                              
                              const d = new Date();
                              d.setHours(droppedHour, 0, 0, 0);
                              
                              if (opId) handleAssignOperation(opId, 'employeeId', emp.id, d.toISOString());
                            }}`
);

// 3. Update Gantt block positioning
content = content.replace(
  /const w = Number\(op\.plannedHours\) \* PIXELS_PER_HOUR;\n\s*const l = currentLeft;\n\s*currentLeft \+= w \+ 8;/,
  `const w = Number(op.plannedHours) * PIXELS_PER_HOUR;
                                let l = currentLeft;
                                if (op.scheduledStart) {
                                  const sd = new Date(op.scheduledStart);
                                  l = (sd.getHours() - START_HOUR + sd.getMinutes() / 60) * PIXELS_PER_HOUR;
                                  currentLeft = Math.max(currentLeft, l + w + 8);
                                } else {
                                  currentLeft += w + 8;
                                }`
);

// 4. Ensure we select scheduledStart and scheduledEnd in allActiveOps
content = content.replace(
  /woNotes: wo\.notes,/,
  `woNotes: wo.notes,\n                    scheduledStart: o.scheduledStart,\n                    scheduledEnd: o.scheduledEnd,`
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Update Complete');