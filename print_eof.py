with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(len(lines)-15, len(lines)):
    print(f'{i}: {lines[i]}')