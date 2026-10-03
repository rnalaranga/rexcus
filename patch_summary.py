import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

new_summary = """            {/* Customer Summary Card on the right */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              <div className="border border-theme-subtle/50 rounded-2xl bg-surface shadow-sm p-6 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <h3 className="text-[12px] font-bold text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                   <TrendingUp size={14} className="text-primary"/> Quotation Summary
                </h3>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-medium">Sub Total</span>
                    <span className="font-mono font-semibold text-secondary text-sm">{formatCurrency(custSubtotal)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs group">
                    <span className="text-muted font-medium">Discount</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface2 border border-theme-subtle/50 rounded-md shadow-inner p-1">
                          <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                            className="w-14 bg-transparent text-center text-[12px] font-bold text-primary outline-none" />
                          <span className="text-[10px] text-muted pr-1">%</span>
                      </div>
                      <span className="font-mono text-red-500/90 font-semibold text-[12px] w-20 text-right">-{formatCurrency(custDiscountAmt)}</span>
                    </div>
                  </div>
                  
                  {Number(settings?.vat_percentage || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted font-medium">VAT ({Number(settings?.vat_percentage || 0)}%)</span>
                      <span className="font-mono font-semibold text-secondary text-sm">+{formatCurrency(custTotal * (Number(settings?.vat_percentage || 0)/100))}</span>
                    </div>
                  )}

                  <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                    <div className="flex justify-between items-center">
                      <div className="text-[12px] font-bold text-secondary uppercase tracking-wider">Grand Total</div>
                      <div className="text-[24px] leading-none font-black text-primary font-mono">{formatCurrency(custWithSSCL)}</div>
                    </div>
                  </div>
                </div>
              </div>
"""

new_lines = lines[:1256] + [new_summary + "\n"] + lines[1307:]

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.writelines(new_lines)

print('Updated summary card')