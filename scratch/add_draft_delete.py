import sys
import re

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    content = f.read()

find_html = """                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                           <span className="text-xs text-muted font-mono">{String(g.main[0].date).slice(0, 16).replace('T', ' ')}</span>
                        </div>"""

rep_html = """                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-muted font-mono">{String(g.main[0].date).slice(0, 16).replace('T', ' ')}</span>
                             <button 
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 if (await showConfirm('Are you sure you want to delete this draft?', 'Delete Draft', { confirmLabel: 'Delete', destructive: true })) {
                                   await deleteQuotation(g.main[0].id);
                                   refetch();
                                 }
                               }} 
                               className="text-red-500/70 hover:text-red-500 transition-colors p-0.5"
                               title="Delete Draft"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>"""

content = content.replace(find_html, rep_html)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(content)
print("Added delete button to drafts")
