import React from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';

export interface POPrintViewProps {
  po: any;
  supplier?: any;
  settings?: any;
}

export const POPrintView: React.FC<POPrintViewProps> = ({ po, supplier, settings }) => {
  if (!po) return null;

  let items: any[] = [];
  try {
    if (typeof po.items === 'string') items = JSON.parse(po.items);
    else if (Array.isArray(po.items)) items = po.items;
  } catch {
    items = [];
  }

  let mrIds: string[] = [];
  try {
    if (Array.isArray(po.mrIds)) mrIds = po.mrIds;
    else if (typeof po.mrIds === 'string') {
      const p = JSON.parse(po.mrIds);
      mrIds = Array.isArray(p) ? p : [po.mrIds];
    }
  } catch {
    mrIds = po.mrId ? [po.mrId] : [];
  }
  if (po.mrId && !mrIds.includes(po.mrId)) {
    mrIds.unshift(po.mrId);
  }

  let taxBreakdown: any = null;
  try {
    if (po.taxBreakdown) {
      taxBreakdown = typeof po.taxBreakdown === 'string' ? JSON.parse(po.taxBreakdown) : po.taxBreakdown;
    }
  } catch {
    taxBreakdown = null;
  }

  const supp = supplier || po.supplier || {};
  const subtotal = Number(po.subtotal || 0);
  const tax = Number(po.tax || 0);
  const shippingCost = Number(po.shippingCost || 0);
  const totalAmount = Number(po.totalAmount || (subtotal + tax + shippingCost));
  const totalDiscount = items.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);

  return (
    <div
      id="po-print-section"
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
          {settings?.tax_number && (
            <p className="text-xs text-neutral-600 font-bold mt-0.5">
              VAT No: {settings.tax_number}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="bg-neutral-900 text-white font-black text-sm px-3.5 py-1.5 uppercase tracking-widest inline-block shadow-sm">
            PURCHASE ORDER
          </div>
          <p className="text-sm font-mono font-bold mt-2 text-black">PO #: {po.id}</p>
          <p className="text-xs text-neutral-600">Date: {formatDate(po.date || po.createdAt)}</p>
          <p className="text-xs text-neutral-600">
            Expected: <span className="font-semibold text-black">{po.expectedDate ? formatDate(po.expectedDate) : 'Immediate / ASAP'}</span>
          </p>
          {mrIds.length > 0 && (
            <p className="text-[11px] font-mono font-semibold text-blue-700 mt-0.5">
              Ref MR: {mrIds.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Vendor & Shipping Details */}
      <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-5 text-xs">
        <div className="space-y-1 border-r border-black/30 pr-4">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Vendor / Supplier:</p>
          <p className="font-bold text-sm text-black">{supp.name || supp.company || po.supplierId || 'Supplier'}</p>
          {supp.company && supp.company !== supp.name && (
            <p className="text-neutral-700 font-medium">{supp.company}</p>
          )}
          {supp.address && <p className="text-neutral-600">{supp.address}</p>}
          {(supp.phone || supp.phone1 || supp.mobile) && (
            <p className="text-neutral-700">Phone: {supp.phone || supp.phone1 || supp.mobile}</p>
          )}
          {supp.email && <p className="text-neutral-700">Email: {supp.email}</p>}
          {supp.vat && <p className="text-neutral-700 font-semibold">VAT No: {supp.vat}</p>}
        </div>

        <div className="space-y-1 pl-2">
          <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Shipping & Payment:</p>
          <p className="text-neutral-700">
            <strong>Shipping Method:</strong> {po.shippingMethod || 'Standard Delivery'}
          </p>
          <p className="text-neutral-700">
            <strong>Payment Terms:</strong> {po.paymentTerms || 'Net 30 Days'}
          </p>
          <p className="text-neutral-700">
            <strong>Delivery Location:</strong> Rex Industries Factory, Kattuwa, Negombo
          </p>
          <p className="text-neutral-700">
            <strong>Order Status:</strong>{' '}
            <span className="font-bold uppercase text-blue-800">{po.status || 'Draft'}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-black mb-5 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-black text-[10px] uppercase font-bold text-neutral-800">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              <th className="p-2 border-r border-black">Item Description</th>
              {mrIds.length > 1 && <th className="p-2 border-r border-black text-center w-20">MR Ref</th>}
              <th className="p-2 border-r border-black text-right w-20">Qty</th>
              <th className="p-2 border-r border-black text-right w-24">Unit Price</th>
              {totalDiscount > 0 && <th className="p-2 border-r border-black text-right w-20">Discount</th>}
              <th className="p-2 border-r border-black text-right w-16">Tax %</th>
              <th className="p-2 text-right w-28">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            {items.map((it: any, idx: number) => {
              const qty = Number(it.qty || 0);
              const price = Number(it.unitPrice || 0);
              const disc = Number(it.discount || 0);
              const total = Number(it.total || (qty * price - disc));
              return (
                <tr key={idx}>
                  <td className="p-2 border-r border-black text-center font-mono text-neutral-600">{idx + 1}</td>
                  <td className="p-2 border-r border-black">
                    <p className="font-bold text-black">{it.desc || it.name || it.inventoryId || 'Item'}</p>
                    {it.notes && <p className="text-[10px] text-neutral-600 italic mt-0.5">{it.notes}</p>}
                    {it.inventoryId && it.desc && (
                      <p className="text-[10px] font-mono text-neutral-500">Code: {it.inventoryId}</p>
                    )}
                  </td>
                  {mrIds.length > 1 && (
                    <td className="p-2 border-r border-black text-center font-mono text-[10px] font-semibold text-blue-700">
                      {it.mrId || '-'}
                    </td>
                  )}
                  <td className="p-2 border-r border-black text-right font-mono font-bold">
                    {qty} {it.unit || it.uom || ''}
                  </td>
                  <td className="p-2 border-r border-black text-right font-mono">
                    {formatCurrency(price, true)}
                  </td>
                  {totalDiscount > 0 && (
                    <td className="p-2 border-r border-black text-right font-mono text-red-600">
                      {disc > 0 ? `-${formatCurrency(disc, true)}` : '-'}
                    </td>
                  )}
                  <td className="p-2 border-r border-black text-right font-mono">
                    {Number(it.taxRate) > 0 ? `${it.taxRate}%` : '0%'}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-black">
                    {formatCurrency(total, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes Section */}
      <div className="grid grid-cols-12 gap-5 mb-8">
        <div className="col-span-7 space-y-3">
          {po.notes && (
            <div className="border border-black/40 p-3 bg-neutral-50 rounded-xs">
              <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-600 mb-1">Notes & Instructions:</p>
              <p className="text-neutral-800 whitespace-pre-line leading-relaxed">{po.notes}</p>
            </div>
          )}

          <div className="border border-black/40 p-3 text-[10px] text-neutral-600 bg-neutral-50">
            <p className="font-bold uppercase tracking-wider text-black mb-1">Terms & Conditions:</p>
            <p className="whitespace-pre-line leading-relaxed">
              {po.terms || '1. All goods must be delivered in accordance with specifications.\n2. Invoice and delivery note must reference this Purchase Order number.\n3. Goods rejected upon receipt inspection will be returned at supplier expense.'}
            </p>
          </div>
        </div>

        <div className="col-span-5">
          <div className="border border-black divide-y divide-black/30 font-mono text-xs">
            <div className="p-2 flex justify-between bg-neutral-50">
              <span className="font-sans font-semibold text-neutral-700">Subtotal:</span>
              <span className="font-bold">{formatCurrency(subtotal, true)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="p-2 flex justify-between text-red-600 bg-neutral-50">
                <span className="font-sans font-semibold">Total Discount:</span>
                <span>-{formatCurrency(totalDiscount, true)}</span>
              </div>
            )}
            {taxBreakdown ? (
              <>
                {taxBreakdown.tax1Rate > 0 && (
                  <div className="p-2 flex justify-between bg-neutral-50">
                    <span className="font-sans text-[11px] text-neutral-700">{taxBreakdown.tax1Name} ({taxBreakdown.tax1Rate}%):</span>
                    <span>{formatCurrency(Number(taxBreakdown.tax1Amount || 0), true)}</span>
                  </div>
                )}
                {taxBreakdown.tax2Rate > 0 && (
                  <div className="p-2 flex justify-between bg-neutral-50">
                    <span className="font-sans text-[11px] text-neutral-700">{taxBreakdown.tax2Name} ({taxBreakdown.tax2Rate}%):</span>
                    <span>{formatCurrency(Number(taxBreakdown.tax2Amount || 0), true)}</span>
                  </div>
                )}
              </>
            ) : (
              tax > 0 && (
                <div className="p-2 flex justify-between bg-neutral-50">
                  <span className="font-sans font-semibold text-neutral-700">Tax:</span>
                  <span>{formatCurrency(tax, true)}</span>
                </div>
              )
            )}
            {shippingCost > 0 && (
              <div className="p-2 flex justify-between bg-neutral-50">
                <span className="font-sans font-semibold text-neutral-700">Shipping:</span>
                <span>{formatCurrency(shippingCost, true)}</span>
              </div>
            )}
            <div className="p-2.5 flex justify-between bg-black text-white font-bold text-sm">
              <span className="font-sans uppercase tracking-wider">Grand Total:</span>
              <span>{formatCurrency(totalAmount, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authorized Signatures */}
      <div className="grid grid-cols-3 gap-6 mt-14 pt-4 border-t border-neutral-300 text-xs">
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">{po.createdBy || 'Purchasing Officer'}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Prepared By</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">Finance Manager</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Checked & Verified</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-1.5 mt-8">
            <p className="font-bold text-black">Managing Director / COO</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
