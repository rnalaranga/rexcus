import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '/* Section 1: Document Details */' in line:
        start = i
    if start != -1 and '/* Section 2: BOMs */' in line:
        end = i
        break

if start == -1 or end == -1:
    print('Section not found')
    exit(1)

new_section = '''        {/* Section 1: Document Details */}
        <GlassCard className="border border-theme-subtle/40 overflow-visible">
          <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle/30 bg-surface/30">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-muted" />
              <h2 className="text-[11px] font-medium text-secondary">Document Details</h2>
            </div>
            {selectedLeadId && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Customer Linked
              </span>
            )}
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Customer / Lead <span className="text-red-400">*</span></label>
                  <LeadSearchInput
                    value={customerName}
                    onChange={setCustomerName}
                    onSelect={handleSelectLeadOrCustomer}
                    leads={leads}
                    className={docInputClass + " " + (selectedLeadId ? "border-emerald-500/30" : "")}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Subject / Re: <span className="text-red-400">*</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Supply and fabrication of..." className={docInputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Attention To</label>
                    <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                      placeholder="Mr. / Ms." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Customer VAT</label>
                    <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)}
                      placeholder="VAT Reg. No." className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Payment Terms</label>
                    <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)}
                      placeholder="e.g. 30 days credit" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Delivery Terms</label>
                    <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)}
                      placeholder="e.g. Ex-works" className={docInputClass} />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Quotation No <span className="text-red-400">*</span></label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)}
                      className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Date <span className="text-red-400">*</span></label>
                    <input type="date" value={quoDate} onChange={e => setQuoDate(e.target.value)} className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Validity</label>
                    <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)}
                      placeholder="30 Days" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={docInputClass}>
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      {currencies?.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-theme-subtle/30">
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Doc No</label>
                    <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)}
                      className={docInputClass + " text-[10px] px-2"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Issue No</label>
                    <input type="text" value={issueNo} onChange={e => setIssueNo(e.target.value)}
                      className={docInputClass + " text-[10px] px-2"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Issue Date</label>
                    <input type="text" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                      className={docInputClass + " text-[10px] px-2"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Created By</label>
                    <input type="text" value={user?.name || ''} disabled
                      className={docInputClass + " text-[10px] px-2 opacity-60"} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Scope & Attachments */}
            <div className="mt-6 pt-5 border-t border-theme-subtle/30 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-medium text-secondary">Job Scope / Descriptions</label>
                  <button onClick={addJobItem}
                    className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus size={12} /> Add Scope Item
                  </button>
                </div>
                <div className="space-y-2">
                  {jobItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-start group">
                      <span className="text-[11px] text-muted/50 mt-2 select-none w-4 text-right">{idx + 1}.</span>
                      <textarea
                        value={item.text}
                        onChange={e => updateJobItem(item.id, e.target.value)}
                        placeholder="Describe the scope of work..."
                        rows={2}
                        className={docInputClass + " flex-1 resize-y min-h-[50px] leading-relaxed"}
                      />
                      <button onClick={() => removeJobItem(item.id)}
                        className="mt-1 p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {jobItems.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-muted/50 bg-surface2/50 rounded-lg border border-dashed border-theme-subtle/50">
                      No scope items added.
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-medium text-secondary">Attachments</label>
                  <label className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer">
                    <Plus size={12} /> Add File
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {attachments.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {attachments.map(att => (
                      <div key={att.id} className="relative w-16 h-16 border border-theme-subtle/50 rounded-lg overflow-hidden group bg-surface2">
                        {att.type.includes('image')
                          ? <img src={att.dataUrl} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-1">
                              <FileText size={16} />
                              <span className="text-[7px] max-w-full truncate px-1">{att.name}</span>
                            </div>
                        }
                        <button type="button"
                          onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-[11px] text-muted/50 bg-surface2/50 rounded-lg border border-dashed border-theme-subtle/50">
                    No attachments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
\n'''

new_lines = lines[:start] + [new_section] + lines[end:]

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.writelines(new_lines)

print('Updated successfully')