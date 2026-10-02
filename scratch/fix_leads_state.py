import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# Fix duplicates
bad_state = "isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: '', isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: ''"
good_state = "isNewCustomer: false, address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: ''"
content = content.replace(bad_state, good_state)

# Fix openEditModal mapping
edit_modal_find = """    setFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      source: lead.source, vat: lead.vat || '', svat: lead.svat || '', description: lead.description || '', customerId: lead.customerId || '',
      priority: lead.priority,
      value: String(lead.value),
      stage: lead.stage
    })"""

edit_modal_rep = """    setFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      source: lead.source, vat: lead.vat || '', svat: lead.svat || '', description: lead.description || '', customerId: lead.customerId || '',
      priority: lead.priority,
      value: String(lead.value),
      stage: lead.stage,
      isNewCustomer: false,
      address: '', brNumber: '', financeContactName: '', financeContactPhone: '', industry: ''
    })"""
content = content.replace(edit_modal_find, edit_modal_rep)

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Fixed Leads state")
