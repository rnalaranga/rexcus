import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Filter, FileText, Landmark, Percent, Settings2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useAccounts, useTaxes, useJournals } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';

type Tab = 'coa' | 'journals' | 'taxes';

export const AccountingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('coa');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const navigate = useNavigate();

  const { data: accounts, loading: loadingCOA } = useAccounts();
  const { data: taxes, loading: loadingTaxes } = useTaxes();
  const { data: journals, loading: loadingJournals } = useJournals();

  const loading = loadingCOA || loadingTaxes || loadingJournals;
  
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading finance data...</div>;

  let filteredCOA = accounts.filter(a => [a.code, a.name].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  if (filterType !== 'All') filteredCOA = filteredCOA.filter(a => a.type === filterType);
  
  const filteredTaxes = taxes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredJournals = journals.filter(j => [j.id, j.reference, j.description].some(v => v?.toLowerCase().includes(search.toLowerCase())));

  const generateColumns = (): Column<any>[] => {
    if (activeTab === 'coa') {
      return [
        {
          key: 'account', header: 'Account', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-rex-600 border border-rex-500/40 flex items-center justify-center text-white font-bold text-xs">
                {row.code.substring(0,2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
                <p className="text-[10px] text-muted truncate mt-0.5 font-mono">{row.code}</p>
              </div>
            </div>
          )
        },
        { key: 'type', header: 'Type', width: '150px', render: v => <Badge value={String(v).toUpperCase()} /> },
        { key: 'subtype', header: 'Sub-Type', width: '150px', render: v => <span className="text-xs text-muted">{String(v)}</span> },
        { key: 'balance', header: 'Balance', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span> },
      ];
    }
    if (activeTab === 'journals') {
      return [
        {
          key: 'journal', header: 'Entry Details', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 border border-emerald-500/40 flex items-center justify-center text-white font-bold text-xs">
                JE
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <p className="text-[10px] text-muted truncate mt-0.5">{row.description || 'No description'}</p>
              </div>
            </div>
          )
        },
        { key: 'reference', header: 'Reference', width: '150px', render: v => <span className="text-[10px] text-muted font-mono">{String(v) || '-'}</span> },
        { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v).toUpperCase()} size="sm" /> },
        { key: 'totalAmount', header: 'Amount', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span> },
        { key: 'date', header: 'Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
      ];
    }
    return [
      {
        key: 'tax', header: 'Tax Details', sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs">
              TX
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
              <p className="text-[10px] text-muted truncate mt-0.5">{row.type}</p>
            </div>
          </div>
        )
      },
      { key: 'rate', header: 'Rate (%)', align: 'right', render: v => <span className="text-sm font-bold text-primary">{Number(v)}%</span> },
      { key: 'isActive', header: 'Status', width: '90px', render: v => <Badge value={v ? 'ACTIVE' : 'INACTIVE'} /> }
    ];
  };

  const currentData = activeTab === 'coa' ? filteredCOA : activeTab === 'journals' ? filteredJournals : filteredTaxes;
  const countLabel = activeTab === 'coa' ? `${accounts.length} accounts` : activeTab === 'journals' ? `${journals.length} journals` : `${taxes.length} taxes`;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accounting Records</h1>
          <p className="text-sm text-muted mt-0.5">{countLabel} found</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/finance/journal-builder')} className="bg-rex-600 hover:bg-rex-700">Add Entry</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by name, code or reference..." value={search} onChange={setSearch} className="w-64" />
        
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> View:</span>
        {(['coa', 'journals', 'taxes'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-xs border transition-colors ${activeTab === t ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>
            {t === 'coa' ? 'Accounts' : t === 'journals' ? 'Journals' : 'Tax Rates'}
          </button>
        ))}

        {activeTab === 'coa' && (
          <>
            <div className="w-px h-6 bg-theme-subtle mx-2" />
            <span className="text-xs text-muted flex items-center gap-1.5"><Settings2 size={12} /> Type:</span>
            {['All', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => (
              <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 text-xs border transition-colors ${filterType === type ? 'bg-blue-500/10 border-blue-500/35 text-blue-700 dark:text-blue-300' : 'bg-surface border-theme text-secondary hover:border-blue-500/30'}`}>
                {type}
              </button>
            ))}
          </>
        )}
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        <DataTable columns={generateColumns()} data={currentData} keyExtractor={row => row.id} />
      </GlassCard>
    </div>
  );
};

