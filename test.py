import os
file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)-1, -1, -1):
    if 'return (' in lines[i]:
        print(''.join(lines[i:i+30]))
        break
