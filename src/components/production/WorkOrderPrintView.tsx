import React from 'react';
import { formatDate, resolveFileUrl } from '@/lib/utils';
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
  const { data: allFinishedOrders = [] } = useFinishedGoodsOrders();
  const allOrders = allFinishedOrders as any[];

  const [customerGrns, setCustomerGrns] = React.useState<any[]>([]);

  React.useEffect(() => {
    import('@/lib/api').then(({ fetchAllCustomerGRNs }) => {
      fetchAllCustomerGRNs().then(grns => {
        if (Array.isArray(grns)) setCustomerGrns(grns);
      }).catch(() => {});
    });
  }, []);

  if (!workOrder) return null;

  // 1. Identifiers
  const woId = workOrder.orderNo?.startsWith('WO-') ? workOrder.orderNo : (workOrder.id?.startsWith('WO-') ? workOrder.id : (workOrder.woNo || workOrder.orderNo || workOrder.id || 'WO-XXXX'));
  const soNo = workOrder.salesOrderNo || (workOrder.orderNo?.startsWith('SO-') ? workOrder.orderNo : (workOrder.soId || '-'));
  const quoteRef = workOrder.quoteId || workOrder.sourceQuoteId || workOrder.quotationId || workOrder.quotationNo;

  // Find linked sales order if available
  const linkedOrder = (allOrders || []).find((o: any) =>
    (workOrder.salesOrderNo && (String(o.orderNo).toLowerCase() === String(workOrder.salesOrderNo).toLowerCase() || String(o.id) === String(workOrder.salesOrderNo))) ||
    (workOrder.orderNo && (String(o.orderNo).toLowerCase() === String(workOrder.orderNo).toLowerCase() || String(o.id) === String(workOrder.orderNo))) ||
    (workOrder.id && (String(o.orderNo) === String(workOrder.id) || String(o.id) === String(workOrder.id))) ||
    (workOrder.quoteId && o.quoteId && String(o.quoteId) === String(workOrder.quoteId))
  );

  // Find linked quotation
  const linkedQuote = (allQuotations || []).find((q: any) => {
    const qIdStr = String(q.id || '').trim().toLowerCase();
    const qNoStr = String(q.quotationNo || '').trim().toLowerCase();
    const refStr = String(quoteRef || '').trim().toLowerCase();
    const soRef = String(workOrder.salesOrderNo || workOrder.orderNo || '').trim().toLowerCase();
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

  // Extract from title fallback if title contains format "WO: ... - Customer"
  let titleCustomer = '';
  if (workOrder.title && workOrder.title.includes(' - ')) {
    const parts = workOrder.title.split(' - ');
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      titleCustomer = parts[parts.length - 1].trim();
    }
  }

  // Customer Name: ONLY client name (no personal phone, no personal email on floor traveller)
  const customerName = (
    workOrder.customerName ||
    workOrder.customer ||
    workOrder.clientName ||
    linkedOrder?.customerName ||
    titleCustomer ||
    quoteData?.customerCompany ||
    quoteData?.customerName ||
    linkedQuote?.customerCompany ||
    linkedQuote?.customerName ||
    'Valued Client'
  ).trim();

  // Header meta values
  const quotationNo = workOrder.quotationNo || linkedOrder?.quotationNo || linkedQuote?.quotationNo || quoteRef || '-';
  const bomNo = workOrder.bomNo || quoteData?.bomNo || '-';
  const preparedBy = workOrder.preparedBy || linkedQuote?.createdByName || linkedQuote?.createdBy || 'Rex Team';
  const projectNo = workOrder.projectNo || quoteData?.projectNo || '-';
  const priority = workOrder.priority || 'Normal';
  const deliveredDate = workOrder.deliveredDate || workOrder.deadline || linkedOrder?.deliveryDate || quoteData?.custDelivery || '-';
  const jobType = workOrder.jobType || workOrder.type || linkedOrder?.productName || quoteData?.subject || linkedQuote?.title || '-';
  const notes = workOrder.notes || workOrder.description || '';

  // Find linked customer sample GRN number if available
  const sampleGrnNo = React.useMemo(() => {
    if (workOrder.sampleGrnNo && workOrder.sampleGrnNo !== '-') return String(workOrder.sampleGrnNo).trim();
    if (workOrder.customerGrnNo && workOrder.customerGrnNo !== '-') return String(workOrder.customerGrnNo).trim();
    if (workOrder.grnNo && workOrder.grnNo !== '-') return String(workOrder.grnNo).trim();
    if (linkedOrder?.customerGrnNo && linkedOrder.customerGrnNo !== '-') return String(linkedOrder.customerGrnNo).trim();
    if (linkedOrder?.sampleGrnNo && linkedOrder.sampleGrnNo !== '-') return String(linkedOrder.sampleGrnNo).trim();
    if (quoteData?.sampleGrnNo && quoteData.sampleGrnNo !== '-') return String(quoteData.sampleGrnNo).trim();
    if (quoteData?.customerGrnNo && quoteData.customerGrnNo !== '-') return String(quoteData.customerGrnNo).trim();
    if (quoteData?.grnNo && quoteData.grnNo !== '-') return String(quoteData.grnNo).trim();
    if (linkedQuote?.sampleGrnNo && linkedQuote.sampleGrnNo !== '-') return String(linkedQuote.sampleGrnNo).trim();
    if (linkedQuote?.customerGrnNo && linkedQuote.customerGrnNo !== '-') return String(linkedQuote.customerGrnNo).trim();
    if (linkedQuote?.grnNo && linkedQuote.grnNo !== '-') return String(linkedQuote.grnNo).trim();

    const qId = String(linkedQuote?.id || quoteRef || '').trim().toLowerCase();
    const soRef = String(workOrder.orderNo || linkedOrder?.orderNo || '').trim().toLowerCase();
    if (customerGrns && customerGrns.length > 0) {
      const match = customerGrns.find((g: any) => {
        const gQuote = String(g.quoteId || g.quotationNo || '').trim().toLowerCase();
        const gSo = String(g.salesOrderNo || g.soId || g.orderNo || '').trim().toLowerCase();
        return (qId && gQuote && gQuote === qId) || (soRef && gSo && gSo === soRef);
      });
      if (match?.grnNo || match?.id) return String(match.grnNo || match.id).trim();
    }

    return '';
  }, [workOrder, linkedOrder, quoteData, linkedQuote, quoteRef, customerGrns]);

  const rawDate = workOrder.createdAt || workOrder.orderDate || linkedOrder?.createdAt || new Date();
  const orderDate = formatDate(rawDate);

  // Target Work Order Batch Quantity (Authoritative from linked Sales Order or Work Order)
  const targetWoQty = Math.max(1, Number(linkedOrder?.qty || workOrder.jobQty || workOrder.quantity || workOrder.qty || 0));

  // 2. Extract item descriptions (Sales Order is primary authoritative commercial contract!)
  let displayItems: Array<{ sNo: number; desc: string; qty: number | string; uom?: string }> = [];

  // Priority 1: From linked Sales Order items (Directly maps to the confirmed/edited sales order scope)
  let oItems: any[] = [];
  if (linkedOrder?.items) {
    try { oItems = typeof linkedOrder.items === 'string' ? JSON.parse(linkedOrder.items) : linkedOrder.items; } catch {}
  }
  if (Array.isArray(oItems) && oItems.length > 0) {
    displayItems = oItems.map((it: any, idx: number) => ({
      sNo: idx + 1,
      desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
      qty: (Number(it.qty) > 1 ? Number(it.qty) : (oItems.length === 1 && targetWoQty > 1 ? targetWoQty : (it.qty || 1))),
      uom: it.uom || it.unit || 'Nos'
    }));
  }
  // Priority 2: From workOrder.items or workOrder.bom
  else if (Array.isArray(workOrder.items) && workOrder.items.length > 0) {
    displayItems = workOrder.items.map((it: any, idx: number) => ({
      sNo: idx + 1,
      desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
      qty: (Number(it.qty) > 1 ? Number(it.qty) : (workOrder.items.length === 1 && targetWoQty > 1 ? targetWoQty : (it.qty || 1))),
      uom: it.uom || it.unit || 'Nos'
    }));
  } else if (Array.isArray(workOrder.bom) && workOrder.bom.length > 0) {
    displayItems = workOrder.bom.map((b: any, idx: number) => ({
      sNo: idx + 1,
      desc: b.material || b.description || b.name || `Item ${idx + 1}`,
      qty: (Number(b.qty) > 1 ? Number(b.qty) : (workOrder.bom.length === 1 && targetWoQty > 1 ? targetWoQty : (b.qty || 1))),
      uom: b.unit || 'Nos'
    }));
  }
  // Priority 3: Fallback from linked quotation custItems ONLY if no Sales Order exists
  else if (Array.isArray(quoteData?.custItems) && quoteData.custItems.length > 0) {
    displayItems = quoteData.custItems.map((ci: any, idx: number) => ({
      sNo: idx + 1,
      desc: ci.desc || ci.description || ci.name || `Item ${idx + 1}`,
      qty: (Number(ci.qty) > 1 ? Number(ci.qty) : (quoteData.custItems.length === 1 && targetWoQty > 1 ? targetWoQty : (ci.qty || 1))),
      uom: ci.unit || 'Nos'
    }));
  }

  // Fallback
  if (displayItems.length === 0) {
    displayItems = [{
      sNo: 1,
      desc: workOrder.productName || workOrder.partName || workOrder.title || 'Precision Machined Component as per given technical drawings',
      qty: targetWoQty || 1,
      uom: workOrder.uom || 'Nos'
    }];
  }

  // Strict batch quantity guarantee: if single component scope on the traveler, ensure it reflects target batch quantity
  if (displayItems.length === 1 && targetWoQty > 1) {
    displayItems[0].qty = targetWoQty;
  }

  // Operations
  let operations: any[] = [];
  if (Array.isArray(workOrder.operations)) {
    operations = workOrder.operations;
  } else if (typeof workOrder.operations === 'string') {
    try { operations = JSON.parse(workOrder.operations); } catch { operations = []; }
  }

  const logoUrl = resolveFileUrl(settings?.company_logo || settings?.logo || settings?.companyLogo || '') || '/rex-logo.png';

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
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          /* Neutralize modal and fixed positioning wrappers on print */
          [class*="fixed"], [class*="backdrop"], [role="dialog"], .fixed {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          #work-order-print-section, #work-order-print-section * { visibility: visible !important; }
          #work-order-print-section {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            min-height: 0 !important;
            height: auto !important;
          }
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
              crossOrigin="anonymous"
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
                  <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Work Order No.</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono text-[13px] text-black font-black">{woId}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Sales Order No.</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-bold text-blue-900">{soNo}</span>
                  </td>
                </tr>
                {quotationNo && quotationNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Quotation Ref</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono font-bold text-emerald-800">{quotationNo}</span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Order Issue Date</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-medium text-neutral-800">{orderDate}</span>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Target Delivery</td>
                  <td className="py-0.5">
                    <span className="font-bold mr-1">:</span>
                    <span className="font-mono font-black text-black">{deliveredDate}</span>
                  </td>
                </tr>
                {sampleGrnNo && sampleGrnNo !== '-' && (
                  <tr className="bg-amber-50/70">
                    <td className="font-bold py-0.5 text-amber-950 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Sample GRN No.</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1 text-amber-950">:</span>
                      <span className="font-mono font-bold text-amber-950 px-1 py-0.2 rounded bg-amber-100 border border-amber-300">
                        {sampleGrnNo}
                      </span>
                    </td>
                  </tr>
                )}
                {bomNo && bomNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>BOM Ref No.</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono">{bomNo}</span>
                    </td>
                  </tr>
                )}
                {projectNo && projectNo !== '-' && (
                  <tr>
                    <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Project / Job Ref</td>
                    <td className="py-0.5">
                      <span className="font-bold mr-1">:</span>
                      <span className="font-mono">{projectNo}</span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="font-bold py-0.5 whitespace-nowrap" style={{ width: "130px", whiteSpace: "nowrap" }}>Prepared By</td>
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

        {/* ── 6. AUTHORIZATIONS, MATERIALS & COMPLETION HANDOVER ── */}
        <div className="border-b border-black text-[11px]">
          {/* ROW 1: CRM Manager, Senior Design Engineer, Workshop Engineer */}
          <div className="grid grid-cols-3 border-b border-neutral-300">
            {/* 1. CRM Manager */}
            <div className="p-3 border-r border-neutral-300 flex flex-col justify-between min-h-[92px]">
              <div className="font-bold uppercase text-[11px] text-black">
                CRM Manager
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>

            {/* 2. Senior Design Engineer */}
            <div className="p-3 border-r border-neutral-300 flex flex-col justify-between min-h-[92px]">
              <div className="font-bold uppercase text-[11px] text-black">
                Senior Design Engineer
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>

            {/* 3. Workshop Engineer */}
            <div className="p-3 flex flex-col justify-between min-h-[92px]">
              <div className="font-bold uppercase text-[11px] text-black">
                Workshop Engineer
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Materials (BOM Attached / Materials from Customer) & Cost Calculated */}
          <div className="grid grid-cols-2 border-b border-neutral-300">
            {/* Left: Materials */}
            <div className="p-3 border-r border-neutral-300 flex flex-col justify-between min-h-[78px]">
              <div className="font-bold uppercase text-[11px] text-black mb-1">
                Materials
              </div>
              <div className="flex items-center gap-6 text-[11px] py-1">
                <label className="flex items-center gap-2 cursor-default select-none">
                  <span className="inline-block w-4 h-4 border border-black bg-white shrink-0"></span>
                  <span className="font-medium text-black">BOM Attached</span>
                </label>
                <label className="flex items-center gap-2 cursor-default select-none">
                  <span className="inline-block w-4 h-4 border border-black bg-white shrink-0"></span>
                  <span className="font-medium text-black">Materials from Customer</span>
                </label>
              </div>
            </div>

            {/* Right: Cost Calculated */}
            <div className="p-3 flex flex-col justify-between min-h-[78px]">
              <div className="font-bold uppercase text-[11px] text-black mb-1">
                Cost Calculated
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: Received Finished Goods (Engineer), Quality Inspection (QC), Received Finished Goods (Store Keeper) */}
          <div className="grid grid-cols-3">
            {/* 1. Received Finished Goods - Engineer */}
            <div className="p-3 border-r border-neutral-300 flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="font-bold uppercase text-[11px] text-black leading-tight">
                  Received Finished Goods
                </div>
                <div className="text-[10px] text-neutral-600 font-medium">Engineer Acceptance</div>
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Finished Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>

            {/* 2. Quality Inspection - QC */}
            <div className="p-3 border-r border-neutral-300 flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="font-bold uppercase text-[11px] text-black leading-tight flex items-center justify-between">
                  <span>Quality Inspection</span>
                  <span className="text-[9px] font-bold text-neutral-600 font-mono">[ ] Pass</span>
                </div>
                <div className="text-[10px] text-neutral-600 font-medium">QC Inspector</div>
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">QC Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Checked Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
              </div>
            </div>

            {/* 3. Received Finished Goods - Store Keeper */}
            <div className="p-3 flex flex-col justify-between min-h-[96px]">
              <div>
                <div className="font-bold uppercase text-[11px] text-black leading-tight">
                  Received Finished Goods
                </div>
                <div className="text-[10px] text-neutral-600 font-medium">Store Keeper</div>
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-neutral-800 flex items-end">
                  <span className="font-semibold mr-1.5 shrink-0">Signature:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
                <div className="text-[10px] text-neutral-800 flex items-end mt-2.5">
                  <span className="font-semibold mr-1.5 shrink-0">Date:</span>
                  <span className="flex-1 border-b border-dotted border-black"></span>
                </div>
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
