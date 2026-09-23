const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /\{viewMode === 'planning' && \(\(\) => \{[\s\S]*?\}\)\(\)\}/;

const newPlanning = `{viewMode === 'planning' && (() => {
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
                }))
            : []
        );
        const unassigned = allActiveOps.filter((o:any) => !o.employeeId);
        
        // Settings for timeline
        const START_HOUR = 6; // 06:00 AM
        const END_HOUR = 24;  // 24:00 (Midnight)
        const HOURS = END_HOUR - START_HOUR;
        const PIXELS_PER_HOUR = 60; // Each hour is 60px wide
        const TIMELINE_WIDTH = HOURS * PIXELS_PER_HOUR;

        return (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Control Bar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <GlassCard className="py-2 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600"><Users size={14}/></div>
                  <div><p className="text-[10px] text-muted font-bold uppercase tracking-wider">Active Staff</p><p className="text-lg font-black text-primary leading-none">{employees.length}</p></div>
                </GlassCard>
                <GlassCard className="py-2 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rex-500/10 flex items-center justify-center text-rex-600"><Settings size={14}/></div>
                  <div><p className="text-[10px] text-muted font-bold uppercase tracking-wider">Unassigned Tasks</p><p className="text-lg font-black text-primary leading-none">{unassigned.length}</p></div>
                </GlassCard>
                <GlassCard className="py-2 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600"><Clock size={14}/></div>
                  <div><p className="text-[10px] text-muted font-bold uppercase tracking-wider">Total Planned Hrs</p><p className="text-lg font-black text-primary leading-none">{allActiveOps.reduce((a:number, o:any) => a + Number(o.plannedHours), 0).toFixed(1)}h</p></div>
                </GlassCard>
              </div>
            </div>

            {/* Main Scheduling Board */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              {/* TIMELINE GANTT CHART (3 columns) */}
              <GlassCard className="xl:col-span-3 p-0 overflow-hidden border border-theme-subtle flex flex-col">
                <div className="p-4 border-b border-theme-subtle bg-surface2/30 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2"><BarChart2 size={16} className="text-rex-500"/> Daily 24hr Resource Planner</h3>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-muted">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> Free (< 8h)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"/> Optimal (8-12h)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Overload (> 12h)</span>
                  </div>
                </div>

                <div className="overflow-x-auto relative pb-8">
                  <div style={{ minWidth: TIMELINE_WIDTH + 200 + 'px' }} className="relative">
                    
                    {/* Time Axis Header */}
                    <div className="flex border-b border-theme-subtle sticky top-0 bg-surface z-20">
                      <div className="w-[200px] shrink-0 border-r border-theme-subtle p-3 bg-surface2/30">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Resource / Employee</span>
                      </div>
                      <div className="flex-1 flex relative h-10 bg-surface2/30">
                        {Array.from({length: HOURS}).map((_, i) => (
                          <div key={i} className="absolute h-full border-l border-theme-subtle/50 text-[9px] font-mono text-muted pl-1 pt-1" style={{ left: i * PIXELS_PER_HOUR, width: PIXELS_PER_HOUR }}>
                            {(START_HOUR + i).toString().padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Employee Rows */}
                    <div className="relative">
                      {/* Vertical Hour Grid Lines */}
                      <div className="absolute top-0 bottom-0 left-[200px] right-0 pointer-events-none z-0">
                        {Array.from({length: HOURS}).map((_, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-dashed border-theme-subtle/30" style={{ left: i * PIXELS_PER_HOUR }}/>
                        ))}
                      </div>

                      {employees.map(emp => {
                        const empOps = allActiveOps.filter((o:any) => o.employeeId === emp.id);
                        const totalHr = empOps.reduce((a:number, o:any) => a + Number(o.plannedHours), 0);
                        let loadColor = 'bg-green-500/10 text-green-600 border-green-500/20';
                        if (totalHr > 8) loadColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                        if (totalHr > 12) loadColor = 'bg-red-500/10 text-red-600 border-red-500/20';
                        
                        let currentLeft = 0; // stack blocks horizontally

                        return (
                          <div key={emp.id} className="flex border-b border-theme-subtle/50 hover:bg-surface2/20 transition-colors relative z-10 group">
                            
                            {/* Employee Info Panel (Sticky Left) */}
                            <div className="w-[200px] shrink-0 border-r border-theme-subtle p-3 bg-surface sticky left-0 z-20 group-hover:bg-surface2 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface2 border border-theme-subtle flex items-center justify-center shrink-0">
                                  <UserCheck size={14} className="text-secondary"/>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-primary truncate">{emp.name}</p>
                                  <p className="text-[9px] text-muted truncate">{emp.role}</p>
                                </div>
                              </div>
                              <div className={\`mt-2 px-2 py-0.5 rounded text-[9px] font-bold border inline-block \${loadColor}\`}>
                                Load: {totalHr.toFixed(1)}h
                              </div>
                            </div>

                            {/* Timeline Track */}
                            <div className="flex-1 relative h-20 bg-transparent flex items-center px-2">
                              {empOps.map((op:any, i:number) => {
                                const w = Number(op.plannedHours) * PIXELS_PER_HOUR;
                                const l = currentLeft;
                                currentLeft += w + 8; // add 8px gap between blocks

                                const isUrgent = op.woPriority === 'Urgent' || op.woPriority === 'High';

                                return (
                                  <div key={i} className={\`absolute top-2 bottom-2 rounded-lg border shadow-sm p-1.5 overflow-hidden transition-all hover:z-30 hover:scale-105 hover:shadow-md cursor-pointer \${isUrgent ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-theme-subtle hover:border-blue-500/50'}\`} style={{ left: l, width: w }}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={\`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded \${isUrgent ? 'bg-red-500 text-white' : 'bg-surface2 text-muted'}\`}>{op.woId}</span>
                                      <span className="text-[8px] font-mono text-secondary font-bold">{Number(op.plannedHours).toFixed(1)}h</span>
                                    </div>
                                    <p className={\`text-[9px] font-bold truncate leading-tight \${isUrgent ? 'text-red-700' : 'text-primary'}\`}>{op.operationName}</p>
                                    {w > 100 && (
                                      <p className="text-[8px] text-muted truncate mt-0.5">{op.woTitle}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* UNASSIGNED QUEUE (1 column) */}
              <GlassCard className="p-0 border border-theme-subtle flex flex-col h-[600px]">
                <div className="p-4 border-b border-theme-subtle bg-surface2/30">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2"><ListChecks size={16} className="text-rex-500"/> Unassigned Queue</h3>
                  <p className="text-[10px] text-muted mt-1">Pending operations waiting for allocation.</p>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3 bg-surface/30">
                  {unassigned.sort((a:any,b:any) => a.woPriority==='Urgent'?-1:1).map((op:any, i:number) => {
                    const isUrgent = op.woPriority === 'Urgent' || op.woPriority === 'High';
                    return (
                      <div key={i} className={\`p-3 rounded-xl border bg-surface shadow-sm \${isUrgent ? 'border-red-500/30' : 'border-theme-subtle'}\`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider \${isUrgent ? 'bg-red-500/10 text-red-600' : 'bg-surface2 text-muted'}\`}>{op.woPriority}</span>
                          <span className="text-[10px] font-mono font-bold text-primary">{Number(op.plannedHours).toFixed(1)}h</span>
                        </div>
                        <p className="text-xs font-bold text-primary mb-1">{op.operationName}</p>
                        <p className="text-[10px] text-muted truncate mb-3">{op.woId}: {op.woTitle}</p>
                        
                        <div className="flex items-center gap-2">
                          <select 
                            className="input-base text-[10px] py-1 flex-1 font-semibold"
                            value=""
                            onChange={(e) => handleAssignOperation(op.woId, op.id, op.machineId, e.target.value)}
                          >
                            <option value="">Quick Assign...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                  {unassigned.length === 0 && (
                    <div className="text-center py-10 px-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 mx-auto mb-3">
                        <CheckCircle size={24}/>
                      </div>
                      <p className="text-xs font-bold text-primary">All Clear!</p>
                      <p className="text-[10px] text-muted mt-1">No pending operations.</p>
                    </div>
                  )}
                </div>
              </GlassCard>

            </div>
          </div>
        )
      })}`;

if (content.match(regex)) {
    content = content.replace(regex, newPlanning);
    console.log("SUCCESS: Gantt UI injected");
} else {
    console.log("FAILED: Regex mismatch");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');