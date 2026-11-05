import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Printer, Building2, 
  Calendar, Truck, FileText, Calculator, CreditCard, ShieldCheck, 
  GitPullRequest, CheckCircle2, Clock, ExternalLink, X, Tag, Briefcase, Scissors
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
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
  isCutPiece?: boolean;
  cutType?: 'shaft' | 'sheet';
  cutLength?: number;
  cutWidth?: number;
  pieces?: number;
  standardLength?: number;
  cutUnit?: string;
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
  const [taxProfileId, setTaxProfileId] = useState('tp_opt2_sscl_absorbed_vat_sep');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  useEffect(() => {
    if (taxProfiles && taxProfiles.length > 0 && !taxProfileId) {
      const opt2 = taxProfiles.find((p: any) => p.id === 'tp_opt2_sscl_absorbed_vat_sep' || p.id === 'tp_vat_sscl' || p.name?.toLowerCase().includes('option 2'));
      if (opt2) setTaxProfileId(opt2.id);
      else setTaxProfileId(taxProfiles[0].id);
    }
  }, [taxProfiles, taxProfileId]);

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
          if (existing.isTaxInclusive !== undefined && existing.isTaxInclusive !== null) {
            setIsTaxInclusive(Boolean(Number(existing.isTaxInclusive) === 1));
          } else if (existing.taxBreakdown) {
            try {
              const tb = typeof existing.taxBreakdown === 'string' ? JSON.parse(existing.taxBreakdown) : existing.taxBreakdown;
              if (tb && tb.isTaxInclusive) setIsTaxInclusive(true);
            } catch (e) {}
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

  const [activeCutModalItem, setActiveCutModalItem] = useState<POItem | null>(null);
  const [cutForm, setCutForm] = useState({
    cutType: 'shaft' as 'shaft' | 'sheet',
    cutLength: 200,
    cutWidth: 100,
    pieces: 1,
    standardLength: 6000,
    standardWidth: 1220,
    qtyMode: 'pieces' as 'pieces' | 'meters' | 'mm' | 'sqm' | 'sqft'
  });

  const openCutModal = (item: POItem) => {
    setActiveCutModalItem(item);
    const isSheet = Boolean(
      item.cutType === 'sheet' ||
      item.cutWidth ||
      item.desc?.toLowerCase().includes('sheet') ||
      item.desc?.toLowerCase().includes('plate') ||
      item.desc?.toLowerCase().includes('thahadu') ||
      item.unit?.toLowerCase().includes('sq') ||
      item.unit?.toLowerCase().includes('m2')
    );
    setCutForm({
      cutType: isSheet ? 'sheet' : 'shaft',
      cutLength: Number(item.cutLength) || (isSheet ? 1000 : 200),
      cutWidth: Number(item.cutWidth) || 500,
      pieces: Number(item.pieces) || (item.qty > 0 && item.qty <= 1000 ? Math.round(item.qty) : 1),
      standardLength: Number(item.standardLength) || (isSheet ? 2440 : 6000),
      standardWidth: 1220,
      qtyMode: (item.unit?.toLowerCase() === 'm' || item.unit?.toLowerCase() === 'meter' || item.unit?.toLowerCase() === 'meters') 
        ? 'meters' 
        : (item.unit?.toLowerCase().includes('sqm') || item.unit?.toLowerCase().includes('m2')) 
          ? 'sqm' 
          : 'pieces'
    });
  };

  const applyCutSpecs = () => {
    if (!activeCutModalItem) return;
    const cutType = cutForm.cutType;
    const cutLen = Number(cutForm.cutLength) || 200;
    const cutWid = Number(cutForm.cutWidth) || 100;
    const pcs = Number(cutForm.pieces) || 1;
    const stdLen = Number(cutForm.standardLength) || (cutType === 'sheet' ? 2440 : 6000);

    // Clean existing [Cut: ...] or [Cut Sheet: ...] from desc if present
    const cleanDesc = activeCutModalItem.desc.replace(/\s*\[Cut.*?\]/i, '').trim();
    
    let newDesc = '';
    let calculatedQty = activeCutModalItem.qty;

    if (cutType === 'sheet') {
      const areaM2 = Number(((cutLen * cutWid * pcs) / 1000000).toFixed(3));
      newDesc = `${cleanDesc} [Cut Sheet: ${cutLen} mm × ${cutWid} mm × ${pcs} pcs (${areaM2} m²)]`;
      
      if (cutForm.qtyMode === 'sqm') {
        calculatedQty = areaM2;
      } else if (cutForm.qtyMode === 'sqft') {
        calculatedQty = Number((areaM2 * 10.7639).toFixed(2));
      } else {
        calculatedQty = pcs;
      }
    } else {
      newDesc = `${cleanDesc} [Cut Shaft: ${cutLen} mm × ${pcs} pcs]`;
      if (cutForm.qtyMode === 'meters') {
        calculatedQty = Number(((cutLen * pcs) / 1000).toFixed(3));
      } else if (cutForm.qtyMode === 'mm') {
        calculatedQty = cutLen * pcs;
      } else {
        calculatedQty = pcs;
      }
    }

    setItems(items.map(it => {
      if (it.id === activeCutModalItem.id) {
        const updated = {
          ...it,
          desc: newDesc,
          qty: calculatedQty,
          isCutPiece: true,
          cutType,
          cutLength: cutLen,
          cutWidth: cutType === 'sheet' ? cutWid : undefined,
          pieces: pcs,
          standardLength: stdLen,
          cutUnit: 'mm'
        };
        const base = (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
        const afterDiscount = Math.max(0, base - (Number(updated.discount) || 0));
        const taxAmount = afterDiscount * ((Number(updated.taxRate) || 0) / 100);
        updated.total = afterDiscount + taxAmount;
        return updated;
      }
      return it;
    }));

    setActiveCutModalItem(null);
  };

  const removeCutSpecs = (itemId: string) => {
    setItems(items.map(it => {
      if (it.id === itemId) {
        const cleanDesc = it.desc.replace(/\s*\[Cut.*?\]/i, '').trim();
        return {
          ...it,
          desc: cleanDesc,
          isCutPiece: false,
          cutType: undefined,
          cutLength: undefined,
          cutWidth: undefined,
          pieces: undefined,
          standardLength: undefined
        };
      }
      return it;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const netTaxableAmount = Math.max(0, subtotal - totalDiscount);

  const selectedTaxProfile = taxProfiles.find((t: any) => t.id === taxProfileId);

  let totalTax = 0;
  let taxBreakdown: any = null;

  if (taxEnabled && selectedTaxProfile) {
    const t1Rate = Number(selectedTaxProfile.tax1_rate) || 0;
    const t2Rate = Number(selectedTaxProfile.tax2_rate) || 0;
    const t1 = t1Rate / 100;
    const t2 = t2Rate / 100;

    const isSsclHidden = Boolean(t1Rate > 0 && selectedTaxProfile.tax1_show_separately === 0);
    const isVatSeparate = Boolean(t2Rate > 0 ? selectedTaxProfile.tax2_show_separately === 1 : true);
    const isSsclSeparate = Boolean(t1Rate > 0 && selectedTaxProfile.tax1_show_separately === 1);

    if (isTaxInclusive) {
      let baseSubtotal = netTaxableAmount;
      let t1Amount = 0;
      let t2Amount = 0;

      if (isSsclHidden && isVatSeparate) {
        // Option 2: VAT separate, SSCL absorbed into supply value
        baseSubtotal = netTaxableAmount / (1 + t2);
        t2Amount = netTaxableAmount - baseSubtotal;
        t1Amount = 0;
      } else if (isSsclSeparate && isVatSeparate) {
        // Option 3: Both separate
        const divisor = selectedTaxProfile.tax2_compound ? ((1 + t1) * (1 + t2)) : (1 + t1 + t2);
        baseSubtotal = netTaxableAmount / divisor;
        t1Amount = baseSubtotal * t1;
        const baseForT2 = selectedTaxProfile.tax2_compound ? (baseSubtotal + t1Amount) : baseSubtotal;
        t2Amount = baseForT2 * t2;
      } else {
        // Option 1: Both absorbed
        baseSubtotal = netTaxableAmount;
        t1Amount = 0;
        t2Amount = 0;
      }

      t1Amount = Math.round(t1Amount * 100) / 100;
      t2Amount = Math.round((netTaxableAmount - (Math.round(baseSubtotal * 100) / 100) - t1Amount) * 100) / 100;
      totalTax = t1Amount + t2Amount;
      taxBreakdown = {
        profileName: selectedTaxProfile.name,
        tax1Name: selectedTaxProfile.tax1_name || 'SSCL',
        tax1Rate: t1Rate,
        tax1Amount: t1Amount,
        tax2Name: selectedTaxProfile.tax2_name || 'VAT',
        tax2Rate: t2Rate,
        tax2Amount: t2Amount,
        isCompound: Boolean(selectedTaxProfile.tax2_compound),
        isTaxInclusive: true
      };
    } else {
      let t1Amount = 0;
      let t2Amount = 0;

      if (isSsclHidden && isVatSeparate) {
        // Option 2: VAT separate, SSCL absorbed into supply value
        t1Amount = 0;
        t2Amount = netTaxableAmount * t2;
      } else if (selectedTaxProfile.tax1_show_separately === 0 && selectedTaxProfile.tax2_show_separately === 0) {
        // Option 1: Both absorbed
        t1Amount = 0;
        t2Amount = 0;
      } else {
        // Option 3 or VAT only
        t1Amount = isSsclSeparate ? (netTaxableAmount * t1) : 0;
        const baseForT2 = selectedTaxProfile.tax2_compound ? (netTaxableAmount + (netTaxableAmount * t1)) : netTaxableAmount;
        t2Amount = isVatSeparate ? (baseForT2 * t2) : 0;
      }

      t1Amount = Math.round(t1Amount * 100) / 100;
      t2Amount = Math.round(t2Amount * 100) / 100;
      totalTax = t1Amount + t2Amount;
      taxBreakdown = {
        profileName: selectedTaxProfile.name,
        tax1Name: selectedTaxProfile.tax1_name || 'SSCL',
        tax1Rate: t1Rate,
        tax1Amount: t1Amount,
        tax2Name: selectedTaxProfile.tax2_name || 'VAT',
        tax2Rate: t2Rate,
        tax2Amount: t2Amount,
        isCompound: Boolean(selectedTaxProfile.tax2_compound),
        isTaxInclusive: false
      };
    }
  } else {
    totalTax = items.reduce((sum, item) => sum + ((((Number(item.qty) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))) * ((Number(item.taxRate) || 0) / 100)), 0);
  }

  const grandTotal = isTaxInclusive ? (netTaxableAmount + shippingCost) : (netTaxableAmount + totalTax + shippingCost);

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
        isTaxInclusive: (taxEnabled && selectedTaxProfile && isTaxInclusive) ? 1 : 0,
        supplierId, 
        date: date || new Date().toISOString().slice(0, 10), 
        expectedDate: expectedDate || null, 
        items, 
        subtotal: isTaxInclusive ? Math.max(0, Number((netTaxableAmount - totalTax).toFixed(2))) : (Number(subtotal) || 0), 
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
                            {item.isCutPiece || (item.cutLength && Number(item.cutLength) > 0) ? (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Scissors size={10} /> 
                                  {item.cutType === 'sheet' || item.cutWidth ? (
                                    <>Sheet: {item.cutLength} × {item.cutWidth} mm × {item.pieces || 1} pcs</>
                                  ) : (
                                    <>Shaft: {item.cutLength} mm × {item.pieces || 1} pcs</>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openCutModal(item)}
                                  className="text-[10px] text-rex-600 dark:text-rex-400 hover:underline font-semibold"
                                >
                                  Edit Cut
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCutSpecs(item.id)}
                                  className="text-[10px] text-red-500 hover:underline ml-1"
                                  title="Remove Cut Spec"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCutModal(item)}
                                className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-amber-500 transition-colors w-fit font-medium mt-0.5"
                              >
                                <Scissors size={10} /> + Cut Piece / Shaft / Sheet (mm)
                              </button>
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
                  <span>{isTaxInclusive ? 'Gross Item Total (Inc. Tax)' : 'Subtotal'}</span>
                  <span className="text-foreground font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-red-500">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                {taxEnabled && isTaxInclusive && totalTax > 0 && (
                  <div className="flex justify-between items-center text-muted">
                    <span>Base Value (Excl. Tax)</span>
                    <span className="font-mono text-primary font-semibold">{formatCurrency(Math.max(0, netTaxableAmount - totalTax))}</span>
                  </div>
                )}

                {/* TAX PROFILES SELECTOR & VAT OPTIONS */}
                <div className="py-2.5 border-t border-theme-subtle space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Tax Profile / VAT</span>
                    <button
                      type="button"
                      onClick={() => setTaxEnabled(t => !t)}
                      className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 relative flex items-center ${taxEnabled ? 'bg-emerald-500' : 'bg-surface2 border border-theme-subtle'}`}
                      title={taxEnabled ? 'Tax enabled' : 'Tax disabled'}
                    >
                      <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {taxEnabled && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTaxProfileId('tp_opt1_absorbed')}
                          className={`p-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            taxProfileId === 'tp_opt1_absorbed'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          Option 1<br/><span className="text-[9px] font-normal opacity-80">Both Absorbed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxProfileId('tp_opt2_sscl_absorbed_vat_sep')}
                          className={`p-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            taxProfileId === 'tp_opt2_sscl_absorbed_vat_sep' || taxProfileId === 'tp_vat_sscl'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          Option 2<br/><span className="text-[9px] font-normal opacity-80">SSCL In, VAT Sep</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxProfileId('tp_opt3_both_separate')}
                          className={`p-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            taxProfileId === 'tp_opt3_both_separate'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          Option 3<br/><span className="text-[9px] font-normal opacity-80">Both 2 Lines (SSCL & VAT)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxProfileId('tp_vat18')}
                          className={`p-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            taxProfileId === 'tp_vat18'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          VAT Only<br/><span className="text-[9px] font-normal opacity-80">18% Separate (No SSCL)</span>
                        </button>
                      </div>

                      <select 
                        value={taxProfileId} 
                        onChange={e => setTaxProfileId(e.target.value)} 
                        className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded-lg text-xs outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="">No Tax Applied</option>
                        {taxProfiles.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      <div className="pt-2 border-t border-theme-subtle/50 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-primary">Tax Inclusive Pricing</div>
                          <div className="text-[9.5px] text-muted">Prices include VAT/SSCL (extract without adding on top)</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsTaxInclusive(!isTaxInclusive)}
                          className={`w-8 h-4 rounded-full transition-colors relative flex items-center ${isTaxInclusive ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                          title="Toggle tax inclusive pricing"
                        >
                          <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${isTaxInclusive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {taxBreakdown && selectedTaxProfile && (
                        <div className="bg-surface/50 p-2.5 rounded-lg border border-theme-subtle space-y-1.5 text-[11px] mt-2">
                          {selectedTaxProfile.tax1_show_separately === 0 && selectedTaxProfile.tax2_show_separately === 0 ? (
                            <div className="flex justify-between items-center text-muted">
                              <span>Taxes Absorbed (SSCL {selectedTaxProfile.tax1_rate}% + VAT {selectedTaxProfile.tax2_rate}%)</span>
                              <span className="font-mono text-emerald-500 font-semibold">{formatCurrency(totalTax)} (Included)</span>
                            </div>
                          ) : (
                            <>
                              {selectedTaxProfile.tax1_show_separately === 1 && Number(selectedTaxProfile.tax1_rate) > 0 && (
                                <div className="flex justify-between items-center text-muted">
                                  <span>{selectedTaxProfile.tax1_name || 'SSCL'} ({selectedTaxProfile.tax1_rate}%):</span>
                                  <span className="font-mono text-amber-500">{isTaxInclusive ? '' : '+'}{formatCurrency(taxBreakdown.tax1Amount)}</span>
                                </div>
                              )}
                              {selectedTaxProfile.tax1_show_separately === 0 && Number(selectedTaxProfile.tax1_rate) > 0 && (
                                <div className="flex justify-between items-center text-muted">
                                  <span>{selectedTaxProfile.tax1_name || 'SSCL'} ({selectedTaxProfile.tax1_rate}%):</span>
                                  <span className="font-mono text-emerald-500">{formatCurrency(taxBreakdown.tax1Amount)} (Absorbed)</span>
                                </div>
                              )}
                              {selectedTaxProfile.tax2_show_separately === 1 && Number(selectedTaxProfile.tax2_rate) > 0 && (
                                <div className="flex justify-between items-center text-muted">
                                  <span className="font-semibold text-primary">{selectedTaxProfile.tax2_name || 'VAT'} ({selectedTaxProfile.tax2_rate}%):</span>
                                  <span className="font-mono text-emerald-500 font-semibold">{isTaxInclusive ? '' : '+'}{formatCurrency(taxBreakdown.tax2Amount)}</span>
                                </div>
                              )}
                              {taxBreakdown.isCompound && (
                                <span className="text-[10px] text-muted italic block">* VAT is compounded on SSCL</span>
                              )}
                            </>
                          )}
                        </div>
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
            subtotal: isTaxInclusive ? Math.max(0, Number((netTaxableAmount - totalTax).toFixed(2))) : subtotal,
            tax: totalTax,
            shippingCost,
            totalAmount: grandTotal,
            isTaxInclusive,
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

    {/* Cut Piece Specification Modal (Shafts & Sheet Metals / Thahadu) */}
    {activeCutModalItem && (
      <Modal 
        isOpen 
        title={`Material Dimensions & Cut Specs — ${activeCutModalItem.desc.replace(/\s*\[Cut.*?\]/i, '').trim() || 'Raw Material'}`} 
        onClose={() => setActiveCutModalItem(null)}
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Specify cut piece dimensions for shafts, round bars, pipes, or sheet metals / plates (තහඩු). The system will calculate cut pieces, linear length or square area, and format the supplier PO note.
          </p>

          {/* Mode Selector: Shaft / Bar vs Sheet / Plate */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface2/60 rounded-xl border border-theme-subtle">
            <button
              type="button"
              onClick={() => setCutForm({ ...cutForm, cutType: 'shaft', standardLength: 6000, qtyMode: 'pieces' })}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                cutForm.cutType === 'shaft'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <span>⚙️ Shaft / Round Bar / Pipe</span>
            </button>
            <button
              type="button"
              onClick={() => setCutForm({ ...cutForm, cutType: 'sheet', standardLength: 2440, standardWidth: 1220, qtyMode: 'pieces' })}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                cutForm.cutType === 'sheet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <span>📐 Sheet Metal / Plate / තහඩු</span>
            </button>
          </div>

          {cutForm.cutType === 'sheet' ? (
            /* --- SHEET METAL / PLATE / THAHADU FORM --- */
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Length (mm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.cutLength}
                    onChange={e => setCutForm({ ...cutForm, cutLength: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="e.g. 1200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Width (mm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.cutWidth}
                    onChange={e => setCutForm({ ...cutForm, cutWidth: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="e.g. 600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Pieces (Cuts) *</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.pieces}
                    onChange={e => setCutForm({ ...cutForm, pieces: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Standard Sheet Size (mm)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={cutForm.standardLength}
                      onChange={e => setCutForm({ ...cutForm, standardLength: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-surface border border-theme-subtle px-2.5 py-2 text-primary font-mono text-xs focus:border-rex-500 outline-none rounded-lg"
                      placeholder="Length 2440"
                      title="Standard Sheet Length (2440 mm / 8 ft)"
                    />
                    <input
                      type="number"
                      min="1"
                      value={cutForm.standardWidth}
                      onChange={e => setCutForm({ ...cutForm, standardWidth: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-surface border border-theme-subtle px-2.5 py-2 text-primary font-mono text-xs focus:border-rex-500 outline-none rounded-lg"
                      placeholder="Width 1220"
                      title="Standard Sheet Width (1220 mm / 4 ft)"
                    />
                  </div>
                  <span className="text-[10px] text-muted">Standard supplier metal sheet is 2,440 × 1,220 mm (4′ × 8′).</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">PO Order Qty Column</label>
                  <select
                    value={cutForm.qtyMode}
                    onChange={e => setCutForm({ ...cutForm, qtyMode: e.target.value as any })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm focus:border-rex-500 outline-none rounded-lg font-medium"
                  >
                    <option value="pieces">Pieces / Nos ({cutForm.pieces} pcs)</option>
                    <option value="sqm">Square Meters ({((cutForm.cutLength * cutForm.cutWidth * cutForm.pieces) / 1000000).toFixed(3)} m²)</option>
                    <option value="sqft">Square Feet ({(((cutForm.cutLength * cutForm.cutWidth * cutForm.pieces) / 1000000) * 10.7639).toFixed(2)} sq.ft)</option>
                  </select>
                  <span className="text-[10px] text-muted">Sets how the Order Qty column will be billed.</span>
                </div>
              </div>

              {/* Live Area Calculation Summary */}
              {(() => {
                const totalAreaM2 = (cutForm.cutLength * cutForm.cutWidth * cutForm.pieces) / 1000000;
                const totalAreaSqFt = totalAreaM2 * 10.7639;
                const stdAreaM2 = (cutForm.standardLength * (cutForm.standardWidth || 1220)) / 1000000;
                const sheetFraction = stdAreaM2 > 0 ? (totalAreaM2 / stdAreaM2) : 0;
                return (
                  <div className="bg-surface/60 border border-theme-subtle p-3.5 rounded-lg text-xs space-y-2 font-medium">
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Total Sheet Area:</span>
                      <span className="font-mono font-bold text-primary">
                        {totalAreaM2.toFixed(3)} m² ({totalAreaSqFt.toFixed(2)} Sq.Ft)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted">Standard 4′×8′ Sheet Equivalent:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {sheetFraction.toFixed(3)} of {cutForm.standardLength}×{cutForm.standardWidth || 1220} mm Full Sheet
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-theme-subtle/50">
                      <span className="text-muted">PO Description Note:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        [Cut Sheet: {cutForm.cutLength} mm × {cutForm.cutWidth} mm × {cutForm.pieces} pcs ({totalAreaM2.toFixed(3)} m²)]
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            /* --- SHAFT / ROUND BAR / PIPE FORM --- */
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Cut Length (mm) *</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.cutLength}
                    onChange={e => setCutForm({ ...cutForm, cutLength: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="e.g. 200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Number of Pieces (Cuts) *</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.pieces}
                    onChange={e => setCutForm({ ...cutForm, pieces: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="e.g. 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Standard Bar Length (mm)</label>
                  <input
                    type="number"
                    min="1"
                    value={cutForm.standardLength}
                    onChange={e => setCutForm({ ...cutForm, standardLength: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary font-mono text-sm focus:border-rex-500 outline-none rounded-lg"
                    placeholder="Default: 6000"
                  />
                  <span className="text-[10px] text-muted">Standard supplier bar is usually 6,000 mm (6 Meters).</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">PO Order Qty Column</label>
                  <select
                    value={cutForm.qtyMode}
                    onChange={e => setCutForm({ ...cutForm, qtyMode: e.target.value as any })}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm focus:border-rex-500 outline-none rounded-lg font-medium"
                  >
                    <option value="pieces">Pieces / Nos ({cutForm.pieces} pcs)</option>
                    <option value="meters">Meters ({((cutForm.cutLength * cutForm.pieces) / 1000).toFixed(3)} M)</option>
                    <option value="mm">Millimeters ({cutForm.cutLength * cutForm.pieces} mm)</option>
                  </select>
                  <span className="text-[10px] text-muted">Sets how Qty column is represented in the line item.</span>
                </div>
              </div>

              {/* Live Calculation Summary */}
              <div className="bg-surface/60 border border-theme-subtle p-3.5 rounded-lg text-xs space-y-2 font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Total Cut Material:</span>
                  <span className="font-mono font-bold text-primary">
                    {cutForm.cutLength * cutForm.pieces} mm ({(cutForm.cutLength * cutForm.pieces / 1000).toFixed(3)} Meters)
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Standard Bar Fraction:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {((cutForm.cutLength * cutForm.pieces) / cutForm.standardLength).toFixed(4)} of {cutForm.standardLength} mm Full Bar
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-theme-subtle/50">
                  <span className="text-muted">PO Description Note:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    [Cut Shaft: {cutForm.cutLength} mm × {cutForm.pieces} pcs]
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setActiveCutModalItem(null)}>Cancel</Button>
            <Button variant="primary" onClick={applyCutSpecs}>
              Apply Cut Specs
            </Button>
          </div>
        </div>
      </Modal>
    )}
  </div>
  );
};
