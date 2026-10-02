import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Replace useState for taxType with separate SSCL and VAT rate inputs
old_state = "  const [taxType, setTaxType] = useState('none');"
new_state = """  const [ssclRate, setSsclRate] = useState(2.5);
  const [vatRate, setVatRate] = useState(18.0);
  const [taxEnabled, setTaxEnabled] = useState(true);
  // Keep taxType for DB compat
  const taxType = taxEnabled ? 'vat_sscl' : 'none';"""
content = content.replace(old_state, new_state)

# 2. Fix tax calculation - remove selectedProfile dependency
old_calc = """  let taxAmount = 0;
  let ssclAmount = 0;
  let vatAmount = 0;
  
  const selectedProfile = taxProfiles?.find((p: any) => p.id === taxType);
  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    
    ssclAmount = subtotal * t1;
    if (selectedProfile.tax2_compound) {
      vatAmount = (subtotal + ssclAmount) * t2;
    } else {
      vatAmount = subtotal * t2;
    }
    taxAmount = ssclAmount + vatAmount;
  } else if (taxType === 'line_items') {
    taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  }"""

new_calc = """  let taxAmount = 0;
  let ssclAmount = 0;
  let vatAmount = 0;
  
  // Hardcoded selectedProfile for preview compat
  const selectedProfile = taxEnabled ? { tax1_name: 'SSCL', tax1_rate: ssclRate, tax2_name: 'VAT', tax2_rate: vatRate, tax2_compound: false } : null;

  if (taxEnabled) {
    ssclAmount = subtotal * (ssclRate / 100);
    vatAmount = subtotal * (vatRate / 100);
    taxAmount = ssclAmount + vatAmount;
  }"""

content = content.replace(old_calc, new_calc)

# 3. Fix previewProps - selectedProfile already set above, ssclAmount & vatAmount too
# They already pass correctly

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Done step 1")
