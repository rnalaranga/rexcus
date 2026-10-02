import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

hook_find = "const { data: leads, loading } = useLeads()"
hook_rep = "const { data: leads, loading } = useLeads()\n  const { data: customers } = useCustomers(true)"
content = content.replace(hook_find, hook_rep)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added useCustomers hook correctly")
