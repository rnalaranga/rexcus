import sys

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    content = f.read()

find_grid = """      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 && ("""

rep_grid = """      <div className="grid grid-cols-1 gap-4">
        {groups.some(g => g.main[0]?.type === 'draft') && (
           <div className="mb-4">
             <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <FileEdit size={16} /> Active Drafts
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groups.filter(g => g.main[0]?.type === 'draft').map(g => {
                   const lead = customers?.find(c => c.id === g.leadId) || leads?.find(l => l.id === g.leadId)
                   const snap = g.main[0]?.data ? (typeof g.main[0].data === 'string' ? JSON.parse(g.main[0].data) : g.main[0].data) : null
                   return (
                     <div key={g.main[0].id} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 hover:border-orange-500/40 transition-colors relative group">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                           <span className="text-xs text-muted font-mono">{String(g.main[0].date).slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <h4 className="font-bold text-sm text-primary truncate">{lead?.name || snap?.customerName || 'Unknown Customer'}</h4>
                        {snap?.subject && <p className="text-xs text-muted truncate mt-1">{snap.subject}</p>}
                        
                        <div className="mt-4 flex gap-2">
                           <button onClick={() => navigate(`/crm/quotation-builder/${g.leadId || 'WALK-IN'}?quoteId=${g.main[0].id}`)} className="flex-1 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
                             Resume Draft
                           </button>
                        </div>
                     </div>
                   )
                })}
             </div>
           </div>
        )}
        
        {filtered.length === 0 && ("""

content = content.replace(find_grid, rep_grid)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(content)
print("Added Active Drafts section to Quotations.tsx")
