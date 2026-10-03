with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '{/* RIGHT COLUMN: AI & LIVE PREVIEW */}' in line:
        # Insert a </div> before this line
        lines.insert(i, '        </div>\n')
        break
with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)