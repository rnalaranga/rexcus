import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Update hooks
hooks_find = "  const { data: taxRates } = useTaxes();"
hooks_rep = "  const { data: taxRates } = useTaxes();\n  const { data: taxProfiles } = useTaxProfiles();"
content = content.replace(hooks_find, hooks_rep)

import_find = "import { useTaxes } from '@/hooks/useFinance';"
import_rep = "import { useTaxes, useTaxProfiles } from '@/hooks/useFinance';"
content = content.replace(import_find, import_rep)

# 2. Calculation logic
calc_find = """  let taxAmount = 0;
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
  }"""

calc_rep = """  let taxAmount = 0;
  let ssclAmount = 0;
  let vatAmount = 0;
  
  const selectedProfile = taxProfiles?.find((p: any) => p.id === taxType);
  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    
    ssclAmount = subtotal * t1;
    if (selectedProfile.tax2_compound) {
      vatAmount = (subtotal + ssclAmount) * t2;
    } else {
      vatAmount = subtotal * t2;
    }
    taxAmount = ssclAmount + vatAmount;
  } else if (taxType === 'line_items') {
    taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  }"""
content = content.replace(calc_find, calc_rep)

# 3. Dropdown UI
dropdown_find = """              <select
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded focus:border-theme focus:ring-1 focus:ring-theme outline-none transition-all"
                value={taxType}
                onChange={e => setTaxType(e.target.value)}
              >
                <option value="none">No Tax</option>
                <option value="vat">VAT (18%)</option>
                <option value="vat_sscl">VAT (18%) + SSCL (2.5%)</option>
                <option value="line_items">Line Item Taxes</option>
              </select>"""

dropdown_rep = """              <select
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded focus:border-theme focus:ring-1 focus:ring-theme outline-none transition-all"
                value={taxType}
                onChange={e => setTaxType(e.target.value)}
              >
                <option value="none">No Tax</option>
                {taxProfiles?.map((tp: any) => (
                  <option key={tp.id} value={tp.id}>{tp.name}</option>
                ))}
                <option value="line_items">Line Item Taxes</option>
              </select>"""
content = content.replace(dropdown_find, dropdown_rep)

# 4. Preview Props - Send the actual profile labels instead of hardcoded SSCL/VAT
props_find = "const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, ssclAmount, vatAmount"
props_rep = "const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, ssclAmount, vatAmount, selectedProfile"
content = content.replace(props_find, props_rep)

# Also update the preview props passing
pass_find = "taxRates, taxType, ssclAmount, vatAmount };"
pass_rep = "taxRates, taxType, ssclAmount, vatAmount, selectedProfile };"
content = content.replace(pass_find, pass_rep)

# 5. Preview rendering
prev_totals_find = """                {taxType === 'vat_sscl' && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      SSCL <span style={{ marginLeft: '20px' }}>2.50 %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {ssclAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {taxType !== 'none' && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      VAT <span style={{ marginLeft: '20px' }}>{taxType === 'line_items' ? 'As per items' : '18.00 %'}</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {(taxType === 'vat_sscl' ? vatAmount : taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}"""

prev_totals_rep = """                {selectedProfile?.tax2_name && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile.tax1_name} <span style={{ marginLeft: '20px' }}>{selectedProfile.tax1_rate} %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {ssclAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {taxType !== 'none' && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile?.tax2_name || selectedProfile?.tax1_name || 'Tax'} <span style={{ marginLeft: '20px' }}>{taxType === 'line_items' ? 'As per items' : `${selectedProfile?.tax2_name ? selectedProfile.tax2_rate : selectedProfile?.tax1_rate} %`}</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {(selectedProfile?.tax2_name ? vatAmount : taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}"""
content = content.replace(prev_totals_find, prev_totals_rep)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated InvoiceBuilder to fetch taxProfiles")
