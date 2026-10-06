import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { useTaxProfiles } from '@/hooks/useFinance';
import { createTaxProfile, deleteTaxProfile } from '@/lib/api';

export const TaxManager = () => {
  const { data: profiles, refetch } = useTaxProfiles();
  const [newProfile, setNewProfile] = useState({
    name: '',
    tax1_name: 'SSCL',
    tax1_rate: 2.5,
    tax1_hidden: 1,
    tax2_name: 'VAT',
    tax2_rate: 18,
    tax2_compound: 1
  });

  const handleAdd = async () => {
    if (!newProfile.name) return;
    await createTaxProfile({
      id: 'tp_' + Date.now(),
      ...newProfile
    });
    setNewProfile({
      name: '',
      tax1_name: 'SSCL',
      tax1_rate: 2.5,
      tax1_hidden: 1,
      tax2_name: 'VAT',
      tax2_rate: 18,
      tax2_compound: 1
    });
    refetch();
  };

  const handleRemove = async (id: string) => {
    await deleteTaxProfile(id);
    refetch();
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Tax Profiles</h2>
      </div>
      
      <div className="bg-surface2/50 p-4 rounded-xl border border-theme-subtle mb-4 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase">Profile Name</label>
          <input placeholder="e.g. VAT (18%) + SSCL (2.5%)" className="input-base w-full py-1.5 text-xs" value={newProfile.name} onChange={e => setNewProfile({...newProfile, name: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2 border-r border-theme-subtle pr-4">
              <label className="text-[10px] font-bold text-secondary uppercase">Tax 1 (e.g. SSCL)</label>
              <div className="flex gap-2">
                 <input placeholder="Name" className="input-base flex-1 py-1 text-xs" value={newProfile.tax1_name} onChange={e => setNewProfile({...newProfile, tax1_name: e.target.value})} />
                 <input type="number" placeholder="%" className="input-base w-16 py-1 text-xs" value={newProfile.tax1_rate} onChange={e => setNewProfile({...newProfile, tax1_rate: Number(e.target.value)})} />
              </div>
              <label className="flex items-center gap-2 text-xs text-primary cursor-pointer mt-1">
                 <input type="checkbox" checked={newProfile.tax1_hidden === 1} onChange={e => setNewProfile({...newProfile, tax1_hidden: e.target.checked ? 1 : 0})} className="rounded border-theme-subtle text-rex-500" />
                 Hide Tax 1 and absorb into base price
              </label>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase">Tax 2 (e.g. VAT)</label>
              <div className="flex gap-2">
                 <input placeholder="Name" className="input-base flex-1 py-1 text-xs" value={newProfile.tax2_name} onChange={e => setNewProfile({...newProfile, tax2_name: e.target.value})} />
                 <input type="number" placeholder="%" className="input-base w-16 py-1 text-xs" value={newProfile.tax2_rate} onChange={e => setNewProfile({...newProfile, tax2_rate: Number(e.target.value)})} />
              </div>
              <label className="flex items-center gap-2 text-xs text-primary cursor-pointer mt-1">
                 <input type="checkbox" checked={newProfile.tax2_compound === 1} onChange={e => setNewProfile({...newProfile, tax2_compound: e.target.checked ? 1 : 0})} className="rounded border-theme-subtle text-rex-500" />
                 Compound (Charge Tax 2 on Base + Tax 1)
              </label>
           </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="primary" icon={Plus} size="sm" onClick={handleAdd}>Create Profile</Button>
        </div>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
            <th className="py-2">Profile</th>
            <th>Tax 1</th>
            <th>Tax 2</th>
            <th>Hidden?</th>
            <th>Compound?</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((t: any) => (
             <tr key={t.id} className="border-b border-theme-subtle/50 text-xs">
              <td className="py-2 font-semibold text-primary">{t.name}</td>
              <td className="text-secondary">{t.tax1_name} ({t.tax1_rate}%)</td>
              <td className="text-secondary">{t.tax2_name} ({t.tax2_rate}%)</td>
              <td className="text-secondary">{t.tax1_hidden ? 'Yes' : 'No'}</td>
              <td className="text-secondary">{t.tax2_compound ? 'Yes' : 'No'}</td>
              <td className="text-right">
                <Button variant="ghost" size="sm" className="text-red-500 h-6 px-2" onClick={() => handleRemove(t.id)}><Trash2 size={12}/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
};
