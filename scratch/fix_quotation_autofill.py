import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# Add useCustomers
import_find = "import { useLeads, useInventory, useMachiningOperations } from '@/hooks/useData'"
import_rep = "import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'"
content = content.replace(import_find, import_rep)

# Add useCustomers hook
hook_find = "const { data: leads } = useLeads()"
hook_rep = "const { data: leads } = useLeads()\n  const { data: customers } = useCustomers()"
content = content.replace(hook_find, hook_rep)

# Create handleSelectCustomer function
func_find = "const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)"
func_rep = """const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const handleSelectLeadOrCustomer = (id: string, name: string) => {
    setSelectedLeadId(id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      if (lead.company) setAttention(lead.name);
      
      let cust = null;
      if (lead.customerId) cust = customers.find((c: any) => c.id === lead.customerId);
      
      if (cust) {
        setVatNo(cust.vat || cust.svat || '');
        let terms = '';
        if (cust.requiresAdvance) terms = 'Advance required. ';
        if (cust.creditDays > 0) terms += `${cust.creditDays} days credit.`;
        setCustTerms(terms.trim());
      } else {
        setVatNo(lead.vat || lead.svat || '');
      }
    }
  };"""
content = content.replace(func_find, func_rep)

# Update JSX
jsx_find = """<LeadSearchInput value={customerName} onChange={setCustomerName} onSelect={(id) => setSelectedLeadId(id)} leads={leads} className={docInputClass + " font-bold text-primary"} />"""
jsx_rep = """<LeadSearchInput value={customerName} onChange={setCustomerName} onSelect={handleSelectLeadOrCustomer} leads={leads} className={docInputClass + " font-bold text-primary"} />"""
content = content.replace(jsx_find, jsx_rep)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added autofill to QuotationBuilder")
