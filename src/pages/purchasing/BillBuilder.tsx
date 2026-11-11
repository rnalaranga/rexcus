import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, CreditCard, Building2, Calendar, 
  FileText, CheckCircle2, AlertTriangle, Layers, DollarSign, 
  History, ExternalLink, Hash, Receipt, Paperclip, UploadCloud, Eye, Trash2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGRNs, usePurchaseOrders, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { useTaxProfiles } from '@/hooks/useFinance';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
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

  const [docNo, setDocNo] = useState(idParam || ('BILL-' + Date.now().toString().slice(-4)));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState(poIdParam || '');
  const [grnId, setGrnId] = useState(grnIdParam || '');
  const [amount, setAmount] = useState<number>(0);
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

  // If opened with ?id=, load existing bill data
  useEffect(() => {
    if (idParam && bills.length > 0) {
      const existing = bills.find((b: any) => b.id === idParam);
      if (existing) {
        setDocNo(existing.id);
        setInvoiceNo(existing.invoiceNo || '');
        setSupplierId(existing.supplierId || '');
        setPoId(existing.poId || '');
        setGrnId(existing.grnId || '');
        setAmount(Number(existing.amount || 0));
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
    }
  }, [idParam, poIdParam]);

  // If opened with ?grn=, set GRN and PO and inherit bill attachment & tax config if present
  useEffect(() => {
    if (!idParam && grnIdParam && grns.length > 0) {
      const grn = grns.find((g: any) => g.id === grnIdParam);
      if (grn) {
        setGrnId(grn.id);
        if (grn.poId) setPoId(grn.poId);
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

  // When PO changes, sync supplier and compute default amount
  const selectedPO = useMemo(() => {
    return pos.find((p: any) => p.id === poId);
  }, [poId, pos]);

  // Find all previous bills for the selected PO (Multiple Invoices per PO)
  const poBills = useMemo(() => {
    if (!poId) return [];
    return bills.filter((b: any) => b.poId === poId);
  }, [poId, bills]);

  const poTotalAmount = useMemo(() => {
    return Number(selectedPO?.totalAmount || 0);
  }, [selectedPO]);

  const totalBilledSoFar = useMemo(() => {
    return poBills.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
  }, [poBills]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, Number((poTotalAmount - totalBilledSoFar).toFixed(2)));
  }, [poTotalAmount, totalBilledSoFar]);

  // Set supplier from selected PO
  useEffect(() => {
    if (selectedPO && selectedPO.supplierId) {
      setSupplierId(selectedPO.supplierId);
    }
  }, [selectedPO]);

  // Calculate default amount based on GRN or remaining balance
  useEffect(() => {
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

        if (calculatedAmt > 0) {
          setAmount(Number(calculatedAmt.toFixed(2)));
          return;
        }
      }
    }

    // Default to remaining balance if available and amount is 0
    if (remainingBalance > 0 && amount === 0) {
      setAmount(remainingBalance);
    }
  }, [grnId, grns, selectedPO, remainingBalance]);

  // Find GRNs matching the selected PO or Supplier
  const matchingGRNs = useMemo(() => {
    if (!poId) {
      if (supplierId) {
        return grns.filter((g: any) => g.supplierId === supplierId);
      }
      return grns;
    }
    return grns.filter((g: any) => {
      if (g.poId === poId) return true;
      if (Array.isArray(g.poIds) && g.poIds.includes(poId)) return true;
      if (typeof g.poIds === 'string' && g.poIds.includes(poId)) return true;
      return false;
    });
  }, [poId, supplierId, grns]);

  // Available POs (optionally filtered if supplier is already selected)
  const availablePOs = useMemo(() => {
    if (!supplierId) return pos;
    return pos.filter((p: any) => p.supplierId === supplierId);
  }, [supplierId, pos]);

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

    setSaving(true);
    try {
      const payload: any = { 
        id: docNo, 
        supplierId, 
        poId: poId || null, 
        grnId: grnId || null, 
        invoiceNo: invoiceNo.trim(), 
        date, 
        dueDate: dueDate || null, 
        amount: grandTotalBillValue, 
        subtotal: netSubtotal,
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
      navigate('/purchasing?tab=bill');
    } catch (e: any) {
      alert('Failed to save supplier bill: ' + (e.message || 'Unknown error'));
      setSaving(false);
    }
  };

  const getSupplierName = (id: string) => suppliers.find((s: any) => s.id === id)?.name || id;

  const isExceedingBalance = selectedPO && remainingBalance > 0 && amount > remainingBalance;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-primary tracking-tight">
                {idParam ? 'Edit Supplier Bill / Invoice' : 'Record Supplier Bill / Invoice'}
              </h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                {idParam ? 'Editing Existing Bill' : (poBills.length > 0 ? `Invoice #${poBills.length + 1} for PO` : 'New Bill')}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • UNPAID STATUS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchasing')} className="text-xs">
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (idParam ? 'Save Changes' : 'Post to Ledger')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Top Multi-Invoice PO Status Banner (If PO Selected) */}
          {selectedPO && (
            <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-500/[0.03]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                      <Receipt size={14} /> Linked Purchase Order: {selectedPO.id}
                    </span>
                    <Badge 
                      value={totalBilledSoFar >= poTotalAmount - 0.01 && poTotalAmount > 0 ? 'Fully Billed' : totalBilledSoFar > 0 ? 'Partially Billed' : 'Unbilled'} 
                      size="sm" 
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Vendor: <strong className="text-primary">{getSupplierName(selectedPO.supplierId)}</strong> • Date: {selectedPO.date?.split('T')[0]}
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center gap-3 bg-surface/60 border border-theme-subtle p-2.5 rounded-lg">
                  <div className="text-right px-2 border-r border-theme-subtle">
                    <div className="text-[10px] uppercase font-bold text-muted">PO Total</div>
                    <div className="text-xs font-black text-primary font-mono">{formatCurrency(poTotalAmount, true)}</div>
                  </div>
                  <div className="text-right px-2 border-r border-theme-subtle">
                    <div className="text-[10px] uppercase font-bold text-muted">Billed ({poBills.length} inv)</div>
                    <div className="text-xs font-black text-amber-500 font-mono">{formatCurrency(totalBilledSoFar, true)}</div>
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
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <Building2 size={16} /> Vendor & References
              </h2>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  Select Purchase Order (Optional for Direct Bills)
                </label>
                <select 
                  value={poId} 
                  onChange={e => {
                    setPoId(e.target.value);
                    setGrnId('');
                  }} 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-amber-500"
                >
                  <option value="">-- No Linked PO (Direct Bill) --</option>
                  {availablePOs.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.id} • {getSupplierName(p.supplierId)} • {formatCurrency(Number(p.totalAmount || 0), true)} ({p.billingStatus || (p.billedAmount ? 'Partially Billed' : 'Unbilled')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1">
                  Supplier / Vendor *
                </label>
                <SupplierAutocomplete
                  value={supplierId}
                  onChange={sId => {
                    setSupplierId(sId);
                    if (selectedPO && selectedPO.supplierId !== sId) {
                      setPoId('');
                    }
                  }}
                  suppliers={suppliers}
                  placeholder="Type to search vendor / supplier..."
                  className="text-xs py-1.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                  <Hash size={12}/> Vendor Invoice # *
                </label>
                <input 
                  type="text" 
                  value={invoiceNo} 
                  onChange={e => setInvoiceNo(e.target.value)} 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-bold text-primary focus:border-amber-500" 
                  placeholder="e.g. INV-2024-001" 
                />
              </div>

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
                        if (g.poId && !poId) setPoId(g.poId);
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
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <CreditCard size={16} /> Financials & Dates
              </h2>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5">
                  <Calendar size={12}/> Bill / Invoice Date
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
                  <Calendar size={12}/> Payment Due Date
                </label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-muted uppercase">
                    Bill / Invoice Base Amount (LKR) *
                  </label>
                  {selectedPO && (
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Applicable Taxes</span>
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
                    {/* 6 IRD Quick Tax Preset Buttons */}
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
                        VAT Absorbed (18%)<br/><span className="text-[9px] font-normal opacity-80">Added / Not Separate</span>
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
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_opt3_both_separate'); setHideVatSeparately(false); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          taxProfileId === 'tp_opt3_both_separate'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        Option 3<br/><span className="text-[9px] font-normal opacity-80">Both 2 Lines</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTaxProfileId('tp_opt4_sscl_included_vat_sep'); setHideVatSeparately(false); }}
                        className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center leading-tight ${
                          taxProfileId === 'tp_opt4_sscl_included_vat_sep' || selectedTaxProfile?.name?.toLowerCase().includes('sscl included')
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-surface2 text-muted hover:text-primary border-theme-subtle'
                        }`}
                      >
                        Option 4<br/><span className="text-[9px] font-normal opacity-80">SSCL In, VAT Sep</span>
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

          {/* Vendor Bill / Invoice Document Attachment */}
          <GlassCard className="p-5 border-t-2 border-t-emerald-500 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Paperclip size={16} /> Vendor Invoice / Bill Attachment
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
                  <span className="text-[10px] text-muted mt-0.5">Supports scanned physical bills, supplier invoices, PDFs, JPG, PNG</span>
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

          {/* Previous Invoices Table for This PO (If any exist) */}
          {poBills.length > 0 && (
            <GlassCard className="p-5 border-t-2 border-t-blue-500 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-2">
                  <History size={16} /> Existing Invoices Recorded for PO: {poId} ({poBills.length})
                </h3>
                <span className="text-xs text-muted">
                  Cumulative Total: <strong className="text-primary font-mono">{formatCurrency(totalBilledSoFar, true)}</strong>
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
                    {poBills.map((b: any, index: number) => (
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

          {/* Remarks & Notes */}
          <GlassCard className="p-5">
            <label className="block text-[11px] font-bold text-muted uppercase mb-2">Remarks / Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3} 
              className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" 
              placeholder="e.g. Advance invoice 30% / Progress billing / Invoice for GRN batch 1..." 
            />
          </GlassCard>

        </div>
      </div>
    </div>
  );
};
