import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Filter, ArrowDownRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';

export const PayablesHub: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/aging?type=ap`)
      .then(res => res.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(console.error);
  }, []);

  let filteredData = data.filter(r => r.partyName.toLowerCase().includes(search.toLowerCase()));
  if (filterType === 'overdue') filteredData = filteredData.filter(r => Number(r.bucket90plus) > 0);

  const totalPayable = data.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const totalOverdue = data.reduce((s, r) => s + (Number(r.bucket90plus) || 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'supplier', header: 'Supplier', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs rounded">
            {row.partyName ? row.partyName.substring(0,2).toUpperCase() : 'SU'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.partyName}</p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">ID: {row.partyId}</p>
          </div>
        </div>
      )
    },
    { key: 'bucket30', header: '0-30 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket60', header: '31-60 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90', header: '61-90 Days', align: 'right', render: v => <span className="text-xs text-amber-500 font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90plus', header: '90+ Days', align: 'right', render: v => <span className="text-xs text-red-500 font-bold font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'balance', header: 'Total Outstanding', align: 'right', sortable: true, render: v => <span className="text-sm font-black text-amber-600 font-mono">{formatCurrency(Number(v))}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10 text-xs font-semibold" 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inventory/suppliers/${row.partyId}`);
          }}
        >
          Pay / Ledger
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accounts Payable</h1>
          <p className="text-sm text-muted mt-0.5">Track and settle outstanding supplier payables & ledger balances</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export List</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/inventory/suppliers')} className="bg-amber-600 hover:bg-amber-700">
            Suppliers & Payments
          </Button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Accounts Payable</p>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1">{formatCurrency(totalPayable)}</p>
          <p className="text-[10px] text-muted mt-0.5">Across {data.length} registered suppliers</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-l-red-500">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Overdue (90+ Days)</p>
          <p className="text-2xl font-black text-red-500 font-mono mt-1">{formatCurrency(totalOverdue)}</p>
          <p className="text-[10px] text-muted mt-0.5">Priority supplier settlement</p>
        </GlassCard>
        <GlassCard className="p-4 border-l-4 border-l-blue-500">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Current / 0-60 Days</p>
          <p className="text-2xl font-black text-blue-500 font-mono mt-1">
            {formatCurrency(totalPayable - totalOverdue)}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Within standard credit terms</p>
        </GlassCard>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by supplier name or ID..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Status:</span>
        <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs border rounded transition-colors ${filterType === 'all' ? 'bg-amber-500/10 border-amber-500/35 text-amber-700 dark:text-amber-300' : 'bg-surface border-theme text-secondary hover:border-amber-500/30'}`}>All Outstanding</button>
        <button onClick={() => setFilterType('overdue')} className={`px-3 py-1.5 text-xs border rounded transition-colors ${filterType === 'overdue' ? 'bg-amber-500/10 border-amber-500/35 text-amber-700 dark:text-amber-300' : 'bg-surface border-theme text-secondary hover:border-amber-500/30'}`}>Overdue (90+)</button>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading ? <div className="p-10 text-center animate-pulse">Loading payables...</div> : (
          <DataTable 
            columns={columns} 
            data={filteredData} 
            keyExtractor={row => row.partyId} 
            onRowClick={row => navigate(`/inventory/suppliers/${row.partyId}`)}
          />
        )}
      </GlassCard>
    </div>
  );
};



