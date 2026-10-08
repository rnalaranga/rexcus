import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

old_modal = """          <QuotationPrintView 
            data={{
               docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
               custItems, custDiscount, boms,
               custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
               custTerms, custValidity, custDelivery
            }}"""

new_modal = """          <QuotationPrintView 
            data={{
               docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
               custItems, custDiscount, boms,
               custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
               custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat
            }}"""

code = code.replace(old_modal, new_modal)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

