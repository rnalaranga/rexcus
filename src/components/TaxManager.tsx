import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTaxProfiles, useAccounts } from '@/hooks/useFinance';
import { createTaxProfile, deleteTaxProfile, updateTaxProfile } from '@/lib/api';

export const TaxManager = () => {
  const { data: profiles, refetch } = useTaxProfiles();
  const { data: accounts } = useAccounts();

  const defaultForm = {
    name: '',
    tax1_name: 'SSCL',
    tax1_rate: 2.5,
    tax1_show_separately: 0,
    tax1_accountId: '',
    tax2_name: 'VAT',
    tax2_rate: 18,
    tax2_compound: 1,
    tax2_show_separately: 1,
    tax2_accountId: '',
  };

  const [newProfile, setNewProfile] = useState<any>(defaultForm);

  const handleAdd = async () => {
    if (!newProfile.name) return;
    await createTaxProfile({ id: 'tp_' + Date.now(), ...newProfile });
    setNewProfile(defaultForm);
    refetch();
  };

  const handleRemove = async (id: string) => {
    await deleteTaxProfile(id);
    refetch();
  };

  const handleUpdateProfile = async (profile: any, updates: any) => {
    await updateTaxProfile(profile.id, { ...profile, ...updates });
    refetch();
  };

  const coaOptions = (accounts || []).map((a: any) => ({ id: a.id, label: `${a.code ? a.code + ' — ' : ''}${a.name}` }));

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Tax Profiles</h2>
      </div>

      <div className="bg-surface2/50 p-4 rounded-xl border border-theme-subtle mb-6 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase">Profile Name</label>
          <input placeholder="e.g. VAT (18%) + SSCL (2.5%)" className="input-base w-full py-1.5 text-xs mt-1" value={newProfile.name} onChange={e => setNewProfile({ ...newProfile, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 border-r border-theme-subtle pr-4">
            <label className="text-[10px] font-bold text-secondary uppercase">Tax 1 (e.g. SSCL)</label>
            <div className="flex gap-2">
              <input placeholder="Name" className="input-base flex-1 py-1 text-xs" value={newProfile.tax1_name} onChange={e => setNewProfile({ ...newProfile, tax1_name: e.target.value })} />
              <input type="number" placeholder="%" className="input-base w-16 py-1 text-xs" value={newProfile.tax1_rate} onChange={e => setNewProfile({ ...newProfile, tax1_rate: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-primary cursor-pointer">
              <input type="checkbox" checked={newProfile.tax1_show_separately === 1} onChange={e => setNewProfile({ ...newProfile, tax1_show_separately: e.target.checked ? 1 : 0 })} className="rounded border-theme-subtle text-rex-500" />
              Show as separate line in invoice/quotation
            </label>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">GL Account (Tax 1)</label>
              <select className="input-base w-full py-1 text-xs" value={newProfile.tax1_accountId} onChange={e => setNewProfile({ ...newProfile, tax1_accountId: e.target.value })}>
                <option value="">— Default Tax Payable —</option>
                {coaOptions.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase">Tax 2 (e.g. VAT)</label>
            <div className="flex gap-2">
              <input placeholder="Name" className="input-base flex-1 py-1 text-xs" value={newProfile.tax2_name} onChange={e => setNewProfile({ ...newProfile, tax2_name: e.target.value })} />
              <input type="number" placeholder="%" className="input-base w-16 py-1 text-xs" value={newProfile.tax2_rate} onChange={e => setNewProfile({ ...newProfile, tax2_rate: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-primary cursor-pointer">
              <input type="checkbox" checked={newProfile.tax2_compound === 1} onChange={e => setNewProfile({ ...newProfile, tax2_compound: e.target.checked ? 1 : 0 })} className="rounded border-theme-subtle text-rex-500" />
              Compound (apply Tax 2 on Base + Tax 1)
            </label>
            <label className="flex items-center gap-2 text-xs text-primary cursor-pointer">
              <input type="checkbox" checked={newProfile.tax2_show_separately === 1} onChange={e => setNewProfile({ ...newProfile, tax2_show_separately: e.target.checked ? 1 : 0 })} className="rounded border-theme-subtle text-rex-500" />
              Show as separate line in invoice/quotation
            </label>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase block mb-1">GL Account (Tax 2)</label>
              <select className="input-base w-full py-1 text-xs" value={newProfile.tax2_accountId} onChange={e => setNewProfile({ ...newProfile, tax2_accountId: e.target.value })}>
                <option value="">— Default Tax Payable —</option>
                {coaOptions.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={Plus} size="sm" onClick={handleAdd}>Create Profile</Button>
        </div>
      </div>

      <div className="space-y-3">
        {(profiles || []).map((t: any) => (
          <div key={t.id} className="border border-theme-subtle rounded-xl p-4 bg-surface2/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-primary">{t.name}</span>
              <Button variant="ghost" size="sm" className="text-red-500 h-6 px-2" onClick={() => handleRemove(t.id)}><Trash2 size={12} /></Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 border-r border-theme-subtle pr-4">
                <div className="font-semibold text-muted uppercase text-[10px]">Tax 1 — {t.tax1_name} ({Number(t.tax1_rate).toFixed(2)}%)</div>
                <div className="flex items-center gap-1.5">
                  {t.tax1_show_separately ? <><Eye size={11} className="text-emerald-500" /><span className="text-emerald-600 font-semibold">Shown in invoice</span></> : <><EyeOff size={11} className="text-amber-500" /><span className="text-amber-600 font-semibold">Hidden (absorbed silently)</span></>}
                </div>
                <select className="input-base w-full py-0.5 text-xs" value={t.tax1_accountId || ''} onChange={e => handleUpdateProfile(t, { tax1_accountId: e.target.value })}>
                  <option value="">— Default Tax Payable —</option>
                  {coaOptions.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              {t.tax2_name && (
                <div className="space-y-2">
                  <div className="font-semibold text-muted uppercase text-[10px]">Tax 2 — {t.tax2_name} ({Number(t.tax2_rate).toFixed(2)}%){t.tax2_compound ? <span className="ml-1 text-blue-500">(Compound)</span> : ''}</div>
                  <div className="flex items-center gap-1.5">
                    {t.tax2_show_separately ? <><Eye size={11} className="text-emerald-500" /><span className="text-emerald-600 font-semibold">Shown in invoice</span></> : <><EyeOff size={11} className="text-amber-500" /><span className="text-amber-600 font-semibold">Hidden (absorbed silently)</span></>}
                  </div>
                  <select className="input-base w-full py-0.5 text-xs" value={t.tax2_accountId || ''} onChange={e => handleUpdateProfile(t, { tax2_accountId: e.target.value })}>
                    <option value="">— Default Tax Payable —</option>
                    {coaOptions.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
