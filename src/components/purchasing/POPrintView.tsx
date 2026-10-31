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

  const poDateFormatted = po.date ? formatDate(po.date) : formatDate(po.createdAt);
  const expectedDateFormatted = po.expectedDate ? formatDate(po.expectedDate) : 'Immediate / ASAP';

  const logoUrl = settings?.company_logo || settings?.logo || settings?.companyLogo || '/rex-logo.png';

  return (
    <div
      id="po-print-section"
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
        #po-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #po-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; color: #000 !important; }
          #po-print-section { border: 1px solid #000000 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* ── 1. HEADER (Signature Rex Industries standard format) ── */}
      <div className="flex p-3 border-b border-black items-center">
        {/* Logo (Left 32%) */}
        <div className="w-[32%] flex justify-center items-center px-2">
          <img
            src={logoUrl}
            alt="Rex Industries Logo"
            className="max-h-20 object-contain"
            onError={(e) => {
              // Graceful fallback if image path not accessible
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'text-4xl font-black text-red-600 tracking-tighter';
                fallback.style.fontFamily = 'Impact, sans-serif';
                fallback.innerText = 'REX';
                parent.appendChild(fallback);
              }
            }}
          />
        </div>

        {/* Company Info (Right 68%) */}
        <div className="w-[68%] pl-3 border-l border-black/40">
          <h1
            className="text-[19px] font-black mb-1 leading-tight tracking-tight text-black"
            style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}
          >
            {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
          </h1>
          <table className="text-[11px] leading-tight w-full">
            <tbody>
              <tr>
                <td className="font-bold w-14 align-top py-0.5">Office</td>
                <td className="align-top py-0.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 whitespace-pre-line text-neutral-800">
                      {settings?.company_address || settings?.companyAddress || 'No.451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top py-0.5">Tel.</td>
                <td className="align-top py-0.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800">
                      {settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top py-0.5">E-mail</td>
                <td className="align-top py-0.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800">
                      {settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top py-0.5">Web</td>
                <td className="align-top py-0.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-800">
                      {settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-bold w-14 align-top py-0.5">TIN</td>
                <td className="align-top py-0.5 font-bold">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-neutral-900 font-mono">
                      {settings?.company_tin || settings?.company_vat || settings?.tin || '114106470-7000'}
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
        PURCHASE ORDER
      </div>

      {/* ── 3. VENDOR & ORDER METADATA GRID (Matches Quotation TO & Details table) ── */}
      <div className="flex border-b border-black text-[11px]">
        {/* TO / VENDOR (Left 55%) */}
        <div className="w-[55%] p-2.5 border-r border-black flex flex-col justify-between">
          <div>
            <div className="font-bold italic mb-0.5 text-[10px] text-gray-700">VENDOR / SUPPLIER</div>
            <div className="font-bold text-[12px] uppercase leading-tight text-black">
              {supp.company || supp.name || po.supplierId || 'SUPPLIER'}
            </div>
            {supp.name && supp.company && supp.name !== supp.company && (
              <div className="font-semibold text-[11px] text-neutral-800 mt-0.5">
                Attn: {supp.name}
              </div>
            )}
            {supp.address && (
              <div className="whitespace-pre-line text-[10.5px] leading-snug text-neutral-800 mt-0.5">
                {supp.address}
              </div>
            )}
            {(supp.phone || supp.phone1 || supp.mobile) && (
              <div className="text-[10.5px] text-neutral-800 mt-0.5">
                Tel: {supp.phone || supp.phone1 || supp.mobile}
              </div>
            )}
            {supp.email && (
              <div className="text-[10.5px] text-neutral-800">
                Email: {supp.email}
              </div>
            )}
          </div>
          <div className="mt-2 pt-1 border-t border-black/20 space-y-0.5 font-medium text-[10.5px]">
            <div className="flex items-start">
              <span className="w-20 font-bold shrink-0">Vendor VAT/TIN</span>
              <span className="font-bold mr-1 shrink-0">:</span>
              <span className="flex-1 font-mono font-bold text-neutral-900">{supp.vat || supp.tin || supp.brNumber || '-'}</span>
            </div>
          </div>
        </div>

        {/* ORDER DETAILS (Right 45%) */}
        <div className="w-[45%] p-0">
          <table className="w-full h-full text-[11px]">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold w-28 bg-gray-50/50">PO DATE</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{poDateFormatted}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">PO NO</td>
                <td className="p-1.5 font-bold font-mono text-black text-[12px]">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{po.id}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">DELIVERY DATE</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 font-semibold">{expectedDateFormatted}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">REF MR NO</td>
                <td className="p-1.5 font-mono">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-blue-700 font-semibold">{mrIds.length > 0 ? mrIds.join(', ') : 'N/A'}</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">PAYMENT TERMS</td>
                <td className="p-1.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1">{po.paymentTerms || '30 Days Credit'}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-black font-bold bg-gray-50/50">DELIVERY DEST.</td>
                <td className="p-1.5">
                  <div className="flex items-start">
                    <span className="font-bold mr-1 shrink-0">:</span>
                    <span className="flex-1 text-[10px]">Rex Factory, Kattuwa</span>
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
          <col style={{ width: '6%' }} />
          <col style={{ width: mrIds.length > 1 ? '44%' : '52%' }} />
          {mrIds.length > 1 && <col style={{ width: '10%' }} />}
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr className="font-bold border-b border-black text-center bg-gray-50 text-[10.5px]">
            <th className="p-1.5 border-r border-black font-bold text-center">NO</th>
            <th className="p-1.5 border-r border-black font-bold text-center">DESCRIPTION</th>
            {mrIds.length > 1 && <th className="p-1.5 border-r border-black font-bold text-center">MR REF</th>}
            <th className="p-1.5 border-r border-black font-bold text-center">QTY</th>
            <th className="p-1.5 border-r border-black font-bold text-center leading-tight">
              UNIT PRICE<br />(LKR)
            </th>
            <th className="p-1.5 font-bold text-center leading-tight">
              AMOUNT<br />(LKR)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const qty = Number(item.qty || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const discount = Number(item.discount || 0);
            const total = Number(item.total || (qty * unitPrice - discount));

            return (
              <tr key={idx} className="border-b border-black/20">
                <td className="p-1.5 border-r border-black text-center align-top font-mono text-neutral-600">
                  {idx + 1}
                </td>
                <td className="p-1.5 border-r border-black align-top">
                  <div className="font-bold text-black leading-tight">
                    {item.desc || item.name || item.inventoryId || 'Item'}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-neutral-600 italic mt-0.5">
                      {item.notes}
                    </div>
                  )}
                  {item.inventoryId && (item.desc || item.name) && (
                    <div className="text-[9.5px] font-mono text-neutral-500 mt-0.5">
                      Code: {item.inventoryId}
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="text-[9.5px] font-mono text-red-600 mt-0.5">
                      Less Item Discount: -{formatCurrency(discount, true)}
                    </div>
                  )}
                </td>
                {mrIds.length > 1 && (
                  <td className="p-1.5 border-r border-black text-center align-top font-mono font-semibold text-blue-700 text-[10px]">
                    {item.mrId || '-'}
                  </td>
                )}
                <td className="p-1.5 border-r border-black text-center align-top font-mono font-semibold text-black">
                  {qty.toLocaleString('en-US')} {item.unit || item.uom || ''}
                </td>
                <td className="p-1.5 border-r border-black text-right align-top font-mono text-neutral-800">
                  {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 text-right align-top font-mono font-bold text-black">
                  {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={mrIds.length > 1 ? 6 : 5} className="p-6 text-center text-gray-400 italic">
                No items entered.
              </td>
            </tr>
          )}
        </tbody>

        {/* ── 5. SUMMARY / TOTALS ── */}
        <tfoot>
          {/* Sub Total */}
          <tr className="border-t border-b border-black h-6 text-[11px] bg-gray-50/30">
            <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right font-bold pr-4">
              Sub Total
            </td>
            <td className="font-bold text-center border-l border-black font-mono">
              LKR
            </td>
            <td className="text-right font-bold p-1 border-l border-black pr-2 font-mono">
              {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* Discount if present */}
          {totalDiscount > 0 && (
            <tr className="border-b border-black h-6 text-[11px] text-red-600">
              <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right font-semibold pr-4">
                Total Order Discount
              </td>
              <td className="font-bold text-center border-l border-black font-mono">
                LKR
              </td>
              <td className="text-right p-1 border-l border-black pr-2 font-mono font-semibold">
                -{totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          )}

          {/* Taxes (Tax Breakdown profile or simple tax) */}
          {taxBreakdown ? (
            <>
              {Number(taxBreakdown.tax1Amount || 0) > 0 && (
                <tr className="border-b border-black h-6 text-[11px]">
                  <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right pr-4 text-neutral-700">
                    {taxBreakdown.tax1Name || 'SSCL'} ({Number(taxBreakdown.tax1Rate || 0)}%)
                  </td>
                  <td className="text-center border-l border-black font-mono font-semibold">
                    LKR
                  </td>
                  <td className="text-right p-1 border-l border-black pr-2 font-mono">
                    {Number(taxBreakdown.tax1Amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {Number(taxBreakdown.tax2Amount || 0) > 0 && (
                <tr className="border-b border-black h-6 text-[11px]">
                  <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right pr-4 text-neutral-700">
                    {taxBreakdown.tax2Name || 'VAT'} ({Number(taxBreakdown.tax2Rate || 0)}%)
                  </td>
                  <td className="text-center border-l border-black font-mono font-semibold">
                    LKR
                  </td>
                  <td className="text-right p-1 border-l border-black pr-2 font-mono">
                    {Number(taxBreakdown.tax2Amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </>
          ) : (
            tax > 0 && (
              <tr className="border-b border-black h-6 text-[11px]">
                <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right pr-4 text-neutral-700">
                  VAT / Total Tax
                </td>
                <td className="text-center border-l border-black font-mono font-semibold">
                  LKR
                </td>
                <td className="text-right p-1 border-l border-black pr-2 font-mono">
                  {tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            )
          )}

          {/* Shipping Cost if present */}
          {shippingCost > 0 && (
            <tr className="border-b border-black h-6 text-[11px]">
              <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right pr-4 text-neutral-700">
                Shipping & Handling Cost
              </td>
              <td className="text-center border-l border-black font-mono font-semibold">
                LKR
              </td>
              <td className="text-right p-1 border-l border-black pr-2 font-mono">
                {shippingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          )}

          {/* Grand Total */}
          <tr className="border-b-2 border-black h-8 text-[12px] font-black bg-gray-100/70">
            <td colSpan={mrIds.length > 1 ? 4 : 3} className="text-right pr-4 uppercase tracking-wider">
              Total Order Value
            </td>
            <td className="text-center border-l border-black font-mono font-black">
              LKR
            </td>
            <td className="text-right p-1.5 border-l border-black pr-2 font-mono font-black text-black">
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── 6. NOTES & TERMS SECTION ── */}
      <div className="p-3 border-b border-black space-y-2 text-[10.5px]">
        {po.notes && (
          <div className="p-2 bg-gray-50 border border-black/30 rounded-none">
            <span className="font-bold underline uppercase text-neutral-800">Special Instructions / Notes:</span>
            <div className="whitespace-pre-line text-neutral-800 mt-0.5 leading-relaxed">
              {po.notes}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="font-bold underline uppercase text-neutral-800 text-[10px]">
            Terms & Conditions:
          </div>
          <div className="whitespace-pre-line leading-relaxed text-neutral-700">
            {po.terms ||
              `1. Materials must conform strictly to required technical specifications, grade, and dimensions.
2. Official delivery note and supplier invoice quoting this PO number must accompany all dispatches.
3. Materials failing receiving quality check (QA) or dimensional inspection will be rejected and returned at vendor's cost.
4. Payments are subject to verification against GRN and will be settled according to the agreed credit terms.`}
          </div>
        </div>
      </div>

      {/* ── 7. AUTHORIZED SIGNATURES (Rex Standard 3-box approval) ── */}
      <div className="grid grid-cols-3 border-collapse text-center text-[10px]">
        <div className="p-3 border-r border-black flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">PREPARED BY</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">{po.createdBy || 'Purchasing Officer'}</div>
            <div className="text-neutral-500 text-[9.5px]">Procurement Dept</div>
          </div>
        </div>

        <div className="p-3 border-r border-black flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">CHECKED & VERIFIED</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">Stores & Accounts Head</div>
            <div className="text-neutral-500 text-[9.5px]">Inventory & Finance</div>
          </div>
        </div>

        <div className="p-3 flex flex-col justify-between min-h-[95px]">
          <div className="text-left font-bold text-neutral-500 uppercase">AUTHORIZED BY</div>
          <div className="mt-8 border-t border-black pt-1">
            <div className="font-bold text-black text-[11px]">Managing Director</div>
            <div className="text-neutral-500 text-[9.5px]">Rex Industries (Pvt) Ltd</div>
          </div>
        </div>
      </div>
    </div>
  );
};
