import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FileText, CheckCircle, Percent, DollarSign, Calendar, 
  Building2, User, Receipt, ShieldCheck, CreditCard, Sparkles, AlertCircle,
  Plus, Trash2, Package
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

export interface ProformaLineItem {
  id: string;
  reference: string;
  description: string;
  specifications: string;
  qty: number;
  uom: string;
  unitPrice: number;
  amount: number;
}

const toDateOnly = (val: any): string | null => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return null;
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

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

  const isCustomerForeign = Boolean(
    matchedCustomer?.isForeign ||
    matchedCustomer?.currency === 'USD' ||
    order?.isForeign ||
    order?.currency === 'USD' ||
    linkedQuotation?.currency === 'USD' ||
    (linkedQuotation?.data && typeof linkedQuotation.data === 'string' && linkedQuotation.data.includes('"currency":"USD"'))
  );

  const detectedCurrency = isCustomerForeign 
    ? 'USD' 
    : String(order?.currency || matchedCustomer?.currency || 'LKR').trim().toUpperCase();
  const detectedExchangeRate = Number(order?.exchangeRate || (detectedCurrency === 'USD' ? 310 : 1));

  // Currency & Exchange Rate State
  const [currency, setCurrency] = useState<string>(detectedCurrency || 'LKR');
  const [exchangeRate, setExchangeRate] = useState<number>(detectedExchangeRate || 1);

  // Sync when order/customer changes
  useEffect(() => {
    if (detectedCurrency) {
      setCurrency(detectedCurrency);
      setExchangeRate(detectedExchangeRate);
    }
  }, [detectedCurrency, detectedExchangeRate]);

  // Raw Order total
  const rawOrderTotal = Number(order?.totalPrice || order?.totalAmount || 0);

  // Effective Order total adjusted for selected currency
  const effectiveOrderTotal = useMemo(() => {
    if (currency === 'USD' && order?.currency !== 'USD') {
      return Number((rawOrderTotal / (exchangeRate || 310)).toFixed(2));
    } else if (currency === 'LKR' && order?.currency === 'USD') {
      return Number((rawOrderTotal * (order?.exchangeRate || 310)).toFixed(2));
    }
    return rawOrderTotal;
  }, [currency, rawOrderTotal, order?.currency, order?.exchangeRate, exchangeRate]);

  // Form State
  const [proformaNo, setProformaNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [advancePercent, setAdvancePercent] = useState<number>(30);
  const [advanceBaseAmount, setAdvanceBaseAmount] = useState<number>(0);
  const [proformaLines, setProformaLines] = useState<ProformaLineItem[]>([]);
  
  // Tax Options: 'none' (Advance Deposit - No extra tax) | 'opt1' (Absorbed) | 'opt2' (SSCL Absorbed + VAT 18% Extracted) | 'opt3' (SSCL + VAT Extracted)
  const [taxOption, setTaxOption] = useState<'opt1' | 'opt2' | 'opt3' | 'none'>('none');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemSpecification, setItemSpecification] = useState<string>('');

  const [modeOfPayment, setModeOfPayment] = useState('Bank Wire / TT');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Compute live lines total
  const currentLinesTotal = useMemo(() => {
    if (proformaLines.length > 0) {
      return proformaLines.reduce((acc, l) => acc + (Number(l.amount) || ((Number(l.qty) || 1) * Number(l.unitPrice || 0))), 0);
    }
    return effectiveOrderTotal;
  }, [proformaLines, effectiveOrderTotal]);

  // Currency switcher handler
  const handleCurrencyChange = (newCur: string, newRate: number) => {
    if (newCur === currency) return;
    const oldCur = currency;
    const oldRate = exchangeRate;
    setCurrency(newCur);
    setExchangeRate(newRate);

    // Convert existing line items
    setProformaLines(prevLines => {
      const converted = prevLines.map(line => {
        let uPrice = line.unitPrice;
        if (newCur === 'USD' && oldCur === 'LKR') {
          uPrice = Number((line.unitPrice / (newRate || 310)).toFixed(2));
        } else if (newCur === 'LKR' && oldCur === 'USD') {
          uPrice = Number((line.unitPrice * (oldRate || 310)).toFixed(2));
        }
        const amt = Number((Number(line.qty) * uPrice).toFixed(2));
        return {
          ...line,
          unitPrice: uPrice,
          amount: amt
        };
      });

      const newTot = converted.reduce((sum, l) => sum + l.amount, 0);
      const newAdv = Math.round((newTot * (advancePercent / 100)) * 100) / 100;
      setAdvanceBaseAmount(newAdv);

      return converted;
    });
  };

  // Line item handlers
  const handleUpdateLine = (index: number, field: keyof ProformaLineItem, value: any) => {
    setProformaLines(prev => {
      const next = [...prev];
      const cur = { ...next[index], [field]: value };
      if (field === 'qty' || field === 'unitPrice') {
        const q = field === 'qty' ? (Number(value) || 0) : (Number(cur.qty) || 0);
        const u = field === 'unitPrice' ? (Number(value) || 0) : (Number(cur.unitPrice) || 0);
        cur.amount = Number((q * u).toFixed(2));
      }
      next[index] = cur;

      const newTot = next.reduce((sum, l) => sum + (Number(l.amount) || ((Number(l.qty) || 1) * Number(l.unitPrice || 0))), 0);
      const newAdv = Math.round((newTot * (advancePercent / 100)) * 100) / 100;
      setAdvanceBaseAmount(newAdv);
      return next;
    });
  };

  const handleAddLine = () => {
    setProformaLines(prev => {
      const next: ProformaLineItem = {
        id: `line-${Date.now()}`,
        reference: String(prev.length + 1),
        description: 'New Machining Item / Part',
        specifications: '',
        qty: 1,
        uom: 'Nos',
        unitPrice: 0,
        amount: 0
      };
      return [...prev, next];
    });
  };

  const handleRemoveLine = (index: number) => {
    if (proformaLines.length <= 1) {
      toast('At least one item is required on the proforma invoice', 'warning');
      return;
    }
    setProformaLines(prev => {
      const next = prev.filter((_, i) => i !== index);
      const newTot = next.reduce((sum, l) => sum + (Number(l.amount) || ((Number(l.qty) || 1) * Number(l.unitPrice || 0))), 0);
      const newAdv = Math.round((newTot * (advancePercent / 100)) * 100) / 100;
      setAdvanceBaseAmount(newAdv);
      return next;
    });
  };

  // Initialize advance base amount, proforma number, and tax option from order
  useEffect(() => {
    // Auto-extract item lines from order or linked quotation
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

    const isOrderInUSD = Boolean(order?.currency === 'USD' || linkedQuotation?.currency === 'USD');
    const isTargetUSD = detectedCurrency === 'USD';

    let extractedLines: ProformaLineItem[] = [];
    if (Array.isArray(itemsList) && itemsList.length > 0) {
      extractedLines = itemsList.map((it: any, idx: number) => {
        let uPrice = Number(it.unitPrice || 0);
        let amt = Number(it.amount || 0);
        const q = Number(it.qty) || 1;

        if (isTargetUSD && !isOrderInUSD) {
          uPrice = Number((uPrice / (detectedExchangeRate || 310)).toFixed(2));
          amt = Number((amt / (detectedExchangeRate || 310)).toFixed(2));
        } else if (!isTargetUSD && isOrderInUSD) {
          uPrice = Number((uPrice * (order?.exchangeRate || 310)).toFixed(2));
          amt = Number((amt * (order?.exchangeRate || 310)).toFixed(2));
        }

        if (amt === 0 && uPrice > 0) {
          amt = Number((q * uPrice).toFixed(2));
        } else if (uPrice === 0 && amt > 0 && q > 0) {
          uPrice = Number((amt / q).toFixed(2));
        }

        return {
          id: it.id || `line-${idx + 1}`,
          reference: it.reference || String(idx + 1),
          description: it.desc || it.description || it.productName || it.name || `Item #${idx + 1}`,
          specifications: it.specs || it.specifications || it.details || it.sku || it.productSku || '',
          qty: q,
          uom: it.uom || it.unit || 'Nos',
          unitPrice: uPrice,
          amount: amt
        };
      });
    } else {
      const q = Number(order?.qty) || 1;
      let tot = effectiveOrderTotal;
      let uPrice = Number((tot / q).toFixed(2));
      extractedLines = [{
        id: 'line-1',
        reference: '1',
        description: order?.productName || `Sales Order #${orderNo} Goods & Manufacturing`,
        specifications: [
          order?.productSku ? `SKU: ${order.productSku}` : '',
          order?.notes ? `Scope: ${order.notes}` : ''
        ].filter(Boolean).join(' | '),
        qty: q,
        uom: order?.uom || 'Nos',
        unitPrice: uPrice,
        amount: tot
      }];
    }
    setProformaLines(extractedLines);

    // Initial percentage: 100% for foreign / USD orders, 30% for domestic
    const initialPct = (detectedCurrency === 'USD' || isCustomerForeign) ? 100 : 30;
    setAdvancePercent(initialPct);

    const linesSum = extractedLines.reduce((acc, l) => acc + (Number(l.amount) || ((Number(l.qty) || 1) * Number(l.unitPrice || 0))), 0);
    const targetTotal = linesSum > 0 ? linesSum : effectiveOrderTotal;
    const initAdv = Math.round((targetTotal * (initialPct / 100)) * 100) / 100;
    setAdvanceBaseAmount(initAdv);

    // Default Proforma Invoice number: PI-<YEAR><MONTH>-<CLEAN_ORD>
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const cleanOrd = orderNo ? orderNo.replace(/[^A-Za-z0-9]/g, '') : Date.now().toString().slice(-4);
    setProformaNo(`PI-${yy}${mmm}-${cleanOrd.slice(-5)}`);

    // Advance Proforma Invoice is non-taxable advance deposit (tax is settled on final tax invoice)
    setTaxOption('none');

    // Default notes
    setNotes(
      `Proforma Invoice for ${initialPct}% payment against Sales Order #${orderNo}. ` +
      `Kindly arrange payment to the bank account stated below to commence manufacturing.`
    );
  }, [order, effectiveOrderTotal, orderNo, linkedQuotation, detectedCurrency, detectedExchangeRate, isCustomerForeign]);

  // Handle bank accounts filter
  // Handle bank accounts filter (Settings Company Bank Details + GL Bank Accounts)
  const bankAccounts = useMemo(() => {
    let list: any[] = [];
    if (settings?.company_bank_details) {
      try {
        const parsed = typeof settings.company_bank_details === 'string'
          ? JSON.parse(settings.company_bank_details)
          : settings.company_bank_details;
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((b: any) => ({
            id: b.id,
            name: b.bankName || b.name,
            bankName: b.bankName || b.name,
            branch: b.branchName || b.branch || '',
            branchName: b.branchName || b.branch || '',
            accountName: b.accountName || settings?.company_name || 'Rex Industries (Pvt) Ltd',
            accountNumber: b.accountNumber,
            swiftCode: b.swiftCode || '',
            isDefault: b.isDefault
          }));
        }
      } catch (e) {}
    }

    const glBanks = accounts.filter(
      (a: any) => 
        (a.type === 'Asset' && (a.subtype?.includes('Bank') || a.subtype?.includes('Cash') || a.name?.includes('Bank'))) ||
        a.accountNumber
    ).map((a: any) => ({
      id: a.id,
      name: a.bankName || a.name,
      bankName: a.bankName || a.name,
      branch: a.branch || '',
      branchName: a.branch || '',
      accountName: a.accountName || settings?.company_name || 'Rex Industries (Pvt) Ltd',
      accountNumber: a.accountNumber || a.code,
      swiftCode: a.swiftCode || '',
      isDefault: false
    }));

    const combined = [...list];
    glBanks.forEach((gb: any) => {
      if (!combined.some((b: any) => b.accountNumber && b.accountNumber === gb.accountNumber)) {
        combined.push(gb);
      }
    });

    if (combined.length === 0) {
      return [
        {
          id: 'bank_hnb',
          bankName: 'Hatton National Bank',
          name: 'Hatton National Bank',
          branch: 'Negombo',
          branchName: 'Negombo',
          accountName: settings?.company_name || 'Rex Industries (Pvt) Ltd',
          accountNumber: '011010078028',
          swiftCode: 'HNBLLKLX',
          isDefault: true
        }
      ];
    }
    return combined;
  }, [settings?.company_bank_details, settings?.company_name, accounts]);

  // Set default bank if available (prioritizes Master USD Account when currency is USD)
  useEffect(() => {
    if (bankAccounts.length > 0) {
      if (currency === 'USD') {
        const usdMaster = bankAccounts.find((b: any) => b.id === settings?.usd_master_account_id) ||
                          bankAccounts.find((b: any) => b.swiftCode || b.name?.includes('USD') || b.bankName?.includes('USD'));
        if (usdMaster) {
          setSelectedBankId(usdMaster.id);
          return;
        }
      }
      if (!selectedBankId) {
        const def = bankAccounts.find((b: any) => b.isDefault) || bankAccounts[0];
        if (def) setSelectedBankId(def.id);
      }
    }
  }, [bankAccounts, selectedBankId, currency, settings?.usd_master_account_id]);

  // Quick percent buttons
  const handlePercentSelect = (pct: number) => {
    setAdvancePercent(pct);
    const val = Math.round((currentLinesTotal * (pct / 100)) * 100) / 100;
    setAdvanceBaseAmount(val);
  };

  const handleAmountChange = (amt: number) => {
    setAdvanceBaseAmount(amt);
    if (currentLinesTotal > 0) {
      const pct = Math.round((amt / currentLinesTotal) * 100);
      setAdvancePercent(pct);
    }
  };

  // Statutory Tax Calculations for Sri Lanka Inland Revenue
  // Note: Advance payment is an advance deposit against the quotation/order.
  // Tax MUST NOT be added on top of the advance payment (prevent double taxation).
  // Total payable equals exactly the advanceBaseAmount.
  const calculation = useMemo(() => {
    const totalPayable = Math.max(0, advanceBaseAmount);
    let subtotal = totalPayable;
    let ssclAmount = 0;
    let vatAmount = 0;
    let actualTaxProfileId = '';

    if (true) {
      // Advance Proforma is an advance deposit - No tax on proforma
      actualTaxProfileId = '';
      subtotal = totalPayable;
      ssclAmount = 0;
      vatAmount = 0;
    } else if (taxOption === 'opt1') {
      // Option 1: VAT & SSCL Absorbed (Total Value includes taxes)
      actualTaxProfileId = 'tp_opt1_absorbed';
      subtotal = totalPayable;
      ssclAmount = 0;
      vatAmount = 0;
    } else if (taxOption === 'opt2') {
      // Option 2: SSCL (2.5%) Absorbed, VAT 18% Extracted from Advance (Not added on top)
      actualTaxProfileId = 'tp_opt2_sscl_absorbed_vat_sep';
      ssclAmount = 0;
      vatAmount = Math.round((totalPayable * (18 / 118)) * 100) / 100;
      subtotal = Math.round((totalPayable - vatAmount) * 100) / 100;
    } else if (taxOption === 'opt3') {
      // Option 3: Both SSCL (2.5%) and VAT (18%) Extracted (Not added on top)
      actualTaxProfileId = 'tp_opt3_both_separate';
      const base = totalPayable / 1.2095;
      ssclAmount = Math.round((base * 0.025) * 100) / 100;
      vatAmount = Math.round(((base + ssclAmount) * 0.18) * 100) / 100;
      subtotal = Math.round((totalPayable - ssclAmount - vatAmount) * 100) / 100;
    }

    const totalTax = ssclAmount + vatAmount;

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

      // Build multi-line items for proforma invoice preserving individual Sales Order lines
      const factor = advancePercent / 100;
      const proformaItems = proformaLines.map((line, idx) => {
        const lineUnitPrice = advancePercent === 100 
          ? Number(line.unitPrice) 
          : Number((Number(line.unitPrice) * factor).toFixed(2));
        const lineAmount = advancePercent === 100 
          ? Number(line.amount) 
          : Number((Number(line.amount) * factor).toFixed(2));

        return {
          id: line.id || `item-${Date.now()}-${idx}`,
          reference: line.reference || String(idx + 1),
          description: line.description,
          details: [
            line.specifications,
            advancePercent < 100 ? `Advance Deposit (${advancePercent}%) | Original Item Value: ${formatCurrency(line.amount, false, currency)}` : ''
          ].filter(Boolean).join('\n'),
          specifications: line.specifications || '',
          qty: Number(line.qty) || 1,
          uom: line.uom || 'Nos',
          unitPrice: lineUnitPrice,
          amount: lineAmount,
          taxRate: (taxOption === 'opt2' || taxOption === 'opt3') ? 18 : 0
        };
      });

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
        date: toDateOnly(date) || new Date().toISOString().slice(0, 10),
        dueDate: toDateOnly(dueDate),
        deliveryDate: toDateOnly(date) || new Date().toISOString().slice(0, 10),
        subtotal: calculation.totalPayable,
        taxAmount: 0,
        total: calculation.totalPayable,
        amount: calculation.totalPayable,
        paidAmount: 0,
        status: 'unpaid',
        currency: currency,
        exchangeRate: exchangeRate,
        isProforma: 1,
        invoiceType: 'proforma',
        taxProfileId: currency === 'USD' ? 'tp_export_zero_rated' : null,
        taxType: currency === 'USD' ? 'exempt' : 'none',
        taxBreakdown: null,
        modeOfPayment: modeOfPayment,
        bankDetailId: selectedBankId || null,
        bankDetails: selectedBank ? JSON.stringify({
          bankName: selectedBank.bankName || selectedBank.name,
          accountNumber: selectedBank.accountNumber || selectedBank.code,
          branch: selectedBank.branch || selectedBank.branchName || '',
          branchName: selectedBank.branch || selectedBank.branchName || '',
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
        currency: currency,
        exchangeRate: exchangeRate,
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
          branch: selectedBank.branch || selectedBank.branchName || '',
          branchName: selectedBank.branch || selectedBank.branchName || '',
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
        className="bg-surface border border-theme-subtle rounded-none shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-6"
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
          {/* Order Snapshot Strip & Currency Toggle */}
          <div className="p-2.5 bg-surface2/40 border border-theme-subtle rounded-none font-mono space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-muted block text-[10px] uppercase">Order Value</span>
                <span className="font-bold text-primary text-xs">{formatCurrency(currentLinesTotal, false, currency)}</span>
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

            {/* Currency Switcher */}
            <div className="flex items-center justify-between pt-1.5 border-t border-theme-subtle/50 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted uppercase">Proforma Currency:</span>
                <div className="inline-flex rounded border border-theme-subtle p-0.5 bg-surface">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('LKR', 1)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${currency === 'LKR' ? 'bg-primary text-surface' : 'text-muted hover:text-primary'}`}
                  >
                    LKR (Rs.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD', exchangeRate > 1 ? exchangeRate : 310)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${currency === 'USD' ? 'bg-emerald-600 text-white' : 'text-muted hover:text-primary'}`}
                  >
                    USD ($ Export)
                  </button>
                </div>
              </div>

              {currency === 'USD' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">Exchange Rate (LKR):</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => {
                      const newRate = Number(e.target.value) || 1;
                      setExchangeRate(newRate);
                    }}
                    className="w-20 h-6 px-1.5 text-right font-mono font-bold bg-surface border border-theme-subtle text-xs text-primary focus:outline-none focus:border-emerald-500"
                    placeholder="310.00"
                  />
                </div>
              )}
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

          {/* Section 2: Order Line Items (All items preserved from Sales Order) */}
          <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-none space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Package size={13} className="text-amber-500" /> Order Line Items ({proformaLines.length})
                </span>
                <span className="text-[10px] text-muted">
                  Individual products & technical specifications from Sales Order #{orderNo}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            <div className="border border-theme-subtle overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface2 text-muted font-bold uppercase text-[10px] border-b border-theme-subtle">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">Product Description & Technical Specifications</th>
                    <th className="p-2 w-28 text-center">Qty & UoM</th>
                    <th className="p-2 w-28 text-right">Unit Price ({currency === 'USD' ? '$' : 'Rs.'})</th>
                    <th className="p-2 w-28 text-right">Total ({currency === 'USD' ? '$' : 'Rs.'})</th>
                    <th className="p-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle bg-surface">
                  {proformaLines.map((line, idx) => (
                    <tr key={line.id || idx} className="hover:bg-surface2/30 transition-colors">
                      <td className="p-2 text-center font-mono font-bold text-muted align-top pt-3">
                        {line.reference || idx + 1}
                      </td>
                      <td className="p-2 space-y-1">
                        <input
                          type="text"
                          required
                          value={line.description}
                          onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                          placeholder="Item / Product Description"
                          className="w-full h-7 px-2 font-semibold text-xs bg-surface2/70 border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                        />
                        <textarea
                          rows={1}
                          value={line.specifications}
                          onChange={(e) => handleUpdateLine(idx, 'specifications', e.target.value)}
                          placeholder="Technical specifications, dimensions, material grade..."
                          className="w-full p-1.5 text-[11px] font-mono bg-surface2/50 border border-theme-subtle rounded-none text-secondary focus:outline-none focus:border-rex-500 resize-none"
                        />
                      </td>
                      <td className="p-2 align-top pt-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={line.qty}
                            onChange={(e) => handleUpdateLine(idx, 'qty', e.target.value)}
                            className="w-16 h-7 px-1.5 font-mono text-center font-bold bg-surface2/70 border border-theme-subtle text-primary focus:outline-none focus:border-rex-500"
                          />
                          <input
                            type="text"
                            value={line.uom}
                            onChange={(e) => handleUpdateLine(idx, 'uom', e.target.value)}
                            placeholder="Nos"
                            className="w-10 h-7 px-1 text-center text-[10px] font-mono bg-surface2/50 border border-theme-subtle text-muted"
                          />
                        </div>
                      </td>
                      <td className="p-2 align-top pt-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={line.unitPrice}
                          onChange={(e) => handleUpdateLine(idx, 'unitPrice', e.target.value)}
                          className="w-24 h-7 px-2 font-mono text-right font-bold bg-surface2/70 border border-theme-subtle text-primary focus:outline-none focus:border-rex-500"
                        />
                      </td>
                      <td className="p-2 align-top pt-3 text-right font-mono font-bold text-xs text-primary">
                        {formatCurrency(line.amount, false, currency)}
                      </td>
                      <td className="p-2 align-top pt-2.5 text-center">
                        {proformaLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-muted hover:text-rose-500 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface2/60 border-t border-theme-subtle font-mono text-xs">
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-bold text-muted uppercase text-[10px]">
                      Gross Sales Order Lines Total:
                    </td>
                    <td className="p-2 text-right font-bold text-xs text-primary">
                      {formatCurrency(currentLinesTotal, false, currency)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Advance Amount & Percentage */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-none space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Percent size={13} className="text-blue-500" /> Advance Deposit Amount
              </span>
              <span className="text-[11px] font-mono text-muted">
                Order: {formatCurrency(currentLinesTotal, false, currency)}
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
                  Base Advance ({currency === 'USD' ? '$ USD' : 'LKR'})
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-muted text-xs font-mono">
                    {currency === 'USD' ? '$' : 'Rs.'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={advanceBaseAmount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full h-8 pl-8 pr-2.5 font-mono font-bold bg-surface border border-blue-500/40 rounded-none text-blue-600 dark:text-blue-400 focus:outline-none focus:border-rex-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Tax Options (Sri Lanka Inland Revenue) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                Select Advance Tax Treatment
              </label>
              <span className="text-[10px] text-muted">
                Advance Deposit: No tax added on top
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option: Advance Deposit (No Additional Tax) */}
              <div
                onClick={() => setTaxOption('none')}
                className={`p-2.5 border rounded-none cursor-pointer transition-all ${
                  taxOption === 'none'
                    ? 'border-blue-600 bg-blue-500/10 text-primary shadow-xs'
                    : 'border-theme-subtle bg-surface2/30 hover:bg-surface2 text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400">Advance Deposit</span>
                  <input
                    type="radio"
                    name="taxOpt"
                    checked={taxOption === 'none'}
                    onChange={() => setTaxOption('none')}
                    className="text-blue-600"
                  />
                </div>
                <p className="font-semibold text-primary mt-1 text-[11px]">No Extra Tax</p>
                <p className="text-[10px] text-muted">Deposit against quote</p>
              </div>

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
                <p className="text-[10px] text-muted">Taxes bundled in total</p>
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
                  <span className="font-bold text-[11px]">Option 2</span>
                  <input
                    type="radio"
                    name="taxOpt"
                    checked={taxOption === 'opt2'}
                    onChange={() => setTaxOption('opt2')}
                    className="text-blue-600"
                  />
                </div>
                <p className="font-semibold text-primary mt-1 text-[11px]">VAT 18% Extracted</p>
                <p className="text-[10px] text-muted">Extracted from advance</p>
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
                <p className="font-semibold text-primary mt-1 text-[11px]">SSCL + VAT Extracted</p>
                <p className="text-[10px] text-muted">2 statutory lines</p>
              </div>
            </div>

            {/* Note alert */}
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              💡 Advance payment is a deposit towards total quotation value. Tax is NOT added on top of the advance amount. Total payable is strictly {formatCurrency(calculation.totalPayable, false, currency)}.
            </div>

            {/* Live Financial Breakdown */}
            <div className="p-2.5 bg-surface2/70 border border-theme-subtle rounded-none flex items-center justify-between flex-wrap gap-2 text-xs font-mono mt-1.5">
              <div>
                <span className="text-[10px] text-muted block uppercase">Supply Subtotal</span>
                <span className="font-bold text-primary">{formatCurrency(calculation.subtotal, false, currency)}</span>
              </div>
              {taxOption === 'opt3' && (
                <div>
                  <span className="text-[10px] text-muted block uppercase">SSCL (2.5%)</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.ssclAmount, false, currency)}</span>
                </div>
              )}
              {(taxOption === 'opt2' || taxOption === 'opt3') && (
                <div>
                  <span className="text-[10px] text-muted block uppercase">VAT (18%)</span>
                  <span className="font-bold text-primary">{formatCurrency(calculation.vatAmount, false, currency)}</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block uppercase">Proforma Total Payable</span>
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{formatCurrency(calculation.totalPayable, false, currency)}</span>
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
              {loading ? 'Creating...' : `Issue Proforma Invoice (${formatCurrency(calculation.totalPayable, false, currency)})`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  ,
    document.body
  );
};
