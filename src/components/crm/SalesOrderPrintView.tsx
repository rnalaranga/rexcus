import React from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

function toWords(num: number): string {
  if (num === 0) return 'Zero';
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
  if (itemsList.length === 0 && order.productName) {
    itemsList = [{
      productId: order.productId,
      description: order.productName,
      productSku: order.productSku,
      qty: Number(order.qty) || 1,
      unitPrice: Number(order.unitPrice) || 0,
      amount: Number(order.totalPrice) || (Number(order.qty || 1) * Number(order.unitPrice || 0)),
      uom: 'Nos'
    }];
  }

  const customerName = order.customerName || customer?.company || customer?.name || 'Valued Customer';
  const attention = order.attention || customer?.attention || customer?.contactPerson || '';
  const customerAddress = order.deliveryAddress || customer?.address || '';
  const customerPhone = order.customerPhone || customer?.phone || '';
  const customerEmail = order.customerEmail || customer?.email || '';
  const vatNumber = customer?.vat || '';

  const subtotal = Number(order.subtotal) || itemsList.reduce((acc, it) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0);
  const taxAmount = Number(order.taxAmount) || 0;
  const totalPrice = Number(order.totalPrice) || (subtotal + taxAmount);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sales-order-print-section, #sales-order-print-section * { visibility: visible !important; }
          #sales-order-print-section { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 210mm !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      <div 
        id="sales-order-print-section"
        className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm"
        style={{ width: '210mm', minHeight: '297mm', color: '#000', fontFamily: 'Arial, sans-serif' }}
      >
        {/* Top Letterhead Header */}
        <div className="flex border-b border-black">
          <div className="w-[30%] flex items-center justify-center p-4 border-r border-black bg-white">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Company Logo" className="w-full object-contain" style={{ maxHeight: '80px' }} />
            ) : (
              <div className="text-3xl text-red-600 font-bold flex items-center gap-2 tracking-tighter">
                <span className="text-5xl">⚙️</span> REX
              </div>
            )}
          </div>
          <div className="w-[70%] p-4 pl-6 text-[13px] leading-tight bg-white">
            <h1 className="text-[22px] font-black uppercase text-black mb-1">REX INDUSTRIES (PVT) LTD</h1>
            <table className="w-full text-[13px]">
              <tbody>
                <tr>
                  <td className="font-bold align-top w-16 pb-1">Office</td>
                  <td className="pb-1">: No.451/2, Chilaw Road, Kattuwa,<br />: Negombo, 11500, Sri Lanka</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Tel.</td>
                  <td className="pb-1">: 0094-31-2233117 / 2233315 / 2223136</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">E-mail</td>
                  <td className="pb-1">: info@rexgroup.lk</td>
                </tr>
                <tr>
                  <td className="font-bold">Web</td>
                  <td>: www.rexgroup.lk</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Title Bar */}
        <div className="bg-gray-100 border-b border-black text-center py-2.5 font-bold text-[16px] uppercase tracking-wider flex items-center justify-center gap-3">
          <span>SALES ORDER / ORDER CONFIRMATION</span>
          <span className="text-[12px] font-mono bg-white border border-black px-2 py-0.5 rounded text-gray-800">
            {order.status || 'Confirmed'}
          </span>
        </div>

        {/* Details Section */}
        <div className="flex border-b border-black text-[13px]">
          {/* Left: Customer Information */}
          <div className="w-[50%] p-3.5 pl-4 border-r border-black">
            <span className="font-bold italic underline mb-2 block text-[13px]">Customer / Bill To :</span>
            <div className="leading-snug space-y-1">
              <div className="font-bold text-[15px] text-black">{customerName}</div>
              {attention && (
                <div className="text-[13px] font-semibold text-black">
                  <span className="font-bold text-gray-800">Attn:</span> {attention}
                </div>
              )}
              {customerAddress && (
                <div className="text-gray-800 whitespace-pre-line text-[12px]">
                  {customerAddress}
                </div>
              )}
              {customerPhone && (
                <div><span className="font-semibold text-gray-700">Phone:</span> {customerPhone}</div>
              )}
              {customerEmail && (
                <div><span className="font-semibold text-gray-700">Email:</span> {customerEmail}</div>
              )}
              {vatNumber && (
                <div><span className="font-semibold text-gray-700">VAT / TIN:</span> {vatNumber}</div>
              )}
            </div>
          </div>

          {/* Right: Order Metadata */}
          <div className="w-[50%] p-3.5 pl-4">
            <table className="w-full leading-snug text-[13px]">
              <tbody>
                <tr>
                  <td className="w-36 font-bold pb-1.5">Sales Order No</td>
                  <td className="font-bold pb-1.5">: <span className="font-mono text-[14px] text-blue-900">{order.orderNo}</span></td>
                </tr>
                <tr>
                  <td className="font-bold pb-1.5">Order Date</td>
                  <td className="pb-1.5 font-mono">: {formatDate(order.orderDate || order.createdAt)}</td>
                </tr>
                {order.quotationNo && (
                  <tr>
                    <td className="font-bold pb-1.5">Quotation Ref</td>
                    <td className="pb-1.5 font-mono font-semibold text-emerald-800">: {order.quotationNo}</td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold pb-1.5">Target Delivery</td>
                  <td className="pb-1.5 font-mono">: {order.targetDeliveryDate ? formatDate(order.targetDeliveryDate) : 'Standard Schedule'}</td>
                </tr>
                {order.paymentTerms && (
                  <tr>
                    <td className="font-bold pb-1.5">Payment Terms</td>
                    <td className="pb-1.5">: {order.paymentTerms}</td>
                  </tr>
                )}
                {order.gatePassNo && (
                  <tr>
                    <td className="font-bold pb-1.5">Gate Pass Ref</td>
                    <td className="pb-1.5 font-mono">: {order.gatePassNo}</td>
                  </tr>
                )}
                {order.invoiceNo && (
                  <tr>
                    <td className="font-bold pb-1.5">Invoice Ref</td>
                    <td className="pb-1.5 font-mono">: {order.invoiceNo}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="flex-1 flex flex-col min-h-[440px]">
          {/* Table Header */}
          <div className="flex border-b border-black text-center font-bold text-[13px] bg-gray-50">
            <div className="w-12 py-2 border-r border-black">#</div>
            <div className="flex-1 py-2 border-r border-black text-left px-3">Item Description & Specification</div>
            <div className="w-20 py-2 border-r border-black">Qty</div>
            <div className="w-32 py-2 border-r border-black text-right px-3">Unit Price (Rs)</div>
            <div className="w-36 py-2 text-right px-3">Amount (Rs)</div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 flex flex-col">
            {itemsList.map((item: any, idx: number) => {
              const itemQty = Number(item.qty) || 1;
              const itemUnitPrice = Number(item.unitPrice) || 0;
              const lineTotal = Number(item.amount) || (itemQty * itemUnitPrice);
              const desc = item.description || item.productName || 'Order Item';

              return (
                <div key={idx} className="flex border-b border-gray-300 text-[12px] leading-snug">
                  <div className="w-12 py-2.5 text-center border-r border-black font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 py-2.5 px-3 border-r border-black">
                    <div className="font-bold text-[13px] text-black whitespace-pre-line">{desc}</div>
                    {item.productSku && (
                      <div className="text-[11px] font-mono text-gray-600 mt-0.5">SKU: {item.productSku}</div>
                    )}
                    {item.notes && (
                      <div className="text-[11px] italic text-gray-500 mt-0.5">{item.notes}</div>
                    )}
                  </div>
                  <div className="w-20 py-2.5 text-center border-r border-black font-mono font-bold">
                    {itemQty} {item.uom || 'Nos'}
                  </div>
                  <div className="w-32 py-2.5 px-3 text-right border-r border-black font-mono">
                    {formatCurrency(itemUnitPrice)}
                  </div>
                  <div className="w-36 py-2.5 px-3 text-right font-mono font-bold">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Financial Summary & Totals */}
          <div className="border-t border-black bg-gray-50 text-[13px]">
            <div className="flex border-b border-gray-300">
              <div className="flex-1 p-3 border-r border-black flex items-center">
                <span className="font-semibold text-gray-700 italic">
                  Amount in words: <strong className="text-black font-bold not-italic">{toWords(totalPrice)}</strong>
                </span>
              </div>
              <div className="w-68">
                <div className="flex justify-between py-1.5 px-4 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">Subtotal:</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between py-1.5 px-4 border-b border-gray-200">
                    <span className="font-semibold text-gray-700">Taxes (VAT / SSCL):</span>
                    <span className="font-mono font-bold">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 px-4 bg-gray-200 font-bold text-[14px]">
                  <span>Total Order Value:</span>
                  <span className="font-mono text-blue-900">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Terms & Notes */}
        <div className="p-3.5 border-t border-black text-[11px] leading-relaxed bg-white">
          <div className="font-bold underline uppercase mb-1">Standard Terms & Conditions:</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-gray-700">
            <li>Delivery will be made as per the agreed target schedule upon official order confirmation.</li>
            <li>All goods supplied remain the property of REX Industries (Pvt) Ltd until full invoice settlement.</li>
            <li>Claims or discrepancies regarding supplied items must be notified in writing within 48 hours of dispatch.</li>
            {order.notes && (
              <li className="font-semibold text-black mt-1">Special Instructions: {order.notes}</li>
            )}
          </ol>
        </div>

        {/* Signatures Footer */}
        <div className="border-t border-black p-4 bg-white">
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[12px]">
            <div>
              <div className="border-t border-black pt-1.5 font-bold">Prepared By</div>
              <div className="text-[10px] text-gray-600 mt-0.5">Sales Department</div>
            </div>
            <div>
              <div className="border-t border-black pt-1.5 font-bold">Authorized Signatory</div>
              <div className="text-[10px] text-gray-600 mt-0.5">REX Industries (Pvt) Ltd</div>
            </div>
            <div>
              <div className="border-t border-black pt-1.5 font-bold">Customer Acceptance</div>
              <div className="text-[10px] text-gray-600 mt-0.5">Signature & Company Seal</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
