import React from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';

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
  const logoUrl = settings?.company_logo || settings?.logo || settings?.companyLogo || '/rex-logo.png';
  const grnDateFormatted = grn.date ? formatDate(grn.date) : formatDate(grn.createdAt);
  const totalValue = items.reduce((sum, it) => sum + (Number(it.qtyReceived !== undefined ? it.qtyReceived : (it.qty || 0)) * Number(it.unitCost !== undefined ? it.unitCost : (it.unitPrice || 0))), 0);

  return (
    <div
      id="supplier-grn-print-section"
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
        #supplier-grn-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #supplier-grn-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; color: #000 !important; }
          #supplier-grn-print-section { border: 1px solid #000000 !important; max-width: 100% !important; }
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
                      {settings?.company_website || settings?.companyWebsite || settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top whitespace-nowrap" style={{ width: '56px', whiteSpace: 'nowrap' }}>TIN</td>
                <td className="align-top font-bold">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-900 font-mono whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                      {settings?.company_tin || settings?.company_vat || settings?.tax_id || settings?.tin || '114106470-7000'}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. DOCUMENT TITLE BAR ── */}
      <div className="border-b border-black py-1.5 px-3 bg-gray-50/70 text-center">
        <h2 className="text-[17px] font-black uppercase tracking-wider text-black m-0">
          GOODS RECEIPT NOTE (GRN)
        </h2>
      </div>

      {/* ── 3. SUPPLIER & GRN DETAILS ── */}
      <div className="flex border-b border-black text-[11px] leading-tight">
        {/* Left: Supplier Details (55%) */}
        <div className="w-[55%] p-2.5 border-r border-black flex flex-col justify-between">
          <div>
            <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-1">
              Received From / Supplier:
            </div>
            <div className="font-black text-[13px] text-black uppercase">
              {supp.company || supp.name || grn.supplierName || grn.supplierId || 'Direct Supplier'}
            </div>
            {supp.name && supp.name !== supp.company && (
              <div className="text-neutral-800 font-medium text-[11px] mt-0.5">
                Attn: {supp.name}
              </div>
            )}
            {supp.address && (
              <div className="text-neutral-700 whitespace-pre-line text-[10px] mt-0.5 leading-snug">
                {supp.address}
              </div>
            )}
            <div className="mt-1 space-y-0.5 text-[10px] text-neutral-800">
              {supp.phone && <div><span className="font-semibold">Tel:</span> {supp.phone}</div>}
              {supp.email && <div><span className="font-semibold">Email:</span> {supp.email}</div>}
              {grn.supplierId && <div><span className="font-semibold">Supplier ID:</span> <span className="font-mono">{grn.supplierId}</span></div>}
            </div>
          </div>
        </div>

        {/* Right: GRN Metadata (45%) */}
        <div className="w-[45%] p-2.5">
          <table className="w-full text-[11px] leading-relaxed">
            <tbody>
              <tr>
                <td className="font-bold py-0.5 w-24">GRN No.</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="font-black font-mono text-black text-[12px]">{grn.id}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">GRN Date</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="text-neutral-800 font-medium">{grnDateFormatted}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Ref. PO No.</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="font-mono font-bold text-black">
                    {poIds.length > 0 ? poIds.join(', ') : 'N/A (Direct GRN)'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Carrier / Vehicle</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="text-neutral-800 font-mono font-bold">{grn.vehicleNo || 'N/A'}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Storage Bay</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="text-neutral-800">{grn.storageLocation || 'Main Receiving Store'}</span>
                </td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Status</td>
                <td className="py-0.5">
                  <span className="font-bold mr-1">:</span>
                  <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {grn.status || 'Received'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. ITEMS RECEIVED TABLE ── */}
      <table className="w-full text-left text-[11px] border-b border-black">
        <thead>
          <tr className="bg-neutral-100 border-b border-black text-[10px] font-bold text-black uppercase tracking-wider">
            <th className="py-1.5 px-2 text-center w-7 border-r border-black">#</th>
            {poIds.length > 1 && (
              <th className="py-1.5 px-2 text-center w-20 border-r border-black">PO Ref</th>
            )}
            <th className="py-1.5 px-2 text-center w-20 border-r border-black">Code / ID</th>
            <th className="py-1.5 px-2 border-r border-black">Description & Material Specifications</th>
            <th className="py-1.5 px-2 text-center w-16 border-r border-black">Ordered</th>
            <th className="py-1.5 px-2 text-center w-16 border-r border-black">Received</th>
            <th className="py-1.5 px-2 text-right w-20 border-r border-black">Unit Rate</th>
            <th className="py-1.5 px-2 text-right w-24 border-r border-black">Total (LKR)</th>
            <th className="py-1.5 px-2 text-center w-20">Condition</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, idx: number) => {
            const qtyOrdered = Number(it.qty || 0);
            const qtyReceived = Number(it.qtyReceived !== undefined ? it.qtyReceived : (it.qty || 0));
            const unitCost = Number(it.unitCost !== undefined ? it.unitCost : (it.unitPrice || 0));
            const lineTotal = qtyReceived * unitCost;
            return (
              <tr key={idx} className="border-b border-neutral-300 text-black">
                <td className="py-1.5 px-2 text-center border-r border-black font-mono text-[10px]">
                  {idx + 1}
                </td>
                {poIds.length > 1 && (
                  <td className="py-1.5 px-2 text-center border-r border-black font-mono font-bold text-[10px]">
                    {it.poId || '-'}
                  </td>
                )}
                <td className="py-1.5 px-2 text-center border-r border-black font-mono text-[10px] text-neutral-700">
                  {it.inventoryId || it.code || it.itemCode || '-'}
                </td>
                <td className="py-1.5 px-2 border-r border-black">
                  <div className="font-bold text-black">{it.desc || it.name || it.description || 'Inventory Item'}</div>
                  {it.notes && (
                    <div className="text-[10px] text-neutral-600 mt-0.5 italic">{it.notes}</div>
                  )}
                  {(it.batchNo || it.heatNo) && (
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {it.batchNo ? `Batch: ${it.batchNo} ` : ''}
                      {it.heatNo ? `Heat: ${it.heatNo}` : ''}
                    </div>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center border-r border-black font-mono text-neutral-700">
                  {poIds.length > 0 ? `${qtyOrdered} ${it.unit || ''}` : '-'}
                </td>
                <td className="py-1.5 px-2 text-center border-r border-black font-mono font-bold text-black">
                  {qtyReceived} {it.unit || ''}
                </td>
                <td className="py-1.5 px-2 text-right border-r border-black font-mono text-neutral-800">
                  {formatCurrency(unitCost, true)}
                </td>
                <td className="py-1.5 px-2 text-right border-r border-black font-mono font-bold text-black">
                  {formatCurrency(lineTotal, true)}
                </td>
                <td className="py-1.5 px-2 text-center font-bold text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    it.condition === 'Damaged' || it.condition === 'Rejected'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {it.condition || 'Good'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-50 font-bold border-t-2 border-black">
            <td colSpan={poIds.length > 1 ? 6 : 5} className="py-2 px-3 text-right uppercase text-[10px] tracking-wider border-r border-black">
              Total Received Valuation (LKR):
            </td>
            <td colSpan={2} className="py-2 px-3 text-right font-mono font-black text-[12px] text-black border-r border-black">
              {formatCurrency(totalValue, true)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* ── 5. QUALITY REMARKS & QA LOGISTICS ── */}
      <div className="p-3 border-b border-black text-[11px] leading-relaxed bg-gray-50/50">
        <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-700 mb-1">
          Quality Inspection & Verification Remarks:
        </div>
        <p className="text-neutral-800 m-0">
          {grn.notes || 'All materials received in acceptable physical condition, verified against delivery documents and dispatched into designated warehouse bay.'}
        </p>
        {(grn.heatNo || grn.batchNo || grn.mtrCertNo) && (
          <div className="mt-2 pt-2 border-t border-neutral-300 grid grid-cols-3 gap-2 text-[10px] font-mono text-neutral-700">
            {grn.heatNo && <div><span className="font-bold">Heat / Melt #:</span> {grn.heatNo}</div>}
            {grn.batchNo && <div><span className="font-bold">Lot / Batch #:</span> {grn.batchNo}</div>}
            {grn.mtrCertNo && <div><span className="font-bold">MTR / QA Cert #:</span> {grn.mtrCertNo}</div>}
          </div>
        )}
      </div>

      {/* ── 6. AUTHORIZED SIGNATURES ── */}
      <div className="p-3">
        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
          Authorized Verification & Stores Acceptance:
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Box 1: Received By */}
          <div className="border border-black p-2 flex flex-col justify-between h-24">
            <div className="text-[10px] font-bold uppercase text-neutral-600">
              1. Inspected & Received By:
            </div>
            <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
              <div className="font-bold text-[11px] text-black">
                {grn.receivedBy || 'Receiving Officer / Stores'}
              </div>
              <div className="text-[9px] text-neutral-500">Warehouse Receiving Section</div>
            </div>
          </div>

          {/* Box 2: Quality Inspection */}
          <div className="border border-black p-2 flex flex-col justify-between h-24">
            <div className="text-[10px] font-bold uppercase text-neutral-600">
              2. Quality Checked By:
            </div>
            <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
              <div className="font-bold text-[11px] text-black">QA / QC Inspector</div>
              <div className="text-[9px] text-neutral-500">Date: .......................................</div>
            </div>
          </div>

          {/* Box 3: Stores Manager Authorization */}
          <div className="border border-black p-2 flex flex-col justify-between h-24">
            <div className="text-[10px] font-bold uppercase text-neutral-600">
              3. Stores Manager / Authorization:
            </div>
            <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
              <div className="font-bold text-[11px] text-black">Stores Manager / Head of Logistics</div>
              <div className="text-[9px] text-neutral-500">Authorized Signature & Stamp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
