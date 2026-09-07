import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, File as FileIcon, Send, Download, Calculator, Settings, Hammer, X, CheckCircle, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Autocomplete } from '@/components/ui/Autocomplete'
import { useLeads, useInventory } from '@/hooks/useData'
import { createQuotation, fetchQuotations, updateLead, createInvoice } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const INITIAL_PROCESSES = [
  { category: 'Turning / Lathe', items: [
    { name: 'Parting', rate: 500 },
    { name: 'Man Lathe - Normal', rate: 2500 },
    { name: 'Man Lathe - Blue 800x3000', rate: 3000 },
    { name: 'Man Lathe - Japan Heavy', rate: 4000 },
    { name: 'Coping Lathe', rate: 5000 },
    { name: 'CNC Turning', rate: 5500 },
    { name: 'CNC Turnmill', rate: 6000 },
  ]},
  { category: 'Milling & Shaping', items: [
    { name: 'Manual Milling', rate: 2500 },
    { name: 'Gear Hobbing', rate: 2500 },
    { name: 'Shaping', rate: 2500 },
    { name: 'CNC 3 Axis', rate: 4500 },
    { name: 'CNC 4 Axis', rate: 5000 },
    { name: 'CNC 5 Axis', rate: 7500 },
    { name: 'CNC 3 Axis 1600 Bed', rate: 7000 },
  ]},
  { category: 'Grinding & EDM', items: [
    { name: 'WEDM', rate: 2500 },
    { name: 'EDM', rate: 2500 },
    { name: 'Hardening', rate: 1500 },
    { name: 'Surface Grinding', rate: 1500 },
    { name: 'Cylindricle grinding', rate: 1500 },
    { name: 'Knife Grinder', rate: 2500 },
  ]},
  { category: 'Welding & Fab', items: [
    { name: 'TIG Welding', rate: 1500 },
    { name: 'MIG Welding', rate: 1200 },
    { name: 'Arc Welding', rate: 1100 },
    { name: 'Laser Welding', rate: 2500 },
    { name: 'Shearing', rate: 200 },
    { name: 'Bending', rate: 200 },
    { name: 'Hand work/handling', rate: 500 },
  ]}
]

export const QuotationBuilder: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { data: leads, loading } = useLeads()
  const { data: inventory } = useInventory()
  const lead = leads.find(l => l.id === leadId)

  const [date] = useState(new Date().toISOString().split('T')[0])
  const [docNo] = useState('FO/PD/02')
  const [issueNo] = useState('01')

  const [files, setFiles] = useState<File[]>([])
  const [autoMaterials, setAutoMaterials] = useState<any[]>([])
  const [manualMaterials, setManualMaterials] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  
  const [customAmount, setCustomAmount] = useState<string>('')
  const [docType, setDocType] = useState<'main' | 'customer' | 'job'>('customer')
  const [isSaving, setIsSaving] = useState(false)
  const [quotationHistory, setQuotationHistory] = useState<any[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadQuotation = (q: any) => {
    try {
      const data = typeof q.data === 'string' ? JSON.parse(q.data) : q.data
      
      const migratedAutoMats = (data.autoMaterials || []).map((m: any) => ({
        ...m,
        totalPrice: m.totalPrice !== undefined ? m.totalPrice : (Number(m.platePrice || 0) + Number(m.shaftPrice || 0))
      }))
      
      setAutoMaterials(migratedAutoMats)
      setManualMaterials(data.manualMaterials || [])
      setProcesses(data.processes || [])
      setCustomAmount(q.customAmount ? String(q.customAmount) : '')
      if (q.type) setDocType(q.type)
    } catch (e) {
      console.error('Failed to load quotation data', e)
    }
  }

  useEffect(() => {
    if (leadId) {
      fetchQuotations(leadId).then((history) => {
        setQuotationHistory(history)
        if (history.length > 0) {
          loadQuotation(history[0])
        }
      }).catch(console.error)
    }
  }, [leadId])

  const materialSuggestions = useMemo(() => inventory.filter(i => i.type === 'product').map(i => ({
    label: i.name,
    value: i.name,
    extra: formatCurrency(Number(i.unitPrice||0))
  })), [inventory])

  const serviceSuggestions = useMemo(() => [
    ...inventory.filter(i => i.type === 'service').map(i => ({
      label: i.name,
      value: i.name,
      extra: `${formatCurrency(Number(i.unitPrice||0))}/${i.uom}`
    })),
    ...INITIAL_PROCESSES.flatMap(c => c.items).map(i => ({
      label: i.name,
      value: i.name,
      extra: `Internal - Rs.${i.rate}`
    }))
  ], [inventory])

  if (loading) return <div className="p-8 text-center animate-pulse text-muted">Loading Builder...</div>
  if (!lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>

  // Drag Drop Handlers for Files
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles([...files, ...Array.from(e.dataTransfer.files)])
    }
  }

  // Material Helpers
  const addAutoMat = () => setAutoMaterials([...autoMaterials, { id: Date.now(), material: '', width: '', length: '', supplier: '', thick: '', dia: '', qty: 1, unitPrice: 0, totalPrice: 0 }])
  const updateAutoMat = (id: number, f: string, v: string | number) => {
    setAutoMaterials(autoMaterials.map(m => {
      if (m.id !== id) return m
      const updated = { ...m, [f]: v }
      
      // If material changes, try to fetch unit price from inventory
      if (f === 'material' && typeof v === 'string') {
        const invItem = inventory.find(i => i.name.toLowerCase() === v.toLowerCase() && i.type === 'product')
        if (invItem) {
          updated.unitPrice = Number(invItem.unitPrice || 0)
          updated.supplier = (invItem.suppliers ? (Array.isArray(invItem.suppliers) ? invItem.suppliers[0] : (JSON.parse(invItem.suppliers)[0] || '')) : '')
        }
      }

      // Auto calculate total if dimension/qty/price changes
      if (['material', 'width', 'length', 'thick', 'dia', 'qty', 'unitPrice'].includes(f)) {
        const matName = (updated.material || '').toLowerCase();
        const isRod = matName.includes('rod') || matName.includes('shaft') || Boolean(updated.dia && updated.length && !updated.width);
        const isPlate = matName.includes('plate') || Boolean(updated.width && updated.length && updated.thick);
        
        const density = 0.00000785; // kg/mm3 for steel
        let weight = 0;
        
        if (isRod) {
          const dia = Number(updated.dia) || 0;
          const length = Number(updated.length) || 0;
          weight = Math.PI * Math.pow(dia / 2, 2) * length * density;
        } else if (isPlate) {
          const w = Number(updated.width) || 0;
          const l = Number(updated.length) || 0;
          const t = Number(updated.thick) || 0;
          weight = w * l * t * density;
        }
        
        const qty = Number(updated.qty) || 1;
        const up = Number(updated.unitPrice) || 0;
        
        if (weight > 0) {
          updated.totalPrice = Number((weight * qty * up).toFixed(2));
        } else {
          updated.totalPrice = Number((qty * up).toFixed(2));
        }
      }
      
      return updated
    }))
  }
  const removeAutoMat = (id: number) => setAutoMaterials(autoMaterials.filter(m => m.id !== id))

  const addManualMat = () => setManualMaterials([...manualMaterials, { id: Date.now(), description: '', supplier: '', priceMode: '-', qty: 1, unitPrice: 0 }])
  const updateManualMat = (id: number, f: string, v: string | number) => {
    setManualMaterials(manualMaterials.map(m => {
      if (m.id !== id) return m
      const updated = { ...m, [f]: v }
      if (f === 'description' && typeof v === 'string') {
        const invItem = inventory.find(i => i.name.toLowerCase() === v.toLowerCase() && i.type === 'product')
        if (invItem) {
          updated.unitPrice = Number(invItem.unitPrice || 0)
          updated.supplier = (invItem.suppliers ? (Array.isArray(invItem.suppliers) ? invItem.suppliers[0] : (JSON.parse(invItem.suppliers)[0] || '')) : '')
        }
      }
      return updated
    }))
  }
  const removeManualMat = (id: number) => setManualMaterials(manualMaterials.filter(m => m.id !== id))

  const addProcess = () => setProcesses([...processes, { id: Date.now(), name: '', rate: 0, estHrs: 0, setHrs: 0, quotedHrs: 0 }])
  const updateProc = (id: number, f: string, v: string | number) => {
    setProcesses(processes.map(p => {
      if (p.id !== id) return p
      const updated = { ...p, [f]: v }
      if (f === 'name' && typeof v === 'string') {
        const invItem = inventory.find(i => i.name.toLowerCase() === v.toLowerCase() && i.type === 'service')
        if (invItem) {
          updated.rate = Number(invItem.unitPrice || 0)
        } else {
          for (const cat of INITIAL_PROCESSES) {
            const match = cat.items.find(i => i.name === v)
            if (match) updated.rate = match.rate
          }
        }
      }
      return updated
    }))
  }
  const removeProc = (id: number) => setProcesses(processes.filter(p => p.id !== id))

  const autoMatTotal = autoMaterials.reduce((s, m) => s + Number(m.totalPrice || 0), 0)
  const manualMatTotal = manualMaterials.reduce((s, m) => s + (Number(m.qty) * Number(m.unitPrice)), 0)
  const matTotal = autoMatTotal + manualMatTotal
  const procTotal = processes.reduce((s, p) => s + (Number(p.quotedHrs) * Number(p.rate)), 0)
  const subTotal = matTotal + procTotal
  const sscl = subTotal * 0.025
  const grandTotal = subTotal + sscl
  
  const finalPrice = customAmount ? Number(customAmount) : grandTotal

  const handleSaveQuotation = async (typeToSave: 'main' | 'customer' | 'job') => {
    setIsSaving(true)
    try {
      const payload = {
        leadId,
        data: { autoMaterials, manualMaterials, processes },
        totalAmount: grandTotal,
        customAmount: customAmount ? Number(customAmount) : null,
        type: typeToSave
      }
      await createQuotation(payload)
      const fresh = await fetchQuotations(leadId!)
      setQuotationHistory(fresh)
      showToast('success', `${typeToSave.charAt(0).toUpperCase() + typeToSave.slice(1)} Quotation saved successfully!`)
      if (typeToSave !== 'main') {
        setShowPreview(false)
      }
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to save quotation')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in pb-12 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/crm/leads')}>Back to Leads</Button>
        <div className="flex-1" />
        <Button variant="primary" className="bg-rex-600 hover:bg-rex-700 text-white shadow-lg shadow-rex-500/20" size="sm" onClick={() => handleSaveQuotation('main')} disabled={isSaving}>
          {isSaving ? 'Saving...' : '💾 Save Main Quotation'}
        </Button>
        <Button variant="ghost" size="sm" icon={FileIcon} onClick={() => { setDocType('customer'); setShowPreview(true); }}>
          Generate Customer Quote
        </Button>
        <Button variant="ghost" className="text-amber-600 hover:bg-amber-50" size="sm" icon={FileIcon} onClick={() => { setDocType('job'); setShowPreview(true); }}>
          Generate Job Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Leftmost Column: History */}
        <div className="lg:col-span-1 space-y-4">
           <GlassCard className="p-4 h-[calc(100vh-10rem)] sticky top-4 flex flex-col">
             
             <h2 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex-shrink-0">Saved Quotations</h2>
             <div className="space-y-2 flex-1 overflow-y-auto">
               {quotationHistory.length === 0 ? (
                  <p className="text-[10px] text-muted italic">No records found.</p>
               ) : (
                  (() => {
                    const seenTypes = new Set<string>()
                    return quotationHistory.map((q: any) => {
                      const isLatest = !seenTypes.has(q.type)
                      if (isLatest) seenTypes.add(q.type)
                      
                      return (
                        <div key={q.id} className={`p-2 rounded border cursor-pointer transition-colors group ${isLatest ? 'bg-rex-500/5 border-rex-500/20' : 'bg-surface2/50 hover:bg-surface2 border-theme-subtle'}`} onClick={() => loadQuotation(q)}>
                           <div className="flex justify-between items-start mb-1">
                              <span className={`text-[11px] font-bold group-hover:text-rex-500 ${isLatest ? 'text-primary' : 'text-secondary'}`}>#{q.id}</span>
                              <div className="flex gap-1 items-center">
                                {isLatest && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold uppercase animate-pulse">Latest</span>
                                )}
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase border ${q.type === 'job' ? 'bg-amber-50 border-amber-200 text-amber-700' : q.type === 'customer' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-rex-50 border-rex-200 text-rex-700'}`}>
                                  {q.type === 'job' ? 'Job' : q.type === 'customer' ? 'Customer' : 'Main'}
                                </span>
                              </div>
                           </div>
                           <div className="flex justify-between items-center mt-1">
                             <div className="text-[8px] text-muted">{new Date(q.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                             <span className="text-[10px] font-semibold text-rex-500">{formatCurrency(Number(q.totalAmount))}</span>
                           </div>
                        </div>
                      )
                    })
                  })()
               )}
             </div>
             
             <div className="pt-3 border-t border-theme-subtle mt-2 flex-shrink-0">
               <Button variant="outline" size="sm" className="w-full text-[10px] py-1 h-auto" onClick={() => {
                  setAutoMaterials([]); setManualMaterials([]); setProcesses([]); setCustomAmount('');
               }}>
                  + New Quotation
               </Button>
             </div>
           </GlassCard>
        </div>

        {/* Details & Uploads */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 pb-2 border-b border-theme-subtle">Document Details</h2>
            <div className="space-y-3">
              <div><label className="text-[10px] text-muted uppercase">Doc No</label><p className="text-sm font-mono text-secondary">{docNo}</p></div>
              <div><label className="text-[10px] text-muted uppercase">Issue No</label><p className="text-sm font-mono text-secondary">{issueNo}</p></div>
              <div><label className="text-[10px] text-muted uppercase">Date</label><p className="text-sm font-mono text-secondary">{date}</p></div>
              <div><label className="text-[10px] text-muted uppercase">Customer</label><p className="text-sm font-semibold text-primary">{lead.company || lead.name}</p></div>
              <div><label className="text-[10px] text-muted uppercase">Item</label><p className="text-sm font-medium text-secondary">{lead.title || 'Engineering Job'}</p></div>
              <div>
                <label className="text-[10px] text-muted uppercase">Qty</label>
                <input type="number" defaultValue={1} className="w-full input-base mt-1" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 pb-2 border-b border-theme-subtle">Attachments / Photos</h2>
            <div 
              className="border-2 border-dashed border-theme-subtle rounded-lg p-6 text-center hover:bg-surface2/30 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload size={20} className="mx-auto text-muted mb-2" />
              <p className="text-[10px] text-secondary">Drag & drop files or click to upload</p>
              <p className="text-[9px] text-muted mt-1">Photos, Drawings (PDF, JPG)</p>
              <input type="file" id="file-upload" className="hidden" multiple onChange={(e) => {
                if (e.target.files) setFiles([...files, ...Array.from(e.target.files)])
              }} />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-surface2/50 p-2 rounded border border-theme-subtle">
                    <FileIcon size={12} className="text-rex-500 flex-shrink-0" />
                    <span className="text-[10px] text-secondary truncate flex-1">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-muted hover:text-red-500"><X size={12}/></button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Calculations */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Auto Material Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between bg-surface2/30">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Settings size={14} className="text-rex-500" /> Plate or Rod Sizes (mm)
              </h2>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addAutoMat} className="text-[10px] h-7">Add Item</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-surface2/50 border-b border-theme-subtle">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase">Material</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase w-16">Width</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase w-16">Length</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase">Supplier</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase w-16">Thick</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase w-16">Dia Ø</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase w-16">Qty</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-muted uppercase text-right w-24">Unit Price</th>
                    <th className="px-2 py-2 text-[10px] font-semibold text-rex-500 uppercase text-right w-24">Total (Rs)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {autoMaterials.map(mat => (
                    <tr key={mat.id} className="border-b border-theme-subtle/50 group">
                      <td className="px-2 py-1"><Autocomplete suggestions={materialSuggestions} onSelectOption={v => updateAutoMat(mat.id, 'material', v)} className="w-full input-base text-xs bg-transparent" placeholder="e.g. Grey cast iron" value={mat.material} onChange={e => updateAutoMat(mat.id, 'material', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="w-full input-base text-xs bg-transparent text-center" value={mat.width} onChange={e => updateAutoMat(mat.id, 'width', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="w-full input-base text-xs bg-transparent text-center" value={mat.length} onChange={e => updateAutoMat(mat.id, 'length', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="w-full input-base text-xs bg-transparent" value={mat.supplier} onChange={e => updateAutoMat(mat.id, 'supplier', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="w-full input-base text-xs bg-transparent text-center" value={mat.thick} onChange={e => updateAutoMat(mat.id, 'thick', e.target.value)} /></td>
                      <td className="px-1 py-1"><input className="w-full input-base text-xs bg-transparent text-center" value={mat.dia} onChange={e => updateAutoMat(mat.id, 'dia', e.target.value)} /></td>
                      <td className="px-1 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-center" value={mat.qty} onChange={e => updateAutoMat(mat.id, 'qty', e.target.value)} /></td>
                      <td className="px-1 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-right" value={mat.unitPrice} onChange={e => updateAutoMat(mat.id, 'unitPrice', e.target.value)} /></td>
                      <td className="px-1 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-right text-rex-500 font-bold" value={mat.totalPrice} onChange={e => updateAutoMat(mat.id, 'totalPrice', e.target.value)} /></td>
                      <td className="px-2 py-1 text-center"><button onClick={() => removeAutoMat(mat.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500"><Trash2 size={13}/></button></td>
                    </tr>
                  ))}
                  {autoMaterials.length === 0 && <tr><td colSpan={10} className="text-center py-4 text-xs text-muted">No materials added.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-surface2/30 text-right border-t border-theme-subtle">
              <span className="text-[10px] text-muted uppercase tracking-widest mr-4">Sub Total</span>
              <span className="font-bold text-sm text-primary">{formatCurrency(autoMatTotal)}</span>
            </div>
          </GlassCard>

          {/* Manual Material Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between bg-surface2/30">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Settings size={14} className="text-rex-500" /> Manually Calculated Material
              </h2>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addManualMat} className="text-[10px] h-7">Add Material</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface2/50 border-b border-theme-subtle">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase">Material</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase">Supplier</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase w-32">Price Mode</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-right w-24">Unit Price</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-center w-24">Req. Qty</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-rex-500 uppercase text-right w-32">Price (Rs)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {manualMaterials.map(mat => (
                    <tr key={mat.id} className="border-b border-theme-subtle/50 group">
                      <td className="px-2 py-1"><Autocomplete suggestions={materialSuggestions} onSelectOption={v => updateManualMat(mat.id, 'description', v)} className="w-full input-base text-xs bg-transparent" placeholder="Material Description" value={mat.description} onChange={e => updateManualMat(mat.id, 'description', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="w-full input-base text-xs bg-transparent" placeholder="Supplier" value={mat.supplier} onChange={e => updateManualMat(mat.id, 'supplier', e.target.value)} /></td>
                      <td className="px-2 py-1"><input className="w-full input-base text-xs bg-transparent" placeholder="-" value={mat.priceMode} onChange={e => updateManualMat(mat.id, 'priceMode', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-right" value={mat.unitPrice} onChange={e => updateManualMat(mat.id, 'unitPrice', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-center" value={mat.qty} onChange={e => updateManualMat(mat.id, 'qty', e.target.value)} /></td>
                      <td className="px-3 py-2 text-xs font-semibold text-primary text-right text-rex-500">{formatCurrency(mat.qty * mat.unitPrice)}</td>
                      <td className="px-2 py-1 text-center"><button onClick={() => removeManualMat(mat.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500"><Trash2 size={13}/></button></td>
                    </tr>
                  ))}
                  {manualMaterials.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-xs text-muted">No manual materials added.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-surface2/30 text-right border-t border-theme-subtle">
              <span className="text-[10px] text-muted uppercase tracking-widest mr-4">Sub Total</span>
              <span className="font-bold text-sm text-primary">{formatCurrency(manualMatTotal)}</span>
            </div>
          </GlassCard>

          {/* Machining Table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 border-b border-theme-subtle flex items-center justify-between bg-surface2/30">
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Hammer size={14} className="text-rex-500" /> Machining & Labor Estimation
              </h2>
              <Button variant="ghost" size="sm" icon={Plus} onClick={addProcess} className="text-[10px] h-7">Add Process</Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface2/50 border-b border-theme-subtle">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase">Process</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-center w-24">Est. Hr</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-center w-24">Set Hr</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-rex-500 uppercase text-center w-24">Quoted Hr</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-right w-24">Hr Rate</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted uppercase text-right w-32">Sub Total (Rs)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map(proc => (
                    <tr key={proc.id} className="border-b border-theme-subtle/50 group">
                      <td className="px-2 py-1">
                        <Autocomplete 
                          suggestions={serviceSuggestions}
                          onSelectOption={v => updateProc(proc.id, 'name', v)}
                          className="w-full input-base text-xs bg-transparent" 
                          placeholder="Search Process/Service" 
                          value={proc.name} 
                          onChange={e => updateProc(proc.id, 'name', e.target.value)} 
                        />
                      </td>
                      <td className="px-2 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-center" value={proc.estHrs} onChange={e => updateProc(proc.id, 'estHrs', e.target.value)} /></td>
                      <td className="px-2 py-1"><input type="number" className="w-full input-base text-xs bg-transparent text-center" value={proc.setHrs} onChange={e => updateProc(proc.id, 'setHrs', e.target.value)} /></td>
                      <td className="px-2 py-1 bg-rex-500/5"><input type="number" className="w-full input-base text-xs bg-transparent text-center font-bold text-rex-500" value={proc.quotedHrs} onChange={e => updateProc(proc.id, 'quotedHrs', e.target.value)} /></td>
                      <td className="px-3 py-2 text-xs text-muted text-right">{proc.rate.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-primary text-right">{formatCurrency(proc.quotedHrs * proc.rate)}</td>
                      <td className="px-2 py-1 text-center"><button onClick={() => removeProc(proc.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500"><Trash2 size={13}/></button></td>
                    </tr>
                  ))}
                  {processes.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-xs text-muted">No processes added.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-surface2/30 text-right border-t border-theme-subtle">
              <span className="text-[10px] text-muted uppercase tracking-widest mr-4">Total Machining Cost</span>
              <span className="font-bold text-sm text-primary">{formatCurrency(procTotal)}</span>
            </div>
          </GlassCard>

          {/* Grand Totals */}
          <GlassCard className="p-0 overflow-hidden border-rex-500/30 shadow-sm">
            <div className="bg-rex-500/5 dark:bg-rex-900/10 p-6 lg:p-8 flex flex-col items-end">
              <div className="w-full md:w-96 space-y-3">
                <div className="flex items-center justify-between text-sm text-secondary">
                  <span className="flex items-center gap-2 text-muted"><div className="w-1 h-1 rounded-full bg-slate-400/50"/> Total Materials</span>
                  <span className="font-mono font-medium">{formatCurrency(matTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-secondary">
                  <span className="flex items-center gap-2 text-muted"><div className="w-1 h-1 rounded-full bg-slate-400/50"/> Total Machining</span>
                  <span className="font-mono font-medium">{formatCurrency(procTotal)}</span>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-theme-subtle">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Sub Total</span>
                  <span className="font-mono font-bold text-primary">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-secondary">
                  <span className="text-[10px] font-semibold uppercase text-muted tracking-widest">SSCL (2.5%)</span>
                  <span className="font-mono text-muted text-xs">{formatCurrency(sscl)}</span>
                </div>
                
                <div className="flex items-end justify-between pt-5 mt-3 border-t-2 border-rex-500/20">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-rex-600 dark:text-rex-400 mb-0.5">Final Amount</span>
                    <span className="text-xl lg:text-2xl font-black tracking-tight text-primary">Quoted Price</span>
                  </div>
                  <span className="text-2xl lg:text-3xl font-black text-rex-600 dark:text-rex-500 tracking-tight">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </GlassCard>

        </div>
      </div>
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title={docType === 'customer' ? "Customer Quotation Preview" : "Production Job Quotation"} size="xl">
        <div className="bg-white text-slate-800 p-8 rounded-lg shadow-inner max-h-[70vh] overflow-y-auto">
          {/* Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-red-600 tracking-tighter">REX INDUSTRIES</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">ENGINEERING & MANUFACTURING</p>
              <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                <p>123 Industrial Estate, Colombo</p>
                <p>Tel: +94 11 234 5678 | Email: sales@rexindustries.lk</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-widest">{docType === 'customer' ? 'Quotation' : 'Job Quotation'}</h2>
              <div className="mt-2 text-sm grid grid-cols-2 gap-x-4 gap-y-1 text-left inline-grid">
                <span className="text-slate-500 font-medium">{docType === 'customer' ? 'Quote No:' : 'Job Quote No:'}</span><span className="font-semibold text-slate-800">QT-{Date.now().toString().slice(-6)}</span>
                <span className="text-slate-500 font-medium">Date:</span><span className="font-semibold text-slate-800">{date}</span>
                {docType === 'customer' && <><span className="text-slate-500 font-medium">Valid Till:</span><span className="font-semibold text-slate-800">30 Days</span></>}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Quotation For</p>
              <h3 className="font-bold text-slate-800 text-lg">{lead.company || lead.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{lead.name}</p>
              {lead.phone && <p className="text-sm text-slate-600">Tel: {lead.phone}</p>}
              {lead.email && <p className="text-sm text-slate-600">Email: {lead.email}</p>}
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Project Details</p>
              <p className="text-sm font-semibold text-slate-800"><span className="text-slate-500 mr-2 font-normal">Item:</span> {lead.title}</p>
              <p className="text-sm font-semibold text-slate-800 mt-1"><span className="text-slate-500 mr-2 font-normal">Qty:</span> 1 Unit</p>
            </div>
          </div>

          {docType === 'customer' ? (
            <>
              {/* Pricing Summary (Customer) */}
              <table className="w-full text-left mb-6 border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-2 px-4 font-semibold text-sm rounded-tl">Description</th>
                    <th className="py-2 px-4 font-semibold text-sm text-right rounded-tr w-48">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {matTotal > 0 && (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 text-sm font-medium text-slate-700">Material Cost</td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-800 text-right">{formatCurrency(matTotal)}</td>
                    </tr>
                  )}
                  {procTotal > 0 && (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 px-4 text-sm font-medium text-slate-700">Manufacturing & Processing Cost</td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-800 text-right">{formatCurrency(procTotal)}</td>
                    </tr>
                  )}
                  
                  <tr>
                    <td className="py-3 px-4 text-sm font-bold text-slate-700 text-right">Sub Total</td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-800 text-right">{formatCurrency(subTotal)}</td>
                  </tr>
                  <tr className="border-b-2 border-slate-800">
                    <td className="py-2 px-4 text-xs font-semibold text-slate-500 text-right">SSCL Tax (2.5%)</td>
                    <td className="py-2 px-4 text-sm font-semibold text-slate-600 text-right">{formatCurrency(sscl)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="py-4 px-4 text-lg font-black text-slate-800 text-right align-middle">Final Quoted Price</td>
                    <td className="py-4 px-4 text-lg font-black text-red-600 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-slate-500 font-normal line-through mr-2">
                          {customAmount ? formatCurrency(grandTotal) : ''}
                        </span>
                        <span className="text-sm text-slate-400 font-normal">Rs</span>
                        <input 
                          type="number" 
                          className="w-32 bg-white border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:border-red-500 text-lg font-black text-red-600"
                          placeholder={grandTotal.toFixed(2)}
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                        />
                      </div>
                      {customAmount && <div className="text-[10px] text-slate-500 font-normal mt-1">(Custom Override Applied)</div>}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs text-slate-500 mt-8 space-y-1">
                <p className="font-bold text-slate-700 mb-2">Terms & Conditions:</p>
                <p>1. Quotation valid for 30 days from the date of issue.</p>
                <p>2. 50% advance payment required to commence production.</p>
                <p>3. Delivery lead time: 14-21 working days after confirmation & advance payment.</p>
              </div>
            </>
          ) : (
            <>
              {/* Job Card (Production) */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-3">1. Raw Materials to Issue</h4>
                <table className="w-full text-left text-sm border border-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="py-1.5 px-2 border-b border-r border-slate-200 w-1/3">Material</th>
                      <th className="py-1.5 px-2 border-b border-r border-slate-200">W x L</th>
                      <th className="py-1.5 px-2 border-b border-r border-slate-200">Thick / Dia</th>
                      <th className="py-1.5 px-2 border-b border-slate-200">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoMaterials.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1 px-2 border-r border-slate-100">{m.material}</td>
                        <td className="py-1 px-2 border-r border-slate-100">{m.width && m.length ? `${m.width}x${m.length}` : '-'}</td>
                        <td className="py-1 px-2 border-r border-slate-100">{m.thick ? `${m.thick}mm (T)` : m.dia ? `${m.dia}mm (D)` : '-'}</td>
                        <td className="py-1 px-2">{m.qty}</td>
                      </tr>
                    ))}
                    {manualMaterials.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1 px-2 border-r border-slate-100" colSpan={3}>{m.description}</td>
                        <td className="py-1 px-2">{m.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-800 uppercase border-b-2 border-slate-800 pb-1 mb-3">2. Processing Instructions</h4>
                <table className="w-full text-left text-sm border border-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="py-1.5 px-2 border-b border-r border-slate-200">Operation / Machine</th>
                      <th className="py-1.5 px-2 border-b border-slate-200 w-32">Est. Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 border-r border-slate-100 font-medium text-slate-700">{p.name}</td>
                        <td className="py-1.5 px-2 text-slate-600">{p.estHrs ? `${p.estHrs} Hrs` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 border-t border-slate-300 pt-4 grid grid-cols-3 gap-8">
                 <div>
                   <div className="border-b border-slate-300 h-8 mb-1"></div>
                   <p className="text-[10px] text-slate-500 text-center uppercase">Issued By</p>
                 </div>
                 <div>
                   <div className="border-b border-slate-300 h-8 mb-1"></div>
                   <p className="text-[10px] text-slate-500 text-center uppercase">Received By</p>
                 </div>
                 <div>
                   <div className="border-b border-slate-300 h-8 mb-1"></div>
                   <p className="text-[10px] text-slate-500 text-center uppercase">QC Passed By</p>
                 </div>
              </div>
            </>
          )}
        </div>

        <div className="pt-4 mt-4 flex items-center justify-between border-t border-theme-subtle">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-rex-600 font-bold hover:bg-rex-50" onClick={() => handleSaveQuotation(docType)} disabled={isSaving}>
              {isSaving ? 'Saving...' : (docType === 'customer' ? '💾 Save Customer Version' : '💾 Save Job Version')}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
            <Button variant="primary" icon={Download} onClick={async () => {
              if (docType === 'customer') {
                try {
                  await updateLead(leadId!, { stage: 'proposal' });
                  showToast('success', 'Downloading PDF & Stage updated to Proposal Sent!');
                } catch (e) {
                  showToast('error', 'Failed to update lead stage');
                }
              } else {
                showToast('success', 'Downloading Job Card PDF...');
              }
            }}>Export PDF</Button>
            {docType === 'customer' ? (
              <>
                <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600" onClick={async () => {
                  try {
                    const payload = {
                      id: `INV-${Date.now().toString().slice(-6)}`,
                      quotationId: quotationHistory.length > 0 ? quotationHistory[0].id : 'Draft',
                      leadId: leadId,
                      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
                      items: '[]',
                      subtotal: Number(totalPrice),
                      tax: 0,
                      total: Number(totalPrice),
                      status: 'draft',
                      notes: 'Generated from Quotation'
                    }
                    await createInvoice(payload);
                    showToast('success', 'Invoice created successfully!');
                    setTimeout(() => {
                      setShowPreview(false);
                      navigate('/finance/invoices');
                    }, 1000);
                  } catch (e) {
                    showToast('error', 'Failed to create invoice');
                  }
                }}>Create Invoice</Button>
                <Button variant="primary" icon={Send} onClick={async () => { 
                  try {
                    await updateLead(leadId!, { stage: 'proposal' });
                    showToast('success', 'Sent to customer & Stage updated to Proposal Sent!'); 
                    setTimeout(() => {
                      setShowPreview(false); 
                      navigate('/crm/leads');
                    }, 1500);
                  } catch (e) {
                    showToast('error', 'Failed to update lead stage');
                  }
                }}>Email</Button>
              </>
            ) : (
              <Button variant="primary" icon={Send} onClick={() => { showToast('success', 'Sent to production!'); setShowPreview(false); navigate('/crm/leads'); }}>Send to Production</Button>
            )}
          </div>
        </div>
      </Modal>

    </div>
  )
}
