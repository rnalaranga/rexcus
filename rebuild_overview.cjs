const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const oldRegex = /\{\/\* OVERVIEW TAB \*\/\}\s*\{trackTab === 'overview' && \([\s\S]*?\{\/\* STORES TAB \*\/\}/;

const newOverview = `{/* OVERVIEW TAB */}
                {trackTab === 'overview' && (() => {
                  const activeOps = trackOps.filter((o:any) => o.status === 'In Progress' || o.status === 'QC Pending' || o.status === 'Rework Required');
                  const nextOp = trackOps.find((o:any) => o.status === 'Pending');
                  const daysLeft = trackWO.deadline ? Math.ceil((new Date(trackWO.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;

                  return (
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN - Progress & Workflow */}
                        <div className="lg:col-span-2 space-y-6">
                          
                          {/* Progress Section */}
                          <div className="bg-surface border border-theme-subtle rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                              <TrendingUp size={100} />
                            </div>
                            <div className="relative z-10">
                              <div className="flex justify-between items-end mb-3">
                                <div>
                                  <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Production Progress</h4>
                                  <p className="text-2xl font-black text-primary font-mono">{trackPct}% <span className="text-xs text-muted font-sans font-medium">Completed</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-primary">{trackDone} of {trackOps.length} steps done</p>
                                  <p className="text-[10px] text-muted">Est. {trackTotalHrs.toFixed(1)}h total effort</p>
                                </div>
                              </div>
                              <div className="h-4 bg-surface2 rounded-full overflow-hidden border border-theme-subtle/50">
                                <div className={\`h-full rounded-full transition-all \${trackPct === 100 ? 'bg-green-500' : trackPct > 50 ? 'bg-blue-500' : 'bg-rex-500'}\`} style={{ width: trackPct + '%' }}/>
                              </div>
                            </div>
                          </div>

                          {/* Current Status Callout */}
                          {activeOps.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/> Currently Active Operations
                              </h4>
                              {activeOps.map((op:any, i:number) => {
                                const m = machineries.find((mc:any) => mc.id === op.machineId);
                                const e = employees.find((em:any) => em.id === op.employeeId);
                                return (
                                  <div key={i} className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                      <span className="text-[9px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">Step {op.stepNumber || i+1}</span>
                                      <p className="text-sm font-bold text-primary">{op.operationName}</p>
                                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-secondary">
                                        <span className="flex items-center gap-1"><UserCheck size={12}/> {op.employeeName || e?.name || 'Unassigned Operator'}</span>
                                        <span className="flex items-center gap-1"><Settings size={12}/> {m?.name || 'Any Machine'}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => setTrackTab('operations')} className="shrink-0 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-sm">Manage Operation</button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : nextOp ? (
                            <div className="bg-surface2/50 border border-theme-subtle rounded-xl p-5 flex items-center justify-between border-dashed">
                              <div>
                                <p className="text-xs font-bold text-primary mb-1">Ready for next step: <span className="text-rex-600">{nextOp.operationName}</span></p>
                                <p className="text-[10px] text-muted">No operations are currently in progress.</p>
                              </div>
                              <button onClick={() => setTrackTab('operations')} className="px-3 py-1.5 bg-surface border border-theme-subtle hover:bg-surface2 text-xs font-bold text-primary rounded-lg transition-colors">Start Step</button>
                            </div>
                          ) : trackPct === 100 ? (
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                                  <CheckCircle size={20}/>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-green-700">All Operations Completed</p>
                                  <p className="text-xs text-green-600/70">This work order is ready for final delivery or invoicing.</p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* Timeline View */}
                          <div>
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Production Timeline</h4>
                            <div className="relative pl-3 space-y-0">
                              <div className="absolute top-2 bottom-4 left-[15px] w-0.5 bg-surface2"/>
                              {trackOps.map((op:any, i:number) => {
                                const isDone = op.status === 'Completed';
                                const isActive = op.status === 'In Progress' || op.status === 'QC Pending' || op.status === 'Rework Required';
                                const colorClass = isDone ? 'bg-green-500' : isActive ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-surface2 border-2 border-theme-subtle';
                                
                                return (
                                  <div key={i} className="relative flex gap-4 pb-5 group">
                                    <div className={\`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 z-10 \${colorClass}\`}/>
                                    <div className="flex-1 min-w-0 bg-surface border border-theme-subtle rounded-lg p-3 group-hover:border-primary/30 transition-colors">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className={\`text-xs font-bold \${isDone ? 'text-secondary line-through opacity-70' : isActive ? 'text-blue-600' : 'text-primary'}\`}>{op.operationName}</p>
                                        <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded \${isDone ? 'bg-green-500/10 text-green-600' : isActive ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-muted font-mono">
                                        <span>Op {i+1}</span>
                                        <span>•</span>
                                        <span>{Number(op.plannedHours).toFixed(1)}h</span>
                                        {op.employeeName && <span>• {op.employeeName}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                        </div>

                        {/* RIGHT COLUMN - Meta & Options */}
                        <div className="space-y-4">
                          
                          {/* Quick Info Card */}
                          <GlassCard className="p-4 border-theme-subtle space-y-4">
                            <div>
                              <p className="text-[9px] text-muted uppercase font-bold tracking-wider mb-1">Work Order Deadline</p>
                              {trackWO.deadline ? (
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className={daysLeft && daysLeft < 3 ? 'text-red-500' : 'text-primary'}/>
                                  <span className="text-sm font-bold text-primary">{new Date(trackWO.deadline).toLocaleDateString()}</span>
                                  {daysLeft !== null && (
                                    <span className={\`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full \${daysLeft < 0 ? 'bg-red-500/10 text-red-600' : daysLeft <= 3 ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}\`}>
                                      {daysLeft < 0 ? \`Overdue by \${Math.abs(daysLeft)}d\` : \`\${daysLeft} days left\`}
                                    </span>
                                  )}
                                </div>
                              ) : <span className="text-xs text-muted">No deadline set</span>}
                            </div>
                            
                            <hr className="border-theme-subtle"/>
                            
                            <div>
                              <p className="text-[9px] text-muted uppercase font-bold tracking-wider mb-1">Customer / Lead</p>
                              <div className="flex items-center gap-2">
                                <UserCheck size={14} className="text-muted"/>
                                <span className="text-sm font-bold text-primary truncate">{trackWO.customerName || trackWO.customerId || 'Internal Job'}</span>
                              </div>
                            </div>
                            
                            <hr className="border-theme-subtle"/>

                            <div>
                              <p className="text-[9px] text-muted uppercase font-bold tracking-wider mb-2">Manager Options</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => alert('Change Priority dialog would open here')} className="px-2 py-1.5 text-[10px] font-bold bg-surface2 border border-theme-subtle hover:bg-surface2/80 rounded transition-colors text-primary flex items-center justify-center gap-1.5"><AlertCircle size={12}/> Priority</button>
                                <button onClick={() => alert('Change Deadline dialog would open here')} className="px-2 py-1.5 text-[10px] font-bold bg-surface2 border border-theme-subtle hover:bg-surface2/80 rounded transition-colors text-primary flex items-center justify-center gap-1.5"><Clock size={12}/> Deadline</button>
                                <button onClick={() => setTrackTab('operations')} className="px-2 py-1.5 text-[10px] font-bold bg-surface2 border border-theme-subtle hover:bg-surface2/80 rounded transition-colors text-primary flex items-center justify-center gap-1.5"><Settings size={12}/> Re-assign</button>
                                <button onClick={() => alert('Cancel Work Order dialog would open here')} className="px-2 py-1.5 text-[10px] font-bold bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 rounded transition-colors text-red-600 flex items-center justify-center gap-1.5"><Trash2 size={12}/> Cancel WO</button>
                              </div>
                            </div>
                          </GlassCard>

                          {/* Notes Section */}
                          <GlassCard className="p-4 border-theme-subtle flex flex-col">
                            <h4 className="text-[9px] text-muted uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5"><Layers size={12}/> Job Notes & Instructions</h4>
                            <div className="text-xs text-secondary bg-surface2/30 p-3 rounded-lg border border-theme-subtle whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {trackWO.notes || <span className="text-muted italic">No specific instructions provided.</span>}
                            </div>
                          </GlassCard>

                          {/* Dispatches Summary */}
                          {dispatchedHistory.length > 0 && (
                            <GlassCard className="p-4 border-theme-subtle">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-[9px] text-muted uppercase font-bold tracking-wider flex items-center gap-1.5"><Archive size={12}/> Inventory Pulled</h4>
                                <button onClick={() => setTrackTab('stores')} className="text-[9px] text-rex-500 font-bold hover:underline">View All</button>
                              </div>
                              <div className="space-y-1.5">
                                {dispatchedHistory.slice(0,3).map((h:any, i:number) => (
                                  <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-secondary truncate pr-2">{h.materialName}</span>
                                    <span className="font-mono font-bold text-primary shrink-0">{h.qty} {h.unit}</span>
                                  </div>
                                ))}
                                {dispatchedHistory.length > 3 && <div className="text-[10px] text-muted text-center pt-2">+{dispatchedHistory.length - 3} more items</div>}
                              </div>
                            </GlassCard>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* STORES TAB */}`;

if (content.match(oldRegex)) {
    content = content.replace(oldRegex, newOverview);
    console.log("SUCCESS: Replaced overview tab");
} else {
    console.log("FAILED: Regex did not match");
}
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');