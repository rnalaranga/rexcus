import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Download, Filter } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useCostCenters } from '@/hooks/useFinance';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const CustomReportBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: costCenters } = useCostCenters();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const [costCenterId, setCostCenterId] = useState('');
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleType = (t: string) => {
    if (accountTypes.includes(t)) setAccountTypes(accountTypes.filter(x => x !== t));
    else setAccountTypes([...accountTypes, t]);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, accountTypes, costCenterId })
      });
      const lines = await res.json();
      setData(lines);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const exportPDF = () => {
    const el = document.getElementById('custom-report');
    if (el) {
      const opt: any = { margin: 10, filename: `Custom_Report.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      html2pdf().from(el).set(opt).save();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Custom Report Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">Build dynamic financial reports with multiple filters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={exportPDF}>Export PDF</Button>
          <Button variant="primary" size="sm" icon={Play} onClick={generateReport} className="bg-rex-600 hover:bg-rex-700 text-white border-transparent">Generate Report</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex gap-5">
        <div className="w-80 shrink-0 space-y-4">
           <GlassCard className="p-5 border border-theme-subtle shadow-sm bg-surface/40">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-5 border-b border-theme-subtle pb-3"><Filter size={14}/> Report Filters</h3>
             
             <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1.5 tracking-wider">Date Range</label>
                  <div className="flex flex-col gap-2">
                    <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:border-primary transition-colors" />
                    <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:border-primary transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1.5 tracking-wider">Account Types</label>
                  <div className="flex flex-wrap gap-2">
                    {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => (
                      <button key={t} onClick={() => toggleType(t)} className={`px-3 py-1.5 text-[10px] rounded-full border transition-colors ${accountTypes.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-secondary border-theme hover:border-primary/50'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1.5 tracking-wider">Cost Center (Analytical)</label>
                  <select value={costCenterId} onChange={e=>setCostCenterId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:border-primary transition-colors">
                    <option value="">All Cost Centers</option>
                    {costCenters?.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
             </div>
           </GlassCard>
        </div>

        <GlassCard className="flex-1 p-0 overflow-hidden flex flex-col shadow-sm border border-theme-subtle">
           <div className="p-12 bg-white text-black h-full overflow-y-auto" id="custom-report">
           
           <div className="text-center border-b-2 border-black pb-6 mb-8">
             <img src="/rex-logo.png" alt="REX" className="h-10 object-contain mx-auto mb-4" />
             <h2 className="text-xl font-black uppercase tracking-widest text-black">CUSTOM FINANCIAL REPORT</h2>
             <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">
               {startDate ? `From ${startDate}` : 'All Time'} {endDate ? ` To ${endDate}` : ''}
               {costCenterId && ` | Cost Center: ${costCenters.find(c => c.id === costCenterId)?.code}`}
             </p>
           </div>
           
           {loading ? <div className="text-center py-10 animate-pulse text-gray-500 font-medium text-xs">Querying General Ledger...</div> : (
             data.length === 0 ? <div className="text-center py-10 text-gray-400 text-xs">No data found for the selected filters.</div> : (
               <table className="w-full text-xs text-left">
                 <thead className="bg-gray-100 border-y border-gray-300">
                   <tr>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Date</th>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Ref</th>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Account</th>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Cost Center</th>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Debit</th>
                     <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Credit</th>
                   </tr>
                 </thead>
                 <tbody>
                   {data.map(line => (
                     <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                       <td className="p-2 text-xs">{new Date(line.date).toLocaleDateString()}</td>
                       <td className="p-2 font-mono text-[10px]">{line.reference}</td>
                       <td className="p-2 text-xs">
                         <span className="font-bold">{line.accountCode}</span> - {line.accountName}
                         <span className="ml-2 text-[9px] px-1 bg-gray-200 rounded text-gray-600">{line.accountType}</span>
                       </td>
                       <td className="p-2 text-xs text-gray-500">{line.costCenterName || '-'}</td>
                       <td className="p-2 text-right text-xs font-mono">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                       <td className="p-2 text-right text-xs font-mono">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot className="bg-gray-50 border-t-2 border-b-4 border-double border-black font-bold">
                   <tr>
                     <td colSpan={4} className="p-2 text-right text-xs uppercase tracking-widest text-[10px]">Total</td>
                     <td className="p-2 text-right text-xs font-mono">{formatCurrency(data.reduce((sum, l) => sum + Number(l.debit), 0))}</td>
                     <td className="p-2 text-right text-xs font-mono">{formatCurrency(data.reduce((sum, l) => sum + Number(l.credit), 0))}</td>
                   </tr>
                 </tfoot>
               </table>
             )
           )}
           
           {/* SIGNATURE AREA */}
           {data.length > 0 && (
            <div className="mt-20 pt-10 border-t border-gray-300 grid grid-cols-2 text-center text-[10px] uppercase tracking-widest font-bold text-gray-500">
               <div>
                  <div className="w-40 border-b border-gray-400 mx-auto mb-2"></div>
                  Prepared By
               </div>
               <div>
                  <div className="w-40 border-b border-gray-400 mx-auto mb-2"></div>
                  Authorized By
               </div>
            </div>
           )}

        </div></GlassCard>
      </div>
    </div>
  );
};

