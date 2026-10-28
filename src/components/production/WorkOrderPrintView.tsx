import React from 'react';
import { formatDate } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useQuotations } from '@/hooks/useData';

export interface WorkOrderPrintViewProps {
  workOrder: any;
  settings?: any;
}

export const WorkOrderPrintView: React.FC<WorkOrderPrintViewProps> = ({ workOrder, settings: propSettings }) => {
  // Access global company settings with fallback
  let contextSettings: any = null;
  try {
    const ctx = useSettings();
    contextSettings = ctx?.settings;
  } catch (e) {
    // If rendered outside SettingsProvider
    contextSettings = null;
  }
  const settings = propSettings || contextSettings;

  // Access all quotations to extract linked quotation technical specifications
  const { data: allQuotations = [] } = useQuotations();

  if (!workOrder) return null;

  // ── 1. WORK ORDER CORE ATTRIBUTES ──────────────────────────────────────────
  const woId = workOrder.id || 'WO-XXXX';
  const orderNo = workOrder.orderNo || workOrder.salesOrderNo || workOrder.soId || 'N/A';
  const quotationNo = workOrder.quotationNo || workOrder.quoteId || workOrder.quotationId || workOrder.sourceQuoteId || 'N/A';
  const customerName = workOrder.customerName || workOrder.customer || workOrder.clientName || 'In-House Production';
  const partName = workOrder.productName || workOrder.partName || workOrder.title || 'Precision Machined Component';
  const partNumber = workOrder.partNumber || workOrder.drawingNumber || workOrder.drawingNo || workOrder.sku || '-';
  const revision = workOrder.revision || workOrder.rev || '00';
  const batchQty = Number(workOrder.jobQty || workOrder.quantity || workOrder.qty || workOrder.batchQuantity || 1);
  const uom = workOrder.uom || workOrder.unit || 'Nos';
  const priority = workOrder.priority || 'Normal';
  const startDate = workOrder.plannedStartDate || workOrder.startDate || workOrder.createdAt || workOrder.created_at || new Date().toISOString().slice(0, 10);
  const dueDate = workOrder.deadline || workOrder.targetDate || workOrder.dueDate || workOrder.deliveryDate || '-';
  const notes = workOrder.notes || workOrder.description || '';

  // ── 2. MATCH & PARSE LINKED QUOTATION TECHNICAL SPECS (NO PRICING) ─────────
  const quoteRef = workOrder.quoteId || workOrder.sourceQuoteId || workOrder.quotationId || workOrder.quotationNo;
  const linkedQuote = allQuotations.find((q: any) => {
    if (!quoteRef && !workOrder.orderNo) return false;
    const qIdStr = String(q.id || '').trim();
    const qNoStr = String(q.quotationNo || '').trim().toLowerCase();
    const refStr = String(quoteRef || '').trim().toLowerCase();
    return (
      (refStr && (qIdStr.toLowerCase() === refStr || qNoStr === refStr || qNoStr.includes(refStr))) ||
      (workOrder.orderNo && q.orderNo && String(q.orderNo).toLowerCase() === String(workOrder.orderNo).toLowerCase())
    );
  });

  let quoteData: any = null;
  if (workOrder.quotationData) {
    try {
      quoteData = typeof workOrder.quotationData === 'string' ? JSON.parse(workOrder.quotationData) : workOrder.quotationData;
    } catch (e) {}
  }
  if (!quoteData && linkedQuote?.data) {
    try {
      quoteData = typeof linkedQuote.data === 'string' ? JSON.parse(linkedQuote.data) : linkedQuote.data;
    } catch (e) {}
  }

  // Quoted Technical Items from Quotation (Desc, Qty, Note - STRICTLY NO PRICING)
  const custItems: any[] = Array.isArray(quoteData?.custItems) ? quoteData.custItems : [];
  const quoteSubject = quoteData?.subject || linkedQuote?.title || '';
  const quoteDeliveryNotes = quoteData?.custDelivery || '';
  const quoteTechnicalNotes = quoteData?.notes || quoteData?.custTerms || '';

  // ── 3. EXTRACT BILL OF MATERIALS & RAW MATERIALS (NO PRICING) ───────────────
  let bomItems: any[] = [];
  if (Array.isArray(workOrder.bom)) {
    bomItems = workOrder.bom;
  } else if (typeof workOrder.bom === 'string') {
    try {
      bomItems = JSON.parse(workOrder.bom);
    } catch (e) {
      bomItems = [];
    }
  }

  // If workOrder.bom is empty, extract raw materials and cut sizes from quotation BOMs
  if ((!bomItems || bomItems.length === 0) && Array.isArray(quoteData?.boms)) {
    quoteData.boms.forEach((b: any, bIdx: number) => {
      const partTitle = b.title || `Part #${bIdx + 1}`;
      // Auto materials (Plates, Shafts with physical cutting dimensions)
      if (Array.isArray(b.autoMats)) {
        b.autoMats.forEach((m: any) => {
          let cutDim = '-';
          if (m.dia) {
            cutDim = `Ø${m.dia}mm × L:${m.length || '-'}mm (Round Bar)`;
          } else if (m.thick || m.width || m.length) {
            cutDim = `L:${m.length || '-'}mm × W:${m.width || '-'}mm × T:${m.thick || '-'}mm (Plate)`;
          }

          bomItems.push({
            partName: `${partTitle} - Raw Material`,
            materialGrade: m.material || 'Engineering Steel',
            dimensions: cutDim,
            quantity: Number(m.qty || 1) * batchQty,
            uom: 'Nos',
            issued: false
          });
        });
      }
      // Manual materials / hardware
      if (Array.isArray(b.manualMats)) {
        b.manualMats.forEach((mm: any) => {
          bomItems.push({
            partName: `${partTitle} - ${mm.name || mm.material || 'Material Item'}`,
            materialGrade: mm.grade || mm.spec || '-',
            dimensions: mm.size || mm.dimensions || '-',
            quantity: Number(mm.qty || 1) * batchQty,
            uom: mm.unit || 'Nos',
            issued: false
          });
        });
      }
    });
  }

  // ── 4. EXTRACT MACHINING OPERATIONS & CALCULATE MACHINING HOURS ─────────────
  let rawOps: any[] = [];
  if (Array.isArray(workOrder.operations) && workOrder.operations.length > 0) {
    rawOps = workOrder.operations;
  } else if (Array.isArray(workOrder.routing) && workOrder.routing.length > 0) {
    rawOps = workOrder.routing;
  } else if (typeof workOrder.operations === 'string') {
    try {
      rawOps = JSON.parse(workOrder.operations);
    } catch (e) {
      rawOps = [];
    }
  }

  // If workOrder operations are empty, extract from quotation BOM procState
  if (rawOps.length === 0 && Array.isArray(quoteData?.boms)) {
    let stepCount = 10;
    quoteData.boms.forEach((b: any, bIdx: number) => {
      const partLabel = b.title ? `[${b.title}] ` : '';
      if (b.procState && typeof b.procState === 'object') {
        Object.entries(b.procState).forEach(([procName, val]: [string, any]) => {
          const quoHours = Number(val?.quoHr || val?.estHr || val?.hours || 0);
          if (quoHours > 0) {
            rawOps.push({
              step: stepCount,
              operationName: `${partLabel}${procName}`,
              machineName: procName,
              plannedHours: quoHours,
              description: `Precision ${procName} machining per component drawing specifications`,
              status: 'Pending'
            });
            stepCount += 10;
          }
        });
      }
    });
  }

  // Standard engineering routing fallback if nothing found
  if (rawOps.length === 0) {
    rawOps = [
      { step: 10, operationName: 'Raw Material Stores', machineName: 'Bandsaw / Cut-off', plannedHours: 0.5, description: 'Verify raw material heat/grade, cut to size & inspect billet' },
      { step: 20, operationName: 'CNC Milling / Turning', machineName: 'CNC VMC / Lathe', plannedHours: 2.5, description: 'Precision machining operations - roughing, profiling & finish cuts' },
      { step: 30, operationName: 'Drilling & Tapping', machineName: 'Radial Drill / Bench', plannedHours: 1.0, description: 'Hole drilling, counterbores, precision reaming & thread tapping' },
      { step: 40, operationName: 'Deburring & Finishing', machineName: 'Manual Bench / Tumbler', plannedHours: 0.5, description: 'Edge deburring, sharp corner radius, degreasing & ultrasonic wash' },
      { step: 50, operationName: 'Quality Inspection (QC)', machineName: 'CMM / Height Gauge', plannedHours: 0.5, description: '100% dimensional verification against drawing tolerances' },
      { step: 60, operationName: 'Anti-Rust & Packaging', machineName: 'Packing Station', plannedHours: 0.5, description: 'Apply anti-corrosion oil, protective wrap & tag for store handover' },
    ];
  }

  // Normalize operations & calculate total machining time
  let totalMachiningHours = 0;
  const routingSteps = rawOps.map((op: any, idx: number) => {
    const stepNum = op.step || op.stepNumber || (idx + 1) * 10;
    const opName = op.operationName || op.station || op.operation || op.name || `Operation ${idx + 1}`;
    const machine = op.machineName || op.machine || op.workcenter || '-';
    const desc = op.description || op.notes || '-';
    
    // Extract planned hours accurately
    const hrsVal = Number(op.plannedHours ?? op.estHrs ?? op.quoHr ?? op.estHr ?? op.hours ?? 0);
    totalMachiningHours += (hrsVal > 0 ? hrsVal : 0);
    const formattedHrs = hrsVal > 0 ? `${hrsVal.toFixed(2)} hrs` : '-';

    return {
      stepNum,
      opName,
      machine,
      desc,
      formattedHrs,
      hrsVal,
      status: op.status || 'Pending'
    };
  });

  const companyName = settings?.company_name || 'REX INDUSTRIES (PVT) LTD';
  const companyAddress = settings?.company_address || 'No.451/2, Chilaw Road, Kattuwa, Negombo, Sri Lanka';
  const companyPhone = settings?.company_phone || '0094-31-2233117 / 2233315';
  const companyEmail = settings?.company_email || 'info@rexgroup.lk';

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
          border: 1.5px solid #000000 !important;
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
        #work-order-print-section .border-black { border-color: #000000 !important; }
        #work-order-print-section .bg-gray-100 { background-color: #f3f4f6 !important; }
        #work-order-print-section .bg-gray-50 { background-color: #f9fafb !important; }
        #work-order-print-section .page-break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        @media print {
          @page { size: A4 portrait; margin: 5mm 6mm; }
          html, body { background: #fff !important; color: #000 !important; }
        }
      `}</style>

      <div
        id="work-order-print-section"
        className="bg-white text-black mx-auto shadow-sm"
        style={{ width: '100%', maxWidth: '794px', minHeight: '1050px', fontSize: '10.5px', lineHeight: 1.35 }}
      >
        {/* ── 1. OFFICIAL COMPANY LETTERHEAD ───────────────────────────────── */}
        <div className="flex border-b border-black">
          <div className="w-[28%] flex items-center justify-center p-2.5 border-r border-black bg-white">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Company Logo" className="max-h-20 max-w-full object-contain" />
            ) : (
              <div className="text-3xl font-black text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
                REX
              </div>
            )}
          </div>
          <div className="w-[72%] p-2.5 pl-4 leading-tight bg-white">
            <h1 className="text-[17px] font-black uppercase text-black mb-0.5 tracking-tight" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
              {companyName}
            </h1>
            <p className="text-[9.5px] text-gray-800 whitespace-pre-line font-medium">{companyAddress}</p>
            <p className="text-[9.5px] text-gray-800 mt-0.5 font-medium">
              Tel: {companyPhone} &bull; Email: {companyEmail}
            </p>
          </div>
        </div>

        {/* ── 2. DOCUMENT TITLE & IDENTIFICATION BAR ────────────────────────── */}
        <div className="bg-gray-100 border-b border-black px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black uppercase tracking-wider text-black">
              PRODUCTION WORK ORDER &amp; SHOP-FLOOR TRAVELER
            </span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-black text-white">
              MANUFACTURING ONLY (ZERO PRICING)
            </span>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-700">WO NO:</span>
            <span className="font-mono font-black text-xs bg-black text-white px-2 py-0.5 tracking-wider">
              {woId}
            </span>
          </div>
        </div>

        {/* ── 3. WORK ORDER CORE METADATA & BATCH QUANTITY ──────────────────── */}
        <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
          {/* Left Column */}
          <div className="p-2.5 border-r border-black space-y-1">
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Customer:</span>
              <span className="font-black text-black flex-1 uppercase">{customerName}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Part / Job Title:</span>
              <span className="font-bold text-black flex-1">{partName}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Drawing / SKU:</span>
              <span className="font-mono font-bold text-black flex-1">{partNumber} (Rev: {revision})</span>
            </div>
            {quoteSubject && (
              <div className="flex">
                <span className="font-bold w-28 text-gray-700">Job Scope / Subj:</span>
                <span className="text-gray-900 font-medium flex-1 line-clamp-2">{quoteSubject}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="font-bold w-28 text-gray-700">Priority:</span>
              <span className={`font-black uppercase text-[9.5px] px-1.5 py-0.5 border ${
                priority === 'High' || priority === 'Urgent'
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-black text-black'
              }`}>
                {priority} PRIORITY
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className="p-2.5 space-y-1">
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Sales Order No:</span>
              <span className="font-mono font-bold text-black flex-1">{orderNo}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Quotation Ref:</span>
              <span className="font-mono font-bold text-black flex-1">{quotationNo}</span>
            </div>
            <div className="flex items-center bg-gray-100 p-1 border border-black">
              <span className="font-black w-32 text-black uppercase">Batch Order Qty:</span>
              <span className="font-black text-black text-[13px] flex-1 tracking-tight">
                {batchQty} {uom}
              </span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Issue / Release Date:</span>
              <span className="text-black font-medium flex-1">{formatDate(startDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Target Delivery Date:</span>
              <span className="font-bold text-black flex-1">
                {dueDate !== '-' ? formatDate(dueDate) : (quoteDeliveryNotes || 'TBD')}
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. QUOTATION TECHNICAL SPECIFICATIONS (STRICTLY NO PRICING) ──── */}
        {custItems.length > 0 && (
          <div className="border-b border-black page-break-inside-avoid">
            <div className="bg-gray-100 px-3 py-1 font-bold text-[10.5px] uppercase tracking-wider border-b border-black flex items-center justify-between">
              <span>Quotation Technical Line Items &amp; Scope Specifications</span>
              <span className="text-[9px] font-semibold text-gray-700">Commercial Prices Omitted</span>
            </div>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-black">
                  <th className="py-1 px-2 text-center w-8 border-r border-black font-bold">#</th>
                  <th className="py-1 px-2 text-left border-r border-black font-bold">Item Description &amp; Technical Scope</th>
                  <th className="py-1 px-2 text-center w-24 border-r border-black font-bold">Quoted Qty</th>
                  <th className="py-1 px-2 text-left border-black font-bold">Technical Specifications &amp; Notes</th>
                </tr>
              </thead>
              <tbody>
                {custItems.map((cItem: any, cIdx: number) => (
                  <tr key={cIdx} className="border-b border-gray-300 last:border-b-0">
                    <td className="py-1 px-2 text-center font-mono border-r border-black">{cIdx + 1}</td>
                    <td className="py-1 px-2 border-r border-black font-bold text-black">
                      {cItem.desc || cItem.description || cItem.name || `Item #${cIdx + 1}`}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-black text-black border-r border-black">
                      {cItem.qty} {uom}
                    </td>
                    <td className="py-1 px-2 text-gray-800">
                      {cItem.note || cItem.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5. BILL OF MATERIALS (BOM) & RAW MATERIAL REQUISITION ─────────── */}
        <div className="border-b border-black page-break-inside-avoid">
          <div className="bg-gray-100 px-3 py-1 font-bold text-[10.5px] uppercase tracking-wider border-b border-black flex items-center justify-between">
            <span>Bill of Materials (BOM) &amp; Raw Material Cutting Requisition</span>
            <span className="text-[9px] font-semibold text-gray-700">Stores Issue Verification</span>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-black">
                <th className="py-1 px-2 text-center w-8 border-r border-black font-bold">#</th>
                <th className="py-1 px-2 text-left border-r border-black font-bold">Material / Component Description</th>
                <th className="py-1 px-2 text-left w-28 border-r border-black font-bold">Material Grade / Spec</th>
                <th className="py-1 px-2 text-left w-36 border-r border-black font-bold">Cutting Dimensions / Size</th>
                <th className="py-1 px-2 text-center w-20 border-r border-black font-bold">Required Qty</th>
                <th className="py-1 px-2 text-center w-14 border-r border-black font-bold">UOM</th>
                <th className="py-1 px-2 text-center w-20 border-r border-black font-bold">Store Status</th>
                <th className="py-1 px-2 text-center w-24 font-bold">Store Sign</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.length > 0 ? (
                bomItems.map((item: any, idx: number) => {
                  const mName = item.partName || item.itemName || item.name || item.description || `Material #${idx + 1}`;
                  const mGrade = item.materialGrade || item.grade || item.specification || item.spec || '-';
                  const mDim = item.dimensions || item.cutSize || item.size || '-';
                  const mQty = Number(item.quantity || item.qty || item.requiredQty || 1);
                  const mUom = item.uom || item.unit || 'Nos';
                  const isIssued = Boolean(item.issued || item.storeIssued || item.status === 'Issued');

                  return (
                    <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                      <td className="py-1 px-2 text-center font-mono border-r border-black">{idx + 1}</td>
                      <td className="py-1 px-2 border-r border-black font-bold text-black">{mName}</td>
                      <td className="py-1 px-2 border-r border-black font-semibold text-gray-800">{mGrade}</td>
                      <td className="py-1 px-2 border-r border-black font-mono font-medium text-black">{mDim}</td>
                      <td className="py-1 px-2 text-center font-mono font-black text-black border-r border-black bg-gray-50">
                        {mQty}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-black">{mUom}</td>
                      <td className="py-1 px-2 text-center border-r border-black font-bold text-[9px]">
                        {isIssued ? (
                          <span className="text-black uppercase">[X] ISSUED</span>
                        ) : (
                          <span className="text-gray-500 font-mono">[ &nbsp; ] PENDING</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center text-gray-400">________</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-2.5 text-center text-gray-600 italic">
                    Raw material specifications per production drawing and workshop standard cutting sizes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. MACHINING PROCESS ROUTING & PLANNED HOURS ─────────────────── */}
        <div className="border-b border-black page-break-inside-avoid">
          {/* Header banner with Total Machining Hours */}
          <div className="bg-gray-100 px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider border-b border-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Machining Process Routing &amp; Shop-Floor Operations</span>
            </div>
            <div className="bg-black text-white px-2 py-0.5 text-[11px] font-black font-mono tracking-wide">
              TOTAL MACHINING TIME: {totalMachiningHours.toFixed(2)} HOURS
            </div>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-black">
                <th className="py-1.5 px-2 text-center w-10 border-r border-black font-bold">Op #</th>
                <th className="py-1.5 px-2 text-left w-32 border-r border-black font-bold">Operation / Process</th>
                <th className="py-1.5 px-2 text-left border-r border-black font-bold">Machining Instructions / Work Scope</th>
                <th className="py-1.5 px-2 text-left w-24 border-r border-black font-bold">Machine</th>
                <th className="py-1.5 px-2 text-center w-20 border-r border-black font-black bg-gray-100">Planned Hrs</th>
                <th className="py-1.5 px-2 text-center w-16 border-r border-black font-bold">Qty Done</th>
                <th className="py-1.5 px-2 text-center w-20 border-r border-black font-bold">Operator Sign</th>
                <th className="py-1.5 px-2 text-center w-20 font-bold">QC Sign</th>
              </tr>
            </thead>
            <tbody>
              {routingSteps.map((step: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-300 last:border-b-0 h-7">
                  <td className="py-1 px-2 text-center font-mono font-bold border-r border-black">
                    {step.stepNum}
                  </td>
                  <td className="py-1 px-2 font-black border-r border-black text-black">
                    {step.opName}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-gray-800 text-[9.5px]">
                    {step.desc}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-black font-mono text-[9px] font-semibold">
                    {step.machine}
                  </td>
                  <td className="py-1 px-2 text-center font-mono font-black border-r border-black bg-gray-50 text-black">
                    {step.formattedHrs}
                  </td>
                  <td className="py-1 px-2 text-center border-r border-black text-gray-300">
                    ______
                  </td>
                  <td className="py-1 px-2 text-center border-r border-black text-gray-300">
                    ______
                  </td>
                  <td className="py-1 px-2 text-center text-gray-300">
                    ______
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t border-black text-[10px]">
                <td colSpan={4} className="py-1 px-2 text-right uppercase border-r border-black font-black">
                  Total Planned Machining Hours:
                </td>
                <td className="py-1 px-2 text-center font-mono font-black text-black border-r border-black bg-gray-200">
                  {totalMachiningHours.toFixed(2)} hrs
                </td>
                <td colSpan={3} className="py-1 px-2 text-gray-600 italic text-[9px]">
                  * Record actual machining times in Job Traveler log
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── 7. QUALITY ASSURANCE & INSPECTION CHECKLIST ──────────────────── */}
        <div className="border-b border-black p-2.5 text-[10px] page-break-inside-avoid">
          <div className="font-bold text-[10.5px] uppercase tracking-wider mb-1.5 text-black flex items-center justify-between">
            <span>Quality Assurance &amp; Final Release Checklist:</span>
            <span className="text-[9px] font-bold text-gray-700">ISO 9001:2015 Manufacturing Quality</span>
          </div>

          <div className="grid grid-cols-4 gap-2 border border-black p-2 bg-gray-50">
            <div>
              <span className="font-bold block text-gray-800">1. Material Verification:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Mill Cert</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">2. Critical Dimensions:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Within Tol</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">3. Surface Finish (Ra):</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] N/A</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">4. Thread &amp; Fit Gauge:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] N/A</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">5. Deburring &amp; Edges:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Deburred</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">6. Ultrasonic Clean:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Cleaned</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">7. Anti-Rust Coating:</span>
              <span className="text-gray-600 font-mono text-[9px]">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Applied</span>
            </div>
            <div>
              <span className="font-bold block text-gray-800">8. Final Disposition:</span>
              <span className="text-gray-900 font-mono font-bold text-[9px]">[ &nbsp; ] ACCEPTED</span>
            </div>
          </div>

          {(notes || quoteTechnicalNotes) && (
            <div className="mt-2 text-gray-800 border-t border-gray-300 pt-1.5">
              <strong className="text-black uppercase">Technical Notes &amp; Special Instructions:</strong>{' '}
              <span>{notes || quoteTechnicalNotes}</span>
            </div>
          )}
        </div>

        {/* ── 8. SIGN-OFF AUTHORITIES & WORKSHOP RESPONSIBILITY ─────────────── */}
        <div className="grid grid-cols-5 border-b border-black text-center text-[9.5px] p-2 pt-8 page-break-inside-avoid">
          <div className="px-1">
            <div className="border-t border-black pt-1 font-bold">Production Planner</div>
            <div className="text-[8.5px] text-gray-600 mt-0.5">Prepared &amp; Released</div>
            <div className="text-[8.5px] text-gray-400 mt-0.5">Date: ____________</div>
          </div>
          <div className="px-1">
            <div className="border-t border-black pt-1 font-bold">Stores In-charge</div>
            <div className="text-[8.5px] text-gray-600 mt-0.5">Material Issued</div>
            <div className="text-[8.5px] text-gray-400 mt-0.5">Date: ____________</div>
          </div>
          <div className="px-1">
            <div className="border-t border-black pt-1 font-bold">Machinist / Operator</div>
            <div className="text-[8.5px] text-gray-600 mt-0.5">Machining Completed</div>
            <div className="text-[8.5px] text-gray-400 mt-0.5">Date: ____________</div>
          </div>
          <div className="px-1">
            <div className="border-t border-black pt-1 font-bold">Quality Inspector</div>
            <div className="text-[8.5px] text-gray-600 mt-0.5">QC Approved</div>
            <div className="text-[8.5px] text-gray-400 mt-0.5">Date: ____________</div>
          </div>
          <div className="px-1">
            <div className="border-t border-black pt-1 font-bold">Finished Goods Store</div>
            <div className="text-[8.5px] text-gray-600 mt-0.5">Received to Stock</div>
            <div className="text-[8.5px] text-gray-400 mt-0.5">Date: ____________</div>
          </div>
        </div>

        {/* ── 9. DOCUMENT CONTROL FOOTER ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-1 text-[8.5px] text-gray-600 bg-gray-50">
          <span>DOC REF: FO/PR/04</span>
          <span>ISSUE: 02 (TECHNICAL TRAVELER - ZERO COMMERCIAL PRICING)</span>
          <span>PRINTED: {new Date().toLocaleString()}</span>
          <span>REX INDUSTRIES &bull; ISO 9001:2015</span>
        </div>
      </div>
    </>
  );
};
