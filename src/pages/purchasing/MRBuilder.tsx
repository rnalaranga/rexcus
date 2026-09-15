import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GitPullRequest, Calendar, Users2, Activity, Building2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useInventory } from '@/hooks/useData';
import { createMR } from '@/lib/api';

export const MRBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: inventory } = useInventory();

  const [docNo] = useState('MR-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState('');
  const [requestedBy, setRequestedBy] = useState('Admin');
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState('Normal');
  const [items, setItems] = useState<{ id: string, inventoryId: string, desc: string, qty: number }[]>([]);
  const [notes, setNotes] = useState('');

  const addItem = () => setItems([...items, { id: Date.now().toString(), inventoryId: '', desc: '', qty: 1 }]);

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'inventoryId') {
          const invItem = inventory.find(i => i.id === value);
          if (invItem) updated.desc = invItem.name;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSave = async () => {
    await createMR({ id: docNo, date, requiredDate, requestedBy, department, priority, items, notes, status: 'approved' });
    navigate('/purchasing');
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Material Requisition</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • {department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Submit Request</Button>
        </div>
      </div>

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-1 space-y-5">
             <GlassCard className="p-5 border-t-2 border-t-blue-500">
               <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-4">
                  <GitPullRequest size={16} /> Request Meta
               </h2>
               <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Calendar size={12}/> Request Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Calendar size={12}/> Required By</label>
                    <input type="date" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Users2 size={12}/> Requested By</label>
                    <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Building2 size={12}/> Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs">
                      <option>Production</option><option>Maintenance</option><option>R&D</option><option>Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Activity size={12}/> Priority Level</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className={`w-full border px-3 py-2 rounded-lg text-xs font-bold ${priority === 'High' ? 'bg-red-500/10 border-red-500 text-red-500' : priority === 'Low' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-surface border-theme-subtle'}`}>
                      <option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High / Urgent</option>
                    </select>
                  </div>
               </div>
             </GlassCard>
          </div>

          <div className="xl:col-span-3 space-y-5">
            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex justify-between items-center">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <GitPullRequest size={16} /> Required Materials
                </h2>
                <Button variant="ghost" size="sm" icon={Plus} onClick={addItem} className="text-primary hover:bg-primary/10">Add Item</Button>
              </div>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-5 py-3 w-10 text-center">#</th>
                      <th className="px-3 py-3">Material / Item</th>
                      <th className="px-3 py-3 text-right">Qty Needed</th>
                      <th className="px-5 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                        <td className="p-3 pl-5 text-center text-xs font-bold text-muted">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 max-w-lg">
                            <select value={item.inventoryId} onChange={e => updateItem(item.id, 'inventoryId', e.target.value)} className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-medium focus:border-blue-500">
                              <option value="">-- Material --</option>
                              {inventory.map(i => <option key={i.id} value={i.id}>{i.sku ? `[${i.sku}] ` : ''}{i.name}</option>)}
                            </select>
                            <input type="text" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Specific requirements or specs..." className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-theme-subtle px-2 py-1 rounded text-[11px]" />
                          </div>
                        </td>
                        <td className="p-3 text-right align-top"><input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className="w-20 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-blue-500" /></td>
                        <td className="p-3 pr-5 align-top text-center pt-4"><button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted text-xs">No materials requested yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <label className="block text-[11px] font-bold text-muted uppercase mb-2">Justification / Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};
