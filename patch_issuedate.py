import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

old_block = '''                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-theme-subtle/30">
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
                </div>'''

new_block = '''                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-theme-subtle/30">
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
                    <label className="block text-[10px] text-muted/70 mb-1">Created By</label>
                    <input type="text" value={user?.name || ''} disabled
                      className={docInputClass + " text-[10px] px-2 opacity-60"} />
                  </div>
                </div>'''

content = content.replace(old_block, new_block)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated successfully')