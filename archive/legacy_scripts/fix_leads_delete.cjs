const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Leads.tsx', 'utf8');

content = content.replace(
  /if \(deleteTarget\.type === 'lead'\) \{\s*await deleteLead\(deleteTarget\.id as string\)\s*await refetch\(\)\s*setIsModalOpen\(false\)\s*\}/,
  `if (deleteTarget.type === 'lead') {
      const res = await deleteLead(deleteTarget.id as string)
      if (res.error) {
        alert("Cannot delete this lead because it has associated quotations, deals, or follow-ups. In an ERP system, you cannot delete records that have financial or transaction history. Please mark it as 'Lost' instead.");
      } else {
        await refetch()
        setIsModalOpen(false)
      }
    }`
);

fs.writeFileSync('src/pages/crm/Leads.tsx', content, 'utf8');
console.log('Fixed Leads.tsx delete error handling');