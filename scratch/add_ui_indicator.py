import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_topbar = """        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/quotations')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Quotation Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">{lead?.name || customerName || 'Walk-in Customer'}{lead?.company ? ' · ' + lead.company : ''}</p>
          </div>
        </div>"""

rep_topbar = """        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/quotations')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-lg font-black text-primary tracking-tight">Quotation Builder</h1>
               {saveStatus !== 'idle' && (
                 <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${saveStatus === 'saving' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                   {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved to Drafts'}
                 </span>
               )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">{lead?.name || customerName || 'Walk-in Customer'}{lead?.company ? ' · ' + lead.company : ''}</p>
          </div>
        </div>"""

content = content.replace(find_topbar, rep_topbar)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added UI indicator")
