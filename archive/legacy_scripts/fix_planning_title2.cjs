const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// Dashboard table reversal
const tableColOld = `<p className="text-sm font-semibold font-mono text-primary truncate">{row.id}</p><p className="text-[10px] text-muted truncate">{row.title}</p>`;
const tableColNew = `<p className="text-sm font-semibold text-primary truncate">{row.title}</p><p className="text-[10px] text-muted font-mono">{row.id}</p>`;
content = content.replace(tableColOld, tableColNew);

// Labor Planning Card reversal
const planningRegex = /<div key=\{idx\} className="p-3 bg-surface hover:bg-surface2\/30 transition-colors border-b border-theme-subtle\/50 last:border-0">[\s\S]*?<\/div>\s*<\/div>/g;

const planningNew = `<div key={idx} className="p-3 bg-surface hover:bg-surface2/30 transition-colors border-b border-theme-subtle/50 last:border-0">
                          <div className="flex justify-between items-start mb-1.5">
                            <p className="text-xs font-bold text-primary leading-tight pr-2" title={op.woTitle}>{op.woTitle}</p>
                            <span className={\`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full \${op.status === 'Completed' ? 'bg-green-500/10 text-green-600' : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' : 'bg-surface2 text-muted'}\`}>{op.status}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[11px] text-secondary font-semibold flex items-center gap-1.5"><Settings size={12} className="shrink-0 text-rex-500/70"/> {op.operationName}</p>
                            <span className="text-[9px] font-mono font-bold text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">{op.woId}</span>
                          </div>
                        </div>
                      </div>`;

const matches = content.match(planningRegex);
if (matches) {
    content = content.replace(matches[0], planningNew);
    console.log("Labor Planning updated to show title prominently");
} else {
    console.log("Could not find Labor Planning regex");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');