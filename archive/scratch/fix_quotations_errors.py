import sys

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    content = f.read()

find_drafts = """        {groups.some(g => g.main[0]?.type === 'draft') && (
           <div className="mb-4">
             <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <FileEdit size={16} /> Active Drafts
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groups.filter(g => g.main[0]?.type === 'draft').map(g => {
                   const lead = customers?.find(c => c.id === g.leadId) || leads?.find(l => l.id === g.leadId)
                   const snap = g.main[0]?.data ? (typeof g.main[0].data === 'string' ? JSON.parse(g.main[0].data) : g.main[0].data) : null"""

rep_drafts = """        {groupedQuotations.some((g: any) => g.main[0]?.type === 'draft') && (
           <div className="mb-4">
             <h3 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <FileEdit size={16} /> Active Drafts
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedQuotations.filter((g: any) => g.main[0]?.type === 'draft').map((g: any) => {
                   const snap = g.main[0]?.data ? (typeof g.main[0].data === 'string' ? JSON.parse(g.main[0].data) : g.main[0].data) : null"""

content = content.replace(find_drafts, rep_drafts)

find_lead = """<h4 className="font-bold text-sm text-primary truncate">{lead?.name || snap?.customerName || 'Unknown Customer'}</h4>"""
rep_lead = """<h4 className="font-bold text-sm text-primary truncate">{g.leadName || snap?.customerName || 'Unknown Customer'}</h4>"""

content = content.replace(find_lead, rep_lead)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(content)
print("Fixed variable names in Quotations.tsx")
