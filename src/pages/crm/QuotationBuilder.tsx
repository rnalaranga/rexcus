import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Download, Save, History, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useLeads, useInventory } from '@/hooks/useData'
import { createQuotation, fetchQuotations } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'

const EXCEL_PROCESSES = [
  { group: 'General',    items: [{ name: 'Parting', rate: 500 }] },
  { group: 'Milling',    items: [{ name: 'Manual Milling', rate: 2500 }, { name: 'Gear Hobbing', rate: 2500 }] },
  { group: 'Man Lathe',  items: [{ name: 'Normal', rate: 2500 }, { name: 'Blue 800x3000', rate: 3000 }, { name: 'Japan Heavy', rate: 4000 }, { name: 'Coping Lathe', rate: 5000 }, { name: 'Shaping', rate: 2500 }]},
  { group: 'CNC Milling', items: [{ name: '3 Axis', rate: 4500 }, { name: '4 Axis', rate: 5000 }, { name: '5 Axis', rate: 7500 }, { name: '3 Axis 1600 Bed', rate: 7000 }]},
  { group: 'CNC Lathe', items: [{ name: 'Turning', rate: 5500 }, { name: 'Turnmill', rate: 6000 }, { name: 'WEDM', rate: 2500 }, { name: 'EDM', rate: 2500 }, { name: 'Hardening', rate: 1500 }, { name: 'Surface Grinding', rate: 1500 }, { name: 'Cylindricle grinding', rate: 1500 }, { name: 'Knife Grinder', rate: 2500 }]},
  { group: 'Welding', items: [{ name: 'Tig (SS/AL)', rate: 1500 }, { name: 'Mig (SS/MS/UTP)', rate: 1200 }, { name: 'Arc (SS/MS/UTP)', rate: 1100 }, { name: 'Laser Welding', rate: 2500 }]},
  { group: 'Fabrication', items: [{ name: 'Shearing (per cut)', rate: 200 }, { name: 'Bending (per bend)', rate: 200 }, { name: 'Hand work/handling', rate: 500 }]}
]

function initProcState() {
  const init: Record<string, { estHr: string; setTime: string; quoHr: string; rate: number }> = {}
  EXCEL_PROCESSES.forEach(g => g.items.forEach(i => { init[i.name] = { estHr: '', setTime: '', quoHr: '', rate: i.rate } }))
  return init
}

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
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 mt-1 min-w-[200px] bg-surface border border-theme-subtle shadow-glass rounded-xl py-1 max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <li key={i} className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center"
              onMouseDown={e => { e.preventDefault(); onSelect(item.name, item.unitCost || item.price || 0); onChange(item.name); setOpen(false) }}>
              <span className="text-primary font-medium">{item.name}</span>
              {item.unitCost > 0 && <span className="text-[10px] text-muted font-mono ml-2">Rs.{item.unitCost}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const QuotationBuilder: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { data: leads, loading } = useLeads()
  const { data: inventory } = useInventory()
  const { settings } = useSettings()
  const { user } = useAuth()
  
  const lead = leads.find(l => l.id === leadId)

  const [quotationType, setQuotationType] = useState<'main' | 'job' | 'customer'>('main')
  const [savedVersions, setSavedVersions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    if (!leadId) return
    try {
      const data = await fetchQuotations(leadId)
      setSavedVersions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }, [leadId])

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

  // --- Job Items / Description ---
  const [jobItems, setJobItems] = useState<{ id: number; text: string }[]>([{ id: Date.now(), text: '' }])
  const addJobItem = () => setJobItems(p => [...p, { id: Date.now(), text: '' }])
  const updateJobItem = (id: number, text: string) => setJobItems(p => p.map(i => i.id === id ? { ...i, text } : i))
  const removeJobItem = (id: number) => setJobItems(p => p.filter(i => i.id !== id))

  // --- Auto Calculated Materials (Plate / Shaft) ---
  const [autoMats, setAutoMats] = useState<any[]>([])
  const addAutoMat = () => setAutoMats(p => [...p, { id: Date.now(), material: '', width: '', length: '', supplier: '', thick: '', dia: '', qty: 1, unitPrice: 0, platePrice: 0, shaftPrice: 0 }])
  const updateAutoMat = (id: number, field: string, val: any) => {
    setAutoMats(prev => prev.map(m => {
      if (m.id !== id) return m
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
    }))
  }
  const removeAutoMat = (id: number) => setAutoMats(p => p.filter(m => m.id !== id))

  // --- Manual Materials ---
  const [manualMats, setManualMats] = useState<any[]>([])
  const addManualMat = () => setManualMats(p => [...p, { id: Date.now(), material: '', supplier: '', priceMode: '-', qty: 1, unitPrice: 0 }])
  const updateManualMat = (id: number, f: string, v: any) => setManualMats(p => p.map(m => m.id === id ? { ...m, [f]: v } : m))
  const removeManualMat = (id: number) => setManualMats(p => p.filter(m => m.id !== id))

  // --- Machining Process ---
  const [procState, setProcState] = useState<Record<string, { estHr: string; setTime: string; quoHr: string; rate: number }>>(initProcState)
  const handleProcChange = (name: string, f: string, v: string) => setProcState(prev => ({ ...prev, [name]: { ...prev[name], [f]: v } }))

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
  const autoMatTotal = autoMats.reduce((s, m) => s + Number(m.platePrice) + Number(m.shaftPrice), 0)
  const manualMatTotal = manualMats.reduce((s, m) => s + Number(m.qty) * Number(m.unitPrice), 0)
  const totalMaterialCost = autoMatTotal + manualMatTotal
  const totalMachiningCost = Object.values(procState).reduce((s, p) => s + Number(p.quoHr) * Number(p.rate), 0)
  
  const jobTotalCost = totalMaterialCost + totalMachiningCost
  const jobWithSSCL = jobTotalCost * 1.025

  const custSubtotal = custItems.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0)
  const custDiscountAmt = custSubtotal * (Number(custDiscount) / 100)
  const custTotal = custSubtotal - custDiscountAmt
  const custWithSSCL = custTotal * 1.025
  
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
    
    setAutoMats(snap.autoMats || [])
    setManualMats(snap.manualMats || [])
    if (snap.procState) setProcState(snap.procState)
    else setProcState(initProcState())
    
    setCustItems(snap.custItems || [])
    setCustTerms(snap.custTerms || '')
    setCustValidity(snap.custValidity || '30 Days')
    setCustDelivery(snap.custDelivery || '')
    setCustDiscount(snap.custDiscount || 0)
  }
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const autoGenerateCustomerQuote = () => {
    if (jobItems.length === 0 || (!jobItems[0].text && jobItems.length === 1)) {
      showToast('error', 'Please fill out Job Scope / Descriptions first!');
      return;
    }
    
    const marginStr = window.prompt("✨ AI Generation\n\nEnter desired Profit Margin % (e.g. 35):", "35");
    if (!marginStr) return;
    const margin = Number(marginStr);
    
    const cost = totalMaterialCost + totalMachiningCost;
    if (cost === 0) {
       showToast('error', 'Please complete the Job Costing (Material/Machining) first to generate a price!');
       return;
    }

    const targetTotal = cost * (1 + (margin / 100));

    const newCustItems = jobItems.map((ji, idx) => {
      const q = idx === 0 ? (Number(jobQty) || 1) : 1;
      const price = idx === 0 ? Math.round(targetTotal / q) : 0;
      return {
        id: Date.now() + idx,
        desc: ji.text,
        qty: q,
        unitPrice: price,
        note: ''
      };
    });

    setCustItems(newCustItems);
    showToast('success', `✨ Auto-generated Customer Quote with ${margin}% margin!`);
  };

  const handleSave = async (overrideType?: 'main' | 'job' | 'customer') => {
    const saveType = overrideType || quotationType;
    setIsSaving(true)
    try {
      const snapshot: any = {
        docNo, issueNo, issueDate, quoDate, vatNo, tinNo, quotationNo, jobQty, jobItems, attention, subject
      }
      
      if (saveType === 'main' || saveType === 'job') {
        snapshot.autoMats = autoMats
        snapshot.manualMats = manualMats
        snapshot.procState = procState
        snapshot.jobTotals = { totalMaterialCost, totalMachiningCost, totalCost: jobTotalCost, withSSCL: jobWithSSCL }
      }
      if (saveType === 'main' || saveType === 'customer') {
        snapshot.custItems = custItems
        snapshot.custTerms = custTerms
        snapshot.custValidity = custValidity
        snapshot.custDelivery = custDelivery
        snapshot.custDiscount = custDiscount
        snapshot.custTotals = { subtotal: custSubtotal, discount: custDiscountAmt, total: custTotal, withSSCL: custWithSSCL }
      }

      const amount = saveType === 'job' ? jobWithSSCL : saveType === 'customer' ? custWithSSCL : jobWithSSCL

      const result = await createQuotation({
        leadId, type: saveType, data: snapshot,
        totalAmount: amount, customAmount: null
      })
      if (result.success) {
        if (saveType === quotationType) {
          setCurrentId(result.quotation?.id || null)
        }
        const typeLabel = saveType.charAt(0).toUpperCase() + saveType.slice(1)
        showToast('success', `${typeLabel} Quotation v${result.quotation?.version || ''} saved!`)
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
      setQuotationType(v.type || 'main')
      setShowHistory(false)
      const typeLabel = (v.type || 'main').charAt(0).toUpperCase() + (v.type || 'main').slice(1)
      showToast('success', `Loaded ${typeLabel} v${v.version}`)
    } catch {
      showToast('error', 'Failed to load version')
    }
  }

  const [showPreview, setShowPreview] = useState(false)


  if (loading) return <div className="p-8 text-center animate-pulse text-muted">Loading...</div>
  if (!lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>

  const mainVersions = savedVersions.filter(v => v.type === 'main')
  const jobVersions = savedVersions.filter(v => v.type === 'job')
  const custVersions = savedVersions.filter(v => v.type === 'customer')

  const activeVersions = quotationType === 'main' ? mainVersions : quotationType === 'job' ? jobVersions : custVersions

  const showJobSection = quotationType === 'main' || quotationType === 'job'
  const showCustSection = quotationType === 'main' || quotationType === 'customer'

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
            <p className="text-[11px] text-muted mt-0.5">{lead.name}{lead.company ? ' · ' + lead.company : ''}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-surface border border-theme-subtle rounded-xl p-1">
          <button 
            onClick={() => setQuotationType('main')}
            className={'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + 
            (quotationType === 'main' ? 'bg-purple-500 text-white shadow-sm' : 'text-muted hover:text-primary hover:bg-surface2')}
          >
            <FileText size={13} /> Main Quotation
            {mainVersions.length > 0 && <span className={'ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono ' + (quotationType === 'main' ? 'bg-white/20' : 'bg-purple-500/20 text-purple-500')}>{mainVersions.length}</span>}
          </button>
          <button 
            onClick={() => setQuotationType('job')}
            className={'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + 
            (quotationType === 'job' ? 'bg-rex-500 text-white shadow-sm' : 'text-muted hover:text-primary hover:bg-surface2')}
          >
            <Briefcase size={13} /> Job Quotation
            {jobVersions.length > 0 && <span className={'ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono ' + (quotationType === 'job' ? 'bg-white/20' : 'bg-rex-500/20 text-rex-500')}>{jobVersions.length}</span>}
          </button>
          <button 
            onClick={() => setQuotationType('customer')}
            className={'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + 
            (quotationType === 'customer' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted hover:text-primary hover:bg-surface2')}
          >
            <User size={13} /> Customer Quotation
            {custVersions.length > 0 && <span className={'ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-mono ' + (quotationType === 'customer' ? 'bg-white/20' : 'bg-blue-500/20 text-blue-500')}>{custVersions.length}</span>}
          </button>
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
            {isSaving ? 'Saving...' : 'Save ' + (quotationType.charAt(0).toUpperCase() + quotationType.slice(1))}
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
            <span className="text-[11px] font-bold text-muted uppercase tracking-widest">{quotationType} Quotation History</span>
            <span className="text-[10px] text-muted">({activeVersions.length} saved)</span>
          </div>
          {activeVersions.length === 0 ? (
            <p className="text-xs text-muted italic">No saved versions yet.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {activeVersions.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs">
                  <div>
                    <div className="font-bold text-primary capitalize">
                      {v.type || 'Main'} v{v.version}
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

                {/* Document Header */}
        <GlassCard className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <FileText size={16} /> Document Details
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono text-rex-600 bg-rex-500/10 px-2.5 py-1 rounded-md font-bold border border-rex-500/20">Doc: {docNo}</span>
               <span className="text-[10px] font-mono text-rex-600 bg-rex-500/10 px-2.5 py-1 rounded-md font-bold border border-rex-500/20">Rev: {issueNo}</span>
            </div>
          </div>
          
          <div className="space-y-6">
            
            {/* ISO / Internal Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-surface/40 rounded-xl border border-theme-subtle/50">
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
                <label className="block text-[9px] font-bold text-muted uppercase mb-1">Quo Created By</label>
                <input type="text" value={user?.name || 'Admin'} disabled className={docInputClass + " bg-white/50 dark:bg-black/20"} />
              </div>
            </div>

                        {/* Quotation Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Quotation No <span className="text-red-500">*</span></label>
                <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} className={docInputClass + " font-mono font-bold text-primary border-primary/20"} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Quotation Date <span className="text-red-500">*</span></label>
                <input type="date" value={quoDate} onChange={e => setQuoDate(e.target.value)} className={docInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">VAT Number</label>
                <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)} placeholder="Customer VAT" className={docInputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">TIN Number</label>
                <input type="text" value={tinNo} onChange={e => setTinNo(e.target.value)} placeholder="Customer TIN" className={docInputClass} />
              </div>
            </div>

            {/* Attention & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Total QTY</label>
                <input type="text" value={jobQty} onChange={e => setJobQty(e.target.value)} className={docInputClass} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Attention To</label>
                <input type="text" value={attention} onChange={e => setAttention(e.target.value)} placeholder="e.g. Mr. Nisal" className={docInputClass} />
              </div>
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1 flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={docInputClass} />
              </div>
            </div>
{/* Job Items */}
            <div className="pt-5 border-t border-theme-subtle">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-black text-secondary uppercase tracking-widest">Job Scope / Descriptions</label>
                <Button variant="ghost" size="sm" icon={Plus} onClick={addJobItem} className="text-xs bg-surface hover:bg-surface2">Add Item</Button>
              </div>
              <div className="space-y-2">
                {jobItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center group">
                    <span className="text-[11px] font-bold text-muted w-6 shrink-0 text-right">{idx + 1}.</span>
                    <input type="text" value={item.text} onChange={e => updateJobItem(item.id, e.target.value)}
                      placeholder="Describe the job / repair / item..."
                      className={docInputClass + " flex-1 transition-all focus:shadow-md"} />
                    <button onClick={() => removeJobItem(item.id)} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </GlassCard>
{/* JOB QUOTATION SECTIONS */}
        {showJobSection && (
          <>
            {/* Plate / Rod Materials */}
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Plate or Rod Sizes (mm)</h2>
                  <p className="text-[10px] text-muted mt-0.5">Auto-calculates weight-based price. Type to search inventory.</p>
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={addAutoMat}>Add Row</Button>
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
                    {autoMats.map((mat, i) => (
                      <tr key={mat.id} className={'border-b border-theme-subtle/30 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}>
                        <td className="p-0 border-r border-theme-subtle/30">
                          <MatSearchInput
                            value={mat.material}
                            onChange={v => updateAutoMat(mat.id, 'material', v)}
                            onSelect={(name, price) => { updateAutoMat(mat.id, 'material', name); if (price) updateAutoMat(mat.id, 'unitPrice', price) }}
                            inventory={inventory}
                            className="w-full min-w-[120px]"
                          />
                        </td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.width} onChange={e => updateAutoMat(mat.id, 'width', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.length} onChange={e => updateAutoMat(mat.id, 'length', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="text" className={tableInputClass} value={mat.supplier} onChange={e => updateAutoMat(mat.id, 'supplier', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.thick} onChange={e => updateAutoMat(mat.id, 'thick', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.dia} onChange={e => updateAutoMat(mat.id, 'dia', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.qty} onChange={e => updateAutoMat(mat.id, 'qty', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.unitPrice} onChange={e => updateAutoMat(mat.id, 'unitPrice', e.target.value)} /></td>
                        <td className="p-1 text-right font-mono text-xs text-primary font-semibold">{mat.platePrice > 0 ? formatCurrency(mat.platePrice) : <span className="text-muted/40">-</span>}</td>
                        <td className="p-1 text-right font-mono text-xs text-primary font-semibold">{mat.shaftPrice > 0 ? formatCurrency(mat.shaftPrice) : <span className="text-muted/40">-</span>}</td>
                        <td className="p-1 text-center"><button onClick={() => removeAutoMat(mat.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                    {autoMats.length === 0 && (
                      <tr><td colSpan={11} className="py-6 text-center text-xs text-muted">No materials added. Click Add Row.</td></tr>
                    )}
                    <tr className="bg-surface2/50 border-t border-theme-subtle">
                      <td colSpan={8} className="px-3 py-2 text-right text-[10px] font-black text-muted uppercase tracking-wider">Sub Total</td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-bold text-primary">{formatCurrency(autoMats.reduce((s, m) => s + m.platePrice, 0))}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-bold text-primary">{formatCurrency(autoMats.reduce((s, m) => s + m.shaftPrice, 0))}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Manual Materials */}
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Manually Calculated Materials</h2>
                  <p className="text-[10px] text-muted mt-0.5">Standard bought-out items, consumables, etc.</p>
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={addManualMat}>Add Row</Button>
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
                    {manualMats.map((mat, i) => (
                      <tr key={mat.id} className={'border-b border-theme-subtle/30 ' + (i % 2 !== 0 ? 'bg-surface/30' : '')}>
                        <td className="p-0 border-r border-theme-subtle/30">
                          <MatSearchInput
                            value={mat.material}
                            onChange={v => updateManualMat(mat.id, 'material', v)}
                            onSelect={(name, price) => { updateManualMat(mat.id, 'material', name); if (price) updateManualMat(mat.id, 'unitPrice', price) }}
                            inventory={inventory}
                            className="w-full min-w-[140px]"
                          />
                        </td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="text" className={tableInputClass} value={mat.supplier} onChange={e => updateManualMat(mat.id, 'supplier', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30">
                          <select className={tableInputClass} value={mat.priceMode} onChange={e => updateManualMat(mat.id, 'priceMode', e.target.value)}>
                            <option value="-">-</option>
                            <option value="per kg">per kg</option>
                            <option value="per m">per m</option>
                            <option value="per unit">per unit</option>
                            <option value="lump sum">lump sum</option>
                          </select>
                        </td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.unitPrice} onChange={e => updateManualMat(mat.id, 'unitPrice', e.target.value)} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" className={tableInputClass} value={mat.qty} onChange={e => updateManualMat(mat.id, 'qty', e.target.value)} /></td>
                        <td className="p-1 text-right font-mono text-xs font-semibold text-primary">{formatCurrency(mat.unitPrice * mat.qty)}</td>
                        <td className="p-1 text-center"><button onClick={() => removeManualMat(mat.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                    {manualMats.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-xs text-muted">No materials added. Click Add Row.</td></tr>
                    )}
                    <tr className="bg-surface2/50 border-t border-theme-subtle">
                      <td colSpan={5} className="px-3 py-2 text-right text-[10px] font-black text-muted uppercase tracking-wider">Sub Total</td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-bold text-primary">{formatCurrency(manualMatTotal)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>


            {/* Machining Table */}
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Machining Operations</h2>
                <div className="text-xs font-mono bg-rex-500/10 text-rex-500 px-3 py-1.5 rounded-lg font-bold">
                  Material Cost: {formatCurrency(totalMaterialCost)}
                </div>
              </div>
              <div className="border border-theme-subtle rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface/60 border-b border-theme-subtle text-[10px] text-muted uppercase tracking-wider">
                      <th className="px-4 py-2.5">Process</th>
                      <th className="px-3 py-2.5 w-24">Est. Hr</th>
                      <th className="px-3 py-2.5 w-24">Set Time</th>
                      <th className="px-3 py-2.5 w-24">Quo. Hr</th>
                      <th className="px-3 py-2.5 w-28">Hr Rate</th>
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
                          const st = procState[proc.name]
                          if (!st) return null
                          const subTotal = Number(st.quoHr || 0) * st.rate
                          return (
                            <tr key={proc.name} className="hover:bg-surface/30 transition-colors">
                              <td className="px-5 py-1.5 text-xs text-secondary">{proc.name}</td>
                              <td className="p-0 border-l border-theme-subtle/30"><input type="number" className={tableInputClass} value={st.estHr} onChange={e => handleProcChange(proc.name, 'estHr', e.target.value)} placeholder="-" /></td>
                              <td className="p-0 border-l border-theme-subtle/30"><input type="number" className={tableInputClass} value={st.setTime} onChange={e => handleProcChange(proc.name, 'setTime', e.target.value)} placeholder="-" /></td>
                              <td className="p-0 border-l border-theme-subtle/30"><input type="number" className={tableInputClass + " font-bold text-primary"} value={st.quoHr} onChange={e => handleProcChange(proc.name, 'quoHr', e.target.value)} placeholder="-" /></td>
                              <td className="px-3 py-1.5 text-xs text-muted font-mono border-l border-theme-subtle/30">Rs. {st.rate.toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right text-xs font-mono font-semibold border-l border-theme-subtle/30">{subTotal > 0 ? <span className="text-primary">{formatCurrency(subTotal)}</span> : <span className="text-muted/40">-</span>}</td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Job Summary */}
            {quotationType === 'job' && (
              <div className="flex justify-end pb-8">
                <GlassCard className="p-5 w-80 space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Job Cost Summary</h3>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-secondary">Total Machining Cost</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(totalMachiningCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-secondary">Total Material Cost</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(totalMaterialCost)}</span>
                  </div>
                  <div className="border-t border-theme-subtle pt-2.5 flex justify-between items-center text-xs">
                    <span className="font-bold text-secondary">Total Cost</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(jobTotalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-rex-500">Quoted Price</span>
                    <span className="font-mono font-bold text-rex-500">{formatCurrency(jobTotalCost)}</span>
                  </div>
                  <div className="border-t border-rex-500/30 pt-3 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-primary">With SSCL (2.5%)</span>
                    <span className="font-mono font-black text-base text-primary">{formatCurrency(jobWithSSCL)}</span>
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* CUSTOMER QUOTATION SECTIONS */}
        {showCustSection && (
          <>
            <GlassCard className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Customer Quotation Line Items</h2>
                  <p className="text-[10px] text-muted mt-0.5">Customer-facing items — description, qty, unit price.</p>
                </div>
                                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" icon={Wand2} onClick={autoGenerateCustomerQuote} className="text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 font-bold">✨ AI Generate</Button>
                  <Button variant="primary" size="sm" icon={Plus} onClick={addCustItem}>Add Line</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
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
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" value={item.qty} onChange={e => updateCustItem(item.id, 'qty', Number(e.target.value))} className={tableInputClass} /></td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="number" value={item.unitPrice} onChange={e => updateCustItem(item.id, 'unitPrice', Number(e.target.value))} className={tableInputClass} /></td>
                        <td className="p-1 text-right font-mono text-xs font-semibold text-primary border-r border-theme-subtle/30">{formatCurrency(item.qty * item.unitPrice)}</td>
                        <td className="p-0 border-r border-theme-subtle/30"><input type="text" value={item.note} onChange={e => updateCustItem(item.id, 'note', e.target.value)} placeholder="Optional note..." className={tableInputClass} /></td>
                        <td className="p-1 text-center"><button onClick={() => removeCustItem(item.id)} className="text-red-500/60 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                    {custItems.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-xs text-muted">No items added. Click Add Line.</td></tr>
                    )}
                    <tr className="bg-surface2/50 border-t border-theme-subtle">
                      <td colSpan={4} className="px-3 py-2 text-right text-[10px] font-black text-muted uppercase tracking-wider">Sub Total</td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-bold text-primary">{formatCurrency(custSubtotal)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payment Terms</label>
                  <input type="text" value={custTerms} onChange={e => setCustTerms(e.target.value)}
                    placeholder="e.g. 50% advance, 50% on delivery"
                    className={docInputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Quotation Validity</label>
                  <input type="text" value={custValidity} onChange={e => setCustValidity(e.target.value)}
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

            {/* Customer Summary */}
            {quotationType === 'customer' && (
              <div className="flex justify-end pb-8">
                <GlassCard className="p-5 w-80 space-y-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Customer Quotation Summary</h3>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary font-semibold">Sub Total</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(custSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary font-semibold">Discount</span>
                    <div className="flex items-center gap-2">
                      <input type="number" value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                        className="w-14 px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-lg text-right outline-none" />
                      <span className="text-muted">%</span>
                      <span className="font-mono text-red-400 text-xs">-{formatCurrency(custDiscountAmt)}</span>
                    </div>
                  </div>
                  <div className="border-t border-theme-subtle pt-2.5 flex justify-between items-center text-xs">
                    <span className="font-bold text-blue-400">Total</span>
                    <span className="font-mono font-bold text-blue-400">{formatCurrency(custTotal)}</span>
                  </div>
                  <div className="border-t border-blue-500/20 pt-3 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-primary">With SSCL (2.5%)</span>
                    <span className="font-mono font-black text-base text-primary">{formatCurrency(custWithSSCL)}</span>
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        )}

        {/* MAIN QUOTATION MASTER SUMMARY - NEW DESIGN */}
        {quotationType === 'main' && (
          <div className="flex justify-end pb-8">
            <GlassCard className="w-full max-w-3xl overflow-hidden border border-theme-subtle/50 shadow-2xl relative !p-0">
              <div className="bg-gradient-to-r from-surface2 to-surface border-b border-theme-subtle p-4 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <LayoutDashboard className="text-primary" size={18} />
                   <h3 className="text-[13px] font-black uppercase tracking-widest text-primary">Master Quotation Overview</h3>
                 </div>
                 <div className={`px-3 py-1 rounded-full text-xs font-black ${expectedProfit >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    Est. Margin: {expectedMargin.toFixed(1)}%
                 </div>
              </div>
              
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-theme-subtle/50">
                
                {/* Internal Costing Side */}
                <div className="flex-1 p-5 bg-surface/20 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="p-1.5 bg-rex-500/20 text-rex-500 rounded-lg"><TrendingDown size={14}/></div>
                     <h4 className="text-[11px] font-bold text-rex-500 uppercase tracking-widest">Internal Costing</h4>
                  </div>
                  <div className="space-y-3 flex-1">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Material Cost</span>
                        <span className="font-mono">{formatCurrency(totalMaterialCost)}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Machining Cost</span>
                        <span className="font-mono">{formatCurrency(totalMachiningCost)}</span>
                     </div>
                     <div className="pt-3 mt-3 border-t border-theme-subtle flex justify-between items-center">
                        <span className="text-xs font-bold text-secondary">Total Net Cost <span className="text-[9px] font-normal text-muted ml-1">(inc SSCL)</span></span>
                        <span className="font-mono font-black text-sm text-rex-500">{formatCurrency(jobWithSSCL)}</span>
                     </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-theme-subtle">
                     <Button variant="ghost" className="w-full text-xs border border-rex-500/20 text-rex-500 hover:bg-rex-500/10 shadow-sm" icon={Briefcase} onClick={() => { setQuotationType('job'); setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); alert('Switched to Job Quotation. Click Save Job to generate version.'); }, 100); }}>
                        Generate Job Quote
                     </Button>
                  </div>
                </div>

                {/* Customer Pricing Side */}
                <div className="flex-1 p-5 bg-blue-500/5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-lg"><TrendingUp size={14}/></div>
                     <h4 className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Customer Pricing</h4>
                  </div>
                  <div className="space-y-3 flex-1">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-muted font-medium">Sub Total</span>
                        <span className="font-mono">{formatCurrency(custSubtotal)}</span>
                     </div>
                     <div className="flex items-center justify-between text-xs group">
                        <span className="text-muted font-medium">Discount</span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <input type="number" value={custDiscount} onChange={e => setCustDiscount(Number(e.target.value))}
                            className="w-12 px-1.5 py-1 text-[11px] bg-white dark:bg-black/20 border border-theme-subtle rounded-md text-right outline-none focus:border-blue-500 transition-colors shadow-inner" />
                          <span className="text-[10px] text-muted">%</span>
                        </div>
                     </div>
                     <div className="pt-3 mt-3 border-t border-blue-500/20 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Final Price <span className="text-[9px] font-normal opacity-70 ml-1">(inc SSCL)</span></span>
                        <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">{formatCurrency(custWithSSCL)}</span>
                     </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-theme-subtle">
                     <Button variant="primary" className="w-full text-xs shadow-lg shadow-blue-500/20" icon={User} onClick={() => { setQuotationType('customer'); setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); alert('Switched to Customer Quotation. Click Save Customer to generate version.'); }, 100); }}>
                        Generate Cust Quote
                     </Button>
                  </div>
                </div>
              </div>
              
              <div className={`text-center py-2 text-[11px] font-bold uppercase tracking-widest border-t border-theme-subtle ${expectedProfit >= 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                 Est. {expectedProfit >= 0 ? 'Profit' : 'Loss'} : {formatCurrency(Math.abs(expectedProfit))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>


      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={'Preview — ' + (quotationType.charAt(0).toUpperCase() + quotationType.slice(1)) + ' Quotation'} size="xl">
        <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-section, #print-section * { visibility: visible; }
              #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; color: black; background: white; }
            }
          `}</style>

          <div id="print-section" className="mx-auto w-full bg-white text-black leading-snug" style={{ fontFamily: 'Arial, Helvetica, sans-serif', maxWidth: '800px', fontSize: '12px' }}>
            <div className="border border-black flex flex-col">
              
              {/* Header */}
              <div className="flex p-4 border-b border-black items-center">
                <div className="w-[35%] flex justify-center items-center">
                  {settings?.company_logo
                    ? <img src={settings.company_logo} alt="Logo" className="max-h-24" />
                    : <div className="text-5xl font-black text-red-600 tracking-tighter" style={{fontFamily: 'Impact, sans-serif'}}>REX</div>}
                </div>
                <div className="w-[65%] pl-4">
                  <h1 className="text-[22px] font-black mb-2" style={{fontFamily: 'Arial Black, Impact, sans-serif'}}>REX INDUSTRIES (PVT) LTD</h1>
                  <table className="text-[12px] leading-tight w-full" style={{fontFamily: 'Courier New, Courier, monospace'}}>
                    <tbody>
                      <tr><td className="font-bold w-16 align-top">Office</td><td>: No.451/2,Chilaw Road, Kattuwa,<br/>  Negombo,11500,Sri Lanka</td></tr>
                      <tr><td className="font-bold">Tel.</td><td>: 0094-31-2233117 / 2233315 / 2223136</td></tr>
                      <tr><td className="font-bold">E-mail</td><td>: info@rexgroup.lk</td></tr>
                      <tr><td className="font-bold">Web</td><td>: www.rexgroup.lk</td></tr>
                      <tr><td className="font-bold">VAT</td><td className="font-bold">: No:114106470-7000  SVAT No:SVAT003857</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-bold text-[16px] py-1.5 border-b border-black tracking-widest uppercase">
                QUOTATION
              </div>

              {/* TO / Details */}
              <div className="flex border-b border-black text-[12px]">
                <div className="w-[55%] p-2 border-r border-black flex flex-col justify-between">
                  <div>
                    <div className="font-bold italic">TO</div>
                    <div>{lead.name}</div>
                    {lead.company && <div>{lead.company}</div>}
                    <div>{lead.address || ''}</div>
                  </div>
                  <div className="mt-4">
                    <div className="flex"><span className="w-24">VAT No.</span><span>: {vatNo}</span></div>
                    <div className="flex"><span className="w-24">TIN No.</span><span>: {tinNo}</span></div>
                  </div>
                </div>
                <div className="w-[45%] p-2">
                  <div className="flex"><span className="w-32">Quotation No.</span><span>: {quotationNo}</span></div>
                  <div className="flex"><span className="w-32">Quotation Date</span><span>: {quoDate}</span></div>
                  <div className="flex"><span className="w-32">Attention</span><span>: {attention}</span></div>
                </div>
              </div>

              {/* Subject */}
              <div className="flex p-2 border-b border-black text-[13px]">
                <span className="font-bold w-20">Subject:</span>
                <span>{subject}</span>
              </div>

              {/* Table Header */}
              <div className="flex border-b border-black font-bold text-[13px] text-center bg-gray-50">
                <div className="w-[55%] p-2 border-r border-black">Item & Description</div>
                <div className="w-[10%] p-2 border-r border-black">Qty.</div>
                <div className="w-[15%] p-2 border-r border-black">Price</div>
                <div className="w-[20%] p-2">Amount</div>
              </div>

              {/* Table Body */}
              <div className="flex min-h-[350px] text-[13px] bg-white">
                <div className="w-[55%] p-2 border-r border-black whitespace-pre-wrap flex flex-col gap-4">
                  {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item, idx) => (
                    <div key={idx}>
                      <div>{item.desc}</div>
                      {item.note && <div className="text-xs text-gray-700">{item.note}</div>}
                    </div>
                  ))}
                  {quotationType === 'job' && (
                    <div className="font-bold italic text-gray-500 text-center mt-10">
                      [Internal Job Items / Costing - Use Customer Quote for Print]
                    </div>
                  )}
                </div>
                <div className="w-[10%] p-2 border-r border-black text-center flex flex-col gap-4">
                  {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item, idx) => (
                     <div key={idx}>{item.qty.toFixed(2)}</div>
                  ))}
                </div>
                <div className="w-[15%] p-2 border-r border-black text-right flex flex-col gap-4">
                   {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item, idx) => (
                     <div key={idx}>{formatCurrency(item.unitPrice).replace('Rs.','').trim()}</div>
                  ))}
                </div>
                <div className="w-[20%] p-2 text-right flex flex-col gap-4">
                   {(quotationType === 'customer' || quotationType === 'main') && custItems.map((item, idx) => (
                     <div key={idx}>{formatCurrency(item.qty * item.unitPrice).replace('Rs.','').trim()}</div>
                  ))}
                </div>
              </div>

              {/* Totals Section */}
              <div className="border-t border-black text-[13px]">
                
                {/* Sub Total */}
                <div className="flex border-b border-black items-center h-8">
                  <div className="w-[65%] text-right font-bold pr-6">Sub Total</div>
                  <div className="w-[15%] font-bold text-center">LKR</div>
                  <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                    {formatCurrency(quotationType === 'job' ? totalMachiningCost + totalMaterialCost : custSubtotal).replace('Rs.','').trim()}
                  </div>
                </div>
                
                {/* Discount */}
                {quotationType !== 'job' && custDiscountAmt > 0 && (
                   <div className="flex border-b border-black items-center h-8">
                     <div className="w-[65%] text-right pr-6">Discount</div>
                     <div className="w-[15%] text-center">{custDiscount} %</div>
                     <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                       -{formatCurrency(custDiscountAmt).replace('Rs.','').trim()}
                     </div>
                   </div>
                )}

                {/* VAT / SSCL row */}
                <div className="flex border-b border-black items-center h-8">
                  <div className="w-[65%] text-right pr-6">VAT (SSCL)</div>
                  <div className="w-[15%] text-center">2.50 %</div>
                  <div className="w-[20%] text-right p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                    {formatCurrency(quotationType === 'job' ? jobTotalCost * 0.025 : custTotal * 0.025).replace('Rs.','').trim()}
                  </div>
                </div>

                {/* Grand Total Row */}
                <div className="flex border-b border-black items-center bg-gray-50 h-8">
                  <div className="w-[65%] text-right font-bold pr-6">Grand Total</div>
                  <div className="w-[15%] font-bold text-center">LKR</div>
                  <div className="w-[20%] text-right font-bold p-1 border-l border-black pr-2 h-full flex items-center justify-end">
                    {formatCurrency(quotationType === 'job' ? jobWithSSCL : custWithSSCL).replace('Rs.','').trim()}
                  </div>
                </div>

              </div>

              {/* Value in words */}
              <div className="p-2 border-b border-black text-[11px] font-bold">
                <span className="uppercase">VALUE : LKR {toWords(Math.round(quotationType === 'job' ? jobWithSSCL : custWithSSCL))}</span>
              </div>

              {/* Footer Notes & Bank */}
              <div className="p-2 text-[12px] leading-tight flex flex-col gap-2">
                <div>
                  <div className="font-bold">Notes</div>
                  <div className="whitespace-pre-wrap">
                    {(!custTerms && !custValidity && !custDelivery) ? (
                      <>
                        X. This Quotation will be valid for a period of Two Days due to material price fluctuation in the market.<br/>
                        X. An Advance Payment 50% of the mentioned total amount is to be made initially and the balance before the Completion/Delivery.
                      </>
                    ) : (
                      <>
                        {custTerms && `X. ${custTerms}\n`}
                        {custValidity && `X. ${custValidity}\n`}
                        {custDelivery && `X. ${custDelivery}`}
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="font-bold">Bank details</div>
                  <table className="mt-0.5">
                    <tbody>
                      <tr><td className="w-28">Account Name</td><td>: Rex Industries (pvt) ltd</td></tr>
                      <tr><td>Bank</td><td>: Commercial Bank of Ceylon</td></tr>
                      <tr><td>Account No</td><td>: 1131358401</td></tr>
                      <tr><td>Branch</td><td>: Negombo Main Branch</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-[11px]">This is a system generated quotation, no signature required.</div>
              </div>

            </div>
          </div>
          
                    <div className="mt-6 flex justify-end gap-3 pb-6">
            <Button variant="ghost" icon={Mail} onClick={() => {
              const email = lead.email || '';
              const subj = encodeURIComponent(`Quotation ${quotationNo} - ${subject}`);
              const body = encodeURIComponent(`Dear ${attention || lead.name},\n\nPlease find our Quotation ${quotationNo} attached.\n\nThank you,\n${user?.name || 'Rex Industries'}`);
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
    </div>
  )
}











