import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, CreditCard, Building2, Calendar, 
  FileText, CheckCircle2, AlertTriangle, Layers, DollarSign, 
  History, ExternalLink, Hash, Receipt
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGRNs, usePurchaseOrders, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { createBill } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export const BillBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const grnIdParam = searchParams.get('grn');
  const poIdParam = searchParams.get('po');
  const navigate = useNavigate();
  
  const { data: grns } = useGRNs();
  const { data: pos } = usePurchaseOrders();
  const { data: bills, refetch: refetchBills } = useBills();
  const { data: suppliers } = useSuppliers();

  const [docNo] = useState('BILL-' + Date.now().toString().slice(-4));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState(poIdParam || '');
  const [grnId, setGrnId] = useState(grnIdParam || '');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // If opened with ?po=, set PO immediately
  useEffect(() => {
    if (poIdParam) {
      setPoId(poIdParam);
    }
  }, [poIdParam]);

  // If opened with ?grn=, set GRN and PO
  useEffect(() => {
    if (grnIdParam && grns.length > 0) {
      const grn = grns.find((g: any) => g.id === grnIdParam);
      if (grn) {
        setGrnId(grn.id);
        if (grn.poId) setPoId(grn.poId);
        if (grn.supplierId) setSupplierId(grn.supplierId);
      }
    }
  }, [grnIdParam, grns]);

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
      await createBill({ 
        id: docNo, 
        supplierId, 
        poId: poId || null, 
        grnId: grnId || null, 
        invoiceNo: invoiceNo.trim(), 
        date, 
        dueDate: dueDate || null, 
        amount, 
        notes, 
        status: 'unpaid' 
      });
      navigate('/purchasing');
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
              <h1 className="text-lg font-black text-primary tracking-tight">Record Supplier Bill / Invoice</h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                {poBills.length > 0 ? `Invoice #${poBills.length + 1} for PO` : 'New Bill'}
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
            {saving ? 'Posting...' : 'Post to Ledger'}
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
                    Bill / Invoice Amount (LKR) *
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
                  className="w-full bg-surface border-2 border-amber-500/50 px-3 py-3 rounded-lg text-lg font-black text-amber-500 text-right focus:border-amber-500 outline-none font-mono" 
                  placeholder="0.00"
                />
              </div>
            </GlassCard>
          </div>

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
