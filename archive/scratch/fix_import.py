import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    builder = f.read()

builder = builder.replace("mport React", "import React")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(builder)

with open('src/components/finance/InvoicePreview.tsx', 'r') as f:
    preview = f.read()

preview = preview.replace("export \n", "")
if "export const InvoicePreview" not in preview:
    preview = preview.replace("const InvoicePreview", "export const InvoicePreview")

with open('src/components/finance/InvoicePreview.tsx', 'w') as f:
    f.write(preview)
