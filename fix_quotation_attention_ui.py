import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

old_ui = """
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5 flex justify-between items-center">
                        Attention To
                        {currentEntity && (currentContacts.length > 0 || currentEntity.name) && (
                          <select 
                            className="bg-transparent border-none text-[10px] text-rex-500 font-bold outline-none text-right cursor-pointer"
                            onChange={e => {
                               if (e.target.value) {
                                  setAttention(e.target.value);
                               }
                            }}
                          >
                            <option value="">(Select Contact)</option>
                            {currentEntity.name && <option value={currentEntity.name}>{currentEntity.name} (Primary)</option>}
                            {currentContacts.map((c: any, i: number) => (
                               <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </label>
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={docInputClass} />
                  </div>
"""

new_ui = """
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Attention To</label>
                    <div className="relative">
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={`${docInputClass} pr-7`} />
                      {currentEntity && (currentContacts.length > 0 || currentEntity.name) && (
                        <>
                          <select 
                            className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
                            onChange={e => e.target.value && setAttention(e.target.value)}
                            title="Select from contacts"
                            value=""
                          >
                            <option value="">(Select Contact)</option>
                            {currentEntity.name && <option value={currentEntity.name}>{currentEntity.name} (Primary)</option>}
                            {currentContacts.map((c: any, i: number) => (
                               <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted border-l border-theme-subtle pl-1.5 flex items-center justify-center">
                             <ChevronDown size={14} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
"""

code = code.replace(old_ui.strip(), new_ui.strip())

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

