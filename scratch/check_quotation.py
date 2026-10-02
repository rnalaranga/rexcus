import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

idx = content.find('<SearchableSelect')
if idx != -1:
    print(content[idx-500:idx+1500])
else:
    print("Could not find SearchableSelect")
