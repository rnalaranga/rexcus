const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Replace the old print block with QuotationPrintView
const printBlockRegex = /<style>\{\`[\s\S]*?@media print[\s\S]*?<\/style>\s*<div id="print-section"[\s\S]*?This is a system generated quotation.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const newMarkup = `<QuotationPrintView 
            data={{
               docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
               custItems, custDiscount,
               custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
               custTerms, custValidity, custDelivery
            }}
            type={quotationType}
            lead={lead}
            settings={settings}
          />`;

if (printBlockRegex.test(content)) {
  content = content.replace(printBlockRegex, newMarkup);
} else {
  console.log("Regex failed to match the print block in QuotationBuilder.tsx");
}

// Ensure QuotationPrintView is imported
if (!content.includes('QuotationPrintView')) {
  content = content.replace(
    "import { GlassCard } from '@/components/ui/GlassCard'",
    "import { GlassCard } from '@/components/ui/GlassCard'\nimport { QuotationPrintView } from '@/components/QuotationPrintView'"
  );
}

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');