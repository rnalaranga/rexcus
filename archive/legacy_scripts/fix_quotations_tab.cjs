const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/CustomerDetail.tsx', 'utf8');

content = content.replace(
  "import { useCustomers, useDeals, useFollowups, useLeads } from '@/hooks/useData'",
  "import { useCustomers, useDeals, useFollowups, useLeads, useQuotations } from '@/hooks/useData'"
);

content = content.replace(
  /quotations.filter\(q => q.leadId === id\).length/g,
  "quotations.filter((q: any) => q.leadId === id).length"
);

content = content.replace(
  /quotations.filter\(q => q.leadId === id\).map\(q => \{/g,
  "quotations.filter((q: any) => q.leadId === id).map((q: any) => {"
);

fs.writeFileSync('src/pages/crm/CustomerDetail.tsx', content, 'utf8');