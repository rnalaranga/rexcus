import React from "react";
import { Printer, X, Receipt, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, numberToWords } from "@/lib/utils";

export interface PaymentReceiptData {
  id?: string;
  receiptNo: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerCompany?: string;
  customerAddress?: string;
  customerPhone?: string;
  attention?: string;
  quotationId?: string;
  quotationNo?: string;
  orderId?: string;
  orderNo?: string;
  amount: number;
  paymentMethod: string;
  depositAccountId?: string;
  depositAccountName?: string;
  reference?: string;
  notes?: string;
  receivedBy?: string;
  totalQuoted?: number;
  createdAt?: string;
}

interface Props {
  receipt: PaymentReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const PaymentReceiptPrintModal: React.FC<Props> = ({ receipt, isOpen, onClose, settings }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const company = receipt.customerCompany || receipt.customerName || "Valued Customer";
  const person = receipt.attention || (receipt.customerName && receipt.customerCompany && receipt.customerName !== receipt.customerCompany ? receipt.customerName : "");
  const amount = Number(receipt.amount) || 0;
  const totalQuoted = Number(receipt.totalQuoted || (receipt as any).totalQuotedAmount) || 0;
  const balanceRemaining = totalQuoted > 0 ? Math.max(0, totalQuoted - amount) : null;
  const words = numberToWords(amount);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <style>{[
        "@media print {",
        "  body * { visibility: hidden !important; }",
        "  #receipt-print-section, #receipt-print-section * { visibility: visible !important; }",
        "  #receipt-print-section {",
        "    position: absolute !important;",
        "    left: 0 !important;",
        "    top: 0 !important;",
        "    width: 210mm !important;",
        "    margin: 0 !important;",
        "    padding: 10mm !important;",
        "    background: #ffffff !important;",
        "    color: #000000 !important;",
        "    box-shadow: none !important;",
        "    border: none !important;",
        "  }",
        "  .no-print { display: none !important; }",
        "}"
      ].join("\n")}</style>

      <div className="bg-surface border border-theme-subtle rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-theme-subtle bg-surface2/60 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-primary flex items-center gap-2">
                Official Advance Payment Receipt
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {receipt.receiptNo}
                </span>
              </h2>
              <p className="text-[11px] text-muted">Acknowledge customer advance payment before issuing final tax invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <Printer size={14} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50 dark:bg-zinc-900/60 flex justify-center">
          <div
            id="receipt-print-section"
            className="bg-white text-black rounded shadow-lg border border-neutral-300 w-full max-w-[210mm] p-8 flex flex-col justify-between"
            style={{ minHeight: "148mm", fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            <div>
              <div className="flex border-b-2 border-black pb-4 mb-4">
                <div className="w-[30%] flex items-center justify-center pr-4 border-r border-neutral-300">
                  {settings?.company_logo ? (
                    <img src={settings.company_logo} alt="Logo" className="max-h-20 max-w-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-black text-red-600 tracking-tighter flex items-center justify-center gap-1">
                        <span className="text-3xl">⚙️</span> REX
                      </div>
                      <div className="text-[9px] uppercase tracking-widest font-bold text-neutral-600">Industries</div>
                    </div>
                  )}
                </div>
                <div className="w-[70%] pl-6 text-[12px] leading-tight">
                  <h1 className="text-[18px] font-black uppercase text-black tracking-tight mb-1">
                    REX INDUSTRIES (PVT) LTD
                  </h1>
                  <table className="w-full text-[11px]">
                    <tbody>
                      <tr>
                        <td className="font-bold align-top w-14 pb-0.5 text-neutral-700">Office</td>
                        <td className="pb-0.5">: No.451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka</td>
                      </tr>
                      <tr>
                        <td className="font-bold pb-0.5 text-neutral-700">Tel.</td>
                        <td className="pb-0.5">: 0094-31-2233117 / 2233315 / 2223136</td>
                      </tr>
                      <tr>
                        <td className="font-bold pb-0.5 text-neutral-700">E-mail</td>
                        <td className="pb-0.5">: info@rexgroup.lk | <span className="font-bold">Web:</span> www.rexgroup.lk</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-neutral-900 text-white flex items-center justify-between px-4 py-2 mb-4">
                <div className="font-black text-[14px] uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-400 no-print" />
                  PAYMENT RECEIPT (ADVANCE VOUCHER)
                </div>
                <div className="text-[12px] font-mono font-bold text-emerald-300">
                  ORIGINAL
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-black p-3.5 mb-4 text-[12px] bg-neutral-50/50">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 font-bold text-neutral-700">Receipt No:</span>
                    <span className="font-mono font-black text-black">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-neutral-700">Date Issued:</span>
                    <span className="font-medium text-black">{formatDate(receipt.date)}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-neutral-700">Payment Mode:</span>
                    <span className="font-bold text-emerald-800 uppercase">{receipt.paymentMethod || "Cash"}</span>
                  </div>
                </div>

                <div className="space-y-1 border-l border-neutral-300 pl-4">
                  {receipt.quotationNo && (
                    <div className="flex">
                      <span className="w-32 font-bold text-neutral-700">Quotation Ref:</span>
                      <span className="font-mono font-bold text-blue-900">{receipt.quotationNo}</span>
                    </div>
                  )}
                  {receipt.orderNo && (
                    <div className="flex">
                      <span className="w-32 font-bold text-neutral-700">Sales Order Ref:</span>
                      <span className="font-mono font-bold text-blue-900">{receipt.orderNo}</span>
                    </div>
                  )}
                  {receipt.reference && (
                    <div className="flex">
                      <span className="w-32 font-bold text-neutral-700">Cheque / Txn Ref:</span>
                      <span className="font-mono text-black">{receipt.reference}</span>
                    </div>
                  )}
                  {receipt.depositAccountName && (
                    <div className="flex">
                      <span className="w-32 font-bold text-neutral-700">Deposited To:</span>
                      <span className="text-neutral-900">{receipt.depositAccountName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-black p-3.5 mb-4 text-[12px] leading-relaxed">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Received With Thanks From:
                </div>
                <div className="font-black text-[14px] text-black uppercase">{company}</div>
                {person && <div className="text-neutral-700 font-semibold">Attn: {person}</div>}
                {receipt.customerAddress && <div className="text-neutral-600">{receipt.customerAddress}</div>}
                {receipt.customerPhone && <div className="text-neutral-600">Tel: {receipt.customerPhone}</div>}
              </div>

              <table className="w-full border-collapse border border-black mb-4 text-[12px]">
                <thead>
                  <tr className="bg-neutral-100 text-black border-b border-black text-left text-[11px] uppercase">
                    <th className="p-2 border-r border-black w-12 text-center">#</th>
                    <th className="p-2 border-r border-black">Particulars / Payment Description</th>
                    <th className="p-2 text-right w-44">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-300">
                    <td className="p-2.5 text-center font-bold border-r border-black align-top">01</td>
                    <td className="p-2.5 border-r border-black">
                      <div className="font-bold text-black">
                        {receipt.notes || (receipt.orderNo ? ("Advance payment against Sales Order " + receipt.orderNo) : receipt.quotationNo ? ("Advance payment against Quotation " + receipt.quotationNo) : "Payment on Account")}
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-1">
                        Official advance acknowledgement towards confirmed quotation/production order.
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-black text-[14px] align-top text-black">
                      {formatCurrency(amount)}
                    </td>
                  </tr>

                  {totalQuoted > 0 && (
                    <tr className="bg-neutral-50 border-b border-neutral-300 text-[11px]">
                      <td className="p-1.5 border-r border-black"></td>
                      <td className="p-1.5 border-r border-black text-neutral-600 italic">
                        Total Confirmed Quotation Value:
                      </td>
                      <td className="p-1.5 text-right font-medium text-neutral-700">
                        {formatCurrency(totalQuoted)}
                      </td>
                    </tr>
                  )}

                  {balanceRemaining !== null && (
                    <tr className="bg-neutral-50 border-b border-neutral-300 text-[11px]">
                      <td className="p-1.5 border-r border-black"></td>
                      <td className="p-1.5 border-r border-black text-neutral-600 italic">
                        Balance to be Invoiced on Completion:
                      </td>
                      <td className="p-1.5 text-right font-bold text-neutral-800">
                        {formatCurrency(balanceRemaining)}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-neutral-100 font-bold border-t-2 border-black">
                    <td colSpan={2} className="p-2.5 text-right border-r border-black uppercase text-[11px]">
                      Total Advance Received:
                    </td>
                    <td className="p-2.5 text-right font-black text-[15px] text-emerald-800">
                      {formatCurrency(amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black p-3 mb-4 text-[12px] bg-neutral-50/40">
                <span className="font-bold text-neutral-700">Amount in Words: </span>
                <span className="font-bold text-black italic">{words}</span>
              </div>

              <div className="border border-neutral-400 bg-neutral-50/70 p-2.5 mb-6 text-[10.5px] text-neutral-700 leading-normal flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5 no-print" />
                <div>
                  <span className="font-bold text-black">Notice: </span>
                  This document serves as an official confirmation and receipt of advance payment received.
                  In compliance with Sri Lankan Inland Revenue statutory requirements (Gazette Extraordinary No. 2481/22),
                  the <span className="font-bold text-black">Final Tax / Commercial Invoice</span> will be generated and issued upon delivery / dispatch of goods with this advance payment credited in full.
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-300 grid grid-cols-3 gap-8 text-center text-[11px]">
              <div>
                <div className="border-b border-black pb-10 mb-1"></div>
                <div className="font-bold text-black">{receipt.receivedBy || "Accounts Dept"}</div>
                <div className="text-[10px] text-neutral-500">Prepared / Received By</div>
              </div>
              <div>
                <div className="border-b border-black pb-10 mb-1"></div>
                <div className="font-bold text-black">Authorized Signatory</div>
                <div className="text-[10px] text-neutral-500">Rex Industries (Pvt) Ltd</div>
              </div>
              <div>
                <div className="border-b border-black pb-10 mb-1"></div>
                <div className="font-bold text-black">Customer Signature & Stamp</div>
                <div className="text-[10px] text-neutral-500">Date Received</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
