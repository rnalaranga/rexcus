const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const bomBlockRegex = /\s*\{\/\* BOM Display \*\/\}\s*\{trackWO\.bom && \([\s\S]*?<\/div>\s*\)\}\s*/;
const match = content.match(bomBlockRegex);
if(match) {
  content = content.replace(bomBlockRegex, '\n'); // remove it from the wrong place
  
  const targetRegex = /(<Badge value=\{trackWO\.priority\}[^>]*\/>\s*<\/div>)\s*(<div className="space-y-3">)/;
  
  content = content.replace(targetRegex, `$1\n${match[0]}\n$2`);
  
  fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
  console.log("Moved BOM successfully");
} else {
  console.log("Could not find BOM block");
}