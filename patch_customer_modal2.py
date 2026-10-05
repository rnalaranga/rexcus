import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/crm/CustomerModal.tsx', 'r', 'utf-8') as f:
    content = f.read()

pattern = re.compile(r'<div className="grid grid-cols-6 gap-4">\s*<div className="space-y-1\.5 col-span-6 sm:col-span-3">\s*<label className="text-\[10px\] font-semibold text-secondary uppercase tracking-wider">Company\s*Name</label>')

replacement = """<div className="grid grid-cols-6 gap-4">
                <div className="space-y-1.5 col-span-6 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Prefix</label>
                  <input value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} className="w-full input-base" placeholder="ACM" maxLength={5} />
                </div>
                <div className="space-y-1.5 col-span-6 sm:col-span-3">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company Name</label>"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
    print("Patched successfully")
else:
    print("Target not found")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/crm/CustomerModal.tsx', 'w', 'utf-8') as f:
    f.write(content)