import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

new_section3 = """        {/* Section 3: Customer Quotation */}
        <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-4">
              <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[13px] font-semibold text-secondary flex items-center gap-2">
                      <User size={16} /> Customer Quotation
                    </h2>
                    <select 
                      value={currency} 
                      onChange={e => handleCurrencyChange(e.target.value)} 
                      className="bg-surface2 border border-theme-subtle/40 rounded-md px-2 py-1 text-[11px] font-bold text-primary outline-none focus:border-rex-500"
                    >
                      <option value="LKR">LKR (Base)</option>
                      {currencies?.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon={Wand2} onClick={handleOpenMarginModal} className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold border border-purple-500/20 h-7 text-[11px]">✨ Auto-Gen</Button>
                    <Button variant="primary" size="sm" icon={Plus} onClick={addCustItem} className="h-7 text-[11px]">Add Line</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                        <th className="px-4 py-2.5 w-12 text-center">#</th>
                        <th className="px-3 py-2.5">Description</th>
                        <th className="px-3 py-2.5 w-24">Qty</th>
                        <th className="px-3 py-2.5 w-32">Unit Price (Rs.)</th>
                        <th className="px-4 py-2.5 w-36 text-right">Total (Rs.)</th>
                        <th className="px-3 py-2.5 w-36">Notes</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {custItems.map((item, i) => (
                        <tr key={item.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                          <td className="px-4 py-2 text-xs font-mono text-muted text-center">{i + 1}</td>
                          <td className="p-0">
                            <textarea 
                              value={item.desc} 
                              onChange={e => updateCustItem(item.id, 'desc', e.target.value)} 
                              placeholder="Item / service description..." 
                              className={tableInputClass + " resize-y min-h-[40px] leading-relaxed block group-hover:bg-transparent"}
                              rows={item.desc.split('\\n').length > 1 ? Math.min(item.desc.split('\\n').length, 8) : 1}
                            />
                          </td>
                          <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.qty} onChange={e => updateCustItem(item.id, 'qty', Number(e.target.value))} className={tableInputClass + " group-hover:bg-transparent"} /></td>
                          <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.unitPrice} onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))} className={tableInputClass + " group-hover:bg-transparent"} /></td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-primary">{formatCurrency(item.qty * item.unitPrice)}</td>
                          <td className="p-0"><input type="text" value={item.note} onChange={e => updateCustItem(item.id, 'note', e.target.value)} placeholder="Optional note" className={tableInputClass + " group-hover:bg-transparent text-muted"} /></td>
                          <td className="px-3 py-2 text-center"><button onClick={() => removeCustItem(item.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quotation Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Payment Terms</label>
                  <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)} placeholder="e.g. 50% Advance" className={docInputClass + " bg-surface"} />
                </div>
                <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Validity</label>
                  <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)} placeholder="e.g. 30 Days" className={docInputClass + " bg-surface"} />
                </div>
                <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Delivery Timeline</label>
                  <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)} placeholder="e.g. 3-4 weeks" className={docInputClass + " bg-surface"} />
                </div>
              </div>
            </div>
            
            {/* Customer Summary Card on the right */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              <div className="border border-theme-subtle/50 rounded-2xl bg-surface shadow-sm p-6 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <h3 className="text-[12px] font-bold text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                   <TrendingUp size={14} className="text-primary"/> Quotation Summary
                </h3>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-medium">Sub Total</span>
                    <span className="font-mono font-semibold text-secondary">{formatCurrency(custSubtotal)}</span>
                  </div>
                  
                  {/* Select Taxes (New multi-tax integration if present) */}
                  {selectedTaxes && selectedTaxes.map(t => {
                     const taxAmt = custTotal * (t.rate / 100);
                     return (
                      <div key={t.id} className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">{t.name} ({t.rate}%)</span>
                        <span className="font-mono font-semibold text-secondary">+{formatCurrency(taxAmt)}</span>
                      </div>
                     )
                  })}

                  <div className="flex items-center justify-between text-xs group">
                    <span className="text-muted font-medium">Discount</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface2 border border-theme-subtle/50 rounded shadow-inner p-0.5">
                          <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                            className="w-10 bg-transparent text-center text-[10px] font-semibold text-primary outline-none" />
                          <span className="text-[9px] text-muted pr-1">%</span>
                      </div>
                      <span className="font-mono text-red-500/80 font-medium text-[11px] w-16 text-right">-{formatCurrency(custDiscountAmt)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[11px] font-bold text-secondary uppercase tracking-wider">Final Amount</div>
                        <div className="text-[9px] text-muted mt-0.5">incl VAT/Taxes</div>
                      </div>
                      <div className="text-[22px] leading-none font-black text-primary font-mono">{formatCurrency(custWithSSCL)}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Profit Indicator */}
              <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${expectedProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className={`absolute -right-4 -bottom-4 opacity-5 ${expectedProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  <TrendingUp size={100} />
                </div>
                
                <div className="flex items-center gap-2 mb-4 relative z-10">
                   <div className={`p-1.5 rounded-lg ${expectedProfit >= 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                     <LineChart size={14} />
                   </div>
                   <span className={`text-[11px] font-bold uppercase tracking-widest ${expectedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Est. Financials</span>
                </div>
                
                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Margin</span>
                     <span className={`text-[13px] font-bold ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{expectedMargin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{expectedProfit >= 0 ? 'Profit' : 'Loss'}</span>
                     <span className={`text-[14px] font-mono font-black ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(expectedProfit))}</span>
                  </div>
                </div>
              </div>
            </div>
"""

new_lines = lines[:1176] + [new_section3 + "\\n"] + lines[1302:]

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.writelines(new_lines)

print('Updated Customer Quotation Section')