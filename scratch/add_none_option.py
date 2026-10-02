import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

old_options = """  const itemOptions = inventory.map((i: any) => ({
    value: i.id,
    label: i.name,
    extra: formatCurrency(i.price)
  }));"""

new_options = """  const itemOptions = [
    { value: '', label: '-- Custom Item (Type Description) --', extra: '' },
    ...inventory.map((i: any) => ({
      value: i.id,
      label: i.name,
      extra: formatCurrency(i.price)
    }))
  ];"""

content = content.replace(old_options, new_options)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
