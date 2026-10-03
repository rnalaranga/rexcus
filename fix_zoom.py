import re
file_path = 'H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'''           {/\* LIVE PREVIEW CANVAS \*/}
           <div className="flex-1 overflow-y-auto bg-gray-500/5 relative p-4 custom-scrollbar flex justify-center">
              <div style={{ width: '436px', height: '617px', flexShrink: 0 }} className="relative mb-8">
                 <div className="origin-top-left shadow-2xl ring-1 ring-black/5 bg-white overflow-hidden" 
                      style={{ transform: 'scale(0.55)', width: '794px', height: '1123px', position: 'absolute', top: 0, left: 0 }}>
                    <div className="w-full h-full p-[48px] pointer-events-none flex flex-col">
                      <QuotationPrintView 
                         data={{
                            docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
                            custItems, custDiscount, boms,
                            custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
                            jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
                            custTerms, custValidity, custDelivery, selectedTaxes, currency, currencySymbol: currencies\?\.find\(c => c\.code === currency\)\?\.symbol || 'Rs\.'
                         }}
                         type="main"
                         lead={lead}
                         settings={settings}
                      />
                    </div>
                 </div>
              </div>
           </div>'''

replacement = r'''           {/* LIVE PREVIEW CANVAS */}
           <div className="flex-1 overflow-y-auto bg-gray-500/5 relative p-4 custom-scrollbar flex justify-center">
              {/* Scaled A4 Paper Container using zoom */}
              <div className="shadow-2xl ring-1 ring-black/5 bg-white flex flex-col mb-8" style={{ zoom: 0.55, width: '210mm', minHeight: '297mm', flexShrink: 0 }}>
                 <div className="w-full p-[48px] pointer-events-none flex flex-col flex-1">
                   <QuotationPrintView 
                      data={{
                         docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
                         custItems, custDiscount, boms,
                         custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
                         jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
                         custTerms, custValidity, custDelivery, selectedTaxes, currency, currencySymbol: currencies?.find(c => c.code === currency)?.symbol || 'Rs.'
                      }}
                      type="main"
                      lead={lead}
                      settings={settings}
                   />
                 </div>
              </div>
           </div>'''

import re
content = re.sub(target.replace(r'\/', '/').replace(r'\*', '*'), replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
