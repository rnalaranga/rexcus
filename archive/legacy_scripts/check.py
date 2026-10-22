import os
file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Find key sections
for i, line in enumerate(lines):
    if 'QuotationPrintView' in line or 'Live Preview' in line or 'w-[450px]' in line or 'RIGHT COLUMN' in line:
        print(f'L{i+1}: {line.rstrip()}')
