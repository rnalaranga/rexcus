import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { useTaxes } from '@/hooks/useFinance';
import { createTax, deleteTax } from '@/lib/api';

export const TaxManager = () => {
  const { data: taxes, refetch } = useTaxes();
  const [newTax, setNewTax] = useState({ name: '', rate: 0 });

  const handleAdd = async () => {
    if (!newTax.name || newTax.rate < 0) return;
    await createTax(newTax);
    setNewTax({ name: '', rate: 0 });
    refetch();
  };

  const handleRemove = async (id: string) => {
    await deleteTax(id);
    refetch();
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Tax Management</h2>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input 
          placeholder="Tax Name (e.g. VAT)" 
          className="input-base flex-1" 
          value={newTax.name} 
          onChange={e => setNewTax({...newTax, name: e.target.value})} 
        />
        <input 
          type="number" 
          placeholder="Rate (%)" 
          className="input-base w-32" 
          value={newTax.rate} 
          onChange={e => setNewTax({...newTax, rate: Number(e.target.value)})} 
        />
        <Button variant="primary" icon={Plus} onClick={handleAdd}>Add</Button>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-theme-subtle text-xs text-muted uppercase tracking-wider">
            <th className="py-2">Tax Name</th>
            <th>Rate (%)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {taxes.map(t => (
             <tr key={t.id} className="border-b border-theme-subtle/50 text-sm">
              <td className="py-2 text-secondary">{t.name}</td>
              <td className="text-secondary">{t.rate}%</td>
              <td className="text-right">
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleRemove(t.id)}><Trash2 size={14}/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
};

