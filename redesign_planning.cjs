const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const newSection = `      {viewMode === 'planning' && (() => {
        const TODAY = new Date().toDateString();
        const allActiveOps = workOrders.flatMap((wo:any) =>
          wo.status !== 'Completed' && wo.operations
            ? wo.operations
                .filter((o:any) => Number(o.plannedHours) > 0 && o.status !== 'Completed')
                .map((o:any) => ({
                  ...o,
                  woTitle: wo.title,
                  woId: wo.id,
                  woPriority: wo.priority,
                  woDeadline: wo.deadline,
                  woNotes: wo.notes,
                  scheduledStart: o.scheduledStart,
                  scheduledEnd: o.scheduledEnd,
                }))
            : []
        );
        const unassigned = allActiveOps.filter((o:any) => !o.employeeId);
        const assigned   = allActiveOps.filter((o:any) => !!o.employeeId);

        const START_HOUR = 6;
        const END_HOUR   = 24;
        const HOURS      = END_HOUR - START_HOUR;
        const PPH        = 72; // pixels per hour
        const ROW_H      = 64; // px

        const priorityColors: Record<string, string> = {
          Urgent: 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400',
          High:   'bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-400',
          Normal: 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-400',
        };
        const priorityDot: Record<string, string> = {
          Urgent: 'bg-red-500', High: 'bg-orange-500', Normal: 'bg-blue-500',
        };

        return (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">

            {/* ── STATS BAR ── */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Employees', value: employees.length, icon: <Users size={16}/>, color: 'text-blue-500' },
                { label: 'Unscheduled', value: unassigned.length, icon: <AlertTriangle size={16}/>, color: unassigned.length > 0 ? 'text-amber-500' : 'text-green-500' },
                { label: 'Scheduled', value: assigned.length, icon: <CheckCircle size={16}/>, color: 'text-green-500' },
                { label: 'Total Hours', value: allActiveOps.reduce((a:number,o:any) => a + Number(o.plannedHours), 0).toFixed(1) + 'h', icon: <Clock size={16}/>, color: 'text-rex-500' },
              ].map((kpi, i) => (
                <GlassCard key={i} className="flex items-center gap-3 p-3">
                  <div className={\`w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center \${kpi.color}\`}>{kpi.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-xl font-black text-primary leading-none">{kpi.value}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* ── MAIN BOARD ── */}
            <div className="flex gap-4 items-start">

              {/* ════ GANTT CHART ════ */}
              <GlassCard className="flex-1 min-w-0 p-0 overflow-hidden border border-theme-subtle flex flex-col" style={{ minHeight: 400 }}>

                {/* header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle bg-surface2/20 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rex-500/10 flex items-center justify-center text-rex-500"><Layers size={14}/></div>
                    <span className="text-sm font-bold text-primary">Daily Schedule — {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-muted">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/70 border border-blue-500 inline-block"/>Normal</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70 border border-orange-500 inline-block"/>High</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/70 border border-red-500 inline-block"/>Urgent</span>
                  </div>
                </div>

                {/* scrollable grid */}
                <div className="overflow-auto flex-1">
                  <div style={{ minWidth: HOURS * PPH + 200 + 'px' }}>

                    {/* Time ruler */}
                    <div className="flex border-b-2 border-theme-subtle sticky top-0 z-30 bg-surface">
                      <div className="w-[200px] shrink-0 border-r border-theme-subtle bg-surface2/40 flex items-end px-3 pb-2">
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Operator</span>
                      </div>
                      <div className="flex-1 flex relative" style={{ height: 32 }}>
                        {Array.from({length: HOURS}).map((_,i) => {
                          const h = START_HOUR + i;
                          const isEven = i % 2 === 0;
                          return (
                            <div key={i} className="absolute flex flex-col items-start border-l border-theme-subtle/60 pt-1 pl-1" style={{ left: i * PPH, width: PPH, height: 32, background: isEven ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                              <span className="text-[9px] font-mono font-bold text-muted">{h.toString().padStart(2,'0')}:00</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Employee rows */}
                    {employees.length === 0 && (
                      <div className="py-20 text-center text-sm text-muted">No employees found. Add employees in HR module.</div>
                    )}
                    {employees.map((emp:any) => {
                      const empOps = allActiveOps.filter((o:any) => o.employeeId === emp.id);
                      const totalHr = empOps.reduce((a:number,o:any) => a + Number(o.plannedHours), 0);
                      const isOverloaded = totalHr > 12;
                      const isOptimal    = totalHr > 8 && totalHr <= 12;
                      const loadCls = isOverloaded ? 'text-red-500 bg-red-500/10 border-red-500/20'
                                    : isOptimal    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                                   : 'text-green-600 bg-green-500/10 border-green-500/20';

                      return (
                        <div
                          key={emp.id}
                          className="flex border-b border-theme-subtle/40 group relative"
                          style={{ height: ROW_H }}
                          onDragEnter={(e) => e.preventDefault()}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.06)'; }}
                          onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                          onDrop={(e) => {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).style.background = '';
                            const opId = e.dataTransfer.getData('opId');
                            if (!opId) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const dropX = e.clientX - rect.left - 200;
                            let dropHour = Math.floor(dropX / PPH) + START_HOUR;
                            const dropMin = Math.round(((dropX % PPH) / PPH) * 2) * 30;
                            if (dropHour < START_HOUR) dropHour = START_HOUR;
                            if (dropHour >= END_HOUR) dropHour = END_HOUR - 1;
                            const d = new Date();
                            d.setHours(dropHour, dropMin, 0, 0);
                            handleAssignOperation(opId, 'employeeId', emp.id, d.toISOString());
                          }}
                        >
                          {/* Employee label */}
                          <div className="w-[200px] shrink-0 border-r border-theme-subtle px-3 flex flex-col justify-center gap-0.5 sticky left-0 z-20 bg-surface group-hover:bg-surface2/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-surface2 border border-theme-subtle flex items-center justify-center text-[10px] font-black text-secondary shrink-0">{emp.name?.[0] || '?'}</div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-primary truncate">{emp.name}</p>
                                <p className="text-[9px] text-muted truncate">{emp.role || 'Operator'}</p>
                              </div>
                            </div>
                            <div className={\`text-[8px] font-black px-1.5 py-0.5 rounded border w-fit mt-0.5 \${loadCls}\`}>
                              {totalHr.toFixed(1)}h {isOverloaded ? '⚠ OVER' : isOptimal ? '● OPTIMAL' : '● FREE'}
                            </div>
                          </div>

                          {/* Hour grid stripes + blocks */}
                          <div className="flex-1 relative overflow-hidden">
                            {/* alternating hour bands */}
                            {Array.from({length: HOURS}).map((_,i) => (
                              <div key={i} className="absolute top-0 bottom-0 border-l border-theme-subtle/20" style={{ left: i * PPH, width: PPH, background: i%2===0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}/>
                            ))}

                            {/* operation blocks */}
                            {empOps.map((op:any, i:number) => {
                              const hrs = Number(op.plannedHours);
                              const w = Math.max(hrs * PPH - 4, 20);

                              let leftPx = 4 + (i * (w + 6)); // default stacking
                              if (op.scheduledStart) {
                                const sd = new Date(op.scheduledStart);
                                leftPx = (sd.getHours() - START_HOUR + sd.getMinutes() / 60) * PPH + 2;
                              }

                              const prio = op.woPriority as string;
                              const blockCls = prio === 'Urgent' ? 'bg-red-500/20 border-red-400 hover:bg-red-500/30'
                                             : prio === 'High'   ? 'bg-orange-500/20 border-orange-400 hover:bg-orange-500/30'
                                             :                     'bg-blue-500/15 border-blue-400/60 hover:bg-blue-500/25';
                              const dotCls   = priorityDot[prio] || 'bg-blue-500';

                              return (
                                <div
                                  key={op.id}
                                  draggable
                                  onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }}
                                  title={\`\${op.operationName} | \${op.woTitle} | \${hrs}h\`}
                                  className={\`absolute top-2 bottom-2 rounded-lg border cursor-grab active:cursor-grabbing px-2 py-1 overflow-hidden transition-all hover:z-30 hover:shadow-lg hover:-translate-y-0.5 select-none \${blockCls}\`}
                                  style={{ left: leftPx, width: w }}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className={\`w-1.5 h-1.5 rounded-full shrink-0 \${dotCls}\`}/>
                                    <span className="text-[8px] font-mono font-bold text-secondary truncate">{op.woId}</span>
                                    <span className="ml-auto text-[8px] font-mono font-black text-primary shrink-0">{hrs}h</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-primary truncate leading-tight">{op.operationName}</p>
                                  {w > 90 && <p className="text-[8px] text-muted truncate mt-0.5">{op.woTitle}</p>}
                                  {op.scheduledStart && w > 70 && (
                                    <p className="text-[7px] font-mono text-secondary/70 mt-0.5">
                                      {new Date(op.scheduledStart).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}–{new Date(op.scheduledEnd).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>

              {/* ════ UNASSIGNED QUEUE ════ */}
              <div className="w-72 shrink-0 flex flex-col gap-3">
                <GlassCard
                  className="p-0 border border-theme-subtle flex flex-col overflow-hidden"
                  style={{ maxHeight: 600 }}
                  onDragEnter={(e:any) => e.preventDefault()}
                  onDragOver={(e:any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('ring-2','ring-rex-500/40'); }}
                  onDragLeave={(e:any) => e.currentTarget.classList.remove('ring-2','ring-rex-500/40')}
                  onDrop={(e:any) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('ring-2','ring-rex-500/40');
                    const opId = e.dataTransfer.getData('opId');
                    if (opId) handleAssignOperation(opId, 'employeeId', '', '');
                  }}
                >
                  {/* header */}
                  <div className="px-4 py-3 border-b border-theme-subtle bg-surface2/20 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary flex items-center gap-2"><ListChecks size={14} className="text-rex-500"/>Unscheduled</span>
                      <span className="text-[10px] font-black bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded-full">{unassigned.length}</span>
                    </div>
                    <p className="text-[9px] text-muted mt-1">Drag onto timeline row to schedule ↗</p>
                  </div>

                  {/* list */}
                  <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {unassigned.length === 0 ? (
                      <div className="py-12 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-green-500"/></div>
                        <p className="text-xs font-bold text-primary">All Scheduled!</p>
                        <p className="text-[10px] text-muted text-center">No pending operations.</p>
                      </div>
                    ) : unassigned.sort((a:any,b:any) => {
                        const order: Record<string,number> = { Urgent:0, High:1, Normal:2 };
                        return (order[a.woPriority]??2) - (order[b.woPriority]??2);
                      }).map((op:any, i:number) => {
                        const prio = op.woPriority as string;
                        const cardCls = prio==='Urgent' ? 'border-red-400/50 bg-red-500/5'
                                      : prio==='High'   ? 'border-orange-400/50 bg-orange-500/5'
                                      :                   'border-theme-subtle bg-surface';
                        const dotCls = priorityDot[prio] || 'bg-blue-500';
                        return (
                          <div
                            key={op.id}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }}
                            className={\`group cursor-grab active:cursor-grabbing rounded-xl border p-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 \${cardCls}\`}
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={\`w-2 h-2 rounded-full \${dotCls}\`}/>
                                <span className="text-[9px] font-black uppercase tracking-wider text-muted">{prio}</span>
                              </div>
                              <span className="text-[10px] font-mono font-black text-primary">{Number(op.plannedHours).toFixed(1)}h</span>
                            </div>
                            <p className="text-[11px] font-bold text-primary truncate mb-0.5">{op.operationName}</p>
                            <p className="text-[9px] text-muted truncate mb-2">{op.woId} · {op.woTitle}</p>
                            {op.woNotes && (
                              <p className="text-[8px] text-secondary/80 bg-surface2/60 rounded px-1.5 py-1 mb-2 line-clamp-2 leading-relaxed">{op.woNotes}</p>
                            )}
                            <select
                              className="w-full input-base text-[10px] py-1"
                              value=""
                              onChange={(e) => { if(e.target.value) handleAssignOperation(op.id,'employeeId',e.target.value); }}
                            >
                              <option value="">Quick assign to…</option>
                              {employees.map((em:any) => <option key={em.id} value={em.id}>{em.name}</option>)}
                            </select>
                          </div>
                        );
                    })}
                  </div>
                </GlassCard>

                {/* mini legend */}
                <GlassCard className="p-3 text-[9px] text-muted space-y-1.5 border border-theme-subtle">
                  <p className="font-black uppercase tracking-widest text-secondary mb-2">How to use</p>
                  <p>① Drag card → employee row to schedule</p>
                  <p>② Drop onto desired hour slot for exact time</p>
                  <p>③ Drag block back here to unschedule</p>
                  <p>④ Move blocks between rows to reassign</p>
                </GlassCard>
              </div>

            </div>
          </div>
        );
      })()}`;

// Replace planning section
const startMarker = `      {viewMode === 'planning' && (() => {`;
const endMarker   = `      })()}`;

const si = content.indexOf(startMarker);
const ei = content.indexOf(endMarker, si) + endMarker.length;

if (si === -1 || ei === endMarker.length - 1) {
  console.error('Could not find planning section markers!');
  process.exit(1);
}

content = content.slice(0, si) + newSection + content.slice(ei);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Done');