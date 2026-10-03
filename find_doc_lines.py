with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if 'Document Details' in line and 'h2' in line:
        # Walk back to find the GlassCard start
        for j in range(i, max(0, i-10), -1):
            if 'GlassCard' in lines[j]:
                start = j
                break
    if start != -1 and 'Section 2: BOMs' in line:
        end = i
        break

print(f'START: {start+1}, END: {end+1}')
