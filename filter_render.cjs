const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

content = content.replace(
  "{trackWO.operations?.map((op: any, i: number) => {",
  "{trackWO.operations?.filter((o:any) => parseFloat(o.plannedHours) > 0).map((op: any, i: number) => {"
);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');