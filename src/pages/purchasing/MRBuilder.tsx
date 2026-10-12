import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GitPullRequest, Calendar, Users2, 
  Activity, Building2, ShoppingCart, Printer, CheckCircle2, Clock, 
  AlertCircle, Package, ArrowRight
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useInventory } from '@/hooks/useData';
import { createMR, updateMR, fetchMRs } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface MRItem {
  id: string;
  inventoryId: string;
  desc: string;
  qty: number;
  uom?: string;
  unitCost?: number;
}

export const MRBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventory } = useInventory();

  const [docNo, setDocNo] = useState('MR-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState('');
  const [requestedBy, setRequestedBy] = useState('Production Supervisor');
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState<'pending' | 'approved' | 'ordered' | 'rejected'>('approved');
  const [poId, setPoId] = useState<string | null>(null);
  const [items, setItems] = useState<MRItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchMRs().then(allMrs => {
        const existing = allMrs.find((m: any) => m.id === id);
        if (existing) {
          setDocNo(existing.id);
          setDate(existing.date ? existing.date.split('T')[0] : '');
          setRequiredDate(existing.requiredDate ? existing.requiredDate.split('T')[0] : '');
          setRequestedBy(existing.requestedBy || '');
          setDepartment(existing.department || 'Production');
          setPriority(existing.priority || 'Normal');
          setStatus((existing.status as any) || 'approved');
          setPoId(existing.poId || null);
          setNotes(existing.notes || '');
          const loadedItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : (existing.items || []);
          setItems(loadedItems.map((item: any) => {
            const inv = inventory.find(i => i.id === item.inventoryId);
            return {
              ...item,
              uom: item.uom || inv?.uom || 'units',
              unitCost: item.unitCost !== undefined ? Number(item.unitCost) : (Number(inv?.unitCost) || 0)
            };
          }));
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id, inventory]);

  const addItem = () => {
    setItems([
      ...items, 
      { id: Date.now().toString(), inventoryId: '', desc: '', qty: 1, uom: 'pcs', unitCost: 0 }
    ]);
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'inventoryId') {
          const invItem = inventory.find(i => i.id === value);
          if (invItem) {
            updated.desc = invItem.name;
            updated.uom = invItem.uom || 'pcs';
            updated.unitCost = Number(invItem.unitCost) || 0;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const totalEstimatedCost = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: docNo,
        date,
        requiredDate,
        requestedBy,
        department,
        priority,
        status,
        poId,
        items,
        notes
      };

      if (id) {
        await updateMR(id, payload);
      } else {
        await createMR(payload);
      }
      navigate('/purchasing');
    } catch (e) {
      console.error(e);
      alert('Failed to save Material Request');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToPO = () => {
    navigate(`/purchasing/po-builder?mr=${docNo}`);
  };

  const exportPDF = () => {
    const element = document.getElementById('mr-pdf-content');
    if (!element) return;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    document.body.appendChild(clone);
    const opt: any = {
      margin: 10,
      filename: `Material_Request_${docNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(clone).set(opt).save().then(() => document.body.removeChild(clone));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-muted animate-pulse">
        Loading Material Request {id}...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/purchasing')} 
            className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary"
            title="Back to Purchasing"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight">Material Requisition</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                status === 'ordered' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : status === 'approved' 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                  : status === 'rejected'
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {docNo} • {department} Department
              {poId && <span className="ml-2 text-emerald-500 font-mono font-bold">Ordered via PO: {poId}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Printer} onClick={exportPDF}>
            Export PDF
          </Button>

          {/* Quick Convert to PO button */}
          {status !== 'ordered' ? (
            <Button 
              variant="outline" 
              size="sm" 
              icon={ShoppingCart} 
              onClick={handleConvertToPO}
              className="border-rex-500/30 text-rex-600 dark:text-rex-300 hover:bg-rex-500/10"
            >
              Convert to PO
            </Button>
          ) : (
            poId && (
              <Button 
                variant="outline" 
                size="sm" 
                icon={ArrowRight} 
                onClick={() => navigate(`/purchasing/po-builder/${poId}`)}
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-medium"
              >
                View PO ({poId})
              </Button>
            )
          )}

          <Button 
            variant="primary" 
            size="sm" 
            icon={Save} 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? 'Saving...' : id ? 'Update Request' : 'Submit Request'}
          </Button>
        </div>
      </div>

      {/* ALERT BANNER IF ORDERED */}
      {status === 'ordered' && poId && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>This Material Request has been approved and converted to <strong>Purchase Order {poId}</strong>.</span>
          </div>
          <button 
            onClick={() => navigate(`/purchasing/po-builder/${poId}`)} 
            className="font-bold underline hover:text-emerald-300 flex items-center gap-1"
          >
            Open Purchase Order <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* META CARD */}
          <div className="xl:col-span-1 space-y-5">
             <GlassCard className="p-5 border-t-2 border-t-blue-500">
               <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-4">
                  <GitPullRequest size={16} /> Request Details
               </h2>
               <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Request ID</label>
                    <input 
                      type="text" 
                      value={docNo} 
                      disabled={!!id} 
                      onChange={e => setDocNo(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-bold" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Workflow Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value as any)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-bold"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved for Purchasing</option>
                      <option value="ordered">Ordered (PO Issued)</option>
                      <option value="rejected">Rejected / Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Calendar size={12}/> Request Date
                    </label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Calendar size={12}/> Required By Date
                    </label>
                    <input 
                      type="date" 
                      value={requiredDate} 
                      onChange={e => setRequiredDate(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Users2 size={12}/> Requested By
                    </label>
                    <input 
                      type="text" 
                      value={requestedBy} 
                      onChange={e => setRequestedBy(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Building2 size={12}/> Department
                    </label>
                    <select 
                      value={department} 
                      onChange={e => setDepartment(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs"
                    >
                      <option>Production</option>
                      <option>Maintenance</option>
                      <option>R&D</option>
                      <option>Quality Control</option>
                      <option>Admin</option>
                      <option>Logistics</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Activity size={12}/> Priority Level
                    </label>
                    <select 
                      value={priority} 
                      onChange={e => setPriority(e.target.value)} 
                      className={`w-full border px-3 py-2 rounded-lg text-xs font-bold ${
                        priority === 'High' ? 'bg-red-500/10 border-red-500 text-red-500' :
                        priority === 'Low' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 
                        'bg-surface border-theme-subtle'
                      }`}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High / Urgent</option>
                    </select>
                  </div>

                  {poId && (
                    <div className="pt-2 border-t border-theme-subtle">
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Linked Purchase Order</label>
                      <div className="p-2.5 bg-surface2 rounded-lg border border-theme-subtle flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{poId}</span>
                        <button 
                          onClick={() => navigate(`/purchasing/po-builder/${poId}`)}
                          className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                        >
                          View <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  )}
               </div>
             </GlassCard>

             {/* ESTIMATED TOTALS CARD */}
             <GlassCard className="p-4 border-theme-subtle bg-surface/40 space-y-2">
               <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">Estimation Summary</h3>
               <div className="flex justify-between text-xs">
                 <span className="text-secondary">Line Items:</span>
                 <span className="font-bold text-primary">{items.length}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-secondary">Total Units:</span>
                 <span className="font-bold text-primary">{totalUnits}</span>
               </div>
               <div className="flex justify-between text-xs pt-2 border-t border-theme-subtle">
                 <span className="text-secondary font-bold">Est. Total Cost:</span>
                 <span className="font-black text-emerald-500">{formatCurrency(totalEstimatedCost)}</span>
               </div>
             </GlassCard>
          </div>

          {/* RIGHT COLUMN (Items & Remarks) */}
          <div className="xl:col-span-3 space-y-5">
            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex justify-between items-center">
                <div>
                  <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Package size={16} /> Required Materials & Specifications
                  </h2>
                  <p className="text-[10px] text-muted">Select catalog items from inventory to auto-populate units and estimated costs.</p>
                </div>
                <Button variant="ghost" size="sm" icon={Plus} onClick={addItem} className="text-primary hover:bg-primary/10">
                  Add Item
                </Button>
              </div>

              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-4 py-3 w-10 text-center">#</th>
                      <th className="px-3 py-3">Material / Item</th>
                      <th className="px-3 py-3 text-center">In Stock</th>
                      <th className="px-3 py-3 text-right">Qty Needed</th>
                      <th className="px-3 py-3 text-right">Est. Unit Cost</th>
                      <th className="px-3 py-3 text-right">Est. Total</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {items.map((item, idx) => {
                      const invItem = inventory.find(i => i.id === item.inventoryId);
                      const currentStock = invItem ? (Number(invItem.quantity) || 0) : null;
                      const lineCost = (Number(item.qty) || 0) * (Number(item.unitCost) || 0);

                      return (
                        <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                          <td className="p-3 pl-4 text-center text-xs font-bold text-muted align-top pt-4">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1.5 max-w-md">
                              <select 
                                value={item.inventoryId} 
                                onChange={e => updateItem(item.id, 'inventoryId', e.target.value)} 
                                className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-medium focus:border-blue-500"
                              >
                                <option value="">-- Select Material / Inventory Item --</option>
                                {inventory.map(i => (
                                  <option key={i.id} value={i.id}>
                                    {i.sku ? `[${i.sku}] ` : ''}{i.name} ({i.category || 'General'})
                                  </option>
                                ))}
                              </select>
                              <input 
                                type="text" 
                                value={item.desc} 
                                onChange={e => updateItem(item.id, 'desc', e.target.value)} 
                                placeholder="Specifications, grade, or reason for requirement..." 
                                className="w-full bg-transparent border border-theme-subtle/50 hover:border-theme-subtle focus:border-theme-subtle px-2 py-1 rounded text-[11px] text-secondary" 
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center align-top pt-4">
                            {currentStock !== null ? (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                currentStock <= 0 
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                  : currentStock < (Number(item.qty) || 0) 
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}>
                                {currentStock} {invItem?.uom || ''}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right align-top pt-3">
                            <div className="flex items-center justify-end gap-1">
                              <input 
                                type="number" 
                                min="1"
                                value={item.qty} 
                                onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} 
                                className="w-20 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-blue-500" 
                              />
                              <span className="text-[10px] text-muted font-mono w-8">{item.uom || 'units'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right align-top pt-3">
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.unitCost} 
                              onChange={e => updateItem(item.id, 'unitCost', Number(e.target.value))} 
                              className="w-24 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-mono focus:border-blue-500" 
                            />
                          </td>
                          <td className="p-3 text-right align-top pt-4 font-mono font-bold text-xs text-primary">
                            {formatCurrency(lineCost)}
                          </td>
                          <td className="p-3 pr-4 align-top text-center pt-3.5">
                            <button 
                              onClick={() => removeItem(item.id)} 
                              className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                              title="Delete Item"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted text-xs">
                          No materials requested yet. Click "Add Item" to add requested materials.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {items.length > 0 && (
                <div className="p-4 bg-surface/30 border-t border-theme-subtle flex justify-between items-center">
                  <span className="text-xs text-muted">{items.length} items listed</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-secondary font-bold">Estimated Grand Total:</span>
                    <span className="text-base font-black text-emerald-500 font-mono">
                      {formatCurrency(totalEstimatedCost)}
                    </span>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <label className="block text-[11px] font-bold text-muted uppercase mb-2">
                Justification / Usage Purpose / Notes
              </label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={3} 
                placeholder="Mention why these materials are needed, e.g. for Work Order WO-XXXX, maintenance, or minimum threshold replenishment..."
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs leading-relaxed" 
              />
            </GlassCard>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT / PDF TEMPLATE */}
      <div id="mr-pdf-content" style={{ display: 'none', background: 'white', color: 'black', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1a202c', paddingBottom: '20px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#1a202c', letterSpacing: '-0.5px' }}>
              MATERIAL REQUISITION NOTE
            </h1>
            <div style={{ marginTop: '10px', display: 'flex', gap: '25px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>MR Number</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{docNo}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Date</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{date}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Required By</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{requiredDate || 'Immediate'}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Department</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{department}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#2b6cb0' }}>REX INDUSTRIES</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#4a5568' }}>Internal Material Requisition</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#4a5568' }}>Requested by: <strong>{requestedBy}</strong></p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}>#</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item & Specifications</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '90px' }}>Qty</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Est. Cost</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '110px' }}>Est. Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#718096' }}>{idx + 1}</td>
                <td style={{ padding: '8px 12px' }}>
                  <strong>{inventory.find(i => i.id === it.inventoryId)?.name || it.desc || it.inventoryId}</strong>
                  {it.desc && <div style={{ fontSize: '10px', color: '#718096' }}>{it.desc}</div>}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                  {it.qty} {it.uom || 'units'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {formatCurrency(Number(it.unitCost) || 0)}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency((Number(it.qty) || 0) * (Number(it.unitCost) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
              <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right' }}>Estimated Total:</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2b6cb0' }}>
                {formatCurrency(totalEstimatedCost)}
              </td>
            </tr>
          </tfoot>
        </table>

        {notes && (
          <div style={{ marginBottom: '30px', fontSize: '11px', color: '#4a5568', background: '#f7fafc', padding: '12px', borderLeft: '4px solid #2b6cb0' }}>
            <strong>Purpose / Justification:</strong> {notes}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Requested By</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>{requestedBy}</p>
          </div>
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Department Head</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>Authorized Signature</p>
          </div>
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Purchasing Dept</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>PO Issued: {poId || 'Pending'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
