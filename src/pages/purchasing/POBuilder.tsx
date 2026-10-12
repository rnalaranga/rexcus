import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Printer, Building2, Truck, FileText, 
  Calculator, ShieldCheck, GitPullRequest, CheckCircle2, XCircle, ExternalLink 
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSuppliers, useInventory } from '@/hooks/useData';
import { createPO, updatePO, fetchPOs, updateMR } from '@/lib/api';
import { useMaterialRequests } from '@/hooks/usePurchasing';
import { formatCurrency } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const POBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: suppliers } = useSuppliers();
  const { data: mrs } = useMaterialRequests();
  const [searchParams] = useSearchParams();
  const mrParam = searchParams.get('mr');
  const { data: inventory } = useInventory();

  const [docNo, setDocNo] = useState('PO-' + Date.now().toString().slice(-4));
  const [status, setStatus] = useState('DRAFT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [supplierId, setSupplierId] = useState('');
  const [supplierDetails, setSupplierDetails] = useState({ contact: '', email: '', phone: '', address: '', vat: '', svat: '', brNumber: '' });
  
  const [selectedMrId, setSelectedMrId] = useState<string>(mrParam || '');

  const [expectedDate, setExpectedDate] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Standard Delivery');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  
  const [items, setItems] = useState<{ id: string, inventoryId: string, desc: string, qty: number, unitPrice: number, taxRate: number, discount: number, total: number }[]>([]);
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
          if (existing.mrId) setSelectedMrId(existing.mrId);
          const existingItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : existing.items || [];
          setItems(existingItems.map((i: any) => ({ taxRate: 0, discount: 0, ...i })));
          setNotes(existing.notes || '');
          if (existing.shippingCost) setShippingCost(Number(existing.shippingCost));
          if (existing.paymentTerms) setPaymentTerms(existing.paymentTerms);
          if (existing.shippingMethod) setShippingMethod(existing.shippingMethod);
          if (existing.terms) setTerms(existing.terms);
        }
      });
    }
  }, [id]);

  // Handle MR loading (from query param or initial state)
  useEffect(() => {
    if (!id && mrParam && mrs.length > 0 && inventory.length > 0) {
      loadFromMR(mrParam);
    }
  }, [id, mrParam, mrs, inventory]);

  const loadFromMR = (targetMrId: string) => {
    if (!targetMrId) {
      setSelectedMrId('');
      return;
    }
    const mr = mrs.find((m: any) => m.id === targetMrId);
    if (!mr) return;

    setSelectedMrId(mr.id);
    if (mr.requiredDate && !expectedDate) {
      setExpectedDate(mr.requiredDate.split('T')[0]);
    }
    const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : (mr.items || []);
    const populated = mrItems.map((i: any) => {
      const inv = inventory.find((x: any) => x.id === i.inventoryId);
      const unitPrice = Number(inv?.unitCost) || 0;
      const qty = Number(i.qty) || 1;
      const discount = 0;
      const taxRate = 0;
      const total = qty * unitPrice;
      return {
        id: i.id || Date.now().toString() + Math.random().toString().slice(2, 6),
        inventoryId: i.inventoryId || '',
        desc: i.desc || inv?.name || '',
        qty,
        unitPrice,
        taxRate,
        discount,
        total
      };
    });
    setItems(populated);
    
    const mrNote = `Generated from Material Request: ${mr.id} (${mr.department} Dept - Requested by: ${mr.requestedBy})`;
    if (!notes.includes(mr.id)) {
      setNotes(prev => prev ? `${prev}\n${mrNote}` : mrNote);
    }
  };

  const addItem = () => setItems([...items, { id: Date.now().toString(), inventoryId: '', desc: '', qty: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 }]);

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'inventoryId') {
          const invItem = inventory.find(i => i.id === value);
          if (invItem) {
            updated.desc = invItem.name;
            updated.unitPrice = Number(invItem.unitCost) || 0;
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
  const totalTax = items.reduce((sum, item) => sum + ((((Number(item.qty) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))) * ((Number(item.taxRate) || 0) / 100)), 0);
  const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

  const handleSave = async () => {
    if (!supplierId) {
      alert('Please select a supplier before saving the Purchase Order.');
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        id: docNo, 
        mrId: selectedMrId || null,
        supplierId, 
        date, 
        expectedDate, 
        items, 
        subtotal, 
        tax: totalTax, 
        totalAmount: grandTotal, 
        notes, 
        shippingCost, 
        shippingMethod, 
        paymentTerms, 
        terms, 
        status: id ? status.toLowerCase() : 'sent' 
      };

      if (id) {
        await updatePO(id, payload);
      } else {
        await createPO(payload);
        if (selectedMrId) {
          await updateMR(selectedMrId, { status: 'ordered', poId: docNo });
        }
      }
      navigate('/purchasing');
    } catch (e) {
      console.error(e);
      alert('Failed to save Purchase Order');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = () => {
    const element = document.getElementById('po-pdf-content');
    if (!element) return;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    document.body.appendChild(clone);
    const opt: any = { 
      margin: 10, 
      filename: `PO_${docNo}.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    html2pdf().from(clone).set(opt).save().then(() => document.body.removeChild(clone));
  };

  const selectedMrData = mrs.find((m: any) => m.id === selectedMrId);
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
                'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {docNo} {selectedMrId ? `• Linked to MR: ${selectedMrId}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Printer} onClick={exportPDF}>Export PDF</Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* MATERIAL REQUEST BANNER IF LINKED */}
      {selectedMrId && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <GitPullRequest size={15} />
            <span>
              Originating Request: <strong>{selectedMrId}</strong> 
              {selectedMrData && ` (${selectedMrData.department} Dept • Requested by ${selectedMrData.requestedBy})`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/purchasing/mr-builder/${selectedMrId}`)}
              className="text-xs font-bold underline hover:text-blue-300 flex items-center gap-1"
            >
              View MR <ExternalLink size={11} />
            </button>
            {!id && (
              <button 
                onClick={() => setSelectedMrId('')}
                className="text-xs text-red-400 hover:text-red-300 ml-2"
                title="Unlink MR"
              >
                Unlink
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          
          {/* LEFT COL (Form) */}
          <div className="xl:col-span-2 space-y-5">

            {/* SOURCE MATERIAL REQUEST SELECTOR (IF NOT ALREADY LOADED OR EDITING) */}
            {!id && (
              <GlassCard className="p-4 border-l-4 border-l-blue-500 bg-surface/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GitPullRequest size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-primary">Import from Approved Material Request</h3>
                      <p className="text-[11px] text-muted">Select an approved request to auto-populate materials, quantities and reference specs.</p>
                    </div>
                  </div>
                  <div className="w-full sm:w-72">
                    <select 
                      value={selectedMrId} 
                      onChange={e => loadFromMR(e.target.value)}
                      className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs font-medium focus:border-blue-500"
                    >
                      <option value="">-- Standalone PO (No MR) --</option>
                      {mrs
                        .filter((m: any) => m.status === 'approved' || m.status === 'pending' || m.id === selectedMrId)
                        .map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.id} - {m.department} Dept ({m.priority} Priority)
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                  <Building2 size={16} /> Vendor Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Select Supplier *</label>
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm font-medium focus:border-primary">
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
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
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Ship Via</label>
                      <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                        <option>Standard Delivery</option>
                        <option>Express</option>
                        <option>Vendor Truck</option>
                        <option>Pickup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase mb-1">Payment</label>
                      <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm">
                        <option>Due on Receipt</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 60</option>
                        <option>Advance 50%</option>
                      </select>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
              <div className="px-5 py-3 border-b border-theme-subtle bg-surface/30 flex justify-between items-center">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <FileText size={16} /> Line Items
                </h2>
                <Button variant="ghost" size="sm" icon={Plus} onClick={addItem} className="text-primary hover:bg-primary/10">Add Row</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-theme-subtle">
                    <tr className="text-[10px] uppercase tracking-widest text-muted">
                      <th className="px-5 py-3">Material / Item</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Price</th>
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
                            <select value={item.inventoryId} onChange={e => updateItem(item.id, 'inventoryId', e.target.value)} className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-medium focus:border-primary">
                              <option value="">-- Material --</option>
                              {inventory.map(i => <option key={i.id} value={i.id}>{i.sku ? `[${i.sku}] ` : ''}{i.name}</option>)}
                            </select>
                            <input type="text" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} placeholder="Description..." className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-theme-subtle px-2 py-1 rounded text-[11px]" />
                          </div>
                        </td>
                        <td className="p-2 text-right align-top">
                          <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className="w-16 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-primary" />
                        </td>
                        <td className="p-2 text-right align-top">
                          <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-24 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary font-mono" />
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
                <div className="flex justify-between items-center">
                  <span>Tax Amount</span>
                  <span className="text-foreground font-mono">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">Shipping <Truck size={10}/></span>
                  <input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="w-20 bg-surface border border-theme-subtle px-2 py-1 rounded text-right font-bold focus:border-emerald-500 font-mono" />
                </div>
                
                <div className="pt-4 border-t border-theme-subtle mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Grand Total</span>
                    <span className="text-2xl font-black text-emerald-500 tracking-tighter font-mono">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Saving Order...' : 'Save Order'}
                </Button>
                <Button variant="ghost" icon={Printer} onClick={exportPDF} className="w-full bg-surface border border-theme-subtle">
                  Download PDF
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      
      {/* Hidden Corporate PDF Template for High-Quality Export */}
      <div id="po-pdf-content" style={{ display: 'none', background: 'white', color: 'black', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1a202c', paddingBottom: '20px', marginBottom: '25px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: '#1a202c', letterSpacing: '-0.5px' }}>PURCHASE ORDER</h1>
              <div style={{ marginTop: '10px', display: 'flex', gap: '25px' }}>
                <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>PO Number</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{docNo}</p></div>
                <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Order Date</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{date}</p></div>
                <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Expected Delivery</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{expectedDate || 'Prompt'}</p></div>
                {selectedMrId && <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Ref Material Req.</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#2b6cb0' }}>{selectedMrId}</p></div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#2b6cb0' }}>REX INDUSTRIES</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#4a5568' }}>123 Industrial Zone, Phase II</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#4a5568' }}>Colombo 08, Sri Lanka</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#4a5568' }}>info@rexindustries.lk • +94 11 234 5678</p>
            </div>
         </div>

         {/* VENDOR & SHIP-TO ROW */}
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', gap: '20px' }}>
           <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', padding: '15px', background: '#f7fafc' }}>
             <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: '#2b6cb0', textTransform: 'uppercase' }}>VENDOR / SUPPLIER</p>
             <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: 'bold' }}>{supplierObj?.name || 'N/A'}</h3>
             {supplierDetails.address && <p style={{ margin: 0, fontSize: '11px', color: '#4a5568' }}>{supplierDetails.address}</p>}
             {supplierDetails.contact && <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#4a5568' }}>Attn: {supplierDetails.contact}</p>}
             {supplierDetails.phone && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#4a5568' }}>Tel: {supplierDetails.phone}</p>}
             {supplierDetails.email && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#4a5568' }}>Email: {supplierDetails.email}</p>}
             {(supplierDetails.vat || supplierDetails.svat || supplierDetails.brNumber) && (
               <div style={{ marginTop: '6px', fontSize: '10px', color: '#718096' }}>
                 {supplierDetails.vat && <span>VAT: {supplierDetails.vat} | </span>}
                 {supplierDetails.svat && <span>SVAT: {supplierDetails.svat} | </span>}
                 {supplierDetails.brNumber && <span>BR: {supplierDetails.brNumber}</span>}
               </div>
             )}
           </div>

           <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', padding: '15px', background: '#f7fafc' }}>
             <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: '#2b6cb0', textTransform: 'uppercase' }}>ORDER SPECIFICATIONS</p>
             <div style={{ fontSize: '11px', lineHeight: '1.6', color: '#4a5568' }}>
               <p style={{ margin: 0 }}><strong>Shipping Method:</strong> {shippingMethod}</p>
               <p style={{ margin: 0 }}><strong>Payment Terms:</strong> {paymentTerms}</p>
               {selectedMrId && <p style={{ margin: 0 }}><strong>Originating MR:</strong> {selectedMrId}</p>}
             </div>
           </div>
         </div>

         {/* ITEMS TABLE */}
         <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#edf2f7', borderBottom: '2px solid #cbd5e0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '30px' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item / Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '60px' }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Unit Price</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '70px' }}>Disc</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '60px' }}>Tax%</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const inv = inventory.find(i => i.id === it.inventoryId);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#718096' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <strong>{inv?.name || it.desc || it.inventoryId}</strong>
                      {it.desc && it.desc !== inv?.name && <div style={{ fontSize: '10px', color: '#718096' }}>{it.desc}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{it.qty}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(Number(it.unitPrice) || 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(it.discount) > 0 ? formatCurrency(Number(it.discount)) : '-'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(it.taxRate) > 0 ? `${it.taxRate}%` : '0%'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(Number(it.total) || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
         </table>

         {/* TOTALS & TERMS */}
         <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '30px' }}>
           <div style={{ flex: 1 }}>
             {notes && (
               <div style={{ marginBottom: '15px', fontSize: '11px', color: '#4a5568', background: '#f7fafc', padding: '10px', borderLeft: '3px solid #2b6cb0' }}>
                 <strong>Notes & Remarks:</strong>
                 <div style={{ whiteSpace: 'pre-line', marginTop: '3px' }}>{notes}</div>
               </div>
             )}
             <div style={{ fontSize: '10px', color: '#718096', whiteSpace: 'pre-line' }}>
               <strong>Terms & Conditions:</strong><br />
               {terms}
             </div>
           </div>

           <div style={{ width: '260px', background: '#f7fafc', padding: '15px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
               <span>Subtotal:</span>
               <span style={{ fontWeight: 'bold' }}>{formatCurrency(subtotal)}</span>
             </div>
             {totalDiscount > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#e53e3e' }}>
                 <span>Discount:</span>
                 <span>-{formatCurrency(totalDiscount)}</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
               <span>Tax Amount:</span>
               <span>{formatCurrency(totalTax)}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
               <span>Shipping:</span>
               <span>{formatCurrency(shippingCost)}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '2px solid #cbd5e0', fontSize: '14px', fontWeight: 900, color: '#2b6cb0' }}>
               <span>Grand Total:</span>
               <span>{formatCurrency(grandTotal)}</span>
             </div>
           </div>
         </div>

         {/* SIGNATURE SECTION */}
         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
           <div style={{ textAlign: 'center', width: '180px' }}>
             <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
             <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Prepared By</p>
             <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>Purchasing Officer</p>
           </div>
           <div style={{ textAlign: 'center', width: '180px' }}>
             <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
             <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Checked By</p>
             <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>Finance Department</p>
           </div>
           <div style={{ textAlign: 'center', width: '180px' }}>
             <div style={{ borderBottom: '1px solid #a0aec0', paddingBottom: '30px' }}></div>
             <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 'bold', color: '#4a5568' }}>Authorized Signatory</p>
             <p style={{ margin: 0, fontSize: '10px', color: '#718096' }}>Managing Director</p>
           </div>
         </div>
      </div>
    </div>
  );
};
