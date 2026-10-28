import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Calendar, Building2, Eye, Download, ExternalLink, 
  Clock, AlertCircle, CheckCircle2, Edit3, ShoppingBag, DollarSign,
  FileText, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface ViewCustomerPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData?: {
    group: any;
    quotation: any;
    type?: 'custom' | 'product';
  } | null;
  onEditPo?: (quotationData: any) => void;
  onCreateSalesOrder?: (group: any, quotation: any) => void;
}

export const ViewCustomerPoModal: React.FC<ViewCustomerPoModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  onEditPo,
  onCreateSalesOrder
}) => {
  const [zoomImage, setZoomImage] = useState(false);

  if (!isOpen || !quotationData) return null;

  const { group, quotation, type } = quotationData;
  let quoteData: any = {};
  if (type === 'product') {
    quoteData = quotation?.parsed || {};
  } else {
    try {
      quoteData = typeof quotation?.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation?.data || {});
    } catch (e) {}
  }

  const custName = group?.clientName || group?.clientCompany || group?.leadCompany || group?.leadName || 'Customer';
  const qNo = group?.quoNo || quotation?.quotationNo || quotation?.docNo || quotation?.id;
  const quoteTotal = Number(quotation?.totalAmount || quotation?.customAmount || 0);

  const poNo = quotation?.customerPoNo || quoteData?.customerPoNo || quoteData?.poNo || '';
  const poStatus = quotation?.poStatus || quoteData?.poStatus || quotation?.status || 'PO Received';
  const poDate = quotation?.customerPoDate || quoteData?.customerPoDate || '';
  const expectedDate = quoteData?.expectedPoDate || '';
  const withoutPoReason = quoteData?.withoutPoReason || '';
  const notes = quoteData?.customerPoNotes || quotation?.notes || '';
  const poReceivedAt = quotation?.poReceivedAt || quoteData?.poReceivedAt || '';
  const receivedBy = quoteData?.poReceivedBy || '';
  const attachment = quotation?.customerPoAttachment || quoteData?.customerPoAttachment || '';

  const isPending = poStatus === 'PO Pending' || poNo === 'PO PENDING';
  const isWithoutPo = poStatus === 'Without PO' || poNo === 'WITHOUT PO';
  const isReceived = !isPending && !isWithoutPo && Boolean(poNo || poStatus === 'PO Received');

  const isImageAttachment = Boolean(
    attachment && (
      attachment.startsWith('data:image/') ||
      attachment.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i)
    )
  );

  const isPdfAttachment = Boolean(
    attachment && (
      attachment.startsWith('data:application/pdf') ||
      attachment.match(/\.pdf($|\?)/i)
    )
  );

  // Safely open attachment in new tab (converting base64 to Blob URL to avoid browser security blocking)
  const handleOpenInNewTab = () => {
    if (!attachment) return;
    try {
      if (attachment.startsWith('data:')) {
        const parts = attachment.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(attachment, '_blank');
      }
    } catch (e) {
      console.error('Error opening attachment:', e);
      window.open(attachment, '_blank');
    }
  };

  // Download attachment
  const handleDownload = () => {
    if (!attachment) return;
    try {
      const link = document.createElement('a');
      link.href = attachment;
      const extension = isImageAttachment ? 'png' : isPdfAttachment ? 'pdf' : 'bin';
      link.download = `PO_${poNo || qNo || 'CustomerPO'}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading attachment:', e);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-subtle bg-surface2/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-none border ${
              isReceived 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : isPending 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
            }`}>
              {isReceived ? <FileCheck size={20} /> : isPending ? <Clock size={20} /> : <AlertCircle size={20} />}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-primary">
                  Customer Purchase Order Details
                </h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                  isReceived
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : isPending
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                }`}>
                  {isReceived ? '✓ PO Received' : isPending ? '⏳ PO Pending' : '⚠️ Without PO'}
                </span>
              </div>
              <p className="text-xs text-muted truncate mt-0.5">
                Quotation <span className="font-mono font-semibold text-primary">{qNo}</span> • {custName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* PO Number Card */}
            <div className="p-3 bg-surface2/50 border border-theme-subtle">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Customer PO Number</span>
                <FileCheck size={12} className="text-muted" />
              </div>
              <div className="font-mono font-bold text-base text-primary truncate">
                {poNo || <span className="text-muted italic text-xs">Not Specified</span>}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {isReceived ? 'Confirmed by client' : isPending ? 'Pending client issuance' : 'Waived/Direct'}
              </div>
            </div>

            {/* Date Card */}
            <div className="p-3 bg-surface2/50 border border-theme-subtle">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{isPending ? 'Expected PO Date' : 'PO Issue Date'}</span>
                <Calendar size={12} className="text-muted" />
              </div>
              <div className="font-mono font-bold text-sm text-primary">
                {isPending 
                  ? (expectedDate ? formatDate(expectedDate) : 'Not specified')
                  : (poDate ? formatDate(poDate) : 'Not specified')}
              </div>
              {poReceivedAt && (
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  Recorded: {formatDate(poReceivedAt)}
                </div>
              )}
            </div>

            {/* Quotation Total Card */}
            <div className="p-3 bg-surface2/50 border border-theme-subtle">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Quotation Value</span>
                <DollarSign size={12} className="text-muted" />
              </div>
              <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                {formatCurrency(quoteTotal)}
              </div>
              <div className="text-[11px] text-muted mt-0.5 truncate">
                Customer: {custName}
              </div>
            </div>
          </div>

          {/* Details / Notes / Reason */}
          {(withoutPoReason || notes || receivedBy) && (
            <div className="p-3.5 bg-surface2/30 border border-theme-subtle space-y-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-rex-500" />
                Additional Details & Audit
              </h3>

              {withoutPoReason && (
                <div className="text-xs">
                  <span className="text-muted font-medium">Without PO Authorization Reason: </span>
                  <span className="font-semibold text-primary">{withoutPoReason}</span>
                </div>
              )}

              {receivedBy && (
                <div className="text-xs">
                  <span className="text-muted font-medium">Recorded / Confirmed By: </span>
                  <span className="font-semibold text-primary">{receivedBy}</span>
                </div>
              )}

              {notes && (
                <div className="text-xs bg-surface p-2.5 border border-theme-subtle text-secondary whitespace-pre-wrap font-sans">
                  {notes}
                </div>
              )}
            </div>
          )}

          {/* PO Document / Attachment Section */}
          <div className="border border-theme-subtle">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface2/80 border-b border-theme-subtle">
              <div className="flex items-center gap-2">
                <FileCheck size={14} className="text-rex-500" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Customer PO Document Attachment
                </h3>
              </div>
              {attachment && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ExternalLink}
                    onClick={handleOpenInNewTab}
                    className="h-6 text-[11px] px-2 border border-theme-subtle hover:bg-surface"
                    title="Open in new window"
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={handleDownload}
                    className="h-6 text-[11px] px-2 bg-rex-600/10 text-rex-600 dark:text-rex-400 border border-rex-600/30 hover:bg-rex-600/20"
                    title="Download document"
                  >
                    Download
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface">
              {attachment ? (
                <div>
                  {isImageAttachment ? (
                    <div className="space-y-2">
                      <div 
                        onClick={() => setZoomImage(true)}
                        className="group relative cursor-pointer border border-theme-subtle overflow-hidden max-h-80 flex items-center justify-center bg-surface2/40 hover:border-rex-500/50 transition-colors"
                      >
                        <img 
                          src={attachment} 
                          alt="Customer PO Document" 
                          className="max-h-80 w-auto object-contain transition-transform group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                          <Eye size={14} /> Click to Enlarge
                        </div>
                      </div>
                      <p className="text-[11px] text-muted text-center">
                        Click image to view full screen or use download above.
                      </p>
                    </div>
                  ) : isPdfAttachment ? (
                    <div className="space-y-2">
                      <div className="border border-theme-subtle bg-surface2/30 h-80 w-full overflow-hidden flex flex-col">
                        <iframe 
                          src={attachment} 
                          title="PO Document PDF Preview" 
                          className="w-full h-full border-none"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted px-1">
                        <span>PDF Document attached</span>
                        <button 
                          type="button" 
                          onClick={handleOpenInNewTab}
                          className="text-rex-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          View Fullscreen <ArrowUpRight size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center border border-dashed border-theme-subtle bg-surface2/20">
                      <FileCheck size={28} className="mx-auto text-emerald-500 mb-2" />
                      <div className="text-xs font-bold text-primary mb-1">
                        Attached Document Available
                      </div>
                      <p className="text-[11px] text-muted mb-3">
                        File attached with this purchase order record.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Download}
                        onClick={handleDownload}
                        className="text-xs"
                      >
                        Download Attached Document
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-theme-subtle bg-surface2/20">
                  <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center mx-auto mb-2 text-muted">
                    <FileCheck size={18} />
                  </div>
                  <h4 className="text-xs font-bold text-primary mb-0.5">
                    No Attachment Uploaded
                  </h4>
                  <p className="text-[11px] text-muted mb-3 max-w-sm mx-auto">
                    {isPending 
                      ? 'The client PO is currently pending. Once received, click "Update PO" to attach the document.'
                      : 'No physical PO document or PDF was attached when recording this PO.'}
                  </p>
                  {onEditPo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit3}
                      onClick={() => {
                        onClose();
                        onEditPo(quotationData);
                      }}
                      className="text-xs border border-theme-subtle hover:bg-surface2"
                    >
                      Attach PO File Now
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-theme-subtle bg-surface2/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs border border-theme-subtle"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onEditPo && (
              <Button
                variant="ghost"
                size="sm"
                icon={Edit3}
                onClick={() => {
                  onClose();
                  onEditPo(quotationData);
                }}
                className="text-xs border border-theme-subtle hover:bg-surface"
              >
                {isPending ? 'Mark as PO Received' : 'Edit / Update PO'}
              </Button>
            )}

            {onCreateSalesOrder && (
              <Button
                variant="primary"
                size="sm"
                icon={ShoppingBag}
                onClick={() => {
                  onClose();
                  onCreateSalesOrder(group, quotation);
                }}
                className="text-xs font-semibold"
              >
                Create Sales Order
              </Button>
            )}
          </div>
        </div>

        {/* Full Image Zoom Modal */}
        {zoomImage && isImageAttachment && (
          <div 
            onClick={() => setZoomImage(false)}
            className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img 
                src={attachment} 
                alt="Enlarged PO" 
                className="max-h-[85vh] max-w-full object-contain shadow-2xl border border-white/20" 
              />
              <button
                type="button"
                onClick={() => setZoomImage(false)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white hover:bg-black transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
