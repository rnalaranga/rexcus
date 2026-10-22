const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Fix subTotal inside the map
content = content.replace(
  "const subTotal = Number(st.quoHr || 0) * st.rate",
  "const subTotal = (Number(st.quoHr || 0) + Number(st.setTime || 0)) * st.rate"
);

// Fix totalMachiningCost
content = content.replace(
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + Number(p.quoHr) * Number(p.rate), 0)",
  "const totalMachiningCost = Object.values(procState).reduce((s, p) => s + (Number(p.quoHr) + Number(p.setTime)) * Number(p.rate), 0)"
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');