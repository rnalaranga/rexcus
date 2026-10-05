import sys

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    content = f.read()

# Add Drafts section
find_list = """      {/* Quotation Groups */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">"""

rep_list = """      {/* Quotation Groups */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {groups.some(g => g.latestMain?.type === 'draft') && (
           <div className="mb-8">
             <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <FileEdit size={16} /> Active Drafts
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groups.filter(g => g.latestMain?.type === 'draft').map(g => {
                   const lead = customers?.find(c => c.id === g.leadId) || leads?.find(l => l.id === g.leadId)
                   const snap = g.latestMain?.data ? (typeof g.latestMain.data === 'string' ? JSON.parse(g.latestMain.data) : g.latestMain.data) : null
                   return (
                     <div key={g.latestMain.id} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 hover:border-orange-500/40 transition-colors relative group">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Draft</span>
                           <span className="text-xs text-muted font-mono">{String(g.latestMain.date).slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <h4 className="font-bold text-sm text-primary truncate">{lead?.name || snap?.customerName || 'Unknown Customer'}</h4>
                        {snap?.subject && <p className="text-xs text-muted truncate mt-1">{snap.subject}</p>}
                        
                        <div className="mt-4 flex gap-2">
                           <button onClick={() => navigate(`/crm/quotation-builder/${g.leadId || 'WALK-IN'}?quoteId=${g.latestMain.id}`)} className="flex-1 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
                             Resume Draft
                           </button>
                        </div>
                     </div>
                   )
                })}
             </div>
           </div>
        )}"""

content = content.replace(find_list, rep_list)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(content)
print("Updated Quotations list for Drafts")
