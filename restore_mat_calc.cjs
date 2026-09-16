const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

const regex = /let price = qty \* up;/;
const oldLogic = `        const density = 0.00000785
        
        let price = qty * up
        if (isRod && nm.dia && nm.length) {
          price = Math.PI * Math.pow(Number(nm.dia) / 2, 2) * Number(nm.length) * density * up * qty
        } else if (!isRod && nm.width && nm.length && nm.thick) {
          price = Number(nm.width) * Number(nm.length) * Number(nm.thick) * density * up * qty
        }`;

content = content.replace(regex, oldLogic);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');