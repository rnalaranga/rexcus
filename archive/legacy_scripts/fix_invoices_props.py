import re

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    code = f.read()

old_props = """                taxType={viewInvoice.taxType}
                selectedProfile={taxProfiles?.find((p: any) => p.id === viewInvoice.taxType)}
                ssclAmount={
                  taxProfiles?.find((p: any) => p.id === viewInvoice.taxType)?.tax2_name 
                    ? Number(viewInvoice.subtotal) * (Number(taxProfiles.find((p: any) => p.id === viewInvoice.taxType).tax1_rate) / 100) 
                    : 0
                }
                vatAmount={
                  taxProfiles?.find((p: any) => p.id === viewInvoice.taxType)?.tax2_name 
                    ? Number(viewInvoice.taxAmount) - (Number(viewInvoice.subtotal) * (Number(taxProfiles.find((p: any) => p.id === viewInvoice.taxType).tax1_rate) / 100))
                    : Number(viewInvoice.taxAmount)
                }"""

new_props = """                taxType={viewInvoice.taxType}
                taxProfile={taxProfiles?.find((p: any) => p.id === viewInvoice.taxProfileId)}
                taxBreakdown={viewInvoice.taxBreakdown ? (typeof viewInvoice.taxBreakdown === 'string' ? JSON.parse(viewInvoice.taxBreakdown) : viewInvoice.taxBreakdown) : null}"""

code = code.replace(old_props, new_props)

with open('src/pages/finance/Invoices.tsx', 'w') as f:
    f.write(code)

