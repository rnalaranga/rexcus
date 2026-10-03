import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add viewBomDialog State
state_hook = "  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)\n"
if "const [viewBomDialog" not in content:
    content = content.replace(state_hook, state_hook + "  const [viewBomDialog, setViewBomDialog] = useState<any>(null)\n")

# Add Package icon
content = content.replace("Factory, Printer", "Factory, Printer, Package")

# Add Button
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
                             <Button variant="ghost" size="sm" onClick={() => setViewBomDialog(bom)} className="text-[11px] h-7 bg-surface border border-theme-subtle/50 shadow-sm hover:bg-primary/10 hover:text-primary transition-colors">View Costing</Button>
                           </div>"""
    content = content[:match.start()] + better_new_block + content[match.end():]

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)
