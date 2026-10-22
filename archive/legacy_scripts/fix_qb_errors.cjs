const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Fix duplicate vatPct
content = content.replace(/const vatPct = Number\(settings\?\.vat_percentage \|\| 0\);\s*const custWithSSCL/, 'const custWithSSCL');

// Fix missing import
if (!content.includes('import { QuotationPrintView }')) {
  content = content.replace(
    "import { GlassCard } from '@/components/ui/GlassCard'",
    "import { GlassCard } from '@/components/ui/GlassCard'\nimport { QuotationPrintView } from '@/components/QuotationPrintView'"
  );
}

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');