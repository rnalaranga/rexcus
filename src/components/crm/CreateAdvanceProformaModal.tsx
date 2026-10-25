import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileText, CheckCircle, Percent, DollarSign, Calendar, 
  Building2, User, Receipt, ShieldCheck, CreditCard, Sparkles, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { createInvoice } from '@/lib/api';
import { useAccounts, useTaxProfiles } from '@/hooks/useFinance';
import { useCustomers, useLeads, useQuotations } from '@/hooks/useData';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (invoice: any) => void;
  settings?: any;
}

export const CreateAdvanceProformaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  settings
}) => {
  const { toast } = useDialog();
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const { data: taxProfiles = [] } = useTaxProfiles();

  // Basic order info
  const orderId = order?.id || '';
  const orderNo = order?.orderNo || '';
  const quotationNo = order?.quotationNo || '';
  const quotationId = order?.quoteId || '';

  const { data: allCustomers = [] } = useCustomers();
  const { data: allLeads = [] } = useLeads();
  const { data: allQuotations = [] } = useQuotations();

  const linkedQuotation = useMemo(() => {
    if (!order?.quoteId && !order?.quotationNo) return null;
    return allQuotations.find((q: any) => 
      (order.quoteId && String(q.id) === String(order.quoteId)) ||
      (order.quotationNo && (String(q.quotationNo) === String(order.quotationNo) || String(q.docNo) === String(order.quotationNo)))
    );
  }, [order, allQuotations]);

  const customerId = order?.customerId || order?.matchedCustomerId || '';
  
  const matchedCustomer = useMemo(() => {
    const cid = customerId;
    const cname = order?.customerName || order?.customer;
    if (cid) {
      const found = allCustomers.find((c: any) => c.id === cid) || allLeads.find((l: any) => l.id === cid);
      if (found) return found;
    }
    if (cname) {
      const found = allCustomers.find((c: any) => c.name?.toLowerCase() === cname.toLowerCase() || c.company?.toLowerCase() === cname.toLowerCase()) ||
                    allLeads.find((l: any) => l.name?.toLowerCase() === cname.toLowerCase() || l.company?.toLowerCase() === cname.toLowerCase());
      if (found) return found;
    }
    return null;
  }, [customerId, order, allCustomers, allLeads]);

  const customerName = order?.customerName || order?.customer || matchedCustomer?.name || 'Valued Customer';
  const customerCompany = order?.customerCompany || order?.company || matchedCustomer?.company || matchedCustomer?.name || customerName;
  const customerAddress = order?.deliveryAddress || order?.customerAddress || matchedCustomer?.address || '';
  const customerPhone = order?.customerPhone || order?.phone || matchedCustomer?.phone || '';
  const customerEmail = order?.customerEmail || order?.email || matchedCustomer?.email || '';
  const customerVat = order?.customerVat || order?.vatNo || matchedCustomer?.vat || matchedCustomer?.tin || '';
  const customerAttention = order?.attention || '';

  // Order total
  const orderTotal = Number(order?.totalPrice || order?.totalAmount || 0);

  // Form State
  const [proformaNo, setProformaNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [advancePercent, setAdvancePercent] = useState<number>(30);
  const [advanceBaseAmount, setAdvanceBaseAmount] = useState<number>(0);
  
  // Tax Options: 'opt1' (Absorbed) | 'opt2' (SSCL Absorbed + VAT 18%) | 'opt3' (SSCL + VAT 2 Lines) | 'none'
  const [taxOption, setTaxOption] = useState<'opt1' | 'opt2' | 'opt3' | 'none'>('opt2');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemSpecification, setItemSpecification] = useState<string>('');

  const [modeOfPayment, setModeOfPayment] = useState('Bank Wire / TT');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize advance base amount, proforma number, and tax option from order
  useEffect(() => {
    if (orderTotal > 0) {
      const initAdv = Math.round((orderTotal * 0.3) * 100) / 100;
      setAdvanceBaseAmount(initAdv);
      setAdvancePercent(30);
    }

    // Default Proforma Invoice number: PI-<YEAR><MONTH>-<CLEAN_ORD>
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const cleanOrd = orderNo ? orderNo.replace(/[^A-Za-z0-9]/g, '') : Date.now().toString().slice(-4);
    setProformaNo(`PI-${yy}${mmm}-${cleanOrd.slice(-5)}`);

    // Match order's tax profile if available
    if (order?.taxProfileId) {
      const pId = String(order.taxProfileId).toLowerCase();
      if (pId.includes('opt1') || pId.includes('absorbed')) {
        setTaxOption('opt1');
      } else if (pId.includes('opt3') || pId.includes('both')) {
        setTaxOption('opt3');
      } else if (pId.includes('none') || pId.includes('no_tax')) {
        setTaxOption('none');
      } else {
        setTaxOption('opt2');
      }
    }

    // Default notes
    setNotes(
      `Proforma Invoice for advance payment against Sales Order #${orderNo}. ` +
      `Kindly arrange payment to the bank account stated below to commence manufacturing.`
    );

    // Auto-extract item description and technical specifications from order or linked quotation
    let itemsList: any[] = [];
    if (order?.items) {
      try {
        itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch(e) {}
    }

    if ((!itemsList || itemsList.length === 0) && linkedQuotation?.data) {
      try {
        const qData = typeof linkedQuotation.data === 'string' ? JSON.parse(linkedQuotation.data) : linkedQuotation.data;
        itemsList = qData.custItems || qData.items || [];
      } catch(e) {}
    }

    if (Array.isArray(itemsList) && itemsList.length > 0) {
      if (itemsList.length === 1) {
        const single = itemsList[0];
        const name = single.desc || single.description || single.productName || single.name || order?.productName || 'Quoted Product';
        const spec = single.specs || single.specifications || single.details || single.sku || single.productSku || order?.productSku || '';
        const qtyStr = `Qty: ${single.qty || order?.qty || 1} ${single.uom || single.unit || 'Nos'}`;
        setItemDescription(name);
        setItemSpecification([spec, qtyStr].filter(Boolean).join(' | '));
      } else {
        const mainTitle = order?.productName || (linkedQuotation?.data ? (typeof linkedQuotation.data === 'string' ? JSON.parse(linkedQuotation.data).subject : linkedQuotation.data.subject) : '') || `Order Items (${itemsList.length} Products / Parts)`;
        setItemDescription(mainTitle);
        const specLines = itemsList.map((it: any, idx: number) => {
          const itName = it.desc || it.description || it.productName || it.name || `Item #${idx+1}`;
          const itQty = `${it.qty || 1} ${it.uom || it.unit || 'Nos'}`;
          const itSpec = it.specs || it.specifications || it.details || it.sku || '';
          return `${idx + 1}. ${itName} - ${itQty}${itSpec ? ` (${itSpec})` : ''}`;
        }).join('\n');
        setItemSpecification(specLines);
      }
    } else if (order?.productName) {
      setItemDescription(order.productName);
      const specs = [
        order.productSku ? `SKU: ${order.productSku}` : '',
        order.qty ? `Order Qty: ${order.qty} ${order.uom || 'Nos'}` : '',
        order.notes ? `Scope: ${order.notes}` : ''
      ].filter(Boolean).join(' | ');
      setItemSpecification(specs);
    } else {
      setItemDescription(`Sales Order #${orderNo} Goods & Manufacturing Services`);
      setItemSpecification(order?.notes || 'Custom engineering fabrication and machining as per agreed specifications.');
    }
  }, [order, orderTotal, orderNo, linkedQuotation]);

  // Handle bank accounts filter
  const bankAccounts = useMemo(() => {
    return accounts.filter(
      (a: any) => 
        (a.type === 'Asset' && (a.subtype?.includes('Bank') || a.subtype?.includes('Cash') || a.name?.includes('Bank'))) ||
        a.accountNumber
    );
  }, [accounts]);

  // Set default bank if available
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBankId) {
      setSelectedBankId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedBankId]);

  // Quick percent buttons
  const handlePercentSelect = (pct: number) => {
    setAdvancePercent(pct);
    const val = Math.round((orderTotal * (pct / 100)) * 100) / 100;
    setAdvanceBaseAmount(val);
  };

  const handleAmountChange = (amt: number) => {
    setAdvanceBaseAmount(amt);
    if (orderTotal > 0) {
      const pct = Math.round((amt / orderTotal) * 100);
      setAdvancePercent(pct);
    }
  };

  // Statutory Tax Calculations for Sri Lanka Inland Revenue
  const calculation = useMemo(() => {
    const subtotal = Math.max(0, advanceBaseAmount);
    let ssclAmount = 0;
    let vatAmount = 0;
    let actualTaxProfileId = 'tp_opt2_sscl_absorbed_vat_sep';

    if (taxOption === 'opt1') {
      // Option 1: VAT & SSCL Absorbed (Total Value includes taxes)
      actualTaxProfileId = 'tp_opt1_absorbed';
      ssclAmount = 0;
      vatAmount = 0;
    } else if (taxOption === 'opt2') {
      // Option 2: SSCL (2.5%) Absorbed into Subtotal, VAT 18% Separate
      actualTaxProfileId = 'tp_opt2_sscl_absorbed_vat_sep';
      ssclAmount = 0;
      vatAmount = Math.round((subtotal * 0.18) * 100) / 100;
    } else if (taxOption === 'opt3') {
      // Option 3: Both SSCL (2.5%) and VAT (18%) Separate (2 Lines)
      actualTaxProfileId = 'tp_opt3_both_separate';
      ssclAmount = Math.round((subtotal * 0.025) * 100) / 100;
      vatAmount = Math.round(((subtotal + ssclAmount) * 0.18) * 100) / 100;
    } else {
      // No Tax / Non-VAT
      actualTaxProfileId = '';
      ssclAmount = 0;
      vatAmount = 0;
    }

    const totalTax = ssclAmount + vatAmount;
    const totalPayable = subtotal + totalTax;

    return {
      subtotal,
      ssclAmount,
      vatAmount,
      totalTax,
      totalPayable,
      actualTaxProfileId
    };
  }, [advanceBaseAmount, taxOption]);

  const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advanceBaseAmount || advanceBaseAmount <= 0) {
      toast('Please enter a valid advance amount', 'warning');
      return;
    }

    if (!proformaNo.trim()) {
      toast('Please provide a Proforma Invoice Number', 'warning');
      return;
    }

    setLoading(true);
    try {
      const cleanDocNo = proformaNo.trim();

      // Build line item for proforma invoice with explicit Item Description & Specifications
      const finalItemDesc = itemDescription.trim() || order?.productName || `Sales Order #${orderNo} Products`;
      const finalItemSpecs = itemSpecification.trim();
      
      const proformaItems = [
        {
          id: `item-${Date.now()}`,
          reference: 'ADV-1',
          description: `Advance Payment Deposit (${advancePercent}%) - ${finalItemDesc}`,
          details: finalItemSpecs ? `Item Specification & Scope:\n${finalItemSpecs}` : (order?.productName ? `Item: ${order.productName} (Total Order: ${formatCurrency(orderTotal)})` : `Sales Order #${orderNo}`),
          specifications: finalItemSpecs,
          qty: 1,
          unitPrice: calculation.subtotal,
          amount: calculation.subtotal,
          taxRate: (taxOption === 'opt2' || taxOption === 'opt3') ? 18 : 0
        }
      ];

      const payload: any = {
        id: cleanDocNo,
        invoiceNo: cleanDocNo,
        orderNo: orderNo,
        orderId: orderId || null,
        customerId: customerId || matchedCustomer?.id || null,
        leadId: customerId || matchedCustomer?.id || null,
        customerName: customerName,
        customerCompany: customerCompany,
        customerAddress: customerAddress,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        customerVat: customerVat,
        placeOfSupply: order?.deliveryAddress || 'Negombo, Sri Lanka',
        date: date,
        dueDate: dueDate,
        deliveryDate: order?.targetDeliveryDate || date,
        subtotal: calculation.subtotal,
        taxAmount: calculation.totalTax,
        total: calculation.totalPayable,
        amount: calculation.totalPayable,
        paidAmount: 0,
        status: 'unpaid',
        isProforma: 1,
        invoiceType: 'proforma',
        taxProfileId: calculation.actualTaxProfileId || null,
        taxType: taxOption === 'none' ? 'none' : 'profile',
        taxBreakdown: JSON.stringify({
          tax1Name: 'SSCL',
          tax1Rate: 2.5,
          tax1Amount: calculation.ssclAmount,
          tax2Name: 'VAT',
          tax2Rate: 18,
          tax2Amount: calculation.vatAmount,
          vatRate: (taxOption === 'opt2' || taxOption === 'opt3') ? 18 : 0
        }),
        modeOfPayment: modeOfPayment,
        bankDetailId: selectedBankId || null,
        bankDetails: selectedBank ? JSON.stringify({
          bankName: selectedBank.bankName || selectedBank.name,
          accountNumber: selectedBank.accountNumber || selectedBank.code,
          branch: selectedBank.branch || '',
          accountName: selectedBank.accountName || settings?.company_name || 'Rex Industries (Pvt) Ltd',
          swiftCode: selectedBank.swiftCode || ''
        }) : null,
        items: JSON.stringify(proformaItems),
        notes: notes,
        attention: customerAttention,
        paymentTerms: `Advance Deposit (${advancePercent}%) - ${modeOfPayment}`,
        additionalInfo: ''
      };

      if (quotationNo) payload.quotationNo = quotationNo;
      if (quotationId) payload.quotationId = String(quotationId);
      if (orderId) payload.orderId = String(orderId);

      const res = await createInvoice(payload);
      if (res && res.error) {
        throw new Error(res.error || res.message || 'Server rejected invoice creation');
      }

      const fullInvoice = {
        ...payload,
        id: cleanDocNo,
        invoiceNo: cleanDocNo,
        customerName: customerName,
        customerCompany: customerCompany,
        customerAddress: customerAddress,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        customerVat: customerVat,
        customer: {
          name: customerName,
          company: customerCompany,
          address: customerAddress,
          phone: customerPhone,
          email: customerEmail,
          vat: customerVat
        },
        items: proformaItems, // Array for immediate rendering
        bankDetails: selectedBank ? {
          bankName: selectedBank.bankName || selectedBank.name,
          accountNumber: selectedBank.accountNumber || selectedBank.code,
          branch: selectedBank.branch || '',
          accountName: selectedBank.accountName || settings?.company_name || 'Rex Industries (Pvt) Ltd',
          swiftCode: selectedBank.swiftCode || ''
        } : null
      };

      toast(`Proforma Invoice ${cleanDocNo} created successfully!`, 'success');
      onSuccess(fullInvoice);
      onClose();
    } catch (err: any) {
      console.error('Failed to create proforma invoice:', err);
      toast(err?.message || 'Failed to create Proforma Invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="bg-surface border border-theme-subtle rounded-none shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface2/70 border-b border-theme-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Issue Advance Proforma Invoice
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold uppercase">
                  Proforma
                </span>
              </div>
              <p className="text-[11px] text-muted font-mono mt-0.5">
                Sales Order #{orderNo} • {customerCompany || customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-primary hover:bg-surface3 rounded-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto custom-scrollbar text-xs">
          {/* Order Snapshot Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface2/40 border border-theme-subtle rounded-none font-mono">
            <div>
              <span className="text-muted block text-[10px] uppercase">Order Value</span>
              <span className="font-bold text-primary text-xs">{formatCurrency(orderTotal)}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Ref Quotation</span>
              <span className="text-secondary truncate block">{quotationNo || 'Direct'}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Client</span>
              <span className="text-secondary truncate block" title={customerCompany || customerName}>
                {customerCompany || customerName}
              </span>
            </div>
          </div>

          {/* Section 1: Document Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Proforma Invoice #
              </label>
              <input
                type="text"
                required
                value={proformaNo}
                onChange={(e) => setProformaNo(e.target.value)}
                className="w-full h-8 px-2.5 font-mono font-bold bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-8 px-2.5 font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Valid Until
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 px-2.5 font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
          </div>

          {/* Section 2: Item Description & Technical Specifications */}
          <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-none space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={13} className="text-amber-500" /> Item Description & Specifications
              </span>
              <span className="text-[10px] text-muted">
                Will be printed in the goods description column
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Item / Product Description *
              </label>
              <input
                type="text"
                required
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. Rex Heavy-Duty Hydraulic Cylinder 50x300mm"
                className="w-full h-8 px-2.5 font-semibold bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Technical Specifications & Scope of Work
              </label>
              <textarea
                rows={2}
                value={itemSpecification}
                onChange={(e) => setItemSpecification(e.target.value)}
                placeholder="e.g. SKU: REX-CYL-50300 | Material: Hardened Steel C45 | Bore 50mm, Stroke 300mm | Working Pressure: 250 Bar"
                className="w-full p-2 text-xs font-mono bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 custom-scrollbar"
              />
            </div>
          </div>

          {/* Section 3: Advance Amount & Percentage */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-none space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Percent size={13} className="text-blue-500" /> Advance Deposit Amount
              </span>
              <span className="text-[11px] font-mono text-muted">
                Order: {formatCurrency(orderTotal)}
              </span>
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 25, 30, 40, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentSelect(pct)}
                  className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-none border transition-colors ${
                    advancePercent === pct
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-surface hover:bg-surface2 text-secondary border-theme-subtle'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Inputs: Percentage & Base Amount */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase mb-1">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={advancePercent}
                  onChange={(e) => handlePercentSelect(Number(e.target.value))}
                  className="w-full h-8 px-2.5 font-mono font-bold bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase mb-1">
                  Base Advance (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={advanceBaseAmount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  className="w-full h-8 px-2.5 font-mono font-bold bg-surface border border-blue-500/40 rounded-none text-blue-600 dark:text-blue-400 focus:outline-none focus:border-rex-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: The 3 Statutory Tax Options (Sri Lanka Inland Revenue) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                Select Tax Option
              </label>
              <button
                type="button"
                onClick={() => setTaxOption(taxOption === 'none' ? 'opt2' : 'none')}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                {taxOption === 'none' ? '← Enable Tax Options' : 'Non-VAT Client? (No Tax)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1 */}
              <div
                onClick={() => setTaxOption('opt1')}
                className={`p-2.5 border rounded-none cursor-pointer transition-all ${
                  taxOption === 'opt1'
                    ? 'border-blue-600 bg-blue-500/10 text-primary shadow-xs'
                    : 'border-theme-subtle bg-surface2/30 hover:bg-surface2 text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">Option 1</span>
                  <input
                    type="radio"
                    name="taxOpt"
                    checked={taxOption === 'opt1'}
                    onChange={() => setTaxOption('opt1')}
                    className="text-blue-600"
                  />
                </div>
                <p className="font-semibold text-primary mt-1 text-[11px]">VAT & SSCL Absorbed</p>
                <p className="text-[10px] text-muted">Taxes bundled in total value</p>
              </div>

              {/* Option 2 (Standard) */}
              <div
                onClick={() => setTaxOption('opt2')}
                className={`p-2.5 border rounded-none cursor-pointer transition-all ${
                  taxOption === 'opt2'
                    ? 'border-blue-600 bg-blue-500/10 text-primary shadow-xs'
                    : 'border-theme-subtle bg-surface2/30 hover:bg-surface2 text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400">Option 2 (Standard)</span>
                  <input
                    type="radio"
                    name="taxOpt"
                    checked={taxOption === 'opt2'}
                    onChange={() => setTaxOption('opt2')}
                    className="text-blue-600"
                  />
                </div>
                <p className="font-semibold text-primary mt-1 text-[11px]">SSCL Absorbed + VAT 18%</p>
                <p className="text-[10px] text-muted">VAT 18% shown separately</p>
              </div>

              {/* Option 3 */}
              <div
                onClick={() => setTaxOption('opt3')}
                className={`p-2.5 border rounded-none cursor-pointer transition-all ${
                  taxOption === 'opt3'
                    ? 'border-blue-600 bg-blue-500/10 text-primary shadow-xs'
                    : 'border-theme-subtle bg-surface2/30 hover:bg-surface2 text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">Option 3</span>
                  <input
                    type="radio"
                    name="taxOpt"
                    checked={taxOption === 'opt3'}
                    onChange={() => setTaxOption('opt3')}
                    className="text-blue-600"
                  />
                </div>
                <p className="font-semibold text-primary mt-1 text-[11px]">SSCL 2.5% + VAT 18%</p>
                <p className="text-[10px] text-muted">2 separate statutory lines</p>
              </div>
            </div>

            {/* Live Financial Breakdown */}
            <div className="p-2.5 bg-surface2/70 border border-theme-subtle rounded-none flex items-center justify-between flex-wrap gap-2 text-xs font-mono mt-1.5">
              <div>
                <span className="text-[10px] text-muted block uppercase">Supply Subtotal</span>
                <span className="font-bold text-primary">{formatCurrency(calculation.subtotal)}</span>
              </div>
              {taxOption === 'opt3' && (
                <div>
                  <span className="text-[10px] text-muted block uppercase">SSCL (2.5%)</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.ssclAmount)}</span>
                </div>
              )}
              {(taxOption === 'opt2' || taxOption === 'opt3') && (
                <div>
                  <span className="text-[10px] text-muted block uppercase">VAT (18%)</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.vatAmount)}</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase">Proforma Total Payable</span>
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{formatCurrency(calculation.totalPayable)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Bank Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Beneficiary Bank Account
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-8 px-2 bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="">-- No Bank Specified --</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName || b.name} {b.accountNumber ? `(${b.accountNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Remittance Mode
              </label>
              <select
                value={modeOfPayment}
                onChange={(e) => setModeOfPayment(e.target.value)}
                className="w-full h-8 px-2 bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="Bank Wire / TT">Bank Wire / TT Transfer</option>
                <option value="Cheque">Company Cheque</option>
                <option value="Cash">Cash Deposit</option>
                <option value="Online Payment">Online / Card Gateway</option>
              </select>
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Proforma Remarks / Instructions
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-8 px-2.5 font-mono bg-surface2 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              placeholder="Instructions for customer payment..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-theme-subtle flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs text-muted hover:text-primary rounded-none"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || advanceBaseAmount <= 0}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-none flex items-center gap-1.5"
            >
              <FileText size={13} />
              {loading ? 'Creating...' : `Issue Proforma Invoice (${formatCurrency(calculation.totalPayable)})`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  ,
    document.body
  );
};
