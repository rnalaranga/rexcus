const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

if (!content.includes('import { useMachiningOperations } from')) {
  content = content.replace(
    "import { useLeads, useInventory, useSettings }",
    "import { useLeads, useInventory, useSettings, useMachiningOperations }"
  );
}

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');