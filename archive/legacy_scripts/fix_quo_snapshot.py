import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

# Update the draft snapshot
old_draft_snapshot = """      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount
      }"""

new_draft_snapshot = """      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        selectedProfile, custSscl, custVat, jobSscl, jobVat
      }"""

code = code.replace(old_draft_snapshot, new_draft_snapshot)

# Update the main save snapshot
old_main_snapshot = """    const snapshot = {
        selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId, boms, custItems, custTerms, custValidity, custDelivery, custDiscount
    }"""

new_main_snapshot = """    const snapshot = {
        selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId, boms, custItems, custTerms, custValidity, custDelivery, custDiscount,
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        selectedProfile, custSscl, custVat, jobSscl, jobVat
    }"""

code = code.replace(old_main_snapshot, new_main_snapshot)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

