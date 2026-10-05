import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Update the LeadSearchInput call to pass a combined array
find_call = """                  <LeadSearchInput
                    value={customerName}
                    onChange={setCustomerName}
                    onSelect={handleSelectLeadOrCustomer}
                    leads={leads}
                    className={docInputClass + " " + (selectedLeadId ? "border-emerald-500/30" : "")}
                  />"""

rep_call = """                  <LeadSearchInput
                    value={customerName}
                    onChange={setCustomerName}
                    onSelect={handleSelectLeadOrCustomer}
                    leads={[...(customers || []), ...(leads || [])]}
                    className={docInputClass + " " + (selectedLeadId ? "border-emerald-500/30" : "")}
                  />"""

content = content.replace(find_call, rep_call)

# 2. Fix the `lead` lookup at the top level
find_lead = "  const lead = leads.find(l => l.id === leadId)"
rep_lead = "  const lead = customers?.find(c => c.id === leadId) || leads?.find(l => l.id === leadId)"
content = content.replace(find_lead, rep_lead)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Fixed Quotation Builder customer search")
