const fs = require('fs');

// --- QuotationBuilder.tsx ---
let qb = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// The math logic
qb = qb.replace(
  "const jobWithSSCL = jobTotalCost * 1.025",
  "const vatPct = Number(settings?.vat_percentage || 0);\n    const jobWithSSCL = jobTotalCost * (1 + (vatPct / 100));"
);
qb = qb.replace(
  "const custWithSSCL = custTotal * 1.025",
  "const vatPct = Number(settings?.vat_percentage || 0);\n  const custWithSSCL = custTotal * (1 + (vatPct / 100));"
);

// The preview markup logic
qb = qb.replace(
  /<span className="text-\[10px\] font-semibold uppercase text-muted tracking-widest">SSCL \(2\.5%\)<\/span>/g,
  `<span className="text-[10px] font-semibold uppercase text-muted tracking-widest">VAT ({Number(settings?.vat_percentage || 0)}%)</span>`
);
qb = qb.replace(
  /<td className="py-2 px-4 text-xs font-semibold text-slate-500 text-right">SSCL Tax \(2\.5%\)<\/td>/g,
  `<td className="py-2 px-4 text-xs font-semibold text-slate-500 text-right">VAT Tax ({Number(settings?.vat_percentage || 0)}%)</td>`
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', qb, 'utf8');


// --- QuotationPrintView.tsx ---
let qpv = fs.readFileSync('src/components/QuotationPrintView.tsx', 'utf8');

qpv = qpv.replace(
  `<div className="w-[65%] text-right pr-6">VAT (SSCL)</div>
              <div className="w-[15%] text-center">2.50 %</div>`,
  `<div className="w-[65%] text-right pr-6">VAT</div>
              <div className="w-[15%] text-center">{Number(settings?.vat_percentage || 0).toFixed(2)} %</div>`
);

qpv = qpv.replace(
  `{formatCurrency(quotationType === 'job' ? jobTotals.totalCost * 0.025 : custTotals.total * 0.025).replace('Rs.','').trim()}`,
  `{formatCurrency(quotationType === 'job' ? jobTotals.totalCost * (Number(settings?.vat_percentage || 0) / 100) : custTotals.total * (Number(settings?.vat_percentage || 0) / 100)).replace('Rs.','').trim()}`
);

fs.writeFileSync('src/components/QuotationPrintView.tsx', qpv, 'utf8');