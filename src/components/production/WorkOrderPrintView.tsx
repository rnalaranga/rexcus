import React from 'react';
import { formatDate } from '@/lib/utils';

export interface WorkOrderPrintViewProps {
  workOrder: any;
  settings?: any;
}

export const WorkOrderPrintView: React.FC<WorkOrderPrintViewProps> = ({ workOrder, settings }) => {
  if (!workOrder) return null;

  // Extract work order fields
  const woId = workOrder.id || 'WO-XXXX';
  const orderNo = workOrder.orderNo || workOrder.salesOrderNo || workOrder.soId || 'N/A';
  const quotationNo = workOrder.quotationNo || workOrder.quotationId || 'N/A';
  const customerName = workOrder.customerName || workOrder.customer || workOrder.clientName || 'In-House Production';
  const partName = workOrder.productName || workOrder.partName || workOrder.title || 'Precision Machined Component';
  const partNumber = workOrder.partNumber || workOrder.drawingNumber || workOrder.drawingNo || workOrder.sku || '-';
  const revision = workOrder.revision || workOrder.rev || '00';
  const batchQty = Number(workOrder.quantity || workOrder.qty || workOrder.batchQuantity || 1);
  const uom = workOrder.uom || workOrder.unit || 'Nos';
  const priority = workOrder.priority || 'Normal';
  const startDate = workOrder.startDate || workOrder.created_at || new Date().toISOString().slice(0, 10);
  const dueDate = workOrder.targetDate || workOrder.dueDate || workOrder.deliveryDate || '-';
  const notes = workOrder.notes || workOrder.description || '';

  // Parse BOM Materials
  let bomItems: any[] = [];
  if (Array.isArray(workOrder.bom)) {
    bomItems = workOrder.bom;
  } else if (Array.isArray(workOrder.items)) {
    bomItems = workOrder.items;
  } else if (typeof workOrder.bom === 'string') {
    try {
      bomItems = JSON.parse(workOrder.bom);
    } catch (e) {
      bomItems = [];
    }
  }

  // Parse Operations / Routing
  let routingSteps: any[] = [];
  if (Array.isArray(workOrder.operations)) {
    routingSteps = workOrder.operations;
  } else if (Array.isArray(workOrder.routing)) {
    routingSteps = workOrder.routing;
  } else if (typeof workOrder.operations === 'string') {
    try {
      routingSteps = JSON.parse(workOrder.operations);
    } catch (e) {
      routingSteps = [];
    }
  }

  // Fallback default routing operations if none are specified
  if (routingSteps.length === 0) {
    routingSteps = [
      { step: 10, station: 'Raw Material Store', description: 'Material Verification, Cut to Length & Batch Inspection', machine: 'Bandsaw / Cut-off', estHrs: '0.5' },
      { step: 20, station: 'CNC Machining', description: 'CNC Milling / Turning - Roughing & Finish Operations', machine: 'CNC VMC-01', estHrs: '2.5' },
      { step: 30, station: 'Drilling & Tapping', description: 'Precision Drilling, Reaming & Thread Tapping', machine: 'Radial Drill / Bench', estHrs: '1.0' },
      { step: 40, station: 'Deburring & Finishing', description: 'Edge Deburring, Chamfering, Cleaning & Degreasing', machine: 'Manual / Tumbler', estHrs: '0.5' },
      { step: 50, station: 'Quality Inspection', description: 'First Article & 100% Dimensional Inspection against Drawing', machine: 'CMM / Height Gauge', estHrs: '0.5' },
      { step: 60, station: 'Packaging & Dispatch', description: 'Anti-Rust Coating, Protective Packaging & Final Sign-off', machine: 'Packing Area', estHrs: '0.5' },
    ];
  }

  const companyName = settings?.company_name || 'REX INDUSTRIES (PVT) LTD';
  const companyAddress = settings?.company_address || 'No.451/2, Chilaw Road, Kattuwa, Negombo, Sri Lanka';
  const companyPhone = settings?.company_phone || '0094-31-2233117 / 2233315';
  const companyEmail = settings?.company_email || 'info@rexgroup.lk';

  return (
    <div
      id="work-order-print-section"
      className="bg-white text-black mx-auto border border-black shadow-sm"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', lineHeight: 1.35 }}
    >
        {/* ── 1. LETTERHEAD & HEADER ────────────────────────────────────────── */}
        <div className="flex border-b border-black">
          <div className="w-[30%] flex items-center justify-center p-3 border-r border-black bg-white">
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Logo" className="max-h-20 max-w-full object-contain" />
            ) : (
              <div className="text-4xl font-black text-red-600 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
                REX
              </div>
            )}
          </div>
          <div className="w-[70%] p-3 pl-4 leading-tight bg-white">
            <h1 className="text-[18px] font-black uppercase text-black mb-1 tracking-tight" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
              {companyName}
            </h1>
            <p className="text-[10px] text-gray-800 whitespace-pre-line">{companyAddress}</p>
            <p className="text-[10px] text-gray-800 mt-0.5">Tel: {companyPhone} &bull; Email: {companyEmail}</p>
          </div>
        </div>

        {/* ── 2. DOCUMENT TITLE BAR ─────────────────────────────────────────── */}
        <div className="bg-gray-100 border-b border-black px-4 py-2 flex items-center justify-between">
          <div>
            <span className="text-[14px] font-black uppercase tracking-wider text-black">
              PRODUCTION WORK ORDER &amp; JOB TRAVELER
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5">
              {woId}
            </span>
          </div>
        </div>

        {/* ── 3. WORK ORDER CORE METADATA ───────────────────────────────────── */}
        <div className="grid grid-cols-2 border-b border-black text-[11px]">
          {/* Left Metadata Column */}
          <div className="p-3 border-r border-black space-y-1">
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Customer:</span>
              <span className="font-bold text-black flex-1">{customerName}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Part / Job Title:</span>
              <span className="font-bold text-black flex-1">{partName}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Drawing / SKU:</span>
              <span className="font-mono font-bold text-black flex-1">{partNumber} (Rev: {revision})</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28 text-gray-700">Priority:</span>
              <span className={`font-bold uppercase text-[10px] px-1.5 py-0.2 border ${
                priority === 'High' || priority === 'Urgent'
                  ? 'border-red-600 text-red-600'
                  : 'border-black text-black'
              }`}>
                {priority}
              </span>
            </div>
          </div>

          {/* Right Metadata Column */}
          <div className="p-3 space-y-1">
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Sales Order No:</span>
              <span className="font-mono font-bold text-black flex-1">{orderNo}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Quotation Ref:</span>
              <span className="font-mono text-black flex-1">{quotationNo}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Order Quantity:</span>
              <span className="font-bold text-black text-sm flex-1">{batchQty} {uom}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Release Date:</span>
              <span className="text-black flex-1">{formatDate(startDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-32 text-gray-700">Target Delivery:</span>
              <span className="font-bold text-black flex-1">{dueDate !== '-' ? formatDate(dueDate) : 'TBD'}</span>
            </div>
          </div>
        </div>

        {/* ── 4. BILL OF MATERIALS (BOM) & RAW MATERIALS ───────────────────── */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-3 py-1 font-bold text-[11px] uppercase tracking-wider border-b border-black flex items-center justify-between">
            <span>Bill of Materials &amp; Raw Material Requisition</span>
            <span className="text-[9px] font-normal text-gray-600">Store Issue Verification</span>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-black">
                <th className="py-1 px-2 text-center w-8 border-r border-black font-bold">#</th>
                <th className="py-1 px-2 text-left border-r border-black font-bold">Material / Component Description</th>
                <th className="py-1 px-2 text-left w-24 border-r border-black font-bold">Grade / Spec</th>
                <th className="py-1 px-2 text-left w-24 border-r border-black font-bold">Cut Size / Dim</th>
                <th className="py-1 px-2 text-right w-16 border-r border-black font-bold">Req Qty</th>
                <th className="py-1 px-2 text-center w-16 border-r border-black font-bold">UOM</th>
                <th className="py-1 px-2 text-center w-24 border-r border-black font-bold">Store Issue</th>
                <th className="py-1 px-2 text-center w-20 font-bold">Sign-off</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.length > 0 ? (
                bomItems.map((item: any, idx: number) => {
                  const mName = item.partName || item.itemName || item.name || item.description || `Item #${idx + 1}`;
                  const mGrade = item.materialGrade || item.grade || item.specification || item.spec || '-';
                  const mDim = item.dimensions || item.cutSize || item.size || '-';
                  const mQty = Number(item.quantity || item.qty || item.requiredQty || 1);
                  const mUom = item.uom || item.unit || 'Nos';
                  const isIssued = Boolean(item.issued || item.storeIssued || item.status === 'Issued');

                  return (
                    <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                      <td className="py-1 px-2 text-center font-mono border-r border-black">{idx + 1}</td>
                      <td className="py-1 px-2 border-r border-black font-semibold text-black">{mName}</td>
                      <td className="py-1 px-2 border-r border-black text-gray-700">{mGrade}</td>
                      <td className="py-1 px-2 border-r border-black font-mono text-gray-700">{mDim}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold border-r border-black">{mQty}</td>
                      <td className="py-1 px-2 text-center border-r border-black">{mUom}</td>
                      <td className="py-1 px-2 text-center border-r border-black font-semibold">
                        {isIssued ? <span className="text-emerald-700">ISSUED</span> : <span className="text-gray-400">[ &nbsp; &nbsp; ]</span>}
                      </td>
                      <td className="py-1 px-2 text-center text-gray-400">________</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-3 text-center text-gray-500 italic">
                    Standard raw materials allocated per production drawing specifications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── 5. SHOP FLOOR ROUTING & PROCESS TRAVELER ──────────────────────── */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-3 py-1 font-bold text-[11px] uppercase tracking-wider border-b border-black flex items-center justify-between">
            <span>Shop Floor Process Routing &amp; Inspection Sign-off</span>
            <span className="text-[9px] font-normal text-gray-600">Traveler Card</span>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-black">
                <th className="py-1.5 px-2 text-center w-10 border-r border-black font-bold">Op #</th>
                <th className="py-1.5 px-2 text-left w-28 border-r border-black font-bold">Workstation</th>
                <th className="py-1.5 px-2 text-left border-r border-black font-bold">Operation Description</th>
                <th className="py-1.5 px-2 text-left w-24 border-r border-black font-bold">Machine</th>
                <th className="py-1.5 px-2 text-center w-14 border-r border-black font-bold">Est. Hrs</th>
                <th className="py-1.5 px-2 text-center w-20 border-r border-black font-bold">Qty Done</th>
                <th className="py-1.5 px-2 text-center w-20 border-r border-black font-bold">Operator</th>
                <th className="py-1.5 px-2 text-center w-20 font-bold">QC Sign</th>
              </tr>
            </thead>
            <tbody>
              {routingSteps.map((step: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-300 last:border-b-0 h-8">
                  <td className="py-1 px-2 text-center font-mono font-bold border-r border-black">
                    {step.step || (idx + 1) * 10}
                  </td>
                  <td className="py-1 px-2 font-bold border-r border-black text-black">
                    {step.station || step.operation || step.name || '-'}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-gray-800">
                    {step.description || step.notes || '-'}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-gray-700 font-mono text-[9px]">
                    {step.machine || step.workcenter || '-'}
                  </td>
                  <td className="py-1 px-2 text-center font-mono border-r border-black">
                    {step.estHrs || step.duration || '-'}
                  </td>
                  <td className="py-1 px-2 text-center border-r border-black">
                    <span className="text-gray-300">______</span>
                  </td>
                  <td className="py-1 px-2 text-center border-r border-black">
                    <span className="text-gray-300">______</span>
                  </td>
                  <td className="py-1 px-2 text-center">
                    <span className="text-gray-300">______</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 6. QUALITY CONTROL & INSPECTION CRITERIA ───────────────────────── */}
        <div className="border-b border-black p-3 text-[10px]">
          <div className="font-bold text-[11px] uppercase tracking-wider mb-1.5 text-black">
            Quality Assurance &amp; Final Release Checklist:
          </div>
          <div className="grid grid-cols-4 gap-2 border border-gray-400 p-2 bg-gray-50">
            <div>
              <span className="font-bold block text-gray-700">1. Critical Dimensions:</span>
              <span className="text-gray-500">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Dev</span>
            </div>
            <div>
              <span className="font-bold block text-gray-700">2. Surface Finish (Ra):</span>
              <span className="text-gray-500">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] N/A</span>
            </div>
            <div>
              <span className="font-bold block text-gray-700">3. Thread &amp; Fit Check:</span>
              <span className="text-gray-500">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] N/A</span>
            </div>
            <div>
              <span className="font-bold block text-gray-700">4. Visual &amp; Deburr:</span>
              <span className="text-gray-500">[ &nbsp; ] Pass &nbsp; [ &nbsp; ] Reject</span>
            </div>
          </div>
          {notes && (
            <div className="mt-2 text-gray-700">
              <strong className="text-black">Special Job Instructions:</strong> {notes}
            </div>
          )}
        </div>

        {/* ── 7. SIGN-OFF AUTHORITIES ──────────────────────────────────────── */}
        <div className="grid grid-cols-4 border-b border-black text-center text-[10px] p-2 pt-10">
          <div className="px-2">
            <div className="border-t border-black pt-1 font-bold">Production Planner</div>
            <div className="text-[9px] text-gray-500 mt-0.5">Prepared By</div>
          </div>
          <div className="px-2">
            <div className="border-t border-black pt-1 font-bold">Shop Floor Supervisor</div>
            <div className="text-[9px] text-gray-500 mt-0.5">Assigned &amp; Released</div>
          </div>
          <div className="px-2">
            <div className="border-t border-black pt-1 font-bold">Quality Inspector</div>
            <div className="text-[9px] text-gray-500 mt-0.5">QC Verification</div>
          </div>
          <div className="px-2">
            <div className="border-t border-black pt-1 font-bold">Finished Goods Store</div>
            <div className="text-[9px] text-gray-500 mt-0.5">Received to Stock</div>
          </div>
        </div>

        {/* ── 8. FOOTER DOCUMENT CONTROL ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-1 text-[9px] text-gray-600 bg-gray-50">
          <span>DOC NO: FO/PR/04</span>
          <span>ISSUE NO: 01</span>
          <span>SYSTEM PRINT DATE: {new Date().toLocaleString()}</span>
          <span>ISO 9001:2015 COMPLIANT</span>
        </div>
      </div>
    );
  };
