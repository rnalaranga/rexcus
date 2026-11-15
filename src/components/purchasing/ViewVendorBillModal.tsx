import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, openDataUriOrUrl } from '@/lib/utils';
import { FileText, Paperclip, Building2, Calendar, CreditCard, Tag, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ViewVendorBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;
  onPayBill?: (bill: any) => void;
}

export const ViewVendorBillModal: React.FC<ViewVendorBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  onPayBill
}) => {
  const navigate = useNavigate();

  if (!isOpen || !bill) return null;

  const totalAmount = Number(bill.amount || bill.totalAmount || 0);
  const paidAmount = Number(bill.paidAmount || 0);
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const isSettled = balanceDue <= 0 && totalAmount > 0;

  let items: any[] = [];
  if (Array.isArray(bill.items)) {
    items = bill.items;
  } else if (typeof bill.items === 'string') {
    try { items = JSON.parse(bill.items); } catch {}
  }

  let taxBreakdown: any = null;
  if (bill.taxBreakdown) {
    try {
      taxBreakdown = typeof bill.taxBreakdown === 'string' ? JSON.parse(bill.taxBreakdown) : bill.taxBreakdown;
    } catch {}
  }

  const supplierName = bill.resolvedSupplierName || bill.supplierName || bill.supplierCompany || 'Vendor / Supplier';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Supplier Bill — #${bill.id}`} size="xl">
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="p-4 bg-surface2/60 border border-theme-subtle rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-primary font-mono">{bill.id}</h3>
                {isSettled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    PAID
                  </span>
                ) : paidAmount > 0 ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    PARTIAL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    UNPAID
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Vendor Ref: <strong className="font-mono text-primary">{bill.invoiceNo || 'N/A'}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted block">Bill Total</span>
            <div className="text-xl font-mono font-black text-primary">
              {formatCurrency(totalAmount)}
            </div>
            {paidAmount > 0 && (
              <span className="text-xs text-emerald-600 font-mono font-semibold block">
                Paid: {formatCurrency(paidAmount)} • Due: {formatCurrency(balanceDue)}
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-surface border border-theme-subtle rounded">
            <span className="text-[10px] uppercase text-muted font-bold block">Vendor</span>
            <span className="font-semibold text-primary truncate block mt-0.5">{supplierName}</span>
          </div>

          <div className="p-2.5 bg-surface border border-theme-subtle rounded">
            <span className="text-[10px] uppercase text-muted font-bold block">Bill Date</span>
            <span className="font-mono text-primary block mt-0.5">{formatDate(bill.date)}</span>
          </div>

          <div className="p-2.5 bg-surface border border-theme-subtle rounded">
            <span className="text-[10px] uppercase text-muted font-bold block">Due Date</span>
            <span className="font-mono text-primary block mt-0.5">{bill.dueDate ? formatDate(bill.dueDate) : 'Immediate'}</span>
          </div>

          <div className="p-2.5 bg-surface border border-theme-subtle rounded">
            <span className="text-[10px] uppercase text-muted font-bold block">Category</span>
            <span className="font-semibold text-primary block mt-0.5">{bill.billCategory || 'Purchase'}</span>
          </div>
        </div>

        {/* PO & GRN Links */}
        {(bill.poId || bill.grnId) && (
          <div className="flex items-center gap-3 p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
            {bill.poId && (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-muted">PO Ref:</span>
                <strong className="text-blue-600 dark:text-blue-400">{bill.poId}</strong>
              </div>
            )}
            {bill.grnId && (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-muted">GRN Ref:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{bill.grnId}</strong>
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        {items.length > 0 && (
          <div className="border border-theme-subtle rounded overflow-hidden">
            <div className="px-3 py-1.5 bg-surface2 text-[10px] font-bold text-muted uppercase tracking-wider">
              Billed Items / Services
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-theme-subtle bg-surface text-secondary text-[10px] uppercase">
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {items.map((it: any, idx: number) => {
                  const qty = Number(it.qty || it.quantity || 1);
                  const price = Number(it.unitCost || it.unitPrice || it.rate || 0);
                  const lineTot = Number(it.total || qty * price);
                  return (
                    <tr key={idx} className="hover:bg-surface2/30">
                      <td className="p-2 text-primary">{it.description || it.name || it.item || 'Item'}</td>
                      <td className="p-2 text-right font-mono">{qty} {it.uom || ''}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(price)}</td>
                      <td className="p-2 text-right font-mono font-bold text-primary">{formatCurrency(lineTot)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Taxes & Totals Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 p-3 bg-surface2/40 border border-theme-subtle rounded">
          <div className="space-y-1 text-xs">
            {bill.notes && (
              <div>
                <span className="text-[10px] uppercase text-muted font-bold block">Notes:</span>
                <p className="text-secondary italic">{bill.notes}</p>
              </div>
            )}
            {bill.billAttachment && (
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Paperclip}
                  onClick={() => openDataUriOrUrl(bill.billAttachment, `Vendor Bill - ${bill.invoiceNo || bill.id}`)}
                  className="h-7 text-xs text-blue-600"
                >
                  View Attached Vendor Bill File
                </Button>
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-secondary">
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(bill.subtotal || totalAmount - (bill.taxAmount || 0)))}</span>
            </div>
            {taxBreakdown?.tax1Amount > 0 && (
              <div className="flex justify-between text-muted">
                <span>{taxBreakdown.tax1Name || 'SSCL'} ({taxBreakdown.tax1Rate}%):</span>
                <span>{formatCurrency(taxBreakdown.tax1Amount)}</span>
              </div>
            )}
            {(taxBreakdown?.tax2Amount > 0 || Number(bill.taxAmount || 0) > 0) && (
              <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                <span>Input VAT (18%):</span>
                <span>{formatCurrency(taxBreakdown?.tax2Amount || bill.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-primary font-bold pt-1.5 border-t border-theme-subtle text-sm">
              <span>Grand Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 text-xs">
              <span>Paid to Date:</span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-bold text-xs pt-1 border-t border-theme-subtle/50">
              <span>Balance Due:</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              navigate(`/purchasing/bill-builder?id=${bill.id}`);
            }}
            className="text-xs"
          >
            Edit in Bill Builder
          </Button>

          <div className="flex gap-2">
            {balanceDue > 0 && onPayBill && (
              <Button
                variant="primary"
                icon={CreditCard}
                onClick={() => {
                  onClose();
                  onPayBill(bill);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs"
              >
                Pay Bill
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
