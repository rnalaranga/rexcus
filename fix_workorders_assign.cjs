const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const oldFunc = `  const handleUpdateOpStatus = async (opId: string, status: string) => {
    await fetch(API + '/production/operations/' + opId + '/status', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    refreshTrackWO()
  }`;
const newFunc = `  const handleUpdateOpStatus = async (opId: string, status: string) => {
    await fetch(API + '/production/operations/' + opId + '/status', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    refreshTrackWO()
  }

  const handleAssignOperation = async (opId: string, field: 'employeeId'|'machineId', val: string) => {
    const op = trackWO?.operations?.find((o:any) => o.id === opId);
    if (!op) return;
    const payload = {
      employeeId: field === 'employeeId' ? val : op.employeeId,
      machineId: field === 'machineId' ? val : op.machineId
    };
    await fetch(API + '/production/operations/' + opId + '/assign', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    refreshTrackWO();
  }`;

if (content.includes(oldFunc)) {
    content = content.replace(oldFunc, newFunc);
    console.log("Added handleAssignOperation");
} else {
    console.log("Could not find handleUpdateOpStatus");
}

const oldRender = `                                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-xs text-secondary">
                                    <span className="flex items-center gap-1.5 font-medium"><Settings size={12} className="text-muted shrink-0"/> {m?.name || 'Any Available Machine'}</span>
                                    <span className="flex items-center gap-1.5 font-medium"><Users size={12} className="text-muted shrink-0"/> {emp?.name || 'Any Operator'}</span>
                                  </div>`;
const newRender = `                                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-secondary">
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <Settings size={12} className="text-muted shrink-0"/> 
                                      {!isComplete ? (
                                        <select value={op.machineId || ''} onChange={(e) => handleAssignOperation(op.id, 'machineId', e.target.value)} className="bg-transparent border-b border-theme-subtle focus:border-rex-500 outline-none pb-0.5 text-xs w-32 truncate">
                                          <option value="">Any Machine</option>
                                          {machineries.map(mach => <option key={mach.id} value={mach.id}>{mach.name}</option>)}
                                        </select>
                                      ) : <span>{m?.name || 'Any Machine'}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <Users size={12} className="text-muted shrink-0"/>
                                      {!isComplete ? (
                                        <select value={op.employeeId || ''} onChange={(e) => handleAssignOperation(op.id, 'employeeId', e.target.value)} className="bg-transparent border-b border-theme-subtle focus:border-rex-500 outline-none pb-0.5 text-xs w-32 truncate">
                                          <option value="">Any Operator</option>
                                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                      ) : <span>{emp?.name || 'Any Operator'}</span>}
                                    </div>
                                  </div>`;
if (content.includes(oldRender)) {
    content = content.replace(oldRender, newRender);
    console.log("Replaced operation render");
} else {
    console.log("Could not find operation render");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');