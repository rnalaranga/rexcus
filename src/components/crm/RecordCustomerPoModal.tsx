import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Calendar, Building2, UploadCloud, Eye, Trash2, 
  CheckCircle2, AlertCircle, DollarSign, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

export interface RecordCustomerPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData?: {
    group: any;
    quotation: any;
    type?: 'custom' | 'product';
  } | null;
  onSuccess?: (updatedQuote: any) => void;
}

export const RecordCustomerPoModal: React.FC<RecordCustomerPoModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  onSuccess
}) => {
  const { toast } = useDialog();
  const { user } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [customerPoNo, setCustomerPoNo] = useState('');
  const [customerPoDate, setCustomerPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerPoAttachment, setCustomerPoAttachment] = useState('');
  const [customerPoAttachmentName, setCustomerPoAttachmentName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !quotationData) return;
    const { group, quotation, type } = quotationData;
    let quoteData: any = {};
    if (type === 'product') {
      quoteData = quotation.parsed || {};
    } else {
      try {
        quoteData = typeof quotation.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation.data || {});
      } catch (e) {}
    }

    setCustomerPoNo(quotation.customerPoNo || quoteData.customerPoNo || quoteData.poNo || '');
    setCustomerPoDate(quotation.customerPoDate || quoteData.customerPoDate || new Date().toISOString().slice(0, 10));
    setCustomerPoAttachment(quotation.customerPoAttachment || quoteData.customerPoAttachment || '');
    setCustomerPoAttachmentName(
      quotation.customerPoAttachment || quoteData.customerPoAttachment 
        ? `PO_${quotation.customerPoNo || quoteData.customerPoNo || 'Document'}.pdf` 
        : ''
    );
    setNotes(quoteData.customerPoNotes || '');
  }, [isOpen, quotationData]);

  if (!isOpen || !quotationData) return null;

  const { group, quotation } = quotationData;
  const custName = group?.clientName || group?.clientCompany || group?.leadCompany || group?.leadName || 'Customer';
  const qNo = group?.quoNo || quotation?.quotationNo || quotation?.docNo || quotation?.id;
  const quoteTotal = Number(quotation?.totalAmount || quotation?.customAmount || 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast('File size exceeds 15MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomerPoAttachment(reader.result as string);
      setCustomerPoAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPoNo.trim()) {
      toast('Please enter the Customer PO Number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${quotation.id}/po-received`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPoNo: customerPoNo.trim(),
          customerPoDate,
          customerPoAttachment: customerPoAttachment || null,
          notes: notes.trim() || null,
          receivedBy: user?.name || (user as any)?.email || 'Sales Team'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to record customer PO');
      }

      const data = await res.json();
      toast(`Customer PO #${customerPoNo.trim()} recorded successfully! Quotation marked as PO Received.`, 'success');
      onSuccess?.(data);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'Failed to record PO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-subtle bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                Record Customer Purchase Order (PO)
              </h2>
              <p className="text-[11px] text-muted">
                Confirm receipt of customer purchase order for Quotation <span className="font-mono font-semibold text-primary">{qNo}</span>
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Target Quotation Summary */}
          <div className="p-3.5 bg-surface2 border border-theme-subtle text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 size={16} className="text-muted shrink-0" />
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer</span>
                <span className="text-xs font-bold text-primary">{custName}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Quotation Value</span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(quoteTotal)}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-primary mb-1">
                  Customer PO Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-2026-8891"
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                  className="w-full px-3 py-2 bg-surface2 border border-theme text-xs font-mono font-bold focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-primary mb-1">
                  Customer PO Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={customerPoDate}
                    onChange={(e) => setCustomerPoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface2 border border-theme text-xs focus:border-emerald-500 outline-none transition-colors"
                  />
                  <Calendar size={14} className="absolute right-3 top-2.5 text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* PO Document Attachment */}
            <div>
              <label className="block text-[11px] font-bold text-primary mb-1">
                Customer PO Attachment (PDF / Image)
              </label>
              <div className="border-2 border-dashed border-theme-subtle hover:border-emerald-500/60 transition-colors p-4 text-center bg-surface2/40">
                {customerPoAttachment ? (
                  <div className="flex items-center justify-between gap-3 p-2 bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono truncate text-primary">
                        {customerPoAttachmentName || `PO_${customerPoNo || 'Attachment'}.pdf`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const w = window.open();
                          if (w) {
                            w.document.write(`<iframe src="${customerPoAttachment}" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          }
                        }}
                        className="p-1 text-muted hover:text-primary hover:bg-surface transition-colors"
                        title="View Document"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerPoAttachment('');
                          setCustomerPoAttachmentName('');
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Remove Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={28} className="mx-auto text-muted mb-2 opacity-60" />
                    <p className="text-xs font-medium text-primary">
                      Drag and drop customer PO file here, or{' '}
                      <label className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </p>
                    <p className="text-[10px] text-muted mt-1">PDF, PNG, JPG up to 15MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-primary mb-1">
                Internal Remarks / Delivery Note
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes regarding this customer purchase order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-surface2 border border-theme text-xs focus:border-emerald-500 outline-none transition-colors resize-none"
              />
            </div>

            {/* Notification Callout */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="text-[11px] leading-relaxed">
                Recording this PO will notify the quotation creator, update the quotation status to <strong>PO Received</strong>, and link the PO directly under this customer's profile.
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-theme-subtle flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !customerPoNo.trim()}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {submitting ? 'Recording...' : 'Confirm PO Received'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
