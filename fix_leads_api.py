import re

with open('src/pages/crm/Leads.tsx', 'r') as f:
    code = f.read()

select_contact_ui = """
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
                              name: c.name || '',
                              company: c.company || '',
                              email: c.email || '',
                              phone: c.phone || '',
                              vat: c.vat || '',
                              svat: c.svat || '',
                              address: c.address || '',
                              brNumber: c.brNumber || '',
                              industry: c.industry || ''
                            }));
                        }
                      }
                    }}
                    placeholder="Search existing customer..."
                  />
                  {formData.customerId && (() => {
                     const sc = customers.find((x:any) => x.id === formData.customerId);
                     if (sc && sc.contacts && sc.contacts.length > 0) {
                        return (
                           <div className="mt-3 bg-surface p-2 rounded border border-theme-subtle">
                             <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1 block">Attention / Contact Person</label>
                             <select className="w-full input-base text-xs" onChange={e => {
                                 if (!e.target.value) {
                                     setFormData(f => ({...f, name: sc.name, email: sc.email, phone: sc.phone}));
                                 } else {
                                     const contact = sc.contacts.find((x:any) => x.id.toString() === e.target.value);
                                     if (contact) setFormData(f => ({...f, name: contact.name, email: contact.email, phone: contact.phone}));
                                 }
                             }}>
                                <option value="">{sc.name} (Primary)</option>
                                {sc.contacts.map((c: any, i: number) => (
                                   <option key={i} value={c.id}>{c.name} {c.designation ? `- ${c.designation}` : ''}</option>
                                ))}
                             </select>
                           </div>
                        );
                     }
                     return null;
                  })()}
"""

code = code.replace("""                  <SearchableSelect
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
                              name: c.name || '',
                              company: c.company || '',
                              email: c.email || '',
                              phone: c.phone || '',
                              vat: c.vat || '',
                              svat: c.svat || '',
                              address: c.address || '',
                              brNumber: c.brNumber || '',
                              industry: c.industry || ''
                            }));
                        }
                      }
                    }}
                    placeholder="Search existing customer..."
                  />""", select_contact_ui.strip())

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(code)

