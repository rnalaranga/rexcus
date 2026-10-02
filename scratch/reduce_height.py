import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Update textarea for auto-resizing
old_textarea = "<textarea value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} placeholder=\"Description…\\n(Multiple lines allowed)\" className={`${tableInputClass} resize-y min-h-[40px] leading-relaxed`} rows={2} />"
new_textarea = "<textarea value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} placeholder=\"Description…\\n(Multiple lines allowed)\" className={`${tableInputClass} resize-none overflow-hidden min-h-[40px] leading-relaxed`} rows={2} />"
content = content.replace(old_textarea, new_textarea)

# 2. Reduce padding in Bill To card
# The GlassCard for Bill To
content = content.replace('<GlassCard className="col-span-2 p-5">', '<GlassCard className="col-span-2 p-4">')

# The Header mb-4 -> mb-2
content = content.replace('<div className="flex items-center justify-between mb-4">', '<div className="flex items-center justify-between mb-2">')

# The customer grid gap-5 -> gap-4
content = content.replace('<div className="grid grid-cols-2 gap-5">', '<div className="grid grid-cols-2 gap-4">')

# The Select Customer label mb-1.5 -> mb-1
content = content.replace('label className="block text-[10px] font-bold text-muted uppercase mb-1.5">', 'label className="block text-[10px] font-bold text-muted uppercase mb-1">')

# The customer info card padding and spacing
content = content.replace('<div className="p-3 bg-surface2/60 rounded-xl border border-theme-subtle space-y-2">', '<div className="p-2.5 bg-surface2/60 rounded-xl border border-theme-subtle space-y-1">')

# The VAT input section margin
content = content.replace('<div className="mt-2 pt-2 border-t border-theme-subtle">', '<div className="mt-1.5 pt-1.5 border-t border-theme-subtle">')

# The empty customer box padding
content = content.replace('<div className="p-3 bg-surface2/30 rounded-xl border border-dashed border-theme-subtle flex items-center justify-center">', '<div className="p-2 bg-surface2/30 rounded-xl border border-dashed border-theme-subtle flex items-center justify-center h-full">')

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)

print("Updates applied")
