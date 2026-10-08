import re

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    code = f.read()

# Fix import
code = code.replace("import { useQuotations, useLeads, useTaxProfiles } from '@/hooks/useData'", "import { useQuotations, useLeads } from '@/hooks/useData'\nimport { useTaxProfiles } from '@/hooks/useFinance'")

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(code)
