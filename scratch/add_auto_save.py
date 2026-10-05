import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Add useEffect for debounced auto-save
# We will inject it right after restoreSnapshot function
find_restore = "  const [isSaving, setIsSaving] = useState(false)"

auto_save_code = """
  // --- Auto Save Draft ---
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
  }, [quoteIdParam]) // Run once on mount

  const [isSaving, setIsSaving] = useState(false)"""

content = content.replace(find_restore, auto_save_code)

# 2. Add "Clear Draft" upon successful save
find_save_success = "setCurrentId(result.quotation?.id || null)"
rep_save_success = "setCurrentId(result.quotation?.id || null)\n        localStorage.removeItem('quo_draft')"
content = content.replace(find_save_success, rep_save_success)

# 3. Add a "Discard Draft" button in the UI if there's no currentId
find_actions = """        <div className="flex justify-between items-center bg-surface2 px-5 py-4 border-t border-theme-subtle">
           <div>
             <button onClick={() => setShowHistory(true)} className="text-xs text-blue-500 font-semibold hover:underline">
                View Version History
             </button>
           </div>
           <div className="flex gap-3">"""

rep_actions = """        <div className="flex justify-between items-center bg-surface2 px-5 py-4 border-t border-theme-subtle">
           <div className="flex items-center gap-4">
             <button onClick={() => setShowHistory(true)} className="text-xs text-blue-500 font-semibold hover:underline">
                View Version History
             </button>
             {!currentId && (
               <button onClick={() => {
                 if(confirm('Are you sure you want to clear the current draft and start over?')) {
                   localStorage.removeItem('quo_draft');
                   window.location.reload();
                 }
               }} className="text-xs text-red-500 font-semibold hover:underline border-l border-theme-subtle pl-4">
                  Discard Draft
               </button>
             )}
           </div>
           <div className="flex gap-3">"""
content = content.replace(find_actions, rep_actions)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Added Auto Save Draft")
