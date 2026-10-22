import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

attn_ui = """
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1 flex justify-between">
                   Attention To
                   {selectedCustomer && (selectedCustomer.contacts?.length > 0 || selectedCustomer.name) && (
                     <select 
                       className="bg-transparent border-none text-[10px] text-rex-500 font-bold outline-none text-right cursor-pointer"
                       onChange={e => e.target.value && setAttention(e.target.value)}
                     >
                       <option value="">(Select Contact)</option>
                       {selectedCustomer.name && <option value={selectedCustomer.name}>{selectedCustomer.name} (Primary)</option>}
                       {(selectedCustomer.contacts || []).map((c: any, i: number) => (
                          <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                       ))}
                     </select>
                   )}
                </label>
                <input type="text" value={attention} onChange={e => setAttention(e.target.value)} className="w-full input-base" placeholder="Mr. / Ms." />
              </div>
"""

# Find Place of supply
pos_str = """              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Place of Supply</label>
                <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="w-full input-base" placeholder="Location" />
              </div>"""

code = code.replace(pos_str, pos_str + "\n" + attn_ui)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

