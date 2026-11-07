import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Plus, Trash2, DollarSign, Building2, Save, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAccounts } from '@/hooks/useFinance';
import { useDialog } from '@/components/ui/DialogProvider';

export const CurrencyManager = () => {
  const { settings, updateSettings } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const { toast } = useDialog();

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', exchangeRate: 1.0 });

  // USD Master Setup state
  const [usdMasterAccountId, setUsdMasterAccountId] = useState<string>('acc_1010');
  const [usdDefaultRate, setUsdDefaultRate] = useState<string>('310');

  useEffect(() => {
    if (settings) {
      if (settings.usd_master_account_id) {
        setUsdMasterAccountId(settings.usd_master_account_id);
      }
      if (settings.usd_default_exchange_rate) {
        setUsdDefaultRate(settings.usd_default_exchange_rate);
      }
    }
  }, [settings]);

  const fetchCurrencies = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies`);
      const data = await res.json();
      setCurrencies(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchCurrencies(); }, []);

  const syncRates = async () => {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies/sync`, { method: 'POST' });
      await fetchCurrencies();
      toast('Live exchange rates synchronized successfully!', 'success');
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const addCurrency = async () => {
    if(!newCurrency.code) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency)
      });
      setNewCurrency({ code: '', name: '', symbol: '', exchangeRate: 1.0 });
      await fetchCurrencies();
      toast(`Currency ${newCurrency.code} added successfully!`, 'success');
    } catch(e) { console.error(e); }
  };

  const deleteCurrency = async (code: string) => {
    if(code === 'LKR') return alert("Cannot delete base currency");
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies/${code}`, { method: 'DELETE' });
      await fetchCurrencies();
      toast(`Currency ${code} removed`, 'info');
    } catch(e) { console.error(e); }
  };

  const handleSaveUsdMasterSetup = async () => {
    setSavingMaster(true);
    try {
      await updateSettings({
        usd_master_account_id: usdMasterAccountId,
        usd_default_exchange_rate: usdDefaultRate
      });
      toast('USD Master Account & Currency Setup saved successfully!', 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to save USD Master Setup', 'error');
    } finally {
      setSavingMaster(false);
    }
  };

  // Filter COA accounts for USD master mapping (Asset -> Bank / Cash or all Assets)
  const coaBankAccounts = accounts.filter(
    (a: any) => (a.type === 'Asset' && (a.subtype?.includes('Bank') || a.subtype?.includes('Cash') || a.name?.includes('Bank') || a.name?.includes('USD') || a.code?.startsWith('10'))) ||
                a.name?.toLowerCase().includes('usd') || a.name?.toLowerCase().includes('foreign')
  );

  const selectedAcc = accounts.find((a: any) => a.id === usdMasterAccountId) ||
                      accounts.find((a: any) => a.id === 'acc_1010');

  return (
    <div className="space-y-6">
      {/* ── USD MASTER ACCOUNT & ROUTING SETUP ── */}
      <GlassCard className="p-6 border-blue-500/30 bg-surface/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-theme-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                USD Master Account & Multi-Currency Setup
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold uppercase">
                  Master Ledger
                </span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Designate the dedicated Chart of Accounts ledger where all foreign currency USD transactions and settlements are routed.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSaveUsdMasterSetup}
            disabled={savingMaster}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs shrink-0 rounded-none"
          >
            {savingMaster ? 'Saving...' : 'Save USD Master Setup'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Account Selector */}
          <div className="md:col-span-8 space-y-1.5">
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider">
              Dedicated USD Settlement Account (Chart of Accounts) <span className="text-blue-500">*</span>
            </label>
            <div className="relative">
              <select
                value={usdMasterAccountId}
                onChange={(e) => setUsdMasterAccountId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                {coaBankAccounts.length > 0 ? (
                  coaBankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.subtype || acc.type})
                    </option>
                  ))
                ) : (
                  accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.code}] {acc.name} ({acc.type})
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedAcc && (
              <p className="text-[11px] text-muted font-mono flex items-center gap-1.5 mt-1">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                Active Ledger: <span className="font-semibold text-primary">[{selectedAcc.code}] {selectedAcc.name}</span>
                {selectedAcc.balance !== undefined && (
                  <span className="text-secondary">• Balance: {Number(selectedAcc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                )}
              </p>
            )}
          </div>

          {/* Default Rate */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-secondary uppercase tracking-wider">
              Default USD Exchange Rate (LKR)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={usdDefaultRate}
                onChange={(e) => setUsdDefaultRate(e.target.value)}
                placeholder="310.00"
                className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-muted font-mono mt-1">
              Base export conversion rate for quotations & SOs
            </p>
          </div>
        </div>

        {/* Informative banner */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Strict Multi-Currency Isolation:</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              When USD is selected on Quotations, Sales Orders, Proforma Invoices, or Commercial Invoices, all line items, totals, payment receipts, and automated General Ledger postings strictly remain isolated in USD (marked with a blue dot in list views) and route directly into this Master Chart of Accounts ledger.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* ── EXCHANGE RATES TABLE ── */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Multi-Currency Rates & Symbols</h2>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={syncRates} disabled={loading} className="text-xs">
            {loading ? 'Syncing...' : 'Live Sync Rates (vs LKR)'}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <input placeholder="Code (e.g. USD)" className="input-base w-24 text-xs font-mono" value={newCurrency.code} onChange={e => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} />
          <input placeholder="Name (e.g. US Dollar)" className="input-base flex-1 text-xs" value={newCurrency.name} onChange={e => setNewCurrency({...newCurrency, name: e.target.value})} />
          <input placeholder="Symbol ($)" className="input-base w-16 text-xs text-center font-bold" value={newCurrency.symbol} onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})} />
          <input type="number" placeholder="Rate" className="input-base w-28 text-xs font-mono" value={newCurrency.exchangeRate} onChange={e => setNewCurrency({...newCurrency, exchangeRate: Number(e.target.value)})} />
          <Button variant="primary" icon={Plus} onClick={addCurrency} className="text-xs">Add Currency</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-theme-subtle text-xs text-muted uppercase tracking-wider">
                <th className="py-2.5">Code</th>
                <th>Name</th>
                <th>Symbol</th>
                <th>Rate (1 Code = X LKR)</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle/40 text-xs">
              {currencies.map(c => (
                <tr key={c.code} className="hover:bg-surface2/30 transition-colors">
                  <td className="py-2.5 font-mono font-bold text-primary flex items-center gap-1.5">
                    {c.code === 'USD' && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm shadow-blue-500/50" title="USD Currency" />
                    )}
                    {c.code} {c.isBase ? <span className="text-[10px] text-muted font-normal">(BASE)</span> : ''}
                  </td>
                  <td className="text-secondary">{c.name}</td>
                  <td className="text-secondary font-bold font-mono">{c.symbol}</td>
                  <td className="text-secondary font-mono">{Number(c.exchangeRate || 1).toFixed(2)}</td>
                  <td className="text-right">
                    {!c.isBase && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 h-7 px-2" onClick={() => deleteCurrency(c.code)}><Trash2 size={13}/></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
