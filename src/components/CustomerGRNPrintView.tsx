import React from 'react';
import { formatDate, resolveFileUrl } from '@/lib/utils';

export const CustomerGRNPrintView: React.FC<{ grn: any, group: any, settings: any }> = ({ grn, group, settings }) => {
  // Try to parse items string if it's JSON
  let itemsList: any[] = [];
  try {
    if (typeof grn.items === 'string' && (grn.items.startsWith('[') || grn.items.startsWith('{'))) {
      const parsed = JSON.parse(grn.items);
      itemsList = Array.isArray(parsed) ? parsed : [parsed];
    } else if (Array.isArray(grn.items)) {
      itemsList = grn.items;
    } else if (grn.items) {
      itemsList = [{ description: grn.items, qty: 1, unit: 'Nos', remarks: '' }];
    }
  } catch (e) {
    itemsList = [{ description: String(grn.items || ''), qty: 1, unit: 'Nos', remarks: '' }];
  }

  if (itemsList.length === 0 && (grn.description || grn.items)) {
    itemsList = [{
      description: grn.description || grn.items || 'Sample Goods',
      qty: Number(grn.qty) || 1,
      unit: grn.unit || 'Nos',
      remarks: grn.remarks || grn.notes || ''
    }];
  }

  let photosList: any[] = [];
  try {
    if (typeof grn.photos === 'string' && grn.photos.startsWith('[')) {
      photosList = JSON.parse(grn.photos);
    } else if (Array.isArray(grn.photos)) {
      photosList = grn.photos;
    }
  } catch (e) {
    photosList = [];
  }

  const company = group?.leadCompany || grn?.customerCompany || group?.leadName || grn?.customerName || group?.company || group?.name || 'N/A';
  const person = grn?.contactPerson || grn?.attention || group?.contactPerson || '';
  const address = group?.address || grn?.customerAddress || '';
  const phone = group?.phone || grn?.customerPhone || '';
  const email = group?.email || grn?.customerEmail || '';

  const isHalfPage = itemsList.length <= 6 && photosList.length === 0;

  return (
    <>
      <style>{`
        #grn-print-section {
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
        #grn-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #grn-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #grn-print-section .border-b { border-bottom: 1px solid #000000 !important; }
        #grn-print-section .border-r { border-right: 1px solid #000000 !important; }
        #grn-print-section .border-t { border-top: 1px solid #000000 !important; }
        #grn-print-section .flex { display: flex !important; }
        #grn-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        #grn-print-section .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
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
          #grn-print-wrapper, #grn-print-wrapper * { visibility: visible !important; }
          #grn-print-wrapper {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #grn-print-section {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div id="grn-print-wrapper" className="w-full flex flex-col justify-start">
        <div 
          id="grn-print-section" 
          className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm print:shadow-none" 
          style={{ width: '100%', maxWidth: '794px', minHeight: 'auto', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', boxSizing: 'border-box' }}
        >
          {/* Header Row (A5 Compact Letterhead matching Dispatch Note) */}
          <div className="flex border-b border-black items-center p-2.5 print-no-break">
            <div className="w-[28%] flex items-center justify-center p-1.5 border-r border-black bg-white">
              <img 
                src={resolveFileUrl(settings?.company_logo || settings?.logo || settings?.companyLogo || '') || '/rex-logo.png'} 
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
            SAMPLE GOODS RECEIPT NOTE (INWARD)
          </div>

          {/* Details Section: 2 Columns */}
          <div className="flex border-b border-black text-[10.5px] print-no-break">
            {/* Left Side: Customer / Supplier Details */}
            <div className="w-[52%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <span className="font-bold italic text-[9.5px] text-gray-700 mb-0.5 block uppercase">Customer / Consignor Details :</span>
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

            {/* Right Side: Sample GRN Metadata Table */}
            <div className="w-[48%] p-0">
              <table className="w-full h-full text-[10.5px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>SAMPLE GRN NO</td>
                    <td className="p-1 px-2 font-bold font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 text-neutral-900">{grn.id}</span>
                      </div>
                    </td>
                  </tr>
                  <tr className={Boolean(group?.quoNo || grn?.quoNo || grn?.referenceNo || grn?.receivedBy) ? "border-b border-black" : ""}>
                    <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>DATED</td>
                    <td className="p-1 px-2 font-mono">
                      <div className="flex items-center">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{formatDate(grn.receivedAt || grn.createdAt)}</span>
                      </div>
                    </td>
                  </tr>
                  {(group?.quoNo || grn?.quoNo) && (
                    <tr className={Boolean(grn?.receivedBy) ? "border-b border-black" : ""}>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>QUO / REF NO</td>
                      <td className="p-1 px-2 font-mono font-semibold text-emerald-800">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{group?.quoNo || grn?.quoNo}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {grn?.receivedBy && (
                    <tr>
                      <td className="p-1 px-2 border-r border-black font-bold whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>RECEIVED BY</td>
                      <td className="p-1 px-2 font-mono">
                        <div className="flex items-center">
                          <span className="font-bold mr-1 shrink-0">:</span>
                          <span className="flex-1">{grn.receivedBy}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items Table */}
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
                  const desc = item.description || item.items || item.desc || item.name || 'Sample Item';
                  const unit = item.unit || item.uom || 'Nos';
                  const remarks = item.remarks || item.notes || grn.notes || '-';

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

          {/* Attached Inspection Photos if present */}
          {photosList.length > 0 && (
            <div className="border-t border-black p-2 bg-white print-no-break">
              <p className="font-bold text-[9.5px] uppercase mb-1.5">Sample Inspection Photos ({photosList.length}):</p>
              <div className="flex flex-wrap gap-2">
                {photosList.map((p: any, idx: number) => (
                  <div key={idx} className="border border-black p-1 text-center bg-gray-50" style={{ width: '90px' }}>
                    <img src={p.url} alt={p.name || 'Sample photo'} style={{ maxHeight: '60px', width: '100%', objectFit: 'contain' }} />
                    <p className="text-[8.5px] truncate mt-0.5">{p.name || `Photo ${idx + 1}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer / Store Acceptance Notice */}
          <div className="border-t border-black bg-gray-50/70 px-2.5 py-1 text-[9px] text-gray-700 flex items-center justify-between print-no-break">
            <span><strong>Receipt Acknowledgment:</strong> Customer physical sample / sample component received for machining, inspection or sample duplication.</span>
            <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider">REX-F-SGRN-01</span>
          </div>

          {/* 3-Column Formal Signatures Block: Prepared / Received, Inspection / Stores, Customer Handover */}
          <div className="border-t border-black grid grid-cols-3 divide-x divide-black text-[10px] bg-white print-no-break">
            {/* 1. RECEIVED BY / STORES */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '85px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>1. Received By / Stores</span>
                  <span className="text-[8px] text-gray-500 font-normal">Internal</span>
                </div>
                <div className="text-[8.5px] text-gray-600 mt-0.5">
                  Officer: {grn.receivedBy || 'Stores Officer'}
                </div>
              </div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="flex justify-between items-center text-[8.5px] text-gray-700">
                  <span className="font-bold">Stores Signature</span>
                  <span>Date: ................</span>
                </div>
              </div>
            </div>

            {/* 2. INSPECTION / WORKSHOP */}
            <div className="p-2 flex flex-col justify-between bg-gray-50/30" style={{ minHeight: '85px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>2. Workshop / QC Check</span>
                  <span className="text-[8px] font-semibold text-emerald-800 bg-emerald-50 px-1 border border-emerald-300">Inspected</span>
                </div>
              </div>
              <div className="mt-auto pt-2">
                <div className="border-b border-dotted border-black mb-1"></div>
                <div className="flex justify-between items-center text-[8.5px] text-gray-700">
                  <span className="font-bold">Engineer / QC Sign</span>
                  <span>Date: ................</span>
                </div>
              </div>
            </div>

            {/* 3. HANDED OVER BY / CUSTOMER */}
            <div className="p-2 flex flex-col justify-between" style={{ minHeight: '85px' }}>
              <div>
                <div className="font-bold uppercase text-black text-[9.5px] flex items-center justify-between">
                  <span>3. Handed Over By</span>
                  <span className="text-[8px] text-gray-500 font-normal">Customer</span>
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
                  <span className="font-bold">Signature</span>
                  <span>Date: ................</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Half-page cut guide indicator for A4 sheet printing */}
        {isHalfPage && (
          <div className="hidden print:flex items-center justify-between text-[8.5px] text-gray-400 mt-2 px-1 pt-1 border-t border-dashed border-gray-400 w-full max-w-[794px] mx-auto print-avoid-break">
            <span>âœ‚ Cut here (A5 Half Page Sample GRN Slip)</span>
            <span>REX INDUSTRIES (PVT) LTD - ERP SYSTEM</span>
          </div>
        )}
      </div>
    </>
  );
};
