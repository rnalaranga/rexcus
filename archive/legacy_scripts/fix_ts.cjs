const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  /<GlassCard className="flex-1 min-w-0 p-0 overflow-hidden border border-theme-subtle flex flex-col" style={{ minHeight: 400 }}>/,
  '<GlassCard className="flex-1 min-w-0 p-0 overflow-hidden border border-theme-subtle flex flex-col min-h-[400px]">'
);

content = content.replace(
  /<GlassCard\s+className="p-0 border border-theme-subtle flex flex-col overflow-hidden"\s+style={{ maxHeight: 600 }}\s+onDragEnter/g,
  '<div className="bg-surface2/30 rounded-2xl p-0 border border-theme-subtle flex flex-col overflow-hidden max-h-[600px]" onDragEnter'
);

content = content.replace(
  /<\/div>\s*<\/GlassCard>\s*\{\/\* mini legend \*\/\}/g,
  '</div>\n                </div>\n\n                {/* mini legend */}'
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Fixed TS Errors');