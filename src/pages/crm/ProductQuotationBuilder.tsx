import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft, Plus, Trash2, Download, Save, History, Package, ChevronDown, 
  ChevronUp, User, RotateCcw, X, FileText, TrendingUp, Mail, FileDown, 
  Printer, Wand2, LineChart, Building2, UserCheck, Eye, ChevronLeft, 
  ChevronRight, Bookmark, Landmark, CheckCircle2, XCircle, Clock, Send, 
  AlertTriangle, Sparkles, Loader2, PackageCheck, ShoppingBag, Search, ExternalLink, Wrench, Lock, Unlock 
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { CustomerModal } from '@/components/crm/CustomerModal'
import { QuotationTemplatesModal } from '@/components/crm/QuotationTemplatesModal'
import { QuotationTermsPreset, DEFAULT_TERMS_PRESETS } from '@/components/TermsConditionsManager'
import { useLeads, useInventory, useCustomers } from '@/hooks/useData'
import { useTaxProfiles, useCurrencies, useTaxes } from '@/hooks/useFinance'
import { 
  createQuotation, fetchQuotations, updateQuotation, deleteQuotation, 
  generateQuotationDescription, fetchAllCustomerGRNs, submitQuotationForApproval, 
  approveQuotation, rejectQuotation, requestQuotationEditApproval, approveQuotationEdit, rejectQuotationEdit, fetchNextDocumentNumber 
} from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useDialog } from '@/components/ui/DialogProvider'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { exportPdf } from '@/lib/exportPdf'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { printElement } from '@/lib/printElement'

const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-emerald-500 px-2 py-1.5 text-[12px] outline-none transition-all placeholder:text-muted/30 text-primary"
const docInputClass = "w-full bg-surface border border-theme-subtle/40 px-3 py-2 rounded-lg text-xs outline-none focus:border-emerald-500/50 transition-colors disabled:text-muted disabled:cursor-default"

// Format line-by-line specifications and description for quotation items
export const buildQuotationLineDesc = (item: {
  name: string
  sku?: string
  partNo?: string
  isSparePart?: boolean
  parentName?: string
  description?: string
}): string => {
  let title = item.name || 'Finished Product'
  if (item.partNo) {
    title += ` [Part #${item.partNo}]`
  }
  if (item.sku && !title.includes(item.sku)) {
    title += ` (SKU: ${item.sku})`
  }

  const lines: string[] = [title]

  if (item.isSparePart && item.parentName) {
    lines.push(`Component of: ${item.parentName}`)
  }

  if (item.description && item.description.trim()) {
    const rawLines = item.description.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const titleClean = (item.name || '').trim().toLowerCase()
    rawLines.forEach(l => {
      const lineClean = l.replace(/^[•\-*\s]+/, '').trim().toLowerCase()
      // Skip if this line repeats the item name
      if (lineClean === titleClean) {
        return
      }
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.toLowerCase().startsWith('line ')) {
        lines.push(l)
      } else {
        lines.push(`• ${l}`)
      }
    })
  }

  return lines.join('\n')
}

// Helper to parse spare parts from product and inventory
export const getProductSpareParts = (prod: any, allInventory?: any[]): any[] => {
  if (!prod) return [];
  const list: any[] = [];
  if (prod.spareParts) {
    try {
      const parsed = typeof prod.spareParts === 'string' ? JSON.parse(prod.spareParts) : prod.spareParts;
      if (Array.isArray(parsed)) list.push(...parsed);
    } catch (e) {}
  }
  if (allInventory && Array.isArray(allInventory)) {
    const invSpares = allInventory.filter((i: any) => i.parentProductId === prod.id || (i.isSparePart && i.parentProductId === prod.id));
    invSpares.forEach((sp: any) => {
      if (!list.some(s => s.id === sp.id || (s.inventoryId && s.inventoryId === sp.id))) {
        list.push({
          id: sp.id,
          partNo: sp.partNo || 'SP',
          name: sp.name,
          sku: sp.sku,
          inventoryId: sp.id,
          qtyPerAssembly: 1,
          unitCost: Number(sp.unitCost || 0),
          unitPrice: Number(sp.unitPrice || 0),
          uom: sp.uom || 'pcs',
          stock: sp.quantity !== undefined ? Number(sp.quantity) : 0,
          description: sp.description,
          imageUrl: sp.imageUrl
        });
      }
    });
  }
  return list;
};

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
    const results: any[] = [];
    products.forEach(p => {
      if (
        (p.name || '').toLowerCase().includes(q) || 
        (p.sku || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      ) {
        results.push(p);
      }
      const spares = getProductSpareParts(p, products);
      spares.forEach(sp => {
        if (
          (sp.name || '').toLowerCase().includes(q) || 
          (sp.partNo || '').toLowerCase().includes(q) || 
          (sp.sku || '').toLowerCase().includes(q)
        ) {
          results.push({
            ...sp,
            isSparePart: true,
            parentProduct: p,
            name: `${sp.name}${sp.partNo ? ` [Part #${sp.partNo}]` : ''}`,
            description: sp.description || `Spare part for ${p.name}`,
            unitPrice: sp.unitPrice,
            unitCost: sp.unitCost,
            quantity: sp.stock !== undefined ? sp.stock : 0
          });
        }
      });
    });
    return results.slice(0, 14);
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
          placeholder="Type product name or SKU to quick-add finished good..." 
        />
      </div>
      {open && filtered.length > 0 && createPortal(
        <ul 
          style={{ 
            top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY + 4, 
            left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, 
            width: wrapRef.current?.getBoundingClientRect().width, 
            minWidth: '340px' 
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.isSparePart ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                      SPARE PART
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0">
                      FINISHED GOOD
                    </span>
                  )}
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
                  {formatCurrency(Number(item.unitPrice || item.price || 0))}
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
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-300 italic truncate mt-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
  const previewParam = searchParams.get('preview') === 'true'
  const templateIdParam = searchParams.get('templateId')

  const navigate = useNavigate()
  const { showConfirm } = useDialog()
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [polishingItemId, setPolishingItemId] = useState<number | null>(null)
  const [isPolishingAll, setIsPolishingAll] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState('')
  
  const { data: leads, loading } = useLeads()
  const { data: customers } = useCustomers()
  const { data: inventory = [] } = useInventory()
  const { settings } = useSettings()
  const { user, can } = useAuth()
  const canApprove = (can ? can('approvals.quotations') : false) || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager'
  const { data: currencies } = useCurrencies()
  const [currency, setCurrency] = useState('LKR')
  const { data: taxProfiles } = useTaxProfiles()
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('tp_opt2_sscl_absorbed_vat_sep')

  // Filter only finished goods / ready-made products & standard parts from inventory
  const finishedProducts = useMemo(() => {
    return (inventory || []).filter((item: any) => {
      const isSpare = Boolean(
        item.isSparePart === 1 || 
        item.isSparePart === '1' || 
        item.isSparePart === true || 
        item.isSparePart === 'true' || 
        item.category === 'Spare Parts'
      );
      if (isSpare) return true; // Include spare parts for direct selection

      return (
        item.type === 'finished_product' || 
        item.type === 'product' || 
        item.category === 'Standard Parts' || 
        !item.type ||
        (item.category && !['Raw Metals & Alloys', 'Plates & Sheets', 'Round & Hex Bars', 'Pipes & Hollow Tubes'].includes(item.category))
      );
    });
  }, [inventory]);

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

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [savedVersions, setSavedVersions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'spares'>('all')
  const [selectedProductForSpares, setSelectedProductForSpares] = useState<any>(null)
  const [sparesSearch, setSparesSearch] = useState('')
  const [selectedSpareMap, setSelectedSpareMap] = useState<Record<string | number, { selected: boolean; qty: number }>>({})

  const openSparePartsModal = (prod: any) => {
    setSelectedProductForSpares(prod)
    setSparesSearch('')
    const spares = getProductSpareParts(prod, inventory)
    const initMap: Record<string | number, { selected: boolean; qty: number }> = {}
    spares.forEach(s => {
      initMap[s.id] = { selected: false, qty: 1 }
    })
    setSelectedSpareMap(initMap)
  }

  const toggleSpareSelection = (id: string | number) => {
    setSelectedSpareMap(prev => ({
      ...prev,
      [id]: {
        selected: !prev[id]?.selected,
        qty: prev[id]?.qty || 1
      }
    }))
  }

  const updateSpareQty = (id: string | number, qty: number) => {
    setSelectedSpareMap(prev => ({
      ...prev,
      [id]: {
        selected: prev[id]?.selected ?? true,
        qty: Math.max(1, qty)
      }
    }))
  }

  const toggleSelectAllSpares = () => {
    if (!selectedProductForSpares) return
    const spares = getProductSpareParts(selectedProductForSpares, inventory)
    const allSelected = spares.length > 0 && spares.every(s => selectedSpareMap[s.id]?.selected)
    const updated: Record<string | number, { selected: boolean; qty: number }> = {}
    spares.forEach(s => {
      updated[s.id] = {
        selected: !allSelected,
        qty: selectedSpareMap[s.id]?.qty || 1
      }
    })
    setSelectedSpareMap(updated)
  }

  const addSelectedSparesToQuote = () => {
    if (!selectedProductForSpares) return
    const spares = getProductSpareParts(selectedProductForSpares, inventory)
    const selectedSpares = spares.filter(s => selectedSpareMap[s.id]?.selected)
    if (selectedSpares.length === 0) return

    const newItems: ProductQuotationItem[] = selectedSpares.map(sp => {
      const qty = selectedSpareMap[sp.id]?.qty || 1
      const price = Number(sp.unitPrice || 0)
      const cost = Number(sp.unitCost || 0)

      const desc = buildQuotationLineDesc({
        name: sp.name,
        sku: sp.sku || (selectedProductForSpares.sku ? `${selectedProductForSpares.sku}-${sp.partNo || 'SP'}` : ''),
        partNo: sp.partNo,
        isSparePart: true,
        parentName: selectedProductForSpares.name,
        description: sp.description
      })

      return {
        id: Date.now() + Math.floor(Math.random() * 10000),
        productId: sp.inventoryId || sp.id,
        sku: sp.sku || (selectedProductForSpares.sku ? `${selectedProductForSpares.sku}-${sp.partNo || 'SP'}` : ''),
        desc,
        qty,
        unitPrice: price,
        unitCost: cost,
        uom: sp.uom || 'pcs',
        stock: sp.stock || 0,
        note: `Spare part for ${selectedProductForSpares.name}`
      }
    })

    setCustItems(prev => {
      if (prev.length === 1 && !prev[0].desc && prev[0].unitPrice === 0) {
        return newItems
      }
      return [...prev, ...newItems]
    })

    showToast('success', `Added ${selectedSpares.length} spare part(s) to quotation lines`)
    setSelectedProductForSpares(null)
  }
  const [quickSearchText, setQuickSearchText] = useState('')
  const initialLoadedRef = useRef(false)
  const draftIdRef = useRef<string | null>(null)
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
          console.error('Failed to fetch single quote:', e);
        }
      }

      const effectiveLeadId = targetQuote?.leadId || leadId || selectedLeadId;
      let data: any[] = [];
      if (effectiveLeadId && effectiveLeadId !== 'WALK-IN') {
        const rawData = await fetchQuotations(effectiveLeadId);
        data = (rawData || []).filter((q: any) => {
          let snap: any = {};
          try { snap = JSON.parse(q.data || '{}'); } catch(e){}
          return q.type === 'product' || q.type === 'product_draft' || snap.isProductQuotation === true || snap.quotationCategory === 'product';
        });
        setSavedVersions(data);
      }

      // Auto-load if quoteId is in URL (only on initial load so it doesn't overwrite user edits)
      if (quoteIdParam && !initialLoadedRef.current) {
        const target = targetQuote || data.find((v: any) => v.id === quoteIdParam);
        if (target) {
          initialLoadedRef.current = true;
          const snap = typeof target.data === 'string' ? JSON.parse(target.data) : target.data;
          restoreSnapshot(snap);
          if (target.type === 'product_draft') {
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
        // If customer already has an active product draft, connect to it to avoid duplicate repeating drafts
        const existingDraft = data.find((v: any) => v.type === 'product_draft');
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
  const [tinNo, setTinNo] = useState(lead?.svat || '')
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (lead?.address) return lead.address;
    if (lead?.customerId && customers) {
      const c = customers.find((cust: any) => cust.id === lead.customerId);
      if (c?.address) return c.address;
    }
    return '';
  })
  const [quotationNo, setQuotationNo] = useState('')
  const [jobQty, setJobQty] = useState('1')
  const [attention, setAttention] = useState('')
  const [subject, setSubject] = useState('Supply of Finished Goods / Products')
  const [customerName, setCustomerName] = useState('')
  const [clientType, setClientType] = useState<'customer' | 'lead'>(leadId ? 'lead' : 'customer')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [allGrns, setAllGrns] = useState<any[]>([]);
  const [jobItems, setJobItems] = useState<{ id: number; text: string }[]>([
    { id: 1, text: 'Supply and delivery of finished products as per customer specifications' }
  ])
  const [attachments, setAttachments] = useState<{ id: string; name: string; type: string; dataUrl: string }[]>([])
  
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

  // Aggregate all contacts from Customer and Lead
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
     const oldCur = currencies.find((c: any) => c.code === currency) || { exchangeRate: 1 };
     const newCur = currencies.find((c: any) => c.code === newCurrencyCode) || { exchangeRate: 1 };

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
        const existingDraft = (custQuotes || []).find((q: any) => q.type === 'product_draft');
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
      setTinNo(cust.svat || cust.tin || cust.brNumber || '');
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
        else {
          const userPrefix = user?.prefix ? `${user.prefix}-` : '';
          const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
          const base = (userPrefix || custPrefix) ? `${userPrefix}${custPrefix}` : 'PQ-';
          setQuotationNo(`${base}2206`);
        }
      }).catch(() => {
        const userPrefix = user?.prefix ? `${user.prefix}-` : '';
        const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
        const base = (userPrefix || custPrefix) ? `${userPrefix}${custPrefix}` : 'PQ-';
        setQuotationNo(`${base}2206`);
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
        setTinNo(cust.svat || cust.tin || cust.brNumber || leadItem.svat || '');
        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          customerPrefix: cust.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else {
            const userPrefix = user?.prefix ? `${user.prefix}-` : '';
            const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
            const base = (userPrefix || custPrefix) ? `${userPrefix}${custPrefix}` : 'PQ-';
            setQuotationNo(`${base}2206`);
          }
        }).catch(() => {
          const userPrefix = user?.prefix ? `${user.prefix}-` : '';
          const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
          const base = (userPrefix || custPrefix) ? `${userPrefix}${custPrefix}` : 'PQ-';
          setQuotationNo(`${base}2206`);
        });
      } else {
        setCustomerAddress(leadItem.address || '');
        setVatNo(leadItem.vat || '');
        setTinNo(leadItem.svat || '');
        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else {
            const userPrefix = user?.prefix ? `${user.prefix}-` : 'PQ-';
            setQuotationNo(`${userPrefix}2206`);
          }
        }).catch(() => {
          const userPrefix = user?.prefix ? `${user.prefix}-` : 'PQ-';
          setQuotationNo(`${userPrefix}2206`);
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
      if (lead.svat || lead.tin || linkedCust?.svat || linkedCust?.tin) setTinNo(lead.svat || lead.tin || linkedCust?.svat || linkedCust?.tin || '');
      if (!quoteIdParam && !quotationNo) {
        const cust = isCust ? customers?.find(c => c.id === leadId) || lead : (linkedCust || null);
        fetchNextDocumentNumber('quotation', {
          userPrefix: user?.prefix,
          customerPrefix: cust?.prefix,
          reserve: false
        }).then(res => {
          if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
          else setQuotationNo(user?.prefix ? `${user.prefix}-2206` : 'PQ-2206');
        }).catch(() => {
          setQuotationNo(user?.prefix ? `${user.prefix}-2206` : 'PQ-2206');
        });
      }
    } else if (!quoteIdParam && !quotationNo) {
      fetchNextDocumentNumber('quotation', {
        userPrefix: user?.prefix,
        reserve: false
      }).then(res => {
        if (res?.formattedNumber) setQuotationNo(res.formattedNumber);
        else setQuotationNo(user?.prefix ? `${user.prefix}-2206` : 'PQ-2206');
      }).catch(() => {
        setQuotationNo(user?.prefix ? `${user.prefix}-2206` : 'PQ-2206');
      });
    }
  }, [leadId, lead, customers, quoteIdParam, quotationNo, user?.prefix]);

  // Scope Items
  const addJobItem = () => setJobItems(p => [...p, { id: Date.now(), text: '' }]);
  const updateJobItem = (id: number, text: string) => setJobItems(p => p.map(i => i.id === id ? { ...i, text } : i));
  const removeJobItem = (id: number) => setJobItems(p => p.filter(i => i.id !== id));

  // Attachments
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // --- Product Quotation Lines (Finished Goods) ---
  const [custItems, setCustItems] = useState<ProductQuotationItem[]>([
    { id: Date.now(), desc: '', qty: 1, unitPrice: 0, unitCost: 0, uom: 'pcs', stock: 0, note: '' }
  ])
  const addCustItem = () => setCustItems(p => [...p, { id: Date.now(), desc: '', qty: 1, unitPrice: 0, unitCost: 0, uom: 'pcs', stock: 0, note: '' }])
  const updateCustItem = (id: number, f: string, v: any) => setCustItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i))
  const removeCustItem = (id: number) => setCustItems(p => p.filter(i => i.id !== id))

  // Add Product from Catalog or Quick Search
  const addProductToItems = (prod: any) => {
    if (prod.isSparePart) {
      const unitPrice = Number(prod.unitPrice || 0);
      const unitCost = Number(prod.unitCost || 0);

      let parentName = prod.parentProduct?.name;
      if (!parentName && prod.parentProductId) {
        const parent = (inventory || []).find((i: any) => i.id === prod.parentProductId);
        if (parent) parentName = parent.name;
      }

      const desc = buildQuotationLineDesc({
        name: prod.name || 'Spare Part',
        sku: prod.sku,
        partNo: prod.partNo,
        isSparePart: true,
        parentName,
        description: prod.description
      });

      const newItem: ProductQuotationItem = {
        id: Date.now(),
        productId: prod.inventoryId || prod.id,
        sku: prod.sku || '',
        desc,
        qty: 1,
        unitPrice,
        unitCost,
        uom: prod.uom || 'pcs',
        stock: Number(prod.quantity || prod.stock || 0),
        note: parentName ? `Spare part for ${parentName}` : ''
      };
      setCustItems(prev => {
        if (prev.length === 1 && !prev[0].desc && prev[0].unitPrice === 0) {
          return [newItem];
        }
        return [...prev, newItem];
      });
      showToast('success', `Added spare part "${prod.name}" with line-by-line description`);
      return;
    }

    const unitPrice = Number(prod.unitPrice || prod.price || prod.sellingPrice || 0);
    const unitCost = Number(prod.unitCost || prod.cost || prod.costPrice || (unitPrice > 0 ? unitPrice * 0.7 : 0));
    
    const desc = buildQuotationLineDesc({
      name: prod.name || 'Finished Product',
      sku: prod.sku,
      description: prod.description
    });

    const newItem: ProductQuotationItem = {
      id: Date.now(),
      productId: prod.id,
      sku: prod.sku || '',
      desc,
      qty: 1,
      unitPrice,
      unitCost,
      uom: prod.uom || 'pcs',
      stock: Number(prod.quantity || 0),
      note: ''
    };
    setCustItems(prev => {
      // If only one empty item, replace it
      if (prev.length === 1 && !prev[0].desc && prev[0].unitPrice === 0) {
        return [newItem];
      }
      return [...prev, newItem];
    });
    showToast('success', `Added "${prod.name}" with line-by-line description`);
  };
  
  const [custTerms, setCustTerms] = useState('')
  const [custValidity, setCustValidity] = useState('30 Days')
  const [custDelivery, setCustDelivery] = useState('3-5 Working Days')
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
  const totalProductCost = custItems.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitCost || 0)), 0);
  const jobTotalCost = totalProductCost;

  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
  const custDiscountAmt = custDiscountType === 'amount'
    ? Math.min(custSubtotal, Math.max(0, Number(custDiscountAmount) || 0))
    : custSubtotal * (Math.max(0, Number(custDiscount) || 0) / 100);
  const custTotal = Math.max(0, custSubtotal - custDiscountAmt);

  const handlePercentDiscountChange = (val: string) => {
    setCustDiscountType('percent');
    setCustDiscount(val);
    if (val === '' || isNaN(Number(val))) {
      setCustDiscountAmount('');
    } else {
      const p = Math.max(0, Number(val));
      setCustDiscountAmount(custSubtotal > 0 ? Number((custSubtotal * (p / 100)).toFixed(2)) : 0);
    }
  };

  const handleAmountDiscountChange = (val: string) => {
    setCustDiscountType('amount');
    setCustDiscountAmount(val);
    if (val === '' || isNaN(Number(val))) {
      setCustDiscount('');
    } else {
      const a = Math.max(0, Number(val));
      setCustDiscount(custSubtotal > 0 ? Number(((a / custSubtotal) * 100).toFixed(2)) : 0);
    }
  };

  const handleDiscountTypeToggle = (type: 'percent' | 'amount') => {
    if (type === custDiscountType) return;
    if (type === 'percent') {
      const amt = Number(custDiscountAmount) || 0;
      const pct = custSubtotal > 0 ? ((amt / custSubtotal) * 100).toFixed(2) : '0';
      setCustDiscountType('percent');
      setCustDiscount(pct);
    } else {
      const pct = Number(custDiscount) || 0;
      const amt = custSubtotal > 0 ? ((custSubtotal * (pct / 100))).toFixed(2) : '0';
      setCustDiscountType('amount');
      setCustDiscountAmount(amt);
    }
  };

  // Taxes & Financials for Tax-Inclusive Finished Goods / Products
  let unitPriceDivisor = 1;
  let custBaseSupplyValue = custTotal;
  let custSscl = 0;
  let custVat = 0;

  const selectedProfile = (taxEnabled && selectedProfileId) ? taxProfiles?.find((p: any) => p.id === selectedProfileId) : null;

  if (selectedProfile && taxEnabled) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    const isSsclSep = selectedProfile.tax1_show_separately === 1;
    const isVatSep = selectedProfile.tax2_show_separately === 1;

    if (isSsclSep && isVatSep) {
      // Option 3: Both SSCL & VAT Separate
      unitPriceDivisor = selectedProfile.tax2_compound ? ((1 + t1) * (1 + t2)) : (1 + t1 + t2);
      custBaseSupplyValue = unitPriceDivisor > 0 ? (custTotal / unitPriceDivisor) : custTotal;
      custSscl = custBaseSupplyValue * t1;
      custVat = selectedProfile.tax2_compound ? ((custBaseSupplyValue + custSscl) * t2) : (custBaseSupplyValue * t2);
    } else if (!isSsclSep && isVatSep) {
      // Option 2: SSCL Absorbed into supply value, VAT Separate (Standard 18%)
      unitPriceDivisor = 1 + t2;
      custBaseSupplyValue = unitPriceDivisor > 0 ? (custTotal / unitPriceDivisor) : custTotal;
      custVat = custTotal - custBaseSupplyValue;
      custSscl = 0;
    } else {
      // Option 1: Both Absorbed
      unitPriceDivisor = 1;
      custBaseSupplyValue = custTotal;
      custSscl = 0;
      custVat = 0;
    }
  }

  // Final Total for Customer is ALWAYS the product's final tax-inclusive price (VAT is never added on top)
  const custWithSSCL = custTotal;
  const jobWithSSCL = jobTotalCost;
  const jobSscl = 0;
  const jobVat = 0;

  // Financial calculations: Net revenue Rex keeps is the supply value excluding VAT
  const netRevenue = (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custTotal;
  const expectedProfit = netRevenue - jobTotalCost;
  const expectedMargin = netRevenue > 0 ? (expectedProfit / netRevenue) * 100 : 0;

  const restoreSnapshot = (snap: any) => {
    setDocNo(snap.docNo || 'FO/PD/02');
    setIssueNo(snap.issueNo || '01');
    setIssueDate(snap.issueDate || 'March 04, 2026');
    setQuoDate(snap.quoDate || new Date().toISOString().split('T')[0]);
    setVatNo(snap.vatNo !== undefined ? snap.vatNo : (lead?.vat || ''));
    setTinNo(snap.tinNo !== undefined ? snap.tinNo : (lead?.svat || ''));
    setQuotationNo(snap.quotationNo || '');
    setJobQty(snap.jobQty || '1');
    setAttention(snap.attention || '');
    setSubject(snap.subject || 'Supply of Finished Goods / Products');
    if (snap.customerName) setCustomerName(snap.customerName);
    if (snap.customerAddress || snap.address) setCustomerAddress(snap.customerAddress || snap.address);
    setTaxEnabled(snap.taxEnabled ?? true);
    setSelectedProfileId(snap.selectedProfileId || 'tp_opt2_sscl_absorbed_vat_sep');
    setJobItems(snap.jobItems || []);
    setAttachments(snap.attachments || []);
    setCustItems(snap.custItems || []);
    setCustTerms(snap.custTerms || snap.terms || snap.paymentTerms || '');
    setCustValidity(snap.custValidity || snap.validity || '30 Days');
    setCustDelivery(snap.custDelivery || snap.delivery || snap.deliveryTerms || '3-5 Working Days');
    if (snap.selectedTermsPresetId) setSelectedTermsPresetId(snap.selectedTermsPresetId);
    if (snap.bankDetailId !== undefined) setBankDetailId(snap.bankDetailId);
    else if (snap.bankDetails === 'none') setBankDetailId('none');
    setCustDiscount(snap.custDiscount !== undefined ? snap.custDiscount : 0);
    setCustDiscountType(snap.custDiscountType || 'percent');
    setCustDiscountAmount(snap.custDiscountAmount !== undefined ? snap.custDiscountAmount : (snap.custTotals?.discount !== undefined ? snap.custTotals.discount : 0));
  };

  // --- Auto Save Draft (DB) ---
  useEffect(() => {
    draftIdRef.current = draftId;
    currentIdRef.current = currentId;
  }, [draftId, currentId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isApprovedLocked) return;
      if (!selectedLeadId) return; 
      if (currentIdRef.current) return; 
      if (quoteIdParam && !initialLoadedRef.current) return; // Wait until quote is fully loaded from URL
      if (isAutoSavingRef.current) return; // Mutex: prevent duplicate concurrent auto-saves
      
      isAutoSavingRef.current = true;
      setSaveStatus('saving');
      const snapshot: any = {
        isProductQuotation: true,
        quotationCategory: 'product',
        isTaxInclusive: true,
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
        taxEnabled, selectedProfileId,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custDiscountType, custDiscountAmount,
        selectedTermsPresetId,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
        custTotals: {
          subtotal: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custSubtotal,
          discount: custDiscountAmt,
          total: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custTotal,
          withSSCL: custWithSSCL,
          grossTotal: custTotal
        },
        jobTotals: { totalMaterialCost: totalProductCost, totalMachiningCost: 0, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        productTotals: { totalCost: totalProductCost, revenue: netRevenue, margin: expectedMargin, profit: expectedProfit },
        selectedProfile, custSscl, custVat, jobSscl, jobVat,
        customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
        createdBy: user?.id || user?.username || '',
        createdByName: user?.name || user?.username || '',
        createdByUsername: user?.username || ''
      };
      
      const sub = custItems.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);
      const dis = custDiscountType === 'amount'
        ? Math.min(sub, Math.max(0, Number(custDiscountAmount) || 0))
        : sub * (Math.max(0, Number(custDiscount) || 0) / 100);
      const am = sub - dis;
      
      try {
        if (!draftIdRef.current) {
          const pregenDraftId = `PQ-DRAFT-${Date.now().toString().slice(-6)}`;
          draftIdRef.current = pregenDraftId;
          setDraftId(pregenDraftId);
          const curLead = selectedLeadId || 'WALK-IN';
          window.history.replaceState(null, '', `/crm/product-quotations/new/${curLead}?quoteId=${pregenDraftId}`);

          const res = await createQuotation({
            id: pregenDraftId,
            quotationNo: quotationNo || null,
            leadId: selectedLeadId || 'WALK-IN', type: 'product_draft', data: snapshot,
            totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate
          });
          if (res.success && res.quotation?.id) {
             setDraftId(res.quotation.id);
             draftIdRef.current = res.quotation.id;
          }
        } else {
          await updateQuotation(draftIdRef.current, {
            leadId: selectedLeadId || 'WALK-IN',
            type: 'product_draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate,
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
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [
    selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
    taxEnabled, selectedProfileId, custItems, custTerms, custValidity, custDelivery, custDiscount, custDiscountType, custDiscountAmount
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // AI Polish Item
  const handleAiPolishItem = async (itemId: number) => {
    const item = custItems.find(i => i.id === itemId);
    if (!item || !item.desc.trim()) return;
    setPolishingItemId(itemId);
    try {
      const enriched = await generateQuotationDescription({
        partTitle: item.desc.split('\n')[0] || 'Finished Product',
        rawDescription: item.desc,
        customerName: attention || customerName || 'Customer',
        quantity: item.qty || 1
      });
      if (enriched) {
        updateCustItem(itemId, 'desc', enriched);
        showToast('success', 'Description enhanced with AI!');
      }
    } catch (e: any) {
      showToast('error', e.message || 'AI polishing failed');
    } finally {
      setPolishingItemId(null);
    }
  };

  // Bulk AI Polish
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
          customerName: attention || customerName || 'Customer',
          quantity: item.qty || 1
        });
        if (enriched) {
          updateCustItem(item.id, 'desc', enriched);
          count++;
        }
      }
      showToast('success', `Polished ${count} item descriptions with AI!`);
    } catch (e: any) {
      showToast('error', e.message || 'AI polishing failed');
    } finally {
      setIsPolishingAll(false);
    }
  };

  // Save Quotation
  const handleSave = async () => {
    if (isApprovedLocked) {
      showToast('error', `Quotation is currently "${currentQuote?.status}" and locked. Please request an edit approval before saving changes.`);
      return;
    }
    if (!customerName.trim() && !selectedLeadId) {
      showToast('error', 'Please select or enter a Customer name first');
      return;
    }
    setIsSaving(true);
    try {
      const snapshot: any = {
        isProductQuotation: true,
        quotationCategory: 'product',
        isTaxInclusive: true,
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName, customerAddress,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custDiscountType, custDiscountAmount,
        selectedTermsPresetId,
        bankDetailId: bankDetailId || null,
        bankDetails: selectedBank ? JSON.stringify(selectedBank) : (bankDetailId === 'none' ? 'none' : null),
        custTotals: {
          subtotal: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custSubtotal,
          discount: custDiscountAmt,
          total: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custTotal,
          withSSCL: custWithSSCL,
          grossTotal: custTotal
        },
        jobTotals: { totalMaterialCost: totalProductCost, totalMachiningCost: 0, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        productTotals: { totalCost: totalProductCost, revenue: netRevenue, margin: expectedMargin, profit: expectedProfit },
        taxEnabled, selectedProfileId, selectedProfile, custSscl, custVat, jobSscl, jobVat,
        customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
        createdBy: user?.id || user?.username || '',
        createdByName: user?.name || user?.username || '',
        createdByUsername: user?.username || ''
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
          issueDate,
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
          showToast('success', 'Product Quotation updated successfully!');
          await loadVersions();
        } else {
          showToast('error', result.error || 'Update failed');
        }
      } else {
        result = await createQuotation({
          draftId: draftIdRef.current || undefined,
          quotationNo: quotationNo || null,
          leadId: selectedLeadId || 'WALK-IN',
          type: 'product',
          data: snapshot,
          totalAmount: amount,
          customAmount: null,
          selectedProfileId,
          taxEnabled,
          docNo,
          issueNo,
          issueDate,
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
            navigate(`/crm/product-quotations/new/${leadId}?quoteId=${newId}`, { replace: true });
          }
          showToast('success', `Product Quotation v${result.quotation?.version || '1'} saved!`);
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

  const handleLoadVersion = (v: any) => {
    try {
      const snap = typeof v.data === 'string' ? JSON.parse(v.data) : v.data;
      restoreSnapshot(snap);
      setCurrentId(v.id);
      setShowHistory(false);
      showToast('success', `Loaded v${v.version}`);
    } catch {
      showToast('error', 'Failed to load version');
    }
  };

  const handleDeleteVersion = async (v: any) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Version v${v.version} of this product quotation? This action cannot be undone.`,
      'Delete Quotation Version',
      { confirmLabel: 'Delete Version' }
    );
    if (!ok) return;

    try {
      await deleteQuotation(v.id);
      showToast('success', `Deleted Version v${v.version}`);
      if (currentId === v.id) {
        setCurrentId(null);
      }
      await loadVersions();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-muted">Loading...</div>;
  if (leadId && !lead) return <div className="p-8 text-center text-red-500">Lead or Customer not found.</div>;

  const mainVersions = savedVersions.filter(v => v.type === 'product');

  return (
    <div className="h-full -m-6 flex flex-col bg-background overflow-hidden relative">
      
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/product-quotations')} className="p-2 hover:bg-surface2 rounded-md transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
               <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                 <PackageCheck size={16} />
               </span>
               <h1 className="text-lg font-black text-primary tracking-tight">Product Quotation Builder</h1>
               <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                 Finished Goods
               </span>
               {saveStatus !== 'idle' && (
                 <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${saveStatus === 'saving' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                   {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved to Drafts'}
                 </span>
               )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {lead?.company || customerName || lead?.name || 'Walk-in Customer'} · Instant finished goods quote with zero BOMs
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Browse Quotation Templates"
          >
            <Bookmark size={14} className="text-emerald-500" /> Templates
          </button>

          <button onClick={() => setShowHistory(p => !p)}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ' + 
            (showHistory ? 'bg-surface2 border-emerald-500/50 text-primary' : 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2')}
          >
            <History size={14} /> History {showHistory ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>

          <button onClick={() => setPreviewCollapsed(p => !p)}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ' + 
            (previewCollapsed ? 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2' : 'bg-surface2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold')}
            title={previewCollapsed ? 'Expand Live Preview' : 'Collapse Live Preview'}
          >
            <Eye size={14} className="text-emerald-500" /> {previewCollapsed ? 'Show Preview' : 'Hide Preview'}
          </button>

          <button onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 border border-theme-subtle/40 text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Download size={14} /> Preview
          </button>

          {/* Approval Workflow Actions */}
          {currentQuote && (
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-theme-subtle">
              {(currentQuote.type === 'product_draft' || currentQuote.type === 'draft' || !currentId) ? (
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
                        if (window.confirm('Unlock this product quotation for editing? Its status will be reset to Draft.')) {
                          try {
                            await approveQuotationEdit(currentQuote.id, user?.name || 'Manager', 'Product quotation unlocked by manager');
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

          <Button 
            variant="primary" 
            icon={isApprovedLocked ? Lock : Save} 
            onClick={() => handleSave()} 
            disabled={isSaving || isApprovedLocked} 
            className={`text-xs ${isApprovedLocked ? 'opacity-60 cursor-not-allowed bg-slate-600 border-none' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-none shadow-sm'}`}
            title={isApprovedLocked ? 'Quotation is locked. Request edit approval from management to make changes.' : 'Save Quotation'}
          >
            {isSaving ? 'Saving...' : isApprovedLocked ? 'Locked (Approved)' : 'Save Quotation'}
          </Button>
        </div>
      </div>

      {/* LOCKED BANNER */}
      {isApprovedLocked && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
            <Lock size={15} className="shrink-0" />
            <span>
              <strong>Product Quotation is {currentQuote?.status} & Locked:</strong> Direct editing is disabled.
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
        <div className={'absolute top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-white text-sm font-semibold ' + (toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500')}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* HISTORY PANEL */}
      {showHistory && (
        <div className="border-b border-theme-subtle bg-surface/40 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Product Quotation History</span>
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
                      {v.id === currentId && <span className="ml-1.5 text-[9px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-full font-mono">ACTIVE</span>}
                    </div>
                    <div className="text-[10px] text-muted">
                      {v.date ? String(v.date).slice(0,10) : ''} · {formatCurrency(v.totalAmount || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleLoadVersion(v)}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors text-[11px] font-semibold">
                      <RotateCcw size={11} /> Load
                    </button>
                    <button 
                      onClick={() => handleDeleteVersion(v)}
                      className="p-1 text-muted/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={`Delete Version v${v.version}`}
                    >
                      <Trash2 size={13} />
                    </button>
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
        <GlassCard className="border border-theme-subtle/40 overflow-visible">
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
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          <UserCheck size={12} /> Lead
                        </button>
                      </div>
                    </div>

                    {clientType === 'customer' && (
                      <button type="button" onClick={() => setShowAddCustomer(true)} className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 border border-emerald-500/30 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 hover:bg-emerald-500/10 transition-colors">
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
                    className={docInputClass + " " + (selectedLeadId ? (clientType === 'customer' ? "border-blue-500/40" : "border-emerald-500/40") : "")}
                  />

                  {clientType === 'lead' && selectedLead?.description && (
                    <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        <FileText size={11} /> Lead Requirement / Description:
                      </p>
                      <p className="text-secondary leading-relaxed text-[11px]">{selectedLead.description}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Subject / Re: <span className="text-red-400">*</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Supply of Finished Goods..." className={docInputClass} />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Company / Customer Address</label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="e.g. No. 128, Main Street, Colombo 10"
                    className={docInputClass + " resize-none"}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Customer TIN No.</label>
                  <input
                    type="text"
                    value={tinNo || vatNo}
                    onChange={e => {
                      setTinNo(e.target.value)
                      setVatNo(e.target.value)
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
                                  ? 'bg-emerald-600/15 border-emerald-500 text-emerald-600 font-bold shadow-sm' 
                                  : 'bg-surface border-theme-subtle/70 text-secondary hover:border-emerald-500/50 hover:text-primary'
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
                        <FileText size={12} className="text-emerald-500" />
                        Terms & Conditions Preset
                      </label>
                      <span className="text-[9px] text-muted">From Settings</span>
                    </div>
                    <select
                      value={selectedTermsPresetId}
                      onChange={e => handleSelectTermsPreset(e.target.value)}
                      className={docInputClass + " bg-surface font-medium text-xs"}
                    >
                      <option value="">-- Choose Terms Preset --</option>
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
                      placeholder="e.g. 100% advance or 30 days credit" className={docInputClass} />
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
                      placeholder="e.g. Ex-Factory / 3-5 Working Days" className={docInputClass} />
                  </div>
                </div>

                {/* Bank Account for Remittance */}
                <div className="bg-surface2/60 border border-theme-subtle/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                      <Landmark size={12} className="text-emerald-500" />
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
                    <select value={currency} onChange={e => handleCurrencyChange(e.target.value)} className={docInputClass}>
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
              </div>
            </div>

            {/* Bottom Row: Scope & Attachments */}
            <div className="mt-6 pt-5 border-t border-theme-subtle/30 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-medium text-secondary">Job Scope / Supply Descriptions</label>
                  <button onClick={addJobItem}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
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
                  <label className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold">
                    <Plus size={12} /> Add File
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {attachments.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {attachments.map(att => (
                      <div key={att.id} className="relative w-16 h-16 border border-theme-subtle/50 rounded-lg overflow-hidden group bg-surface2">
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

        {/* Section 2: Product Quotation Lines (Finished Goods - IN PLACE OF BOMs!) */}
        <div className="border border-emerald-500/30 rounded-2xl bg-surface/40 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-subtle/40 pb-3">
            <div>
              <h2 className="text-[13px] font-bold text-primary flex items-center gap-2">
                <PackageCheck size={16} className="text-emerald-500" /> 
                Product Quotation Lines (Finished Goods)
              </h2>
              <p className="text-[11px] text-muted mt-0.5">
                Direct finished product selection from inventory. No Bill of Materials (BOM) needed.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="ghost" 
                size="sm" 
                icon={isPolishingAll ? Loader2 : Sparkles} 
                onClick={handleAiPolishAll} 
                disabled={isPolishingAll || custItems.length === 0}
                className="text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold border border-emerald-500/20 h-7 text-[11px]"
              >
                {isPolishingAll ? 'Polishing...' : '✨ AI Polish All'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={ShoppingBag} 
                onClick={() => {
                  setCatalogFilter('all');
                  setCatalogModalOpen(true);
                }} 
                className="text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold border border-emerald-500/20 h-7 text-[11px]"
              >
                Browse Catalog
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={Wrench} 
                onClick={() => {
                  setCatalogFilter('spares');
                  setCatalogModalOpen(true);
                }} 
                className="text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 font-bold border border-amber-500/20 h-7 text-[11px]"
                title="Browse products with spare parts breakdown"
              >
                Spare Parts Catalog
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                icon={Plus} 
                onClick={addCustItem} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-[11px] border-none shadow-xs"
              >
                Add Line
              </Button>
            </div>
          </div>

          {/* Quick Add Product Autocomplete */}
          <div className="bg-surface2/50 p-3 rounded-xl border border-theme-subtle/40 flex items-center gap-3">
            <span className="text-xs font-semibold text-muted shrink-0 flex items-center gap-1.5">
              <Plus size={13} className="text-emerald-500" /> Quick Add Product:
            </span>
            <div className="flex-1">
              <ProductSearchInput
                value={quickSearchText}
                onChange={setQuickSearchText}
                onSelect={addProductToItems}
                products={finishedProducts}
              />
            </div>
          </div>

          {/* Quotation Lines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="bg-surface/50 border-b border-theme-subtle/30 text-[10px] uppercase tracking-wider text-muted font-bold">
                  <th className="px-4 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5 min-w-[280px] w-full">Product & Description</th>
                  <th className="px-3 py-2.5 w-24 text-center">Stock</th>
                  <th className="px-3 py-2.5 w-24">Qty</th>
                  <th className="px-3 py-2.5 w-28">Unit Cost</th>
                  <th className="px-3 py-2.5 w-32">Unit Price</th>
                  <th className="px-4 py-2.5 w-36 text-right">Total ({currency})</th>
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
                          placeholder="Select finished product or enter description..." 
                          className="w-full bg-transparent outline-none text-[11px] font-medium resize-y min-h-[64px] p-2 leading-relaxed block border border-transparent hover:border-theme-subtle/30 focus:border-emerald-500/50 focus:bg-surface rounded pr-24"
                          rows={item.desc.split('\n').length > 1 ? Math.min(item.desc.split('\n').length, 6) : 2}
                        />
                        <div className="absolute top-1.5 right-1.5 flex items-center">
                          <button
                            type="button"
                            onClick={() => handleAiPolishItem(item.id)}
                            disabled={polishingItemId === item.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all opacity-80 group-hover/desc:opacity-100 disabled:opacity-50"
                            title="Enhance description using AI"
                          >
                            {polishingItemId === item.id ? (
                              <Loader2 size={11} className="animate-spin text-emerald-600" />
                            ) : (
                              <Sparkles size={11} className="text-emerald-600" />
                            )}
                            <span>{polishingItemId === item.id ? 'Polishing...' : 'AI Polish'}</span>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        (item.stock || 0) > 0 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-zinc-500/10 text-muted border-theme-subtle'
                      }`}>
                        {item.stock !== undefined ? `${item.stock}` : '-'}
                      </span>
                    </td>
                    <td className="p-0">
                      <input 
                        type="number" min="1" 
                        onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} 
                        value={item.qty} 
                        onChange={e => updateCustItem(item.id, 'qty', Number(e.target.value))} 
                        className={tableInputClass + " group-hover:bg-transparent text-center font-bold"} 
                      />
                    </td>
                    <td className="p-0">
                      <input 
                        type="number" min="0" 
                        onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} 
                        value={item.unitCost} 
                        onChange={e => updateCustItem(item.id, 'unitCost', Number(e.target.value))} 
                        className={tableInputClass + " group-hover:bg-transparent text-muted font-mono"} 
                      />
                    </td>
                    <td className="p-0">
                      <input 
                        type="number" min="0" 
                        onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} 
                        value={item.unitPrice} 
                        onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))} 
                        className={tableInputClass + " group-hover:bg-transparent font-bold text-emerald-600 dark:text-emerald-400 font-mono"} 
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-[11px] font-bold text-primary">
                      {formatCurrency(Number(item.qty || 0) * Number(item.unitPrice || 0))}
                    </td>
                    <td className="p-0">
                      <input 
                        type="text" 
                        value={item.note} 
                        onChange={e => updateCustItem(item.id, 'note', e.target.value)} 
                        placeholder="Optional note" 
                        className={tableInputClass + " group-hover:bg-transparent text-muted"} 
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeCustItem(item.id)} className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {custItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted italic">
                      No finished product lines added. Use the search bar above or click "Browse Catalog" to add finished products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Quotation Terms & Summary */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          
          {/* Terms & Conditions Details */}
          <div className="flex-1 w-full space-y-4">
            <div className="border border-theme-subtle/50 rounded-2xl bg-surface p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-theme-subtle/30 pb-3">
                <h3 className="text-xs font-bold text-primary flex items-center gap-2">
                  <FileText size={14} className="text-emerald-500" /> Commercial Terms & Conditions
                </h3>
                <span className="text-[10px] text-muted">Will appear on print & PDF</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface2/60 border border-theme-subtle/60 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-primary block">Quotation Terms & Conditions Preset</span>
                    <span className="text-[10px] text-muted">Select a pre-saved term preset or customize the fields below</span>
                  </div>
                </div>
                <div className="w-full sm:w-80">
                  <select
                    value={selectedTermsPresetId}
                    onChange={e => handleSelectTermsPreset(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:border-emerald-500 outline-none font-medium"
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
                  <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)} placeholder="e.g. 100% Advance" className={docInputClass + " bg-surface"} />
                </div>
                <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Validity</label>
                  <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)} placeholder="e.g. 30 Days" className={docInputClass + " bg-surface"} />
                </div>
                <div className="border border-theme-subtle/50 rounded-xl bg-surface/20 shadow-sm p-4">
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Delivery Timeline</label>
                  <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)} placeholder="e.g. 3-5 Working Days" className={docInputClass + " bg-surface"} />
                </div>
              </div>

              {/* Bank Account for Remittance */}
              <div className="bg-surface2/60 border border-theme-subtle/60 rounded-xl p-3 mt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Landmark size={15} className="text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold text-primary block">Remittance Bank Account</span>
                      <span className="text-[10px] text-muted">Select bank account to display on quotation print/PDF</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-80">
                    <select
                      value={bankDetailId}
                      onChange={e => setBankDetailId(e.target.value)}
                      className="w-full bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:border-emerald-500 outline-none font-medium"
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
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="border border-theme-subtle/50 rounded-2xl bg-surface shadow-sm p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <h3 className="text-[12px] font-bold text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                 <TrendingUp size={14} className="text-emerald-500"/> Quotation Summary
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-medium">
                    {taxEnabled && selectedProfile?.tax2_show_separately === 1 ? 'Supply Value (Excl. VAT)' : 'Sub Total'}
                  </span>
                  <span className="font-mono font-semibold text-secondary text-sm">
                    {formatCurrency(
                      taxEnabled && selectedProfile?.tax2_show_separately === 1
                        ? custBaseSupplyValue
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
                          className={`px-1.5 py-0.5 rounded font-bold transition-all ${custDiscountType === 'percent' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted hover:text-primary'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeToggle('amount')}
                          className={`px-1.5 py-0.5 rounded font-bold transition-all ${custDiscountType === 'amount' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted hover:text-primary'}`}
                        >
                          LKR
                        </button>
                      </div>
                    </div>
                    <span className="font-mono text-red-500/90 font-semibold text-[12px] text-right">
                      -{formatCurrency(taxEnabled && selectedProfile?.tax2_show_separately === 1 ? (custDiscountAmt / unitPriceDivisor) : custDiscountAmt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center bg-surface2 border rounded-md shadow-inner px-2 py-1 transition-all ${custDiscountType === 'percent' ? 'border-emerald-500/60 ring-1 ring-emerald-500/20 bg-emerald-500/5' : 'border-theme-subtle/50'}`}>
                      <span className="text-[11px] font-bold text-muted mr-1">%</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                        value={custDiscount}
                        onChange={e => handlePercentDiscountChange(e.target.value)}
                        onFocus={() => setCustDiscountType('percent')}
                        placeholder="0.00"
                        className="w-full bg-transparent text-right text-[12px] font-bold text-primary outline-none"
                      />
                    </div>
                    <div className={`flex items-center bg-surface2 border rounded-md shadow-inner px-2 py-1 transition-all ${custDiscountType === 'amount' ? 'border-emerald-500/60 ring-1 ring-emerald-500/20 bg-emerald-500/5' : 'border-theme-subtle/50'}`}>
                      <span className="text-[10px] font-bold text-muted mr-1">LKR</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
                        value={custDiscountAmount}
                        onChange={e => handleAmountDiscountChange(e.target.value)}
                        onFocus={() => setCustDiscountType('amount')}
                        placeholder="0.00"
                        className="w-full bg-transparent text-right text-[12px] font-bold text-primary outline-none"
                      />
                    </div>
                  </div>
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
                        <span className="text-muted font-medium">{selectedProfile.tax2_name} ({selectedProfile.tax2_rate}% Extracted)</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(custVat)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="pt-4 mt-2 border-t border-dashed border-theme-subtle/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[12px] font-bold text-secondary uppercase tracking-wider">Grand Total</div>
                      <div className="text-[9.5px] text-muted">Final Price (VAT Inclusive)</div>
                    </div>
                    <div className="text-[24px] leading-none font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(custWithSSCL)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Margin Indicator */}
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

                <div className="flex justify-between items-center text-xs">
                   <span className="text-muted font-medium">Total Cost</span>
                   <span className="font-mono text-muted">{formatCurrency(jobTotalCost)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                   <span className="text-muted font-medium">{selectedProfile?.tax2_show_separately === 1 && taxEnabled ? 'Net Revenue (Excl. VAT)' : 'Revenue'}</span>
                   <span className="font-mono text-primary font-bold">{formatCurrency(netRevenue)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-theme-subtle/50">
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

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        {!previewCollapsed ? (
          <div className="w-[450px] xl:w-[500px] shrink-0 border-l border-theme-subtle flex flex-col bg-surface/40 relative z-10">
             {/* TABS */}
             <div className="flex items-center justify-between p-2 border-b border-theme-subtle bg-surface/80 backdrop-blur">
               <div className="flex items-center gap-1 flex-1">
                 <button className="flex-1 py-1.5 text-xs font-bold bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 rounded-md shadow-sm border border-emerald-500/20 whitespace-nowrap shrink-0">
                   Live Preview
                 </button>
                 <button 
                   onClick={() => handleAiPolishAll()}
                   className="flex-1 py-1.5 text-xs font-bold text-muted hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 rounded-md hover:bg-surface2 whitespace-nowrap shrink-0"
                   title="Use Groq AI to polish all line item descriptions"
                 >
                   <span className="text-emerald-500"><Wand2 size={13} /></span> AI Co-Pilot
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
                           isProductQuotation: true,
                           quotationCategory: 'product',
                           isTaxInclusive: true,
                           custItems, custDiscount, custDiscountType, custDiscountAmount, boms: [],
                           custTotals: {
                             subtotal: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custSubtotal,
                             discount: custDiscountAmt,
                             total: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custTotal,
                             withSSCL: custWithSSCL,
                             grossTotal: custTotal
                           },
                           jobTotals: { totalMaterialCost: totalProductCost, totalMachiningCost: 0, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
                           taxEnabled, selectedProfileId,
                           custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat,
                           customerAddress, customerName, customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
                           bankDetailId, bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null)
                        }}
                        type="main"
                        lead={currentEntity || lead}
                        settings={settings}
                     />
                   </div>
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
              className="flex-1 flex items-center justify-center cursor-pointer select-none py-4 text-muted hover:text-emerald-500 transition-colors"
              style={{ writingMode: 'vertical-rl' }}
              title="Expand Live Preview"
            >
              <div className="flex items-center gap-2 tracking-widest text-[11px] font-bold uppercase">
                <Eye size={13} className="text-emerald-500" />
                <span>Live Preview</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL PREVIEW MODAL */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={'Preview Product Quotation'} size="xl">
        <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
          <div id="product-quote-print-container">
            <QuotationPrintView 
              data={{
                 docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
                 isProductQuotation: true,
                 quotationCategory: 'product',
                 isTaxInclusive: true,
                 custItems, custDiscount, custDiscountType, custDiscountAmount, boms: [],
                 custTotals: {
                   subtotal: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custSubtotal,
                   discount: custDiscountAmt,
                   total: (selectedProfile?.tax2_show_separately === 1 && taxEnabled) ? custBaseSupplyValue : custTotal,
                   withSSCL: custWithSSCL,
                   grossTotal: custTotal
                 },
                 jobTotals: { totalMaterialCost: totalProductCost, totalMachiningCost: 0, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
                 taxEnabled, selectedProfileId,
                 custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat,
                 customerAddress, customerName, customerCompany: currentEntity?.company || selectedCustomer?.company || selectedLead?.company || currentEntity?.name || customerName,
                 bankDetailId, bankDetails: selectedBank ? selectedBank : (bankDetailId === 'none' ? 'none' : null)
              }}
              type="main"
              lead={currentEntity || lead}
              settings={settings}
            />
          </div>
          
          {currentQuote && currentQuote.status !== 'Approved' && (
            <div className="mt-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>Status is <strong>{currentQuote.status || 'Draft'}</strong>. Quotation should be formally approved before issuing or sending to customer.</span>
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
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shrink-0 shadow-xs"
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
              disabled={currentQuote?.status === 'Pending Approval'}
              onClick={() => {
                if (currentQuote?.status === 'Pending Approval') {
                  alert('This quotation is currently Pending Approval and cannot be emailed until approved.');
                  return;
                }
                if (currentQuote && currentQuote.status !== 'Approved') {
                  if (!window.confirm(`Notice: This quotation is currently "${currentQuote.status || 'Draft'}" and has not been formally approved yet. Do you still wish to email the customer?`)) {
                    return;
                  }
                }
                setEmailModalOpen(true);
              }} 
              className={`font-semibold ${currentQuote?.status === 'Pending Approval' ? 'opacity-50 cursor-not-allowed bg-surface border border-theme-subtle/40 text-muted' : 'bg-surface border border-theme-subtle/40 hover:bg-surface2 text-blue-600'}`}
            >
              Email Customer
            </Button>
            
            <Button 
              variant="ghost" 
              icon={FileDown} 
              disabled={currentQuote?.status === 'Pending Approval'}
              onClick={async () => {
                if (currentQuote?.status === 'Pending Approval') {
                  alert('This quotation is currently Pending Approval and cannot be exported until approved.');
                  return;
                }
                const target = (document.getElementById('product-quote-print-container')?.querySelector('#print-section') as HTMLElement) || document.getElementById('print-section') || 'print-section';
                await exportPdf(target, `Product_Quotation_${quotationNo || 'PQ'}.pdf`);
              }} 
              className={`font-semibold ${currentQuote?.status === 'Pending Approval' ? 'opacity-50 cursor-not-allowed bg-surface border border-theme-subtle/40 text-muted' : 'bg-surface border border-theme-subtle/40 hover:bg-surface2'}`}
            >
              Export PDF
            </Button>
            
            <Button 
              variant="primary" 
              icon={Printer} 
              disabled={currentQuote?.status === 'Pending Approval'}
              onClick={() => {
                if (currentQuote?.status === 'Pending Approval') {
                  alert('This quotation is currently Pending Approval and cannot be printed until approved.');
                  return;
                }
                const target = (document.getElementById('product-quote-print-container')?.querySelector('#print-section') as HTMLElement) || document.getElementById('print-section');
                printElement(target ? (target.id || 'print-section') : 'print-section', quotationNo || 'Product_Quotation');
              }} 
              className={currentQuote?.status === 'Pending Approval' ? 'opacity-50 cursor-not-allowed bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'}
            >
              Print Quotation
            </Button>
          </div>
        </div>
      </Modal>

      {/* CATALOG BROWSE MODAL */}
      <Modal 
        isOpen={catalogModalOpen} 
        onClose={() => setCatalogModalOpen(false)} 
        title="Finished Products Catalog" 
        size="4xl"
      >
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-surface2 rounded-xl border border-theme-subtle shrink-0">
              <button
                type="button"
                onClick={() => setCatalogFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  catalogFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
              >
                All Products ({finishedProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogFilter('spares')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  catalogFilter === 'spares'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <Wrench size={12} />
                With Spare Parts ({finishedProducts.filter(p => getProductSpareParts(p, inventory).length > 0).length})
              </button>
            </div>

            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by name, sku, category..."
                className="w-full bg-surface2 border border-theme-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {finishedProducts
              .filter(p => {
                if (catalogFilter === 'spares' && getProductSpareParts(p, inventory).length === 0) return false;
                if (!catalogSearch.trim()) return true;
                const q = catalogSearch.toLowerCase();
                return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
              })
              .map(p => {
                const pSpares = getProductSpareParts(p, inventory);

                return (
                  <div key={p.id} className="p-3.5 rounded-xl border border-theme-subtle bg-surface hover:border-emerald-500/50 hover:bg-surface2/40 transition-all flex justify-between items-center group">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary truncate">{p.name}</span>
                        {p.sku && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface2 text-muted border border-theme-subtle">
                            {p.sku}
                          </span>
                        )}
                        {pSpares.length > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-0.5">
                            <Wrench size={10} /> {pSpares.length} Spares
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-muted truncate mt-0.5">{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                        <span className="text-muted">Stock: <strong className={(p.quantity || 0) > 0 ? 'text-primary' : 'text-amber-500'}>{p.quantity || 0} {p.uom || 'pcs'}</strong></span>
                        <span className="text-muted">Unit Cost: <strong className="font-mono text-muted">{formatCurrency(p.unitCost || p.cost || 0)}</strong></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.unitPrice || p.price || 0)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {pSpares.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Wrench}
                            onClick={() => openSparePartsModal(p)}
                            className="h-7 text-[11px] px-2.5 font-bold border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            title="Select specific spare parts from this product to quote"
                          >
                            Spare Parts ({pSpares.length})
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Plus}
                          onClick={() => {
                            addProductToItems(p);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[11px] px-3"
                          title="Add complete whole product to quotation"
                        >
                          {pSpares.length > 0 ? 'Add Whole Unit' : 'Add to Quote'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>

      {/* SPARE PARTS BREAKDOWN PICKER MODAL */}
      <Modal
        isOpen={Boolean(selectedProductForSpares)}
        onClose={() => setSelectedProductForSpares(null)}
        title={selectedProductForSpares ? `Spare Parts Breakdown: ${selectedProductForSpares.name}` : 'Spare Parts Breakdown'}
        size="3xl"
      >
        {selectedProductForSpares && (() => {
          const allSpares = getProductSpareParts(selectedProductForSpares, inventory);
          const filteredSpares = allSpares.filter((sp: any) => {
            if (!sparesSearch.trim()) return true;
            const q = sparesSearch.toLowerCase();
            return (sp.name || '').toLowerCase().includes(q) || (sp.partNo || '').toLowerCase().includes(q) || (sp.sku || '').toLowerCase().includes(q) || (sp.description || '').toLowerCase().includes(q);
          });
          const selectedSpares = allSpares.filter((sp: any) => selectedSpareMap[sp.id]?.selected);
          const selectedCount = selectedSpares.length;
          const selectedTotal = selectedSpares.reduce((sum: number, sp: any) => {
            const qty = selectedSpareMap[sp.id]?.qty || 1;
            return sum + (Number(sp.unitPrice || 0) * qty);
          }, 0);
          const allSelected = allSpares.length > 0 && allSpares.every((sp: any) => selectedSpareMap[sp.id]?.selected);

          return (
            <div className="p-5 space-y-4">
              {/* Product Header Card */}
              <div className="p-3.5 rounded-xl bg-surface2/40 border border-theme-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                      <span>{selectedProductForSpares.name}</span>
                      {selectedProductForSpares.sku && (
                        <span className="font-mono text-[10px] text-muted">({selectedProductForSpares.sku})</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Select specific replacement parts requested by the customer to quote individually.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Package}
                  onClick={() => {
                    addProductToItems(selectedProductForSpares);
                    setSelectedProductForSpares(null);
                  }}
                  className="text-[11px] shrink-0"
                >
                  Quote Whole Unit ({formatCurrency(selectedProductForSpares.unitPrice || selectedProductForSpares.price || 0)})
                </Button>
              </div>

              {/* Filter and Bulk Selection */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={sparesSearch}
                    onChange={e => setSparesSearch(e.target.value)}
                    placeholder="Filter spare parts (name, part #, sku)..."
                    className="w-full bg-surface2 border border-theme-subtle rounded-xl pl-8 pr-3 py-1.5 text-xs text-primary outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllSpares}
                    className="text-[11px] font-semibold text-rex-600 dark:text-rex-400 hover:underline"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Spare Parts List */}
              <div className="max-h-[50vh] overflow-y-auto divide-y divide-theme-subtle/40 border border-theme-subtle rounded-xl bg-surface">
                {filteredSpares.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">
                    No spare parts found matching "{sparesSearch}".
                  </div>
                ) : (
                  filteredSpares.map((sp: any) => {
                    const isChecked = Boolean(selectedSpareMap[sp.id]?.selected);
                    const qty = selectedSpareMap[sp.id]?.qty || 1;
                    const price = Number(sp.unitPrice || 0);

                    return (
                      <div
                        key={sp.id}
                        onClick={() => toggleSpareSelection(sp.id)}
                        className={`p-3 flex items-center justify-between gap-3 hover:bg-surface2/40 cursor-pointer transition-colors ${
                          isChecked ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSpareSelection(sp.id)}
                            onClick={e => e.stopPropagation()}
                            className="rounded border-theme-subtle text-amber-600 focus:ring-amber-500/30 w-4 h-4 cursor-pointer"
                          />
                          <div className="w-11 h-11 rounded-xl bg-surface2 border border-theme-subtle flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                            {sp.imageUrl ? (
                              <img src={sp.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Wrench size={16} className="text-amber-500/70" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                {sp.partNo || 'PART'}
                              </span>
                              <span className="text-xs font-bold text-primary">{sp.name}</span>
                              {sp.sku && (
                                <span className="text-[10px] text-muted font-mono">({sp.sku})</span>
                              )}
                            </div>
                            {sp.description && (
                              <p className="text-[10px] text-muted truncate mt-0.5">{sp.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                              <span>Req in unit: {sp.qtyPerAssembly || 1} {sp.uom || 'pcs'}</span>
                              {sp.stock !== undefined && (
                                <span className={sp.stock > 0 ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                                  • {sp.stock > 0 ? `${sp.stock} in stock` : 'Out of stock'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={qty}
                              onChange={e => updateSpareQty(sp.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 text-center bg-surface2 border border-theme-subtle rounded font-mono font-bold text-xs py-1"
                            />
                          </div>

                          <div className="text-right min-w-[90px]">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                              {formatCurrency(price * qty)}
                            </span>
                            <span className="text-[10px] text-muted font-mono block">
                              @{formatCurrency(price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer with Add Selected Action */}
              <div className="pt-2 flex items-center justify-between border-t border-theme-subtle">
                <span className="text-xs text-secondary font-medium">
                  <strong>{selectedCount}</strong> {selectedCount === 1 ? 'part' : 'parts'} selected
                  {selectedCount > 0 && ` (Total: ${formatCurrency(selectedTotal)})`}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProductForSpares(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    disabled={selectedCount === 0}
                    onClick={addSelectedSparesToQuote}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Add Selected Spare Parts ({selectedCount})
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* SEND EMAIL MODAL */}
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

      {/* ADD CUSTOMER MODAL */}
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

      {/* TEMPLATES MODAL */}
      <QuotationTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectForNewQuote={(tpl: any) => {
          navigate(`/crm/product-quotations/new?templateId=${tpl.id}`);
        }}
      />

      {/* Reject Product Quotation Reason Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Product Quotation"
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-secondary">
              Please enter the reason for rejecting this quotation. The creator will see this note to make necessary corrections.
            </p>
            <textarea
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              placeholder="e.g. Price too low, incorrect items or terms..."
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
                    showToast('error', 'Product Quotation rejected with reason');
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
          title="Request Product Quotation Edit Approval"
          size="sm"
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-secondary leading-relaxed">
              Quotation <strong>{quotationNo || currentQuote?.quotationNo || docNo}</strong> has been approved and locked. To modify products, quantities, prices, or terms, please state the reason for revision. Management will review your request.
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
                placeholder="e.g. Customer requested price match, quantity change, or updated warranty terms..."
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
