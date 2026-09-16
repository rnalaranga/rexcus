const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /<Modal isOpen=\{!!trackWO\}[\s\S]*?<\/Modal>/;

const newModal = `
      <Modal isOpen={!!trackWO} onClose={() => setTrackWO(null)} title="Work Order Dashboard & Shop Floor" size="2xl">
        {trackWO && (
          <div className="flex flex-col max-h-[85vh] bg-surface text-secondary">
            {/* Header - Lighter, professional */}
            <div className="shrink-0 p-6 border-b border-theme-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <Badge value={trackWO.priority} variant={trackWO.priority === 'High' ? 'error' : 'default'} />
                  <span className="text-xs font-semibold px-2 py-0.5 border border-theme-subtle rounded-md text-secondary">{trackWO.status}</span>
                </div>
                <h2 className="text-xl font-bold text-primary">{trackWO.title}</h2>
                <p className="text-sm font-mono text-muted mt-0.5">Reference: {trackWO.id}</p>
              </div>
              <div className="flex gap-3 items-center">
                 <div className="text-right bg-surface2/50 px-4 py-2 border border-theme-subtle rounded-lg">
                   <p className="text-[10px] uppercase font-bold text-muted tracking-wider">Completion</p>
                   <p className="text-lg font-bold text-primary">
                     {Math.round((trackWO.operations?.filter((o:any) => o.status === 'Completed').length || 0) / (trackWO.operations?.filter((o:any) => parseFloat(o.plannedHours) > 0).length || 1) * 100)}%
                   </p>
                 </div>
              </div>
            </div>

            {/* Content Split */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left Column - Resources & Stores */}
              <div className="w-full md:w-[45%] border-r border-theme-subtle flex flex-col overflow-y-auto">
                <div className="p-6 space-y-8">
                  
                  {/* Accessories & Consumables Dispatch (Pro Autocomplete) */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <Wrench size={16} className="text-rex-500"/> Stores Dispatch Request
                      </h3>
                      <span className="text-[9px] bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Pro</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 block">Search Item from Stock</label>
                        <input 
                          value={accSearch} 
                          onChange={e => {
                            setAccSearch(e.target.value);
                            setAccOpen(true);
                            if(!e.target.value) setAccId('');
                          }} 
                          onFocus={() => setAccOpen(true)}
                          className="w-full input-base text-sm font-medium focus:border-rex-500/50" 
                          placeholder="e.g. End Mill, Coolant..."
                        />
                        {accOpen && accSearch && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-full bg-surface border border-theme-subtle shadow-xl rounded-lg py-1 max-h-48 overflow-y-auto">
                            {inventory.filter(i => (i.type === 'consumable' || i.type === 'accessory' || !i.type) && i.name.toLowerCase().includes(accSearch.toLowerCase())).length > 0 ? (
                              inventory.filter(i => (i.type === 'consumable' || i.type === 'accessory' || !i.type) && i.name.toLowerCase().includes(accSearch.toLowerCase())).map(i => (
                                <button 
                                  key={i.id} 
                                  className="w-full text-left px-3 py-2 hover:bg-surface2/50 text-sm flex justify-between items-center border-b border-theme-subtle/50 last:border-0"
                                  onClick={() => {
                                    setAccId(i.id);
                                    setAccSearch(i.name);
                                    setAccOpen(false);
                                  }}
                                >
                                  <span className="font-semibold text-primary">{i.name}</span>
                                  <span className={\`text-xs font-mono \${i.quantity > 0 ? 'text-green-500' : 'text-red-500'}\`}>{i.quantity} {i.unit}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-muted">No stock matches found.</div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {accId && (
                        <div className="flex gap-3 items-end p-3 bg-surface2/30 border border-theme-subtle rounded-lg animate-fade-in">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Req. Qty</label>
                            <input type="number" min="0.1" step="any" value={accQty} onChange={e => setAccQty(Number(e.target.value))} className="w-full input-base font-mono text-sm"/>
                          </div>
                          <Button variant="primary" size="sm" className="h-[38px] shrink-0 font-bold bg-rex-600 hover:bg-rex-700 text-white border-none shadow-sm" onClick={handleDispatchAccessory}>
                            Confirm Dispatch
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dispatched Ledger History */}
                  <div>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <ListChecks size={14} className="text-muted"/> Dispatch History
                    </h3>
                    <div className="space-y-2">
                      {dispatchedHistory.length > 0 ? (
                        dispatchedHistory.map((h, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-surface2/20 border border-theme-subtle/60 rounded-md">
                            <div>
                              <p className="text-xs font-semibold text-primary">{h.materialName}</p>
                              <p className="text-[10px] text-muted">{new Date(h.createdAt).toLocaleString()}</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-rex-500">{h.qty} {h.unit}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted text-center py-4 border border-dashed border-theme-subtle rounded-md">No items dispatched yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Raw Materials BOM */}
                  <div>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Package size={14} className="text-muted"/> Quotation BOM (Raw Materials)
                    </h3>
                    {trackWO.bom && trackWO.bom !== 'null' && trackWO.bom !== '[]' ? (
                      <div className="border border-theme-subtle rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-surface2/30 border-b border-theme-subtle text-[10px] uppercase text-muted">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Material</th>
                              <th className="px-3 py-2 font-semibold">Qty</th>
                              <th className="px-3 py-2 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/40">
                            {JSON.parse(trackWO.bom).map((b: any, i: number) => (
                              <tr key={i} className="hover:bg-surface2/30 transition-colors">
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-xs text-primary">{b.material}</p>
                                  <p className="text-[9px] text-muted">{b.notes}</p>
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px]">{b.qty} {b.unit}</td>
                                <td className="px-3 py-2 text-right">
                                  <button onClick={() => handleDispatch(b, trackWO.id)} className="text-[9px] text-rex-600 hover:text-white border border-theme-subtle hover:bg-rex-600 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider transition-all shadow-sm">
                                    Dispatch
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted text-center py-4 border border-dashed border-theme-subtle rounded-md">No raw materials in quote.</p>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* Right Column - Timeline */}
              <div className="w-full md:w-[55%] flex flex-col overflow-y-auto bg-surface2/10">
                <div className="p-8">
                  <h3 className="text-sm font-bold text-primary mb-6 flex items-center gap-2">
                    <ListChecks size={16} className="text-rex-500"/> Operation Routing Timeline
                  </h3>
                  <div className="relative border-l-2 border-theme-subtle ml-3 space-y-6 pb-6">
                    {trackWO.operations?.filter((o:any) => parseFloat(o.plannedHours) > 0).map((op: any, i: number) => {
                      const m = machineries.find(m => m.id === op.machineId);
                      const e = employees.find(e => e.id === op.employeeId);
                      const isComplete = op.status === 'Completed';
                      const isProgress = op.status === 'In Progress';
                      const isFailed = op.status === 'Rework Required';
                      const isQc = op.status === 'QC Pending';
                      
                      return (
                        <div key={op.id} className="relative pl-8 group">
                          {/* Timeline Dot */}
                          <div className={\`absolute -left-[13px] top-1 w-6 h-6 rounded-full border-4 border-surface flex items-center justify-center text-[10px] font-bold shadow-sm \${isComplete ? 'bg-green-500 text-white' : isProgress ? 'bg-blue-500 text-white' : isFailed ? 'bg-red-500 text-white' : isQc ? 'bg-amber-500 text-white' : 'bg-surface2 text-muted group-hover:bg-theme-subtle'}\`}>
                            {isComplete ? <CheckCircle size={10}/> : isFailed ? <AlertTriangle size={10}/> : (i+1)}
                          </div>
                          
                          {/* Card */}
                          <div className={\`p-4 rounded-xl border \${isComplete ? 'border-green-500/20 bg-green-500/5' : isProgress ? 'border-blue-500/40 bg-blue-500/5 shadow-md shadow-blue-500/5' : isFailed ? 'border-red-500/30 bg-red-500/5' : isQc ? 'border-amber-500/30 bg-amber-500/5' : 'border-theme-subtle bg-surface'} transition-all\`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-primary text-sm tracking-wide">{op.operationName}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-medium text-secondary">
                                  <span className="flex items-center gap-1.5"><Settings size={12} className="text-muted"/> {m?.name||'Any Machine'}</span>
                                  <span className="flex items-center gap-1.5"><Users size={12} className="text-muted"/> {e?.name||'Any Operator'}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 bg-surface2/30 px-2 py-1 rounded border border-theme-subtle/50">
                                <span className="font-mono text-[10px] text-muted">EST: </span><span className="font-mono text-xs font-semibold mr-2">{op.plannedHours}h</span>
                                {op.actualHours > 0 && <><span className="font-mono text-[10px] text-muted">ACT: </span><span className="font-mono text-xs font-semibold text-blue-500">{Number(op.actualHours).toFixed(1)}h</span></>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 items-center pt-3 mt-1">
                              {op.status === 'Pending' && <Button variant="ghost" size="sm" className="h-7 text-[10px] text-blue-500 hover:bg-blue-500/10 border border-blue-500/20" onClick={() => handleUpdateOpStatus(op.id,'In Progress')}><Play size={10} className="mr-1.5"/> Start</Button>}
                              {op.status === 'In Progress' && <Button variant="ghost" size="sm" className="h-7 text-[10px] text-green-600 hover:bg-green-600/10 border border-green-500/20" onClick={() => handleUpdateOpStatus(op.id,'QC Pending')}><CheckCircle size={10} className="mr-1.5"/> Finish</Button>}
                              {op.status === 'QC Pending' && <Button variant="primary" size="sm" className="h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm" onClick={() => setShowQcModal(op)}><AlertTriangle size={10} className="mr-1.5"/> QC Inspection</Button>}
                              
                              {/* QC Results log */}
                              {(isFailed || isComplete) && op.qc?.map((q: any) => (
                                <div key={q.id} className={\`px-2 py-1 text-[10px] rounded font-semibold border \${q.status==='Pass'?'bg-green-500/5 text-green-600 border-green-500/20':'bg-red-500/5 text-red-600 border-red-500/20'}\`}>
                                  QC {q.status}: {q.notes||q.defectReason||'Passed'}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
`;

content = content.replace(regex, newModal);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');