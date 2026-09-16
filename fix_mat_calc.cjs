const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

const oldLogic = `      let price = qty * up
      if (isRod && nm.dia && nm.length) {
        price = Math.PI * Math.pow(Number(nm.dia) / 2, 2) * Number(nm.length) * density * up * qty
      } else if (!isRod && nm.width && nm.length && nm.thick) {
        price = Number(nm.width) * Number(nm.length) * Number(nm.thick) * density * up * qty
      }`;

const newLogic = `      let price = qty * up; // Simply multiply qty * unitPrice as requested`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');