import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Leads.tsx', 'r', 'utf-8') as f:
    content = f.read()

pattern = re.compile(r"setFormData\(\(prev: any\) => \(\{\s*\.\.\.prev,\s*customerId: val,\s*name: prev\.name \|\| c\.name \|\| '',\s*company: prev\.company \|\| c\.company \|\| '',\s*email: prev\.email \|\| c\.email \|\| '',\s*phone: prev\.phone \|\| c\.phone \|\| '',\s*vat: prev\.vat \|\| c\.vat \|\| '',\s*svat: prev\.svat \|\| c\.svat \|\| ''\s*\}\)\);")

replacement = """setFormData((prev: any) => ({
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

if pattern.search(content):
    content = pattern.sub(replacement, content)
    print("Patched successfully")
else:
    print("Target not found")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Leads.tsx', 'w', 'utf-8') as f:
    f.write(content)