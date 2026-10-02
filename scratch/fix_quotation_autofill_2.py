import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# Replace the JSX back to the original function or just declare it at the top
func_find = "const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)"
func_rep = """const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)

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

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added autofill function correctly")
