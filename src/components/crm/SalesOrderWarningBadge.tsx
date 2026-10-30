import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, User, ExternalLink, X, FileText, ArrowRight, Layers } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface SoChangeRecord {
  orderId?: string
  orderNo?: string
  quoteId?: string
  quotationNo?: string
  changedAt?: string
  changedBy?: string
  summary?: string
  changes?: string[]
}

/**
 * Intelligent helper to extract and detect Sales Order changes relative to a Quotation
 */
export const getQuotationSoChange = (quote: any, linkedOrder: any): SoChangeRecord | null => {
  if (!linkedOrder && !quote?.soChangeInfo) return null;

  // 1. Direct record from quotation or linked order
  let change: any = quote?.soChangeInfo || linkedOrder?.soChangeInfo;
  if (change) {
    if (typeof change === 'string') {
      try {
        change = JSON.parse(change);
      } catch (e) {
        change = null;
      }
    }
    if (change && (change.summary || (Array.isArray(change.changes) && change.changes.length > 0))) {
      return change;
    }
  }

  // 2. Check if linkedOrder was explicitly edited
  if (linkedOrder?.isEdited) {
    return {
      orderId: linkedOrder.id,
      orderNo: linkedOrder.orderNo || linkedOrder.id,
      changedAt: linkedOrder.lastEditedAt || linkedOrder.updatedAt || linkedOrder.createdAt,
      changedBy: linkedOrder.lastEditedBy || 'Sales Executive',
      summary: 'Sales Order specifications or pricing were modified',
      changes: ['Sales Order details were updated in Sales Order Management']
    };
  }

  // 3. Fallback: Compare financial values between quotation and sales order if both exist
  if (quote && linkedOrder) {
    const qTotal = Number(
      quote.totalAmount || 
      quote.total || 
      quote.parsed?.custTotals?.withSSCL || 
      quote.parsed?.custTotals?.grossTotal || 
      quote.custTotals?.withSSCL || 
      0
    );
    const soTotal = Number(linkedOrder.totalPrice || linkedOrder.subtotal || 0);

    const qQty = Number(
      quote.jobQty || 
      quote.parsed?.jobQty || 
      (Array.isArray(quote.items) ? quote.items.reduce((s: number, i: any) => s + (Number(i.qty) || 1), 0) : 0) || 
      0
    );
    const soQty = Number(linkedOrder.qty || 0);

    const diffs: string[] = [];
    if (qTotal > 0 && soTotal > 0 && Math.abs(qTotal - soTotal) > 1.0) {
      diffs.push(`Total Amount diverged: Quote Rs. ${Math.round(qTotal).toLocaleString()} vs SO Rs. ${Math.round(soTotal).toLocaleString()}`);
    }
    if (qQty > 0 && soQty > 0 && qQty !== soQty) {
      diffs.push(`Quantity diverged: Quote (${qQty}) vs SO (${soQty})`);
    }

    if (diffs.length > 0) {
      return {
        orderId: linkedOrder.id,
        orderNo: linkedOrder.orderNo || linkedOrder.id,
        changedAt: linkedOrder.updatedAt || linkedOrder.createdAt,
        changedBy: linkedOrder.lastEditedBy || 'Sales Team',
        summary: diffs.join('; '),
        changes: diffs
      };
    }
  }

  return null;
};

interface Props {
  changeInfo: SoChangeRecord
  linkedOrder?: any
  quotation?: any
  className?: string
}

export const SalesOrderWarningBadge: React.FC<Props> = ({
  changeInfo,
  linkedOrder,
  quotation,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpwards: boolean } | null>(null);

  // Position popover relative to badge trigger
  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 260;
    const openUpwards = rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight;

    setCoords({
      top: openUpwards ? rect.top - 8 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
      openUpwards
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updateCoords();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setIsOpen(false);
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.so-warning-popover') && !target.closest('.so-warning-trigger')) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const orderNo = changeInfo.orderNo || linkedOrder?.orderNo || 'SO';
  const orderId = changeInfo.orderId || linkedOrder?.id;

  const navigateToOrder = () => {
    setIsOpen(false);
    navigate(`/crm/sales-orders?search=${encodeURIComponent(orderNo)}`);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`so-warning-trigger inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-none bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-500/70 transition-all cursor-pointer shadow-xs select-none group ${className}`}
        title={`Sales Order (${orderNo}) Changed: ${changeInfo.summary || 'Details updated'}. Click to view info.`}
      >
        <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span>SO</span>
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          className="so-warning-popover fixed z-[9999] w-80 bg-surface dark:bg-zinc-900 border border-amber-500/40 shadow-2xl rounded-none p-3.5 text-xs text-primary transition-all animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: coords.openUpwards ? 'auto' : coords.top,
            bottom: coords.openUpwards ? window.innerHeight - coords.top : 'auto',
            left: coords.left,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-2.5 mb-2.5 border-b border-theme-subtle">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle size={14} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Sales Order Changed
                  </h4>
                </div>
                <p className="font-mono text-[11px] font-bold text-primary">
                  {orderNo}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded-none"
            >
              <X size={13} />
            </button>
          </div>

          {/* Meta Info */}
          <div className="space-y-1.5 mb-3 text-[11px] text-muted font-mono">
            {changeInfo.changedAt && (
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-muted shrink-0" />
                <span>Changed: {formatDate(changeInfo.changedAt)}</span>
              </div>
            )}
            {changeInfo.changedBy && (
              <div className="flex items-center gap-1.5">
                <User size={11} className="text-muted shrink-0" />
                <span>By: {changeInfo.changedBy}</span>
              </div>
            )}
          </div>

          {/* Changes List */}
          <div className="bg-surface2/60 border border-theme-subtle p-2.5 mb-3 rounded-none space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Changed Details
            </p>
            {changeInfo.changes && changeInfo.changes.length > 0 ? (
              <ul className="space-y-1 font-mono text-[11px]">
                {changeInfo.changes.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <span className="text-amber-500 font-bold shrink-0">•</span>
                    <span className="break-words">{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
                {changeInfo.summary || 'Sales Order parameters diverged from original quotation specifications.'}
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={navigateToOrder}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors"
          >
            <span>View Sales Order ({orderNo})</span>
            <ExternalLink size={11} />
          </button>
        </div>,
        document.body
      )}
    </>
  );
};
