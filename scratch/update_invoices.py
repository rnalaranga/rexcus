import sys

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    invoices = f.read()

start_marker = "title={`Invoice ${viewInvoice.id}`} size=\"lg\">"
end_marker = "</Modal>"

start_idx = invoices.find(start_marker)
if start_idx != -1:
    start_content = start_idx + len(start_marker)
    # Find the next </Modal>
    end_idx = invoices.find(end_marker, start_content)
    
    if end_idx != -1:
        old_content = invoices[start_content:end_idx]
        
        new_content = """
          <div className="p-6">
            <div className="bg-white text-black rounded-xl max-h-[60vh] overflow-y-auto mb-4 shadow-inner" style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-10%' }}>
              <InvoicePreview 
                template="government"
                docNo={viewInvoice.id}
                date={viewInvoice.date}
                dueDate={viewInvoice.dueDate}
                deliveryDate={viewInvoice.deliveryDate || viewInvoice.date}
                placeOfSupply={viewInvoice.placeOfSupply || ''}
                quotationNo={viewInvoice.quotationNo || viewInvoice.quotationId || ''}
                dispatchNo={viewInvoice.dispatchNo || ''}
                orderNo={viewInvoice.orderNo || ''}
                poNo={viewInvoice.poNo || ''}
                customer={leads?.find((l: any) => l.id === viewInvoice.customerId || l.id === viewInvoice.leadId) || { name: 'Unknown Customer', company: 'Unknown Company' }}
                customerVat={viewInvoice.customerVat || ''}
                items={viewInvoice.items ? JSON.parse(viewInvoice.items).map((i: any) => ({ description: i.desc || i.description, qty: Number(i.qty), unitPrice: Number(i.price || i.unitPrice) })) : []}
                subtotal={Number(viewInvoice.subtotal)}
                taxAmount={Number(viewInvoice.taxAmount || viewInvoice.tax || 0)}
                total={Number(viewInvoice.total)}
                notes={viewInvoice.notes || ''}
                company={settings}
                getTaxRate={() => 0}
                taxRates={[]}
              />
            </div>
            
            {/* Payments List */}
            <div className="mb-6 relative z-10">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Payment History</h4>
                {viewInvoice.status !== 'paid' && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs border border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setShowPaymentModal(true)}>
                    + Record Payment
                  </Button>
                )}
              </div>
              
              {viewInvoice.payments && JSON.parse(viewInvoice.payments).length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  {JSON.parse(viewInvoice.payments).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{new Date(p.date).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500 uppercase">{p.method} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                      </div>
                      <span className="font-mono font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No payments recorded yet.</p>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 mt-2 relative z-10">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold mr-2">Change Status:</p>
                {['draft', 'sent', 'paid', 'overdue'].map(s => (
                  <Button 
                    key={s} 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-3 text-xs uppercase tracking-wider ${viewInvoice.status === s ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    onClick={() => handleUpdateStatus(viewInvoice.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setViewInvoice(null)}>Close</Button>
                <Button variant="primary" onClick={() => {
                  const content = document.getElementById('invoice-preview');
                  if (!content) return;
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${viewInvoice.id}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;justify-content:center}@page{size:A4;margin:0}@media print{body{margin:0;width:210mm;height:297mm}}</style></head><body>${content.innerHTML}</body></html>`);
                  win.document.close(); win.focus(); win.print();
                }}>Print / PDF</Button>
              </div>
            </div>
          </div>
        """
        invoices = invoices.replace(old_content, new_content)
        
        with open('src/pages/finance/Invoices.tsx', 'w') as f:
            f.write(invoices)
        print("Updated Invoices.tsx successfully")
else:
    print("Failed to find start marker")
