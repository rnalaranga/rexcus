import React from 'react';
import { formatDate } from '@/lib/utils';

export interface MRPrintViewProps {
  mr: any;
  settings?: any;
}

export const MRPrintView: React.FC<MRPrintViewProps> = ({ mr, settings }) => {
  if (!mr) return null;

  let items: any[] = [];
  try {
    if (typeof mr.items === 'string') items = JSON.parse(mr.items);
    else if (Array.isArray(mr.items)) items = mr.items;
  } catch {
    items = [];
  }

  let workOrders: string[] = [];
  try {
    if (Array.isArray(mr.workOrderNos)) workOrders = mr.workOrderNos;
    else if (typeof mr.workOrderNos === 'string') {
      const p = JSON.parse(mr.workOrderNos);
      workOrders = Array.isArray(p) ? p : [mr.workOrderNos];
    }
  } catch {
    workOrders = mr.workOrderNo ? [mr.workOrderNo] : [];
  }
  if (mr.workOrderNo && !workOrders.includes(mr.workOrderNo)) {
    workOrders.unshift(mr.workOrderNo);
  }

  const logoUrl = settings?.company_logo || settings?.logo || settings?.companyLogo || '/rex-logo.png';

  return (
    <div
      id="mr-print-section"
      className="bg-white text-black font-sans mx-auto text-xs"
      style={{
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        padding: '0',
        color: '#000000',
        backgroundColor: '#ffffff',
        border: '1px solid #000000',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif'
      }}
    >
      <style>{`
        #mr-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #mr-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; color: #000 !important; }
          #mr-print-section { border: 1px solid #000000 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* ── 1. HEADER (Signature Rex Industries standard format - exact Quotation match) ── */}
      <div className="flex p-3 border-b border-black items-center">
        {/* Logo (Left 32%) */}
        <div className="w-[32%] flex justify-center items-center">
          {settings?.company_logo
            ? <img src={settings.company_logo} alt="Logo" className="max-h-20 object-contain" />
            : <div className="text-4xl font-black text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>REX</div>}
        </div>

        {/* Company Info (Right 68%) */}
        <div className="w-[68%] pl-3">
          <h1
            className="text-[19px] font-black mb-1 leading-tight tracking-tight text-black"
            style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}
          >
            {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
          </h1>
          <table className="text-[11px] leading-tight w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <tbody>
              <tr>
                <td className="font-bold w-14 align-top whitespace-nowrap" style={{ width: '56px', whiteSpace: 'nowrap' }}>Office</td>
                <td className="align-top">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 whitespace-pre-line text-neutral-800">
                      {settings?.company_address || settings?.companyAddress || 'No.451/2,Chilaw Road, Kattuwa,\nNegombo,11500,Sri Lanka'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top whitespace-nowrap" style={{ width: '56px', whiteSpace: 'nowrap' }}>Tel.</td>
                <td className="align-top">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                      {settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top whitespace-nowrap" style={{ width: '56px', whiteSpace: 'nowrap' }}>E-mail</td>
                <td className="align-top">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                      {settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top whitespace-nowrap" style={{ width: '56px', whiteSpace: 'nowrap' }}>Web</td>
                <td className="align-top">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                      {settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. DOCUMENT TITLE BAR ── */}
      <div className="text-center font-bold text-[14px] py-1 border-b border-black tracking-widest uppercase bg-gray-50/70">
        MATERIAL REQUISITION NOTE
      </div>

      {/* ── 3. METADATA GRID ── */}
      <div className="flex border-b border-black text-[11px]">
        {/* REQUISITION INFO (Left 55%) */}
        <div className="w-[55%] p-2.5 border-r border-black flex flex-col justify-between">
          <div className="space-y-1">
            <div className="font-bold italic text-[10px] text-gray-700">REQUISITION SOURCE</div>
            <div className="flex items-start">
              <span className="w-24 font-bold shrink-0">Department</span>
              <span className="font-bold mr-1 shrink-0">:</span>
              <span className="flex-1 font-semibold text-black">{mr.department || 'Production / Factory'}</span>
            </div>
            <div className="flex items-start">
              <span className="w-24 font-bold shrink-0">Requested By</span>
              <span className="font-bold mr-1 shrink-0">:</span>
              <span className="flex-1 font-semibold text-black">{mr.requestedBy || 'Store Officer'}</span>
            </div>
            <div className="flex items-start">
              <span className="w-24 font-bold shrink-0">Priority Level</span>
              <span className="font-bold mr-1 shrink-0">:</span>
              <span className={`font-bold uppercase ${
                mr.priority === 'urgent' ? 'text-red-700' : mr.priority === 'high' ? 'text-amber-700' : 'text-blue-700'
              }`}>
                {mr.priority || 'Normal'}
              </span>
            </div>
          </div>
        </div>

        {/* ORDER / TRACKING DETAILS (Right 45%) */}
        <div className="w-[45%] p-0">
          <table className="w-full h-full text-[11px]">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold w-28 bg-gray-50/50">MR DATE</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{formatDate(mr.date || mr.createdAt)}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">MR NO</td>
                <td className="p-1.5 font-bold font-mono text-black text-[12px]">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{mr.id}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">REQUIRED BY</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 font-semibold">{mr.requiredDate ? formatDate(mr.requiredDate) : 'Immediate'}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">LINKED WO(S)</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 font-bold text-purple-700">{workOrders.length > 0 ? workOrders.join(', ') : 'General / Stock'}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">MR STATUS</td>
                <td className="p-1.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="font-bold uppercase text-emerald-800">{mr.status || 'Pending'}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. ITEMS TABLE ── */}
      <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed', borderSpacing: 0 }}>
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '52%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <thead>
          <tr className="font-bold border-b border-black text-center bg-gray-50 text-[10.5px]">
            <th className="p-1.5 border-r border-black font-bold text-center">NO</th>
            <th className="p-1.5 border-r border-black font-bold text-center">ITEM & TECHNICAL DESCRIPTION</th>
            <th className="p-1.5 border-r border-black font-bold text-center">REQ. QTY</th>
            <th className="p-1.5 font-bold text-center">PURPOSE / SPECIFICATIONS</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, idx: number) => (
            <tr key={idx} className="border-b border-black/20">
              <td className="p-2 border-r border-black text-center align-top font-mono text-neutral-600">
                {idx + 1}
              </td>
              <td className="p-2 border-r border-black align-top">
                <div className="font-bold text-black leading-tight">
                  {it.desc || it.name || it.inventoryId || 'Item'}
                </div>
                {it.inventoryId && (it.desc || it.name) && (
                  <div className="text-[9.5px] font-mono text-neutral-500 mt-0.5">
                    Item Code: {it.inventoryId}
                  </div>
                )}
              </td>
              <td className="p-2 border-r border-black text-center align-top font-mono font-bold text-black">
                {it.qty || 1} {it.unit || it.uom || 'Nos'}
              </td>
              <td className="p-2 align-top text-neutral-700">
                {it.notes || it.remarks || it.purpose || it.spec || '-'}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-gray-400 italic">
                No requisition line items entered.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── 5. REMARKS / JUSTIFICATION ── */}
      <div className="p-3 border-t border-b border-black text-[10.5px]">
        <div className="font-bold underline uppercase text-neutral-800 text-[10px] mb-1">
          Remarks & Operational Justification:
        </div>
        <div className="whitespace-pre-line text-neutral-800 leading-relaxed">
          {mr.notes || 'Materials requested for factory operational, fabrication, and engineering requirements.'}
        </div>
      </div>

      {/* ── 6. SIGNATURES (Rex Standard 3-box approval) ── */}
      <div className="grid grid-cols-3 border-collapse text-center text-[10px]">
        <div className="p-3 border-r border-black flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">REQUESTED BY</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">{mr.requestedBy || 'Initiator'}</div>
            <div className="text-neutral-500 text-[9.5px]">Operations Officer</div>
          </div>
        </div>

        <div className="p-3 border-r border-black flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">VERIFIED & ENDORSED</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">Head of Department / Engineer</div>
            <div className="text-neutral-500 text-[9.5px]">Technical Assessment</div>
          </div>
        </div>

        <div className="p-3 flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">PURCHASING APPROVAL</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">Procurement & Stores Head</div>
            <div className="text-neutral-500 text-[9.5px]">Rex Industries (Pvt) Ltd</div>
          </div>
        </div>
      </div>
    </div>
  );
};
