import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { printElement } from '@/lib/printElement';
import { exportPdf } from '@/lib/exportPdf';
import { formatCurrency, formatDate, numberToWords } from '@/lib/utils';

export interface ChequePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  cheque: {
    chequeNo: string;
    chequeDate: string;
    payeeName: string;
    amount: number;
    currency?: string;
    bankName?: string;
    branchName?: string;
    isAccountPayee?: boolean;
    isCrossed?: boolean;
    description?: string;
    reference?: string;
    voucherNo?: string;
    direction?: string;
  } | null;
  settings?: any;
}

export const ChequePrintModal: React.FC<ChequePrintModalProps> = ({
  isOpen,
  onClose,
  cheque,
  settings
}) => {
  if (!isOpen || !cheque) return null;

  const chequeNum = cheque.chequeNo || 'CHQ-DRAFT';
  const amountVal = Number(cheque.amount || 0);
  const words = numberToWords(amountVal, cheque.currency || 'LKR');

  const handlePrint = () => {
    printElement('cheque-print-voucher-section', `Cheque_${chequeNum}`);
  };

  const handleDownloadPDF = async () => {
    await exportPdf('cheque-print-voucher-section', `Cheque_${chequeNum}.pdf`);
  };

  // Format date digits for standard cheque leaf boxes (DD MM YYYY)
  const d = cheque.chequeDate ? new Date(cheque.chequeDate) : new Date();
  const dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
  const [yyyy, mm, dd] = dateStr.split('-');
  const dateDigits = `${dd || ''}${mm || ''}${yyyy || ''}`.split('');

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/60 dark:bg-black/60 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-4xl bg-surface border border-theme shadow-2xl flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface2 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Official Cheque & Bank Disbursement Voucher
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  Chq #{chequeNum}
                </span>
                {cheque.direction && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase ${
                    cheque.direction === 'IN' || cheque.direction.includes('Inward')
                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                  }`}>
                    {cheque.direction}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                Sri Lankan Standard Cheque Format • CTS (Cheque Truncation System) Specimen & Bank Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadPDF}
              className="text-xs h-8 border-theme"
            >
              Export PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Print Cheque / Slip
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface3 rounded transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-100 dark:bg-neutral-900 flex justify-center">
          <div
            id="cheque-print-voucher-section"
            className="w-full max-w-[760px] bg-white text-black p-6 shadow-md border border-neutral-300 font-sans print:shadow-none print:border-none print:p-0"
            style={{ minHeight: '800px', boxSizing: 'border-box' }}
          >
            {/* 1. CHEQUE LEAF SIMULATOR (CTS - CHEQUE TRUNCATION FORMAT 200mm x 90mm approx) */}
            <div className="relative border-2 border-slate-700 bg-gradient-to-r from-amber-50/50 via-slate-50 to-blue-50/50 p-4 rounded-none mb-6 shadow-xs overflow-hidden">
              {/* Crossed & A/C Payee Lines */}
              <div className="absolute top-2 left-6 z-10 select-none">
                <div className="w-28 border-t-2 border-black rotate-[-35deg] translate-y-3" />
                <div className="w-28 border-t-2 border-black rotate-[-35deg] translate-y-7" />
                <span className="absolute top-3 left-4 text-[9px] font-black uppercase tracking-wider bg-white/90 px-1 rotate-[-35deg]">
                  A/C PAYEE ONLY
                </span>
              </div>

              {/* Cheque Header: Bank Name & Date */}
              <div className="flex justify-between items-start mb-3">
                <div className="pl-24">
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    {cheque.bankName || 'COMMERCIAL BANK OF CEYLON PLC'}
                  </h4>
                  <p className="text-[10px] text-slate-700 font-mono">
                    {cheque.branchName || 'CITY OFFICE / CORPORATE BRANCH'}
                  </p>
                </div>

                {/* Date Boxes */}
                <div className="text-right">
                  <div className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-0.5">DATE</div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold justify-end">
                    {dateDigits.length === 8 ? (
                      dateDigits.map((char, i) => (
                        <span key={i} className="w-5 h-6 border border-slate-800 flex items-center justify-center bg-white">
                          {char}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 border border-slate-800 bg-white font-mono">
                        {cheque.chequeDate ? formatDate(cheque.chequeDate) : 'DD / MM / YYYY'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payee Line */}
              <div className="mt-4 flex items-baseline gap-2 border-b border-dotted border-slate-600 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 shrink-0">
                  PAY :
                </span>
                <span className="font-bold text-sm text-slate-950 font-serif tracking-wide flex-1">
                  {cheque.payeeName}
                </span>
                <span className="text-[10px] text-slate-600 shrink-0 uppercase font-semibold">
                  OR BEARER
                </span>
              </div>

              {/* Rupees in Words & Box Amount */}
              <div className="mt-3 flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2 border-b border-dotted border-slate-600 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 shrink-0">
                      RUPEES :
                    </span>
                    <span className="font-semibold text-xs text-slate-950 font-serif italic flex-1 capitalize">
                      {words}
                    </span>
                  </div>
                </div>

                {/* Amount in Box */}
                <div className="w-48 shrink-0">
                  <div className="border-2 border-slate-900 bg-white px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">LKR</span>
                    <span className="font-mono text-base font-black tracking-tight text-slate-950">
                      ** {formatCurrency(amountVal, false)} **
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Bottom MICR Stripe */}
              <div className="mt-8 flex items-end justify-between pt-2">
                <div className="text-[9px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-800">{settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}</p>
                  <p>Cheque Ref: #{chequeNum}</p>
                </div>

                <div className="text-center w-56">
                  <div className="border-b border-slate-800 mb-1" />
                  <span className="text-[9px] uppercase font-bold text-slate-700 tracking-wider">
                    AUTHORIZED SIGNATORY
                  </span>
                </div>
              </div>

              {/* Cheque MICR Code Band at Bottom */}
              <div className="mt-4 pt-2 border-t border-slate-300 font-mono text-xs tracking-[0.25em] text-slate-800 flex justify-center items-center select-all">
                ⑈{chequeNum}⑈ 070001⑆ 0012345678⑈ 21
              </div>
            </div>

            {/* 2. ATTACHED BANK SETTLEMENT & REALIZATION VOUCHER */}
            <div className="border border-slate-400 p-4 bg-slate-50">
              <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                    CHEQUE DISBURSEMENT & GL REALIZATION VOUCHER
                  </h4>
                  <p className="text-[10px] text-slate-600">
                    Rex ERP Integrated General Ledger Posting Instrument
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-slate-300">
                    REF: {cheque.reference || cheque.voucherNo || chequeNum}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Instrument #</span>
                  <strong className="font-mono text-slate-900">{chequeNum}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Instrument Date</span>
                  <strong className="text-slate-900">{cheque.chequeDate ? formatDate(cheque.chequeDate) : '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Direction</span>
                  <strong className="text-slate-900 uppercase">{cheque.direction || 'Outward Cheque'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Amount</span>
                  <strong className="font-mono text-emerald-700 font-black">{formatCurrency(amountVal)}</strong>
                </div>
              </div>

              <div className="text-xs border-t border-slate-200 pt-2 space-y-1">
                <div className="flex">
                  <span className="text-slate-500 w-28 shrink-0 font-semibold">Party / Drawer:</span>
                  <span className="font-bold text-slate-900">{cheque.payeeName}</span>
                </div>
                <div className="flex">
                  <span className="text-slate-500 w-28 shrink-0 font-semibold">Bank / Branch:</span>
                  <span className="text-slate-800">{cheque.bankName || 'Commercial Bank'} {cheque.branchName ? `(${cheque.branchName})` : ''}</span>
                </div>
                {cheque.description && (
                  <div className="flex">
                    <span className="text-slate-500 w-28 shrink-0 font-semibold">Purpose:</span>
                    <span className="text-slate-700">{cheque.description}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="text-slate-500 w-28 shrink-0 font-semibold">Amount in Words:</span>
                  <span className="text-slate-800 italic">{words}</span>
                </div>
              </div>

              {/* Sign-off Boxes */}
              <div className="grid grid-cols-3 gap-4 pt-8 mt-4 border-t border-slate-300 text-center text-[10px]">
                <div>
                  <div className="border-b border-slate-400 mb-1" />
                  <span className="text-slate-600 uppercase font-semibold">Prepared By</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1" />
                  <span className="text-slate-600 uppercase font-semibold">Checked / Verified</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 mb-1" />
                  <span className="text-slate-600 uppercase font-semibold">Authorized / Received By</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
