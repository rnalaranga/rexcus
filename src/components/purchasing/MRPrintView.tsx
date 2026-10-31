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

  return (
    <div
      id="mr-print-section"
      className="bg-white text-black p-8 border border-neutral-300 font-sans mx-auto text-xs"
      style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', color: '#000', boxSizing: 'border-box' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">
            {settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            {settings?.company_address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, Sri Lanka'}
          </p>
          <p className="text-xs text-neutral-600">
            Tel: {settings?.company_phone || '+94 31 2233117'} • Email: {settings?.company_email || 'info@rexgroup.lk'}
          </p>
        </div>
        <div className="text-right">
          <div className="bg-neutral-900 text-white font-black text-sm px-3.5 py-1.5 uppercase tracking-widest inline-block shadow-sm">
            MATERIAL REQUISITION NOTE
          </div>
          <p className="text-sm font-mono font-bold mt-2 text-black">MR #: {mr.id}</p>
          <p className="text-xs text-neutral-600">Date: {formatDate(mr.date || mr.createdAt)}</p>
          <p className="text-xs text-neutral-600">
            Required By: <span className="font-semibold text-black">{mr.requiredDate ? formatDate(mr.requiredDate) : 'Immediate'}</span>
          </p>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-5 text-xs">
        <div className="space-y-1.5 border-r border-black/30 pr-4">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Requisition Information:</p>
          <p className="text-neutral-700">
            <strong>Department:</strong> <span className="font-semibold text-black">{mr.department || 'Production / Engineering'}</span>
          </p>
          <p className="text-neutral-700">
            <strong>Requested By:</strong> <span className="font-semibold text-black">{mr.requestedBy || 'Store Officer'}</span>
          </p>
          <p className="text-neutral-700">
            <strong>Priority:</strong>{' '}
            <span className={`font-bold uppercase ${
              mr.priority === 'urgent' ? 'text-red-700' : mr.priority === 'high' ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {mr.priority || 'Normal'}
            </span>
          </p>
        </div>

        <div className="space-y-1.5 pl-2">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Production & Tracking:</p>
          <p className="text-neutral-700">
            <strong>Linked Work Order(s):</strong>{' '}
            <span className="font-mono font-bold text-purple-700">
              {workOrders.length > 0 ? workOrders.join(', ') : 'General Inventory / Maintenance'}
            </span>
          </p>
          <p className="text-neutral-700">
            <strong>Current MR Status:</strong>{' '}
            <span className="font-bold uppercase text-emerald-800">{mr.status || 'Pending'}</span>
          </p>
          {mr.poId && (
            <p className="text-neutral-700">
              <strong>Generated PO:</strong> <span className="font-mono font-bold text-blue-700">{mr.poId}</span>
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-black mb-5 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-black text-[10px] uppercase font-bold text-neutral-800">
              <th className="p-2.5 border-r border-black w-10 text-center">#</th>
              <th className="p-2.5 border-r border-black">Item & Technical Description</th>
              <th className="p-2.5 border-r border-black text-right w-24">Req. Qty</th>
              <th className="p-2.5 border-r border-black text-center w-24">Unit</th>
              <th className="p-2.5 text-left">Purpose / Specifications</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            {items.map((it: any, idx: number) => (
              <tr key={idx}>
                <td className="p-2.5 border-r border-black text-center font-mono text-neutral-600">{idx + 1}</td>
                <td className="p-2.5 border-r border-black">
                  <p className="font-bold text-black">{it.desc || it.name || it.inventoryId || 'Item'}</p>
                  {it.inventoryId && it.desc && (
                    <p className="text-[10px] font-mono text-neutral-500">Item Code: {it.inventoryId}</p>
                  )}
                </td>
                <td className="p-2.5 border-r border-black text-right font-mono font-bold text-black">
                  {it.qty || 1}
                </td>
                <td className="p-2.5 border-r border-black text-center font-mono text-neutral-700">
                  {it.unit || it.uom || 'Nos'}
                </td>
                <td className="p-2.5 text-neutral-700">
                  {it.notes || it.remarks || it.purpose || it.spec || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks & Justification */}
      <div className="border border-black p-3 mb-8 bg-neutral-50">
        <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-600 mb-1">
          Requisition Remarks / Justification:
        </p>
        <p className="text-neutral-800 whitespace-pre-line leading-relaxed">
          {mr.notes || 'Materials requested for factory operational and manufacturing requirements.'}
        </p>
      </div>

      {/* Approvals / Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-16 pt-4 border-t border-neutral-300 text-xs">
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">{mr.requestedBy || 'Initiator'}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Requested By</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">Head of Department / Engineer</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Verified & Endorsed</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">Procurement & Stores Head</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Approved for Purchase</p>
          </div>
        </div>
      </div>
    </div>
  );
};
