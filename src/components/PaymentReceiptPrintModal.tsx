import React, { useRef } from "react";
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Hash
} from "lucide-react";
import { formatCurrency, formatDate, numberToWords } from "@/lib/utils";
// @ts-ignore
import html2pdf from "html2pdf.js";

export interface PaymentReceiptData {
  id?: string;
  receiptNo: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerCompany?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerVat?: string;
  attention?: string;
  quotationId?: string;
  quotationNo?: string;
  orderId?: string;
  orderNo?: string;
  invoiceId?: string;
  invoiceNo?: string;
  amount: number;
  paymentMethod: string;
  depositAccountId?: string;
  depositAccountName?: string;
  reference?: string;
  notes?: string;
  receivedBy?: string;
  totalQuoted?: number;
  totalQuotedAmount?: number;
  balanceDue?: number;
  journalEntryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  receipt: PaymentReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const PaymentReceiptPrintModal: React.FC<Props> = ({
  receipt,
  isOpen,
  onClose,
  settings
}) => {
  const printSectionRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const customerName = receipt.customerCompany || receipt.customerName || "Customer";
  const attentionPerson =
    receipt.attention ||
    (receipt.customerName && receipt.customerCompany && receipt.customerName !== receipt.customerCompany
      ? receipt.customerName
      : "");
  const amount = Number(receipt.amount) || 0;
  const totalQuoted = Number(receipt.totalQuoted || (receipt as any).totalQuotedAmount) || 0;
  const balanceRemaining =
    receipt.balanceDue !== undefined && receipt.balanceDue !== null
      ? Number(receipt.balanceDue)
      : totalQuoted > 0
      ? Math.max(0, totalQuoted - amount)
      : null;
  const words = numberToWords(amount);

  const companyName = settings?.company_name || settings?.companyName || "REX INDUSTRIES (PVT) LTD";
  const companyAddress = settings?.company_address || settings?.companyAddress || "No. 451/2, Chilaw Road, Kattuwa, Negombo, Sri Lanka";
  const companyPhone = settings?.company_phone || settings?.companyPhone || "+94 31 223 3117 / +94 31 223 3315";
  const companyEmail = settings?.company_email || settings?.companyEmail || "info@rexgroup.lk";
  const companyWeb = settings?.company_web || settings?.companyWeb || "www.rexgroup.lk";
  const companyVat = settings?.vat_number || settings?.company_vat || settings?.tin || "102837490-7000";

  // PDF Export
  const handleExportPDF = () => {
    const el = document.getElementById("receipt-print-section");
    if (!el) return;
    const opt: any = {
      margin: 0,
      filename: `Payment_Receipt_${receipt.receiptNo}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opt).from(el).save();
  };

  // Browser Print
  const handlePrint = () => {
    const el = document.getElementById("receipt-print-section");
    if (!el) {
      window.print();
      return;
    }

    const win = window.open("", "_blank", "width=850,height=900");
    if (!win) {
      window.print();
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${receipt.receiptNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0mm;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    .print-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 12mm 15mm;
      margin: 0 auto;
      box-sizing: border-box;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
    }
    table { border-collapse: collapse; width: 100%; }
    th, td { box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="print-page">
    ${el.innerHTML}
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 350);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-print-wrapper,
          #receipt-print-wrapper * {
            visibility: visible !important;
          }
          #receipt-print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          #receipt-print-section {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Dialog Window */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-lg max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in my-auto">
        {/* Top Control Bar (Clean, Minimal, Monochrome Dark) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80 shrink-0 text-white no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
              <Hash size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white">Payment Receipt Voucher</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {receipt.receiptNo}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  • {formatDate(receipt.date)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                A4 Document View • Rex Industries Commercial & Accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Download clean single-page PDF"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 transition-colors shadow"
              title="Print to A4 Paper"
            >
              <Printer size={14} /> Print (A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Workspace Canvas (Neutral Studio Backdrop to View Actual A4 Sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-start">
          <div id="receipt-print-wrapper" className="flex justify-center w-full">
            {/* EXACT A4 SHEET: 210mm x 297mm */}
            <div
              id="receipt-print-section"
              ref={printSectionRef}
              className="bg-white text-slate-900 shadow-2xl box-border flex flex-col justify-between"
              style={{
                width: "210mm",
                minHeight: "297mm",
                maxHeight: "297mm",
                padding: "14mm 16mm",
                fontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: "11px",
                lineHeight: "1.35",
                boxSizing: "border-box",
                color: "#0f172a",
                backgroundColor: "#ffffff"
              }}
            >
              {/* UPPER HALF: Header, Meta, Customer & Particulars */}
              <div className="space-y-4">
                {/* 1. Corporate Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
                  <div className="flex items-center gap-4">
                    {settings?.company_logo ? (
                      <img
                        src={settings.company_logo}
                        alt="Logo"
                        className="max-h-16 max-w-[120px] object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-900 text-white font-black text-xl flex items-center justify-center tracking-tighter">
                        REX
                      </div>
                    )}
                    <div>
                      <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        {companyName}
                      </h1>
                      <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                        {companyAddress}
                      </p>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Tel: {companyPhone} | Email: {companyEmail}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-800 mt-0.5">
                        VAT / TIN: {companyVat} | Web: {companyWeb}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-block border-2 border-slate-800 bg-slate-900 text-white px-3 py-1 font-black text-xs uppercase tracking-wider">
                      RECEIPT VOUCHER
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Official Receipt • Original
                    </div>
                  </div>
                </div>

                {/* 2. Voucher & Customer Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 bg-slate-50/50 rounded-sm">
                  {/* Left Column: Customer Details */}
                  <div className="space-y-1">
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
                      Received With Thanks From:
                    </div>
                    <div className="font-bold text-sm text-slate-900 uppercase leading-snug">
                      {customerName}
                    </div>
                    {attentionPerson && (
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-500 font-normal">Attn:</span>{" "}
                        <span className="font-semibold">{attentionPerson}</span>
                      </div>
                    )}
                    {receipt.customerAddress && (
                      <div className="text-[10px] text-slate-600 leading-tight">
                        {receipt.customerAddress}
                      </div>
                    )}
                    {receipt.customerPhone && (
                      <div className="text-[10px] text-slate-600">
                        Tel: {receipt.customerPhone}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Voucher Reference Details */}
                  <div className="space-y-1 text-xs border-l border-slate-200 pl-4">
                    <div className="flex justify-between py-0.5 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Receipt No:</span>
                      <span className="font-mono font-bold text-slate-900">{receipt.receiptNo}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-200/80">
                      <span className="text-slate-500 font-medium">Date:</span>
                      <span className="font-semibold text-slate-900">{formatDate(receipt.date)}</span>
                    </div>
                    {receipt.invoiceNo && (
                      <div className="flex justify-between py-0.5 border-b border-slate-200/80">
                        <span className="text-slate-500 font-medium">Final Invoice Ref:</span>
                        <span className="font-mono font-bold text-slate-900">{receipt.invoiceNo}</span>
                      </div>
                    )}
                    {receipt.orderNo && (
                      <div className="flex justify-between py-0.5 border-b border-slate-200/80">
                        <span className="text-slate-500 font-medium">Sales Order Ref:</span>
                        <span className="font-mono font-semibold text-slate-900">{receipt.orderNo}</span>
                      </div>
                    )}
                    {receipt.quotationNo && (
                      <div className="flex justify-between py-0.5 border-b border-slate-200/80">
                        <span className="text-slate-500 font-medium">Quotation Ref:</span>
                        <span className="font-mono font-semibold text-slate-900">{receipt.quotationNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500 font-medium">Payment Mode:</span>
                      <span className="font-bold text-slate-900 uppercase">{receipt.paymentMethod || "Cash"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Financial Particulars & Summary Table */}
                <table className="w-full border-collapse border border-slate-800 text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10.5px] uppercase">
                      <th className="p-2 border-r border-slate-700 w-12 text-center">#</th>
                      <th className="p-2 border-r border-slate-700 text-left">Description / Particulars</th>
                      <th className="p-2 text-right w-48">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-2.5 text-center font-bold border-r border-slate-300 align-top">01</td>
                      <td className="p-2.5 border-r border-slate-300 align-top">
                        <div className="font-bold text-slate-900 text-xs">
                          {receipt.notes ||
                            (receipt.invoiceNo
                              ? `Payment received against Commercial / Tax Invoice ${receipt.invoiceNo}`
                              : receipt.orderNo
                              ? `Advance consideration received against Sales Order ${receipt.orderNo}`
                              : receipt.quotationNo
                              ? `Advance consideration received against Quotation ${receipt.quotationNo}`
                              : "Payment received on account")}
                        </div>
                        <div className="text-[10.5px] text-slate-600 mt-1 leading-normal">
                          {receipt.invoiceNo
                            ? "Official payment acknowledgement for settlement of commercial tax invoice."
                            : "Official acknowledgement of advance consideration deposited prior to manufacturing / dispatch. Credited in full against final tax invoice."}
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-black text-sm align-top text-slate-900">
                        {formatCurrency(amount)}
                      </td>
                    </tr>

                    {/* Breakdown Rows if quotation/order total exists */}
                    {totalQuoted > 0 && (
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px]">
                        <td className="p-1.5 border-r border-slate-300"></td>
                        <td className="p-1.5 border-r border-slate-300 text-slate-600 font-medium">
                          Total Confirmed Order / Quotation Consideration:
                        </td>
                        <td className="p-1.5 text-right font-semibold text-slate-800 font-mono">
                          {formatCurrency(totalQuoted)}
                        </td>
                      </tr>
                    )}

                    {balanceRemaining !== null && balanceRemaining > 0 && (
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px]">
                        <td className="p-1.5 border-r border-slate-300"></td>
                        <td className="p-1.5 border-r border-slate-300 text-slate-600 font-medium">
                          Balance Due to be Invoiced on Delivery:
                        </td>
                        <td className="p-1.5 text-right font-semibold text-slate-800 font-mono">
                          {formatCurrency(balanceRemaining)}
                        </td>
                      </tr>
                    )}

                    {/* Total Amount Received Row */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
                      <td colSpan={2} className="p-2.5 text-right border-r border-slate-300 uppercase tracking-wider font-black text-slate-900">
                        Total Amount Received:
                      </td>
                      <td className="p-2.5 text-right font-black text-base text-slate-950 font-mono">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 4. Amount in Words Callout */}
                <div className="border border-slate-300 bg-slate-50/80 p-2.5 rounded-sm">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                    Amount in Words:
                  </div>
                  <div className="text-xs font-bold text-slate-900 italic capitalize leading-snug">
                    {words} Rupees Only.
                  </div>
                </div>

                {/* 5. Settlement & Audit Trail (Deposited Account & Reference) */}
                <div className="grid grid-cols-3 gap-2 border border-slate-300 p-2.5 text-[10.5px] bg-white rounded-sm">
                  <div>
                    <span className="text-slate-500 font-medium block text-[9.5px]">Payment Method:</span>
                    <span className="font-bold text-slate-900 uppercase">{receipt.paymentMethod || "Cash"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block text-[9.5px]">Reference / Slip No:</span>
                    <span className="font-mono font-semibold text-slate-900">{receipt.reference || "Direct / Bank"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block text-[9.5px]">Deposited Account:</span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {receipt.depositAccountName || "Bank & Cash Account"}
                    </span>
                  </div>
                </div>
              </div>

              {/* LOWER HALF: Statutory Notice & Signatures */}
              <div className="space-y-4 pt-4">
                {/* 6. Statutory Sri Lanka Inland Revenue Notice */}
                <div className="border border-slate-300 bg-slate-50 p-2 text-[9.5px] text-slate-600 leading-snug rounded-sm flex items-start gap-2">
                  <ShieldCheck size={14} className="text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Statutory Notice: </strong>
                    This official voucher acknowledges receipt of customer advance consideration. In accordance with the Sri Lanka Inland Revenue Department regulatory framework (Gazette Extraordinary No. 2481/22), the final Tax Invoice will be issued upon delivery/dispatch of goods, crediting this advance payment against the total payable value.
                  </div>
                </div>

                {/* 7. Official Three-Signature Block */}
                <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-center text-[10px]">
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <div className="font-bold text-slate-900">{receipt.receivedBy || "Accounts Officer"}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Prepared / Received By</div>
                  </div>

                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <div className="font-bold text-slate-900">Finance Manager</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Rex Industries (Pvt) Ltd</div>
                  </div>

                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <div className="font-bold text-slate-900">Customer Acknowledgment</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Signature & Company Seal</div>
                  </div>
                </div>

                {/* Footer copyright and generator timestamp */}
                <div className="flex items-center justify-between text-[8.5px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Rex Industries ERP • System Generated Official Document</span>
                  <span>Doc Ref: {receipt.receiptNo} • {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ,
    document.body
  );
};
