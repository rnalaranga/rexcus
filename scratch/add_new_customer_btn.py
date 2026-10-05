import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_label = """                  <label className="block text-[11px] text-muted mb-1.5">Customer / Lead <span className="text-red-400">*</span></label>"""
rep_label = """                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] text-muted">Customer / Lead <span className="text-red-400">*</span></label>
                    <button type="button" onClick={() => navigate('/crm/customers')} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-lg hover:bg-blue-500/10 transition-colors">
                      <Plus size={10} /> Add New Customer
                    </button>
                  </div>"""

content = content.replace(find_label, rep_label)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added New Customer button")
