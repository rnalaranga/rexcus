import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const AgedReports: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<'ar'|'ap'>('ar');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3000/api/finance/reports/aging?type=${reportType}`)
      .then(res => res.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(console.error);
  }, [reportType]);

  const exportPDF = () => {
    const el = document.getElementById('aged-report');
    if (el) {
      const opt: any = { margin: 10, filename: `Aged_${reportType.toUpperCase()}_Report.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      html2pdf().from(el).set(opt).save();
    }
  };

  const total30 = data.reduce((sum, r) => sum + Number(r.bucket30), 0);
  const total60 = data.reduce((sum, r) => sum + Number(r.bucket60), 0);
  const total90 = data.reduce((sum, r) => sum + Number(r.bucket90), 0);
  const total90plus = data.reduce((sum, r) => sum + Number(r.bucket90plus), 0);
  const grandTotal = data.reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Aged Partner Reports</h1>
            <p className="text-[11px] text-muted mt-0.5">Track overdue receivables and payables by time buckets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={exportPDF}>Export PDF</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex gap-2 mb-4">
           <button onClick={() => setReportType('ar')} className={`px-4 py-1.5 text-xs font-medium border rounded-full transition-colors ${reportType === 'ar' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme-subtle text-secondary hover:border-primary/50'}`}>Aged Receivables (Customers)</button>
           <button onClick={() => setReportType('ap')} className={`px-4 py-1.5 text-xs font-medium border rounded-full transition-colors ${reportType === 'ap' ? 'bg-amber-500 text-white border-amber-500' : 'bg-surface border-theme-subtle text-secondary hover:border-amber-500/50'}`}>Aged Payables (Suppliers)</button>
        </div>
        
        <GlassCard className="p-0 overflow-hidden shadow-sm border border-theme-subtle max-w-5xl">
           <div className="p-10 bg-white text-black" id="aged-report">
             
             <div className="text-center border-b-2 border-black pb-6 mb-8">
               <img src="/rex-logo.png" alt="REX" className="h-10 object-contain mx-auto mb-4" />
               <h2 className="text-xl font-black uppercase tracking-widest text-black">
                 {reportType === 'ar' ? 'AGED RECEIVABLES REPORT' : 'AGED PAYABLES REPORT'}
               </h2>
               <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">
                 Generated on {new Date().toLocaleDateString()}
               </p>
             </div>

             {loading ? <div className="text-center py-10 animate-pulse text-xs font-medium text-gray-500">Querying Ledger...</div> : (
               data.length === 0 ? <div className="text-center py-10 text-gray-400 text-xs">No pending {reportType === 'ar' ? 'receivables' : 'payables'} found.</div> : (
                 <table className="w-full text-xs text-left">
                   <thead className="bg-gray-100 border-y border-gray-300">
                     <tr>
                       <th className="p-3 font-bold uppercase tracking-wider text-[9px]">{reportType === 'ar' ? 'Customer' : 'Supplier'} Name</th>
                       <th className="p-3 font-bold uppercase tracking-wider text-[9px] text-right">0 - 30 Days</th>
                       <th className="p-3 font-bold uppercase tracking-wider text-[9px] text-right">31 - 60 Days</th>
                       <th className="p-3 font-bold uppercase tracking-wider text-[9px] text-right">61 - 90 Days</th>
                       <th className="p-3 font-bold uppercase tracking-wider text-[9px] text-right text-red-600">90+ Days</th>
                       <th className="p-3 font-black uppercase tracking-wider text-[9px] text-right">Total Due</th>
                     </tr>
                   </thead>
                   <tbody>
                     {data.map((row: any) => (
                       <tr key={row.partyId} className="border-b border-gray-100 hover:bg-gray-50">
                         <td className="p-3 font-bold text-gray-700">{row.partyName}</td>
                         <td className="p-3 text-right font-mono text-gray-500">{row.bucket30 > 0 ? formatCurrency(row.bucket30) : '-'}</td>
                         <td className="p-3 text-right font-mono text-gray-500">{row.bucket60 > 0 ? formatCurrency(row.bucket60) : '-'}</td>
                         <td className="p-3 text-right font-mono text-amber-600">{row.bucket90 > 0 ? formatCurrency(row.bucket90) : '-'}</td>
                         <td className="p-3 text-right font-mono text-red-600 font-bold">{row.bucket90plus > 0 ? formatCurrency(row.bucket90plus) : '-'}</td>
                         <td className="p-3 text-right font-mono font-black">{formatCurrency(row.balance)}</td>
                       </tr>
                     ))}
                   </tbody>
                   <tfoot className="bg-gray-50 border-t-2 border-b-4 border-double border-black font-bold">
                     <tr>
                       <td className="p-3 uppercase tracking-widest text-[10px] text-right">Total</td>
                       <td className="p-3 text-right font-mono">{formatCurrency(total30)}</td>
                       <td className="p-3 text-right font-mono">{formatCurrency(total60)}</td>
                       <td className="p-3 text-right font-mono text-amber-600">{formatCurrency(total90)}</td>
                       <td className="p-3 text-right font-mono text-red-600">{formatCurrency(total90plus)}</td>
                       <td className="p-3 text-right font-mono font-black">{formatCurrency(grandTotal)}</td>
                     </tr>
                   </tfoot>
                 </table>
               )
             )}
           </div>
        </GlassCard>
      </div>
    </div>
  );
};

