import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# Add to preview component definition
prev_def = "const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates"
prev_def_rep = "const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, ssclAmount, vatAmount"
content = content.replace(prev_def, prev_def_rep)

# Find the Totals block in the government template
totals_find = """          {/* TOTALS */}
          <div style={{ borderTop: `1.2px solid ${borderColor}` }}>
            {!isInclusive && (
              <>
                <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                  <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>
                    Sub Total <span style={{ marginLeft: '10px', fontSize: 9 }}>LKR</span>
                  </div>
                  <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                    {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                  <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                    VAT <span style={{ marginLeft: '20px' }}>{taxAmount > 0 ? '18.00 %' : '0.00 %'}</span>
                  </div>
                  <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                    {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </>
            )}"""

totals_rep = """          {/* TOTALS */}
          <div style={{ borderTop: `1.2px solid ${borderColor}` }}>
            {!isInclusive && (
              <>
                <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                  <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>
                    Sub Total <span style={{ marginLeft: '10px', fontSize: 9 }}>LKR</span>
                  </div>
                  <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                    {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {taxType === 'vat_sscl' && (
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
                )}
              </>
            )}"""
            
content = content.replace(totals_find, totals_rep)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated InvoicePreview")
