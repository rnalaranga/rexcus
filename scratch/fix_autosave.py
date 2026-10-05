import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# 1. Fix loadVersions bug
find_load = """              restoreSnapshot(snap)
              setCurrentId(target.id)"""
rep_load = """              restoreSnapshot(snap)
              if (target.type === 'draft') {
                 setDraftId(target.id)
              } else {
                 setCurrentId(target.id)
              }"""
content = content.replace(find_load, rep_load)

# 2. Add visual indicator state
find_state = "  const [draftId, setDraftId] = useState<string | null>(null)"
rep_state = "  const [draftId, setDraftId] = useState<string | null>(null)\n  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')"
content = content.replace(find_state, rep_state)

# 3. Update the auto-save effect
find_auto = """  // --- Auto Save Draft (DB) ---
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
      const amount = 0; // Will be correctly set in DB on final save
      
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
  })"""

rep_auto = """  // --- Auto Save Draft (DB) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!selectedLeadId && custItems.length === 0 && boms.length === 0) return; // Don't save empty state
      if (currentId) return; // If we are editing an already saved active version, don't auto-save as draft
      
      setSaveStatus('saving');
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount
      }
      const amount = 0; // Will be correctly set in DB on final save
      
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
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('idle');
      }
    }, 3000)
    return () => clearTimeout(timer)
  })"""
content = content.replace(find_auto, rep_auto)

# 4. Add Visual Indicator to UI
find_ui = """      {/* TOOLBAR */}
      <div className="h-14 bg-surface border-b border-theme-subtle flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/crm/quotations')} icon={ArrowLeft} className="text-muted hover:text-primary p-2 -ml-2" />
          <div>
            <h1 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <FileEdit size={16} className="text-blue-500" />
              Document Builder
            </h1>
            <p className="text-[10px] text-muted font-medium">Build quotes, proformas, and job costing.</p>
          </div>
        </div>"""

rep_ui = """      {/* TOOLBAR */}
      <div className="h-14 bg-surface border-b border-theme-subtle flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/crm/quotations')} icon={ArrowLeft} className="text-muted hover:text-primary p-2 -ml-2" />
          <div>
            <h1 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <FileEdit size={16} className="text-blue-500" />
              Document Builder
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted font-medium">Build quotes, proformas, and job costing.</p>
              {saveStatus !== 'idle' && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${saveStatus === 'saving' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved to Drafts'}
                </span>
              )}
            </div>
          </div>
        </div>"""
content = content.replace(find_ui, rep_ui)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated Auto Save UI and Bug")
