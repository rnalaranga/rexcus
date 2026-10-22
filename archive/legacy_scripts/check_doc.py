with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if 'Document Details' in line or 'DOCUMENT HEADER' in line:
        start = i
    if start != -1 and 'Bill of Materials' in line:
        end = i
        break

if start != -1:
    print(f'Lines {start+1} - {end+1}')
    print(''.join(lines[start:end+5]))
