import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, PieChart, Landmark } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const FinancialReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'pnl' | 'bs' | 'tb'>('pnl');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/${activeReport === 'pnl' ? 'pnl' : activeReport === 'bs' ? 'balance-sheet' : 'trial-balance'}`)
      .then(res => res.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(console.error);
  }, [activeReport]);

  const exportPDF = () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    const opt: any = { margin: 10, filename: `Report_${activeReport}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-theme-subtle">
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">Financial Reports</h1>
          <p className="text-xs text-muted mt-1">Real-time accounting statements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={exportPDF} className="bg-rex-600 hover:bg-rex-700 text-white border-transparent">Export PDF</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-[10px] uppercase font-semibold text-muted mr-2">Report Type:</span>
        <button onClick={() => setActiveReport('pnl')} className={`px-4 py-1.5 text-xs font-medium border rounded-full transition-colors flex items-center gap-1.5 ${activeReport === 'pnl' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme-subtle text-secondary hover:border-primary/50'}`}><PieChart size={12}/> Profit & Loss</button>
        <button onClick={() => setActiveReport('bs')} className={`px-4 py-1.5 text-xs font-medium border rounded-full transition-colors flex items-center gap-1.5 ${activeReport === 'bs' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme-subtle text-secondary hover:border-primary/50'}`}><Landmark size={12}/> Balance Sheet</button>
        <button onClick={() => setActiveReport('tb')} className={`px-4 py-1.5 text-xs font-medium border rounded-full transition-colors flex items-center gap-1.5 ${activeReport === 'tb' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme-subtle text-secondary hover:border-primary/50'}`}><FileText size={12}/> Trial Balance</button>
      </div>

      <div className="min-h-[60vh] relative bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted animate-pulse font-medium text-xs">Generating Report...</div>
        ) : (
          <div id="report-content" className="max-w-3xl mx-auto bg-white text-black p-12">
            
            {/* BRANDED HEADER */}
            <div className="text-center border-b-2 border-black pb-6 mb-8">
              <img src="/rex-logo.png" alt="REX" className="h-10 object-contain mx-auto mb-4" />
              <h2 className="text-xl font-black uppercase tracking-widest text-black">REX INDUSTRIES</h2>
              <h3 className="text-[11px] font-bold text-gray-500 uppercase mt-2 tracking-widest">
                {activeReport === 'pnl' ? 'Income Statement (Profit & Loss)' : activeReport === 'bs' ? 'Statement of Financial Position (Balance Sheet)' : 'Trial Balance'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">As of {new Date().toLocaleDateString()}</p>
            </div>

            {/* P&L RENDER */}
            {activeReport === 'pnl' && data && (
              <div className="space-y-6 text-xs">
                <div>
                  <h4 className="font-bold text-black border-b border-gray-300 mb-2 pb-1 uppercase tracking-wider text-[10px]">Revenue</h4>
                  {data.revenue?.map((r: any) => (
                    <div key={r.id} className="flex justify-between py-1.5 px-2 border-b border-dashed border-gray-200"><span className="text-gray-700">{r.code} - {r.name}</span><span className="font-mono">{formatCurrency(r.balance)}</span></div>
                  ))}
                  <div className="flex justify-between py-2 px-2 font-bold text-black mt-1"><span className="uppercase text-[10px] tracking-wider">Total Revenue</span><span className="font-mono">{formatCurrency(data.totalRevenue)}</span></div>
                </div>
                <div>
                  <h4 className="font-bold text-black border-b border-gray-300 mb-2 pb-1 uppercase tracking-wider text-[10px] mt-8">Expenses</h4>
                  {data.expenses?.map((e: any) => (
                    <div key={e.id} className="flex justify-between py-1.5 px-2 border-b border-dashed border-gray-200"><span className="text-gray-700">{e.code} - {e.name}</span><span className="font-mono">{formatCurrency(e.balance)}</span></div>
                  ))}
                  <div className="flex justify-between py-2 px-2 font-bold text-black mt-1"><span className="uppercase text-[10px] tracking-wider">Total Expenses</span><span className="font-mono">{formatCurrency(data.totalExpense)}</span></div>
                </div>
                <div className="flex justify-between py-4 px-2 font-black text-sm mt-6 border-t-2 border-b-4 border-double border-black">
                  <span className="uppercase tracking-widest">Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}</span><span className="font-mono">{formatCurrency(data.netProfit)}</span>
                </div>
              </div>
            )}

            {/* BALANCE SHEET RENDER */}
            {activeReport === 'bs' && data && (
              <div className="space-y-8 text-xs flex gap-12">
                 <div className="flex-1 space-y-6">
                    <h4 className="font-bold text-black border-b-2 border-black mb-3 pb-1 uppercase tracking-wider text-[10px]">Assets</h4>
                    {data.assets?.map((a: any) => (
                      <div key={a.id} className="flex justify-between py-1.5 border-b border-dashed border-gray-200"><span className="text-gray-700">{a.code} - {a.name}</span><span className="font-mono">{formatCurrency(a.balance)}</span></div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-black mt-2"><span className="uppercase tracking-wider text-[10px]">Total Assets</span><span className="font-mono">{formatCurrency(data.totalAssets)}</span></div>
                 </div>
                 <div className="flex-1 space-y-8">
                    <div>
                      <h4 className="font-bold text-black border-b-2 border-black mb-3 pb-1 uppercase tracking-wider text-[10px]">Liabilities</h4>
                      {data.liabilities?.map((l: any) => (
                        <div key={l.id} className="flex justify-between py-1.5 border-b border-dashed border-gray-200"><span className="text-gray-700">{l.code} - {l.name}</span><span className="font-mono">{formatCurrency(l.balance)}</span></div>
                      ))}
                      <div className="flex justify-between py-2 font-bold text-black mt-2"><span className="uppercase tracking-wider text-[10px]">Total Liabilities</span><span className="font-mono">{formatCurrency(data.totalLiabilities)}</span></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-black border-b-2 border-black mb-3 pb-1 uppercase tracking-wider text-[10px]">Equity</h4>
                      {data.equity?.map((eq: any) => (
                        <div key={eq.id} className="flex justify-between py-1.5 border-b border-dashed border-gray-200"><span className="text-gray-700">{eq.code} - {eq.name}</span><span className="font-mono">{formatCurrency(eq.balance)}</span></div>
                      ))}
                      <div className="flex justify-between py-1.5 border-b border-dashed border-gray-200"><span className="text-gray-700 font-bold">Retained Earnings (Net Profit)</span><span className="font-mono font-bold text-gray-900">{formatCurrency(data.netProfit)}</span></div>
                      
                      <div className="flex justify-between py-2 font-bold text-black mt-2"><span className="uppercase tracking-wider text-[10px]">Total Equity</span><span className="font-mono">{formatCurrency(data.totalEquity)}</span></div>
                    </div>
                    <div className="flex justify-between py-3 font-black text-xs mt-4 border-t-2 border-b-4 border-double border-black">
                      <span className="uppercase tracking-widest">Total L & E</span><span className="font-mono">{formatCurrency(data.totalLiabilities + data.totalEquity)}</span>
                    </div>
                 </div>
              </div>
            )}

            {/* TRIAL BALANCE RENDER */}
            {activeReport === 'tb' && data && (
              <div className="text-xs">
                <div className="flex justify-between font-bold uppercase tracking-wider text-[10px] border-b-2 border-black pb-2 mb-3">
                  <span className="w-1/2">Account</span>
                  <span className="w-1/4 text-right">Debit (Rs.)</span>
                  <span className="w-1/4 text-right">Credit (Rs.)</span>
                </div>
                {data.accounts?.map((acc: any) => (
                  <div key={acc.id} className="flex justify-between py-2 border-b border-dashed border-gray-200">
                    <span className="w-1/2 text-gray-700">{acc.code} - {acc.name}</span>
                    <span className="w-1/4 text-right font-mono">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</span>
                    <span className="w-1/4 text-right font-mono">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-xs py-4 border-t-2 border-b-4 border-double border-black mt-4">
                  <span className="w-1/2 uppercase tracking-widest text-[10px]">Total</span>
                  <span className="w-1/4 text-right font-mono">{formatCurrency(data.totalDebit)}</span>
                  <span className="w-1/4 text-right font-mono">{formatCurrency(data.totalCredit)}</span>
                </div>
              </div>
            )}

            {/* SIGNATURE AREA */}
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
          </div>
        )}
      </div>
    </div>
  );
};

