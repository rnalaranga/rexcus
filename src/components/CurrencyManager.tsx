import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

export const CurrencyManager = () => {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', exchangeRate: 1.0 });

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
    } catch(e) { console.error(e); }
  };

  const deleteCurrency = async (code: string) => {
    if(code === 'LKR') return alert("Cannot delete base currency");
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/currencies/${code}`, { method: 'DELETE' });
      await fetchCurrencies();
    } catch(e) { console.error(e); }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Currency Management</h2>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={syncRates} disabled={loading}>
          {loading ? 'Syncing...' : 'Live Sync Rates (vs LKR)'}
        </Button>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input placeholder="Code (e.g. USD)" className="input-base w-24" value={newCurrency.code} onChange={e => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} />
        <input placeholder="Name (e.g. US Dollar)" className="input-base flex-1" value={newCurrency.name} onChange={e => setNewCurrency({...newCurrency, name: e.target.value})} />
        <input placeholder="Symbol ($)" className="input-base w-16" value={newCurrency.symbol} onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})} />
        <input type="number" placeholder="Rate" className="input-base w-24" value={newCurrency.exchangeRate} onChange={e => setNewCurrency({...newCurrency, exchangeRate: Number(e.target.value)})} />
        <Button variant="primary" icon={Plus} onClick={addCurrency}>Add</Button>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-theme-subtle text-xs text-muted uppercase tracking-wider">
            <th className="py-2">Code</th>
            <th>Name</th>
            <th>Symbol</th>
            <th>Rate (1 Code = X LKR)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {currencies.map(c => (
             <tr key={c.code} className="border-b border-theme-subtle/50 text-sm">
              <td className="py-2 font-mono font-bold text-primary">{c.code} {c.isBase ? '(BASE)' : ''}</td>
              <td className="text-secondary">{c.name}</td>
              <td className="text-secondary">{c.symbol}</td>
              <td className="text-secondary">{c.exchangeRate}</td>
              <td className="text-right">
                {!c.isBase && <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteCurrency(c.code)}><Trash2 size={14}/></Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
};
