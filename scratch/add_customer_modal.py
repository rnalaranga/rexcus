import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Add state for modal
find_state = "  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)"
rep_state = """  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', company: '', email: '', phone: '', address: '', vatNo: '', tinNo: '' })
  const [isSubmittingCust, setIsSubmittingCust] = useState(false)"""

content = content.replace(find_state, rep_state)

# 2. Add API import
find_import = "import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'"
rep_import = "import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'\nimport { createCustomer } from '@/lib/api'"
content = content.replace(find_import, rep_import)

# 3. Change button onClick
find_btn = """<button type="button" onClick={() => navigate('/crm/customers')} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-lg hover:bg-blue-500/10 transition-colors">"""
rep_btn = """<button type="button" onClick={() => setShowAddCustomer(true)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-lg hover:bg-blue-500/10 transition-colors">"""
content = content.replace(find_btn, rep_btn)

# 4. Add the modal JSX right before the final closing div
modal_jsx = """      {/* Add Customer Modal */}
      <Modal isOpen={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Register New Customer">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSubmittingCust(true);
          try {
            const custId = 'CUST-' + Math.floor(Math.random() * 100000).toString().padStart(5, '0');
            const newCustomer = {
              ...newCustomerForm,
              id: custId,
              status: 'active',
              lifetimeValue: 0, totalRevenue: 0, openDeals: 0,
              lastOrder: new Date().toISOString().slice(0,19).replace('T',' '),
              joinDate: new Date().toISOString().slice(0,19).replace('T',' '),
              avatar: newCustomerForm.name.substring(0, 2).toUpperCase()
            };
            await createCustomer(newCustomer);
            showToast('success', 'Customer registered successfully!');
            // Auto-select
            setSelectedLeadId(custId);
            setCustomerName(newCustomerForm.name + (newCustomerForm.company ? ` (${newCustomerForm.company})` : ''));
            setShowAddCustomer(false);
            setNewCustomerForm({ name: '', company: '', email: '', phone: '', address: '', vatNo: '', tinNo: '' });
            // Ideally refetch customers here, but we rely on the next refresh/optimistic UI
          } catch(err: any) {
            showToast('error', err.message || 'Failed to create customer');
          } finally {
            setIsSubmittingCust(false);
          }
        }}>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Full Name *</label>
                <input required value={newCustomerForm.name} onChange={e => setNewCustomerForm(p => ({...p, name: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Company</label>
                <input value={newCustomerForm.company} onChange={e => setNewCustomerForm(p => ({...p, company: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Email</label>
                <input type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm(p => ({...p, email: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Phone</label>
                <input value={newCustomerForm.phone} onChange={e => setNewCustomerForm(p => ({...p, phone: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-muted uppercase mb-1">Address</label>
                <input value={newCustomerForm.address} onChange={e => setNewCustomerForm(p => ({...p, address: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">VAT No</label>
                <input value={newCustomerForm.vatNo} onChange={e => setNewCustomerForm(p => ({...p, vatNo: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">SVAT / TIN No</label>
                <input value={newCustomerForm.tinNo} onChange={e => setNewCustomerForm(p => ({...p, tinNo: e.target.value}))} className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-theme-subtle">
              <Button type="button" variant="ghost" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmittingCust}>{isSubmittingCust ? 'Saving...' : 'Register Customer'}</Button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  )
}"""

content = content.replace("    </div>\n  )\n}", modal_jsx)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added Customer Modal")
