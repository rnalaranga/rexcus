with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(968, 975):
    print(f"{i+1}: {lines[i].strip()}")
for i in range(1078, 1085):
    print(f"{i+1}: {lines[i].strip()}")