import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Printer, Building2, Truck, FileText, Calculator, ShieldCheck } from 'lucide-react';
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
  const mrId = searchParams.get('mr');
  const { data: inventory } = useInventory();

  const [docNo, setDocNo] = useState('PO-' + Date.now().toString().slice(-4));
  const [status, setStatus] = useState('DRAFT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [supplierId, setSupplierId] = useState('');
  const [supplierDetails, setSupplierDetails] = useState({ contact: '', email: '', phone: '', address: '' });
  
  const [expectedDate, setExpectedDate] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Standard Delivery');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  
  const [items, setItems] = useState<{ id: string, inventoryId: string, desc: string, qty: number, unitPrice: number, taxRate: number, discount: number, total: number }[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. Please send two copies of your invoice.\n2. Enter this order in accordance with the prices, terms, delivery method, and specifications listed above.\n3. Please notify us immediately if you are unable to ship as specified.');

  useEffect(() => {
    if (supplierId) {
      const sup = suppliers.find((s: any) => s.id === supplierId);
      if (sup) {
        setSupplierDetails({ contact: sup.contactPerson || '', email: sup.email || '', phone: sup.phone || '', address: sup.address || '' });
      }
    }
  }, [supplierId, suppliers]);

  useEffect(() => {
    if (id) {
      fetchPOs().then(data => {
        const existing = data.find((p: any) => p.id === id);
        if (existing) {
          setDocNo(existing.id);
          setDate(existing.date.split('T')[0]);
          setStatus(existing.status.toUpperCase());
          setExpectedDate(existing.expectedDate ? existing.expectedDate.split('T')[0] : '');
          setSupplierId(existing.supplierId || '');
          const existingItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : existing.items || [];
          setItems(existingItems.map((i: any) => ({ taxRate: 0, discount: 0, ...i })));
          setNotes(existing.notes || '');
          if(existing.shippingCost) setShippingCost(Number(existing.shippingCost));
          if(existing.paymentTerms) setPaymentTerms(existing.paymentTerms);
          if(existing.shippingMethod) setShippingMethod(existing.shippingMethod);
          if(existing.terms) setTerms(existing.terms);
        }
      });
    } else if (mrId && mrs.length > 0) {
      const mr = mrs.find((m: any) => m.id === mrId);
      if (mr) {
        const mrItems = typeof mr.items === 'string' ? JSON.parse(mr.items) : mr.items || [];
        setItems(mrItems.map((i: any) => ({ ...i, unitPrice: 0, taxRate: 0, discount: 0, total: 0 })));
        setNotes(`Generated from Material Request: ${mrId}`);
      }
    }
  }, [id, mrId, mrs]);

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
        const base = updated.qty * updated.unitPrice;
        const afterDiscount = base - updated.discount;
        const taxAmount = afterDiscount * (updated.taxRate / 100);
        updated.total = afterDiscount + taxAmount;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => setItems(items.filter(i => i.id !== itemId));

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = items.reduce((sum, item) => sum + ((item.qty * item.unitPrice - item.discount) * (item.taxRate / 100)), 0);
  const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

  const handleSave = async () => {
    const payload = { id: docNo, supplierId, date, expectedDate, items, subtotal, tax: totalTax, totalAmount: grandTotal, notes, shippingCost, shippingMethod, paymentTerms, terms, status: id ? status.toLowerCase() : 'sent' };
    if (id) await updatePO(id, payload);
    else {
      await createPO(payload);
      if (mrId) await updateMR(mrId, { status: 'ordered' });
    }
    navigate('/purchasing');
  };

  const exportPDF = () => {
    const element = document.getElementById('po-pdf-content');
    if (!element) return;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    document.body.appendChild(clone);
    const opt: any = { margin: 10, filename: `PO_${docNo}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().from(clone).set(opt).save().then(() => document.body.removeChild(clone));
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Purchase Order Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • {status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Printer} onClick={exportPDF}>Export PDF</Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Save Order</Button>
        </div>
      </div>

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          
          {/* LEFT COL (Form) */}
          <div className="xl:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                  <Building2 size={16} /> Vendor Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase mb-1">Select Supplier</label>
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
                        <td className="p-2 text-right align-top"><input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className="w-16 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right font-bold focus:border-primary" /></td>
                        <td className="p-2 text-right align-top"><input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-20 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary" /></td>
                        <td className="p-2 text-right align-top"><input type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', Number(e.target.value))} className="w-16 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary" /></td>
                        <td className="p-2 text-right align-top"><input type="number" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} className="w-12 bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs text-right focus:border-primary" /></td>
                        <td className="p-2 pr-5 text-right align-top pt-4 font-mono font-bold text-xs text-primary">{formatCurrency(item.total)}</td>
                        <td className="p-2 align-top text-center pt-3"><button onClick={() => removeItem(item.id)} className="p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted text-xs">No items added.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <GlassCard className="p-5">
                <label className="block text-[11px] font-bold text-muted uppercase mb-2">Remarks</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
              </GlassCard>
              <GlassCard className="p-5">
                <label className="block text-[11px] font-bold text-muted uppercase mb-2 flex items-center gap-1.5"><ShieldCheck size={12} className="text-amber-500"/> Terms</label>
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
                  <span className="text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && <div className="flex justify-between items-center text-red-500">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>}
                <div className="flex justify-between items-center">
                  <span>Tax Amount</span>
                  <span className="text-foreground">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5">Shipping <Truck size={10}/></span>
                  <input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="w-20 bg-surface border border-theme-subtle px-2 py-1 rounded text-right font-bold focus:border-emerald-500" />
                </div>
                
                <div className="pt-4 border-t border-theme-subtle mt-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Grand Total</span>
                    <span className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Button variant="primary" icon={Save} onClick={handleSave} className="w-full">Save Order</Button>
                <Button variant="ghost" icon={Printer} onClick={exportPDF} className="w-full bg-surface border border-theme-subtle">Download PDF</Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      
      {/* Hidden PDF Template for High-Quality Export */}
      <div id="po-pdf-content" style={{ display: 'none', background: 'white', color: 'black', padding: '40px', fontFamily: 'Arial, sans-serif' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1a202c', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#1a202c', letterSpacing: '-1px' }}>PURCHASE ORDER</h1>
              <div style={{ marginTop: '10px', display: 'flex', gap: '30px' }}>
                <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>PO Number</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{docNo}</p></div>
                <div><p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Date</p><p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{date}</p></div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#2b6cb0' }}>REX INDUSTRIES</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#4a5568' }}>123 Industrial Zone, Phase II</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#4a5568' }}>Colombo 08, Sri Lanka</p>
            </div>
         </div>
         {/* Simple printable table here... */}
      </div>
    </div>
  );
};
