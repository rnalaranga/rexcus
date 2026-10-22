with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(len(lines)-20, len(lines)):
    print(f'{i}: {lines[i].strip()}')