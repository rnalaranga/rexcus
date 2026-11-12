import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, CreditCard, Building2, Calendar, 
  FileText, CheckCircle2, AlertTriangle, Layers, DollarSign, 
  History, ExternalLink, Hash, Receipt, Paperclip, UploadCloud, Eye, Trash2,
  Zap, Droplets, PhoneCall, Home, Wrench, Fuel, ShieldCheck, Plus, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { POPrintView } from '@/components/purchasing/POPrintView';
import { useSettings } from '@/contexts/SettingsContext';
import { printElement } from '@/lib/printElement';
import { exportToPdf } from '@/lib/exportToPdf';
import { useGRNs, usePurchaseOrders, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { useTaxProfiles, useAccounts } from '@/hooks/useFinance';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { POAutocomplete } from '@/components/purchasing/POAutocomplete';
import { createBill, updateBill, uploadFileToStorage } from '@/lib/api';
import { formatCurrency, openDataUriOrUrl } from '@/lib/utils';

export const BillBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id') || searchParams.get('bill');
  const grnIdParam = searchParams.get('grn');
  const poIdParam = searchParams.get('po');
  const navigate = useNavigate();
  
  const { data: grns } = useGRNs();
  const { data: pos } = usePurchaseOrders();
  const { data: bills, refetch: refetchBills } = useBills();
  const { data: suppliers } = useSuppliers();
  const { data: taxProfiles = [] } = useTaxProfiles();
  const { data: accounts = [] } = useAccounts();
  const { settings } = useSettings();

  const [previewPo, setPreviewPo] = useState<any | null>(null);

  const [docNo, setDocNo] = useState(idParam || ('BILL-' + Date.now().toString().slice(-4)));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  const [supplierId, setSupplierId] = useState('');
  const [billCategory, setBillCategory] = useState<string>('Raw Material / Inventory');
  const [expenseAccountId, setExpenseAccountId] = useState<string>('');
  
  // Single or Multiple PO linking
  const [isMultiPoMode, setIsMultiPoMode] = useState<boolean>(false);
  const [selectedPoIds, setSelectedPoIds] = useState<string[]>([]);
  const [poId, setPoId] = useState(poIdParam || '');
  
  const [grnId, setGrnId] = useState(grnIdParam || '');
  const [amount, setAmount] = useState<number>(0);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [billAttachment, setBillAttachment] = useState<string>('');
  const [billAttachmentName, setBillAttachmentName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  // Tax Management
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [taxProfileId, setTaxProfileId] = useState<string>('tp_opt2_sscl_absorbed_vat_sep');
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [hideVatSeparately, setHideVatSeparately] = useState<boolean>(false);

  // Helper: Get supplier name
  const getSupplierName = (id: string) => {
    const s = suppliers.find((sp: any) => sp.id === id);
    return s?.company || s?.name || id || 'Unknown Vendor';
  };

  // If opened with ?id=, load existing bill data
  useEffect(() => {
    if (idParam && bills.length > 0) {
      const existing = bills.find((b: any) => b.id === idParam);
      if (existing) {
        setDocNo(existing.id);
        setInvoiceNo(existing.invoiceNo || '');
        setSupplierId(existing.supplierId || '');
        setBillCategory(existing.billCategory || 'Raw Material / Inventory');
        setExpenseAccountId(existing.expenseAccountId || '');
        
        let loadedPoIds: string[] = [];
        if (existing.poIds) {
          try {
            loadedPoIds = typeof existing.poIds === 'string' ? JSON.parse(existing.poIds) : existing.poIds;
          } catch {
            loadedPoIds = typeof existing.poIds === 'string' ? existing.poIds.split(',').map((s: string) => s.trim()) : [];
          }
        } else if (existing.poId) {
          loadedPoIds = [existing.poId];
        }

        if (loadedPoIds.length > 1) {
          setIsMultiPoMode(true);
          setSelectedPoIds(loadedPoIds);
          setPoId(loadedPoIds[0] || '');
        } else {
          setPoId(existing.poId || (loadedPoIds[0] || ''));
          setSelectedPoIds(loadedPoIds);
        }

        setGrnId(existing.grnId || '');
        setAmount(Number(existing.amount || 0));

        if (existing.items) {
          try {
            const parsed = typeof existing.items === 'string' ? JSON.parse(existing.items) : existing.items;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLineItems(parsed.map((it: any, idx: number) => ({
                id: it.id || `line-${Date.now()}-${idx}`,
                description: it.description || it.desc || it.name || '',
                qty: Number(it.qty !== undefined ? it.qty : (it.qtyReceived || 1)),
                unitCost: Number(it.unitCost || it.unitPrice || 0),
                total: Number(it.total || (Number(it.qty || 1) * Number(it.unitCost || 0))),
                accountId: it.accountId || existing.expenseAccountId || '',
                inventoryId: it.inventoryId || ''
              })));
            }
          } catch (e) {}
        }
        if (existing.date) setDate(existing.date.split('T')[0]);
        if (existing.dueDate) setDueDate(existing.dueDate.split('T')[0]);
        setNotes(existing.notes || '');
        setBillAttachment(existing.billAttachment || '');
        setBillAttachmentName(existing.billAttachmentName || '');
        if (existing.taxProfileId) {
          setTaxProfileId(existing.taxProfileId);
          setTaxEnabled(true);
        }
        if (existing.isTaxInclusive !== undefined && existing.isTaxInclusive !== null) {
          setIsTaxInclusive(Boolean(Number(existing.isTaxInclusive) === 1));
        }
        if (existing.hideVatSeparately !== undefined && existing.hideVatSeparately !== null) {
          setHideVatSeparately(Boolean(Number(existing.hideVatSeparately) === 1));
        }
      }
    }
  }, [idParam, bills]);

  // If opened with ?po=, set PO immediately
  useEffect(() => {
    if (!idParam && poIdParam) {
      setPoId(poIdParam);
      setSelectedPoIds([poIdParam]);
    }
  }, [idParam, poIdParam]);

  // If opened with ?grn=, set GRN and PO and inherit bill attachment & tax config if present
  useEffect(() => {
    if (!idParam && grnIdParam && grns.length > 0) {
      const grn = grns.find((g: any) => g.id === grnIdParam);
      if (grn) {
        setGrnId(grn.id);
        if (grn.poId) {
          setPoId(grn.poId);
          setSelectedPoIds([grn.poId]);
        }
        if (grn.supplierId) setSupplierId(grn.supplierId);
        if (grn.billAttachment && !billAttachment) {
          setBillAttachment(grn.billAttachment);
          setBillAttachmentName(grn.billAttachmentName || (grn.id ? `Vendor_Doc_${grn.id}` : 'Vendor_Document'));
        }
        if (grn.taxProfileId) {
          setTaxProfileId(grn.taxProfileId);
          setTaxEnabled(true);
        }
        if (grn.isTaxInclusive !== undefined && grn.isTaxInclusive !== null) {
          setIsTaxInclusive(Boolean(Number(grn.isTaxInclusive) === 1));
        }
        if (grn.hideVatSeparately !== undefined && grn.hideVatSeparately !== null) {
          setHideVatSeparately(Boolean(Number(grn.hideVatSeparately) === 1));
        }
      }
    }
  }, [idParam, grnIdParam, grns]);

  // Active Linked PO IDs (either single or multi)
  const activeLinkedPoIds = useMemo(() => {
    if (isMultiPoMode) {
      return selectedPoIds;
    }
    return poId ? [poId] : [];
  }, [isMultiPoMode, selectedPoIds, poId]);

  // Objects for active POs
  const activeLinkedPOs = useMemo(() => {
    return pos.filter((p: any) => activeLinkedPoIds.includes(p.id));
  }, [pos, activeLinkedPoIds]);

  // Primary single selected PO (for single mode)
  const selectedPO = useMemo(() => {
    return pos.find((p: any) => p.id === (activeLinkedPoIds[0] || ''));
  }, [activeLinkedPoIds, pos]);

  // Find all previous bills for the active POs
  const activePoBills = useMemo(() => {
    if (activeLinkedPoIds.length === 0) return [];
    return bills.filter((b: any) => {
      if (b.id === idParam) return false; // exclude current bill if editing
      if (b.poId && activeLinkedPoIds.includes(b.poId)) return true;
      if (b.poIds) {
        try {
          const arr = typeof b.poIds === 'string' ? JSON.parse(b.poIds) : b.poIds;
          if (Array.isArray(arr) && arr.some(id => activeLinkedPoIds.includes(id))) return true;
        } catch {
          if (typeof b.poIds === 'string' && activeLinkedPoIds.some(id => b.poIds.includes(id))) return true;
        }
      }
      return false;
    });
  }, [activeLinkedPoIds, bills, idParam]);

  // Financial aggregates across linked POs
  const combinedPoTotal = useMemo(() => {
    return activeLinkedPOs.reduce((sum: number, p: any) => sum + Number(p.totalAmount || 0), 0);
  }, [activeLinkedPOs]);

  const combinedBilledSoFar = useMemo(() => {
    return activePoBills.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
  }, [activePoBills]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, Number((combinedPoTotal - combinedBilledSoFar).toFixed(2)));
  }, [combinedPoTotal, combinedBilledSoFar]);

  // Unbilled / Open POs for current supplier
  const unbilledPOsForVendor = useMemo(() => {
    if (!supplierId) return [];
    return pos.filter((p: any) => {
      if (p.supplierId !== supplierId) return false;
      const bForP = bills.filter((b: any) => {
        if (b.id === idParam) return false;
        if (b.poId === p.id) return true;
        if (Array.isArray(b.poIds) && b.poIds.includes(p.id)) return true;
        if (typeof b.poIds === 'string' && b.poIds.includes(p.id)) return true;
        return false;
      });
      const billed = bForP.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      const total = Number(p.totalAmount || 0);
      return (total - billed) > 0.01;
    });
  }, [pos, bills, supplierId, idParam]);

  // If a single PO is chosen and supplier not set, auto-sync supplier
  useEffect(() => {
    if (selectedPO && selectedPO.supplierId && !supplierId) {
      setSupplierId(selectedPO.supplierId);
    }
  }, [selectedPO, supplierId]);

  // Function to load / import items from GRN
  const loadItemsFromGRN = (targetGrnId: string) => {
    if (!targetGrnId) return;
    const grn = grns.find((g: any) => g.id === targetGrnId);
    if (!grn) return;
    const grnItems = typeof grn.items === 'string' ? JSON.parse(grn.items) : (grn.items || []);
    const poItems = selectedPO ? (typeof selectedPO.items === 'string' ? JSON.parse(selectedPO.items) : (selectedPO.items || [])) : [];
    
    if (Array.isArray(grnItems) && grnItems.length > 0) {
      const defaultAcc = expenseAccountId || '';
      const newLines = grnItems.map((gi: any, idx: number) => {
        const qty = Number(gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty || 0));
        const matchingPoItem = poItems.find((pi: any) => 
          (pi.inventoryId && pi.inventoryId === gi.inventoryId) || 
          (pi.id && pi.id === gi.id) || 
          (pi.desc && gi.desc && pi.desc === gi.desc)
        );
        const unitCost = Number(gi.unitCost || gi.unitPrice || matchingPoItem?.unitPrice || matchingPoItem?.unitCost || 0);
        const desc = gi.desc || gi.name || gi.inventoryName || (gi.inventoryId ? `Material [${gi.inventoryId}]` : `Item #${idx + 1}`);
        return {
          id: `grn-item-${Date.now()}-${idx}`,
          description: desc,
          qty: qty || 1,
          unitCost: unitCost,
          total: Math.round(qty * unitCost * 100) / 100,
          accountId: defaultAcc,
          inventoryId: gi.inventoryId || ''
        };
      });
      setLineItems(newLines);
      const sum = newLines.reduce((s: number, it: any) => s + Number(it.total || 0), 0);
      setAmount(Math.round(sum * 100) / 100);
    }
  };

  const addLineItem = () => {
    const defaultAcc = expenseAccountId || '';
    const newItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: '',
      qty: 1,
      unitCost: 0,
      total: 0,
      accountId: defaultAcc
    };
    const updated = [...lineItems, newItem];
    setLineItems(updated);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(prev => {
      const updated = prev.map(item => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitCost') {
          const q = field === 'qty' ? Number(value) : Number(item.qty || 0);
          const c = field === 'unitCost' ? Number(value) : Number(item.unitCost || 0);
          next.total = Math.round(q * c * 100) / 100;
        }
        return next;
      });
      const sum = updated.reduce((s: number, it: any) => s + Number(it.total || 0), 0);
      setAmount(Math.round(sum * 100) / 100);
      return updated;
    });
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      const sum = updated.reduce((s: number, it: any) => s + Number(it.total || 0), 0);
      setAmount(Math.round(sum * 100) / 100);
      return updated;
    });
  };

  // Auto-load items from GRN if empty and GRN is chosen
  useEffect(() => {
    if (grnId && grns.length > 0 && !idParam && lineItems.length === 0) {
      loadItemsFromGRN(grnId);
    }
  }, [grnId, grns, idParam]);

  // Calculate default amount based on GRN or remaining balance
  useEffect(() => {
    if (lineItems.length > 0) return;
    if (grnId && grns.length > 0) {
      const grn = grns.find((g: any) => g.id === grnId);
      if (grn) {
        const grnItems = typeof grn.items === 'string' ? JSON.parse(grn.items) : (grn.items || []);
        const poItems = selectedPO ? (typeof selectedPO.items === 'string' ? JSON.parse(selectedPO.items) : (selectedPO.items || [])) : [];
        
        let calculatedAmt = 0;
        if (Array.isArray(grnItems) && grnItems.length > 0) {
          for (const gi of grnItems) {
            const qty = Number(gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty || 0));
            const matchingPoItem = poItems.find((pi: any) => (pi.inventoryId && pi.inventoryId === gi.inventoryId) || (pi.id && pi.id === gi.id) || (pi.desc && gi.desc && pi.desc === gi.desc));
            const unitCost = Number(gi.unitCost || gi.unitPrice || matchingPoItem?.unitPrice || matchingPoItem?.unitCost || 0);
            calculatedAmt += (qty * unitCost);
          }
        }

        if (calculatedAmt > 0 && amount === 0) {
          setAmount(Number(calculatedAmt.toFixed(2)));
          return;
        }
      }
    }

    // Default to remaining balance if available and amount is 0
    if (remainingBalance > 0 && amount === 0) {
      setAmount(remainingBalance);
    }
  }, [grnId, grns, selectedPO, remainingBalance, lineItems.length]);

  // Find GRNs matching the active POs or Supplier
  const matchingGRNs = useMemo(() => {
    if (activeLinkedPoIds.length === 0) {
      if (supplierId) {
        return grns.filter((g: any) => g.supplierId === supplierId);
      }
      return grns;
    }
    return grns.filter((g: any) => {
      if (activeLinkedPoIds.includes(g.poId)) return true;
      if (Array.isArray(g.poIds) && g.poIds.some((id: string) => activeLinkedPoIds.includes(id))) return true;
      if (typeof g.poIds === 'string' && activeLinkedPoIds.some(id => g.poIds.includes(id))) return true;
      return false;
    });
  }, [activeLinkedPoIds, supplierId, grns]);

  // Tax calculations for Bill
  const selectedTaxProfile = taxProfiles.find((t: any) => t.id === taxProfileId);
  let totalTax = 0;
  let taxBreakdown: any = null;
  let netSubtotal = amount;

  if (taxEnabled && selectedTaxProfile) {
    const t1Rate = Number(selectedTaxProfile.tax1_rate) || 0;
    const t2Rate = Number(selectedTaxProfile.tax2_rate) || 0;
    const t1 = t1Rate / 100;
    const t2 = t2Rate / 100;

    const isOpt4Included = selectedTaxProfile.id === 'tp_opt4_sscl_included_vat_sep' || selectedTaxProfile.name?.toLowerCase().includes('sscl included');
    const isSsclHidden = Boolean(t1Rate > 0 && (selectedTaxProfile.tax1_show_separately === 0 || hideVatSeparately));
    const isVatSeparate = Boolean(!hideVatSeparately && (t2Rate > 0 ? selectedTaxProfile.tax2_show_separately === 1 : true));
    const isSsclSeparate = Boolean(!hideVatSeparately && t1Rate > 0 && selectedTaxProfile.tax1_show_separately === 1);

    if (isTaxInclusive) {
      let baseSub = amount;
      let t1Amount = 0;
      let t2Amount = 0;

      if (isOpt4Included && t1 > 0) {
        baseSub = amount / (1 + t2);
        t2Amount = amount - baseSub;
        const netBeforeSscl = baseSub / (1 + t1);
        t1Amount = baseSub - netBeforeSscl;
      } else if (isSsclHidden && isVatSeparate) {
        baseSub = amount / (1 + t2);
        t2Amount = amount - baseSub;
        t1Amount = 0;
      } else if (isSsclSeparate && isVatSeparate) {
        const divisor = selectedTaxProfile.tax2_compound ? ((1 + t1) * (1 + t2)) : (1 + t1 + t2);
        baseSub = amount / divisor;
        t1Amount = baseSub * t1;
        const baseForT2 = selectedTaxProfile.tax2_compound ? (baseSub + t1Amount) : baseSub;
        t2Amount = baseForT2 * t2;
      } else {
        const divisor = selectedTaxProfile.tax2_compound ? ((1 + t1) * (1 + t2)) : (1 + t1 + t2);
        if (divisor > 1) {
          baseSub = amount / divisor;
          t1Amount = baseSub * t1;
          const baseForT2 = selectedTaxProfile.tax2_compound ? (baseSub + t1Amount) : baseSub;
          t2Amount = baseForT2 * t2;
        } else {
          baseSub = amount;
          t1Amount = 0;
          t2Amount = 0;
        }
      }

      t1Amount = Math.round(t1Amount * 100) / 100;
      t2Amount = Math.round((amount - (Math.round(baseSub * 100) / 100) - t1Amount) * 100) / 100;
      totalTax = t1Amount + t2Amount;
      netSubtotal = Math.round(baseSub * 100) / 100;
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

      if (isOpt4Included && t1 > 0) {
        const netBeforeSscl = amount / (1 + t1);
        t1Amount = amount - netBeforeSscl;
        t2Amount = amount * t2;
        taxBreakdown = {
          profileName: selectedTaxProfile.name,
          tax1Name: selectedTaxProfile.tax1_name || 'SSCL',
          tax1Rate: t1Rate,
          tax1Amount: Math.round(t1Amount * 100) / 100,
          tax2Name: selectedTaxProfile.tax2_name || 'VAT',
          tax2Rate: t2Rate,
          tax2Amount: Math.round(t2Amount * 100) / 100,
          isCompound: Boolean(selectedTaxProfile.tax2_compound),
          isTaxInclusive: false
        };
        totalTax = Math.round(t2Amount * 100) / 100;
        netSubtotal = amount;
      } else {
        if (isSsclHidden && isVatSeparate) {
          t1Amount = 0;
          t2Amount = amount * t2;
        } else if (selectedTaxProfile.tax1_show_separately === 0 && selectedTaxProfile.tax2_show_separately === 0) {
          t1Amount = 0;
          t2Amount = 0;
        } else {
          t1Amount = isSsclSeparate ? (amount * t1) : 0;
          const baseForT2 = selectedTaxProfile.tax2_compound ? (amount + t1Amount) : amount;
          t2Amount = isVatSeparate ? (baseForT2 * t2) : 0;
        }

        t1Amount = Math.round(t1Amount * 100) / 100;
        t2Amount = Math.round(t2Amount * 100) / 100;
        totalTax = t1Amount + t2Amount;
        netSubtotal = amount;
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
    }
  }

  const grandTotalBillValue = isTaxInclusive ? amount : (amount + totalTax);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUri = reader.result as string;
      setBillAttachment(rawDataUri);
      setBillAttachmentName(file.name);

      try {
        const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'bills');
        if (uploaded && uploaded.url) {
          setBillAttachment(uploaded.url);
        }
      } catch (err) {
        console.warn('Storage upload error, keeping dataUri fallback:', err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!invoiceNo.trim()) {
      alert('Please enter the Vendor Invoice / Bill Number.');
      return;
    }
    if (!supplierId) {
      alert('Please select a Supplier / Vendor.');
      return;
    }
    if (amount <= 0) {
      alert('Please enter a valid bill amount greater than 0.');
      return;
    }
    if (lineItems.length === 0 && !expenseAccountId) {
      alert('Please select a Charge Account (Chart of Accounts) to charge/debit for this bill.');
      return;
    }

    setSaving(true);
    try {
      const primaryPoId = activeLinkedPoIds[0] || null;
      const poIdsPayload = activeLinkedPoIds.length > 0 ? JSON.stringify(activeLinkedPoIds) : null;

      const payload: any = { 
        id: docNo, 
        billNo: docNo,
        supplierId, 
        billCategory,
        expenseAccountId: expenseAccountId || null,
        billType: (activeLinkedPoIds.length > 0 || grnId) ? 'grn' : 'manual',
        poId: primaryPoId, 
        poIds: poIdsPayload,
        grnId: grnId || null, 
        invoiceNo: invoiceNo.trim(), 
        date, 
        dueDate: dueDate || null, 
        amount: grandTotalBillValue, 
        subtotal: netSubtotal,
        items: lineItems.length > 0 ? JSON.stringify(lineItems) : null,
        taxAmount: totalTax,
        taxProfileId: taxEnabled ? taxProfileId : null,
        taxBreakdown: taxEnabled && taxBreakdown ? JSON.stringify(taxBreakdown) : null,
        isTaxInclusive: isTaxInclusive ? 1 : 0,
        hideVatSeparately: hideVatSeparately ? 1 : 0,
        notes, 
        billAttachment: billAttachment || null,
        billAttachmentName: billAttachmentName || null
      };

      if (idParam) {
        await updateBill(docNo, payload);
      } else {
        payload.status = 'unpaid';
        await createBill(payload);
      }
      await refetchBills();
      navigate('/finance/vendor-bills');
    } catch (e: any) {
      alert('Failed to save supplier bill: ' + (e.message || 'Unknown error'));
      setSaving(false);
    }
  };

  const isExceedingBalance = activeLinkedPOs.length > 0 && remainingBalance > 0 && amount > remainingBalance;

  // Preset Utilities for Quick Category Selection
  const categoryPresets = [
    { label: 'Raw Materials', cat: 'Raw Material / Inventory', icon: Layers, color: 'text-amber-500' },
    { label: 'Electricity (CEB)', cat: 'Electricity / CEB', icon: Zap, color: 'text-yellow-500' },
    { label: 'Water (NWSDB)', cat: 'Water Utility', icon: Droplets, color: 'text-cyan-500' },
    { label: 'Telco / Internet', cat: 'Telephone & Internet', icon: PhoneCall, color: 'text-blue-500' },
    { label: 'Rent & Lease', cat: 'Rent & Lease', icon: Home, color: 'text-emerald-500' },
    { label: 'Maintenance', cat: 'Machine Maintenance', icon: Wrench, color: 'text-rose-500' },
    { label: 'Fuel / Transport', cat: 'Fuel & Transport', icon: Fuel, color: 'text-orange-500' },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance/vendor-bills')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight">
                {idParam ? 'Edit Supplier Bill / Invoice' : 'Record Supplier Bill / Invoice'}
              </h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                {idParam ? 'Editing Existing Bill' : (activePoBills.length > 0 ? `Invoice #${activePoBills.length + 1} for PO` : 'Direct Bill / PO Bill')}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • AP BILL • UNPAID STATUS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/finance/vendor-bills')} className="text-xs">
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (idParam ? 'Save Changes' : 'Post to AP Ledger')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Quick Expense Category Quick-Pills */}
          <GlassCard className="p-3 bg-surface/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
              <span>Quick Select Bill Type / Category</span>
              <span className="text-primary font-mono text-[11px] font-bold">{billCategory}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryPresets.map((p) => {
                const Icon = p.icon;
                const isSelected = billCategory === p.cat;
                return (
                  <button
                    key={p.cat}
                    type="button"
                    onClick={() => {
                      setBillCategory(p.cat);
                      // If it's utility/non-raw material, user usually doesn't need PO
                      if (p.cat !== 'Raw Material / Inventory' && activeLinkedPoIds.length === 0) {
                        setGrnId('');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                        : 'bg-surface2/60 text-secondary border-theme-subtle hover:border-amber-500/50 hover:text-primary'
                    }`}
                  >
                    <Icon size={13} className={isSelected ? 'text-white' : p.color} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Multi-PO Financial Summary Banner (When PO(s) Linked) */}
          {activeLinkedPOs.length > 0 && (
            <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-500/[0.03]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                      <Receipt size={14} /> Linked PO: {activeLinkedPoIds.join(', ')}
                    </span>
                    <Badge 
                      value={combinedBilledSoFar >= combinedPoTotal - 0.01 && combinedPoTotal > 0 ? 'Fully Billed' : combinedBilledSoFar > 0 ? 'Partially Billed' : 'Unbilled'} 
                      size="sm" 
                    />
                    {activeLinkedPOs.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreviewPo(p)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-amber-500/30 hover:border-amber-500 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title={`View read-only PO document #${p.id}`}
                      >
                        <Eye size={11} />
                        <span>View {p.id}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Vendor: <strong className="text-primary">{getSupplierName(supplierId || activeLinkedPOs[0]?.supplierId)}</strong> • {activeLinkedPOs.length} PO(s) linked
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center gap-3 bg-surface/60 border border-theme-subtle p-2.5 rounded-lg">
                  <div className="text-right px-2 border-r border-theme-subtle">
                    <div className="text-[10px] uppercase font-bold text-muted">Combined PO Total</div>
                    <div className="text-xs font-black text-primary font-mono">{formatCurrency(combinedPoTotal, true)}</div>
                  </div>
                  <div className="text-right px-2 border-r border-theme-subtle">
                    <div className="text-[10px] uppercase font-bold text-muted">Billed ({activePoBills.length} inv)</div>
                    <div className="text-xs font-black text-amber-500 font-mono">{formatCurrency(combinedBilledSoFar, true)}</div>
                  </div>
                  <div className="text-right px-2">
                    <div className="text-[10px] uppercase font-bold text-muted">Balance to Bill</div>
                    <div className="text-xs font-black text-emerald-500 font-mono">{formatCurrency(remainingBalance, true)}</div>
                  </div>
                  {remainingBalance > 0 && amount !== remainingBalance && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAmount(remainingBalance)}
                      className="text-[10px] text-amber-500 hover:text-amber-400 border border-amber-500/30 ml-1 py-1 h-auto"
                      title="Set bill amount to open remaining balance"
                    >
                      Fill Balance
                    </Button>
                  )}
                </div>
              </div>

              {/* Warning if amount exceeds remaining balance */}
              {isExceedingBalance && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-600 dark:text-amber-400 text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>
                    <strong>Heads up:</strong> The entered bill amount ({formatCurrency(amount, true)}) exceeds the remaining PO balance ({formatCurrency(remainingBalance, true)}).
                  </span>
                </div>
              )}
            </GlassCard>
          )}

          {/* Form Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Vendor & PO References */}
            <GlassCard className="p-5 border-t-2 border-t-amber-500 space-y-4">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 size={16} /> Vendor & PO References
                </span>
                <span className="text-[10px] font-mono text-muted lowercase">step 1</span>
              </h2>

              {/* Vendor / Supplier Selector with Autocomplete */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center justify-between">
                  <span>Supplier / Vendor *</span>
                  {supplierId && unbilledPOsForVendor.length > 0 && (
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {unbilledPOsForVendor.length} Unbilled PO(s) Available
                    </span>
                  )}
                </label>
                <SupplierAutocomplete
                  value={supplierId}
                  onChange={(sId) => {
                    setSupplierId(sId);
                    // Clear linked POs if from different vendor
                    if (activeLinkedPOs.some((p: any) => p.supplierId !== sId)) {
                      setPoId('');
                      setSelectedPoIds([]);
                    }
                  }}
                  suppliers={suppliers}
                  placeholder="Type to search vendor / supplier..."
                  className="text-xs py-1.5"
                />
              </div>

              {/* Unbilled POs Pill Suggestions for Selected Vendor */}
              {supplierId && unbilledPOsForVendor.length > 0 && (
                <div className="p-2.5 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>⚡ Quick Add Unbilled POs for this Vendor:</span>
                    <span className="text-[9px] text-muted font-normal">Click to link & auto-fill</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unbilledPOsForVendor.map((po: any) => {
                      const isLinked = activeLinkedPoIds.includes(po.id);
                      return (
                        <div key={po.id} className="inline-flex items-center rounded border border-theme-subtle overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              if (isMultiPoMode) {
                                if (isLinked) {
                                  setSelectedPoIds(prev => prev.filter(x => x !== po.id));
                                } else {
                                  setSelectedPoIds(prev => [...prev, po.id]);
                                }
                              } else {
                                if (isLinked) {
                                  setPoId('');
                                } else {
                                  setPoId(po.id);
                                }
                              }
                            }}
                            className={`px-2 py-1 text-[11px] font-mono flex items-center gap-1 transition-all ${
                              isLinked 
                                ? 'bg-amber-500 text-white font-bold' 
                                : 'bg-surface hover:bg-surface2 text-primary hover:border-amber-500/50'
                            }`}
                          >
                            <span>{po.id}</span>
                            <span className={isLinked ? 'text-amber-100' : 'text-emerald-500'}>
                              ({formatCurrency(Number(po.totalAmount || 0), true)})
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPo(po);
                            }}
                            className={`px-1.5 py-1 text-[10px] transition-colors border-l ${
                              isLinked
                                ? 'bg-amber-600 text-white border-amber-400 hover:bg-amber-700'
                                : 'bg-surface hover:bg-surface2 text-muted hover:text-primary border-theme-subtle'
                            }`}
                            title={`Preview PO #${po.id}`}
                          >
                            <Eye size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PO Selection (Single vs Multiple Toggle) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted uppercase flex items-center gap-1.5">
                    <Receipt size={13} /> Linked Purchase Order(s)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMultiPoMode(!isMultiPoMode);
                      if (!isMultiPoMode && poId && !selectedPoIds.includes(poId)) {
                        setSelectedPoIds([poId]);
                      }
                    }}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                  >
                    {isMultiPoMode ? <CheckSquare size={11} /> : <Square size={11} />}
                    <span>{isMultiPoMode ? 'Multi-PO Mode: ON' : 'Multi-PO Mode: OFF'}</span>
                  </button>
                </div>

                <POAutocomplete
                  value={isMultiPoMode ? selectedPoIds : poId}
                  multiple={isMultiPoMode}
                  supplierId={supplierId || undefined}
                  pos={pos}
                  bills={bills}
                  filterUnbilledOnly={false}
                  placeholder={
                    supplierId 
                      ? (isMultiPoMode ? "Search & select POs for this vendor..." : "Search & select a PO for this vendor...") 
                      : (isMultiPoMode ? "Search & select POs..." : "Search & select a PO...")
                  }
                  onChange={(val, objs) => {
                    if (isMultiPoMode) {
                      const arr = Array.isArray(val) ? val : [val].filter(Boolean);
                      setSelectedPoIds(arr);
                      if (arr.length > 0 && !poId) setPoId(arr[0]);
                    } else {
                      const singleId = typeof val === 'string' ? val : (val[0] || '');
                      setPoId(singleId);
                      setSelectedPoIds(singleId ? [singleId] : []);
                    }
                    if (objs && objs.length > 0 && !supplierId && objs[0].supplierId) {
                      setSupplierId(objs[0].supplierId);
                    }
                  }}
                />
                <span className="text-[10px] text-muted block">
                  Optional: Leave empty for direct utility, rent, or petty cash expense bills.
                </span>
              </div>

              {/* Vendor Invoice / Reference # */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                  <Hash size={12}/> Vendor Invoice # / Bill Reference *
                </label>
                <input 
                  type="text" 
                  value={invoiceNo} 
                  onChange={e => setInvoiceNo(e.target.value)} 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-bold text-primary focus:border-amber-500" 
                  placeholder="e.g. INV-2024-001 or CEB-ACC-9823412" 
                />
              </div>

              {/* Corresponding GRN (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                  <Layers size={12}/> Corresponding GRN (Optional)
                </label>
                <select 
                  value={grnId} 
                  onChange={e => {
                    const selId = e.target.value;
                    setGrnId(selId);
                    if (selId) {
                      const g = grns.find((x: any) => x.id === selId);
                      if (g) {
                        if (g.supplierId && !supplierId) setSupplierId(g.supplierId);
                        if (g.poId && !poId) {
                          setPoId(g.poId);
                          setSelectedPoIds([g.poId]);
                        }
                      }
                    }
                  }} 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-amber-500"
                >
                  <option value="">-- General / No Specific GRN --</option>
                  {matchingGRNs.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.id} • {g.date?.split('T')[0]} {g.vehicleNo ? `(${g.vehicleNo})` : ''} {!g.poId ? '• [Direct Receipt]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </GlassCard>

            {/* Financials & Dates */}
            <GlassCard className="p-5 border-t-2 border-t-amber-500 space-y-4">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard size={16} /> Financials & Dates
                </span>
                <span className="text-[10px] font-mono text-muted lowercase">step 2</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Calendar size={12}/> Bill Date
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
                    <Calendar size={12}/> Due Date
                  </label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                  />
                </div>
              </div>

              {/* Charge Account (Chart of Accounts) */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={12}/> Charge Account (Chart of Accounts) {lineItems.length > 0 ? <span className="text-[10px] text-muted font-normal lowercase">(applies to all items)</span> : <span className="text-amber-500">*</span>}
                  </span>
                  <span className="text-[10px] text-amber-500 font-mono font-bold">Debited in General Ledger</span>
                </label>
                <AccountAutocomplete
                  value={expenseAccountId}
                  onChange={(accId) => {
                    setExpenseAccountId(accId);
                    if (accId && lineItems.length > 0) {
                      setLineItems(prev => prev.map(it => ({ ...it, accountId: accId })));
                    }
                  }}
                  accounts={accounts}
                  placeholder="Type code or name to search account (e.g. 4000 Raw Materials, 5001 Electricity)..."
                  className="text-xs"
                />
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                  <span>
                    {lineItems.length > 0 
                      ? "Selecting an account above auto-applies it to all items below (or edit per line)." 
                      : "The selected account will be charged (Debited). Accounts Payable (2000) will be credited."}
                  </span>
                  {lineItems.length > 0 && expenseAccountId && (
                    <button
                      type="button"
                      onClick={() => setLineItems(prev => prev.map(it => ({ ...it, accountId: expenseAccountId })))}
                      className="text-amber-500 hover:text-amber-400 font-bold underline shrink-0 ml-2"
                      title="Sync this account to all line items"
                    >
                      Sync to all {lineItems.length} items
                    </button>
                  )}
                </div>
              </div>

              {/* Bill Description / Narration (Especially for utility / service bills with no items) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-muted uppercase flex items-center gap-1.5">
                    <FileText size={12}/> Bill Description / Service Narration {lineItems.length === 0 ? <span className="text-amber-500">*</span> : <span className="text-muted font-normal lowercase">(bill header note)</span>}
                  </label>
                  {lineItems.length === 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ⚡ Direct Service / Utility Mode (No items)
                    </span>
                  )}
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={lineItems.length === 0 ? 3 : 2}
                  placeholder={
                    billCategory.toLowerCase().includes('electricity') || billCategory.toLowerCase().includes('ceb')
                      ? "e.g. CEB Electricity Bill - November 2026, Factory Meter #49201, KWh 4,200, Billing period 01/11 to 30/11..."
                      : billCategory.toLowerCase().includes('water')
                      ? "e.g. NWSDB Water Bill - November 2026, Meter #192004, Main Factory facility..."
                      : billCategory.toLowerCase().includes('fuel') || billCategory.toLowerCase().includes('diesel')
                      ? "e.g. 500L Diesel for Factory Main Generator / Transport vehicle delivery..."
                      : "e.g. Electricity bill / Factory maintenance service / Subcontract machining charges..."
                  }
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs text-primary font-medium focus:border-amber-500 outline-none leading-relaxed"
                />
                <span className="text-[10px] text-muted block mt-0.5">
                  {lineItems.length === 0 
                    ? "Since no item breakdown is added, this description will be recorded in General Ledger & Supplier Statements (e.g. for Electricity, Water, Rent)." 
                    : "Overall summary note for this supplier bill."}
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-muted uppercase">
                    Bill Base Amount (LKR) *
                  </label>
                  {activeLinkedPOs.length > 0 && (
                    <span className="text-[10px] text-muted font-mono">
                      PO Open: {formatCurrency(remainingBalance, true)}
                    </span>
                  )}
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  value={amount || ''} 
                  onChange={e => setAmount(Number(e.target.value))} 
                  className="w-full bg-surface border-2 border-amber-500/50 px-3 py-2.5 rounded-lg text-base font-black text-amber-500 text-right focus:border-amber-500 outline-none font-mono" 
                  placeholder="0.00"
                />
              </div>

              {/* Tax Settings Section */}
              <div className="pt-3 border-t border-theme-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Applicable Taxes (IRD)</span>
                  <label className="text-xs font-semibold text-secondary flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxEnabled}
                      onChange={e => setTaxEnabled(e.target.checked)}
                      className="rounded text-amber-500 h-3.5 w-3.5"
                    />
                    <span>{taxEnabled ? 'Tax Enabled' : 'Tax Disabled'}</span>
                  </label>
                </div>

                {taxEnabled && (
                  <div className="space-y-2 pt-1">
                    {/* Quick IRD Presets */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_vat18'); setHideVatSeparately(false); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          taxProfileId === 'tp_vat18' && !hideVatSeparately
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        VAT Only (18%)<br/><span className="text-[9px] font-normal opacity-80">Separate Line</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_vat18_absorbed'); setHideVatSeparately(true); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          taxProfileId === 'tp_vat18_absorbed' || (taxProfileId === 'tp_vat18' && hideVatSeparately)
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        VAT Absorbed (18%)<br/><span className="text-[9px] font-normal opacity-80">Included / No Line</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_opt2_sscl_absorbed_vat_sep'); setHideVatSeparately(false); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          (taxProfileId === 'tp_opt2_sscl_absorbed_vat_sep' || taxProfileId === 'tp_vat_sscl') && !hideVatSeparately
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        Option 2<br/><span className="text-[9px] font-normal opacity-80">SSCL In, VAT Sep</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_opt1_absorbed'); setHideVatSeparately(true); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          taxProfileId === 'tp_opt1_absorbed'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        Option 1<br/><span className="text-[9px] font-normal opacity-80">Both Absorbed</span>
                      </button>
                    </div>

                    <select
                      value={taxProfileId}
                      onChange={e => {
                        const val = e.target.value;
                        setTaxProfileId(val);
                        if (val === 'tp_vat18_absorbed' || val === 'tp_opt1_absorbed') {
                          setHideVatSeparately(true);
                        }
                      }}
                      className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-medium focus:border-amber-500"
                    >
                      <option value="">No Tax Applied</option>
                      {taxProfiles.map((tp: any) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name} ({tp.tax2_rate || 18}% VAT{tp.tax1_rate ? ` + ${tp.tax1_rate}% SSCL` : ''})
                        </option>
                      ))}
                    </select>

                    <div className="pt-2 border-t border-theme-subtle space-y-1.5 text-[11px]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-secondary font-medium">Tax Inclusive Pricing:</span>
                        <input
                          type="checkbox"
                          checked={isTaxInclusive}
                          onChange={e => setIsTaxInclusive(e.target.checked)}
                          className="rounded text-amber-500 h-3.5 w-3.5"
                        />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-secondary font-medium">Don't Show VAT Separately:</span>
                        <input
                          type="checkbox"
                          checked={hideVatSeparately}
                          onChange={e => setHideVatSeparately(e.target.checked)}
                          className="rounded text-amber-500 h-3.5 w-3.5"
                        />
                      </label>
                    </div>

                    {taxEnabled && taxBreakdown && (
                      <div className="p-2 bg-surface2/60 rounded border border-theme-subtle text-xs space-y-1 font-mono">
                        <div className="flex justify-between items-center text-muted text-[11px]">
                          <span>Subtotal:</span>
                          <span className="text-primary font-bold">{formatCurrency(netSubtotal, true)}</span>
                        </div>
                        {taxBreakdown.tax1Rate > 0 && (
                          <div className="flex justify-between items-center text-muted text-[11px]">
                            <span>{taxBreakdown.tax1Name} ({taxBreakdown.tax1Rate}%):</span>
                            <span className="text-primary">{formatCurrency(taxBreakdown.tax1Amount, true)}</span>
                          </div>
                        )}
                        {taxBreakdown.tax2Rate > 0 && (
                          <div className="flex justify-between items-center text-muted text-[11px]">
                            <span>{taxBreakdown.tax2Name} ({taxBreakdown.tax2Rate}%):</span>
                            <span className="text-primary">{formatCurrency(taxBreakdown.tax2Amount, true)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-theme-subtle font-black text-amber-500 text-sm">
                          <span>Total Bill Consideration:</span>
                          <span>{formatCurrency(grandTotalBillValue, true)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Line Items & Item-by-Item Cost Distribution */}
          <GlassCard className="p-5 border-t-2 border-t-rex-500 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Layers size={16} className="text-rex-500" />
                  Bill Line Items & Cost Allocation (Line-by-Line Accounts)
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Allocate each item, raw material, or service to its specific expense / asset account in the General Ledger.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {grnId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => loadItemsFromGRN(grnId)}
                    className="text-xs border border-theme-subtle text-amber-500 hover:text-amber-600"
                    title="Reload item list and unit costs from the selected GRN"
                  >
                    Load from GRN ({grnId})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={addLineItem}
                  className="text-xs bg-rex-600 hover:bg-rex-700 text-white"
                >
                  + Add Item / Service
                </Button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-theme-subtle rounded-lg overflow-x-auto bg-surface/40">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-surface2/70 border-b border-theme-subtle text-[10px] uppercase font-bold text-muted tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Item / Service Description</th>
                    <th className="py-2.5 px-3 w-24 text-right">Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Cost (LKR)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Total (LKR)</th>
                    <th className="py-2.5 px-3 min-w-[250px]">Charge Account (Chart of Accounts)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="text-xs font-medium">No individual line items added.</p>
                          <p className="text-[11px] text-muted leading-relaxed">
                            {grnId ? (
                              <span>Click <strong>"Load from GRN ({grnId})"</strong> above to automatically pull received items, or click <strong>"+ Add Item / Service"</strong> to specify services line-by-line.</span>
                            ) : (
                              <span>Click <strong>"+ Add Item / Service"</strong> above to itemize this bill across multiple expense accounts, or leave empty to charge the entire bill to the Default Account.</span>
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-theme-subtle/50 hover:bg-surface2/30 transition-colors">
                        <td className="py-2.5 px-3 text-center text-muted font-mono align-top pt-3.5">{idx + 1}</td>
                        <td className="py-2.5 px-3 align-top min-w-[280px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted">
                              <span className="font-semibold text-secondary">Description / Details:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = item.description || '';
                                  const prefix = cur ? (cur.endsWith('\n') ? '• ' : '\n• ') : '• ';
                                  updateLineItem(item.id, 'description', cur + prefix);
                                }}
                                className="px-1.5 py-0.5 rounded bg-surface2 hover:bg-amber-500/10 hover:text-amber-500 font-medium text-[9px] border border-theme-subtle flex items-center gap-1 transition-colors"
                                title="Insert bullet point"
                              >
                                <span>•</span> Add Bullet
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={item.description}
                              onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const textarea = e.currentTarget;
                                  const cursorPos = textarea.selectionStart;
                                  const textBefore = textarea.value.substring(0, cursorPos);
                                  const currentLine = textBefore.split('\n').pop() || '';
                                  if (currentLine.trim().startsWith('•') || currentLine.trim().startsWith('-')) {
                                    e.preventDefault();
                                    const textAfter = textarea.value.substring(cursorPos);
                                    const bulletPrefix = currentLine.trim().startsWith('•') ? '\n• ' : '\n- ';
                                    const newValue = textBefore + bulletPrefix + textAfter;
                                    updateLineItem(item.id, 'description', newValue);
                                    setTimeout(() => {
                                      textarea.selectionStart = textarea.selectionEnd = cursorPos + bulletPrefix.length;
                                    }, 0);
                                  }
                                }
                              }}
                              placeholder="e.g. Mild Steel Sheet 4mm (4x8)&#10;• High tensile grade&#10;• Prime quality certified"
                              className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs text-primary font-medium focus:border-amber-500 outline-none leading-relaxed resize-y min-h-[64px]"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right align-top pt-3.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.qty}
                            onChange={e => updateLineItem(item.id, 'qty', e.target.value)}
                            className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-mono font-medium focus:border-rex-500 outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right align-top pt-3.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={e => updateLineItem(item.id, 'unitCost', e.target.value)}
                            className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-mono font-medium focus:border-rex-500 outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary align-top pt-4">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-2.5 px-3 align-top pt-3.5">
                          <AccountAutocomplete
                            value={item.accountId}
                            onChange={accId => updateLineItem(item.id, 'accountId', accId)}
                            placeholder="Search account (4000, 5002, 7000)..."
                            className="text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center align-top pt-4">
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Remove Line Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {lineItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-surface2/60 border-t border-theme-subtle font-bold text-xs">
                      <td colSpan={4} className="py-2.5 px-3 text-right text-muted uppercase tracking-wider">
                        Total Line Items:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary text-sm font-black">
                        {formatCurrency(lineItems.reduce((s: number, it: any) => s + Number(it.total || 0), 0))}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-[11px] text-muted italic">
                        Allocated across {new Set(lineItems.map((it: any) => it.accountId).filter(Boolean)).size} account(s)
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </GlassCard>

          {/* Vendor Bill / Invoice Document Attachment */}
          <GlassCard className="p-5 border-t-2 border-t-emerald-500 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Paperclip size={16} /> Vendor Invoice / Bill Copy Attachment
              </h2>
              <span className="text-[10px] text-muted font-mono">PDF, PNG, JPG (Max 25MB)</span>
            </div>

            {billAttachment ? (
              <div className="flex items-center justify-between p-3 bg-surface border border-theme-subtle rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 rounded">
                    {billAttachment.startsWith('data:image/') || billAttachment.match(/\.(jpeg|jpg|png|webp)($|\?)/i) ? (
                      <img src={billAttachment} alt="Bill Preview" className="w-full h-full object-cover rounded" />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-primary block truncate">
                      {billAttachmentName || (invoiceNo ? `Vendor_Invoice_${invoiceNo}` : 'Vendor_Bill_Document')}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 size={11} /> Document attached • Ready to save
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openDataUriOrUrl(billAttachment, `Vendor Invoice - ${invoiceNo || docNo}`)}
                    className="text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1.5 h-auto flex items-center gap-1"
                    title="View Document"
                  >
                    <Eye size={14} /> View
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setBillAttachment(''); setBillAttachmentName(''); }}
                    className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5 h-auto flex items-center gap-1"
                    title="Remove Attachment"
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-theme-subtle hover:border-emerald-500 bg-surface2/30 hover:bg-surface2/60 cursor-pointer transition-colors text-center rounded-lg">
                  <UploadCloud size={24} className="text-emerald-500 mb-1" />
                  <span className="text-xs font-semibold text-primary">Click or drag & drop to upload Vendor's Bill / Invoice Copy</span>
                  <span className="text-[10px] text-muted mt-0.5">Scanned paper bill, electricity bill, utility receipt, PDF, or JPG</span>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
                {isUploading && (
                  <p className="text-[10px] text-amber-500 mt-1 font-mono text-center">Uploading document to storage...</p>
                )}
              </div>
            )}
          </GlassCard>

          {/* Previous Invoices Table for Linked POs */}
          {activePoBills.length > 0 && (
            <GlassCard className="p-5 border-t-2 border-t-blue-500 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-2">
                  <History size={16} /> Existing Bills Recorded for Linked PO(s) ({activePoBills.length})
                </h3>
                <span className="text-xs text-muted">
                  Cumulative Total: <strong className="text-primary font-mono">{formatCurrency(combinedBilledSoFar, true)}</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-theme-subtle text-muted text-[10px] uppercase font-bold">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Bill ID</th>
                      <th className="py-2 px-3">Vendor Invoice #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle font-mono">
                    {activePoBills.map((b: any, index: number) => (
                      <tr key={b.id} className="hover:bg-surface2/40">
                        <td className="py-2 px-3 text-muted">{index + 1}</td>
                        <td className="py-2 px-3 font-semibold text-primary">{b.id}</td>
                        <td className="py-2 px-3 text-amber-500 font-bold">{b.invoiceNo || '-'}</td>
                        <td className="py-2 px-3 text-muted">{b.date ? b.date.split('T')[0] : '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-primary">{formatCurrency(Number(b.amount || 0), true)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-sans uppercase font-bold ${b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-400'}`}>
                            {b.status || 'unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Remarks & Notes (When line items present) */}
          {lineItems.length > 0 && (
            <GlassCard className="p-5">
              <label className="block text-[11px] font-bold text-muted uppercase mb-2">Additional Accounting Notes / Remarks</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={2} 
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                placeholder="e.g. Advance 30% on PO / Final settlement note..." 
              />
            </GlassCard>
          )}

        </div>
      </div>

      {/* Read-Only PO Preview Modal */}
      {previewPo && (
        <Modal 
          isOpen={!!previewPo} 
          onClose={() => setPreviewPo(null)} 
          title={`Purchase Order Preview - #${previewPo.id}`} 
          size="xl"
        >
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">A4 Vector Document Preview (Read-Only)</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('po-print-section', `PO_${previewPo.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2 text-xs"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => printElement('po-print-section', `PO_${previewPo.id}`)}
                  className="text-xs"
                >
                  Print PO
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto">
              <POPrintView 
                po={previewPo} 
                supplier={suppliers.find((s: any) => s.id === previewPo.supplierId) || { company: previewPo.supplierName, name: previewPo.supplierName }} 
                settings={settings} 
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
