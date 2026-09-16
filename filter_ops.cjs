const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

const regex = /const operations = Object\.keys\(procState\)\.map\(k => \(\{\s*operationName: k,\s*plannedHours: Number\(procState\[k\]\.estHr\) \|\| Number\(procState\[k\]\.quoHr\) \|\| 0\s*\}\)\);/g;

const newStr = `const operations = Object.keys(procState).map(k => ({
        operationName: k,
        plannedHours: Number(procState[k].estHr) || Number(procState[k].quoHr) || 0
      })).filter(op => op.plannedHours > 0);`;
      
content = content.replace(regex, newStr);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');