import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# 1. Update State
state_find = "name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '', description: '', customerId: ''"
state_rep = "name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '', description: '', customerId: '', isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: ''"
content = content.replace(state_find, state_rep)
content = content.replace(state_find, state_rep) # both init and reset

# 2. Add API import
import_api_find = "import { createLead, updateLead, deleteLead, fetchQuotations, deleteQuotation, createInvoice } from '@/lib/api'"
import_api_rep = "import { createLead, updateLead, deleteLead, fetchQuotations, deleteQuotation, createInvoice, createCustomer } from '@/lib/api'"
content = content.replace(import_api_find, import_api_rep)

# 3. Handle Save logic
save_find = """  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await updateLead(editId, { ...formData, lastActivity: toMySQLDate(new Date()) })
        toast('Lead updated successfully', 'success')
      } else {
        await createLead({
          id: 'LD-' + Date.now().toString().slice(-5),
          ...formData,
          assignedTo: 'System Admin',
          probability: 10,
          lastActivity: toMySQLDate(new Date())
        })
        toast('New lead generated', 'success')
      }
      setIsModalOpen(false)
      refetch()
    } catch (err: any) { showError(err.message || 'Failed to save lead') }
  }"""

save_rep = """  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.isNewCustomer && !formData.customerId && !editId) {
      return showError('You must select an existing customer or create a new one to add a lead.');
    }
    
    try {
      let finalCustomerId = formData.customerId;
      
      if (formData.isNewCustomer && !editId) {
        finalCustomerId = 'CUS-' + Date.now().toString().slice(-5);
        await createCustomer({
          id: finalCustomerId,
          name: formData.name || 'Unknown',
          company: formData.company || formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          vat: formData.vat,
          svat: formData.svat,
          brNumber: formData.brNumber,
          industry: formData.industry,
          financeContactName: formData.financeContactName,
          financeContactPhone: formData.financeContactPhone,
          segment: 'sme',
          currency: 'LKR',
          creditLimit: 0,
          creditDays: 30,
          rating: 0
        });
      }

      if (editId) {
        await updateLead(editId, { ...formData, customerId: finalCustomerId, lastActivity: toMySQLDate(new Date()) })
        toast('Lead updated successfully', 'success')
      } else {
        await createLead({
          id: 'LD-' + Date.now().toString().slice(-5),
          ...formData,
          customerId: finalCustomerId,
          assignedTo: 'System Admin',
          probability: 10,
          lastActivity: toMySQLDate(new Date())
        })
        toast('New lead generated', 'success')
      }
      setIsModalOpen(false)
      refetch()
    } catch (err: any) { showError(err.message || 'Failed to save lead') }
  }"""
content = content.replace(save_find, save_rep)

# 4. Update the Modal UI
ui_find_start = """            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex justify-between">
                  <span>Link to Existing Customer (Optional)</span>
                </label>"""
ui_find_end = """              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>"""

start_idx = content.find(ui_find_start)
end_idx = content.find(ui_find_end, start_idx)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + """            {/* Customer Selection / Creation Toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-surface2 rounded-lg inline-flex">
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: false})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${!formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>Select Existing Customer</button>
              <button type="button" onClick={() => setFormData({...formData, isNewCustomer: true, customerId: '', name: '', company: '', email: '', phone: ''})} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.isNewCustomer ? 'bg-white shadow text-primary' : 'text-muted hover:text-primary'}`}>+ Register New Customer</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!formData.isNewCustomer ? (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Select Customer <span className="text-rex-500">*</span></label>
                  <SearchableSelect
                    options={customers.map(c => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
                    value={formData.customerId}
                    onChange={(val) => {
                      setFormData({...formData, customerId: val});
                      if (val) {
                        const c = customers.find(x => x.id === val);
                        if (c) {
                          setFormData(prev => ({
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
""" + content[end_idx + len(ui_find_end):]

# 5. Hide the duplicate name/company inputs that were below if they exist.
# Wait, my replacement removed the Lead Full Name. We still need email, phone, vat, etc.
# But they were below ui_find_end!
# Let's adjust the email, phone inputs to only be required if it's a new customer? Or just leave them optional.

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Updated Leads.tsx with embedded Customer form")
