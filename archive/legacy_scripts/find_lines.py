with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '/* Section 1: Document Details */' in line:
        start = i
    if start != -1 and '/* Section 2: BOMs */' in line:
        end = i
        break

print(f'START: {start+1}, END: {end}')
