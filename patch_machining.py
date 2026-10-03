import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Make the group title red
old_group = 'className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">{group.group}'
new_group = 'className="px-4 py-2 text-[10.5px] font-black text-red-500/90 uppercase tracking-widest">{group.group}'
content = content.replace(old_group, new_group)

# 2. Indent the sub items
old_sub = 'className="px-4 py-1.5 text-[11px] text-secondary font-medium group-hover:text-primary border-r border-theme-subtle/10">{proc.name}'
new_sub = 'className="pl-8 pr-4 py-1.5 text-[11px] text-secondary font-medium group-hover:text-primary border-r border-theme-subtle/10 relative before:content-[\'\'] before:absolute before:left-4 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:border-l before:border-b before:border-theme-subtle/50">{proc.name}'
content = content.replace(old_sub, new_sub)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated machining rows design')