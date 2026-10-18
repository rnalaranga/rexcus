import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Trash2, ArrowLeft, Eye, Download, Send, CheckCircle2, 
  XCircle, Clock, Sparkles, Loader2, Building2, User, ChevronDown, 
  ChevronUp, Paperclip, CreditCard, ShieldCheck, Printer, HelpCircle, 
  Briefcase, Save, TrendingUp, LineChart, PackageCheck, Package, Search, 
  ExternalLink, Layers, ShoppingBag, Boxes, AlertCircle, Wand2
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/DialogProvider'
import { useCustomers, useLeads, useInventory } from '@/hooks/useData'
import { useCurrencies, useTaxProfiles } from '@/hooks/useFinance'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { 
  createQuotation, fetchQuotations, updateQuotation, deleteQuotation, 
  generateQuotationDescription, fetchAllCustomerGRNs, submitQuotationForApproval, 
  approveQuotation, rejectQuotation 
} from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { CustomerModal } from '@/components/crm/CustomerModal'
// @ts-ignore
import html2pdf from 'html2pdf.js'

export interface QuotationTermsPreset {
  id: string;
  name: string;
  terms: string;
  validity: string;
  delivery: string;
  isDefault?: boolean;
}

const DEFAULT_TERMS_PRESETS: QuotationTermsPreset[] = [
  {
    id: 'standard-manufacturing',
    name: 'Standard Finished Products Sale',
    terms: 'Payment: 100% advance or approved credit terms. Goods once sold are not returnable without prior authorization.',
    validity: '30 Days from quotation date',
    delivery: 'Ex-Factory / 3-5 Working Days from Order Confirmation',
    isDefault: true
  },
  {
    id: 'credit-client',
    name: 'Corporate / 30 Days Credit',
    terms: 'Payment: 30 Days credit from the invoice date. Late payments subject to 2% monthly interest.',
    validity: '14 Days from quotation date',
    delivery: 'Delivery to Customer Warehouse within 5-7 working days',
  },
  {
    id: 'cash-carry',
    name: 'Cash on Delivery (COD)',
    terms: 'Payment: Strictly Cash / Bank Transfer upon delivery of goods.',
    validity: '7 Days from quotation date',
    delivery: 'Immediate / Next Business Day upon stock verification',
  }
];

const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-emerald-500 px-2 py-1.5 text-[12px] outline-none transition-all placeholder:text-muted/30 text-primary"
const docInputClass = "w-full bg-surface border border-theme-subtle/40 px-3 py-2 rounded-lg text-xs outline-none focus:border-emerald-500/50 transition-colors disabled:text-muted disabled:cursor-default"

// Finished Product Quick Search Autocomplete
interface ProductSearchProps {
  value: string
  onChange: (val: string) => void
  onSelect: (product: any) => void
  products: any[]
  className?: string
}

const ProductSearchInput: React.FC<ProductSearchProps> = ({ value, onChange, onSelect, products, className = '' }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  
  const filtered = useMemo(() => {
    if (!value || value.trim().length === 0) return products.slice(0, 10);
    const q = value.toLowerCase();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.sku || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [value, products]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { 
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) 
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-muted pointer-events-none" />
        <input 
          type="text" 
          value={value} 
          className={`w-full bg-surface border border-theme-subtle rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-all placeholder:text-muted ${className}`}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)} 
          autoComplete="off" 
          placeholder="Type product name or SKU to quick-add..." 
        />
      </div>
      {open && filtered.length > 0 && createPortal(
        <ul 
          style={{ 
            top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY + 4, 
            left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, 
            width: wrapRef.current?.getBoundingClientRect().width, 
            minWidth: '320px' 
          }} 
          className="absolute z-[99999] bg-surface border border-emerald-500/30 shadow-2xl rounded-xl py-1.5 max-h-64 overflow-y-auto backdrop-blur-xl"
        >
          {filtered.map((item) => (
            <li 
              key={item.id} 
              className="px-3.5 py-2 hover:bg-emerald-500/10 cursor-pointer flex justify-between items-center transition-colors border-b border-theme-subtle/20 last:border-0"
              onMouseDown={e => { 
                e.preventDefault(); 
                onSelect(item); 
                onChange(''); 
                setOpen(false); 
              }}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-primary font-bold text-xs truncate">{item.name}</span>
                  {item.sku && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface2 text-muted border border-theme-subtle">
                      {item.sku}
                    </span>
                  )}
                </div>
                {item.description && (
                  <span className="text-[10px] text-muted truncate mt-0.5">{item.description}</span>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(item.unitPrice || 0))}
                </span>
                <span className={`text-[9px] font-medium ${(item.quantity || 0) > 0 ? 'text-muted' : 'text-amber-500 font-bold'}`}>
                  {(item.quantity || 0) > 0 ? `${item.quantity} in stock` : 'Out of stock'}
                </span>
              </div>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

export interface ProductQuotationItem {
  id: number;
  productId?: string;
  sku?: string;
  desc: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  uom?: string;
  stock?: number;
  note: string;
}

export const ProductQuotationBuilder: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const quoteIdParam = searchParams.get('quoteId')
  const previewParam = searchParams.get('preview')
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const canApprove = can('approvals.quotations')
  const { settings } = useSettings()

  const { data: customers } = useCustomers()
  const { data: leads } = useLeads()
  const { data: currencies } = useCurrencies()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: inventory = [] } = useInventory()

  // Filter only finished goods / products from inventory
  const finishedProducts = useMemo(() => {
    return inventory.filter((item: any) => 
      item.type === 'finished_product' || item.type === 'product'
    );
  }, [inventory]);

  const [currency, setCurrency] = useState('LKR')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [quotationStatus, setQuotationStatus] = useState<string>('Draft')
  const [approvedBy, setApprovedBy] = useState<string | null>(null)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)

  const [versions, setVersions] = useState<any[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [quickSearchText, setQuickSearchText] = useState('')

  // Document metadata
  const [docNo, setDocNo] = useState('FO/PD/02')
  const [issueNo, setIssueNo] = useState('01')
  const [issueDate, setIssueDate] = useState('March 04, 2026')
  const [quoDate, setQuoDate] = useState(new Date().toISOString().slice(0, 10))
  const [quotationNo, setQuotationNo] = useState('')
  const [attention, setAttention] = useState('')
  const [subject, setSubject] = useState('Supply of Finished Goods / Products')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [vatNo, setVatNo] = useState('')
  const [tinNo, setTinNo] = useState('')
  const [attachments, setAttachments] = useState<any[]>([])

  // Client Selection
  const [clientType, setClientType] = useState<'customer' | 'lead'>(leadId ? 'lead' : 'customer')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // Tax States
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('tp_opt2_sscl_absorbed_vat_sep')

  useEffect(() => {
    if (taxProfiles && taxProfiles.length > 0) {
      const currentValid = taxProfiles.some((p: any) => p.id === selectedProfileId);
      if (!currentValid) {
        const opt2 = taxProfiles.find((p: any) => p.id === 'tp_opt2_sscl_absorbed_vat_sep' || p.id === 'tp_vat_sscl' || p.name?.toLowerCase().includes('option 2'));
        if (opt2) setSelectedProfileId(opt2.id);
        else setSelectedProfileId(taxProfiles[0].id);
      }
    }
  }, [taxProfiles]);

  const selectedProfile = useMemo(() => {
    return (taxEnabled && selectedProfileId) ? taxProfiles?.find((p: any) => p.id === selectedProfileId) : null;
  }, [taxEnabled, selectedProfileId, taxProfiles]);

  // Product Line Items (Instead of BOMs!)
  const [custItems, setCustItems] = useState<ProductQuotationItem[]>([])

  // Discount & Terms
  const [custDiscount, setCustDiscount] = useState<number | string>(0)
  const [custDiscountType, setCustDiscountType] = useState<'percent' | 'amount'>('percent')
  const [custDiscountAmount, setCustDiscountAmount] = useState<number | string>(0)
  const [custTerms, setCustTerms] = useState('')
  const [custValidity, setCustValidity] = useState('30 Days')
  const [custDelivery, setCustDelivery] = useState('3-5 Working Days')
  const [selectedTermsPresetId, setSelectedTermsPresetId] = useState<string>('standard-manufacturing')
  const [bankDetailId, setBankDetailId] = useState<string>('')

  // AI polishing state
  const [isPolishingAll, setIsPolishingAll] = useState(false)
  const [polishingItemId, setPolishingItemId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Load Customer or Lead Details
  const selectedLead = useMemo(() => {
    return leads?.find((l: any) => l.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  const selectedCustomer = useMemo(() => {
    if (clientType === 'customer') {
      return customers?.find((c: any) => c.id === selectedLeadId) || null;
    }
    if (selectedLead?.customerId) {
      return customers?.find((c: any) => c.id === selectedLead.customerId) || null;
    }
    return null;
  }, [customers, selectedLeadId, clientType, selectedLead]);

  const currentEntity = selectedCustomer || selectedLead;

  // Set default terms and quotation no
  useEffect(() => {
    if (!custTerms) {
      const def = DEFAULT_TERMS_PRESETS.find(p => p.isDefault) || DEFAULT_TERMS_PRESETS[0];
      setCustTerms(def.terms);
      setCustValidity(def.validity);
      setCustDelivery(def.delivery);
    }
    if (!quotationNo) {
      const seq = Date.now().toString().slice(-4);
      setQuotationNo(`PQ-${seq}`);
    }
  }, []);

  // Handle client selection
  const handleSelectLeadOrCustomer = (item: any) => {
    if (!item) return;
    const itemId = item.id || item;
    setSelectedLeadId(itemId);

    if (clientType === 'customer') {
      const cust = customers?.find((c: any) => c.id === itemId) || item;
      setCustomerName(cust.company || cust.name || '');
      setCustomerAddress(cust.address || '');
      if (cust.name) setAttention(cust.name);
      setVatNo(cust.vat || '');
      setTinNo(cust.svat || cust.tin || cust.brNumber || '');
      if (cust.paymentTerms) setCustTerms(cust.paymentTerms);
      if (cust.deliveryTerms) setCustDelivery(cust.deliveryTerms);
      const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
      setQuotationNo(`PQ-${custPrefix}${Date.now().toString().slice(-4)}`);
    } else {
      const leadItem = leads?.find((l: any) => l.id === itemId) || item;
      setCustomerName(leadItem.company || leadItem.name || '');
      if (leadItem.name) setAttention(leadItem.name);
      setCustomerAddress(leadItem.address || '');
      setVatNo(leadItem.vat || '');
      setTinNo(leadItem.svat || leadItem.tin || '');
      setQuotationNo(`PQ-LEAD-${Date.now().toString().slice(-4)}`);
    }
  };

  // Add Finished Product as a line item
  const handleAddProduct = (prod: any) => {
    const descText = `${prod.name}${prod.sku ? ` (${prod.sku})` : ''}${prod.description ? `\n${prod.description}` : ''}`;
    const newItem: ProductQuotationItem = {
      id: Date.now(),
      productId: prod.id,
      sku: prod.sku,
      desc: descText,
      qty: 1,
      unitPrice: Number(prod.unitPrice || 0),
      unitCost: Number(prod.unitCost || 0),
      uom: prod.uom || 'pcs',
      stock: Number(prod.quantity || 0),
      note: ''
    };
    setCustItems(prev => [...prev, newItem]);
    showToast('success', `Added "${prod.name}" to quotation lines`);
  };

  const addCustomItem = () => {
    setCustItems(prev => [
      ...prev,
      {
        id: Date.now(),
        desc: '',
        qty: 1,
        unitPrice: 0,
        unitCost: 0,
        uom: 'pcs',
        stock: 0,
        note: ''
      }
    ]);
  };

  const updateCustItem = (id: number, field: string, val: any) => {
    setCustItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  const removeCustItem = (id: number) => {
    setCustItems(prev => prev.filter(i => i.id !== id));
  };

  // Currency handler
  const handleCurrencyChange = (newCurrencyCode: string) => {
    if (!currencies || currencies.length === 0) return;
    const oldCur = (currencies as any[]).find((c: any) => c.code === currency) || { exchangeRate: 1 };
    const newCur = (currencies as any[]).find((c: any) => c.code === newCurrencyCode) || { exchangeRate: 1 };
    const multiplier = newCur.exchangeRate / oldCur.exchangeRate;
    
    setCustItems(items => items.map(i => ({
      ...i,
      unitPrice: Number((i.unitPrice * multiplier).toFixed(2))
    })));
    setCurrency(newCurrencyCode);
  };

  // Terms preset selection
  const handleSelectTermsPreset = (presetId: string) => {
    setSelectedTermsPresetId(presetId);
    const preset = DEFAULT_TERMS_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCustTerms(preset.terms);
      setCustValidity(preset.validity);
      setCustDelivery(preset.delivery);
    }
  };

  // AI Polish Item
  const handleAiPolishItem = async (id: number) => {
    const item = custItems.find(i => i.id === id);
    if (!item || !item.desc.trim()) return;
    setPolishingItemId(id);
    try {
      const enrichedDesc = await generateQuotationDescription({
        partTitle: item.desc.split('\n')[0] || 'Finished Product',
        rawDescription: item.desc,
        customerName: customerName || 'Customer',
        quantity: item.qty || 1
      });
      if (enrichedDesc) {
        updateCustItem(id, 'desc', enrichedDesc);
        showToast('success', 'Description enhanced with AI!');
      }
    } catch (e: any) {
      showToast('error', e.message || 'AI generation failed');
    } finally {
      setPolishingItemId(null);
    }
  };

  const handleAiPolishAll = async () => {
    if (custItems.length === 0) return;
    setIsPolishingAll(true);
    let count = 0;
    try {
      for (const item of custItems) {
        if (!item.desc.trim()) continue;
        const enriched = await generateQuotationDescription({
          partTitle: item.desc.split('\n')[0] || 'Finished Product',
          rawDescription: item.desc,
          customerName: customerName || 'Customer',
          quantity: item.qty || 1
        });
        if (enriched) {
          updateCustItem(item.id, 'desc', enriched);
          count++;
        }
      }
      showToast('success', `Polished ${count} item descriptions with AI!`);
    } catch (e: any) {
      showToast('error', e.message || 'AI generation failed');
    } finally {
      setIsPolishingAll(false);
    }
  };

  // Financial Calculations
  const custSubtotal = useMemo(() => {
    return custItems.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0);
  }, [custItems]);

  const totalProductCost = useMemo(() => {
    return custItems.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitCost || 0)), 0);
  }, [custItems]);

  const custDiscountAmt = useMemo(() => {
    if (custDiscountType === 'amount') {
      return Math.min(custSubtotal, Math.max(0, Number(custDiscountAmount) || 0));
    }
    return custSubtotal * (Math.max(0, Number(custDiscount) || 0) / 100);
  }, [custSubtotal, custDiscountType, custDiscount, custDiscountAmount]);

  const custTotal = Math.max(0, custSubtotal - custDiscountAmt);

  // Taxes
  const { custSscl, custVat, custWithSSCL } = useMemo(() => {
    if (!taxEnabled || !selectedProfile) {
      return { custSscl: 0, custVat: 0, custWithSSCL: custTotal };
    }
    let s = 0;
    let v = 0;
    const base = custTotal;
    const t1 = base * (Number(selectedProfile.tax1_rate || 0) / 100);
    if (selectedProfile.tax1_show_separately === 1) s = t1;
    
    const baseForVat = selectedProfile.tax2_compound ? (base + t1) : base;
    const t2 = baseForVat * (Number(selectedProfile.tax2_rate || 0) / 100);
    if (selectedProfile.tax2_show_separately === 1) v = t2;
    
    return {
      custSscl: s,
      custVat: v,
      custWithSSCL: base + s + v
    };
  }, [taxEnabled, selectedProfile, custTotal]);

  // Expected Profit & Margin (Finished Product Cost vs Revenue)
  const expectedProfit = custSubtotal - totalProductCost;
  const expectedMargin = custSubtotal > 0 ? (expectedProfit / custSubtotal) * 100 : 0;

  // Selected Bank
  const selectedBank = useMemo(() => {
    if (!bankDetailId || bankDetailId === 'none') return null;
    const rawBankSettings = settings?.company_bank_details;
    if (rawBankSettings) {
      try {
        const parsed = typeof rawBankSettings === 'string' ? JSON.parse(rawBankSettings) : rawBankSettings;
        if (Array.isArray(parsed)) return parsed.find((b: any) => b.id === bankDetailId) || null;
      } catch (e) {}
    }
    return null;
  }, [bankDetailId, settings?.company_bank_details]);

  // Load versions
  const loadVersions = async () => {
    if (!selectedLeadId) return;
    try {
      const data = await fetchQuotations(selectedLeadId);
      if (Array.isArray(data)) {
        const prodQuotes = data.filter((q: any) => q.type === 'product' || q.type === 'product_draft' || q.data?.includes('"isProductQuotation":true'));
        setVersions(prodQuotes);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (selectedLeadId) loadVersions();
  }, [selectedLeadId]);

  // Load quoteId from query
  const initialLoadedRef = useRef(false);
  useEffect(() => {
    if (quoteIdParam && !initialLoadedRef.current) {
      import('@/lib/api').then(({ fetchQuotations }) => {
        fetchQuotations().then((allQuotes: any[]) => {
          const target = allQuotes.find((q: any) => q.id === quoteIdParam);
          if (target) {
            try {
              const snap = typeof target.data === 'string' ? JSON.parse(target.data) : target.data;
              restoreSnapshot(snap);
              setCurrentId(target.id);
              setQuotationStatus(target.status || 'Draft');
              setApprovedBy(target.approvedBy || null);
              setApprovedAt(target.approvedAt || null);
              setRejectionReason(target.rejectionReason || null);
              initialLoadedRef.current = true;
              if (previewParam === '1') setPrintModalOpen(true);
            } catch (e) {}
          }
        });
      });
    }
  }, [quoteIdParam, previewParam]);

  const restoreSnapshot = (snap: any) => {
    if (!snap) return;
    setDocNo(snap.docNo || 'FO/PD/02');
    setIssueNo(snap.issueNo || '01');
    setIssueDate(snap.issueDate || 'March 04, 2026');
    setQuoDate(snap.quoDate || new Date().toISOString().slice(0, 10));
    setQuotationNo(snap.quotationNo || '');
    setAttention(snap.attention || '');
    setSubject(snap.subject || 'Supply of Finished Goods / Products');
    setCustomerName(snap.customerName || '');
    setCustomerAddress(snap.customerAddress || '');
    setVatNo(snap.vatNo || '');
    setTinNo(snap.tinNo || '');
    setAttachments(snap.attachments || []);
    setTaxEnabled(snap.taxEnabled ?? true);
    setSelectedProfileId(snap.selectedProfileId || 'tp_opt2_sscl_absorbed_vat_sep');
    setCustItems(snap.custItems || []);
    setCustTerms(snap.custTerms || '');
    setCustValidity(snap.custValidity || '30 Days');
    setCustDelivery(snap.custDelivery || '3-5 Working Days');
    setCustDiscount(snap.custDiscount || 0);
    setCustDiscountType(snap.custDiscountType || 'percent');
    setCustDiscountAmount(snap.custDiscountAmount || 0);
    setBankDetailId(snap.bankDetailId || '');
  };

  // Save quotation
  const handleSave = async (asStatus?: string) => {
    if (!customerName.trim() && !selectedLeadId) {
      showToast('error', 'Please select or enter a Customer name first');
      return;
    }
    setIsSaving(true);
    try {
      const snapshot = {
        isProductQuotation: true,
        quotationCategory: 'product',
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo,
        attention, subject, attachments, customerName, customerAddress,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custDiscountType, custDiscountAmount,
        selectedTermsPresetId,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        productTotals: { totalCost: totalProductCost, revenue: custSubtotal, margin: expectedMargin, profit: expectedProfit },
        taxEnabled, selectedProfileId, selectedProfile, custSscl, custVat,
        customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName
      };

      const amount = custWithSSCL;
      let result;

      if (currentId) {
        result = await updateQuotation(currentId, {
          leadId: selectedLeadId || 'WALK-IN',
          type: 'product',
          data: snapshot,
          totalAmount: amount,
          customAmount: null,
          selectedProfileId,
          taxEnabled,
          docNo,
          issueNo,
          issueDate
        });
        if (result.success) {
          showToast('success', 'Product Quotation updated successfully!');
          await loadVersions();
        } else {
          showToast('error', result.error || 'Update failed');
        }
      } else {
        result = await createQuotation({
          leadId: selectedLeadId || 'WALK-IN',
          type: 'product',
          data: snapshot,
          totalAmount: amount,
          customAmount: null,
          selectedProfileId,
          taxEnabled,
          docNo,
          issueNo,
          issueDate
        });
        if (result.success) {
          const newId = result.quotation?.id;
          setCurrentId(newId);
          showToast('success', `Product Quotation ${result.quotation?.id} saved!`);
          navigate(`/crm/product-quotations/new/${selectedLeadId || 'WALK-IN'}?quoteId=${newId}`, { replace: true });
          await loadVersions();
        } else {
          showToast('error', result.error || 'Save failed');
        }
      }
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Approval
  const handleSubmitApproval = async () => {
    if (!currentId) {
      await handleSave();
    }
    if (!currentId) return;
    try {
      await submitQuotationForApproval(currentId);
      setQuotationStatus('Pending Approval');
      showToast('success', 'Quotation submitted for Manager / Director approval');
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleApprove = async () => {
    if (!currentId) return;
    try {
      await approveQuotation(currentId, user?.name || 'Director');
      setQuotationStatus('Approved');
      setApprovedBy(user?.name || 'Director');
      setApprovedAt(new Date().toISOString());
      showToast('success', 'Quotation Approved!');
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleReject = async () => {
    if (!currentId) return;
    const reason = prompt('Please enter the rejection reason:');
    if (!reason) return;
    try {
      await rejectQuotation(currentId, reason);
      setQuotationStatus('Rejected');
      setRejectionReason(reason);
      showToast('success', 'Quotation Rejected');
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[99999] px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-400' 
            : 'bg-red-600 text-white border-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header / Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/crm/product-quotations')}
            className="p-2 rounded-xl bg-surface hover:bg-surface2 text-muted hover:text-primary border border-theme-subtle transition-all"
            title="Back to Product Quotations"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <PackageCheck size={18} />
              </span>
              <h1 className="text-xl font-bold text-primary tracking-tight">Product Quotation Builder</h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                Finished Goods
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Instant sales quotation for finished goods with live inventory cost & margin tracking
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Badge */}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
            quotationStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
            quotationStatus === 'Pending Approval' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
            quotationStatus === 'Rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
            quotationStatus === 'Sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
            'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              quotationStatus === 'Approved' ? 'bg-emerald-500' :
              quotationStatus === 'Pending Approval' ? 'bg-amber-500' :
              quotationStatus === 'Rejected' ? 'bg-red-500' :
              quotationStatus === 'Sent' ? 'bg-blue-500' : 'bg-zinc-400'
            }`} />
            {quotationStatus}
          </span>

          {/* Version History Dropdown */}
          {versions.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface hover:bg-surface2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Clock size={13} className="text-muted" />
                <span>v{versions[0]?.version || 1} ({versions.length})</span>
                <ChevronDown size={13} className="text-muted" />
              </button>
              {showVersionHistory && (
                <div className="absolute right-0 mt-1 w-64 bg-surface border border-theme-subtle rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-theme-subtle">
                    Revision History
                  </div>
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        restoreSnapshot(typeof v.data === 'string' ? JSON.parse(v.data) : v.data);
                        setCurrentId(v.id);
                        setQuotationStatus(v.status || 'Draft');
                        setShowVersionHistory(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-surface2 flex justify-between items-center transition-colors border-b border-theme-subtle/20 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">v{v.version} • {formatCurrency(Number(v.totalAmount || 0))}</span>
                        <span className="text-[10px] text-muted">{formatDate(v.date)}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-theme-subtle text-muted">
                        {v.status || 'Draft'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Print Preview Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Eye} 
            onClick={() => setPrintModalOpen(true)}
            className="border border-theme-subtle bg-surface hover:bg-surface2 h-8 text-xs font-semibold"
          >
            Preview
          </Button>

          {/* Email Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Send} 
            onClick={() => setEmailModalOpen(true)}
            className="border border-theme-subtle bg-surface hover:bg-surface2 h-8 text-xs font-semibold text-blue-600 dark:text-blue-400"
          >
            Email
          </Button>

          {/* Approval Buttons */}
          {quotationStatus === 'Draft' && (
            <Button
              variant="ghost"
              size="sm"
              icon={Clock}
              onClick={handleSubmitApproval}
              className="border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 h-8 text-xs font-semibold"
            >
              Submit Approval
            </Button>
          )}

          {canApprove && quotationStatus === 'Pending Approval' && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                icon={CheckCircle2}
                onClick={handleApprove}
                className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 h-8 text-xs font-bold"
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={XCircle}
                onClick={handleReject}
                className="bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/20 h-8 text-xs font-bold"
              >
                Reject
              </Button>
            </div>
          )}

          {/* Main Save / Update Button */}
          <Button
            variant="primary"
            size="sm"
            icon={isSaving ? Loader2 : Save}
            disabled={isSaving}
            onClick={() => handleSave()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-8 text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            {isSaving ? 'Saving...' : (currentId ? 'Update Quotation' : 'Save Quotation')}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Details & Products vs Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8-column side: Client Details & Products Table */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 1: Customer & Metadata Card */}
          <GlassCard className="p-5 border-theme-subtle">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-theme-subtle">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider">
                <Building2 size={15} className="text-emerald-500" />
                <span>Client & Document Details</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg p-0.5 bg-surface2 border border-theme-subtle text-[11px]">
                  <button
                    type="button"
                    onClick={() => setClientType('customer')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      clientType === 'customer' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('lead')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      clientType === 'lead' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    Lead
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddCustomer(true)}
                  className="h-7 text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                >
                  New Client
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Customer/Lead Combobox */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Select {clientType === 'customer' ? 'Customer' : 'Lead'}
                </label>
                <select
                  value={selectedLeadId || ''}
                  onChange={e => handleSelectLeadOrCustomer(e.target.value)}
                  className={docInputClass + " font-medium"}
                >
                  <option value="">-- Choose {clientType === 'customer' ? 'Registered Customer' : 'Sales Lead'} --</option>
                  {(clientType === 'customer' ? customers : leads)?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name || 'No Name'})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quotation No */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Quotation Number
                </label>
                <input
                  type="text"
                  value={quotationNo}
                  onChange={e => setQuotationNo(e.target.value)}
                  placeholder="e.g. PQ-2026-001"
                  className={docInputClass + " font-mono font-bold text-emerald-600 dark:text-emerald-400"}
                />
              </div>

              {/* Attention / Contact Person */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Attention (Contact Person)
                </label>
                <input
                  type="text"
                  value={attention}
                  onChange={e => setAttention(e.target.value)}
                  placeholder="e.g. Mr. Sunimal Perera (Procurement Manager)"
                  className={docInputClass}
                />
              </div>

              {/* Quotation Date */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={quoDate}
                  onChange={e => setQuoDate(e.target.value)}
                  className={docInputClass}
                />
              </div>

              {/* Customer Company / Display Name */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Client / Company Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Ceylon Cold Stores PLC"
                  className={docInputClass}
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Subject / Heading
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Quotation for Ready-Made Industrial Components"
                  className={docInputClass}
                />
              </div>

              {/* Customer Address */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Billing & Delivery Address
                </label>
                <textarea
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="e.g. No. 125, Industrial Zone, Biyagama, Sri Lanka"
                  rows={2}
                  className={docInputClass + " resize-none leading-relaxed"}
                />
              </div>

              {/* VAT and TIN/SVAT */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Client VAT No
                </label>
                <input
                  type="text"
                  value={vatNo}
                  onChange={e => setVatNo(e.target.value)}
                  placeholder="e.g. 102345678-7000"
                  className={docInputClass + " font-mono"}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Client SVAT / TIN No
                </label>
                <input
                  type="text"
                  value={tinNo}
                  onChange={e => setTinNo(e.target.value)}
                  placeholder="e.g. SVAT002345"
                  className={docInputClass + " font-mono"}
                />
              </div>
            </div>
          </GlassCard>

          {/* Section 2: Finished Products Catalog & Quotation Line Items (NO BOMS!) */}
          <div className="border border-emerald-500/30 rounded-2xl bg-surface shadow-sm overflow-hidden">
            {/* Header with Quick Actions */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-theme-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Boxes size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                    Finished Products Quotation Lines
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                      {custItems.length} {custItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-muted">
                    Pick ready-to-sell products from your warehouse inventory or add custom lines
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Currency selector */}
                <select 
                  value={currency} 
                  onChange={e => handleCurrencyChange(e.target.value)} 
                  className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1 text-xs font-bold text-primary outline-none focus:border-emerald-500"
                >
                  <option value="LKR">LKR (Rs.)</option>
                  {(currencies as any[])?.map((c: any) => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>

                {/* AI Polish All */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={isPolishingAll ? Loader2 : Sparkles} 
                  onClick={handleAiPolishAll} 
                  disabled={isPolishingAll || custItems.length === 0}
                  className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold border border-purple-500/20 h-7 text-[11px]"
                >
                  {isPolishingAll ? 'Polishing...' : '✨ Polish All'}
                </Button>

                {/* Browse Catalog Modal Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ShoppingBag}
                  onClick={() => setCatalogModalOpen(true)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 h-7 text-[11px]"
                >
                  Browse Catalog
                </Button>

                {/* Add Custom Blank Line */}
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={Plus} 
                  onClick={addCustomItem} 
                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Add Custom Item
                </Button>
              </div>
            </div>

            {/* Quick Product Search Bar */}
            <div className="p-4 bg-surface2/30 border-b border-theme-subtle/50">
              <ProductSearchInput
                value={quickSearchText}
                onChange={setQuickSearchText}
                onSelect={handleAddProduct}
                products={finishedProducts}
              />
            </div>

            {/* Line Items Table */}
            {custItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                  <thead>
                    <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5 min-w-[280px]">Product / Description</th>
                      <th className="px-3 py-2.5 w-20 text-center">Stock</th>
                      <th className="px-3 py-2.5 w-20">Qty</th>
                      <th className="px-3 py-2.5 w-28">Unit Cost</th>
                      <th className="px-3 py-2.5 w-32">Unit Price</th>
                      <th className="px-4 py-2.5 w-32 text-right">Total</th>
                      <th className="px-3 py-2.5 w-24">Margin</th>
                      <th className="px-3 py-2.5 w-28">Notes</th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {custItems.map((item, idx) => {
                      const lineTotal = Number(item.qty || 0) * Number(item.unitPrice || 0);
                      const lineCost = Number(item.qty || 0) * Number(item.unitCost || 0);
                      const lineProfit = lineTotal - lineCost;
                      const lineMargin = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;

                      return (
                        <tr key={item.id} className="border-b border-theme-subtle/10 hover:bg-surface2/20 transition-colors group">
                          <td className="px-4 py-2.5 text-xs font-mono text-muted text-center">{idx + 1}</td>
                          <td className="p-2">
                            <div className="relative group/desc">
                              {item.sku && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    SKU: {item.sku}
                                  </span>
                                  {item.uom && (
                                    <span className="text-[9px] text-muted">
                                      • Unit: {item.uom}
                                    </span>
                                  )}
                                </div>
                              )}
                              <textarea
                                value={item.desc}
                                onChange={e => updateCustItem(item.id, 'desc', e.target.value)}
                                placeholder="Product description, technical specs..."
                                className="w-full bg-transparent outline-none text-xs font-medium resize-y min-h-[50px] p-2 leading-relaxed block border border-transparent hover:border-theme-subtle/40 focus:border-emerald-500/50 focus:bg-surface rounded-lg pr-20"
                                rows={item.desc.split('\n').length > 1 ? Math.min(item.desc.split('\n').length, 5) : 2}
                              />
                              <div className="absolute top-1.5 right-1.5 flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleAiPolishItem(item.id)}
                                  disabled={polishingItemId === item.id}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all opacity-80 group-hover/desc:opacity-100 disabled:opacity-50"
                                  title="Enhance description using AI"
                                >
                                  {polishingItemId === item.id ? (
                                    <Loader2 size={10} className="animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles size={10} className="text-purple-600" />
                                  )}
                                  <span>Polish</span>
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.stock !== undefined ? (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                (item.stock || 0) >= (item.qty || 1)
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              }`}>
                                {item.stock} {item.uom || 'pcs'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted">-</span>
                            )}
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={e => updateCustItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                              className={tableInputClass + " font-mono font-bold text-center"}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={item.unitCost}
                              onChange={e => updateCustItem(item.id, 'unitCost', Number(e.target.value))}
                              className={tableInputClass + " font-mono text-muted"}
                              title="Internal Cost price (used to calculate margin)"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))}
                              className={tableInputClass + " font-mono font-bold text-primary focus:border-emerald-500"}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-primary">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              lineMargin >= 20 ? 'bg-emerald-500/10 text-emerald-600' :
                              lineMargin > 0 ? 'bg-blue-500/10 text-blue-600' :
                              'bg-red-500/10 text-red-600'
                            }`}>
                              {lineMargin.toFixed(0)}%
                            </span>
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={e => updateCustItem(item.id, 'note', e.target.value)}
                              placeholder="Note..."
                              className={tableInputClass + " text-muted text-[11px]"}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => removeCustItem(item.id)}
                              className="text-muted/40 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete line"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Package size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-primary">No finished products added yet</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Use the search bar above or click "Browse Catalog" to select ready products from your warehouse inventory.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={ShoppingBag} 
                    onClick={() => setCatalogModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Browse Finished Products
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={Plus} 
                    onClick={addCustomItem}
                    className="border border-theme-subtle text-xs"
                  >
                    Add Custom Line
                  </Button>
                </div>
              </div>
            )}

            {/* Table Footer Totals */}
            {custItems.length > 0 && (
              <div className="px-5 py-3 bg-surface2/30 border-t border-theme-subtle flex flex-wrap justify-between items-center gap-3">
                <span className="text-xs text-muted">
                  Total {custItems.length} product lines • Combined Cost: <span className="font-mono font-semibold text-primary">{formatCurrency(totalProductCost)}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Subtotal:</span>
                  <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(custSubtotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quotation Terms & Conditions Preset */}
          <div className="border border-theme-subtle/50 rounded-2xl bg-surface p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-theme-subtle/50">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider">
                <FileText size={15} className="text-emerald-500" />
                <span>Quotation Terms & Conditions Preset</span>
              </div>
              <div className="w-full sm:w-72">
                <select
                  value={selectedTermsPresetId}
                  onChange={e => handleSelectTermsPreset(e.target.value)}
                  className="w-full bg-surface2 border border-theme-subtle rounded-lg px-2.5 py-1 text-xs text-primary focus:border-emerald-500 outline-none font-medium"
                >
                  {DEFAULT_TERMS_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Validity Period
                </label>
                <input
                  type="text"
                  value={custValidity}
                  onChange={e => setCustValidity(e.target.value)}
                  placeholder="e.g. 30 Days from date of quotation"
                  className={docInputClass}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Delivery Terms
                </label>
                <input
                  type="text"
                  value={custDelivery}
                  onChange={e => setCustDelivery(e.target.value)}
                  placeholder="e.g. Ex-Factory / 3-5 Working Days"
                  className={docInputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Payment & Commercial Terms
                </label>
                <textarea
                  value={custTerms}
                  onChange={e => setCustTerms(e.target.value)}
                  placeholder="Payment details, warranty, delivery terms..."
                  rows={2}
                  className={docInputClass + " resize-none leading-relaxed"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 4-column side: Summary & Est. Financials Card */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quotation Summary Card */}
          <div className="border border-emerald-500/20 rounded-2xl bg-surface shadow-sm p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-500" />
              <span>Quotation Summary</span>
            </h3>

            <div className="space-y-3.5 relative z-10">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-medium">Sub Total</span>
                <span className="font-mono font-semibold text-secondary text-sm">
                  {formatCurrency(custSubtotal)}
                </span>
              </div>

              {/* Discount Section */}
              <div className="space-y-1.5 pt-2 border-t border-theme-subtle/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted font-medium">Discount</span>
                    <div className="inline-flex rounded-md p-0.5 bg-surface2 border border-theme-subtle text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCustDiscountType('percent')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                          custDiscountType === 'percent' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-muted hover:text-primary'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustDiscountType('amount')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                          custDiscountType === 'amount' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-muted hover:text-primary'
                        }`}
                      >
                        LKR
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-red-500 font-semibold text-xs">
                    -{formatCurrency(custDiscountAmt)}
                  </span>
                </div>

                <div className="flex items-center bg-surface2 border border-theme-subtle/60 rounded-lg px-2.5 py-1">
                  <input
                    type="number"
                    min="0"
                    value={custDiscountType === 'percent' ? custDiscount : custDiscountAmount}
                    onChange={e => {
                      if (custDiscountType === 'percent') setCustDiscount(e.target.value);
                      else setCustDiscountAmount(e.target.value);
                    }}
                    placeholder={custDiscountType === 'percent' ? "Discount %" : "Discount Amount"}
                    className="w-full bg-transparent font-mono text-xs font-bold text-primary outline-none"
                  />
                  <span className="text-[10px] text-muted font-bold ml-1">
                    {custDiscountType === 'percent' ? '%' : 'LKR'}
                  </span>
                </div>
              </div>

              {/* Taxes Breakdown */}
              {taxEnabled && selectedProfile && (
                <div className="space-y-1.5 pt-2 border-t border-theme-subtle/50 text-xs">
                  {selectedProfile.tax1_show_separately === 1 && custSscl > 0 && (
                    <div className="flex justify-between items-center text-muted">
                      <span>{selectedProfile.tax1_name} ({selectedProfile.tax1_rate}%)</span>
                      <span className="font-mono font-semibold text-secondary">+{formatCurrency(custSscl)}</span>
                    </div>
                  )}
                  {selectedProfile.tax2_show_separately === 1 && custVat > 0 && (
                    <div className="flex justify-between items-center text-muted">
                      <span>{selectedProfile.tax2_name} ({selectedProfile.tax2_rate}%)</span>
                      <span className="font-mono font-semibold text-secondary">+{formatCurrency(custVat)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-3 border-t border-dashed border-theme-subtle">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Grand Total</span>
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(custWithSSCL)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Est. Financials Card (Margin & Profit Tracking from Product Costs!) */}
          <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
            expectedProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-red-500/5 border-red-500/25'
          }`}>
            <div className={`absolute -right-4 -bottom-4 opacity-5 ${expectedProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              <LineChart size={110} />
            </div>

            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className={`p-1.5 rounded-lg ${expectedProfit >= 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                <LineChart size={14} />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${expectedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                Est. Financials & Taxes
              </span>
            </div>

            {/* Applicable Tax Toggle and Options (Clean Two-Row Layout!) */}
            <div className="space-y-3 relative z-10">
              {/* Row 1: Header + Pill Toggle */}
              <div className="flex items-center justify-between border-b border-theme-subtle/50 pb-2">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Applicable Tax</span>
                <button
                  type="button"
                  onClick={() => setTaxEnabled(t => !t)}
                  className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-emerald-600' : 'bg-surface2 border border-theme-subtle'}`}
                  title={taxEnabled ? 'Tax enabled' : 'Tax disabled'}
                >
                  <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Row 2 & 3: 2-Row Tax Preset Options + Dropdown */}
              {taxEnabled && (
                <div className="space-y-1.5 pb-2 border-b border-theme-subtle/50">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProfileId('tp_opt1_absorbed')}
                      className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                        selectedProfileId === 'tp_opt1_absorbed'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle/70'
                      }`}
                      title="Option 1: VAT & SSCL Absorbed (Total Value)"
                    >
                      Opt 1: Absorbed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProfileId('tp_opt2_sscl_absorbed_vat_sep')}
                      className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                        selectedProfileId === 'tp_opt2_sscl_absorbed_vat_sep' || selectedProfileId === 'tp_vat_sscl'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle/70'
                      }`}
                      title="Option 2: SSCL Absorbed + VAT Separate"
                    >
                      Opt 2: SSCL In, VAT Sep
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProfileId('tp_opt3_both_separate')}
                      className={`col-span-2 px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                        selectedProfileId === 'tp_opt3_both_separate'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle/70'
                      }`}
                      title="Option 3: Both SSCL & VAT Separate (2 Lines)"
                    >
                      Opt 3: Both 2 Lines
                    </button>
                  </div>
                  <select
                    value={selectedProfileId}
                    onChange={e => setSelectedProfileId(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-lg text-[10px] outline-none focus:border-emerald-500"
                  >
                    <option value="">- Select Tax Profile -</option>
                    {taxProfiles?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Total Product Cost */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Product Cost</span>
                <span className="font-mono font-bold text-secondary">{formatCurrency(totalProductCost)}</span>
              </div>

              {/* Margin % */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Margin</span>
                <span className={`text-[13px] font-bold ${expectedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                  {expectedMargin.toFixed(1)}%
                </span>
              </div>

              {/* Estimated Profit */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {expectedProfit >= 0 ? 'Est. Profit' : 'Est. Loss'}
                </span>
                <span className={`text-[14px] font-mono font-black ${expectedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(expectedProfit))}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Details Selector Card */}
          <div className="border border-theme-subtle/50 rounded-2xl bg-surface p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider pb-2 border-b border-theme-subtle/50">
              <CreditCard size={15} className="text-emerald-500" />
              <span>Remittance Bank Details</span>
            </div>
            
            <select
              value={bankDetailId}
              onChange={e => setBankDetailId(e.target.value)}
              className="w-full bg-surface2 border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:border-emerald-500 outline-none font-medium"
            >
              <option value="">-- Use Default Company Bank --</option>
              <option value="none">-- Do Not Display Bank Details --</option>
              {(() => {
                const raw = settings?.company_bank_details;
                if (!raw) return null;
                try {
                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  if (Array.isArray(parsed)) {
                    return parsed.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.accountName})
                      </option>
                    ));
                  }
                } catch(e) {}
                return null;
              })()}
            </select>

            {selectedBank && (
              <div className="p-2.5 rounded-lg bg-surface2/50 border border-theme-subtle/50 text-[11px] text-muted space-y-1">
                <div><strong>Bank:</strong> {selectedBank.bankName}</div>
                <div><strong>Account:</strong> <span className="font-mono text-primary font-bold">{selectedBank.accountNumber}</span></div>
                <div><strong>Beneficiary:</strong> {selectedBank.accountName}</div>
                {selectedBank.swiftCode && <div><strong>SWIFT:</strong> {selectedBank.swiftCode}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Browse Modal */}
      {catalogModalOpen && (
        <Modal
          isOpen={catalogModalOpen}
          onClose={() => setCatalogModalOpen(false)}
          title="Browse Finished Goods Catalog"
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 bg-surface2 border border-theme-subtle rounded-xl px-3 py-2">
              <Search size={16} className="text-muted shrink-0" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by product name, SKU, or description..."
                className="w-full bg-transparent text-xs text-primary outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {finishedProducts
                .filter((p: any) => 
                  !catalogSearch.trim() || 
                  (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (p.sku || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (p.description || '').toLowerCase().includes(catalogSearch.toLowerCase())
                )
                .map((prod: any) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-xl border border-theme-subtle bg-surface hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-primary group-hover:text-emerald-600 transition-colors">
                          {prod.name}
                        </h4>
                        {prod.sku && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-muted shrink-0">
                            {prod.sku}
                          </span>
                        )}
                      </div>
                      {prod.description && (
                        <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-theme-subtle/40">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(Number(prod.unitPrice || 0))}
                        </span>
                        <span className="text-[10px] text-muted">
                          Cost: {formatCurrency(Number(prod.unitCost || 0))} • Stock: {prod.quantity || 0} {prod.uom || 'pcs'}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={() => handleAddProduct(prod)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs"
                      >
                        Add to Quote
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {finishedProducts.length === 0 && (
              <div className="py-12 text-center text-muted text-xs">
                No finished products found in inventory. Please add finished products in the Inventory module.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Print Preview Modal */}
      {printModalOpen && (
        <Modal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title={`Quotation Preview - ${quotationNo}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex justify-end gap-2 pb-3 border-b border-theme-subtle">
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={() => {
                  const element = document.getElementById('product-quote-print-container');
                  if (element) {
                    html2pdf().from(element).set({
                      margin: 10,
                      filename: `Quotation_${quotationNo || 'PQ'}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).save();
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Download PDF
              </Button>
            </div>

            <div id="product-quote-print-container" className="bg-white text-zinc-900 rounded-xl p-6 shadow-sm overflow-x-auto">
              <QuotationPrintView
                data={{
                  docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo,
                  attention, subject, customerName, customerAddress,
                  custItems, custTerms, custValidity, custDelivery, custDiscount,
                  custDiscountType,
                  bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
                  custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
                  taxEnabled, selectedProfile, custSscl, custVat,
                  customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName
                }}
                type="main"
                lead={currentEntity || selectedLead}
                settings={settings}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Send Email Modal */}
      {emailModalOpen && (
        <SendDocumentEmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          documentType="quotation"
          documentNumber={quotationNo}
          customerEmail={currentEntity?.email || ''}
          customerName={attention || customerName || 'Customer'}
          totalAmount={custWithSSCL}
          validityDays={custValidity}
          elementIdToPdf="product-quote-print-container"
        />
      )}

      {/* Add Client Modal */}
      {showAddCustomer && (
        <CustomerModal
          isOpen={showAddCustomer}
          onClose={() => setShowAddCustomer(false)}
          onSuccess={(newCust: any) => {
            setShowAddCustomer(false);
            if (newCust?.id) {
              setClientType('customer');
              handleSelectLeadOrCustomer(newCust);
            }
          }}
        />
      )}
    </div>
  )
}
