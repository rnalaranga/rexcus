import React from 'react';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2 } from 'lucide-react';
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
            <p className="text-[11px] text-muted mt-0.5">Manage customer collections (Receivables) and supplier disbursements (Payables)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Accounts Receivable Card */}
          <GlassCard className="p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Accounts Receivable (AR)</h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Track customer sales invoices, aging breakdown (0-90+ days), record settlement payments, and issue official advance payment receipts.
                </p>
              </div>
              <ul className="text-xs text-secondary space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Real-time aging analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Direct invoice payment settlement & GL update
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Advance vouchers & Quotation receipts
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Button 
                variant="primary" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" 
                icon={TrendingUp} 
                onClick={() => navigate('/finance/receivables')}
              >
                Open Receivables Hub
              </Button>
            </div>
          </GlassCard>

          {/* Accounts Payable Card */}
          <GlassCard className="p-6 border-l-4 border-l-amber-500 flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
                <ArrowDownRight size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Accounts Payable (AP)</h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Track supplier bills, purchase orders, aging liabilities, manage vendor ledger settlements, and record outgoing payments.
                </p>
              </div>
              <ul className="text-xs text-secondary space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-amber-500" /> Vendor billing & invoice matching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-amber-500" /> Supplier ledger reconciliation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-amber-500" /> Supplier payments & PO billing closure
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Button 
                variant="primary" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs" 
                icon={TrendingDown} 
                onClick={() => navigate('/finance/payables')}
              >
                Open Payables Hub
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
