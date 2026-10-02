import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# Make InvoicePreview exported
content = content.replace("const InvoicePreview: React.FC", "export const InvoicePreview: React.FC")

# Ensure TEMPLATES and toWords are exported if needed by Invoices, actually I can just copy them to Invoices or export them too
content = content.replace("const TEMPLATES", "export const TEMPLATES")
content = content.replace("function toWords", "export function toWords")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
