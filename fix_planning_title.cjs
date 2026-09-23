const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /<p className="text-\[10px\] text-secondary truncate">\{op\.woTitle\} <span className="text-muted">\(\{op\.woId\}\)<\/span><\/p>/g;
const replacement = `<div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle">{op.woId}</span>
                            <span className="text-[10px] text-secondary truncate">{op.woTitle}</span>
                          </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    console.log("Updated woTitle and woId display");
} else {
    console.log("Could not find the target string via regex");
}
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');