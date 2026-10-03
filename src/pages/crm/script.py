import fs

builder_path = "H:\\ANTIGRAVITY\\REXNW\\src\\pages\\crm\\QuotationBuilder.tsx"
quotations_path = "H:\\ANTIGRAVITY\\REXNW\\src\\pages\\crm\\Quotations.tsx"

with open(builder_path, "r", encoding="utf-8") as f:
    builder_code = f.read()

# We need to completely rewrite QuotationBuilder.tsx
# But we can extract some utility functions or imports from the original code if needed.
# Since it's a complete rewrite of the component, let's write it in chunks or use a complete string.

new_builder_code = """import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Download, Save, History, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useLeads, useInventory, useMachiningOperations, useCustomers } from '@/hooks/useData'
import { createQuotation, fetchQuotations } from '@/lib/api'
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

const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-rex-500 focus:bg-surface px-2 py-1 text-xs outline-none transition-all"
const docInputClass = "w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-rex-500/50 transition-colors disabled:text-muted disabled:cursor-default"

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
        <ul style={{ top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY, left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, width: wrapRef.current?.getBoundingClientRect().width, minWidth: '200px' }} className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle shadow-glass rounded-xl py-1 max-h-48 overflow-y-auto">
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
        <ul style={{ top: wrapRef.current?.getBoundingClientRect().bottom! + window.scrollY, left: wrapRef.current?.getBoundingClientRect().left! + window.scrollX, width: Math.max(wrapRef.current?.getBoundingClientRect().width || 0, 300) }} className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle shadow-glass rounded-xl py-1 max-h-48 overflow-y-auto">
          {filtered.map((l, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); onSelect(l.id, l.name); onChange(l.name); setOpen(false) }}>
              <span className="text-primary font-medium">{l.name}</span>
              {l.company && <span className="text-[10px] text-muted ml-2">{l.company}</span>}
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
  collapsed: boolean;
  autoMats: any[];
  manualMats: any[];
  procState: Record<string, { estHr: string; setTime: string; quoHr: string; hrRate?: number; setTimeRate?: number; rate?: number }>;
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
  
  const lead = leads.find(l => l.id === leadId)
  
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
              setCurrentId(target.id)
              
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
  const [quotationNo, setQuotationNo] = useState('AHSQ-' + Date.now().toString().slice(-4))
  const [jobQty, setJobQty] = useState('1')
  const [attention, setAttention] = useState('')
  const [subject, setSubject] = useState('To machining parts as per given sample')
  const [customerName, setCustomerName] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)

  const handleSelectLeadOrCustomer = (id: string, name: string) => {
    setSelectedLeadId(id);
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      if (lead.company) setAttention(lead.name);
      
      let cust = null;
      if (lead.customerId) cust = customers.find((c: any) => c.id === lead.customerId);
      
      if (cust) {
        setVatNo(cust.vat || cust.svat || '');
        let terms = '';
        if (cust.requiresAdvance) terms = 'Advance required. ';
        if (cust.creditDays > 0) terms += `${cust.creditDays} days credit.`;
        setCustTerms(terms.trim());
      } else {
        setVatNo(lead.vat || lead.svat || '');
      }
    }
  };

  useEffect(() => {
     if (leadId && lead) {
        setCustomerName(lead.name + (lead.company ? ` (${lead.company})` : ''))
        setSelectedLeadId(lead.id)
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
  const vatPct = Number(settings?.vat_percentage || 0);
  const jobWithSSCL = jobTotalCost * (1 + (vatPct / 100));

  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const custDiscountAmt = custSubtotal * (Number(custDiscount) / 100)
  const custTotal = custSubtotal - custDiscountAmt
  const custWithSSCL = custTotal * (1 + (vatPct / 100));
  
  const expectedProfit = custWithSSCL - jobWithSSCL
  const expectedMargin = custWithSSCL > 0 ? (expectedProfit / custWithSSCL) * 100 : 0

  const restoreSnapshot = (snap: any) => {
    setDocNo(snap.docNo || 'FO/PD/02')
    setIssueNo(snap.issueNo || '01')
    setIssueDate(snap.issueDate || 'March 04, 2026')
    setQuoDate(snap.quoDate || new Date().toISOString().split('T')[0])
    setVatNo(snap.vatNo !== undefined ? snap.vatNo : (lead?.vat || ''))
    setTinNo(snap.tinNo !== undefined ? snap.tinNo : (lead?.svat || ''))
    setQuotationNo(snap.quotationNo || 'AHSQ-' + Date.now().toString().slice(-4))
    setJobQty(snap.jobQty || '1')
    setAttention(snap.attention || '')
    setSubject(snap.subject || 'To machining parts as per given sample')
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
        
        return {
            id: Date.now() + idx,
            desc: b.title,
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
    if (!customerName) {
       showToast('error', 'Please enter a Customer Name!');
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
        totalAmount: amount, customAmount: null
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
          <button onClick={() => navigate('/crm/leads')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Quotation Builder</h1>
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
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
                <div key={v.id} className="flex items-center gap-2 bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs">
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

      {/* MAIN SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Section 1: Document Details */}
        <GlassCard className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <FileText size={16} /> Document Details
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Customer / Lead <span className="text-red-500">*</span></label>
                <LeadSearchInput value={customerName} onChange={setCustomerName} onSelect={handleSelectLeadOrCustomer} leads={leads} className={docInputClass + " font-bold text-primary"} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Quotation No <span className="text-red-500">*</span></label>
                <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} className={docInputClass + " font-mono font-bold text-primary border-primary/20"} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={quoDate} onChange={e => setQuoDate(e.target.value)} className={docInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Validity</label>
                <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)} className={docInputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Attention To</label>
                <input type="text" value={attention} onChange={e => setAttention(e.target.value)} placeholder="e.g. Mr. Nisal" className={docInputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={docInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">VAT Number</label>
                <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="Customer VAT" className={docInputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 p-3 bg-surface/40 rounded-xl border border-theme-subtle/50">
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase mb-1">Doc No</label>
                <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className={docInputClass + " bg-white/50 dark:bg-black/20"} />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase mb-1">Issue No</label>
                <input type="text" value={issueNo} onChange={e => setIssueNo(e.target.value)} className={docInputClass + " bg-white/50 dark:bg-black/20"} />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase mb-1">Issue Date</label>
                <input type="text" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={docInputClass + " bg-white/50 dark:bg-black/20"} />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase mb-1">Created By</label>
                <input type="text" value={user?.name || 'Admin'} disabled className={docInputClass + " bg-white/50 dark:bg-black/20"} />
              </div>
            </div>

            <div className="pt-5 border-t border-theme-subtle">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-black text-secondary uppercase tracking-widest">Job Scope / Descriptions</label>
                <Button variant="ghost" size="sm" icon={Plus} onClick={addJobItem} className="text-xs bg-surface hover:bg-surface2">Add Item</Button>
              </div>
              <div className="space-y-2">
                {jobItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                    <span className="text-[11px] font-bold text-muted w-6 shrink-0 text-right">{idx + 1}.</span>
                    <textarea value={item.text} onChange={e => updateJobItem(item.id, e.target.value)}
                      placeholder="Describe the job / repair / item..."
                      rows={2}
                      className={docInputClass + " flex-1 transition-all focus:shadow-md resize-y min-h-[60px]"} />
                    <button onClick={() => removeJobItem(item.id)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-theme-subtle">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-black text-secondary uppercase tracking-widest">Drawings & Photos</label>
                <label className="text-xs bg-surface hover:bg-surface2 px-3 py-1.5 rounded-lg font-bold border border-theme-subtle cursor-pointer text-primary">
                  + Add File
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {attachments.map(att => (
                    <div key={att.id} className="relative w-20 h-20 shrink-0 border border-theme-subtle rounded-lg overflow-hidden group">
                      {att.type.includes('image') ? <img src={att.dataUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-surface2 flex items-center justify-center text-[10px] font-bold text-muted p-2 text-center break-words">{att.name}</div>}
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </GlassCard>

        {/* Section 2: BOMs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
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
                <div className="flex items-center gap-3">
                  <button onClick={() => updateBOM(bom.id, { collapsed: !bom.collapsed })} className="p-1 hover:bg-surface rounded text-muted hover:text-primary">
                    {bom.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <input 
                    type="text" 
                    value={bom.title} 
                    onChange={e => updateBOM(bom.id, { title: e.target.value })} 
                    className="bg-transparent font-bold text-primary outline-none focus:border-b focus:border-rex-500" 
                    onClick={e => e.stopPropagation()}
                  />
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
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted">Plate or Rod Sizes (mm)</h3>
                      </div>
                      <Button variant="ghost" className="border border-theme-subtle" size="sm" icon={Plus} onClick={() => addAutoMat(bom.id)}>Add Row</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[860px]">
                        <thead>
                          <tr className="border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
                            <th className="pb-2 pl-1">Material</th>
                            <th className="pb-2">Width</th><th className="pb-2">Length</th>
                            <th className="pb-2">Supplier</th><th className="pb-2">Thick</th>
                            <th className="pb-2">Dia Ø</th><th className="pb-2 w-16">Qty</th>
                            <th className="pb-2 w-24">Unit Price</th>
                            <th className="pb-2 text-right">Plate Rs</th>
                            <th className="pb-2 text-right">Shaft Rs</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bom.autoMats.map((mat, i) => (
                            <tr key={mat.id} className={'border-b border-theme-subtle/30 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}>
                              <td className="p-0 border-r border-theme-subtle/30">
                                <MatSearchInput
                                  value={mat.material}
                                  onChange={v => updateAutoMat(bom.id, mat.id, 'material', v)}
                                  onSelect={(name, price) => { updateAutoMat(bom.id, mat.id, 'material', name); if (price) updateAutoMat(bom.id, mat.id, 'unitPrice', price) }}
                                  inventory={inventory}
                                  className="w-full min-w-[120px]"
                                />
                              </td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.width} onChange={e => updateAutoMat(bom.id, mat.id, 'width', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.length} onChange={e => updateAutoMat(bom.id, mat.id, 'length', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="text" className={tableInputClass} value={mat.supplier} onChange={e => updateAutoMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.thick} onChange={e => updateAutoMat(bom.id, mat.id, 'thick', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.dia} onChange={e => updateAutoMat(bom.id, mat.id, 'dia', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.qty} onChange={e => updateAutoMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.unitPrice} onChange={e => updateAutoMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                              <td className="p-1 text-right font-mono text-xs text-primary font-semibold">{mat.platePrice > 0 ? formatCurrency(mat.platePrice) : <span className="text-muted/40">-</span>}</td>
                              <td className="p-1 text-right font-mono text-xs text-primary font-semibold">{mat.shaftPrice > 0 ? formatCurrency(mat.shaftPrice) : <span className="text-muted/40">-</span>}</td>
                              <td className="p-1 text-center"><button onClick={() => removeAutoMat(bom.id, mat.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                          {bom.autoMats.length === 0 && (
                            <tr><td colSpan={11} className="py-4 text-center text-xs text-muted border-b border-theme-subtle/30">No materials added.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Manual Materials */}
                  <div>
                    <div className="flex justify-between items-center mb-4 mt-2">
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted">Manually Calculated Materials</h3>
                      </div>
                      <Button variant="ghost" className="border border-theme-subtle" size="sm" icon={Plus} onClick={() => addManualMat(bom.id)}>Add Row</Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[640px]">
                        <thead>
                          <tr className="border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
                            <th className="pb-2">Material</th><th className="pb-2">Supplier</th>
                            <th className="pb-2">Price Mode</th><th className="pb-2 w-24">Unit Price</th>
                            <th className="pb-2 w-16">Qty</th><th className="pb-2 text-right">Price</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bom.manualMats.map((mat, i) => (
                            <tr key={mat.id} className={'border-b border-theme-subtle/30 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}>
                              <td className="p-0 border-r border-theme-subtle/30">
                                <MatSearchInput
                                  value={mat.material}
                                  onChange={v => updateManualMat(bom.id, mat.id, 'material', v)}
                                  onSelect={(name, price) => { updateManualMat(bom.id, mat.id, 'material', name); if (price) updateManualMat(bom.id, mat.id, 'unitPrice', price) }}
                                  inventory={inventory}
                                  className="w-full min-w-[140px]"
                                />
                              </td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="text" className={tableInputClass} value={mat.supplier} onChange={e => updateManualMat(bom.id, mat.id, 'supplier', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30">
                                <select className={tableInputClass} value={mat.priceMode} onChange={e => updateManualMat(bom.id, mat.id, 'priceMode', e.target.value)}>
                                  <option value="-">-</option>
                                  <option value="per kg">per kg</option>
                                  <option value="per m">per m</option>
                                  <option value="per unit">per unit</option>
                                  <option value="lump sum">lump sum</option>
                                </select>
                              </td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.unitPrice} onChange={e => updateManualMat(bom.id, mat.id, 'unitPrice', e.target.value)} /></td>
                              <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={mat.qty} onChange={e => updateManualMat(bom.id, mat.id, 'qty', e.target.value)} /></td>
                              <td className="p-1 text-right font-mono text-xs font-semibold text-primary">{formatCurrency(mat.unitPrice * mat.qty)}</td>
                              <td className="p-1 text-center"><button onClick={() => removeManualMat(bom.id, mat.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                          {bom.manualMats.length === 0 && (
                            <tr><td colSpan={7} className="py-4 text-center text-xs text-muted border-b border-theme-subtle/30">No materials added.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Machining Table */}
                  <div>
                    <div className="flex justify-between items-center mb-4 mt-2">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted">Machining Operations</h3>
                    </div>
                    <div className="border border-theme-subtle rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-surface/60 border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
                            <th className="px-4 py-2.5">Process</th>
                            <th className="px-3 py-2.5 w-24">Est. Hr</th>
                            <th className="px-3 py-2.5 w-24">Set Time</th>
                            <th className="px-3 py-2.5 w-24">Quo. Hr</th>
                            <th className="px-3 py-2.5 w-48">Rates</th>
                            <th className="px-3 py-2.5 w-32 text-right">Sub Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-subtle/40">
                          {EXCEL_PROCESSES.map((group, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <tr className="bg-surface2/40">
                                <td colSpan={6} className="px-4 py-1.5 text-[10px] font-black text-rex-500 uppercase tracking-wider">{group.group}</td>
                              </tr>
                              {group.items.map(proc => {
                                const st = bom.procState?.[proc.name]
                                if (!st) return null
                                const hrRate = Number(st.hrRate || proc.hrRate || proc.rate || 0)
                                const setTimeRate = Number(st.setTimeRate || proc.setTimeRate || 0)
                                const subTotal = (Number(st.quoHr || 0) * hrRate) + (Number(st.setTime || 0) * setTimeRate)
                                return (
                                  <tr key={proc.name} className="hover:bg-surface/30 transition-colors">
                                    <td className="px-5 py-1.5 text-xs text-secondary">{proc.name}</td>
                                    <td className="p-0 border-l border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={st.estHr} onChange={e => handleProcChange(bom.id, proc.name, 'estHr', e.target.value)} placeholder="-" /></td>
                                    <td className="p-0 border-l border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass} value={st.setTime} onChange={e => handleProcChange(bom.id, proc.name, 'setTime', e.target.value)} placeholder="-" /></td>
                                    <td className="p-0 border-l border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} className={tableInputClass + " font-bold text-primary"} value={st.quoHr} onChange={e => handleProcChange(bom.id, proc.name, 'quoHr', e.target.value)} placeholder="-" /></td>
                                    <td className="px-3 py-1.5 text-[10px] text-muted font-mono border-l border-theme-subtle/30 whitespace-nowrap">
                                        <div className="flex gap-2 justify-end">
                                          <span className="text-amber-600 font-bold">Rs. {hrRate.toLocaleString()}/hr</span>
                                          <span className="text-muted/40">|</span>
                                          <span className="text-blue-600 font-bold">Rs. {setTimeRate.toLocaleString()}/set</span>
                                        </div>
                                      </td>
                                    <td className="px-3 py-1.5 text-right text-xs font-mono font-semibold border-l border-theme-subtle/30">{subTotal > 0 ? <span className="text-primary">{formatCurrency(subTotal)}</span> : <span className="text-muted/40">-</span>}</td>
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
            <div className="flex justify-end px-5 py-3 bg-surface border border-theme-subtle rounded-xl">
               <div className="flex items-center gap-4 text-sm">
                 <span className="font-bold text-secondary uppercase tracking-widest text-[11px]">All BOMs Grand Total</span>
                 <span className="font-mono font-black text-lg text-rex-500">{formatCurrency(jobTotalCost)}</span>
               </div>
            </div>
          )}
        </div>

        {/* Section 3: Customer Quotation */}
        <div className="flex flex-col md:flex-row gap-5">
            <GlassCard className="p-5 flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <User size={16} /> Customer Quotation
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" icon={Wand2} onClick={handleOpenMarginModal} className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold border border-purple-500/20">✨ Auto-Generate from BOMs</Button>
                  <Button variant="primary" size="sm" icon={Plus} onClick={addCustItem}>Add Line</Button>
                </div>
              </div>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
                      <th className="pb-2 w-8">#</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 w-20">Qty</th>
                      <th className="pb-2 w-32">Unit Price (Rs.)</th>
                      <th className="pb-2 w-36 text-right">Total (Rs.)</th>
                      <th className="pb-2 w-32">Notes</th>
                      <th className="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {custItems.map((item, i) => (
                      <tr key={item.id} className={'border-b border-theme-subtle/30 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}>
                        <td className="p-1 text-xs text-muted text-center border-r border-theme-subtle/30">{i + 1}</td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="text" value={item.desc} onChange={e => updateCustItem(item.id, 'desc', e.target.value)} placeholder="Item / service description..." className={tableInputClass} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.qty} onChange={e => updateCustItem(item.id, 'qty', Number(e.target.value))} className={tableInputClass} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={item.unitPrice} onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))} className={tableInputClass} /></td>
                        <td className="p-1 text-right font-mono text-xs font-semibold text-primary border-r border-theme-subtle/30">{formatCurrency(item.qty * item.unitPrice)}</td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="text" value={item.note} onChange={e => updateCustItem(item.id, 'note', e.target.value)} placeholder="Optional note..." className={tableInputClass} /></td>
                        <td className="p-1 text-center"><button onClick={() => removeCustItem(item.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                    {custItems.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-xs text-muted">No items added. Click Add Line.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payment Terms</label>
                  <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)}
                    placeholder="e.g. 50% advance, 50% on delivery"
                    className={docInputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Delivery Timeline</label>
                  <input type="text" value={custDelivery} onChange={e => setCustDelivery(e.target.value)}
                    placeholder="e.g. 3-4 weeks"
                    className={docInputClass} />
                </div>
              </div>
            </GlassCard>
            
            {/* Customer Summary Card on the right */}
            <div className="w-full md:w-80 shrink-0 space-y-4">
              <GlassCard className="p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                     <TrendingUp size={14}/> Customer Quotation Summary
                  </h3>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary font-semibold">Sub Total</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(custSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs group">
                    <span className="text-secondary font-semibold">Discount</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                          <input type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                            className="w-14 px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-lg text-right outline-none focus:border-blue-500" />
                          <span className="text-muted ml-1">%</span>
                      </div>
                      <span className="font-mono text-red-400 text-xs w-20 text-right">-{formatCurrency(custDiscountAmt)}</span>
                    </div>
                  </div>
                  <div className="border-t border-theme-subtle pt-3 flex justify-between items-center text-xs">
                    <span className="font-bold text-blue-400">Total</span>
                    <span className="font-mono font-bold text-blue-400">{formatCurrency(custTotal)}</span>
                  </div>
                  <div className="border-t border-blue-500/20 pt-4 pb-2 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-primary">Final Amount <br/><span className="text-[9px] text-muted font-normal">incl VAT ({Number(settings?.vat_percentage || 0)}%)</span></span>
                    <span className="font-mono font-black text-xl text-blue-600 dark:text-blue-400">{formatCurrency(custWithSSCL)}</span>
                  </div>
                  
                  {/* Profit Indicator */}
                  <div className={`mt-2 p-3 rounded-lg border ${expectedProfit >= 0 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-bold uppercase tracking-wider">Est. Margin</span>
                       <span className="text-sm font-black">{expectedMargin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold uppercase tracking-wider">{expectedProfit >= 0 ? 'Profit' : 'Loss'}</span>
                       <span className="text-sm font-mono font-black">{formatCurrency(Math.abs(expectedProfit))}</span>
                    </div>
                  </div>
              </GlassCard>
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
               jobTotals: { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL },
               custTerms, custValidity, custDelivery
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
            }} className="bg-surface border border-theme-subtle hover:bg-surface2">Email Customer</Button>
            
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
            }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
            
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
    </div>
  )
}
"""

with open(builder_path, "w", encoding="utf-8") as f:
    f.write(new_builder_code)

print("QuotationBuilder.tsx has been rewritten successfully.")
