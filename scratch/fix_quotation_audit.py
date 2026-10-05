import sys
import re

# ── 1. Fix QuotationBuilder.tsx ──
with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# Add useTaxProfiles
content = content.replace("import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'", "import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'\nimport { useTaxProfiles } from '@/hooks/useFinance'")

# Replace selectedTaxes with selectedProfileId
content = content.replace("const [selectedTaxes, setSelectedTaxes] = useState<any[]>([])", "const { data: taxProfiles } = useTaxProfiles()\n  const [taxEnabled, setTaxEnabled] = useState(true)\n  const [selectedProfileId, setSelectedProfileId] = useState<string>('')")

# Update calculation logic for custWithSSCL and jobWithSSCL
old_totals = """  const jobTotalCost = totalMaterialCost + totalMachiningCost
  const vatPct = Number(settings?.vat_percentage || 0);
  const jobWithSSCL = jobTotalCost * (1 + (vatPct / 100));

  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const custDiscountAmt = custSubtotal * (Number(custDiscount) / 100)
  const custTotal = custSubtotal - custDiscountAmt
  const custWithSSCL = custTotal * (1 + (vatPct / 100));
  
  const expectedProfit = custWithSSCL - jobWithSSCL
  const expectedMargin = custWithSSCL > 0 ? (expectedProfit / custWithSSCL) * 100 : 0"""

new_totals = """  const jobTotalCost = totalMaterialCost + totalMachiningCost
  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const custDiscountAmt = custSubtotal * (Number(custDiscount) / 100)
  const custTotal = custSubtotal - custDiscountAmt
  
  let jobTaxAmount = 0; let jobSscl = 0; let jobVat = 0;
  let custTaxAmount = 0; let custSscl = 0; let custVat = 0;
  
  const selectedProfile = (taxEnabled && selectedProfileId) ? taxProfiles?.find((p: any) => p.id === selectedProfileId) : null;
  
  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    
    // Job Taxes
    jobSscl = jobTotalCost * t1;
    jobVat = selectedProfile.tax2_compound ? (jobTotalCost + jobSscl) * t2 : jobTotalCost * t2;
    jobTaxAmount = jobSscl + jobVat;
    
    // Cust Taxes
    custSscl = custTotal * t1;
    custVat = selectedProfile.tax2_compound ? (custTotal + custSscl) * t2 : custTotal * t2;
    custTaxAmount = custSscl + custVat;
  }
  
  const jobWithSSCL = jobTotalCost + jobTaxAmount;
  const custWithSSCL = custTotal + custTaxAmount;
  
  const expectedProfit = custWithSSCL - jobWithSSCL
  const expectedMargin = custWithSSCL > 0 ? (expectedProfit / custWithSSCL) * 100 : 0"""
content = content.replace(old_totals, new_totals)

# Add Tax Profile UI in right sidebar (replacing the empty space)
old_right = """                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Margin</span>"""

new_right = """                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2 mb-3 border-b border-theme-subtle/50 pb-2">
                    <button onClick={() => setTaxEnabled(t => !t)} className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}>
                      <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                    {taxEnabled && (
                      <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
                        className="flex-1 bg-surface border border-theme-subtle px-1.5 py-1 rounded text-[10px] outline-none focus:border-blue-500">
                        <option value="">— Select Tax Profile —</option>
                        {taxProfiles?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Margin</span>"""
content = content.replace(old_right, new_right)

# Update data props in Live Preview & Print Modal
def replace_data(match):
    old = match.group(0)
    # replace selectedTaxes with the new vars
    rep = old.replace("selectedTaxes", "selectedProfile, custSscl, custVat, jobSscl, jobVat")
    return rep

content = re.sub(r'data=\{\{.*?\}\}', replace_data, content, flags=re.DOTALL)

# Add state save/restore for taxes
content = content.replace("setSubject(snap.subject || 'To machining parts as per given sample')", "setSubject(snap.subject || 'To machining parts as per given sample')\n    setTaxEnabled(snap.taxEnabled ?? true)\n    setSelectedProfileId(snap.selectedProfileId || '')")
content = content.replace("totalAmount: amount, customAmount: null", "totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled")
content = content.replace("jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },", "jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,")

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated QuotationBuilder.tsx")


# ── 2. Fix QuotationPrintView.tsx ──
with open('src/components/QuotationPrintView.tsx', 'r') as f:
    content2 = f.read()

old_print_totals = """            {/* Discount */}
            {quotationType !== 'job' && custTotals.discount > 0 && (
               <div className="flex border-b border-black items-center h-8">
                 <div className="w-[65%] text-right pr-6">Discount</div>
                 <div className="w-[15%] text-center">{custDiscount} %</div>
                 <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                   {Number(custTotals.discount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </div>
               </div>
            )}

            {data.selectedTaxes && data.selectedTaxes.length > 0 ? (
               data.selectedTaxes.map((tax: any, idx: number) => {
                 const taxAmount = (quotationType === 'job' ? jobTotals.totalCost : custTotals.total) * (Number(tax.rate) / 100);
                 return (
                   <div key={idx} className="flex border-b border-black items-center h-8">
                     <div className="w-[65%] text-right pr-6">{tax.name}</div>
                     <div className="w-[15%] text-center">{Number(tax.rate).toFixed(2)} %</div>
                     <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                       {Number(taxAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                     </div>
                   </div>
                 )
               })
            ) : (
               Number(settings?.vat_percentage) > 0 && (
                 <div className="flex border-b border-black items-center h-8">
                   <div className="w-[65%] text-right pr-6">VAT</div>
                   <div className="w-[15%] text-center">{Number(settings?.vat_percentage || 0).toFixed(2)} %</div>
                   <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                     {Number(quotationType === 'job' ? jobTotals.totalCost * (Number(settings?.vat_percentage || 0) / 100) : custTotals.total * (Number(settings?.vat_percentage || 0) / 100) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </div>
                 </div>
               )
            )}"""

new_print_totals = """            {/* Discount */}
            {quotationType !== 'job' && custTotals.discount > 0 && (
               <div className="flex border-b border-black items-center h-8">
                 <div className="w-[65%] text-right pr-6">Discount</div>
                 <div className="w-[15%] text-center">{data.custDiscount} %</div>
                 <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                   {Number(custTotals.discount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </div>
               </div>
            )}

            {data.selectedProfile && (quotationType === 'job' ? data.jobSscl > 0 : data.custSscl > 0) && (
                 <div className="flex border-b border-black items-center h-8">
                   <div className="w-[65%] text-right pr-6">{data.selectedProfile.tax1_name || 'SSCL'}</div>
                   <div className="w-[15%] text-center">{Number(data.selectedProfile.tax1_rate).toFixed(2)} %</div>
                   <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                     {Number(quotationType === 'job' ? data.jobSscl : data.custSscl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </div>
                 </div>
            )}
            
            {data.selectedProfile && (quotationType === 'job' ? data.jobVat > 0 : data.custVat > 0) && (
                 <div className="flex border-b border-black items-center h-8">
                   <div className="w-[65%] text-right pr-6">{data.selectedProfile.tax2_name || 'VAT'}</div>
                   <div className="w-[15%] text-center">{Number(data.selectedProfile.tax2_rate).toFixed(2)} %</div>
                   <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                     {Number(quotationType === 'job' ? data.jobVat : data.custVat).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                   </div>
                 </div>
            )}"""

content2 = content2.replace(old_print_totals, new_print_totals)

with open('src/components/QuotationPrintView.tsx', 'w') as f:
    f.write(content2)
print("Updated QuotationPrintView.tsx")
