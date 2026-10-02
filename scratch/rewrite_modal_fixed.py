import sys

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    content = f.read()

start_str = "{viewInvoice && ("
end_str = "      {/* Delete Confirmation Modal */}"

si = content.find(start_str)
ei = content.find(end_str)

if si == -1 or ei == -1:
    print(f"Error finding markers si={si}, ei={ei}")
    sys.exit(1)

new_modal = """{viewInvoice && (
        <Modal isOpen={true} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.id}`} size="2xl" className="rounded-2xl">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left side: Invoice Preview */}
            <div className="flex-1 bg-[#525659] p-4 lg:p-8 max-h-[85vh] overflow-y-auto flex justify-center border-r border-theme-subtle">
              <div className="shadow-2xl">
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
            </div>
            
            {/* Right side: Sidebar (Payments & Actions) */}
            <div className="w-full lg:w-80 flex flex-col bg-surface">
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Payment History</h4>
                  {viewInvoice.status !== 'paid' && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 px-2 rounded-md" onClick={() => setShowPaymentModal(true)}>
                      + Record
                    </Button>
                  )}
                </div>
                
                {viewInvoice.payments && JSON.parse(viewInvoice.payments).length > 0 ? (
                  <div className="space-y-2">
                    {JSON.parse(viewInvoice.payments).map((p: any, i: number) => (
                      <div key={i} className="bg-surface2 p-3 rounded-xl border border-theme-subtle">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold">{new Date(p.date).toLocaleDateString()}</p>
                          <span className="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(p.amount)}</span>
                        </div>
                        <p className="text-[10px] text-muted uppercase">{p.method} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-surface2/50 rounded-xl border border-dashed border-theme-subtle text-center">
                    <p className="text-[11px] text-muted italic">No payments recorded</p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-5 border-t border-theme-subtle bg-surface2/30">
                <p className="text-[10px] font-bold text-muted uppercase mb-3">Change Status</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['draft', 'sent', 'paid', 'overdue'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(viewInvoice.id, s)}
                      className={`text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg border transition-colors ${
                        viewInvoice.status === s 
                          ? 'bg-primary text-surface border-primary' 
                          : 'bg-surface text-muted border-theme-subtle hover:bg-surface2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" className="h-9 text-xs border border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={() => {
                      const content = document.getElementById('invoice-preview');
                      if (!content) return;
                      const win = window.open('', '_blank');
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${viewInvoice.id}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;justify-content:center}@page{size:A4;margin:0}@media print{body{margin:0;width:210mm;height:297mm}}</style></head><body>${content.innerHTML}</body></html>`);
                      win.document.close(); win.focus(); win.print();
                  }}>
                    Print / PDF
                  </Button>
                  <Button variant="ghost" className="h-9 text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(viewInvoice.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

"""

content = content[:si] + new_modal + content[ei:]

with open('src/pages/finance/Invoices.tsx', 'w') as f:
    f.write(content)

print("Modal replaced successfully")
