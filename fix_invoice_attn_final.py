import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

attn_ui = """
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Attention To</label>
                    <div className="relative">
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={`${docInputClass} pr-7`} />
                      {selectedCustomer && (selectedCustomer.contacts?.length > 0 || selectedCustomer.name) && (
                        <>
                          <select 
                            className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
                            onChange={e => e.target.value && setAttention(e.target.value)}
                            title="Select from contacts"
                            value=""
                          >
                            <option value="">(Select Contact)</option>
                            {selectedCustomer.name && <option value={selectedCustomer.name}>{selectedCustomer.name} (Primary)</option>}
                            {(selectedCustomer.contacts || []).map((c: any, i: number) => (
                               <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted border-l border-theme-subtle pl-1.5 flex items-center justify-center">
                             <ChevronDown size={14} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
"""

# Find Place of supply
pos_str = 'placeholder="e.g. Negombo" className={docInputClass} />\n                  </div>'
if pos_str in code:
    code = code.replace(pos_str, pos_str + "\n" + attn_ui)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

