import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

code = code.replace("label: `${c.name} (${c.company})`", "label: c.company ? `${c.company} (${c.name})` : c.name")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

