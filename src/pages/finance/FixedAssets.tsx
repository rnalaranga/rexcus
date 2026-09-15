import React from 'react';
import { ArrowLeft, Building, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const FixedAssets: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Fixed Assets Register</h1>
            <p className="text-[11px] text-muted mt-0.5">Track machinery, vehicles, and depreciation</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Download}>Export Register</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
         <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
           <table className="w-full text-left whitespace-nowrap">
             <thead className="bg-surface/50 border-b border-theme-subtle">
               <tr className="text-[10px] uppercase tracking-widest text-muted">
                 <th className="px-5 py-3">Asset Name</th>
                 <th className="px-3 py-3">Purchase Date</th>
                 <th className="px-3 py-3 text-right">Purchase Value</th>
                 <th className="px-3 py-3 text-right">Accumulated Dep.</th>
                 <th className="px-5 py-3 text-right">Net Book Value</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-theme-subtle/50">
               <tr><td colSpan={5} className="p-8 text-center text-muted text-xs">No assets registered yet.</td></tr>
             </tbody>
           </table>
         </GlassCard>
      </div>
    </div>
  );
};
