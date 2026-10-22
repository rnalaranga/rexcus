const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add view mode state
content = content.replace("const [activeTab, setActiveTab] = useState<PlannerTab>('details')", "const [activeTab, setActiveTab] = useState<PlannerTab>('details')\n  const [viewMode, setViewMode] = useState<'dashboard'|'planning'>('dashboard')");

// 2. Add toggle in header
const headerRegex = /<h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Production Planning<\/h1>\s*<p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress\.<\/p>\s*<\/div>\s*<div className="flex items-center gap-2">/m;
const headerReplacement = `<h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Production Planning</h1>
          <p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex border border-theme-subtle rounded overflow-hidden mr-2">
            <button onClick={() => setViewMode('dashboard')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'dashboard' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Dashboard</button>
            <button onClick={() => setViewMode('planning')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'planning' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Labor Planning</button>
          </div>
`;
content = content.replace(headerRegex, headerReplacement);

// 3. Wrap existing dashboard content and append Planning view
// The existing dashboard is inside the main div space-y-4 animate-fade-in
// I will wrap the Data table and status widgets with viewMode === 'dashboard'
const cardsSection = `<div className="grid grid-cols-1 md:grid-cols-4 gap-4">`;
content = content.replace(cardsSection, `{viewMode === 'dashboard' && (<>\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">`);

// Close it right before the new Modal for work orders (after DataTable)
const tableSectionEnd = `</GlassCard>`;
// Wait, we can't reliably replace just `</GlassCard>`. Let's look for `<Modal isOpen={showModal}`
const modalSection = `<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Work Order" size="5xl">`;
content = content.replace(modalSection, `</>)}\n\n      {viewMode === 'planning' && (\n        <div className="space-y-4 animate-fade-in">\n          <GlassCard className="p-5 border-theme-subtle">\n            <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Users size={16} className="text-rex-500"/> Labor Allocation & Planning</h3>\n            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n              {employees.map(emp => {\n                // Find operations assigned to this employee across all non-completed WOs\n                const assignedOps = workOrders.flatMap(wo => wo.status !== 'Completed' && wo.operations ? wo.operations.filter((o:any) => o.employeeId === emp.id).map((o:any) => ({...o, woTitle: wo.title, woId: wo.id, woStatus: wo.status})) : []);\n                if (assignedOps.length === 0) return null;\n                const totalPlannedHrs = assignedOps.reduce((sum:number, o:any) => sum + Number(o.plannedHours || 0), 0);\n                \n                return (\n                  <div key={emp.id} className="border border-theme-subtle bg-surface2/30 rounded-xl overflow-hidden flex flex-col">\n                    <div className="p-3 border-b border-theme-subtle bg-surface2/50 flex justify-between items-center">\n                      <div className="flex items-center gap-2">\n                        <div className="w-8 h-8 rounded-full bg-rex-700 flex items-center justify-center text-white text-[10px] font-bold">{emp.name.substring(0,2).toUpperCase()}</div>\n                        <div>\n                          <p className="text-xs font-bold text-primary">{emp.name}</p>\n                          <p className="text-[9px] text-muted">{emp.role}</p>\n                        </div>\n                      </div>\n                      <Badge variant="default" size="sm">{totalPlannedHrs} hrs</Badge>\n                    </div>\n                    <div className="p-0 flex-1 divide-y divide-theme-subtle max-h-64 overflow-y-auto">\n                      {assignedOps.map((op:any, idx:number) => (\n                        <div key={idx} className="p-3 bg-surface hover:bg-surface2/30 transition-colors">\n                          <div className="flex justify-between items-start mb-1.5">\n                            <p className="text-xs font-bold text-primary truncate">{op.operationName}</p>\n                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${op.status === 'Completed' ? 'bg-green-500/10 text-green-600' : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>\n                          </div>\n                          <p className="text-[10px] text-secondary truncate">{op.woTitle} <span className="text-muted">({op.woId})</span></p>\n                        </div>\n                      ))}\n                    </div>\n                  </div>\n                )\n              })}\n              {employees.length > 0 && workOrders.flatMap(wo => wo.status !== 'Completed' && wo.operations ? wo.operations.filter((o:any) => o.employeeId) : []).length === 0 && (\n                <div className="col-span-full py-12 text-center text-xs text-muted border border-dashed border-theme-subtle rounded-xl">\n                  No pending operations are currently assigned to any employees.\n                  <br/>Go to the Work Orders dashboard and assign operators in the routing steps.\n                </div>\n              )}\n            </div>\n          </GlassCard>\n        </div>\n      )}\n\n      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Work Order" size="5xl">`);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Added viewMode toggle and Planning tab to WorkOrders.tsx');