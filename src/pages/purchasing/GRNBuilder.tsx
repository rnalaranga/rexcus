import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Truck, PackageCheck, FileSignature, MapPin, 
  ShieldCheck, Printer, FileText, Calendar, Building2, UserCheck, 
  Package, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Trash2, X, Plus
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { usePurchaseOrders, useGRNs } from '@/hooks/usePurchasing';
import { useSuppliers, useInventory } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { QuickSupplierModal } from '@/components/purchasing/QuickSupplierModal';
import { QuickItemModal } from '@/components/purchasing/QuickItemModal';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete';
import { createGRN, updatePO, fetchGRNById, fetchGRNs, deleteGRN, fetchNextDocumentNumber } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

export const GRNBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const targetId = paramId || queryId;
  const poParam = searchParams.get('po');

  const isViewMode = Boolean(targetId);

  const { data: pos, loading: loadingPOs } = usePurchaseOrders();
  const { data: allGRNs } = useGRNs();
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliers();
  const { data: inventory = [], refetch: refetchInventory } = useInventory();
  const { settings } = useSettings();

  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);

  const handleSupplierCreated = (newSupplier: any) => {
    refetchSuppliers();
    setSupplierId(newSupplier.id);
  };

  const handleItemCreated = (newItem: any) => {
    refetchInventory();
    const newItemRow = {
      id: newItem.id || ('DIRECT-ITEM-' + Date.now()),
      inventoryId: newItem.id,
      name: newItem.name,
      desc: newItem.name,
      qtyReceived: 1,
      unit: newItem.unit || 'Nos',
      unitCost: Number(newItem.costPrice) || 0,
      condition: 'Good'
    };
    setItems(prev => [...prev, newItemRow]);
  };

  const [loading, setLoading] = useState<boolean>(isViewMode);
  const [docNo, setDocNo] = useState<string>(targetId || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!targetId) {
      fetchNextDocumentNumber('purchase_grn', { reserve: false }).then(res => {
        if (res?.formattedNumber) setDocNo(res.formattedNumber);
        else setDocNo('GRN-' + Date.now().toString().slice(-4));
      }).catch(err => {
        console.error('Failed to fetch next GRN document number:', err);
        setDocNo('GRN-' + Date.now().toString().slice(-4));
      });
    }
  }, [targetId]);
  const [receivedBy, setReceivedBy] = useState<string>('Warehouse Manager');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('Main Warehouse - Receiving Bay');
  
  // ISO 8.5.2 Material Traceability
  const [heatNo, setHeatNo] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [mtrCertNo, setMtrCertNo] = useState<string>('');
  
  // Receipt mode: 'po' for PO Fulfillment, 'direct' for Direct Receipt (No PO)
  const [receiptMode, setReceiptMode] = useState<'po' | 'direct'>(poParam ? 'po' : 'po');

  // Multi-PO selection
  const [selectedPoIds, setSelectedPoIds] = useState<string[]>(poParam ? [poParam] : []);
  const [supplierId, setSupplierId] = useState<string>('');
  const [status, setStatus] = useState<string>('received');
  
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('All items inspected and received in good condition.');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Direct Item Add Modal State
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [customItemDesc, setCustomItemDesc] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);
  const [addUnit, setAddUnit] = useState<string>('Nos');
  const [addUnitCost, setAddUnitCost] = useState<number>(0);
  const [addCondition, setAddCondition] = useState<string>('Good');

  // Helper to get supplier name
  const supplierName = useMemo(() => {
    if (supplierId) {
      const s = suppliers?.find((x: any) => x.id === supplierId);
      if (s) return s.company || s.name;
    }
    if (selectedPoIds.length > 0 && pos?.length > 0) {
      const p = pos.find((x: any) => selectedPoIds.includes(x.id));
      if (p?.supplierId) {
        const s = suppliers?.find((x: any) => x.id === p.supplierId);
        return s ? (s.company || s.name) : p.supplierId;
      }
    }
    return 'N/A';
  }, [supplierId, selectedPoIds, pos, suppliers]);

  // Load GRN details if viewing existing GRN
  useEffect(() => {
    if (!targetId) return;

    let isMounted = true;
    setLoading(true);

    const loadGRN = async () => {
      try {
        let grn: any = null;
        try {
          grn = await fetchGRNById(targetId);
        } catch (e) {
          console.warn('fetchGRNById failed, falling back to fetchGRNs', e);
        }

        if (!grn || grn.error) {
          const list = await fetchGRNs();
          grn = list.find((g: any) => g.id === targetId);
        }

        if (grn && isMounted) {
          setDocNo(grn.id);

          let parsedPoIds: string[] = [];
          if (Array.isArray(grn.poIds)) parsedPoIds = grn.poIds;
          else if (typeof grn.poIds === 'string') {
            try { parsedPoIds = JSON.parse(grn.poIds); } catch { parsedPoIds = [grn.poIds]; }
          }
          if (grn.poId && !parsedPoIds.includes(grn.poId)) {
            parsedPoIds.push(grn.poId);
          }
          setSelectedPoIds(parsedPoIds);
          setReceiptMode(parsedPoIds.length === 0 ? 'direct' : 'po');

          setSupplierId(grn.supplierId || '');
          setDate(grn.date ? grn.date.split('T')[0] : (grn.createdAt ? grn.createdAt.split('T')[0] : ''));
          setReceivedBy(grn.receivedBy || 'Warehouse Manager');
          setStatus(grn.status || 'received');

          // Extract vehicle and location
          let vNo = grn.vehicleNo || '';
          let sLoc = grn.storageLocation || '';
          let rawNotes = grn.notes || '';

          if (!vNo && rawNotes) {
            const vMatch = rawNotes.match(/Vehicle:\s*([^|]+)/);
            if (vMatch) vNo = vMatch[1].trim();
          }
          if (!sLoc && rawNotes) {
            const lMatch = rawNotes.match(/Location:\s*([^|]+)/);
            if (lMatch) sLoc = lMatch[1].trim();
          }

          setVehicleNo(vNo);
          setStorageLocation(sLoc || 'Main Warehouse - Receiving Bay');
          setHeatNo(grn.heatNo || '');
          setBatchNo(grn.batchNo || '');
          setMtrCertNo(grn.mtrCertNo || '');

          const cleanNotes = rawNotes.replace(/Vehicle:[^|]+\|\s*Location:[^|]+\|\s*/, '').trim();
          setNotes(cleanNotes || rawNotes || 'All items inspected and received in good condition.');

          let parsedItems: any[] = [];
          if (Array.isArray(grn.items)) {
            parsedItems = grn.items;
          } else if (typeof grn.items === 'string') {
            try {
              parsedItems = JSON.parse(grn.items);
            } catch (err) {
              console.error('Failed to parse grn.items JSON:', err);
              parsedItems = [];
            }
          }

          const formatted = parsedItems.map((item: any, idx: number) => ({
            id: item.inventoryId || item.id || `ITEM-${idx + 1}`,
            inventoryId: item.inventoryId || item.id || '',
            desc: item.desc || item.name || item.description || `Item #${idx + 1}`,
            poId: item.poId || parsedPoIds[0] || '',
            qty: Number(item.qty !== undefined ? item.qty : (item.orderedQty || 0)),
            qtyReceived: Number(item.qtyReceived !== undefined ? item.qtyReceived : (item.receivedQty !== undefined ? item.receivedQty : item.qty || 0)),
            condition: item.condition || 'Good',
            unit: item.unit || 'Nos',
            unitCost: item.unitCost || 0
          }));

          setItems(formatted);
        }
      } catch (err) {
        console.error('Error loading GRN:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGRN();

    return () => {
      isMounted = false;
    };
  }, [targetId]);

  // Compute prior received quantities across all GRNs for all selected POs
  const previousReceivedMap = useMemo(() => {
    if (!allGRNs || selectedPoIds.length === 0 || isViewMode) return {};
    const map: Record<string, number> = {};

    for (const g of allGRNs) {
      // Skip current GRN if editing
      if (targetId && g.id === targetId) continue;

      let gPoIds: string[] = [];
      if (Array.isArray(g.poIds)) gPoIds = g.poIds;
      else if (typeof g.poIds === 'string') {
        try { gPoIds = JSON.parse(g.poIds); } catch { gPoIds = [g.poIds]; }
      }
      if (g.poId && !gPoIds.includes(g.poId)) gPoIds.push(g.poId);

      const hasRelevantPo = selectedPoIds.some(pid => gPoIds.includes(pid));
      if (!hasRelevantPo) continue;

      const gItems = typeof g.items === 'string' ? JSON.parse(g.items) : (g.items || []);
      if (Array.isArray(gItems)) {
        for (const gi of gItems) {
          const itemPoId = gi.poId || gPoIds[0] || '';
          const key = `${itemPoId}_${String(gi.inventoryId || gi.id || gi.desc || '')}`;
          const q = Number(gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty || 0));
          map[key] = (map[key] || 0) + q;
        }
      }
    }
    return map;
  }, [allGRNs, selectedPoIds, isViewMode, targetId]);

  // Re-populate items whenever selectedPoIds changes in Create Mode
  const syncItemsFromSelectedPOs = (poIdList: string[]) => {
    if (poIdList.length === 0) {
      setItems([]);
      return;
    }

    const consolidatedItems: any[] = [];
    let detectedSupplierId = supplierId;

    for (const pid of poIdList) {
      const po = pos?.find((p: any) => p.id === pid);
      if (!po) continue;

      if (!detectedSupplierId && po.supplierId) {
        detectedSupplierId = po.supplierId;
      }

      const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
      for (let idx = 0; idx < poItems.length; idx++) {
        const i = poItems[idx];
        const key = `${pid}_${String(i.inventoryId || i.id || i.desc || `ITEM-${idx + 1}`)}`;
        const ordered = Number(i.qty || 0);
        const prev = previousReceivedMap[key] || 0;
        const rem = Math.max(0, ordered - prev);

        consolidatedItems.push({
          ...i,
          id: (i.id || '') + '_' + pid + '_' + idx,
          inventoryId: i.inventoryId || i.id || '',
          desc: i.desc || i.name || i.description || `Item #${idx + 1}`,
          poId: pid,
          qty: ordered,
          prevReceived: prev,
          remainingQty: rem,
          qtyReceived: rem,
          condition: 'Good',
          unit: i.unit || 'Nos',
          unitCost: i.unitPrice || 0
        });
      }
    }

    if (detectedSupplierId && detectedSupplierId !== supplierId) {
      setSupplierId(detectedSupplierId);
    }
    setItems(consolidatedItems);
  };

  // Initial load in Create Mode
  useEffect(() => {
    if (isViewMode) return;
    if (receiptMode === 'po' && selectedPoIds.length > 0 && pos?.length > 0) {
      syncItemsFromSelectedPOs(selectedPoIds);
    }
  }, [selectedPoIds.join(','), pos, previousReceivedMap, isViewMode, receiptMode]);

  const handleModeChange = (mode: 'po' | 'direct') => {
    if (mode === receiptMode) return;
    setReceiptMode(mode);
    if (mode === 'direct') {
      setSelectedPoIds([]);
      setItems([]);
    } else {
      setItems([]);
    }
  };

  const handleOpenAddItemModal = () => {
    setSelectedInvId('');
    setCustomItemDesc('');
    setAddQty(1);
    setAddUnit('Nos');
    setAddUnitCost(0);
    setAddCondition('Good');
    setIsAddItemModalOpen(true);
  };

  const handleSelectInventoryItem = (invId: string) => {
    setSelectedInvId(invId);
    if (!invId) return;
    const inv = inventory.find((i: any) => String(i.id) === String(invId));
    if (inv) {
      setCustomItemDesc(inv.name || inv.desc || inv.item_name || '');
      setAddUnit(inv.unit || 'Nos');
      setAddUnitCost(Number(inv.costPrice || inv.unitCost || inv.price || 0));
    }
  };

  const handleAddDirectItem = () => {
    const desc = customItemDesc.trim();
    if (!desc) {
      alert('Please enter or select a material description.');
      return;
    }
    if (addQty <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }

    const newItem = {
      id: selectedInvId || `DIRECT-${Date.now().toString().slice(-4)}-${items.length + 1}`,
      inventoryId: selectedInvId || '',
      desc: desc,
      poId: '',
      qty: Number(addQty),
      qtyReceived: Number(addQty),
      unit: addUnit || 'Nos',
      unitCost: Number(addUnitCost || 0),
      condition: addCondition || 'Good'
    };

    setItems(prev => [...prev, newItem]);
    setIsAddItemModalOpen(false);
  };

  const handleRemoveDirectItem = (idxToRemove: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleAddPo = (newPoId: string) => {
    if (!newPoId || selectedPoIds.includes(newPoId)) return;
    const updated = [...selectedPoIds, newPoId];
    setSelectedPoIds(updated);
  };

  const handleRemovePo = (poToRemove: string) => {
    const updated = selectedPoIds.filter(p => p !== poToRemove);
    setSelectedPoIds(updated);
  };

  const handleDeleteGRN = async () => {
    if (!window.confirm(`Are you sure you want to delete GRN ${docNo}?\n\nThis will revert all received stock quantities in inventory and recalculate the Purchase Order fulfillment status.`)) {
      return;
    }
    try {
      await deleteGRN(docNo);
      alert(`GRN ${docNo} has been deleted successfully and inventory stock reverted.`);
      navigate('/purchasing');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete GRN');
    }
  };

  const handleSave = async () => {
    if (receiptMode === 'po' && selectedPoIds.length === 0) {
      alert('Please select at least one Purchase Order first.');
      return;
    }

    if (receiptMode === 'direct' && !supplierId) {
      alert('Please select a Supplier / Vendor for this Direct GRN.');
      return;
    }

    if (items.length === 0) {
      alert(receiptMode === 'direct' 
        ? 'Please add at least one material item using "+ Add Material".' 
        : 'No items found to receive. Please add or verify items.');
      return;
    }

    const totalRecv = items.reduce((sum, it) => sum + (Number(it.qtyReceived) || 0), 0);
    if (totalRecv <= 0) {
      alert('Please enter a received quantity greater than 0 for at least one item.');
      return;
    }

    const hasDamaged = items.some(it => it.condition === 'Damaged' || it.condition === 'Rejected');
    const assignedLocation = (hasDamaged && (storageLocation === 'Main Warehouse - Receiving Bay' || !storageLocation))
      ? 'QA Quarantine Staging (Hold - Non-conforming)'
      : storageLocation;

    const payload = {
      id: docNo,
      poId: selectedPoIds[0] || null,
      poIds: JSON.stringify(selectedPoIds),
      supplierId: supplierId || null,
      date: date || new Date().toISOString().slice(0, 10),
      receivedBy,
      vehicleNo,
      storageLocation: assignedLocation,
      heatNo: heatNo.trim() || null,
      batchNo: batchNo.trim() || null,
      mtrCertNo: mtrCertNo.trim() || null,
      quarantineNotes: hasDamaged ? 'Material quarantined due to damaged/rejected items on receipt (ISO 8.5.4 hold)' : null,
      items,
      status: 'received',
      notes: `Vehicle: ${vehicleNo} | Location: ${assignedLocation} | Heat: ${heatNo || 'N/A'} | Batch: ${batchNo || 'N/A'} | MTR: ${mtrCertNo || 'N/A'} | ${notes}`
    };

    try {
      await createGRN(payload);
      fetchNextDocumentNumber('purchase_grn', { reserve: true }).catch(console.error);
      navigate('/purchasing');
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to save GRN');
    }
  };

  const totalOrdered = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.qtyReceived || 0), 0);
  const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : (items.length > 0 ? 100 : 0);

  // Available POs for selection (optionally filtered by supplier)
  const availablePOs = useMemo(() => {
    if (!pos) return [];
    return pos.filter((p: any) => {
      if (selectedPoIds.includes(p.id)) return false;
      if (supplierId && p.supplierId && p.supplierId !== supplierId) return false;
      return p.status !== 'received';
    });
  }, [pos, selectedPoIds, supplierId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-primary" />
          <p className="text-xs text-muted font-medium">Loading Goods Receipt Note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/purchasing')} 
            className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary"
            title="Back to Purchasing Hub"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight">
                {isViewMode 
                  ? `Goods Receipt Note (${docNo})` 
                  : (receiptMode === 'direct' ? 'Create Direct Goods Receipt (No PO)' : 'Create Goods Receipt Note')}
              </h1>
              {isViewMode && (
                <>
                  <Badge value={status === 'received' ? 'Received' : status} size="sm" />
                  {selectedPoIds.length === 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Direct Receipt
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              PO(s): <span className="font-mono text-primary font-bold">{selectedPoIds.join(', ') || (receiptMode === 'direct' ? 'Direct (No PO)' : 'None')}</span> • Supplier: <span className="text-secondary font-semibold">{supplierName}</span> • Doc: <span className="font-mono">{docNo}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isViewMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                icon={Printer} 
                onClick={() => setIsPrintModalOpen(true)}
              >
                Print GRN
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                icon={Trash2} 
                onClick={handleDeleteGRN}
                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
              >
                Delete GRN
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                icon={FileText} 
                onClick={() => navigate(`/purchasing/bill-builder?grn=${docNo}`)}
              >
                Create Bill
              </Button>
            </>
          ) : (
            <Button 
              variant="primary" 
              size="sm" 
              icon={Save} 
              onClick={handleSave}
            >
              Confirm & Add to Stock
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          
          {/* Left Column: Meta & Receiving Progress */}
          <div className="xl:col-span-1 space-y-5">
            <GlassCard className="p-5 border-t-2 border-t-primary">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                <Truck size={16}/> Delivery Meta
              </h2>

              <div className="space-y-4">
                {/* Mode Selector in Create Mode */}
                {!isViewMode && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1.5">
                      Receipt Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-surface2 p-1 rounded-lg border border-theme-subtle">
                      <button
                        type="button"
                        onClick={() => handleModeChange('po')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                          receiptMode === 'po' 
                            ? 'bg-primary text-black shadow-sm' 
                            : 'text-muted hover:text-primary'
                        }`}
                      >
                        <FileText size={12} /> PO Fulfillment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange('direct')}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                          receiptMode === 'direct' 
                            ? 'bg-purple-600 text-white shadow-sm' 
                            : 'text-muted hover:text-primary'
                        }`}
                      >
                        <Package size={12} /> Direct Receipt
                      </button>
                    </div>
                  </div>
                )}

                {/* Linked PO Badges & Selector in Create Mode */}
                {!isViewMode && receiptMode === 'po' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-muted uppercase">
                      Linked Purchase Order(s) ({selectedPoIds.length})
                    </label>

                    {/* Chips for linked POs */}
                    {selectedPoIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedPoIds.map(pid => (
                          <span 
                            key={pid} 
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-md text-xs font-mono font-bold"
                          >
                            <FileText size={11} /> {pid}
                            <button 
                              type="button" 
                              onClick={() => handleRemovePo(pid)}
                              className="hover:text-red-500 transition-colors ml-0.5"
                              title={`Remove ${pid}`}
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Select / Add PO */}
                    <select 
                      value="" 
                      onChange={e => { if (e.target.value) handleAddPo(e.target.value); }}
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium"
                    >
                      <option value="">
                        {selectedPoIds.length === 0 ? '-- Select Purchase Order --' : '+ Add Another PO for this Supplier...'}
                      </option>
                      {availablePOs.map((po: any) => (
                        <option key={po.id} value={po.id}>
                          {po.id} ({po.status}) - {suppliers?.find((s: any) => s.id === po.supplierId)?.name || po.supplierId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reference PO Display in View Mode */}
                {isViewMode && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                      <Package size={12} className="text-muted" /> Reference PO(s)
                    </label>
                    {selectedPoIds.length > 0 ? (
                      <div className="space-y-1">
                        {selectedPoIds.map(pid => (
                          <div key={pid} className="flex items-center justify-between p-2 bg-surface border border-theme-subtle rounded-lg text-xs font-mono font-bold text-primary">
                            <span>{pid}</span>
                            <button 
                              onClick={() => navigate(`/purchasing/po-builder/${pid}`)}
                              className="text-[10px] uppercase font-sans text-rex-500 hover:underline"
                            >
                              View PO
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-400">
                        Direct Receipt (No PO Linked)
                      </div>
                    )}
                  </div>
                )}

                {/* Supplier Detail */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-muted uppercase flex items-center gap-1.5">
                      <Building2 size={12} className="text-muted" /> Supplier
                    </label>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => setShowQuickSupplierModal(true)}
                        className="text-[10px] font-bold text-rex-600 hover:text-rex-500 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus size={11} /> New Vendor
                      </button>
                    )}
                  </div>
                  {isViewMode || (receiptMode === 'po' && selectedPoIds.length > 0) ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-semibold text-secondary truncate">
                      {supplierName}
                    </div>
                  ) : (
                    <SupplierAutocomplete
                      value={supplierId}
                      onChange={sId => setSupplierId(sId)}
                      suppliers={suppliers}
                      placeholder="Type to search vendor / supplier..."
                      className="text-xs py-1.5"
                    />
                  )}
                </div>

                {/* Receipt Date */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Calendar size={12} className="text-muted" /> Receipt Date
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono">
                      {date || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="date" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono" 
                    />
                  )}
                </div>

                {/* Carrier / Vehicle No */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Truck size={12} className="text-muted" /> Vehicle / Carrier No.
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono">
                      {vehicleNo || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={vehicleNo} 
                      onChange={e => setVehicleNo(e.target.value)} 
                      placeholder="e.g. WP-CA-8921 or Courier Name" 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                    />
                  )}
                </div>

                {/* Storage Bay */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <MapPin size={12} className="text-muted" /> Receiving Bay / Location
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-medium">
                      {storageLocation}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={storageLocation} 
                      onChange={e => setStorageLocation(e.target.value)} 
                      placeholder="e.g. Bay 2 / Raw Material Racks" 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                    />
                  )}
                </div>

                {/* Receiver Name */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <UserCheck size={12} className="text-muted" /> Inspected & Received By
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-medium">
                      {receivedBy || 'Warehouse Manager'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={receivedBy} 
                      onChange={e => setReceivedBy(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                    />
                  )}
                </div>

                {/* ISO 8.5.2 Material Heat Traceability */}
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-rex-500" /> Heat / Melt No. (ISO 8.5.2)
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono">
                      {heatNo || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={heatNo} 
                      onChange={e => setHeatNo(e.target.value)} 
                      placeholder="e.g. HT-48291 / SS316" 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono focus:border-rex-500" 
                    />
                  )}
                </div>

                {/* Batch / Lot No */}
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1 flex items-center gap-1.5">
                    <Package size={12} className="text-secondary" /> Batch / Lot No.
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono">
                      {batchNo || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={batchNo} 
                      onChange={e => setBatchNo(e.target.value)} 
                      placeholder="e.g. LOT-2026-B1" 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono focus:border-rex-500" 
                    />
                  )}
                </div>

                {/* Mill Test Report Certificate (MTR) */}
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1 flex items-center gap-1.5">
                    <FileText size={12} className="text-secondary" /> Mill Test Cert No. (MTR)
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono">
                      {mtrCertNo || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={mtrCertNo} 
                      onChange={e => setMtrCertNo(e.target.value)} 
                      placeholder="e.g. MTR-CERT-88421" 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono focus:border-rex-500" 
                    />
                  )}
                </div>
              </div>

              {/* Quarantine Alert if damaged items exist */}
              {items.some(it => it.condition === 'Damaged' || it.condition === 'Rejected') && (
                <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                  <div>
                    <strong>ISO 8.5.4 Quality Quarantine Hold:</strong> Damaged/rejected items detected. Material has been routed to <strong>QA Quarantine Staging</strong> to prevent unapproved release into active machining.
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Progress Card */}
            <GlassCard className="p-5 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-500" 
                 style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
               />
               <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted">
                 {receiptMode === 'direct' ? 'Materials Received' : 'Receiving Fulfillment'}
               </h3>
               <div className="text-4xl font-black text-emerald-500">
                 {receiptMode === 'direct' ? totalReceived : `${Math.round(progress)}%`}
               </div>
               <p className="text-[10px] text-muted font-medium">
                 {receiptMode === 'direct' 
                   ? `${items.length} material line(s)` 
                   : `${totalReceived} of ${totalOrdered} units received`}
               </p>
            </GlassCard>
          </div>

          {/* Right Column: Freight Breakdown & Inspection Notes */}
          <div className="xl:col-span-3 space-y-5">
            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex items-center justify-between">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <PackageCheck size={16} /> Incoming Freight Breakdown ({items.length} items)
                </h2>
                <div className="flex items-center gap-2">
                  {!isViewMode && receiptMode === 'direct' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={Plus} 
                        onClick={() => setShowQuickItemModal(true)}
                        className="text-xs h-7 border-theme-subtle hover:border-primary text-secondary"
                      >
                        New Material
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        icon={Plus} 
                        onClick={handleOpenAddItemModal}
                        className="text-xs h-7"
                      >
                        Add from Inventory
                      </Button>
                    </>
                  )}
                  {!isViewMode && receiptMode === 'po' && items.length > 0 && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setItems(items.map(it => ({ ...it, qtyReceived: it.remainingQty !== undefined ? it.remainingQty : it.qty })))}
                        className="text-[10px] uppercase h-6 text-blue-500 hover:text-blue-400 font-bold"
                      >
                        Receive Remaining Balance
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setItems(items.map(it => ({ ...it, qtyReceived: it.qty })))}
                        className="text-[10px] uppercase h-6 text-emerald-500 font-medium"
                      >
                        Receive Full PO(s)
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    {receiptMode === 'direct' ? (
                      <tr className="text-[10px] uppercase tracking-widest text-muted">
                        <th className="px-5 py-3 w-1/3">Material Description</th>
                        <th className="px-3 py-3 text-right">Unit Cost (LKR)</th>
                        <th className="px-3 py-3 text-center text-primary">Qty Received</th>
                        <th className="px-3 py-3 text-right">Total Value</th>
                        <th className="px-5 py-3 text-center">Condition</th>
                        {!isViewMode && <th className="px-3 py-3 text-right w-16">Action</th>}
                      </tr>
                    ) : (
                      <tr className="text-[10px] uppercase tracking-widest text-muted">
                        {selectedPoIds.length > 1 && <th className="px-3 py-3 text-center">PO #</th>}
                        <th className="px-5 py-3 w-1/3">Material Description</th>
                        <th className="px-3 py-3 text-center">Ordered Qty</th>
                        {!isViewMode && <th className="px-3 py-3 text-center">Prev. Received</th>}
                        {!isViewMode && <th className="px-3 py-3 text-center text-amber-500">Remaining Balance</th>}
                        <th className="px-3 py-3 text-center text-primary">
                          {isViewMode ? 'Received in this GRN' : 'Receiving This GRN'}
                        </th>
                        <th className="px-5 py-3 text-right">Condition</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {receiptMode === 'direct' ? (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface/30 transition-colors">
                          <td className="p-3 pl-5">
                            <p className="font-bold text-xs text-primary">{item.desc || item.name || 'Material Item'}</p>
                            <p className="text-[10px] text-muted font-mono mt-0.5">
                              ID: {item.inventoryId || item.id || `ITEM-${idx + 1}`} {item.unit ? `• Unit: ${item.unit}` : ''}
                            </p>
                          </td>

                          <td className="p-3 text-right">
                            {isViewMode ? (
                              <span className="font-mono text-xs font-semibold text-secondary">
                                {formatCurrency(Number(item.unitCost || 0), true)}
                              </span>
                            ) : (
                              <input 
                                type="number" 
                                min="0" 
                                step="any"
                                value={item.unitCost || 0} 
                                onChange={e => {
                                  const newItems = [...items];
                                  newItems[idx].unitCost = Number(e.target.value);
                                  setItems(newItems);
                                }} 
                                className="w-24 bg-surface border border-theme-subtle px-2 py-1 rounded text-xs text-right font-mono font-bold text-primary focus:border-primary outline-none" 
                              />
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {isViewMode ? (
                              <span className="font-bold text-xs text-primary font-mono">
                                {item.qtyReceived} {item.unit || ''}
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <input 
                                  type="number" 
                                  min="0.01" 
                                  step="any"
                                  value={item.qtyReceived} 
                                  onChange={e => {
                                    const newItems = [...items];
                                    const val = Number(e.target.value);
                                    newItems[idx].qtyReceived = val;
                                    newItems[idx].qty = val;
                                    setItems(newItems);
                                  }} 
                                  className="w-20 bg-surface border-2 border-primary/50 px-2 py-1 rounded text-xs text-center font-bold text-primary focus:border-primary outline-none font-mono" 
                                />
                                <span className="text-[11px] text-muted font-medium">{item.unit || ''}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono text-xs font-bold text-rex-600 dark:text-rex-300">
                            {formatCurrency(Number(item.qtyReceived || 0) * Number(item.unitCost || 0), true)}
                          </td>

                          <td className="p-3 text-center">
                            {isViewMode ? (
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                                item.condition === 'Good' || !item.condition
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : item.condition === 'Damaged' 
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
                              }`}>
                                {item.condition || 'Good'}
                              </span>
                            ) : (
                              <select 
                                value={item.condition} 
                                onChange={e => {
                                  const newItems = [...items];
                                  newItems[idx].condition = e.target.value;
                                  setItems(newItems);
                                  if (e.target.value === 'Damaged') {
                                    setStorageLocation('QA Quarantine Staging (Hold - Damaged/Rejected)');
                                  }
                                }} 
                                className="bg-surface border border-theme-subtle px-2 py-1 rounded text-xs font-medium focus:border-primary"
                              >
                                <option value="Good">Good / Inspected</option>
                                <option value="Damaged">Damaged / Rejected</option>
                                <option value="Partial Pass">Partial Pass</option>
                              </select>
                            )}
                          </td>

                          {!isViewMode && (
                            <td className="p-3 text-right">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveDirectItem(idx)}
                                className="p-1 hover:bg-red-500/10 text-muted hover:text-red-500 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      items.map((item, idx) => {
                        const ordered = Number(item.qty || 0);
                        const prevRecv = Number(item.prevReceived || 0);
                        const remaining = item.remainingQty !== undefined ? Number(item.remainingQty) : Math.max(0, ordered - prevRecv);
                        return (
                          <tr key={idx} className="hover:bg-surface/30 transition-colors">
                            {selectedPoIds.length > 1 && (
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                  {item.poId || '-'}
                                </span>
                              </td>
                            )}

                            <td className="p-3 pl-5">
                              <p className="font-bold text-xs text-primary">{item.desc || item.name || 'Material Item'}</p>
                              <p className="text-[10px] text-muted font-mono mt-0.5">
                                ID: {item.inventoryId || item.id || `ITEM-${idx + 1}`} {item.unit ? `• Unit: ${item.unit}` : ''}
                              </p>
                            </td>
                            
                            <td className="p-3 text-center font-medium text-xs text-muted font-mono">
                              {ordered} {item.unit || ''}
                            </td>

                            {!isViewMode && (
                              <td className="p-3 text-center font-medium text-xs font-mono">
                                <span className={prevRecv > 0 ? "text-blue-500 font-bold" : "text-muted"}>
                                  {prevRecv} {item.unit || ''}
                                </span>
                              </td>
                            )}

                            {!isViewMode && (
                              <td className="p-3 text-center font-medium text-xs font-mono">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  remaining === 0 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {remaining} {item.unit || ''}
                                </span>
                              </td>
                            )}

                            <td className="p-3 text-center">
                              {isViewMode ? (
                                <span className="font-bold text-xs text-primary font-mono">
                                  {item.qtyReceived} {item.unit || ''}
                                </span>
                              ) : (
                                <div className="inline-block relative">
                                  <input 
                                    type="number" 
                                    min="0"
                                    step="any"
                                    value={item.qtyReceived} 
                                    onChange={e => {
                                      const newItems = [...items];
                                      newItems[idx].qtyReceived = Number(e.target.value);
                                      setItems(newItems);
                                    }} 
                                    className="w-24 bg-surface border-2 border-primary/50 px-2 py-1.5 rounded text-xs text-center font-bold text-primary focus:border-primary outline-none font-mono" 
                                  />
                                  {Number(item.qtyReceived) > remaining && remaining > 0 && (
                                    <span className="block text-[9px] text-amber-500 font-bold mt-0.5" title="Quantity exceeds open PO balance">
                                      Exceeds balance!
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="p-3 pr-5 text-right">
                              {isViewMode ? (
                                <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                                  item.condition === 'Good' || !item.condition
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                    : item.condition === 'Damaged' 
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                  {item.condition || 'Good'}
                                </span>
                              ) : (
                                <select 
                                  value={item.condition} 
                                  onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].condition = e.target.value;
                                    setItems(newItems);
                                  }} 
                                  className="bg-surface border border-theme-subtle px-2 py-1 rounded text-xs font-medium focus:border-primary"
                                >
                                  <option value="Good">Good / Inspected</option>
                                  <option value="Damaged">Damaged / Rejected</option>
                                  <option value="Partial Pass">Partial Pass</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={receiptMode === 'direct' ? (isViewMode ? 5 : 6) : (selectedPoIds.length > 1 ? 7 : 6)} className="p-8 text-center text-muted text-xs">
                          {receiptMode === 'direct' 
                            ? 'No materials added yet. Click "+ Add Material" above to record incoming items directly without a Purchase Order.'
                            : 'No items loaded. Select one or more Purchase Orders on the left to receive inventory.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Remarks Card */}
            <GlassCard className="p-5">
              <label className="block text-[11px] font-bold text-muted uppercase mb-2">
                Quality Inspection Remarks & Notes
              </label>
              {isViewMode ? (
                <p className="text-xs text-secondary leading-relaxed p-3 bg-surface border border-theme-subtle rounded-lg">
                  {notes || 'No notes added.'}
                </p>
              ) : (
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3} 
                  placeholder="Record any deviations, damage remarks, physical count notes, or test cert numbers..." 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs leading-relaxed" 
                />
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Printable GRN Modal */}
      <Modal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        title={`Print Goods Receipt Note - ${docNo}`} 
        size="xl"
      >
        <div>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #grn-purchasing-print-section, #grn-purchasing-print-section * { visibility: visible; }
              #grn-purchasing-print-section { position: absolute; left: 0; top: 0; width: 210mm; }
            }
          `}</style>
          
          <div 
            id="grn-purchasing-print-section" 
            className="bg-white text-black p-8 border border-neutral-300 font-sans mx-auto" 
            style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', color: '#000' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                  {settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}
                </h1>
                <p className="text-xs text-neutral-600 mt-1">
                  {settings?.company_address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, Sri Lanka'}
                </p>
                <p className="text-xs text-neutral-600">
                  Tel: {settings?.company_phone || '+94 31 2233117'} • Email: {settings?.company_email || 'info@rexgroup.lk'}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-neutral-900 text-white font-black text-sm px-3 py-1.5 uppercase tracking-widest inline-block">
                  GOODS RECEIPT NOTE
                </div>
                <p className="text-sm font-mono font-bold mt-2">DOC: {docNo}</p>
                <p className="text-xs text-neutral-600">Date: {formatDate(date)}</p>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 text-xs">
              <div className="space-y-1 border-r border-black/40 pr-4">
                <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Supplier Details:</p>
                <p className="font-bold text-sm text-black">{supplierName}</p>
                <p className="text-neutral-700">Supplier ID: {supplierId || 'N/A'}</p>
                <p className="text-neutral-700">Ref PO Number(s): <span className="font-mono font-bold">{selectedPoIds.length > 0 ? selectedPoIds.join(', ') : 'N/A (Direct Receipt)'}</span></p>
              </div>
              <div className="space-y-1 pl-2">
                <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px]">Delivery Logistics:</p>
                <p className="text-neutral-700">Vehicle / Carrier: <span className="font-mono font-bold">{vehicleNo || 'N/A'}</span></p>
                <p className="text-neutral-700">Receiving Bay: <span className="font-medium">{storageLocation}</span></p>
                <p className="text-neutral-700">Inspected By: <span className="font-medium">{receivedBy}</span></p>
                <p className="text-neutral-700">Status: <span className="font-bold uppercase text-emerald-700">Received</span></p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-black mb-6 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-black text-[10px] uppercase font-bold">
                    <th className="p-2.5 border-r border-black w-10 text-center">#</th>
                    {selectedPoIds.length > 1 && <th className="p-2.5 border-r border-black text-center w-24">PO #</th>}
                    <th className="p-2.5 border-r border-black">Item & Description</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Ordered</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Received</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Variance</th>
                    <th className="p-2.5 text-center w-28">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {items.map((it, idx) => {
                    const variance = selectedPoIds.length > 0 
                      ? (Number(it.qtyReceived) || 0) - (Number(it.qty) || 0) 
                      : 0;
                    return (
                      <tr key={idx}>
                        <td className="p-2.5 border-r border-black text-center font-mono">{idx + 1}</td>
                        {selectedPoIds.length > 1 && (
                          <td className="p-2.5 border-r border-black text-center font-mono text-xs font-bold">
                            {it.poId || '-'}
                          </td>
                        )}
                        <td className="p-2.5 border-r border-black">
                          <p className="font-bold text-black">{it.desc || it.name}</p>
                          <p className="text-[10px] font-mono text-neutral-600">ID: {it.inventoryId || it.id || '-'}</p>
                        </td>
                        <td className="p-2.5 border-r border-black text-center font-mono">
                          {selectedPoIds.length > 0 ? `${it.qty} ${it.unit || ''}` : '-'}
                        </td>
                        <td className="p-2.5 border-r border-black text-center font-mono font-bold">{it.qtyReceived} {it.unit || ''}</td>
                        <td className="p-2.5 border-r border-black text-center font-mono">
                          {selectedPoIds.length > 0 
                            ? (variance === 0 ? '0' : (variance > 0 ? `+${variance}` : String(variance))) 
                            : 'Direct'}
                        </td>
                        <td className="p-2.5 text-center font-semibold text-[11px]">
                          {it.condition || 'Good'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inspection Notes */}
            <div className="border border-black p-3 mb-10 text-xs">
              <p className="font-bold uppercase tracking-wider text-neutral-500 text-[10px] mb-1">Quality Inspection Remarks:</p>
              <p className="text-neutral-800 leading-relaxed">{notes || 'All items inspected and received in good condition.'}</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-12 mt-16 text-xs">
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold text-black">{receivedBy || 'Warehouse Officer'}</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-0.5">Inspected & Received By</p>
              </div>
              <div className="border-t border-black pt-2 text-center">
                <p className="font-bold text-black">Stores Manager / Head of Logistics</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-0.5">Authorized Store Signature</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setIsPrintModalOpen(false)}>Close</Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print / Save PDF</Button>
          </div>
        </div>
      </Modal>

      {/* Add Direct Material Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Add Material to Direct GRN"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">
              Select From Inventory (Optional)
            </label>
            <ProductAutocomplete
              value={selectedInvId}
              onChange={(val, inv) => {
                if (val) handleSelectInventoryItem(val);
                else {
                  setSelectedInvId('');
                }
              }}
              products={inventory}
              placeholder="Search existing inventory stock or enter custom below..."
              className="text-xs py-1.5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">
              Material Description *
            </label>
            <input
              type="text"
              value={customItemDesc}
              onChange={e => setCustomItemDesc(e.target.value)}
              placeholder="e.g. Mild Steel Sheet 2mm 4x8, Castor Wheels, etc."
              className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-semibold focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">
                Qty Received *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={addQty}
                onChange={e => setAddQty(Number(e.target.value))}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-bold focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={addUnit}
                onChange={e => setAddUnit(e.target.value)}
                placeholder="Nos, Kg, Meters, Pcs..."
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">
                Unit Cost (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={addUnitCost}
                onChange={e => setAddUnitCost(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">
                Inspection Condition
              </label>
              <select
                value={addCondition}
                onChange={e => setAddCondition(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-primary"
              >
                <option value="Good">Good / Inspected</option>
                <option value="Damaged">Damaged / Rejected</option>
                <option value="Partial Pass">Partial Pass</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsAddItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleAddDirectItem}>
              Add Material
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Modals for Vendors and Items */}
      <QuickSupplierModal
        isOpen={showQuickSupplierModal}
        onClose={() => setShowQuickSupplierModal(false)}
        onSuccess={handleSupplierCreated}
      />
      <QuickItemModal
        isOpen={showQuickItemModal}
        onClose={() => setShowQuickItemModal(false)}
        onSuccess={handleItemCreated}
      />
    </div>
  );
};
