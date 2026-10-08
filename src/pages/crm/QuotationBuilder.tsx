import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Download, Save, History, Package, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2, LineChart } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { CustomerModal } from '@/components/crm/CustomerModal'
import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'
import { createCustomer } from '@/lib/api'
import { useTaxProfiles } from '@/hooks/useFinance'
import { useCurrencies, useTaxes } from '@/hooks/useFinance'
import { createQuotation, fetchQuotations, updateQuotation, fetchAllCustomerGRNs } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'

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
  onSelect: (leadId: string, name: string) => void
  leads: any[]
  className?: string
}

const LeadSearchInput: React.FC<LeadSearchProps> = ({ value, onChange, onSelect, leads, className = '' }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  
  const filtered = value.length > 0
    ? leads.filter(l => (l.name || '').toLowerCase().includes(value.toLowerCase()) || (l.company || '').toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <input type="text" value={value} className={className}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} autoComplete="off" placeholder="Type to search customer..." />
      {open && filtered.length > 0 && createPortal(
        <ul style={{ top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY, left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, width: Math.max(wrapRef.current?.getBoundingClientRect().width || 0, 300) }} className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle/40 shadow-glass rounded-xl py-1 max-h-48 overflow-y-auto">
          {filtered.map((l, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); const disp = l.company || l.name; onSelect(l.id, disp); onChange(disp); setOpen(false) }}>
              <span className="text-primary font-medium">{l.company || l.name}</span>
              {l.company && l.name && <span className="text-[10px] text-muted ml-2">{l.name}</span>}
            </li>
          ))}
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
  const [searchParams] = useSearchParams()
  const quoteIdParam = searchParams.get('quoteId')
  const previewParam = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  
  const { data: leads, loading } = useLeads()
  const { data: customers } = useCustomers()
  const { data: inventory } = useInventory()
  const { settings } = useSettings()
  const { user } = useAuth()
  const { data: currencies } = useCurrencies()
  const { data: taxes } = useTaxes()
  const [currency, setCurrency] = useState('LKR')
  const { data: taxProfiles } = useTaxProfiles()
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  
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
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const loadVersions = useCallback(async () => {
      if (!leadId) return
      try {
        const data = await fetchQuotations(leadId)
        setSavedVersions(data)
        
        // Auto-load if quoteId is in URL
        if (quoteIdParam) {
           const target = data.find((v: any) => v.id === quoteIdParam)
           if (target && currentId !== target.id) {
              const snap = typeof target.data === 'string' ? JSON.parse(target.data) : target.data
              restoreSnapshot(snap)
              if (target.type === 'draft') {
                 setDraftId(target.id)
              } else {
                 setCurrentId(target.id)
              }
              
              if (previewParam) {
                 setShowPreview(true)
              }
           }
        }
      } catch (err) {
        console.error(err)
      }
    }, [leadId, quoteIdParam, previewParam, currentId])

  useEffect(() => { loadVersions() }, [loadVersions])

  // --- Document Details ---
  const [docNo, setDocNo] = useState('FO/PD/02')
  const [issueNo, setIssueNo] = useState('01')
  const [issueDate, setIssueDate] = useState('March 04, 2026')
  const [quoDate, setQuoDate] = useState(new Date().toISOString().split('T')[0])
  const [vatNo, setVatNo] = useState(lead?.vat || '')
  const [tinNo, setTinNo] = useState(lead?.svat || '')
  const [quotationNo, setQuotationNo] = useState('')
  const [jobQty, setJobQty] = useState('1')
  const [attention, setAttention] = useState('')
  const [subject, setSubject] = useState('To machining parts as per given sample')
  const [customerName, setCustomerName] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [allGrns, setAllGrns] = useState<any[]>([]);
  
  useEffect(() => {
    fetchAllCustomerGRNs().then(setAllGrns).catch(() => {});
  }, []);
  
  const leadGrns = allGrns.filter(g => g.leadId === selectedLeadId || g.customerId === selectedLeadId);
    const currentEntity = customers?.find((c: any) => c.id === selectedLeadId) || leads?.find((l: any) => l.id === selectedLeadId);
    const currentContacts = (() => { try { return typeof currentEntity?.contacts === 'string' ? JSON.parse(currentEntity.contacts) : (currentEntity?.contacts || []); } catch { return []; } })();


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

  const handleSelectLeadOrCustomer = (id: string, name: string) => {
    setSelectedLeadId(id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      if (lead.company) setAttention(lead.name);
      
      let cust = null;
      if (lead.customerId) cust = customers.find((c: any) => c.id === lead.customerId);
      
      if (cust) {
        setVatNo(cust.vat || cust.svat || '');
        if (cust.paymentTerms) {
          setCustTerms(cust.paymentTerms);
        } else {
          let terms = '';
          if (cust.requiresAdvance) terms = 'Advance required. ';
          if (cust.creditDays > 0) terms += `${cust.creditDays} days credit.`;
          setCustTerms(terms.trim());
        }
        if (cust.deliveryTerms) setCustDelivery(cust.deliveryTerms);
        
        const userPrefix = user?.prefix ? `${user.prefix}-` : '';
        const custPrefix = cust.prefix ? `${cust.prefix}-` : '';
        const seq = Date.now().toString().slice(-4);
        setQuotationNo(`${userPrefix}${custPrefix}${seq}`);
      } else {
        setVatNo(lead.vat || lead.svat || '');
        const userPrefix = user?.prefix ? `${user.prefix}-` : '';
        const seq = Date.now().toString().slice(-4);
        setQuotationNo(`${userPrefix}${seq}`);
      }
    }
  };

  useEffect(() => {
     if (leadId && lead) {
        setCustomerName(lead.company || lead.name)
        setSelectedLeadId(lead.id)
        if (!attention) setAttention(lead.name || '')
     }
  }, [leadId, lead])

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
  const [custDiscount, setCustDiscount] = useState(0)

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
  const custDiscountAmt = custSubtotal * (Number(custDiscount) / 100)
  const custTotal = custSubtotal - custDiscountAmt
  
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
    setTinNo(snap.tinNo !== undefined ? snap.tinNo : (lead?.svat || ''))
    setQuotationNo(snap.quotationNo || '')
    setJobQty(snap.jobQty || '1')
    setAttention(snap.attention || '')
    setSubject(snap.subject || 'To machining parts as per given sample')
    setTaxEnabled(snap.taxEnabled ?? true)
    setSelectedProfileId(snap.selectedProfileId || '')
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
    setCustTerms(snap.custTerms || '')
    setCustValidity(snap.custValidity || '30 Days')
    setCustDelivery(snap.custDelivery || '')
    setCustDiscount(snap.custDiscount || 0)
  }


  // --- Auto Save Draft (DB) ---
  const draftIdRef = useRef<string | null>(draftId);
  const currentIdRef = useRef<string | null>(currentId);
  
  useEffect(() => {
    draftIdRef.current = draftId;
    currentIdRef.current = currentId;
  }, [draftId, currentId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Don't save completely empty state
      if (!selectedLeadId) return; // Only auto-save if a customer is explicitly selected 
      if (currentIdRef.current) return; // If we are editing an active version, don't auto-save as draft
      
      setSaveStatus('saving');
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        taxEnabled, selectedProfileId,
        boms,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
        selectedProfile, custSscl, custVat, jobSscl, jobVat
      }
      
      const sub = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
      const dis = sub * (Number(custDiscount) / 100);
      const am = sub - dis;
      
      try {
        if (!draftIdRef.current) {
          const res = await createQuotation({
            leadId: selectedLeadId || 'WALK-IN', type: 'draft', data: snapshot,
            totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate
          });
          if (res.success && res.quotation) {
             setDraftId(res.quotation.id);
             draftIdRef.current = res.quotation.id;
          }
        } else {
          await updateQuotation(draftIdRef.current, {
            type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate
          });
        }
        setSaveStatus('saved');
        setTimeout(() => {
           setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
        }, 2000);
      } catch (err) {
        setSaveStatus('idle');
      }
    }, 2500)
    
    return () => clearTimeout(timer)
  }, [
    selectedLeadId, docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
    taxEnabled, selectedProfileId, boms, custItems, custTerms, custValidity, custDelivery, custDiscount
  ])


  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showMarginModal, setShowMarginModal] = useState(false)
  const [marginInput, setMarginInput] = useState('35')

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const autoGenerateCustomerQuote = () => {
    const margin = Number(marginInput);
    if (isNaN(margin) || margin < 0) {
      showToast('error', 'Invalid margin percentage!');
      return;
    }
    
    const newCustItems = boms.map((b, idx) => {
        const autoMatTotal = b.autoMats.reduce((s, m) => s + Number(m.platePrice) + Number(m.shaftPrice), 0)
        const manualMatTotal = b.manualMats.reduce((s, m) => s + Number(m.qty) * Number(m.unitPrice), 0)
        let machCost = 0;
        if (b.procState) {
            machCost = Object.values(b.procState).reduce((s, p) => s + (Number(p.quoHr || 0) * Number(p.hrRate || p.rate || 0)) + (Number(p.setTime || 0) * Number(p.setTimeRate || 0)), 0)
        }
        
        const cost = autoMatTotal + manualMatTotal + machCost;
        if (cost <= 0) return null;
        
        const targetTotal = cost * (1 + (margin / 100));
        
        const matTypes = [...b.autoMats.map(m => m.type || m.shape || m.material), ...b.manualMats.map(m => m.material)].filter(Boolean);
        const uniqueMats = Array.from(new Set(matTypes)).join(', ');
        
        const itemName = b.title.startsWith('BOM Part ') ? 'Machined Component' : b.title.toUpperCase();
        let finalDesc = `Precision manufacturing and fabrication of ${itemName} as per the provided technical specifications and requirements.`;
        
        if (b.description) {
            finalDesc += `\n\nScope of work includes: ${b.description}`;
        }
        
        return {
            id: Date.now() + idx,
            desc: finalDesc,
            qty: 1,
            unitPrice: Math.round(targetTotal),
            note: ''
        }
    }).filter(Boolean) as { id: number; desc: string; qty: number; unitPrice: number; note: string }[];

    if (newCustItems.length === 0) {
        showToast('error', 'No BOMs have cost > 0 to generate a quote.');
        return;
    }

    setCustItems(newCustItems);
    setShowMarginModal(false);
    showToast('success', `✨ Auto-generated Customer Quote with ${margin}% margin!`);
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
    setShowMarginModal(true);
  };

  const handleSave = async () => {
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
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject, attachments, customerName,
        boms: bomsWithTotals,
        custItems, custTerms, custValidity, custDelivery, custDiscount,
        custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
        jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }
      }

      const amount = custWithSSCL

      const result = await createQuotation({
        leadId: selectedLeadId || 'WALK-IN', type: 'main', data: snapshot,
        totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate
      })
      if (result.success) {
        setCurrentId(result.quotation?.id || null)
        
        showToast('success', `Quotation v${result.quotation?.version || ''} saved!`)
        await loadVersions()
      } else {
        showToast('error', result.error || 'Save failed')
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

  const [showPreview, setShowPreview] = useState(false)

  if (loading) return <div className="p-8 text-center animate-pulse text-muted">Loading...</div>
  if (leadId && !lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>

  const mainVersions = savedVersions.filter(v => v.type === 'main')

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      
      {/* TOPBAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/crm/quotations')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-lg font-black text-primary tracking-tight">Quotation Builder</h1>
               {saveStatus !== 'idle' && (
                 <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${saveStatus === 'saving' ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'}`}>
                   {saveStatus === 'saving' ? 'Auto-saving...' : 'Saved to Drafts'}
                 </span>
               )}
            </div>
            <p className="text-[11px] text-muted mt-0.5">{lead?.name || customerName || 'Walk-in Customer'}{lead?.company ? ' · ' + lead.company : ''}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(p => !p)}
            className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ' + 
            (showHistory ? 'bg-surface2 border-rex-500/50 text-primary' : 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2')}
          >
            <History size={14} /> History {showHistory ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          <button onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-theme-subtle/40 text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Download size={14} /> Preview
          </button>
          <Button variant="primary" icon={Save} onClick={() => handleSave()} disabled={isSaving} className="text-xs">
            {isSaving ? 'Saving...' : 'Save Quotation'}
          </Button>
        </div>
      </div>

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
                  <button onClick={() => handleLoadVersion(v)}
                    className="flex items-center gap-1 px-2 py-1 bg-rex-500/10 text-rex-500 rounded-lg hover:bg-rex-500/20 transition-colors text-[11px] font-semibold">
                    <RotateCcw size={11} /> Load
                  </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] text-muted">Customer / Lead <span className="text-red-400">*</span></label>
                    <button type="button" onClick={() => setShowAddCustomer(true)} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded-lg hover:bg-blue-500/10 transition-colors">
                      <Plus size={10} /> Add New Customer
                    </button>
                  </div>
                  <LeadSearchInput
                    value={customerName}
                    onChange={setCustomerName}
                    onSelect={handleSelectLeadOrCustomer}
                    leads={[...(customers || []), ...(leads || [])]}
                    className={docInputClass + " " + (selectedLeadId ? "border-emerald-500/30" : "")}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] text-muted mb-1.5">Subject / Re: <span className="text-red-400">*</span></label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Supply and fabrication of..." className={docInputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Attention To</label>
                    <div className="relative">
                      <input type="text" value={attention} onChange={e => setAttention(e.target.value)}
                        placeholder="Mr. / Ms." className={`${docInputClass} pr-7`} />
                      {currentEntity && (currentContacts.length > 0 || currentEntity.name) && (
                        <>
                          <select 
                            className="absolute right-0 top-0 bottom-0 w-8 opacity-0 cursor-pointer z-10"
                            onChange={e => e.target.value && setAttention(e.target.value)}
                            title="Select from contacts"
                            value=""
                          >
                            <option value="">(Select Contact)</option>
                            {currentEntity.name && <option value={currentEntity.name}>{currentEntity.name} (Primary)</option>}
                            {currentContacts.map((c: any, i: number) => (
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
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Customer VAT</label>
                    <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)}
                      placeholder="VAT Reg. No." className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Payment Terms</label>
                    <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)}
                      placeholder="e.g. 30 days credit" className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted mb-1.5">Delivery Terms</label>
                    <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)}
                      placeholder="e.g. Ex-works" className={docInputClass} />
                  </div>
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
                          <td className="p-0">
                            <textarea 
                              value={item.desc} 
                              onChange={e => updateCustItem(item.id, 'desc', e.target.value)} 
                              placeholder="Item / service description..." 
                              className="w-full bg-transparent outline-none text-[11px] font-medium resize-y min-h-[70px] p-2 leading-relaxed block border border-transparent hover:border-theme-subtle/30 focus:border-primary/40 focus:bg-surface rounded"
                              rows={item.desc.split('\n').length > 1 ? Math.min(item.desc.split('\n').length, 8) : 1}
                            />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                    <span className="text-muted font-medium">{taxEnabled && selectedProfile?.tax1_show_separately === 0 ? `Sub Total (incl. ${selectedProfile.tax1_name})` : 'Sub Total'}</span>
                    <span className="font-mono font-semibold text-secondary text-sm">{formatCurrency(taxEnabled && selectedProfile?.tax1_show_separately === 0 ? (custSubtotal + custSubtotal * (Number(selectedProfile.tax1_rate)/100)) : custSubtotal)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs group">
                    <span className="text-muted font-medium">Discount</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface2 border border-theme-subtle/50 rounded-md shadow-inner p-1">
                          <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                            className="w-14 bg-transparent text-center text-[12px] font-bold text-primary outline-none" />
                          <span className="text-[10px] text-muted pr-1">%</span>
                      </div>
                      <span className="font-mono text-red-500/90 font-semibold text-[12px] w-20 text-right">-{formatCurrency(taxEnabled && selectedProfile?.tax1_show_separately === 0 ? custDiscountAmt * (1 + Number(selectedProfile.tax1_rate)/100) : custDiscountAmt)}</span>
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
                
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2 mb-3 border-b border-theme-subtle/50 pb-2">
                    <button onClick={() => setTaxEnabled(t => !t)} className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}>
                      <span className={`block w-2.5 h-2.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                    {taxEnabled && (
                      <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
                        className="flex-1 bg-surface border border-theme-subtle px-1.5 py-1 rounded text-[10px] outline-none focus:border-blue-500">
                        <option value="">— Select Tax Profile —</option>
                        {taxProfiles?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
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
\n        </div>
        
        </div>
        {/* RIGHT COLUMN: AI & LIVE PREVIEW */}
        <div className="w-[450px] xl:w-[500px] shrink-0 border-l border-theme-subtle flex flex-col bg-surface/40 relative z-10">
           {/* TABS */}
           <div className="flex items-center gap-1 p-2 border-b border-theme-subtle bg-surface/80 backdrop-blur">
             <button className="flex-1 py-2 text-xs font-bold bg-white dark:bg-zinc-800 text-primary rounded-lg shadow-sm border border-theme-subtle/40">
               Live Preview
             </button>
             <button className="flex-1 py-2 text-xs font-bold text-muted hover:text-primary transition-colors flex items-center justify-center gap-1.5 rounded-lg hover:bg-surface2">
               <span className="text-purple-500"><Wand2 size={13} /></span> AI Co-Pilot
             </button>
           </div>
           
           {/* LIVE PREVIEW CANVAS */}
           <div className="flex-1 overflow-y-auto bg-gray-500/5 relative p-4 custom-scrollbar flex justify-center">
              <div className="shadow-2xl ring-1 ring-black/5 bg-white flex flex-col" style={{ zoom: 0.55, width: '210mm', minHeight: '297mm', flexShrink: 0, marginBottom: '20px' }}>
                 <div className="w-full p-12 pointer-events-none flex-1">
                   <QuotationPrintView 
                      data={{
                         docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
                         custItems, custDiscount, boms,
                         custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
                         jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
                         custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat
                      }}
                      type="main"
                      lead={lead}
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
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={'Preview Quotation'} size="xl">
        <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
          <QuotationPrintView 
            data={{
               docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, attention, subject,
               custItems, custDiscount, boms,
               custTotals: { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL },
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }, taxEnabled, selectedProfileId,
               custTerms, custValidity, custDelivery, selectedProfile, custSscl, custVat, jobSscl, jobVat
            }}
            type="main"
            lead={lead}
            settings={settings}
          />
          
          <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
            <Button variant="ghost" icon={Mail} onClick={() => {
              const email = lead?.email || '';
              const subj = encodeURIComponent(`Quotation ${quotationNo} - ${subject}`);
              const body = encodeURIComponent(`Dear ${attention || lead?.name || customerName || 'Customer'},\n\nPlease find our Quotation ${quotationNo} attached.\n\nThank you,\n${user?.name || 'Rex Industries'}`);
              window.open(`mailto:${email}?subject=${subj}&body=${body}`);
            }} className="bg-surface border border-theme-subtle/40 hover:bg-surface2">Email Customer</Button>
            
            <Button variant="ghost" icon={FileDown} onClick={() => {
              const element = document.getElementById('print-section');
              if (!element) return;
              const opt: any = {
                margin:       0.2,
                filename:     `Quotation_${quotationNo}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
              };
              html2pdf().set(opt).from(element).save();
            }} className="bg-surface border border-theme-subtle/40 hover:bg-surface2">Export PDF</Button>
            
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print Quotation</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMarginModal} onClose={() => setShowMarginModal(false)} title="✨ AI Quote Generation" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-xs text-secondary leading-relaxed bg-purple-500/10 text-purple-600 p-3 rounded-xl border border-purple-500/20 font-medium">
            The system will calculate the target price using your BOM Costing and generate one line item per BOM.
          </p>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5">Desired Profit Margin (%)</label>
            <input 
              type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }}
              className="w-full input-base font-bold text-lg" 
              value={marginInput} 
              onChange={e => setMarginInput(e.target.value)} 
              placeholder="e.g. 35"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-theme-subtle mt-4">
            <Button variant="ghost" onClick={() => setShowMarginModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={autoGenerateCustomerQuote} className="bg-gradient-to-r from-purple-500 to-indigo-500 border-0 text-white shadow-lg shadow-purple-500/30">Generate Quote</Button>
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
           setCustomerName(newCustomer.name + (newCustomer.company ? ` (${newCustomer.company})` : ''));
        }} 
      />

    </div>
  )
}
