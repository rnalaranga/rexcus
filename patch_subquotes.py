import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

new_sub_quotes = """              {/* Sub-Quotes (Job & Customer) */}
              <div className="p-3 bg-surface/30 flex flex-col divide-y divide-theme-subtle">
                {/* New BOMs display */}
                {latestMain && (() => {
                   let boms = [];
                   try { 
                     const parsed = typeof latestMain.data === 'string' ? JSON.parse(latestMain.data) : latestMain.data;
                     boms = parsed.boms || [];
                   } catch(e) {}
                   if (boms.length > 0) {
                     return boms.map((bom: any, idx: number) => {
                       return (
                         <div key={bom.id} className="px-4 py-2 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                               <Briefcase size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-secondary">{bom.title || `BOM Part ${idx + 1}`}</p>
                               <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(bom.bomTotal || 0)}</span>
                             </div>
                           </div>
                           <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewBomDialog(bom); }} className="text-[11px] h-7 bg-surface border border-theme-subtle/50 shadow-sm hover:bg-primary/10 hover:text-primary transition-colors">View Costing</Button>
                         </div>
                       )
                     })
                   }
                   return null;
                })()}

                {/* Legacy Job Costing Branch */}
                {latestJob && (!latestMain || (() => { try { return !(JSON.parse(latestMain.data || '{}').boms?.length > 0) } catch(e){return true} })()) && (
                  <div className="px-4 py-2 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Briefcase size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">Internal BOM (Job Costing)</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">v{latestJob.version}</span>
                          <span className="text-[10px] font-bold text-amber-600 font-mono">{formatCurrency(Number(latestJob.totalAmount))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewData({ quotation: latestJob, type: 'job', lead: { name: group.leadName, company: group.leadCompany, address: '' } }); }} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestJob.id}`); }} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Legacy Customer Quote Branch */}
                {latestCust && (
                  <div className="px-4 py-2 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">Customer Quotation</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted font-mono">v{latestCust.version}</span>
                          <span className="text-[10px] font-bold text-blue-600 font-mono">{formatCurrency(Number(latestCust.totalAmount))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPreviewData({ quotation: latestCust, type: 'customer', lead: { name: group.leadName, company: group.leadCompany, address: '' } }); }} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${group.leadId}?quoteId=${latestCust.id}`); }} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
"""

pattern = re.compile(r'\{\/\* Sub-Quotes \(Job & Customer\) \*\/\}.*?<\/GlassCard>', re.DOTALL)
match = pattern.search(content)

if match:
    content = content[:match.start()] + new_sub_quotes + content[match.end():]
    print("Replaced Sub-Quotes successfully!")
else:
    print("Could not find Sub-Quotes block.")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)