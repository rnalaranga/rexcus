import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

# For template 1
code = code.replace('{customer?.name && customer?.company && <><br/>{customer.name}</>}', '{customer?.name && customer?.company && <><br/>{customer.name}</>}\n                      {attention && <><br/>Attn: {attention}</>}')

# For template 2 (around line 360)
code = code.replace('<div style={{ fontWeight: 700, fontSize: 13 }}>{customer.name}</div>', '<div style={{ fontWeight: 700, fontSize: 13 }}>{customer.name}</div>\n              {attention && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Attn: {attention}</div>}')

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

