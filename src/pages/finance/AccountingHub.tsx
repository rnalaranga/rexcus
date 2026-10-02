import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, FileSpreadsheet, Plus, Filter, Settings2, Trash2, BookOpen, TrendingUp, TrendingDown, X, Receipt, CheckCircle, ChevronDown, ChevronUp, ChevronRight, Edit2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAccounts, useTaxes, useJournals } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';
import { AccountModal } from './AccountModal';
import { deleteAccount, fetchAccountLedger } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';

type Tab = 'coa' | 'journals' | 'taxes';

const TYPE_COLORS: Record<string, string> = {
  Asset: 'bg-blue-500',
  Liability: 'bg-rose-500',
  Equity: 'bg-purple-500',
  Revenue: 'bg-emerald-500',
  Expense: 'bg-orange-500',
};

const TYPE_BG: Record<string, string> = {
  Asset: 'bg-blue-500/10 border-blue-500/20',
  Liability: 'bg-rose-500/10 border-rose-500/20',
  Equity: 'bg-purple-500/10 border-purple-500/20',
  Revenue: 'bg-emerald-500/10 border-emerald-500/20',
  Expense: 'bg-orange-500/10 border-orange-500/20',
};

export const AccountingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('coa');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [ledgerAccount, setLedgerAccount] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [showAddTax, setShowAddTax] = useState(false);
  const navigate = useNavigate();
  const { showConfirm, showError, toast } = useDialog();

  const { data: accounts, loading: loadingCOA, refetch: refetchCOA } = useAccounts();
  const { data: taxes, loading: loadingTaxes } = useTaxes();
  const { data: journals, loading: loadingJournals, refetch: refetchJournals } = useJournals();

  const loading = loadingCOA || loadingTaxes || loadingJournals;
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading finance data...</div>;

  let filteredCOA = accounts.filter(a => [a.code, a.name].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  if (filterType !== 'All') filteredCOA = filteredCOA.filter(a => a.type === filterType);

  const filteredTaxes = taxes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredJournals = journals.filter(j => [j.id, j.reference, j.description].some(v => v?.toLowerCase().includes(search.toLowerCase())));

  const openLedger = async (account: any) => {
    setLedgerAccount(account);
    setLedgerLoading(true);
    setLedgerData(null);
    const data = await fetchAccountLedger(account.id);
    setLedgerData(data);
    setLedgerLoading(false);
  };

  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleDownloadTemplate = () => {
    const csvContent = "Code,Name,Type,Subtype,Balance\n" +
      "1000,Commercial Bank,Asset,Bank,0\n" +
      "1500,Accounts Receivable,Asset,Current Asset,0\n" +
      "2000,Accounts Payable,Liability,Current Liability,0\n" +
      "3000,Sales Revenue,Revenue,Sales,0\n" +
      "4000,Raw Materials,Expense,Production Material,0\n" +
      "4001,Electric item,Expense,Production Material,0\n" +
      "4002,Sub Contract,Expense,Production Material,0\n" +
      "5000,Diesel for Generator,Expense,Production Overhead,0\n" +
      "5001,Electricity,Expense,Production Overhead,0\n" +
      "5002,Factory Maintenance,Expense,Production Overhead,0\n" +
      "6000,Audit & Accounting Fees,Expense,Administration,0\n" +
      "6001,Bonus,Expense,Administration,0\n" +
      "6002,Salaries & Wages,Expense,Administration,0\n" +
      "7000,Advertising,Expense,Selling & Distribution,0\n" +
      "7001,Sales Commissions,Expense,Selling & Distribution,0\n" +
      "8000,Bank Charges,Expense,Finance,0\n" +
      "9000,Exchange Gain or Loss,Expense,Non Operating,0";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Chart_of_Accounts_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const codeIdx = headers.indexOf('code');
      const nameIdx = headers.indexOf('name');
      const typeIdx = headers.indexOf('type');
      const subIdx = headers.indexOf('subtype');
      const balIdx = headers.indexOf('balance');

      if (codeIdx === -1 || nameIdx === -1 || typeIdx === -1) {
        showError('CSV must contain Code, Name, and Type columns', 'Error');
        return;
      }

      const parsedAccounts = lines.slice(1).map(line => {
        // Handle basic quotes (simplistic csv parse)
        const cols = line.split(','); 
        return {
          id: crypto.randomUUID(),
          code: cols[codeIdx]?.trim() || '',
          name: cols[nameIdx]?.trim() || '',
          type: cols[typeIdx]?.trim() || 'Expense',
          subtype: subIdx !== -1 ? cols[subIdx]?.trim() : '',
          balance: balIdx !== -1 ? parseFloat(cols[balIdx]) || 0 : 0
        };
      }).filter(a => a.code && a.name);

      if (parsedAccounts.length === 0) {
        showError('No valid accounts found in CSV', 'Error');
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/accounts/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: parsedAccounts })
        });
        const data = await res.json();
        if (data.success) {
          toast(`Imported ${data.count} accounts successfully`, 'success');
          refetchCOA();
        } else {
          showError(data.error, 'Error');
        }
      } catch (err) {
        showError('Import failed', 'Error');
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getAccountName = (id: string) => {
    const a = accounts.find((x: any) => x.id === id);
    return a ? `${a.code} - ${a.name}` : id;
  };

  const handleDelete = async (account: any) => {
    const ok = await showConfirm(
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      'Delete Account?',
      { confirmLabel: 'Delete', cancelLabel: 'Cancel' }
    );
    if (!ok) return;
    const res = await deleteAccount(account.id);
    if (res.success) {
      toast(`"${account.name}" account deleted successfully.`, 'success');
      refetchCOA();
    } else {
      showError(res.error || 'Failed to delete account. Please try again.', 'Delete Failed');
    }
  };

  // GROUP COA by type for card view
  const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const groupedCOA = accountTypes.reduce((acc, type) => {
    acc[type] = filteredCOA.filter(a => a.type === type);
    return acc;
  }, {} as Record<string, any[]>);

  const generateTaxColumns = (): Column<any>[] => [
    {
      key: 'tax', header: 'Tax Details', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs">TX</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">Linked Account ID: {row.accountId}</p>
          </div>
        </div>
      )
    },
    { key: 'rate', header: 'Rate (%)', align: 'right', render: v => <span className="text-sm font-bold text-primary">{Number(v)}%</span> },
    { key: 'isActive', header: 'Status', width: '90px', render: v => <Badge value={v !== false ? 'ACTIVE' : 'INACTIVE'} /> }
  ];

  const countLabel = activeTab === 'coa' ? `${accounts.length} accounts` : activeTab === 'journals' ? `${journals.length} journal entries` : `${taxes.length} tax rates`;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accounting Records</h1>
          <p className="text-sm text-muted mt-0.5">{countLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="ghost" size="sm" icon={Receipt} onClick={() => navigate('/finance/income-builder')} className="border border-theme-subtle text-emerald-500">Record Income</Button>
          <Button variant="ghost" size="sm" icon={Receipt} onClick={() => navigate('/finance/expense-builder')} className="border border-theme-subtle text-red-500">Record Expense</Button>
          {activeTab === 'coa' && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditAccount(null); setShowAddAccount(true); }} className="bg-rex-600 hover:bg-rex-700">Add Account</Button>
          )}
          {activeTab === 'journals' && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/finance/journal-builder')} className="bg-rex-600 hover:bg-rex-700">New Journal Entry</Button>
          )}
          {activeTab === 'taxes' && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddTax(true)} className="bg-amber-600 hover:bg-amber-700">Add Tax Rate</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search accounts, journals..." value={search} onChange={setSearch} className="w-64" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> View:</span>
        {(['coa', 'journals', 'taxes'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-xs border transition-colors ${activeTab === t ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>
            {t === 'coa' ? 'Chart of Accounts' : t === 'journals' ? 'Journals' : 'Tax Rates'}
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

      {/* COA Card View */}
      {activeTab === 'coa' && (
        <div className="space-y-6">
          {accountTypes.map(type => {
            const accs = groupedCOA[type];
            if (accs.length === 0 && filterType !== 'All' && filterType !== type) return null;
            if (accs.length === 0) return null;
            const totalBalance = accs.reduce((s, a) => s + Number(a.balance || 0), 0);
            return (
              <div key={type}>
                {/* Type Header */}
                <div className={`flex items-center justify-between px-4 py-2 rounded-t-lg border ${TYPE_BG[type]}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]}`} />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{type}</span>
                    <span className="text-[10px] text-muted ml-1">({accs.length} accounts)</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-primary">{formatCurrency(totalBalance)}</span>
                </div>

                {/* Account Rows by Subtype */}
                  <div className="border border-t-0 border-theme-subtle rounded-b-lg overflow-hidden bg-surface/30">
                    {(() => {
                      // Group by subtype
                      const subGroups = accs.reduce((acc, curr) => {
                        const sub = curr.subtype || curr.type;
                        if (!acc[sub]) acc[sub] = [];
                        acc[sub].push(curr);
                        return acc;
                      }, {} as Record<string, any[]>);

                      return Object.entries(subGroups).sort(([a], [b]) => a.localeCompare(b)).map(([sub, subAccs]: [string, any]) => {
                        const groupKey = `${type}-${sub}`;
                        const isCollapsed = collapsedGroups[groupKey];
                        const subTotal = (subAccs as any[]).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
                        
                        return (
                          <div key={sub} className="border-b border-theme-subtle/50 last:border-0">
                            {/* Subtype Header */}
                            <button
                              onClick={() => setCollapsedGroups(p => ({ ...p, [groupKey]: !p[groupKey] }))}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface hover:bg-surface2 transition-colors border-l-2 border-transparent hover:border-blue-500"
                            >
                              <div className="flex items-center gap-2">
                                {isCollapsed ? <ChevronRight size={14} className="text-muted"/> : <ChevronDown size={14} className="text-blue-500"/>}
                                <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">{sub}</span>
                                <span className="text-[10px] text-muted ml-2 bg-theme-subtle/50 px-1.5 py-0.5 rounded-full">{(subAccs as any[]).length}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-secondary">{formatCurrency(subTotal)}</span>
                            </button>

                            {/* Subtype Accounts */}
                            {!isCollapsed && (
                              <div className="divide-y divide-theme-subtle/30 bg-surface/50">
                                {(subAccs as any[]).map((acc: any, idx: number) => (
                                  <div key={acc.id} className="flex items-center gap-4 px-6 py-2.5 hover:bg-surface2 transition-colors group pl-8">
                                    {/* Code Badge */}
                                    <div className={`w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-white font-black text-[9px] ${TYPE_COLORS[type]}`}>
                                      {acc.code.substring(0, 4)}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-primary">{acc.name}</p>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-sm font-bold font-mono text-primary">{formatCurrency(Number(acc.balance || 0))}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setEditAccount(acc); setShowAddAccount(true); }} className="p-1 rounded hover:bg-amber-500/10 text-amber-500" title="Edit"><Edit2 size={14} /></button>
                                      <button onClick={() => openLedger(acc)} className="p-1 rounded hover:bg-blue-500/10 text-blue-500" title="Ledger"><BookOpen size={14} /></button>
                                      <button onClick={() => handleDelete(acc)} className="p-1 rounded hover:bg-rose-500/10 text-rose-500" title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
            );
          })}
        </div>
      )}

      {/* Journals Table */}
      {activeTab === 'journals' && (
        <div className="space-y-2">
          {filteredJournals.length === 0 ? (
            <GlassCard className="py-16 text-center">
              <BookOpen size={40} className="mx-auto text-muted mb-3 opacity-40" />
              <p className="text-muted text-sm">No journal entries found.</p>
            </GlassCard>
          ) : (
            filteredJournals.map((j: any) => {
              const expanded = expandedJournal === j.id;
              return (
                <GlassCard key={j.id} className="p-0 overflow-hidden border border-theme-subtle">
                  {/* Entry Header */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface2 transition-colors text-left"
                    onClick={() => setExpandedJournal(expanded ? null : j.id)}
                  >
                    {/* Status badge */}
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-primary font-mono">{j.id}</p>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {j.status || 'POSTED'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 truncate">{j.description || 'No description'}</p>
                    </div>

                    {/* Reference */}
                    {j.reference && (
                      <span className="text-[10px] text-muted font-mono hidden md:block flex-shrink-0">{j.reference}</span>
                    )}

                    {/* Date */}
                    <span className="text-xs text-muted flex-shrink-0 hidden md:block">
                      {String(j.date).split('T')[0]}
                    </span>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold font-mono text-primary">{formatCurrency(Number(j.totalAmount))}</p>
                      <p className="text-[10px] text-muted">{j.lines?.length || 0} lines</p>
                    </div>

                    {/* Expand icon */}
                    <div className="text-muted flex-shrink-0">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Expanded Lines */}
                  {expanded && j.lines && j.lines.length > 0 && (
                    <div className="border-t border-theme-subtle">
                      {/* Columns Header */}
                      <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-surface/50 text-[10px] uppercase tracking-widest text-muted font-bold">
                        <div className="col-span-5">Account</div>
                        <div className="col-span-3">Description</div>
                        <div className="col-span-2 text-right">Debit</div>
                        <div className="col-span-2 text-right">Credit</div>
                      </div>
                      {j.lines.map((line: any, idx: number) => (
                        <div key={line.id || idx} className={`grid grid-cols-12 gap-2 px-5 py-2.5 text-xs border-t border-theme-subtle/50 ${idx % 2 === 0 ? '' : 'bg-surface/30'}`}>
                          <div className="col-span-5 font-medium text-primary flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${Number(line.debit) > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {getAccountName(line.accountId)}
                          </div>
                          <div className="col-span-3 text-muted truncate">{line.description || '-'}</div>
                          <div className="col-span-2 text-right font-mono">
                            {Number(line.debit) > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(Number(line.debit))}</span>
                            ) : <span className="text-muted">-</span>}
                          </div>
                          <div className="col-span-2 text-right font-mono">
                            {Number(line.credit) > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(Number(line.credit))}</span>
                            ) : <span className="text-muted">-</span>}
                          </div>
                        </div>
                      ))}
                      {/* Totals Row */}
                      <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-surface/50 border-t-2 border-theme text-xs font-bold items-center">
                        <div className="col-span-8 flex items-center justify-between">
                          <span className="uppercase tracking-wider text-muted">Total</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (await showConfirm('Are you sure you want to delete this journal entry? This will revert account balances.', 'Delete Journal')) {
                                try {
                                  const { deleteJournal } = await import('@/lib/api');
                                  await deleteJournal(j.id);
                                  toast('Journal deleted', 'success');
                                  setExpandedJournal(null);
                                  refetchJournals();
                                  refetchCOA();
                                } catch (err: any) { showError(err.message, 'Error'); }
                              }
                            }}
                            className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                          >
                            Delete Entry
                          </button>
                        </div>
                        <div className="col-span-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(j.totalAmount))}</div>
                        <div className="col-span-2 text-right font-mono text-amber-600 dark:text-amber-400">{formatCurrency(Number(j.totalAmount))}</div>
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
            })
          )}
        </div>
      )}


      {/* Taxes Table */}
      {activeTab === 'taxes' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          <DataTable columns={generateTaxColumns()} data={filteredTaxes} keyExtractor={row => row.id} />
        </GlassCard>
      )}

      {/* Add/Edit Account Modal */}
      <AccountModal
        isOpen={showAddAccount}
        onClose={() => {
          setShowAddAccount(false);
          setEditAccount(null);
        }}
        onSuccess={refetchCOA}
        initialData={editAccount}
      />

      {/* Ledger Modal */}
      <Modal isOpen={!!ledgerAccount} onClose={() => setLedgerAccount(null)} title={`Ledger: ${ledgerAccount?.name || ''}`} size="xl">
        {ledgerLoading ? (
          <div className="p-8 text-center text-muted animate-pulse text-sm">Loading ledger...</div>
        ) : ledgerData ? (
          <div className="space-y-4">
            {/* Account Info */}
            <div className={`flex gap-6 p-4 rounded-lg border ${TYPE_BG[ledgerData.account?.type] || 'bg-surface border-theme-subtle'}`}>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Account Code</p>
                <p className="text-sm font-bold font-mono">{ledgerData.account?.code}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Type</p>
                <p className="text-sm font-bold">{ledgerData.account?.type}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Sub-Type</p>
                <p className="text-sm font-bold">{ledgerData.account?.subtype || '-'}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-muted uppercase tracking-wider">Current Balance</p>
                <p className="text-lg font-black text-primary">{formatCurrency(Number(ledgerData.account?.balance || 0))}</p>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-theme">
                    <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Date</th>
                    <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Reference</th>
                    <th className="text-left py-2 px-3 text-muted font-bold uppercase tracking-wider">Description</th>
                    <th className="text-right py-2 px-3 text-muted font-bold uppercase tracking-wider">Debit</th>
                    <th className="text-right py-2 px-3 text-muted font-bold uppercase tracking-wider">Credit</th>
                    <th className="text-right py-2 px-3 text-muted font-bold uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.lines?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted">No transactions found for this account.</td>
                    </tr>
                  )}
                  {ledgerData.lines?.map((line: any, idx: number) => (
                    <tr key={line.id || idx} className={`border-b border-theme-subtle ${idx % 2 === 0 ? '' : 'bg-surface/50'} hover:bg-surface2 transition-colors`}>
                      <td className="py-2 px-3 text-muted font-mono">{String(line.date).split('T')[0]}</td>
                      <td className="py-2 px-3 text-muted font-mono text-[10px]">{line.reference || line.entryId}</td>
                      <td className="py-2 px-3 text-secondary max-w-[200px] truncate">{line.description || line.entryDescription}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {Number(line.debit) > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(Number(line.debit))}</span>
                        ) : <span className="text-muted">-</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {Number(line.credit) > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(Number(line.credit))}</span>
                        ) : <span className="text-muted">-</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                        {formatCurrency(Number(line.runningBalance))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {ledgerData.lines?.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-theme font-bold">
                      <td colSpan={5} className="py-3 px-3 text-xs uppercase tracking-wider text-muted">Closing Balance</td>
                      <td className="py-3 px-3 text-right font-mono text-primary text-sm">
                        {formatCurrency(Number(ledgerData.account?.balance || 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Tax Modal */}
      <Modal isOpen={showAddTax} onClose={() => setShowAddTax(false)} title="Add Tax Rate">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = formData.get('name') as string;
          const rate = Number(formData.get('rate'));
          const accountId = formData.get('accountId') as string;
          
          if (!name || isNaN(rate) || !accountId) return showError('Please fill all required fields.', 'Validation Error');
          
          try {
            const { createTax } = await import('@/lib/api');
            await createTax({ id: crypto.randomUUID(), name, rate, accountId });
            toast('Tax rate created', 'success');
            setShowAddTax(false);
            window.location.reload();
          } catch(err: any) {
            showError(err.message, 'Error');
          }
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Tax Name</label>
              <input name="name" required placeholder="e.g. VAT" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Rate (%)</label>
              <input name="rate" type="number" step="0.01" required placeholder="15" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Tax Liability Account</label>
              <select name="accountId" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                <option value="">-- Select Liability Account --</option>
                {accounts.filter(a => a.type === 'Liability').map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowAddTax(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Tax Rate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
