import React from 'react';
import { formatDate } from '@/lib/utils';

export interface SupplierGRNPrintViewProps {
  grn: any;
  supplier?: any;
  settings?: any;
}

export const SupplierGRNPrintView: React.FC<SupplierGRNPrintViewProps> = ({ grn, supplier, settings }) => {
  if (!grn) return null;

  let items: any[] = [];
  try {
    if (typeof grn.items === 'string') items = JSON.parse(grn.items);
    else if (Array.isArray(grn.items)) items = grn.items;
  } catch {
    items = [];
  }

  let poIds: string[] = [];
  try {
    if (Array.isArray(grn.poIds)) poIds = grn.poIds;
    else if (typeof grn.poIds === 'string') {
      const p = JSON.parse(grn.poIds);
      poIds = Array.isArray(p) ? p : [grn.poIds];
    }
  } catch {
    poIds = grn.poId ? [grn.poId] : [];
  }
  if (grn.poId && !poIds.includes(grn.poId)) {
    poIds.unshift(grn.poId);
  }

  const supp = supplier || grn.supplier || {};

  return (
    <div
      id="supplier-grn-print-section"
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
            GOODS RECEIPT NOTE (GRN)
          </div>
          <p className="text-sm font-mono font-bold mt-2 text-black">GRN #: {grn.id}</p>
          <p className="text-xs text-neutral-600">Date: {formatDate(grn.date || grn.createdAt)}</p>
          <p className="text-xs text-neutral-600">
            Status: <span className="font-bold uppercase text-emerald-800">{grn.status || 'Received'}</span>
          </p>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-5 text-xs">
        <div className="space-y-1.5 border-r border-black/30 pr-4">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Supplier Details:</p>
          <p className="font-bold text-sm text-black">
            {supp.name || supp.company || grn.supplierName || grn.supplierId || 'Supplier'}
          </p>
          {supp.company && supp.company !== supp.name && (
            <p className="text-neutral-700 font-medium">{supp.company}</p>
          )}
          <p className="text-neutral-700">Supplier ID: <span className="font-mono">{grn.supplierId || supp.id || 'N/A'}</span></p>
          <p className="text-neutral-700">
            Ref PO Number(s):{' '}
            <span className="font-mono font-bold text-blue-800">
              {poIds.length > 0 ? poIds.join(', ') : 'N/A (Direct Receipt)'}
            </span>
          </p>
        </div>

        <div className="space-y-1.5 pl-2">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Delivery Logistics & QA:</p>
          <p className="text-neutral-700">
            Vehicle / Carrier: <span className="font-mono font-bold text-black">{grn.vehicleNo || 'N/A'}</span>
          </p>
          <p className="text-neutral-700">
            Storage Bay: <span className="font-medium text-black">{grn.storageLocation || 'Main Warehouse - Receiving Bay'}</span>
          </p>
          <p className="text-neutral-700">
            Inspected & Received By: <span className="font-medium text-black">{grn.receivedBy || 'Store Officer'}</span>
          </p>
          {(grn.heatNo || grn.batchNo || grn.mtrCertNo) && (
            <div className="pt-1 text-[11px] font-mono text-neutral-600 space-y-0.5">
              {grn.heatNo && <div>Heat #: {grn.heatNo}</div>}
              {grn.batchNo && <div>Batch #: {grn.batchNo}</div>}
              {grn.mtrCertNo && <div>MTR Cert #: {grn.mtrCertNo}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-black mb-5 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-black text-[10px] uppercase font-bold text-neutral-800">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              {poIds.length > 1 && <th className="p-2 border-r border-black text-center w-24">PO #</th>}
              <th className="p-2 border-r border-black">Item & Description</th>
              <th className="p-2 border-r border-black text-center w-24">Ordered</th>
              <th className="p-2 border-r border-black text-center w-24">Received</th>
              <th className="p-2 border-r border-black text-center w-24">Variance</th>
              <th className="p-2 text-center w-28">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            {items.map((it: any, idx: number) => {
              const qtyOrdered = Number(it.qty || 0);
              const qtyReceived = Number(it.qtyReceived || 0);
              const variance = poIds.length > 0 ? (qtyReceived - qtyOrdered) : 0;
              return (
                <tr key={idx}>
                  <td className="p-2 border-r border-black text-center font-mono text-neutral-600">{idx + 1}</td>
                  {poIds.length > 1 && (
                    <td className="p-2 border-r border-black text-center font-mono font-bold text-blue-700">
                      {it.poId || '-'}
                    </td>
                  )}
                  <td className="p-2 border-r border-black">
                    <p className="font-bold text-black">{it.desc || it.name || it.inventoryId || 'Item'}</p>
                    {it.inventoryId && it.desc && (
                      <p className="text-[10px] font-mono text-neutral-500">ID: {it.inventoryId}</p>
                    )}
                  </td>
                  <td className="p-2 border-r border-black text-center font-mono text-neutral-700">
                    {poIds.length > 0 ? `${qtyOrdered} ${it.unit || ''}` : '-'}
                  </td>
                  <td className="p-2 border-r border-black text-center font-mono font-bold text-black">
                    {qtyReceived} {it.unit || ''}
                  </td>
                  <td className="p-2 border-r border-black text-center font-mono">
                    {poIds.length > 0 ? (
                      variance === 0 ? '0' : (variance > 0 ? `+${variance}` : String(variance))
                    ) : 'Direct'}
                  </td>
                  <td className="p-2 text-center font-semibold text-[11px]">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      it.condition === 'Damaged' || it.condition === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {it.condition || 'Good'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inspection Remarks */}
      <div className="border border-black p-3 mb-8 bg-neutral-50">
        <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-600 mb-1">
          Quality Inspection Remarks:
        </p>
        <p className="text-neutral-800 whitespace-pre-line leading-relaxed">
          {grn.notes || 'All materials received in acceptable physical condition and stored in designated warehouse bay.'}
        </p>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-16 mt-16 pt-4 border-t border-neutral-300 text-xs">
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">{grn.receivedBy || 'Warehouse Officer'}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Inspected & Received By</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">Stores Manager / Head of Logistics</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Authorized Store Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
