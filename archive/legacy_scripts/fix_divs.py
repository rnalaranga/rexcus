import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className={overflow-x-auto transition-all }>',
    '<div className={`overflow-x-auto transition-all ${bom.autoCollapsed ? "hidden" : "block"}`}>\n'
)

# Wait, wait, it replaced ALL of them with the SAME string. But the variables are different!
# Oh, the first one is autoCollapsed, the second is manualCollapsed, the third is machiningCollapsed.
# I need to do it by occurrence or by context.