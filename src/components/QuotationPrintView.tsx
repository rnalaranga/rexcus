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
  const vatNo = data.vatNo || data.vat || lead?.vat || ''
  const tinNo = data.tinNo || data.tin || data.svat || lead?.svat || lead?.tin || ''
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

  let multiplier = 1;
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
        @media print {
          body * { visibility: hidden !important; }
          #print-section, #print-section * { visibility: visible !important; }
          #print-section { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 210mm !important; 
            margin: 0 !important; 
            padding: 0 !important;
            color: #000000 !important; 
            background: #ffffff !important; 
          }
        }
      `}</style>
      <div id="print-section" className="mx-auto w-full bg-white text-black leading-snug" style={{ fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: '800px', fontSize: '12px' }}>
        <div className="border border-black flex flex-col">
          
          {/* Header */}
          <div className="flex p-4 border-b border-black items-center">
            <div className="w-[35%] flex justify-center items-center">
              {settings?.company_logo
                ? <img src={settings.company_logo} alt="Logo" className="max-h-24" />
                : <div className="text-5xl font-black text-red-600 tracking-tighter" style={{fontFamily: 'Impact, sans-serif'}}>REX</div>}
            </div>
            <div className="w-[65%] pl-4">
              <h1 className="text-[22px] font-black mb-2" style={{fontFamily: 'Arial Black, Impact, sans-serif'}}>
                {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
              </h1>
              <table className="text-[12px] leading-tight w-full" style={{fontFamily: 'Courier New, Courier, monospace'}}>
                <tbody>
                  <tr>
                    <td className="font-bold w-16 align-top">Office</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-line">{settings?.company_address || settings?.companyAddress || 'No.451/2,Chilaw Road, Kattuwa,\nNegombo,11500,Sri Lanka'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-16 align-top">Tel.</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_phone || settings?.companyPhone || '0094-31-2233117 / 2233315 / 2223136'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-16 align-top">E-mail</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_email || settings?.companyEmail || 'info@rexgroup.lk'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-16 align-top">Web</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{settings?.company_web || settings?.companyWeb || 'www.rexgroup.lk'}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold w-16 align-top">TIN</td>
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
          <div className="text-center font-bold text-[16px] py-1.5 border-b border-black tracking-widest uppercase">
            QUOTATION
          </div>

          {/* TO / Details */}
          <div className="flex border-b border-black text-[12px]">
            <div className="w-[55%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <div className="font-bold italic mb-1 text-[11px] text-gray-700">TO</div>
                {toCompany && (
                  <div className="font-bold text-[13px] uppercase leading-snug text-black">
                    {toCompany}
                  </div>
                )}
                {toAddress && (
                  <div className="whitespace-pre-line text-[11px] leading-relaxed text-black mt-1">
                    {toAddress}
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-0.5 font-medium">
                <div className="flex items-start">
                  <span className="w-20 font-bold shrink-0">TIN No.</span>
                  <span className="font-bold mr-1 shrink-0">:</span>
                  <span className="flex-1">{tinNo || vatNo || '-'}</span>
                </div>
              </div>
            </div>
            <div className="w-[45%] p-0">
              <table className="w-full h-full">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-24">QUO DATE</td>
                    <td className="p-1.5">
                      <div className="flex items-start">
                        <span className="font-bold mr-1 shrink-0">:</span>
                        <span className="flex-1">{quoDate}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-black font-bold">QUO NO</td>
                    <td className="p-1.5 font-bold">
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
          <div className="p-3 border-b border-black flex flex-col gap-1.5">
            <div className="flex items-start">
              <span className="w-24 font-bold shrink-0">ATTENTION</span>
              <span className="font-bold mr-1.5 shrink-0">:</span>
              <span className="flex-1">{attention || '-'}</span>
            </div>
            <div className="flex items-start">
              <span className="w-24 font-bold shrink-0">SUBJECT</span>
              <span className="font-bold mr-1.5 shrink-0">:</span>
              <span className="font-bold underline uppercase flex-1 whitespace-pre-wrap">{subject}</span>
            </div>
          </div>

          {/* Table Headers */}
          <div className="flex font-bold border-b border-black text-center bg-gray-50">
            <div className="w-[55%] p-2 border-r border-black">DESCRIPTION</div>
            <div className="w-[10%] p-2 border-r border-black">QTY</div>
            <div className="w-[15%] p-2 border-r border-black">UNIT PRICE<br/>({data.currency || 'LKR'})</div>
            <div className="w-[20%] p-2">AMOUNT<br/>({data.currency || 'LKR'})</div>
          </div>

          {/* Table Body - Aligned Row by Row */}
          <div className="min-h-[350px] text-[13px] bg-white flex flex-col justify-between">
            <div className="flex flex-col">
              {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => {
                const { titleLine, detailLines } = cleanDescLines(item.desc || '');

                return (
                  <div key={idx} className="flex border-b border-black/15 min-h-[38px] items-stretch">
                    <div className="w-[55%] p-2 border-r border-black whitespace-pre-wrap">
                      <div className="font-semibold text-gray-900 leading-tight">
                        {titleLine}
                      </div>
                      {detailLines && (
                        <div className="text-[11.5px] text-gray-700 mt-1 leading-relaxed font-sans">
                          {detailLines}
                        </div>
                      )}
                      {item.note && <div className="text-xs text-gray-500 italic mt-0.5">{item.note}</div>}
                    </div>
                    <div className="w-[10%] p-2 border-r border-black text-center pt-2 font-mono font-medium">
                      {Number(item.qty || 0).toFixed(2)}
                    </div>
                    <div className="w-[15%] p-2 border-r border-black text-right pt-2 font-mono">
                      {((Number(item.unitPrice) || 0) * multiplier).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className="w-[20%] p-2 text-right pt-2 font-mono font-semibold">
                      {(((Number(item.qty) * Number(item.unitPrice)) || 0) * multiplier).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                  </div>
                );
              })}
              {quotationType === 'job' && (
                <div className="font-bold italic text-gray-500 text-center mt-10 p-4">
                  [Internal Job Items / Costing - Use Customer Quote for Print]
                </div>
              )}
            </div>
            {/* Empty space vertical borders for continuous ledger aesthetic */}
            <div className="flex flex-1 min-h-[40px]">
              <div className="w-[55%] border-r border-black"></div>
              <div className="w-[10%] border-r border-black"></div>
              <div className="w-[15%] border-r border-black"></div>
              <div className="w-[20%]"></div>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-black flex flex-col">
            <div className="flex border-b border-black items-center h-8">
              <div className="w-[65%] text-right font-bold pr-6">
                {isSsclHidden && isVatHidden 
                  ? 'Total Value of Supply' 
                  : 'Sub Total'}
              </div>
              <div className="w-[15%] font-bold text-center">{data.currency || 'LKR'}</div>
              <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                {Number((quotationType === 'job' ? jobTotals.totalCost : custTotals.subtotal || 0) * multiplier).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
            
            {/* Discount */}
            {quotationType !== 'job' && custTotals.discount > 0 && (
               <div className="flex border-b border-black items-center h-8">
                 <div className="w-[65%] text-right pr-6">Discount</div>
                 <div className="w-[15%] text-center">
                   {custDiscountType === 'amount'
                     ? `${(custTotals.subtotal > 0 ? (custTotals.discount / custTotals.subtotal) * 100 : 0).toFixed(2).replace(/\.00$/, '')} %`
                     : `${Number(custDiscount || 0)} %`}
                 </div>
                 <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                   {Number((custTotals.discount || 0) * multiplier).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </div>
               </div>
            )}

            {data.selectedProfile && isSsclSeparate && (quotationType === 'job' ? data.jobSscl > 0 : data.custSscl > 0) && (
                 <div className="flex border-b border-black items-center h-8">
                   <div className="w-[65%] text-right pr-6">{data.selectedProfile.tax1_name || 'SSCL'}</div>
                   <div className="w-[15%] text-center">{Number(data.selectedProfile.tax1_rate).toFixed(2)} %</div>
                   <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                     {Number(quotationType === 'job' ? data.jobSscl : data.custSscl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </div>
                 </div>
            )}
            
            {data.selectedProfile && isVatSeparate && (quotationType === 'job' ? data.jobVat > 0 : data.custVat > 0) && (
                 <div className="flex border-b border-black items-center h-8">
                   <div className="w-[65%] text-right pr-6">{data.selectedProfile.tax2_name || 'VAT'}</div>
                   <div className="w-[15%] text-center">{Number(data.selectedProfile.tax2_rate).toFixed(2)} %</div>
                   <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                     {Number(quotationType === 'job' ? data.jobVat : data.custVat).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </div>
                 </div>
            )}

            <div className="flex items-center h-8 bg-gray-100">
              <div className="w-[65%] text-right font-bold pr-6">Grand Total</div>
              <div className="w-[15%] font-bold text-center">{data.currency || 'LKR'}</div>
              <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                {Number(quotationType === 'job' ? jobTotals.withSSCL : custTotals.withSSCL || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
          </div>

          {/* Value in words */}
          <div className="p-2 border-b border-t border-black text-[11px] font-bold">
            <span className="uppercase">VALUE : {data.currency || 'LKR'} {toWords(Math.round(quotationType === 'job' ? jobTotals.withSSCL : custTotals.withSSCL))}</span>
          </div>

          {/* Footer Notes & Bank */}
          <div className="flex">
            <div className="w-1/2 p-3 border-r border-black text-[11px]">
              <div className="font-bold underline mb-1">TERMS & CONDITIONS</div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-24 align-top">Payment terms</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="mr-1.5 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-wrap">{custTerms}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-24 align-top">Validity</td>
                    <td className="align-top">
                      <div className="flex items-start">
                        <span className="mr-1.5 shrink-0">:</span>
                        <span className="flex-1 whitespace-pre-wrap">{custValidity}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-24 align-top">Delivery</td>
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
                  <div className="mt-4 font-bold underline mb-1">BANK DETAILS</div>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="w-24 align-top">A/C NAME</td>
                        <td className="align-top font-bold">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.accountName || settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top">A/C NO</td>
                        <td className="align-top font-bold">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 font-mono">{activeBank.accountNumber}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top">BANK</td>
                        <td className="align-top">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.bankName}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="w-24 align-top">BRANCH</td>
                        <td className="align-top">
                          <div className="flex items-start">
                            <span className="mr-1.5 shrink-0">:</span>
                            <span className="flex-1 uppercase">{activeBank.branchName || '-'}</span>
                          </div>
                        </td>
                      </tr>
                      {activeBank.swiftCode && (
                        <tr>
                          <td className="w-24 align-top">SWIFT</td>
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
            
            <div className="w-1/2 p-3 flex flex-col justify-end text-[11px]">
              <div className="flex justify-between items-end mt-16 px-4">
                <div className="text-center w-32 border-t border-black pt-1">Prepared By</div>
                <div className="text-center w-32 border-t border-black pt-1">Authorized By</div>
              </div>
              <div className="mt-2 text-[10px] text-center text-gray-500 italic">This is a system generated quotation, no signature required.</div>
            </div>
          </div>

          <div className="mt-auto border-t flex items-center justify-between px-4 py-2 text-[9px] font-bold text-black w-full">
            <span>DOC NO: {docNo}</span>
            <span>ISSUE NO: {issueNo}</span>
            <span>ISSUE DATE: {issueDate}</span>
          </div>
        </div>
      </div>
    </>
  )
}