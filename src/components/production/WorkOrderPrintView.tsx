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

  // 1. Core attributes
  const soNo = workOrder.orderNo || workOrder.salesOrderNo || workOrder.soId || workOrder.id || 'SO-5475';
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
    'Growrite Substrates (Pvt)Ltd'
  ).trim();

  // Header meta values
  const grnNo = workOrder.grnNo || linkedOrder?.customerGrnNo || quoteData?.grnNo || linkedQuote?.grnNo || '-';
  const bomNo = workOrder.bomNo || quoteData?.bomNo || '-';
  const preparedBy = workOrder.preparedBy || linkedQuote?.createdByName || linkedQuote?.createdBy || 'T';
  const projectNo = workOrder.projectNo || quoteData?.projectNo || '-';
  const informedDate = workOrder.informedDate || '-';
  const deliveredDate = workOrder.deliveredDate || workOrder.deadline || linkedOrder?.deliveryDate || quoteData?.custDelivery || '-';
  const jobType = workOrder.jobType || workOrder.type || linkedOrder?.productName || quoteData?.subject || linkedQuote?.title || '-';

  const rawDate = workOrder.createdAt || workOrder.orderDate || linkedOrder?.createdAt || new Date();
  const orderDate = formatDate(rawDate);
  const rfqDate = quoteData?.rfqDate || workOrder.rfqDate || '-';

  // 2. Extract item descriptions (EXACT quotation description!)
  let displayItems: Array<{ sNo: number; desc: string; qty: number | string }> = [];

  // Priority 1: From linked quotation custItems
  if (Array.isArray(quoteData?.custItems) && quoteData.custItems.length > 0) {
    displayItems = quoteData.custItems.map((ci: any, idx: number) => ({
      sNo: idx + 1,
      desc: ci.desc || ci.description || ci.name || `Item ${idx + 1}`,
      qty: ci.qty || 1
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
        qty: it.qty || 1
      }));
    }
  }
  // Priority 3: From workOrder.items or workOrder.bom
  else if (Array.isArray(workOrder.items) && workOrder.items.length > 0) {
    displayItems = workOrder.items.map((it: any, idx: number) => ({
      sNo: idx + 1,
      desc: it.description || it.productName || it.name || `Item ${idx + 1}`,
      qty: it.qty || 1
    }));
  } else if (Array.isArray(workOrder.bom) && workOrder.bom.length > 0) {
    displayItems = workOrder.bom.map((b: any, idx: number) => ({
      sNo: idx + 1,
      desc: b.material || b.description || b.name || `Item ${idx + 1}`,
      qty: b.qty || 1
    }));
  }

  // Fallback if no items found
  if (displayItems.length === 0) {
    displayItems = [{
      sNo: 1,
      desc: workOrder.productName || workOrder.partName || workOrder.title || 'To Machining Plate as per the Given Instruction',
      qty: workOrder.jobQty || workOrder.quantity || 1
    }];
  }

  const companyName = settings?.company_name || 'REX INDUSTRIES (PVT) LTD';
  const companyAddress = settings?.company_address || 'No.451/2,Chilaw Road,, Kattuwa,\nNegombo,11500,Sri Lanka';
  const companyPhone = settings?.company_phone || '0094-31-2233117 / 2233315 / 2223136';
  const companyEmail = settings?.company_email || 'info@rexgroup.lk';
  const companyWeb = settings?.company_website || 'www.rexgroup.lk';

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
        @media print {
          @page { size: A4 portrait; margin: 6mm 6mm; }
          html, body { background: #fff !important; color: #000 !important; }
        }
      `}</style>

      <div
        id="work-order-print-section"
        className="bg-white text-black mx-auto shadow-sm flex flex-col"
        style={{
          width: '100%',
          maxWidth: '794px',
          minHeight: '1100px',
          fontSize: '11px',
          lineHeight: 1.3
        }}
      >
        {/* ── 1. COMPANY HEADER ── */}
        <div className="flex border-b border-black">
          {/* Logo Column */}
          <div className="w-[38%] p-3.5 flex flex-col justify-center border-r border-black">
            <div className="flex items-center gap-3">
              <img
                src={settings?.company_logo || "/rex-logo.png"}
                alt="REX"
                className="max-h-16 max-w-[170px] object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="flex flex-col">
                <span className="text-[26px] font-black tracking-tight text-red-600 leading-none" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  REX
                </span>
                <span className="text-[7.5px] font-bold tracking-wider text-black mt-1">SINCE 1977</span>
                <span className="text-[8.5px] font-black italic tracking-wide text-black uppercase">BRACING THE FUTURE</span>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="w-[62%] p-3 pl-4 leading-snug">
            <h1 className="text-[17px] font-black uppercase text-black tracking-tight mb-1" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
              {companyName}
            </h1>
            <div className="text-[10px] text-black space-y-0.5 font-medium">
              <div className="flex">
                <span className="w-14 font-bold shrink-0">Office :</span>
                <span className="whitespace-pre-line">{companyAddress}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-bold shrink-0">Tel. :</span>
                <span>{companyPhone}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-bold shrink-0">E-mail :</span>
                <span>{companyEmail}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-bold shrink-0">Web :</span>
                <span>{companyWeb}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. DOCUMENT TITLE ── */}
        <div className="py-1 text-center border-b border-black font-black text-sm uppercase tracking-wide">
          Sales order
        </div>

        {/* ── 3. METADATA BOX GRID ── */}
        <table className="w-full border-collapse border-b border-black text-[10.5px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="font-bold px-2 py-1 border-r border-black w-[10%]">GRN NO</td>
              <td className="px-2 py-1 border-r border-black w-[10%] font-mono">{grnNo}</td>
              <td className="font-bold px-2 py-1 border-r border-black w-[10%]">BOM NO</td>
              <td className="px-2 py-1 border-r border-black w-[10%] font-mono">{bomNo}</td>
              <td className="font-bold px-2 py-1 border-r border-black w-[12%]">Prepred by</td>
              <td className="px-2 py-1 border-r border-black w-[8%] font-mono">{preparedBy}</td>
              <td className="font-bold px-2 py-1 border-r border-black w-[12%]">Project no</td>
              <td className="px-2 py-1 border-r border-black w-[10%] font-mono">{projectNo}</td>
              <td className="font-bold px-2 py-1 border-r border-black w-[8%]">SO NO</td>
              <td className="px-2 py-1 font-mono font-black w-[10%]">{soNo}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="font-bold px-2 py-1 border-r border-black">Informed</td>
              <td className="px-2 py-1 border-r border-black font-mono">{informedDate}</td>
              <td className="font-bold px-2 py-1 border-r border-black">Delivered</td>
              <td className="px-2 py-1 border-r border-black font-mono">{deliveredDate}</td>
              <td className="font-bold px-2 py-1 border-r border-black">Type of job</td>
              <td colSpan={5} className="px-2 py-1">{jobType}</td>
            </tr>
            <tr>
              <td className="font-bold px-2 py-1 border-r border-black">Customer</td>
              <td colSpan={3} className="px-2 py-1 border-r border-black font-bold uppercase">{customerName}</td>
              <td className="font-bold px-2 py-1 border-r border-black">Date</td>
              <td colSpan={2} className="px-2 py-1 border-r border-black font-mono">{orderDate}</td>
              <td className="font-bold px-2 py-1 border-r border-black">Date RFQD</td>
              <td colSpan={2} className="px-2 py-1 font-mono">{rfqDate}</td>
            </tr>
          </tbody>
        </table>

        {/* ── 4. ITEMS TABLE (EXACT QUOTATION DESCRIPTION, ZERO PRICING, NO IMAGE) ── */}
        <div className="border-b border-black flex-1 flex flex-col min-h-[380px]">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1.5 px-2 border-r border-black w-14 text-center font-black">S/NO.</th>
                <th className="py-1.5 px-3 border-r border-black text-center font-black">DESCRIPTION</th>
                <th className="py-1.5 px-3 w-20 text-center font-black">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx} className="border-b border-black/30">
                  <td className="py-2 px-2 text-center font-mono font-bold border-r border-black align-top">
                    {item.sNo}.
                  </td>
                  <td className="py-2 px-3 border-r border-black font-medium text-black align-top whitespace-pre-line leading-relaxed">
                    {item.desc}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-black align-top">
                    {item.qty}
                  </td>
                </tr>
              ))}
              {/* Spacer Row to extend lines down */}
              <tr style={{ height: `${Math.max(160, 380 - displayItems.length * 45)}px` }}>
                <td className="border-r border-black">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 5. SIGNATURE ROW 1 ── */}
        <div className="grid grid-cols-3 border-b border-black text-center text-[10px] py-4 px-2">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-2">
              <span>CRM</span>
              <span>DATE</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-56 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-56 font-bold px-2">
              <span>Senior Design Engineer</span>
              <span>DATE</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-2">
              <span>Workshop Engineer</span>
              <span>Date</span>
            </div>
          </div>
        </div>

        {/* ── 6. MATERIALS & COST CALCULATED SECTION ── */}
        <div className="grid grid-cols-2 border-b border-black text-[10px]">
          {/* Left: MATERIALS */}
          <div className="border-r border-black">
            <div className="text-center font-black py-1 border-b border-black uppercase tracking-wider">
              MATERIALS
            </div>
            <div className="grid grid-cols-2 divide-x divide-black py-3 text-center font-bold">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border border-black"></span>
                <span>BOM ATTACHED</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border border-black"></span>
                <span>FROM THE CUSTOMER</span>
              </div>
            </div>
          </div>

          {/* Right: Cost Calculated */}
          <div>
            <div className="text-center font-black py-1 border-b border-black uppercase tracking-wider">
              Cost Calculated
            </div>
            <div className="py-2.5 px-6 flex justify-between items-center text-center font-bold">
              <div className="flex flex-col items-center">
                <div className="w-32 border-b border-dotted border-black mb-1"></div>
                <span>Signature</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-28 border-b border-dotted border-black mb-1"></div>
                <span>Date</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. SIGNATURE ROW 2 ── */}
        <div className="grid grid-cols-3 border-b border-black text-center text-[10px] py-4 px-2">
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[9.5px]">
              <span>Engineer</span>
              <span>Job Finished Date</span>
            </div>
            <span className="text-[9px] text-gray-700 mt-0.5">Received the Finished Goods</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[9.5px]">
              <span>QC</span>
              <span>Final Checked Date</span>
            </div>
            <span className="text-[9px] text-gray-700 mt-0.5">Quality inspection</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-48 border-b border-dotted border-black mb-1"></div>
            <div className="flex justify-between w-48 font-bold px-1 text-[9.5px]">
              <span>Store Keeper</span>
              <span>Received Date</span>
            </div>
            <span className="text-[9px] text-gray-700 mt-0.5">Received the Finished Goods</span>
          </div>
        </div>

        {/* ── 8. FOOTER NOTICE ── */}
        <div className="p-1.5 text-center font-black text-[9px] uppercase tracking-wider">
          PLEASE ENSURE ALL COLUMNS ARE DULY FILLED AND GOODS HAVE BEEN PROPERLY INSPECTED &amp; SIGNED BEFORE RELEASE
        </div>
      </div>
    </>
  );
};
