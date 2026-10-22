import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

# Replace the dropdown to include the primary contact.
dropdown_ui = """
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
"""

old_dropdown_ui = """
                        {currentContacts.length > 0 && (
                          <select 
                            className="bg-transparent border-none text-[10px] text-rex-500 font-bold outline-none text-right cursor-pointer"
                            onChange={e => {
                               if (e.target.value) {
                                  setAttention(e.target.value);
                               }
                            }}
                          >
                            <option value="">(Select Contact)</option>
                            {currentContacts.map((c: any, i: number) => (
                               <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                            ))}
                          </select>
                        )}
"""

code = code.replace(old_dropdown_ui.strip(), dropdown_ui.strip())

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

