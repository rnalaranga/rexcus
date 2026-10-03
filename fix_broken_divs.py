import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

replaced = 0
for i, line in enumerate(lines):
    if '<div className={overflow-x-auto transition-all }>' in line:
        if replaced == 0:
            lines[i] = line.replace('<div className={overflow-x-auto transition-all }>', '<div className={`overflow-x-auto transition-all ${bom.autoCollapsed ? "hidden" : "block"}`}>')
        elif replaced == 1:
            lines[i] = line.replace('<div className={overflow-x-auto transition-all }>', '<div className={`overflow-x-auto transition-all ${bom.manualCollapsed ? "hidden" : "block"}`}>')
        elif replaced == 2:
            lines[i] = line.replace('<div className={overflow-x-auto transition-all }>', '<div className={`overflow-x-auto transition-all ${bom.machiningCollapsed ? "hidden" : "block"}`}>')
        replaced += 1

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.writelines(lines)

print(f'Fixed {replaced} lines')