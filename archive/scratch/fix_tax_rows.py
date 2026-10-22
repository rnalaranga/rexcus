import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# ── 1. Fix Invoice Summary card (builder side) ──
old_summary = """              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(subtotal)}</span>
                </div>
                {selectedProfile?.tax2_name ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax1_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax2_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                ) : taxType !== 'none' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">{selectedProfile?.tax1_name || 'Tax'}</span>
                    <span className="font-mono text-sm text-amber-500">{formatCurrency(taxAmount)}</span>
                  </div>
                ) : null}
                <div className="pt-4 border-t border-blue-500/30 flex justify-between items-center">
                  <span className="text-base font-black text-primary uppercase tracking-wide">Grand Total</span>
                  <span className="text-3xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                </div>\r
              </div>"""

new_summary = """              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(subtotal)}</span>
                </div>
                {/* Tax Toggle */}
                <div className="flex items-center gap-2 border-t border-theme-subtle pt-2">
                  <button onClick={() => setTaxEnabled(t => !t)} className={`w-9 h-5 rounded-full transition-colors ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}>
                    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-xs text-muted font-semibold uppercase tracking-widest">Tax</span>
                </div>
                {taxEnabled && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted font-semibold">SSCL</span>
                        <input type="number" min={0} step={0.1} value={ssclRate} onChange={e => setSsclRate(Number(e.target.value))}
                          className="w-14 text-xs bg-surface border border-theme-subtle rounded px-1.5 py-0.5 text-center font-mono outline-none focus:border-blue-500" />
                        <span className="text-xs text-muted">%</span>
                      </div>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted font-semibold">VAT</span>
                        <input type="number" min={0} step={0.1} value={vatRate} onChange={e => setVatRate(Number(e.target.value))}
                          className="w-14 text-xs bg-surface border border-theme-subtle rounded px-1.5 py-0.5 text-center font-mono outline-none focus:border-blue-500" />
                        <span className="text-xs text-muted">%</span>
                      </div>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                )}
                <div className="pt-4 border-t border-blue-500/30 flex justify-between items-center">
                  <span className="text-base font-black text-primary uppercase tracking-wide">Grand Total</span>
                  <span className="text-3xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                </div>
              </div>"""

content = content.replace(old_summary, new_summary)

# ── 2. Fix InvoicePreview TOTALS to always show SSCL + VAT rows when taxEnabled ──
old_preview_totals = """                {selectedProfile?.tax2_name && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile.tax1_name} <span style={{ marginLeft: '20px' }}>{selectedProfile.tax1_rate} %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {ssclAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {taxType !== 'none' && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile?.tax2_name || selectedProfile?.tax1_name || 'Tax'} <span style={{ marginLeft: '20px' }}>{taxType === 'line_items' ? 'As per items' : `${selectedProfile?.tax2_name ? selectedProfile.tax2_rate : selectedProfile?.tax1_rate} %`}</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {(selectedProfile?.tax2_name ? vatAmount : taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}"""

new_preview_totals = """                {ssclAmount > 0 && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile?.tax1_name || 'SSCL'} <span style={{ marginLeft: '20px' }}>{selectedProfile?.tax1_rate ?? ''} %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {ssclAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {vatAmount > 0 && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile?.tax2_name || 'VAT'} <span style={{ marginLeft: '20px' }}>{selectedProfile?.tax2_rate ?? ''} %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}"""

content = content.replace(old_preview_totals, new_preview_totals)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Done - tax rows fixed")
