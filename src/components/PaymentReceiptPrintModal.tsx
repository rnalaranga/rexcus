import React from "react";
import {
  Printer,
  X,
  Receipt,
  CheckCircle2,
  ExternalLink,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  User,
  ShieldCheck,
  Percent
} from "lucide-react";
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
  customerVat?: string;
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

export const PaymentReceiptPrintModal: React.FC<Props> = ({ receipt, isOpen, onClose, settings }) => {
  if (!isOpen || !receipt) return null;

  const company = receipt.customerCompany || receipt.customerName || "Valued Customer";
  const person =
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
  const advancePercent = totalQuoted > 0 ? ((amount / totalQuoted) * 100).toFixed(1) : null;
  const words = numberToWords(amount);

  const getPrintableHtml = () => {
    const printContent = document.getElementById("receipt-print-section");
    if (!printContent) return "";

    const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((tag) => tag.outerHTML)
      .join("\n");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${receipt.receiptNo}</title>
  ${styleTags}
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm;
    }
    * {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-wrapper {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
    }
    #receipt-print-section {
      width: 100% !important;
      max-width: 190mm !important;
      box-sizing: border-box !important;
      border: 1.5px solid #000000 !important;
      padding: 6mm 8mm !important;
      margin: 0 auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    @media print {
      .no-print { display: none !important; }
      body { width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${printContent.outerHTML}
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const html = getPrintableHtml();
    if (!html) {
      window.print();
      return;
    }

    const win = window.open("", "_blank", "width=920,height=850");
    if (!win) {
      window.print();
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 350);
  };

  const handleOpenNewTab = () => {
    const html = getPrintableHtml();
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 10mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
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
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #receipt-print-section {
            position: static !important;
            width: 190mm !important;
            max-width: 190mm !important;
            min-width: 190mm !important;
            margin: 0 auto !important;
            padding: 6mm 8mm !important;
            box-sizing: border-box !important;
            border: 1.5px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-surface border border-theme-subtle rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in my-auto">
        {/* Modal Top Header (No-Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-theme-subtle bg-surface2/70 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-primary">Payment Receipt Voucher</h2>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {receipt.receiptNo}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 size={12} /> Received & Deposited
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Official advance voucher • Compliant with Sri Lanka Inland Revenue Gazette No. 2481/22
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewTab}
              title="Open standalone printable page in a new tab"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-surface border border-theme-subtle hover:bg-surface2 transition-colors"
            >
              <ExternalLink size={14} /> New Tab
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md hover:shadow-emerald-600/20"
            >
              <Printer size={15} /> Print Receipt (A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 rounded-xl transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Informative Intelligence Strip (No-Print) */}
        <div className="px-6 py-3.5 bg-surface border-b border-theme-subtle no-print">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Metric 1: Advance Amount */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>Advance Received</span>
                {advancePercent && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    {advancePercent}%
                  </span>
                )}
              </div>
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(amount)}
              </div>
              <div className="text-[10px] text-muted truncate mt-0.5">
                Mode: <strong className="text-primary">{receipt.paymentMethod || "Cash"}</strong>
              </div>
            </div>

            {/* Metric 2: Total Consideration */}
            <div className="bg-surface2/60 border border-theme-subtle rounded-xl p-2.5 flex flex-col justify-between">
              <div className="text-[10.5px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                <span>{receipt.orderNo ? "Sales Order Total" : "Quotation Total"}</span>
                {receipt.orderNo ? (
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-500/10 px-1 rounded">
                    {receipt.orderNo}
                  </span>
                ) : receipt.quotationNo ? (
                  <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-1 rounded">
                    {receipt.quotationNo}
                  </span>
                ) : null}
              </div>
              <div className="text-base font-black text-primary mt-1">
                {formatCurrency(totalQuoted)}
              </div>
              <div className="text-[10px] text-muted truncate mt-0.5">
                Customer: <strong className="text-primary">{company}</strong>
              </div>
            </div>

            {/* Metric 3: Remaining Balance */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Balance Due On Delivery
              </div>
              <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(balanceRemaining || 0)}
              </div>
              <div className="text-[10px] text-muted truncate mt-0.5">
                To invoice on final dispatch
              </div>
            </div>

            {/* Metric 4: Deposit Account & Ledger */}
            <div className="bg-surface2/60 border border-theme-subtle rounded-xl p-2.5 flex flex-col justify-between">
              <div className="text-[10.5px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                <span>GL Account & Ledger</span>
                {receipt.journalEntryId && (
                  <span className="text-[9.5px] font-mono font-bold text-purple-600 bg-purple-500/10 px-1 rounded">
                    {receipt.journalEntryId}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-primary truncate mt-1">
                {receipt.depositAccountName || "Bank / Cash Account"}
              </div>
              <div className="text-[10px] text-muted truncate mt-0.5">
                Ref: {receipt.reference || "Direct Deposit"}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/60 dark:bg-zinc-950 flex justify-center">
          <div id="receipt-print-wrapper" className="w-full flex justify-center">
            {/* Exact A4 Document Section */}
            <div
              id="receipt-print-section"
              className="bg-white text-black rounded-lg shadow-xl border-2 border-black w-full max-w-[190mm] p-6 flex flex-col justify-between"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "12px",
                lineHeight: "1.4",
                boxSizing: "border-box"
              }}
            >
              <div>
                {/* 1. Header with Logo & Company Information */}
                <div className="flex border-b-2 border-black pb-4 mb-4 items-center">
                  <div className="w-[30%] flex items-center justify-center pr-4 border-r border-neutral-300">
                    {settings?.company_logo ? (
                      <img
                        src={settings.company_logo}
                        alt="Logo"
                        className="max-h-20 max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl font-black text-red-600 tracking-tighter flex items-center justify-center gap-1">
                          <span className="text-4xl">⚙️</span> REX
                        </div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-700">
                          Industries (Pvt) Ltd
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-[70%] pl-5 text-[11.5px] leading-tight">
                    <h1 className="text-[19px] font-black uppercase text-black tracking-tight mb-1">
                      {settings?.company_name || settings?.companyName || "REX INDUSTRIES (PVT) LTD"}
                    </h1>
                    <table className="w-full text-[11px] leading-normal">
                      <tbody>
                        <tr>
                          <td className="font-bold align-top w-14 pb-0.5 text-neutral-700">Office</td>
                          <td className="pb-0.5 text-black">
                            : {settings?.company_address || settings?.companyAddress || "No.451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka"}
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold pb-0.5 text-neutral-700">Tel.</td>
                          <td className="pb-0.5 text-black">
                            : {settings?.company_phone || settings?.companyPhone || "0094-31-2233117 / 2233315 / 2223136"}
                          </td>
                        </tr>
                        <tr>
                          <td className="font-bold pb-0.5 text-neutral-700">E-mail</td>
                          <td className="pb-0.5 text-black">
                            : {settings?.company_email || settings?.companyEmail || "info@rexgroup.lk"} |{" "}
                            <span className="font-bold">Web:</span> {settings?.company_web || settings?.companyWeb || "www.rexgroup.lk"}
                          </td>
                        </tr>
                        {settings?.vat_number && (
                          <tr>
                            <td className="font-bold pb-0.5 text-neutral-700">VAT Reg</td>
                            <td className="pb-0.5 text-black">: {settings.vat_number}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Official Document Title Bar */}
                <div
                  className="text-white flex items-center justify-between px-4 py-2 mb-3.5 rounded-sm"
                  style={{ backgroundColor: "#111827" }}
                >
                  <div className="font-black text-[13px] uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={16} className="text-emerald-400 no-print" />
                    PAYMENT RECEIPT (ADVANCE VOUCHER)
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-300">
                    ORIGINAL • CUSTOMER COPY
                  </div>
                </div>

                {/* 3. Transaction & Document Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 border border-black p-3 mb-3.5 text-[11.5px] bg-neutral-50/70">
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="w-28 font-bold text-neutral-700">Receipt No:</span>
                      <span className="font-mono font-black text-black">{receipt.receiptNo}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold text-neutral-700">Date Issued:</span>
                      <span className="font-bold text-black">{formatDate(receipt.date)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold text-neutral-700">Payment Mode:</span>
                      <span className="font-bold text-emerald-800 uppercase">
                        {receipt.paymentMethod || "Cash"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold text-neutral-700">Voucher Status:</span>
                      <span className="font-bold text-emerald-700 uppercase">Received & Deposited</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-l border-neutral-300 pl-3.5">
                    {receipt.orderNo && (
                      <div className="flex">
                        <span className="w-32 font-bold text-neutral-700">Sales Order Ref:</span>
                        <span className="font-mono font-bold text-blue-900">{receipt.orderNo}</span>
                      </div>
                    )}
                    {receipt.quotationNo && (
                      <div className="flex">
                        <span className="w-32 font-bold text-neutral-700">Quotation Ref:</span>
                        <span className="font-mono font-bold text-blue-900">{receipt.quotationNo}</span>
                      </div>
                    )}
                    {receipt.reference && (
                      <div className="flex">
                        <span className="w-32 font-bold text-neutral-700">Cheque / Slip Ref:</span>
                        <span className="font-mono text-black font-semibold">{receipt.reference}</span>
                      </div>
                    )}
                    {receipt.depositAccountName && (
                      <div className="flex">
                        <span className="w-32 font-bold text-neutral-700">Deposited Account:</span>
                        <span className="text-black font-medium">{receipt.depositAccountName}</span>
                      </div>
                    )}
                    {receipt.journalEntryId && (
                      <div className="flex">
                        <span className="w-32 font-bold text-neutral-700">GL Journal Ref:</span>
                        <span className="font-mono text-neutral-800">{receipt.journalEntryId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Customer Information Card */}
                <div className="border border-black p-3 mb-3.5 text-[11.5px] leading-relaxed bg-white">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                    Received With Thanks From:
                  </div>
                  <div className="font-black text-[14px] text-black uppercase">{company}</div>
                  {person && (
                    <div className="text-neutral-800 font-bold mt-0.5">
                      Attn: <span className="font-medium text-black">{person}</span>
                    </div>
                  )}
                  {receipt.customerAddress && (
                    <div className="text-neutral-700 text-[11px]">{receipt.customerAddress}</div>
                  )}
                  {receipt.customerPhone && (
                    <div className="text-neutral-700 text-[11px]">Tel: {receipt.customerPhone}</div>
                  )}
                </div>

                {/* 5. Financial Particulars & Allocation Table */}
                <table className="w-full border-collapse border border-black mb-3.5 text-[11.5px]">
                  <thead>
                    <tr
                      className="text-black border-b border-black text-left text-[10.5px] uppercase font-bold"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      <th className="p-2 border-r border-black w-10 text-center">#</th>
                      <th className="p-2 border-r border-black">Particulars & Allocation Description</th>
                      <th className="p-2 text-right w-44">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-300">
                      <td className="p-2 text-center font-bold border-r border-black align-top">01</td>
                      <td className="p-2 border-r border-black">
                        <div className="font-bold text-black text-[12px]">
                          {receipt.notes ||
                            (receipt.orderNo
                              ? "Advance payment against Sales Order " + receipt.orderNo
                              : receipt.quotationNo
                              ? "Advance payment against Quotation " + receipt.quotationNo
                              : "Customer Advance Payment on Account")}
                        </div>
                        <div className="text-[10.5px] text-neutral-600 mt-1 leading-snug">
                          Official acknowledgement of advance payment received prior to manufacturing / dispatch.
                          Credited against final sales invoice consideration.
                        </div>
                      </td>
                      <td className="p-2 text-right font-black text-[13px] align-top text-black">
                        {formatCurrency(amount)}
                      </td>
                    </tr>

                    {totalQuoted > 0 && (
                      <tr className="border-b border-neutral-300 text-[11px]" style={{ backgroundColor: "#fafafa" }}>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 border-r border-black text-neutral-700 font-medium">
                          Total Confirmed Consideration ({receipt.orderNo ? `Sales Order ${receipt.orderNo}` : `Quotation ${receipt.quotationNo || ""}`}):
                        </td>
                        <td className="p-1.5 text-right font-bold text-neutral-800">
                          {formatCurrency(totalQuoted)}
                        </td>
                      </tr>
                    )}

                    {advancePercent && (
                      <tr className="border-b border-neutral-300 text-[11px]" style={{ backgroundColor: "#fafafa" }}>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 border-r border-black text-neutral-700 font-medium">
                          Advance Payment Percentage Paid:
                        </td>
                        <td className="p-1.5 text-right font-bold text-emerald-800">
                          {advancePercent}%
                        </td>
                      </tr>
                    )}

                    {balanceRemaining !== null && (
                      <tr className="border-b border-neutral-300 text-[11px]" style={{ backgroundColor: "#fafafa" }}>
                        <td className="p-1.5 border-r border-black"></td>
                        <td className="p-1.5 border-r border-black text-neutral-700 font-medium">
                          Balance Consideration to be Invoiced on Delivery:
                        </td>
                        <td className="p-1.5 text-right font-bold text-neutral-900">
                          {formatCurrency(balanceRemaining)}
                        </td>
                      </tr>
                    )}

                    <tr
                      className="font-bold border-t-2 border-black"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      <td colSpan={2} className="p-2 text-right border-r border-black uppercase text-[11px] font-black">
                        Total Advance Payment Received:
                      </td>
                      <td className="p-2 text-right font-black text-[15px] text-emerald-900">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 6. Amount in Words Box */}
                <div className="border border-black p-2.5 mb-3 text-[11.5px] bg-neutral-50/50">
                  <span className="font-bold text-neutral-700">Amount in Words: </span>
                  <span className="font-bold text-black italic">{words}</span>
                </div>

                {/* 7. Statutory Sri Lanka Inland Revenue Notice */}
                <div className="border border-neutral-400 bg-neutral-50/70 p-2.5 mb-5 text-[10px] text-neutral-800 leading-normal flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5 no-print" />
                  <div>
                    <span className="font-bold text-black">Statutory Compliance Notice: </span>
                    This voucher confirms customer advance consideration received prior to delivery.
                    Under Sri Lanka Inland Revenue Department statutory framework (Gazette Extraordinary No. 2481/22),
                    the <span className="font-bold text-black">Final Commercial / Tax Invoice</span> will be generated upon delivery/dispatch of goods, with this advance payment credited in full against the total payable value.
                  </div>
                </div>
              </div>

              {/* 8. Official Signature Section */}
              <div className="pt-4 border-t border-neutral-400 grid grid-cols-3 gap-6 text-center text-[10.5px]">
                <div>
                  <div className="border-b border-black pb-8 mb-1"></div>
                  <div className="font-bold text-black">{receipt.receivedBy || "Accounts Dept"}</div>
                  <div className="text-[9.5px] text-neutral-600">Prepared / Received By</div>
                </div>
                <div>
                  <div className="border-b border-black pb-8 mb-1"></div>
                  <div className="font-bold text-black">Authorized Signatory</div>
                  <div className="text-[9.5px] text-neutral-600">Rex Industries (Pvt) Ltd</div>
                </div>
                <div>
                  <div className="border-b border-black pb-8 mb-1"></div>
                  <div className="font-bold text-black">Customer Signature & Stamp</div>
                  <div className="text-[9.5px] text-neutral-600">Date Acknowledged</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
