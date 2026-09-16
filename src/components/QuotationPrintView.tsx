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

export const QuotationPrintView = ({ data, type, lead, settings }: { data: any, type: string, lead: any, settings: any }) => {
  const quotationType = type || 'main'
  
  // Safe extraction of all fields
  const docNo = data.docNo || 'FO/PD/02'
  const issueNo = data.issueNo || '01'
  const issueDate = data.issueDate || 'March 04, 2026'
  const quoDate = data.quoDate || new Date().toISOString().slice(0, 10)
  const vatNo = data.vatNo || ''
  const tinNo = data.tinNo || ''
  const quotationNo = data.quotationNo || ''
  const attention = data.attention || ''
  const subject = data.subject || ''
  
  const custItems = data.custItems || []
  const custDiscount = data.custDiscount || 0
  const custTotals = data.custTotals || { subtotal: 0, discount: 0, total: 0, withSSCL: 0 }
  
  const jobTotals = data.jobTotals || { totalMaterialCost: 0, totalMachiningCost: 0, totalCost: 0, withSSCL: 0 }
  
  const custTerms = data.custTerms || ''
  const custValidity = data.custValidity || ''
  const custDelivery = data.custDelivery || ''

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; color: black; background: white; }
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
              <h1 className="text-[22px] font-black mb-2" style={{fontFamily: 'Arial Black, Impact, sans-serif'}}>REX INDUSTRIES (PVT) LTD</h1>
              <table className="text-[12px] leading-tight w-full" style={{fontFamily: 'Courier New, Courier, monospace'}}>
                <tbody>
                  <tr><td className="font-bold w-16 align-top">Office</td><td>: No.451/2,Chilaw Road, Kattuwa,<br/>  Negombo,11500,Sri Lanka</td></tr>
                  <tr><td className="font-bold">Tel.</td><td>: 0094-31-2233117 / 2233315 / 2223136</td></tr>
                  <tr><td className="font-bold">E-mail</td><td>: info@rexgroup.lk</td></tr>
                  <tr><td className="font-bold">Web</td><td>: www.rexgroup.lk</td></tr>
                  <tr><td className="font-bold">VAT</td><td className="font-bold">: No:114106470-7000  SVAT No:SVAT003857</td></tr>
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
                <div className="font-bold italic">TO</div>
                <div>{lead?.name || ''}</div>
                {lead?.company && <div>{lead.company}</div>}
                <div>{lead?.address || ''}</div>
              </div>
              <div className="mt-4">
                <div className="flex"><span className="w-24">VAT No.</span><span>: {vatNo}</span></div>
                <div className="flex"><span className="w-24">TIN No.</span><span>: {tinNo}</span></div>
              </div>
            </div>
            <div className="w-[45%] p-0">
              <table className="w-full h-full">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-24">DOC NO</td>
                    <td className="p-1.5">: {docNo}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">ISSUE NO</td>
                    <td className="p-1.5">: {issueNo}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">ISSUE DATE</td>
                    <td className="p-1.5">: {issueDate}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">QUO DATE</td>
                    <td className="p-1.5">: {quoDate}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-black font-bold">QUO NO</td>
                    <td className="p-1.5 font-bold">: {quotationNo}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Attention & Subject */}
          <div className="p-3 border-b border-black flex flex-col gap-1.5">
            <div className="flex"><span className="w-24 font-bold">ATTENTION</span><span>: {attention}</span></div>
            <div className="flex"><span className="w-24 font-bold">SUBJECT</span><span className="font-bold underline uppercase">: {subject}</span></div>
          </div>

          {/* Table Headers */}
          <div className="flex font-bold border-b border-black text-center bg-gray-50">
            <div className="w-[55%] p-2 border-r border-black">DESCRIPTION</div>
            <div className="w-[10%] p-2 border-r border-black">QTY</div>
            <div className="w-[15%] p-2 border-r border-black">UNIT PRICE<br/>(LKR)</div>
            <div className="w-[20%] p-2">AMOUNT<br/>(LKR)</div>
          </div>

          {/* Table Body */}
          <div className="flex min-h-[350px] text-[13px] bg-white">
            <div className="w-[55%] p-2 border-r border-black whitespace-pre-wrap flex flex-col gap-4">
              {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => (
                <div key={idx}>
                  <div>{item.desc}</div>
                  {item.note && <div className="text-xs text-gray-700">{item.note}</div>}
                </div>
              ))}
              {quotationType === 'job' && (
                <div className="font-bold italic text-gray-500 text-center mt-10">
                  [Internal Job Items / Costing - Use Customer Quote for Print]
                </div>
              )}
            </div>
            <div className="w-[10%] p-2 border-r border-black text-center flex flex-col gap-4">
              {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => (
                 <div key={idx}>{Number(item.qty).toFixed(2)}</div>
              ))}
            </div>
            <div className="w-[15%] p-2 border-r border-black text-right flex flex-col gap-4">
               {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => (
                 <div key={idx}>{formatCurrency(item.unitPrice).replace('Rs.','').trim()}</div>
              ))}
            </div>
            <div className="w-[20%] p-2 text-right flex flex-col gap-4">
               {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item: any, idx: number) => (
                 <div key={idx}>{formatCurrency(item.qty * item.unitPrice).replace('Rs.','').trim()}</div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-black flex flex-col">
            <div className="flex border-b border-black items-center h-8">
              <div className="w-[65%] text-right font-bold pr-6">Sub Total</div>
              <div className="w-[15%] font-bold text-center">LKR</div>
              <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                {formatCurrency(quotationType === 'job' ? jobTotals.totalCost : custTotals.subtotal).replace('Rs.','').trim()}
              </div>
            </div>
            
            {/* Discount */}
            {quotationType !== 'job' && custTotals.discount > 0 && (
               <div className="flex border-b border-black items-center h-8">
                 <div className="w-[65%] text-right pr-6">Discount</div>
                 <div className="w-[15%] text-center">{custDiscount} %</div>
                 <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                   {formatCurrency(custTotals.discount).replace('Rs.','').trim()}
                 </div>
               </div>
            )}

            <div className="flex border-b border-black items-center h-8">
              <div className="w-[65%] text-right pr-6">VAT</div>
              <div className="w-[15%] text-center">{Number(settings?.vat_percentage || 0).toFixed(2)} %</div>
              <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                {formatCurrency(quotationType === 'job' ? jobTotals.totalCost * (Number(settings?.vat_percentage || 0) / 100) : custTotals.total * (Number(settings?.vat_percentage || 0) / 100)).replace('Rs.','').trim()}
              </div>
            </div>

            <div className="flex items-center h-8 bg-gray-100">
              <div className="w-[65%] text-right font-bold pr-6">Grand Total</div>
              <div className="w-[15%] font-bold text-center">LKR</div>
              <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                {formatCurrency(quotationType === 'job' ? jobTotals.withSSCL : custTotals.withSSCL).replace('Rs.','').trim()}
              </div>
            </div>
          </div>

          {/* Value in words */}
          <div className="p-2 border-b border-t border-black text-[11px] font-bold">
            <span className="uppercase">VALUE : LKR {toWords(Math.round(quotationType === 'job' ? jobTotals.withSSCL : custTotals.withSSCL))}</span>
          </div>

          {/* Footer Notes & Bank */}
          <div className="flex">
            <div className="w-1/2 p-3 border-r border-black text-[11px]">
              <div className="font-bold underline mb-1">TERMS & CONDITIONS</div>
              <table className="w-full">
                <tbody>
                  <tr><td className="w-24">Payment terms</td><td>: {custTerms}</td></tr>
                  <tr><td>Validity</td><td>: {custValidity}</td></tr>
                  <tr><td>Delivery</td><td>: {custDelivery}</td></tr>
                </tbody>
              </table>
              <div className="mt-4 font-bold underline mb-1">BANK DETAILS</div>
              <table className="w-full">
                <tbody>
                  <tr><td className="w-24">A/C NAME</td><td className="font-bold">: REX INDUSTRIES (PVT) LTD</td></tr>
                  <tr><td>A/C NO</td><td>: 011010078028</td></tr>
                  <tr><td>BANK</td><td>: HATTON NATIONAL BANK</td></tr>
                  <tr><td>BRANCH</td><td>: NEGOMBO</td></tr>
                </tbody>
              </table>
            </div>
            
            <div className="w-1/2 p-3 flex flex-col justify-end text-[11px]">
              <div className="flex justify-between items-end mt-16 px-4">
                <div className="text-center w-32 border-t border-black pt-1">Prepared By</div>
                <div className="text-center w-32 border-t border-black pt-1">Authorized By</div>
              </div>
              <div className="mt-2 text-[10px] text-center text-gray-500 italic">This is a system generated quotation, no signature required.</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}