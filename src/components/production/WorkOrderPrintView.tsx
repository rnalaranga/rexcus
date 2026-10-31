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
  } catch {
    contextSettings = null;
  }
  const settings = propSettings || contextSettings;

  const { data: allQuotations = [] } = useQuotations();
  const { data: allOrders = [] } = useFinishedGoodsOrders();

  if (!workOrder) return null;

  // 1. Identifiers
  const woId = workOrder.orderNo || workOrder.id || 'WO-XXXX';
  const soNo = workOrder.salesOrderNo || workOrder.soId || workOrder.orderNo || '-';
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
    try { quoteData = typeof workOrder.quotationData === 'string' ? JSON.parse(workOrder.quotationData) : workOrder.quotationData; } catch {}
  }
  if (!quoteData && linkedQuote?.data) {
    try { quoteData = typeof linkedQuote.data === 'string' ? JSON.parse(linkedQuote.data) : linkedQuote.data; } catch {}
  }

  // Customer Name: ONLY client name (no personal phone, no personal email on floor traveller)
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
      uom: ci.unit || 'Nos'
    }));
  }
  // Priority 2: From linked order items
  else if (linkedOrder?.items) {
    let oItems: any[] = [];
    try { oItems = typeof linkedOrder.items === 'string' ? JSON.parse(linkedOrder.items) : linkedOrder.items; } catch {}
    if (Array.isArray(oItems) && oItems.length > 0) {
      displayItems = oItems.map((it: any, idx: number) => ({
        sNo: idx + 1,
        desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
        qty: it.qty || 1,
        uom: it.uom || it.unit || 'Nos'
      }));
    }
  }
  // Priority 3: From workOrder.items or workOrder.bom
  else if (Array.isArray(workOrder.items) && workOrder.items.length > 0) {
    displayItems = workOrder.items.map((it: any, idx: number) => ({
      sNo: idx + 1,
      desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
      qty: it.qty || 1,
      uom: it.uom || it.unit || 'Nos'
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
      desc: workOrder.productName || workOrder.partName || workOrder.title || 'Precision Machined Component as per given technical drawings',
      qty: workOrder.jobQty || workOrder.quantity || workOrder.qty || 1,
      uom: workOrder.uom || 'Nos'
    }];
  }

  // Operations
  let operations: any[] = [];
  if (Array.isArray(workOrder.operations)) {
    operations = workOrder.operations;
  } else if (typeof workOrder.operations === 'string') {
    try { operations = JSON.parse(workOrder.operations); } catch { operations = []; }
  }

  const logoUrl = settings?.company_logo || settings?.logo || settings?.companyLogo || '/rex-logo.png';

  return (
    <>
      <style>{`
        #work-order-print-section {
          width: 100% !important;
          max-width: 794px !important;
          margin: 0 auto !important;
          font-family: Arial, Helvetica, sans-serif !important;
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
        @media print {
          @page { size: A4 portrait; margin: 6mm 8mm; }
          html, body { background: #fff !important; color: #000 !important; }
          #work-order-print-section { border: 1px solid #000000 !important; }
        }
      `}</style>

      <div
        id="work-order-print-section"
        className="bg-white mx-auto flex flex-col text-black shadow-sm text-xs leading-normal"
        style={{
          width: '100%',
          maxWidth: '794px',
          color: '#000000',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* ── 1. HEADER (Signature Rex Industries standard format) ── */}
        <div className="flex p-3 border-b border-black items-center">
          {/* Logo (Left 32%) */}
          <div className="w-[32%] flex justify-center items-center px-2">
            <img
              src={logoUrl}
              alt="Rex Industries Logo"
              className="max-h-20 object-contain"
              onError={(e) => {
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
                        {settings?.company_website || settings?.companyWebsite || 'www.rexgroup.lk'}
                      </span>
                    </div>
                  </td>
                </tr>
                {(settings?.tax_id || settings?.tin) && (
                  <tr>
                    <td className="font-bold w-14 align-top py-0.5">TIN</td>
                    <td className="align-top py-0.5">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 text-neutral-800 font-mono font-semibold">
                          {settings?.tax_id || settings?.tin}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 2. DOCUMENT TITLE BAR ── */}
        <div className="border-b border-black py-1.5 px-3 bg-gray-50/70 flex items-center justify-between">
          <div className="w-24"></div>
          <h2 className="text-[17px] font-black uppercase tracking-wider text-black m-0 text-center flex-1">
            PRODUCTION WORK ORDER / JOB TRAVELER
          </h2>
          <div className="w-24 text-right">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-black bg-white rounded">
              {workOrder.status || 'Active'}
            </span>
          </div>
        </div>

        {/* ── 3. DETAILS METADATA SECTION ── */}
        <div className="flex border-b border-black text-[11px] leading-tight">
          {/* Left: Customer & Job Scope (52%) */}
          <div className="w-[52%] p-2.5 border-r border-black flex flex-col justify-between">
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-1">
                Customer / Client Name:
              </div>
              <div className="font-black text-[15px] text-black uppercase tracking-tight mb-2">
                {customerName}
              </div>
              {jobType && jobType !== '-' && (
                <div className="text-[11px] text-neutral-800 mt-1">
                  <span className="font-bold text-black">Type of Job / Scope:</span> {jobType}
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-300 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-neutral-500 font-bold uppercase">Release Document:</span>{' '}
                <span className="font-semibold text-black">Shop Floor Machine Traveler</span>
              </div>
              <div>
                <span className="text-neutral-500 font-bold uppercase">Priority:</span>{' '}
                <span className={`font-bold uppercase px-1.5 py-0.5 rounded ${
                  priority.toLowerCase() === 'urgent' || priority.toLowerCase() === 'high'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-neutral-100 text-black border border-neutral-300'
                }`}>
                  {priority}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Document & Production Metadata (48%) */}
          <div className="w-[48%] p-2.5">
            <table className="w-full text-[11px] leading-relaxed">
              <tbody>
                <tr>
                  <td className="w-32 font-bold py-0.5">Work Order No.</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono text-[13px] text-black font-black">{woId}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Sales Order No.</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-bold text-blue-900">{soNo}</span>
                  </td>
                </tr>
                {quotationNo && quotationNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5">Quotation Ref</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono font-bold text-emerald-800">{quotationNo}</span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold py-0.5">Order Issue Date</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-medium text-neutral-800">{orderDate}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Target Delivery</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-black text-black">{deliveredDate}</span>
                  </td>
                </tr>
                {grnNo && grnNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5">Sample GRN No.</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono">{grnNo}</span>
                    </td>
                  </tr>
                )}
                {bomNo && bomNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5">BOM Ref No.</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono">{bomNo}</span>
                    </td>
                  </tr>
                )}
                {projectNo && projectNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5">Project / Job Ref</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono">{projectNo}</span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold py-0.5">Prepared By</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-semibold text-black">{preparedBy}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. TECHNICAL SCOPE & COMPONENTS TO MANUFACTURE ── */}
        <div className="border-b border-black">
          <div className="bg-neutral-100 py-1.5 px-3 border-b border-black font-bold text-[10px] uppercase tracking-wider text-black">
            Scope of Work &amp; Components to Manufacture:
          </div>
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-black text-[10px] font-bold text-neutral-700 uppercase">
                <th className="py-1.5 px-2 text-center w-10 border-r border-black">#</th>
                <th className="py-1.5 px-3 border-r border-black">Component Description &amp; Technical Specifications</th>
                <th className="py-1.5 px-3 text-center w-24">Batch Qty</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-300 text-black">
                  <td className="py-2 px-2 text-center font-mono font-bold border-r border-black align-top text-[11px]">
                    {item.sNo}
                  </td>
                  <td className="py-2 px-3 border-r border-black font-medium text-black align-top whitespace-pre-line leading-relaxed">
                    {item.desc}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-black text-black align-top text-[13px]">
                    {item.qty} {item.uom || 'Nos'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 5. ROUTING & FLOOR OPERATIONS (If defined) ── */}
        {operations.length > 0 && (
          <div className="border-b border-black">
            <div className="bg-neutral-100 py-1.5 px-3 border-b border-black font-bold text-[10px] uppercase tracking-wider text-black">
              Shop Floor Machining Sequence &amp; Operations Routing:
            </div>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-black text-[9px] font-bold text-neutral-700 uppercase">
                  <th className="py-1 px-2 text-center w-8 border-r border-black">Seq</th>
                  <th className="py-1 px-3 border-r border-black">Operation / Process</th>
                  <th className="py-1 px-3 border-r border-black">Machine / Workstation</th>
                  <th className="py-1 px-2 text-center w-16 border-r border-black">Planned</th>
                  <th className="py-1 px-3 text-center w-28 border-r border-black">Operator Sign / Date</th>
                  <th className="py-1 px-3 text-center w-20">QC Pass</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op: any, oIdx: number) => (
                  <tr key={oIdx} className="border-b border-neutral-300">
                    <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-black">
                      {op.opNumber || (oIdx + 1) * 10}
                    </td>
                    <td className="py-1.5 px-3 border-r border-black font-semibold text-black">
                      {op.operationName || op.name || op.process || 'Machining'}
                    </td>
                    <td className="py-1.5 px-3 border-r border-black text-neutral-800">
                      {op.machineName || op.machine || op.workstation || 'Standard Machine'}
                    </td>
                    <td className="py-1.5 px-2 text-center border-r border-black font-mono">
                      {op.plannedHours ? `${op.plannedHours} hrs` : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-center border-r border-black text-neutral-400">
                      .......................................
                    </td>
                    <td className="py-1.5 px-3 text-center text-neutral-400 font-mono">
                      [ &nbsp; ]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 6. MATERIAL SOURCING & WORKSHOP INSTRUCTIONS ── */}
        <div className="border-b border-black grid grid-cols-2 text-[11px] leading-tight">
          {/* Material Verification */}
          <div className="p-2.5 border-r border-black">
            <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-600 mb-1.5">
              Material Sourcing &amp; Traceability:
            </div>
            <div className="space-y-1 text-[11px]">
              <label className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-3.5 h-3.5 border border-black bg-white"></span>
                <span>BOM Material Issued from Warehouse Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-3.5 h-3.5 border border-black bg-white"></span>
                <span>Customer Supplied Sample / Free-Issue Material</span>
              </label>
              <label className="flex items-center gap-2 cursor-default">
                <span className="inline-block w-3.5 h-3.5 border border-black bg-white"></span>
                <span>Direct Special Purchase / Commercial Sourcing</span>
              </label>
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-300 text-[10px] text-neutral-700">
              <div><span className="font-bold">Raw Material Spec / Heat #:</span> ............................................</div>
            </div>
          </div>

          {/* Workshop Technical Notes */}
          <div className="p-2.5 bg-gray-50/50 flex flex-col justify-between">
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-600 mb-1">
                Workshop Instructions &amp; Engineering Notes:
              </div>
              <p className="text-neutral-800 m-0 whitespace-pre-line leading-relaxed text-[11px]">
                {notes || 'Execute machining strictly in accordance with approved CAD drawings, tolerances, and surface finish requirements. Verify dimensions at each critical setup.'}
              </p>
            </div>
            <div className="mt-2 pt-1 border-t border-neutral-300 text-[10px] text-neutral-600">
              Critical Surface Finish: Ra ≤ 1.6µm | Tolerances: ISO 2768-m (unless specified)
            </div>
          </div>
        </div>

        {/* ── 7. PROFESSIONAL AUTHORIZED SIGNATURE BLOCKS ── */}
        <div className="p-3 border-b border-black">
          {/* STAGE 1: Pre-Production Engineering & Release Authorization */}
          <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-2">
            1. Engineering &amp; Pre-Production Release Approval:
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Box 1: Prepared By / CRM Coordinator */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800">
                  Prepared By / Job Coordinator
                </div>
                <div className="text-[9px] text-neutral-500">Commercial &amp; Specs Verified</div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black truncate">{preparedBy}</div>
                <div className="text-[9px] text-neutral-500">Date: {orderDate}</div>
              </div>
            </div>

            {/* Box 2: Senior Design Engineer */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800">
                  Senior Design / CAM Engineer
                </div>
                <div className="text-[9px] text-neutral-500">Drawing &amp; Toolpath Approved</div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black">Design Engineer Signature</div>
                <div className="text-[9px] text-neutral-500">Date: .......................................</div>
              </div>
            </div>

            {/* Box 3: Production Manager */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800">
                  Production / Works Manager
                </div>
                <div className="text-[9px] text-neutral-500">Authorized for Active Machining</div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black">Authorized Signature &amp; Stamp</div>
                <div className="text-[9px] text-neutral-500">Date: .......................................</div>
              </div>
            </div>
          </div>

          {/* STAGE 2: Post-Production Floor Completion & Quality Handover */}
          <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-2">
            2. Machining Completion, Quality Inspection &amp; Stores Handover:
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Box 4: Workshop Engineer / Lead Machinist */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800">
                  Lead Machinist / Floor In-Charge
                </div>
                <div className="text-[9px] text-neutral-500">Machining Completed on Floor</div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black">Finished Date: ........................</div>
                <div className="text-[9px] text-neutral-500">Machine Operator Signature</div>
              </div>
            </div>

            {/* Box 5: Quality Assurance & QC Inspection */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800 flex items-center justify-between">
                  <span>QC &amp; Metrology Inspection</span>
                  <span className="text-[8px] font-mono font-bold px-1 py-0.5 border border-black rounded">ISO 9001</span>
                </div>
                <div className="text-[9px] text-neutral-600 font-bold mt-0.5">
                  [ &nbsp; ] PASS &nbsp; [ &nbsp; ] REWORK &nbsp; [ &nbsp; ] REJECT
                </div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black">QC Inspector Signature &amp; Stamp</div>
                <div className="text-[9px] text-neutral-500">Inspection Date: ....................</div>
              </div>
            </div>

            {/* Box 6: Store Keeper / Logistics Handover */}
            <div className="border border-black p-2 flex flex-col justify-between h-24 bg-white">
              <div>
                <div className="text-[10px] font-bold uppercase text-neutral-800">
                  Finished Goods Store Keeper
                </div>
                <div className="text-[9px] text-neutral-500">Accepted into Warehouse Bay</div>
              </div>
              <div className="border-t border-dashed border-neutral-400 pt-1 text-center">
                <div className="font-bold text-[11px] text-black">Qty Accepted: ............. Nos</div>
                <div className="text-[9px] text-neutral-500">Store Officer Signature &amp; Date</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 8. FOOTER RELEASE WARNING NOTICE ── */}
        <div className="p-2 text-center font-bold text-[9px] uppercase tracking-wider bg-neutral-100 text-neutral-700">
          ISO 9001:2015 CERTIFIED PRECISION MANUFACTURING • CONFIDENTIAL WORK TRAVELER • ALL FLOOR ENTRIES &amp; INSPECTIONS MUST BE DULY SIGNED BEFORE COMPONENT DISPATCH
        </div>
      </div>
    </>
  );
};
