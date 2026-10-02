import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

old_effect = """  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      setDueDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]);
      if (selectedCustomer.vat) setCustomerVat(selectedCustomer.vat);
    }
  }, [selectedCustomer?.id, date]);"""

new_effect = """  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      setDueDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]);
      setCustomerVat(selectedCustomer.vat || '');
    } else {
      setCustomerVat('');
    }
  }, [selectedCustomer?.id, date]);"""

content = content.replace(old_effect, new_effect)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
