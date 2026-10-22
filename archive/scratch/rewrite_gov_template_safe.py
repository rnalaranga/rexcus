import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

start_str = "  if (template.startsWith('government')) {"
end_str = "  const tmpl = TEMPLATES.find("

si = content.find(start_str)
ei = content.find(end_str)

if si == -1 or ei == -1:
    print(f"Error: si={si} ei={ei}")
    sys.exit(1)

new_template = """  if (template.startsWith('government')) {
    const isInclusive = template === 'government_inclusive';
    const borderColor = '#64748b'; // Not too dark
    
    return (
      <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1a1a1a', fontSize: 11, lineHeight: 1.5, padding: '10mm', width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* MAIN OUTER BORDER */}
        <div style={{ border: `1.2px solid ${borderColor}` }}>
          
          {/* TITLE */}
          <div style={{ textAlign: 'center', padding: '10px', borderBottom: `1.2px solid ${borderColor}`, fontSize: 24, fontWeight: '800' }}>
            Tax Invoice
          </div>

          {/* DATE & INVOICE NO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ padding: '6px 12px', borderRight: `1.2px solid ${borderColor}`, display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Date of Invoice</span>
              <span>:</span>
              <span>{date.split('-').reverse().join('-')}</span>
            </div>
            <div style={{ padding: '6px 12px', display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Tax Invoice No.</span>
              <span>:</span>
              <span>{docNo}</span>
            </div>
          </div>

          {/* SUPPLIER & PURCHASER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}`, minHeight: '140px' }}>
            {/* Supplier */}
            <div style={{ padding: '8px 12px', borderRight: `1.2px solid ${borderColor}` }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  {company.vat && (
                    <tr>
                      <td style={{ fontWeight: '700', width: '100px', verticalAlign: 'top' }}>Supplier's TIN</td>
                      <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{company.vat}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>Supplier's Name</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{company.name || 'Your Company'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Address</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8, whiteSpace: 'pre-wrap' }}>{company.address}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Telephone No</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>{company.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Purchaser */}
            <div style={{ padding: '8px 12px' }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  {customerVat && (
                    <tr>
                      <td style={{ fontWeight: '700', width: '100px', verticalAlign: 'top' }}>Purchaser's TIN</td>
                      <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{customerVat}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>Purchaser's Name</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>
                      {customer?.company || customer?.name || '-'}
                      {customer?.name && customer?.company && <><br/>{customer.name}</>}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Address</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8, whiteSpace: 'pre-wrap' }}>{customer?.address || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Telephone No</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>{customer?.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DELIVERY & PLACE OF SUPPLY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ padding: '6px 12px', borderRight: `1.2px solid ${borderColor}`, display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Date of Deliver</span>
              <span>:</span>
              <span>{deliveryDate ? deliveryDate.split('-').reverse().join('-') : '-'}</span>
            </div>
            <div style={{ padding: '6px 12px', display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Place Of Supply</span>
              <span>:</span>
              <span>{placeOfSupply || '-'}</span>
            </div>
          </div>

          {/* ADDITIONAL INFO */}
          <div style={{ padding: '8px 12px', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Additional Information if any</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '90px' }}>Quotation no</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td>{quotationNo || '-'}</td>
                  </tr>
                  <tr>
                    <td>ORDER NO</td>
                    <td>:</td>
                    <td>{orderNo || '-'}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '90px' }}>Dispatch no</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td>{dispatchNo || '-'}</td>
                  </tr>
                  <tr>
                    <td>Po no</td>
                    <td>:</td>
                    <td>{poNo || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1.2px solid ${borderColor}` }}>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '40px' }}>Reference</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>Description of Goods Or Services</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '70px' }}>Quantity</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '90px' }}>Unit Price</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', width: '100px' }}>
                  {isInclusive ? <>Amount<br/>Inclusive VAT</> : <>Amount<br/>Excluding VAT</>}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const lineVal = item.qty * item.unitPrice;
                const lineTax = lineVal * (getTaxRate(item.taxRateId) / 100);
                const displayVal = isInclusive ? lineVal + lineTax : lineVal;
                return (
                  <tr key={idx}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{idx + 1}.</td>
                    <td style={{ padding: '8px', borderRight: `1.2px solid ${borderColor}`, whiteSpace: 'pre-wrap', verticalAlign: 'top', fontWeight: '700' }}>{item.description}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{Number(item.qty).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', verticalAlign: 'top' }}>{displayVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              {/* Extra spacing row to push totals down slightly */}
              <tr>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px' }}></td>
              </tr>
            </tbody>
          </table>

          {/* TOTALS */}
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
            )}
            <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
              <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>
                Grand Total <span style={{ marginLeft: '10px', fontSize: 9 }}>LKR</span>
              </div>
              <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* IN WORDS */}
          <div style={{ padding: '6px 12px', borderBottom: `1.2px solid ${borderColor}`, fontWeight: '700', fontSize: 10 }}>
            LKR {toWords(total)} Only
          </div>

          {/* PAYMENT MODE */}
          <div style={{ padding: '6px 12px', borderBottom: `1.2px solid ${borderColor}`, display: 'flex', gap: '20px' }}>
            <span style={{ fontWeight: '700' }}>Mode of payment :</span>
            <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>Credit</span>
          </div>

          {/* FOOTER AREA */}
          <div style={{ padding: '12px' }}>
            <div style={{ fontWeight: '700', marginBottom: '8px' }}>Cheque to be written in favor of {company.name}</div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Bank details</div>
            <table style={{ border: 'none', fontSize: 11, marginBottom: '10px' }}>
              <tbody>
                <tr><td style={{ width: '100px' }}>Account Name</td><td style={{ width: '15px' }}>:</td><td>{company.name}</td></tr>
                {company.bankName && <tr><td>Bank</td><td>:</td><td>{company.bankName}</td></tr>}
                {company.accountNo && <tr><td>Account No</td><td>:</td><td>{company.accountNo}</td></tr>}
                {company.branch && <tr><td>Branch</td><td>:</td><td>{company.branch}</td></tr>}
              </tbody>
            </table>
            
            <div>Thanking You</div>
            <div style={{ marginBottom: '40px' }}>Yours faithfully</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginTop: '50px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1.2px dotted #1a1a1a', paddingTop: '4px', paddingLeft: '20px', paddingRight: '20px' }}>Manager/Authorized Officer</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1.2px dotted #1a1a1a', paddingTop: '4px', paddingLeft: '20px', paddingRight: '20px' }}>Signature of Recipient</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
"""

content = content[:si] + new_template + content[ei:]

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Replaced gov template safely")
