# -*- coding: utf-8 -*-
import re

file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '{/* Section 1: Document Details */}'
end_marker = '{/* Section 2: BOMs */}'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_doc_section = '''{/* Section 1: Document Details */}
        <div className="bg-surface/50 border-b border-theme-subtle rounded-xl overflow-hidden shadow-sm mb-5">
          {/* Header Row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-gradient-to-r from-surface/80 to-surface/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rex-500/10 border border-rex-500/20 flex items-center justify-center">
                <FileText size={15} className="text-rex-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-primary tracking-tight">Document Details</h2>
                <p className="text-[10px] text-muted mt-0.5 font-normal">Quotation header information</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted/70 bg-surface border border-theme-subtle px-2.5 py-1 rounded-md">Doc: {docNo} / {issueNo}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Row 1: Client & Main Metadata in a split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Left Column: Client Info */}
              <div className="space-y-4">
                <div className="border-b border-theme-subtle pb-2">
                  <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Client Information</h3>
                </div>
                
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    Customer / Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LeadSearchInput
                      value={customerName}
                      onChange={(v) => { setCustomerName(v); if (!v) setSelectedLeadId(null); }}
                      onSelect={handleSelectLeadOrCustomer}
                      leads={leads}
                      className={docInputClass + " pr-8 " + (selectedLeadId ? "border-emerald-500/50 bg-emerald-500/5 font-medium text-primary" : customerName ? "border-amber-400/50 bg-amber-500/5 text-primary" : "border-red-400/40 text-primary")}
                    />
                    {selectedLeadId && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />}
                  </div>
                  {!selectedLeadId && customerName && <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1"><span className="text-xs">??</span> Select from dropdown list to link customer</p>}
                  {!customerName && <p className="text-[10px] text-red-400/60 mt-1.5">Required — search and select a customer</p>}
                </div>
                
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Attention To</label>
                  <input type="text" value={attention} onChange={e => setAttention(e.target.value)} placeholder="e.g. Mr. Nisal" className={docInputClass} />
                </div>
                
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={docInputClass} />
                </div>
              </div>

              {/* Right Column: Meta Info */}
              <div className="space-y-4">
                <div className="border-b border-theme-subtle pb-2">
                  <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">Document Metadata</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">Quotation No <span className="text-red-500">*</span></label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} className={docInputClass + " font-mono font-semibold text-primary"} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Date</label>
                    <input type="date" value={quoDate} onChange={e => setQuoDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Validity</label>
                    <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)} placeholder="e.g. 30 Days" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">VAT No.</label>
                    <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="Customer VAT" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Total QTY</label>
                    <input type="text" value={jobQty} onChange={e => setJobQty(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Created By</label>
                    <input type="text" value={user?.name || 'Admin'} disabled className={docInputClass + " text-muted bg-surface/50"} />
                  </div>
                </div>
              </div>
            </div>

            {/* ISO Footer */}
            <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-surface/30 rounded-xl border border-theme-subtle/30">
              <div>
                <label className="block text-[9px] font-medium text-muted/60 uppercase tracking-wider mb-1.5">Doc No (ISO)</label>
                <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className={docInputClass + " text-muted text-[11px] h-8"} />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-muted/60 uppercase tracking-wider mb-1.5">Issue No</label>
                <input type="text" value={issueNo} onChange={e => setIssueNo(e.target.value)} className={docInputClass + " text-muted text-[11px] h-8"} />
              </div>
              <div>
                <label className="block text-[9px] font-medium text-muted/60 uppercase tracking-wider mb-1.5">Issue Date</label>
                <input type="text" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={docInputClass + " text-muted text-[11px] h-8"} />
              </div>
            </div>

            {/* Scope & Attachments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-theme-subtle/50">
              {/* Job Scope */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-[10px] font-semibold text-primary uppercase tracking-widest">Job Scope / Descriptions</label>
                    <p className="text-[10px] text-muted/60 mt-0.5 font-normal">Line items describing the work</p>
                  </div>
                  <Button variant="ghost" size="sm" icon={Plus} onClick={addJobItem} className="text-xs border border-theme-subtle h-7 px-2">Add Line</Button>
                </div>
                <div className="space-y-2">
                  {jobItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-start group">
                      <span className="text-[10px] font-mono text-muted/40 w-5 shrink-0 text-right pt-2.5">{idx + 1}.</span>
                      <textarea
                        value={item.text}
                        onChange={e => updateJobItem(item.id, e.target.value)}
                        placeholder="Describe the job / repair / part..."
                        className={docInputClass + " flex-1 resize-y min-h-[40px]"}
                      />
                      <button onClick={() => removeJobItem(item.id)} className="mt-1.5 p-1.5 text-red-400/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                     <label className="text-[10px] font-semibold text-primary uppercase tracking-widest">Drawings &amp; Photos</label>
                     <p className="text-[10px] text-muted/60 mt-0.5 font-normal">Attach references</p>
                  </div>
                  <label className="cursor-pointer flex items-center gap-1 text-xs font-medium text-primary bg-surface border border-theme-subtle hover:bg-surface2 px-2 h-7 rounded-lg transition-colors">
                    <Plus size={13}/> Add File
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {attachments.length > 0 ? (
                  <div className="flex gap-3 flex-wrap">
                    {attachments.map(att => (
                      <div key={att.id} className="relative w-20 h-20 shrink-0 border border-theme-subtle rounded-xl overflow-hidden group bg-surface2">
                        {att.type.includes('image')
                          ? <img src={att.dataUrl} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                              <FileText size={16} className="text-muted" />
                              <span className="text-[8px] text-muted text-center break-all leading-tight">{att.name}</span>
                            </div>
                        }
                        <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                   <div className="border-2 border-dashed border-theme-subtle/50 rounded-xl flex items-center justify-center p-6 text-[10px] text-muted/50 font-medium bg-surface/10">
                      No attachments added yet.
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        '''
    
    content = content[:start_idx] + new_doc_section + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated document details completely')
