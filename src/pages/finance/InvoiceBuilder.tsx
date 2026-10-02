import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Building2, Calendar, FileText,
  Calculator, AlertCircle, Printer, Eye, Palette, ChevronDown,
  CheckCircle2, Phone, Mail, Hash
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCustomers, useInventory } from '@/hooks/useData';
import { useTaxes } from '@/hooks/useFinance';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

// ─── Template Definitions ────────────────────────────────────────────────────
const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'Clean minimal black & white', color: '#1e1e2e', accent: '#2563eb' },
  { id: 'modern',  name: 'Modern',  description: 'Bold header with gradient',  color: '#0f172a', accent: '#b91c1c' },
  { id: 'elegant', name: 'Elegant', description: 'Light & professional',        color: '#374151', accent: '#059669' },
];

// ─── Print Preview ────────────────────────────────────────────────────────────
const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, customer, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates }) => {
  const tmpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
  const headerBg = template === 'modern' ? `linear-gradient(135deg, ${tmpl.color} 0%, #1e3a5f 100%)` : template === 'elegant' ? '#f8fafc' : '#fff';
  const headerText = template === 'elegant' ? tmpl.color : '#fff';
  const borderColor = tmpl.accent + '33';

  return (
    <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1a1a2e', fontSize: 11, lineHeight: 1.5, minHeight: 900 }}>
      {/* Header */}
      <div style={{ background: headerBg, padding: '28px 32px', borderBottom: `3px solid ${tmpl.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {company.logo && <img src={company.logo} alt="Logo" style={{ height: 40, marginBottom: 8 }} />}
            <div style={{ color: headerText, fontWeight: 800, fontSize: 18 }}>{company.name || 'Your Company'}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.address}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.phone ? `Tel: ${company.phone}` : ''}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.email ? `Email: ${company.email}` : ''}</div>
            {company.vat && <div style={{ color: headerText + 'cc', fontSize: 10 }}>VAT: {company.vat}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: tmpl.accent, fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>INVOICE</div>
            <div style={{ color: headerText + 'cc', fontWeight: 700, fontSize: 13, marginTop: 4 }}>{docNo}</div>
            <div style={{ color: headerText + 'aa', fontSize: 10, marginTop: 2 }}>Date: {date}</div>
            <div style={{ color: headerText + 'aa', fontSize: 10 }}>Due: {dueDate}</div>
          </div>
        </div>
      </div>

      {/* Bill To + Payment */}
      <div style={{ padding: '20px 32px', display: 'flex', gap: 32, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tmpl.accent, textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
          {customer ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{customer.name}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.company}</div>
              {customer.email && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.email}</div>}
              {customer.phone && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.phone}</div>}
              {customer.address && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.address}</div>}
              {customer.vat && <div style={{ color: '#6b7280', fontSize: 10 }}>VAT: {customer.vat}</div>}
            </>
          ) : <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Select a customer…</div>}
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tmpl.accent, textTransform: 'uppercase', marginBottom: 6 }}>Payment Info</div>
          {company.bankName && <div style={{ fontSize: 10, color: '#6b7280' }}>Bank: {company.bankName}</div>}
          {company.accountNo && <div style={{ fontSize: 10, color: '#6b7280' }}>Acc: {company.accountNo}</div>}
          {company.brNumber && <div style={{ fontSize: 10, color: '#6b7280' }}>BR: {company.brNumber}</div>}
        </div>
      </div>

      {/* Line Items */}
      <div style={{ padding: '16px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: tmpl.accent + '15', borderBottom: `2px solid ${tmpl.accent}` }}>
              {['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: h === 'Amount' || h === 'Unit Price' ? 'right' : h === 'Qty' ? 'center' : 'left', fontWeight: 700, color: tmpl.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const tax = taxRates.find((t: any) => t.id === item.taxRateId);
              const lineTotal = item.qty * item.unitPrice;
              const lineTax = lineTotal * (getTaxRate(item.taxRateId) / 100);
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${borderColor}`, background: idx % 2 === 0 ? 'transparent' : '#f9fafb' }}>
                  <td style={{ padding: '7px 6px', color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 6px', fontWeight: 500 }}>{item.description || '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6b7280' }}>{tax ? `${tax.name} (${tax.rate}%)` : '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(lineTotal + lineTax)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '0 32px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          {[['Subtotal', subtotal], ['Tax', taxAmount]].map(([label, val]: any) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
              <span style={{ color: '#6b7280' }}>{label}</span>
              <span style={{ fontFamily: 'monospace' }}>{formatCurrency(val)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: tmpl.accent, borderRadius: 6, marginTop: 6 }}>
            <span style={{ color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'monospace' }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ padding: '0 32px 20px' }}>
          <div style={{ padding: '12px 16px', background: tmpl.accent + '0d', borderLeft: `3px solid ${tmpl.accent}`, borderRadius: '0 4px 4px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: tmpl.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notes & Terms</div>
            <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{notes}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '12px 32px', textAlign: 'center', color: '#9ca3af', fontSize: 9 }}>
        {company.tagline || 'Thank you for your business!'}
      </div>
    </div>
  );
};

// ─── Template Picker ──────────────────────────────────────────────────────────
const TemplatePicker: React.FC<{ current: string; onChange: (id: string) => void; onClose: () => void }> = ({ current, onChange, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-surface border border-theme rounded-2xl shadow-glass p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
      <h2 className="text-base font-bold text-primary mb-1 flex items-center gap-2"><Palette size={18} className="text-rex-500" /> Print Templates</h2>
      <p className="text-xs text-muted mb-4">Choose a layout for printing / PDF export</p>
      <div className="space-y-3">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => { onChange(t.id); onClose(); }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${current === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-theme-subtle hover:border-theme hover:bg-surface2'}`}
          >
            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: t.color }}>
              <div className="w-5 h-0.5 rounded-full" style={{ background: t.accent }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-primary">{t.name}</div>
              <div className="text-xs text-muted">{t.description}</div>
            </div>
            {current === t.id && <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0" />}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="mt-4 w-full text-center text-xs text-muted hover:text-primary py-2">Close</button>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const [template, setTemplate] = useState('classic');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [company, setCompany] = useState<any>({});
  const [items, setItems] = useState([{ id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name} (${c.company})`, group: c.segment || 'Customers', extra: c.email || '' }));
  const itemOptions = inventory.map(i => ({ value: i.id, label: `${i.sku} - ${i.name}`, group: i.category || 'Products', extra: `Stock: ${i.qtyOnHand}` }));

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings`)
      .then(r => r.json())
      .then(s => setCompany({ name: s.companyName || 'Your Company', address: s.companyAddress || '', phone: s.companyPhone || '', email: s.companyEmail || '', vat: s.companyVat || '', brNumber: s.companyBr || '', bankName: s.companyBankName || '', accountNo: s.companyAccountNo || '', tagline: s.invoiceTagline || 'Thank you for your business!', logo: s.companyLogo || '' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      setDueDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]);
      if (selectedCustomer.vat) setNotes(prev => prev.includes('Customer VAT') ? prev : `Customer VAT: ${selectedCustomer.vat}\n` + prev);
    }
  }, [selectedCustomer?.id, date]);

  const handleAddItem = () => setItems([...items, { id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);
  const handleRemoveItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const handleChangeItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const u = { ...i, [field]: value };
      if (field === 'inventoryId') {
        const inv = inventory.find(x => x.id === value);
        if (inv) { u.description = inv.name; u.unitPrice = Number(inv.unitPrice) || 0; }
      }
      return u;
    }));
  };

  const getTaxRate = (id: string) => { const t = taxRates.find((x: any) => x.id === id); return t ? Number(t.rate) : 0; };
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  const total = subtotal + taxAmount;
  const creditWarning = selectedCustomer && Number(selectedCustomer.creditLimit) > 0 && (Number(selectedCustomer.totalRevenue || 0) + total > Number(selectedCustomer.creditLimit));

  const handleSave = async () => {
    if (!customerId) return showError('Please select a customer.');
    if (items.some(i => !i.description)) return showError('Please enter a description for all items.');
    try {
      const res = await createInvoice({ id: docNo, customerId, date, dueDate, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid' });
      if ((res as any).error) throw new Error((res as any).error);
      toast('Invoice posted successfully!', 'success');
      navigate('/finance/invoices');
    } catch (e: any) { showError(e.message || 'Failed to post invoice.'); }
  };

  const handlePrint = () => {
    const content = document.getElementById('invoice-preview');
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docNo}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}@media print{body{margin:0}}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  const previewProps = { template, docNo, date, dueDate, customer: selectedCustomer, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden animate-fade-in">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/70 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance/invoices')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-base font-black text-primary tracking-tight">New Invoice</h1>
            <p className="text-[10px] text-muted font-mono">{docNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplatePicker(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-subtle text-xs text-muted hover:text-primary hover:border-theme transition-colors">
            <Palette size={13} /> Template <ChevronDown size={11} />
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${showPreview ? 'border-blue-500 bg-blue-500/10 text-blue-600' : 'border-theme-subtle text-muted hover:border-theme hover:text-primary'}`}>
            <Eye size={13} /> {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-subtle text-xs text-muted hover:text-primary hover:border-theme transition-colors">
            <Printer size={13} /> Print
          </button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>Post Invoice</Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Panel */}
        <div className={`overflow-y-auto transition-all duration-300 ${showPreview ? 'w-[52%] border-r border-theme-subtle' : 'w-full'}`}>
          <div className="p-5 max-w-3xl mx-auto space-y-4">

            <div className="grid grid-cols-2 gap-4">
              {/* Bill To */}
              <GlassCard className="p-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5 mb-3"><Building2 size={13} /> Bill To</h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-muted uppercase">Customer</label>
                      <button type="button" onClick={() => navigate('/crm/customers')} className="text-[9px] text-blue-500 hover:underline flex items-center gap-0.5"><Plus size={9} /> New</button>
                    </div>
                    <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} placeholder="Search customer…" />
                  </div>
                  {selectedCustomer && (
                    <div className="p-3 bg-surface2/60 rounded-xl border border-theme-subtle space-y-1">
                      <p className="text-xs font-semibold text-primary">{selectedCustomer.company}</p>
                      {selectedCustomer.email && <p className="text-[10px] text-muted flex items-center gap-1"><Mail size={9}/>{selectedCustomer.email}</p>}
                      {selectedCustomer.phone && <p className="text-[10px] text-muted flex items-center gap-1"><Phone size={9}/>{selectedCustomer.phone}</p>}
                      {selectedCustomer.vat && <p className="text-[10px] text-muted flex items-center gap-1"><Hash size={9}/>VAT: {selectedCustomer.vat}</p>}
                      {Number(selectedCustomer.creditDays) > 0 && <p className="text-[10px] text-emerald-500 font-semibold mt-1">Terms: {selectedCustomer.creditDays} Days</p>}
                    </div>
                  )}
                  {selectedCustomer?.requiresAdvance && (
                    <div className="flex items-start gap-1.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-[10px]">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span><strong>Advance Required</strong> — collect before processing.</span>
                    </div>
                  )}
                  {creditWarning && (
                    <div className="flex items-start gap-1.5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[10px]">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>Exceeds credit limit of {formatCurrency(selectedCustomer!.creditLimit)}</span>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Details */}
              <GlassCard className="p-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5 mb-3"><Calendar size={13} /> Invoice Details</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase block mb-1">Invoice No.</label>
                    <div className="input-base font-mono text-sm bg-surface2/50 text-primary/80">{docNo}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase block mb-1">Date</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full input-base text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase block mb-1">Due Date</label>
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full input-base text-sm" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Line Items */}
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-subtle flex justify-between items-center bg-surface/50">
                <h2 className="text-sm font-bold text-primary flex items-center gap-2"><FileText size={14} className="text-blue-500" /> Line Items</h2>
                <span className="text-[10px] text-muted">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-surface2/40 border-b border-theme-subtle">
                      {[['Product / Service', 'w-44'], ['Description', ''], ['Qty', 'w-20 text-center'], ['Unit Price', 'w-28'], ['Tax', 'w-28'], ['Amount', 'w-28 text-right'], ['', 'w-9']].map(([h, cls], i) => (
                        <th key={i} className={`px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-wider ${cls}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const lineAmt = item.qty * item.unitPrice;
                      const lineTax = lineAmt * (getTaxRate(item.taxRateId) / 100);
                      return (
                        <tr key={item.id} className={`border-b border-theme-subtle last:border-0 group ${idx % 2 === 0 ? '' : 'bg-surface2/20'}`}>
                          <td className="px-4 py-2">
                            <SearchableSelect value={item.inventoryId} onChange={val => handleChangeItem(item.id, 'inventoryId', val)} options={itemOptions} placeholder="Search…" className="text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} placeholder="Description…" className="w-full bg-transparent text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-surface px-2 py-1 rounded transition-colors" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="1" value={item.qty} onChange={e => handleChangeItem(item.id, 'qty', Number(e.target.value))} className="w-full bg-transparent text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-surface px-2 py-1 rounded text-center transition-colors" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleChangeItem(item.id, 'unitPrice', Number(e.target.value))} className="w-full bg-transparent text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-surface px-2 py-1 rounded font-mono transition-colors" />
                          </td>
                          <td className="px-2 py-2">
                            <select value={item.taxRateId} onChange={e => handleChangeItem(item.id, 'taxRateId', e.target.value)} className="w-full bg-surface border border-theme-subtle px-2 py-1 rounded text-xs outline-none focus:border-blue-500">
                              <option value="">No Tax</option>
                              {taxRates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-mono font-semibold">{formatCurrency(lineAmt + lineTax)}</td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-1 text-muted hover:text-red-500 hover:bg-red-500/10 rounded disabled:opacity-20">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-theme-subtle">
                <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItem} className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10 text-xs">Add Line</Button>
              </div>
            </GlassCard>

            {/* Notes + Summary */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4">
                <label className="text-[10px] font-bold text-muted uppercase block mb-2">Notes / Terms</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500 resize-none" placeholder="Payment terms, delivery info, thank you…" />
              </GlassCard>
              <GlassCard className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5 mb-4"><Calculator size={13} /> Summary</h2>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Tax</span><span className="font-mono text-amber-500">{formatCurrency(taxAmount)}</span></div>
                  <div className="pt-3 border-t border-blue-500/30 flex justify-between items-center">
                    <span className="text-sm font-black text-primary uppercase tracking-wide">Total</span>
                    <span className="text-2xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                  </div>
                </div>
              </GlassCard>
            </div>

          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="flex-1 overflow-y-auto bg-slate-200/60 dark:bg-zinc-800/60 p-6">
            <p className="text-center text-[10px] text-muted mb-3 uppercase tracking-widest">Live Preview — {TEMPLATES.find(t => t.id === template)?.name}</p>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-2xl mx-auto text-black">
              <InvoicePreview {...previewProps} />
            </div>
          </div>
        )}
      </div>

      {showTemplatePicker && <TemplatePicker current={template} onChange={setTemplate} onClose={() => setShowTemplatePicker(false)} />}
    </div>
  );
};
