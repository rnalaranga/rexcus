with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '{/* Section 3: Customer Quotation */}' in line:
        start = i
    if '{/* RIGHT COLUMN: AI & LIVE PREVIEW */}' in line:
        end = i
        break

print(f'Start: {start}, End: {end}')