const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /<span className="text-\[9px\] font-mono font-bold text-muted bg-surface2 px-1\.5 py-0\.5 rounded border border-theme-subtle">\{op\.woId\}<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*\}\)/;

const newStr = `<span className="text-[9px] font-mono font-bold text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">{op.woId}</span>
                          </div>
                        </div>
                )
              })`;

if (regex.test(content)) {
    content = content.replace(regex, newStr);
    console.log("Fixed JSX error");
} else {
    console.log("Could not find the exact pattern to replace");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');