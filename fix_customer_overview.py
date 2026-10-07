import re

with open('src/pages/crm/CustomerDetail.tsx', 'r') as f:
    code = f.read()

overview_contacts_ui = """
            </div>

            {customer.contacts && customer.contacts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-theme-subtle">
                <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Additional Contacts</h2>
                <div className="space-y-3">
                  {customer.contacts.map((c: any, i: number) => (
                    <div key={i} className="bg-surface2 p-2.5 rounded border border-theme-subtle/50">
                      <p className="text-xs font-semibold text-primary">{c.name} {c.designation ? <span className="text-[10px] font-normal text-muted">- {c.designation}</span> : ''}</p>
                      {c.phone && <p className="text-[10px] text-secondary mt-1 flex items-center gap-1.5"><Phone size={10} /> {c.phone}</p>}
                      {c.email && <p className="text-[10px] text-secondary mt-0.5 flex items-center gap-1.5"><Mail size={10} /> {c.email}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
"""

code = code.replace("              })}\n            </div>\n          </GlassCard>", "              })}\n" + overview_contacts_ui)

with open('src/pages/crm/CustomerDetail.tsx', 'w') as f:
    f.write(code)

