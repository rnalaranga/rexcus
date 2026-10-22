import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# Invoice Details GlassCard
content = content.replace('<GlassCard className="p-5 flex flex-col">', '<GlassCard className="p-4 flex flex-col">')
content = content.replace('<h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">\n                <Calendar size={16} className="text-blue-500" /> Details & References\n              </h2>', '<h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-3">\n                <Calendar size={16} className="text-blue-500" /> Details & References\n              </h2>')
content = content.replace('<div className="flex-1 overflow-y-auto pr-2 space-y-4">', '<div className="flex-1 overflow-y-auto pr-2 space-y-3">')
content = content.replace('<div className="grid grid-cols-2 gap-3 border-t border-theme-subtle pt-3">', '<div className="grid grid-cols-2 gap-3 border-t border-theme-subtle pt-2 mt-1">')
content = content.replace('<div className="border-t border-theme-subtle pt-3">', '<div className="border-t border-theme-subtle pt-2 mt-1">')

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
