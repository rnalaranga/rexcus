with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '{/* Customer Summary Card on the right */}' in line:
        start = i
    if '{/* Profit Indicator */}' in line:
        end = i
        break

print(f'Start: {start}, End: {end}')