import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

code = code.replace("setSelectedLeadId(lead.id)", "setSelectedLeadId(lead.id)\n        if (!attention) setAttention(lead.name || '')")

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

