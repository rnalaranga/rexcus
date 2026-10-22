const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const startMarker = `      {viewMode === 'planning' && (() => {`;
const endMarker   = `      })()}`;

const si = content.indexOf(startMarker);
const ei = content.indexOf(endMarker, si) + endMarker.length;
if (si === -1) { console.error('Marker not found'); process.exit(1); }

const newSection = `      {viewMode === 'planning' && (() => {
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
                }))
            : []
        );
        const unassigned = allActiveOps.filter((o:any) => !o.employeeId);
        const assigned   = allActiveOps.filter((o:any) => !!o.employeeId);

        const START_HOUR = 6;
        const END_HOUR   = 22;
        const HOURS      = END_HOUR - START_HOUR;
        const PPH        = 80;
        const ROW_H      = 72;

        const prioStyle: Record<string, { bg: string; border: string; dot: string; badgeCls: string }> = {
          Urgent: { bg: '#fef2f2', border: '#f87171', dot: '#ef4444', badgeCls: 'bg-red-100 text-red-700 border-red-200' },
          High:   { bg: '#fff7ed', border: '#fb923c', dot: '#f97316', badgeCls: 'bg-orange-100 text-orange-700 border-orange-200' },
          Normal: { bg: '#eff6ff', border: '#60a5fa', dot: '#3b82f6', badgeCls: 'bg-blue-100 text-blue-700 border-blue-200' },
        };

        return (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">

            {/* STATS ROW */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Employees',   value: employees.length,                                                                    icon: <Users size={15}/>,         color: 'text-blue-600',   bg: 'bg-blue-500/10' },
                { label: 'Unscheduled', value: unassigned.length,                                                                   icon: <AlertTriangle size={15}/>,  color: unassigned.length > 0 ? 'text-amber-600' : 'text-green-600', bg: unassigned.length > 0 ? 'bg-amber-500/10' : 'bg-green-500/10' },
                { label: 'Scheduled',   value: assigned.length,                                                                     icon: <CheckCircle size={15}/>,    color: 'text-green-600',  bg: 'bg-green-500/10' },
                { label: 'Total Hours', value: allActiveOps.reduce((a:number,o:any) => a + Number(o.plannedHours), 0).toFixed(1) + 'h', icon: <Clock size={15}/>,     color: 'text-rex-500',    bg: 'bg-rex-500/10' },
              ].map((kpi, i) => (
                <GlassCard key={i} className="p-4 flex items-center gap-3.5 border border-theme-subtle hover:border-rex-500/30 transition-colors">
                  <div className={"w-10 h-10 rounded-xl " + kpi.bg + " flex items-center justify-center " + kpi.color + " shrink-0"}>{kpi.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{kpi.label}</p>
                    <p className="text-2xl font-black text-primary leading-none mt-0.5">{kpi.value}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* MAIN BOARD */}
            <div className="flex gap-4 items-start">

              {/* GANTT CHART */}
              <GlassCard className="flex-1 min-w-0 p-0 overflow-hidden border border-theme-subtle flex flex-col min-h-[420px]">

                {/* Chart Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2/20 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rex-500/10 flex items-center justify-center">
                      <Layers size={15} className="text-rex-500"/>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary leading-none">Daily Resource Planner</p>
                      <p className="text-[10px] text-muted mt-0.5">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-semibold text-muted">
                    {([['#3b82f6','Normal'],['#f97316','High'],['#ef4444','Urgent']] as [string,string][]).map(([c,l]) => (
                      <span key={l} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block border" style={{background: c + '44', borderColor: c}}/>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Scrollable grid */}
                <div className="overflow-auto flex-1">
                  <div style={{ minWidth: HOURS * PPH + 220 + 'px' }}>

                    {/* Time Ruler */}
                    <div className="flex border-b-2 border-theme-subtle sticky top-0 z-30 bg-surface shadow-sm">
                      <div className="w-[220px] shrink-0 border-r border-theme-subtle bg-surface2/50 flex items-center px-4" style={{ height: 36 }}>
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Operator</span>
                      </div>
                      <div className="flex-1 relative bg-surface2/20" style={{ height: 36 }}>
                        {Array.from({length: HOURS}).map((_,i) => {
                          const h = START_HOUR + i;
                          return (
                            <div key={i} className="absolute top-0 bottom-0 flex items-center border-l border-theme-subtle/50 pl-1.5" style={{ left: i * PPH, width: PPH }}>
                              <span className="text-[9px] font-mono font-semibold text-muted">{h.toString().padStart(2,'0')}:00</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Employee rows */}
                    {employees.length === 0 ? (
                      <div className="py-20 text-center text-sm text-muted">No employees. Add employees in HR module.</div>
                    ) : employees.map((emp:any) => {
                      const empOps = allActiveOps.filter((o:any) => o.employeeId === emp.id);
                      const totalHr = empOps.reduce((a:number,o:any) => a + Number(o.plannedHours), 0);
                      const pct = Math.min((totalHr / 10) * 100, 100);
                      const isOver = totalHr > 10;
                      const isOpt  = totalHr >= 6 && totalHr <= 10;
                      const loadColor = isOver ? '#ef4444' : isOpt ? '#f59e0b' : '#22c55e';

                      return (
                        <div
                          key={emp.id}
                          className="flex border-b border-theme-subtle/30 group"
                          style={{ height: ROW_H }}
                          onDragEnter={(e) => e.preventDefault()}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
                          onDragLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                          onDrop={(e) => {
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
                            handleAssignOperation(opId, 'employeeId', emp.id, d.toISOString());
                          }}
                        >
                          {/* Employee Info */}
                          <div className="w-[220px] shrink-0 border-r border-theme-subtle/50 px-3 flex flex-col justify-center sticky left-0 z-20 bg-surface group-hover:bg-surface2/40 transition-colors">
                            <div className="flex items-center gap-2.5 mb-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                                style={{ background: ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444'][emp.name.charCodeAt(0) % 5] }}
                              >
                                {emp.name?.[0] || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-primary truncate leading-tight">{emp.name}</p>
                                <p className="text-[9px] text-muted truncate">{emp.role || 'Operator'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full bg-surface2 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: loadColor }}/>
                              </div>
                              <span className="text-[8px] font-bold shrink-0 tabular-nums" style={{ color: loadColor }}>{totalHr.toFixed(1)}h</span>
                            </div>
                          </div>

                          {/* Timeline Track */}
                          <div className="flex-1 relative overflow-hidden">
                            {Array.from({length: HOURS}).map((_,i) => (
                              <div key={i} className="absolute top-0 bottom-0 border-l border-theme-subtle/20" style={{ left: i * PPH, width: PPH, background: i%2===0?'transparent':'rgba(0,0,0,0.01)' }}/>
                            ))}
                            {empOps.map((op:any) => {
                              const hrs = Number(op.plannedHours);
                              const w = Math.max(hrs * PPH - 6, 24);
                              const prio = op.woPriority || 'Normal';
                              const ps = prioStyle[prio] || prioStyle.Normal;
                              let leftPx = 8;
                              if (op.scheduledStart) {
                                const sd = new Date(op.scheduledStart);
                                leftPx = (sd.getHours() - START_HOUR + sd.getMinutes() / 60) * PPH + 3;
                              }
                              return (
                                <div
                                  key={op.id}
                                  draggable
                                  onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }}
                                  title={op.operationName + ' · ' + op.woTitle + ' · ' + hrs + 'h'}
                                  className="absolute top-2.5 bottom-2.5 rounded-xl cursor-grab active:cursor-grabbing overflow-hidden select-none transition-all hover:z-40 hover:shadow-lg hover:-translate-y-px"
                                  style={{ left: leftPx, width: w, background: ps.bg, border: '1.5px solid ' + ps.border }}
                                >
                                  <div className="flex flex-col h-full px-2 py-1.5 justify-between">
                                    <div className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ps.dot }}/>
                                      <span className="text-[8px] font-mono font-bold text-gray-400 truncate flex-1">{op.woId}</span>
                                      <span className="text-[9px] font-black text-gray-700 shrink-0">{hrs}h</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-800 truncate leading-tight">{op.operationName}</p>
                                    {op.scheduledStart && w > 80 && (
                                      <p className="text-[7px] font-mono text-gray-400">
                                        {new Date(op.scheduledStart).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} – {new Date(op.scheduledEnd).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                                      </p>
                                    )}
                                  </div>
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

              {/* SIDEBAR */}
              <div className="w-64 shrink-0 flex flex-col gap-3">

                {/* Unassigned Queue */}
                <GlassCard
                  className="p-0 border border-theme-subtle flex flex-col overflow-hidden"
                  onDragEnter={(e:any) => e.preventDefault()}
                  onDragOver={(e:any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('ring-2','ring-rex-400'); }}
                  onDragLeave={(e:any) => e.currentTarget.classList.remove('ring-2','ring-rex-400')}
                  onDrop={(e:any) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('ring-2','ring-rex-400');
                    const opId = e.dataTransfer.getData('opId');
                    if (opId) handleAssignOperation(opId, 'employeeId', '', '');
                  }}
                >
                  <div className="px-4 py-3 border-b border-theme-subtle shrink-0 flex items-center justify-between bg-surface2/20">
                    <div className="flex items-center gap-2">
                      <ListChecks size={13} className="text-rex-500"/>
                      <span className="text-sm font-bold text-primary">Unscheduled</span>
                    </div>
                    <span className={"text-[9px] font-black px-2 py-0.5 rounded-full border " + (unassigned.length > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200')}>{unassigned.length} pending</span>
                  </div>
                  <p className="text-[9px] text-muted px-4 py-1.5 bg-surface2/10 border-b border-theme-subtle/50">Drag onto timeline to schedule · Drop here to unschedule</p>

                  <div className="overflow-y-auto p-2 space-y-2" style={{ maxHeight: 420 }}>
                    {unassigned.length === 0 ? (
                      <div className="py-10 flex flex-col items-center gap-2">
                        <div className="w-11 h-11 rounded-full bg-green-500/10 border border-green-200 flex items-center justify-center">
                          <CheckCircle size={20} className="text-green-500"/>
                        </div>
                        <p className="text-xs font-bold text-primary mt-1">All Scheduled!</p>
                        <p className="text-[10px] text-muted text-center leading-relaxed">No pending operations.</p>
                      </div>
                    ) : [...unassigned].sort((a:any,b:any) => {
                        const o: Record<string,number> = { Urgent:0, High:1, Normal:2 };
                        return (o[a.woPriority]??2) - (o[b.woPriority]??2);
                      }).map((op:any) => {
                        const prio = op.woPriority || 'Normal';
                        const ps = prioStyle[prio] || prioStyle.Normal;
                        return (
                          <div
                            key={op.id}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('opId', op.id); e.dataTransfer.effectAllowed = 'move'; }}
                            className="cursor-grab active:cursor-grabbing rounded-xl border p-3 transition-all hover:shadow-md hover:-translate-y-0.5 select-none"
                            style={{ background: ps.bg, borderColor: ps.border }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={"text-[9px] font-black px-1.5 py-0.5 rounded border " + ps.badgeCls}>{prio}</span>
                              <span className="text-[10px] font-mono font-black text-gray-700">{Number(op.plannedHours).toFixed(1)}h</span>
                            </div>
                            <p className="text-[11px] font-bold text-gray-800 leading-snug mb-0.5">{op.operationName}</p>
                            <p className="text-[9px] text-gray-500 truncate mb-2">{op.woId} · {op.woTitle}</p>
                            {op.woNotes && (
                              <p className="text-[8px] text-gray-500 bg-white/60 rounded px-1.5 py-1 mb-2 line-clamp-2 leading-relaxed border border-black/5">{op.woNotes}</p>
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

                {/* How to use */}
                <GlassCard className="p-4 border border-theme-subtle">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2.5">How to use</p>
                  <div className="space-y-2">
                    {['Drag queue card onto an employee row','Drop at exact hour for precise scheduling','Drag block back here to unschedule','Drag block to another row to reassign'].map((t,i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-rex-500/10 text-rex-600 text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-[9px] text-muted leading-relaxed">{t}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

              </div>
            </div>
          </div>
        );
      })()}`;

content = content.slice(0, si) + newSection + content.slice(ei);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Done');