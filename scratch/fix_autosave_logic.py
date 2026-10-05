import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_auto = """  // --- Auto Save Draft (DB) ---
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

rep_auto = """  // --- Auto Save Draft (DB) ---
  const draftIdRef = useRef<string | null>(draftId);
  const currentIdRef = useRef<string | null>(currentId);
  
  useEffect(() => {
    draftIdRef.current = draftId;
    currentIdRef.current = currentId;
  }, [draftId, currentId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Don't save completely empty state
      if (!selectedLeadId && custItems.length === 0 && boms.length === 0 && !subject && !customerName) return; 
      if (currentIdRef.current) return; // If we are editing an active version, don't auto-save as draft
      
      setSaveStatus('saving');
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount
      }
      
      const sub = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
      const dis = sub * (Number(custDiscount) / 100);
      const am = sub - dis;
      
      try {
        if (!draftIdRef.current) {
          const res = await createQuotation({
            leadId: selectedLeadId || 'WALK-IN', type: 'draft', data: snapshot,
            totalAmount: am, customAmount: null, selectedProfileId, taxEnabled
          });
          if (res.success && res.quotation) {
             setDraftId(res.quotation.id);
             draftIdRef.current = res.quotation.id;
          }
        } else {
          await updateQuotation(draftIdRef.current, {
            type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled
          });
        }
        setSaveStatus('saved');
        setTimeout(() => {
           setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } catch (err) {
        setSaveStatus('idle');
      }
    }, 2500)
    
    return () => clearTimeout(timer)
  }, [
    selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
    taxEnabled, selectedProfileId, boms, custItems, custTerms, custValidity, custDelivery, custDiscount
  ])"""

content = content.replace(find_auto, rep_auto)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated autosave logic")
