import re

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    code = f.read()

code = code.replace("const { data: quotations, loading, refetch } = useQuotations()", "const { data: quotations, loading, refetch } = useQuotations()\n  const { data: taxProfiles } = useTaxProfiles()")

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(code)
