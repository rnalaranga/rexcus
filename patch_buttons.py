import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace Work Order button to include Receive Sample
target_buttons = """                      <Button variant="primary" size="sm" onClick={() => setWoDialog({ type: 'confirm', group, latestMain })} className="h-6 text-[10px]">Create Work Order</Button>"""
new_target_buttons = """                      <Button variant="primary" size="sm" onClick={() => setWoDialog({ type: 'confirm', group, latestMain })} className="h-6 text-[10px]">Create Work Order</Button>
                      {latestMain.status === 'Approved' && (
                        <Button variant="primary" size="sm" onClick={() => {
                          const items = (typeof latestMain.data === 'string' ? JSON.parse(latestMain.data) : latestMain.data)?.jobItems?.map((i: any) => `${i.desc} (Qty: ${i.qty})`).join('\\n') || '';
                          setGrnDialog({ group, latestMain, items, receivedAt: new Date().toISOString().split('T')[0], notes: '' });
                        }} className="bg-emerald-600 hover:bg-emerald-700 h-6 text-[10px]">Receive Sample (GRN)</Button>
                      )}"""
content = content.replace(target_buttons, new_target_buttons)

# Inject View Costing button
pattern = re.compile(r'(<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">\s*<Briefcase size=\{14\} />\s*</div>\s*<div>\s*<p className="text-xs font-bold text-secondary">\{bom\.title \|\| `BOM Part \$\{idx \+ 1\}`\}</p>\s*<span className="text-\[10px\] font-bold text-amber-600 font-mono">\{formatCurrency\(bom\.bomTotal \|\| 0\)\}</span>\s*</div>\s*</div>\s*</div>)')
match = pattern.search(content)
if match:
    better_new_block = """                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                 <Briefcase size={14} />
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                                 <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                               </div>
                             </div>
                             <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewBomDialog(bom); }} className="text-[11px] h-7 bg-surface border border-theme-subtle/50 shadow-sm hover:bg-primary/10 hover:text-primary transition-colors">View Costing</Button>
                           </div>"""
    content = content[:match.start()] + better_new_block + content[match.end():]
    
with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)