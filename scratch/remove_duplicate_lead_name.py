import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

dup = """              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>"""

content = content.replace(dup, "")

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Removed duplicate Lead Full Name")
