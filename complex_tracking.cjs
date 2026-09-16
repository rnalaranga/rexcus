const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regex = /\{\/\* SHOP FLOOR TRACKING MODAL \*\/\}[\s\S]*?\{\/\* QC MODAL \*\/\}/;

const replacement = `
      {/* SHOP FLOOR TRACKING MODAL */}
      <Modal isOpen={!!trackWO} onClose={() => setTrackWO(null)} title="Shop Floor Dashboard" size="xl">
        {trackWO && (
          <div className="flex flex-col h-[80vh] bg-base">
            {/* Header */}
            <div className="shrink-0 bg-surface2/50 p-6 border-b border-theme-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge value={trackWO.priority} variant={trackWO.priority === 'High' ? 'error' : 'default'} />
                  <span className="text-xs font-mono font-bold text-rex-600 px-2 py-0.5 bg-rex-500/10 rounded">{trackWO.status}</span>
                </div>
                <h2 className="text-2xl font-black text-primary tracking-tight">{trackWO.title}</h2>
                <p className="text-sm font-mono text-secondary mt-1">{trackWO.id}</p>
              </div>
              <div className="flex gap-3 items-center">
                 <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-muted tracking-wider">Completion</p>
                   <p className="text-xl font-bold text-primary">
                     {Math.round((trackWO.operations?.filter((o:any) => o.status === 'Completed').length || 0) / (trackWO.operations?.filter((o:any) => parseFloat(o.plannedHours) > 0).length || 1) * 100)}%
                   </p>
                 </div>
              </div>
            </div>

            {/* Content Split */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left Column - Resources */}
              <div className="w-full md:w-5/12 border-r border-theme-subtle flex flex-col bg-surface/30 overflow-y-auto">
                <div className="p-5 space-y-6">
                  {/* BOM Section */}
                  <div>
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Package size={14} className="text-rex-500"/> Raw Materials BOM
                    </h3>
                    {trackWO.bom && trackWO.bom !== 'null' && trackWO.bom !== '[]' ? (
                      <div className="bg-base border border-theme-subtle rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-surface2/50 border-b border-theme-subtle text-[10px] uppercase text-muted">
                            <tr>
                              <th className="px-3 py-2 font-bold">Item</th>
                              <th className="px-3 py-2 font-bold">Qty</th>
                              <th className="px-3 py-2 font-bold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/50">
                            {JSON.parse(trackWO.bom).map((b: any, i: number) => (
                              <tr key={i} className="hover:bg-surface/50 transition-colors">
                                <td className="px-3 py-2">
                                  <p className="font-bold text-xs text-primary">{b.material}</p>
                                  <p className="text-[10px] text-muted">{b.notes}</p>
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{b.qty} {b.unit}</td>
                                <td className="px-3 py-2 text-right">
                                  <button onClick={() => handleDispatch(b, trackWO.id)} className="text-[9px] bg-rex-600/10 hover:bg-rex-600 text-rex-600 hover:text-white border border-rex-600/20 px-2 py-1 rounded font-bold uppercase tracking-wider transition-all">
                                    Dispatch
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-xs text-muted p-4 text-center border border-dashed border-theme-subtle rounded-lg">No raw materials in BOM.</div>
                    )}
                  </div>

                  {/* Accessories Dispatch */}
                  <div>
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Wrench size={14} className="text-rex-500"/> Consumables & Accessories
                    </h3>
                    <div className="bg-base border border-theme-subtle rounded-lg p-3 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5 block">Select Item</label>
                        <select value={accId} onChange={e => setAccId(e.target.value)} className="w-full input-base text-xs">
                          <option value="">-- Choose consumable/accessory --</option>
                          {inventory.filter(i => i.type === 'consumable' || i.type === 'accessory' || !i.type).map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} in stock)</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5 block">Quantity</label>
                          <input type="number" min="0.1" step="any" value={accQty} onChange={e => setAccQty(Number(e.target.value))} className="w-full input-base text-xs font-mono"/>
                        </div>
                        <Button variant="primary" size="sm" className="h-[34px] shrink-0" onClick={handleDispatchAccessory}>Dispatch</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Timeline */}
              <div className="w-full md:w-7/12 flex flex-col overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ListChecks size={14} className="text-rex-500"/> Operations & Routing
                  </h3>
                  <div className="relative border-l-2 border-theme-subtle ml-3 space-y-8 pb-4">
                    {trackWO.operations?.filter((o:any) => parseFloat(o.plannedHours) > 0).map((op: any, i: number) => {
                      const m = machineries.find(m => m.id === op.machineId);
                      const e = employees.find(e => e.id === op.employeeId);
                      const isComplete = op.status === 'Completed';
                      const isProgress = op.status === 'In Progress';
                      const isFailed = op.status === 'Rework Required';
                      const isQc = op.status === 'QC Pending';
                      
                      return (
                        <div key={op.id} className="relative pl-8">
                          {/* Timeline Dot */}
                          <div className={\`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-4 border-base flex items-center justify-center text-xs font-black shadow-sm \${isComplete ? 'bg-green-500 text-white' : isProgress ? 'bg-blue-500 text-white animate-pulse' : isFailed ? 'bg-red-500 text-white' : isQc ? 'bg-amber-500 text-white' : 'bg-surface2 text-muted'}\`}>
                            {isComplete ? <CheckCircle size={14}/> : isFailed ? <AlertTriangle size={14}/> : (i+1)}
                          </div>
                          
                          {/* Card */}
                          <div className={\`p-4 rounded-xl border \${isComplete ? 'border-green-500/20 bg-green-500/5' : isProgress ? 'border-blue-500/30 bg-blue-500/5 shadow-glass-sm' : isFailed ? 'border-red-500/30 bg-red-500/5' : isQc ? 'border-amber-500/30 bg-amber-500/5' : 'border-theme-subtle bg-base'} transition-all hover:-translate-y-0.5\`}>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-black text-primary text-sm uppercase tracking-wide">{op.operationName}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] font-bold text-secondary">
                                  <span className="flex items-center gap-1.5"><Settings size={12} className="text-muted"/> {m?.name||'Any Machine'}</span>
                                  <span className="flex items-center gap-1.5"><Users size={12} className="text-muted"/> {e?.name||'Any Operator'}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="block text-[10px] text-muted font-bold uppercase mb-0.5">Time</span>
                                <span className="font-mono text-xs bg-surface2 px-1.5 py-0.5 rounded mr-1">Est {op.plannedHours}h</span>
                                {op.actualHours > 0 && <span className="font-mono text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">Act {Number(op.actualHours).toFixed(1)}h</span>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 items-center pt-3 border-t border-theme-subtle/50 mt-1">
                              {op.status === 'Pending' && <Button variant="primary" size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateOpStatus(op.id,'In Progress')}><Play size={10} className="mr-1.5"/> Start Process</Button>}
                              {op.status === 'In Progress' && <Button variant="primary" size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateOpStatus(op.id,'QC Pending')}><CheckCircle size={10} className="mr-1.5"/> Finish & Request QC</Button>}
                              {op.status === 'QC Pending' && <Button variant="primary" size="sm" className="h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowQcModal(op)}><AlertTriangle size={10} className="mr-1.5"/> Perform QC</Button>}
                              
                              {/* QC Results log */}
                              {(isFailed || isComplete) && op.qc?.map((q: any) => (
                                <div key={q.id} className={\`px-2 py-1 text-[9px] rounded font-bold border uppercase tracking-wider \${q.status==='Pass'?'bg-green-500/10 text-green-600 border-green-500/20':'bg-red-500/10 text-red-600 border-red-500/20'}\`}>
                                  QC {q.status}: {q.notes||q.defectReason||'Passed successfully'}
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

      {/* QC MODAL */}
`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');