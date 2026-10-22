import re

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    code = f.read()

# Import useTaxProfiles
if 'useTaxProfiles' not in code:
    code = code.replace("import { useQuotations, useLeads } from '@/hooks/useData'", "import { useQuotations, useLeads, useTaxProfiles } from '@/hooks/useData'")

# Add useTaxProfiles hook call
if 'const { data: taxProfiles } = useTaxProfiles()' not in code:
    code = code.replace("const { data: quotations, loading, error, refresh } = useQuotations()", "const { data: quotations, loading, error, refresh } = useQuotations()\n  const { data: taxProfiles } = useTaxProfiles()")

# Patch the preview data passed to QuotationPrintView
# Find:
#            <QuotationPrintView 
#               data={typeof previewData.quotation.data === 'string' ? JSON.parse(previewData.quotation.data) : previewData.quotation.data} 

# Replace with logic to attach selectedProfile
old_view = """            <QuotationPrintView 
               data={typeof previewData.quotation.data === 'string' ? JSON.parse(previewData.quotation.data) : previewData.quotation.data}"""

new_view = """            <QuotationPrintView 
               data={((): any => {
                  const parsed = typeof previewData.quotation.data === 'string' ? JSON.parse(previewData.quotation.data) : previewData.quotation.data;
                  if (parsed.taxEnabled && parsed.selectedProfileId && !parsed.selectedProfile && taxProfiles) {
                      parsed.selectedProfile = taxProfiles.find((p: any) => p.id === parsed.selectedProfileId);
                      if (parsed.selectedProfile) {
                          const t1 = Number(parsed.selectedProfile.tax1_rate) / 100;
                          const t2 = Number(parsed.selectedProfile.tax2_rate) / 100;
                          const cTotal = parsed.custTotals?.total || 0;
                          parsed.custSscl = cTotal * t1;
                          parsed.custVat = parsed.selectedProfile.tax2_compound ? (cTotal + parsed.custSscl) * t2 : cTotal * t2;
                      }
                  }
                  return parsed;
               })()}"""

code = code.replace(old_view, new_view)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(code)

