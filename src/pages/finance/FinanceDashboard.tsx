import React from 'react';
import { Download, Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useFinanceDashboard } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';

export const FinanceDashboard: React.FC = () => {
  const { data: dashboard, loading } = useFinanceDashboard();

  if (loading) return <div className="p-8 text-center text-muted animate-pulse text-xs">Loading analytics...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-theme-subtle">
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">Finance Dashboard</h1>
          <p className="text-xs text-muted mt-1">Real-time financial performance and liquidity metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} className="text-xs" onClick={() => window.print()}>Export Summary</Button>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
           {/* CASH */}
           <div className="bg-surface/40 border border-theme-subtle rounded-lg p-5 flex flex-col justify-between hover:bg-surface/60 transition-colors">
             <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-semibold uppercase text-muted tracking-widest">Total Cash & Bank</span>
               <Wallet size={14} className="text-muted"/>
             </div>
             <div className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(dashboard.cash)}</div>
             <p className="text-[10px] text-muted mt-2">Liquid assets available</p>
           </div>
           
           {/* AR */}
           <div className="bg-surface/40 border border-theme-subtle rounded-lg p-5 flex flex-col justify-between hover:bg-surface/60 transition-colors">
             <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-semibold uppercase text-muted tracking-widest">Receivables (AR)</span>
               <ArrowUpRight size={14} className="text-muted"/>
             </div>
             <div className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(dashboard.ar)}</div>
             <p className="text-[10px] text-muted mt-2">Pending customer payments</p>
           </div>
           
           {/* AP */}
           <div className="bg-surface/40 border border-theme-subtle rounded-lg p-5 flex flex-col justify-between hover:bg-surface/60 transition-colors">
             <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-semibold uppercase text-muted tracking-widest">Payables (AP)</span>
               <ArrowDownRight size={14} className="text-muted"/>
             </div>
             <div className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(dashboard.ap)}</div>
             <p className="text-[10px] text-muted mt-2">Pending supplier bills</p>
           </div>
           
           {/* NET PROFIT */}
           <div className="bg-surface/40 border border-theme-subtle rounded-lg p-5 flex flex-col justify-between hover:bg-surface/60 transition-colors relative overflow-hidden">
             <div className="flex justify-between items-start mb-4 relative z-10">
               <span className="text-[10px] font-semibold uppercase text-muted tracking-widest">Net Profit</span>
               <Activity size={14} className={dashboard.profit >= 0 ? 'text-emerald-500' : 'text-rex-500'}/>
             </div>
             <div className={`text-2xl font-bold tracking-tight relative z-10 ${dashboard.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rex-600 dark:text-rex-400'}`}>
               {formatCurrency(dashboard.profit)}
             </div>
             <div className="w-full h-1 bg-theme mt-3 rounded-full overflow-hidden flex relative z-10">
               <div className="h-full bg-emerald-500" style={{ width: `${(dashboard.revenue / ((dashboard.revenue + dashboard.expenses) || 1)) * 100}%` }} />
               <div className="h-full bg-rex-500" style={{ width: `${(dashboard.expenses / ((dashboard.revenue + dashboard.expenses) || 1)) * 100}%` }} />
             </div>
           </div>
        </div>
      )}

      {/* Mini charts or other generic ERP data could go here, keeping it extremely minimalist */}
      <div className="mt-8 pt-8 border-t border-theme-subtle text-center text-xs text-muted">
        Select a sub-module from the sidebar to view detailed ledger entries and analytics.
      </div>
    </div>
  );
};

