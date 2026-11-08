import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckSquare, Check, X, AlertTriangle, FileText, ShoppingBag, 
  User, RefreshCw, ShieldCheck, Clock, ArrowRightLeft, DollarSign, Wallet,
  Eye, Building2, MapPin, Phone, Mail, Calendar, Receipt, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import { useQuotations, useCustomers, useFinishedGoodsOrders, useLeads } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { QuotationPrintView } from '@/components/QuotationPrintView';
import { 
  approveQuotation, rejectQuotation, approveQuotationEdit, rejectQuotationEdit,
  approveOrderAdvanceWaiver, rejectOrderAdvanceWaiver, approveCreditLimit,
  fetchSubstituteRequests, approveMaterialSubstitute, rejectMaterialSubstitute,
  fetchPendingCashbookEntries, approveCashbookEntry, rejectCashbookEntry
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

export const MobileApprovals: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useDialog();
  const { settings } = useSettings();

  const { data: quotations = [], refetch: refetchQuotations } = useQuotations();
  const { data: orders = [], refetch: refetchOrders } = useFinishedGoodsOrders();
  const { data: customers = [], refetch: refetchCustomers } = useCustomers();
  const { data: leads = [] } = useLeads();

  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [pendingCash, setPendingCash] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'quotes' | 'orders' | 'credit' | 'subs' | 'cash'>('all');

  // Preview modals state
  const [previewQuote, setPreviewQuote] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'summary' | 'print'>('summary');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Rejection modal
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'quote' | 'order' | 'credit' | 'sub' | 'cashbook'; subtype?: string; title: string; raw?: any } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadSubstitutes = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetchSubstituteRequests();
      setSubstitutes(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const loadPendingCash = useCallback(async () => {
    try {
      const res = await fetchPendingCashbookEntries();
      setPendingCash(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadSubstitutes();
    loadPendingCash();
  }, [loadSubstitutes, loadPendingCash]);

  const handleRefresh = () => {
    refetchQuotations();
    refetchOrders();
    refetchCustomers();
    loadSubstitutes();
    loadPendingCash();
  };

  // Compile pending approval items
  const pendingItems = useMemo(() => {
    const list: any[] = [];

    // 1. Pending Quotations & Edit Requests
    quotations.forEach((q: any) => {
      let qData: any = {};
      try {
        qData = typeof q.data === 'string' ? JSON.parse(q.data || '{}') : (q.data || {});
      } catch (e) {
        qData = {};
      }
      const quoteNo = q.quotationNo || q.docNo || qData.quotationNo || q.quoNo || q.id;
      const lead = leads.find((l: any) => l.id === q.leadId || l.leadId === q.leadId) || 
                   customers.find((c: any) => c.id === q.leadId);
      const party = q.clientName || q.clientCompany || qData.company || qData.customerName || lead?.company || lead?.name || 'Customer';
      const quoteCurrency = q.currency || qData.currency || lead?.currency || (lead?.isForeign ? 'USD' : 'LKR');
      const quoteAmount = Number(q.totalAmount || qData.custTotals?.total || qData.totals?.total || q.customAmount || 0);

      if (q.status === 'Pending Approval' || q.status === 'Draft_Pending') {
        list.push({
          id: q.id,
          type: 'quote',
          subtype: 'new',
          title: `Quotation #${quoteNo}`,
          party,
          amount: quoteAmount,
          currency: quoteCurrency,
          date: q.date || q.createdAt,
          reason: q.approvalReason || 'Approval requested before issue',
          raw: q,
          parsedData: qData,
          lead
        });
      } else if (q.editApprovalRequested) {
        list.push({
          id: q.id,
          type: 'quote',
          subtype: 'edit',
          title: `Edit Approval #${quoteNo}`,
          party,
          amount: quoteAmount,
          currency: quoteCurrency,
          date: q.date || q.createdAt,
          reason: q.editApprovalReason || 'Quotation revision needs managerial approval',
          raw: q,
          parsedData: qData,
          lead
        });
      }
    });

    // 2. Orders with Advance Payment Waiver Requested
    orders.forEach((o: any) => {
      if (o.advanceWaiverRequested && !o.advanceWaiverApproved) {
        list.push({
          id: o.id,
          type: 'order',
          title: `Advance Waiver #${o.orderNo || o.id}`,
          party: o.customerName || o.customerCompany || 'Customer',
          amount: Number(o.totalPrice || 0),
          currency: o.currency || 'LKR',
          date: o.createdAt || o.date,
          reason: o.advanceWaiverReason || 'Advance payment waiver requested to proceed with production',
          raw: o
        });
      }
    });

    // 3. Customers Credit Limit Requests
    customers.forEach((c: any) => {
      if (c.creditLimitRequested && !c.creditLimitApproved) {
        list.push({
          id: c.id,
          type: 'credit',
          title: `Credit Limit: ${c.name || c.company}`,
          party: c.company || c.name,
          amount: Number(c.requestedCreditLimit || c.creditLimit || 0),
          currency: 'LKR',
          date: c.updatedAt || c.createdAt,
          reason: c.creditLimitReason || 'Credit limit increase requested',
          raw: c
        });
      }
    });

    // 4. Material Substitution Requests
    substitutes.forEach((s: any) => {
      if (s.status === 'PENDING' || s.status === 'pending') {
        list.push({
          id: s.id,
          type: 'sub',
          title: `Material Substitute: ${s.workOrderNo || 'WO'}`,
          party: `Original: ${s.originalItemName || s.originalItemId}`,
          subtitle: `Substitute: ${s.substituteItemName || s.substituteItemId}`,
          amount: 0,
          date: s.createdAt,
          reason: s.reason || 'Material shortage substitution approval',
          raw: s
        });
      }
    });

    // 5. Cashbook Submissions
    pendingCash.forEach((cb: any) => {
      list.push({
        id: cb.id,
        type: 'cashbook',
        title: `Cash ${cb.entryType === 'IN' ? 'Receipt' : 'Payment'} #${cb.id}`,
        party: cb.particulars,
        subtitle: `Submitted by: ${cb.createdByName || cb.createdBy || 'Staff'} • Account: ${cb.accountName || cb.accountId}`,
        amount: Number(cb.amount || 0),
        currency: 'LKR',
        date: cb.date || cb.createdAt,
        reason: cb.notes ? `${cb.notes} (Submitted by ${cb.createdByName || cb.createdBy})` : `Mobile Cashbook voucher submitted by ${cb.createdByName || cb.createdBy}`,
        receiptPhoto: cb.receiptPhoto,
        raw: cb
      });
    });

    return list;
  }, [quotations, orders, customers, leads, substitutes, pendingCash]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return pendingItems;
    if (activeFilter === 'quotes') return pendingItems.filter(i => i.type === 'quote');
    if (activeFilter === 'orders') return pendingItems.filter(i => i.type === 'order');
    if (activeFilter === 'credit') return pendingItems.filter(i => i.type === 'credit');
    if (activeFilter === 'subs') return pendingItems.filter(i => i.type === 'sub');
    if (activeFilter === 'cash') return pendingItems.filter(i => i.type === 'cashbook');
    return pendingItems;
  }, [pendingItems, activeFilter]);

  // Action Handlers
  const handleApprove = async (item: any) => {
    setProcessingId(item.id);
    try {
      if (item.type === 'quote') {
        if (item.subtype === 'edit') {
          await approveQuotationEdit(item.id, user?.name || 'Manager');
        } else {
          await approveQuotation(item.id, user?.name || 'Manager');
        }
        refetchQuotations();
      } else if (item.type === 'order') {
        await approveOrderAdvanceWaiver(item.id, user?.name || 'Manager');
        refetchOrders();
      } else if (item.type === 'credit') {
        await approveCreditLimit(item.id, 'approved', user?.name || 'Manager');
        refetchCustomers();
      } else if (item.type === 'sub') {
        await approveMaterialSubstitute(item.raw?.workOrderId || item.id, {
          bomIndex: item.raw?.bomIndex ?? 0,
          approvedBy: user?.name || 'Manager'
        });
        loadSubstitutes();
      } else if (item.type === 'cashbook') {
        await approveCashbookEntry(item.id, user?.name || 'Finance Approver');
        loadPendingCash();
      }
      toast(`${item.title} approved successfully!`, 'success');
      if (previewQuote && previewQuote.id === item.id) {
        setPreviewQuote(null);
      }
    } catch (e: any) {
      toast(`Failed to approve: ${e.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectItem) return;
    setProcessingId(rejectItem.id);
    try {
      const reason = rejectionReason || 'Rejected via Rex Mobile';
      if (rejectItem.type === 'quote') {
        if (rejectItem.subtype === 'edit') {
          await rejectQuotationEdit(rejectItem.id, user?.name || 'Manager', reason);
        } else {
          await rejectQuotation(rejectItem.id, reason);
        }
        refetchQuotations();
      } else if (rejectItem.type === 'order') {
        await rejectOrderAdvanceWaiver(rejectItem.id, user?.name || 'Manager', reason);
        refetchOrders();
      } else if (rejectItem.type === 'credit') {
        await approveCreditLimit(rejectItem.id, 'rejected', user?.name || 'Manager', reason);
        refetchCustomers();
      } else if (rejectItem.type === 'sub') {
        await rejectMaterialSubstitute(rejectItem.raw?.workOrderId || rejectItem.id, {
          bomIndex: rejectItem.raw?.bomIndex ?? 0,
          rejectedBy: user?.name || 'Manager',
          reason
        });
        loadSubstitutes();
      } else if (rejectItem.type === 'cashbook') {
        await rejectCashbookEntry(rejectItem.id, user?.name || 'Finance Approver', reason);
        loadPendingCash();
      }
      toast(`${rejectItem.title} rejected.`, 'info');
      setRejectItem(null);
      setRejectionReason('');
      if (previewQuote && previewQuote.id === rejectItem.id) {
        setPreviewQuote(null);
      }
    } catch (e: any) {
      toast(`Failed to reject: ${e.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Merged quotation data for QuotationPrintView
  const mergedQuotePrintData = useMemo(() => {
    if (!previewQuote || previewQuote.type !== 'quote') return null;
    const q = previewQuote.raw;
    const parsed = previewQuote.parsedData || {};
    const lead = previewQuote.lead;
    const items = (Array.isArray(parsed.custItems) && parsed.custItems.length > 0)
      ? parsed.custItems
      : ((Array.isArray(q.custItems) && q.custItems.length > 0)
          ? q.custItems
          : (parsed.items || []));

    const merged = {
      ...q,
      ...parsed,
      status: q.status || parsed.status || 'Draft',
      custItems: items,
      items: items,
      totalAmount: previewQuote.amount,
      currency: previewQuote.currency,
      exchangeRate: q.exchangeRate || parsed.exchangeRate || 1
    };

    if (!merged.customerName && (lead?.company || lead?.name || q.clientName)) {
      merged.customerName = lead?.company || lead?.name || q.clientName;
    }
    if (!merged.customerCompany && (lead?.company || q.clientCompany)) {
      merged.customerCompany = lead?.company || q.clientCompany;
    }
    if (!merged.customerAddress && (lead?.address || q.address)) {
      merged.customerAddress = lead?.address || q.address;
    }
    if (!merged.vatNo && lead?.vat) merged.vatNo = lead.vat;
    if (!merged.tinNo && (lead?.tin || lead?.brNumber)) merged.tinNo = lead.tin || lead.brNumber;

    return merged;
  }, [previewQuote]);

  // Extract preview line items & totals for clean mobile view
  const previewItemsList = useMemo(() => {
    if (!previewQuote || previewQuote.type !== 'quote') return [];
    const parsed = previewQuote.parsedData || {};
    const q = previewQuote.raw;
    const items = (Array.isArray(parsed.custItems) && parsed.custItems.length > 0)
      ? parsed.custItems
      : ((Array.isArray(q.custItems) && q.custItems.length > 0)
          ? q.custItems
          : (parsed.items || []));
    return items;
  }, [previewQuote]);

  const previewTotals = useMemo(() => {
    if (!previewQuote || previewQuote.type !== 'quote') return null;
    const parsed = previewQuote.parsedData || {};
    const custTotals = parsed.custTotals || parsed.totals || {};
    const subtotal = Number(custTotals.subtotal || custTotals.totalBeforeTax || previewQuote.amount || 0);
    const discount = Number(custTotals.discount || 0);
    const vat = Number(custTotals.vat || custTotals.vatAmount || 0);
    const sscl = Number(custTotals.sscl || custTotals.ssclAmount || 0);
    const total = Number(previewQuote.amount || custTotals.total || 0);
    return { subtotal, discount, vat, sscl, total };
  }, [previewQuote]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-primary flex items-center gap-2">
            One-Tap Approvals
            {pendingItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono">
                {pendingItems.length}
              </span>
            )}
          </h1>
          <p className="text-[11px] text-muted">
            Review and sign off operational requests instantly
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loadingSubs ? 'animate-spin text-rex-600' : ''} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All (${pendingItems.length})` },
          { key: 'cash', label: `Cash (${pendingCash.length})` },
          { key: 'quotes', label: 'Quotes' },
          { key: 'orders', label: 'Orders' },
          { key: 'credit', label: 'Credit' },
          { key: 'subs', label: 'Materials' }
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActiveFilter(chip.key as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === chip.key
                ? 'bg-rex-600 text-white font-bold shadow-xs'
                : 'bg-surface border border-theme text-secondary hover:text-primary'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Cards List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isProcessing = processingId === item.id;
            const isQuote = item.type === 'quote';
            const isUSD = item.currency === 'USD' || item.currency === '$';

            return (
              <div 
                key={`${item.type}-${item.id}`}
                className="p-3.5 rounded-xl bg-surface border border-theme shadow-xs flex flex-col justify-between space-y-3 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-surface2 text-muted font-bold border border-theme-subtle inline-block">
                        {item.type === 'quote' ? 'Quotation' : item.type === 'order' ? 'Sales Order' : item.type === 'credit' ? 'Credit Limit' : item.type === 'cashbook' ? 'Cash Voucher' : 'Material'}
                      </span>
                      {isUSD && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm shadow-blue-500/50" title="USD Currency" />
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-primary truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-secondary truncate font-medium">
                      {item.party}
                    </p>
                    {item.subtitle && (
                      <p className="text-[10px] text-rex-600 dark:text-rex-400 mt-0.5 truncate font-semibold">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {item.amount > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-rex-600 dark:text-rex-400 block">
                        {formatCurrency(item.amount, false, item.currency)}
                      </span>
                      <span className="text-[9px] text-muted font-mono">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason / Remarks */}
                {item.reason && (
                  <div className="p-2 rounded-lg bg-surface2/60 border border-theme-subtle text-[11px] text-secondary">
                    <span className="text-[9.5px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Note:</span>
                    {item.reason}
                  </div>
                )}

                {/* Preview Trigger for Quotation */}
                {isQuote && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewQuote(item);
                      setPreviewTab('summary');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-bold active:scale-95 transition-all hover:bg-blue-500/20"
                  >
                    <Eye size={13} />
                    <span>View Quotation Details & Items</span>
                  </button>
                )}

                {/* Attached Receipt Photo for Cashbook */}
                {item.receiptPhoto && (
                  <button
                    type="button"
                    onClick={() => setPreviewPhoto(item.receiptPhoto)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface2 border border-theme-subtle text-secondary text-xs font-medium active:scale-95 transition-all hover:text-primary"
                  >
                    <ImageIcon size={13} />
                    <span>View Receipt Photo</span>
                  </button>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setRejectItem(item)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleApprove(item)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-xs disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{isProcessing ? 'Saving...' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-surface border border-theme text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-sm font-bold text-primary">No Pending Approvals</h3>
          <p className="text-xs text-muted max-w-xs mx-auto">
            Everything in this category has already been approved or addressed.
          </p>
        </div>
      )}

      {/* ── Quotation Full Preview Modal ── */}
      {previewQuote && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
            {/* Modal Header */}
            <div className="p-3.5 bg-gradient-to-r from-rex-700 via-rex-600 to-rex-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/20 text-white font-bold">
                    {previewQuote.subtype === 'edit' ? 'Quotation Edit' : 'Quotation Review'}
                  </span>
                  {previewQuote.currency === 'USD' && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500 text-white text-[10px] font-bold font-mono">
                      USD
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold truncate mt-0.5">
                  {previewQuote.title} — {previewQuote.party}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setPreviewQuote(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center border-b border-theme bg-surface2/50 px-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('summary')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  previewTab === 'summary'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <FileText size={13} />
                <span>Summary & Line Items</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('print')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  previewTab === 'print'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <Receipt size={13} />
                <span>Official Letterhead (A4)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 space-y-3.5 flex-1 text-primary">
              {previewTab === 'summary' ? (
                <>
                  {/* Client Info Card */}
                  <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-rex-600 dark:text-rex-400" />
                        {previewQuote.party}
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {formatDate(previewQuote.date)}
                      </span>
                    </div>
                    {previewQuote.parsedData?.attention && (
                      <p className="text-[11px] text-secondary">
                        <span className="text-muted">Attn:</span> {previewQuote.parsedData.attention}
                      </p>
                    )}
                    {previewQuote.parsedData?.subject && (
                      <p className="text-[11px] text-primary font-medium">
                        <span className="text-muted">Scope/Subject:</span> {previewQuote.parsedData.subject}
                      </p>
                    )}
                  </div>

                  {/* Reason for Approval Notice */}
                  {previewQuote.reason && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-0.5 text-amber-600 dark:text-amber-400">
                        Manager Sign-off Required:
                      </span>
                      {previewQuote.reason}
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
                      <span>Quoted Line Items ({previewItemsList.length})</span>
                      <span className="font-mono text-primary font-semibold">{previewQuote.currency || 'LKR'}</span>
                    </h4>

                    {previewItemsList.length > 0 ? (
                      <div className="space-y-2">
                        {previewItemsList.map((it: any, idx: number) => {
                          const desc = it.description || it.desc || it.name || it.productName || `Item #${idx + 1}`;
                          const specs = it.specifications || it.specs || it.details || '';
                          const qty = Number(it.qty || it.quantity || 1);
                          const uom = it.uom || it.unit || 'Nos';
                          const unitPrice = Number(it.unitPrice || it.rate || it.price || 0);
                          const lineTotal = Number(it.total || it.amount || (qty * unitPrice));

                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-surface border border-theme-subtle space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[10px] text-muted font-mono font-bold mr-1">#{idx + 1}</span>
                                  <span className="text-xs font-bold text-primary">{desc}</span>
                                </div>
                                <span className="text-xs font-bold font-mono text-primary shrink-0">
                                  {formatCurrency(lineTotal, false, previewQuote.currency)}
                                </span>
                              </div>

                              {specs && (
                                <p className="text-[10.5px] text-secondary font-mono italic pl-4">
                                  {specs}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-muted pl-4 pt-0.5">
                                <span>{qty} {uom} × {formatCurrency(unitPrice, false, previewQuote.currency)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-lg bg-surface2 text-xs text-muted">
                        Total quotation value: {formatCurrency(previewQuote.amount, false, previewQuote.currency)}
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Totals Box */}
                  {previewTotals && (
                    <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-secondary">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(previewTotals.subtotal, false, previewQuote.currency)}</span>
                      </div>
                      {previewTotals.discount > 0 && (
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>Discount:</span>
                          <span>-{formatCurrency(previewTotals.discount, false, previewQuote.currency)}</span>
                        </div>
                      )}
                      {previewTotals.sscl > 0 && (
                        <div className="flex justify-between text-secondary">
                          <span>SSCL (2.5%):</span>
                          <span>+{formatCurrency(previewTotals.sscl, false, previewQuote.currency)}</span>
                        </div>
                      )}
                      {previewTotals.vat > 0 && (
                        <div className="flex justify-between text-secondary">
                          <span>VAT (18%):</span>
                          <span>+{formatCurrency(previewTotals.vat, false, previewQuote.currency)}</span>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-theme-subtle flex justify-between font-bold text-sm text-rex-600 dark:text-rex-400">
                        <span>Grand Total:</span>
                        <span>{formatCurrency(previewTotals.total, false, previewQuote.currency)}</span>
                      </div>
                    </div>
                  )}

                  {/* Commercial Terms & Notes */}
                  {(previewQuote.parsedData?.custTerms || previewQuote.parsedData?.terms || previewQuote.parsedData?.notes) && (
                    <div className="p-3 rounded-lg bg-surface border border-theme-subtle text-[11px] space-y-1 text-secondary">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Terms & Remarks:</span>
                      <p>{previewQuote.parsedData?.custTerms || previewQuote.parsedData?.terms || previewQuote.parsedData?.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Full Letterhead (A4 Printable Document) */
                <div className="space-y-2">
                  <p className="text-[10.5px] text-muted text-center italic">
                    Swipe horizontally to view full standard A4 letterhead document
                  </p>
                  <div className="p-2 bg-white text-black overflow-x-auto rounded-lg border border-theme-subtle shadow-inner">
                    <div className="min-w-[720px] origin-top-left">
                      {mergedQuotePrintData && (
                        <QuotationPrintView 
                          data={mergedQuotePrintData} 
                          type={previewQuote.raw?.type === 'job' ? 'job' : 'main'} 
                          lead={previewQuote.lead} 
                          settings={settings} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Sticky Footer */}
            <div className="p-3 bg-surface border-t border-theme grid grid-cols-2 gap-2 shrink-0">
              <button
                type="button"
                disabled={processingId === previewQuote.id}
                onClick={() => {
                  setRejectItem(previewQuote);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
              >
                <X size={15} />
                <span>Reject</span>
              </button>

              <button
                type="button"
                disabled={processingId === previewQuote.id}
                onClick={() => handleApprove(previewQuote)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {processingId === previewQuote.id ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                <span>{processingId === previewQuote.id ? 'Approving...' : 'Approve Quotation'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Photo Lightbox Modal ── */}
      {previewPhoto && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="relative max-w-md w-full bg-surface rounded-2xl overflow-hidden shadow-2xl border border-theme">
            <div className="p-3 flex items-center justify-between border-b border-theme bg-surface2/60">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <ImageIcon size={14} /> Attached Receipt
              </span>
              <button 
                type="button" 
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-surface text-muted hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto bg-black/40">
              <img src={previewPhoto} alt="Receipt Voucher" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectItem && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl animate-fade-in text-primary">
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={16} />
                Reject Request
              </h3>
              <button 
                type="button" 
                onClick={() => setRejectItem(null)}
                className="text-muted hover:text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-primary font-bold mb-1">
                {rejectItem.title}
              </p>
              <label className="text-[11px] text-muted block mb-1">
                Reason for Rejection:
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="w-full bg-surface2 border border-theme rounded-lg p-2.5 text-xs text-primary placeholder-muted focus:outline-none focus:border-rose-500 h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                className="py-2 rounded-lg bg-surface2 hover:bg-surface border border-theme text-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
