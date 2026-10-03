import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

modals = """      <Modal isOpen={!!viewBomDialog} onClose={() => setViewBomDialog(null)} title={viewBomDialog?.title ? `Costing Details: ${viewBomDialog.title}` : "View Costing Details"} size="xl">
        {viewBomDialog && (
          <div className="bg-surface text-primary p-0 flex flex-col h-full rounded-b-xl overflow-hidden">
             {/* Header Summary Bar */}
             <div className="px-6 py-5 bg-gradient-to-r from-surface2 via-surface2/50 to-transparent border-b border-theme-subtle flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                   <Briefcase size={20} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-secondary">{viewBomDialog.title || 'Internal BOM Costing'}</p>
                   <p className="text-[11px] text-muted font-medium mt-0.5">Full Materials & Machining Breakdown</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Estimated Cost</p>
                 <p className="font-mono font-black text-primary text-2xl leading-none">{formatCurrency(viewBomDialog.bomTotal || 0)}</p>
               </div>
             </div>

             <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                 {/* Auto Materials */}
                 {viewBomDialog.autoMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-blue-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Plate / Rod Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5">Dimensions</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {viewBomDialog.autoMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 font-mono text-muted">{m.width ? `${m.width} x ${m.length}` : `Ø${m.dia} x ${m.length}`}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.platePrice || 0) + Number(m.shaftPrice || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Manual Materials */}
                 {viewBomDialog.manualMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-amber-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Manual Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5 text-right w-32">Unit Price</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {viewBomDialog.manualMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 text-right font-mono text-muted">{formatCurrency(m.unitPrice || 0)}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.unitPrice || 0)*Number(m.qty || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Machining */}
                 {viewBomDialog.procState && Object.keys(viewBomDialog.procState).length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Factory size={14} className="text-red-500" />
                       <h4 className="text-[12px] font-bold text-secondary uppercase tracking-widest">Machining Operations</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted font-bold">
                         <tr><th className="px-4 py-2.5">Process / Operation</th><th className="px-4 py-2.5 text-right w-24">Est. Hrs</th><th className="px-4 py-2.5 text-right w-24">Set Time</th><th className="px-4 py-2.5 text-right w-24 text-primary">Quo. Hrs</th><th className="px-4 py-2.5 text-right w-32">Sub Total</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-[11px]">
                         {Object.keys(viewBomDialog.procState).map((k: string) => {
                            const st = viewBomDialog.procState[k];
                            const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0));
                            if (subTotal === 0 && !st.estHr && !st.quoHr && !st.setTime) return null;
                            return (
                              <tr key={k} className="hover:bg-surface/50 transition-colors">
                                <td className="px-4 py-2 font-bold text-red-500/90">{k}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.estHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.setTime || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{st.quoHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(subTotal)}</td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
             </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!grnDialog} onClose={() => setGrnDialog(null)} title="Receive Customer Sample (GRN)" size="md">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Items Received (Details/Qty)</label>
              <textarea 
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary" 
                rows={4}
                value={grnDialog?.items || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, items: e.target.value } : null)}
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Received Date</label>
              <input 
                type="date"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.receivedAt || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, receivedAt: e.target.value } : null)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Notes / Condition</label>
              <input 
                type="text"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.notes || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, notes: e.target.value } : null)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setGrnDialog(null)}>Cancel</Button>
              <Button variant="primary" onClick={async () => {
                if (grnDialog?.latestMain) {
                   await createCustomerGRN({
                     quoteId: grnDialog.latestMain.id,
                     quoNo: grnDialog.group.quoNo,
                     leadId: grnDialog.group.leadId,
                     items: grnDialog.items,
                     receivedAt: grnDialog.receivedAt,
                     receivedBy: 'System', // from auth
                     notes: grnDialog.notes
                   });
                   setGrnDialog(null);
                }
              }}>Confirm Receipt</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!printGrnData} onClose={() => setPrintGrnData(null)} title="Print Customer GRN" size="xl">
        {printGrnData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <CustomerGRNPrintView 
               grn={printGrnData.grn} 
               group={printGrnData.group}
               settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('grn-print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.5,
                  filename: `GRN-${printGrnData.grn.id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => {
                const content = document.getElementById('grn-print-section');
                if (content) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`<html><head><title>Print</title><script src="https://cdn.tailwindcss.com"></script></head><body>${content.outerHTML}</body></html>`);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 500);
                  }
                }
              }}>Print</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
"""

# Very precise ending strip
content = content.replace("    </div>\n  )\n}", "")
content = content.replace("    </div>\r\n  )\r\n}", "")
content = content.strip() + "\n" + modals

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)