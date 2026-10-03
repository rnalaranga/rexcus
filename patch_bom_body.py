import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

start = 958
end = 1128

new_body = """                    {/* Plate / Rod Materials */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-5 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/80 transition-colors" onClick={() => updateBOM(bom.id, { autoCollapsed: !bom.autoCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.autoCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Plate or Rod Sizes (mm)</h3>
                          {bom.autoMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.autoMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addAutoMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.autoCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left min-w-[860px]">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Material</th>
                              <th className="px-3 py-2.5">Width</th>
                              <th className="px-3 py-2.5">Length</th>
                              <th className="px-3 py-2.5">Supplier</th>
                              <th className="px-3 py-2.5">Thick</th>
                              <th className="px-3 py-2.5">Dia Ø</th>
                              <th className="px-3 py-2.5 w-16">Qty</th>
                              <th className="px-3 py-2.5 w-24">Unit Price</th>
                              <th className="px-4 py-2.5 text-right">Plate Rs</th>
                              <th className="px-4 py-2.5 text-right">Shaft Rs</th>
                              <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {bom.autoMats.map((mat, i) => (
                              <tr key={mat.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                                <td className="p-0">
                                  <MatSearchInput
                                    value={mat.material}
                                    onChange={v => updateAutoMat(bom.id, mat.id, 'material', v)}
                                    onSelect={(name, price) => { updateAutoMat(bom.id, mat.id, 'material', name); if (price) updateAutoMat(bom.id, mat.id, 'unitPrice', price) }}
                                    inventory={inventory}
                                    className="w-full min-w-[120px]"
                                  />
                                </td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.width} onChange={e => updateAutoMat(bom.id, mat.id, 'width', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.length} onChange={e => updateAutoMat(bom.id, mat.id, 'length', e.target.value)} /></td>
                                <td className="p-0"><input type="text" className={tableInputClass + " group-hover:bg-transparent"} value={mat.supplier} onChange={e => updateAutoMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.thick} onChange={e => updateAutoMat(bom.id, mat.id, 'thick', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.dia} onChange={e => updateAutoMat(bom.id, mat.id, 'dia', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.qty} onChange={e => updateAutoMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.unitPrice} onChange={e => updateAutoMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.platePrice > 0 ? formatCurrency(mat.platePrice) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.shaftPrice > 0 ? formatCurrency(mat.shaftPrice) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-3 py-2.5 text-center"><button onClick={() => removeAutoMat(bom.id, mat.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                              </tr>
                            ))}
                            {bom.autoMats.length === 0 && (
                              <tr><td colSpan={11} className="py-6 text-center text-[11px] text-muted italic">No plate or rod materials added yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Manual Materials */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-5 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/80 transition-colors" onClick={() => updateBOM(bom.id, { manualCollapsed: !bom.manualCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.manualCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Manually Calculated Materials</h3>
                          {bom.manualMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.manualMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addManualMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.manualCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left min-w-[640px]">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Material</th>
                              <th className="px-3 py-2.5">Supplier</th>
                              <th className="px-3 py-2.5">Price Mode</th>
                              <th className="px-3 py-2.5 w-24">Unit Price</th>
                              <th className="px-3 py-2.5 w-20">Qty</th>
                              <th className="px-4 py-2.5 text-right">Price</th>
                              <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {bom.manualMats.map((mat, i) => (
                              <tr key={mat.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                                <td className="p-0">
                                  <MatSearchInput
                                    value={mat.material}
                                    onChange={v => updateManualMat(bom.id, mat.id, 'material', v)}
                                    onSelect={(name, price) => { updateManualMat(bom.id, mat.id, 'material', name); if (price) updateManualMat(bom.id, mat.id, 'unitPrice', price) }}
                                    inventory={inventory}
                                    className="w-full min-w-[120px]"
                                  />
                                </td>
                                <td className="p-0"><input type="text" className={tableInputClass + " group-hover:bg-transparent"} value={mat.supplier} onChange={e => updateManualMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                                <td className="p-0">
                                  <select className={tableInputClass + " group-hover:bg-transparent"} value={mat.priceMode} onChange={e => updateManualMat(bom.id, mat.id, 'priceMode', e.target.value)}>
                                    <option value="-">-</option>
                                    <option value="per kg">per kg</option>
                                    <option value="per unit">per unit</option>
                                    <option value="lump sum">lump sum</option>
                                  </select>
                                </td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.unitPrice} onChange={e => updateManualMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.qty} onChange={e => updateManualMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.unitPrice * mat.qty > 0 ? formatCurrency(mat.unitPrice * mat.qty) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-3 py-2.5 text-center"><button onClick={() => removeManualMat(bom.id, mat.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                              </tr>
                            ))}
                            {bom.manualMats.length === 0 && (
                              <tr><td colSpan={7} className="py-6 text-center text-[11px] text-muted italic">No manual materials added yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Machining Table */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-4 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/80 transition-colors" onClick={() => updateBOM(bom.id, { machiningCollapsed: !bom.machiningCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.machiningCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Machining Operations</h3>
                        </div>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.machiningCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Process</th>
                              <th className="px-3 py-2.5 w-24">Est. Hr</th>
                              <th className="px-3 py-2.5 w-24">Set Time</th>
                              <th className="px-3 py-2.5 w-24">Quo. Hr</th>
                              <th className="px-3 py-2.5 w-56">Rates</th>
                              <th className="px-4 py-2.5 text-right w-32">Sub Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/20">
                            {EXCEL_PROCESSES.map((group, gIdx) => (
                              <React.Fragment key={gIdx}>
                                <tr className="bg-surface2/30">
                                  <td colSpan={6} className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">{group.group}</td>
                                </tr>
                                {group.items.map(proc => {
                                  const st = bom.procState?.[proc.name]
                                  if (!st) return null
                                  const hrRate = Number(st.hrRate || proc.hrRate || proc.rate || 0)
                                  const setTimeRate = Number(st.setTimeRate || proc.setTimeRate || 0)
                                  const subTotal = (Number(st.quoHr || 0) * hrRate) + (Number(st.setTime || 0) * setTimeRate)
                                  return (
                                    <tr key={proc.name} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                                      <td className="px-4 py-1.5 text-[11px] text-secondary font-medium group-hover:text-primary border-r border-theme-subtle/10">{proc.name}</td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={st.estHr} onChange={e => handleProcChange(bom.id, proc.name, 'estHr', e.target.value)} placeholder="-" /></td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={st.setTime} onChange={e => handleProcChange(bom.id, proc.name, 'setTime', e.target.value)} placeholder="-" /></td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " font-bold text-primary group-hover:bg-transparent"} value={st.quoHr} onChange={e => handleProcChange(bom.id, proc.name, 'quoHr', e.target.value)} placeholder="-" /></td>
                                      <td className="px-3 py-1.5 text-[10px] text-muted font-mono whitespace-nowrap border-r border-theme-subtle/10">
                                          <div className="flex gap-2 justify-end">
                                            <span className="text-amber-600/80 font-medium">Rs. {hrRate.toLocaleString()}/hr</span>
                                            <span className="text-theme-subtle">|</span>
                                            <span className="text-blue-500/80 font-medium">Rs. {setTimeRate.toLocaleString()}/set</span>
                                          </div>
                                        </td>
                                      <td className="px-4 py-1.5 text-right font-mono text-[11px] font-semibold">{subTotal > 0 ? <span className="text-primary">{formatCurrency(subTotal)}</span> : <span className="text-muted/30">-</span>}</td>
                                    </tr>
                                  )
                                })}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
"""

new_lines = lines[:start] + [new_body] + lines[end:]

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.writelines(new_lines)

print('Updated entire BOM body with precise design')