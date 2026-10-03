import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update tableInputClass
old_tic = 'const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-rex-500 focus:bg-surface px-2 py-1 text-xs outline-none transition-all"'
new_tic = 'const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-primary px-2 py-1.5 text-[12px] outline-none transition-all placeholder:text-muted/30 text-primary"'
content = content.replace(old_tic, new_tic)

# 2. Update BOM Tables headers
content = content.replace('text-[11px] font-black uppercase tracking-widest text-muted', 'text-[13px] font-medium text-secondary')
content = content.replace('text-[10px] text-muted uppercase tracking-wider', 'text-[11px] text-muted font-medium border-b border-theme-subtle/40 bg-surface2/30')

# 3. Update table cell borders
content = content.replace(' border-r border-theme-subtle/30', '')
content = content.replace(' border-l border-theme-subtle/30', '')
content = content.replace('border-b border-theme-subtle/30', 'border-b border-theme-subtle/10')
content = content.replace('border border-theme-subtle', 'border border-theme-subtle/40')

# 4. Remove striped rows in BOM autoMats and manualMats
striped = " className={'border-b border-theme-subtle/10 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}"
clean_row = " className='border-b border-theme-subtle/10 hover:bg-surface/20 transition-colors'"
content = content.replace(striped, clean_row)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Cleaned BOM UI')