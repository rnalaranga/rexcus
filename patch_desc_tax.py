import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update Description header width
old_desc_th = '<th className="px-3 py-2.5">Description</th>'
new_desc_th = '<th className="px-3 py-2.5 min-w-[300px] w-full">Description</th>'
content = content.replace(old_desc_th, new_desc_th)

# 2. Update Notes header width
old_notes_th = '<th className="px-3 py-2.5 w-36">Notes</th>'
new_notes_th = '<th className="px-3 py-2.5 w-28">Notes</th>'
content = content.replace(old_notes_th, new_notes_th)

# 3. Update Textarea styling
old_textarea = 'className={tableInputClass + " resize-y min-h-[40px] leading-relaxed block group-hover:bg-transparent"}'
new_textarea = 'className="w-full bg-transparent outline-none text-[11px] font-medium resize-y min-h-[70px] p-2 leading-relaxed block border border-transparent hover:border-theme-subtle/30 focus:border-primary/40 focus:bg-surface rounded"'
content = content.replace(old_textarea, new_textarea)

# 4. Update the summary VAT/Taxes display
old_summary_taxes = """                  {/* Select Taxes (New multi-tax integration if present) */}
                  {selectedTaxes && selectedTaxes.map(t => {
                     const taxAmt = custTotal * (t.rate / 100);
                     return (
                      <div key={t.id} className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">{t.name} ({t.rate}%)</span>
                        <span className="font-mono font-semibold text-secondary">+{formatCurrency(taxAmt)}</span>
                      </div>
                     )
                  })}

                  <div className="flex items-center justify-between text-xs group">"""

new_summary_taxes = """                  <div className="flex items-center justify-between text-xs group">"""
content = content.replace(old_summary_taxes, new_summary_taxes)

old_final_amt = """                  <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[11px] font-bold text-secondary uppercase tracking-wider">Final Amount</div>
                        <div className="text-[9px] text-muted mt-0.5">incl VAT/Taxes</div>
                      </div>
                      <div className="text-[22px] leading-none font-black text-primary font-mono">{formatCurrency(custWithSSCL)}</div>
                    </div>
                  </div>"""

new_final_amt = """                  {Number(settings?.vat_percentage || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted font-medium">VAT ({Number(settings?.vat_percentage || 0)}%)</span>
                      <span className="font-mono font-semibold text-secondary">+{formatCurrency(custTotal * (Number(settings?.vat_percentage || 0)/100))}</span>
                    </div>
                  )}

                  <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[11px] font-bold text-secondary uppercase tracking-wider">Grand Total</div>
                      </div>
                      <div className="text-[22px] leading-none font-black text-primary font-mono">{formatCurrency(custWithSSCL)}</div>
                    </div>
                  </div>"""
content = content.replace(old_final_amt, new_final_amt)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated description spacing and VAT view')