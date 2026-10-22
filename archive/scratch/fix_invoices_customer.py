import sys

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    content = f.read()

# 1. Add useCustomers
import_find = "import { useInvoices, useLeads } from '@/hooks/useData'"
import_rep = "import { useInvoices, useLeads, useCustomers } from '@/hooks/useData'"
content = content.replace(import_find, import_rep)

# 2. Add hook
hook_find = "  const { data: leads } = useLeads()"
hook_rep = "  const { data: leads } = useLeads()\n  const { data: customers } = useCustomers()"
content = content.replace(hook_find, hook_rep)

# 3. Update customer matching
match_find = "customer={leads?.find((l: any) => l.id === viewInvoice.customerId || l.id === viewInvoice.leadId) || { name: 'Unknown Customer', company: 'Unknown Company' }}"
match_rep = "customer={customers?.find((c: any) => c.id === viewInvoice.customerId) || leads?.find((l: any) => l.id === viewInvoice.customerId || l.id === viewInvoice.leadId) || { name: 'Unknown Customer', company: 'Unknown Company' }}"
content = content.replace(match_find, match_rep)

with open('src/pages/finance/Invoices.tsx', 'w') as f:
    f.write(content)
print("Fixed Invoices customer lookup")
