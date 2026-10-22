import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# We need to clean formData before sending
find_submit = """      if (editId) {
        await updateLead(editId, { ...formData, customerId: finalCustomerId, lastActivity: toMySQLDate(new Date()) })
        toast('Lead updated successfully', 'success')
      } else {
        await createLead({
          id: 'LD-' + Date.now().toString().slice(-5),
          ...formData,
          customerId: finalCustomerId,
          assignedTo: 'System Admin',
          probability: 10,
          lastActivity: toMySQLDate(new Date())
        })
        toast('New lead generated', 'success')
      }"""

rep_submit = """      const { isNewCustomer, address, brNumber, financeContactName, financeContactPhone, industry, ...leadData } = formData;
      if (editId) {
        await updateLead(editId, { ...leadData, customerId: finalCustomerId, lastActivity: toMySQLDate(new Date()) })
        toast('Lead updated successfully', 'success')
      } else {
        await createLead({
          id: 'LD-' + Date.now().toString().slice(-5),
          ...leadData,
          customerId: finalCustomerId,
          assignedTo: 'System Admin',
          probability: 10,
          lastActivity: toMySQLDate(new Date())
        })
        toast('New lead generated', 'success')
      }"""

content = content.replace(find_submit, rep_submit)

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Fixed Leads submit payload")
