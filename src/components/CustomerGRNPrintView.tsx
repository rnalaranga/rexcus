import React from 'react';
import { formatDate } from '@/lib/utils';

export const CustomerGRNPrintView: React.FC<{ grn: any, group: any, settings: any }> = ({ grn, group, settings }) => {
  // Try to parse items string if it's JSON
    let itemsList: any[] = [];
  try {
    if (typeof grn.items === 'string' && grn.items.startsWith('[')) {
      itemsList = JSON.parse(grn.items);
    } else if (grn.items) {
      itemsList = [{ description: grn.items, qty: 1 }];
    }
  } catch (e) {
    itemsList = [{ description: grn.items, qty: 1 }];
  }

  return (
    
      <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #grn-print-section, #grn-print-section * { visibility: visible; }
          #grn-print-section { position: absolute; left: 0; top: 0; width: 210mm; }
        }
      `}</style>
    <div id="grn-print-section" className="bg-white mx-auto border border-black flex flex-col" style={{ width: '210mm', minHeight: '297mm', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Row */}
      <div className="flex border-b border-black">
        <div className="w-[30%] flex items-center justify-center p-4 border-r border-black">
          {settings?.company_logo ? (
            <img src={settings.company_logo} alt="Logo" className="w-full object-contain" style={{ maxHeight: '80px' }} />
          ) : (
            <div className="text-3xl text-red-600 font-bold flex items-center gap-2 tracking-tighter">
               <span className="text-5xl">⚙️</span> REX
            </div>
          )}
        </div>
        <div className="w-[70%] p-4 pl-6 text-[13px] leading-tight">
          <h1 className="text-[22px] font-black uppercase text-black mb-1">REX INDUSTRIES (PVT) LTD</h1>
          <table className="w-full text-[13px]">
            <tbody>
              <tr><td className="font-bold align-top w-16 pb-1">Office</td><td className="pb-1">:No.451/2,Chilaw Road,, Kattuwa,<br/>:Negombo,11500,Sri Lanka</td></tr>
              <tr><td className="font-bold pb-1">Tel.</td><td className="pb-1">:0094-31-2233117 / 2233315 / 2223136</td></tr>
              <tr><td className="font-bold pb-1">E-mail</td><td className="pb-1">:info@rexgroup.lk</td></tr>
              <tr><td className="font-bold">Web</td><td>:www.rexgroup.lk</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Title Bar */}
      <div className="bg-gray-100 border-b border-black text-center py-2 font-bold text-[15px] uppercase tracking-wide">
        SAMPLE GOODS RECEIPT NOTE
      </div>

      {/* Details Section */}
      <div className="flex border-b border-black">
        <div className="w-[50%] p-3 pl-4 border-r border-black text-[14px]">
          <span className="font-bold italic underline mb-2 block">Supplier Details :</span>
          <div className="leading-snug">
            {group?.leadCompany || grn?.customerCompany || group?.leadName || grn?.customerName || group?.company || group?.name || 'N/A'}<br/>
            {group?.address || ''}<br/>
            {group?.phone || ''}<br/>
            {group?.email || ''}
          </div>
        </div>
        <div className="w-[50%] p-3 pl-4 text-[14px]">
          <table className="w-full">
            <tbody>
              <tr><td className="w-32 pb-1">GRN No.</td><td>: {grn.id}</td></tr>
              <tr><td className="pb-1">Dated</td><td>: {formatDate(grn.receivedAt || grn.createdAt)}</td></tr>
              <tr><td className="pb-1">Supplier Bill No</td><td>: {group?.quoNo || ''}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Area (Flex to stretch lines) */}
      <div className="flex-1 flex flex-col min-h-[500px]">
        {/* Table Header */}
        <div className="flex border-b border-black text-center font-bold text-[14px]">
          <div className="flex-1 py-2 border-r border-black">Item & Description</div>
          <div className="w-32 py-2 border-r border-black">Qty.</div>
          <div className="w-32 py-2">unit</div>
        </div>
        {/* Table Body */}
        <div className="flex flex-1">
          <div className="flex-1 p-4 border-r border-black text-[14px] whitespace-pre-wrap leading-relaxed">
            {itemsList.length > 0 ? itemsList.map((i:any) => i.description || i.items).join('\n') : grn.items}
          </div>
          <div className="w-32 p-4 border-r border-black text-[14px] text-center leading-relaxed">
            {itemsList.length > 0 ? itemsList.map((i:any) => Number(i.qty || 1).toFixed(2)).join('\n') : '1.00'}
          </div>
          <div className="w-32 p-4 text-[14px] text-center leading-relaxed">
            {itemsList.length > 0 ? itemsList.map((i:any) => i.unit || 'Nos').join('\n') : 'Nos'}
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="border-t border-black p-4 pt-8 mt-auto bg-white">
        <div className="mb-2 pl-4 text-[14px]">{grn.receivedBy || 'System Admin'}</div>
        <div className="grid grid-cols-4 gap-4 text-center text-[13px]">
          <div>
            <div className="border-t border-dotted border-black mb-1 mx-2"></div>
            Prepared By
          </div>
          <div>
            <div className="border-t border-dotted border-black mb-1 mx-2 mt-5"></div>
            Checked By
          </div>
          <div>
            <div className="border-t border-dotted border-black mb-1 mx-2 mt-5"></div>
            Approved By
          </div>
          <div>
            <div className="border-t border-dotted border-black mb-1 mx-2 mt-5"></div>
            Received By
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
