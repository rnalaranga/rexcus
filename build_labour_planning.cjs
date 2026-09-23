const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add planningFilter state after viewMode state
const oldState = `const [viewMode, setViewMode] = useState<'dashboard'|'planning'>('dashboard')`;
const newState = `const [viewMode, setViewMode] = useState<'dashboard'|'planning'>('dashboard')
  const [planningFilter, setPlanningFilter] = useState<'all'|'pending'|'in_progress'>('all')`;
content = content.replace(oldState, newState);

// 2. Update imports to add missing icons
const oldImport = `import { Download, Plus, Play, CheckCircle, AlertTriangle, Settings, Layers, Trash2, Users, ArrowUp, ArrowDown, Tag, Calculator, Package, Wrench, ListChecks, ClipboardList, ChevronRight, Clock, Zap, TrendingUp, Archive, Image as ImageIcon } from 'lucide-react'`;
const newImport = `import { Download, Plus, Play, CheckCircle, AlertTriangle, Settings, Layers, Trash2, Users, ArrowUp, ArrowDown, Tag, Calculator, Package, Wrench, ListChecks, ClipboardList, ChevronRight, Clock, Zap, TrendingUp, Archive, Image as ImageIcon, Filter, UserCheck, UserX, AlertCircle, BarChart2 } from 'lucide-react'`;
content = content.replace(oldImport, newImport);

// 3. Replace the entire planning view block
const oldPlanningBlock = `{viewMode === 'planning' && (
          <div className="space-y-4 animate-fade-in mt-4">
            <GlassCard className="p-5 border-theme-subtle">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Users size={16} className="text-rex-500"/> Labor Allocation & Planning</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map(emp => {
                  const assignedOps = workOrders.flatMap(wo => wo.status !== 'Completed' && wo.operations ? wo.operations.filter((o:any) => o.employeeId === emp.id).map((o:any) => ({...o, woTitle: wo.title, woId: wo.id, woStatus: wo.status})) : []);
                  if (assignedOps.length === 0) return null;
                  const totalPlannedHrs = assignedOps.reduce((sum:number, o:any) => sum + Number(o.plannedHours || 0), 0);
                  
                  return (
                    <div key={emp.id} className="border border-theme-subtle bg-surface2/30 rounded-xl overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-theme-subtle bg-surface2/50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-rex-700 flex items-center justify-center text-white text-[10px] font-bold">{emp.name.substring(0,2).toUpperCase()}</div>
                          <div>
                            <p className="text-xs font-bold text-primary">{emp.name}</p>
                            <p className="text-[9px] text-muted">{emp.role}</p>
                          </div>
                        </div>
                        <Badge variant="default" size="sm">{totalPlannedHrs.toFixed(1)} hrs</Badge>
                      </div>
                      <div className="p-0 flex-1 divide-y divide-theme-subtle max-h-64 overflow-y-auto">
                        {assignedOps.map((op:any, idx:number) => (
                          <div key={idx} className="p-3 bg-surface hover:bg-surface2/30 transition-colors border-b border-theme-subtle/50 last:border-0">
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="text-xs font-bold text-primary leading-tight pr-2" title={op.woTitle}>{op.woTitle}</p>
                              <span className={\`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full \${op.status === 'Completed' ? 'bg-green-500/10 text-green-600' : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[11px] text-secondary font-semibold flex items-center gap-1.5"><Settings size={12} className="shrink-0 text-rex-500/70"/> {op.operationName}</p>
                              <span className="text-[9px] font-mono font-bold text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">{op.woId}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {employees.length > 0 && workOrders.flatMap(wo => wo.status !== 'Completed' && wo.operations ? wo.operations.filter((o:any) => o.employeeId) : []).length === 0 && (
                  <div className="col-span-full py-12 text-center text-xs text-muted border border-dashed border-theme-subtle rounded-xl">
                    No pending operations are currently assigned to any employees.
                    <br/>Go to the Work Orders dashboard and assign operators in the routing steps.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}`;

const newPlanningBlock = `{viewMode === 'planning' && (() => {
          // --- Build data for planning view ---
          const allActiveOps = workOrders.flatMap(wo =>
            wo.status !== 'Completed' && wo.operations
              ? wo.operations
                  .filter((o:any) => Number(o.plannedHours) > 0)
                  .map((o:any) => ({
                    ...o,
                    woTitle: wo.title,
                    woId: wo.id,
                    woStatus: wo.status,
                    woPriority: wo.priority,
                    woDeadline: wo.deadline,
                    woCustomer: wo.customerId,
                  }))
              : []
          );

          const filteredOps = allActiveOps.filter((o:any) => {
            if (planningFilter === 'pending') return o.status === 'Pending';
            if (planningFilter === 'in_progress') return o.status === 'In Progress';
            return o.status !== 'Completed';
          });

          const unassignedOps = filteredOps.filter((o:any) => !o.employeeId);
          const totalPlannedAll = allActiveOps.reduce((s:number, o:any) => s + Number(o.plannedHours || 0), 0);

          const WORKDAY_HRS = 40; // hrs per week reference

          const empWithLoad = employees.map(emp => {
            const ops = filteredOps.filter((o:any) => o.employeeId === emp.id);
            const hrs = ops.reduce((s:number, o:any) => s + Number(o.plannedHours || 0), 0);
            return { emp, ops, hrs };
          }).filter(e => e.ops.length > 0);

          const priorityOrder: Record<string,number> = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
          const sortedUnassigned = [...unassignedOps].sort((a:any, b:any) =>
            (priorityOrder[a.woPriority] ?? 2) - (priorityOrder[b.woPriority] ?? 2)
          );

          return (
            <div className="space-y-4 animate-fade-in mt-4">

              {/* ── SUMMARY BAR ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: <BarChart2 size={16} className="text-blue-500"/>, label: 'Active Operations', value: allActiveOps.length, sub: 'across all work orders', color: 'border-blue-500/20 bg-blue-500/5' },
                  { icon: <UserX size={16} className="text-red-500"/>, label: 'Unassigned', value: unassignedOps.length, sub: 'need operator assignment', color: unassignedOps.length > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-theme-subtle bg-surface' },
                  { icon: <UserCheck size={16} className="text-green-500"/>, label: 'Assigned Operators', value: empWithLoad.length, sub: 'currently active', color: 'border-green-500/20 bg-green-500/5' },
                  { icon: <Clock size={16} className="text-amber-500"/>, label: 'Total Planned Hours', value: totalPlannedAll.toFixed(1) + 'h', sub: 'across pending jobs', color: 'border-amber-500/20 bg-amber-500/5' },
                ].map((s, i) => (
                  <GlassCard key={i} className={\`p-4 flex items-center gap-3 border \${s.color}\`}>
                    <div className="shrink-0">{s.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xl font-black text-primary font-mono leading-none">{s.value}</p>
                      <p className="text-[10px] font-bold text-secondary mt-0.5">{s.label}</p>
                      <p className="text-[9px] text-muted">{s.sub}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* ── FILTER BAR ── */}
              <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
                <Filter size={13} className="text-muted ml-1"/>
                <span className="text-[10px] text-muted font-semibold uppercase tracking-wider mr-1">Filter:</span>
                {(['all','pending','in_progress'] as const).map(f => (
                  <button key={f} onClick={() => setPlanningFilter(f)}
                    className={\`px-3 py-1 rounded-full text-[11px] font-bold transition-colors \${planningFilter === f ? 'bg-rex-500 text-white' : 'bg-surface2 text-muted hover:text-primary'}\`}>
                    {f === 'all' ? 'All Active' : f === 'pending' ? 'Pending' : 'In Progress'}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-muted">{filteredOps.length} operation{filteredOps.length !== 1 ? 's' : ''} shown</span>
              </GlassCard>

              {/* ── MAIN TWO-COLUMN LAYOUT ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* LEFT — Employee Workload (2/3 width) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <UserCheck size={14} className="text-rex-500"/>
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest">Operator Workload</h3>
                    <span className="text-[10px] text-muted ml-1">({empWithLoad.length} active)</span>
                  </div>

                  {empWithLoad.length === 0 && (
                    <GlassCard className="p-10 text-center">
                      <Users size={28} className="mx-auto text-muted/40 mb-3"/>
                      <p className="text-xs font-semibold text-muted">No operators assigned yet</p>
                      <p className="text-[10px] text-muted/70 mt-1">Use the Unassigned Queue on the right to assign operators</p>
                    </GlassCard>
                  )}

                  {empWithLoad.map(({ emp, ops, hrs }) => {
                    const loadPct = Math.min(100, (hrs / WORKDAY_HRS) * 100);
                    const loadColor = hrs > 40 ? 'bg-red-500' : hrs > 20 ? 'bg-amber-500' : 'bg-green-500';
                    const loadLabel = hrs > 40 ? 'Overloaded' : hrs > 20 ? 'Moderate' : 'Available';
                    const loadLabelColor = hrs > 40 ? 'text-red-600 bg-red-500/10' : hrs > 20 ? 'text-amber-600 bg-amber-500/10' : 'text-green-600 bg-green-500/10';

                    return (
                      <GlassCard key={emp.id} className="p-0 overflow-hidden border border-theme-subtle">
                        {/* Employee Header */}
                        <div className="p-3 flex items-center gap-3 border-b border-theme-subtle bg-surface2/30">
                          <div className="w-9 h-9 rounded-full bg-rex-700 flex items-center justify-center text-white text-xs font-black shrink-0">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-primary truncate">{emp.name}</p>
                              <span className={\`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide \${loadLabelColor}\`}>{loadLabel}</span>
                            </div>
                            <p className="text-[10px] text-muted">{emp.role || 'Operator'}</p>
                            {/* Workload Bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                                <div className={\`h-full rounded-full transition-all \${loadColor}\`} style={{ width: loadPct + '%' }}/>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-muted shrink-0">{hrs.toFixed(1)}h / {WORKDAY_HRS}h</span>
                            </div>
                          </div>
                        </div>

                        {/* Operations List */}
                        <div className="divide-y divide-theme-subtle/50">
                          {ops.map((op:any, idx:number) => {
                            const m = machineries.find((m:any) => m.id === op.machineId);
                            const priorityColor: Record<string,string> = { Urgent: 'text-red-600 bg-red-500/10 border-red-500/20', High: 'text-orange-600 bg-orange-500/10 border-orange-500/20', Normal: 'text-blue-600 bg-blue-500/10 border-blue-500/20', Low: 'text-muted bg-surface2 border-theme-subtle' };
                            const statusDot: Record<string,string> = { 'Pending': 'bg-muted', 'In Progress': 'bg-blue-500 ring-2 ring-blue-500/30', 'QC Pending': 'bg-amber-500', 'Completed': 'bg-green-500', 'Rework Required': 'bg-red-500' };

                            return (
                              <div key={idx} className="p-3 hover:bg-surface2/20 transition-colors">
                                <div className="flex items-start gap-2">
                                  <div className={\`w-2 h-2 rounded-full mt-1.5 shrink-0 \${statusDot[op.status] || 'bg-muted'}\`}/>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded border \${priorityColor[op.woPriority] || priorityColor.Normal}\`}>{op.woPriority || 'Normal'}</span>
                                      <span className="text-[10px] font-mono font-bold text-primary">{op.woId}</span>
                                      {op.woDeadline && <span className="text-[9px] text-muted flex items-center gap-1"><Clock size={9}/> {new Date(op.woDeadline).toLocaleDateString('en-GB', {day:'2-digit',month:'short'})}</span>}
                                    </div>
                                    <p className="text-xs font-bold text-primary truncate" title={op.woTitle}>{op.woTitle}</p>
                                    <p className="text-[10px] text-secondary flex items-center gap-1 mt-0.5"><Settings size={10} className="text-muted shrink-0"/> {op.operationName}{m ? <span className="text-muted">· {m.name}</span> : ''}</p>
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-mono font-bold text-muted">{Number(op.plannedHours).toFixed(1)}h</span>
                                    <select
                                      value={op.employeeId || ''}
                                      onChange={e => handleAssignOperation(op.id, 'employeeId', e.target.value)}
                                      className="text-[10px] bg-surface border border-theme-subtle rounded px-1.5 py-0.5 outline-none focus:border-rex-500 text-muted max-w-[100px] truncate"
                                    >
                                      <option value="">Unassign</option>
                                      {employees.map((e:any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>

                {/* RIGHT — Unassigned Queue (1/3 width) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <UserX size={14} className={sortedUnassigned.length > 0 ? 'text-red-500' : 'text-muted'}/>
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest">Unassigned Queue</h3>
                    {sortedUnassigned.length > 0 && (
                      <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500 text-white">{sortedUnassigned.length}</span>
                    )}
                  </div>

                  {sortedUnassigned.length === 0 ? (
                    <GlassCard className="p-8 text-center border border-green-500/20 bg-green-500/5">
                      <CheckCircle size={24} className="mx-auto text-green-500 mb-2"/>
                      <p className="text-xs font-bold text-green-600">All operations assigned!</p>
                      <p className="text-[10px] text-muted mt-1">No unassigned operations in queue</p>
                    </GlassCard>
                  ) : (
                    <div className="space-y-2">
                      {sortedUnassigned.map((op:any, idx:number) => {
                        const priorityColor: Record<string,string> = { Urgent: 'border-red-500/30 bg-red-500/5', High: 'border-orange-500/30 bg-orange-500/5', Normal: 'border-blue-500/20 bg-blue-500/5', Low: 'border-theme-subtle bg-surface' };
                        const badgeColor: Record<string,string> = { Urgent: 'text-red-600 bg-red-500/10', High: 'text-orange-600 bg-orange-500/10', Normal: 'text-blue-600 bg-blue-500/10', Low: 'text-muted bg-surface2' };

                        return (
                          <GlassCard key={idx} className={\`p-3 border \${priorityColor[op.woPriority] || priorityColor.Normal}\`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-full \${badgeColor[op.woPriority] || badgeColor.Normal}\`}>{op.woPriority || 'Normal'}</span>
                              <span className="text-[10px] font-mono font-bold text-primary">{op.woId}</span>
                              {op.woDeadline && <span className="text-[9px] text-muted ml-auto flex items-center gap-1"><Clock size={9}/>{new Date(op.woDeadline).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span>}
                            </div>
                            <p className="text-xs font-bold text-primary truncate mb-0.5" title={op.woTitle}>{op.woTitle}</p>
                            <p className="text-[10px] text-secondary flex items-center gap-1 mb-2.5"><Settings size={10} className="text-muted shrink-0"/> {op.operationName}</p>
                            <div className="flex items-center gap-2">
                              <Users size={11} className="text-muted shrink-0"/>
                              <select
                                value=""
                                onChange={e => { if(e.target.value) handleAssignOperation(op.id, 'employeeId', e.target.value) }}
                                className="flex-1 text-[11px] bg-surface border border-rex-500/30 rounded-lg px-2 py-1 outline-none focus:border-rex-500 text-muted font-semibold"
                              >
                                <option value="">Assign operator...</option>
                                {employees.map((e:any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                              </select>
                            </div>
                          </GlassCard>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}`;

if (content.includes(oldPlanningBlock)) {
    content = content.replace(oldPlanningBlock, newPlanningBlock);
    console.log('SUCCESS: Labour Planning block replaced');
} else {
    console.log('FAILED: Could not find planning block');
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');