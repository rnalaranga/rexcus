import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

target = "  const tmpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];"

gov_jsx = """
  if (template.startsWith('government')) {
    const isInclusive = template === 'government_inclusive';
    return (
      <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#000', fontSize: 12, lineHeight: 1.4, padding: '10mm 15mm', width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Logo and Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
          {company.logo ? (
            <img src={company.logo} alt="Logo" style={{ height: 70 }} />
          ) : (
             <div style={{ fontSize: 24, fontWeight: '900', color: '#dc2626' }}>{company.name}</div>
          )}
        </div>

        {/* Title */}
        <div style={{ border: '2px solid #000', textAlign: 'center', fontWeight: '900', fontSize: 20, padding: '6px', textTransform: 'uppercase' }}>
          Tax Invoice
        </div>
        
        {/* Dates and No */}
        <div style={{ display: 'flex', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', marginTop: 15 }}>
          <div style={{ flex: 1, padding: '6px 10px', borderRight: '2px solid #000', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Date :</span> <span>{date.split('-').reverse().join('-')}</span>
          </div>
          <div style={{ flex: 1, padding: '6px 10px', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Invoice no :</span> <span>{docNo}</span>
          </div>
        </div>

        {/* Supplier / Purchaser */}
        <div style={{ display: 'flex', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
          {/* Supplier */}
          <div style={{ flex: 1, padding: '10px 10px', borderRight: '2px solid #000' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Supplier</div>
            <div style={{ fontWeight: 'bold' }}>{company.name}</div>
            <div>{company.address}</div>
            <div style={{ marginTop: 6 }}><span style={{ fontWeight: 'bold' }}>VAT Registration No:</span> {company.vat || ''}</div>
          </div>
          {/* Purchaser */}
          <div style={{ flex: 1, padding: '10px 10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Purchaser</div>
            <div style={{ fontWeight: 'bold' }}>{customer?.name || ''}</div>
            <div>{customer?.address || ''}</div>
            <div style={{ marginTop: 6 }}><span style={{ fontWeight: 'bold' }}>VAT Registration No:</span> {customerVat || ''}</div>
          </div>
        </div>

        {/* Delivery Details */}
        <div style={{ display: 'flex', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
          <div style={{ flex: 1, padding: '6px 10px', borderRight: '2px solid #000', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Date of Delivery :</span> <span>{deliveryDate.split('-').reverse().join('-')}</span>
          </div>
          <div style={{ flex: 1, padding: '6px 10px', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Place Of Supply :</span> <span>{placeOfSupply || ''}</span>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: 10, marginTop: 15 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Additional Information if any</div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>Quotation no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{quotationNo || ''}</div>
            <div style={{ flex: 1 }}>Dispatch no &nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{dispatchNo || ''}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 4 }}>
            <div style={{ flex: 1 }}>ORDER NO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{orderNo || ''}</div>
            <div style={{ flex: 1 }}>Po no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{poNo || ''}</div>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginTop: 15 }}>
          <thead>
            <tr>
              <th style={{ border: '2px solid #000', padding: 6, textAlign: 'center', width: 50 }}>Ref</th>
              <th style={{ border: '2px solid #000', padding: 6, textAlign: 'center' }}>Description of Goods Or Services</th>
              <th style={{ border: '2px solid #000', padding: 6, textAlign: 'center', width: 60 }}>Qty</th>
              <th style={{ border: '2px solid #000', padding: 6, textAlign: 'center', width: 90 }}>Unit Price</th>
              <th style={{ border: '2px solid #000', padding: 6, textAlign: 'center', width: 110 }}>{isInclusive ? 'TOTAL VALUE' : 'Value Excluding VAT'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const lineVal = item.qty * item.unitPrice;
              const lineTax = lineVal * (getTaxRate(item.taxRateId) / 100);
              const displayVal = isInclusive ? lineVal + lineTax : lineVal;
              return (
                <tr key={item.id}>
                  <td style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>{idx + 1}.</td>
                  <td style={{ borderRight: '2px solid #000', padding: '8px 6px', fontWeight: 'bold', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{item.description}</td>
                  <td style={{ borderRight: '2px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>{item.qty.toFixed(2)}</td>
                  <td style={{ borderRight: '2px solid #000', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ borderRight: '2px solid #000', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>{displayVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              )
            })}
            <tr style={{ height: '100px' }}>
              <td style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
            </tr>
            {!isInclusive && (
              <>
                <tr>
                  <td colSpan={3} style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>Sub Total</td>
                  <td style={{ border: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'center' }}>LKR</td>
                  <td style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'center' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 100 }}>
                        <span>VAT</span>
                        <span>{taxAmount > 0 ? '18.00 %' : ''}</span>
                     </div>
                  </td>
                  <td style={{ border: '2px solid #000', padding: 6 }}></td>
                  <td style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'right' }}>{taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={3} style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
              <td style={{ border: '2px solid #000', padding: 6, fontWeight: 'bold', textAlign: 'center' }}>LKR</td>
              <td style={{ border: '2px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 10px', fontWeight: 'bold' }}>
          LKR {toWords(total)}
        </div>
        
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: 10, marginTop: 15 }}>
          <span style={{ fontWeight: 'bold' }}>Mode of payment :</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CREDIT
        </div>
        
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: 12, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 'bold' }}>Cheque to be written in favor of {company.name}</div>
          <div style={{ fontWeight: 'bold' }}>Bank details</div>
          <table style={{ width: '100%', border: 'none', marginBottom: 12 }}>
              <tbody>
                <tr><td style={{ width: 140 }}>Account Name</td><td>: {company.name}</td></tr>
                <tr><td>Bank</td><td>: {company.bankName}</td></tr>
                <tr><td>Account No</td><td>: {company.accountNo}</td></tr>
                <tr><td>Branch</td><td>: {company.branch || 'Head Office'}</td></tr>
              </tbody>
          </table>
          <div style={{ marginTop: 8 }}>Thanking You<br/>Yours faithfully</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60, textAlign: 'center' }}>
            <div>
              .......................................................................<br/>
              Manager/Authorized Officer
            </div>
            <div>
              .......................................................................<br/>
              Signature of Recipient
            </div>
          </div>
        </div>
      </div>
    );
  }
"""

if target in content and "if (template.startsWith('government')) {" not in content:
    content = content.replace(target, gov_jsx + "\n" + target)
    with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
        f.write(content)
    print("Injected government template!")
else:
    print("Could not inject or already injected")
