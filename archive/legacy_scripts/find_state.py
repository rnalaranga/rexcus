with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'useSettings' in line or 'useAuth' in line:
        print(f'L{i+1}: {line.rstrip()}')
