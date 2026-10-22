import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# We want to replace the whole "Lead Information" block.
# Let's find:
# <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
#   <User size={14} className="text-rex-500" />
#   Lead Information
# </h3>
# up until "Contact Details & Status"

start_marker = "Lead Information\n            </h3>"
end_marker = "          {/* Section: Contact & Priority */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers!")
    sys.exit(1)

new_ui = """Lead Information
            </h3>
            
            {/* Customer Selection / Creation Toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-surface2 rounded-lg inline-flex">
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: false})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>Select Existing Customer</button>
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: true, customerId: '', name: '', company: '', email: '', phone: ''})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>+ Register New Customer</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!formData.isNewCustomer ? (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Select Customer <span className="text-rex-500">*</span></label>
                  <SearchableSelect
                    options={customers.map((c: any) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
                    value={formData.customerId}
                    onChange={(val) => {
                      setFormData({...formData, customerId: val});
                      if (val) {
                        const c = customers.find((x: any) => x.id === val);
                        if (c) {
                          setFormData((prev: any) => ({
                            ...prev,
                            customerId: val,
                            name: prev.name || c.name || '',
                            company: prev.company || c.company || '',
                            email: prev.email || c.email || '',
                            phone: prev.phone || c.phone || '',
                            vat: prev.vat || c.vat || '',
                            svat: prev.svat || c.svat || ''
                          }));
                        }
                      }
                    }}
                    placeholder="Search existing customer..."
                  />
                </div>
              ) : (
                <>
                  <div className="col-span-2"><div className="h-px bg-theme-subtle my-2" /><p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">New Customer Details</p></div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Customer Name <span className="text-rex-500">*</span></label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company / Business Name <span className="text-rex-500">*</span></label>
                    <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Address</label>
                    <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full input-base" placeholder="123 Main St, City" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Business Registration No.</label>
                    <input value={formData.brNumber} onChange={e => setFormData({...formData, brNumber: e.target.value})} className="w-full input-base" placeholder="e.g. PV00123" />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Industry</label>
                    <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full input-base" placeholder="e.g. Manufacturing" />
                  </div>
                </>
              )}
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Estimated Value (Rs.) <span className="text-rex-500">*</span></label>
                <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full input-base" placeholder="100000" />
              </div>
            </div>
          </div>\n\n"""

content = content[:start_idx] + new_ui + content[end_idx:]

# Also add the description field under "SVAT Number"
svat_idx = content.find('placeholder="SVAT Number" />\n              </div>')
if svat_idx != -1:
    svat_end = svat_idx + len('placeholder="SVAT Number" />\n              </div>')
    desc_ui = """
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Description / Notes</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full input-base resize-none" placeholder="Requirements, context, etc..." />
              </div>"""
    content = content[:svat_end] + desc_ui + content[svat_end:]

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Updated UI in Leads.tsx")
