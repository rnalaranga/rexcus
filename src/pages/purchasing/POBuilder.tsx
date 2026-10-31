import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Printer, Building2, 
  Calendar, Truck, FileText, Calculator, CreditCard, ShieldCheck, 
  GitPullRequest, CheckCircle2, Clock, ExternalLink, X, Tag, Briefcase
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSuppliers, useInventory } from '@/hooks/useData';
import { useTaxProfiles } from '@/hooks/useFinance';
import { useDialog } from '@/components/ui/DialogProvider';
import { useMaterialRequests, usePurchaseOrders, useBills } from '@/hooks/usePurchasing';
import { createPO, updatePO, fetchPOs, fetchNextDocumentNumber } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { QuickSupplierModal } from '@/components/purchasing/QuickSupplierModal';
import { QuickItemModal } from '@/components/purchasing/QuickItemModal';
import { POPrintView } from '@/components/purchasing/POPrintView';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { exportToPdf } from '@/lib/exportToPdf';
import { printElement } from '@/lib/printElement';

interface POItem {
  id: string;
  inventoryId: string;
  desc: string;
  qty: number;
  unitPrice: number;
  refCost?: number;
  taxRate: number;
  discount: number;
  total: number;
  unit?: string;
  uom?: string;
  mrId?: string;
  mrItemId?: string;
  requestedQty?: number;
  balanceToOrder?: number;
  workOrderNos?: string[];
}

export const POBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mrParam = searchParams.get('mr');

  const navigate = useNavigate();
  const { toast } = useDialog();
  const { data: suppliers, refetch: refetchSuppliers } = useSuppliers();
  const { data: inventory, refetch: refetchInventory } = useInventory();
  const { data: mrs } = useMaterialRequests();
  const { data: pos } = usePurchaseOrders();
  const { data: taxProfiles } = useTaxProfiles();
  const { data: allBills } = useBills();
  const { settings } = useSettings();
  const { user } = useAuth();

  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);

  const handleSupplierCreated = (newSupplier: any) => {
    refetchSuppliers();
    setSupplierId(newSupplier.id);
    setSupplierDetails({
      contact: newSupplier.contactName || newSupplier.contactPerson || '',
      email: newSupplier.email || '',
      phone: newSupplier.phone || '',
      address: newSupplier.address || '',
      vat: newSupplier.vat || '',
      svat: newSupplier.svat || '',
      brNumber: newSupplier.brNumber || ''
    });
    if (newSupplier.paymentTerms) {
      setPaymentTerms(newSupplier.paymentTerms);
    }
    toast(`Vendor ${newSupplier.name} registered and selected!`, 'success');
  };

  const handleItemCreated = (newItem: any) => {
    refetchInventory();
    const newItemRow: POItem = {
      id: Date.now().toString(),
      inventoryId: newItem.id,
      desc: newItem.name,
      qty: 1,
      unitPrice: Number(newItem.costPrice) || Number(newItem.unitPrice) || 0,
      taxRate: 0,
      discount: 0,
      total: Number(newItem.costPrice) || Number(newItem.unitPrice) || 0,
      unit: newItem.unit || 'Nos',
      uom: newItem.unit || 'Nos'
    };
    setItems(prev => [...prev, newItemRow]);
    toast(`Material ${newItem.name} created and added to line items!`, 'success');
  };

  const [docNo, setDocNo] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch next PO serial number from document sequence variables when creating new PO
  useEffect(() => {
    if (!id) {
      fetchNextDocumentNumber('purchase_order', { reserve: false }).then(res => {
        if (res?.formattedNumber) {
          setDocNo(res.formattedNumber);
        } else {
          setDocNo('PO-' + Date.now().toString().slice(-4));
        }
      }).catch(err => {
        console.error('Failed to fetch next PO document number:', err);
        setDocNo('PO-' + Date.now().toString().slice(-4));
      });
    }
  }, [id]);
  
  const [supplierId, setSupplierId] = useState('');
  const [supplierDetails, setSupplierDetails] = useState({ contact: '', email: '', phone: '', address: '', vat: '', svat: '', brNumber: '' });
  
  // Multi-MR Support
  const [selectedMrIds, setSelectedMrIds] = useState<string[]>(mrParam ? [mrParam] : []);
  const [mrFulfillmentSummaries, setMrFulfillmentSummaries] = useState<{
    mrId: string;
    department?: string;
    items: { id: string; desc: string; requested: number; alreadyOrdered: number; balance: number }[];
  }[]>([]);

  const [expectedDate, setExpectedDate] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Standard Delivery');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxProfileId, setTaxProfileId] = useState('');

  const [items, setItems] = useState<POItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. Please send two copies of your invoice.\n2. Enter this order in accordance with the prices, terms, delivery method, and specifications listed above.\n3. Please notify us immediately if you are unable to ship as specified.');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplierId) {
      const sup = suppliers.find((s: any) => s.id === supplierId);
      if (sup) {
        setSupplierDetails({
          contact: sup.contactName || sup.contactPerson || '',
          email: sup.email || '',
          phone: sup.phone || '',
          address: sup.address || '',
          vat: sup.vat || '',
          svat: sup.svat || '',
          brNumber: sup.brNumber || ''
        });
        if (sup.paymentTerms) {
          setPaymentTerms(sup.paymentTerms);
        }
      }
    }
  }, [supplierId, suppliers]);

  // Load existing PO if editing
  useEffect(() => {
    if (id) {
      fetchPOs().then(data => {
        const existing = data.find((p: any) => p.id === id);
        if (existing) {
          setDocNo(existing.id);
          setDate(existing.date ? existing.date.split('T')[0] : '');
          setStatus((existing.status || 'draft').toUpperCase());
          setExpectedDate(existing.expectedDate ? existing.expectedDate.split('T')[0] : '');
          setSupplierId(existing.supplierId || '');
          
          let parsedMrIds: string[] = [];
          if (Array.isArray(existing.mrIds)) parsedMrIds = existing.mrIds;
          else if (typeof existing.mrIds === 'string') {
            try { parsedMrIds = JSON.parse(existing.mrIds); } catch { parsedMrIds = [existing.mrIds]; }
          }
          if (existing.mrId && !parsedMrIds.includes(existing.mrId)) {
            parsedMrIds.push(existing.mrId);
          }
          setSelectedMrIds(parsedMrIds);

          if (existing.taxProfileId) {
            setTaxProfileId(existing.taxProfileId);
            setTaxEnabled(true);
          }
          const existingItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : existing.items || [];
          setItems(existingItems.map((i: any) => {
            const inv = inventory?.find((x: any) => x.id === i.inventoryId);
            return {
              taxRate: 0,
              discount: 0,
              refCost: Number(i.refCost !== undefined ? i.refCost : (inv?.unitCost || 0)),
              ...i
            };
          }));
          setNotes(existing.notes || '');
          if (existing.shippingCost) setShippingCost(Number(existing.shippingCost));
          if (existing.paymentTerms) setPaymentTerms(existing.paymentTerms);
          if (existing.shippingMethod) setShippingMethod(existing.shippingMethod);
          if (existing.terms) setTerms(existing.terms);
        }
      });
    }
  }, [id]);

  // Handle MR loading from query param
  useEffect(() => {
    if (!id && mrParam && mrs.length > 0 && inventory.length > 0 && pos.length >= 0) {
      if (!selectedMrIds.includes(mrParam)) {
        addMR(mrParam);
      }
    }
  }, [id, mrParam, mrs, inventory, pos]);

  // Recalculate fulfillment summaries for all linked MRs
  useEffect(() => {
    if (selectedMrIds.length === 0 || mrs.length === 0) {
      setMrFulfillmentSummaries([]);
      return;
    }

    const summaries = selectedMrIds.map(targetMrId => {
      const mr = mrs.find((m: any) => m.id === targetMrId);
      if (!mr) return null;

      const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : (mr.items || []);

      // Calculate previously ordered quantities across all other POs
      const otherPOs = pos.filter((p: any) => {
        if (id && p.id === id) return false;
        const pMrIds = Array.isArray(p.mrIds) ? p.mrIds : (typeof p.mrIds === 'string' ? JSON.parse(p.mrIds || '[]') : [p.mrId].filter(Boolean));
        return p.mrId === targetMrId || pMrIds.includes(targetMrId);
      });

      const orderedMap: Record<string, number> = {};
      for (const p of otherPOs) {
        const pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
        for (const it of pItems) {
          if (!it.mrId || it.mrId === targetMrId) {
            const key = it.inventoryId || it.desc || it.id;
            if (key) {
              orderedMap[key] = (orderedMap[key] || 0) + (Number(it.qty) || 0);
            }
          }
        }
      }

      const itemBreakdowns = mrItems.map((i: any) => {
        const key = i.inventoryId || i.desc || i.id;
        const requested = Number(i.qty) || 0;
        const alreadyOrdered = orderedMap[key] || 0;
        const balance = Math.max(0, requested - alreadyOrdered);
        return {
          id: i.id,
          desc: i.desc || i.name || i.inventoryId || 'Item',
          requested,
          alreadyOrdered,
          balance
        };
      });

      return {
        mrId: mr.id,
        department: mr.department,
        items: itemBreakdowns
      };
    }).filter(Boolean) as any[];

    setMrFulfillmentSummaries(summaries);
  }, [selectedMrIds, mrs, pos, id]);

  const addMR = (targetMrId: string) => {
    if (!targetMrId) return;
    if (selectedMrIds.includes(targetMrId)) return;

    const mr = mrs.find((m: any) => m.id === targetMrId);
    if (!mr) return;

    const updatedMrIds = [...selectedMrIds, targetMrId];
    setSelectedMrIds(updatedMrIds);

    if (mr.requiredDate && !expectedDate) {
      setExpectedDate(mr.requiredDate.split('T')[0]);
    }

    const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : (mr.items || []);

    // Tally previously ordered quantities across all existing other POs
    const otherPOs = pos.filter((p: any) => {
      if (id && p.id === id) return false;
      const pMrIds = Array.isArray(p.mrIds) ? p.mrIds : (typeof p.mrIds === 'string' ? JSON.parse(p.mrIds || '[]') : [p.mrId].filter(Boolean));
      return p.mrId === targetMrId || pMrIds.includes(targetMrId);
    });

    const orderedMap: Record<string, number> = {};
    for (const p of otherPOs) {
      const pItems = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
      for (const it of pItems) {
        if (!it.mrId || it.mrId === targetMrId) {
          const key = it.inventoryId || it.desc || it.id;
          if (key) {
            orderedMap[key] = (orderedMap[key] || 0) + (Number(it.qty) || 0);
          }
        }
      }
    }

    const newRows: POItem[] = [];
    for (const i of mrItems) {
      const inv = inventory.find((x: any) => x.id === i.inventoryId);
      const stdCost = Number(inv?.unitCost) || 0;
      const unitPrice = Number(i.unitCost !== undefined ? i.unitCost : stdCost) || 0;
      const requestedQty = Number(i.qty) || 0;
      const key = i.inventoryId || i.desc || i.id;
      const alreadyOrdered = orderedMap[key] || 0;
      const balanceQty = Math.max(0, requestedQty - alreadyOrdered);

      // Add item if there is remaining balance to order
      const itemQty = balanceQty > 0 ? balanceQty : requestedQty;
      newRows.push({
        id: (i.id || '') + '_' + Date.now().toString() + Math.random().toString().slice(2, 5),
        inventoryId: i.inventoryId || '',
        desc: i.desc || inv?.name || '',
        qty: itemQty,
        unitPrice,
        refCost: stdCost,
        taxRate: 0,
        discount: 0,
        total: itemQty * unitPrice,
        mrId: mr.id,
        mrItemId: i.id,
        workOrderNos: Array.isArray(i.workOrderNos) ? i.workOrderNos : (mr.workOrderNos ? (Array.isArray(mr.workOrderNos) ? mr.workOrderNos : (() => { try { return JSON.parse(mr.workOrderNos); } catch { return []; } })()) : []),
        requestedQty,
        balanceToOrder: balanceQty
      });
    }

    if (newRows.length > 0) {
      setItems(prev => [...prev, ...newRows]);
    }

    const mrNote = `Generated from Material Request: ${mr.id} (${mr.department} Dept - Requested by: ${mr.requestedBy})`;
    if (!notes.includes(mr.id)) {
      setNotes(prev => prev ? `${prev}\n${mrNote}` : mrNote);
    }
  };

  const removeMR = (targetMrId: string) => {
    setSelectedMrIds(selectedMrIds.filter(m => m !== targetMrId));
    // Remove items associated with this MR
    setItems(items.filter(i => i.mrId !== targetMrId));
  };

  const addItem = () => setItems([...items, { id: Date.now().toString(), inventoryId: '', desc: '', qty: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0, unit: 'Nos', uom: 'Nos' }]);

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'inventoryId') {
          const invItem = inventory.find(i => i.id === value);
          if (invItem) {
            updated.desc = invItem.name;
            const cost = Number(invItem.unitCost) || 0;
            updated.refCost = cost;
            if (!updated.unitPrice || updated.unitPrice === 0) {
              updated.unitPrice = cost;
            }
            updated.unit = invItem.uom || 'Nos';
            updated.uom = invItem.uom || 'Nos';
          }
        }
        const base = (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
        const afterDiscount = Math.max(0, base - (Number(updated.discount) || 0));
        const taxAmount = afterDiscount * ((Number(updated.taxRate) || 0) / 100);
        updated.total = afterDiscount + taxAmount;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => setItems(items.filter(i => i.id !== itemId));

  const subtotal = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const netTaxableAmount = Math.max(0, subtotal - totalDiscount);

  const selectedTaxProfile = taxProfiles.find((t: any) => t.id === taxProfileId);

  let totalTax = 0;
  let taxBreakdown: any = null;

  if (taxEnabled && selectedTaxProfile) {
    const t1Rate = Number(selectedTaxProfile.tax1_rate) || 0;
    const t2Rate = Number(selectedTaxProfile.tax2_rate) || 0;
    const isCompound = Boolean(selectedTaxProfile.tax2_compound);

    const tax1Amount = netTaxableAmount * (t1Rate / 100);
    const tax2Base = isCompound ? (netTaxableAmount + tax1Amount) : netTaxableAmount;
    const tax2Amount = tax2Base * (t2Rate / 100);

    totalTax = tax1Amount + tax2Amount;
    taxBreakdown = {
      profileName: selectedTaxProfile.name,
      tax1Name: selectedTaxProfile.tax1_name,
      tax1Rate: t1Rate,
      tax1Amount,
      tax2Name: selectedTaxProfile.tax2_name,
      tax2Rate: t2Rate,
      tax2Amount,
      isCompound
    };
  } else {
    totalTax = items.reduce((sum, item) => sum + ((((Number(item.qty) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))) * ((Number(item.taxRate) || 0) / 100)), 0);
  }

  const grandTotal = netTaxableAmount + totalTax + shippingCost;

  // Filter all bills linked to this PO (Multiple Invoices per PO)
  const poBills = useMemo(() => {
    const targetId = id || docNo;
    if (!targetId) return [];
    return allBills.filter((b: any) => b.poId === targetId);
  }, [id, docNo, allBills]);

  const totalInvoiced = useMemo(() => {
    return poBills.reduce((acc: number, b: any) => acc + Number(b.amount || 0), 0);
  }, [poBills]);

  const unbilledBalance = useMemo(() => {
    return Math.max(0, Number((grandTotal - totalInvoiced).toFixed(2)));
  }, [grandTotal, totalInvoiced]);

  const handleSave = async () => {
    if (!supplierId) {
      alert('Please select a supplier before saving the Purchase Order.');
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        id: docNo, 
        mrId: selectedMrIds[0] || null,
        mrIds: JSON.stringify(selectedMrIds),
        taxProfileId: (taxEnabled && selectedTaxProfile) ? taxProfileId : null,
        taxBreakdown: (taxEnabled && selectedTaxProfile) ? JSON.stringify(taxBreakdown) : null,
        supplierId, 
        date: date || new Date().toISOString().slice(0, 10), 
        expectedDate: expectedDate || null, 
        items, 
        subtotal: Number(subtotal) || 0, 
        tax: Number(totalTax) || 0, 
        totalAmount: Number(grandTotal) || 0, 
        notes, 
        shippingCost: Number(shippingCost) || 0, 
        shippingMethod, 
        paymentTerms, 
        terms, 
        status: status.toLowerCase() 
      };

      if (id) {
        const res = await updatePO(id, payload);
        if (res && res.error) throw new Error(res.error);
        toast(`Purchase Order ${docNo} updated successfully!`, 'success');
      } else {
        const res = await createPO(payload);
        if (res && res.error) throw new Error(res.error);
        try {
          await fetchNextDocumentNumber('purchase_order', { reserve: true });
        } catch (e) {
          console.warn('Failed to reserve PO sequence number:', e);
        }
        toast(`Purchase Order ${docNo} created successfully!`, 'success');
      }
      navigate('/purchasing');
    } catch (e: any) {
      console.error(e);
      toast(e?.message || 'Failed to save Purchase Order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = () => {
    exportToPdf('po-print-section', `PO_${docNo}.pdf`);
  };

  const handlePrint = () => {
    printElement('po-print-section', `PO_${docNo}`);
  };

  const supplierObj = suppliers.find((s: any) => s.id === supplierId);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight">Purchase Order Builder</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                status === 'SENT' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                status === 'RECEIVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                status === 'PARTIALLY_RECEIVED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                'bg-zinc-500/10 border-zinc-500/30 text-muted'
              }`}>
                {status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-muted font-medium">PO #:</span>
              {id ? (
                <span className="font-mono font-bold text-xs text-primary">{docNo}</span>
              ) : (
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value.toUpperCase())}
                  className="bg-surface2/60 border border-theme-subtle px-1.5 py-0.5 rounded text-xs font-mono font-bold text-primary focus:outline-none focus:border-rex-500 w-36"
                  placeholder="PO-..."
                />
              )}
              {selectedMrIds.length > 0 && (
                <span className="text-[11px] text-muted truncate max-w-xs">
                  • Linked to MR(s): {selectedMrIds.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Printer} onClick={handlePrint}>Print PO</Button>
          <Button variant="ghost" size="sm" icon={FileText} onClick={exportPDF}>Export PDF</Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* MULTI-MR BANNER IF LINKED */}
      {selectedMrIds.length > 0 && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2 flex-wrap">
            <GitPullRequest size={15} className="shrink-0" />
            <span>Originating Requisitions ({selectedMrIds.length}):</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedMrIds.map(mid => (
                <span key={mid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 rounded font-mono font-bold">
                  {mid}
                  <button 
                    onClick={() => removeMR(mid)}
                    className="hover:text-red-400 transition-colors"
                    title={`Unlink ${mid}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedMrIds.map(mid => (
              <button 
                key={mid}
                onClick={() => navigate(`/purchasing/mr-builder/${mid}`)}
                className="text-[11px] font-bold underline hover:text-blue-300 flex items-center gap-1"
              >
                View {mid} <ExternalLink size={10} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          
          {/* LEFT COL (Form) */}
          <div className="xl:col-span-2 space-y-5">

            {/* SOURCE MATERIAL REQUESTS SELECTOR (MULTI-MR SUPPORT) */}
            <GlassCard className="p-4 border-l-4 border-l-blue-500 bg-surface/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest size={16} className="text-blue-500 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-primary">Import Items from Material Requests (Multi-MR)</h3>
                    <p className="text-[11px] text-muted">You can link multiple MRs into this single Purchase Order. Remaining item balances are automatically calculated.</p>
                  </div>
                </div>
                <div className="w-full sm:w-80">
                  <select 
                    value="" 
                    onChange={e => { if (e.target.value) addMR(e.target.value); }}
                    className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs font-medium focus:border-blue-500"
                  >
                    <option value="">+ Add Items from Material Request...</option>
                    {mrs
                      .filter((m: any) => !selectedMrIds.includes(m.id))
                      .map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.id} - {m.department} Dept ({m.status === 'partially_ordered' ? 'Partially Ordered' : m.status})
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Linked MR Badges */}
              {selectedMrIds.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-muted font-bold uppercase">Linked MRs:</span>
                  {selectedMrIds.map(mid => (
                    <span 
                      key={mid} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface2 border border-theme-subtle rounded-lg text-xs font-mono font-bold text-primary"
                    >
                      <GitPullRequest size={11} className="text-blue-500" />
                      {mid}
                      <button 
                        onClick={() => removeMR(mid)}
                        className="text-muted hover:text-red-500 transition-colors ml-1"
                        title={`Remove ${mid} and its items`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* MR Fulfillment Summaries */}
              {mrFulfillmentSummaries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-theme-subtle/70 space-y-3 text-xs">
                  {mrFulfillmentSummaries.map(summary => (
                    <div key={summary.mrId} className="bg-surface/50 p-2.5 rounded-lg border border-theme-subtle">
                      <div className="flex items-center justify-between font-bold text-blue-500 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <GitPullRequest size={12} /> Requisition {summary.mrId} ({summary.department} Dept)
                        </span>
                        <span className="text-[10px] text-muted">
                          {summary.items.length} materials tracked
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {summary.items.map((it, idx) => (
                          <div key={idx} className="bg-surface2/60 border border-theme-subtle/80 px-2.5 py-1.5 rounded flex items-center justify-between">
                            <span className="truncate max-w-[130px] text-primary" title={it.desc}>{it.desc}</span>
                            <div className="text-right text-[10px] font-mono font-medium">
                              <span className="text-muted block">Req: {it.requested} | Ord: {it.alreadyOrdered}</span>
                              <span className={`font-bold ${it.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {it.balance > 0 ? `${it.balance} to order` : 'Fulfilled'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                  <Building2 size={16} /> Vendor Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-muted uppercase">Select Supplier *</label>
                      <button
                        type="button"
                        onClick={() => setShowQuickSupplierModal(true)}
                        className="text-[10px] font-bold text-rex-600 hover:text-rex-500 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus size={11} /> New Vendor
                      </button>
                    </div>
                    <SupplierAutocomplete 
                      value={supplierId} 
                      onChange={sId => setSupplierId(sId)} 
                      suppliers={suppliers}
                      placeholder="Type to search vendor / supplier..."
                      className="text-xs py-1.5"
                    />
                  </div>
                  {supplierId && (
                    <div className="bg-surface/50 p-3 rounded-lg border border-theme-subtle text-xs space-y-2 font-medium">
                      <p><span className="text-muted inline-block w-16">Contact</span> {supplierDetails.contact || 'N/A'}</p>
                      <p><span className="text-muted inline-block w-16">Email</span> {supplierDetails.email || 'N/A'}</p>
                      <p><span className="text-muted inline-block w-16">Phone</span> {supplierDetails.phone || 'N/A'}</p>
                      <p><span className="text-muted inline-block w-16">Address</span> {supplierDetails.address || 'N/A'}</p>
                      {(supplierDetails.vat || supplierDetails.svat || supplierDetails.brNumber) && (
                        <div className="pt-2 border-t border-theme-subtle flex items-center gap-2 flex-wrap">
                          {supplierDetails.vat && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono font-bold border border-blue-500/20">
                              VAT: {supplierDetails.vat}
                            </span>
                          )}
                          {supplierDetails.svat && (
                            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold border border-purple-500/20">
                              SVAT: {supplierDetails.svat}
                            </span>
                          )}
                          {supplierDetails.brNumber && (
                            <span className="text-[10px] bg-surface2 text-muted px-1.5 py-0.5 rounded font-mono">
                              BR: {supplierDetails.brNumber}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 mb-4">
                  <Truck size={16} /> Logistics & Timing
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Order Date</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Expected By</label>
                      <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Workflow Status</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)} 
                        className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm font-semibold uppercase"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="APPROVED">Approved</option>
                        <option value="SENT">Sent to Supplier</option>
                        <option value="PARTIALLY_RECEIVED">Partially Received</option>
                        <option value="RECEIVED">Received (Fulfilled)</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Payment Terms</label>
                      <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                        <option>Net 30</option>
                        <option>Net 15</option>
                        <option>Cash on Delivery</option>
                        <option>Advance 50%</option>
                        <option>Advance 100%</option>
                        <option>LC (Letter of Credit)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Ship Via</label>
                    <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                      <option>Standard Delivery</option>
                      <option>Express Air Freight</option>
                      <option>Sea Cargo</option>
                      <option>Supplier Direct Fleet</option>
                      <option>Customer Pickup</option>
                    </select>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex justify-between items-center">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={16} /> Line Items
                </h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={Plus} 
                    onClick={() => setShowQuickItemModal(true)} 
                    className="text-xs h-7 border-theme-subtle hover:border-primary text-secondary"
                  >
                    New Material
                  </Button>
                  <Button variant="ghost" size="sm" icon={Plus} onClick={addItem} className="text-primary hover:bg-primary/10">Add Row</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-5 py-3">Material / Item</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Order Price (LKR)</th>
                      <th className="px-3 py-3 text-right">Disc</th>
                      <th className="px-3 py-3 text-right">Tax%</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-3 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/30 transition-colors">
                        <td className="p-2 pl-5">
                          <div className="flex flex-col gap-1.5 w-64">
                            <ProductAutocomplete 
                              value={item.inventoryId} 
                              onChange={(val) => updateItem(item.id, 'inventoryId', val)} 
                              products={inventory}
                              placeholder="Search material / SKU..."
                              className="text-xs py-1"
                            />
                            <input type="text" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Description..." className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-theme-subtle px-2 py-1 rounded text-[11px]" />
                            {item.mrId && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit">
                                <GitPullRequest size={9} /> MR: {item.mrId}
                              </span>
                            )}
                            {item.workOrderNos && item.workOrderNos.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 w-fit">
                                <Briefcase size={9} /> Job: {item.workOrderNos.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.qty}
                              onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                              className="w-16 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-primary"
                            />
                            <span className="text-[10px] text-muted font-mono font-semibold w-8 text-left" title={item.unit || 'Unit'}>
                              {item.unit || item.uom || 'Nos'}
                            </span>
                          </div>
                          {item.balanceToOrder !== undefined && (
                            <span className="text-[10px] text-muted block text-right font-mono mt-0.5" title={`Original Req: ${item.requestedQty || item.qty}`}>
                              Bal: {item.balanceToOrder} {item.unit || item.uom || ''}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right align-top">
                          <div className="flex flex-col items-end gap-1">
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              value={item.unitPrice} 
                              onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} 
                              className="w-24 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary font-mono font-bold" 
                            />
                            {item.refCost !== undefined && item.refCost > 0 && (
                              <div className="text-[10px] text-right font-mono flex items-center justify-end gap-1 mt-0.5">
                                <span className="text-muted" title="Inventory standard cost">
                                  Std: {formatCurrency(item.refCost, true)}
                                </span>
                                {item.unitPrice !== item.refCost && (
                                  <span 
                                    className={`font-bold text-[9px] px-1 rounded ${
                                      item.unitPrice > item.refCost 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    }`}
                                    title={item.unitPrice > item.refCost ? 'Order price exceeds standard cost' : 'Order price is below standard cost'}
                                  >
                                    {item.unitPrice > item.refCost ? '▲' : '▼'}
                                    {Math.abs(((item.unitPrice - item.refCost) / item.refCost) * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right align-top">
                          <input type="number" step="0.01" value={item.discount} onChange={e => updateItem(item.id, 'discount', Number(e.target.value))} className="w-16 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary font-mono" />
                        </td>
                        <td className="p-2 text-right align-top">
                          <input type="number" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} className="w-14 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary font-mono" />
                        </td>
                        <td className="p-2 pr-5 text-right align-top pt-4 font-mono font-bold text-xs text-primary">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="p-2 align-top text-center pt-3">
                          <button onClick={() => removeItem(item.id)} className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all">
                            <Trash2 size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted text-xs">No items added yet. Click "Add Row" or choose an MR above.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <label className="block text-[11px] font-bold text-muted uppercase mb-2">Remarks & References</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
              </GlassCard>
              <GlassCard className="p-5">
                <label className="block text-[11px] font-bold text-muted uppercase mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-amber-500"/> Terms & Conditions
                </label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-[10px] leading-relaxed" />
              </GlassCard>
            </div>
          </div>

          {/* RIGHT COL (Summary) */}
          <div className="space-y-5">
            <GlassCard className="p-5 sticky top-0 border-t-2 border-t-emerald-500">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 mb-5">
                <Calculator size={16} /> Order Summary
              </h2>
              
              <div className="space-y-4 text-xs font-medium text-secondary">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="text-foreground font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-red-500">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}

                {/* TAX PROFILES SELECTOR */}
                <div className="py-2.5 border-t border-theme-subtle space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Tax Profile</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        checked={taxEnabled} 
                        onChange={e => {
                          setTaxEnabled(e.target.checked);
                          if (!e.target.checked) setTaxProfileId('');
                          else if (!taxProfileId && taxProfiles.length > 0) setTaxProfileId(taxProfiles[0].id);
                        }} 
                        className="rounded border-theme-subtle text-emerald-500 bg-surface" 
                      />
                      <span className="text-muted font-medium text-[11px]">Apply Tax</span>
                    </label>
                  </div>
                  {taxEnabled && (
                    <select 
                      value={taxProfileId} 
                      onChange={e => setTaxProfileId(e.target.value)} 
                      className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="">-- Select Configured Tax Profile --</option>
                      {taxProfiles.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  {taxEnabled && selectedTaxProfile && taxBreakdown && (
                    <div className="bg-surface/50 p-2.5 rounded-lg border border-theme-subtle space-y-1.5 text-[11px]">
                      {taxBreakdown.tax1Rate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted">{taxBreakdown.tax1Name} ({taxBreakdown.tax1Rate}%):</span>
                          <span className="font-mono">{formatCurrency(taxBreakdown.tax1Amount)}</span>
                        </div>
                      )}
                      {taxBreakdown.tax2Rate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted">{taxBreakdown.tax2Name} ({taxBreakdown.tax2Rate}%):</span>
                          <span className="font-mono">{formatCurrency(taxBreakdown.tax2Amount)}</span>
                        </div>
                      )}
                      {taxBreakdown.isCompound && (
                        <span className="text-[10px] text-muted italic block">* VAT is compounded on SSCL</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span>Shipping Cost</span>
                  <input type="number" step="0.01" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="w-24 bg-surface border border-theme-subtle px-2 py-1 rounded text-right font-mono" />
                </div>
                <div className="pt-4 border-t border-theme-subtle flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Total Amount</span>
                  <span className="text-emerald-500 font-mono text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </GlassCard>

            {/* VENDOR INVOICES & BILLS SECTION (Multi-Invoice Support) */}
            <GlassCard className="p-5 border-t-2 border-t-amber-500 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <CreditCard size={16} /> Vendor Invoices ({poBills.length})
                </h2>
                <Badge 
                  value={totalInvoiced >= grandTotal - 0.01 && grandTotal > 0 ? 'Fully Billed' : totalInvoiced > 0 ? 'Partially Billed' : 'Unbilled'} 
                  size="sm" 
                />
              </div>

              {/* Financial Metrics */}
              <div className="bg-surface/50 p-3 rounded-lg border border-theme-subtle space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Total Ordered:</span>
                  <span className="font-mono font-bold text-primary">{formatCurrency(grandTotal, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Total Invoiced:</span>
                  <span className="font-mono font-bold text-amber-500">{formatCurrency(totalInvoiced, true)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-theme-subtle">
                  <span className="font-semibold text-primary">Unbilled Balance:</span>
                  <span className={`font-mono font-black ${unbilledBalance <= 0.01 && grandTotal > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {formatCurrency(unbilledBalance, true)}
                  </span>
                </div>
              </div>

              {/* Action: Add Invoice / Bill */}
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => navigate(`/purchasing/bill-builder?po=${docNo}`)}
                className="w-full text-xs font-bold py-2 bg-amber-600 hover:bg-amber-500 text-white"
              >
                + Record Vendor Invoice / Bill
              </Button>

              {/* List of existing invoices */}
              {poBills.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-theme-subtle">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Recorded Invoices for this PO
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {poBills.map((b: any) => (
                      <div key={b.id} className="p-2 bg-surface2/60 border border-theme-subtle rounded flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-primary font-mono">{b.invoiceNo || b.id}</p>
                          <p className="text-[10px] text-muted">{b.date?.split('T')[0]} • {b.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-amber-500">{formatCurrency(Number(b.amount || 0), true)}</p>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-400'}`}>
                            {b.status || 'unpaid'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT / PDF TEMPLATE (REX STANDARD FORMAT) */}
      <div style={{ display: 'none' }}>
        <POPrintView
          po={{
            id: docNo,
            supplierId,
            date,
            expectedDate,
            items,
            subtotal,
            tax: totalTax,
            shippingCost,
            totalAmount: grandTotal,
            notes,
            terms,
            shippingMethod,
            paymentTerms,
            status,
            mrIds: selectedMrIds,
            taxBreakdown,
            createdBy: user?.name || 'Purchasing Officer'
          }}
          supplier={supplierObj}
          settings={settings}
        />
      </div>

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
