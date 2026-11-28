import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Printer, Search, RefreshCw, X, FileText, 
  FileSpreadsheet, Trash2, CheckCircle2, Link2, Sparkles,
  Paperclip, UploadCloud, Eye, PackageCheck
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
import { fetchCreditDebitNotes, createCreditDebitNote, fetchBills, fetchPOs, fetchGRNs, uploadFileToStorage } from '@/lib/api';
import { formatCurrency, resolveFileUrl, openDataUriOrUrl } from '@/lib/utils';
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

const formatMMDDYYYY = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return clean;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

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
  const [externalRef, setExternalRef] = useState('');
  const [attachment, setAttachment] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast('File size exceeds 25MB limit.', 'error');
      return;
    }
    setIsUploadingAttachment(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUri = reader.result as string;
      setAttachment(rawDataUri);
      setAttachmentName(file.name);
      try {
        const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'notes');
        if (uploaded && uploaded.url) {
          setAttachment(uploaded.url);
        }
      } catch (err) {
        console.warn('Storage upload error, keeping dataUri fallback:', err);
      } finally {
        setIsUploadingAttachment(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
    const typeCode = type === 'credit_note' ? 'CN' : 'DN';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mon = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const prefix = `${yy}${mon}-${typeCode}-REX`;
    // Count existing local notes this month with this prefix
    const thisMonthCount = notes.filter(n =>
      n.type === type && n.noteNo && String(n.noteNo).startsWith(`${prefix}-`)
    ).length;
    return `${prefix}-${String(thisMonthCount + 1).padStart(4, '0')}`;
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
    setExternalRef('');
    setAttachment('');
    setAttachmentName('');

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
          const qty = Number(it.qty || it.quantity || it.qtyReceived || 1);
          const up = Number(it.unitCost ?? it.unitPrice ?? it.rate ?? it.price ?? 0);
          return {
            id: `${docNo}-${idx}`,
            description: it.description || it.desc || it.itemName || it.name || `Bill Item ${idx + 1}`,
            sku: it.sku || it.inventoryId || '',
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
          const up = Number(it.unitPrice ?? it.unitCost ?? it.price ?? 0);
          return {
            id: `${docNo}-${idx}`,
            description: it.itemName || it.desc || it.name || it.description || `PO Item ${idx + 1}`,
            sku: it.sku || it.inventoryId || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });
        list.push({
          docNo,
          docType: 'Purchase Order',
          date: String(po.orderDate || po.date || po.createdAt || '').slice(0, 10),
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
        const docNo = String(g.grnNumber || g.grnNo || g.id || '').trim();
        if (!docNo) continue;

        const linkedPoIds: string[] = [];
        if (g.poId) linkedPoIds.push(String(g.poId));
        if (Array.isArray(g.poIds)) {
          g.poIds.forEach((pid: any) => pid && linkedPoIds.push(String(pid)));
        } else if (typeof g.poIds === 'string' && g.poIds.trim()) {
          try {
            const arr = JSON.parse(g.poIds);
            if (Array.isArray(arr)) arr.forEach((pid: any) => pid && linkedPoIds.push(String(pid)));
          } catch {
            g.poIds.split(',').forEach((s: string) => s.trim() && linkedPoIds.push(s.trim()));
          }
        }

        const matchedPos = pos.filter((p: any) =>
          linkedPoIds.includes(String(p.id)) ||
          (p.poNumber && linkedPoIds.includes(String(p.poNumber))) ||
          (p.poNo && linkedPoIds.includes(String(p.poNo)))
        );
        const poItems = matchedPos.flatMap((p: any) => {
          try {
            return typeof p.items === 'string' ? JSON.parse(p.items) : (Array.isArray(p.items) ? p.items : []);
          } catch {
            return [];
          }
        });

        const resolvedSupplierId = g.supplierId || matchedPos[0]?.supplierId || '';
        const supp = suppliers.find((s: any) => String(s.id) === String(resolvedSupplierId));
        const pName = g.supplierName || supp?.company || supp?.name || matchedPos[0]?.supplierName || '';

        let parsedGrnItems: any[] = [];
        try {
          parsedGrnItems = typeof g.items === 'string' ? JSON.parse(g.items) : (Array.isArray(g.items) ? g.items : []);
        } catch {}

        const mappedItems: NoteLineItem[] = parsedGrnItems.map((gi: any, idx: number) => {
          const rawQty = gi.qtyReceived !== undefined ? gi.qtyReceived : (gi.qty ?? gi.quantity ?? 1);
          const qty = Number(rawQty) > 0 ? Number(rawQty) : 1;
          const matchingPoItem = poItems.find((pi: any) =>
            (pi.inventoryId && gi.inventoryId && String(pi.inventoryId) === String(gi.inventoryId)) ||
            (pi.id && gi.id && String(pi.id) === String(gi.id)) ||
            ((pi.desc || pi.name || pi.description) && (gi.desc || gi.name || gi.description) &&
              String(pi.desc || pi.name || pi.description).toLowerCase() === String(gi.desc || gi.name || gi.description).toLowerCase())
          );
          const up = Number(
            gi.unitCost ?? gi.unitPrice ?? gi.price ?? gi.rate ??
            matchingPoItem?.unitPrice ?? matchingPoItem?.unitCost ?? matchingPoItem?.price ?? 0
          );
          const desc =
            gi.desc ||
            gi.name ||
            gi.description ||
            gi.inventoryName ||
            matchingPoItem?.desc ||
            matchingPoItem?.name ||
            matchingPoItem?.description ||
            (gi.inventoryId ? `Material [${gi.inventoryId}]` : `GRN Item ${idx + 1}`);
          return {
            id: `${docNo}-${idx}`,
            description: desc,
            sku: gi.sku || gi.inventoryId || matchingPoItem?.sku || '',
            qty,
            unitPrice: up,
            amount: Number((qty * up).toFixed(2))
          };
        });

        const itemsSum = mappedItems.reduce((s, it) => s + Number(it.amount || 0), 0);
        const taxAmt = Number(g.taxAmount || matchedPos[0]?.taxAmount || 0);
        const subAmt = Number(g.subtotal || itemsSum || 0);
        const totAmt = Number(g.totalAmount || (subAmt + (g.taxAmount ? Number(g.taxAmount) : 0)) || itemsSum || 0);

        list.push({
          docNo,
          docType: 'GRN',
          date: String(g.date || g.receivedDate || g.receivedAt || g.createdAt || '').slice(0, 10),
          partyId: String(resolvedSupplierId),
          partyName: pName,
          partyType: 'supplier',
          total: totAmt,
          subtotal: subAmt,
          taxAmount: taxAmt,
          taxProfileId: g.taxProfileId || matchedPos[0]?.taxProfileId || (taxAmt > 0 ? 'tp_vat18' : ''),
          isTaxInclusive: Boolean(g.isTaxInclusive ?? matchedPos[0]?.isTaxInclusive),
          items: mappedItems,
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
      const shouldItemize = noteType === 'credit_note' || doc.docType === 'GRN';
      if (shouldItemize && Array.isArray(doc.items) && doc.items.length > 0) {
        setLineItems(doc.items.map((it: any, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          description: it.description,
          sku: it.sku || '',
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          amount: Number(((Number(it.qty) || 1) * (Number(it.unitPrice) || 0)).toFixed(2))
        })));
      } else {
        const defaultAmt = Number((doc.subtotal || doc.total || 0).toFixed(2));
        setLineItems([{
          id: String(Date.now()),
          description: lineItems[0]?.description && lineItems[0].description !== 'Purchase Return to Vendor / Defect'
            ? lineItems[0].description
            : `Debit adjustment against ${doc.docType} #${doc.docNo}`,
          qty: 1,
          unitPrice: defaultAmt,
          amount: defaultAmt
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
        notes: remarks.trim() || null,
        attachment: attachment || null,
        attachmentName: attachmentName || null,
        externalRef: externalRef.trim() || null
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
                      <div className="inline-flex items-center gap-1.5">
                        {n.attachment && (
                          <button
                            type="button"
                            onClick={() => openDataUriOrUrl(n.attachment, n.attachmentName || `${n.noteNo || 'Note'} Attachment`)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-colors"
                            title={n.attachmentName ? `View Attachment: ${n.attachmentName}` : 'View Attachment'}
                          >
                            <Paperclip size={12} />
                            <span>File</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActivePrintNote(n)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-rex-500/10 border border-theme-subtle hover:border-rex-500/40 rounded text-[11px] font-semibold text-primary transition-colors"
                          title="Print / View Official Note"
                        >
                          <Printer size={13} />
                          <span>Print</span>
                        </button>
                      </div>
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

      {/* MODAL: Issue Credit or Debit Note (Xero / QuickBooks Accounting Grade) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`New ${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}`}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Top Accounting Banner: Type Switcher + Note # on Left | Big Total on Right */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg bg-surface2 p-1 border border-theme-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setNoteType('credit_note');
                    fetchNextSequentialNo('credit_note');
                    if (partyType === 'supplier' && relatedDocType === 'Supplier Bill') {
                      setPartyType('customer');
                      setPartyId('');
                      setPartyName('');
                      setRelatedDocType('Invoice');
                      setRelatedDocNo('');
                      setLinkedDocMeta(null);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    noteType === 'credit_note'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  Credit Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNoteType('debit_note');
                    fetchNextSequentialNo('debit_note');
                    if (partyType === 'customer' && relatedDocType === 'Invoice') {
                      setPartyType('supplier');
                      setPartyId('');
                      setPartyName('');
                      setRelatedDocType('Supplier Bill');
                      setRelatedDocNo('');
                      setLinkedDocMeta(null);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    noteType === 'debit_note'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  Debit Note
                </button>
              </div>

              <div className="pl-2 border-l border-theme-subtle">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Note Number</div>
                <div className="font-mono text-sm font-black text-primary tracking-tight">
                  {previewNoteNo || 'Auto-Generated'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {noteType === 'credit_note' ? 'Credit Total' : 'Debit Total'}
              </div>
              <div className="font-mono text-2xl font-black text-primary tracking-tight">
                {formatCurrency(totalAmount, true)}
              </div>
            </div>
          </div>

          {/* 2. Party & Document Details (Clean 3-Column Grid, No Heavy Boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">Party</label>
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
                className="w-full bg-surface border border-theme-subtle px-2.5 py-2 rounded-lg text-xs font-semibold focus:border-primary"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                {partyType === 'customer' ? 'Customer Name' : 'Vendor / Supplier Name'} <span className="text-rose-500">*</span>
              </label>
              {partyType === 'customer' ? (
                <CustomerAutocomplete
                  value={partyId}
                  onChange={(cId, cust) => {
                    setPartyId(cId);
                    setPartyName(cust?.company || cust?.name || cId);
                  }}
                  placeholder="Select customer..."
                  required
                />
              ) : (
                <SupplierAutocomplete
                  value={partyId}
                  onChange={(sId, supp) => {
                    setPartyId(sId);
                    setPartyName(supp?.company || supp?.name || sId);
                  }}
                  placeholder="Select supplier..."
                  required
                />
              )}
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">Note Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono font-semibold text-primary focus:border-primary"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                External {noteType === 'credit_note' ? 'CN' : 'DN'} Ref
              </label>
              <input
                type="text"
                placeholder="Supplier / Customer Ref #"
                value={externalRef}
                onChange={e => setExternalRef(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs font-mono text-primary focus:border-primary"
              />
            </div>
          </div>

          {/* 3. Traceability & Accounting Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-3.5 rounded-xl bg-surface2/35">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">Against Document</label>
              <select
                value={relatedDocType}
                onChange={e => {
                  const nextDocType = e.target.value;
                  setRelatedDocType(nextDocType);
                  setRelatedDocNo('');
                  setLinkedDocMeta(null);
                  if (noteType === 'debit_note' && nextDocType !== 'GRN') {
                    const currentTotal = lineItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
                    setLineItems([{
                      id: String(Date.now()),
                      description: lineItems[0]?.description || reason || 'Purchase Return / Debit Adjustment',
                      qty: 1,
                      unitPrice: Number(currentTotal.toFixed(2)),
                      amount: Number(currentTotal.toFixed(2))
                    }]);
                  }
                }}
                className="w-full bg-surface border border-theme-subtle px-2.5 py-2 rounded-lg text-xs font-medium focus:border-primary"
              >
                <option value="Invoice">Sales Invoice</option>
                <option value="Supplier Bill">Vendor Bill</option>
                <option value="GRN">GRN (With Items)</option>
                <option value="Purchase Order">Purchase Order</option>
                <option value="Sales Order">Sales Order</option>
                <option value="Other">Other (Amount Only)</option>
                <option value="Direct Adjustment">Direct Adjustment</option>
              </select>
            </div>

            <div ref={docDropdownRef} className="relative sm:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">{relatedDocType} #</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${relatedDocType}...`}
                  value={relatedDocNo}
                  onFocus={() => setShowDocDropdown(true)}
                  onChange={e => {
                    setRelatedDocNo(e.target.value);
                    setShowDocDropdown(true);
                  }}
                  className="w-full bg-surface border border-theme-subtle pl-3 pr-7 py-2 rounded-lg text-xs font-mono font-semibold text-primary focus:border-primary"
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
                      No matching {relatedDocType} found.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                GL Account <span className="text-rose-500">*</span>
              </label>
              <AccountAutocomplete
                value={accountId}
                onChange={setAccountId}
                typeFilter={['Revenue', 'Expense', 'Asset', 'Liability']}
                placeholder="Select account..."
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Reason for adjustment..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs text-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Linked Document Traceability Pill */}
          {linkedDocMeta && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Linked to <strong>{linkedDocMeta.docType} #{linkedDocMeta.docNo}</strong>
                  {linkedDocMeta.partyName ? ` (${linkedDocMeta.partyName})` : ''}
                  {linkedDocMeta.date ? ` · ${linkedDocMeta.date}` : ''}
                  {` · Value: `}
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

          {/* 4. Line Items / Amount Entry */}
          {relatedDocType === 'Other' || (noteType === 'debit_note' && relatedDocType !== 'GRN') ? (
            <div className="rounded-xl border border-theme-subtle bg-surface p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-theme-subtle/60">
                <span className="text-xs font-bold text-primary">
                  Adjustment Particulars & Amount
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRelatedDocType('GRN');
                    setRelatedDocNo('');
                    setLinkedDocMeta(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <PackageCheck size={13} />
                  <span>Switch to GRN Itemized Mode</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                    Description / Particulars <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Price difference, short supply claim, quality deduction..."
                    value={lineItems[0]?.description || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setLineItems(prev => {
                        const first = prev[0] || { id: '1', description: '', qty: 1, unitPrice: 0, amount: 0 };
                        return [{ ...first, description: val, qty: 1 }];
                      });
                    }}
                    className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs text-primary focus:border-primary resize-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-secondary mb-1.5">
                    Amount (LKR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={lineItems[0]?.unitPrice || ''}
                    onChange={e => {
                      const num = Math.max(0, Number(e.target.value) || 0);
                      setLineItems(prev => {
                        const first = prev[0] || { id: '1', description: reason || 'Adjustment', qty: 1, unitPrice: 0, amount: 0 };
                        return [{
                          ...first,
                          description: first.description || reason || 'Adjustment',
                          qty: 1,
                          unitPrice: num,
                          amount: Number(num.toFixed(2))
                        }];
                      });
                    }}
                    className="w-full bg-surface border border-theme-subtle focus:border-primary px-3 py-2 rounded-lg text-sm font-mono font-bold text-right text-primary"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-theme-subtle overflow-hidden bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle">
                <span className="text-xs font-bold text-primary">
                  {noteType === 'debit_note' && relatedDocType === 'GRN'
                    ? `GRN Line Items ${linkedDocMeta?.docNo ? `(${linkedDocMeta.docNo})` : ''}`
                    : 'Line Items'}
                </span>
                <div className="flex items-center gap-3">
                  {noteType === 'debit_note' && relatedDocType === 'GRN' && !linkedDocMeta && candidateDocs.length > 0 && (
                    <select
                      value=""
                      onChange={e => {
                        const doc = candidateDocs.find(d => d.docNo === e.target.value);
                        if (doc) applySelectedDocument(doc, true);
                      }}
                      className="bg-surface border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                    >
                      <option value="">Quick Select GRN ({candidateDocs.length})...</option>
                      {candidateDocs.map((d, i) => (
                        <option key={`${d.docNo}-${i}`} value={d.docNo}>
                          {d.docNo} — {d.partyName || 'Vendor'} ({d.items.length} items)
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rex-600 dark:text-rex-400 hover:underline"
                  >
                    <Plus size={13} />
                    Add Line
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-theme-subtle bg-surface2/20 text-[10px] font-bold uppercase tracking-wider text-muted">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-right w-24">Qty</th>
                      <th className="py-2.5 px-3 text-right w-36">Unit Price</th>
                      <th className="py-2.5 px-3 text-right w-36">Amount</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/50">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface2/20 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-muted">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            placeholder="Item description or adjustment..."
                            value={item.description}
                            onChange={e => handleLineItemChange(item.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-primary px-1 py-1 text-xs text-primary outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            required
                            value={item.qty}
                            onChange={e => handleLineItemChange(item.id, 'qty', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-primary px-1 py-1 text-xs font-mono text-right text-primary outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.unitPrice || ''}
                            onChange={e => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-primary px-1 py-1 text-xs font-mono font-semibold text-right text-primary outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(item.amount, false)}
                        </td>
                        <td className="py-2 px-2 text-center">
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
          )}

          {/* 5. Bottom Split: Remarks & Attachment (Left) | Tax & Totals (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
            <div className="md:col-span-7 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-secondary mb-1.5">Memo / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Optional remarks to print on the note..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs resize-none focus:border-primary"
                />
              </div>

              <div>
                {attachment ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-surface2/40 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip size={14} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-semibold text-primary truncate">
                        {attachmentName || `${previewNoteNo || 'Note'}_Attachment`}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {isUploadingAttachment ? 'Uploading...' : 'Attached'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openDataUriOrUrl(attachment, attachmentName || 'Note Attachment')}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachment('');
                          setAttachmentName('');
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-theme-subtle hover:border-primary rounded-lg cursor-pointer transition-colors text-xs text-muted hover:text-primary">
                    <UploadCloud size={15} className="shrink-0" />
                    <span>Attach supporting document (PDF, JPG, PNG — Max 25MB)</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="md:col-span-5 bg-surface2/35 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={e => setTaxEnabled(e.target.checked)}
                    className="rounded text-primary h-3.5 w-3.5"
                  />
                  <span>Apply VAT ({vatRate}%)</span>
                </label>
                {taxEnabled && (
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {isVatAbsorbed ? `Incl. ${formatCurrency(taxAmount, true)}` : `+${formatCurrency(taxAmount, true)}`}
                  </span>
                )}
              </div>

              {taxEnabled && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTaxProfileId('tp_vat18')}
                      className={`py-1 text-[10px] font-bold rounded-md border transition-all ${
                        !isVatAbsorbed
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle'
                      }`}
                    >
                      VAT Separated
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxProfileId('tp_vat18_absorbed')}
                      className={`py-1 text-[10px] font-bold rounded-md border transition-all ${
                        isVatAbsorbed
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-surface text-muted hover:text-primary border-theme-subtle'
                      }`}
                    >
                      VAT Included
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-secondary">Tax Inclusive Pricing</span>
                    <button
                      type="button"
                      onClick={() => setIsTaxInclusive(!isTaxInclusive)}
                      className={`w-8 h-4 rounded-full transition-colors relative flex items-center ${isTaxInclusive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <span className={`block w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${isTaxInclusive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2.5 border-t border-theme-subtle space-y-1.5 text-xs">
                <div className="flex justify-between text-secondary">
                  <span>{isVatAbsorbed ? 'Total Supply Value:' : 'Subtotal:'}</span>
                  <span className="font-mono font-semibold">{formatCurrency(numSubtotal, true)}</span>
                </div>
                {taxEnabled && !isVatAbsorbed && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>VAT ({vatRate}%):</span>
                    <span className="font-mono font-semibold">+{formatCurrency(taxAmount, true)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-theme-subtle font-bold text-primary text-sm">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(totalAmount, true)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : `Issue ${noteType === 'credit_note' ? 'Credit Note' : 'Debit Note'}`}
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
                {activePrintNote.attachment && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Paperclip}
                    onClick={() => openDataUriOrUrl(activePrintNote.attachment, activePrintNote.attachmentName || `${activePrintNote.noteNo} Attachment`)}
                  >
                    View Attachment
                  </Button>
                )}
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
                          {formatMMDDYYYY(activePrintNote.date ? String(activePrintNote.date).slice(0, 10) : new Date().toISOString().slice(0, 10))}
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
                            {formatMMDDYYYY(printContext.linkedDate)}
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
