with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'overflow-x-auto transition-all' in line:
        print(f'{i}: {line.strip()}')