import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PaymentVoucherPrintView } from './PaymentVoucherPrintView';
import { printElement } from '@/lib/printElement';
import { exportPdf } from '@/lib/exportPdf';

interface PaymentVoucherPrintModalProps {
  voucher: any | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const PaymentVoucherPrintModal: React.FC<PaymentVoucherPrintModalProps> = ({
  voucher,
  isOpen,
  onClose,
  settings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !voucher) return null;

  const voucherNum = voucher.voucherNo || voucher.id || 'PV';

  const handlePrint = () => {
    printElement('payment-voucher-print-section', `Payment_Voucher_${voucherNum}`);
  };

  const handleDownloadPDF = async () => {
    await exportPdf('payment-voucher-print-section', `Payment_Voucher_${voucherNum}.pdf`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-4xl bg-surface border border-theme shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface2 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Official Payment Voucher
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/30 font-semibold uppercase">
                  {voucherNum}
                </span>
                {voucher.paymentMethod && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/30">
                    {voucher.paymentMethod}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                {voucher.payeeName || voucher.supplierName || 'Payee'} &bull; Sri Lanka Commercial Standard Half-Page Slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="text-xs font-bold"
            >
              Print Slip
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadPDF}
              className="text-xs"
            >
              Download PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Document Scroll Preview */}
        <div className="flex-1 bg-[#525659] p-4 sm:p-8 overflow-y-auto flex justify-center custom-scrollbar">
          <div ref={printRef} className="shadow-2xl bg-white w-full max-w-[794px]">
            <PaymentVoucherPrintView voucher={voucher} settings={settings} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
