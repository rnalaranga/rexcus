import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, GitBranch, Trash2, Download, Save, History, Package, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2, LineChart, Building2, UserCheck, Users, Eye, ChevronLeft, ChevronRight, Bookmark, Landmark, CheckCircle2, XCircle, Clock, Send, AlertTriangle, Sparkles, Loader2, Percent, Coins, Lock, Unlock, Sidebar } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { CustomerModal } from '@/components/crm/CustomerModal'
import { QuotationTemplatesModal, QuotationTemplate } from '@/components/crm/QuotationTemplatesModal'
import { QuotationTermsPreset, DEFAULT_TERMS_PRESETS } from '@/components/TermsConditionsManager'
import { useLeads, useInventory, useMachiningOperations, useCustomers, useQuotations } from '@/hooks/useData'
import { createCustomer } from '@/lib/api'
import { useTaxProfiles } from '@/hooks/useFinance'
import { useCurrencies, useTaxes } from '@/hooks/useFinance'
import { createQuotation, fetchQuotations, updateQuotation, deleteQuotation, generateQuotationDescription, fetchAllCustomerGRNs, submitQuotationForApproval, approveQuotation, rejectQuotation, requestQuotationEditApproval, approveQuotationEdit, rejectQuotationEdit, fetchNextDocumentNumber } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useDialog } from '@/components/ui/DialogProvider'
import { exportPdf } from '@/lib/exportPdf'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { printElement } from '@/lib/printElement'

function toWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = ['','Thousand','Million','Billion'];
  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };
  let result = '';
  let i = 0;
  let val = Math.floor(Math.abs(num));
  while (val > 0) {
    const chunk = val % 1000;
    if (chunk !== 0) {
      result = makeGroup(chunk) + ' ' + g[i] + ' ' + result;
    }
    val = Math.floor(val / 1000);
    i++;
  }
  return result.trim() + ' Only';
}

const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-primary px-2 py-1.5 text-[12px] outline-none transition-all placeholder:text-muted/30 text-primary"
const docInputClass = "w-full bg-surface border border-theme-subtle/40 px-3 py-2 rounded-lg text-xs outline-none focus:border-rex-500/50 transition-colors disabled:text-muted disabled:cursor-default"

export const buildDefaultQuotationNo = (userPfx?: string | null, custPfx?: string | null, num: string | number = '2206') => {
  const cleanUser = (userPfx || '').trim().toUpperCase().replace(/[-_]+$/, '');
  const pfx = cleanUser ? (cleanUser.endsWith('SQ') ? cleanUser : `${cleanUser}SQ`) : 'SQ';
  const cleanCust = (custPfx || '').trim().toUpperCase().replace(/[-_]+$/, '');
  if (cleanCust) {
    return `${pfx}-${cleanCust}-${num}`;
  }
  return `${pfx}-${num}`;
};

interface MatSearchProps {
  value: string
  onChange: (val: string) => void
  onSelect: (name: string, unitPrice?: number) => void
  inventory: any[]
  className?: string
}

const MatSearchInput: React.FC<MatSearchProps> = ({ value, onChange, onSelect, inventory, className = '' }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  
  const filtered = value.length > 0
    ? inventory.filter(item => (item.name || '').toLowerCase().includes(value.toLowerCase()) || (item.sku || '').toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <input type="text" value={value} className={`${tableInputClass} ${className}`}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} autoComplete="off" placeholder="Material..." />
      {open && filtered.length > 0 && createPortal(
        <ul style={{ top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY, left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, width: wrapRef.current?.getBoundingClientRect().width, minWidth: '200px' }} className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle/40 shadow-glass rounded-xl py-1 max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); onSelect(item.name, item.unitCost || item.price || 0); onChange(item.name); setOpen(false) }}>
              <span className="text-primary font-medium">{item.name}</span>
              {item.unitCost > 0 && <span className="text-[10px] text-muted font-mono ml-2">Rs.{item.unitCost}</span>}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

interface LeadSearchProps {
  value: string
  onChange: (val: string) => void
  onSelect: (item: any) => void
  items: any[]
  clientType: 'customer' | 'lead'
  className?: string
  placeholder?: string
}

const LeadSearchInput: React.FC<LeadSearchProps> = ({ clientType, value, onChange, onSelect, items, className = '', placeholder }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  
  const filtered = useMemo(() => {
    if (!value || value.trim().length === 0) return items.slice(0, 8);
    const q = value.toLowerCase();
    return items.filter(l => {
      const name = (l.name || '').toLowerCase();
      const comp = (l.company || '').toLowerCase();
      const desc = (l.description || '').toLowerCase();
      const email = (l.email || '').toLowerCase();
      const phone = (l.phone || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || desc.includes(q) || email.includes(q) || phone.includes(q);
    }).slice(0, 10);
  }, [value, items]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <input type="text" value={value} className={className}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} autoComplete="off" 
        placeholder={placeholder || (clientType === 'customer' ? 'Type to search customer (name, company)...' : 'Type to search lead (company, contact, description)...')} 
      />
      {open && filtered.length > 0 && createPortal(
        <ul style={{ top: (wrapRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY, left: (wrapRef.current?.getBoundingClientRect().left || 0) + window.scrollX, width: Math.max(wrapRef.current?.getBoundingClientRect().width || 0, 360) }} className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle/50 shadow-2xl rounded-xl py-1 max-h-60 overflow-y-auto">
          {filtered.map((l, i) => {
            const title = l.company || l.name;
            const subtitle = l.company && l.name ? l.name : (l.email || l.phone || '');
            const leadDesc = clientType === 'lead' ? (l.description || '') : '';
            return (
              <li key={i} className="px-3.5 py-2 text-xs hover:bg-surface2 cursor-pointer border-b border-theme-subtle/30 last:border-b-0 transition-colors"
                onMouseDown={e => { 
                  e.preventDefault(); 
                  onSelect(l); 
                  onChange(title); 
                  setOpen(false); 
                }}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-primary font-bold text-xs truncate">{title}</span>
                  {l.status && (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-muted shrink-0">
                      {l.status}
                    </span>
                  )}
                </div>
                {subtitle && <p className="text-[10px] text-muted truncate mt-0.5">{subtitle}</p>}
                {leadDesc && (
                  <p className="text-[10px] text-purple-600 dark:text-purple-300 italic truncate mt-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    "{leadDesc}"
                  </p>
                )}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  )
}

export interface BOM {
  id: number;
  title: string;
  description?: string;
  collapsed: boolean;
  autoCollapsed?: boolean;
  manualCollapsed?: boolean;
  machiningCollapsed?: boolean;
  autoMats: any[];
  manualMats: any[];
  procState: Record<string, { estHr: string; setTime: string; quoHr: string; hrRate?: number; setTimeRate?: number; rate?: number }>;
  attachments?: any[];
}

export const QuotationBuilder: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const quoteIdParam = searchParams.get('quoteId')
  const previewParam = searchParams.get('preview') === 'true'
  const isTemplateMode = searchParams.get('mode') === 'template'
  const editTemplateId = searchParams.get('editTemplateId')
  const templateIdParam = searchParams.get('templateId')

  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false)
  const [templateSaveName, setTemplateSaveName] = useState('')
  const [templateSaveDesc, setTemplateSaveDesc] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState('')
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const navigate = useNavigate()
  const { showConfirm } = useDialog()
  const [useAiPolish, setUseAiPolish] = useState(true)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false)
  const [polishingItemId, setPolishingItemId] = useState<number | null>(null)
  const [isPolishingAll, setIsPolishingAll] = useState(false)
  
  const { data: leads, loading } = useLeads()
  const { data: customers } = useCustomers()
  const { data: inventory } = useInventory()
  const { settings } = useSettings()
  const { user, can } = useAuth()
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  )
  const canApprove = (can ? can('approvals.quotations') : false) || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager'
  const { data: currencies } = useCurrencies()
  const { data: taxes } = useTaxes()
  const [currency, setCurrency] = useState('LKR')
  const { data: taxProfiles } = useTaxProfiles()
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
  
  const lead = customers?.find(c => c.id === leadId) || leads?.find(l => l.id === leadId)
  
  const { data: rawOperations } = useMachiningOperations()
  const EXCEL_PROCESSES = React.useMemo(() => {
    const groups: Record<string, any[]> = {}
    if (rawOperations) {
      rawOperations.forEach((op: any) => {
        if (!groups[op.groupName]) groups[op.groupName] = []
        groups[op.groupName].push(op)
      })
    }
    return Object.keys(groups).map(k => ({ group: k, items: groups[k] }))
  }, [rawOperations])

  const initProcState = useCallback(() => {
    const init: any = {}
    EXCEL_PROCESSES.forEach(g => g.items.forEach(i => {
      init[i.name] = { estHr: '', setTime: '', quoHr: '', hrRate: i.hrRate, setTimeRate: i.setTimeRate, rate: i.hrRate }
    }))
    return init
  }, [EXCEL_PROCESSES])


  const [savedVersions, setSavedVersions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(() => quoteIdParam || null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const initialLoadedRef = useRef(false)
  const draftIdRef = useRef<string | null>(quoteIdParam || null)
  const currentIdRef = useRef<string | null>(null)
  const isAutoSavingRef = useRef(false)

  const currentQuote = useMemo(() => {
    if (!currentId && !draftId) return null;
    const targetId = currentId || draftId;
    return savedVersions.find((v: any) => v.id === targetId) || null;
  }, [currentId, draftId, savedVersions])

  const isApprovedLocked = useMemo(() => {
    if (!currentQuote) return false;
    const st = currentQuote.status || '';
    return ['Approved', 'Accepted', 'In Production', 'PO Received', 'Pending Edit Approval'].includes(st);
  }, [currentQuote]);

  const isApproved = useMemo(() => {
    if (isTemplateMode) return true;
    if (!currentQuote) return false;
    const st = currentQuote.status || '';
    return ['Approved', 'Accepted', 'In Production', 'PO Received', 'Without PO'].includes(st);
  }, [isTemplateMode, currentQuote]);

  const [showRequestEditModal, setShowRequestEditModal] = useState(false);
  const [editReasonInput, setEditReasonInput] = useState('');
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);

  const loadVersions = useCallback(async () => {
      try {
        let targetQuote: any = null;
        if (quoteIdParam && !initialLoadedRef.current) {
          try {
            const singleRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/single/${quoteIdParam}`);
            if (singleRes.ok) {
              targetQuote = await singleRes.json();
            }
          } catch (e) {
            console.error('Failed to fetch quote by id:', e);
          }
        }

        const effectiveLeadId = targetQuote?.leadId || leadId || selectedLeadId;
        let data: any[] = [];
        if (effectiveLeadId && effectiveLeadId !== 'WALK-IN') {
          const raw = await fetchQuotations(effectiveLeadId);
          data = (raw || []).filter((q: any) => !q.deletedAt);
          setSavedVersions(data);
        }

        // Auto-load if quoteId is in URL (only on initial load so it doesn't overwrite user edits)
        if (quoteIdParam && !initialLoadedRef.current) {
          const target = targetQuote || data.find((v: any) => v.id === quoteIdParam);
          if (target) {
            initialLoadedRef.current = true;
            const snap = typeof target.data === 'string' ? JSON.parse(target.data) : target.data;
            restoreSnapshot(snap);
            if (target.type === 'draft') {
              setDraftId(target.id);
              draftIdRef.current = target.id;
              setCurrentId(null);
              currentIdRef.current = null;
            } else {
              setCurrentId(target.id);
              currentIdRef.current = target.id;
              setDraftId(null);
              draftIdRef.current = null;
            }
            if (target.leadId) {
              setSelectedLeadId(target.leadId);
            }
            if (previewParam) {
              setShowPreview(true);
            }
          }
        } else if (!quoteIdParam && !initialLoadedRef.current && data.length > 0) {
          // If customer already has an active draft, connect to it to avoid duplicate repeating drafts
          const existingDraft = data.find((v: any) => v.type === 'draft');
          if (existingDraft) {
            initialLoadedRef.current = true;
            setDraftId(existingDraft.id);
            draftIdRef.current = existingDraft.id;
            try {
              const snap = typeof existingDraft.data === 'string' ? JSON.parse(existingDraft.data) : existingDraft.data;
              restoreSnapshot(snap);
            } catch(e) {}
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, [leadId, quoteIdParam, previewParam, selectedLeadId])

  useEffect(() => { loadVersions() }, [loadVersions])

  // --- Document Details ---
  const [docNo, setDocNo] = useState('FO/PD/02')
  const [issueNo, setIssueNo] = useState('01')
  const [issueDate, setIssueDate] = useState('March 04, 2026')
  const [quoDate, setQuoDate] = useState(new Date().toISOString().split('T')[0])
  const [vatNo, setVatNo] = useState(lead?.vat || '')
  const [tinNo, setTinNo] = useState(lead?.tin || lead?.brNumber || '')
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (lead?.address) return lead.address;
    if (lead?.customerId && customers) {
      const c = customers.find((cust: any) => cust.id === lead.customerId);
      if (c?.address) return c.address;
    }
    return '';
  })
  const { data: allQuotations = [] } = useQuotations();
  const [linkedProductQuoteNo, setLinkedProductQuoteNo] = useState('')
  const [linkedProductQuoteId, setLinkedProductQuoteId] = useState('')
  const [quotationNo, setQuotationNo] = useState('')
  const [jobQty, setJobQty] = useState('1')
  const [attention, setAttention] = useState('')
  const [subject, setSubject] = useState('To machining parts as per given sample')
  const [customerName, setCustomerName] = useState('')
  const [clientType, setClientType] = useState<'customer' | 'lead'>(leadId ? 'lead' : 'customer')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [allGrns, setAllGrns] = useState<any[]>([]);
  
  useEffect(() => {
    fetchAllCustomerGRNs().then(setAllGrns).catch(() => {});
  }, []);
  
  const leadGrns = allGrns.filter(g => g.leadId === selectedLeadId || g.customerId === selectedLeadId);

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

  const availableProductQuotes = useMemo(() => {
    if (!allQuotations || !allQuotations.length) return [];
    return allQuotations.filter((q: any) => {
      const isProd = q.type === 'product' || q.type === 'product_draft' || q.data?.isProductQuotation || q.data?.quotationCategory === 'product';
      if (!isProd) return false;
      if (quotationNo && q.quotationNo === quotationNo) return false;
      const matchLead = selectedLeadId && (q.leadId === selectedLeadId || q.customerId === selectedLeadId);
      const matchCustomer = selectedCustomer?.id && (q.leadId === selectedCustomer.id || q.customerId === selectedCustomer.id || q.data?.selectedCustomerId === selectedCustomer.id);
      const matchCustName = (customerName && q.customerName && q.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) ||
                            (currentEntity?.company && q.customerCompany && q.customerCompany.toLowerCase().trim() === currentEntity.company.toLowerCase().trim());
      return matchLead || matchCustomer || matchCustName;
    });
  }, [allQuotations, selectedLeadId, selectedCustomer, customerName, currentEntity, quotationNo]);

  // Aggregate all contacts from Customer (Primary, Finance, Additional contacts) and Lead
  const availableContacts = useMemo(() => {
    const list: Array<{ name: string; designation?: string; phone?: string; email?: string; roleTag: string }> = [];
    const seenNames = new Set<string>();

    const addContact = (name: string, designation?: string, phone?: string, email?: string, roleTag = '') => {
      const trimmed = (name || '').trim();
      if (!trimmed || seenNames.has(trimmed.toLowerCase())) return;
      seenNames.add(trimmed.toLowerCase());
      list.push({ name: trimmed, designation, phone, email, roleTag });
    };

    if (selectedCustomer) {
      if (selectedCustomer.name) {
        addContact(selectedCustomer.name, selectedCustomer.designation, selectedCustomer.phone, selectedCustomer.email, 'Primary');
      }
      if (selectedCustomer.financeContact) {
        addContact(selectedCustomer.financeContact, 'Finance', selectedCustomer.financePhone, selectedCustomer.financeEmail, 'Finance');
      }
      let custContacts: any[] = [];
      try {
        custContacts = typeof selectedCustomer.contacts === 'string' 
          ? JSON.parse(selectedCustomer.contacts) 
          : (selectedCustomer.contacts || []);
      } catch (e) { custContacts = []; }
      if (Array.isArray(custContacts)) {
        for (const c of custContacts) {
          if (c && c.name) {
            addContact(c.name, c.designation, c.phone, c.email, c.isPrimary ? 'Primary' : (c.designation || 'Additional'));
          }
        }
      }
    }

    if (selectedLead) {
      if (selectedLead.name) {
        addContact(selectedLead.name, selectedLead.designation, selectedLead.phone, selectedLead.email, 'Lead Contact');
      }
      let leadContacts: any[] = [];
      try {
        leadContacts = typeof selectedLead.contacts === 'string'
          ? JSON.parse(selectedLead.contacts)
          : (selectedLead.contacts || []);
      } catch (e) { leadContacts = []; }
      if (Array.isArray(leadContacts)) {
        for (const c of leadContacts) {
          if (c && c.name) {
            addContact(c.name, c.designation, c.phone, c.email, c.designation || 'Additional');
          }
        }
      }
    }

    return list;
  }, [selectedCustomer, selectedLead]);

  const handleCurrencyChange = (newCurrencyCode: string) => {
     if (!currencies || currencies.length === 0) return;
     const oldCur = currencies.find(c => c.code === currency) || { exchangeRate: 1 };
     const newCur = currencies.find(c => c.code === newCurrencyCode) || { exchangeRate: 1 };

     const multiplier = newCur.exchangeRate / oldCur.exchangeRate;
     
     setCustItems(items => items.map(i => ({
        ...i,
        unitPrice: Number((i.unitPrice * multiplier).toFixed(2))
     })));

     setCurrency(newCurrencyCode);
  };

  const handleSelectLeadOrCustomer = (item: any) => {
    if (!item) return;
    const itemId = item.id || item;
    setSelectedLeadId(itemId);

    // If not currently working on an existing finalized quote, check if this customer has an active draft to resume
    if (!currentIdRef.current && !quoteIdParam) {
      fetchQuotations(itemId).then((custQuotes) => {
        const existingDraft = (custQuotes || []).find((q: any) => q.type === 'draft');
        if (existingDraft) {
          setDraftId(existingDraft.id);
          draftIdRef.current = existingDraft.id;
        }
      }).catch(() => {});
    }

    if (clientType === 'customer') {
      const cust = customers?.find((c: any) => c.id === itemId) || item;
      setCustomerName(cust.company || cust.name || '');
      setCustomerAddress(cust.address || '');
      if (cust.name) {
        setAttention(cust.name);
      }
      setVatNo(cust.vat || '');
      setTinNo(cust.tin || cust.brNumber || '');
      if (cust.paymentTerms) {
        setCustTerms(cust.paymentTerms);
      } else if (!custTerms) {
        let terms = '';
        if (cust.requiresAdvance) terms = 'Advance required. ';
        if (cust.creditDays > 0) terms += `${cust.creditDays} days credit.`;
        if (terms.trim()) setCustTerms(terms.trim());
      }
      if (cust.deliveryTerms) setCustDelivery(cust.deliveryTerms);

      fetchNextDocumentNumber('quotation', {
        userPrefix: user?.prefix,
        customerPrefix: cust.prefix,
        reserve: false
      }).then(res => {
        if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
        else setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust.prefix));
      }).catch(() => {
        setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust.prefix));
      });
    } else {
      const leadItem = leads?.find((l: any) => l.id === itemId) || item;
      setCustomerName(leadItem.company || leadItem.name || '');
      if (leadItem.name) {
        setAttention(leadItem.name);
      }

      let cust = null;
      if (leadItem.customerId) cust = customers?.find((c: any) => c.id === leadItem.customerId);

      if (cust) {
        setCustomerAddress(cust.address || leadItem.address || '');
        setVatNo(cust.vat || leadItem.vat || '');
        setTinNo(cust.tin || cust.brNumber || leadItem.tin || leadItem.brNumber || '');
        if (cust.paymentTerms) {
          setCustTerms(cust.paymentTerms);
        } else if (!custTerms) {
          let terms = '';
          if (cust.requiresAdvance) terms = 'Advance required. ';
          if (cust.creditDays > 0) terms += `${cust.creditDays} days credit.`;
          if (terms.trim()) setCustTerms(terms.trim());
        }
        if (cust.deliveryTerms) setCustDelivery(cust.deliveryTerms);

        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          customerPrefix: cust.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust.prefix));
        }).catch(() => {
          setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust.prefix));
        });
      } else {
        setCustomerAddress(leadItem.address || '');
        setVatNo(leadItem.vat || '');
        setTinNo(leadItem.tin || leadItem.brNumber || '');
        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else setQuotationNo(buildDefaultQuotationNo(user?.prefix));
        }).catch(() => {
          setQuotationNo(buildDefaultQuotationNo(user?.prefix));
        });
      }
    }
  };

  useEffect(() => {
     if (leadId && lead) {
        const isCust = leadId.startsWith('CUST-') || customers?.some(c => c.id === leadId);
        const linkedCust = !isCust && lead.customerId ? customers?.find(c => c.id === lead.customerId) : null;
        setClientType(isCust ? 'customer' : 'lead');
        setCustomerName(lead.company || lead.name || linkedCust?.company || linkedCust?.name || '');
        setCustomerAddress(lead.address || linkedCust?.address || '');
        setSelectedLeadId(lead.id);
        if (!attention && (lead.name || linkedCust?.name)) setAttention(lead.name || linkedCust?.name || '');
        if (lead.vat || linkedCust?.vat) setVatNo(lead.vat || linkedCust?.vat || '');
        if (lead.tin || linkedCust?.tin || lead.brNumber || linkedCust?.brNumber) setTinNo(lead.tin || linkedCust?.tin || lead.brNumber || linkedCust?.brNumber || '');
        if (linkedCust) {
          if (linkedCust.paymentTerms) setCustTerms(linkedCust.paymentTerms);
          if (linkedCust.deliveryTerms) setCustDelivery(linkedCust.deliveryTerms);
        }
        if (!quoteIdParam && !quotationNo) {
          const cust = isCust ? customers?.find(c => c.id === leadId) || lead : (linkedCust || null);
          fetchNextDocumentNumber('quotation', {
            userPrefix: user?.prefix,
            customerPrefix: cust?.prefix,
            reserve: false
          }).then(res => {
            if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
            else setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust?.prefix));
          }).catch(() => {
            setQuotationNo(buildDefaultQuotationNo(user?.prefix, cust?.prefix));
          });
        }
     } else if (!quoteIdParam && !quotationNo) {
        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else setQuotationNo(buildDefaultQuotationNo(user?.prefix));
        }).catch(() => {
          setQuotationNo(buildDefaultQuotationNo(user?.prefix));
        });
     }
  }, [leadId, lead, customers, quoteIdParam, quotationNo, user?.prefix]);

  // --- Job Items / Description ---
  const [attachments, setAttachments] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
         if (ev.target?.result) {
            setAttachments(prev => [...prev, { id: Date.now() + Math.random(), name: file.name, dataUrl: ev.target?.result as string, type: file.type }]);
         }
      }
      reader.readAsDataURL(file);
    });
  }

  const [jobItems, setJobItems] = useState<{ id: number; text: string }[]>([{ id: Date.now(), text: '' }])
  const addJobItem = () => setJobItems(p => [...p, { id: Date.now(), text: '' }])
  const updateJobItem = (id: number, text: string) => setJobItems(p => p.map(i => i.id === id ? { ...i, text } : i))
  const removeJobItem = (id: number) => setJobItems(p => p.filter(i => i.id !== id))

  // --- BOMs ---
  const [boms, setBoms] = useState<BOM[]>([])

  
  const handleBomFileUpload = (bomId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
         if (ev.target?.result) {
            setBoms(prev => prev.map(b => b.id === bomId ? { ...b, attachments: [...(b.attachments || []), { id: Date.now() + Math.random(), name: file.name, dataUrl: ev.target?.result as string, type: file.type }] } : b));
         }
      }
      reader.readAsDataURL(file);
    });
  }

  const addBOM = () => {
    setBoms(prev => [...prev, {
      id: Date.now(),
      title: `BOM Part ${prev.length + 1}`,
      collapsed: false,
      autoMats: [],
      manualMats: [],
      procState: initProcState()
    }])
  }
  
  const updateBOM = (id: number, updates: Partial<BOM>) => {
    setBoms(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }
  
  const removeBOM = (id: number) => {
    setBoms(prev => prev.filter(b => b.id !== id))
  }

  const addAutoMat = (bomId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return {
        ...b,
        autoMats: [...b.autoMats, { id: Date.now(), material: '', width: '', length: '', supplier: '', thick: '', dia: '', qty: 1, unitPrice: 0, platePrice: 0, shaftPrice: 0 }]
      }
    }))
  }

  const updateAutoMat = (bomId: number, matId: number, field: string, val: any) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      const newAutoMats = b.autoMats.map(m => {
        if (m.id !== matId) return m;
        const nm = { ...m, [field]: val }
        const matName = (nm.material || '').toLowerCase()
        const isRod = matName.includes('rod') || matName.includes('shaft') || Boolean(nm.dia)
        
        const qty = Number(nm.qty) || 0
        const up = Number(nm.unitPrice) || 0
        const density = 0.00000785
        
        let price = qty * up
        if (isRod && nm.dia && nm.length) {
          price = Math.PI * Math.pow(Number(nm.dia) / 2, 2) * Number(nm.length) * density * up * qty
        } else if (!isRod && nm.width && nm.length && nm.thick) {
          price = Number(nm.width) * Number(nm.length) * Number(nm.thick) * density * up * qty
        }
        
        nm.shaftPrice = isRod ? Number(price.toFixed(2)) : 0
        nm.platePrice = !isRod ? Number(price.toFixed(2)) : 0
        return nm
      })
      return { ...b, autoMats: newAutoMats }
    }))
  }

  const removeAutoMat = (bomId: number, matId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return { ...b, autoMats: b.autoMats.filter(m => m.id !== matId) }
    }))
  }

  const addManualMat = (bomId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return {
        ...b,
        manualMats: [...b.manualMats, { id: Date.now(), material: '', supplier: '', priceMode: '-', qty: 1, unitPrice: 0 }]
      }
    }))
  }

  const updateManualMat = (bomId: number, matId: number, f: string, v: any) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return { ...b, manualMats: b.manualMats.map(m => m.id === matId ? { ...m, [f]: v } : m) }
    }))
  }

  const removeManualMat = (bomId: number, matId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return { ...b, manualMats: b.manualMats.filter(m => m.id !== matId) }
    }))
  }

  const handleProcChange = (bomId: number, name: string, f: string, v: string) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b;
      return {
        ...b,
        procState: {
          ...b.procState,
          [name]: { ...b.procState[name], [f]: v }
        }
      }
    }))
  }

  // --- Customer Quotation Items ---
  const [custItems, setCustItems] = useState<{ id: number; desc: string; qty: number; unitPrice: number; note: string }[]>([
    { id: Date.now(), desc: '', qty: 1, unitPrice: 0, note: '' }
  ])
  const addCustItem = () => setCustItems(p => [...p, { id: Date.now(), desc: '', qty: 1, unitPrice: 0, note: '' }])
  const updateCustItem = (id: number, f: string, v: any) => setCustItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i))
  const removeCustItem = (id: number) => setCustItems(p => p.filter(i => i.id !== id))
  
  const [custTerms, setCustTerms] = useState('')
  const [custValidity, setCustValidity] = useState('30 Days')
  const [custDelivery, setCustDelivery] = useState('')
  const [custDiscount, setCustDiscount] = useState<number | string>(0)
  const [custDiscountType, setCustDiscountType] = useState<'percent' | 'amount'>('percent')
  const [custDiscountAmount, setCustDiscountAmount] = useState<number | string>(0)

  // Quotation Terms & Conditions Presets (loaded from Settings)
  const termsPresets = useMemo<QuotationTermsPreset[]>(() => {
    if (settings?.quotation_terms_presets) {
      try {
        const parsed = JSON.parse(settings.quotation_terms_presets);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing quotation_terms_presets', e);
      }
    }
    return DEFAULT_TERMS_PRESETS;
  }, [settings?.quotation_terms_presets]);

  const [selectedTermsPresetId, setSelectedTermsPresetId] = useState<string>('');

  const handleSelectTermsPreset = (presetId: string) => {
    setSelectedTermsPresetId(presetId);
    if (!presetId) return;
    const preset = termsPresets.find(p => p.id === presetId);
    if (preset) {
      if (preset.paymentTerms) setCustTerms(preset.paymentTerms);
      if (preset.validity) setCustValidity(preset.validity);
      if (preset.delivery) setCustDelivery(preset.delivery);
    }
  };

  // Auto-select default preset if terms are blank
  useEffect(() => {
    if (!custTerms && termsPresets.length > 0) {
      const def = termsPresets.find(p => p.isDefault) || termsPresets[0];
      if (def) {
        setSelectedTermsPresetId(def.id);
        if (def.paymentTerms) setCustTerms(def.paymentTerms);
        if (def.validity) setCustValidity(def.validity);
        if (def.delivery) setCustDelivery(def.delivery);
      }
    }
  }, [termsPresets]);

  // Keep dropdown in sync if terms match an existing preset
  useEffect(() => {
    if (custTerms && termsPresets.length > 0) {
      const matched = termsPresets.find(p => p.paymentTerms.trim().toLowerCase() === custTerms.trim().toLowerCase());
      if (matched && matched.id !== selectedTermsPresetId) {
        setSelectedTermsPresetId(matched.id);
      }
    }
  }, [custTerms, termsPresets]);

  // Quotation Bank Details (loaded from Settings)
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankDetailId, setBankDetailId] = useState<string>('');
  const selectedBank = useMemo(() => {
    if (bankDetailId === 'none') return null;
    return bankAccounts.find(b => b.id === bankDetailId) || null;
  }, [bankDetailId, bankAccounts]);

  useEffect(() => {
    let banks: any[] = [];
    if (settings?.company_bank_details) {
      try {
        const parsed = typeof settings.company_bank_details === 'string'
          ? JSON.parse(settings.company_bank_details)
          : settings.company_bank_details;
        if (Array.isArray(parsed) && parsed.length > 0) banks = parsed;
      } catch (e) {}
    }
    if (banks.length === 0) {
      banks = [
        { id: 'bank_hnb', bankName: 'Hatton National Bank', branchName: 'Negombo', accountName: 'Rex Industries (Pvt) Ltd', accountNumber: '011010078028', swiftCode: 'HNBLLKLX', isDefault: true }
      ];
    }
    setBankAccounts(banks);
    if (!bankDetailId) {
      const def = banks.find((b: any) => b.isDefault) || banks[0];
      if (def) setBankDetailId(def.id);
    }
  }, [settings?.company_bank_details]);

  // --- Calculations ---
  
  let totalMaterialCost = 0;
  let totalMachiningCost = 0;

  boms.forEach(b => {
    const autoMatTotal = b.autoMats.reduce((s, m) => s + Number(m.platePrice) + Number(m.shaftPrice), 0)
    const manualMatTotal = b.manualMats.reduce((s, m) => s + Number(m.qty) * Number(m.unitPrice), 0)
    totalMaterialCost += (autoMatTotal + manualMatTotal)
    
    if (b.procState) {
        totalMachiningCost += Object.values(b.procState).reduce((s, p) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0)
    }
  })

  const jobTotalCost = totalMaterialCost + totalMachiningCost
  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const custDiscountAmt = custDiscountType === 'amount'
    ? Math.min(custSubtotal, Math.max(0, Number(custDiscountAmount) || 0))
    : custSubtotal * (Math.max(0, Number(custDiscount) || 0) / 100)
  const custTotal = Math.max(0, custSubtotal - custDiscountAmt)

  const handlePercentDiscountChange = (val: string) => {
    setCustDiscountType('percent')
    setCustDiscount(val)
  }

  const handleAmountDiscountChange = (val: string) => {
    setCustDiscountType('amount')
    setCustDiscountAmount(val)
  }

  const handleDiscountTypeToggle = (type: 'percent' | 'amount') => {
    if (type === custDiscountType) return;
    setCustDiscountType(type);
    if (type === 'amount') {
      if (!custDiscountAmount || Number(custDiscountAmount) === 0) {
        const pct = Math.max(0, Number(custDiscount) || 0);
        if (pct > 0 && custSubtotal > 0) {
          setCustDiscountAmount(Number((custSubtotal * (pct / 100)).toFixed(2)));
        }
      }
    } else {
      if (!custDiscount || Number(custDiscount) === 0) {
        const amt = Math.max(0, Number(custDiscountAmount) || 0);
        if (amt > 0 && custSubtotal > 0) {
          setCustDiscount(Number(((amt / custSubtotal) * 100).toFixed(2)));
        }
      }
    }
  }
  
  let jobTaxAmount = 0; let jobSscl = 0; let jobVat = 0;
  let custTaxAmount = 0; let custSscl = 0; let custVat = 0;
  
  const selectedProfile = (taxEnabled && selectedProfileId) ? taxProfiles?.find((p: any) => p.id === selectedProfileId) : null;
  
  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    
    // Job Taxes
    jobSscl = jobTotalCost * t1;
    jobVat = selectedProfile.tax2_compound ? (jobTotalCost + jobSscl) * t2 : jobTotalCost * t2;
    jobTaxAmount = jobSscl + jobVat;
    
    // Cust Taxes
    custSscl = custTotal * t1;
    custVat = selectedProfile.tax2_compound ? (custTotal + custSscl) * t2 : custTotal * t2;
    custTaxAmount = custSscl + custVat;
  }
  
  const jobWithSSCL = jobTotalCost + jobTaxAmount;
  const custWithSSCL = custTotal + custTaxAmount;
  
  const expectedProfit = custWithSSCL - jobWithSSCL
  const expectedMargin = custWithSSCL > 0 ? (expectedProfit / custWithSSCL) * 100 : 0

  const restoreSnapshot = (snap: any) => {
    setDocNo(snap.docNo || 'FO/PD/02')
    setIssueNo(snap.issueNo || '01')
    setIssueDate(snap.issueDate || 'March 04, 2026')
    setQuoDate(snap.quoDate || new Date().toISOString().split('T')[0])
    setVatNo(snap.vatNo !== undefined ? snap.vatNo : (lead?.vat || ''))
    const savedTin = snap.tinNo !== undefined ? snap.tinNo : (lead?.tin || lead?.brNumber || '');
    setTinNo((lead?.svat && savedTin === lead.svat) ? '' : savedTin)
    setQuotationNo(snap.quotationNo || '')
    setJobQty(snap.jobQty || '1')
    setAttention(snap.attention || '')
    setSubject(snap.subject || 'To machining parts as per given sample')
    if (snap.customerName) setCustomerName(snap.customerName)
    if (snap.customerAddress || snap.address) setCustomerAddress(snap.customerAddress || snap.address)
    setTaxEnabled(snap.taxEnabled ?? true)
    setSelectedProfileId(snap.selectedProfileId || 'tp_opt2_sscl_absorbed_vat_sep')
    setJobItems(snap.jobItems || [])
    setAttachments(snap.attachments || [])
    
    if (snap.boms) {
      setBoms(snap.boms)
    } else if (snap.autoMats || snap.manualMats || snap.procState) {
      setBoms([{
        id: Date.now(),
        title: 'BOM 1',
        collapsed: false,
        autoMats: snap.autoMats || [],
        manualMats: snap.manualMats || [],
        procState: snap.procState || initProcState()
      }])
    } else {
      setBoms([])
    }
    
    setCustItems(snap.custItems || [])
    setCustTerms(snap.custTerms || snap.terms || snap.paymentTerms || '')
    setCustValidity(snap.custValidity || snap.validity || '30 Days')
    setCustDelivery(snap.custDelivery || snap.delivery || snap.deliveryTerms || '')
    if (snap.selectedTermsPresetId) setSelectedTermsPresetId(snap.selectedTermsPresetId);
    if (snap.bankDetailId !== undefined) setBankDetailId(snap.bankDetailId);
    else if (snap.bankDetails === 'none') setBankDetailId('none');
    setCustDiscount(snap.custDiscount !== undefined ? snap.custDiscount : 0)
    setCustDiscountType(snap.custDiscountType || 'percent')
    setCustDiscountAmount(snap.custDiscountAmount !== undefined ? snap.custDiscountAmount : (snap.custTotals?.discount !== undefined ? snap.custTotals.discount : 0))
    setLinkedProductQuoteNo(snap.linkedProductQuoteNo || snap.linkedQuoteNo || '');
    setLinkedProductQuoteId(snap.linkedProductQuoteId || snap.linkedQuoteId || '');
  }


  // --- Auto Save Draft (DB) ---
  useEffect(() => {
    draftIdRef.current = draftId;
    currentIdRef.current = currentId;
  }, [draftId, currentId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Don't save locked quotation or empty state
      if (isApprovedLocked) return;
      if (!selectedLeadId) return; // Only auto-save if a customer is explicitly selected 
      if (currentIdRef.current) return; // If we are editing an active version, don't auto-save as draft
      if (quoteIdParam && !initialLoadedRef.current) return; // Wait until quote is fully loaded from URL
      if (isAutoSavingRef.current) return; // Mutex: prevent duplicate concurrent auto-saves
      
      isAutoSavingRef.current = true;
      setSaveStatus('saving');
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
        linkedProductQuoteNo: linkedProductQuoteNo || null,
        linkedProductQuoteId: linkedProductQuoteId || null,
        linkedQuoteNo: linkedProductQuoteNo || null,
        linkedQuoteId: linkedProductQuoteId || null,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery,
        custDiscount: custDiscountType === 'percent' ? custDiscount : (custSubtotal > 0 ? Number(((custDiscountAmt / custSubtotal) * 100).toFixed(2)) : 0),
        custDiscountType,
        custDiscountAmount: custDiscountType === 'amount' ? custDiscountAmount : Number(custDiscountAmt.toFixed(2)),
        selectedTermsPresetId,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        selectedProfile, custSscl, custVat, jobSscl, jobVat,
        customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
        createdBy: user?.id || user?.username || '',
        createdByName: user?.name || user?.username || '',
        createdByUsername: user?.username || ''
      }
      
      const sub = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
      const dis = custDiscountType === 'amount'
        ? Math.min(sub, Math.max(0, Number(custDiscountAmount) || 0))
        : sub * (Math.max(0, Number(custDiscount) || 0) / 100);
      const am = sub - dis;
      
      try {
        if (!draftIdRef.current) {
          const pregenDraftId = `QT-DRAFT-${Date.now().toString().slice(-6)}`;
          draftIdRef.current = pregenDraftId;
          setDraftId(pregenDraftId);
          const curLead = selectedLeadId || 'WALK-IN';
          window.history.replaceState(null, '', `/crm/quotations/new/${curLead}?quoteId=${pregenDraftId}`);

          const res = await createQuotation({
            id: pregenDraftId,
            quotationNo: quotationNo || null,
            leadId: selectedLeadId || 'WALK-IN', type: 'draft', data: snapshot,
            totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate
          });
          if (res.success && res.quotation?.id) {
             setDraftId(res.quotation.id);
             draftIdRef.current = res.quotation.id;
          }
        } else {
          await updateQuotation(draftIdRef.current, {
            leadId: selectedLeadId || 'WALK-IN',
            type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate,
            quotationNo: quotationNo || null
          });
        }
        setSaveStatus('saved');
        setTimeout(() => {
           setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } catch (err) {
        setSaveStatus('idle');
      } finally {
        isAutoSavingRef.current = false;
      }
    }, 2500)
    
    return () => clearTimeout(timer)
  }, [
    selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
    taxEnabled, selectedProfileId, boms, custItems, custTerms, custValidity, custDelivery, custDiscount, custDiscountType, custDiscountAmount
  ])


  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showMarginModal, setShowMarginModal] = useState(false)
  const [marginPctInput, setMarginPctInput] = useState('35')
  const [marginAmtInput, setMarginAmtInput] = useState('')
  const [lastEditedMargin, setLastEditedMargin] = useState<'percent' | 'amount'>('percent')

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Calculate valid BOMs with non-zero costing
  const validBomsForQuote = useMemo(() => {
    return boms.filter(b => {
      const autoMatTotal = b.autoMats.reduce((s: number, m: any) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0);
      const manualMatTotal = b.manualMats.reduce((s: number, m: any) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0);
      let machCost = 0;
      if (b.procState) {
        machCost = Object.values(b.procState).reduce((s: number, p: any) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0);
      }
      return (autoMatTotal + manualMatTotal + machCost) > 0;
    });
  }, [boms]);

  const totalValidBomCost = useMemo(() => {
    return validBomsForQuote.reduce((sum, b) => {
      const autoMatTotal = b.autoMats.reduce((s: number, m: any) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0);
      const manualMatTotal = b.manualMats.reduce((s: number, m: any) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0);
      let machCost = 0;
      if (b.procState) {
        machCost = Object.values(b.procState).reduce((s: number, p: any) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0);
      }
      return sum + (autoMatTotal + manualMatTotal + machCost);
    }, 0);
  }, [validBomsForQuote]);

  // Synchronized bidirectional handlers:
  const handleMarginPctChange = (val: string) => {
    setMarginPctInput(val);
    setLastEditedMargin('percent');
    const num = Number(val);
    if (!isNaN(num) && totalValidBomCost > 0 && val.trim() !== '') {
      setMarginAmtInput(Math.round(totalValidBomCost * (num / 100)).toString());
    } else if (val.trim() === '') {
      setMarginAmtInput('');
    }
  };

  const handleMarginAmtChange = (val: string) => {
    setMarginAmtInput(val);
    setLastEditedMargin('amount');
    const num = Number(val);
    if (!isNaN(num) && totalValidBomCost > 0 && val.trim() !== '') {
      setMarginPctInput(((num / totalValidBomCost) * 100).toFixed(1));
    } else if (val.trim() === '') {
      setMarginPctInput('');
    }
  };

  const autoGenerateCustomerQuote = async () => {
    const pct = Number(marginPctInput);
    const amt = Number(marginAmtInput);

    if (lastEditedMargin === 'percent') {
      if (isNaN(pct) || pct < 0) {
        showToast('error', 'Please enter a valid margin percentage!');
        return;
      }
    } else {
      if (isNaN(amt) || amt < 0) {
        showToast('error', 'Please enter a valid fixed profit amount in Rs.!');
        return;
      }
    }

    if (validBomsForQuote.length === 0) {
      showToast('error', 'No BOMs have cost > 0 to generate a quote.');
      return;
    }

    const profitVal = lastEditedMargin === 'amount' && !isNaN(amt) && amt >= 0
      ? amt 
      : (totalValidBomCost * ((Number(marginPctInput) || 0) / 100));

    setIsGeneratingQuote(true);
    try {
      const newCustItems = await Promise.all(validBomsForQuote.map(async (b, idx) => {
        const autoMatTotal = b.autoMats.reduce((s: number, m: any) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0);
        const manualMatTotal = b.manualMats.reduce((s: number, m: any) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0);
        let machCost = 0;
        if (b.procState) {
          machCost = Object.values(b.procState).reduce((s: number, p: any) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0);
        }
        
        const cost = autoMatTotal + manualMatTotal + machCost;
        // Distribute fixed profit proportionally across BOMs based on their cost ratio
        const itemProfit = totalValidBomCost > 0 
          ? (cost / totalValidBomCost) * profitVal 
          : (profitVal / validBomsForQuote.length);
        const targetTotal = cost + itemProfit;

        // Clean customer-facing baseline description (strictly avoiding internal machining/materials)
        let finalDesc = b.title.startsWith('BOM Part ') 
            ? 'Custom Precision Component' 
            : `Fabrication and Supply of ${b.title}`;
            
        if (b.description && !b.description.toLowerCase().includes('turning') && !b.description.toLowerCase().includes('milling') && !b.description.toLowerCase().includes('plate') && !b.description.toLowerCase().includes('rod')) {
            finalDesc += `\n${b.description}`;
        }

        if (useAiPolish) {
          try {
            const dimensions = b.autoMats?.map((m: any) => m.dia ? `Dia ${m.dia} x L ${m.length}` : (m.length && m.width ? `${m.length}x${m.width}x${m.thick}mm` : '')).filter(Boolean).join(', ');

            // Customer quotation description: strictly no internal operations or raw materials passed
            const aiDesc = await generateQuotationDescription({
              partTitle: b.title,
              rawDescription: b.description || finalDesc,
              dimensions,
              customerName: customerName || lead?.company || lead?.name || '',
              quantity: jobQty || 1
            });
            if (aiDesc) {
              finalDesc = aiDesc;
            }
          } catch (e) {
            console.warn('AI Polish fallback to standard desc:', e);
          }
        }

        return {
          id: Date.now() + idx,
          desc: finalDesc,
          qty: 1,
          unitPrice: Math.round(targetTotal),
          note: ''
        };
      }));

      setCustItems(newCustItems);
      setShowMarginModal(false);
      const effectivePct = totalValidBomCost > 0 ? ((profitVal / totalValidBomCost) * 100).toFixed(1) : '0';
      showToast('success', `✨ Generated ${newCustItems.length} quote item(s) with Rs. ${Math.round(profitVal).toLocaleString()} (${effectivePct}%) profit${useAiPolish ? ' and AI descriptions' : ''}!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed generating quote');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const handleAiPolishItem = async (itemId: number) => {
    const item = custItems.find(i => i.id === itemId);
    if (!item) return;

    const matchingBom = boms.find(b => 
      (b.title && item.desc.toLowerCase().includes(b.title.toLowerCase())) ||
      (b.description && item.desc.toLowerCase().includes(b.description.toLowerCase()))
    ) || boms[0];

    const dimensions = matchingBom?.autoMats?.map((m: any) => m.dia ? `Dia ${m.dia} x L ${m.length}` : (m.length && m.width ? `${m.length}x${m.width}x${m.thick}mm` : '')).filter(Boolean).join(', ');

    setPolishingItemId(itemId);
    try {
      showToast('success', '✨ Enhancing description with Groq Llama 3.3...');
      const enrichedDesc = await generateQuotationDescription({
        partTitle: matchingBom?.title || item.desc.split('\n')[0] || 'Precision Component',
        rawDescription: item.desc,
        dimensions,
        customerName: customerName || lead?.company || lead?.name || '',
        quantity: item.qty || 1
      });

      if (enrichedDesc) {
        updateCustItem(itemId, 'desc', enrichedDesc);
        showToast('success', '✨ Description enhanced with Groq AI!');
      }
    } catch (err: any) {
      showToast('error', err.message || 'AI generation failed');
    } finally {
      setPolishingItemId(null);
    }
  };

  const handleAiPolishAll = async () => {
    if (custItems.length === 0) {
      showToast('error', 'No quotation line items to polish.');
      return;
    }

    setIsPolishingAll(true);
    showToast('success', '✨ Polishing all quotation descriptions with Groq AI...');
    try {
      const updated = await Promise.all(custItems.map(async (item, idx) => {
        const matchingBom = boms[idx] || boms.find(b => 
          (b.title && item.desc.toLowerCase().includes(b.title.toLowerCase()))
        );

        const dimensions = matchingBom?.autoMats?.map((m: any) => m.dia ? `Dia ${m.dia} x L ${m.length}` : (m.length && m.width ? `${m.length}x${m.width}x${m.thick}mm` : '')).filter(Boolean).join(', ');

        try {
          const enriched = await generateQuotationDescription({
            partTitle: matchingBom?.title || item.desc.split('\n')[0] || `Precision Engineering Item ${idx + 1}`,
            rawDescription: item.desc,
            dimensions,
            customerName: customerName || lead?.company || lead?.name || '',
            quantity: item.qty || 1
          });
          return { ...item, desc: enriched || item.desc };
        } catch {
          return item;
        }
      }));

      setCustItems(updated);
      showToast('success', `✨ Successfully polished ${updated.length} line items with Groq AI!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed polishing descriptions');
    } finally {
      setIsPolishingAll(false);
    }
  };

  const handleOpenMarginModal = () => {
    if (jobItems.length === 0 || (!jobItems[0].text && jobItems.length === 1)) {
      showToast('error', 'Please fill out Job Scope / Descriptions first!');
      return;
    }
    if ((totalMaterialCost + totalMachiningCost) === 0) {
       showToast('error', 'Please complete the Job Costing (Material/Machining) first to generate a price!');
       return;
    }
    const initialPct = Number(marginPctInput) || 35;
    if (totalValidBomCost > 0) {
      setMarginAmtInput(Math.round(totalValidBomCost * (initialPct / 100)).toString());
    }
    setShowMarginModal(true);
  };

  const handleSave = async () => {
    if (isApprovedLocked) {
      showToast('error', `Quotation is currently "${currentQuote?.status}" and locked. Please request an edit approval before saving changes.`);
      return;
    }
    if (!selectedLeadId) {
       showToast('error', 'Please select a Customer from the dropdown!');
       return;
    }
    
    setIsSaving(true)
    try {
      const bomsWithTotals = boms.map(b => {
         const autoMatTotal = b.autoMats.reduce((s, m) => s + Number(m.platePrice) + Number(m.shaftPrice), 0)
         const manualMatTotal = b.manualMats.reduce((s, m) => s + Number(m.qty) * Number(m.unitPrice), 0)
         const machCost = b.procState ? Object.values(b.procState).reduce((s, p) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0) : 0
         return {
           ...b,
           bomTotal: autoMatTotal + manualMatTotal + machCost
         }
      })
        
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
        boms: bomsWithTotals,
        custItems, custTerms, custValidity, custDelivery,
        custDiscount: custDiscountType === 'percent' ? custDiscount : (custSubtotal > 0 ? Number(((custDiscountAmt / custSubtotal) * 100).toFixed(2)) : 0),
        custDiscountType,
        custDiscountAmount: custDiscountType === 'amount' ? custDiscountAmount : Number(custDiscountAmt.toFixed(2)),
        selectedTermsPresetId,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        taxEnabled, selectedProfileId, selectedProfile, custSscl, custVat, jobSscl, jobVat,
        customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
        createdBy: user?.id || user?.username || '',
        createdByName: user?.name || user?.username || '',
        createdByUsername: user?.username || ''
      }

      const amount = custWithSSCL

      let result;
      if (currentId) {
        result = await updateQuotation(currentId, {
          leadId: selectedLeadId || 'WALK-IN', type: 'main', data: snapshot,
          totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate,
          quotationNo: quotationNo || null,
          draftId: draftIdRef.current || undefined,
          createdBy: user?.id || user?.username || '',
          createdByName: user?.name || user?.username || ''
        });
        if (result.success) {
          if (draftIdRef.current && draftIdRef.current !== currentId) {
            try { await deleteQuotation(draftIdRef.current); } catch (e) {}
            setDraftId(null);
            draftIdRef.current = null;
          }
          showToast('success', 'Quotation updated successfully!');
          await loadVersions();
        } else {
          showToast('error', result.error || 'Update failed');
        }
      } else {
        result = await createQuotation({
          draftId: draftIdRef.current || undefined,
          quotationNo: quotationNo || null,
          leadId: selectedLeadId || 'WALK-IN', type: 'main', data: snapshot,
          totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate,
          createdBy: user?.id || user?.username || '',
          createdByName: user?.name || user?.username || ''
        });
        if (result.success) {
          const newId = result.quotation?.id || null;
          setCurrentId(newId);
          currentIdRef.current = newId;
          if (draftIdRef.current && draftIdRef.current !== newId) {
            try { await deleteQuotation(draftIdRef.current); } catch (e) {}
            setDraftId(null);
            draftIdRef.current = null;
          }
          if (newId && leadId) {
            navigate(`/crm/quotations/new/${leadId}?quoteId=${newId}`, { replace: true });
          }
          showToast('success', `Quotation v${result.quotation?.version || ''} saved!`);
          await loadVersions();
        } else {
          showToast('error', result.error || 'Save failed');
        }
      }
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadVersion = (v: any) => {
    try {
      const snap = typeof v.data === 'string' ? JSON.parse(v.data) : v.data
      restoreSnapshot(snap)
      setCurrentId(v.id)
      setShowHistory(false)
      showToast('success', `Loaded v${v.version}`)
    } catch {
      showToast('error', 'Failed to load version')
    }
  }

  const handleDeleteVersion = async (v: any) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Version v${v.version} of this quotation? This action cannot be undone.`,
      'Delete Quotation Version',
      { confirmLabel: 'Delete Version' }
    );
    if (!ok) return;

    try {
      await deleteQuotation(v.id);
      showToast('success', `Version v${v.version} deleted successfully`);
      if (currentId === v.id || draftId === v.id) {
        setCurrentId(null);
        setDraftId(null);
        draftIdRef.current = null;
        currentIdRef.current = null;
      }
      await loadVersions();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete quotation version');
    }
  };

  const [showPreview, setShowPreview] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  const handleApplyTemplate = (tpl: QuotationTemplate, mode: 'replace' | 'append') => {
    const snap = tpl.data || {}

    if (tpl.subject || snap.subject) setSubject(tpl.subject || snap.subject)
    if (tpl.terms || snap.custTerms) setCustTerms(tpl.terms || snap.custTerms)
    if (tpl.validity || snap.custValidity) setCustValidity(tpl.validity || snap.custValidity)
    if (tpl.delivery || snap.custDelivery) setCustDelivery(tpl.delivery || snap.custDelivery)
    if (tpl.taxProfileId || snap.selectedProfileId) setSelectedProfileId(tpl.taxProfileId || snap.selectedProfileId)
    if (snap.taxEnabled !== undefined) setTaxEnabled(snap.taxEnabled)
    if (snap.jobQty) setJobQty(snap.jobQty)
    if (snap.custDiscount !== undefined) setCustDiscount(snap.custDiscount)
    if (snap.custDiscountType) setCustDiscountType(snap.custDiscountType)
    if (snap.custDiscountAmount !== undefined) setCustDiscountAmount(snap.custDiscountAmount)

    // Restore full BOMs if available
    const bomsToRestore = (snap.boms && snap.boms.length > 0) ? snap.boms : (tpl.boms && tpl.boms.length > 0 ? tpl.boms : null)
    if (bomsToRestore) {
      if (mode === 'replace') {
        setBoms(bomsToRestore)
      } else {
        setBoms(prev => [
          ...prev, 
          ...bomsToRestore.map((b: any, idx: number) => ({ ...b, id: Date.now() + idx, title: `${b.title || 'BOM'} (Template)` }))
        ])
      }
    }

    // Restore customer items
    const rawItems = (snap.custItems && snap.custItems.length > 0) ? snap.custItems : (tpl.items || [])
    if (rawItems && rawItems.length > 0) {
      const formattedItems = rawItems.map((it: any, idx: number) => ({
        id: Date.now() + idx,
        desc: it.desc || '',
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        note: it.note || ''
      }))

      if (mode === 'replace') {
        setCustItems(formattedItems)
      } else {
        setCustItems(prev => [
          ...prev.filter(i => i.desc.trim() !== ''),
          ...formattedItems
        ])
      }
    }

    // If we're creating a quotation from this template, clear quoteId and quotationNo so it's a fresh quote!
    if (!isTemplateMode) {
      setCurrentId(null)
      setDraftId(null)
      setQuotationNo('')
    }

    showToast('success', `Applied template: ${tpl.name}`)
  }

  const handleSaveAsTemplate = async () => {
    if (!templateSaveName.trim()) {
      showToast('error', 'Please enter a template name.')
      return
    }

    setIsSavingTemplate(true)
    try {
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, jobQty, subject,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery,
        custDiscount: custDiscountType === 'percent' ? custDiscount : (custSubtotal > 0 ? Number(((custDiscountAmt / custSubtotal) * 100).toFixed(2)) : 0),
        custDiscountType,
        custDiscountAmount: custDiscountType === 'amount' ? custDiscountAmount : Number(custDiscountAmt.toFixed(2)),
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        selectedProfile, custSscl, custVat, jobSscl, jobVat
      }

      const payload = {
        name: templateSaveName.trim(),
        description: templateSaveDesc.trim(),
        subject: subject.trim(),
        validity: custValidity.trim(),
        delivery: custDelivery.trim(),
        terms: custTerms.trim(),
        taxProfileId: selectedProfileId || null,
        items: custItems.filter(i => i.desc.trim() !== ''),
        boms,
        data: snapshot
      }

      if (editTemplateId) {
        const res = await fetch(`http://localhost:3000/api/quotation-templates/${editTemplateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Failed to update template')
        showToast('success', `Template "${templateSaveName}" updated successfully!`)
      } else {
        const res = await fetch('http://localhost:3000/api/quotation-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('Failed to create template')
        showToast('success', `Quotation saved as template: "${templateSaveName}"! You can now use it for any customer.`)
      }

      setShowSaveAsTemplateModal(false)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const templateLoadedRef = useRef(false)

  useEffect(() => {
    const tplId = editTemplateId || templateIdParam
    if (tplId && !templateLoadedRef.current) {
      templateLoadedRef.current = true
      fetch(`http://localhost:3000/api/quotation-templates/${tplId}`)
        .then(r => r.json())
        .then((tpl: QuotationTemplate) => {
          if (tpl) {
            handleApplyTemplate(tpl, 'replace')
            if (editTemplateId) {
              setTemplateSaveName(tpl.name || '')
              setTemplateSaveDesc(tpl.description || '')
            }
          }
        })
        .catch(console.error)
    }
  }, [editTemplateId, templateIdParam])

  if (loading) return <div className="p-8 text-center animate-pulse text-muted">Loading...</div>
  if (leadId && !lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>

  const mainVersions = savedVersions.filter(v => v.type === 'main')

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/quotations')} className="p-2 hover:bg-surface2 rounded-md transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-lg font-black text-primary tracking-tight">
                 {isTemplateMode ? 'Quotation Template Builder' : 'Quotation Builder'}
               </h1>
               {isTemplateMode && (
                 <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                   {editTemplateId ? 'Edit Template' : 'Template Mode'}
                 </span>
               )}
               {!isTemplateMode && saveStatus !== 'idle' && (
                 <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${saveStatus === 'saving' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                   {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved to Drafts'}
                 </span>
               )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {isTemplateMode 
                ? (templateSaveName ? `Template: ${templateSaveName}` : 'Reusable Template (BOMs, operations, materials & pricing)')
                : (lead?.company || customerName || lead?.name || 'Walk-in Customer')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Browse Quotation Templates"
          >
            <Bookmark size={14} className="text-rex-500" /> Templates
          </button>
          
          <button onClick={() => {
              setTemplateSaveName(templateSaveName || subject || '');
              setShowSaveAsTemplateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
            title="Save this entire quotation (BOMs, machining, materials, pricing) as a reusable template"
          >
            <Bookmark size={14} /> {isTemplateMode && editTemplateId ? 'Update Template' : 'Save as Template'}
          </button>

          <button onClick={() => setShowHistory(p => !p)}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ' + 
            (showHistory ? 'bg-surface2 border-rex-500/50 text-primary' : 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2')}
          >
            <History size={14} /> History {showHistory ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          <button onClick={() => setPreviewCollapsed(p => !p)}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ' + 
            (previewCollapsed ? 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2' : 'bg-surface2 border-theme-subtle text-muted hover:text-primary')}
            title={previewCollapsed ? 'Expand Side Panel Live Preview' : 'Collapse Side Panel Live Preview'}
          >
            <Sidebar size={14} /> {previewCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          </button>
          <button 
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 border border-rex-500/50 bg-rex-500/10 text-rex-600 dark:text-rex-400 hover:bg-rex-500/20 transition-colors shadow-xs cursor-pointer"
            title="Preview Full Quotation Document"
          >
            <Eye size={14} className="text-rex-600 dark:text-rex-400" /> Preview Document
          </button>

          {/* Approval Workflow Actions */}
          {!isTemplateMode && currentQuote && (
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-theme-subtle">
              {(currentQuote.type === 'draft' || !currentId) ? (
                <span className="text-xs text-muted font-medium px-2 py-1 bg-surface2 border border-theme-subtle rounded">
                  Draft Mode
                </span>
              ) : currentQuote.status === 'Approved' ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    <CheckCircle2 size={14} /> Approved {currentQuote.approvedBy ? `(${currentQuote.approvedBy})` : ''}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Lock}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold"
                    onClick={() => {
                      setEditReasonInput('');
                      setShowRequestEditModal(true);
                    }}
                    title="Request manager approval to edit this approved quotation"
                  >
                    Request Edit Approval
                  </Button>
                  {canApprove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Unlock}
                      className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30 font-bold"
                      onClick={async () => {
                        if (window.confirm('Unlock this quotation for editing? Its status will be reset to Draft.')) {
                          try {
                            await approveQuotationEdit(currentQuote.id, user?.name || 'Manager', 'Quotation unlocked by manager');
                            showToast('success', 'Quotation unlocked! Status reset to Draft for editing.');
                            await loadVersions();
                          } catch (err: any) {
                            showToast('error', err?.message || 'Failed to unlock quotation');
                          }
                        }
                      }}
                      title="Directly unlock this quotation for editing"
                    >
                      Unlock to Edit
                    </Button>
                  )}
                </div>
              ) : currentQuote.status === 'Pending Edit Approval' ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-xs font-bold" title={currentQuote.rejectionReason}>
                    <Clock size={14} /> Edit Approval Requested
                  </span>
                  {canApprove ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white border-none shadow-xs font-bold"
                        onClick={async () => {
                          try {
                            await approveQuotationEdit(currentQuote.id, user?.name || 'Manager', 'Edit request approved');
                            showToast('success', 'Edit request approved! Quotation is now in Draft mode for editing.');
                            await loadVersions();
                          } catch(err: any) {
                            showToast('error', err?.message || 'Failed to approve edit request');
                          }
                        }}
                      >
                        Approve Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={XCircle}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30"
                        onClick={async () => {
                          try {
                            await rejectQuotationEdit(currentQuote.id, user?.name || 'Manager', 'Edit request denied');
                            showToast('success', 'Edit request denied. Quotation remains Approved.');
                            await loadVersions();
                          } catch(err: any) {
                            showToast('error', err?.message || 'Failed to deny edit request');
                          }
                        }}
                      >
                        Deny Edit
                      </Button>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted italic">Awaiting Manager Review</span>
                  )}
                </div>
              ) : currentQuote.status === 'Pending Approval' ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                    <Clock size={14} /> Pending Approval
                  </span>
                  {canApprove ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-xs font-bold"
                        onClick={async () => {
                          try {
                            await approveQuotation(currentQuote.id, user?.name || 'Manager');
                            showToast('success', 'Quotation approved successfully!');
                            await loadVersions();
                          } catch(err: any) {
                            showToast('error', err?.message || 'Failed to approve');
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={XCircle}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30"
                        onClick={() => {
                          setRejectReasonInput('');
                          setRejectModalOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted italic">Awaiting Manager Approval</span>
                  )}
                </div>
              ) : currentQuote.status === 'Rejected' ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold" title={currentQuote.rejectionReason}>
                    <XCircle size={14} /> Rejected {currentQuote.rejectionReason ? `(${currentQuote.rejectionReason})` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs bg-surface border border-theme-subtle"
                    onClick={async () => {
                      try {
                        await submitQuotationForApproval(currentQuote.id);
                        showToast('success', 'Resubmitted for approval');
                        await loadVersions();
                      } catch(err: any) {
                        showToast('error', err?.message || 'Failed to resubmit');
                      }
                    }}
                  >
                    Resubmit
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Send}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold"
                    onClick={async () => {
                      try {
                        await submitQuotationForApproval(currentQuote.id);
                        showToast('success', 'Quotation submitted for approval!');
                        await loadVersions();
                      } catch(err: any) {
                        showToast('error', err?.message || 'Failed to submit');
                      }
                    }}
                  >
                    Submit for Approval
                  </Button>
                  {canApprove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={CheckCircle2}
                      className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold"
                      onClick={async () => {
                        try {
                          await approveQuotation(currentQuote.id, user?.name || 'Manager');
                          showToast('success', 'Quotation approved directly!');
                          await loadVersions();
                        } catch(err: any) {
                          showToast('error', err?.message || 'Failed to approve');
                        }
                      }}
                    >
                      Quick Approve
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!isTemplateMode ? (
            <Button 
              variant="primary" 
              icon={isApprovedLocked ? Lock : Save} 
              onClick={() => handleSave()} 
              disabled={isSaving || isApprovedLocked} 
              className={`text-xs ${isApprovedLocked ? 'opacity-60 cursor-not-allowed bg-slate-600 border-none' : ''}`}
              title={isApprovedLocked ? 'Quotation is locked. Request edit approval from management to make changes.' : 'Save Quotation'}
            >
              {isSaving ? 'Saving...' : isApprovedLocked ? 'Locked (Approved)' : 'Save Quotation'}
            </Button>
          ) : (
            <Button variant="primary" icon={Save} onClick={() => {
              setTemplateSaveName(templateSaveName || subject || '');
              setShowSaveAsTemplateModal(true);
            }} className="text-xs bg-purple-600 hover:bg-purple-500 text-white border-none shadow-xs">
              {editTemplateId ? 'Update Template' : 'Save Template'}
            </Button>
          )}
        </div>
      </div>

      {/* LOCKED BANNER */}
      {isApprovedLocked && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
            <Lock size={15} className="shrink-0" />
            <span>
              <strong>Quotation is {currentQuote?.status} & Locked:</strong> Direct editing is disabled.
              {currentQuote?.status === 'Pending Edit Approval' 
                ? ` Edit request (${currentQuote?.rejectionReason || 'Under Review'}) is awaiting manager approval.` 
                : ' To modify this quotation, request edit approval from management.'}
            </span>
          </div>
          {currentQuote?.status === 'Approved' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditReasonInput('');
                setShowRequestEditModal(true);
              }}
              className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold rounded-none h-6 px-2.5"
            >
              Request Edit Approval
            </Button>
          )}
        </div>
      )}

      {/* TOASTS */}
      {toast && (
        <div className={'absolute top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-white text-sm font-semibold ' + (toast.type === 'success' ? 'bg-green-500' : 'bg-red-500')}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* HISTORY PANEL */}
      {showHistory && (
        <div className="border-b border-theme-subtle bg-surface/40 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Quotation History</span>
            <span className="text-[10px] text-muted">({mainVersions.length} saved)</span>
          </div>
          {mainVersions.length === 0 ? (
            <p className="text-xs text-muted italic">No saved versions yet.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {mainVersions.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-surface border border-theme-subtle/40 rounded-xl px-3 py-2 text-xs">
                  <div>
                    <div className="font-bold text-primary capitalize">
                      v{v.version}
                      {v.id === currentId && <span className="ml-1.5 text-[9px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full font-mono">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] text-muted">
                      {v.date ? String(v.date).slice(0,10) : ''} · {formatCurrency(v.totalAmount || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleLoadVersion(v)}
                      className="flex items-center gap-1 px-2 py-1 bg-rex-500/10 text-rex-500 rounded-lg hover:bg-rex-500/20 transition-colors text-[11px] font-semibold">
                      <RotateCcw size={11} /> Load
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteVersion(v)}
                        className="p-1 text-muted/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={`Delete Version v${v.version}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN SPLIT AREA */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: BUILDER CANVAS */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-surface/20">

        {/* Section 1: Document Details */}
        <GlassCard className="border border-theme-subtle/40/40 overflow-visible">
          <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle/10 bg-surface/30">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-muted" />
              <h2 className="text-[11px] font-medium text-secondary">Document Details</h2>
            </div>
            {selectedLeadId && (
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Customer Linked
                </span>
                {leadGrns.length > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20" title={leadGrns.map((g: any) => g.items).join(', ')}>
                    <Package size={12} className="text-blue-500" />
                    {leadGrns.length} Sample(s) Received
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="p-5">
            {isTemplateMode && (
              <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Bookmark size={16} className="text-purple-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-300">Template Blueprint Mode</span>
                    <p className="text-[10px] text-muted">Customer details are omitted in templates. Configure default BOMs, operations, materials, and pricing below.</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setSearchParams({});
                    showToast('success', 'Switched to Quotation mode! Select a customer below to create a quotation.');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-rex-600 dark:text-rex-400 border border-rex-500/30 rounded-lg hover:bg-rex-500/10 shrink-0 transition-colors"
                >
                  Create Quote with This
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-[11px] font-bold text-muted uppercase">Select Type:</label>
                      <div className="inline-flex rounded-lg bg-surface2/60 p-0.5 border border-theme-subtle">
                        <button
                          type="button"
                          onClick={() => {
                            setClientType('customer');
                            setCustomerName('');
                            setSelectedLeadId(null);
                          }}
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                            clientType === 'customer' 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          <Building2 size={12} /> Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setClientType('lead');
                            setCustomerName('');
                            setSelectedLeadId(null);
                          }}
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                            clientType === 'lead' 
                              ? 'bg-purple-600 text-white shadow-sm' 
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          <UserCheck size={12} /> Lead
                        </button>
                      </div>
                    </div>

                    {clientType === 'customer' && (
                      <button type="button" onClick={() => setShowAddCustomer(true)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 hover:bg-blue-500/10 transition-colors">
                        <Plus size={10} /> Add New Customer
                      </button>
                    )}
                  </div>

                  <LeadSearchInput
                    clientType={clientType}
                    value={customerName}
                    onChange={setCustomerName}
                    onSelect={handleSelectLeadOrCustomer}
                    items={clientType === 'customer' ? (customers || []) : (leads || [])}
                    className={docInputClass + " " + (selectedLeadId ? (clientType === 'customer' ? "border-blue-500/40" : "border-purple-500/40") : "")}
                  />

                  {clientType === 'lead' && selectedLead?.description && (
                    <div className="mt-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs">
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <FileText size={11} /> Lead Requirement / Description:
                      </p>
                      <p className="text-secondary leading-relaxed text-[11px]">{selectedLead.description}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Subject / Re: <span className="text-red-400">*</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Supply and fabrication of..." className={docInputClass} />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Company / Customer Address</label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="e.g. No. 128, Panchikawatta Road,&#10;Colombo 10"
                    className={docInputClass + " resize-none"}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Customer VAT No.</label>
                  <input
                    type="text"
                    value={vatNo || tinNo}
                    onChange={e => {
                      setVatNo(e.target.value)
                      setTinNo(e.target.value)
                    }}
                    placeholder="e.g. 104106470-7000"
                    className={docInputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] text-muted">Attention To</label>
                      {availableContacts.length > 0 && (
                        <span className="text-[10px] text-muted">
                          {availableContacts.length} contact{availableContacts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={`${docInputClass} pr-7`} />
                      {availableContacts.length > 0 && (
                        <>
                          <select 
                            className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
                            onChange={e => e.target.value && setAttention(e.target.value)}
                            title="Select from contacts"
                            value=""
                          >
                            <option value="">(Select Contact)</option>
                            {availableContacts.map((c, i) => (
                              <option key={i} value={c.name}>
                                {c.name} {c.designation ? `(${c.designation})` : (c.roleTag ? `(${c.roleTag})` : '')}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted border-l border-theme-subtle pl-1.5 flex items-center justify-center">
                            <ChevronDown size={14} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Clickable Contact Chips */}
                    {availableContacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {availableContacts.map((c, i) => {
                          const isSelected = attention.toLowerCase().includes(c.name.toLowerCase());
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setAttention(c.name)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                isSelected 
                                  ? 'bg-blue-600/15 border-blue-500 text-blue-500 font-bold shadow-sm' 
                                  : 'bg-surface border-theme-subtle/70 text-secondary hover:border-primary/50 hover:text-primary'
                              }`}
                              title={`Click to set Attn: ${c.name}${c.designation ? ` (${c.designation})` : ''}${c.phone ? ` • ${c.phone}` : ''}`}
                            >
                              <span>{c.name}</span>
                              {c.designation ? (
                                <span className="opacity-70 text-[9px]">({c.designation})</span>
                              ) : c.roleTag ? (
                                <span className="opacity-60 text-[9px]">({c.roleTag})</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Terms Preset Selector */}
                  <div className="bg-surface2/60 border border-theme-subtle/60 rounded-xl p-2.5 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                        <FileText size={12} className="text-rex-500" />
                        Terms & Conditions Preset
                      </label>
                      <span className="text-[9px] text-muted">From Settings</span>
                    </div>
                    <select
                      value={selectedTermsPresetId}
                      onChange={e => handleSelectTermsPreset(e.target.value)}
                      className={docInputClass + " bg-surface font-medium text-xs"}
                    >
                      <option value="">-- Choose Preset (Payment, Validity & Delivery) --</option>
                      {termsPresets.map(tp => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name} ({tp.validity}) {tp.isDefault ? '★ (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Payment Terms</label>
                    <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)}
                      placeholder="e.g. 30 days credit" className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Validity</label>
                    <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)}
                      placeholder="e.g. 30 Days" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Delivery Terms</label>
                    <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)}
                      placeholder="e.g. Ex-works" className={docInputClass} />
                  </div>
                </div>

                {/* Bank Account for Remittance */}
                <div className="bg-surface2/60 border border-theme-subtle/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                      <Landmark size={12} className="text-rex-500" />
                      Remittance Bank Account
                    </label>
                    <span className="text-[9px] text-muted">From Settings</span>
                  </div>
                  <select
                    value={bankDetailId}
                    onChange={e => setBankDetailId(e.target.value)}
                    className={docInputClass + " bg-surface font-medium text-xs"}
                  >
                    {bankAccounts.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} — A/C {b.accountNumber} ({b.branchName || 'Main'}{b.isDefault ? ' · Default' : ''})
                      </option>
                    ))}
                    <option value="none">— Do Not Show Bank Details on Quotation —</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Quotation No <span className="text-red-400">*</span></label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)}
                      placeholder="Auto-generated on selection" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Date <span className="text-red-400">*</span></label>
                    <input type="date" value={quoDate} onChange={e => setQuoDate(e.target.value)} className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Validity</label>
                    <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)}
                      placeholder="30 Days" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className={docInputClass}>
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      {currencies?.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-theme-subtle/30">
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Doc No</label>
                    <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)}
                      className={docInputClass + " text-[10px] px-2"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Issue No</label>
                    <input type="text" value={issueNo} onChange={e => setIssueNo(e.target.value)}
                      className={docInputClass + " text-[10px] px-2"} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted/70 mb-1">Created By</label>
                    <input type="text" value={user?.name || ''} disabled
                      className={docInputClass + " text-[10px] px-2 opacity-60"} />
                  </div>
                </div>

                <div className="pt-2 border-t border-theme-subtle/30">
                  <label className="text-[11px] font-medium text-secondary flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                      Link Product Catalog Quote
                    </span>
                    {linkedProductQuoteNo && (
                      <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">Linked</span>
                    )}
                  </label>
                  <select
                    value={linkedProductQuoteNo}
                    onChange={(e) => {
                      const qNo = e.target.value;
                      setLinkedProductQuoteNo(qNo);
                      const found = availableProductQuotes.find((q: any) => q.quotationNo === qNo);
                      setLinkedProductQuoteId(found?.id || '');
                    }}
                    className={docInputClass}
                  >
                    <option value="">-- Standalone (No Product Quote Linked) --</option>
                    {availableProductQuotes.map((q: any) => (
                      <option key={q.id} value={q.quotationNo}>
                        {q.quotationNo} {q.data?.subject ? `(${q.data.subject})` : ''} - LKR {Number(q.totalAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted/70 mt-1">
                    Link this custom quote with a standard product catalog quotation for the same customer.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Scope & Attachments */}
            <div className="mt-6 pt-5 border-t border-theme-subtle/30 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-medium text-secondary">Job Scope / Descriptions</label>
                  <button onClick={addJobItem}
                    className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus size={12} /> Add Scope Item
                  </button>
                </div>
                <div className="space-y-2">
                  {jobItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 items-start group">
                      <span className="text-[11px] text-muted/50 mt-2 select-none w-4 text-right">{idx + 1}.</span>
                      <textarea
                        value={item.text}
                        onChange={e => updateJobItem(item.id, e.target.value)}
                        placeholder="Describe the scope of work..."
                        rows={2}
                        className={docInputClass + " flex-1 resize-y min-h-[50px] leading-relaxed"}
                      />
                      <button onClick={() => removeJobItem(item.id)}
                        className="mt-1 p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {jobItems.length === 0 && (
                    <div className="py-4 text-center text-[11px] text-muted/50 bg-surface2/50 rounded-lg border border-dashed border-theme-subtle/50">
                      No scope items added.
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-medium text-secondary">Attachments</label>
                  <label className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer">
                    <Plus size={12} /> Add File
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {attachments.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {attachments.map(att => (
                      <div key={att.id} className="relative w-16 h-16 border border-theme-subtle/40/50 rounded-lg overflow-hidden group bg-surface2">
                        {att.type.includes('image')
                          ? <img src={att.dataUrl} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-1">
                              <FileText size={16} />
                              <span className="text-[7px] max-w-full truncate px-1">{att.name}</span>
                            </div>
                        }
                        <button type="button"
                          onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-[11px] text-muted/50 bg-surface2/50 rounded-lg border border-dashed border-theme-subtle/50">
                    No attachments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Section 2: BOMs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-secondary flex items-center gap-2">
              <Briefcase size={16} /> Bill of Materials
            </h2>
            <Button variant="primary" size="sm" icon={Plus} onClick={addBOM}>Add BOM Part</Button>
          </div>

          {boms.map((bom, bomIdx) => {
            const autoMatTotal = bom.autoMats.reduce((s, m) => s + Number(m.platePrice) + Number(m.shaftPrice), 0)
            const manualMatTotal = bom.manualMats.reduce((s, m) => s + Number(m.qty) * Number(m.unitPrice), 0)
            let machCost = 0;
            if (bom.procState) {
                machCost = Object.values(bom.procState).reduce((s, p) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0)
            }
            const bomTotal = autoMatTotal + manualMatTotal + machCost;

            return (
            <GlassCard key={bom.id} className="p-0 overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 bg-surface2/50 cursor-pointer border-b border-theme-subtle"
              >
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => updateBOM(bom.id, { collapsed: !bom.collapsed })} className="p-1 hover:bg-surface rounded text-muted hover:text-primary">
                    {bom.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <div className="flex flex-col gap-1 w-full max-w-lg">
                    <input 
                      type="text" 
                      value={bom.title} 
                      onChange={e => updateBOM(bom.id, { title: e.target.value })} 
                      className="bg-transparent font-bold text-primary outline-none focus:border-b focus:border-rex-500 w-full" 
                      onClick={e => e.stopPropagation()}
                      placeholder="BOM Title"
                    />
                    <input 
                      type="text" 
                      value={bom.description || ''} 
                      onChange={e => updateBOM(bom.id, { description: e.target.value })} 
                      className="bg-transparent text-xs text-muted outline-none focus:border-b focus:border-rex-500 w-full" 
                      onClick={e => e.stopPropagation()}
                      placeholder="Optional detailed description..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-bold bg-rex-500/10 text-rex-600 px-3 py-1 rounded-lg">
                    {formatCurrency(bomTotal)}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); removeBOM(bom.id); }} className="text-red-500/60 hover:text-red-500 p-2 rounded transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {!bom.collapsed && (
                <div className="p-5 space-y-5">
                    {/* Plate / Rod Materials */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-5 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-surface border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]" onClick={() => updateBOM(bom.id, { autoCollapsed: !bom.autoCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.autoCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Plate or Rod Sizes (mm)</h3>
                          {bom.autoMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.autoMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addAutoMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.autoCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left min-w-[860px]">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Material</th>
                              <th className="px-3 py-2.5">Width</th>
                              <th className="px-3 py-2.5">Length</th>
                              <th className="px-3 py-2.5">Supplier</th>
                              <th className="px-3 py-2.5">Thick</th>
                              <th className="px-3 py-2.5">Dia Ø</th>
                              <th className="px-3 py-2.5 w-16">Qty</th>
                              <th className="px-3 py-2.5 w-24">Unit Price</th>
                              <th className="px-4 py-2.5 text-right">Plate Rs</th>
                              <th className="px-4 py-2.5 text-right">Shaft Rs</th>
                              <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {bom.autoMats.map((mat, i) => (
                              <tr key={mat.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                                <td className="p-0">
                                  <MatSearchInput
                                    value={mat.material}
                                    onChange={v => updateAutoMat(bom.id, mat.id, 'material', v)}
                                    onSelect={(name, price) => { updateAutoMat(bom.id, mat.id, 'material', name); if (price) updateAutoMat(bom.id, mat.id, 'unitPrice', price) }}
                                    inventory={inventory}
                                    className="w-full min-w-[120px]"
                                  />
                                </td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.width} onChange={e => updateAutoMat(bom.id, mat.id, 'width', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.length} onChange={e => updateAutoMat(bom.id, mat.id, 'length', e.target.value)} /></td>
                                <td className="p-0"><input type="text" className={tableInputClass + " group-hover:bg-transparent"} value={mat.supplier} onChange={e => updateAutoMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.thick} onChange={e => updateAutoMat(bom.id, mat.id, 'thick', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.dia} onChange={e => updateAutoMat(bom.id, mat.id, 'dia', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.qty} onChange={e => updateAutoMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.unitPrice} onChange={e => updateAutoMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.platePrice > 0 ? formatCurrency(mat.platePrice) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.shaftPrice > 0 ? formatCurrency(mat.shaftPrice) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-3 py-2.5 text-center"><button onClick={() => removeAutoMat(bom.id, mat.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                              </tr>
                            ))}
                            {bom.autoMats.length === 0 && (
                              <tr><td colSpan={11} className="py-6 text-center text-[11px] text-muted italic">No plate or rod materials added yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Manual Materials */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-5 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-surface border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]" onClick={() => updateBOM(bom.id, { manualCollapsed: !bom.manualCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.manualCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Manually Calculated Materials</h3>
                          {bom.manualMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.manualMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addManualMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.manualCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left min-w-[640px]">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Material</th>
                              <th className="px-3 py-2.5">Supplier</th>
                              <th className="px-3 py-2.5">Price Mode</th>
                              <th className="px-3 py-2.5 w-24">Unit Price</th>
                              <th className="px-3 py-2.5 w-20">Qty</th>
                              <th className="px-4 py-2.5 text-right">Price</th>
                              <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {bom.manualMats.map((mat, i) => (
                              <tr key={mat.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                                <td className="p-0">
                                  <MatSearchInput
                                    value={mat.material}
                                    onChange={v => updateManualMat(bom.id, mat.id, 'material', v)}
                                    onSelect={(name, price) => { updateManualMat(bom.id, mat.id, 'material', name); if (price) updateManualMat(bom.id, mat.id, 'unitPrice', price) }}
                                    inventory={inventory}
                                    className="w-full min-w-[120px]"
                                  />
                                </td>
                                <td className="p-0"><input type="text" className={tableInputClass + " group-hover:bg-transparent"} value={mat.supplier} onChange={e => updateManualMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                                <td className="p-0">
                                  <select className={tableInputClass + " group-hover:bg-transparent"} value={mat.priceMode} onChange={e => updateManualMat(bom.id, mat.id, 'priceMode', e.target.value)}>
                                    <option value="-">-</option>
                                    <option value="per kg">per kg</option>
                                    <option value="per unit">per unit</option>
                                    <option value="lump sum">lump sum</option>
                                  </select>
                                </td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.unitPrice} onChange={e => updateManualMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                                <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={mat.qty} onChange={e => updateManualMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                                <td className="px-4 py-2.5 text-right font-mono text-[11px] font-semibold text-primary">{mat.unitPrice * mat.qty > 0 ? formatCurrency(mat.unitPrice * mat.qty) : <span className="text-muted/30">-</span>}</td>
                                <td className="px-3 py-2.5 text-center"><button onClick={() => removeManualMat(bom.id, mat.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                              </tr>
                            ))}
                            {bom.manualMats.length === 0 && (
                              <tr><td colSpan={7} className="py-6 text-center text-[11px] text-muted italic">No manual materials added yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Machining Table */}
                    <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm mb-4 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-surface border-b border-theme-subtle/40 cursor-pointer hover:bg-surface2/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.02)]" onClick={() => updateBOM(bom.id, { machiningCollapsed: !bom.machiningCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface transition-colors">
                            {bom.machiningCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Machining Operations</h3>
                        </div>
                      </div>
                      <div className={`overflow-x-auto transition-all ${bom.machiningCollapsed ? "hidden" : "block"}`}>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                              <th className="px-4 py-2.5">Process</th>
                              <th className="px-3 py-2.5 w-24">Est. Hr</th>
                              <th className="px-3 py-2.5 w-24">Set Time</th>
                              <th className="px-3 py-2.5 w-24">Quo. Hr</th>
                              <th className="px-3 py-2.5 w-56">Rates</th>
                              <th className="px-4 py-2.5 text-right w-32">Sub Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/20">
                            {EXCEL_PROCESSES.map((group, gIdx) => (
                              <React.Fragment key={gIdx}>
                                <tr className="bg-surface2/30">
                                  <td colSpan={6} className="px-4 py-2 text-[10.5px] font-black text-red-500/90 uppercase tracking-widest">{group.group}</td>
                                </tr>
                                {group.items.map(proc => {
                                  const st = bom.procState?.[proc.name]
                                  if (!st) return null
                                  const hrRate = Number(st.hrRate || proc.hrRate || proc.rate || 0)
                                  const setTimeRate = Number(st.setTimeRate || proc.setTimeRate || 0)
                                  const subTotal = (Number(st.quoHr || 0) * hrRate) + (Number(st.setTime || 0) * setTimeRate)
                                  return (
                                    <tr key={proc.name} className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                                      <td className="pl-8 pr-4 py-1.5 text-[11px] text-secondary font-medium group-hover:text-primary border-r border-theme-subtle/10 relative before:content-[''] before:absolute before:left-4 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:border-l before:border-b before:border-theme-subtle/50">{proc.name}</td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={st.estHr} onChange={e => handleProcChange(bom.id, proc.name, 'estHr', e.target.value)} placeholder="-" /></td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " group-hover:bg-transparent"} value={st.setTime} onChange={e => handleProcChange(bom.id, proc.name, 'setTime', e.target.value)} placeholder="-" /></td>
                                      <td className="p-0 border-r border-theme-subtle/10"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " font-bold text-primary group-hover:bg-transparent"} value={st.quoHr} onChange={e => handleProcChange(bom.id, proc.name, 'quoHr', e.target.value)} placeholder="-" /></td>
                                      <td className="px-3 py-1.5 text-[10px] text-muted font-mono whitespace-nowrap border-r border-theme-subtle/10">
                                          <div className="flex gap-2 justify-end">
                                            <span className="text-amber-600/80 font-medium">Rs. {hrRate.toLocaleString()}/hr</span>
                                            <span className="text-theme-subtle">|</span>
                                            <span className="text-blue-500/80 font-medium">Rs. {setTimeRate.toLocaleString()}/set</span>
                                          </div>
                                        </td>
                                      <td className="px-4 py-1.5 text-right font-mono text-[11px] font-semibold">{subTotal > 0 ? <span className="text-primary">{formatCurrency(subTotal)}</span> : <span className="text-muted/30">-</span>}</td>
                                    </tr>
                                  )
                                })}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  {/* BOM Cost Summary Bar */}
                  <div className="flex justify-end pt-4 border-t border-theme-subtle">
                    <div className="flex gap-8 text-xs">
                      <div>
                        <span className="text-muted mr-2">Materials:</span>
                        <span className="font-mono font-bold text-primary">{formatCurrency(autoMatTotal + manualMatTotal)}</span>
                      </div>
                      <div>
                        <span className="text-muted mr-2">Machining:</span>
                        <span className="font-mono font-bold text-primary">{formatCurrency(machCost)}</span>
                      </div>
                      <div>
                        <span className="text-secondary font-black mr-2">BOM Total:</span>
                        <span className="font-mono font-black text-rex-500">{formatCurrency(bomTotal)}</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              )}
            </GlassCard>
            )
          })}
          
          {boms.length === 0 && (
            <div className="p-8 border border-dashed border-theme-subtle rounded-xl text-center text-muted">
               <p className="text-sm">No Bill of Materials added.</p>
               <Button variant="ghost" size="sm" icon={Plus} onClick={addBOM} className="mt-2 text-primary">Add BOM Part</Button>
            </div>
          )}

          {boms.length > 0 && (
            <div className="flex justify-end px-5 py-3 bg-surface border border-theme-subtle/40 rounded-xl">
               <div className="flex items-center gap-4 text-sm">
                 <span className="font-bold text-secondary uppercase tracking-widest text-[11px]">All BOMs Grand Total</span>
                 <span className="font-mono font-black text-lg text-rex-500">{formatCurrency(jobTotalCost)}</span>
               </div>
            </div>
          )}
        </div>
        {/* Section 3: Customer Quotation */}
        <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 flex flex-col gap-4">
              <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-surface2 via-surface2/30 to-transparent border-b border-theme-subtle/40">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[13px] font-semibold text-secondary flex items-center gap-2">
                      <User size={16} /> Customer Quotation
                    </h2>
                    <select 
                      value={currency} 
                      onChange={e => handleCurrencyChange(e.target.value)} 
                      className="bg-surface2 border border-theme-subtle/40 rounded-md px-2 py-1 text-[11px] font-bold text-primary outline-none focus:border-rex-500"
                    >
                      <option value="LKR">LKR (Base)</option>
                      {currencies?.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={isPolishingAll ? Loader2 : Sparkles} 
                      onClick={handleAiPolishAll} 
                      disabled={isPolishingAll || custItems.length === 0}
                      className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold border border-purple-500/20 h-7 text-[11px]"
                    >
                      {isPolishingAll ? 'Polishing...' : '✨ AI Polish All'}
                    </Button>
                    <Button variant="ghost" size="sm" icon={Wand2} onClick={handleOpenMarginModal} className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold border border-purple-500/20 h-7 text-[11px]">✨ Auto-Gen</Button>
                    <Button variant="primary" size="sm" icon={Plus} onClick={addCustItem} className="h-7 text-[11px]">Add Line</Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                        <th className="px-4 py-2.5 w-12 text-center">#</th>
                        <th className="px-3 py-2.5 min-w-[300px] w-full">Description</th>
                        <th className="px-3 py-2.5 w-24">Qty</th>
                        <th className="px-3 py-2.5 w-32">Unit Price (Rs.)</th>
                        <th className="px-4 py-2.5 w-36 text-right">Total (Rs.)</th>
                        <th className="px-3 py-2.5 w-28">Notes</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {custItems.map((item, i) => (
                        <tr key={item.id} className="border-b border-theme-subtle/10 hover:bg-surface/30 transition-colors group">
                          <td className="px-4 py-2 text-xs font-mono text-muted text-center">{i + 1}</td>
                          <td className="p-1">
                            <div className="relative group/desc">
                              <textarea 
                                value={item.desc} 
                                onChange={e => updateCustItem(item.id, 'desc', e.target.value)} 
                                placeholder="Item / service description..." 
                                className="w-full bg-transparent outline-none text-[11px] font-medium resize-y min-h-[70px] p-2 leading-relaxed block border border-transparent hover:border-theme-subtle/30 focus:border-primary/40 focus:bg-surface rounded pr-24"
                                rows={item.desc.split('\n').length > 1 ? Math.min(item.desc.split('\n').length, 8) : 2}
                              />
                              <div className="absolute top-1.5 right-1.5 flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleAiPolishItem(item.id)}
                                  disabled={polishingItemId === item.id}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all opacity-80 group-hover/desc:opacity-100 disabled:opacity-50"
                                  title="Enhance this description using Groq Llama 3.3 AI"
                                >
                                  {polishingItemId === item.id ? (
                                    <Loader2 size={11} className="animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles size={11} className="text-purple-600" />
                                  )}
                                  <span>{polishingItemId === item.id ? 'Polishing...' : 'AI Polish'}</span>
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.qty} onChange={e => updateCustItem(item.id, 'qty', Number(e.target.value))} className={tableInputClass + " group-hover:bg-transparent"} /></td>
                          <td className="p-0"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.unitPrice} onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))} className={tableInputClass + " group-hover:bg-transparent"} /></td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] font-semibold text-primary">{formatCurrency(item.qty * item.unitPrice)}</td>
                          <td className="p-0"><input type="text" value={item.note} onChange={e => updateCustItem(item.id, 'note', e.target.value)} placeholder="Optional note" className={tableInputClass + " group-hover:bg-transparent text-muted"} /></td>
                          <td className="px-3 py-2 text-center"><button onClick={() => removeCustItem(item.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quotation Terms */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface2/60 border border-theme-subtle/60 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-rex-500" />
                    <div>
                      <span className="text-xs font-bold text-primary block">Quotation Terms & Conditions Preset</span>
                      <span className="text-[10px] text-muted">Select a pre-saved term preset or customize the fields below</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-80">
                    <select
                      value={selectedTermsPresetId}
                      onChange={e => handleSelectTermsPreset(e.target.value)}
                      className="w-full bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:border-rex-500 outline-none font-medium"
                    >
                      <option value="">-- Choose Terms Preset --</option>
                      {termsPresets.map(tp => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name} ({tp.validity}) {tp.isDefault ? '★ (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Payment Terms</label>
                    <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)} placeholder="e.g. 50% Advance" className={docInputClass + " bg-surface"} />
                  </div>
                  <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Validity</label>
                    <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)} placeholder="e.g. 30 Days" className={docInputClass + " bg-surface"} />
                  </div>
                  <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Delivery Timeline</label>
                    <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)} placeholder="e.g. 3-4 weeks" className={docInputClass + " bg-surface"} />
                  </div>
                </div>

                {/* Bank Account for Remittance */}
                <div className="bg-surface2/60 border border-theme-subtle/60 rounded-xl p-3 mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Landmark size={15} className="text-rex-500" />
                      <div>
                        <span className="text-xs font-bold text-primary block">Remittance Bank Account</span>
                        <span className="text-[10px] text-muted">Select bank account to display on quotation print/PDF</span>
                      </div>
                    </div>
                    <div className="w-full sm:w-80">
                      <select
                        value={bankDetailId}
                        onChange={e => setBankDetailId(e.target.value)}
                        className="w-full bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:border-rex-500 outline-none font-medium"
                      >
                        {bankAccounts.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} — A/C {b.accountNumber} ({b.branchName || 'Main'}{b.isDefault ? ' · Default' : ''})
                          </option>
                        ))}
                        <option value="none">— Do Not Show Bank Details on Quotation —</option>
                      </select>
                    </div>
                  </div>
                  {selectedBank && (
                    <div className="mt-2 pt-2 border-t border-theme-subtle/40 text-[11px] text-muted flex flex-wrap items-center justify-between gap-2 px-1">
                      <span><strong>A/C Name:</strong> {selectedBank.accountName}</span>
                      <span><strong>A/C No:</strong> <span className="font-mono font-bold text-primary">{selectedBank.accountNumber}</span></span>
                      <span><strong>Branch:</strong> {selectedBank.branchName || '-'}</span>
                      {selectedBank.swiftCode && <span><strong>SWIFT:</strong> <span className="font-mono">{selectedBank.swiftCode}</span></span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Customer Summary Card on the right */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              <div className="border border-theme-subtle/50 rounded-2xl bg-surface shadow-sm p-6 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <h3 className="text-[12px] font-bold text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                   <TrendingUp size={14} className="text-primary"/> Quotation Summary
                </h3>
                
                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-medium">
                        {taxEnabled && selectedProfile?.tax1_show_separately === 0 && selectedProfile?.tax2_show_separately === 0
                          ? 'Sub Total'
                          : 'Sub Total'}
                      </span>
                      <span className="font-mono font-semibold text-secondary text-sm">
                        {formatCurrency(
                          taxEnabled && selectedProfile?.tax1_show_separately === 0 && selectedProfile?.tax2_show_separately === 0
                            ? custWithSSCL
                            : taxEnabled && selectedProfile?.tax1_show_separately === 0
                              ? (custSubtotal + custSubtotal * (Number(selectedProfile.tax1_rate)/100))
                              : custSubtotal
                        )}
                      </span>
                  </div>
                  
                  <div className="space-y-2 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted font-medium">Discount</span>
                        <div className="inline-flex rounded-md p-0.5 bg-surface2 border border-theme-subtle/50 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleDiscountTypeToggle('percent')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-all ${custDiscountType === 'percent' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-primary'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscountTypeToggle('amount')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-all ${custDiscountType === 'amount' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-primary'}`}
                          >
                            LKR
                          </button>
                        </div>
                      </div>
                      <span className="font-mono text-red-500/90 font-semibold text-[12px] text-right">-{formatCurrency(taxEnabled && selectedProfile?.tax1_show_separately === 0 ? custDiscountAmt * (1 + Number(selectedProfile.tax1_rate)/100) : custDiscountAmt)}</span>
                    </div>

                  {custDiscountType === 'percent' ? (
                    <div className="space-y-1">
                      <div className="flex items-center bg-surface2 border border-primary/60 ring-1 ring-primary/20 bg-primary/5 rounded-md shadow-inner px-2 py-1 transition-all">
                        <span className="text-[11px] font-bold text-primary mr-1.5">%</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                          value={custDiscount}
                          onChange={e => handlePercentDiscountChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent text-right text-[12px] font-bold text-primary outline-none"
                        />
                      </div>
                      {custSubtotal > 0 && Number(custDiscount) > 0 && (
                        <div className="flex justify-between items-center text-[10px] px-1 text-muted">
                          <span>Deduction:</span>
                          <span className="font-mono font-medium text-primary">
                            ≈ Rs. {formatCurrency(custDiscountAmt)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center bg-surface2 border border-primary/60 ring-1 ring-primary/20 bg-primary/5 rounded-md shadow-inner px-2 py-1 transition-all">
                        <span className="text-[10px] font-bold text-primary mr-1.5">LKR</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                          value={custDiscountAmount}
                          onChange={e => handleAmountDiscountChange(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent text-right text-[12px] font-bold text-primary outline-none"
                        />
                      </div>
                      {custSubtotal > 0 && Number(custDiscountAmount) > 0 && (
                        <div className="flex justify-between items-center text-[10px] px-1 text-muted">
                          <span>Equivalent rate:</span>
                          <span className="font-mono font-medium text-primary">
                            ≈ {((custDiscountAmt / custSubtotal) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  
                                    {taxEnabled && selectedProfile && (
                    <>
                      {(selectedProfile.tax1_show_separately === 1 && custSscl > 0) && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted font-medium">{selectedProfile.tax1_name} ({selectedProfile.tax1_rate}%)</span>
                          <span className="font-mono font-semibold text-secondary text-sm">+{formatCurrency(custSscl)}</span>
                        </div>
                      )}
                      {(selectedProfile.tax2_show_separately === 1 && custVat > 0) && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted font-medium">{selectedProfile.tax2_name} ({selectedProfile.tax2_rate}%)</span>
                          <span className="font-mono font-semibold text-secondary text-sm">+{formatCurrency(custVat)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                    <div className="flex justify-between items-center">
                      <div className="text-[12px] font-bold text-secondary uppercase tracking-wider">Grand Total</div>
                      <div className="text-[24px] leading-none font-black text-primary font-mono">{formatCurrency(custWithSSCL)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Indicator */}
              <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${expectedProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className={`absolute -right-4 -bottom-4 opacity-5 ${expectedProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  <TrendingUp size={100} />
                </div>
                
                <div className="flex items-center gap-2 mb-4 relative z-10">
                   <div className={`p-1.5 rounded-lg ${expectedProfit >= 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                     <LineChart size={14} />
                   </div>
                   <span className={`text-[11px] font-bold uppercase tracking-widest ${expectedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Est. Financials</span>
                </div>
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between border-b border-theme-subtle/50 pb-2">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Applicable Tax</span>
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
                    <div className="space-y-1.5 pb-2 border-b border-theme-subtle/50">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProfileId('tp_opt1_absorbed')}
                          className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all text-center leading-tight ${
                            selectedProfileId === 'tp_opt1_absorbed'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
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
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
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
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
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
                        className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-lg text-[10px] outline-none focus:border-blue-500"
                      >
                        <option value="">- Select Tax Profile -</option>
                        {taxProfiles?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Margin</span>
                     <span className={`text-[13px] font-bold ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{expectedMargin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{expectedProfit >= 0 ? 'Profit' : 'Loss'}</span>
                     <span className={`text-[14px] font-mono font-black ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(expectedProfit))}</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
        
        </div>
        {/* RIGHT COLUMN: AI & LIVE PREVIEW */}
        {!previewCollapsed ? (
          <div className="w-[450px] xl:w-[500px] shrink-0 border-l border-theme-subtle flex flex-col bg-surface/40 relative z-10">
             {/* TABS */}
             <div className="flex items-center justify-between p-2 border-b border-theme-subtle bg-surface/80 backdrop-blur">
               <div className="flex items-center gap-1 flex-1">
                 <button className="flex-1 py-1.5 text-xs font-bold bg-white dark:bg-zinc-800 text-primary rounded-md shadow-sm border border-theme-subtle/40 whitespace-nowrap shrink-0">
                   Live Preview
                 </button>
                 <button className="flex-1 py-1.5 text-xs font-bold text-muted hover:text-primary transition-colors flex items-center justify-center gap-1.5 rounded-md hover:bg-surface2 whitespace-nowrap shrink-0">
                   <span className="text-purple-500"><Wand2 size={13} /></span> AI Co-Pilot
                 </button>
               </div>
               <button 
                 onClick={() => setPreviewCollapsed(true)}
                 className="p-1.5 ml-2 hover:bg-surface2 rounded-md text-muted hover:text-primary transition-colors shrink-0"
                 title="Collapse Live Preview"
               >
                 <ChevronRight size={16} />
               </button>
             </div>
             
             {/* LIVE PREVIEW CANVAS */}
             <div className="flex-1 overflow-y-auto bg-gray-500/5 relative p-4 custom-scrollbar flex justify-center">
                <div className="shadow-2xl ring-1 ring-black/5 bg-white flex flex-col" style={{ zoom: 0.55, width: '210mm', minHeight: '297mm', flexShrink: 0, marginBottom: '20px' }}>
                   <div className="w-full p-12 pointer-events-none flex-1">
                     <QuotationPrintView 
                        data={{
                           docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
                           custItems, custDiscount, custDiscountType, custDiscountAmount, boms,
                           custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
                           jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
                           custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat, customerAddress, customerName, customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
                           bankDetailId, bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null),
                           status: currentQuote?.status || 'Draft'
                        }}
                        type="main"
                        lead={currentEntity || lead}
                        settings={settings}
                     />
                   </div>
                </div>
             </div>
             
             {/* AI CHAT INPUT */}
             <div className="p-4 bg-surface border-t border-theme-subtle">
                <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Ask AI to adjust margins, add terms..." 
                     className="w-full bg-surface2 border border-theme-subtle/40 rounded-xl py-3 pl-4 pr-12 text-xs text-primary focus:border-purple-500 outline-none transition-colors" 
                   />
                   <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors">
                     <Wand2 size={16} />
                   </button>
                </div>
             </div>
          </div>
        ) : (
          <div className="w-10 shrink-0 border-l border-theme-subtle bg-surface/40 flex flex-col items-center py-4 relative z-10 transition-all">
            <button
              onClick={() => setPreviewCollapsed(false)}
              className="p-2 hover:bg-surface2 rounded-lg text-muted hover:text-primary transition-colors mb-4"
              title="Expand Live Preview"
            >
              <ChevronLeft size={16} />
            </button>
            <div 
              onClick={() => setPreviewCollapsed(false)}
              className="flex-1 flex items-center justify-center cursor-pointer select-none py-4 text-muted hover:text-primary transition-colors"
              style={{ writingMode: 'vertical-rl' }}
              title="Expand Live Preview"
            >
              <div className="flex items-center gap-2 tracking-widest text-[11px] font-bold uppercase">
                <Eye size={13} />
                <span>Live Preview</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={'Preview Quotation'} size="xl">
        <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
          <QuotationPrintView 
            data={{
               docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
               custItems, custDiscount, custDiscountType, custDiscountAmount, boms,
               custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
               custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat, customerAddress, customerName, customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
               bankDetailId, bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null),
               status: currentQuote?.status || 'Draft'
            }}
            type="main"
            lead={currentEntity || lead}
            settings={settings}
          />
          
          {currentQuote && !isApproved && (
            <div className="mt-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>Status is <strong>{currentQuote.status || 'Draft'}</strong>. Export PDF, Email Customer, and Print are disabled until this quotation is formally approved.</span>
              </div>
              {canApprove && (
                <button
                  onClick={async () => {
                    try {
                      await approveQuotation(currentQuote.id, user?.name || 'Manager');
                      showToast('success', 'Quotation approved!');
                      await loadVersions();
                    } catch(err: any) {
                      showToast('error', err?.message || 'Failed to approve');
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shrink-0 shadow-xs cursor-pointer"
                >
                  Approve Now
                </button>
              )}
            </div>
          )}

          {currentQuote?.status === 'Pending Approval' && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Approval Required:</strong> This quotation has been submitted for approval and is currently <strong>Pending Approval</strong>. Emailing to customer, exporting PDF, and printing are locked until approved.
              </span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
            <Button 
              variant="ghost" 
              icon={Mail} 
              disabled={!isApproved}
              onClick={() => {
                if (!isApproved) {
                  showToast('error', `Quotation is currently "${currentQuote?.status || 'Draft'}". Must be Approved before emailing customer.`);
                  return;
                }
                setEmailModalOpen(true);
              }} 
              className={`bg-surface border border-theme-subtle/40 font-semibold ${
                !isApproved 
                  ? 'opacity-40 cursor-not-allowed text-muted pointer-events-none' 
                  : 'hover:bg-surface2 text-blue-600'
              }`}
              title={!isApproved ? `Quotation is "${currentQuote?.status || 'Draft'}". Must be Approved to email.` : 'Email Customer'}
            >
              Email Customer
            </Button>
            
            <Button 
              variant="ghost" 
              icon={FileDown} 
              disabled={!isApproved}
              onClick={async () => {
                if (!isApproved) {
                  showToast('error', `Quotation is currently "${currentQuote?.status || 'Draft'}". Must be Approved before exporting.`);
                  return;
                }
                await exportPdf('print-section', `Quotation_${quotationNo || 'Q'}.pdf`);
              }} 
              className={`bg-surface border border-theme-subtle/40 font-semibold ${
                !isApproved 
                  ? 'opacity-40 cursor-not-allowed text-muted pointer-events-none' 
                  : 'hover:bg-surface2'
              }`}
              title={!isApproved ? `Quotation is "${currentQuote?.status || 'Draft'}". Must be Approved to export PDF.` : 'Export PDF'}
            >
              Export PDF
            </Button>
            
            <Button 
              variant="primary" 
              icon={Printer} 
              disabled={!isApproved}
              onClick={() => {
                if (!isApproved) {
                  showToast('error', `Quotation is currently "${currentQuote?.status || 'Draft'}". Must be Approved before printing.`);
                  return;
                }
                printElement('print-section', quotationNo || 'Quotation');
              }}
              className={!isApproved ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
              title={!isApproved ? `Quotation is "${currentQuote?.status || 'Draft'}". Must be Approved to print.` : 'Print Quotation'}
            >
              Print Quotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* SEND EMAIL MODAL */}
      {emailModalOpen && (
        <SendDocumentEmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          documentType="quotation"
          documentNumber={quotationNo || 'Quotation'}
          customerEmail={(currentEntity || lead)?.email || ''}
          customerName={attention || lead?.name || customerName || 'Customer'}
          totalAmount={custWithSSCL || custTotal || 0}
          validityDays={custValidity || '30'}
          elementIdToPdf="print-section"
        />
      )}

      <Modal isOpen={showMarginModal} onClose={() => setShowMarginModal(false)} title="✨ AI Quote Generation & Profit Margin" size="md">
        <div className="p-5 space-y-4">
          <p className="text-xs text-secondary leading-relaxed bg-purple-500/10 text-purple-600 dark:text-purple-400 p-3 rounded-xl border border-purple-500/20 font-medium">
            Calculate target selling prices from your BOM Costing and generate clean, executive commercial descriptions powered by Groq Meta Llama 3.3.
          </p>

          {/* Dual Inputs Grid: Both Percentage and Fixed Rupee Value visible and synced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-surface2/60 border border-theme-subtle">
            {/* Input 1: Profit Margin Percentage (%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Percent size={13} className="text-purple-500" />
                  Profit Margin (%)
                </label>
                <span className="text-[10px] text-muted">Percentage</span>
              </div>
              <div className="relative">
                <input 
                  type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                  className={`w-full input-base font-bold text-lg pr-9 py-2 bg-surface transition-all ${
                    lastEditedMargin === 'percent' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''
                  }`}
                  value={marginPctInput} 
                  onChange={e => handleMarginPctChange(e.target.value)} 
                  placeholder="e.g. 35"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-muted text-sm">%</span>
              </div>
              {/* Presets for % */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {[15, 20, 25, 30, 35, 40, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleMarginPctChange(pct.toString())}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all ${
                      Number(marginPctInput) === pct 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                        : 'bg-surface hover:bg-surface2 text-muted border-theme-subtle hover:text-primary'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Fixed Profit Amount (Rs.) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Coins size={13} className="text-emerald-500" />
                  Fixed Profit Amount (Rs.)
                </label>
                <span className="text-[10px] text-muted">Fixed Rupees (ඉලක්කමෙන්)</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted text-xs font-mono">Rs.</span>
                <input 
                  type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                  className={`w-full input-base font-bold text-lg pl-9 pr-3 py-2 bg-surface font-mono transition-all ${
                    lastEditedMargin === 'amount' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''
                  }`}
                  value={marginAmtInput} 
                  onChange={e => handleMarginAmtChange(e.target.value)} 
                  placeholder={totalValidBomCost > 0 ? (totalValidBomCost * 0.35).toFixed(0) : "e.g. 50000"}
                />
              </div>
              {/* Presets for Rs. */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {[10000, 25000, 50000, 100000, 250000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleMarginAmtChange(val.toString())}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition-all ${
                      Number(marginAmtInput) === val 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-surface hover:bg-surface2 text-muted border-theme-subtle hover:text-primary'
                    }`}
                  >
                    +{(val / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Pricing Breakdown Card */}
          {(() => {
            const previewCost = totalValidBomCost;
            const pct = Number(marginPctInput) || 0;
            const amt = Number(marginAmtInput) || 0;
            const currentProfit = lastEditedMargin === 'amount' ? amt : (previewCost * (pct / 100));
            const currentSellingPrice = previewCost + currentProfit;
            const effectivePct = previewCost > 0 ? (currentProfit / previewCost) * 100 : 0;

            return (
              <div className="p-3.5 rounded-xl bg-surface2/70 border border-theme-subtle space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted">
                  <span>Base BOM Manufacturing Cost:</span>
                  <span className="font-mono font-bold text-primary">Rs. {previewCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Calculated Profit Margin:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +Rs. {Math.round(currentProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-[11px] ml-1.5 font-semibold text-muted font-sans">({effectivePct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="pt-2 border-t border-theme-subtle/50 flex justify-between items-center font-bold">
                  <span className="text-primary text-sm">Target Customer Selling Price:</span>
                  <span className="font-mono text-base text-purple-600 dark:text-purple-400">Rs. {Math.round(currentSellingPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })()}

          <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
            <input 
              type="checkbox" 
              checked={useAiPolish} 
              onChange={e => setUseAiPolish(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 mt-0.5" 
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-500" />
                Generate clean executive descriptions with Groq AI (Llama 3.3)
              </span>
              <p className="text-[11px] text-muted leading-tight">
                Strict client confidentiality: Internal machining operations and raw materials used are omitted.
              </p>
            </div>
          </label>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setShowMarginModal(false)} disabled={isGeneratingQuote}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={autoGenerateCustomerQuote} 
              disabled={isGeneratingQuote}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 border-0 text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 px-5"
            >
              {isGeneratingQuote ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating with Groq AI...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Quote
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Add Customer Modal */}
      <CustomerModal 
        isOpen={showAddCustomer} 
        onClose={() => setShowAddCustomer(false)} 
        onSuccess={(newCustomer) => {
           showToast('success', 'Customer registered successfully!');
           setSelectedLeadId(newCustomer.id);
           setCustomerName(newCustomer.company || newCustomer.name || '');
        }} 
      />

      {/* Quotation Templates Modal */}
      <QuotationTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        currentQuotationData={{
          subject,
          custItems,
          custTerms,
          custValidity,
          custDelivery,
          selectedProfileId,
          boms,
          fullSnapshot: {
            docNo, issueNo, issueDate, quoDate, jobQty, subject,
            taxEnabled, selectedProfileId,
            boms,
            custItems, custTerms, custValidity, custDelivery, custDiscount,
            custDiscountType, custDiscountAmount,
            custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
            jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
            selectedProfile, custSscl, custVat, jobSscl, jobVat
          }
        }}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Save as Template Modal */}
      <Modal 
        isOpen={showSaveAsTemplateModal} 
        onClose={() => setShowSaveAsTemplateModal(false)} 
        title={isTemplateMode && editTemplateId ? 'Update Quotation Template' : 'Save Quotation as Template'} 
        size="md"
      >
        <div className="p-5 space-y-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-600 dark:text-purple-300 leading-relaxed font-medium">
            This will save the entire quotation structure (all BOMs, materials, machining operations, cycle times, custom items, and terms) as a reusable template.
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5 uppercase tracking-wider">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              className="w-full input-base font-semibold"
              value={templateSaveName} 
              onChange={e => setTemplateSaveName(e.target.value)} 
              placeholder="e.g. Standard Precision CNC Shaft Machining"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5 uppercase tracking-wider">
              Description / Notes
            </label>
            <textarea 
              rows={2}
              className="w-full input-base"
              value={templateSaveDesc} 
              onChange={e => setTemplateSaveDesc(e.target.value)} 
              placeholder="Brief description of when this template should be used..."
            />
          </div>

          <div className="bg-surface2/60 border border-theme-subtle rounded-xl p-3 text-[11px] space-y-1.5 text-muted">
            <div className="flex justify-between font-semibold text-primary">
              <span>Subject:</span>
              <span className="truncate max-w-[220px]">{subject || 'Untitled'}</span>
            </div>
            <div className="flex justify-between">
              <span>BOMs Included:</span>
              <span className="font-bold text-rex-500">{boms.length} BOM(s) with Process Costing</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Items:</span>
              <span className="font-bold text-rex-500">{custItems.filter(i => i.desc.trim() !== '').length} Line Item(s)</span>
            </div>
            <div className="flex justify-between">
              <span>Validity & Delivery:</span>
              <span>{custValidity} | {custDelivery || 'Standard'}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setShowSaveAsTemplateModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              icon={Bookmark} 
              onClick={handleSaveAsTemplate} 
              disabled={isSavingTemplate}
              className="bg-purple-600 hover:bg-purple-500 text-white border-none shadow-xs"
            >
              {isSavingTemplate ? 'Saving...' : (isTemplateMode && editTemplateId ? 'Update Template' : 'Save Template')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Quotation Reason Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Quotation"
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-secondary">
              Please enter the reason for rejecting this quotation. The creator will see this note to make necessary corrections.
            </p>
            <textarea
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              placeholder="e.g. Margins too low, incorrect material spec, discount exceeds threshold..."
              className="w-full h-24 p-2.5 text-xs bg-surface border border-theme-subtle rounded-lg focus:outline-none focus:border-red-500 font-sans resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!rejectReasonInput.trim()}
                onClick={async () => {
                  if (!currentQuote || !rejectReasonInput.trim()) return;
                  try {
                    await rejectQuotation(currentQuote.id, rejectReasonInput.trim());
                    showToast('error', 'Quotation rejected with reason');
                    setRejectModalOpen(false);
                    await loadVersions();
                  } catch(err: any) {
                    showToast('error', err?.message || 'Failed to reject');
                  }
                }}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request Edit Approval Modal */}
      {showRequestEditModal && (
        <Modal
          isOpen={showRequestEditModal}
          onClose={() => setShowRequestEditModal(false)}
          title="Request Quotation Edit Approval"
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-secondary leading-relaxed">
              Quotation <strong>{quotationNo || currentQuote?.quotationNo || docNo}</strong> has been approved and locked. To modify prices, quantities, or scope, please state the reason for revision. Management will review your request.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Reason for Revision / Modification *
              </label>
              <textarea
                rows={3}
                required
                value={editReasonInput}
                onChange={(e) => setEditReasonInput(e.target.value)}
                placeholder="e.g. Customer requested a 10% quantity increase, or change of delivery terms..."
                className="w-full p-2.5 text-xs bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500 custom-scrollbar"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRequestEditModal(false)}
                disabled={isSubmittingEditRequest}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingEditRequest || !editReasonInput.trim()}
                onClick={async () => {
                  if (!currentQuote || !editReasonInput.trim()) return;
                  setIsSubmittingEditRequest(true);
                  try {
                    await requestQuotationEditApproval(currentQuote.id, editReasonInput.trim(), user?.name || user?.username || 'Sales Executive');
                    showToast('success', 'Edit approval request submitted to management!');
                    setShowRequestEditModal(false);
                    await loadVersions();
                  } catch (err: any) {
                    showToast('error', err?.message || 'Failed to submit request');
                  } finally {
                    setIsSubmittingEditRequest(false);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                {isSubmittingEditRequest ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
