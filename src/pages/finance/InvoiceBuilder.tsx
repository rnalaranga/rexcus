import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Building2, Calendar, FileText,
  Calculator, AlertCircle, Printer, Eye, Palette, ChevronDown,
  CheckCircle2, Phone, Mail, Hash, X, Landmark, Receipt, FileDown
} from 'lucide-react';
import { printElement } from '@/lib/printElement';
import { exportToPdf } from '@/lib/exportToPdf';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete';
import { useCustomers, useLeads, useInventory } from '@/hooks/useData';
import { useTaxes, useTaxProfiles } from '@/hooks/useFinance';
import { createInvoice, updateInvoice, fetchPaymentReceipts } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { QuotationTermsPreset, DEFAULT_TERMS_PRESETS } from '@/components/TermsConditionsManager';
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal';

export { toWords, formatGazetteDate, TEMPLATES, InvoicePreview } from '@/components/finance/InvoicePreview';
import { InvoicePreview, toWords, formatGazetteDate, TEMPLATES } from '@/components/finance/InvoicePreview';

const docInputClass = "w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500/50 transition-colors";
const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-blue-500 focus:bg-surface px-2 py-1 text-xs outline-none transition-all";

// ─── Main Component ───────────────────────────────────────────────────────────
export const InvoiceBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: leads = [] } = useLeads();
  const { data: taxRates } = useTaxes();
  const { data: taxProfiles } = useTaxProfiles();
  const { data: inventory } = useInventory();
  const { toast, showError } = useDialog();

  const [docNo, setDocNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customCustomer, setCustomCustomer] = useState<any>(null);
  const [attention, setAttention] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxProfileId, setTaxProfileId] = useState('tp_opt2_sscl_absorbed_vat_sep');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [discount, setDiscount] = useState<number | string>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [isEditing, setIsEditing] = useState(false);

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
  const [advanceReceipts, setAdvanceReceipts] = useState<any[]>([]);
  const [linkedProformaInvoice, setLinkedProformaInvoice] = useState<any | null>(null);
  const [loadedOrderPaidAmount, setLoadedOrderPaidAmount] = useState<number>(0);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadedSourceOrder, setLoadedSourceOrder] = useState<any | null>(null);
  const [loadedSourceQuote, setLoadedSourceQuote] = useState<any | null>(null);

  const [searchParams] = useSearchParams();
  const paramOrderId = searchParams.get('orderId');
  const paramQuoteId = searchParams.get('quoteId');
  const paramEditInvoiceId = searchParams.get('editInvoiceId') || searchParams.get('invoiceId') || searchParams.get('edit');

  useEffect(() => {
    if (!paramOrderId && !paramQuoteId && !paramEditInvoiceId) return;

    let isMounted = true;

    const loadSourceData = async () => {
      try {
        if (paramEditInvoiceId) {
          setIsEditing(true);
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/invoices/${paramEditInvoiceId}`);
            if (res.ok) {
              const inv = await res.json();
              if (inv && !inv.error) {
                setDocNo(inv.invoiceNo || inv.id);
                if (inv.customerId) setCustomerId(inv.customerId);
                if (inv.attention) setAttention(inv.attention);
                if (inv.date) setDate(inv.date.slice(0, 10));
                if (inv.dueDate) setDueDate(inv.dueDate.slice(0, 10));
                if (inv.deliveryDate) setDeliveryDate(inv.deliveryDate.slice(0, 10));
                if (inv.placeOfSupply) setPlaceOfSupply(inv.placeOfSupply);
                if (inv.modeOfPayment) setModeOfPayment(inv.modeOfPayment);
                if (inv.additionalInfo) setAdditionalInfo(inv.additionalInfo);
                if (inv.quotationNo) setQuotationNo(inv.quotationNo);
                if (inv.dispatchNo) setDispatchNo(inv.dispatchNo);
                if (inv.orderNo) setOrderNo(inv.orderNo);
                if (inv.poNo) setPoNo(inv.poNo);
                if (inv.customerVat) setCustomerVat(inv.customerVat);
                if (inv.notes) setNotes(inv.notes);
                if (inv.taxProfileId) setTaxProfileId(inv.taxProfileId);
                if (inv.isTaxInclusive !== undefined) setIsTaxInclusive(Boolean(inv.isTaxInclusive));
                if (inv.bankDetailId) setBankDetailId(inv.bankDetailId);
                if (inv.discount !== undefined) setDiscount(inv.discount);
                if (inv.discountType) setDiscountType(inv.discountType);
                if (inv.discountAmount !== undefined) setDiscountAmount(inv.discountAmount);
                if (inv.items) {
                  try {
                    const parsed = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      setItems(parsed.map((it: any) => ({
                        id: it.id || crypto.randomUUID(),
                        inventoryId: it.inventoryId || it.productId || '',
                        description: it.description || it.desc || '',
                        qty: Number(it.qty) || 1,
                        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
                        taxRateId: ''
                      })));
                    }
                  } catch(e) {}
                }
                toast('Invoice details loaded for editing', 'success');
                return;
              }
            }
          } catch(e) {
            console.error('Failed to load invoice for editing:', e);
          }
        }
        if (paramOrderId) {
          let ord: any = null;
          // 1. Try single order endpoint
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finished-goods-orders/${paramOrderId}`);
            if (res.ok) {
              ord = await res.json();
            }
          } catch (e) {}

          // 2. Fallback to list search
          if (!ord) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finished-goods-orders`);
              if (res.ok) {
                const orders = await res.json();
                ord = (orders || []).find((o: any) => String(o.id) === String(paramOrderId) || String(o.orderNo) === String(paramOrderId));
              }
            } catch (e) {}
          }

          if (ord && isMounted) {
            setLoadedSourceOrder(ord);
            // Customer Matching
            const ordCustId = ord.customerId || '';
            const ordCustName = ord.customerName || '';
            const ordCustPhone = ord.customerPhone || '';
            const ordCustEmail = ord.customerEmail || '';
            const ordCustAddress = ord.deliveryAddress || '';

            const matchedCust = (ordCustId ? customers.find(c => c.id === ordCustId) : null) ||
              (ordCustName ? customers.find(c => (c.name && c.name.toLowerCase() === ordCustName.toLowerCase()) || (c.company && c.company.toLowerCase() === ordCustName.toLowerCase())) : null) ||
              (ordCustId ? leads.find(l => l.id === ordCustId) : null) ||
              (ordCustName ? leads.find(l => (l.name && l.name.toLowerCase() === ordCustName.toLowerCase()) || (l.company && l.company.toLowerCase() === ordCustName.toLowerCase())) : null);

            if (matchedCust) {
              setCustomerId(matchedCust.id);
              if (matchedCust.vat) setCustomerVat(matchedCust.vat);
            } else {
              const custId = ordCustId || `CUST-${ord.orderNo ? ord.orderNo.replace(/[^A-Za-z0-9_-]/g, '') : Date.now().toString().slice(-4)}`;
              const custObj = {
                id: custId,
                name: ordCustName || 'Customer',
                company: ordCustName || 'Customer',
                phone: ordCustPhone,
                email: ordCustEmail,
                address: ordCustAddress
              };
              setCustomCustomer(custObj);
              setCustomerId(custId);
            }

            if (ord.paidAmount) setLoadedOrderPaidAmount(Number(ord.paidAmount) || 0);
            if (ord.orderNo) setOrderNo(ord.orderNo);
            if (ord.quotationNo) setQuotationNo(ord.quotationNo);
            if (ord.attention) setAttention(ord.attention);
            const dpNo = ord.gatePassNo || ord.gatePassId || ord.dispatchNo || '';
            if (dpNo) {
              setDispatchNo(dpNo);
            } else {
              try {
                const gpRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/gate-passes`);
                if (gpRes.ok) {
                  const allGps = await gpRes.json();
                  const matchedGp = (allGps || []).find((g: any) =>
                    (g.orderId && String(g.orderId) === String(ord.id)) ||
                    (ord.orderNo && g.orderNo && String(g.orderNo).trim().toLowerCase() === String(ord.orderNo).trim().toLowerCase())
                  );
                  if (matchedGp && isMounted) {
                    setDispatchNo(matchedGp.id);
                  }
                }
              } catch (e) {}
            }
            if (ord.targetDeliveryDate) setDeliveryDate(ord.targetDeliveryDate.slice(0, 10));
            if (ord.deliveryAddress) setPlaceOfSupply(ord.deliveryAddress);
            if (ord.paymentTerms) setNotes(ord.paymentTerms);
            if (ord.taxProfileId) setTaxProfileId(ord.taxProfileId);
            if (Number(ord.taxAmount) > 0 || ord.taxProfileId) {
              setTaxEnabled(true);
            }

            // Parse items
            let parsedItems: any[] = [];
            if (ord.items) {
              try {
                parsedItems = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
              } catch (e) {}
            }

            const lineItems: any[] = [];
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              for (const it of parsedItems) {
                const desc = it.description || it.productName || it.desc || it.name || '';
                lineItems.push({
                  id: crypto.randomUUID(),
                  inventoryId: it.productId || it.inventoryId || '',
                  description: desc || ord.productName || 'Order Item',
                  qty: Number(it.qty) || 1,
                  unitPrice: Number(it.unitPrice ?? it.price ?? 0),
                  taxRateId: ''
                });
              }
            } else if (ord.productName) {
              lineItems.push({
                id: crypto.randomUUID(),
                inventoryId: ord.productId || '',
                description: ord.productName + (ord.productSku ? ` (${ord.productSku})` : ''),
                qty: Number(ord.qty) || 1,
                unitPrice: Number(ord.unitPrice) || 0,
                taxRateId: ''
              });
            }

            if (lineItems.length > 0) {
              setItems(lineItems);
            }
            toast(`Loaded details and ${lineItems.length} item(s) from Sales Order ${ord.orderNo || ord.id}!`, 'success');
          }
        } else if (paramQuoteId) {
          let q: any = null;

          // 1. Dedicated single quotation endpoint
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/single/${paramQuoteId}`);
            if (res.ok) {
              q = await res.json();
            }
          } catch (e) {}

          // 2. Standard quotation route with fallback
          if (!q) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${paramQuoteId}`);
              if (res.ok) {
                const data = await res.json();
                q = Array.isArray(data) ? (data.find((d: any) => d.id === paramQuoteId || d.quotationNo === paramQuoteId) || data[0]) : data;
              }
            } catch (e) {}
          }

          // 3. Fallback to all quotations
          if (!q) {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations`);
              if (res.ok) {
                const allQuotes = await res.json();
                q = (allQuotes || []).find((it: any) => String(it.id) === String(paramQuoteId) || String(it.quotationNo) === String(paramQuoteId) || String(it.docNo) === String(paramQuoteId));
              }
            } catch (e) {}
          }

          if (q && isMounted) {
            setLoadedSourceQuote(q);
            const parsed = typeof q.data === 'string' ? JSON.parse(q.data) : (q.data || {});

            // Customer Resolution
            const qCustId = q.matchedCustomerId || q.leadId || parsed.leadId || '';
            const qCustName = q.leadCompany || q.leadName || parsed.customerCompany || parsed.customerName || '';
            const qCustAddress = q.leadAddress || parsed.customerAddress || '';
            const qCustPhone = q.leadPhone || '';
            const qCustEmail = q.leadEmail || '';
            const qVat = parsed.vatNo || parsed.tinNo || q.leadVat || '';

            const matchedCust = (qCustId ? customers.find(c => c.id === qCustId) : null) ||
              (qCustName ? customers.find(c => (c.name && c.name.toLowerCase() === qCustName.toLowerCase()) || (c.company && c.company.toLowerCase() === qCustName.toLowerCase())) : null) ||
              (qCustId ? leads.find(l => l.id === qCustId) : null) ||
              (qCustName ? leads.find(l => (l.name && l.name.toLowerCase() === qCustName.toLowerCase()) || (l.company && l.company.toLowerCase() === qCustName.toLowerCase())) : null);

            if (matchedCust) {
              setCustomerId(matchedCust.id);
              if (matchedCust.vat || qVat) setCustomerVat(matchedCust.vat || qVat);
            } else {
              const fallbackCustId = qCustId || `CUST-QUO-${Date.now().toString().slice(-4)}`;
              const custObj = {
                id: fallbackCustId,
                name: qCustName || 'Customer',
                company: qCustName || 'Customer',
                address: qCustAddress,
                phone: qCustPhone,
                email: qCustEmail,
                vat: qVat
              };
              setCustomCustomer(custObj);
              setCustomerId(fallbackCustId);
              if (qVat) setCustomerVat(qVat);
            }

            const qNo = q.quotationNo || q.docNo || parsed.quotationNo || q.quoNo || '';
            if (qNo) setQuotationNo(qNo);
            if (parsed.attention || q.attention) setAttention(parsed.attention || q.attention);
            if (parsed.custTerms || parsed.paymentTerms || parsed.terms) setNotes(parsed.custTerms || parsed.paymentTerms || parsed.terms);
            if (parsed.selectedProfileId || parsed.taxProfileId) setTaxProfileId(parsed.selectedProfileId || parsed.taxProfileId);
            if (parsed.taxEnabled !== undefined) setTaxEnabled(Boolean(parsed.taxEnabled));
            if (parsed.bankDetailId) setBankDetailId(parsed.bankDetailId);
            if (parsed.custDiscount !== undefined) setDiscount(parsed.custDiscount);
            if (parsed.custDiscountType) setDiscountType(parsed.custDiscountType);
            if (parsed.custDiscountAmount !== undefined) setDiscountAmount(parsed.custDiscountAmount);
            else if (parsed.custTotals?.discount !== undefined) setDiscountAmount(parsed.custTotals.discount);

            // Auto-detect Product Quotation (prices are tax inclusive)
            const isProdQuote = Boolean(
              q.isProductQuotation ||
              parsed.isProductQuotation ||
              q.quotationCategory === 'product' ||
              parsed.quotationCategory === 'product' ||
              String(qNo).startsWith('PQ') ||
              Array.isArray(parsed.custItems)
            );
            if (isProdQuote) {
              setIsTaxInclusive(true);
            }

            // Extract Line items
            const rawCustItems = parsed.custItems || parsed.items || [];
            const lineItems: any[] = [];

            if (Array.isArray(rawCustItems) && rawCustItems.length > 0) {
              for (const it of rawCustItems) {
                const desc = it.desc || it.description || it.name || it.text || '';
                if (!desc && !it.unitPrice && !it.amount) continue;
                lineItems.push({
                  id: crypto.randomUUID(),
                  inventoryId: it.productId || it.inventoryId || '',
                  description: desc || 'Quotation Item',
                  qty: Number(it.qty) || 1,
                  unitPrice: Number(it.unitPrice ?? it.price ?? it.unitCost ?? 0),
                  taxRateId: ''
                });
              }
            }

            // Fallback: If no line items yet, check jobItems or subject
            if (lineItems.length === 0) {
              if (Array.isArray(parsed.jobItems) && parsed.jobItems.length > 0) {
                const jiText = parsed.jobItems.map((j: any) => j.text || j.desc || '').filter(Boolean).join('\n• ');
                const desc = (parsed.subject ? `${parsed.subject}\n• ` : '') + (jiText || 'Custom Machining Job');
                lineItems.push({
                  id: crypto.randomUUID(),
                  inventoryId: '',
                  description: desc,
                  qty: Number(parsed.jobQty) || 1,
                  unitPrice: Number(q.totalAmount || q.customAmount || parsed.custTotals?.total || 0),
                  taxRateId: ''
                });
              } else if (parsed.subject || q.totalAmount) {
                lineItems.push({
                  id: crypto.randomUUID(),
                  inventoryId: '',
                  description: parsed.subject || `Quotation ${qNo || q.id}`,
                  qty: Number(parsed.jobQty) || 1,
                  unitPrice: Number(q.totalAmount || q.customAmount || 0),
                  taxRateId: ''
                });
              }
            }

            if (lineItems.length > 0) {
              setItems(lineItems);
            }

            // Auto-detect linked Sales Order & Gate Pass / Dispatch No for this quotation
            try {
              let matchedSo: any = null;
              // 1. Look for linked Finished Goods / Sales Order
              const soRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finished-goods-orders`);
              if (soRes.ok) {
                const allSos = await soRes.json();
                matchedSo = (allSos || []).find((s: any) =>
                  (s.quoteId && String(s.quoteId) === String(q.id)) ||
                  (qNo && s.quotationNo && String(s.quotationNo).trim().toLowerCase() === String(qNo).trim().toLowerCase())
                );
                if (matchedSo && isMounted) {
                  if (matchedSo.orderNo) setOrderNo(matchedSo.orderNo);
                  if (matchedSo.deliveryAddress) setPlaceOfSupply(matchedSo.deliveryAddress);
                  if (matchedSo.targetDeliveryDate) setDeliveryDate(matchedSo.targetDeliveryDate.slice(0, 10));
                  const soDispatch = matchedSo.gatePassNo || matchedSo.gatePassId || matchedSo.dispatchNo;
                  if (soDispatch) {
                    setDispatchNo(soDispatch);
                  }
                }
              }

              // 2. Look for linked Gate Pass (Goods Delivery / Dispatch Note)
              const gpRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/gate-passes`);
              if (gpRes.ok) {
                const allGps = await gpRes.json();
                const matchedGp = (allGps || []).find((g: any) =>
                  (g.quoteId && String(g.quoteId) === String(q.id)) ||
                  (qNo && g.quoNo && String(g.quoNo).trim().toLowerCase() === String(qNo).trim().toLowerCase()) ||
                  (matchedSo && g.orderId && String(g.orderId) === String(matchedSo.id)) ||
                  (matchedSo && matchedSo.orderNo && g.orderNo && String(g.orderNo).trim().toLowerCase() === String(matchedSo.orderNo).trim().toLowerCase())
                );
                if (matchedGp && isMounted) {
                  setDispatchNo(matchedGp.id);
                  if (matchedGp.address) setPlaceOfSupply(matchedGp.address);
                }
              }
            } catch (soGpErr) {
              console.warn('Could not auto-link sales order or gate pass for quote:', soGpErr);
            }

            toast(`Loaded details and ${lineItems.length} item(s) from Quotation ${qNo || q.id}!`, 'success');
          }
        }
      } catch (e) {
        console.error('Failed to pre-fill invoice:', e);
      }
    };

    loadSourceData();
    return () => { isMounted = false; };
  }, [paramOrderId, paramQuoteId, customers.length, leads.length]);

  // Auto-fill dispatch / gate pass number if quotationNo or orderNo is entered and dispatchNo is empty
  useEffect(() => {
    let isMounted = true;
    const qTrim = quotationNo?.trim().toLowerCase();
    const oTrim = orderNo?.trim().toLowerCase();
    if (!qTrim && !oTrim) return;

    const timer = setTimeout(async () => {
      try {
        const gpRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/gate-passes`);
        if (!gpRes.ok) return;
        const allGps = await gpRes.json();
        const matched = (allGps || []).find((g: any) => {
          const gQuo = String(g.quoNo || '').trim().toLowerCase();
          const gOrd = String(g.orderNo || '').trim().toLowerCase();
          return (qTrim && gQuo === qTrim) || (oTrim && gOrd === oTrim);
        });
        if (matched && isMounted) {
          setDispatchNo(prev => prev || matched.id);
          if (matched.address) setPlaceOfSupply(prev => prev || matched.address);
        }
      } catch (e) {}
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [quotationNo, orderNo]);

  // Fetch advance payment receipts linked to quotation or order
  const refreshAdvanceReceipts = useCallback(() => {
    const qNo = quotationNo?.trim();
    const oNo = orderNo?.trim();
    if (!qNo && !oNo && !paramQuoteId && !paramOrderId) {
      setAdvanceReceipts([]);
      return;
    }

    fetchPaymentReceipts({
      quotationNo: qNo || undefined,
      quoteId: paramQuoteId || undefined,
      orderNo: oNo || undefined,
      orderId: paramOrderId || undefined
    }).then(res => {
      setAdvanceReceipts(Array.isArray(res) ? res : []);
    }).catch(err => {
      console.warn('Failed to fetch linked advance payment receipts:', err);
    });

    // Check for linked Advance Proforma Invoice
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/invoices`)
      .then(res => res.json())
      .then((invs: any[]) => {
        if (!Array.isArray(invs)) return;
        const matchedPi = invs.find((inv: any) => {
          const isProf = Boolean(
            inv.isProforma || 
            inv.invoiceType === 'proforma' || 
            inv.status === 'proforma' || 
            String(inv.id || inv.invoiceNo || '').startsWith('PI-')
          );
          if (!isProf) return false;
          const matchOrder = (oNo && (inv.orderNo === oNo || inv.orderId === oNo)) ||
                             (paramOrderId && (inv.orderId === paramOrderId || inv.orderNo === paramOrderId));
          const matchQuote = (qNo && inv.quotationNo === qNo) ||
                             (paramQuoteId && inv.quotationNo === paramQuoteId);
          return matchOrder || matchQuote;
        });
        if (matchedPi) {
          setLinkedProformaInvoice(matchedPi);
        }
      })
      .catch(() => {});
  }, [quotationNo, orderNo, paramQuoteId, paramOrderId]);

  useEffect(() => {
    refreshAdvanceReceipts();
  }, [refreshAdvanceReceipts]);

  const advanceDeducted = useMemo(() => {
    const receiptsSum = advanceReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const proformaPaid = Number(linkedProformaInvoice?.paidAmount || 0);
    const orderPaid = Number(loadedOrderPaidAmount || 0);
    return Math.max(receiptsSum, proformaPaid, orderPaid);
  }, [advanceReceipts, linkedProformaInvoice, loadedOrderPaidAmount]);

  const receiptNos = useMemo(() => {
    const nos = advanceReceipts.map(r => r.receiptNo).filter(Boolean);
    if (linkedProformaInvoice?.paidAmount > 0 && (linkedProformaInvoice.invoiceNo || linkedProformaInvoice.id)) {
      const pDoc = linkedProformaInvoice.invoiceNo || linkedProformaInvoice.id;
      if (!nos.includes(pDoc)) {
        nos.push(pDoc);
      }
    }
    return nos.join(', ');
  }, [advanceReceipts, linkedProformaInvoice]);

  const selectedCustomer = 
    customers.find(c => c.id === customerId) ||
    leads.find(l => l.id === customerId) ||
    (customCustomer && (customCustomer.id === customerId || !customerId) ? customCustomer : null) ||
    (customCustomer?.company ? (
      customers.find(c => (c.company && c.company.toLowerCase() === customCustomer.company.toLowerCase()) || (c.name && c.name.toLowerCase() === customCustomer.company.toLowerCase())) ||
      leads.find(l => (l.company && l.company.toLowerCase() === customCustomer.company.toLowerCase()) || (l.name && l.name.toLowerCase() === customCustomer.company.toLowerCase()))
    ) : null);

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

  const customerOptions = [
    ...customers.map(c => ({
      value: c.id,
      label: c.company ? (c.name && c.name !== c.company ? `${c.company} (${c.name})` : c.company) : (c.name || 'Unnamed Customer'),
      group: c.segment || 'Customers',
      extra: c.email || c.phone || ''
    })),
    ...leads
      .filter(l => !customers.some(c => c.id === l.id || (l.customerId && c.id === l.customerId)))
      .map(l => ({
        value: l.id,
        label: `${l.company || l.name || 'Lead'} (Lead)`,
        group: 'Leads',
        extra: l.email || l.phone || ''
      })),
    ...(customCustomer &&
       !customers.some(c => c.id === customCustomer.id || (customCustomer.company && (c.company?.toLowerCase() === customCustomer.company.toLowerCase() || c.name?.toLowerCase() === customCustomer.company.toLowerCase()))) &&
       !leads.some(l => l.id === customCustomer.id || (customCustomer.company && (l.company?.toLowerCase() === customCustomer.company.toLowerCase() || l.name?.toLowerCase() === customCustomer.company.toLowerCase())))
      ? [{
          value: customCustomer.id,
          label: `${customCustomer.company || customCustomer.name} (Quotation/Order Party)`,
          group: 'Quotation/Order Party',
          extra: customCustomer.phone || customCustomer.email || ''
        }]
      : [])
  ];

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
      if (selectedCustomer.vat) setCustomerVat(selectedCustomer.vat);
      if (selectedCustomer.paymentTerms && !notes) {
        setNotes(selectedCustomer.paymentTerms);
        if (/advance/i.test(selectedCustomer.paymentTerms)) setModeOfPayment('Advance');
        else if (/credit/i.test(selectedCustomer.paymentTerms)) setModeOfPayment('Credit');
      } else if (days > 0 && !notes) {
        setNotes(`${days} days credit`);
        setModeOfPayment('Credit');
      }
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
  const grossAmount = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  
  const discountAmt = discountType === 'amount'
    ? Math.min(grossAmount, Math.max(0, Number(discountAmount) || 0))
    : grossAmount * (Math.max(0, Number(discount) || 0) / 100);

  const netGross = Math.max(0, grossAmount - discountAmt);

  const handlePercentDiscountChange = (val: string) => {
    setDiscountType('percent');
    setDiscount(val);
    if (val === '' || isNaN(Number(val))) {
      setDiscountAmount('');
    } else {
      const p = Math.max(0, Number(val));
      setDiscountAmount(grossAmount > 0 ? Number((grossAmount * (p / 100)).toFixed(2)) : 0);
    }
  };

  const handleAmountDiscountChange = (val: string) => {
    setDiscountType('amount');
    setDiscountAmount(val);
    if (val === '' || isNaN(Number(val))) {
      setDiscount('');
    } else {
      const a = Math.max(0, Number(val));
      setDiscount(grossAmount > 0 ? Number(((a / grossAmount) * 100).toFixed(2)) : 0);
    }
  };

  const handleDiscountTypeToggle = (type: 'percent' | 'amount') => {
    if (type === discountType) return;
    if (type === 'percent') {
      const amt = Number(discountAmount) || 0;
      const pct = grossAmount > 0 ? ((amt / grossAmount) * 100).toFixed(2) : '0';
      setDiscountType('percent');
      setDiscount(pct);
    } else {
      const pct = Number(discount) || 0;
      const amt = grossAmount > 0 ? ((grossAmount * (pct / 100))).toFixed(2) : '0';
      setDiscountType('amount');
      setDiscountAmount(amt);
    }
  };

  let subtotal = netGross;
  let taxAmount = 0;
  let taxBreakdown = { tax1Amount: 0, tax2Amount: 0 };
  const selectedTaxProfile = taxProfiles?.find((p: any) => p.id === taxProfileId);
  
  if (taxEnabled && selectedTaxProfile) {
    const t1 = Number(selectedTaxProfile.tax1_rate || 0) / 100;
    const t2 = Number(selectedTaxProfile.tax2_rate || 0) / 100;

    const isSsclHidden = Boolean(Number(selectedTaxProfile.tax1_rate) > 0 && selectedTaxProfile.tax1_show_separately === 0);
    const isVatSeparate = Boolean(Number(selectedTaxProfile.tax2_rate) > 0 ? selectedTaxProfile.tax2_show_separately === 1 : true);
    const isSsclSeparate = Boolean(Number(selectedTaxProfile.tax1_rate) > 0 && selectedTaxProfile.tax1_show_separately === 1);

    if (isTaxInclusive) {
      // Prices already include taxes: back out base and taxes from netGross
      let baseSubtotal = netGross;
      let t1Amount = 0;
      let t2Amount = 0;

      if (isSsclHidden && isVatSeparate) {
        // Option 2: VAT separate, SSCL absorbed into supply value
        baseSubtotal = netGross / (1 + t2);
        t2Amount = netGross - baseSubtotal;
        t1Amount = 0;
      } else if (isSsclSeparate && isVatSeparate) {
        // Option 3: Both separate
        const divisor = selectedTaxProfile.tax2_compound ? ((1 + t1) * (1 + t2)) : (1 + t1 + t2);
        baseSubtotal = netGross / divisor;
        t1Amount = baseSubtotal * t1;
        const baseForT2 = selectedTaxProfile.tax2_compound ? (baseSubtotal + t1Amount) : baseSubtotal;
        t2Amount = baseForT2 * t2;
      } else {
        // Option 1: Both absorbed
        baseSubtotal = netGross;
        t1Amount = 0;
        t2Amount = 0;
      }

      subtotal = Math.round(baseSubtotal * 100) / 100;
      t1Amount = Math.round(t1Amount * 100) / 100;
      t2Amount = Math.round((netGross - subtotal - t1Amount) * 100) / 100;
      taxBreakdown = { tax1Amount: t1Amount, tax2Amount: t2Amount };
      taxAmount = t1Amount + t2Amount;
    } else {
      // Standard: tax added on top of discounted subtotal
      const t1Amount = subtotal * t1;
      const baseForT2 = selectedTaxProfile.tax2_compound ? (subtotal + t1Amount) : subtotal;
      const t2Amount = baseForT2 * t2;
      
      taxBreakdown = { tax1Amount: t1Amount, tax2Amount: t2Amount };
      taxAmount = t1Amount + t2Amount;
    }
  }
  
  const total = isTaxInclusive ? netGross : (subtotal + taxAmount);
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
      if (customCustomer && customCustomer.id === customerId && !customers.some(c => c.id === customerId) && !leads.some(l => l.id === customerId)) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: customCustomer.id,
              name: customCustomer.name || customCustomer.company,
              company: customCustomer.company || customCustomer.name,
              email: customCustomer.email || '',
              phone: customCustomer.phone || '',
              address: customCustomer.address || placeOfSupply || '',
              vat: customerVat || customCustomer.vat || ''
            })
          });
        } catch (custErr) {
          console.warn('Could not auto-create customer:', custErr);
        }
      }

      const invoicePayload = { 
        id: cleanDocNo, 
        invoiceNo: cleanDocNo, 
        customerId, 
        leadId: customerId, 
        attention, 
        date, 
        dueDate: dueDate || null, 
        items: JSON.stringify(items), 
        subtotal, 
        discount: Number(discount) || 0,
        discountType,
        discountAmount: discountAmt,
        taxAmount, 
        total, 
        amount: total, 
        notes, 
        status: advanceDeducted >= total ? 'paid' : (advanceDeducted > 0 ? 'partially_paid' : 'Unpaid'), 
        paidAmount: advanceDeducted,
        advanceDeducted,
        receiptIds: advanceReceipts.length > 0 ? JSON.stringify(advanceReceipts.map(r => r.id)) : null,
        payments: advanceReceipts.length > 0 ? JSON.stringify(advanceReceipts.map(r => ({
          id: `REC-${r.receiptNo || r.id}`,
          date: r.date,
          amount: Number(r.amount),
          method: r.paymentMethod || 'Advance',
          reference: `Advance Receipt ${r.receiptNo || ''}`
        }))) : null,
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
        isTaxInclusive: isTaxInclusive ? 1 : 0,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null)
      };

      let res: any;
      if (isEditing) {
        res = await updateInvoice(cleanDocNo, invoicePayload);
      } else {
        res = await createInvoice(invoicePayload);
      }
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

      toast(isEditing ? 'Invoice updated successfully!' : 'Invoice posted successfully!', 'success');
      navigate('/finance/invoices');
    } catch (e: any) { showError(e.message || 'Failed to post invoice.'); }
  };

  const handlePrint = () => {
    printElement('invoice-preview', docNo || 'Invoice');
  };

  const handleExportPDF = () => {
    exportToPdf('invoice-preview', `${docNo || 'Invoice'}.pdf`);
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
    isTaxInclusive,
    attention,
    bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null),
    advanceDeducted,
    receiptNos,
    discount: Number(discount) || 0,
    discountType,
    discountAmount: discountAmt,
    grossAmount
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
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <FileDown size={14} /> Export PDF
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Printer size={14} /> Print
          </button>
          <Button variant="primary" icon={Save} onClick={handleSave} className="text-xs">
            Post Invoice
          </Button>
        </div>
      </div>

      {/* Offscreen preview container so Print / Export PDF work even while in Builder mode */}
      {!showPreview && (
        <div style={{ position: 'fixed', left: '-99999px', top: 0, width: '210mm', opacity: 0, pointerEvents: 'none' }}>
          <InvoicePreview {...previewProps} />
        </div>
      )}

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

          {/* Advance Receipt Banner */}
          {advanceDeducted > 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    Advance Payment Credited: {formatCurrency(advanceDeducted)}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                      {receiptNos}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Found {advanceReceipts.length > 0 ? `${advanceReceipts.length} advance payment receipt(s)` : (linkedProformaInvoice ? `Advance Proforma #${linkedProformaInvoice.invoiceNo || linkedProformaInvoice.id}` : 'advance settlement')}. This advance will be credited against the total consideration on the official final tax invoice. Net balance due: <strong className="text-primary">{formatCurrency(Math.max(0, total - advanceDeducted))}</strong>.
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-600 text-white shadow-sm shrink-0">
                -{formatCurrency(advanceDeducted)}
              </span>
            </div>
          ) : (orderNo || quotationNo) ? (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    No Advance Payment Receipt Linked:
                  </span>{' '}
                  <span className="text-muted">
                    No advance payment receipt is recorded for {orderNo ? `Sales Order ${orderNo}` : `Quotation ${quotationNo}`}.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0 shadow-sm"
              >
                <Receipt size={14} /> Create Payment Receipt First
              </button>
            </div>
          ) : null}

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
                <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Search Customer (Autocomplete)</label>
                <CustomerAutocomplete
                  value={customerId}
                  onChange={(val, cust) => {
                    setCustomerId(val);
                    if (cust && cust.vat) setCustomerVat(cust.vat);
                  }}
                  customers={customers}
                  leads={leads}
                  placeholder="Type customer name, company, phone to autocomplete..."
                />
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
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Dispatch No / Gate Pass</label>
                    <input type="text" value={dispatchNo} onChange={e => setDispatchNo(e.target.value)} placeholder="GP-XXXX / DN-..." className={docInputClass} />
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
                        <td className="px-2 py-2 min-w-[200px]">
                          <ProductAutocomplete
                            value={item.inventoryId}
                            onChange={(val, prod) => {
                              handleChangeItem(item.id, 'inventoryId', val);
                              if (prod) {
                                if (!item.description || item.description === 'Item Description') {
                                  handleChangeItem(item.id, 'description', prod.name + (prod.sku ? ` (${prod.sku})` : ''));
                                }
                                if (prod.unitPrice && !item.unitPrice) {
                                  handleChangeItem(item.id, 'unitPrice', Number(prod.unitPrice));
                                }
                              }
                            }}
                            placeholder="Search product / SKU..."
                            className="text-xs"
                          />
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
                  <span className="text-sm text-muted">{isTaxInclusive ? 'Gross Item Total' : 'Gross Subtotal'}</span>
                  <span className="font-mono text-sm font-semibold">{formatCurrency(grossAmount)}</span>
                </div>

                {/* Discount Control Block */}
                <div className="py-2.5 border-t border-theme-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Discount</span>
                      <div className="flex items-center bg-surface border border-theme-subtle rounded p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeToggle('percent')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all ${discountType === 'percent' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted hover:text-primary'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeToggle('amount')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all ${discountType === 'amount' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted hover:text-primary'}`}
                        >
                          LKR
                        </button>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold text-rose-500">
                      {discountAmt > 0 ? `-${formatCurrency(discountAmt)}` : '0.00'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center bg-surface border rounded-lg px-2.5 py-1.5 transition-all ${discountType === 'percent' ? 'border-blue-500/60 ring-1 ring-blue-500/20 bg-blue-500/5' : 'border-theme-subtle'}`}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0"
                        value={discount}
                        onChange={e => handlePercentDiscountChange(e.target.value)}
                        onFocus={() => setDiscountType('percent')}
                        className="w-full bg-transparent text-xs font-mono outline-none text-primary"
                      />
                      <span className="text-[11px] text-muted ml-1 font-bold">%</span>
                    </div>
                    <div className={`flex items-center bg-surface border rounded-lg px-2.5 py-1.5 transition-all ${discountType === 'amount' ? 'border-blue-500/60 ring-1 ring-blue-500/20 bg-blue-500/5' : 'border-theme-subtle'}`}>
                      <span className="text-[10px] text-muted mr-1 font-semibold">LKR</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0.00"
                        value={discountAmount}
                        onChange={e => handleAmountDiscountChange(e.target.value)}
                        onFocus={() => setDiscountType('amount')}
                        className="w-full bg-transparent text-xs font-mono outline-none text-primary text-right"
                      />
                    </div>
                  </div>

                  {discountAmt > 0 && (
                    <div className="flex justify-between items-center text-xs text-muted pt-1">
                      <span>{isTaxInclusive ? 'Base Supply Value (Excl. VAT)' : 'Net Supply Value'}</span>
                      <span className="font-mono font-semibold text-primary">{formatCurrency(subtotal)}</span>
                    </div>
                  )}
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

                      <div className="pt-2 border-t border-theme-subtle/50 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-primary">Tax Inclusive Pricing</div>
                          <div className="text-[9.5px] text-muted">Prices include VAT/SSCL (extract without adding on top)</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsTaxInclusive(!isTaxInclusive)}
                          className={`w-8 h-4 rounded-full transition-colors relative flex items-center ${isTaxInclusive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                          title="Toggle tax inclusive pricing"
                        >
                          <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${isTaxInclusive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
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
                            <span className="font-mono text-amber-500">{isTaxInclusive ? '' : '+'}{formatCurrency(taxBreakdown.tax1Amount)}</span>
                          </div>
                        )}
                        {selectedTaxProfile.tax1_show_separately === 0 && (
                          <div className="flex justify-between items-center text-muted">
                            <span>{selectedTaxProfile.tax1_name} ({selectedTaxProfile.tax1_rate}%)</span>
                            <span className="font-mono text-emerald-500">{formatCurrency(taxBreakdown.tax1Amount)} (Absorbed)</span>
                          </div>
                        )}
                        {selectedTaxProfile.tax2_show_separately === 1 && (
                          <div className="flex justify-between items-center text-muted">
                            <span>{selectedTaxProfile.tax2_name} ({selectedTaxProfile.tax2_rate}%{isTaxInclusive ? ' Extracted' : ''})</span>
                            <span className="font-mono text-blue-500 font-semibold">{isTaxInclusive ? '' : '+'}{formatCurrency(taxBreakdown.tax2Amount)}</span>
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

                {advanceDeducted > 0 && (
                  <div className="pt-3 border-t border-theme-subtle space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Less Advance Paid ({receiptNos})</span>
                      <span className="font-mono font-bold text-emerald-600">-{formatCurrency(advanceDeducted)}</span>
                    </div>
                    <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                      <span className="text-sm font-black text-primary uppercase tracking-wide">Net Balance Due</span>
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        {formatCurrency(Math.max(0, total - advanceDeducted))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

        </div>
      )}

      {/* Advance Payment Receipt Modal */}
      <CreatePaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={loadedSourceOrder || (orderNo ? { id: paramOrderId, orderNo, customerId, customerName: customCustomer?.name || attention, totalPrice: total } : undefined)}
        quotation={loadedSourceQuote || (quotationNo ? { id: paramQuoteId, quotationNo, customerId, customerName: customCustomer?.name || attention, totalAmount: total } : undefined)}
        settings={company}
        onSuccess={(receipt) => {
          refreshAdvanceReceipts();
          const unboxed = receipt?.receipt || receipt;
          toast(`Official Advance Payment Receipt ${unboxed?.receiptNo || ''} created & credited!`, 'success');
        }}
      />
    </div>
  );
};
