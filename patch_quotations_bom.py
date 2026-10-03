import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Add State
state_hook = "  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)\n"
new_state = state_hook + "  const [viewBomDialog, setViewBomDialog] = useState<any>(null)\n"
content = content.replace(state_hook, new_state)

# 2. Add Button
old_bom_row = """                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                 <Briefcase size={14} />
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                                 <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                               </div>
                             </div>
                           </div>"""
new_bom_row = """                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                 <Briefcase size={14} />
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                                 <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                               </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={() => setViewBomDialog(bom)} className="text-[11px] h-7">View Costing</Button>
                           </div>"""
content = content.replace(old_bom_row, new_bom_row)

# 3. Add Modal
old_end = "      </div>\n    )\n  }"

modal_html = """      <Modal isOpen={!!viewBomDialog} onClose={() => setViewBomDialog(null)} title={viewBomDialog?.title ? `BOM: ${viewBomDialog.title}` : "View BOM"} size="xl">
        {viewBomDialog && (
          <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar space-y-6">
             <div className="flex justify-between items-center bg-surface/50 p-4 rounded-xl border border-theme-subtle">
               <span className="font-bold text-secondary">Total Cost:</span>
               <span className="font-mono font-black text-primary text-xl">{formatCurrency(viewBomDialog.bomTotal || 0)}</span>
             </div>

             {viewBomDialog.autoMats?.length > 0 && (
               <div>
                 <h4 className="text-xs font-bold text-secondary mb-2 uppercase tracking-widest">Plate / Rod Materials</h4>
                 <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/20">
                   <table className="w-full text-left text-[11px]">
                     <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted">
                       <tr><th className="p-2">Material</th><th className="p-2">Dims</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Cost</th></tr>
                     </thead>
                     <tbody className="divide-y divide-theme-subtle/20">
                       {viewBomDialog.autoMats.map((m: any, i: number) => (
                         <tr key={i} className="hover:bg-surface/40">
                           <td className="p-2 font-medium">{m.material}</td>
                           <td className="p-2 text-muted">{m.width ? `${m.width}x${m.length}` : `Ø${m.dia}x${m.length}`}</td>
                           <td className="p-2 text-right">{m.qty}</td>
                           <td className="p-2 text-right font-mono text-primary font-semibold">{formatCurrency(Number(m.platePrice) + Number(m.shaftPrice))}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}

             {viewBomDialog.manualMats?.length > 0 && (
               <div>
                 <h4 className="text-xs font-bold text-secondary mb-2 uppercase tracking-widest">Manual Materials</h4>
                 <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/20">
                   <table className="w-full text-left text-[11px]">
                     <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted">
                       <tr><th className="p-2">Material</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Cost</th></tr>
                     </thead>
                     <tbody className="divide-y divide-theme-subtle/20">
                       {viewBomDialog.manualMats.map((m: any, i: number) => (
                         <tr key={i} className="hover:bg-surface/40">
                           <td className="p-2 font-medium">{m.material}</td>
                           <td className="p-2 text-right font-mono text-muted">{formatCurrency(m.unitPrice)}</td>
                           <td className="p-2 text-right">{m.qty}</td>
                           <td className="p-2 text-right font-mono text-primary font-semibold">{formatCurrency(Number(m.unitPrice)*Number(m.qty))}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}

             {viewBomDialog.procState && Object.keys(viewBomDialog.procState).length > 0 && (
               <div>
                 <h4 className="text-xs font-bold text-secondary mb-2 uppercase tracking-widest">Machining Operations</h4>
                 <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/20">
                   <table className="w-full text-left text-[11px]">
                     <thead className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase text-muted">
                       <tr><th className="p-2">Operation</th><th className="p-2 text-right">Est. Hrs</th><th className="p-2 text-right">Quo. Hrs</th><th className="p-2 text-right">Set Time</th><th className="p-2 text-right">Cost</th></tr>
                     </thead>
                     <tbody className="divide-y divide-theme-subtle/20">
                       {Object.keys(viewBomDialog.procState).map((k: string) => {
                          const st = viewBomDialog.procState[k];
                          const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0));
                          if (subTotal === 0 && !st.estHr && !st.quoHr && !st.setTime) return null;
                          return (
                            <tr key={k} className="hover:bg-surface/40">
                              <td className="p-2 font-medium text-amber-600">{k}</td>
                              <td className="p-2 text-right">{st.estHr || '-'}</td>
                              <td className="p-2 text-right font-bold">{st.quoHr || '-'}</td>
                              <td className="p-2 text-right">{st.setTime || '-'}</td>
                              <td className="p-2 text-right font-mono text-primary font-semibold">{formatCurrency(subTotal)}</td>
                            </tr>
                          )
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
          </div>
        )}
      </Modal>

""" + old_end

content = content.replace(old_end, modal_html)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated Quotations with BOM view modal')