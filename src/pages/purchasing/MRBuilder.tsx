import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GitPullRequest, Calendar, Users2, 
  Activity, Building2, ShoppingCart, Printer, CheckCircle2, Clock, 
  AlertCircle, Package, ArrowRight, Briefcase, Tag, X, ExternalLink
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useInventory } from '@/hooks/useData';
import { createMR, updateMR, fetchMRs, fetchWorkOrders } from '@/lib/api';
import { usePurchaseOrders } from '@/hooks/usePurchasing';
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
  workOrderNos?: string[];
}

export const MRBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inventory } = useInventory();
  const { data: pos } = usePurchaseOrders();

  const [docNo, setDocNo] = useState('MR-' + Date.now().toString().slice(-4));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState('');
  const [requestedBy, setRequestedBy] = useState('Production Supervisor');
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState<'pending' | 'approved' | 'partially_ordered' | 'ordered' | 'rejected'>('approved');
  
  // Work Order Numbers
  const [workOrderNos, setWorkOrderNos] = useState<string[]>([]);
  const [workOrderInput, setWorkOrderInput] = useState<string>('');
  const [availableWorkOrders, setAvailableWorkOrders] = useState<any[]>([]);

  // Linked Purchase Orders
  const [poId, setPoId] = useState<string | null>(null);
  const [poIds, setPoIds] = useState<string[]>([]);
  
  const [items, setItems] = useState<MRItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  // Fetch available work orders
  useEffect(() => {
    fetchWorkOrders().then(data => {
      if (Array.isArray(data)) setAvailableWorkOrders(data);
    }).catch(console.error);
  }, []);

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

          // Parse linked POs
          const parsedPoIds = Array.isArray(existing.poIds)
            ? existing.poIds
            : (typeof existing.poIds === 'string'
                ? (() => { try { const p = JSON.parse(existing.poIds); return Array.isArray(p) ? p : [existing.poIds]; } catch { return [existing.poIds]; } })()
                : (existing.poId ? [existing.poId] : []));
          setPoIds(parsedPoIds);

          // Parse linked Work Orders
          const parsedWoNos = Array.isArray(existing.workOrderNos)
            ? existing.workOrderNos
            : (typeof existing.workOrderNos === 'string'
                ? (() => { try { const w = JSON.parse(existing.workOrderNos); return Array.isArray(w) ? w : [existing.workOrderNos]; } catch { return [existing.workOrderNos]; } })()
                : (existing.workOrderNo ? [existing.workOrderNo] : []));
          setWorkOrderNos(parsedWoNos);

          setNotes(existing.notes || '');
          const loadedItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : (existing.items || []);
          setItems(loadedItems.map((item: any) => {
            const inv = inventory.find(i => i.id === item.inventoryId);
            return {
              ...item,
              uom: item.uom || inv?.uom || 'units',
              unitCost: item.unitCost !== undefined ? Number(item.unitCost) : (Number(inv?.unitCost) || 0),
              workOrderNos: Array.isArray(item.workOrderNos) 
                ? item.workOrderNos 
                : (typeof item.workOrderNos === 'string' 
                    ? [item.workOrderNos] 
                    : (item.workOrderNo ? [item.workOrderNo] : []))
            };
          }));
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id, inventory]);

  const hasItemWorkOrders = items.some(item => item.workOrderNos && item.workOrderNos.length > 0);

  const handleAddWorkOrder = (woNumber: string) => {
    const trimmed = woNumber.trim();
    if (!trimmed) return;
    if (hasItemWorkOrders) {
      alert("Job numbers are already assigned to individual items below. Clear item job numbers to use MR-level job numbers.");
      return;
    }
    if (!workOrderNos.includes(trimmed)) {
      setWorkOrderNos([...workOrderNos, trimmed]);
    }
    setWorkOrderInput('');
  };

  const handleRemoveWorkOrder = (woNumber: string) => {
    setWorkOrderNos(workOrderNos.filter(w => w !== woNumber));
  };

  const handleAddItemWorkOrder = (itemId: string, woNumber: string) => {
    const trimmed = woNumber.trim();
    if (!trimmed) return;

    // Mutually exclusive: When assigning job numbers per item, clear header-level MR work orders!
    if (workOrderNos.length > 0) {
      setWorkOrderNos([]);
    }

    setItems(prevItems => prevItems.map(it => {
      if (it.id === itemId) {
        const current = it.workOrderNos || [];
        if (!current.includes(trimmed)) {
          return { ...it, workOrderNos: [...current, trimmed] };
        }
      }
      return it;
    }));
  };

  const handleRemoveItemWorkOrder = (itemId: string, woNumber: string) => {
    setItems(prevItems => prevItems.map(it => {
      if (it.id === itemId) {
        return { ...it, workOrderNos: (it.workOrderNos || []).filter(w => w !== woNumber) };
      }
      return it;
    }));
  };

  const handleClearAllItemWorkOrders = () => {
    setItems(prevItems => prevItems.map(it => ({ ...it, workOrderNos: [] })));
  };

  const addItem = () => {
    setItems([
      ...items, 
      { id: Date.now().toString(), inventoryId: '', desc: '', qty: 1, uom: 'pcs', unitCost: 0, workOrderNos: [] }
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

  // Compute fulfillment status across all linked Purchase Orders
  const linkedPOs = pos.filter((p: any) => {
    const pMrIds = Array.isArray(p.mrIds) ? p.mrIds : (typeof p.mrIds === 'string' ? JSON.parse(p.mrIds || '[]') : [p.mrId].filter(Boolean));
    return p.mrId === docNo || (id && p.mrId === id) || pMrIds.includes(docNo) || (id && pMrIds.includes(id));
  });

  const orderedTotals: Record<string, number> = {};
  for (const p of linkedPOs) {
    const pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
    for (const it of pItems) {
      if (!it.mrId || it.mrId === docNo || (id && it.mrId === id)) {
        const key = it.inventoryId || it.desc || it.id;
        if (key) {
          orderedTotals[key] = (orderedTotals[key] || 0) + (Number(it.qty) || 0);
        }
      }
    }
  }

  const allPoIds = Array.from(new Set([
    ...poIds,
    ...(poId ? [poId] : []),
    ...linkedPOs.map((p: any) => p.id)
  ]));

  const totalEstimatedCost = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalOrderedUnits = items.reduce((sum, item) => sum + Math.min(Number(item.qty) || 0, orderedTotals[item.inventoryId || item.desc || item.id] || 0), 0);
  const totalBalanceUnits = items.reduce((sum, item) => {
    const req = Number(item.qty) || 0;
    const ord = orderedTotals[item.inventoryId || item.desc || item.id] || 0;
    return sum + Math.max(0, req - ord);
  }, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalWorkOrderNos = hasItemWorkOrders ? [] : workOrderNos;
      const finalWorkOrderNo = hasItemWorkOrders ? null : (workOrderNos[0] || null);

      const payload = {
        id: docNo,
        date,
        requiredDate,
        requestedBy,
        department,
        priority,
        status,
        poId: allPoIds[0] || null,
        poIds: JSON.stringify(allPoIds),
        workOrderNo: finalWorkOrderNo,
        workOrderNos: JSON.stringify(finalWorkOrderNos),
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
                  : status === 'partially_ordered'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : status === 'approved' 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                  : status === 'rejected'
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-zinc-500/10 border-zinc-500/30 text-muted'
              }`}>
                {status === 'partially_ordered' ? 'Partially Ordered' : status}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {docNo} • {department} Department
              {hasItemWorkOrders ? (
                <span className="ml-2 text-purple-500 font-mono font-bold">
                  Jobs: {Array.from(new Set(items.flatMap(i => i.workOrderNos || []))).join(', ')} (Per Item)
                </span>
              ) : workOrderNos.length > 0 ? (
                <span className="ml-2 text-purple-500 font-mono font-bold">
                  WO: {workOrderNos.join(', ')}
                </span>
              ) : null}
              {allPoIds.length > 0 && (
                <span className="ml-2 text-emerald-500 font-mono font-bold">
                  POs: {allPoIds.join(', ')}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Printer} onClick={exportPDF}>
            Export PDF
          </Button>

          {/* Quick Convert to PO button */}
          {totalBalanceUnits > 0 || status !== 'ordered' ? (
            <Button 
              variant="outline" 
              size="sm" 
              icon={ShoppingCart} 
              onClick={handleConvertToPO}
              className="border-rex-500/30 text-rex-600 dark:text-rex-300 hover:bg-rex-500/10"
            >
              {totalOrderedUnits > 0 ? `Create PO (Bal: ${totalBalanceUnits})` : 'Convert to PO'}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              icon={ShoppingCart} 
              onClick={handleConvertToPO}
              className="text-xs text-muted hover:text-primary"
              title="Issue another Purchase Order against this Material Request"
            >
              + Additional PO
            </Button>
          )}

          {allPoIds.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              icon={ArrowRight} 
              onClick={() => navigate(`/purchasing/po-builder/${allPoIds[allPoIds.length - 1]}`)}
              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-medium"
            >
              View PO ({allPoIds[allPoIds.length - 1]})
            </Button>
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

      {/* ALERT BANNER IF PARTIALLY ORDERED */}
      {(status === 'partially_ordered' || (totalOrderedUnits > 0 && totalBalanceUnits > 0)) && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>
              This Material Request is <strong>Partially Ordered</strong> ({totalOrderedUnits} ordered, <strong>{totalBalanceUnits} units remaining</strong>).
              Linked POs: {allPoIds.join(', ')}.
            </span>
          </div>
          <button 
            onClick={handleConvertToPO} 
            className="font-bold underline hover:text-amber-300 flex items-center gap-1"
          >
            Create PO for Balance ({totalBalanceUnits} units) <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ALERT BANNER IF FULLY ORDERED */}
      {status === 'ordered' && totalBalanceUnits <= 0 && allPoIds.length > 0 && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>This Material Request is <strong>100% Fulfilled</strong> across Purchase Orders: {allPoIds.join(', ')}.</span>
          </div>
          <button 
            onClick={() => navigate(`/purchasing/po-builder/${allPoIds[allPoIds.length - 1]}`)} 
            className="font-bold underline hover:text-emerald-300 flex items-center gap-1"
          >
            Open Latest Purchase Order <ArrowRight size={12} />
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
                      <option value="partially_ordered">Partially Ordered</option>
                      <option value="ordered">Ordered (100% Fulfilled)</option>
                      <option value="rejected">Rejected / Cancelled</option>
                    </select>
                  </div>

                  {/* LINKED WORK ORDERS (HEADER LEVEL vs PER-ITEM) */}
                  {hasItemWorkOrders ? (
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Briefcase size={13} /> Work Order No(s)
                        </label>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded">
                          Per-Item Mode
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-tight">
                        Job numbers are assigned to individual items below. MR-level job number input is disabled.
                      </p>
                      
                      {/* Summary of all unique job numbers used across items */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {Array.from(new Set(items.flatMap(i => i.workOrderNos || []))).map(wo => (
                          <span 
                            key={wo} 
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-200 border border-purple-500/30 rounded-md text-xs font-mono font-bold"
                          >
                            {wo}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleClearAllItemWorkOrders}
                        className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline pt-1 block"
                      >
                        Switch back to MR-level job number (clear item jobs)
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-surface2/60 rounded-xl border border-theme-subtle/80 space-y-2.5">
                      <label className="block text-[11px] font-bold text-purple-500 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Briefcase size={13} /> Work Order No(s)</span>
                        <span className="text-[10px] text-muted font-normal">Entire MR</span>
                      </label>

                      {/* Chips for Selected Work Orders */}
                      {workOrderNos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {workOrderNos.map((wo) => (
                            <span 
                              key={wo} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-md text-xs font-mono font-bold"
                            >
                              {wo}
                              <button 
                                type="button" 
                                onClick={() => handleRemoveWorkOrder(wo)}
                                className="hover:text-red-500 transition-colors ml-0.5"
                                title={`Remove ${wo}`}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick Select from Active Work Orders */}
                      {availableWorkOrders.length > 0 && (
                        <select 
                          value="" 
                          onChange={e => { if (e.target.value) handleAddWorkOrder(e.target.value); }}
                          className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <option value="">+ Select from Work Orders...</option>
                          {availableWorkOrders
                            .filter(w => !workOrderNos.includes(w.id))
                            .map(w => (
                              <option key={w.id} value={w.id}>
                                {w.id} {w.title ? `- ${w.title}` : ''} ({w.status || 'Active'})
                              </option>
                            ))}
                        </select>
                      )}

                      {/* Manual Work Order Input */}
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={workOrderInput}
                          onChange={e => setWorkOrderInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWorkOrder(workOrderInput); } }}
                          placeholder="Type WO # (e.g. WO-101)..." 
                          className="flex-1 bg-surface border border-theme-subtle px-2.5 py-1 rounded text-xs font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          onClick={() => handleAddWorkOrder(workOrderInput)}
                          className="px-2 h-7 text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

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

                  {allPoIds.length > 0 && (
                    <div className="pt-2 border-t border-theme-subtle">
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                        Linked Purchase Orders ({allPoIds.length})
                      </label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {allPoIds.map((pid: string) => (
                          <div key={pid} className="p-2 bg-surface2 rounded-lg border border-theme-subtle flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-primary">{pid}</span>
                            <button 
                              onClick={() => navigate(`/purchasing/po-builder/${pid}`)}
                              className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                            >
                              View <ArrowRight size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
             </GlassCard>

             {/* ESTIMATED TOTALS CARD */}
             <GlassCard className="p-4 border-theme-subtle bg-surface/40 space-y-2">
               <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">Estimation & Balance Summary</h3>
               <div className="flex justify-between text-xs">
                 <span className="text-secondary">Line Items:</span>
                 <span className="font-bold text-primary">{items.length}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-secondary">Total Requested Units:</span>
                 <span className="font-bold text-primary font-mono">{totalUnits}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-secondary">Total Ordered in POs:</span>
                 <span className="font-bold text-emerald-500 font-mono">{totalOrderedUnits}</span>
               </div>
               <div className="flex justify-between text-xs border-t border-theme-subtle pt-1.5">
                 <span className="text-secondary font-bold">Remaining to Order:</span>
                 <span className={`font-mono font-bold ${totalBalanceUnits > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                   {totalBalanceUnits} units
                 </span>
               </div>
               <div className="flex justify-between text-xs border-t border-theme-subtle pt-2">
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
                  <p className="text-[10px] text-muted">Track requested quantities, amounts already ordered across POs, and remaining balances.</p>
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
                      <th className="px-3 py-3 min-w-[180px]">Job / WO No(s)</th>
                      <th className="px-3 py-3 text-center">In Stock</th>
                      <th className="px-3 py-3 text-right">Req. Qty</th>
                      <th className="px-3 py-3 text-right">Ordered in POs</th>
                      <th className="px-3 py-3 text-right">Balance to Order</th>
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

                      const itemKey = item.inventoryId || item.desc || item.id;
                      const ord = orderedTotals[itemKey] || 0;
                      const req = Number(item.qty) || 0;
                      const bal = Math.max(0, req - ord);
                      const isFulfilled = ord >= req && req > 0;
                      const isPartial = ord > 0 && ord < req;

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
                          <td className="p-3 align-top">
                            <div className="space-y-1.5 max-w-[190px]">
                              {/* Selected Chips */}
                              {(item.workOrderNos && item.workOrderNos.length > 0) && (
                                <div className="flex flex-wrap gap-1">
                                  {item.workOrderNos.map((wo) => (
                                    <span 
                                      key={wo} 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded text-[10px] font-mono font-bold"
                                    >
                                      {wo}
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemoveItemWorkOrder(item.id, wo)}
                                        className="hover:text-red-500 transition-colors ml-0.5"
                                        title={`Remove ${wo}`}
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Dropdown selector */}
                              {availableWorkOrders.length > 0 && (
                                <select 
                                  value="" 
                                  onChange={e => { if (e.target.value) handleAddItemWorkOrder(item.id, e.target.value); }}
                                  className="w-full bg-surface border border-theme-subtle px-1.5 py-1 rounded text-[11px] font-medium"
                                >
                                  <option value="">+ Add Job / WO...</option>
                                  {availableWorkOrders
                                    .filter(w => !(item.workOrderNos || []).includes(w.id))
                                    .map(w => (
                                      <option key={w.id} value={w.id}>
                                        {w.id} {w.title ? `- ${w.title}` : ''}
                                      </option>
                                    ))}
                                </select>
                              )}

                              {/* Manual Input */}
                              <input 
                                type="text" 
                                placeholder="Type Job # & Enter..." 
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const inputEl = e.target as HTMLInputElement;
                                    if (inputEl.value.trim()) {
                                      handleAddItemWorkOrder(item.id, inputEl.value);
                                      inputEl.value = '';
                                    }
                                  }
                                }}
                                className="w-full bg-transparent border border-theme-subtle/50 hover:border-theme-subtle focus:border-purple-500 px-2 py-0.5 rounded text-[10px] font-mono"
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
                          <td className="p-3 text-right align-top pt-4 font-mono text-xs">
                            <span className={ord > 0 ? "font-bold text-emerald-500" : "text-muted"}>
                              {ord} {item.uom || ''}
                            </span>
                          </td>
                          <td className="p-3 text-right align-top pt-4 font-mono text-xs">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              isFulfilled 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : isPartial 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                : 'text-primary'
                            }`}>
                              {bal} {item.uom || ''}
                            </span>
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
                        <td colSpan={10} className="p-8 text-center text-muted text-xs">
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
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
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
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Work Order(s)</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#4c1d95' }}>
                  {hasItemWorkOrders 
                    ? 'Specified Per Line Item' 
                    : workOrderNos.length > 0 ? workOrderNos.join(', ') : 'N/A'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Linked PO(s)</p>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#047857' }}>{allPoIds.length > 0 ? allPoIds.join(', ') : 'Pending'}</p>
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
              <th style={{ padding: '8px 12px', textAlign: 'center', width: '130px' }}>Job / WO #</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '80px' }}>Req. Qty</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '80px' }}>Ordered</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '80px' }}>Balance</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '90px' }}>Est. Cost</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Est. Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const itemKey = it.inventoryId || it.desc || it.id;
              const ord = orderedTotals[itemKey] || 0;
              const req = Number(it.qty) || 0;
              const bal = Math.max(0, req - ord);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#718096' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <strong>{inventory.find(i => i.id === it.inventoryId)?.name || it.desc || it.inventoryId}</strong>
                    {it.desc && <div style={{ fontSize: '10px', color: '#718096' }}>{it.desc}</div>}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#4c1d95', fontWeight: 'bold', fontSize: '11px' }}>
                    {(it.workOrderNos && it.workOrderNos.length > 0)
                      ? it.workOrderNos.join(', ')
                      : workOrderNos.length > 0 ? workOrderNos.join(', ') : '-'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                    {it.qty} {it.uom || 'units'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#047857', fontWeight: 'bold' }}>
                    {ord} {it.uom || 'units'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: bal > 0 ? '#b45309' : '#047857', fontWeight: 'bold' }}>
                    {bal} {it.uom || 'units'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {formatCurrency(Number(it.unitCost) || 0)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency((Number(it.qty) || 0) * (Number(it.unitCost) || 0))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
              <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right' }}>Estimated Total:</td>
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
            <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>
              POs: {allPoIds.length > 0 ? allPoIds.join(', ') : 'Pending'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
