import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Truck, PackageCheck, FileSignature, MapPin, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { usePurchaseOrders } from '@/hooks/usePurchasing';
import { createGRN, updatePO } from '@/lib/api';

export const GRNBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('po');
  const navigate = useNavigate();
  const { data: pos } = usePurchaseOrders();

  const [docNo] = useState('GRN-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('Warehouse Manager');
  const [vehicleNo, setVehicleNo] = useState('');
  const [storageLocation, setStorageLocation] = useState('Main Warehouse - Receiving Bay');
  
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('All items inspected and received in good condition.');

  useEffect(() => {
    if (poId && pos.length > 0) {
      const po = pos.find((p: any) => p.id === poId);
      if (po) {
        const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : po.items || [];
        setItems(poItems.map((i: any) => ({ ...i, qtyReceived: i.qty, condition: 'Good' }))); 
      }
    }
  }, [poId, pos]);

  const handleSave = async () => {
    if (!poId) return;
    const po = pos.find((p: any) => p.id === poId);
    if (!po) return;

    const payload = {
      id: docNo, poId, supplierId: po.supplierId, date, receivedBy, items, status: 'received', notes: `Vehicle: ${vehicleNo} | Location: ${storageLocation} | ${notes}`
    };

    await createGRN(payload);
    
    const fullyReceived = items.every(i => Number(i.qtyReceived) >= Number(i.qty));
    await updatePO(poId, { status: fullyReceived ? 'received' : 'partially_received' });

    navigate('/purchasing');
  };

  const totalOrdered = items.reduce((sum, item) => sum + Number(item.qty), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.qtyReceived), 0);
  const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Goods Receipt Note</h1>
            <p className="text-[11px] text-muted mt-0.5">PO: {poId || 'N/A'} • {docNo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Confirm & Add to Stock</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-1 space-y-5">
            <GlassCard className="p-5 border-t-2 border-t-primary">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <Truck size={16}/> Delivery Meta
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Receipt Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Vehicle No / Carrier</label>
                  <input type="text" placeholder="e.g. WP LA-1234" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Storage Location</label>
                  <div className="relative">
                    <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <select value={storageLocation} onChange={e => setStorageLocation(e.target.value)} className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded-lg text-xs">
                      <option>Main Warehouse - Receiving Bay</option>
                      <option>Zone B - Raw Materials</option>
                      <option>Zone C - Chemicals</option>
                      <option>Quarantine Area (Hold)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Inspected By</label>
                  <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
               <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
               <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted">Receiving Progress</h3>
               <div className="text-4xl font-black text-emerald-500">{Math.round(progress)}%</div>
               <p className="text-[10px] text-muted">{totalReceived} of {totalOrdered} items received</p>
            </GlassCard>
          </div>

          <div className="xl:col-span-3 space-y-5">
            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <PackageCheck size={16} /> Incoming Freight Breakdown
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-5 py-3 w-1/2">Material Description</th>
                      <th className="px-3 py-3 text-center">Ordered Qty</th>
                      <th className="px-3 py-3 text-center text-primary">Receiving Qty</th>
                      <th className="px-5 py-3">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {items.map((item, idx) => {
                      const variance = item.qtyReceived - item.qty;
                      return (
                        <tr key={idx} className="hover:bg-surface/30 transition-colors">
                          <td className="p-3 pl-5">
                            <p className="font-bold text-xs">{item.desc}</p>
                            <p className="text-[10px] text-muted font-mono mt-0.5">ID: {item.inventoryId}</p>
                          </td>
                          <td className="p-3 text-center font-medium text-xs text-muted">{item.qty}</td>
                          <td className="p-3 text-center relative">
                            <input 
                              type="number" 
                              value={item.qtyReceived} 
                              onChange={e => {
                                const newItems = [...items];
                                newItems[idx].qtyReceived = Number(e.target.value);
                                setItems(newItems);
                              }} 
                              className="w-20 bg-surface border-2 border-primary/50 px-2 py-1.5 rounded text-xs text-center font-bold text-primary focus:border-primary outline-none" 
                            />
                            {variance !== 0 && (
                              <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold ${variance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {variance > 0 ? '+' : ''}{variance}
                              </span>
                            )}
                          </td>
                          <td className="p-3 pr-5">
                             <select 
                              value={item.condition} 
                              onChange={e => {
                                const newItems = [...items];
                                newItems[idx].condition = e.target.value;
                                setItems(newItems);
                              }}
                              className={`w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-[11px] font-bold ${item.condition !== 'Good' ? 'text-amber-500 border-amber-500/50 bg-amber-500/10' : 'text-emerald-500'}`}
                             >
                               <option value="Good">Good / Undamaged</option>
                               <option value="Damaged">Damaged Box</option>
                               <option value="Rejected">Defective / Rejected</option>
                             </select>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted text-xs">No items found for this Purchase Order.</td></tr>}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-primary/5 border-t border-primary/20 flex items-start gap-3">
                <ShieldCheck size={14} className="text-primary mt-0.5" />
                <p className="text-[10px] text-primary/80 font-medium leading-relaxed">
                  By clicking "Confirm & Add to Stock", the receiving quantities above will be permanently committed to the master inventory ledger. Please ensure physical counts match the receiving quantities accurately.
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <FileSignature size={16}/> Inspection Notes
              </h2>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-surface border border-theme-subtle px-4 py-3 rounded-lg text-xs" />
            </GlassCard>

          </div>
        </div>
      </div>
    </div>
  );
};
