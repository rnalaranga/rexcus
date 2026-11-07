import React from 'react'
import { formatCurrency, formatDate, resolveFileUrl } from '@/lib/utils'

function toWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const g = ['', 'Thousand', 'Million', 'Billion'];
  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };
  let result = '';
  let i = 0;
  let val = Math.floor(Math.abs(num));
  while (val > 0) {
    const chunk = val % 1000;
    if (chunk !== 0) {
      result = makeGroup(chunk) + ' ' + g[i] + ' ' + result;
    }
    val = Math.floor(val / 1000);
    i++;
  }
  return result.trim() + ' Rupees Only';
}

interface SalesOrderPrintViewProps {
  order: any
  customer?: any
  settings?: any
}

export const SalesOrderPrintView: React.FC<SalesOrderPrintViewProps> = ({ order, customer, settings }) => {
  const orderCurrency = String(order.currency || customer?.currency || (customer?.isForeign ? 'USD' : 'LKR')).trim().toUpperCase();
  const isUSD = orderCurrency === 'USD' || orderCurrency === '$';
  const currSymbol = isUSD ? '$' : 'Rs';

  // Parse items list
  let itemsList: any[] = [];
  if (order.items) {
    if (typeof order.items === 'string') {
      try {
        itemsList = JSON.parse(order.items);
      } catch (e) {
        itemsList = [];
      }
    } else if (Array.isArray(order.items)) {
      itemsList = order.items;
    }
  }

  // Fallback to single product if itemsList is empty
  if (itemsList.length === 0 && (order.productName || order.partName || order.title)) {
    itemsList = [{
      productId: order.productId,
      description: order.productName || order.partName || order.title,
      productSku: order.productSku,
      qty: Number(order.qty || order.jobQty) || 1,
      unitPrice: Number(order.unitPrice) || 0,
      amount: Number(order.totalPrice) || (Number(order.qty || 1) * Number(order.unitPrice || 0)),
      uom: order.uom || 'Nos'
    }];
  }

  const customerName = order.customerName || order.clientName || customer?.company || customer?.name || 'Valued Customer';
  const attention = order.attention || customer?.attention || customer?.contactPerson || customer?.name || '';
  const customerAddress = order.deliveryAddress || order.customerAddress || customer?.address || '';
  const customerPhone = order.customerPhone || customer?.phone || '';
  const customerEmail = order.customerEmail || customer?.email || '';
  const vatNumber = customer?.vat || order.customerVat || '';
  const tinNumber = customer?.tin || customer?.brNumber || order.customerTin || '';

  const subtotal = Number(order.subtotal) || itemsList.reduce((acc, it) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0);
  const discountAmount = Number(order.discountAmount || (order.discountType === 'percent' ? ((subtotal * Number(order.discount || 0)) / 100) : order.discount) || 0);
  let taxAmount = Number(order.taxAmount) || 0;
  const totalPrice = Number(order.totalPrice) || Math.max(0, subtotal - discountAmount + taxAmount);
  if (taxAmount === 0 && totalPrice > (subtotal - discountAmount)) {
    taxAmount = totalPrice - (subtotal - discountAmount);
  }

  const isTaxInclusive = Boolean(order.isTaxInclusive);
  let vatAmount = Number(order.vatAmount || 0);
  let ssclAmount = Number(order.ssclAmount || 0);

  // If vatAmount / ssclAmount were not directly stored on older records, derive them from taxAmount & taxRate/taxProfile
  if (vatAmount === 0 && ssclAmount === 0 && taxAmount > 0) {
    const netBase = Math.max(0, subtotal - discountAmount);
    const taxRate = Number(order.taxRate) || 0;
    if (Math.abs(taxRate - 18) < 0.1) {
      vatAmount = taxAmount;
    } else if (Math.abs(taxRate - 2.5) < 0.1) {
      ssclAmount = taxAmount;
    } else if (taxRate >= 20 || String(order.taxProfileId || '').includes('sscl')) {
      if (isTaxInclusive) {
        const base = totalPrice / 1.2095;
        ssclAmount = Number((base * 0.025).toFixed(2));
        vatAmount = Number((totalPrice - base - ssclAmount).toFixed(2));
      } else {
        ssclAmount = Number((netBase * 0.025).toFixed(2));
        vatAmount = Number(((netBase + ssclAmount) * 0.18).toFixed(2));
      }
    } else {
      vatAmount = taxAmount;
    }
  }

  return (
    <>
      <style>{`
        #sales-order-print-section {
          width: 100% !important;
          max-width: 794px !important;
          margin: 0 auto !important;
          font-family: Arial, Helvetica, sans-serif !important;
          color: #000000 !important;
          background: #ffffff !important;
          border: 1px solid #000000 !important;
          box-sizing: border-box !important;
          font-size: 11px !important;
          line-height: 1.35 !important;
        }
        #sales-order-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #sales-order-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #sales-order-print-section .border-b { border-bottom: 1px solid #000000 !important; }
        #sales-order-print-section .border-r { border-right: 1px solid #000000 !important; }
        #sales-order-print-section .border-t { border-top: 1px solid #000000 !important; }
        #sales-order-print-section .flex { display: flex !important; }
        #sales-order-print-section .bg-gray-100 { background-color: #f3f4f6 !important; }
        #sales-order-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        #sales-order-print-section .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
        @media print {
          @page { size: A4 portrait; margin: 6mm 8mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          /* Neutralize modal and fixed positioning wrappers on print */
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
          #sales-order-print-section, #sales-order-print-section * { visibility: visible !important; }
          #sales-order-print-section {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            min-height: 0 !important;
            height: auto !important;
          }
        }
      `}</style>
      <div 
        id="sales-order-print-section"
        className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm print:shadow-none print:min-h-0 print:h-auto"
        style={{ width: '100%', maxWidth: '794px', minHeight: '1050px', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', boxSizing: 'border-box' }}
      >
        {/* Top Letterhead Header (matching QuotationPrintView) */}
        <div className="flex border-b border-black items-center p-3 print-no-break">
          <div className="w-[30%] flex items-center justify-center p-2 border-r border-black bg-white">
            <img 
              src={resolveFileUrl(settings?.company_logo || settings?.logo || settings?.companyLogo || '') || '/rex-logo.png'} 
              alt="Company Logo" 
              className="max-h-20 max-w-full object-contain" 
              crossOrigin="anonymous" 
            />
          </div>
          <div className="w-[70%] pl-3 text-[11px] leading-tight bg-white">
            <h1 className="text-[19px] font-black uppercase text-black mb-1 leading-tight" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
              {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
            </h1>
            <table className="w-full text-[11px] leading-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <tbody>
                <tr>
                  <td className="font-bold align-top w-14 pb-0.5 whitespace-nowrap">Office</td>
                  <td className="pb-0.5 align-top">
                    <div className="flex items-start">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1 whitespace-pre-line">{settings?.company_address || settings?.companyAddress || 'No.451/2,Chilaw Road, Kattuwa,\nNegombo,11500,Sri Lanka'}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold align-top w-14 pb-0.5 whitespace-nowrap">Tel.</td>
                  <td className="pb-0.5 align-top">
                    <div className="flex items-start">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1">{settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold align-top w-14 pb-0.5 whitespace-nowrap">E-mail</td>
                  <td className="pb-0.5 align-top">
                    <div className="flex items-start">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1">{settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold align-top w-14 pb-0.5 whitespace-nowrap">Web</td>
                  <td className="pb-0.5 align-top">
                    <div className="flex items-start">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1">{settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold align-top w-14 whitespace-nowrap">TIN</td>
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
        <div className="bg-gray-50 border-b border-black text-center py-1 font-bold text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 print-no-break">
          <span>SALES ORDER / ORDER CONFIRMATION</span>
          {order.status && (
            <span className="text-[10px] font-mono border border-black px-1.5 py-0.2 rounded tracking-normal bg-white">
              {order.status}
            </span>
          )}
        </div>

        {/* Customer & Order Metadata Details Section */}
        <div className="flex border-b border-black text-[11px] print-no-break">
          {/* Left: Customer Information (matching Quotation TO block) */}
          <div className="w-[52%] p-2.5 border-r border-black flex flex-col justify-between">
            <div>
              <div className="font-bold italic mb-0.5 text-[10px] text-gray-700 uppercase">CUSTOMER / BILL TO</div>
              {customerName && (
                <div className="font-bold text-[12px] uppercase leading-tight text-black">
                  {customerName}
                </div>
              )}
              {customerAddress && (
                <div className="whitespace-pre-line text-[10.5px] leading-snug text-black mt-0.5">
                  {customerAddress}
                </div>
              )}
            </div>
            <div className="mt-2 space-y-0.5 font-medium text-[10.5px]">
              {attention && (
                <div className="flex items-start">
                  <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "75px", whiteSpace: "nowrap", flexShrink: 0 }}>Attn</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1">{attention}</span>
                </div>
              )}
              {customerPhone && (
                <div className="flex items-start">
                  <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "75px", whiteSpace: "nowrap", flexShrink: 0 }}>Phone</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1">{customerPhone}</span>
                </div>
              )}
              {customerEmail && (
                <div className="flex items-start">
                  <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "75px", whiteSpace: "nowrap", flexShrink: 0 }}>Email</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1">{customerEmail}</span>
                </div>
              )}
              {(vatNumber || tinNumber) && (
                <div className="flex items-start">
                  <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "75px", whiteSpace: "nowrap", flexShrink: 0 }}>{vatNumber ? "VAT No." : "TIN No."}</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1 font-mono">{vatNumber || tinNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Metadata with fixed label widths and aligned colons */}
          <div className="w-[48%] p-0">
            <table className="w-full h-full text-[11px]">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "115px", whiteSpace: "nowrap" }}>SO NO</td>
                  <td className="p-1 px-2 font-bold font-mono">
                    <div className="flex items-center">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1 text-blue-900">{order.orderNo || order.id}</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "115px", whiteSpace: "nowrap" }}>ORDER DATE</td>
                  <td className="p-1 px-2 font-mono">
                    <div className="flex items-center">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1">{formatDate(order.orderDate || order.createdAt)}</span>
                    </div>
                  </td>
                </tr>
                {order.quotationNo && (
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">QUO REF</td>
                    <td className="p-1 px-2 font-mono font-semibold text-emerald-800">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{order.quotationNo}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {order.customerPoNo && (
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">CUST PO NO</td>
                    <td className="p-1 px-2 font-mono font-bold">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{order.customerPoNo}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {order.customerPoDate && (
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">CUST PO DATE</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{formatDate(order.customerPoDate)}</span>
                      </div>
                    </td>
                  </tr>
                )}
                <tr className={order.paymentTerms || order.gatePassNo || order.invoiceNo ? "border-b border-black" : ""}>
                  <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">DELIVERY</td>
                  <td className="p-1 px-2 font-mono">
                    <div className="flex items-center">
                      <span className="font-bold mr-1 shrink-0">:</span>
                      <span className="flex-1">{order.targetDeliveryDate ? formatDate(order.targetDeliveryDate) : 'Standard Schedule'}</span>
                    </div>
                  </td>
                </tr>
                {order.paymentTerms && (
                  <tr className={order.gatePassNo || order.invoiceNo ? "border-b border-black" : ""}>
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">PAYMENT</td>
                    <td className="p-1 px-2">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{order.paymentTerms}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {order.gatePassNo && (
                  <tr className={order.invoiceNo ? "border-b border-black" : ""}>
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">GATE PASS REF</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{order.gatePassNo}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {order.invoiceNo && (
                  <tr>
                    <td className="p-1 px-2 border-r border-black font-bold w-28 whitespace-nowrap">INVOICE REF</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{order.invoiceNo}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table with exact column alignments and crisp 11px font */}
        <div className="flex-1 min-h-[380px] flex flex-col justify-between">
          <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '47%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-black text-center font-bold text-[11px] bg-gray-50/80">
                <th className="py-1.5 border-r border-black text-center">#</th>
                <th className="py-1.5 border-r border-black text-left px-2.5">Item Description & Specification</th>
                <th className="py-1.5 border-r border-black text-center">Qty</th>
                <th className="py-1.5 border-r border-black text-right px-2.5">Unit Price ({currSymbol})</th>
                <th className="py-1.5 text-right px-2.5">Amount ({currSymbol})</th>
              </tr>
            </thead>
            <tbody>
              {itemsList.map((item: any, idx: number) => {
                const itemQty = Number(item.qty) || 1;
                const itemUnitPrice = Number(item.unitPrice) || 0;
                const lineTotal = Number(item.amount) || (itemQty * itemUnitPrice);
                const desc = item.description || item.productName || item.desc || 'Order Item';

                return (
                  <tr key={idx} className="border-b border-black text-[11px] leading-snug">
                    <td className="py-2 text-center border-r border-black font-semibold align-top font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 border-r border-black align-top">
                      <div className="font-bold text-[11.5px] text-black whitespace-pre-line">{desc}</div>
                      {item.productSku && (
                        <div className="text-[10px] font-mono text-gray-600 mt-0.5">SKU: {item.productSku}</div>
                      )}
                      {item.specs && (
                        <div className="text-[10px] text-gray-700 mt-0.5">{item.specs}</div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] italic text-gray-500 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-2 text-center border-r border-black font-mono font-bold align-top">
                      {itemQty} {item.uom || item.unit || 'Nos'}
                    </td>
                    <td className="py-2 px-2.5 text-right border-r border-black font-mono align-top">
                      {formatCurrency(itemUnitPrice, false, orderCurrency)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold align-top">
                      {formatCurrency(lineTotal, false, orderCurrency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Financial Summary & Totals */}
          <div className="border-t border-black bg-gray-50/50 flex text-[11px] print-no-break">
            <div className="w-[52%] p-2.5 border-r border-black flex items-center">
              <span className="font-medium text-gray-700 italic">
                Amount in words: <strong className="text-black font-bold not-italic">{toWords(totalPrice)}</strong>
              </span>
            </div>
            <div className="w-[48%] p-0">
              <table className="w-full text-[11px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 px-2.5 font-semibold text-gray-700">
                      {isTaxInclusive ? 'Gross Total (Entered)' : 'Subtotal'}
                    </td>
                    <td className="p-1 px-2.5 text-right font-mono font-bold">{formatCurrency(subtotal, false, orderCurrency)}</td>
                  </tr>
                  {discountAmount > 0 && (
                    <tr className="border-b border-black text-rose-700">
                      <td className="p-1 px-2.5 font-semibold">Commercial Discount</td>
                      <td className="p-1 px-2.5 text-right font-mono font-bold">-{formatCurrency(discountAmount, false, orderCurrency)}</td>
                    </tr>
                  )}
                  {isTaxInclusive && (vatAmount > 0 || ssclAmount > 0) && (
                    <tr className="border-b border-black text-gray-700 bg-gray-50/50">
                      <td className="p-1 px-2.5 font-semibold">Net Supply Value (Base Excl. Taxes)</td>
                      <td className="p-1 px-2.5 text-right font-mono font-bold">
                        {formatCurrency(Math.max(0, totalPrice - taxAmount), false, orderCurrency)}
                      </td>
                    </tr>
                  )}
                  {ssclAmount > 0 && (
                    <tr className="border-b border-black text-amber-900">
                      <td className="p-1 px-2.5 font-semibold">
                        Social Security Contribution Levy (SSCL 2.5%{isTaxInclusive ? ' Extracted' : ''})
                      </td>
                      <td className="p-1 px-2.5 text-right font-mono font-bold">
                        {isTaxInclusive ? '' : '+'}{formatCurrency(ssclAmount, false, orderCurrency)}
                      </td>
                    </tr>
                  )}
                  {vatAmount > 0 && (
                    <tr className="border-b border-black text-blue-950">
                      <td className="p-1 px-2.5 font-semibold">
                        Value Added Tax (VAT 18%{isTaxInclusive ? ' Extracted' : ''})
                      </td>
                      <td className="p-1 px-2.5 text-right font-mono font-bold">
                        {isTaxInclusive ? '' : '+'}{formatCurrency(vatAmount, false, orderCurrency)}
                      </td>
                    </tr>
                  )}
                  {taxAmount > 0 && ssclAmount === 0 && vatAmount === 0 && (
                    <tr className="border-b border-black">
                      <td className="p-1 px-2.5 font-semibold text-gray-700">
                        Taxes ({isTaxInclusive ? 'Extracted' : 'Added'})
                      </td>
                      <td className="p-1 px-2.5 text-right font-mono font-bold">
                        {isTaxInclusive ? '' : '+'}{formatCurrency(taxAmount, false, orderCurrency)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-bold text-[11.5px]">
                    <td className="p-1.5 px-2.5">
                      Total Order Value
                      {isTaxInclusive && <span className="block text-[9px] font-normal text-gray-600">(Tax-Inclusive Price)</span>}
                    </td>
                    <td className="p-1.5 px-2.5 text-right font-mono text-blue-900">{formatCurrency(totalPrice, false, orderCurrency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Terms & Notes */}
        <div className="p-2.5 px-3 border-t border-black text-[10px] leading-tight bg-white print-no-break">
          <div className="font-bold underline uppercase mb-0.5">Standard Terms & Conditions:</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
            <li>Delivery will be made as per the agreed target schedule upon official order confirmation.</li>
            <li>All goods supplied remain the property of REX Industries (Pvt) Ltd until full invoice settlement.</li>
            <li>Claims or discrepancies regarding supplied items must be notified in writing within 48 hours of dispatch.</li>
            {order.notes && (
              <li className="font-semibold text-black mt-0.5">Special Instructions: {order.notes}</li>
            )}
          </ol>
        </div>

        {/* Signatures Footer */}
        <div className="border-t border-black p-3 pt-6 bg-white print-no-break">
          <div className="grid grid-cols-3 gap-6 text-center text-[10.5px]">
            <div>
              <div className="border-t border-black pt-1 font-bold">Prepared By</div>
              <div className="text-[9.5px] text-gray-600">Sales Department</div>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold">Authorized Signatory</div>
              <div className="text-[9.5px] text-gray-600">REX Industries (Pvt) Ltd</div>
            </div>
            <div>
              <div className="border-t border-black pt-1 font-bold">Customer Acceptance</div>
              <div className="text-[9.5px] text-gray-600">Signature & Company Seal</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
