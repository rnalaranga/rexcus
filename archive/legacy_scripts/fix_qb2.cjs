const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Fix import
if (!content.includes('useMachiningOperations')) {
  content = content.replace(
    "import { useLeads, useInventory, useSettings } from '@/hooks/useData'",
    "import { useLeads, useInventory, useSettings, useMachiningOperations } from '@/hooks/useData'"
  );
}

// Remove old autoGenerateCustomerQuote
content = content.replace(
  /const autoGenerateCustomerQuote = \(\) => \{\n\s*if \(jobItems\.length[\s\S]*?showToast\('success', `✨ Auto-generated Customer Quote with \$\{margin\}% margin!`\);\n\s*\};\n\n\s*const autoGenerateCustomerQuote = \(\) => \{/,
  "const autoGenerateCustomerQuote = () => {"
);

// Fix st.rate
content = content.replace(/Number\(st\.rate\)/g, "Number(st.rate || 0)");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');