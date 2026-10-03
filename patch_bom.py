import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update BOM Header
old_header = '''              <GlassCard key={bom.id} className="p-0 overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-surface2/50 cursor-pointer border-b border-theme-subtle"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => updateBOM(bom.id, { collapsed: !bom.collapsed })} className="p-1 hover:bg-surface rounded text-muted hover:text-primary">
                      {bom.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <div className="flex flex-col gap-1 w-full max-w-lg">
                      <input 
                        type="text" 
                        value={bom.title} 
                        onChange={e => updateBOM(bom.id, { title: e.target.value })} 
                        className="bg-transparent font-bold text-primary outline-none focus:border-b focus:border-rex-500 w-full" 
                        onClick={e => e.stopPropagation()}
                        placeholder="BOM Title"
                      />
                      <input 
                        type="text" 
                        value={bom.description || ''} 
                        onChange={e => updateBOM(bom.id, { description: e.target.value })} 
                        className="bg-transparent text-xs text-muted outline-none focus:border-b focus:border-rex-500 w-full" 
                        onClick={e => e.stopPropagation()}
                        placeholder="Optional detailed description..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold bg-rex-500/10 text-rex-600 px-3 py-1 rounded-lg">
                      {formatCurrency(bomTotal)}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeBOM(bom.id); }} className="text-red-500/60 hover:text-red-500 p-2 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>'''

new_header = '''              <GlassCard key={bom.id} className="p-0 overflow-hidden border border-theme-subtle/50 shadow-md mb-6">
                <div 
                  className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent cursor-pointer border-b border-theme-subtle/40 hover:bg-surface2/60 transition-colors"
                  onClick={() => updateBOM(bom.id, { collapsed: !bom.collapsed })}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button className="p-1.5 bg-surface border border-theme-subtle/50 rounded-lg text-muted hover:text-primary transition-colors shadow-sm">
                      {bom.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <div className="flex flex-col gap-1 w-full max-w-lg">
                      <input 
                        type="text" 
                        value={bom.title} 
                        onChange={e => updateBOM(bom.id, { title: e.target.value })} 
                        className="bg-transparent font-bold text-[14px] text-primary outline-none placeholder:text-muted/40 transition-colors focus:text-primary w-full" 
                        onClick={e => e.stopPropagation()}
                        placeholder="e.g. Pump Shaft Assembly"
                      />
                      <input 
                        type="text" 
                        value={bom.description || ''} 
                        onChange={e => updateBOM(bom.id, { description: e.target.value })} 
                        className="bg-transparent text-[11px] text-muted outline-none placeholder:text-muted/30 w-full" 
                        onClick={e => e.stopPropagation()}
                        placeholder="Optional detailed description or specifications..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase tracking-widest text-muted/60 font-bold mb-0.5">Sub-Total</span>
                      <span className="text-sm font-mono font-black text-primary bg-primary/5 px-2.5 py-0.5 rounded border border-primary/10 shadow-sm">
                        {formatCurrency(bomTotal)}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeBOM(bom.id); }} className="text-red-400/50 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all ml-1 bg-surface border border-theme-subtle/50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>'''

content = content.replace(old_header, new_header)

# 2. Update Machining TR
content = content.replace(
    '<tr key={proc.name} className="hover:bg-surface/30 transition-colors">',
    '<tr key={proc.name} className="hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors group">'
)
content = content.replace(
    '<td className="px-5 py-1.5 text-xs text-secondary">{proc.name}</td>',
    '<td className="px-5 py-1.5 text-xs text-secondary font-medium group-hover:text-primary">{proc.name}</td>'
)

# 3. Update table input class inside machining operations to not overwrite row background
content = content.replace(
    'className={tableInputClass}',
    'className={tableInputClass + " group-hover:bg-transparent"}'
)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Patched successfully')