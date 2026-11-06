import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileCheck, Calendar, Building2, Eye, Download, ExternalLink, 
  Clock, AlertCircle, CheckCircle2, Edit3, ShoppingBag, DollarSign,
  FileText, ShieldCheck, ArrowUpRight, UploadCloud, Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, openDataUriOrUrl, downloadDataUriOrUrl, dataUriToBlobUrl } from '@/lib/utils';

export interface ViewCustomerPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData?: {
    group: any;
    quotation: any;
    type?: 'custom' | 'product';
  } | null;
  orderData?: any | null;
  onEditPo?: (data?: any) => void;
  onCreateSalesOrder?: (group: any, quotation: any) => void;
}

export const ViewCustomerPoModal: React.FC<ViewCustomerPoModalProps> = ({
  isOpen,
  onClose,
  quotationData,
  orderData,
  onEditPo,
  onCreateSalesOrder
}) => {
  const [zoomImage, setZoomImage] = useState(false);

  const isOrderMode = Boolean(orderData);
  if (!isOpen || (!quotationData && !orderData)) return null;

  const group = quotationData?.group;
  const quotation = quotationData?.quotation;
  let quoteData: any = {};
  try {
    if (quotation?.parsed && typeof quotation.parsed === 'object' && Object.keys(quotation.parsed).length > 0) {
      quoteData = quotation.parsed;
    } else if (quotation?.data) {
      quoteData = typeof quotation.data === 'string' ? JSON.parse(quotation.data || '{}') : (quotation.data || {});
      if (typeof quoteData === 'string') {
        try { quoteData = JSON.parse(quoteData); } catch (e) {}
      }
    }
  } catch (e) {}

  const custName = orderData?.customerName || group?.clientName || group?.clientCompany || group?.leadCompany || group?.leadName || 'Customer';
  const qNo = orderData?.orderNo || group?.quoNo || quotation?.quotationNo || quotation?.docNo || quotation?.id;
  const quoteTotal = Number(orderData?.totalPrice || orderData?.subtotal || quotation?.totalAmount || quotation?.customAmount || 0);

  const poNo = orderData?.customerPoNo || quotation?.customerPoNo || quoteData?.customerPoNo || quoteData?.poNo || '';
  const rawNotes = orderData?.notes || quoteData?.customerPoNotes || quoteData?.notes || quoteData?.description || quotation?.notes || '';
  const isPoPending = poNo === 'PO PENDING' || /\[PO Pending\]/i.test(rawNotes) || quotation?.status === 'PO Pending';
  const isWithoutPo = poNo === 'WITHOUT PO' || quotation?.status === 'Without PO';
  const poDate = orderData?.customerPoDate || quotation?.customerPoDate || quoteData?.customerPoDate || '';
  const expectedDate = quoteData?.expectedPoDate || '';
  const withoutPoReason = quoteData?.withoutPoReason || '';
  const notes = rawNotes;
  const attachment = orderData?.customerPoAttachment || quotation?.customerPoAttachment || quoteData?.customerPoAttachment || '';
  const previewUrl = useMemo(() => dataUriToBlobUrl(attachment), [attachment]);

  const isImageAttachment = Boolean(
    attachment && (
      attachment.startsWith('data:image/') || 
      /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment)
    )
  );

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                Customer Purchase Order Details
              </h2>
              <p className="text-[11px] text-muted">
                {isOrderMode ? 'Sales Order' : 'Quotation'} <span className="font-mono font-semibold text-primary">{qNo}</span> &bull; {custName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Main Status Header Card */}
          <div className="p-4 bg-surface2/40 border border-theme-subtle rounded-none">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer PO Number</span>
                {isPoPending ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold text-base mt-0.5">
                    <Clock size={16} /> PO PENDING
                  </span>
                ) : isWithoutPo ? (
                  <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-mono font-bold text-base mt-0.5">
                    <FileText size={16} /> WITHOUT CUSTOMER PO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-lg mt-0.5">
                    <CheckCircle2 size={18} /> {poNo || 'N/A'}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">{isOrderMode ? 'Order Total' : 'Quotation Total'}</span>
                <span className="font-mono font-bold text-primary text-base">
                  {formatCurrency(quoteTotal, true)}
                </span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-theme-subtle text-[11px]">
              <div>
                <span className="text-muted block text-[10px] uppercase font-semibold">Customer / Account</span>
                <span className="font-bold text-primary">{custName}</span>
              </div>

              <div>
                <span className="text-muted block text-[10px] uppercase font-semibold">PO Issue Date</span>
                <span className="font-mono font-medium text-primary">
                  {poDate ? formatDate(poDate) : 'Not Specified'}
                </span>
              </div>

              {expectedDate && (
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Expected By</span>
                  <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                    {formatDate(expectedDate)}
                  </span>
                </div>
              )}

              {withoutPoReason && (
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold">Authorization Mode</span>
                  <span className="font-medium text-sky-600 dark:text-sky-400">{withoutPoReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* PO Pending Warning Banner */}
          {isPoPending && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="text-xs leading-relaxed">
                <strong>Dispatch & Tax Invoice Blocked:</strong> Goods dispatch and commercial invoice generation are strictly blocked for this order until the customer provides their official purchase order.
              </div>
            </div>
          )}

          {/* Notes if present */}
          {notes && (
            <div className="p-3 bg-surface border border-theme-subtle">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Commercial Notes / Terms</span>
              <p className="text-primary text-xs leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          {/* Attachment Preview Box */}
          {attachment ? (
            <div className="p-3.5 bg-surface border border-theme-subtle space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-500" />
                  <div>
                    <span className="font-bold text-xs text-primary block">Official PO Document Attached</span>
                    <span className="text-[10px] text-muted">File attached with this purchase order record</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDataUriOrUrl(attachment, ('Customer_PO_' + (poNo || qNo)))}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Download size={13} /> Download
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => openDataUriOrUrl(attachment, ('Customer PO - ' + (poNo || qNo)))}
                    className="text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ExternalLink size={13} /> Open in Tab
                  </Button>
                </div>
              </div>

              {/* In-modal preview container */}
              <div className="bg-surface2/60 border border-theme-subtle p-2 flex items-center justify-center min-h-[300px] max-h-[450px] overflow-auto">
                {isImageAttachment ? (
                  <img
                    src={previewUrl || attachment}
                    alt="Customer PO Document"
                    className="max-w-full max-h-[420px] object-contain shadow cursor-zoom-in"
                    onClick={() => openDataUriOrUrl(attachment, ('Customer PO - ' + (poNo || qNo)))}
                    title="Click to view full size in new tab"
                  />
                ) : (
                  <iframe
                    src={previewUrl || attachment}
                    title="Customer PO PDF Document"
                    className="w-full h-[400px] border-none"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 border border-dashed border-theme-subtle text-center text-muted text-xs space-y-2.5">
              <div className="w-10 h-10 mx-auto rounded-full bg-surface2 flex items-center justify-center text-muted">
                <Paperclip size={18} />
              </div>
              <div>
                <p className="font-semibold text-primary">No PO Document Attached</p>
                <p className="text-[11px] text-muted">No physical PO scan, PDF, or image file has been uploaded for this record yet.</p>
              </div>
              {onEditPo && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onEditPo(quotationData || orderData)}
                  className="text-xs inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white mt-1"
                >
                  <UploadCloud size={13} /> Attach PO Document Now
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-theme-subtle bg-surface2/60">
          <div>
            {onEditPo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditPo(quotationData || orderData)}
                className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              >
                <Edit3 size={13} /> {isPoPending ? 'Attach Customer PO' : 'Update PO Details'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
            {onCreateSalesOrder && quotationData && !isPoPending && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onCreateSalesOrder(group, quotation);
                }}
                className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <ShoppingBag size={13} /> Create Sales Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
