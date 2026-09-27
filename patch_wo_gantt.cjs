const fs = require('fs');
let code = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Replace empOps.map rendering
const empOpsRegex = /\{empOps\.map\(\(op:any\) => \{[\s\S]*?className="flex items-center gap-1">/g;

const empOpsReplacement = `{empOps.map((op:any) => {
                              const hrs = Number(op.plannedHours);
                              const w = Math.max(hrs * PPH - 6, 24);
                              const prio = op.woPriority || 'Normal';
                              const isEmerg = prio === 'Emergency' || prio === 'Urgent';
                              const ps = prioStyle[prio] || prioStyle.Normal;
                              
                              let hasConflict = false;
                              if (op.scheduledStart) {
                                const s1 = new Date(op.scheduledStart).getTime();
                                const e1 = s1 + hrs * 3600000;
                                hasConflict = empOps.some((other:any) => {
                                  if (other.id === op.id || !other.scheduledStart) return false;
                                  const s2 = new Date(other.scheduledStart).getTime();
                                  const e2 = s2 + Number(other.plannedHours)*3600000;
                                  return (s1 < e2 && e1 > s2);
                                });
                              }

                              let leftPx = 8;
                              if (op.scheduledStart) {
                                const sd = new Date(op.scheduledStart);
                                leftPx = (sd.getHours() - START_HOUR + sd.getMinutes() / 60) * PPH + 3;
                              }
                              
                              const bgStyle = hasConflict ? 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 5px, #fee2e2 5px, #fee2e2 10px)' : isEmerg ? 'repeating-linear-gradient(45deg, #fffbeb, #fffbeb 5px, #fef3c7 5px, #fef3c7 10px)' : ps.bg;
                              const borderCol = hasConflict ? '#ef4444' : isEmerg ? '#f59e0b' : ps.border;

                              return (
                                <div
                                  key={op.id}
                                  draggable={!op.isLocked}
                                  onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }}
                                  onDoubleClick={() => setInspectorOp(op)}
                                  title={op.operationName + ' - ' + op.woTitle + ' - ' + hrs + 'h' + (hasConflict ? ' (CONFLICT!)' : '')}
                                  className={\`absolute top-2.5 bottom-2.5 rounded-xl overflow-hidden select-none transition-all hover:z-40 hover:shadow-lg hover:-translate-y-px \${op.isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-grab active:cursor-grabbing'} \${hasConflict ? 'ring-2 ring-red-500 animate-pulse' : ''} \${isEmerg ? 'ring-2 ring-amber-500' : ''}\`}
                                  style={{ left: leftPx, width: w, background: bgStyle, border: '1.5px solid ' + borderCol }}
                                >
                                  <div className="flex flex-col h-full px-2 py-1.5 justify-between">
                                    <div className="flex items-center gap-1 justify-between">
                                      <div className="flex items-center gap-1">`;

code = code.replace(empOpsRegex, empOpsReplacement);

// 2. Inject Padlock icon into the operations header
const opTitleRegex = /<span className="text-\[10px\] font-bold text-primary truncate">\{op\.operationName\}<\/span>/g;
const opTitleReplacement = `<span className="text-[10px] font-bold text-primary truncate flex items-center gap-1">
                                          {op.isLocked && <div className="text-red-500" title="Locked"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>}
                                          {op.operationName}
                                        </span>`;
code = code.replace(opTitleRegex, opTitleReplacement);

// 3. Replace onDrop for auto-bump
const onDropRegex = /onDrop=\{\(e\) => \{[\s\S]*?const d = new Date\(\);\s*d\.setHours\(dropHour, dropMin, 0, 0\);\s*handleAssignOperation\(opId, 'employeeId', emp\.id, d\.toISOString\(\)\);\s*\}\}/g;

const onDropReplacement = `onDrop={(e) => {
                            e.preventDefault();
                            (e.currentTarget as HTMLDivElement).style.background = '';
                            const opId = e.dataTransfer.getData('opId');
                            if (!opId) return;
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const dropX = e.clientX - rect.left - 220;
                            let dropHour = Math.floor(dropX / PPH) + START_HOUR;
                            const dropMin = Math.round(((dropX % PPH) / PPH) * 2) * 30;
                            if (dropHour < START_HOUR) dropHour = START_HOUR;
                            if (dropHour >= END_HOUR) dropHour = END_HOUR - 1;
                            const d = new Date();
                            d.setHours(dropHour, dropMin, 0, 0);
                            
                            const draggedOp = allActiveOps.find((o:any) => o.id === opId);
                            if (draggedOp && (draggedOp.woPriority === 'Emergency' || draggedOp.woPriority === 'Urgent')) {
                              const pHrs = Number(draggedOp.plannedHours) || 1;
                              const dEnd = new Date(d.getTime() + pHrs * 3600000);
                              
                              const overlappingOps = empOps.filter((o:any) => {
                                if (o.id === opId || !o.scheduledStart || o.isLocked) return false;
                                const oS = new Date(o.scheduledStart).getTime();
                                const oE = oS + (Number(o.plannedHours)||1)*3600000;
                                return (d.getTime() < oE && dEnd.getTime() > oS);
                              });
                              
                              overlappingOps.forEach(ov => {
                                const ovS = new Date(dEnd.getTime());
                                handleAssignOperation(ov.id, 'employeeId', emp.id, ovS.toISOString());
                              });
                            }

                            handleAssignOperation(opId, 'employeeId', emp.id, d.toISOString());
                          }}`;

code = code.replace(onDropRegex, onDropReplacement);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', code, 'utf8');
console.log('Gantt planner patched with advanced features');
