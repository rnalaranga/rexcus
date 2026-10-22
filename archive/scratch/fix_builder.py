import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    builder = f.read()

# Fix the 0 issue
old_credit = "{Number(selectedCustomer.creditDays) > 0 && <p className=\"text-[10px] text-emerald-500 font-bold\">Payment Terms: {selectedCustomer.creditDays} Days</p>}"
new_credit = "{Number(selectedCustomer.creditDays) > 0 ? <p className=\"text-[10px] text-emerald-500 font-bold\">Payment Terms: {selectedCustomer.creditDays} Days</p> : null}"
builder = builder.replace(old_credit, new_credit)

# Change TEMPLATES array
old_templates = """export const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'Clean minimal white', color: '#1e1e2e', accent: '#2563eb' },
  { id: 'modern',  name: 'Modern',  description: 'Bold dark gradient',  color: '#0f172a', accent: '#b91c1c' },
  { id: 'elegant', name: 'Elegant', description: 'Light professional',   color: '#374151', accent: '#059669' },
];"""

new_templates = """export const TEMPLATES = [
  { id: 'government', name: 'VAT Separate', description: 'Standard Tax Invoice (VAT added to total)', color: '#000000', accent: '#000000' },
  { id: 'government_inclusive', name: 'VAT Included', description: 'Tax Invoice (Prices inclusive of VAT)', color: '#000000', accent: '#000000' }
];"""
builder = builder.replace(old_templates, new_templates)

# Update InvoicePreview to handle both templates
# First, change `if (template === 'government')` to `if (template.startsWith('government'))`
builder = builder.replace("if (template === 'government')", "if (template.startsWith('government'))")

# Update table headers based on template
old_headers = """                <td style={{ borderRight: '2px solid #000', padding: 6, width: 40, textAlign: 'center' }}>QTY</td>
                <td style={{ borderRight: '2px solid #000', padding: 6, width: 100, textAlign: 'right' }}>UNIT PRICE (Rs)</td>
                <td style={{ padding: 6, width: 100, textAlign: 'right' }}>VALUE (Rs)</td>"""
new_headers = """                <td style={{ borderRight: '2px solid #000', padding: 6, width: 40, textAlign: 'center' }}>QTY</td>
                <td style={{ borderRight: '2px solid #000', padding: 6, width: 100, textAlign: 'right' }}>UNIT PRICE (Rs)</td>
                <td style={{ padding: 6, width: 100, textAlign: 'right' }}>{template === 'government_inclusive' ? 'TOTAL VALUE (Rs)' : 'VALUE (Rs)'}</td>"""
builder = builder.replace(old_headers, new_headers)

# Update totals section
# The current totals section has SUB TOTAL, VAT 18%, and TOTAL
# We will make it conditional based on template
old_totals = """            <tr style={{ height: '100%' }}>
              <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>SUB TOTAL</td>
              <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>VAT 18% (if any)</td>
              <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(taxAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>TOTAL LKR</td>
              <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(total)}</td>
            </tr>"""

new_totals = """            {template === 'government' ? (
              <>
                <tr style={{ height: '100%' }}>
                  <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>SUB TOTAL</td>
                  <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>VAT 18% (if any)</td>
                  <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(taxAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>TOTAL LKR</td>
                  <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(total)}</td>
                </tr>
              </>
            ) : (
              <tr style={{ height: '100%' }}>
                <td colSpan={4} style={{ borderTop: '2px solid #000', borderRight: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>GRAND TOTAL LKR</td>
                <td style={{ borderTop: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'right' }}>{formatCurrency(total)}</td>
              </tr>
            )}"""
builder = builder.replace(old_totals, new_totals)

# Also fix initial template state which was set to 'classic'
builder = builder.replace("const [template, setTemplate] = useState('classic');", "const [template, setTemplate] = useState('government');")

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(builder)
