import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

# 1. Add attention state
code = code.replace("const [customerId, setCustomerId] = useState('');", "const [customerId, setCustomerId] = useState('');\n  const [attention, setAttention] = useState('');")

# 2. Add attention to createInvoice
code = code.replace("customerId, date, dueDate", "customerId, attention, date, dueDate")

# 3. Add UI for attention
attn_ui = """
              <div>
                <label className="block text-xs text-muted mb-1 flex justify-between">
                   Attention To
                   {selectedCustomer && selectedCustomer.contacts && selectedCustomer.contacts.length > 0 && (
                     <select 
                       className="bg-transparent border-none text-[10px] text-rex-500 font-bold outline-none text-right cursor-pointer"
                       onChange={e => e.target.value && setAttention(e.target.value)}
                     >
                       <option value="">(Select Contact)</option>
                       {selectedCustomer.contacts.map((c: any, i: number) => (
                          <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                       ))}
                     </select>
                   )}
                </label>
                <input type="text" value={attention} onChange={e => setAttention(e.target.value)} className="w-full input-base" placeholder="Mr. / Ms." />
              </div>
"""

code = code.replace('              <div>\n                <label className="block text-xs text-muted mb-1">Place of Supply</label>\n                <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="w-full input-base" placeholder="Location" />\n              </div>', '              <div>\n                <label className="block text-xs text-muted mb-1">Place of Supply</label>\n                <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} className="w-full input-base" placeholder="Location" />\n              </div>\n' + attn_ui)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

