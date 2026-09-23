const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

// 1. Add machineId to opForm
content = content.replace(/setOpForm\(\{ id: '', name: '', hrRate: '', setTimeRate: '' \}\)/g, "setOpForm({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })");
content = content.replace("const [opForm, setOpForm] = useState({ id: '', name: '', hrRate: '', setTimeRate: '' })", "const [opForm, setOpForm] = useState({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })");

// 2. Fix handleEditOp to load machineId
content = content.replace("const handleEditOp = (op: any) => setOpForm({ id: op.id, name: op.name, hrRate: String(op.hrRate), setTimeRate: String(op.setTimeRate) })", "const handleEditOp = (op: any) => setOpForm({ id: op.id, name: op.name, hrRate: String(op.hrRate), setTimeRate: String(op.setTimeRate), machineId: op.machineId || '' })");

// 3. Fix payload machineId
content = content.replace("const payload = { machineId: manageCategory.id, groupName: manageCategory.name, name: opForm.name, hrRate: Number(opForm.hrRate), setTimeRate: Number(opForm.setTimeRate) }", "const payload = { machineId: opForm.machineId || null, groupName: manageCategory.name, name: opForm.name, hrRate: Number(opForm.hrRate), setTimeRate: Number(opForm.setTimeRate) }");

// 4. Add dropdown to form
const formHtml = `
                  <div className="w-28">
                    <label className="block text-[10px] text-muted mb-1">SET TIME</label>
                    <input required type="number" step="0.01" min="0" className="w-full input-base py-1.5 text-xs font-mono" value={opForm.setTimeRate} onChange={e => setOpForm({...opForm, setTimeRate: e.target.value})}/>
                  </div>
`;
const newFormHtml = `
                  <div className="w-24">
                    <label className="block text-[10px] text-muted mb-1">SET TIME</label>
                    <input required type="number" step="0.01" min="0" className="w-full input-base py-1.5 text-xs font-mono" value={opForm.setTimeRate} onChange={e => setOpForm({...opForm, setTimeRate: e.target.value})}/>
                  </div>
                  <div className="w-40">
                    <label className="block text-[10px] text-muted mb-1">PHYSICAL MACHINE</label>
                    <select className="w-full input-base py-1.5 text-xs truncate" value={opForm.machineId} onChange={e => setOpForm({...opForm, machineId: e.target.value})}>
                      <option value="">-- None --</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
`;
content = content.replace(formHtml, newFormHtml);

// 5. Show physical machine in the list
const listHeader = `
                <div className="grid grid-cols-12 px-5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[10px] font-semibold uppercase tracking-widest text-muted sticky top-0">
                  <div className="col-span-6">Name</div>
                  <div className="col-span-3 text-right">Hr Rate</div>
                  <div className="col-span-3 text-right">Set Time</div>
                </div>
`;
const newListHeader = `
                <div className="grid grid-cols-12 px-5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[10px] font-semibold uppercase tracking-widest text-muted sticky top-0">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Assigned Machine</div>
                  <div className="col-span-2 text-right">Hr Rate</div>
                  <div className="col-span-3 text-right">Set Time</div>
                </div>
`;
content = content.replace(listHeader, newListHeader);

const listItem = `
                    <div key={op.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5 table-row-hover transition-colors">
                      <div className="col-span-6 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-primary truncate">{op.name}</span>
                      </div>
                      <div className="col-span-3 text-right font-mono text-xs text-secondary">{formatCurrency(op.hrRate)}</div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <span className="font-mono text-xs text-secondary">{formatCurrency(op.setTimeRate)}</span>
`;
const newListItem = `
                    <div key={op.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5 table-row-hover transition-colors">
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-primary truncate">{op.name}</span>
                      </div>
                      <div className="col-span-3">
                        {op.machineId ? <Badge size="sm" variant="default" value={machines.find(m => m.id === op.machineId)?.name || op.machineId} /> : <span className="text-[10px] text-muted italic">Unassigned</span>}
                      </div>
                      <div className="col-span-2 text-right font-mono text-xs text-secondary">{formatCurrency(op.hrRate)}</div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <span className="font-mono text-xs text-secondary">{formatCurrency(op.setTimeRate)}</span>
`;
content = content.replace(listItem, newListItem);

fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');
console.log('Fixed opForm and machine dropdown in Machinery.tsx');