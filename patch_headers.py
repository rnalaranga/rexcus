import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

old_class = 'className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/80 transition-colors"'
new_class = 'className="flex justify-between items-center px-4 py-3 bg-white dark:bg-surface border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]"'

content = content.replace(old_class, new_class)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated header backgrounds')