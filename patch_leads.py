import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Leads.tsx', 'r', 'utf-8') as f:
    content = f.read()

target = """                            setFormData((prev: any) => ({
                              ...prev,
                              customerId: val,
                              name: prev.name || c.name || '',
                              company: prev.company || c.company || '',
                              email: prev.email || c.email || '',
                              phone: prev.phone || c.phone || '',
                              vat: prev.vat || c.vat || '',
                              svat: prev.svat || c.svat || ''
                            }));"""

replacement = """                            setFormData((prev: any) => ({
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
                            }));"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched successfully")
else:
    print("Target not found")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Leads.tsx', 'w', 'utf-8') as f:
    f.write(content)