import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const TaxReport: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/tax`)
      .then(res => res.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(console.error);
  }, []);

  const exportPDF = () => {
    const element = document.getElementById('tax-report');
    if (!element) return;
    const opt: any = { margin: 10, filename: `Tax_Report.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Tax & VAT Report</h1>
            <p className="text-[11px] text-muted mt-0.5">Net Tax Payable calculations</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Download} onClick={exportPDF} className="bg-rex-600 hover:bg-rex-700 text-white border-transparent">Export PDF</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <GlassCard className="p-0 max-w-4xl mx-auto overflow-hidden shadow-sm border border-theme-subtle">
           <div className="p-12 bg-white text-black" id="tax-report">
           {loading ? <div className="text-center animate-pulse text-xs font-medium text-gray-500">Calculating Taxes...</div> : (
             <div className="space-y-10">
               {/* BRANDED HEADER */}
               <div className="text-center border-b-2 border-black pb-6">
                 <img src="/rex-logo.png" alt="REX" className="h-10 object-contain mx-auto mb-4" />
                 <h2 className="text-xl font-black uppercase tracking-widest text-black">TAX SUMMARY REPORT</h2>
                 <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Generated on {new Date().toLocaleDateString()}</p>
               </div>

               <div>
                 <h3 className="font-bold text-xs uppercase tracking-widest mb-4 text-black border-b border-gray-300 pb-2">Net Tax Payable / Receivable</h3>
                 {data?.taxAccounts?.map((acc: any) => (
                   <div key={acc.id} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                     <span className="font-semibold text-gray-700 text-xs">{acc.code} - {acc.name}</span>
                     <span className={`font-mono text-sm font-bold ${acc.balance > 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                        {formatCurrency(acc.balance)} {acc.balance > 0 ? '(Payable)' : '(Claimable)'}
                     </span>
                   </div>
                 ))}
                 <div className="flex justify-between items-center py-4 border-t-2 border-b-4 border-double border-black mt-4">
                     <span className="font-black text-sm uppercase tracking-widest">Total Net Tax Liability</span>
                     <span className="font-mono text-lg font-black">{formatCurrency(data?.totalTaxPayable)}</span>
                 </div>
               </div>
               
               <div>
                 <h3 className="font-bold text-xs uppercase tracking-widest mb-4 text-black border-b border-gray-300 pb-2 mt-10">Recent Tax Transactions</h3>
                 <table className="w-full text-xs text-left">
                   <thead className="bg-gray-100 border-y border-gray-300">
                     <tr>
                       <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Date</th>
                       <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Ref</th>
                       <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Account</th>
                       <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Debit (Paid)</th>
                       <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Credit (Collected)</th>
                     </tr>
                   </thead>
                   <tbody>
                     {data?.taxLines?.map((line: any) => (
                       <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                         <td className="p-2">{new Date(line.date).toLocaleDateString()}</td>
                         <td className="p-2 font-mono text-[10px]">{line.reference}</td>
                         <td className="p-2">{line.accountId}</td>
                         <td className="p-2 text-right font-mono">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                         <td className="p-2 text-right font-mono">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
           </div>
        </GlassCard>
      </div>
    </div>
  );
};

