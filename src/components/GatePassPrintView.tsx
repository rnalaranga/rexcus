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
    if (typeof gatePass.items === 'string' && gatePass.items.startsWith('[')) {
      itemsList = JSON.parse(gatePass.items);
    } else if (Array.isArray(gatePass.items)) {
      itemsList = gatePass.items;
    } else if (gatePass.items) {
      itemsList = [{ description: gatePass.items, qty: 1, unit: 'Nos', remarks: '' }];
    }
  } catch (e) {
    itemsList = [{ description: String(gatePass.items || ''), qty: 1, unit: 'Nos', remarks: '' }];
  }

  const company = gatePass.customerCompany || gatePass.companyName || gatePass.leadCompany || gatePass.customerName || gatePass.leadName || 'N/A';
  const person = gatePass.attention || gatePass.personName || gatePass.customerName || gatePass.leadName || '';
  const address = gatePass.address || gatePass.customerAddress || '';
  const phone = gatePass.phone || gatePass.customerPhone || '';
  const email = gatePass.email || gatePass.customerEmail || '';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #gatepass-print-section, #gatepass-print-section * { visibility: visible !important; }
          #gatepass-print-section { position: absolute; left: 0; top: 0; width: 210mm; margin: 0; padding: 0; }
        }
      `}</style>
      
      <div 
        id="gatepass-print-section" 
        className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm" 
        style={{ width: '210mm', minHeight: '297mm', color: '#000', fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header Row */}
        <div className="flex border-b border-black">
          <div className="w-[30%] flex items-center justify-center p-4 border-r border-black bg-white">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="w-full object-contain" style={{ maxHeight: '80px' }} />
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
        <div className="bg-gray-100 border-b border-black text-center py-2.5 font-bold text-[16px] uppercase tracking-wider">
          {gatePass.type === 'goods_delivery' || gatePass.type === 'sales_delivery' ? 'GATE PASS (GOODS DISPATCH & DELIVERY)' : 'SAMPLE GATE PASS (OUTWARD)'}
        </div>

        {/* Details Section */}
        <div className="flex border-b border-black text-[13px]">
          {/* Left Side: Customer / Consignee Details */}
          <div className="w-[50%] p-3.5 pl-4 border-r border-black">
            <span className="font-bold italic underline mb-2 block text-[13px]">Customer / Consignee Details :</span>
            <div className="leading-snug space-y-0.5">
              <div className="font-bold text-[14px] text-black">{company}</div>
              {person && person !== company && (
                <div><span className="font-semibold text-gray-700">Attn:</span> {person}</div>
              )}
              {address && <div className="text-gray-800 whitespace-pre-line">{address}</div>}
              {phone && <div><span className="font-semibold text-gray-700">Tel:</span> {phone}</div>}
              {email && <div><span className="font-semibold text-gray-700">Email:</span> {email}</div>}
            </div>
          </div>

          {/* Right Side: Gate Pass Meta */}
          <div className="w-[50%] p-3.5 pl-4">
            <table className="w-full leading-snug">
              <tbody>
                <tr>
                  <td className="w-36 font-bold pb-1.5">Gate Pass No.</td>
                  <td className="font-bold pb-1.5">: <span className="font-mono text-[14px]">{gatePass.id}</span></td>
                </tr>
                <tr>
                  <td className="font-bold pb-1.5">Dated</td>
                  <td className="pb-1.5">: {formatDate(gatePass.issuedDate || gatePass.createdAt)}</td>
                </tr>
                {gatePass.orderNo && (
                  <tr>
                    <td className="font-bold pb-1.5">Sales Order Ref</td>
                    <td className="pb-1.5 font-mono font-bold text-blue-900">: {gatePass.orderNo}</td>
                  </tr>
                )}
                {(gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo) && (
                  <tr>
                    <td className="font-bold pb-1.5">Quotation Ref</td>
                    <td className="pb-1.5 font-semibold text-blue-900">: {gatePass.quoNo || gatePass.quotationDocNo || gatePass.displayQuoNo}</td>
                  </tr>
                )}
                {gatePass.grnId && (
                  <tr>
                    <td className="font-bold pb-1.5">Sample GRN Ref</td>
                    <td className="pb-1.5 font-mono">: {gatePass.grnId}</td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold pb-1.5">Carrier / Vehicle</td>
                  <td className="pb-1.5">: {gatePass.carrier || 'Hand Delivery'} {gatePass.vehicleNo ? `(${gatePass.vehicleNo})` : ''}</td>
                </tr>
                {gatePass.driverName && (
                  <tr>
                    <td className="font-bold pb-1.5">Driver / Contact</td>
                    <td className="pb-1.5">: {gatePass.driverName}</td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold">Purpose / Reason</td>
                  <td>: {gatePass.reason || 'Goods Delivery / Dispatch'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Area (Flex to stretch lines) */}
        <div className="flex-1 flex flex-col min-h-[460px]">
          {/* Table Header */}
          <div className="flex border-b border-black text-center font-bold text-[13px] bg-gray-50">
            <div className="w-12 py-2 border-r border-black">#</div>
            <div className="flex-1 py-2 border-r border-black text-left px-3">Item & Description</div>
            <div className="w-24 py-2 border-r border-black">Qty.</div>
            <div className="w-24 py-2 border-r border-black">Unit</div>
            <div className="w-44 py-2">Remarks / Condition</div>
          </div>

          {/* Table Body */}
          <div className="flex flex-1 text-[13px]">
            <div className="w-12 p-3 border-r border-black text-center leading-relaxed font-mono">
              {itemsList.map((_, idx) => (
                <div key={idx} className="py-0.5">{idx + 1}</div>
              ))}
            </div>
            <div className="flex-1 p-3 border-r border-black whitespace-pre-wrap leading-relaxed">
              {itemsList.map((item: any, idx: number) => (
                <div key={idx} className="py-0.5 font-medium">
                  {item.description || item.items || 'Sample Item'}
                </div>
              ))}
            </div>
            <div className="w-24 p-3 border-r border-black text-center leading-relaxed font-mono">
              {itemsList.map((item: any, idx: number) => (
                <div key={idx} className="py-0.5">
                  {Number(item.qty || 1).toFixed(2)}
                </div>
              ))}
            </div>
            <div className="w-24 p-3 border-r border-black text-center leading-relaxed">
              {itemsList.map((item: any, idx: number) => (
                <div key={idx} className="py-0.5">
                  {item.unit || 'Nos'}
                </div>
              ))}
            </div>
            <div className="w-44 p-3 text-left leading-relaxed text-[12px] text-gray-700">
              {itemsList.map((item: any, idx: number) => (
                <div key={idx} className="py-0.5">
                  {item.remarks || gatePass.notes || '-'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Special Instructions / Notes Banner */}
        {gatePass.notes && (
          <div className="border-t border-black p-3 bg-gray-50 text-[12px]">
            <span className="font-bold">Instructions / Dispatch Notes: </span>
            <span>{gatePass.notes}</span>
          </div>
        )}

        {/* Footer / Signatures matching Rex sample format */}
        <div className="border-t border-black p-4 pt-10 mt-auto bg-white">
          <div className="mb-4 pl-4 text-[13px] flex justify-between">
            <div>
              <span className="font-semibold text-gray-600">Issued By: </span>
              <span className="font-bold">{gatePass.issuedBy || 'System Admin'}</span>
            </div>
            <div className="text-gray-500 text-[11px]">
              Pass Type: Outward Non-Returnable / Sample Return
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center text-[12px] font-semibold">
            <div>
              <div className="border-t border-dotted border-black mb-1 mx-2"></div>
              Prepared By
            </div>
            <div>
              <div className="border-t border-dotted border-black mb-1 mx-2"></div>
              Checked By / Store
            </div>
            <div>
              <div className="border-t border-dotted border-black mb-1 mx-2"></div>
              Authorized / Manager
            </div>
            <div>
              <div className="border-t border-dotted border-black mb-1 mx-2"></div>
              Received By / Consignee
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
