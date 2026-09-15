import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, CreditCard, Building2, Calendar, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useGRNs, usePurchaseOrders } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { createBill } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export const BillBuilder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const grnId = searchParams.get('grn');
  const navigate = useNavigate();
  
  const { data: grns } = useGRNs();
  const { data: pos } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();

  const [docNo] = useState('BILL-' + Date.now().toString().slice(-4));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  const [supplierId, setSupplierId] = useState('');
  const [poId, setPoId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (grnId && grns.length > 0) {
      const grn = grns.find((g: any) => g.id === grnId);
      if (grn) {
        setSupplierId(grn.supplierId);
        setPoId(grn.poId);
        const refPo = pos.find((p: any) => p.id === grn.poId);
        if (refPo) setAmount(Number(refPo.totalAmount) || 0);
      }
    }
  }, [grnId, grns, pos]);

  const handleSave = async () => {
    await createBill({ id: docNo, supplierId, poId, grnId: grnId || '', invoiceNo, date, dueDate, amount, notes, status: 'unpaid' });
    navigate('/purchasing');
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchasing')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Record Supplier Bill</h1>
            <p className="text-[11px] text-muted mt-0.5">{docNo} • UNPAID</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Post to Ledger</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassCard className="p-5 border-t-2 border-t-amber-500">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-4">
                <Building2 size={16} /> Vendor & References
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Select Supplier</label>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-medium focus:border-amber-500">
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><FileText size={12}/> Reference PO</label>
                  <input type="text" value={poId} onChange={e => setPoId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono" placeholder="PO Number" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><FileText size={12}/> Vendor Invoice #</label>
                  <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-bold" placeholder="INV-0001" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-t-2 border-t-amber-500">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-4">
                <CreditCard size={16} /> Financials & Dates
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Calendar size={12}/> Bill Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1 flex items-center gap-1.5"><Calendar size={12}/> Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" />
                </div>
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-muted uppercase mb-1">Total Bill Amount</label>
                  <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full bg-surface border-2 border-amber-500/50 px-3 py-3 rounded-lg text-lg font-black text-amber-500 text-right focus:border-amber-500 outline-none" />
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
             <label className="block text-[11px] font-bold text-muted uppercase mb-2">Remarks / Notes</label>
             <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs" placeholder="Add payment instructions or vendor notes here..." />
          </GlassCard>

        </div>
      </div>
    </div>
  );
};
