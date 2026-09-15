import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useCostCenters } from '@/hooks/useFinance';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';

export const CostCenters: React.FC = () => {
  const navigate = useNavigate();
  const { data: costCenters, loading, refetch } = useCostCenters();

  const handleNew = async () => {
    const code = window.prompt("Enter Cost Center Code (e.g. MKT-01):");
    if (!code) return;
    const name = window.prompt("Enter Analytical Account Name (e.g. Marketing):");
    if (!name) return;
    const department = window.prompt("Enter Department:");
    
    await fetch('http://localhost:3000/api/finance/cost-centers', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         id: 'CC-' + Date.now().toString().slice(-4),
         code, name, department, isActive: true
       })
    });
    if (refetch) refetch();
  };

  const columns = [
    { key: 'code', header: 'Code', render: (v:any) => <span className="font-mono text-primary font-bold">{v}</span> },
    { key: 'name', header: 'Analytical Account / Project', sortable: true },
    { key: 'department', header: 'Department', sortable: true },
    { key: 'isActive', header: 'Status', render: (v:any) => <Badge value={v ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Cost Centers & Analytics</h1>
            <p className="text-[11px] text-muted mt-0.5">Manage departmental tags for detailed P&L filtering</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
           <Button variant="primary" size="sm" icon={Plus} onClick={handleNew}>New Cost Center</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
         <GlassCard className="overflow-hidden border-t-2 border-t-purple-500 max-w-4xl">
           {loading ? <div className="p-8 text-center">Loading...</div> : <DataTable columns={columns} data={costCenters} keyExtractor={(r:any)=>r.id} />}
         </GlassCard>
      </div>
    </div>
  );
};


