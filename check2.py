import os
file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Show context around QuotationPrintView usage
for i, line in enumerate(lines):
    if 'QuotationPrintView' in line:
        start = max(0, i-15)
        end = min(len(lines), i+5)
        for j in range(start, end):
            print(f'L{j+1}: {lines[j].rstrip()}')
        print()
