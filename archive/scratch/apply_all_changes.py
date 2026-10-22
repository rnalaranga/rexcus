import sys

# --- 1. UPDATE InvoicePreview.tsx ---
with open('src/components/finance/InvoicePreview.tsx', 'r') as f:
    preview = f.read()

# Add extra props
old_sig = "export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, customer, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates }) => {"
new_sig = "export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates }) => {"
preview = preview.replace(old_sig, new_sig)

# Government A4 style & Big Logo
old_gov_start = """  if (template === 'government') {
    return (
      <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#000', fontSize: 12, lineHeight: 1.4, padding: '20px' }}>
        
        {/* Title */}
        <div style={{ position: 'relative', border: '1px solid #000', textAlign: 'center', fontWeight: 'bold', fontSize: 20, padding: '6px' }}>
          {company.logo && <img src={company.logo} alt="Logo" style={{ height: 34, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />}
          Tax Invoice
        </div>"""

new_gov_start = """  if (template === 'government') {
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
        </div>"""
preview = preview.replace(old_gov_start, new_gov_start)

# Update borders
preview = preview.replace("borderLeft: '1px solid #000'", "borderLeft: '2px solid #000'")
preview = preview.replace("borderRight: '1px solid #000'", "borderRight: '2px solid #000'")
preview = preview.replace("borderBottom: '1px solid #000'", "borderBottom: '2px solid #000'")
preview = preview.replace("border: '1px solid #000'", "border: '2px solid #000'")

# Delivery Details
old_delivery = """        {/* Delivery Details */}
        <div style={{ display: 'flex', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
          <div style={{ flex: 1, padding: '6px 10px', borderRight: '2px solid #000', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Date of Deliver :</span> <span>{date.split('-').reverse().join('-')}</span>
          </div>
          <div style={{ flex: 1, padding: '6px 10px', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Place Of Supply :</span> <span>{customer?.city || ''}</span>
          </div>
        </div>"""
new_delivery = """        {/* Delivery Details */}
        <div style={{ display: 'flex', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
          <div style={{ flex: 1, padding: '6px 10px', borderRight: '2px solid #000', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Date of Deliver :</span> <span>{(deliveryDate || date).split('-').reverse().join('-')}</span>
          </div>
          <div style={{ flex: 1, padding: '6px 10px', display: 'flex', gap: 10 }}>
            <span style={{ fontWeight: 'bold' }}>Place Of Supply :</span> <span>{placeOfSupply || customer?.city || ''}</span>
          </div>
        </div>"""
preview = preview.replace(old_delivery, new_delivery)

# Additional Details
old_additional = """        {/* Additional Information */}
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: 10, marginTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Additional Information if any</div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>Quotation no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div style={{ flex: 1 }}>Dispatch no &nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </div>
          <div style={{ display: 'flex', marginTop: 4 }}>
            <div style={{ flex: 1 }}>ORDER NO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div style={{ flex: 1 }}>Po no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </div>
        </div>"""
new_additional = """        {/* Additional Information */}
        <div style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: 10, marginTop: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Additional Information if any</div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>Quotation no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {quotationNo}</div>
            <div style={{ flex: 1 }}>Dispatch no &nbsp;&nbsp;&nbsp;&nbsp;: {dispatchNo}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 4 }}>
            <div style={{ flex: 1 }}>ORDER NO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {orderNo}</div>
            <div style={{ flex: 1 }}>Po no &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {poNo}</div>
          </div>
        </div>"""
preview = preview.replace(old_additional, new_additional)

# Fill Blank Space
old_blank = """            <tr style={{ height: 120 }}>"""
new_blank = """            <tr style={{ height: 'auto' }}>
              <td style={{ borderLeft: '2px solid #000', borderRight: '2px solid #000', padding: '60px 0' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
              <td style={{ borderRight: '2px solid #000' }}></td>
            </tr>
            <tr style={{ height: '100%' }}>"""
preview = preview.replace(old_blank, new_blank)

# VAT
old_vat_gov = "<tr><td style={{ width: 110, fontWeight: 'bold', verticalAlign: 'top' }}>Purchaser's TIN</td><td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>: {customer?.vat || ''}</td></tr>"
new_vat_gov = "<tr><td style={{ width: 110, fontWeight: 'bold', verticalAlign: 'top' }}>Purchaser's TIN</td><td style={{ verticalAlign: 'top', fontWeight: 'bold' }}>: {customerVat || customer?.vat || ''}</td></tr>"
preview = preview.replace(old_vat_gov, new_vat_gov)

old_vat_std = "{customer.vat && <div style={{ color: '#6b7280', fontSize: 10 }}>VAT: {customer.vat}</div>}"
new_vat_std = "{(customerVat || customer.vat) && <div style={{ color: '#6b7280', fontSize: 10 }}>VAT: {customerVat || customer.vat}</div>}"
preview = preview.replace(old_vat_std, new_vat_std)

with open('src/components/finance/InvoicePreview.tsx', 'w') as f:
    f.write(preview)

# --- 2. UPDATE InvoiceBuilder.tsx ---
with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    builder = f.read()

# States
state_insertion = builder.find("const [items, setItems] = useState")
states = """  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [quotationNo, setQuotationNo] = useState('');
  const [dispatchNo, setDispatchNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [customerVat, setCustomerVat] = useState('');
"""
builder = builder[:state_insertion] + states + builder[state_insertion:]

# Notes behavior
builder = builder.replace("if (selectedCustomer.vat) setNotes(prev => prev.includes('Customer VAT') ? prev : `Customer VAT: ${selectedCustomer.vat}\\n` + prev);", "if (selectedCustomer.vat) setCustomerVat(selectedCustomer.vat);")

# Preview Props
old_props = "const previewProps = { template, docNo, date, dueDate, customer: selectedCustomer, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates };"
new_props = "const previewProps = { template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer: selectedCustomer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates };"
builder = builder.replace(old_props, new_props)

# handleSave
old_save = "createInvoice({ id: docNo, customerId, date, dueDate, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid' })"
new_save = "createInvoice({ id: docNo, customerId, date, dueDate, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid', deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat })"
builder = builder.replace(old_save, new_save)

# Bill To UI
old_billto = """                {selectedCustomer ? (
                  <div className="p-3 bg-surface2/60 rounded-xl border border-theme-subtle space-y-1.5">
                    <p className="text-sm font-bold text-primary">{selectedCustomer.company}</p>
                    {selectedCustomer.email && <p className="text-[10px] text-muted flex items-center gap-1.5"><Mail size={10} className="text-blue-400" />{selectedCustomer.email}</p>}
                    {selectedCustomer.phone && <p className="text-[10px] text-muted flex items-center gap-1.5"><Phone size={10} className="text-blue-400" />{selectedCustomer.phone}</p>}
                    {selectedCustomer.vat && <p className="text-[10px] text-muted flex items-center gap-1.5"><Hash size={10} className="text-amber-400" />VAT: {selectedCustomer.vat}</p>}
                    {Number(selectedCustomer.creditDays) > 0 && <p className="text-[10px] text-emerald-500 font-bold">Payment Terms: {selectedCustomer.creditDays} Days</p>}
                  </div>
                ) : ("""
new_billto = """                {selectedCustomer ? (
                  <div className="p-3 bg-surface2/60 rounded-xl border border-theme-subtle space-y-2">
                    <p className="text-sm font-bold text-primary">{selectedCustomer.company}</p>
                    <div className="flex items-center gap-3">
                      {selectedCustomer.email && <p className="text-[10px] text-muted flex items-center gap-1"><Mail size={10} className="text-blue-400" />{selectedCustomer.email}</p>}
                      {selectedCustomer.phone && <p className="text-[10px] text-muted flex items-center gap-1"><Phone size={10} className="text-blue-400" />{selectedCustomer.phone}</p>}
                    </div>
                    {Number(selectedCustomer.creditDays) > 0 && <p className="text-[10px] text-emerald-500 font-bold">Payment Terms: {selectedCustomer.creditDays} Days</p>}
                    <div className="mt-2 pt-2 border-t border-theme-subtle">
                      <label className="text-[9px] font-bold text-muted uppercase block mb-1">Purchaser's VAT / TIN (Override if needed)</label>
                      <input type="text" value={customerVat} onChange={e => setCustomerVat(e.target.value)} placeholder="Enter VAT Number..." className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-md text-xs outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>
                ) : ("""
builder = builder.replace(old_billto, new_billto)

# Details UI
old_details = """            <GlassCard className="p-5">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-blue-500" /> Invoice Details
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Invoice Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={docInputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={docInputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Notes / Terms</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={`${docInputClass} resize-none`} placeholder="Payment terms, delivery, etc." />
                </div>
              </div>
            </GlassCard>"""
new_details = """            <GlassCard className="p-5 flex flex-col">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-blue-500" /> Details & References
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Invoice Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={docInputClass} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Delivery Date</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Place of Supply</label>
                    <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="e.g. Negombo" className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-theme-subtle pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Quotation No</label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} placeholder="AHSQ-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Dispatch No</label>
                    <input type="text" value={dispatchNo} onChange={e => setDispatchNo(e.target.value)} placeholder="DN-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Order No (SO)</label>
                    <input type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="SO-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">PO No</label>
                    <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="PO-..." className={docInputClass} />
                  </div>
                </div>

                <div className="border-t border-theme-subtle pt-3">
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Notes / Terms</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${docInputClass} resize-none`} placeholder="Payment terms, delivery, etc." />
                </div>
              </div>
            </GlassCard>"""
builder = builder.replace(old_details, new_details)

# Print Style
old_print = 'win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docNo}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}@media print{body{margin:0}}</style></head><body>${content.innerHTML}</body></html>`);'
new_print = 'win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docNo}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;justify-content:center}@page{size:A4;margin:0}@media print{body{margin:0;width:210mm;height:297mm}}</style></head><body>${content.innerHTML}</body></html>`);'
builder = builder.replace(old_print, new_print)

# Add TemplatePicker inside InvoiceBuilder file if not extracted
if "TemplatePicker" not in builder:
    builder += """
const TemplatePicker = ({ current, onChange, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-surface p-6 rounded-xl border border-theme-subtle w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Select Template</h3>
        <div className="space-y-2">
          {TEMPLATES.map((t: any) => (
            <button key={t.id} onClick={() => { onChange(t.id); onClose(); }} className={`w-full text-left p-3 rounded-lg border ${current === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-theme-subtle hover:bg-surface2/50'}`}>
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-muted">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
"""

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(builder)

