import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, UploadCloud, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export const BankReconciliation: React.FC = () => {
  const navigate = useNavigate();
  const [statementUploaded, setStatementUploaded] = useState(false);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Bank Reconciliation</h1>
            <p className="text-[11px] text-muted mt-0.5">Match bank statements to system ledgers</p>
          </div>
        </div>
        <Button variant="primary" size="sm" icon={UploadCloud} onClick={() => setStatementUploaded(true)}>Import CSV / MT940</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!statementUploaded ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
               <RefreshCw size={24} />
            </div>
            <h2 className="text-xl font-bold text-primary">Upload Bank Statement</h2>
            <p className="text-sm text-muted">Upload a CSV or standard MT940 bank statement to begin reconciliation against your system ledgers.</p>
            <Button variant="ghost" className="border border-theme-subtle" onClick={() => setStatementUploaded(true)}>Browse Files...</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 h-full">
            <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-blue-500">
               <div className="p-4 bg-surface/30 border-b border-theme-subtle"><h3 className="font-bold text-sm">Bank Statement Lines</h3></div>
               <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-muted text-xs">
                 Select a file to populate.
               </div>
            </GlassCard>
            <GlassCard className="p-0 flex flex-col overflow-hidden border-t-2 border-t-emerald-500">
               <div className="p-4 bg-surface/30 border-b border-theme-subtle"><h3 className="font-bold text-sm">System Journal Lines (Uncleared)</h3></div>
               <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-muted text-xs">
                 Pending lines will appear here to be matched.
               </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
