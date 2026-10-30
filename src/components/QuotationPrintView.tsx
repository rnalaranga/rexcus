import React from 'react'
import { formatCurrency } from '@/lib/utils'

function toWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = ['','Thousand','Million','Billion'];
  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };
  let result = '';
  let i = 0;
  let val = Math.floor(Math.abs(num));
  while (val > 0) {
    const chunk = val % 1000;
    if (chunk !== 0) {
      result = makeGroup(chunk) + ' ' + g[i] + ' ' + result;
    }
    val = Math.floor(val / 1000);
    i++;
  }
  return result.trim() + ' Rupees Only';
}

// Helper to deduplicate title repetitions and format line-by-line descriptions
const cleanDescLines = (rawDesc: string) => {
  if (!rawDesc) return { titleLine: '', detailLines: '' };
  const lines = rawDesc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { titleLine: '', detailLines: '' };

  const titleLine = lines[0];
  const titleClean = titleLine.replace(/\s*\([^)]*\)/g, '').replace(/^[•\-*\s]+/, '').trim().toLowerCase();

  const remaining: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    const lineClean = l.replace(/^[•\-*\s]+/, '').trim().toLowerCase();
    // If this line repeats the title, skip it
    if (lineClean === titleClean) {
      continue;
    }
    remaining.push(l);
  }

  return { titleLine, detailLines: remaining.join('\n') };
};

export const QuotationPrintView = ({ data, type, lead, settings }: { data: any, type: string, lead: any, settings: any }) => {
  const quotationType = type || 'main'
  
  // Safe extraction of all fields
  const docNo = data.docNo || 'FO/PD/02'
  const issueNo = data.issueNo || '01'
  const issueDate = data.issueDate || 'March 04, 2026'
  const quoDate = data.quoDate || new Date().toISOString().slice(0, 10)
  const rawSvat = String(data.svat || lead?.svat || '').trim();
  const rawVat = String(data.vatNo || data.vat || lead?.vat || '').trim();
  let rawTin = String(data.tinNo || data.tin || lead?.tin || lead?.brNumber || '').trim();
  // Strip out SVAT if it was mistakenly passed as tinNo so SVAT is NEVER shown on quotations
  if ((rawSvat && rawTin === rawSvat) || rawTin.toUpperCase().startsWith('SVAT') || rawTin.toUpperCase().includes('SVAT')) {
    rawTin = '';
  }

  const vatNo = rawVat;
  const tinNo = rawTin;
  const quotationNo = data.quotationNo || ''
  const attention = data.attention || ''
  const subject = data.subject || ''

  let toCompany = data.customerCompany || data.company || lead?.company || data.customerName || lead?.name || ''
  const leadContact = lead?.name || data.attention || ''
  if (leadContact && toCompany.toLowerCase().includes(`(${leadContact.toLowerCase()})`)) {
    toCompany = toCompany.replace(new RegExp(`\\s*\\(${leadContact}\\)`, 'i'), '').trim();
  }
  const toAddress = data.customerAddress || data.address || lead?.address || ''
  
  const custItems = data.custItems || []
  const custDiscount = data.custDiscount || 0
  const custDiscountType = data.custDiscountType || 'percent'
  const custTotals = data.custTotals || { subtotal: 0, discount: 0, total: 0, withSSCL: 0 }
  
  const jobTotals = data.jobTotals || { totalMaterialCost: 0, totalMachiningCost: 0, totalCost: 0, withSSCL: 0 };
    const isSsclHidden = Boolean(data.taxEnabled && data.selectedProfile && data.selectedProfile.tax1_show_separately === 0 && Number(data.selectedProfile.tax1_rate) > 0);
  const isVatHidden = Boolean(data.taxEnabled && data.selectedProfile && data.selectedProfile.tax2_show_separately === 0 && Number(data.selectedProfile.tax2_rate) > 0);
  const isSsclSeparate = Boolean(data.taxEnabled && data.selectedProfile && data.selectedProfile.tax1_show_separately === 1 && Number(data.selectedProfile.tax1_rate) > 0);
  const isVatSeparate = Boolean(data.taxEnabled && data.selectedProfile && data.selectedProfile.tax2_show_separately === 1 && Number(data.selectedProfile.tax2_rate) > 0);

  const t1Rate = Number(data.selectedProfile?.tax1_rate || 0) / 100;
  const t2Rate = Number(data.selectedProfile?.tax2_rate || 0) / 100;

  const isProductQuote = Boolean(
    data.isProductQuotation || 
    data.quotationCategory === 'product' || 
    data.isTaxInclusive ||
    (data.quotationNo && data.quotationNo.startsWith('PQ-'))
  );

  const quoteStatus = String(data.status || '').trim();
  const isApproved = ['Approved', 'Sent', 'Accepted', 'In Production', 'PO Received', 'Without PO'].some(
    s => s.toLowerCase() === quoteStatus.toLowerCase()
  ) || Boolean(data.isApproved || data.approvedBy);
  const showDraftWatermark = Boolean(
    !isApproved && 
    quoteStatus.toLowerCase() !== 'template' &&
    quotationType !== 'template' &&
    data.showDraftWatermark !== false
  );

  let multiplier = 1;
  let unitPriceDivisor = 1;
  if (isProductQuote) {
    if (isSsclHidden && !isVatHidden) {
      // Option 2: SSCL absorbed into supply value, VAT separate (Standard 18%)
      unitPriceDivisor = 1 + t2Rate;
      multiplier = 1;
    } else if (isSsclSeparate && isVatSeparate) {
      // Option 3: Both SSCL & VAT separate
      unitPriceDivisor = data.selectedProfile?.tax2_compound ? ((1 + t1Rate) * (1 + t2Rate)) : (1 + t1Rate + t2Rate);
      multiplier = 1;
    } else {
      unitPriceDivisor = 1;
      multiplier = 1;
    }
  } else {
    if (isSsclHidden && isVatHidden) {
      // Option 1: Both SSCL & VAT absorbed into unit prices & total supply value
      multiplier = data.selectedProfile?.tax2_compound ? ((1 + t1Rate) * (1 + t2Rate)) : (1 + t1Rate + t2Rate);
    } else if (isSsclHidden && !isVatHidden) {
      // Option 2: SSCL absorbed into unit prices & supply value, VAT separate
      multiplier = 1 + t1Rate;
    } else {
      // Option 3: Base unit prices, both taxes separate
      multiplier = 1;
    }
  }

  const rawWithSSCL = Number(custTotals.withSSCL || custTotals.total || 0);
  let displaySscl = Number(data.custSscl || 0);
  let displayVat = Number(data.custVat || 0);
  let displaySubtotal = Number(custTotals.subtotal || 0);
  let displayDiscount = Number(custTotals.discount || 0);
  let displayGrandTotal = quotationType === 'job' ? Number(jobTotals.withSSCL || 0) : rawWithSSCL;

  if (isProductQuote && data.taxEnabled && data.selectedProfile && quotationType !== 'job') {
    displayGrandTotal = rawWithSSCL;
    if (isVatSeparate && !isSsclSeparate) {
      // Option 2: VAT separate, SSCL absorbed into supply value
      const netBase = unitPriceDivisor > 0 ? (rawWithSSCL / unitPriceDivisor) : rawWithSSCL;
      const baseDiscount = displayDiscount > 0 ? (displayDiscount === Number(data.custDiscountAmount) ? (displayDiscount / unitPriceDivisor) : displayDiscount) : 0;
      displaySubtotal = netBase + baseDiscount;
      displayDiscount = baseDiscount;
      displayVat = rawWithSSCL - netBase;
      displaySscl = 0;
    } else if (isVatSeparate && isSsclSeparate) {
      // Option 3: Both separate
      const netBase = unitPriceDivisor > 0 ? (rawWithSSCL / unitPriceDivisor) : rawWithSSCL;
      const baseDiscount = displayDiscount > 0 ? (displayDiscount === Number(data.custDiscountAmount) ? (displayDiscount / unitPriceDivisor) : displayDiscount) : 0;
      displaySubtotal = netBase + baseDiscount;
      displayDiscount = baseDiscount;
      displaySscl = netBase * t1Rate;
      displayVat = data.selectedProfile?.tax2_compound ? ((netBase + displaySscl) * t2Rate) : (netBase * t2Rate);
    } else {
      // Option 1: Absorbed
      displaySubtotal = rawWithSSCL + displayDiscount;
      displaySscl = 0;
      displayVat = 0;
    }
  }
  
  const custTerms = data.custTerms || data.terms || data.paymentTerms || ''
  const custValidity = data.custValidity || data.validity || ''
  const custDelivery = data.custDelivery || data.delivery || data.deliveryTerms || ''

  // Resolve Bank Details for Quotation
  let activeBank: any = null;
  const rawBankDetails = data.bankDetails;
  const bankDetailId = data.bankDetailId;

  if (rawBankDetails && rawBankDetails !== 'none') {
    if (typeof rawBankDetails === 'string') {
      try { activeBank = JSON.parse(rawBankDetails); } catch (e) {}
    } else if (typeof rawBankDetails === 'object') {
      activeBank = rawBankDetails;
    }
  }

  if (!activeBank && rawBankDetails !== 'none') {
    const rawBankSettings = settings?.company_bank_details;
    if (rawBankSettings) {
      try {
        const parsed = typeof rawBankSettings === 'string' ? JSON.parse(rawBankSettings) : rawBankSettings;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (bankDetailId) {
            activeBank = parsed.find((b: any) => b.id === bankDetailId) || null;
          }
          if (!activeBank && rawBankDetails !== 'none') {
            activeBank = parsed.find((b: any) => b.isDefault) || parsed[0];
          }
        }
      } catch (e) {}
    }
  }

  // Fallback to legacy default if no settings exist and not explicitly set to 'none'
  if (!activeBank && rawBankDetails !== 'none') {
    activeBank = {
      accountName: settings?.company_name || 'REX INDUSTRIES (PVT) LTD',
      accountNumber: '011010078028',
      bankName: 'HATTON NATIONAL BANK',
      branchName: 'NEGOMBO'
    };
  }

  return (
    <>
      <style>{`
        /* Self-contained styling for QuotationPrintView - ensures 100% exact preview & vector PDF rendering in Puppeteer/print */
        #print-section {
          font-family: Arial, Helvetica, sans-serif !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          width: 100% !important;
          max-width: 794px !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
          font-size: 11px !important;
          line-height: 1.35 !important;
        }
        #print-section * {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #print-section table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        #print-section .border {
          border: 1px solid #000000 !important;
        }
        #print-section .border-b {
          border-bottom: 1px solid #000000 !important;
        }
        #print-section .border-t {
          border-top: 1px solid #000000 !important;
        }
        #print-section .border-r {
          border-right: 1px solid #000000 !important;
        }
        #print-section .border-l {
          border-left: 1px solid #000000 !important;
        }
        #print-section .border-black {
          border-color: #000000 !important;
        }
        #print-section .border-black\\/20 {
          border-color: rgba(0, 0, 0, 0.2) !important;
        }
        #print-section .flex {
          display: flex !important;
        }
        #print-section .flex-col {
          flex-direction: column !important;
        }
        #print-section .flex-1 {
          flex: 1 1 0% !important;
        }
        #print-section .items-center {
          align-items: center !important;
        }
        #print-section .items-start {
          align-items: flex-start !important;
        }
        #print-section .items-end {
          align-items: flex-end !important;
        }
        #print-section .justify-center {
          justify-content: center !important;
        }
        #print-section .justify-between {
          justify-content: space-between !important;
        }
        #print-section .bg-gray-50, 
        #print-section .bg-gray-50\\/50, 
        #print-section .bg-gray-50\\/30 {
          background-color: #f9fafb !important;
        }
        #print-section .bg-gray-100 {
          background-color: #f3f4f6 !important;
        }
        #print-section .text-center {
          text-align: center !important;
        }
        #print-section .text-right {
          text-align: right !important;
        }
        #print-section .text-left {
          text-align: left !important;
        }
        #print-section .font-bold {
          font-weight: 700 !important;
        }
        #print-section .font-semibold {
          font-weight: 600 !important;
        }
        #print-section .font-medium {
          font-weight: 500 !important;
        }
        #print-section .font-mono {
          font-family: 'JetBrains Mono', Courier, monospace !important;
        }
        #print-section .italic {
          font-style: italic !important;
        }
        #print-section .underline {
          text-decoration: underline !important;
        }
        #print-section .uppercase {
          text-transform: uppercase !important;
        }
        #print-section .leading-tight { line-height: 1.25 !important; }
        #print-section .leading-snug { line-height: 1.375 !important; }
        #print-section .p-1 { padding: 4px !important; }
        #print-section .p-1\\.5 { padding: 6px !important; }
        #print-section .p-2 { padding: 8px !important; }
        #print-section .p-3 { padding: 12px !important; }
        #print-section .p-4 { padding: 16px !important; }
        #print-section .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
        #print-section .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
        #print-section .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
        #print-section .pl-3 { padding-left: 12px !important; }
        #print-section .pr-2 { padding-right: 8px !important; }
        #print-section .pr-6 { padding-right: 24px !important; }
        #print-section .mb-0\\.5 { margin-bottom: 2px !important; }
        #print-section .mb-1 { margin-bottom: 4px !important; }
        #print-section .mt-0\\.5 { margin-top: 2px !important; }
        #print-section .mt-2 { margin-top: 8px !important; }
        #print-section .mt-6 { margin-top: 24px !important; }
        #print-section .mt-auto { margin-top: auto !important; }
        #print-section .w-\\[32\\%\\] { width: 32% !important; }
        #print-section .w-\\[68\\%\\] { width: 68% !important; }
        #print-section .w-\\[55\\%\\] { width: 55% !important; }
        #print-section .w-\\[45\\%\\] { width: 45% !important; }
        #print-section .w-\\[52\\%\\] { width: 52% !important; }
        #print-section .w-\\[48\\%\\] { width: 48% !important; }
        #print-section .w-14 { width: 56px !important; }
        #print-section .w-16 { width: 64px !important; }
        #print-section .w-20 { width: 80px !important; }
        #print-section .w-24 { width: 96px !important; }
        #print-section .w-28 { width: 112px !important; }
        #print-section .w-full { width: 100% !important; }
        #print-section .max-h-20 { max-height: 80px !important; }
        #print-section .object-contain { object-fit: contain !important; }
        #print-section .whitespace-pre-line { white-space: pre-line !important; }
        #print-section .whitespace-pre-wrap { white-space: pre-wrap !important; }
        #print-section .align-top { vertical-align: top !important; }
        #print-section .gap-1 { gap: 4px !important; }
        #print-section .shrink-0 { flex-shrink: 0 !important; }
        #print-section .mr-1 { margin-right: 4px !important; }
        #print-section .mr-1\\.5 { margin-right: 6px !important; }
        #print-section .h-6 { height: 24px !important; }
        #print-section .h-7 { height: 28px !important; }
        #print-section .h-full { height: 100% !important; }
        #print-section .tracking-widest { letter-spacing: 0.1em !important; }
        #print-section .tracking-tighter { letter-spacing: -0.05em !important; }
        #print-section .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: auto !important;
            overflow: visible !important;
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
          #print-section, #print-section * { visibility: visible !important; }
          #print-section {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            display: block !important;
            min-height: 0 !important;
            height: auto !important;
          }
          #print-section > div {
            min-height: 0 !important;
            height: auto !important;
            display: block !important;
          }
          #print-section .table-body-container {
            min-height: 0 !important;
            flex: none !important;
            display: block !important;
          }
          #print-section .draft-watermark {
            display: flex !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) rotate(-35deg) !important;
            opacity: 0.12 !important;
            z-index: 10 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <div
        id="print-section"
        className="mx-auto w-full bg-white text-black leading-snug flex flex-col shadow-sm print:shadow-none print:m-0 print:p-0 print:border-none print:w-full print:max-w-none print:min-h-0 print:h-auto"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          maxWidth: '794px',
          width: '100%',
          minHeight: '1050px',
          fontSize: '11px',
          boxSizing: 'border-box'
        }}
      >
        <div className="border border-black flex flex-col flex-1 justify-between print:min-h-0 print:h-auto print:block print:border-black relative overflow-hidden" style={{ minHeight: '1040px' }}>
          
          {/* DRAFT WATERMARK (CENTERED) */}
          {showDraftWatermark && (
            <div
              className="draft-watermark"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 10,
                opacity: 0.12,
                color: '#000000',
                fontSize: '110px',
                fontWeight: 900,
                fontFamily: 'Arial Black, Impact, sans-serif',
                border: '8px dashed rgba(0, 0, 0, 0.4)',
                padding: '14px 50px',
                borderRadius: '24px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap'
              }}
              aria-hidden="true"
            >
              DRAFT
            </div>
          )}
          
          {/* Header */}
          <div className="flex p-3 border-b border-black items-center print-no-break">
            <div className="w-[32%] flex justify-center items-center">
              {settings?.company_logo
                ? <img src={settings.company_logo} alt="Logo" className="max-h-20 object-contain" />
                : <div className="text-4xl font-black text-red-600 tracking-tighter" style={{fontFamily: 'Impact, sans-serif'}}>REX</div>}
            </div>
            <div className="w-[68%] pl-3">
              <h1 className="text-[19px] font-black mb-1 leading-tight" style={{fontFamily: 'Arial Black, Impact, sans-serif'}}>
                {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
              </h1>
              <table className="text-[11px] leading-tight w-full" style={{fontFamily: 'Arial, Helvetica, sans-serif'}}>
                <tbody>
                  <tr>
                    <td className="font-bold w-14 align-top">Office</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-line">{settings?.company_address || settings?.companyAddress || 'No.451/2,Chilaw Road, Kattuwa,\nNegombo,11500,Sri Lanka'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-14 align-top">Tel.</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-14 align-top">E-mail</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-14 align-top">Web</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-14 align-top">TIN</td>
                    <td className="align-top font-bold">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_tin || settings?.company_vat || settings?.tin || '114106470-7000'}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Title */}
          <div className="text-center font-bold text-[14px] py-1 border-b border-black tracking-widest uppercase bg-gray-50/50 print-no-break">
            QUOTATION
          </div>

          {/* TO / Details */}
          <div className="flex border-b border-black text-[11px] print-no-break">
            <div className="w-[55%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <div className="font-bold italic mb-0.5 text-[10px] text-gray-700">TO</div>
                {toCompany && (
                  <div className="font-bold text-[12px] uppercase leading-tight text-black">
                    {toCompany}
                  </div>
                )}
                {toAddress && (
                  <div className="whitespace-pre-line text-[10.5px] leading-snug text-black mt-0.5">
                    {toAddress}
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-0.5 font-medium text-[10.5px]">
                <div className="flex items-start">
                  <span className="w-16 font-bold shrink-0">{vatNo ? 'VAT No.' : (tinNo ? 'TIN No.' : 'VAT No.')}</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1">{vatNo || tinNo || '-'}</span>
                </div>
              </div>
            </div>
            <div className="w-[45%] p-0">
              <table className="w-full h-full text-[11px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-20">QUO DATE</td>
                    <td className="p-1.5 font-mono">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{quoDate}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-black font-bold">QUO NO</td>
                    <td className="p-1.5 font-bold font-mono">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{quotationNo}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Attention & Subject */}
          <div className="px-3 py-1.5 border-b border-black flex flex-col gap-1 text-[11px] print-no-break">
            <div className="flex items-start">
              <span className="w-20 font-bold shrink-0">ATTENTION</span>
              <span className="font-bold mr-1.5 shrink-0">:</span>
              <span className="flex-1">{attention || '-'}</span>
            </div>
            <div className="flex items-start">
              <span className="w-20 font-bold shrink-0">SUBJECT</span>
              <span className="font-bold mr-1.5 shrink-0">:</span>
              <span className="font-bold underline uppercase flex-1 whitespace-pre-wrap">{subject}</span>
            </div>
          </div>

          {/* Table Container - Uses true HTML table with fixed layout for 100% pixel-perfect column alignment */}
          <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed', borderSpacing: 0 }}>
            <colgroup>
              <col style={{ width: '55%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="font-bold border-b border-black text-center bg-gray-50 print-no-break">
                <th className="p-1.5 border-r border-black font-bold text-center">DESCRIPTION</th>
                <th className="p-1.5 border-r border-black font-bold text-center">QTY</th>
                <th className="p-1.5 border-r border-black font-bold text-center leading-tight">UNIT PRICE<br/>({data.currency || 'LKR'})</th>
                <th className="p-1.5 font-bold text-center leading-tight">AMOUNT<br/>({data.currency || 'LKR'})</th>
              </tr>
            </thead>
            <tbody>
              {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => {
                const { titleLine, detailLines } = cleanDescLines(item.desc || '');

                return (
                  <tr key={idx} className="border-b border-black/20 print-no-break">
                    <td className="p-1.5 border-r border-black align-top whitespace-pre-wrap">
                      <div className="font-semibold text-gray-900 leading-tight">
                        {titleLine}
                      </div>
                      {detailLines && (
                        <div className="text-[10.5px] text-gray-700 mt-0.5 leading-snug font-sans">
                          {detailLines}
                        </div>
                      )}
                      {item.note && <div className="text-[10px] text-gray-500 italic mt-0.5">{item.note}</div>}
                    </td>
                    <td className="p-1.5 border-r border-black text-center align-top font-mono font-medium">
                      {Number(item.qty || 0).toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-black text-right align-top font-mono">
                      {((Number(item.unitPrice) || 0) * (isProductQuote ? (1 / unitPriceDivisor) : multiplier)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className="p-1.5 text-right align-top font-mono font-semibold">
                      {(((Number(item.qty) * Number(item.unitPrice)) || 0) * (isProductQuote ? (1 / unitPriceDivisor) : multiplier)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                );
              })}
              {quotationType === 'job' && (
                <tr>
                  <td colSpan={4} className="font-bold italic text-gray-500 text-center py-6">
                    [Internal Job Items / Costing - Use Customer Quote for Print]
                  </td>
                </tr>
              )}
              {custItems.length === 0 && quotationType !== 'job' && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400 italic text-[11px] border-b border-black/20">
                    No line items entered.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {/* Sub Total */}
              <tr className="border-t border-b border-black print-no-break h-6 text-[11px]">
                <td colSpan={2} className="text-right font-bold pr-6">
                  {isSsclHidden && isVatHidden 
                    ? 'Total Value of Supply' 
                    : 'Sub Total'}
                </td>
                <td className="font-bold text-center border-l border-black">
                  {data.currency || 'LKR'}
                </td>
                <td className="text-right font-bold p-1 border-l border-black pr-2 font-mono">
                  {Number(quotationType === 'job' ? jobTotals.totalCost : (isProductQuote ? displaySubtotal : (custTotals.subtotal || 0) * multiplier)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </td>
              </tr>

              {/* Discount */}
              {quotationType !== 'job' && (isProductQuote ? displayDiscount > 0 : custTotals.discount > 0) && (
                <tr className="border-b border-black print-no-break h-6 text-[11px]">
                  <td colSpan={2} className="text-right pr-6">Discount</td>
                  <td className="text-center border-l border-black">
                    {custDiscountType === 'amount'
                      ? `${(displaySubtotal > 0 ? ((isProductQuote ? displayDiscount : custTotals.discount) / displaySubtotal) * 100 : 0).toFixed(2).replace(/\.00$/, '')} %`
                      : `${Number(custDiscount || 0)} %`}
                  </td>
                  <td className="text-right p-1 border-l border-black pr-2 font-mono">
                    {Number(isProductQuote ? displayDiscount : (custTotals.discount || 0) * multiplier).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              )}

              {/* SSCL */}
              {data.selectedProfile && isSsclSeparate && (quotationType === 'job' ? data.jobSscl > 0 : (isProductQuote ? displaySscl > 0 : data.custSscl > 0)) && (
                <tr className="border-b border-black print-no-break h-6 text-[11px]">
                  <td colSpan={2} className="text-right pr-6">{data.selectedProfile.tax1_name || 'SSCL'}</td>
                  <td className="text-center border-l border-black">{Number(data.selectedProfile.tax1_rate).toFixed(2)} %</td>
                  <td className="text-right p-1 border-l border-black pr-2 font-mono">
                    {Number(quotationType === 'job' ? data.jobSscl : (isProductQuote ? displaySscl : data.custSscl)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              )}

              {/* VAT */}
              {data.selectedProfile && isVatSeparate && (quotationType === 'job' ? data.jobVat > 0 : (isProductQuote ? displayVat > 0 : data.custVat > 0)) && (
                <tr className="border-b border-black print-no-break h-6 text-[11px]">
                  <td colSpan={2} className="text-right pr-6">{data.selectedProfile.tax2_name || 'VAT'}</td>
                  <td className="text-center border-l border-black">{Number(data.selectedProfile.tax2_rate).toFixed(2)} %</td>
                  <td className="text-right p-1 border-l border-black pr-2 font-mono">
                    {Number(quotationType === 'job' ? data.jobVat : (isProductQuote ? displayVat : data.custVat)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              )}

              {/* Grand Total */}
              <tr className="border-b border-black print-no-break h-7 bg-gray-100 text-[11.5px]">
                <td colSpan={2} className="text-right font-bold pr-6">Grand Total</td>
                <td className="font-bold text-center border-l border-black">{data.currency || 'LKR'}</td>
                <td className="text-right font-bold p-1 border-l border-black pr-2 font-mono">
                  {Number(displayGrandTotal).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Value in words */}
          <div className="py-1.5 px-3 border-b border-black text-[10.5px] font-bold print-no-break bg-gray-50/30">
            <span className="uppercase">VALUE : {data.currency || 'LKR'} {toWords(Math.round(displayGrandTotal))}</span>
          </div>

          {/* Footer Notes & Bank */}
          <div className="flex print-no-break">
            <div className="w-[52%] p-2 border-r border-black text-[10px]">
              <div className="font-bold underline mb-0.5">TERMS & CONDITIONS</div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-24 align-top font-medium">Payment terms</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="mr-1.5 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-wrap">{custTerms}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-24 align-top font-medium">Validity</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="mr-1.5 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-wrap">{custValidity}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-24 align-top font-medium">Delivery</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="mr-1.5 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-wrap">{custDelivery}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              {activeBank && (
                <>
                  <div className="mt-2 font-bold underline mb-0.5">BANK DETAILS</div>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="w-24 align-top font-medium">A/C NAME</td>
                        <td className="align-top font-bold">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.accountName || settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top font-medium">A/C NO</td>
                        <td className="align-top font-bold">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 font-mono">{activeBank.accountNumber}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top font-medium">BANK</td>
                        <td className="align-top">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.bankName}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top font-medium">BRANCH</td>
                        <td className="align-top">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.branchName || '-'}</span>
                          </div>
                        </td>
                      </tr>
                      {activeBank.swiftCode && (
                        <tr>
                          <td className="w-24 align-top font-medium">SWIFT</td>
                          <td className="align-top">
                            <div className="flex items-start">
                              <span className="mr-1.5 shrink-0">:</span>
                              <span className="flex-1 font-mono">{activeBank.swiftCode}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            
            <div className="w-[48%] p-2 flex flex-col justify-between text-[10px]">
              <div></div>
              <div>
                <div className="flex justify-between items-end mt-6 px-3">
                  <div className="text-center w-28 border-t border-black pt-1 font-semibold">Prepared By</div>
                  <div className="text-center w-28 border-t border-black pt-1 font-semibold">Authorized By</div>
                </div>
                <div className="mt-2 text-[9px] text-center text-gray-500 italic">This is a system generated quotation, no signature required.</div>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t flex items-center justify-between px-3 py-1 text-[8px] font-bold text-black w-full print-no-break">
            <span>DOC NO: {docNo}</span>
            <span>ISSUE NO: {issueNo}</span>
            <span>ISSUE DATE: {issueDate}</span>
          </div>
        </div>
      </div>
    </>
  )
}