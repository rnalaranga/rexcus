import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'className="border-b border-theme-subtle text-[11px] text-muted font-medium border-b border-theme-subtle/40 bg-surface2/30"',
    'className="border-b border-theme-subtle/40 text-[11px] text-muted font-medium bg-surface2/30"'
)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)