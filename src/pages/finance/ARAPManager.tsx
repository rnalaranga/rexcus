import React from 'react';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const ARAPManager: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">AR / AP Manager</h1>
            <p className="text-[11px] text-muted mt-0.5">Manage customer receipts and supplier payments</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
         <div className="flex items-center justify-center h-[50vh]">
            <GlassCard className="p-8 text-center max-w-lg mx-auto">
               <Wallet size={48} className="text-amber-500 mx-auto mb-4 opacity-50" />
               <h2 className="text-xl font-black text-primary mb-2">AP & AR Ledger</h2>
               <p className="text-sm text-muted leading-relaxed mb-6">
                 This module connects with the Sales (Invoicing) and Purchasing (Supplier Bills) modules to track outstanding debts and record payments. 
                 Since the Sales & Purchasing modules are still being populated, the AP/AR Ledger will be fully enabled once invoices and bills are actively generated in those modules.
               </p>
               <div className="flex gap-4 justify-center">
                 <Button variant="ghost" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20" icon={TrendingUp} onClick={() => alert("Go to Sales to create Invoices first.")}>Customer Receipts</Button>
                 <Button variant="ghost" className="bg-amber-500/10 text-amber-500 border-amber-500/20" icon={TrendingDown} onClick={() => navigate('/purchasing/bill-builder')}>Supplier Payments</Button>
               </div>
            </GlassCard>
         </div>
      </div>
    </div>
  );
};
