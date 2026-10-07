with open('src/components/crm/CustomerModal.tsx', 'r') as f:
    code = f.read()

code = code.replace("contacts: [] }", "contacts: [] as any[] }")
code = code.replace("contacts: []\n", "contacts: [] as any[]\n")

with open('src/components/crm/CustomerModal.tsx', 'w') as f:
    f.write(code)

with open('src/pages/crm/Leads.tsx', 'r') as f:
    code = f.read()

code = code.replace("setFormData(f =>", "setFormData((f: any) =>")

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(code)

