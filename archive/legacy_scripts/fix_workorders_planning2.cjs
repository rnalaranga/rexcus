const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add view mode state
if (!content.includes('const [viewMode, setViewMode]')) {
  content = content.replace("const [activeTab, setActiveTab] = useState<PlannerTab>('details')", "const [activeTab, setActiveTab] = useState<PlannerTab>('details')\n  const [viewMode, setViewMode] = useState<'dashboard'|'planning'>('dashboard')");
}

// 2. Add toggle in header
const headerRegex = /<h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Planning<\/h1>\s*<p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress\.<\/p>\s*<\/div>\s*<div className="flex items-center gap-2">/m;
const headerReplacement = `<h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Planning</h1>
          <p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex border border-theme-subtle rounded overflow-hidden mr-2">
            <button onClick={() => setViewMode('dashboard')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'dashboard' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Dashboard</button>
            <button onClick={() => setViewMode('planning')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'planning' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Labor Planning</button>
          </div>
`;
if (headerRegex.test(content)) {
    content = content.replace(headerRegex, headerReplacement);
    console.log("Header Replaced");
} else {
    console.log("Header regex did not match!");
}

// 3. Wrap existing dashboard content and append Planning view
const cardsSection = `<div className="grid grid-cols-1 md:grid-cols-4 gap-4">`;
if (content.includes(cardsSection) && !content.includes("{viewMode === 'dashboard' && (<>")) {
    content = content.replace(cardsSection, `{viewMode === 'dashboard' && (<>\n      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">`);
    console.log("Cards wrapped");
}

// Close it right before the new Modal for work orders (after DataTable)
const modalSection = `<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Work Order" size="5xl">`;
const newPlanningCode = `</>)}

      {viewMode === 'planning' && (
        <div className="space-y-4 animate-fade-in">
          <GlassCard className="p-5 border-theme-subtle">
            <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Users size={16} className="text-rex-500"/> Labor Allocation & Planning</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employees.map(emp => {
                // Find operations assigned to this employee across all non-completed WOs
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
                        <div key={idx} className="p-3 bg-surface hover:bg-surface2/30 transition-colors">
                          <div className="flex justify-between items-start mb-1.5">
                            <p className="text-xs font-bold text-primary truncate">{op.operationName}</p>
                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${op.status === 'Completed' ? 'bg-green-500/10 text-green-600' : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>
                          </div>
                          <p className="text-[10px] text-secondary truncate">{op.woTitle} <span className="text-muted">({op.woId})</span></p>
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
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Work Order" size="5xl">`;
if (content.includes(modalSection) && !content.includes("Labor Allocation & Planning")) {
    content = content.replace(modalSection, newPlanningCode);
    console.log("Modal wrapped");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');