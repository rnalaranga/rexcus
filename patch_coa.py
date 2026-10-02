import re

with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/AccountingHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add collapsedGroups state
state_match = 'const [expandedJournal, setExpandedJournal] = useState<string | null>(null);'
new_state = state_match + '\n  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});\n'
content = content.replace(state_match, new_state)

# Add Chevron icons to imports if missing
if 'ChevronRight' not in content:
    content = content.replace('ChevronDown, ChevronUp,', 'ChevronDown, ChevronUp, ChevronRight,')

# Replace the COA rendering
start_str = '{/* Account Rows */}'
end_str = '</div>\n            );\n          })}\n        </div>'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str) + len('</div>')
    
    new_render = '''{/* Account Rows by Subtype */}
                  <div className="border border-t-0 border-theme-subtle rounded-b-lg overflow-hidden bg-surface/30">
                    {(() => {
                      // Group by subtype
                      const subGroups = accs.reduce((acc, curr) => {
                        const sub = curr.subtype || curr.type;
                        if (!acc[sub]) acc[sub] = [];
                        acc[sub].push(curr);
                        return acc;
                      }, {} as Record<string, any[]>);

                      return Object.entries(subGroups).sort(([a], [b]) => a.localeCompare(b)).map(([sub, subAccs]) => {
                        const groupKey = ${type}-;
                        const isCollapsed = collapsedGroups[groupKey];
                        const subTotal = subAccs.reduce((s, a) => s + Number(a.balance || 0), 0);
                        
                        return (
                          <div key={sub} className="border-b border-theme-subtle/50 last:border-0">
                            {/* Subtype Header */}
                            <button
                              onClick={() => setCollapsedGroups(p => ({ ...p, [groupKey]: !p[groupKey] }))}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface hover:bg-surface2 transition-colors border-l-2 border-transparent hover:border-blue-500"
                            >
                              <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronRight size={14} className="text-muted"/> : <ChevronDown size={14} className="text-blue-500"/>}
                                <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">{sub}</span>
                                <span className="text-[10px] text-muted ml-2 bg-theme-subtle/50 px-1.5 py-0.5 rounded-full">{subAccs.length}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-secondary">{formatCurrency(subTotal)}</span>
                            </button>

                            {/* Subtype Accounts */}
                            {!isCollapsed && (
                              <div className="divide-y divide-theme-subtle/30 bg-surface/50">
                                {subAccs.map((acc, idx) => (
                                  <div key={acc.id} className="flex items-center gap-4 px-6 py-2.5 hover:bg-surface2 transition-colors group pl-8">
                                    {/* Code Badge */}
                                    <div className={w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-white font-black text-[9px] }>
                                      {acc.code.substring(0, 4)}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-primary">{acc.name}</p>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-sm font-bold font-mono text-primary">{formatCurrency(Number(acc.balance || 0))}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setEditAccount(acc); setShowAddAccount(true); }} className="p-1 rounded hover:bg-amber-500/10 text-amber-500" title="Edit"><Edit2 size={14} /></button>
                                      <button onClick={() => openLedger(acc)} className="p-1 rounded hover:bg-blue-500/10 text-blue-500" title="Ledger"><BookOpen size={14} /></button>
                                      <button onClick={() => handleDelete(acc)} className="p-1 rounded hover:bg-rose-500/10 text-rose-500" title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>'''
    
    content = content[:start_idx] + new_render + content[end_idx:]
    with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/AccountingHub.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Failed to find markers')
