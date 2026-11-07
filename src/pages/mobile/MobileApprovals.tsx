import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckSquare, Check, X, AlertTriangle, FileText, ShoppingBag, 
  User, RefreshCw, ShieldCheck, Clock, ArrowRightLeft, DollarSign, Wallet
} from 'lucide-react';
import { useQuotations, useCustomers, useFinishedGoodsOrders, useLeads } from '@/hooks/useData';
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

  const { data: quotations = [], refetch: refetchQuotations } = useQuotations();
  const { data: orders = [], refetch: refetchOrders } = useFinishedGoodsOrders();
  const { data: customers = [], refetch: refetchCustomers } = useCustomers();
  const { data: leads = [] } = useLeads();

  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [pendingCash, setPendingCash] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'quotes' | 'orders' | 'credit' | 'subs' | 'cash'>('all');

  // Rejection modal
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'quote' | 'order' | 'credit' | 'sub' | 'cashbook'; title: string } | null>(null);
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
      if (q.status === 'Pending Approval' || q.status === 'Draft_Pending') {
        const lead = leads.find((l: any) => l.id === q.leadId || l.leadId === q.leadId);
        list.push({
          id: q.id,
          type: 'quote',
          subtype: 'new',
          title: `Quotation #${q.quoNo || q.id}`,
          party: q.clientName || q.clientCompany || lead?.companyName || lead?.name || 'Customer',
          amount: Number(q.totalAmount || q.customAmount || 0),
          currency: q.currency || 'LKR',
          date: q.date || q.createdAt,
          reason: q.approvalReason || 'Approval requested before issue',
          raw: q
        });
      } else if (q.editApprovalRequested) {
        list.push({
          id: q.id,
          type: 'quote',
          subtype: 'edit',
          title: `Edit Approval #${q.quoNo || q.id}`,
          party: q.clientName || q.clientCompany || 'Customer',
          amount: Number(q.totalAmount || 0),
          currency: q.currency || 'LKR',
          date: q.date || q.createdAt,
          reason: q.editApprovalReason || 'Quotation revision needs managerial approval',
          raw: q
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
        if ((rejectItem as any).subtype === 'edit') {
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
        await rejectMaterialSubstitute((rejectItem as any).raw?.workOrderId || rejectItem.id, {
          bomIndex: (rejectItem as any).raw?.bomIndex ?? 0,
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
    } catch (e: any) {
      toast(`Failed to reject: ${e.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

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

            return (
              <div 
                key={`${item.type}-${item.id}`}
                className="p-3.5 rounded-xl bg-surface border border-theme shadow-xs flex flex-col justify-between space-y-3 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-surface2 text-muted font-bold border border-theme-subtle inline-block mb-1">
                      {item.type === 'quote' ? 'Quotation' : item.type === 'order' ? 'Sales Order' : item.type === 'credit' ? 'Credit Limit' : item.type === 'cashbook' ? 'Cash Voucher' : 'Material'}
                    </span>
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

      {/* Reject Reason Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
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
        </div>
      )}
    </div>
  );
};
