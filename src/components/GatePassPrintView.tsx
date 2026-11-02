import React from 'react';
import { formatDate } from '@/lib/utils';

interface GatePassPrintProps {
  gatePass: any;
  settings?: any;
}

export const GatePassPrintView: React.FC<GatePassPrintProps> = ({ gatePass, settings }) => {
  // Parse items
  let itemsList: any[] = [];
  try {
    if (typeof gatePass.items === 'string' && (gatePass.items.startsWith('[') || gatePass.items.startsWith('{'))) {
      const parsed = JSON.parse(gatePass.items);
      itemsList = Array.isArray(parsed) ? parsed : [parsed];
    } else if (Array.isArray(gatePass.items)) {
      itemsList = gatePass.items;
    } else if (gatePass.items) {
      itemsList = [{ description: gatePass.items, qty: 1, unit: 'Nos', remarks: '' }];
    }
  } catch (e) {
    itemsList = [{ description: String(gatePass.items || ''), qty: 1, unit: 'Nos', remarks: '' }];
  }

  if (itemsList.length === 0 && gatePass.description) {
    itemsList = [{
      description: gatePass.description,
      qty: Number(gatePass.qty) || 1,
      unit: gatePass.unit || 'Nos',
      remarks: gatePass.remarks || ''
    }];
  }

  const company = gatePass.customerCompany || gatePass.companyName || gatePass.leadCompany || gatePass.customerName || gatePass.leadName || 'N/A';
  const person = gatePass.attention || gatePass.personName || gatePass.contactPerson || '';
  const address = gatePass.address || gatePass.customerAddress || gatePass.deliveryAddress || '';
  const phone = gatePass.phone || gatePass.customerPhone || '';
  const email = gatePass.email || gatePass.customerEmail || '';

  const isHalfPage = itemsList.length <= 6;

  return (
    <>
      <style>{`
        #gatepass-print-section {
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
        #gatepass-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #gatepass-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #gatepass-print-section .border-b { border-bottom: 1px solid #000000 !important; }
        #gatepass-print-section .border-r { border-right: 1px solid #000000 !important; }
        #gatepass-print-section .border-t { border-top: 1px solid #000000 !important; }
        #gatepass-print-section .flex { display: flex !important; }
        #gatepass-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        #gatepass-print-section .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
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
          #gatepass-print-wrapper, #gatepass-print-wrapper * { visibility: visible !important; }
          #gatepass-print-wrapper {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #gatepass-print-section {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div id="gatepass-print-wrapper" className="w-full flex flex-col justify-start">
        <div 
          id="gatepass-print-section" 
          className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm print:shadow-none" 
          style={{ width: '100%', maxWidth: '794px', minHeight: 'auto', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', boxSizing: 'border-box' }}
        >
          {/* Header Row (Compact Letterhead matching Quotation & Invoice) */}
          <div className="flex border-b border-black items-center p-2.5 print-no-break">
            <div className="w-[28%] flex items-center justify-center p-1.5 border-r border-black bg-white">
              {settings?.company_logo ? (
                <img src={settings.company_logo} alt="Logo" className="max-h-12 object-contain" />
              ) : (
                <div className="text-3xl font-black text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
                  REX
                </div>
              )}
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
            {gatePass.type === 'goods_delivery' || gatePass.type === 'sales_delivery' 
              ? 'GATE PASS / GOODS DISPATCH NOTE' 
              : 'SAMPLE GATE PASS (OUTWARD)'}
          </div>

          {/* Details Section: 2 Columns */}
          <div className="flex border-b border-black text-[10.5px] print-no-break">
            {/* Left Side: Customer / Consignee Details */}
            <div className="w-[52%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <span className="font-bold italic text-[9.5px] text-gray-700 mb-0.5 block uppercase">Customer / Consignee Details :</span>
                <div className="font-bold text-[11.5px] text-black uppercase leading-tight">{company}</div>
                {person && person !== company && (
                  <div className="text-[10px] font-semibold text-gray-800 mt-0.5">
                    <span className="font-bold">Attn:</span> {person}
                  </div>
                )}
                {address && (
                  <div className="text-gray-800 whitespace-pre-line text-[10px] leading-snug mt-0.5">{address}</div>
                )}
              </div>
              <div className="mt-1.5 space-y-0.5 text-[10px]">
                {phone && (
                  <div className="flex items-start">
                    <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "48px", whiteSpace: "nowrap", flexShrink: 0 }}>Tel</span>
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-start">
                    <span className="font-bold shrink-0 whitespace-nowrap" style={{ width: "48px", whiteSpace: "nowrap", flexShrink: 0 }}>Email</span>
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Gate Pass Metadata Table */}
            <div className="w-[48%] p-0">
              <table className="w-full h-full text-[10.5px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>GATE PASS NO</td>
                    <td className="p-1 px-2 font-bold font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 text-neutral-900">{gatePass.id || gatePass.gatePassNo}</span>
                      </div>
                    </td>
                  </tr>
                  <tr className={Boolean(gatePass.orderNo || gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo || gatePass.grnId) ? "border-b border-black" : ""}>
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>DATED</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{formatDate(gatePass.issuedDate || gatePass.createdAt || gatePass.date)}</span>
                      </div>
                    </td>
                  </tr>
                  {gatePass.orderNo && (
                    <tr className={Boolean(gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo || gatePass.grnId) ? "border-b border-black" : ""}>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>SO REF</td>
                      <td className="p-1 px-2 font-mono font-bold text-blue-900">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{gatePass.orderNo}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {(gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo) && (
                    <tr className={Boolean(gatePass.grnId) ? "border-b border-black" : ""}>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>QUO REF</td>
                      <td className="p-1 px-2 font-mono font-semibold text-emerald-800">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {gatePass.grnId && (
                    <tr>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>SAMPLE GRN</td>
                      <td className="p-1 px-2 font-mono">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{gatePass.grnId}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items Table with exact column alignment */}
          <div className="w-full">
            <table className="w-full text-[10.5px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '50%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-black text-center font-bold text-[10px] bg-gray-50/80">
                  <th className="py-1 border-r border-black text-center">#</th>
                  <th className="py-1 border-r border-black text-left px-2">Item & Description</th>
                  <th className="py-1 border-r border-black text-center">Qty.</th>
                  <th className="py-1 border-r border-black text-center">Unit</th>
                  <th className="py-1 text-left px-2">Remarks / Condition</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.map((item: any, idx: number) => {
                  const qtyVal = Number(item.qty || 1);
                  const formattedQty = Number.isInteger(qtyVal) ? qtyVal.toString() : qtyVal.toFixed(2);
                  const desc = item.description || item.items || item.desc || item.productName || 'Sample Item';
                  const unit = item.unit || item.uom || 'Nos';
                  const remarks = item.remarks || item.notes || gatePass.notes || '-';

                  return (
                    <tr key={idx} className="border-b border-black text-[10px] leading-snug">
                      <td className="py-1.5 text-center border-r border-black font-mono font-semibold align-top">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black align-top font-medium whitespace-pre-wrap">
                        {desc}
                      </td>
                      <td className="py-1.5 text-center border-r border-black font-mono font-bold align-top">
                        {formattedQty}
                      </td>
                      <td className="py-1.5 text-center border-r border-black align-top">
                        {unit}
                      </td>
                      <td className="py-1.5 px-2 text-left align-top text-gray-700">
                        {remarks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Customer Acceptance Notice */}
          <div className="border-t border-black bg-gray-50/70 px-2.5 py-1 text-[9px] text-gray-700 flex items-center justify-between print-no-break">
            <span><strong>Customer Acceptance:</strong> Received the above goods in sound condition, complete quantity and satisfactory order.</span>
            <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider">REX-F-DSP-01</span>
          </div>

          {/* 3-Column Formal Signatures Block: Stores, Security Check, Customer */}
          <div className="border-t border-black grid grid-cols-3 divide-x divide-black text-[10px] bg-white print-no-break">
            {/* 1. STORES / DISPATCHED BY */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '92px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>1. Stores / Dispatched By</span>
                  <span className="text-[8px] text-gray-500 font-normal">Internal</span>
                </div>
              </div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="flex justify-between items-center text-[8.5px] text-gray-700">
                  <span className="font-bold">Stores Officer Signature</span>
                  <span>Date: ................</span>
                </div>
              </div>
            </div>

            {/* 2. SECURITY CHECK / GATE CLEARANCE */}
            <div className="p-2 flex flex-col justify-between bg-gray-50/30" style={{ minHeight: '92px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>2. Security Check</span>
                  <span className="text-[8px] font-semibold text-emerald-800 bg-emerald-50 px-1 border border-emerald-300">Gate Out</span>
                </div>
              </div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="flex justify-between items-center text-[8.5px] text-gray-700">
                  <span className="font-bold">Security Officer Signature</span>
                  <span>Time: ...........</span>
                </div>
              </div>
            </div>

            {/* 3. CUSTOMER / RECEIVED BY */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '92px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>3. Customer / Received By</span>
                  <span className="text-[8px] text-gray-500 font-normal">Consignee</span>
                </div>
                <div className="text-[8.5px] text-gray-600 mt-0.5">
                  Name: ............................................
                </div>
                <div className="text-[8.5px] text-gray-600 mt-1">
                  NIC / Tel: .......................................
                </div>
              </div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="flex justify-between items-center text-[8.5px] text-gray-700">
                  <span className="font-bold">Signature & Rubber Stamp</span>
                  <span>Date: ................</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Half-page cut guide indicator for standard half-page dispatches on A4 */}
        {isHalfPage && (
          <div className="hidden print:flex items-center justify-between text-[8.5px] text-gray-400 mt-2 px-1 pt-1 border-t border-dashed border-gray-400 w-full max-w-[794px] mx-auto print-avoid-break">
            <span>✂ Cut here (Half Page Dispatch Slip)</span>
            <span>REX INDUSTRIES (PVT) LTD - ERP SYSTEM</span>
          </div>
        )}
      </div>
    </>
  );
};
