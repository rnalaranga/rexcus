const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

const regex = /\{ key: 'model', header: 'Model \/ Serial', render: \(v: any\) => <span className="text-\[10px\] text-muted">\{String\(v\)\}<\/span> \},/;

const replacement = `{ key: 'model', header: 'Model / Serial', render: (v: any) => <span className="text-[10px] text-muted">{String(v)}</span> },
      { key: 'operators', header: 'Assigned Operators', render: (v: any) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(v) && v.length > 0 ? v.map((op, i) => (
            <Badge key={i} value={op} variant="default" size="sm" />
          )) : <span className="text-[10px] text-muted italic">None</span>}
        </div>
      )},`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    console.log("Updated machineries columns via regex");
} else {
    console.log("Could not find machineries columns via regex");
}

fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');