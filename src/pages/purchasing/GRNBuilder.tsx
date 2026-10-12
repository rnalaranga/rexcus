import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Truck, PackageCheck, FileSignature, MapPin, 
  ShieldCheck, Printer, FileText, Calendar, Building2, UserCheck, 
  Package, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { usePurchaseOrders } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { createGRN, updatePO, fetchGRNById, fetchGRNs } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const GRNBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const targetId = paramId || queryId;
  const poParam = searchParams.get('po');

  const isViewMode = Boolean(targetId);

  const { data: pos, loading: loadingPOs } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { settings } = useSettings();

  const [loading, setLoading] = useState<boolean>(isViewMode);
  const [docNo, setDocNo] = useState<string>(targetId || ('GRN-' + Date.now().toString().slice(-4)));
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState<string>('Warehouse Manager');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('Main Warehouse - Receiving Bay');
  const [selectedPoId, setSelectedPoId] = useState<string>(poParam || '');
  const [supplierId, setSupplierId] = useState<string>('');
  const [status, setStatus] = useState<string>('received');
  
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('All items inspected and received in good condition.');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Helper to get supplier name
  const supplierName = useMemo(() => {
    if (!supplierId) {
      if (selectedPoId && pos?.length > 0) {
        const p = pos.find((x: any) => x.id === selectedPoId);
        if (p?.supplierId) {
          const s = suppliers?.find((x: any) => x.id === p.supplierId);
          return s ? (s.company || s.name) : p.supplierId;
        }
      }
      return 'N/A';
    }
    const s = suppliers?.find((x: any) => x.id === supplierId);
    return s ? (s.company || s.name) : supplierId;
  }, [supplierId, selectedPoId, pos, suppliers]);

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
          setSelectedPoId(grn.poId || '');
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

          // Clean notes string if it was prefixed with delivery meta
          const cleanNotes = rawNotes.replace(/Vehicle:[^|]+\|\s*Location:[^|]+\|\s*/, '').trim();
          setNotes(cleanNotes || rawNotes || 'All items inspected and received in good condition.');

          // Parse items safely
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

          // Format items array consistently
          const formatted = parsedItems.map((item: any, idx: number) => ({
            id: item.inventoryId || item.id || `ITEM-${idx + 1}`,
            inventoryId: item.inventoryId || item.id || '',
            desc: item.desc || item.name || item.description || `Item #${idx + 1}`,
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

  // Load from PO if in Create Mode with po param or PO selected
  useEffect(() => {
    if (isViewMode) return;

    if (selectedPoId && pos && pos.length > 0) {
      const po = pos.find((p: any) => p.id === selectedPoId);
      if (po) {
        setSupplierId(po.supplierId || '');
        const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
        setItems(poItems.map((i: any, idx: number) => ({
          ...i,
          id: i.inventoryId || i.id || `ITEM-${idx + 1}`,
          inventoryId: i.inventoryId || i.id || '',
          desc: i.desc || i.name || i.description || `Item #${idx + 1}`,
          qty: Number(i.qty || 0),
          qtyReceived: Number(i.qty || 0),
          condition: 'Good',
          unit: i.unit || 'Nos'
        })));
      }
    }
  }, [selectedPoId, pos, isViewMode]);

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) {
      setItems([]);
      setSupplierId('');
      return;
    }
    const po = pos.find((p: any) => p.id === poId);
    if (po) {
      setSupplierId(po.supplierId || '');
      const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : (po.items || []);
      setItems(poItems.map((i: any, idx: number) => ({
        ...i,
        id: i.inventoryId || i.id || `ITEM-${idx + 1}`,
        inventoryId: i.inventoryId || i.id || '',
        desc: i.desc || i.name || i.description || `Item #${idx + 1}`,
        qty: Number(i.qty || 0),
        qtyReceived: Number(i.qty || 0),
        condition: 'Good',
        unit: i.unit || 'Nos'
      })));
    }
  };

  const handleSave = async () => {
    if (!selectedPoId) {
      alert('Please select a Purchase Order first.');
      return;
    }
    const po = pos.find((p: any) => p.id === selectedPoId);
    if (!po) {
      alert('Selected Purchase Order was not found.');
      return;
    }

    if (items.length === 0) {
      alert('No items found to receive. Please add or verify items.');
      return;
    }

    const payload = {
      id: docNo,
      poId: selectedPoId,
      supplierId: po.supplierId || supplierId,
      date,
      receivedBy,
      vehicleNo,
      storageLocation,
      items,
      status: 'received',
      notes: `Vehicle: ${vehicleNo} | Location: ${storageLocation} | ${notes}`
    };

    await createGRN(payload);
    
    const fullyReceived = items.every(i => Number(i.qtyReceived) >= Number(i.qty));
    await updatePO(selectedPoId, { status: fullyReceived ? 'received' : 'partially_received' });

    navigate('/purchasing');
  };

  const totalOrdered = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.qtyReceived || 0), 0);
  const progress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : (items.length > 0 ? 100 : 0);

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
                {isViewMode ? `Goods Receipt Note (${docNo})` : 'Create Goods Receipt Note'}
              </h1>
              {isViewMode && (
                <Badge value={status === 'received' ? 'Received' : status} size="sm" />
              )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              PO: <span className="font-mono text-primary font-bold">{selectedPoId || 'N/A'}</span> • Supplier: <span className="text-secondary font-semibold">{supplierName}</span> • Doc: <span className="font-mono">{docNo}</span>
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
                {/* PO Selector in Create Mode when PO is not yet specified */}
                {!isViewMode && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Purchase Order</label>
                    <select 
                      value={selectedPoId} 
                      onChange={e => handleSelectPo(e.target.value)}
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium"
                    >
                      <option value="">-- Select Purchase Order --</option>
                      {pos?.map((po: any) => (
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
                      <Package size={12} className="text-muted" /> Reference PO
                    </label>
                    <div className="flex items-center justify-between p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono font-bold text-primary">
                      <span>{selectedPoId || 'N/A'}</span>
                      {selectedPoId && (
                        <button 
                          onClick={() => navigate(`/purchasing/po-builder/${selectedPoId}`)}
                          className="text-[10px] uppercase font-sans text-rex-500 hover:underline"
                        >
                          View PO
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Supplier Detail */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Building2 size={12} className="text-muted" /> Supplier
                  </label>
                  <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-semibold text-secondary truncate">
                    {supplierName}
                  </div>
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
                    <Truck size={12} className="text-muted" /> Vehicle No / Carrier
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-mono font-bold text-primary">
                      {vehicleNo || 'N/A'}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="e.g. WP LA-1234" 
                      value={vehicleNo} 
                      onChange={e => setVehicleNo(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono" 
                    />
                  )}
                </div>

                {/* Storage Location */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <MapPin size={12} className="text-muted" /> Storage Location
                  </label>
                  {isViewMode ? (
                    <div className="p-2.5 bg-surface border border-theme-subtle rounded-lg text-xs font-semibold text-secondary">
                      {storageLocation}
                    </div>
                  ) : (
                    <div className="relative">
                      <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <select 
                        value={storageLocation} 
                        onChange={e => setStorageLocation(e.target.value)} 
                        className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded-lg text-xs"
                      >
                        <option>Main Warehouse - Receiving Bay</option>
                        <option>Zone B - Raw Materials</option>
                        <option>Zone C - Chemicals</option>
                        <option>Zone D - Packaging Supplies</option>
                        <option>Quarantine Area (Hold)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Inspected By */}
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <UserCheck size={12} className="text-muted" /> Inspected / Received By
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
              </div>
            </GlassCard>

            {/* Progress Card */}
            <GlassCard className="p-5 text-center flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-500" 
                 style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
               />
               <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted">Receiving Fulfillment</h3>
               <div className="text-4xl font-black text-emerald-500">{Math.round(progress)}%</div>
               <p className="text-[10px] text-muted font-medium">
                 {totalReceived} of {totalOrdered} units received
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
                {!isViewMode && items.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setItems(items.map(it => ({ ...it, qtyReceived: it.qty })))}
                    className="text-[10px] uppercase h-6 text-emerald-500"
                  >
                    Receive All Ordered
                  </Button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-5 py-3 w-1/2">Material Description</th>
                      <th className="px-3 py-3 text-center">Ordered Qty</th>
                      <th className="px-3 py-3 text-center text-primary">Receiving Qty</th>
                      <th className="px-3 py-3 text-center">Variance</th>
                      <th className="px-5 py-3 text-right">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {items.map((item, idx) => {
                      const variance = (Number(item.qtyReceived) || 0) - (Number(item.qty) || 0);
                      return (
                        <tr key={idx} className="hover:bg-surface/30 transition-colors">
                          <td className="p-3 pl-5">
                            <p className="font-bold text-xs text-primary">{item.desc || item.name || 'Material Item'}</p>
                            <p className="text-[10px] text-muted font-mono mt-0.5">
                              ID: {item.inventoryId || item.id || `ITEM-${idx + 1}`} {item.unit ? `• Unit: ${item.unit}` : ''}
                            </p>
                          </td>
                          
                          <td className="p-3 text-center font-medium text-xs text-muted font-mono">
                            {item.qty} {item.unit || ''}
                          </td>

                          <td className="p-3 text-center">
                            {isViewMode ? (
                              <span className="font-bold text-xs text-primary font-mono">
                                {item.qtyReceived} {item.unit || ''}
                              </span>
                            ) : (
                              <div className="inline-block relative">
                                <input 
                                  type="number" 
                                  value={item.qtyReceived} 
                                  onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].qtyReceived = Number(e.target.value);
                                    setItems(newItems);
                                  }} 
                                  className="w-24 bg-surface border-2 border-primary/50 px-2 py-1.5 rounded text-xs text-center font-bold text-primary focus:border-primary outline-none font-mono" 
                                />
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center font-mono">
                            {variance === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                <CheckCircle2 size={11} /> Matched
                              </span>
                            ) : variance > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500">
                                +{variance}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                {variance}
                              </span>
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
                                className={`bg-surface border border-theme-subtle px-2 py-1.5 rounded text-[11px] font-bold ${
                                  item.condition !== 'Good' 
                                    ? 'text-amber-500 border-amber-500/50 bg-amber-500/10' 
                                    : 'text-emerald-500'
                                }`}
                              >
                                <option value="Good">Good / Undamaged</option>
                                <option value="Damaged">Damaged Box</option>
                                <option value="Rejected">Defective / Rejected</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted text-xs">
                          {isViewMode 
                            ? 'No incoming items recorded for this GRN.' 
                            : selectedPoId 
                            ? 'No items found in the selected Purchase Order.' 
                            : 'Please select a Purchase Order to populate receiving freight items.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {!isViewMode && (
                <div className="p-4 bg-primary/5 border-t border-primary/20 flex items-start gap-3">
                  <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-primary/80 font-medium leading-relaxed">
                    By clicking "Confirm & Add to Stock", the receiving quantities above will be permanently committed to the master inventory and stock ledger. Please ensure physical counts match the receiving quantities accurately.
                  </p>
                </div>
              )}
            </GlassCard>

            {/* Inspection Notes Card */}
            <GlassCard className="p-5">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                <FileSignature size={16}/> Inspection Notes & Remarks
              </h2>
              {isViewMode ? (
                <div className="p-3.5 bg-surface/50 border border-theme-subtle rounded-lg text-xs leading-relaxed text-secondary whitespace-pre-wrap">
                  {notes || 'No inspection notes specified.'}
                </div>
              ) : (
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3} 
                  className="w-full bg-surface border border-theme-subtle px-4 py-3 rounded-lg text-xs focus:border-primary outline-none" 
                  placeholder="Enter quality inspection remarks, driver details, or discrepancies..."
                />
              )}
            </GlassCard>

            {/* Bottom Confirm Button in Create Mode */}
            {!isViewMode && items.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button 
                  variant="primary" 
                  size="md" 
                  icon={Save} 
                  onClick={handleSave}
                >
                  Confirm & Add to Stock
                </Button>
              </div>
            )}

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
                <p className="text-neutral-700">Ref PO Number: <span className="font-mono font-bold">{selectedPoId || 'N/A'}</span></p>
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
                    <th className="p-2.5 border-r border-black">Item & Description</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Ordered</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Received</th>
                    <th className="p-2.5 border-r border-black text-center w-24">Variance</th>
                    <th className="p-2.5 text-center w-28">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {items.map((it, idx) => {
                    const variance = (Number(it.qtyReceived) || 0) - (Number(it.qty) || 0);
                    return (
                      <tr key={idx}>
                        <td className="p-2.5 border-r border-black text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 border-r border-black">
                          <p className="font-bold text-black">{it.desc || it.name}</p>
                          <p className="text-[10px] font-mono text-neutral-600">ID: {it.inventoryId || it.id || '-'}</p>
                        </td>
                        <td className="p-2.5 border-r border-black text-center font-mono">{it.qty} {it.unit || ''}</td>
                        <td className="p-2.5 border-r border-black text-center font-mono font-bold">{it.qtyReceived} {it.unit || ''}</td>
                        <td className="p-2.5 border-r border-black text-center font-mono">
                          {variance === 0 ? '0' : (variance > 0 ? `+${variance}` : String(variance))}
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

    </div>
  );
};
