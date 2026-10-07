import re
with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

code = code.replace("taxProfile: selectedTaxProfile, taxBreakdown };", "taxProfile: selectedTaxProfile, taxBreakdown, attention };")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

