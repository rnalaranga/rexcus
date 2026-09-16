import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Filter, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';

export const ReceivablesHub: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/aging?type=ar`)
      .then(res => res.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(console.error);
  }, []);

  let filteredData = data.filter(r => r.partyName.toLowerCase().includes(search.toLowerCase()));
  if (filterType === 'overdue') filteredData = filteredData.filter(r => Number(r.bucket90plus) > 0);

  const columns: Column<any>[] = [
    {
      key: 'customer', header: 'Customer', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 border border-emerald-500/40 flex items-center justify-center text-white font-bold text-xs">
            {row.partyName.substring(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.partyName}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">ID: {row.partyId}</p>
          </div>
        </div>
      )
    },
    { key: 'bucket30', header: '0-30 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket60', header: '31-60 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90', header: '61-90 Days', align: 'right', render: v => <span className="text-xs text-amber-500 font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90plus', header: '90+ Days', align: 'right', render: v => <span className="text-xs text-red-500 font-bold font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'balance', header: 'Total Due', align: 'right', sortable: true, render: v => <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(Number(v))}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => navigate('/finance/journal-builder')}>
          Receive Payment
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accounts Receivable</h1>
          <p className="text-sm text-muted mt-0.5">Track and collect outstanding customer payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export List</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/finance/journal-builder')} className="bg-emerald-600 hover:bg-emerald-700">Record Receipt</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by customer name..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Status:</span>
        <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs border rounded transition-colors ${filterType === 'all' ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-300' : 'bg-surface border-theme text-secondary hover:border-emerald-500/30'}`}>All Outstanding</button>
        <button onClick={() => setFilterType('overdue')} className={`px-3 py-1.5 text-xs border rounded transition-colors ${filterType === 'overdue' ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-300' : 'bg-surface border-theme text-secondary hover:border-emerald-500/30'}`}>Overdue (90+)</button>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading ? <div className="p-10 text-center animate-pulse">Loading receivables...</div> : (
          <DataTable columns={columns} data={filteredData} keyExtractor={row => row.partyId} />
        )}
      </GlassCard>
    </div>
  );
};



