import React from 'react';
import { formatDate } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useQuotations, useFinishedGoodsOrders } from '@/hooks/useData';

export interface WorkOrderPrintViewProps {
  workOrder: any;
  settings?: any;
}

export const WorkOrderPrintView: React.FC<WorkOrderPrintViewProps> = ({ workOrder, settings: propSettings }) => {
  // Global settings fallback
  let contextSettings: any = null;
  try {
    const ctx = useSettings();
    contextSettings = ctx?.settings;
  } catch (e) {
    contextSettings = null;
  }
  const settings = propSettings || contextSettings;

  const { data: allQuotations = [] } = useQuotations();
  const { data: allOrders = [] } = useFinishedGoodsOrders();

  if (!workOrder) return null;

  // 1. Identifiers
  const woId = workOrder.id || 'WO-XXXX';
  const soNo = workOrder.orderNo || workOrder.salesOrderNo || workOrder.soId || '-';
  const quoteRef = workOrder.quoteId || workOrder.sourceQuoteId || workOrder.quotationId || workOrder.quotationNo;

  // Find linked sales order if available
  const linkedOrder = (allOrders || []).find((o: any) =>
    (workOrder.orderNo && (String(o.orderNo).toLowerCase() === String(workOrder.orderNo).toLowerCase() || String(o.id) === String(workOrder.orderNo))) ||
    (workOrder.id && (String(o.orderNo) === String(workOrder.id) || String(o.id) === String(workOrder.id)))
  );

  // Find linked quotation
  const linkedQuote = (allQuotations || []).find((q: any) => {
    const qIdStr = String(q.id || '').trim().toLowerCase();
    const qNoStr = String(q.quotationNo || '').trim().toLowerCase();
    const refStr = String(quoteRef || '').trim().toLowerCase();
    const soRef = String(workOrder.orderNo || '').trim().toLowerCase();
    return (
      (refStr && (qIdStr === refStr || qNoStr === refStr || qNoStr.includes(refStr))) ||
      (soRef && q.orderNo && String(q.orderNo).toLowerCase() === soRef) ||
      (linkedOrder?.quoteId && (qIdStr === String(linkedOrder.quoteId).toLowerCase() || qNoStr === String(linkedOrder.quotationNo || '').toLowerCase()))
    );
  });

  let quoteData: any = null;
  if (workOrder.quotationData) {
    try { quoteData = typeof workOrder.quotationData === 'string' ? JSON.parse(workOrder.quotationData) : workOrder.quotationData; } catch (e) {}
  }
  if (!quoteData && linkedQuote?.data) {
    try { quoteData = typeof linkedQuote.data === 'string' ? JSON.parse(linkedQuote.data) : linkedQuote.data; } catch (e) {}
  }

  // Customer Name: ONLY client name (no phone, no email, no address)
  const customerName = (
    workOrder.customerName ||
    workOrder.customer ||
    workOrder.clientName ||
    linkedOrder?.customerName ||
    quoteData?.customerCompany ||
    quoteData?.customerName ||
    linkedQuote?.customerCompany ||
    linkedQuote?.customerName ||
    'Valued Client'
  ).trim();

  // Header meta values
  const quotationNo = workOrder.quotationNo || linkedOrder?.quotationNo || linkedQuote?.quotationNo || quoteRef || '-';
  const grnNo = workOrder.grnNo || linkedOrder?.customerGrnNo || quoteData?.grnNo || linkedQuote?.grnNo || '-';
  const bomNo = workOrder.bomNo || quoteData?.bomNo || '-';
  const preparedBy = workOrder.preparedBy || linkedQuote?.createdByName || linkedQuote?.createdBy || 'Rex Team';
  const projectNo = workOrder.projectNo || quoteData?.projectNo || '-';
  const priority = workOrder.priority || 'Normal';
  const deliveredDate = workOrder.deliveredDate || workOrder.deadline || linkedOrder?.deliveryDate || quoteData?.custDelivery || '-';
  const jobType = workOrder.jobType || workOrder.type || linkedOrder?.productName || quoteData?.subject || linkedQuote?.title || '-';
  const notes = workOrder.notes || workOrder.description || '';

  const rawDate = workOrder.createdAt || workOrder.orderDate || linkedOrder?.createdAt || new Date();
  const orderDate = formatDate(rawDate);

  // 2. Extract item descriptions (EXACT quotation description!)
  let displayItems: Array<{ sNo: number; desc: string; qty: number | string; uom?: string }> = [];

  // Priority 1: From linked quotation custItems (direct commercial quote scope)
  if (Array.isArray(quoteData?.custItems) && quoteData.custItems.length > 0) {
    displayItems = quoteData.custItems.map((ci: any, idx: number) => ({
      sNo: idx + 1,
      desc: ci.desc || ci.description || ci.name || `Item ${idx + 1}`,
      qty: ci.qty || 1,
      uom: 'Nos'
    }));
  }
  // Priority 2: From linked order items
  else if (linkedOrder?.items) {
    let oItems: any[] = [];
    try { oItems = typeof linkedOrder.items === 'string' ? JSON.parse(linkedOrder.items) : linkedOrder.items; } catch (e) {}
    if (Array.isArray(oItems) && oItems.length > 0) {
      displayItems = oItems.map((it: any, idx: number) => ({
        sNo: idx + 1,
        desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
        qty: it.qty || 1,
        uom: it.uom || 'Nos'
      }));
    }
  }
  // Priority 3: From workOrder.items or workOrder.bom
  else if (Array.isArray(workOrder.items) && workOrder.items.length > 0) {
    displayItems = workOrder.items.map((it: any, idx: number) => ({
      sNo: idx + 1,
      desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
      qty: it.qty || 1,
      uom: it.uom || 'Nos'
    }));
  } else if (Array.isArray(workOrder.bom) && workOrder.bom.length > 0) {
    displayItems = workOrder.bom.map((b: any, idx: number) => ({
      sNo: idx + 1,
      desc: b.material || b.description || b.name || `Item ${idx + 1}`,
      qty: b.qty || 1,
      uom: b.unit || 'Nos'
    }));
  }

  // Fallback
  if (displayItems.length === 0) {
    displayItems = [{
      sNo: 1,
      desc: workOrder.productName || workOrder.partName || workOrder.title || 'Precision Machined Component as per given instruction',
      qty: workOrder.jobQty || workOrder.quantity || 1,
      uom: 'Nos'
    }];
  }

  return (
    <>
      <style>{`
        #work-order-print-section {
          width: 100% !important;
          max-width: 794px !important;
          margin: 0 auto !important;
          font-family: Arial, sans-serif !important;
          color: #000000 !important;
          background: #ffffff !important;
          border: 1px solid #000000 !important;
          box-sizing: border-box !important;
        }
        #work-order-print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #work-order-print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #work-order-print-section .border-b { border-bottom: 1px solid #000000 !important; }
        #work-order-print-section .border-r { border-right: 1px solid #000000 !important; }
        #work-order-print-section .border-t { border-top: 1px solid #000000 !important; }
        #work-order-print-section .border-l { border-left: 1px solid #000000 !important; }
        #work-order-print-section .bg-gray-100 { background-color: #f3f4f6 !important; }
        #work-order-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        @media print {
          @page { size: A4 portrait; margin: 6mm 8mm; }
          html, body { background: #fff !important; color: #000 !important; }
        }
      `}</style>

      <div
        id="work-order-print-section"
        className="bg-white mx-auto border border-black flex flex-col text-black shadow-sm"
        style={{
          width: '100%',
          maxWidth: '794px',
          minHeight: '1050px',
          color: '#000',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: 1.35
        }}
      >
        {/* ── 1. TOP LETTERHEAD HEADER (ERP General Format) ── */}
        <div className="flex border-b border-black">
          {/* Logo Column */}
          <div className="w-[30%] flex items-center justify-center p-4 border-r border-black bg-white">
            {settings?.company_logo ? (
              <img
                src={settings.company_logo}
                alt="Company Logo"
                className="w-full object-contain"
                style={{ maxHeight: '80px' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            ) : (
              <img
                src="/rex-logo.png"
                alt="REX"
                className="w-full object-contain"
                style={{ maxHeight: '80px' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
          </div>

          {/* Company Details Column */}
          <div className="w-[70%] p-4 pl-6 text-[12px] leading-tight bg-white">
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
                  <td>: {settings?.company_website || settings?.company_web || 'www.rexgroup.lk'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 2. TITLE BAR ── */}
        <div className="bg-gray-100 border-b border-black text-center py-2.5 font-bold text-[16px] uppercase tracking-wider flex items-center justify-center gap-3">
          <span>PRODUCTION WORK ORDER / JOB TRAVELER</span>
          <span className="text-[12px] font-mono bg-white border border-black px-2 py-0.5 rounded text-gray-800">
            {workOrder.status || 'Active'}
          </span>
        </div>

        {/* ── 3. DETAILS SECTION (2 COLUMNS) ── */}
        <div className="flex border-b border-black text-[12.5px]">
          {/* Left: Customer Name Only (Zero addresses/phones as requested) */}
          <div className="w-[50%] p-3.5 pl-4 border-r border-black flex flex-col justify-between">
            <div>
              <span className="font-bold italic underline mb-2 block text-[13px]">Customer / Client :</span>
              <div className="font-black text-[16px] text-black uppercase tracking-tight mb-2">
                {customerName}
              </div>
              {jobType && jobType !== '-' && (
                <div className="text-[12px] text-gray-800 mt-2">
                  <span className="font-bold text-black">Type of Job / Scope:</span> {jobType}
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-600 mt-3 pt-2 border-t border-gray-200">
              <span className="font-bold uppercase text-[10px] text-gray-500 block">Release Type:</span>
              <span>Shop-Floor Production &amp; Machine Traveler</span>
            </div>
          </div>

          {/* Right: Work Order & Order Metadata */}
          <div className="w-[50%] p-3.5 pl-4">
            <table className="w-full leading-snug text-[12.5px]">
              <tbody>
                <tr>
                  <td className="w-36 font-bold pb-1">Work Order No</td>
                  <td className="font-bold pb-1">: <span className="font-mono text-[14px] text-black font-black">{woId}</span></td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Sales Order No</td>
                  <td className="font-bold pb-1">: <span className="font-mono text-[13px] text-blue-900">{soNo}</span></td>
                </tr>
                {quotationNo && quotationNo !== '-' && (
                  <tr>
                    <td className="font-bold pb-1">Quotation Ref</td>
                    <td className="pb-1 font-mono font-bold text-emerald-800">: {quotationNo}</td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold pb-1">Issue Date</td>
                  <td className="pb-1 font-mono">: {orderDate}</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Target Delivery</td>
                  <td className="pb-1 font-mono font-bold text-black">: {deliveredDate}</td>
                </tr>
                {grnNo && grnNo !== '-' && (
                  <tr>
                    <td className="font-bold pb-1">Sample GRN No</td>
                    <td className="pb-1 font-mono">: {grnNo}</td>
                  </tr>
                )}
                {bomNo && bomNo !== '-' && (
                  <tr>
                    <td className="font-bold pb-1">BOM No</td>
                    <td className="pb-1 font-mono">: {bomNo}</td>
                  </tr>
                )}
                {projectNo && projectNo !== '-' && (
                  <tr>
                    <td className="font-bold pb-1">Project No</td>
                    <td className="pb-1 font-mono">: {projectNo}</td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold pb-1">Prepared by</td>
                  <td className="pb-1 font-mono font-bold">: {preparedBy}</td>
                </tr>
                <tr>
                  <td className="font-bold pb-1">Priority</td>
                  <td className="pb-1 font-bold text-black uppercase">: {priority}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. ITEMS TABLE (EXACT QUOTATION DESCRIPTION, ZERO PRICING, NO IMAGE) ── */}
        <div className="flex-1 flex flex-col border-b border-black min-h-[360px]">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center font-bold">
                <th className="py-2 px-2 border-r border-black w-12 text-center">#</th>
                <th className="py-2 px-4 border-r border-black text-left">DESCRIPTION &amp; TECHNICAL SCOPE</th>
                <th className="py-2 px-4 w-24 text-center">QTY</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-2.5 px-2 text-center font-mono font-bold border-r border-black align-top">
                    {item.sNo}
                  </td>
                  <td className="py-2.5 px-4 border-r border-black font-medium text-black align-top whitespace-pre-line leading-relaxed">
                    {item.desc}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-black align-top text-[13px]">
                    {item.qty} {item.uom || 'Nos'}
                  </td>
                </tr>
              ))}
              {/* Spacer row to maintain clean page proportion */}
              <tr style={{ height: `${Math.max(140, 360 - displayItems.length * 48)}px` }}>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 5. OPTIONAL WORKSHOP INSTRUCTIONS / NOTES ── */}
        {notes && (
          <div className="p-3 border-b border-black text-[12px] bg-gray-50">
            <span className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
              Workshop Instructions &amp; Notes:
            </span>
            <p className="whitespace-pre-line leading-relaxed text-black font-medium">
              {notes}
            </p>
          </div>
        )}

        {/* ── 6. MATERIALS SOURCING & COSTING BOX ── */}
        <div className="grid grid-cols-2 border-b border-black text-[11.5px]">
          {/* Left: Materials */}
          <div className="p-3 border-r border-black">
            <span className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-2">
              Materials Verification:
            </span>
            <div className="flex items-center gap-6 font-bold">
              <label className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-4 h-4 border border-black bg-white"></span>
                <span>BOM ATTACHED</span>
              </label>
              <label className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-4 h-4 border border-black bg-white"></span>
                <span>FROM THE CUSTOMER</span>
              </label>
            </div>
          </div>

          {/* Right: Cost Calculated */}
          <div className="p-3 px-6 flex items-center justify-between">
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                Cost Calculated:
              </span>
              <div className="w-36 border-b border-dotted border-black mt-5"></div>
              <span className="text-[10px] font-bold text-gray-600 block mt-0.5">Signature</span>
            </div>
            <div className="text-right">
              <div className="w-28 border-b border-dotted border-black mt-7"></div>
              <span className="text-[10px] font-bold text-gray-600 block mt-0.5">Date</span>
            </div>
          </div>
        </div>

        {/* ── 7. SIGNATURE ROW 1 (Engineering & Release) ── */}
        <div className="grid grid-cols-3 border-b border-black text-center text-[11px] py-4 px-2">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[10px]">
              <span>CRM</span>
              <span>DATE</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-52 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-52 font-bold px-1 text-[10px]">
              <span>Senior Design Engineer</span>
              <span>DATE</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[10px]">
              <span>Workshop Engineer</span>
              <span>Date</span>
            </div>
          </div>
        </div>

        {/* ── 8. SIGNATURE ROW 2 (Completion & Store Handover) ── */}
        <div className="grid grid-cols-3 border-b border-black text-center text-[11px] py-4 px-2">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[10px]">
              <span>Engineer</span>
              <span>Job Finished Date</span>
            </div>
            <span className="text-[9.5px] text-gray-600 mt-0.5">Received the Finished Goods</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[10px]">
              <span>QC Inspection</span>
              <span>Final Checked Date</span>
            </div>
            <span className="text-[9.5px] text-gray-600 mt-0.5">Quality Inspection Signed</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[10px]">
              <span>Store Keeper</span>
              <span>Received Date</span>
            </div>
            <span className="text-[9.5px] text-gray-600 mt-0.5">Received the Finished Goods</span>
          </div>
        </div>

        {/* ── 9. FOOTER RELEASE WARNING NOTICE ── */}
        <div className="p-2 text-center font-bold text-[9.5px] uppercase tracking-wider bg-gray-100">
          PLEASE ENSURE ALL COLUMNS ARE DULY FILLED AND GOODS HAVE BEEN PROPERLY INSPECTED &amp; SIGNED BEFORE RELEASE
        </div>
      </div>
    </>
  );
};
