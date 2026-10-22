import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

content = content.replace("{isInclusive ? 'Amount\nInclusive VAT' : 'Amount\nExcluding VAT'}", "{isInclusive ? <>Amount<br/>Inclusive VAT</> : <>Amount<br/>Excluding VAT</>}")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
