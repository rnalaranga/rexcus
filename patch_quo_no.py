import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    "const [quotationNo, setQuotationNo] = useState('AHSQ-' + Date.now().toString().slice(-4))",
    "const [quotationNo, setQuotationNo] = useState('')"
)

content = content.replace(
    "setQuotationNo(snap.quotationNo || 'AHSQ-' + Date.now().toString().slice(-4))",
    "setQuotationNo(snap.quotationNo || '')"
)

# I should also update the placeholder in the JSX to show it will be auto-generated
content = content.replace(
    '<input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)}\n                      className={docInputClass} />',
    '<input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)}\n                      placeholder="Auto-generated on selection" className={docInputClass} />'
)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated successfully')