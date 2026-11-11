import React from 'react';
import { formatDate, formatCurrency, resolveFileUrl, numberToWords } from '@/lib/utils';

export interface PaymentVoucherPrintViewProps {
  voucher: any;
  settings?: any;
}

export const PaymentVoucherPrintView: React.FC<PaymentVoucherPrintViewProps> = ({ voucher, settings }) => {
  if (!voucher) return null;

  const voucherNo = voucher.voucherNo || voucher.id || voucher.referenceNo || 'PV-DRAFT';
  const voucherDate = voucher.date || voucher.createdAt || new Date().toISOString();
  const payee = voucher.payeeName || voucher.supplierName || voucher.vendorName || voucher.customerName || 'Payee';
  const amount = Number(voucher.amount || voucher.credit || voucher.debit || 0);
  const paymentMethod = voucher.paymentMethod || 'Bank Transfer';
  const category = voucher.category || voucher.billCategory || 'Supplier Bill Payment';
  const description = voucher.description || voucher.notes || 'Payment disbursement against approved invoices/expenses';
  const chequeNo = voucher.chequeNo || '';
  const chequeDate = voucher.chequeDate || '';
  const bankName = voucher.bankName || '';
  const transactionRef = voucher.transactionRef || voucher.reference || '';
  const relatedBill = voucher.relatedBillNo || voucher.relatedBillId || voucher.invoiceNo || '';

  const logoUrl = resolveFileUrl(settings?.company_logo || settings?.logo || settings?.companyLogo || '') || '/rex-logo.png';

  return (
    <>
      <style>{`
        #payment-voucher-print-section {
          width: 100% !important;
          max-width: 794px !important;
          margin: 0 auto !important;
          font-family: Arial, Helvetica, sans-serif !important;
          color: #000000 !important;
          background: #ffffff !important;
          border: 1px solid #000000 !important;
          box-sizing: border-box !important;
          font-size: 10.5px !important;
          line-height: 1.3 !important;
        }
        #payment-voucher-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #payment-voucher-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #payment-voucher-print-section .border-b { border-bottom: 1px solid #000000 !important; }
        #payment-voucher-print-section .border-r { border-right: 1px solid #000000 !important; }
        #payment-voucher-print-section .border-t { border-top: 1px solid #000000 !important; }
        #payment-voucher-print-section .flex { display: flex !important; }
        #payment-voucher-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        #payment-voucher-print-section .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          [class*="fixed"], [class*="backdrop"], [role="dialog"], .fixed {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          #voucher-print-wrapper, #voucher-print-wrapper * { visibility: visible !important; }
          #voucher-print-wrapper {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #payment-voucher-print-section {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div id="voucher-print-wrapper" className="w-full flex flex-col justify-start">
        <div 
          id="payment-voucher-print-section" 
          className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm print:shadow-none" 
          style={{ width: '100%', maxWidth: '794px', minHeight: 'auto', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', boxSizing: 'border-box' }}
        >
          {/* Header Row (Compact Standard Rex Letterhead) */}
          <div className="flex border-b border-black items-center p-2.5 print-no-break">
            <div className="w-[28%] flex items-center justify-center p-1.5 border-r border-black bg-white">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="max-h-12 max-w-full object-contain" 
                crossOrigin="anonymous" 
              />
            </div>
            <div className="w-[72%] pl-3 text-[10px] leading-tight bg-white">
              <h1 className="text-[16px] font-black uppercase text-black mb-0.5 leading-tight" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
                {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
              </h1>
              <table className="w-full text-[10px] leading-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <tbody>
                  <tr>
                    <td className="font-bold align-top w-12 pb-0.5 whitespace-nowrap">Office</td>
                    <td className="pb-0.5 align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-line">{settings?.company_address || settings?.companyAddress || 'No.451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top w-12 pb-0.5 whitespace-nowrap">Tel.</td>
                    <td className="pb-0.5 align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top w-12 pb-0.5 whitespace-nowrap">E-mail</td>
                    <td className="pb-0.5 align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top w-12 whitespace-nowrap">TIN</td>
                    <td className="align-top font-bold">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 font-mono">{settings?.company_tin || settings?.company_vat || settings?.tax_id || settings?.tin || '114106470-7000'}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Title Bar */}
          <div className="bg-gray-50 border-b border-black text-center py-1 font-bold text-[12px] uppercase tracking-wider print-no-break">
            {paymentMethod === 'Cheque' ? 'CHEQUE PAYMENT VOUCHER' : 'OFFICIAL PAYMENT VOUCHER'}
          </div>

          {/* Details Section: 2 Columns */}
          <div className="flex border-b border-black text-[10.5px] print-no-break">
            {/* Left Side: Payee & Category */}
            <div className="w-[52%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <span className="font-bold italic text-[9.5px] text-gray-700 mb-0.5 block uppercase">Paid To (Payee / Beneficiary):</span>
                <div className="font-bold text-[12px] text-black uppercase leading-tight">{payee}</div>
                {voucher.payeeType && (
                  <div className="text-[10px] text-gray-700 capitalize mt-0.5">
                    Category: <span className="font-semibold">{category}</span> ({voucher.payeeType})
                  </div>
                )}
                {relatedBill && (
                  <div className="text-[10px] text-gray-800 mt-1 font-mono">
                    <span className="font-bold">Linked Bill / Reference:</span> #{relatedBill}
                  </div>
                )}
              </div>
              <div className="mt-1.5 pt-1 border-t border-black/20 text-[10px]">
                <span className="font-bold text-gray-700 uppercase">Payment Mode:</span>{' '}
                <span className="font-bold text-black">{paymentMethod}</span>
              </div>
            </div>

            {/* Right Side: Voucher Metadata Table */}
            <div className="w-[48%] p-0">
              <table className="w-full h-full text-[10.5px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>VOUCHER NO</td>
                    <td className="p-1 px-2 font-bold font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 text-neutral-900">{voucherNo}</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>DATE</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{formatDate(voucherDate)}</span>
                      </div>
                    </td>
                  </tr>
                  {chequeNo ? (
                    <>
                      <tr className="border-b border-black">
                        <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>CHEQUE NO</td>
                        <td className="p-1 px-2 font-mono font-bold">
                          <div className="flex items-center">
                            <span className="font-bold mr-1 shrink-0">:</span>
                            <span className="flex-1">{chequeNo}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>CHEQUE DATE / BANK</td>
                        <td className="p-1 px-2 font-mono text-[10px]">
                          <div className="flex items-center">
                            <span className="font-bold mr-1 shrink-0">:</span>
                            <span className="flex-1">{chequeDate ? formatDate(chequeDate) : '-'} ({bankName || 'Bank'})</span>
                          </div>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>TXN / BANK REF</td>
                      <td className="p-1 px-2 font-mono text-[10px]">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{transactionRef || 'Direct Transfer / Cash'}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Description & Particulars */}
          <div className="p-2.5 border-b border-black text-[10.5px]">
            <span className="font-bold italic text-[9.5px] text-gray-700 block uppercase mb-1">Account Particulars & Narration:</span>
            <div className="text-gray-900 bg-gray-50/50 p-2 border border-black/20 rounded-none whitespace-pre-wrap leading-snug">
              {description}
            </div>
          </div>

          {/* Amount In Words & Numeric Total Box */}
          <div className="flex border-b border-black bg-white print-no-break items-stretch">
            <div className="w-[68%] p-2.5 border-r border-black flex flex-col justify-center">
              <span className="font-bold italic text-[9.5px] text-gray-700 block uppercase">Amount in Words:</span>
              <span className="text-[11px] font-bold text-gray-900 italic mt-0.5 leading-snug">
                {numberToWords(amount, 'LKR')}
              </span>
            </div>
            <div className="w-[32%] p-2.5 bg-gray-50/60 flex flex-col justify-center text-right">
              <span className="font-bold uppercase text-[9.5px] text-gray-700 block">Total Amount (LKR)</span>
              <span className="text-[17px] font-black font-mono text-black leading-tight mt-0.5">
                {formatCurrency(amount, true)}
              </span>
            </div>
          </div>

          {/* 4-Box Signatures Block: Prepared, Checked, Approved, Receiver */}
          <div className="grid grid-cols-4 divide-x divide-black text-[10px] bg-white print-no-break">
            {/* 1. Prepared By */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '85px' }}>
              <div className="font-bold uppercase text-black text-[9px]">1. Prepared By</div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="text-[8.5px] text-gray-700 font-semibold text-center">Accounts Officer</div>
              </div>
            </div>

            {/* 2. Checked By */}
            <div className="p-2 flex flex-col justify-between bg-gray-50/30" style={{ minHeight: '85px' }}>
              <div className="font-bold uppercase text-black text-[9px]">2. Checked By</div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="text-[8.5px] text-gray-700 font-semibold text-center">Accountant / FM</div>
              </div>
            </div>

            {/* 3. Approved By */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '85px' }}>
              <div className="font-bold uppercase text-black text-[9px]">3. Approved By</div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="text-[8.5px] text-gray-700 font-semibold text-center">Director / MD</div>
              </div>
            </div>

            {/* 4. Receiver Signature */}
            <div className="p-2 flex flex-col justify-between bg-gray-50/30" style={{ minHeight: '85px' }}>
              <div className="font-bold uppercase text-black text-[9px]">4. Payee / Receiver</div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="text-[8.5px] text-gray-700 font-semibold text-center">Signature & Stamp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Half-page cut guide indicator for standard half-page vouchers on A4 */}
        <div className="hidden print:flex items-center justify-between text-[8.5px] text-gray-400 mt-2 px-1 pt-1 border-t border-dashed border-gray-400 w-full max-w-[794px] mx-auto print-avoid-break">
          <span>✂ Cut here (Payment Voucher / Cash Disbursement Slip)</span>
          <span>REX INDUSTRIES (PVT) LTD - ERP SYSTEM</span>
        </div>
      </div>
    </>
  );
};
