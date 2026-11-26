import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Printer, Search, RefreshCw, X, FileText, 
  FileSpreadsheet, Trash2, CheckCircle2, Link2, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { useAccounts, useTaxProfiles } from '@/hooks/useFinance';
import { useCustomers, useSuppliers, useInvoices, useFinishedGoodsOrders } from '@/hooks/useData';
import { fetchCreditDebitNotes, createCreditDebitNote, fetchBills, fetchPOs, fetchGRNs } from '@/lib/api';
import { formatCurrency, resolveFileUrl } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useSettings } from '@/contexts/SettingsContext';
import { toWords, formatGazetteDate } from '@/components/finance/InvoicePreview';

interface NoteLineItem {
  id: string;
  description: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export const CreditDebitNotesTab: React.FC = () => {
  const { settings } = useSettings();
  const { data: accounts = [] } = useAccounts();
  const { data: taxProfiles = [] } = useTaxProfiles();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const { data: invoices = [] } = useInvoices();
  const { data: salesOrders = [] } = useFinishedGoodsOrders();
  const { showError, toast } = useDialog();

  const [notes, setNotes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'credit_note' | 'debit_note'>('ALL');
  const [partyTypeFilter] = useState<'ALL' | 'customer' | 'supplier'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrintNote, setActivePrintNote] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [noteType, setNoteType] = useState<'credit_note' | 'debit_note'>('credit_note');
  const [previewNoteNo, setPreviewNoteNo] = useState<string>('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Sales Return / Defective Goods');
  const [relatedDocType, setRelatedDocType] = useState('Invoice');
  const [relatedDocNo, setRelatedDocNo] = useState('');
  const [linkedDocMeta, setLinkedDocMeta] = useState<any>(null);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const docDropdownRef = useRef<HTMLDivElement>(null);

  const [accountId, setAccountId] = useState('');
  const [lineItems, setLineItems] = useState<NoteLineItem[]>([
    { id: '1', description: '', qty: 1, unitPrice: 0, amount: 0 }
  ]);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxProfileId, setTaxProfileId] = useState('tp_vat18');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [remarks, setRemarks] = useState('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetchCreditDebitNotes();
      setNotes(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    fetchBills().then(d => setBills(Array.isArray(d) ? d : [])).catch(() => {});
    fetchPOs().then(d => setPos(Array.isArray(d) ? d : [])).catch(() => {});
    fetchGRNs().then(d => setGrns(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docDropdownRef.current && !docDropdownRef.current.contains(e.target as Node)) {
        setShowDocDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const computeLocalFallbackNoteNo = (type: 'credit_note' | 'debit_note') => {
    const prefix = type === 'credit_note' ? 'CN-' : 'DN-';
    const currentYY = String(new Date().getFullYear()).slice(-2);
    let maxSeq = 1000;
    for (const n of notes) {
      if (n.type === type && n.noteNo) {
        const m = String(n.noteNo).match(/(\d+)$/);
        if (m && m[1]) {
          const val = parseInt(m[1], 10);
          if (!isNaN(val) && val > maxSeq) maxSeq = val;
        }
      }
    }
    return `${prefix}${currentYY}-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  const fetchNextSequentialNo = async (type: 'credit_note' | 'debit_note') => {
    const fallback = computeLocalFallbackNoteNo(type);
    setPreviewNoteNo(fallback);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/finance/credit-debit-notes/next-number?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.noteNo) setPreviewNoteNo(data.noteNo);
      }
    } catch {
      // Keep local fallback
    }
  };

  const openNewNoteModal = (type: 'credit_note' | 'debit_note') => {
    setNoteType(type);
    fetchNextSequentialNo(type);
    setDate(new Date().toISOString().slice(0, 10));
    setPartyType(type === 'credit_note' ? 'customer' : 'supplier');
    setPartyId('');
    setPartyName('');
    setReason(type === 'credit_note' ? 'Customer Price Adjustment / Sales Return' : 'Purchase Return to Vendor / Defect');
    setRelatedDocType(type === 'credit_note' ? 'Invoice' : 'Supplier Bill');
    setRelatedDocNo('');
    setLinkedDocMeta(null);
    setLineItems([
      {
        id: String(Date.now()),
        description: type === 'credit_note' ? 'Customer Price Adjustment / Sales Return' : 'Purchase Return to Vendor / Defect',
        qty: 1,
        unitPrice: 0,
        amount: 0
      }
    ]);
    setTaxEnabled(false);
    setTaxProfileId('tp_vat18');
    setIsTaxInclusive(false);
    setRemarks('');

    if (type === 'credit_note') {
      const salesRet = accounts.find((a: any) => a.type === 'Revenue' || a.code === '4000');
      setAccountId(salesRet ? salesRet.id : '');
    } else {
      const purRet = accounts.find((a: any) => a.type === 'Expense' || a.code === '5000');
      setAccountId(purRet ? purRet.id : '');
    }

    setIsModalOpen(true);
  };

  // Build searchable documents list for traceability autocomplete
  const candidateDocs = useMemo(() => {
    const q = relatedDocNo.trim().toLowerCase();
    const list: Array<{
      docNo: string;
      docType: string;
      date: string;
      partyId: string;
      partyName: string;
      partyType: 'customer' | 'supplier';
      total: number;
      subtotal: number;
      taxAmount: number;
      taxProfileId?: string;
      isTaxInclusive?: boolean;
      items: NoteLineItem[];
      raw: any;
    }> = [];

    if (relatedDocType === 'Invoice') {
      for (const inv of invoices) {
        if (inv.isProforma || inv.invoiceType === 'proforma') continue;
        const docNo = String(inv.invoiceNo || inv.id || '').trim();
        if (!docNo) continue;
        const cust = customers.find((c: any) => String(c.id) === String(inv.customerId));
        const pName = inv.customerName || cust?.company || cust?.name || '';
        let parsedItems: any[] = [];
        try {
          parsedItems = typeof inv.items === 'string' ? JSON.parse(inv.items) : (Array.isArray(inv.items) ? inv.items : []);
        } catch {}

        const taxAmt = Number(inv.taxAmount || 0);
        const totAmt = Number(inv.total || inv.amount || 0);
        const subAmt = Number(inv.subtotal || (totAmt - taxAmt) || 0);
        const invIsIncl = Boolean(inv.isTaxInclusive);
        const divisor = (invIsIncl && taxAmt > 0 && subAmt > 0 && totAmt > subAmt) ? (totAmt / subAmt) : 1;

        const mappedItems: NoteLineItem[] = parsedItems.map((it: any, idx: number) => {
          const qty = Number(it.qty) || 1;
          const rawUp = Number(it.unitPrice ?? it.price ?? 0);
          const up = divisor > 1.001 ? Number((rawUp / divisor).toFixed(2)) : rawUp;
          return {
            id: `${docNo}-${idx}`,
            description: it.description || it.productName || it.name || `Item ${idx + 1}`,
            sku: it.sku || it.productSku || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });

        list.push({
          docNo,
          docType: 'Invoice',
          date: String(inv.date || '').slice(0, 10),
          partyId: String(inv.customerId || ''),
          partyName: pName,
          partyType: 'customer',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: inv.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: false,
          items: mappedItems,
          raw: inv
        });
      }
    } else if (relatedDocType === 'Supplier Bill') {
      for (const b of bills) {
        const docNo = String(b.billNo || b.id || '').trim();
        if (!docNo) continue;
        const supp = suppliers.find((s: any) => String(s.id) === String(b.supplierId));
        const pName = b.supplierName || supp?.company || supp?.name || '';
        let parsedItems: any[] = [];
        try {
          parsedItems = typeof b.items === 'string' ? JSON.parse(b.items) : (Array.isArray(b.items) ? b.items : []);
        } catch {}

        const taxAmt = Number(b.taxAmount || 0);
        const totAmt = Number(b.totalAmount || b.amount || 0);
        const subAmt = Number(b.subtotal || (totAmt - taxAmt) || 0);

        const mappedItems: NoteLineItem[] = parsedItems.map((it: any, idx: number) => {
          const qty = Number(it.qty || it.quantity || 1);
          const up = Number(it.unitPrice || it.rate || it.price || 0);
          return {
            id: `${docNo}-${idx}`,
            description: it.description || it.itemName || it.name || `Bill Item ${idx + 1}`,
            sku: it.sku || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });

        list.push({
          docNo,
          docType: 'Supplier Bill',
          date: String(b.billDate || b.date || b.createdAt || '').slice(0, 10),
          partyId: String(b.supplierId || ''),
          partyName: pName,
          partyType: 'supplier',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: b.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: Boolean(b.isTaxInclusive),
          items: mappedItems,
          raw: b
        });
      }
    } else if (relatedDocType === 'Sales Order') {
      for (const so of salesOrders) {
        const docNo = String(so.orderNo || so.id || '').trim();
        if (!docNo) continue;
        const pName = so.customerCompany || so.customerName || '';
        let parsedItems: any[] = [];
        try {
          parsedItems = typeof so.items === 'string' ? JSON.parse(so.items) : (Array.isArray(so.items) ? so.items : []);
        } catch {}
        const taxAmt = Number(so.taxAmount || 0);
        const totAmt = Number(so.totalPrice || 0);
        const subAmt = Number(so.subtotal || (totAmt - taxAmt) || 0);
        const mappedItems: NoteLineItem[] = parsedItems.map((it: any, idx: number) => {
          const qty = Number(it.qty) || 1;
          const up = Number(it.unitPrice || 0);
          return {
            id: `${docNo}-${idx}`,
            description: it.description || it.productName || `Order Item ${idx + 1}`,
            sku: it.productSku || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });
        list.push({
          docNo,
          docType: 'Sales Order',
          date: String(so.orderDate || so.createdAt || '').slice(0, 10),
          partyId: String(so.customerId || ''),
          partyName: pName,
          partyType: 'customer',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: so.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: Boolean(so.isTaxInclusive),
          items: mappedItems,
          raw: so
        });
      }
    } else if (relatedDocType === 'Purchase Order') {
      for (const po of pos) {
        const docNo = String(po.poNumber || po.id || '').trim();
        if (!docNo) continue;
        const supp = suppliers.find((s: any) => String(s.id) === String(po.supplierId));
        const pName = po.supplierName || supp?.company || supp?.name || '';
        let parsedItems: any[] = [];
        try {
          parsedItems = typeof po.items === 'string' ? JSON.parse(po.items) : (Array.isArray(po.items) ? po.items : []);
        } catch {}
        const taxAmt = Number(po.taxAmount || 0);
        const totAmt = Number(po.totalAmount || 0);
        const subAmt = Number(po.subtotal || (totAmt - taxAmt) || 0);
        const mappedItems: NoteLineItem[] = parsedItems.map((it: any, idx: number) => {
          const qty = Number(it.quantity || it.qty || 1);
          const up = Number(it.unitPrice || 0);
          return {
            id: `${docNo}-${idx}`,
            description: it.itemName || it.description || `PO Item ${idx + 1}`,
            sku: it.sku || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });
        list.push({
          docNo,
          docType: 'Purchase Order',
          date: String(po.orderDate || po.createdAt || '').slice(0, 10),
          partyId: String(po.supplierId || ''),
          partyName: pName,
          partyType: 'supplier',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: po.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: Boolean(po.isTaxInclusive),
          items: mappedItems,
          raw: po
        });
      }
    } else if (relatedDocType === 'GRN') {
      for (const g of grns) {
        const docNo = String(g.grnNumber || g.id || '').trim();
        if (!docNo) continue;
        const supp = suppliers.find((s: any) => String(s.id) === String(g.supplierId));
        const pName = g.supplierName || supp?.company || supp?.name || '';
        const totAmt = Number(g.totalAmount || 0);
        const taxAmt = Number(g.taxAmount || 0);
        const subAmt = Number(g.subtotal || (totAmt - taxAmt) || 0);
        list.push({
          docNo,
          docType: 'GRN',
          date: String(g.receivedDate || g.createdAt || '').slice(0, 10),
          partyId: String(g.supplierId || ''),
          partyName: pName,
          partyType: 'supplier',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: g.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: Boolean(g.isTaxInclusive),
          items: [],
          raw: g
        });
      }
    }

    // Filter by selected party if partyId or partyName is already selected
    const filtered = list.filter(d => {
      const partyMatch = !partyId && !partyName
        ? true
        : (partyId && d.partyId && String(d.partyId) === String(partyId)) ||
          (partyName && d.partyName && d.partyName.toLowerCase().includes(partyName.toLowerCase()));
      const queryMatch = !q ||
        d.docNo.toLowerCase().includes(q) ||
        d.partyName.toLowerCase().includes(q) ||
        d.date.includes(q);
      return partyMatch && queryMatch;
    });

    // If strict party filter returned 0 but query matches global docs, show global matches
    if (filtered.length === 0 && q) {
      return list.filter(d =>
        d.docNo.toLowerCase().includes(q) ||
        d.partyName.toLowerCase().includes(q)
      ).slice(0, 15);
    }

    return filtered.slice(0, 20);
  }, [relatedDocType, relatedDocNo, partyId, partyName, invoices, bills, salesOrders, pos, grns, customers, suppliers]);

  const applySelectedDocument = (doc: any, forceLoadItems = true) => {
    setRelatedDocNo(doc.docNo);
    setLinkedDocMeta(doc);
    setShowDocDropdown(false);

    // Auto-populate party if not set or different
    if (doc.partyType && doc.partyType !== partyType) {
      setPartyType(doc.partyType);
    }
    if (doc.partyId) setPartyId(doc.partyId);
    if (doc.partyName) setPartyName(doc.partyName);

    // Auto-populate VAT settings from linked document
    if (doc.taxAmount > 0) {
      setTaxEnabled(true);
      const isAbsorbed = doc.taxProfileId === 'tp_vat18_absorbed' || doc.taxProfileId === 'tp_opt1_absorbed';
      setTaxProfileId(isAbsorbed ? 'tp_vat18_absorbed' : 'tp_vat18');
      setIsTaxInclusive(Boolean(doc.isTaxInclusive));
    }

    // Load items from document
    if (forceLoadItems) {
      if (Array.isArray(doc.items) && doc.items.length > 0) {
        setLineItems(doc.items.map((it: any, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          description: it.description,
          sku: it.sku || '',
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          amount: Number(((Number(it.qty) || 1) * (Number(it.unitPrice) || 0)).toFixed(2))
        })));
      } else if (doc.subtotal > 0) {
        setLineItems([{
          id: String(Date.now()),
          description: `Adjustment against ${doc.docType} #${doc.docNo}`,
          qty: 1,
          unitPrice: Number(doc.subtotal.toFixed(2)),
          amount: Number(doc.subtotal.toFixed(2))
        }]);
      }
    }
  };

  // Line Item handlers
  const handleAddLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, description: '', qty: 1, unitPrice: 0, amount: 0 }
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  };

  const handleLineItemChange = (id: string, field: 'description' | 'qty' | 'unitPrice', value: string | number) => {
    setLineItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: value };
      const q = Math.max(0, Number(field === 'qty' ? value : updated.qty) || 0);
      const up = Math.max(0, Number(field === 'unitPrice' ? value : updated.unitPrice) || 0);
      updated.amount = Number((q * up).toFixed(2));
      return updated;
    }));
  };

  // Tax & Totals Calculation
  const rawItemsSum = useMemo(
    () => lineItems.reduce((acc, it) => acc + (Number(it.amount) || (Number(it.qty || 0) * Number(it.unitPrice || 0))), 0),
    [lineItems]
  );

  const selectedTaxProfile = taxProfiles.find((t: any) => t.id === taxProfileId);
  const vatRate = Number(selectedTaxProfile?.tax2_rate || selectedTaxProfile?.tax1_rate || 18);
  const isVatAbsorbed = taxProfileId === 'tp_vat18_absorbed' || taxProfileId === 'tp_opt1_absorbed';

  let numSubtotal = Number(rawItemsSum.toFixed(2));
  let taxAmount = 0;
  let totalAmount = numSubtotal;

  if (taxEnabled) {
    if (isTaxInclusive) {
      const base = Number((rawItemsSum / (1 + vatRate / 100)).toFixed(2));
      taxAmount = Number((rawItemsSum - base).toFixed(2));
      numSubtotal = isVatAbsorbed ? rawItemsSum : base;
      totalAmount = Number(rawItemsSum.toFixed(2));
    } else {
      taxAmount = Number(((rawItemsSum * vatRate) / 100).toFixed(2));
      numSubtotal = isVatAbsorbed ? Number((rawItemsSum + taxAmount).toFixed(2)) : Number(rawItemsSum.toFixed(2));
      totalAmount = Number((rawItemsSum + taxAmount).toFixed(2));
    }
  }

  const taxBreakdownObj = taxEnabled
    ? {
        profileId: taxProfileId,
        profileName: isVatAbsorbed ? 'VAT Included (18%)' : 'VAT Separated (18%)',
        taxName: 'VAT',
        rate: vatRate,
        amount: taxAmount,
        isTaxInclusive,
        hideVatSeparately: isVatAbsorbed
      }
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      return showError('Please enter at least one item with a valid amount greater than 0', 'Validation Error');
    }
    if (!partyName.trim()) {
      return showError('Please select or specify the Customer / Supplier', 'Validation Error');
    }

    const cleanedItems = lineItems
      .filter(it => it.description.trim() || it.amount > 0)
      .map((it, idx) => {
        const q = Number(it.qty) || 1;
        const rawUp = Number(it.unitPrice) || 0;
        const divisor = (taxEnabled && isTaxInclusive && !isVatAbsorbed) ? (1 + vatRate / 100) : 1;
        const multiplier = (taxEnabled && !isTaxInclusive && isVatAbsorbed) ? (1 + vatRate / 100) : 1;
        const finalUp = Number(((rawUp / divisor) * multiplier).toFixed(2));
        return {
          reference: idx + 1,
          description: it.description.trim() || reason.trim() || 'Adjustment Item',
          sku: it.sku || '',
          qty: q,
          unitPrice: finalUp,
          amount: Number((q * finalUp).toFixed(2))
        };
      });

    setIsSubmitting(true);
    try {
      const payload: any = {
        noteNo: previewNoteNo || undefined,
        type: noteType,
        partyType,
        partyId: partyId || null,
        partyName: partyName.trim(),
        date,
        reason: reason.trim(),
        relatedDocType,
        relatedDocNo: relatedDocNo.trim() || null,
        accountId: accountId || null,
        subtotal: numSubtotal,
        taxAmount: isVatAbsorbed ? 0 : taxAmount,
        totalAmount,
        taxProfileId: taxEnabled ? taxProfileId : null,
        taxBreakdown: taxEnabled && taxBreakdownObj ? JSON.stringify(taxBreakdownObj) : null,
        items: cleanedItems,
        notes: remarks.trim() || null
      };

      const res = await createCreditDebitNote(payload);
      toast(`${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'} ${res.noteNo} issued successfully!`, 'success');
      setIsModalOpen(false);
      if (res.note) {
        setActivePrintNote(res.note);
      }
      loadNotes();
    } catch (err: any) {
      showError(err.message || 'Failed to create Note', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    if (partyTypeFilter !== 'ALL' && n.partyType !== partyTypeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (n.noteNo && n.noteNo.toLowerCase().includes(q)) ||
                    (n.partyName && n.partyName.toLowerCase().includes(q)) ||
                    (n.reason && n.reason.toLowerCase().includes(q)) ||
                    (n.relatedDocNo && n.relatedDocNo.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleExportNotesExcel = () => {
    if (filteredNotes.length === 0) {
      toast('No credit/debit notes to export.', 'info');
      return;
    }

    const rows: any[] = [];
    rows.push({
      'Note No': 'Note No',
      'Type': 'Type',
      'Date': 'Date',
      'Party Type': 'Party Type',
      'Party Name': 'Party Name',
      'Related Document': 'Related Document',
      'Reason': 'Reason',
      'Subtotal (LKR)': 'Subtotal (LKR)',
      'Tax Amount (LKR)': 'Tax Amount (LKR)',
      'Total Amount (LKR)': 'Total Amount (LKR)',
      'Status': 'Status',
      'Notes': 'Notes'
    });

    let totalSubtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    filteredNotes.forEach(n => {
      const sub = Number(n.subtotal || 0);
      const tax = Number(n.taxAmount || 0);
      const tot = Number(n.totalAmount || 0);
      totalSubtotal += sub;
      totalTax += tax;
      grandTotal += tot;

      rows.push({
        'Note No': n.noteNo || '',
        'Type': n.type === 'credit_note' ? 'Credit Note (CN)' : 'Debit Note (DN)',
        'Date': String(n.date || '').split('T')[0],
        'Party Type': n.partyType ? (n.partyType === 'customer' ? 'Customer' : 'Supplier') : '',
        'Party Name': n.partyName || '',
        'Related Document': n.relatedDocNo ? `${n.relatedDocType || 'Doc'}: ${n.relatedDocNo}` : '-',
        'Reason': n.reason || '',
        'Subtotal (LKR)': sub,
        'Tax Amount (LKR)': tax,
        'Total Amount (LKR)': tot,
        'Status': n.status || 'Active',
        'Notes': n.notes || ''
      });
    });

    rows.push({
      'Note No': 'TOTALS',
      'Type': '',
      'Date': '',
      'Party Type': '',
      'Party Name': '',
      'Related Document': '',
      'Reason': '',
      'Subtotal (LKR)': totalSubtotal,
      'Tax Amount (LKR)': totalTax,
      'Total Amount (LKR)': grandTotal,
      'Status': '',
      'Notes': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    const sheetName = typeFilter === 'credit_note' ? 'Credit Notes' : typeFilter === 'debit_note' ? 'Debit Notes' : 'Credit & Debit Notes';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Credit_Debit_Notes_${typeFilter}_${dateStr}.xlsx`);
  };

  // Resolve print details for activePrintNote
  const printContext = useMemo(() => {
    if (!activePrintNote) return null;
    const isCN = activePrintNote.type === 'credit_note';
    const isCustomer = activePrintNote.partyType === 'customer';
    const matchedParty = isCustomer
      ? customers.find((c: any) => (activePrintNote.partyId && String(c.id) === String(activePrintNote.partyId)) || (c.company || c.name || '').toLowerCase() === String(activePrintNote.partyName || '').toLowerCase())
      : suppliers.find((s: any) => (activePrintNote.partyId && String(s.id) === String(activePrintNote.partyId)) || (s.company || s.name || '').toLowerCase() === String(activePrintNote.partyName || '').toLowerCase());

    let parsedItems: any[] = [];
    try {
      parsedItems = typeof activePrintNote.items === 'string'
        ? JSON.parse(activePrintNote.items)
        : (Array.isArray(activePrintNote.items) ? activePrintNote.items : []);
    } catch {}

    const sub = Number(activePrintNote.subtotal || activePrintNote.totalAmount || 0);
    const tax = Number(activePrintNote.taxAmount || 0);
    const tot = Number(activePrintNote.totalAmount || (sub + tax) || 0);

    if (!parsedItems || parsedItems.length === 0) {
      parsedItems = [{
        reference: 1,
        description: activePrintNote.reason || `${isCN ? 'Credit Note' : 'Debit Note'} Adjustment`,
        qty: 1,
        unitPrice: sub,
        amount: sub
      }];
    }

    let tb: any = null;
    try {
      tb = typeof activePrintNote.taxBreakdown === 'string'
        ? JSON.parse(activePrintNote.taxBreakdown)
        : activePrintNote.taxBreakdown;
    } catch {}

    const isVatShown = tax > 0 && !tb?.hideVatSeparately && activePrintNote.taxProfileId !== 'tp_vat18_absorbed' && activePrintNote.taxProfileId !== 'tp_opt1_absorbed';
    const vatRateDisplay = Number(tb?.rate || 18);

    // Find linked document date if available
    let linkedDate = '';
    if (activePrintNote.relatedDocNo) {
      const rNo = String(activePrintNote.relatedDocNo).trim().toLowerCase();
      const mInv = invoices.find((i: any) => String(i.invoiceNo || i.id || '').toLowerCase() === rNo);
      const mBill = bills.find((b: any) => String(b.billNo || b.id || '').toLowerCase() === rNo);
      if (mInv?.date) linkedDate = String(mInv.date).slice(0, 10);
      else if (mBill?.billDate || mBill?.date) linkedDate = String(mBill.billDate || mBill.date).slice(0, 10);
    }

    return {
      isCN,
      isCustomer,
      matchedParty,
      partyAddress: matchedParty?.address || matchedParty?.billingAddress || '-',
      partyPhone: matchedParty?.phone || matchedParty?.mobile || '-',
      partyVat: matchedParty?.vat || matchedParty?.vatNumber || matchedParty?.vat_no || '',
      parsedItems,
      sub,
      tax,
      tot,
      isVatShown,
      vatRateDisplay,
      linkedDate
    };
  }, [activePrintNote, customers, suppliers, invoices, bills]);

  const logoSrc = resolveFileUrl((settings as any)?.company_logo || (settings as any)?.logo || (settings as any)?.companyLogo || '') || '/rex-logo.png';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-theme-subtle">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={14} className="text-muted" />
          <input
            type="text"
            placeholder="Search notes by CN/DN #, party, invoice/bill ref, reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-primary placeholder:text-muted outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-primary">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-surface2/60 p-0.5 rounded border border-theme-subtle text-xs">
            {(['ALL', 'credit_note', 'debit_note'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {t === 'ALL' ? 'All Notes' : t === 'credit_note' ? 'Credit Notes' : 'Debit Notes'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportNotesExcel}
            icon={FileSpreadsheet}
            className="text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
          >
            Export Excel
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadNotes}
            disabled={loading}
            icon={RefreshCw}
            className="text-xs text-secondary"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewNoteModal('credit_note')}
            icon={Plus}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
          >
            + Credit Note (CN)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewNoteModal('debit_note')}
            icon={Plus}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            + Debit Note (DN)
          </Button>
        </div>
      </div>

      {/* Notes Table */}
      <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface2/60 border-b border-theme-subtle text-muted uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3">Note #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Party (Customer / Supplier)</th>
                <th className="p-3">Traceability Ref / Reason</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">VAT</th>
                <th className="p-3 text-right">Total (LKR)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle font-medium">
              {filteredNotes.map((n: any) => {
                const isCN = n.type === 'credit_note';
                let itemCount = 0;
                try {
                  const arr = typeof n.items === 'string' ? JSON.parse(n.items) : n.items;
                  if (Array.isArray(arr)) itemCount = arr.length;
                } catch {}
                return (
                  <tr key={n.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      {n.noteNo || n.id}
                    </td>
                    <td className="p-3 text-secondary font-mono text-[11px]">
                      {n.date ? n.date.slice(0, 10) : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCN
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}>
                        {isCN ? 'Credit Note' : 'Debit Note'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-primary text-xs">{n.partyName}</p>
                      <span className="text-[10px] text-muted capitalize">{n.partyType}</span>
                    </td>
                    <td className="p-3">
                      {n.relatedDocNo && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-0.5 rounded text-[10px] font-mono font-bold bg-surface2 text-primary border border-theme-subtle">
                          <Link2 size={10} className="text-rex-500" />
                          {n.relatedDocType || 'Doc'}: {n.relatedDocNo}
                        </span>
                      )}
                      <p className="text-xs text-secondary truncate max-w-xs">
                        {n.reason || '-'}
                        {itemCount > 0 && <span className="text-[10px] text-muted ml-1">({itemCount} item{itemCount > 1 ? 's' : ''})</span>}
                      </p>
                    </td>
                    <td className="p-3 text-right font-mono text-secondary">
                      {formatCurrency(Number(n.subtotal || n.totalAmount || 0), true)}
                    </td>
                    <td className="p-3 text-right font-mono text-muted text-[11px]">
                      {Number(n.taxAmount || 0) > 0 ? formatCurrency(Number(n.taxAmount), true) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-sm text-primary">
                      {formatCurrency(Number(n.totalAmount || 0), true)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setActivePrintNote(n)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-rex-500/10 border border-theme-subtle hover:border-rex-500/40 rounded text-[11px] font-semibold text-primary transition-colors"
                        title="Print / View Official Note"
                      >
                        <Printer size={13} />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredNotes.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted text-xs">
                    {loading ? 'Loading credit/debit notes...' : 'No credit or debit notes found. Click "+ Credit Note" or "+ Debit Note" to issue one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL: Issue Credit or Debit Note */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Issue ${noteType === 'credit_note' ? 'Credit Note (CN)' : 'Debit Note (DN)'}`}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Sequential Number & Type Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface2/70 border border-theme-subtle">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                noteType === 'credit_note'
                  ? 'bg-purple-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}>
                {noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}
              </span>
              <span className="text-xs text-muted">Sequential Note No:</span>
              <span className="font-mono text-sm font-black text-primary bg-surface px-2.5 py-0.5 rounded border border-theme-subtle">
                {previewNoteNo || 'Auto-Generated'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setNoteType('credit_note');
                  fetchNextSequentialNo('credit_note');
                }}
                className={`px-2 py-0.5 rounded font-semibold border transition-colors ${
                  noteType === 'credit_note'
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/40'
                    : 'text-muted border-transparent hover:text-primary'
                }`}
              >
                Credit Note (CN)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteType('debit_note');
                  fetchNextSequentialNo('debit_note');
                }}
                className={`px-2 py-0.5 rounded font-semibold border transition-colors ${
                  noteType === 'debit_note'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/40'
                    : 'text-muted border-transparent hover:text-primary'
                }`}
              >
                Debit Note (DN)
              </button>
            </div>
          </div>

          {/* Row 1: Date, Party Type, Customer/Vendor Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Note Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono font-bold focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Party Classification *</label>
              <select
                value={partyType}
                onChange={e => {
                  const pt = e.target.value as 'customer' | 'supplier';
                  setPartyType(pt);
                  setPartyId('');
                  setPartyName('');
                  setRelatedDocType(pt === 'customer' ? 'Invoice' : 'Supplier Bill');
                  setRelatedDocNo('');
                  setLinkedDocMeta(null);
                }}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="customer">Customer (Sales / Invoice Adjustment)</option>
                <option value="supplier">Vendor / Supplier (Bill / Purchase Adjustment)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Select {partyType === 'customer' ? 'Customer' : 'Vendor / Supplier'} *
              </label>
              {partyType === 'customer' ? (
                <CustomerAutocomplete
                  value={partyId}
                  onChange={(cId, cust) => {
                    setPartyId(cId);
                    setPartyName(cust?.company || cust?.name || cId);
                  }}
                  placeholder="Search customer by name, company..."
                  required
                />
              ) : (
                <SupplierAutocomplete
                  value={partyId}
                  onChange={(sId, supp) => {
                    setPartyId(sId);
                    setPartyName(supp?.company || supp?.name || sId);
                  }}
                  placeholder="Search vendor / supplier..."
                  required
                />
              )}
            </div>
          </div>

          {/* Row 2: Traceability (Against Invoice / Vendor Bill Autocomplete) & GL Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Against Document Type *</label>
              <select
                value={relatedDocType}
                onChange={e => {
                  setRelatedDocType(e.target.value);
                  setRelatedDocNo('');
                  setLinkedDocMeta(null);
                }}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="Invoice">Sales Invoice (Customer)</option>
                <option value="Supplier Bill">Vendor Bill / Supplier Invoice</option>
                <option value="Sales Order">Sales Order</option>
                <option value="Purchase Order">Purchase Order (PO)</option>
                <option value="GRN">Goods Receipt Note (GRN)</option>
                <option value="Direct Adjustment">Direct Ledger Adjustment</option>
              </select>
            </div>

            {/* Searchable Document Autocomplete */}
            <div ref={docDropdownRef} className="relative">
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Against {relatedDocType} # (Type to Autocomplete)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    relatedDocType === 'Invoice'
                      ? 'Search Invoice # or customer...'
                      : relatedDocType === 'Supplier Bill'
                      ? 'Search Vendor Bill # or supplier...'
                      : `Search ${relatedDocType} #...`
                  }
                  value={relatedDocNo}
                  onFocus={() => setShowDocDropdown(true)}
                  onChange={e => {
                    setRelatedDocNo(e.target.value);
                    setShowDocDropdown(true);
                  }}
                  className="w-full bg-surface border border-theme-subtle pl-3 pr-7 py-1.5 rounded text-xs font-mono font-bold text-primary focus:border-primary"
                />
                {relatedDocNo && (
                  <button
                    type="button"
                    onClick={() => {
                      setRelatedDocNo('');
                      setLinkedDocMeta(null);
                      setShowDocDropdown(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {showDocDropdown && relatedDocType !== 'Direct Adjustment' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-surface border border-theme-subtle rounded-lg shadow-2xl divide-y divide-theme-subtle/60">
                  {candidateDocs.length > 0 ? (
                    candidateDocs.map((doc, idx) => (
                      <button
                        key={`${doc.docNo}-${idx}`}
                        type="button"
                        onClick={() => applySelectedDocument(doc, true)}
                        className="w-full text-left px-3 py-2 hover:bg-rex-500/10 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-primary flex items-center gap-1.5">
                            <span>{doc.docNo}</span>
                            {doc.taxAmount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-sans">
                                VAT
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-secondary truncate">
                            {doc.partyName || 'No Party'} {doc.date ? `· ${doc.date}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(doc.total, true)}
                          </div>
                          {doc.items.length > 0 && (
                            <div className="text-[9.5px] text-muted">{doc.items.length} item(s)</div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-[11px] text-muted">
                      No matching {relatedDocType} found. You can still type a custom reference number.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Adjustment Account (GL) *
              </label>
              <AccountAutocomplete
                value={accountId}
                onChange={setAccountId}
                typeFilter={['Revenue', 'Expense', 'Asset', 'Liability']}
                placeholder="Search account code or name..."
                required
              />
            </div>
          </div>

          {/* Linked Document Traceability Pill */}
          {linkedDocMeta && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Linked to <strong>{linkedDocMeta.docType} #{linkedDocMeta.docNo}</strong>
                  {linkedDocMeta.partyName ? ` (${linkedDocMeta.partyName})` : ''}
                  {linkedDocMeta.date ? ` · Date: ${linkedDocMeta.date}` : ''}
                  {` · Doc Value: `}
                  <strong className="font-mono">{formatCurrency(linkedDocMeta.total, true)}</strong>
                </span>
              </div>
              {Array.isArray(linkedDocMeta.items) && linkedDocMeta.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => applySelectedDocument(linkedDocMeta, true)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Reload {linkedDocMeta.items.length} Item(s)
                </button>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Reason for Credit / Debit Note *</label>
            <input
              type="text"
              required
              placeholder="e.g. Return of damaged goods / Price adjustment against Invoice"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
            />
          </div>

          {/* Line Items Table */}
          <div className="border border-theme-subtle rounded-lg overflow-hidden bg-surface">
            <div className="flex items-center justify-between px-3 py-2 bg-surface2/60 border-b border-theme-subtle">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText size={13} className="text-rex-500" />
                Note Line Items & Particulars
              </span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rex-600 hover:bg-rex-700 text-white transition-colors"
              >
                <Plus size={12} />
                Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/30 text-[10px] font-bold uppercase text-muted">
                    <th className="py-2 px-2.5 text-center w-10">#</th>
                    <th className="py-2 px-2.5 text-left">Item Description / Particulars</th>
                    <th className="py-2 px-2.5 text-right w-24">Qty</th>
                    <th className="py-2 px-2.5 text-right w-36">Unit Price (LKR)</th>
                    <th className="py-2 px-2.5 text-right w-36">Amount (LKR)</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle/60">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-surface2/20">
                      <td className="py-1.5 px-2.5 text-center font-mono text-muted">{idx + 1}</td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Enter item description or adjustment particulars..."
                          value={item.description}
                          onChange={e => handleLineItemChange(item.id, 'description', e.target.value)}
                          className="w-full bg-transparent border border-theme-subtle/70 focus:border-primary px-2.5 py-1 rounded text-xs text-primary"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={item.qty}
                          onChange={e => handleLineItemChange(item.id, 'qty', e.target.value)}
                          className="w-full bg-transparent border border-theme-subtle/70 focus:border-primary px-2 py-1 rounded text-xs font-mono text-right text-primary"
                        />
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={item.unitPrice || ''}
                          onChange={e => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                          className="w-full bg-transparent border border-theme-subtle/70 focus:border-primary px-2 py-1 rounded text-xs font-mono font-bold text-right text-primary"
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-primary">
                        {formatCurrency(item.amount, false)}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="p-1 text-muted hover:text-rose-500 transition-colors"
                            title="Remove line"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VAT / Tax Section & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Additional Remarks / Internal Notes</label>
              <textarea
                rows={4}
                placeholder="Optional remarks to print on the Credit/Debit Note..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded text-xs resize-none focus:border-primary"
              />
            </div>

            <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={e => setTaxEnabled(e.target.checked)}
                    className="rounded text-primary h-3.5 w-3.5"
                  />
                  <span>Apply VAT ({vatRate}%)</span>
                </label>
                {taxEnabled && (
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {isVatAbsorbed ? `VAT Included (${formatCurrency(taxAmount, true)})` : `+ ${formatCurrency(taxAmount, true)} VAT`}
                  </span>
                )}
              </div>

              {taxEnabled && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTaxProfileId('tp_vat18')}
                      className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center ${
                        !isVatAbsorbed
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle'
                      }`}
                    >
                      VAT Separated
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxProfileId('tp_vat18_absorbed')}
                      className={`p-1.5 text-[10px] font-bold rounded border transition-all text-center ${
                        isVatAbsorbed
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle'
                      }`}
                    >
                      VAT Included
                    </button>
                  </div>

                  {/* Tax Inclusive Pricing Toggle */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-theme-subtle/50">
                    <div>
                      <div className="text-[11px] font-semibold text-primary">Tax Inclusive Pricing</div>
                      <div className="text-[9.5px] text-muted">Entered item prices already include VAT</div>
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

              <div className="pt-2 border-t border-theme-subtle space-y-1 text-xs">
                <div className="flex justify-between text-secondary">
                  <span>{isVatAbsorbed ? 'Total Supply Value (VAT Included):' : 'Subtotal (Excl. VAT):'}</span>
                  <span className="font-mono font-semibold">{formatCurrency(numSubtotal, true)}</span>
                </div>
                {taxEnabled && !isVatAbsorbed && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>VAT Amount ({vatRate}%):</span>
                    <span className="font-mono font-semibold">+{formatCurrency(taxAmount, true)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-theme-subtle font-bold text-primary">
                  <span>Total {noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'} Value:</span>
                  <span className="font-mono text-sm">{formatCurrency(totalAmount, true)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : `Issue ${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'} (${previewNoteNo})`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* FORMAL INVOICE-STYLE PRINT VIEW MODAL */}
      <Modal
        isOpen={!!activePrintNote && !!printContext}
        onClose={() => setActivePrintNote(null)}
        title={`Official ${activePrintNote?.type === 'credit_note' ? 'Credit Note' : 'Debit Note'} — ${activePrintNote?.noteNo || ''}`}
        size="xl"
      >
        {activePrintNote && printContext && (
          <div className="space-y-4">
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 6mm 8mm; }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body * { visibility: hidden !important; }
                [class*="fixed"], [class*="backdrop"], [role="dialog"], .fixed {
                  position: static !important;
                  display: block !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  transform: none !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                #credit-debit-note-print-area, #credit-debit-note-print-area * {
                  visibility: visible !important;
                }
                #credit-debit-note-print-area {
                  position: static !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  box-shadow: none !important;
                }
              }
            `}</style>

            <div className="flex items-center justify-between bg-surface2/70 p-2.5 rounded-lg border border-theme-subtle print:hidden">
              <div className="text-xs text-secondary">
                Official Print Layout for <strong className="font-mono text-primary">{activePrintNote.noteNo}</strong>
                {activePrintNote.relatedDocNo && (
                  <span> · Traceability: <strong>{activePrintNote.relatedDocType || 'Ref'} #{activePrintNote.relatedDocNo}</strong></span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setActivePrintNote(null)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                  Print / Save PDF
                </Button>
              </div>
            </div>

            {/* A4 Document Container matching InvoicePreview */}
            <div
              id="credit-debit-note-print-area"
              style={{
                width: '100%',
                maxWidth: '794px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '11px',
                lineHeight: 1.35,
                border: '1.2px solid #000000',
                boxSizing: 'border-box'
              }}
            >
              {/* 1. Company Letterhead Header (matching InvoicePreview / QuotationPrintView) */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1.2px solid #000000' }}>
                <div style={{ width: '36%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '12px' }}>
                  <img
                    src={logoSrc}
                    alt="Company Logo"
                    style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ width: '64%', paddingLeft: '10px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#000000', letterSpacing: '0.2px', marginBottom: '3px' }}>
                    {(settings as any)?.company_name || (settings as any)?.name || 'Rex Industries (Pvt) Ltd'}
                  </div>
                  <table style={{ width: '100%', fontSize: '10.5px', lineHeight: 1.35, color: '#000000', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 700, width: '58px', verticalAlign: 'top' }}>Office</td>
                        <td style={{ verticalAlign: 'top' }}>: {(settings as any)?.company_address || (settings as any)?.address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Tel.</td>
                        <td>: {(settings as any)?.company_phone || (settings as any)?.phone || '0094-31-2233117 / 2233315'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>E-mail</td>
                        <td>: {(settings as any)?.company_email || (settings as any)?.email || 'info@rexgroup.lk'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>Web</td>
                        <td>: {(settings as any)?.company_website || (settings as any)?.website || 'www.rexgroup.lk'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>VAT Reg.</td>
                        <td>: {(settings as any)?.company_vat || (settings as any)?.vat_number || '114106470-7000'} &nbsp;|&nbsp; <strong>TIN:</strong> {(settings as any)?.company_tin || '114106470'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Document Title Banner */}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  letterSpacing: '2px',
                  padding: '6px 10px',
                  borderBottom: '1.2px solid #000000',
                  backgroundColor: '#f8fafc',
                  textTransform: 'uppercase'
                }}
              >
                {printContext.isVatShown
                  ? (printContext.isCN ? 'TAX CREDIT NOTE' : 'TAX DEBIT NOTE')
                  : (printContext.isCN ? 'CREDIT NOTE' : 'DEBIT NOTE')}
              </div>

              {/* 3. Two-Column Party & Traceability Metadata Section */}
              <div style={{ display: 'flex', borderBottom: '1.2px solid #000000' }}>
                {/* Left Column: Customer / Vendor Info */}
                <div style={{ width: '54%', padding: '10px 12px', borderRight: '1.2px solid #000000' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', color: '#334155', marginBottom: '3px' }}>
                    {printContext.isCustomer ? 'Issued To (Customer):' : 'Issued To (Vendor / Supplier):'}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#000000', marginBottom: '4px' }}>
                    {activePrintNote.partyName}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#1e293b', whiteSpace: 'pre-line', marginBottom: '6px' }}>
                    {printContext.partyAddress}
                  </div>
                  <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {printContext.partyPhone && printContext.partyPhone !== '-' && (
                        <tr>
                          <td style={{ fontWeight: 700, width: '75px', padding: '1px 0' }}>Tel / Phone</td>
                          <td>: {printContext.partyPhone}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ fontWeight: 700, width: '75px', padding: '1px 0' }}>VAT Reg. No.</td>
                        <td style={{ fontWeight: 700 }}>: {printContext.partyVat || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Column: Note Number, Date & Document Traceability */}
                <div style={{ width: '46%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1.2px solid #000000' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700, width: '42%', borderRight: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                          {printContext.isCN ? 'Credit Note No.' : 'Debit Note No.'}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px' }}>
                          {activePrintNote.noteNo || activePrintNote.id}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1.2px solid #000000' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                          Date of Issue
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {formatGazetteDate(activePrintNote.date ? String(activePrintNote.date).slice(0, 10) : new Date().toISOString().slice(0, 10))}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1.2px solid #000000' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                          Against {activePrintNote.relatedDocType || 'Document'}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 800, fontFamily: 'monospace' }}>
                          {activePrintNote.relatedDocNo ? `#${activePrintNote.relatedDocNo}` : 'Direct Ledger Adjustment'}
                        </td>
                      </tr>
                      {printContext.linkedDate && (
                        <tr style={{ borderBottom: '1.2px solid #000000' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 700, borderRight: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                            Ref. Doc Date
                          </td>
                          <td style={{ padding: '5px 8px' }}>
                            {formatGazetteDate(printContext.linkedDate)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '6px 8px', fontWeight: 700, borderRight: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                          Reason / Type
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {activePrintNote.reason || 'Financial Adjustment'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Line Items & Particulars Table (matching InvoicePreview) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.2px solid #000000', backgroundColor: '#f8fafc', textAlign: 'center', fontWeight: 700 }}>
                    <th style={{ padding: '7px 6px', borderRight: '1.2px solid #000000', width: '7%' }}>Item</th>
                    <th style={{ padding: '7px 10px', borderRight: '1.2px solid #000000', textAlign: 'left', width: '53%' }}>
                      Description & Particulars
                    </th>
                    <th style={{ padding: '7px 6px', borderRight: '1.2px solid #000000', width: '10%' }}>Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1.2px solid #000000', textAlign: 'right', width: '15%' }}>
                      Unit Price (Rs.)
                    </th>
                    <th style={{ padding: '7px 8px', textAlign: 'right', width: '15%' }}>
                      {printContext.isVatShown ? <>Amount Excl. VAT<br />(Rs.)</> : <>Amount<br />(Rs.)</>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {printContext.parsedItems.map((it: any, idx: number) => {
                    const q = Number(it.qty) || 1;
                    const up = Number(it.unitPrice) || 0;
                    const amt = Number(it.amount) || (q * up);
                    return (
                      <tr key={idx} style={{ borderBottom: '1.2px solid #000000' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.2px solid #000000', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 600 }}>
                          {it.reference || idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', borderRight: '1.2px solid #000000', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: '#000000' }}>{it.description}</div>
                          {it.sku && (
                            <div style={{ fontSize: '9.5px', color: '#475569', fontFamily: 'monospace', marginTop: '2px' }}>
                              SKU: {it.sku}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.2px solid #000000', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 700 }}>
                          {q.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', borderRight: '1.2px solid #000000', verticalAlign: 'top', fontFamily: 'monospace' }}>
                          {up.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 700 }}>
                          {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Padding rows to maintain formal invoice proportions */}
                  {Array.from({ length: Math.max(0, 3 - printContext.parsedItems.length) }).map((_, i) => (
                    <tr key={`pad-${i}`} style={{ borderBottom: '1.2px solid #000000', height: '26px' }}>
                      <td style={{ borderRight: '1.2px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1.2px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1.2px solid #000000' }}>&nbsp;</td>
                      <td style={{ borderRight: '1.2px solid #000000' }}>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}

                  {/* Subtotal / Value of Supply */}
                  <tr style={{ borderBottom: '1.2px solid #000000' }}>
                    <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, borderRight: '1.2px solid #000000' }}>
                      {printContext.isVatShown ? 'Total Value of Supply / Adjustment (Excl. VAT):' : 'Total Value of Adjustment (VAT Included):'}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {printContext.sub.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Separate VAT Row */}
                  {printContext.isVatShown && (
                    <tr style={{ borderBottom: '1.2px solid #000000' }}>
                      <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, borderRight: '1.2px solid #000000' }}>
                        {`VAT Amount (Total Value of Adjustment @ ${printContext.vatRateDisplay}%):`}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {printContext.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {/* Grand Total Consideration */}
                  <tr style={{ borderBottom: '1.2px solid #000000', backgroundColor: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, fontSize: '12px', borderRight: '1.2px solid #000000' }}>
                      {`Total ${printContext.isCN ? 'Credit Note' : 'Debit Note'} Value (LKR):`}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, fontSize: '12.5px', fontFamily: 'monospace' }}>
                      {printContext.tot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 5. Amount in Words */}
              <div style={{ padding: '8px 12px', borderBottom: '1.2px solid #000000', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                VALUE : LKR {toWords(printContext.tot, 'LKR').toUpperCase()}
              </div>

              {/* 6. Remarks / Traceability Declaration */}
              <div style={{ padding: '8px 12px', borderBottom: '1.2px solid #000000', fontSize: '10px', color: '#1e293b' }}>
                <div>
                  <strong>Traceability & Adjustment Declaration:</strong>{' '}
                  This official {printContext.isCN ? 'Credit Note' : 'Debit Note'} is issued to{' '}
                  <strong>{activePrintNote.partyName}</strong>
                  {activePrintNote.relatedDocNo
                    ? ` against ${activePrintNote.relatedDocType || 'Document'} #${activePrintNote.relatedDocNo}`
                    : ' as a direct account adjustment'}
                  {' '}for: <em>{activePrintNote.reason || 'Approved adjustment'}</em>.
                </div>
                {activePrintNote.notes && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Additional Notes:</strong> {activePrintNote.notes}
                  </div>
                )}
              </div>

              {/* 7. Formal Signature Block */}
              <div style={{ display: 'flex', padding: '34px 14px 12px 14px', textAlign: 'center', fontSize: '10.5px' }}>
                <div style={{ width: '33.33%', padding: '0 10px' }}>
                  <div style={{ borderTop: '1px dotted #000000', paddingTop: '5px', fontWeight: 700 }}>Prepared By</div>
                  <div style={{ fontSize: '9.5px', color: '#475569' }}>Accounts Officer</div>
                </div>
                <div style={{ width: '33.33%', padding: '0 10px' }}>
                  <div style={{ borderTop: '1px dotted #000000', paddingTop: '5px', fontWeight: 700 }}>Checked & Verified By</div>
                  <div style={{ fontSize: '9.5px', color: '#475569' }}>Finance Department</div>
                </div>
                <div style={{ width: '33.33%', padding: '0 10px' }}>
                  <div style={{ borderTop: '1px dotted #000000', paddingTop: '5px', fontWeight: 700 }}>Authorized Signature</div>
                  <div style={{ fontSize: '9.5px', color: '#475569' }}>For Rex Industries (Pvt) Ltd</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
