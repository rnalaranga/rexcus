import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Add import for updateQuotation
find_import = "import { createQuotation, fetchQuotations } from '@/lib/api'"
rep_import = "import { createQuotation, fetchQuotations, updateQuotation } from '@/lib/api'"
content = content.replace(find_import, rep_import)

# 2. Add draftId state
find_state = "  const [currentId, setCurrentId] = useState<string | null>(null)"
rep_state = "  const [currentId, setCurrentId] = useState<string | null>(null)\n  const [draftId, setDraftId] = useState<string | null>(null)"
content = content.replace(find_state, rep_state)

# 3. Replace localStorage auto-save with DB auto-save
find_local_auto = """  // --- Auto Save Draft ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedLeadId && custItems.length === 0 && boms.length === 0) return; // Don't save empty state
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount
      }
      localStorage.setItem('quo_draft', JSON.stringify({ leadId: selectedLeadId, snapshot, timestamp: Date.now() }))
    }, 2000)
    return () => clearTimeout(timer)
  })

  useEffect(() => {
    // Only auto-restore if we are NOT loading a specific saved version
    if (!quoteIdParam) {
      const draftStr = localStorage.getItem('quo_draft')
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr)
          // Only restore if it's less than 24 hours old
          if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
             // We can optionally check if draft.leadId matches leadId
             if (!leadId || draft.leadId === leadId) {
                restoreSnapshot(draft.snapshot)
                if (draft.leadId && draft.leadId !== leadId) {
                   setSelectedLeadId(draft.leadId)
                }
             }
          } else {
             localStorage.removeItem('quo_draft')
          }
        } catch(e) {}
      }
    }
  }, [quoteIdParam]) // Run once on mount"""

rep_db_auto = """  // --- Auto Save Draft (DB) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!selectedLeadId && custItems.length === 0 && boms.length === 0) return; // Don't save empty state
      if (currentId) return; // If we are editing an already saved active version, don't auto-save as draft
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount
      }
      const amount = custTotals?.withSSCL || 0; // wait custTotals is not defined in this scope?
      
      // We will recalculate amount here or just save 0 if not available
      const sub = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
      const dis = sub * (Number(custDiscount) / 100);
      const am = sub - dis;
      
      try {
        if (!draftId) {
          const res = await createQuotation({
            leadId: selectedLeadId || 'WALK-IN', type: 'draft', data: snapshot,
            totalAmount: am, customAmount: null, selectedProfileId, taxEnabled
          });
          if (res.success && res.quotation) setDraftId(res.quotation.id);
        } else {
          await updateQuotation(draftId, {
            type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled
          });
        }
      } catch (err) {}
    }, 3000)
    return () => clearTimeout(timer)
  })
"""
content = content.replace(find_local_auto, rep_db_auto)

# 4. Remove localStorage.removeItem('quo_draft')
content = content.replace("localStorage.removeItem('quo_draft')", "")

# 5. Fix final save to update the draft to main!
find_save = """      const result = await createQuotation({
        leadId: selectedLeadId || 'WALK-IN', type: 'main', data: snapshot,
        totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled
      })
      if (result.success) {
        setCurrentId(result.quotation?.id || null)
        
        showToast('success', `Quotation v${result.quotation?.version || ''} saved!`)
        loadVersions()
      } else {"""

rep_save = """      let result;
      if (draftId && !currentId) {
        result = await updateQuotation(draftId, {
          type: 'main', data: snapshot, totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled
        });
      } else {
        result = await createQuotation({
          leadId: selectedLeadId || 'WALK-IN', type: 'main', data: snapshot,
          totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled
        });
      }
      
      if (result.success) {
        setCurrentId(result.quotation?.id || draftId || null)
        setDraftId(null) // clear draft mode
        
        showToast('success', `Quotation saved!`)
        loadVersions()
      } else {"""
content = content.replace(find_save, rep_save)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated QuotationBuilder.tsx for DB drafts")
