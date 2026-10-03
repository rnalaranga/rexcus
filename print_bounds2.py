with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(1295, 1304):
    print(f'{i}: {lines[i].strip()}')