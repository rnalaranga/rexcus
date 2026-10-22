const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

// Add the Physical Machine dropdown
const searchForm = `<div className="w-28">\n                    <label className="block text-[10px] text-muted mb-1">SET TIME</label>\n                    <input required type="number" step="0.01" min="0" className="w-full input-base py-1.5 text-xs font-mono" value={opForm.setTimeRate} onChange={e => setOpForm({...opForm, setTimeRate: e.target.value})}/>\n                  </div>`;
const replaceForm = `
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
if (content.includes(searchForm)) {
    content = content.replace(searchForm, replaceForm);
    console.log("Form replaced.");
} else {
    // try a regex
    const reForm = /<div className="w-28">\s*<label className="block text-\[10px\] text-muted mb-1">SET TIME<\/label>\s*<input required type="number" step="0\.01" min="0" className="w-full input-base py-1\.5 text-xs font-mono" value=\{opForm\.setTimeRate\} onChange=\{e => setOpForm\(\{\.\.\.opForm, setTimeRate: e\.target\.value\}\)\}\/>\s*<\/div>/;
    if (reForm.test(content)) {
        content = content.replace(reForm, replaceForm);
        console.log("Form replaced via regex.");
    } else {
        console.log("Could not find Form to replace");
    }
}

// Update the List Header
const reListHeader = /<div className="grid grid-cols-12 px-5 py-2\.5 border-b border-theme-subtle bg-surface2\/40 text-\[10px\] font-semibold uppercase tracking-widest text-muted sticky top-0">\s*<div className="col-span-6">Name<\/div>\s*<div className="col-span-3 text-right">Hr Rate<\/div>\s*<div className="col-span-3 text-right">Set Time<\/div>\s*<\/div>/;
const replaceListHeader = `
                <div className="grid grid-cols-12 px-5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[10px] font-semibold uppercase tracking-widest text-muted sticky top-0">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Assigned Machine</div>
                  <div className="col-span-2 text-right">Hr Rate</div>
                  <div className="col-span-3 text-right">Set Time</div>
                </div>
`;
if (reListHeader.test(content)) {
    content = content.replace(reListHeader, replaceListHeader);
    console.log("List header replaced.");
} else {
    console.log("Could not find List Header");
}

// Update the List Item
const reListItem = /<div className="col-span-6 flex items-center gap-2 min-w-0">\s*<span className="text-xs font-medium text-primary truncate">\{op\.name\}<\/span>\s*<\/div>\s*<div className="col-span-3 text-right font-mono text-xs text-secondary">\{formatCurrency\(op\.hrRate\)\}<\/div>\s*<div className="col-span-3 flex items-center justify-end gap-4">\s*<span className="font-mono text-xs text-secondary">\{formatCurrency\(op\.setTimeRate\)\}<\/span>/;
const replaceListItem = `
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-primary truncate">{op.name}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        {op.machineId ? <Badge size="sm" variant="default" value={machines.find(m => m.id === op.machineId)?.name || op.machineId} /> : <span className="text-[10px] text-muted italic">Unassigned</span>}
                      </div>
                      <div className="col-span-2 text-right font-mono text-xs text-secondary">{formatCurrency(op.hrRate)}</div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <span className="font-mono text-xs text-secondary">{formatCurrency(op.setTimeRate)}</span>
`;
if (reListItem.test(content)) {
    content = content.replace(reListItem, replaceListItem);
    console.log("List item replaced.");
} else {
    console.log("Could not find List Item");
}

// Also type opForm with machineId if it isn't already
content = content.replace(/setOpForm\(\{ id: '', name: '', hrRate: '', setTimeRate: '' \}\)/g, "setOpForm({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })");
content = content.replace("const [opForm, setOpForm] = useState({ id: '', name: '', hrRate: '', setTimeRate: '' })", "const [opForm, setOpForm] = useState({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })");
content = content.replace("const handleEditOp = (op: any) => setOpForm({ id: op.id, name: op.name, hrRate: String(op.hrRate), setTimeRate: String(op.setTimeRate) })", "const handleEditOp = (op: any) => setOpForm({ id: op.id, name: op.name, hrRate: String(op.hrRate), setTimeRate: String(op.setTimeRate), machineId: op.machineId || '' })");
content = content.replace("const payload = { machineId: manageCategory.id, groupName: manageCategory.name, name: opForm.name, hrRate: Number(opForm.hrRate), setTimeRate: Number(opForm.setTimeRate) }", "const payload = { machineId: opForm.machineId || null, groupName: manageCategory.name, name: opForm.name, hrRate: Number(opForm.hrRate), setTimeRate: Number(opForm.setTimeRate) }");


fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');