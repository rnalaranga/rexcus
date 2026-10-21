import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Building2, Calendar, FileText,
  Calculator, AlertCircle, Printer, Eye, Palette, ChevronDown,
  CheckCircle2, Phone, Mail, Hash, X, Landmark
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCustomers, useInventory } from '@/hooks/useData';
import { useTaxes, useTaxProfiles } from '@/hooks/useFinance';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { QuotationTermsPreset, DEFAULT_TERMS_PRESETS } from '@/components/TermsConditionsManager';

export { toWords, formatGazetteDate, TEMPLATES, InvoicePreview } from '@/components/finance/InvoicePreview';
import { InvoicePreview, toWords, formatGazetteDate, TEMPLATES } from '@/components/finance/InvoicePreview';

const docInputClass = "w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500/50 transition-colors";
const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-blue-500 focus:bg-surface px-2 py-1 text-xs outline-none transition-all";

// ─── Main Component ───────────────────────────────────────────────────────────
export const InvoiceBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: taxRates } = useTaxes();
  const { data: taxProfiles } = useTaxProfiles();
  const { data: inventory } = useInventory();
  const { toast, showError } = useDialog();

  const [docNo, setDocNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [attention, setAttention] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxProfileId, setTaxProfileId] = useState('tp_opt2_sscl_absorbed_vat_sep');

  useEffect(() => {
    if (taxProfiles && taxProfiles.length > 0) {
      const currentValid = taxProfiles.some((p: any) => p.id === taxProfileId);
      if (!currentValid) {
        const opt2 = taxProfiles.find((p: any) => p.id === 'tp_opt2_sscl_absorbed_vat_sep' || p.id === 'tp_vat_sscl' || p.name?.toLowerCase().includes('option 2'));
        if (opt2) setTaxProfileId(opt2.id);
        else setTaxProfileId(taxProfiles[0].id);
      }
    }
  }, [taxProfiles]);
  
  // Keep for DB compat if needed, but we'll store taxProfileId explicitly
  const taxType = 'profile';
  
  const [template, setTemplate] = useState('government');
  const [showPreview, setShowPreview] = useState(false);
  const [company, setCompany] = useState<any>({});
  const [deliveryDate, setDeliveryDate] = useState(date);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('Credit');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [quotationNo, setQuotationNo] = useState('');
  const [dispatchNo, setDispatchNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [customerVat, setCustomerVat] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankDetailId, setBankDetailId] = useState<string>('');
  const [termsPresets, setTermsPresets] = useState<QuotationTermsPreset[]>(DEFAULT_TERMS_PRESETS);
  const [selectedTermsPresetId, setSelectedTermsPresetId] = useState<string>('');
  const [items, setItems] = useState([{ id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);

  const [searchParams] = useSearchParams();
  const paramOrderId = searchParams.get('orderId');
  const paramQuoteId = searchParams.get('quoteId');

  useEffect(() => {
    if (!paramOrderId && !paramQuoteId) return;

    const loadSourceData = async () => {
      try {
        if (paramOrderId) {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finished-goods-orders`);
          const orders = await res.json();
          const ord = orders.find((o: any) => String(o.id) === String(paramOrderId) || String(o.orderNo) === String(paramOrderId));
          if (ord) {
            if (ord.customerId) setCustomerId(ord.customerId);
            if (ord.orderNo) setOrderNo(ord.orderNo);
            if (ord.quotationNo) setQuotationNo(ord.quotationNo);
            if (ord.gatePassNo) setDispatchNo(ord.gatePassNo);
            if (ord.targetDeliveryDate) setDeliveryDate(ord.targetDeliveryDate.slice(0, 10));
            if (ord.paymentTerms) setNotes(ord.paymentTerms);

            let parsedItems: any[] = [];
            if (ord.items) {
              try {
                parsedItems = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
              } catch (e) {}
            }
            if (parsedItems.length > 0) {
              setItems(parsedItems.map((it: any) => ({
                id: crypto.randomUUID(),
                inventoryId: it.productId || it.inventoryId || '',
                description: it.description || it.productName || ord.productName || 'Order Item',
                qty: Number(it.qty) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                taxRateId: ''
              })));
            } else if (ord.productName) {
              setItems([{
                id: crypto.randomUUID(),
                inventoryId: ord.productId || '',
                description: ord.productName,
                qty: Number(ord.qty) || 1,
                unitPrice: Number(ord.unitPrice) || 0,
                taxRateId: ''
              }]);
            }
            toast(`Loaded items from Sales Order ${ord.orderNo}!`, 'success');
          }
        } else if (paramQuoteId) {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${paramQuoteId}`);
          const q = await res.json();
          if (q) {
            const parsed = typeof q.data === 'string' ? JSON.parse(q.data) : (q.data || {});
            if (q.leadId || parsed.leadId) setCustomerId(q.leadId || parsed.leadId);
            if (q.quoNo || q.docNo || parsed.quotationNo) setQuotationNo(q.quoNo || q.docNo || parsed.quotationNo);
            if (parsed.custTerms || parsed.paymentTerms) setNotes(parsed.custTerms || parsed.paymentTerms);

            const qItems = parsed.custItems || parsed.items || [];
            if (qItems.length > 0) {
              setItems(qItems.map((it: any) => ({
                id: crypto.randomUUID(),
                inventoryId: it.productId || it.inventoryId || '',
                description: it.description || it.name || 'Quotation Item',
                qty: Number(it.qty) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                taxRateId: ''
              })));
            }
            toast(`Loaded items from Quotation ${q.quoNo || q.id}!`, 'success');
          }
        }
      } catch (e) {
        console.error('Failed to pre-fill invoice:', e);
      }
    };

    loadSourceData();
  }, [paramOrderId, paramQuoteId]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedBank = bankDetailId === 'none' ? null : (bankAccounts.find(b => b.id === bankDetailId) || null);

  const handleSelectTermsPreset = (presetId: string) => {
    setSelectedTermsPresetId(presetId);
    if (!presetId) return;
    const preset = termsPresets.find(p => p.id === presetId);
    if (preset) {
      if (preset.paymentTerms) setNotes(preset.paymentTerms);
      if (/advance/i.test(preset.paymentTerms)) setModeOfPayment('Advance');
      else if (/credit/i.test(preset.paymentTerms)) setModeOfPayment('Credit');
      else if (/cod|delivery against invoice|cash/i.test(preset.paymentTerms)) setModeOfPayment('Cash');
      else if (/cheque/i.test(preset.paymentTerms)) setModeOfPayment('Cheque');
      else if (/bank\s*transfer/i.test(preset.paymentTerms)) setModeOfPayment('Bank Transfer');
    }
  };

  useEffect(() => {
    if (!notes && termsPresets.length > 0) {
      const def = termsPresets.find(p => p.isDefault) || termsPresets[0];
      if (def) {
        setSelectedTermsPresetId(def.id);
        if (def.paymentTerms) setNotes(def.paymentTerms);
      }
    }
  }, [termsPresets]);

  useEffect(() => {
    if (notes && termsPresets.length > 0) {
      const matched = termsPresets.find(p => p.paymentTerms?.trim().toLowerCase() === notes.trim().toLowerCase());
      if (matched && matched.id !== selectedTermsPresetId) {
        setSelectedTermsPresetId(matched.id);
      }
    }
  }, [notes, termsPresets]);

  const customerOptions = customers.map(c => ({ value: c.id, label: c.company || c.name, group: c.segment || 'Customers', extra: c.email || '' }));
  const itemOptions = inventory.map(i => ({ value: i.id, label: `${i.sku} - ${i.name}`, group: i.category || 'Products', extra: `Stock: ${i.qtyOnHand}` }));

  useEffect(() => {
    // Fetch company settings
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings`)
      .then(r => r.json())
      .then(s => {
        let banks: any[] = [];
        if (s.company_bank_details) {
          try {
            const parsed = JSON.parse(s.company_bank_details);
            if (Array.isArray(parsed) && parsed.length > 0) banks = parsed;
          } catch(e) {}
        }
        if (banks.length === 0) {
          banks = [
            { id: 'bank_hnb', bankName: 'Hatton National Bank', branchName: 'Negombo', accountName: 'Rex Industries (Pvt) Ltd', accountNumber: '011010078028', swiftCode: 'HNBLLKLX', isDefault: true }
          ];
        }
        setBankAccounts(banks);
        const def = banks.find((b: any) => b.isDefault) || banks[0];
        if (def) setBankDetailId(def.id);

        if (s.quotation_terms_presets) {
          try {
            const parsed = JSON.parse(s.quotation_terms_presets);
            if (Array.isArray(parsed) && parsed.length > 0) setTermsPresets(parsed);
          } catch(e) {}
        }

        setCompany({ 
          name: s.company_name || s.companyName || s.name || 'Rex Industries (Pvt) Ltd', 
          address: s.company_address || s.companyAddress || s.address || '', 
          phone: s.company_phone || s.companyPhone || s.phone || '', 
          email: s.company_email || s.companyEmail || s.email || '', 
          vat: s.company_tin || s.tin || s.company_vat || s.companyVat || s.vat || '', 
          tin: s.company_tin || s.tin || s.company_vat || s.companyVat || s.vat || '', 
          company_tin: s.company_tin || s.tin || s.company_vat || s.companyVat || s.vat || '',
          company_address: s.company_address || s.companyAddress || s.address || '',
          company_phone: s.company_phone || s.companyPhone || s.phone || '',
          company_name: s.company_name || s.companyName || s.name || 'Rex Industries (Pvt) Ltd',
          brNumber: s.companyBr || s.brNumber || '', 
          bankName: s.companyBankName || s.bankName || '', 
          accountNo: s.companyAccountNo || s.accountNo || '', 
          company_bank_details: s.company_bank_details || '',
          tagline: s.invoiceTagline || 'Thank you for your business!', 
          logo: s.company_logo || s.companyLogo || '' 
        });
      })
      .catch(() => {});
  }, []);

  // Fetch next invoice number whenever date changes to match IRD YYMMM format
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/invoices/next-number?date=${date}`)
      .then(r => r.json())
      .then(d => { if (d.invoiceNo) setDocNo(d.invoiceNo); })
      .catch(() => {
        const dObj = new Date(date);
        const validD = isNaN(dObj.getTime()) ? new Date() : dObj;
        const yy = validD.getFullYear().toString().slice(-2);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mmm = months[validD.getMonth()];
        setDocNo(`${yy}${mmm}_REX_${Date.now().toString().slice(-5)}`);
      });
  }, [date]);

  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      setDueDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]);
      setCustomerVat(selectedCustomer.vat || '');
      if (selectedCustomer.paymentTerms) {
        setNotes(selectedCustomer.paymentTerms);
        if (/advance/i.test(selectedCustomer.paymentTerms)) setModeOfPayment('Advance');
        else if (/credit/i.test(selectedCustomer.paymentTerms)) setModeOfPayment('Credit');
      } else if (days > 0 && !notes) {
        setNotes(`${days} days credit`);
        setModeOfPayment('Credit');
      }
    } else {
      setCustomerVat('');
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

  const getTaxRate = (id: string) => { return 0; /* Line item taxes no longer used in compound mode, absorbed to global */ };
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  
  let taxAmount = 0;
  let taxBreakdown = { tax1Amount: 0, tax2Amount: 0 };
  const selectedTaxProfile = taxProfiles?.find((p: any) => p.id === taxProfileId);
  
  if (taxEnabled && selectedTaxProfile) {
    const t1Amount = subtotal * (Number(selectedTaxProfile.tax1_rate) / 100);
    const baseForT2 = selectedTaxProfile.tax2_compound ? (subtotal + t1Amount) : subtotal;
    const t2Amount = baseForT2 * (Number(selectedTaxProfile.tax2_rate || 0) / 100);
    
    taxBreakdown = { tax1Amount: t1Amount, tax2Amount: t2Amount };
    taxAmount = t1Amount + t2Amount;
  }
  
  const total = subtotal + taxAmount;
  const isSsclSeparate = Boolean(selectedTaxProfile && selectedTaxProfile.tax1_show_separately === 1);
  const isVatSeparate = Boolean(selectedTaxProfile ? selectedTaxProfile.tax2_show_separately === 1 : (taxAmount > 0));
  const isTaxShownSeparately = Boolean(
    taxEnabled && (
      (isVatSeparate && (taxBreakdown.tax2Amount > 0 || taxAmount > 0)) ||
      (isSsclSeparate && taxBreakdown.tax1Amount > 0)
    )
  );
  const creditWarning = selectedCustomer && Number(selectedCustomer.creditLimit) > 0 && (Number(selectedCustomer.totalRevenue || 0) + total > Number(selectedCustomer.creditLimit));

  const handleSave = async () => {
    if (!customerId) return showError('Please select a customer.');
    if (items.some(i => !i.description)) return showError('Please enter a description for all items.');
    const cleanDocNo = (docNo || '').trim().replace(/\s+/g, '');
    if (!cleanDocNo) return showError('Please provide a valid invoice number.');
    try {
      const res = await createInvoice({ 
        id: cleanDocNo, 
        invoiceNo: cleanDocNo, 
        customerId, 
        leadId: customerId, 
        attention, 
        date, 
        dueDate: dueDate || null, 
        items: JSON.stringify(items), 
        subtotal, 
        taxAmount, 
        total, 
        amount: total, 
        notes, 
        status: 'Unpaid', 
        deliveryDate: deliveryDate || null, 
        placeOfSupply, 
        modeOfPayment,
        additionalInfo,
        quotationNo, 
        dispatchNo, 
        orderNo, 
        poNo, 
        customerVat, 
        taxType, 
        taxProfileId, 
        taxBreakdown: JSON.stringify(taxBreakdown),
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null)
      });
      if ((res as any).error) throw new Error((res as any).error);

      // If created from a sales order, link invoice details back to the order
      if (paramOrderId) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finished-goods-orders/${paramOrderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: cleanDocNo, invoiceNo: cleanDocNo })
          });
        } catch (linkErr) {
          console.error('Failed to update sales order with invoice link:', linkErr);
        }
      }

      toast('Invoice posted successfully!', 'success');
      navigate('/finance/invoices');
    } catch (e: any) { showError(e.message || 'Failed to post invoice.'); }
  };

  const handlePrint = () => {
    const content = document.getElementById('invoice-preview');
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${docNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #fff;
      color: #000;
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      display: block !important;
      width: 100%;
    }
    #invoice-preview {
      width: 210mm !important;
      min-height: 297mm !important;
      padding: 12mm 15mm !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      background: #fff !important;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        background: #fff !important;
      }
      #invoice-preview {
        width: 210mm !important;
        margin: 0 auto !important;
        padding: 12mm 15mm !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  ${content.outerHTML}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 350);
  };

  const previewProps = { 
    template, 
    docNo, 
    date, 
    dueDate, 
    deliveryDate, 
    placeOfSupply, 
    modeOfPayment,
    additionalInfo,
    quotationNo, 
    dispatchNo, 
    orderNo, 
    poNo, 
    customer: selectedCustomer, 
    customerVat, 
    items, 
    subtotal, 
    taxAmount, 
    total, 
    notes, 
    company, 
    getTaxRate, 
    taxRates, 
    taxType, 
    taxProfile: selectedTaxProfile, 
    taxBreakdown, 
    attention,
    bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null)
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative animate-fade-in">

      {/* ── TOP BAR (matches QuotationBuilder style) ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance/invoices')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Invoice Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">{selectedCustomer ? (selectedCustomer.company || selectedCustomer.name) : 'New Invoice'}</p>
          </div>
        </div>

        {/* Center — Invoice No badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md font-bold border border-blue-500/20">{docNo}</span>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 whitespace-nowrap shrink-0">
            <CheckCircle2 size={13} /> Gazette No. 2481/22
          </div>
          <button onClick={() => setShowPreview(p => !p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${showPreview ? 'bg-surface2 border-blue-500/50 text-blue-500' : 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2'}`}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Printer size={14} /> Print
          </button>
          <Button variant="primary" icon={Save} onClick={handleSave} className="text-xs">
            Post Invoice
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {showPreview ? (
        /* Preview Mode — Full screen white paper */
        <div className="flex-1 overflow-y-auto bg-slate-200/60 dark:bg-zinc-800/60 p-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto mb-4">
            <p className="text-xs text-muted uppercase tracking-widest font-semibold">
              Preview — Statutory {isTaxShownSeparately ? 'Tax Invoice' : 'Invoice'} (Gazette No. 2481/22)
            </p>
            <button onClick={() => setShowPreview(false)} className="flex items-center gap-1.5 text-xs text-muted hover:text-primary px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 border border-theme-subtle hover:bg-surface transition-colors">
              <X size={12} /> Close Preview
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl mx-auto text-black">
            <InvoicePreview {...previewProps} />
          </div>
        </div>
      ) : (
        /* Builder Mode — Full-width like QuotationBuilder */
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Row 1 — Bill To + Invoice Details (side by side, full width) */}
          <div className="grid grid-cols-3 gap-5">
            {/* Bill To */}
            <GlassCard className="col-span-2 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" /> Bill To — Customer
                </h2>
                <button type="button" onClick={() => navigate('/crm/customers')} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 hover:bg-blue-500/10 transition-colors">
                  <Plus size={10} /> Add New Customer
                </button>
              </div>

              {/* Search row */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Select Customer</label>
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} placeholder="Search customer…" />
              </div>

              {/* Customer detail card — only shown when selected */}
              {selectedCustomer && (
                <div className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-black text-sm">{(selectedCustomer.company || selectedCustomer.name || '?')[0].toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{selectedCustomer.company || selectedCustomer.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      {selectedCustomer.name && selectedCustomer.company && (
                        <span className="text-[10px] text-muted">{selectedCustomer.name}</span>
                      )}
                      {selectedCustomer.email && (
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Mail size={9} className="text-blue-400" />{selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Phone size={9} className="text-blue-400" />{selectedCustomer.phone}
                        </span>
                      )}
                      {Number(selectedCustomer.creditDays) > 0 && (
                        <span className="text-[10px] text-emerald-500 font-semibold">Net {selectedCustomer.creditDays} Days</span>
                      )}
                    </div>
                  </div>
                  {/* VAT field */}
                  <div className="flex-shrink-0 w-44">
                    <label className="text-[9px] font-bold text-muted uppercase block mb-1">Purchaser VAT / TIN</label>
                    <input
                      type="text"
                      value={customerVat}
                      onChange={e => setCustomerVat(e.target.value)}
                      placeholder="VAT number…"
                      className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-md text-xs outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Warnings */}
              {(selectedCustomer?.requiresAdvance || creditWarning) && (
                <div className="mt-2 space-y-1.5">
                  {selectedCustomer?.requiresAdvance && (
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span><strong>Advance Payment Required</strong> — Collect upfront before processing.</span>
                    </div>
                  )}
                  {creditWarning && (
                    <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>⚠ Exceeds credit limit of {formatCurrency(selectedCustomer!.creditLimit)}.</span>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Invoice Details */}
            <GlassCard className="p-4 flex flex-col">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-blue-500" /> Details & References
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                <div className="bg-surface2/50 border border-theme-subtle rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-muted uppercase">{isTaxShownSeparately ? 'Tax Invoice No.' : 'Invoice No.'}</label>
                    <span className="text-[9px] font-mono font-semibold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                      YYMMM_QQQQ_XXXXX
                    </span>
                  </div>
                  <input
                    type="text"
                    value={docNo}
                    onChange={e => setDocNo(e.target.value.replace(/\s+/g, ''))}
                    placeholder="26OCT_REX_00001"
                    className={`${docInputClass} font-mono font-bold text-blue-500 tracking-wide`}
                  />
                  <p className="text-[9px] text-muted leading-tight">
                    Complies with IRD Sri Lanka standards (No spaces, max 40 chars).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Date of Invoice</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={docInputClass} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Date of Supply</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Place of Supply *</label>
                    <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="e.g. Negombo" className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Mode of Payment *</label>
                    <select value={modeOfPayment} onChange={e => setModeOfPayment(e.target.value)} className={docInputClass}>
                      <option value="Credit">Credit</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                      <option value="Online Payment">Online Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Attention To</label>
                    <div className="relative">
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={`${docInputClass} pr-7`} />
                      {selectedCustomer && (selectedCustomer.contacts?.length > 0 || selectedCustomer.name) && (
                        <>
                          <select 
                            className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
                            onChange={e => e.target.value && setAttention(e.target.value)}
                            title="Select from contacts"
                            value=""
                          >
                            <option value="">(Select Contact)</option>
                            {selectedCustomer.name && <option value={selectedCustomer.name}>{selectedCustomer.name} (Primary)</option>}
                            {(selectedCustomer.contacts || []).map((c: any, i: number) => (
                               <option key={i} value={`${c.name}${c.designation ? ` - ${c.designation}` : ''}`}>{c.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted border-l border-theme-subtle pl-1.5 flex items-center justify-center">
                             <ChevronDown size={14} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Account for Remittance */}
                <div className="bg-surface2/30 p-2.5 rounded-lg border border-theme-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-muted uppercase flex items-center gap-1.5">
                      <Landmark size={12} className="text-rex-500" /> Remittance Bank Account
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/settings')}
                      className="text-[9px] text-blue-500 hover:underline font-semibold"
                    >
                      + Manage Banks in Settings
                    </button>
                  </div>
                  <select
                    value={bankDetailId}
                    onChange={e => setBankDetailId(e.target.value)}
                    className={`${docInputClass} font-medium`}
                  >
                    {bankAccounts.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} — A/C {b.accountNumber} ({b.branchName || 'Main'}{b.isDefault ? ' · Default' : ''})
                      </option>
                    ))}
                    <option value="none">— Do Not Show Bank Details on Invoice —</option>
                  </select>
                  {selectedBank && (
                    <div className="text-[10px] text-muted flex items-center justify-between px-1">
                      <span><strong>A/C Name:</strong> {selectedBank.accountName}</span>
                      {selectedBank.swiftCode && <span><strong>SWIFT:</strong> {selectedBank.swiftCode}</span>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Additional Information if any *</label>
                  <textarea 
                    value={additionalInfo} 
                    onChange={e => setAdditionalInfo(e.target.value)} 
                    rows={2} 
                    className={`${docInputClass} resize-none`} 
                    placeholder="Custom statutory notes (optional — auto-generates from PO/Order/Quotation/Notes if left empty)" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-theme-subtle pt-2 mt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Quotation No</label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} placeholder="AHSQ-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Dispatch No</label>
                    <input type="text" value={dispatchNo} onChange={e => setDispatchNo(e.target.value)} placeholder="DN-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Order No (SO)</label>
                    <input type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="SO-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">PO No</label>
                    <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="PO-..." className={docInputClass} />
                  </div>
                </div>

                <div className="border-t border-theme-subtle pt-2 mt-1 space-y-2">
                  <div className="bg-surface2/40 border border-theme-subtle/60 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                        <FileText size={12} className="text-blue-500" />
                        Terms & Conditions Preset
                      </label>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/settings')}
                        className="text-[9px] text-blue-500 hover:underline font-semibold"
                      >
                        + Manage Presets
                      </button>
                    </div>
                    <select
                      value={selectedTermsPresetId}
                      onChange={e => handleSelectTermsPreset(e.target.value)}
                      className={`${docInputClass} font-medium text-xs`}
                    >
                      <option value="">-- Choose Preset (Payment & Delivery Terms) --</option>
                      {termsPresets.map((tp: any) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name} ({tp.validity || tp.paymentTerms}) {tp.isDefault ? '★ (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-muted uppercase">Payment Terms / Notes</label>
                      {notes && <span className="text-[9px] text-emerald-500 font-semibold">Active on Invoice</span>}
                    </div>
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows={2} 
                      className={`${docInputClass} resize-none font-medium`} 
                      placeholder="e.g. 30 days from date of delivery / 50% Advance with confirmed PO" 
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Row 2 — Line Items (full width) */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-theme-subtle flex items-center justify-between bg-surface/40">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <FileText size={16} className="text-blue-500" /> Line Items
              </h2>
              <span className="text-[10px] font-mono text-muted">{items.length} line{items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/30">
                    <th className="px-5 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-8">#</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-52">Product / Service</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider">Description</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-20 text-center">Qty</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-32">Unit Price (Rs)</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-32">Tax</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider text-right w-32">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lineAmt = item.qty * item.unitPrice;
                    const lineTax = lineAmt * (getTaxRate(item.taxRateId) / 100);
                    return (
                      <tr key={item.id} className={`border-b border-theme-subtle last:border-0 group hover:bg-surface2/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-surface2/10'}`}>
                        <td className="px-5 py-2 text-[10px] text-muted font-mono">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <SearchableSelect value={item.inventoryId} onChange={val => handleChangeItem(item.id, 'inventoryId', val)} options={itemOptions} placeholder="Select or skip..." className="text-xs" />
                        </td>
                        <td className="px-2 py-2">
                          <textarea value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} placeholder="Description…\n(Multiple lines allowed)" className={`${tableInputClass} resize-none overflow-hidden min-h-[40px] leading-relaxed`} rows={2} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="1" value={item.qty} onChange={e => handleChangeItem(item.id, 'qty', Number(e.target.value))} className={`${tableInputClass} text-center`} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleChangeItem(item.id, 'unitPrice', Number(e.target.value))} className={`${tableInputClass} font-mono`} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.taxRateId} onChange={e => handleChangeItem(item.id, 'taxRateId', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-blue-500 px-2 py-1 text-xs outline-none transition-all">
                            <option value="">No Tax</option>
                            {taxRates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right text-xs font-mono font-semibold text-primary">{formatCurrency(lineAmt + lineTax)}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-theme-subtle flex items-center justify-between">
              <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItem} className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10 text-xs">
                Add Line Item
              </Button>
              <div className="text-[10px] text-muted">
                Tab through cells to navigate quickly
              </div>
            </div>
          </GlassCard>

          {/* Row 3 — Totals Summary (right-aligned wide card) */}
          <div className="flex justify-end">
            <GlassCard className="p-6 bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20 w-96">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-5">
                <Calculator size={16} /> Invoice Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(subtotal)}</span>
                </div>
                <div className="py-2 border-t border-theme-subtle space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Applicable Taxes</span>
                    <button
                      type="button"
                      onClick={() => setTaxEnabled(t => !t)}
                      className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}
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
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
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
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          Option 2<br/><span className="text-[9px] font-normal opacity-80">SSCL In, VAT Sep</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxProfileId('tp_opt3_both_separate')}
                          className={`col-span-2 p-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            taxProfileId === 'tp_opt3_both_separate'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-surface2 text-muted hover:text-primary border-theme-subtle/70'
                          }`}
                        >
                          Option 3<br/><span className="text-[9px] font-normal opacity-80">Both 2 Lines (SSCL & VAT Separate)</span>
                        </button>
                      </div>
                      <select value={taxProfileId} onChange={e => setTaxProfileId(e.target.value)} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500/50">
                        <option value="">No Tax Applied</option>
                        {(taxProfiles || []).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {taxAmount > 0 && selectedTaxProfile && (
                  <div className="space-y-1 py-1 text-xs">
                    {selectedTaxProfile.tax1_show_separately === 0 && selectedTaxProfile.tax2_show_separately === 0 ? (
                      <div className="flex justify-between items-center text-muted">
                        <span>Taxes Absorbed (SSCL {selectedTaxProfile.tax1_rate}% + VAT {selectedTaxProfile.tax2_rate}%)</span>
                        <span className="font-mono text-emerald-500 font-semibold">{formatCurrency(taxAmount)} (Included)</span>
                      </div>
                    ) : (
                      <>
                        {selectedTaxProfile.tax1_show_separately === 1 && (
                          <div className="flex justify-between items-center text-muted">
                            <span>{selectedTaxProfile.tax1_name} ({selectedTaxProfile.tax1_rate}%)</span>
                            <span className="font-mono text-amber-500">+{formatCurrency(taxBreakdown.tax1Amount)}</span>
                          </div>
                        )}
                        {selectedTaxProfile.tax1_show_separately === 0 && (
                          <div className="flex justify-between items-center text-muted">
                            <span>{selectedTaxProfile.tax1_name} ({selectedTaxProfile.tax1_rate}%)</span>
                            <span className="font-mono text-emerald-500">+{formatCurrency(taxBreakdown.tax1Amount)} (Absorbed)</span>
                          </div>
                        )}
                        {selectedTaxProfile.tax2_show_separately === 1 && (
                          <div className="flex justify-between items-center text-muted">
                            <span>{selectedTaxProfile.tax2_name} ({selectedTaxProfile.tax2_rate}%)</span>
                            <span className="font-mono text-amber-500">+{formatCurrency(taxBreakdown.tax2Amount)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t border-blue-500/30 flex justify-between items-center">
                  <span className="text-base font-black text-primary uppercase tracking-wide">Grand Total</span>
                  <span className="text-3xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </GlassCard>
          </div>

        </div>
      )}
    </div>
  );
};
