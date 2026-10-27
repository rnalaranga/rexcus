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

  return (
    <div id="grn-print-section" className="bg-white mx-auto border border-black flex flex-col justify-between shadow-sm" style={{ width: '100%', maxWidth: '794px', minHeight: 'auto', color: '#000', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
      
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
          <h1 className="text-[20px] font-black uppercase text-black mb-1">
            {settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}
          </h1>
          <table className="w-full text-[12px] leading-tight">
            <tbody>
              <tr>
                <td className="font-bold align-top w-16 pb-1">Office</td>
                <td className="pb-1">: {settings?.company_address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}</td>
              </tr>
              <tr>
                <td className="font-bold pb-1">Tel.</td>
                <td className="pb-1">: {settings?.company_phone || '0094-31-2233117 / 2233315 / 2223136'}</td>
              </tr>
              <tr>
                <td className="font-bold pb-1">E-mail</td>
                <td className="pb-1">: {settings?.company_email || 'info@rexgroup.lk'}</td>
              </tr>
              <tr>
                <td className="font-bold">Web</td>
                <td>: {settings?.company_web || 'www.rexgroup.lk'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Title Bar */}
      <div className="bg-gray-100 border-b border-black text-center py-2 font-bold text-[14px] uppercase tracking-wide">
        SAMPLE GOODS RECEIPT NOTE
      </div>

      {/* Details Section */}
      <div className="flex border-b border-black text-[13px]">
        <div className="w-[50%] p-3 pl-4 border-r border-black">
          <span className="font-bold italic underline mb-1 block">Supplier Details :</span>
          <div className="leading-snug">
            <span className="font-bold text-black">{group?.leadCompany || grn?.customerCompany || group?.leadName || grn?.customerName || group?.company || group?.name || 'N/A'}</span><br/>
            {group?.address && <>{group.address}<br/></>}
            {group?.phone && <>{group.phone}<br/></>}
            {group?.email && <>{group.email}</>}
          </div>
        </div>
        <div className="w-[50%] p-3 pl-4">
          <table className="w-full leading-snug">
            <tbody>
              <tr><td className="w-32 font-bold pb-1">GRN No.</td><td>: <span className="font-mono font-bold">{grn.id}</span></td></tr>
              <tr><td className="font-bold pb-1">Dated</td><td>: {formatDate(grn.receivedAt || grn.createdAt)}</td></tr>
              <tr><td className="font-bold pb-1">Supplier Bill No</td><td>: {group?.quoNo || '-'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Area with real HTML table for perfect row alignment */}
      <div className="flex-1 min-h-[350px]">
        <table className="w-full text-[13px] border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '65%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-black text-center font-bold bg-gray-50 text-[13px]">
              <th className="py-2 px-3 border-r border-black text-left">Item & Description</th>
              <th className="py-2 px-3 border-r border-black text-center">Qty.</th>
              <th className="py-2 px-3 text-center">Unit</th>
            </tr>
          </thead>
          <tbody>
            {itemsList.length > 0 ? (
              itemsList.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-2.5 px-3 border-r border-black font-medium align-top whitespace-pre-wrap">
                    {item.description || item.items || item.name || 'Sample Item'}
                  </td>
                  <td className="py-2.5 px-3 border-r border-black text-center align-top font-mono font-bold">
                    {Number(item.qty || 1).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center align-top font-medium">
                    {item.unit || item.uom || 'Nos'}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-300">
                <td className="py-2.5 px-3 border-r border-black font-medium align-top whitespace-pre-wrap">
                  {grn.items || 'Sample Goods'}
                </td>
                <td className="py-2.5 px-3 border-r border-black text-center align-top font-mono font-bold">
                  1.00
                </td>
                <td className="py-2.5 px-3 text-center align-top font-medium">
                  Nos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Attached Inspection Photos if present */}
      {photosList.length > 0 && (
        <div className="border-t border-black p-3 bg-white">
          <p className="font-bold text-[12px] uppercase mb-2">Sample Inspection Photos ({photosList.length}):</p>
          <div className="flex flex-wrap gap-2">
            {photosList.map((p: any, idx: number) => (
              <div key={idx} className="border border-black p-1 text-center" style={{ width: '120px' }}>
                <img src={p.url} alt={p.name || 'Sample photo'} style={{ maxHeight: '90px', width: '100%', objectFit: 'contain' }} />
                <p className="text-[10px] truncate mt-1">{p.name || `Photo ${idx + 1}`}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
  );
};
