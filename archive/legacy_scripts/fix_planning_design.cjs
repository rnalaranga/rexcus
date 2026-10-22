const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /<div key=\{idx\} className="p-3 bg-surface hover:bg-surface2\/30 transition-colors">[\s\S]*?<\/div>/;
const newRender = `<div key={idx} className="p-3 bg-surface hover:bg-surface2/30 transition-colors border-b border-theme-subtle/50 last:border-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-mono font-black text-rex-600 bg-rex-500/10 px-2 py-0.5 rounded-md border border-rex-500/20">{op.woId}</span>
                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${op.status === 'Completed' ? 'bg-green-500/10 text-green-600' : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>
                          </div>
                          <p className="text-sm font-bold text-primary truncate mb-1">{op.operationName}</p>
                          <p className="text-[10px] text-muted truncate flex items-center gap-1"><ClipboardList size={10} className="shrink-0 opacity-50"/> {op.woTitle}</p>
                        </div>`;

if (content.includes("op.woTitle")) {
    const listMatches = content.match(/<div key=\{idx\} className="p-3 bg-surface hover:bg-surface2\/30 transition-colors">[\s\S]*?<\/div>\s*<\/div>/g);
    if (listMatches && listMatches.length > 0) {
      const targetStr = listMatches[0].replace('</div>\n                      </div>', '</div>');
      content = content.replace(/<div key=\{idx\} className="p-3 bg-surface hover:bg-surface2\/30 transition-colors">\s*<div className="flex justify-between items-start mb-1\.5">\s*<p className="text-xs font-bold text-primary truncate">\{op\.operationName\}<\/p>\s*<span className=\{`text-\[9px\] font-bold px-1\.5 py-0\.5 rounded-full \$\{op\.status === 'Completed' \? 'bg-green-500\/10 text-green-600' : op\.status === 'In Progress' \? 'bg-blue-500\/10 text-blue-600' : 'bg-surface2 text-muted'\}`\}>\{op\.status\}<\/span>\s*<\/div>\s*<div className="flex items-center gap-2">\s*<span className="text-\[10px\] font-mono font-bold text-primary px-1\.5 py-0\.5 rounded bg-surface2 border border-theme-subtle">\{op\.woId\}<\/span>\s*<span className="text-\[10px\] text-secondary truncate">\{op\.woTitle\}<\/span>\s*<\/div>\s*<\/div>/, newRender);
      console.log("Updated Planning Card Design");
    } else {
      console.log("Could not find the exact block");
    }
}
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');