import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  PackageCheck, Plus, Search, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, X, Check, Package, FileText, ChevronRight
} from 'lucide-react';
import { useMaterialRequests } from '@/hooks/usePurchasing';
import { useInventory } from '@/hooks/useData';
import { createMR } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

export const MobileMRHub: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useDialog();
  const [searchParams] = useSearchParams();

  const { data: rawMrs = [], loading, refetch } = useMaterialRequests();
  const { data: inventory = [] } = useInventory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'issued'>('all');
  const [search, setSearch] = useState('');

  // Form State
  const [department, setDepartment] = useState('Production');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [purpose, setPurpose] = useState('');
  const [jobRef, setJobRef] = useState('');
  
  // Selected line items
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemsList, setItemsList] = useState<Array<{ itemId: string; name: string; qty: number; unit: string; currentStock: number }>>([]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Inventory search results for autocomplete
  const inventoryMatches = useMemo(() => {
    if (!itemSearchTerm.trim()) return [];
    const term = itemSearchTerm.toLowerCase();
    return inventory.filter((item: any) => 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.sku && item.sku.toLowerCase().includes(term)) ||
      (item.code && item.code.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [inventory, itemSearchTerm]);

  const handleAddItem = (item: any) => {
    setSelectedItemId(item.id);
    setItemSearchTerm(item.name || item.sku || 'Item');
  };

  const handleConfirmAddItem = () => {
    const matched = inventory.find((i: any) => i.id === selectedItemId);
    const qty = parseFloat(itemQty);
    if (!matched) {
      toast('Please search and select an inventory item', 'warning');
      return;
    }
    if (!qty || qty <= 0) {
      toast('Please enter a valid quantity', 'warning');
      return;
    }

    setItemsList(prev => [
      ...prev,
      {
        itemId: matched.id,
        name: matched.name,
        qty,
        unit: matched.unit || 'pcs',
        currentStock: Number(matched.quantity || matched.stock || 0)
      }
    ]);

    setSelectedItemId('');
    setItemSearchTerm('');
    setItemQty('');
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitMR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsList.length === 0) {
      toast('Please add at least one material item to the request', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const mrNo = `MR-${new Date().getFullYear().toString().slice(-2)}${String(Date.now()).slice(-4)}`;
      const payload = {
        mrNo,
        date: new Date().toISOString().slice(0, 10),
        requestedBy: user?.name || 'Mobile User',
        department,
        priority,
        purpose: purpose.trim() || 'Factory Requisition',
        jobRef: jobRef.trim(),
        status: 'PENDING',
        items: itemsList.map(it => ({
          itemId: it.itemId,
          name: it.name,
          quantity: it.qty,
          unit: it.unit
        }))
      };

      await createMR(payload);
      toast(`Material Request #${mrNo} submitted successfully!`, 'success');
      setIsModalOpen(false);
      setItemsList([]);
      setPurpose('');
      setJobRef('');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Failed to submit Material Request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMRs = useMemo(() => {
    return rawMrs.filter((mr: any) => {
      const st = String(mr.status || 'PENDING').toLowerCase();
      if (activeTab === 'pending' && !st.includes('pend') && !st.includes('draft')) return false;
      if (activeTab === 'approved' && !st.includes('approv')) return false;
      if (activeTab === 'issued' && !st.includes('issu') && !st.includes('close')) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesNo = (mr.mrNo || mr.id || '').toLowerCase().includes(q);
        const matchesReq = (mr.requestedBy || '').toLowerCase().includes(q);
        const matchesPur = (mr.purpose || '').toLowerCase().includes(q);
        return matchesNo || matchesReq || matchesPur;
      }
      return true;
    });
  }, [rawMrs, activeTab, search]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-primary flex items-center gap-2">
            Material Requisitions
          </h1>
          <p className="text-[11px] text-muted">
            Store issues & material dispatch requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-surface border border-theme text-muted hover:text-primary shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-rex-600' : ''} />
        </button>
      </div>

      {/* Prominent + Create Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 px-4 rounded-xl bg-rex-600 hover:bg-rex-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>+ New Material Request (MR)</span>
      </button>

      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search by MR#, Requester or Purpose..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-theme rounded-xl py-2 pl-9 pr-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500 shadow-xs"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All (${rawMrs.length})` },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'issued', label: 'Issued / Done' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-rex-600 text-white font-bold shadow-xs'
                : 'bg-surface border border-theme text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MR Cards List */}
      {filteredMRs.length > 0 ? (
        <div className="space-y-2.5">
          {filteredMRs.map((mr: any) => {
            const st = String(mr.status || 'PENDING').toUpperCase();
            const isApproved = st.includes('APPROV');
            const isIssued = st.includes('ISSU') || st.includes('CLOSE');
            const isPending = !isApproved && !isIssued;

            let itemsCount = 0;
            try {
              const parsed = typeof mr.items === 'string' ? JSON.parse(mr.items) : mr.items;
              itemsCount = Array.isArray(parsed) ? parsed.length : 0;
            } catch {
              itemsCount = 1;
            }

            return (
              <div
                key={mr.id}
                className="p-3.5 rounded-xl bg-surface border border-theme shadow-xs space-y-2 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-rex-600 dark:text-rex-400 block">
                      {mr.mrNo || mr.id}
                    </span>
                    <span className="text-[11px] text-secondary font-semibold">
                      Requested by: {mr.requestedBy || 'User'}
                    </span>
                    <span className="text-[10px] text-muted block font-mono">
                      {formatDate(mr.date || mr.createdAt)} • {mr.department || 'Production'}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    isIssued 
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                      : isApproved
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                  }`}>
                    {st}
                  </span>
                </div>

                {mr.purpose && (
                  <p className="text-[11px] text-secondary bg-surface2/60 p-2 rounded-lg border border-theme-subtle">
                    <span className="text-[9px] uppercase font-bold text-muted block">Purpose:</span>
                    {mr.purpose}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-theme-subtle text-[11px] text-muted">
                  <span className="flex items-center gap-1 font-medium">
                    <PackageCheck size={12} className="text-rex-600" />
                    <span>{itemsCount} item{itemsCount > 1 ? 's' : ''} requested</span>
                  </span>
                  {mr.priority === 'urgent' && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase">
                      Urgent Priority
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-surface border border-theme text-center text-xs text-muted shadow-xs">
          No material requests found.
        </div>
      )}

      {/* Create MR Bottom Sheet / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in text-primary">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <PackageCheck size={16} className="text-rex-600" />
                Create Material Request (MR)
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitMR} className="space-y-3">
              {/* Department & Priority */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-surface2 border border-theme rounded-lg p-2 text-xs text-primary focus:outline-none focus:border-rex-500"
                  >
                    <option value="Production">Production</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Quality Control">Quality Control</option>
                    <option value="General Stores">General Stores</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-surface2 border border-theme rounded-lg p-2 text-xs text-primary focus:outline-none focus:border-rex-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Purpose / Job Ref */}
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                  Purpose / Job Details *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Work Order #WO-105 material dispatch"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-surface2 border border-theme rounded-lg p-2.5 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500"
                />
              </div>

              {/* Item Adder Box */}
              <div className="p-3 rounded-xl bg-surface2 border border-theme space-y-2.5">
                <span className="text-[11px] font-bold text-primary block">
                  Add Material Items
                </span>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search item name or code..."
                    value={itemSearchTerm}
                    onChange={(e) => {
                      setItemSearchTerm(e.target.value);
                      setSelectedItemId('');
                    }}
                    className="w-full bg-surface border border-theme rounded-lg p-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500 shadow-xs"
                  />
                  {inventoryMatches.length > 0 && !selectedItemId && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-theme rounded-lg shadow-xl z-20 max-h-36 overflow-y-auto">
                      {inventoryMatches.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => handleAddItem(m)}
                          className="p-2 hover:bg-surface2 text-xs text-primary cursor-pointer flex items-center justify-between border-b border-theme-subtle last:border-0"
                        >
                          <span className="truncate font-medium">{m.name}</span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1">
                            Stock: {m.quantity || m.stock || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Required Qty"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="flex-1 bg-surface border border-theme rounded-lg p-2 text-xs text-primary font-mono focus:outline-none focus:border-rex-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmAddItem}
                    className="py-2 px-3 rounded-lg bg-rex-600 hover:bg-rex-500 text-white text-xs font-bold shrink-0 shadow-xs"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Added items list */}
                {itemsList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {itemsList.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface border border-theme text-xs shadow-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-primary truncate">{it.name}</p>
                          <p className="text-[10px] text-muted font-mono">
                            Qty: <span className="text-rex-600 dark:text-rex-400 font-bold">{it.qty} {it.unit}</span> (Avail: {it.currentStock})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-muted hover:text-rose-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 rounded-xl bg-surface2 hover:bg-surface border border-theme text-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 rounded-xl bg-rex-600 hover:bg-rex-500 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit MR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
