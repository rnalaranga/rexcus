import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

old_td = "<td style={{ padding: '7px 6px', fontWeight: 500 }}>{item.description || '—'}</td>"
new_td = "<td style={{ padding: '7px 6px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{item.description || '—'}</td>"
content = content.replace(old_td, new_td)

old_gov_td = "<td style={{ borderRight: '2px solid #000', padding: 6, fontWeight: 'bold' }}>{item.description}</td>"
new_gov_td = "<td style={{ borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{item.description}</td>"
content = content.replace(old_gov_td, new_gov_td)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
