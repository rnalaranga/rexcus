import re

with open('src/pages/crm/CustomerDetail.tsx', 'r') as f:
    code = f.read()

contacts_ui = """
          {/* Section: Additional Contacts */}
          <div className="col-span-full mt-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-purple-500" />
                Additional Contacts
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditData(f => ({...f, contacts: [...(f.contacts || []), { id: Date.now(), name: '', designation: '', phone: '', email: '' }] }))} icon={Plus}>Add Contact</Button>
            </div>
            
            <div className="space-y-3">
              {(editData.contacts || []).map((c: any, i: number) => (
                <div key={c.id || i} className="flex items-start gap-2 bg-surface2 p-3 rounded-lg border border-theme-subtle/50 relative">
                  <div className="grid grid-cols-4 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Name</label>
                      <input value={c.name} onChange={e => {
                        const newContacts = [...editData.contacts];
                        newContacts[i].name = e.target.value;
                        setEditData({...editData, contacts: newContacts});
                      }} className="w-full text-xs input-base py-1.5 px-2" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Designation</label>
                      <input value={c.designation} onChange={e => {
                        const newContacts = [...editData.contacts];
                        newContacts[i].designation = e.target.value;
                        setEditData({...editData, contacts: newContacts});
                      }} className="w-full text-xs input-base py-1.5 px-2" placeholder="Manager" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Phone</label>
                      <input value={c.phone} onChange={e => {
                        const newContacts = [...editData.contacts];
                        newContacts[i].phone = e.target.value;
                        setEditData({...editData, contacts: newContacts});
                      }} className="w-full text-xs input-base py-1.5 px-2" placeholder="+94 7X..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Email</label>
                      <input value={c.email} onChange={e => {
                        const newContacts = [...editData.contacts];
                        newContacts[i].email = e.target.value;
                        setEditData({...editData, contacts: newContacts});
                      }} className="w-full text-xs input-base py-1.5 px-2" placeholder="john@..." />
                    </div>
                  </div>
                  <button type="button" onClick={() => {
                    const newContacts = [...editData.contacts];
                    newContacts.splice(i, 1);
                    setEditData({...editData, contacts: newContacts});
                  }} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded mt-5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!editData.contacts || editData.contacts.length === 0) && (
                <div className="text-center py-4 border border-dashed border-theme-subtle rounded-lg text-xs text-muted">
                  No additional contacts added yet.
                </div>
              )}
            </div>
          </div>
"""

code = code.replace("{/* Section: Bank Details */}", contacts_ui + "\n\n          {/* Section: Bank Details */}")

if "Plus," not in code:
    code = code.replace("User,", "User, Plus,")

with open('src/pages/crm/CustomerDetail.tsx', 'w') as f:
    f.write(code)

