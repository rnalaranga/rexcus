const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Leads.tsx', 'utf8');

code = code.replace(
  /<div className="flex gap-3 overflow-x-auto pb-2">/,
  '<div className="flex gap-3 overflow-x-auto pb-2 h-[calc(100vh-160px)]">'
);

code = code.replace(
  /className="flex-shrink-0 w-56"\s+onDragOver=\{handleDragOver\}/g,
  'className="flex-shrink-0 w-56 flex flex-col h-full"\n                onDragOver={handleDragOver}'
);

code = code.replace(
  /className={`glass px-3 py-2\.5 mb-2 \$\{stageColorBorder\[stage\] \|\| 'border-b-2 border-b-theme'\}`}/g,
  'className={`glass px-3 py-2.5 mb-2 shrink-0 ${stageColorBorder[stage] || \'border-b-2 border-b-theme\'}`}'
);

code = code.replace(
  /<div className="space-y-2 min-h-\[200px\]">/g,
  '<div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4 min-h-[200px] custom-scrollbar">'
);

fs.writeFileSync('src/pages/crm/Leads.tsx', code);
console.log('done');
