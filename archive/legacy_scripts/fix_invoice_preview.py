import re

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    code = f.read()

# Add to props
code = code.replace("export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, selectedTaxes, taxProfile, taxBreakdown }) => {", "export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, selectedTaxes, taxProfile, taxBreakdown, attention }) => {")

# Add to rendering
code = code.replace('<p className="font-semibold text-black mb-1">{customer.name}</p>', '<p className="font-semibold text-black mb-1">{customer.name}</p>\n              {attention && <p className="text-black mb-1">Attn: {attention}</p>}')
code = code.replace('<h3 className="font-bold text-black mb-1 text-sm">{customer.company || customer.name}</h3>\n                {customer.company && <p className="text-black text-xs mb-1">{customer.name}</p>}', '<h3 className="font-bold text-black mb-1 text-sm">{customer.company || customer.name}</h3>\n                {customer.company && <p className="text-black text-xs mb-1">{customer.name}</p>}\n                {attention && <p className="text-black text-xs font-semibold mb-1">Attn: {attention}</p>}')

# Add to previewProps
code = code.replace('const previewProps = {\n    template,\n    docNo,\n    date,\n    dueDate,\n    deliveryDate,\n    placeOfSupply,\n    quotationNo,\n    dispatchNo,\n    orderNo,\n    poNo,\n    customer: selectedCustomer,\n    customerVat,\n    items: mappedItems,\n    subtotal,\n    taxAmount,\n    total,\n    notes,\n    company,\n    getTaxRate,\n    taxRates,\n    taxType,\n    selectedTaxes,\n    taxProfile,\n    taxBreakdown\n  };', 'const previewProps = {\n    template,\n    docNo,\n    date,\n    dueDate,\n    deliveryDate,\n    placeOfSupply,\n    quotationNo,\n    dispatchNo,\n    orderNo,\n    poNo,\n    customer: selectedCustomer,\n    customerVat,\n    items: mappedItems,\n    subtotal,\n    taxAmount,\n    total,\n    notes,\n    company,\n    getTaxRate,\n    taxRates,\n    taxType,\n    selectedTaxes,\n    taxProfile,\n    taxBreakdown,\n    attention\n  };')

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(code)

