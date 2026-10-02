import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

old_payload = "const res = await createInvoice({ id: docNo, customerId, date, dueDate, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid', deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat });"

new_payload = "const res = await createInvoice({ id: docNo, customerId, date, dueDate: dueDate || null, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid', deliveryDate: deliveryDate || null, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat });"

content = content.replace(old_payload, new_payload)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Fixed invoice save payload")
