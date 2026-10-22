import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

# Update LeadSearchInput rendering
new_li = """
          {filtered.map((l, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); const disp = l.company || l.name; onSelect(l.id, disp); onChange(disp); setOpen(false) }}>
              <span className="text-primary font-medium">{l.company || l.name}</span>
              {l.company && l.name && <span className="text-[10px] text-muted ml-2">{l.name}</span>}
            </li>
          ))}
"""

old_li = """
          {filtered.map((l, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); onSelect(l.id, l.name); onChange(l.name); setOpen(false) }}>
              <span className="text-primary font-medium">{l.name}</span>
              {l.company && <span className="text-[10px] text-muted ml-2">{l.company}</span>}
            </li>
          ))}
"""

code = code.replace(old_li.strip(), new_li.strip())

# Also in useEffect around 295, when loading from leadId prop
old_effect = """
  useEffect(() => {
     if (leadId && lead) {
        setCustomerName(lead.name + (lead.company ? ` (${lead.company})` : ''))
        setSelectedLeadId(lead.id)
        if (!attention) setAttention(lead.name || '')
     }
  }, [leadId, lead])
"""

new_effect = """
  useEffect(() => {
     if (leadId && lead) {
        setCustomerName(lead.company || lead.name)
        setSelectedLeadId(lead.id)
        if (!attention) setAttention(lead.name || '')
     }
  }, [leadId, lead])
"""
if old_effect.strip() in code:
    code = code.replace(old_effect.strip(), new_effect.strip())

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

