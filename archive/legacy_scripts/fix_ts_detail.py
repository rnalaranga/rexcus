with open('src/pages/crm/CustomerDetail.tsx', 'r') as f:
    code = f.read()

code = code.replace("setFormData(f =>", "setFormData((f: any) =>")

with open('src/pages/crm/CustomerDetail.tsx', 'w') as f:
    f.write(code)

