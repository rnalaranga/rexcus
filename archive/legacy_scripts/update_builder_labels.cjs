const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Replace SSCL (2.5%) with VAT (X%)
content = content.replace(
  /<span className="text-xs font-black uppercase text-primary">With SSCL \(2\.5%\)<\/span>/g,
  `<span className="text-xs font-black uppercase text-primary">With VAT ({Number(settings?.vat_percentage || 0)}%)</span>`
);

// Replace (inc SSCL)
content = content.replace(
  /\(inc SSCL\)/g,
  `(inc VAT)`
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');