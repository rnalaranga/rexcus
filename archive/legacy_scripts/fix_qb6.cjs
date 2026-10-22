const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

content = content.replace(
  /const subTotal = Number\(st\.quoHr \|\| 0\) \* st\.rate/g,
  "const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0))"
);

content = content.replace(
  /Rs\. \{st\.rate\.toLocaleString\(\)\}/g,
  "Rs. {Number(st.hrRate || st.rate || 0).toLocaleString()}/hr | Rs. {Number(st.setTimeRate || 0).toLocaleString()}/set"
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');