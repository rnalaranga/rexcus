import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, ShoppingBag, FileText, Calendar, Building2, User, Phone, 
  MapPin, UploadCloud, Eye, Trash2, CheckCircle2, AlertCircle, 
  Package, DollarSign, AlertTriangle, ShieldCheck, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createFinishedGoodsOrder } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';
import { useCustomers, useLeads, useInvoices } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';

export interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData?: {
    group: any;
    quotation: any;
    type?: 'custom' | 'product';
  } | null;
  onSuccess?: (createdOrder: any) => void;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  onSuccess
}) => {
  const { toast } = useDialog();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { data: customers = [] } = useCustomers();
  const { data: leads = [] } = useLeads();
  const { data: allInvoices = [] } = useInvoices();

  const [submitting, setSubmitting] = useState(false);
  const [adminOverrideWaiver, setAdminOverrideWaiver] = useState(false);
  const [advanceWaiverReason, setAdvanceWaiverReason] = useState('');

  const isAdminOrManager = Boolean(
    user?.role === 'admin' || 
    user?.role === 'manager' || 
    user?.role === 'sales_head' || 
    can?.('approvals.orders')
  );

  // Check if an Advance Proforma Invoice or payment exists for this Quotation
  const linkedProforma = useMemo(() => {
    if (!quotationData) return null;
    const { group, quotation } = quotationData;
    const qId = String(quotation?.id || '');
    const qNo = String(group?.quoNo || quotation?.quotationNo || quotation?.docNo || '').trim().toLowerCase();

    return allInvoices.find((inv: any) => {
      const isPI = Boolean(
        inv.isProforma || 
        inv.invoiceType === 'proforma' || 
        inv.status === 'proforma' || 
        String(inv.id || inv.invoiceNo || '').startsWith('PI-')
      );
      if (!isPI) return false;

      const matchId = qId && String(inv.quotationId) === qId;
      const invQNo = String(inv.quotationNo || inv.orderNo || '').trim().toLowerCase();
      const matchNo = qNo && invQNo && (invQNo === qNo || qNo.includes(invQNo) || invQNo.includes(qNo));
      return matchId || matchNo;
    });
  }, [quotationData, allInvoices]);

  const hasAdvance = Boolean(
    linkedProforma && (
      Number(linkedProforma.paidAmount || 0) > 0 || 
      linkedProforma.status === 'paid' || 
      linkedProforma.status === 'partially_paid' ||
      linkedProforma.id
    )
  );

  // Form State
  const [formData, setFormData] = useState({
    orderNo: '',
    quoteId: '',
    quotationNo: '',
    customerId: '',
    customerName: '',
    attention: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    paymentTerms: 'Standard Terms',
    customerPoNo: '',
    customerPoDate: '',
    customerPoAttachment: '',
    customerPoAttachmentName: '',
    orderDate: new Date().toISOString().slice(0, 10),
    targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    items: [] as any[],
    subtotal: 0,
    taxAmount: 0,
    totalPrice: 0,
    status: 'Confirmed',
    notes: ''
  });

  useEffect(() => {
    if (!isOpen || !quotationData) return;

    const { group, quotation, type } = quotationData;
    const isProduct = type === 'product';

    let quoteData: any = {};
    if (isProduct) {
      quoteData = quotation.parsed || {};
    } else {
      quoteData = typeof quotation.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation.data || {});
    }

    const rawItems = quoteData.custItems || quoteData.items || [];
    let itemsList = rawItems.map((ci: any) => ({
      productId: ci.productId || ci.inventoryId || (isProduct ? 'CUSTOM-PRODUCT' : 'CUSTOM-JOB'),
      productName: ci.name || ci.desc || ci.description || 'Quoted Item',
      productSku: ci.sku || '',
      description: ci.description || ci.desc || ci.name || '',
      qty: Number(ci.qty) || 1,
      unitPrice: Number(ci.unitPrice) || 0,
      amount: Number(ci.amount) || ((Number(ci.qty) || 1) * Number(ci.unitPrice || 0)),
      uom: ci.uom || ci.unit || 'Nos'
    }));

    if (itemsList.length === 0) {
      itemsList = [{
        productId: isProduct ? 'CUSTOM-PRODUCT' : 'CUSTOM-JOB',
        productName: quotation.subject || `Quotation ${group?.quoNo || ''} Job`,
        productSku: '',
        description: quotation.subject || `Quotation ${group?.quoNo || ''} Production Order`,
        qty: 1,
        unitPrice: Number(quotation.totalAmount || 0),
        amount: Number(quotation.totalAmount || 0),
        uom: 'Lot'
      }];
    }

    const subtotal = Number(quoteData.custTotals?.subtotal) || itemsList.reduce((acc: number, it: any) => acc + it.amount, 0);
    const total = Number(quotation.totalAmount) || Number(quoteData.custTotals?.total) || subtotal;
    const taxAmount = total - subtotal > 0 ? (total - subtotal) : 0;

    const cust = customers.find((c: any) => c.id === group.leadId);
    const lead = leads.find((l: any) => l.id === group.leadId);
    const custId = cust?.id || (lead as any)?.customerId || (group.leadId?.startsWith('CUST') ? group.leadId : null);

    const generatedOrderNo = `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const custName = group.clientName || group.clientCompany || group.leadCompany || group.leadName || 'Customer';
    const attn = quoteData.attention || quotation.attention || group.clientContact || group.leadContact || (cust as any)?.name || '';

    setFormData({
      orderNo: generatedOrderNo,
      quoteId: quotation.id,
      quotationNo: group.quoNo,
      customerId: custId || '',
      customerName: custName,
      attention: attn,
      customerPhone: group.clientPhone || group.leadPhone || '',
      customerEmail: group.clientEmail || group.leadEmail || '',
      deliveryAddress: group.clientAddress || group.leadAddress || quoteData.customerAddress || quoteData.deliveryAddress || '',
      paymentTerms: quoteData.custTerms || quoteData.terms || quoteData.paymentTerms || 'Standard Terms',
      customerPoNo: quotation.customerPoNo || quoteData.customerPoNo || quoteData.poNo || '',
      customerPoDate: quotation.customerPoDate || quoteData.customerPoDate || '',
      customerPoAttachment: quotation.customerPoAttachment || quoteData.customerPoAttachment || '',
      customerPoAttachmentName: (quotation.customerPoAttachment || quoteData.customerPoAttachment)
        ? `PO_${quotation.customerPoNo || quoteData.customerPoNo || 'Attachment'}.pdf`
        : '',
      orderDate: new Date().toISOString().slice(0, 10),
      targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      items: itemsList,
      subtotal,
      taxAmount,
      totalPrice: total,
      status: 'Confirmed',
      notes: `Commercial Sales Order generated from Approved Quotation ${group.quoNo}`
    });
  }, [isOpen, quotationData, customers, leads]);

  if (!isOpen || !quotationData) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast('File size exceeds 15MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        customerPoAttachment: reader.result as string,
        customerPoAttachmentName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderNo.trim()) {
      toast('Order Number is required', 'error');
      return;
    }

    if (!hasAdvance && !adminOverrideWaiver && !advanceWaiverReason.trim()) {
      toast('Please enter a reason for bypassing the advance payment requirement.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const isWaiver = !hasAdvance;
      const orderStatus = (isWaiver && !adminOverrideWaiver) ? 'Pending Advance Approval' : 'Confirmed';

      let waiverNote = '';
      if (isWaiver) {
        if (adminOverrideWaiver) {
          waiverNote = `\n[Advance Waived by Admin ${user?.name || user?.username || 'Authorized Approver'}: ${advanceWaiverReason || 'Admin Override'}]`;
        } else {
          waiverNote = `\n[Advance Waiver Requested: ${advanceWaiverReason || 'Pending Management Authorization'}]`;
        }
      } else if (linkedProforma) {
        waiverNote = `\n[Advance Proforma: ${linkedProforma.invoiceNo || linkedProforma.id}]`;
      }

      const payload = {
        ...formData,
        status: orderStatus,
        customerPoNo: formData.customerPoNo.trim() || null,
        customerPoDate: formData.customerPoDate || null,
        customerPoAttachment: formData.customerPoAttachment || null,
        notes: `${formData.notes || ''}${waiverNote}`.trim()
      };

      const res = await createFinishedGoodsOrder(payload);
      if (res && res.error) throw new Error(res.error);

      if (orderStatus === 'Pending Advance Approval') {
        toast(`Sales Order ${formData.orderNo} submitted! Awaiting Admin Approval in Central Approval Hub.`, 'info');
      } else {
        toast(`Sales Order ${formData.orderNo} created successfully!`, 'success');
      }

      onSuccess?.(res);
      onClose();
      navigate('/crm/sales-orders');
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Failed to create sales order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                Convert Quotation to Sales Order
                <span className="font-mono text-xs px-2 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {formData.quotationNo}
                </span>
              </h2>
              <p className="text-[11px] text-muted">
                Input Customer Purchase Order (PO) details and confirm commercial dispatch schedule
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Top Summary Card */}
          <div className="p-3.5 bg-surface2/60 border border-theme-subtle text-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-subtle/60 pb-2">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer</span>
                <span className="text-sm font-bold text-primary">{formData.customerName}</span>
                {formData.attention && (
                  <span className="text-[11px] text-muted block">Attn: {formData.attention}</span>
                )}
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Commercial Value</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(formData.totalPrice)}
                </span>
              </div>
            </div>

            {/* Line items preview */}
            <div>
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">
                Order Items ({formData.items.length})
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {formData.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-0.5 bg-surface/50 px-2 border border-theme-subtle/40">
                    <span className="truncate max-w-[340px] text-secondary font-medium">
                      • {it.description || it.productName}
                    </span>
                    <span className="font-mono text-muted shrink-0 text-[11px]">
                      {it.qty} {it.uom || 'Nos'} × {formatCurrency(it.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ADVANCE PAYMENT & PROFORMA VERIFICATION SECTION ── */}
          {hasAdvance ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                    Advance Payment / Proforma Invoice Verified
                  </span>
                  <span className="text-muted text-[11px]">
                    Linked Proforma: <strong className="font-mono text-primary">{linkedProforma.invoiceNo || linkedProforma.id}</strong>
                    {Number(linkedProforma.paidAmount) > 0 ? ` · Paid: ${formatCurrency(linkedProforma.paidAmount)}` : ' · Formally Issued'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white uppercase font-mono">
                Advance OK
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block">
                      Advance Payment Required (Approval Workflow)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase font-mono">
                      Approval Needed
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Rex ERP policy requires an Advance Deposit / Proforma Invoice before a Sales Order can be confirmed. No advance proforma was found for quotation <strong>{formData.quotationNo}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <p className="text-[11px] text-secondary">
                  To proceed without an advance payment, an <strong>Advance Waiver Approval Request</strong> will be routed to the <strong>Central Approval Hub</strong> for Admin / Management authorization.
                </p>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted mb-1">
                    Reason for Bypassing Advance Deposit *
                  </label>
                  <input
                    type="text"
                    required={!hasAdvance && !adminOverrideWaiver}
                    value={advanceWaiverReason}
                    onChange={(e) => setAdvanceWaiverReason(e.target.value)}
                    placeholder="e.g. Corporate client with 30-day PO credit term, approved by Director"
                    className="w-full h-8 px-2.5 text-xs bg-surface border border-amber-500/40 text-primary focus:outline-none focus:border-amber-600 font-medium"
                  />
                </div>

                {isAdminOrManager && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminOverrideWaiver}
                      onChange={(e) => setAdminOverrideWaiver(e.target.checked)}
                      className="rounded-none text-rex-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-primary">
                      Direct Admin Override: Waive advance deposit and Confirm order immediately
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ── CUSTOMER PURCHASE ORDER (PO) SECTION ── */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Customer Purchase Order (PO) {formData.customerPoNo ? '(Linked)' : '(Optional)'}
                </span>
              </div>
              {formData.customerPoNo ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> PO Recorded on Quote
                </span>
              ) : (
                <span className="text-[10px] text-muted font-mono">
                  Optional
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Customer PO Number
                </label>
                <input
                  type="text"
                  value={formData.customerPoNo}
                  onChange={e => setFormData({ ...formData, customerPoNo: e.target.value })}
                  placeholder="e.g. PO/2026/0891 or CUST-PO-774"
                  className="w-full input-base font-mono text-xs font-semibold focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Customer PO Date
                </label>
                <input
                  type="date"
                  value={formData.customerPoDate}
                  onChange={e => setFormData({ ...formData, customerPoDate: e.target.value })}
                  className="w-full input-base text-xs focus:border-blue-500"
                />
              </div>
            </div>

            {/* PO Document Attachment (Upload) */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Customer PO Document (Upload PDF or Image)
              </label>

              {formData.customerPoAttachment ? (
                <div className="flex items-center justify-between p-2.5 bg-surface border border-blue-500/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                      {formData.customerPoAttachment.startsWith('data:image/') ? (
                        <img src={formData.customerPoAttachment} alt="PO Preview" className="w-full h-full object-cover" />
                      ) : (
                        <FileText size={16} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-primary block truncate">
                        {formData.customerPoAttachmentName || (formData.customerPoNo ? `Customer_PO_${formData.customerPoNo}` : 'Customer_PO_Document')}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                        <CheckCircle2 size={10} /> Document attached
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          win.document.write(`<iframe src="${formData.customerPoAttachment}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 p-1.5 h-auto flex items-center gap-1"
                    >
                      <Eye size={13} /> View
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, customerPoAttachment: '', customerPoAttachmentName: '' })}
                      className="text-xs text-rose-600 hover:text-rose-700 p-1.5 h-auto flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-blue-500/40 hover:border-blue-500 bg-surface/60 hover:bg-blue-500/5 cursor-pointer transition-colors text-center">
                    <UploadCloud size={20} className="text-blue-500 mb-1" />
                    <span className="text-xs font-semibold text-primary">Click to upload customer's PO file (PDF, PNG, JPG)</span>
                    <span className="text-[10px] text-muted mt-0.5">Recommended max file size: 15MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Sales Order # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.orderNo}
                onChange={e => setFormData({ ...formData, orderNo: e.target.value })}
                className="w-full input-base font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Order Confirmation Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.orderDate}
                onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full input-base text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Target Delivery Date
              </label>
              <input
                type="date"
                value={formData.targetDeliveryDate}
                onChange={e => setFormData({ ...formData, targetDeliveryDate: e.target.value })}
                className="w-full input-base text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full input-base text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary mb-1">
                Delivery Destination / Site Address
              </label>
              <input
                type="text"
                value={formData.deliveryAddress}
                onChange={e => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Client site address or factory delivery point"
                className="w-full input-base text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-secondary mb-1">
                Order Notes / Commercial Instructions
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special packaging, customer PO reference remarks, or production priorities..."
                className="w-full input-base text-xs resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className={`font-bold px-5 ${
                (!hasAdvance && !adminOverrideWaiver)
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting
                ? 'Processing...'
                : (!hasAdvance && !adminOverrideWaiver)
                  ? 'Request Admin Approval & Submit Order'
                  : 'Confirm & Create Sales Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
