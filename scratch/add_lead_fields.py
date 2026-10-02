import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# 1. Imports
import_find = "import { useDialog } from '@/components/ui/DialogProvider'"
import_rep = "import { useDialog } from '@/components/ui/DialogProvider'\nimport { useCustomers } from '@/hooks/useData'\nimport { SearchableSelect } from '@/components/ui/SearchableSelect'"
content = content.replace(import_find, import_rep)

# 2. Hooks and State
hook_find = "  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lead' | 'quotation', id: string | number } | null>(null)"
hook_rep = "  const { data: customers } = useCustomers()\n  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lead' | 'quotation', id: string | number } | null>(null)"
content = content.replace(hook_find, hook_rep)

state_find = "name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: ''"
state_rep = "name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '', description: '', customerId: ''"
content = content.replace(state_find, state_rep)
content = content.replace(state_find, state_rep) # There are two (initial and openCreateModal)

# Edit modal mapping
edit_find = "source: lead.source, vat: lead.vat || '', svat: lead.svat || '',"
edit_rep = "source: lead.source, vat: lead.vat || '', svat: lead.svat || '', description: lead.description || '', customerId: lead.customerId || '',"
content = content.replace(edit_find, edit_rep)

# 3. Form UI
ui_find = """            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>"""

ui_rep = """            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex justify-between">
                  <span>Link to Existing Customer (Optional)</span>
                </label>
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
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>"""
content = content.replace(ui_find, ui_rep)

desc_find = """              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="Optional" />
              </div>"""

desc_rep = """              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number</label>
                <input value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="Optional" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Description / Notes</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full input-base resize-none" placeholder="Requirements, context, etc..." />
              </div>"""
content = content.replace(desc_find, desc_rep)

# Fix view modal if we want to show description
view_find = """                      <p className="text-[10px] text-muted mb-2 truncate">{lead.company}</p>
                      <div className="flex items-center justify-between">"""

view_rep = """                      <p className="text-[10px] text-muted mb-1 truncate">{lead.company}</p>
                      {lead.description && <p className="text-[9px] text-secondary mb-2 line-clamp-2 italic border-l-2 border-theme-subtle pl-1">{lead.description}</p>}
                      <div className="flex items-center justify-between">"""
content = content.replace(view_find, view_rep)


with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Updated Leads.tsx")
