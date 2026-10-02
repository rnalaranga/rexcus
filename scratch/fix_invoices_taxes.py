import sys

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    content = f.read()

# 1. Imports
import_find = "import { useInvoices, useLeads } from '@/hooks/useData'"
import_rep = "import { useInvoices, useLeads } from '@/hooks/useData'\nimport { useTaxProfiles } from '@/hooks/useFinance'"
content = content.replace(import_find, import_rep)

# 2. Hooks
hook_find = "  const { data: leads } = useLeads()"
hook_rep = "  const { data: leads } = useLeads()\n  const { data: taxProfiles } = useTaxProfiles()"
content = content.replace(hook_find, hook_rep)

# 3. Preview Props
prev_find = """                notes={viewInvoice.notes || ''}
                company={settings}
                getTaxRate={() => 0}
                taxRates={[]}
              />"""

prev_rep = """                notes={viewInvoice.notes || ''}
                company={settings}
                getTaxRate={() => 0}
                taxRates={[]}
                taxType={viewInvoice.taxType}
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
                }
              />"""
content = content.replace(prev_find, prev_rep)

with open('src/pages/finance/Invoices.tsx', 'w') as f:
    f.write(content)
print("Updated Invoices.tsx to pass tax properties")
