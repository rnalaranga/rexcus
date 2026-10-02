import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Add state
state_find = "const [notes, setNotes] = useState('');"
state_rep = "const [notes, setNotes] = useState('');\n  const [taxType, setTaxType] = useState('none');"
content = content.replace(state_find, state_rep)

# 2. Update calculation
calc_find = """  const getTaxRate = (id: string) => { const t = taxRates.find((x: any) => x.id === id); return t ? Number(t.rate) : 0; };
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  const total = subtotal + taxAmount;"""

calc_rep = """  const getTaxRate = (id: string) => { const t = taxRates.find((x: any) => x.id === id); return t ? Number(t.rate) : 0; };
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  
  let taxAmount = 0;
  let ssclAmount = 0;
  let vatAmount = 0;
  if (taxType === 'vat') {
    vatAmount = subtotal * 0.18;
    taxAmount = vatAmount;
  } else if (taxType === 'vat_sscl') {
    ssclAmount = subtotal * 0.025;
    vatAmount = (subtotal + ssclAmount) * 0.18;
    taxAmount = ssclAmount + vatAmount;
  } else if (taxType === 'line_items') {
    taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  }
  
  const total = subtotal + taxAmount;"""
content = content.replace(calc_find, calc_rep)

# 3. Update payload
payload_find = "amount: total, notes, status: 'Unpaid', deliveryDate: deliveryDate || null, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat"
payload_rep = "amount: total, notes, status: 'Unpaid', deliveryDate: deliveryDate || null, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat, taxType"
content = content.replace(payload_find, payload_rep)

# 4. Update preview props
props_find = "taxRates };"
props_rep = "taxRates, taxType, ssclAmount, vatAmount };"
content = content.replace(props_find, props_rep)

# 5. Add Dropdown UI in builder settings (Left sidebar)
ui_find = """              <input 
                type="text" 
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded focus:border-theme focus:ring-1 focus:ring-theme outline-none transition-all" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter notes..."
              />
            </div>"""
ui_rep = """              <input 
                type="text" 
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded focus:border-theme focus:ring-1 focus:ring-theme outline-none transition-all" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter notes..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Tax Profile</label>
              <select
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded focus:border-theme focus:ring-1 focus:ring-theme outline-none transition-all"
                value={taxType}
                onChange={e => setTaxType(e.target.value)}
              >
                <option value="none">No Tax</option>
                <option value="vat">VAT (18%)</option>
                <option value="vat_sscl">VAT (18%) + SSCL (2.5%)</option>
                <option value="line_items">Line Item Taxes</option>
              </select>
            </div>"""
content = content.replace(ui_find, ui_rep)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated InvoiceBuilder for tax types")
