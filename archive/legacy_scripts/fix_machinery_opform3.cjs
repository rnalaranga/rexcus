const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

const reListItem = /<div className="col-span-6 flex items-center gap-2 min-w-0">\s*<span className="text-xs font-medium text-primary truncate">\{op\.name\}<\/span>\s*<\/div>\s*<div className="col-span-3 text-right">\s*<span className="text-xs text-secondary font-mono">\{formatCurrency\(op\.hrRate\)\}<\/span>\s*<\/div>\s*<div className="col-span-3 flex items-center justify-end gap-4">\s*<span className="text-xs text-secondary font-mono">\{formatCurrency\(op\.setTimeRate\)\}<\/span>/;
const replaceListItem = `
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-primary truncate">{op.name}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        {op.machineId ? <Badge size="sm" variant="default" value={machines.find(m => m.id === op.machineId)?.name || op.machineId} /> : <span className="text-[10px] text-muted italic">Unassigned</span>}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-secondary font-mono">{formatCurrency(op.hrRate)}</span>
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <span className="text-xs text-secondary font-mono">{formatCurrency(op.setTimeRate)}</span>
`;
if (reListItem.test(content)) {
    content = content.replace(reListItem, replaceListItem);
    console.log("List item replaced.");
} else {
    console.log("Could not find List Item");
}

fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');