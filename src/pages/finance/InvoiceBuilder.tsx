import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Building2, Calendar, FileText, Calculator, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useCustomers, useInventory } from '@/hooks/useData';
import { useTaxes } from '@/hooks/useFinance';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

export const InvoiceBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: taxRates } = useTaxes();
  const { data: inventory } = useInventory();
  const { toast, showError } = useDialog();
  
  const [docNo] = useState('INV-' + Date.now().toString().slice(-4));
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState([{ id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);
  
  // Find selected customer
  const selectedCustomer = customers.find(c => c.id === customerId);

  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      const newDue = new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0];
      setDueDate(newDue);
      if (selectedCustomer.vat) {
        setNotes((prev) => prev.includes('Customer VAT') ? prev : `Customer VAT: ${selectedCustomer.vat}\n` + prev);
      }
    }
  }, [selectedCustomer?.id, date]);

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);
  };
  
  const handleRemoveItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };
  
  const handleChangeItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      if (field === 'inventoryId') {
        const invItem = inventory.find(inv => inv.id === value);
        if (invItem) {
          updated.description = invItem.name;
          updated.unitPrice = Number(invItem.unitPrice) || 0;
        }
      }
      return updated;
    }));
  };

  const getTaxRate = (taxRateId: string) => {
    const tax = taxRates.find((t: any) => t.id === taxRateId);
    return tax ? Number(tax.rate) : 0;
  };

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice * (getTaxRate(item.taxRateId)/100)), 0);
  const total = subtotal + taxAmount;

  const creditWarning = selectedCustomer && Number(selectedCustomer.creditLimit) > 0 && (Number(selectedCustomer.totalRevenue || 0) + total > Number(selectedCustomer.creditLimit));

  const handleSave = async () => {
    if (!customerId) return showError('Please select a customer.');
    if (items.some(i => !i.description)) return showError('Please enter a description for all items.');

    try {
      const payload = {
        id: docNo,
        customerId,
        date,
        dueDate,
        items: JSON.stringify(items),
        subtotal,
        taxAmount,
        total,
        amount: total, // For legacy compatibility
        notes,
        status: 'Unpaid',
      };
      
      const res = await createInvoice(payload);
      if (res.error) throw new Error(res.error);
      
      toast('Invoice posted successfully!', 'success');
      navigate('/finance/invoices');
    } catch (e: any) {
      showError(e.message || 'Failed to post invoice.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative animate-fade-in">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance/invoices')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Create Invoice</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Post Invoice</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="max-w-5xl mx-auto space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassCard className="p-5 border-t-2 border-t-blue-500">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-4">
                <Building2 size={16} /> Bill To
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-muted uppercase">Select Customer</label>
                    <button type="button" onClick={() => navigate('/crm/customers')} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
                      <Plus size={10} /> Add New
                    </button>
                  </div>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm focus:border-blue-500 outline-none">
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2 text-[11px] text-muted space-y-0.5">
                      {selectedCustomer.vat && <p>VAT: <span className="font-mono">{selectedCustomer.vat}</span></p>}
                      {selectedCustomer.svat && <p>SVAT: <span className="font-mono">{selectedCustomer.svat}</span></p>}
                      {Number(selectedCustomer.creditLimit) > 0 && <p>Credit Limit: <span className="font-mono">{formatCurrency(selectedCustomer.creditLimit)}</span></p>}
                      {Number(selectedCustomer.creditDays) > 0 && <p>Terms: <span className="font-mono">{selectedCustomer.creditDays} Days</span></p>}
                    </div>
                  )}
                  {creditWarning && (
                    <div className="mt-2 flex items-start gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-xs">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <p>Warning: This invoice exceeds the customer's credit limit of {formatCurrency(selectedCustomer.creditLimit)}.</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-t-2 border-t-blue-500">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-4">
                <Calendar size={16} /> Invoice Dates
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Invoice Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-0 overflow-hidden">
             <div className="p-4 border-b border-theme-subtle flex justify-between items-center bg-surface/30">
               <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                 <FileText size={16} className="text-blue-500" /> Line Items
               </h2>
             </div>
             <div className="p-4 overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead>
                   <tr className="border-b border-theme-subtle">
                     <th className="pb-2 text-xs font-bold text-muted uppercase w-48">Product / Service</th>
                     <th className="pb-2 text-xs font-bold text-muted uppercase">Description</th>
                     <th className="pb-2 text-xs font-bold text-muted uppercase w-24">Qty</th>
                     <th className="pb-2 text-xs font-bold text-muted uppercase w-32">Unit Price</th>
                     <th className="pb-2 text-xs font-bold text-muted uppercase w-32">Tax</th>
                     <th className="pb-2 text-xs font-bold text-muted uppercase text-right w-32">Amount</th>
                     <th className="pb-2 w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-theme-subtle">
                   {items.map((item, index) => (
                     <tr key={item.id} className="group">
                       <td className="py-2 pr-2">
                         <select value={item.inventoryId} onChange={e => handleChangeItem(item.id, 'inventoryId', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-blue-500 px-2 py-1.5 rounded text-sm outline-none">
                           <option value="">-- Custom --</option>
                           {inventory?.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                         </select>
                       </td>
                       <td className="py-2 pr-2">
                         <input type="text" value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} placeholder="Item or Service Description" className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-blue-500 px-2 py-1.5 rounded text-sm outline-none" />
                       </td>
                       <td className="py-2 pr-2">
                         <input type="number" min="1" value={item.qty} onChange={e => handleChangeItem(item.id, 'qty', Number(e.target.value))} className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-blue-500 px-2 py-1.5 rounded text-sm outline-none" />
                       </td>
                       <td className="py-2 pr-2">
                         <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleChangeItem(item.id, 'unitPrice', Number(e.target.value))} className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-blue-500 px-2 py-1.5 rounded text-sm outline-none" />
                       </td>
                       <td className="py-2 pr-2">
                          <select value={item.taxRateId} onChange={e => handleChangeItem(item.id, 'taxRateId', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-theme-subtle focus:border-blue-500 px-2 py-1.5 rounded text-xs outline-none">
                            <option value="">No Tax</option>
                            {taxRates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                          </select>
                       </td>
                       <td className="py-2 text-right text-sm font-mono font-medium">
                         {formatCurrency(item.qty * item.unitPrice)}
                       </td>
                       <td className="py-2 text-right">
                         <button onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded disabled:opacity-30">
                           <Trash2 size={14} />
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="mt-4">
                 <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItem} className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10">Add Line Item</Button>
               </div>
             </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GlassCard className="p-5">
               <label className="block text-[11px] font-bold text-muted uppercase mb-2">Notes / Terms</label>
               <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500" placeholder="Payment terms, delivery instructions, etc..." />
            </GlassCard>

            <GlassCard className="p-6 bg-blue-500/5 border-blue-500/20">
               <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-4">
                 <Calculator size={16} /> Summary
               </h2>
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-muted">Subtotal</span>
                   <span className="font-mono">{formatCurrency(subtotal)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-muted">Tax Amount</span>
                   <span className="font-mono">{formatCurrency(taxAmount)}</span>
                 </div>
                 <div className="pt-3 border-t border-blue-500/20 flex justify-between items-center">
                   <span className="text-base font-black text-primary uppercase">Grand Total</span>
                   <span className="text-xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                 </div>
               </div>
            </GlassCard>
          </div>
          
        </div>
      </div>
    </div>
  );
};
