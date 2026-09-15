import React, { useState, useEffect } from 'react'
import {
  Download, Plus, Play, CheckCircle, AlertTriangle, Settings,
  Layers, Trash2, Users, ArrowUp, ArrowDown, Tag, Calculator,
  Package, Wrench, ListChecks, ClipboardList, ChevronRight
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

type PlannerTab = 'details' | 'bom' | 'routing' | 'machineworks'

const TABS: { id: PlannerTab; label: string }[] = [
  { id: 'details',      label: 'Job Details' },
  { id: 'bom',          label: 'Bill of Materials' },
  { id: 'routing',      label: 'Operations & Routing' },
  { id: 'machineworks', label: 'Machine Works' },
]

const TAB_ICONS: Record<PlannerTab, React.ReactNode> = {
  details:      <ClipboardList size={14}/>,
  bom:          <Package size={14}/>,
  routing:      <Layers size={14}/>,
  machineworks: <Wrench size={14}/>,
}

export const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<PlannerTab>('details')

  const [newWO, setNewWO] = useState({
    title: '', customerId: '', priority: 'Normal', deadline: '',
    notes: '', sourceQuoteId: '', jobQty: 1, docNo: '', subject: ''
  })
  const [bomRows, setBomRows] = useState<any[]>([{ material: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' }])
  const [operations, setOperations] = useState<any[]>([{ operationName: '', machineId: '', employeeId: '', plannedHours: 1, notes: '' }])
  const [machineWorks, setMachineWorks] = useState<any[]>([])
  const [quoteData, setQuoteData] = useState<any>(null)
  const [trackWO, setTrackWO] = useState<any>(null)
  const [showQcModal, setShowQcModal] = useState<any>(null)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [woRes, empRes, machRes, quoRes] = await Promise.all([
        fetch(API + '/production/work-orders').then(r => r.json()),
        fetch(API + '/hr/employees').then(r => r.json()),
        fetch(API + '/production/machineries').then(r => r.json()),
        fetch(API + '/quotations').then(r => r.json())
      ])
      setWorkOrders(Array.isArray(woRes) ? woRes : [])
      setEmployees(Array.isArray(empRes) ? empRes : [])
      setMachineries(Array.isArray(machRes) ? machRes : [])
      setQuotations(Array.isArray(quoRes) ? quoRes : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleApplyQuotation = (qId: string) => {
    setNewWO(prev => ({ ...prev, sourceQuoteId: qId }))
    if (!qId) { setQuoteData(null); setMachineWorks([]); return }
    const q = quotations.find(x => x.id === qId)
    if (!q) return
    setQuoteData(q)
    setNewWO(prev => ({
      ...prev,
      title: q.snapshot?.subject || 'Job - ' + q.id,
      customerId: q.leadName || q.leadId || '',
      docNo: q.snapshot?.docNo || '',
      jobQty: q.snapshot?.jobQty || 1,
      notes: q.snapshot?.jobItems?.map((ji:any, i:number) => `${i+1}. ${ji.text}`).join('\n') || ('Imported from quotation ' + q.id)
    }))
    const newBom: any[] = []
    if (q.snapshot?.autoMats?.length) {
      q.snapshot.autoMats.forEach((m: any) => newBom.push({ material: m.material||m.name||'', qty: 1, unit: 'pcs', unitCost: m.platePrice||m.shaftPrice||m.unitPrice||m.cost||0, notes: m.supplier||m.notes||'' }))
    }
    if (q.snapshot?.manualMats?.length) {
      q.snapshot.manualMats.forEach((m: any) => newBom.push({ material: m.material||m.name||'', qty: m.qty||1, unit: m.priceMode||m.unit||'pcs', unitCost: m.unitPrice||m.cost||0, notes: m.supplier||m.notes||'' }))
    }
    if (newBom.length) setBomRows(newBom)
    const ws: any[] = []
    if (q.snapshot?.procState) {
      Object.keys(q.snapshot.procState).forEach(proc => {
        const p = q.snapshot.procState[proc]
        const estHr = parseFloat(p.estHr || '0')
        const quoHr = parseFloat(p.quoHr || '0')
        if (estHr > 0 || quoHr > 0) ws.push({ process: proc, estHours: estHr, quoHours: quoHr, rate: p.rate||0, setTime: p.setTime||'' })
      })
    }
    setMachineWorks(ws)
    if (ws.length > 0) {
      setOperations(ws.map(w => {
        const mm = machineries.find(m => m.name.toLowerCase().includes(w.process.toLowerCase()) || m.type.toLowerCase().includes(w.process.toLowerCase()))
        return { operationName: w.process, machineId: mm ? mm.id : '', employeeId: '', plannedHours: w.estHours || w.quoHours || 1, notes: 'Rate: LKR ' + w.rate + '/hr' }
      }))
    }
  }

  const resetForm = () => {
    setNewWO({ title:'', customerId:'', priority:'Normal', deadline:'', notes:'', sourceQuoteId:'', jobQty:1, docNo:'', subject:'' })
    setBomRows([{ material:'', qty:1, unit:'pcs', unitCost:0, notes:'' }])
    setOperations([{ operationName:'', machineId:'', employeeId:'', plannedHours:1, notes:'' }])
    setMachineWorks([])
    setQuoteData(null)
    setActiveTab('details')
  }

  const moveOp = (i: number, dir: 'up'|'down') => {
    const o = [...operations]
    const ti = dir === 'up' ? i-1 : i+1
    if (ti < 0 || ti >= o.length) return
    ;[o[i], o[ti]] = [o[ti], o[i]]
    setOperations(o)
  }

  const totalEstHours = operations.reduce((s, o) => s + (parseFloat(o.plannedHours)||0), 0)
  const totalEstMach = operations.reduce((s, op) => {
    const m = machineries.find(m => m.id === op.machineId)
    return s + (parseFloat(op.plannedHours)||0) * (m ? parseFloat(m.hourlyCost||0) : 0)
  }, 0)
  const totalBomCost = bomRows.reduce((s, r) => s + (parseFloat(r.qty)||0)*(parseFloat(r.unitCost)||0), 0)
  const grandTotal = totalEstMach + totalBomCost

  const handleSaveWO = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await fetch(API + '/production/work-orders', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...newWO, operations, bom: bomRows, totalEstimatedCost: grandTotal })
      })
      setShowModal(false); resetForm(); fetchData()
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  const handleUpdateOpStatus = async (opId: string, status: string) => {
    await fetch(API + '/production/operations/' + opId + '/status', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    fetchData()
    if (trackWO) {
      const u = await fetch(API + '/production/work-orders').then(r => r.json())
      setTrackWO(u.find((w: any) => w.id === trackWO.id))
    }
  }

  const handleLogQC = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    const fd = new FormData(e.target as HTMLFormElement)
    await fetch(API + '/production/operations/' + showQcModal.id + '/qc', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ inspectedBy: 'QA Admin', status: fd.get('status'), defectReason: fd.get('defectReason'), notes: fd.get('notes') })
    })
    setShowQcModal(null); fetchData()
    if (trackWO) {
      const u = await fetch(API + '/production/work-orders').then(r => r.json())
      setTrackWO(u.find((w: any) => w.id === trackWO.id))
    }
    setSubmitting(false)
  }

  const filtered = workOrders.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.id.toLowerCase().includes(search.toLowerCase())
  )

  const columns: Column<any>[] = [
    {
      key: 'title', header: 'Work Order', sortable: true,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
            <Layers size={14} className="text-white"/>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{row.title}</p>
            <p className="text-[10px] text-muted font-mono">{row.id}</p>
          </div>
        </div>
      )
    },
    { key: 'priority', header: 'Priority', render: (v: any) => <Badge value={String(v)} variant={v==='High'?'error':v==='Urgent'?'warning':'default'}/> },
    { key: 'deadline', header: 'Deadline', render: (v: any) => <span className="text-xs text-secondary">{v ? new Date(v as string).toLocaleDateString() : '-'}</span> },
    {
      key: 'operations', header: 'Progress',
      render: (_: any, row: any) => {
        const total = row.operations?.length || 0
        const done = row.operations?.filter((o: any) => o.status === 'Completed').length || 0
        const pct = total === 0 ? 0 : Math.round((done/total)*100)
        return (
          <div className="w-36">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted">{done}/{total} Steps</span>
              <span className="font-bold text-rex-600">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
              <div className="h-full bg-rex-600 rounded-full transition-all" style={{ width: pct + '%' }}/>
            </div>
          </div>
        )
      }
    },
    { key: 'status', header: 'Status', render: (v: any) => <span className="text-xs font-semibold text-secondary">{String(v)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_: any, row: any) => (
        <Button variant="ghost" size="sm" onClick={() => setTrackWO(row)} className="text-rex-600 hover:bg-rex-500/10">
          <Settings size={14} className="mr-1.5"/> Track
        </Button>
      )
    }
  ]

  const tabComplete: Record<PlannerTab, boolean> = {
    details:      !!(newWO.title && newWO.customerId),
    bom:          bomRows.some(r => r.material),
    routing:      operations.some(o => o.operationName),
    machineworks: machineWorks.length > 0,
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Work Orders & Production Planning</h1>
          <p className="text-xs text-muted mt-0.5">BOM, routing, machine allocation and shop floor tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => { resetForm(); setShowModal(true) }}>New Work Order</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search work orders..." value={search} onChange={setSearch} className="w-80"/>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading
          ? <div className="p-10 text-center animate-pulse text-xs text-muted">Loading...</div>
          : <DataTable columns={columns} data={filtered} keyExtractor={r => r.id} emptyMessage="No work orders found."/>
        }
      </GlassCard>

      {/* FULLSCREEN ADVANCED PRODUCTION PLANNER */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Advanced Production Planner" size="2xl">
        <form onSubmit={handleSaveWO} className="flex flex-col h-full">

          {/* Sub-nav + Quote Source */}
          <div className="flex items-center gap-0 px-2 border-b border-theme-subtle bg-surface flex-shrink-0 overflow-x-auto mb-4">
            {TABS.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={'flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ' + (activeTab === t.id ? 'border-rex-500 text-rex-600 dark:text-rex-400 bg-rex-500/5' : 'border-transparent text-muted hover:text-secondary hover:bg-surface2/30')}>
                {TAB_ICONS[t.id]} {t.label}
                {tabComplete[t.id] && <span className="w-2 h-2 rounded-full bg-green-500 ml-1"/>}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2 pl-6 border-l border-theme-subtle shrink-0">
              <Calculator size={13} className="text-blue-500"/>
              <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Source Quote:</label>
              <select className="input-base text-xs py-1 min-w-[280px]" value={newWO.sourceQuoteId} onChange={e => handleApplyQuotation(e.target.value)}>
                <option value="">-- Start from scratch --</option>
                {quotations.filter(q => q.type === 'job' || q.status === 'Accepted' || q.status === 'Won').map(q => (
                  <option key={q.id} value={q.id}>{q.leadName||'Unknown'} — {q.id} ({q.snapshot?.subject||'No Subject'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* BODY: Scrollable content + sticky right sidebar */}
          <div className="flex flex-col md:flex-row gap-6">

            {/* Main scrollable panel */}
            <div className="flex-1">

              {/* TAB: JOB DETAILS */}
              {activeTab === 'details' && (
                <div className="max-w-4xl space-y-5">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest pb-2 border-b border-theme-subtle flex items-center gap-2">
                    <Tag size={14} className="text-rex-500"/> Job & Order Information
                  </h3>
                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Job Title / Description *</label>
                      <input required value={newWO.title} onChange={e => setNewWO({...newWO, title: e.target.value})} className="w-full input-base text-base font-semibold py-3" placeholder="e.g. Engine Block Precision Machining"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">WO / Document Number</label>
                      <input value={newWO.docNo} onChange={e => setNewWO({...newWO, docNo: e.target.value})} className="w-full input-base font-mono" placeholder="REX-WO-2024"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Customer / Lead *</label>
                      <input value={newWO.customerId} onChange={e => setNewWO({...newWO, customerId: e.target.value})} className="w-full input-base" placeholder="Customer name or Lead ID"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Job Quantity</label>
                      <input type="number" min="1" value={newWO.jobQty} onChange={e => setNewWO({...newWO, jobQty: parseInt(e.target.value)||1})} className="w-full input-base font-mono"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Priority</label>
                      <select value={newWO.priority} onChange={e => setNewWO({...newWO, priority: e.target.value})} className="w-full input-base">
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Target Deadline</label>
                      <input type="date" value={newWO.deadline} onChange={e => setNewWO({...newWO, deadline: e.target.value})} className="w-full input-base"/>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1.5">Internal Notes / Special Instructions</label>
                      <textarea value={newWO.notes} onChange={e => setNewWO({...newWO, notes: e.target.value})} className="w-full input-base h-28 resize-none" placeholder="Customer requirements, quality standards, special handling instructions..."/>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BOM */}
              {activeTab === 'bom' && (
                <div className="max-w-5xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Package size={14} className="text-rex-500"/> Bill of Materials
                    </h3>
                    <Button variant="ghost" size="sm" type="button" onClick={() => setBomRows([...bomRows, { material:'', qty:1, unit:'pcs', unitCost:0, notes:'' }])}>+ Add Material</Button>
                  </div>
                  <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface2/40 border-b border-theme-subtle text-xs text-secondary">
                          <th className="text-left py-2.5 px-3 font-bold w-8">#</th>
                          <th className="text-left py-2.5 px-3 font-bold">Material / Part Name</th>
                          <th className="text-left py-2.5 px-3 font-bold w-20">Qty</th>
                          <th className="text-left py-2.5 px-3 font-bold w-20">Unit</th>
                          <th className="text-left py-2.5 px-3 font-bold w-36">Unit Cost (LKR)</th>
                          <th className="text-left py-2.5 px-3 font-bold w-32">Line Total</th>
                          <th className="text-left py-2.5 px-3 font-bold">Notes / Supplier</th>
                          <th className="w-10"/>
                        </tr>
                      </thead>
                      <tbody>
                        {bomRows.map((row, i) => {
                          const lt = (parseFloat(row.qty)||0)*(parseFloat(row.unitCost)||0)
                          return (
                            <tr key={i} className="border-b border-theme-subtle/60 last:border-0 hover:bg-surface/50">
                              <td className="py-1.5 px-3 text-xs font-mono text-muted">{i+1}</td>
                              <td className="py-1.5 px-3"><input value={row.material} onChange={e => { const r=[...bomRows]; r[i].material=e.target.value; setBomRows(r) }} className="w-full input-base text-xs py-1" placeholder="e.g. EN8 Steel Bar"/></td>
                              <td className="py-1.5 px-3"><input type="number" value={row.qty} onChange={e => { const r=[...bomRows]; r[i].qty=e.target.value; setBomRows(r) }} className="w-full input-base text-xs py-1 font-mono"/></td>
                              <td className="py-1.5 px-3">
                                <select value={row.unit} onChange={e => { const r=[...bomRows]; r[i].unit=e.target.value; setBomRows(r) }} className="w-full input-base text-xs py-1">
                                  {['pcs','kg','m','L','mm','set','lot'].map(u => <option key={u}>{u}</option>)}
                                </select>
                              </td>
                              <td className="py-1.5 px-3"><input type="number" value={row.unitCost} onChange={e => { const r=[...bomRows]; r[i].unitCost=e.target.value; setBomRows(r) }} className="w-full input-base text-xs py-1 font-mono"/></td>
                              <td className="py-1.5 px-3 text-xs font-mono font-bold text-primary">{lt.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                              <td className="py-1.5 px-3"><input value={row.notes} onChange={e => { const r=[...bomRows]; r[i].notes=e.target.value; setBomRows(r) }} className="w-full input-base text-xs py-1" placeholder="Supplier / spec..."/></td>
                              <td className="py-1.5 px-2"><button type="button" onClick={() => setBomRows(bomRows.filter((_,idx) => idx!==i))} className="w-7 h-7 bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center rounded"><Trash2 size={12}/></button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-surface2/30 border-t-2 border-theme-subtle">
                          <td colSpan={5} className="py-2.5 px-3 text-xs font-bold text-secondary uppercase text-right">Total BOM Cost</td>
                          <td className="py-2.5 px-3 text-sm font-black text-primary font-mono">LKR {totalBomCost.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                          <td colSpan={2}/>
                        </tr>
                      </tfoot>
                    </table>
                  </GlassCard>
                </div>
              )}

              {/* TAB: ROUTING */}
              {activeTab === 'routing' && (
                <div className="max-w-5xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} className="text-rex-500"/> Operations Routing Sequence
                    </h3>
                    <Button variant="ghost" size="sm" type="button" onClick={() => setOperations([...operations, { operationName:'', machineId:'', employeeId:'', plannedHours:1, notes:'' }])}>+ Add Step</Button>
                  </div>
                  <div className="space-y-3">
                    {operations.map((op, i) => {
                      const sm = machineries.find(m => m.id === op.machineId)
                      const sc = (parseFloat(op.plannedHours)||0) * (sm ? parseFloat(sm.hourlyCost||0) : 0)
                      const isMaint = sm?.status === 'Maintenance'
                      return (
                        <div key={i} className={'p-4 rounded-lg border bg-surface shadow-sm ' + (isMaint ? 'border-red-500/40' : 'border-theme-subtle')}>
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center gap-1 pt-1">
                              <div className="w-8 h-8 rounded-full bg-rex-500/10 border border-rex-500/20 flex items-center justify-center text-xs font-black text-rex-600">{i+1}</div>
                              <button type="button" onClick={() => moveOp(i,'up')} disabled={i===0} className="text-muted disabled:opacity-20 hover:text-primary"><ArrowUp size={11}/></button>
                              <button type="button" onClick={() => moveOp(i,'down')} disabled={i===operations.length-1} className="text-muted disabled:opacity-20 hover:text-primary"><ArrowDown size={11}/></button>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[9px] text-muted uppercase font-bold">Operation Name *</label>
                                  <input required value={op.operationName} onChange={e => { const o=[...operations]; o[i].operationName=e.target.value; setOperations(o) }} className="w-full input-base text-xs py-1.5" placeholder="e.g. CNC Roughing"/>
                                </div>
                                <div>
                                  <label className={'text-[9px] uppercase font-bold ' + (isMaint ? 'text-red-500' : 'text-muted')}>Machine {isMaint ? '⚠ Under Maintenance' : ''}</label>
                                  <select value={op.machineId} onChange={e => { const o=[...operations]; o[i].machineId=e.target.value; setOperations(o) }} className={'w-full input-base text-xs py-1.5 ' + (isMaint ? 'border-red-500/50' : '')}>
                                    <option value="">-- Any Available --</option>
                                    {machineries.map(m => (
                                      <option key={m.id} value={m.id}>{m.name} — {m.type} {m.status==='Maintenance'?'⚠':''}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted uppercase font-bold">Assigned Operator</label>
                                  <select value={op.employeeId} onChange={e => { const o=[...operations]; o[i].employeeId=e.target.value; setOperations(o) }} className="w-full input-base text-xs py-1.5">
                                    <option value="">-- Any Available --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-3 items-center">
                                <div className="w-28">
                                  <label className="text-[9px] text-muted uppercase font-bold">Plan. Hours</label>
                                  <input type="number" step="0.25" value={op.plannedHours} onChange={e => { const o=[...operations]; o[i].plannedHours=e.target.value; setOperations(o) }} className="w-full input-base text-xs py-1 font-mono"/>
                                </div>
                                <div className="flex-1 flex items-center gap-3 bg-surface2/30 rounded-lg border border-theme-subtle px-3 py-2">
                                  <input value={op.notes} onChange={e => { const o=[...operations]; o[i].notes=e.target.value; setOperations(o) }} className="flex-1 bg-transparent border-none outline-none text-xs text-secondary placeholder:text-muted/60" placeholder="Operator instructions, tolerances..."/>
                                  <div className="shrink-0 text-right border-l border-theme-subtle pl-3">
                                    <div className="text-[9px] text-muted uppercase font-bold">Step Cost</div>
                                    <div className="text-xs font-mono font-bold text-primary">LKR {sc.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
                                  </div>
                                </div>
                                <button type="button" onClick={() => setOperations(operations.filter((_,idx) => idx!==i))} className="w-8 h-8 bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center rounded transition-colors"><Trash2 size={13}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB: MACHINE WORKS */}
              {activeTab === 'machineworks' && (
                <div className="max-w-5xl space-y-4">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={14} className="text-rex-500"/> Machine Works (from Quotation)
                  </h3>
                  {machineWorks.length === 0 ? (
                    <GlassCard className="p-16 text-center border border-dashed border-theme-subtle">
                      <Wrench size={36} className="text-muted mx-auto mb-3 opacity-20"/>
                      <p className="text-sm text-muted font-semibold">No machine works imported yet.</p>
                      <p className="text-xs text-muted mt-1">Select a Job Quotation in the top-right — processes will auto-populate here.</p>
                    </GlassCard>
                  ) : (
                    <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface2/40 border-b border-theme-subtle text-xs text-secondary">
                            <th className="text-left py-3 px-4 font-bold">Process / Operation</th>
                            <th className="text-right py-3 px-4 font-bold">Est. Hrs</th>
                            <th className="text-right py-3 px-4 font-bold">Quo. Hrs</th>
                            <th className="text-right py-3 px-4 font-bold">Set Time</th>
                            <th className="text-right py-3 px-4 font-bold">Rate (LKR/hr)</th>
                            <th className="text-right py-3 px-4 font-bold">Quoted Cost</th>
                            <th className="text-left py-3 px-4 font-bold">Auto-Matched Machine</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machineWorks.map((w, i) => {
                            const qc = (parseFloat(w.quoHours)||parseFloat(w.estHours)||0) * (parseFloat(w.rate)||0)
                            const matchedOp = operations.find(op => op.operationName === w.process)
                            const mm = matchedOp ? machineries.find(m => m.id === matchedOp.machineId) : null
                            return (
                              <tr key={i} className="border-b border-theme-subtle/60 last:border-0 hover:bg-surface/50">
                                <td className="py-2.5 px-4 font-semibold text-primary text-xs">{w.process}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs text-secondary">{w.estHours||'-'}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-primary">{w.quoHours||'-'}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs text-secondary">{w.setTime||'-'}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs text-secondary">{parseFloat(w.rate||0).toLocaleString()}</td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-primary">{qc.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                                <td className="py-2.5 px-4">
                                  {mm ? (
                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] rounded font-bold">{mm.name}</span>
                                  ) : (
                                    <span className="text-[10px] text-muted italic">Assign in Routing tab</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-surface2/30 border-t-2 border-theme-subtle">
                            <td colSpan={5} className="py-3 px-4 text-xs font-bold text-secondary uppercase text-right">Quoted Machining Total</td>
                            <td className="py-3 px-4 text-right text-sm font-black text-primary font-mono">
                              LKR {machineWorks.reduce((s,w) => s + ((parseFloat(w.quoHours)||parseFloat(w.estHours)||0)*(parseFloat(w.rate)||0)),0).toLocaleString(undefined,{minimumFractionDigits:2})}
                            </td>
                            <td/>
                          </tr>
                        </tfoot>
                      </table>
                    </GlassCard>
                  )}
                </div>
              )}
            </div>

            {/* STICKY RIGHT SIDEBAR */}
            <div className="w-full md:w-72 flex-shrink-0 md:border-l border-theme-subtle bg-surface/50 rounded-xl p-4 flex flex-col h-fit">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                  <ListChecks size={12}/> Production Summary
                </p>

                <div className="p-3 bg-surface border border-theme-subtle rounded-lg">
                  <p className="text-[10px] text-muted uppercase font-bold">Total Planned Hours</p>
                  <p className="text-2xl font-mono font-light text-primary">{totalEstHours.toFixed(1)} <span className="text-xs text-muted">hrs</span></p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">Est. Machining Cost</p>
                  <p className="text-base font-mono font-bold text-blue-700 dark:text-blue-300">LKR {totalEstMach.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Total Material (BOM)</p>
                  <p className="text-base font-mono font-bold text-amber-700 dark:text-amber-300">LKR {totalBomCost.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>
                <div className="p-3 bg-rex-500/10 border border-rex-500/20 rounded-lg">
                  <p className="text-[10px] text-rex-600 dark:text-rex-400 uppercase font-bold">Grand Total (Est.)</p>
                  <p className="text-xl font-mono font-black text-rex-700 dark:text-rex-300">LKR {grandTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                </div>

                {quoteData?.amount && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold">Quoted Revenue</p>
                    <p className="text-base font-mono font-bold text-green-700 dark:text-green-300">LKR {parseFloat(quoteData.amount||0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                    <div className="mt-2 pt-2 border-t border-green-500/20">
                      <p className="text-[10px] text-green-600/70 uppercase font-bold">Est. Gross Margin</p>
                      <p className={'text-sm font-mono font-bold ' + ((parseFloat(quoteData.amount||0)-grandTotal)>=0 ? 'text-green-600' : 'text-red-500')}>
                        LKR {(parseFloat(quoteData.amount||0)-grandTotal).toLocaleString(undefined,{minimumFractionDigits:2})}
                      </p>
                    </div>
                  </div>
                )}

                <div className="w-full h-px bg-theme-subtle"/>

                <div>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Planner Completion</p>
                  {TABS.map(t => (
                    <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                      className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold mb-1 transition-colors ' + (activeTab===t.id ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'hover:bg-surface2 text-secondary')}>
                      <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (tabComplete[t.id] ? 'bg-green-500 border-green-500' : 'border-muted')}>
                        {tabComplete[t.id] && <CheckCircle size={10} className="text-white"/>}
                      </div>
                      {t.label}
                      <ChevronRight size={12} className="ml-auto"/>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-theme-subtle">
                <Button variant="primary" type="submit" disabled={submitting} className="w-full py-3 text-sm font-bold">
                  {submitting ? 'Generating...' : 'Generate Work Order'}
                </Button>
                <p className="text-[10px] text-muted text-center mt-2">All sections will be saved to production DB</p>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* SHOP FLOOR TRACKING MODAL */}
      <Modal isOpen={!!trackWO} onClose={() => setTrackWO(null)} title="Shop Floor Tracking" size="lg">
        {trackWO && (
          <div className="p-4 space-y-5">
            <div className="bg-surface/50 p-4 border border-theme-subtle rounded-lg flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-primary">{trackWO.title}</h2>
                <p className="text-xs font-mono text-muted mt-1">{trackWO.id} • {trackWO.status}</p>
              </div>
              <Badge value={trackWO.priority} variant={trackWO.priority==='High'?'error':'default'}/>
            </div>
            <div className="space-y-3">
              {trackWO.operations?.map((op: any, i: number) => {
                const m = machineries.find(m => m.id === op.machineId)
                const e = employees.find(e => e.id === op.employeeId)
                return (
                  <div key={op.id} className={'p-4 border rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between ' + (op.status==='Completed'?'border-green-500/30 bg-green-500/5':op.status==='In Progress'?'border-blue-500/50 bg-blue-500/5':op.status==='Rework Required'?'border-red-500/50 bg-red-500/5':'border-theme-subtle bg-surface')}>
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <div className={'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ' + (op.status==='Completed'?'bg-green-500 text-white':'bg-surface2 text-muted')}>
                        {op.status==='Completed' ? <CheckCircle size={16}/> : (i+1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{op.operationName}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-secondary">
                          <span className="flex items-center gap-1"><Settings size={10}/> {m?.name||'Any Machine'}</span>
                          <span className="flex items-center gap-1"><Users size={10}/> {e?.name||'Any Operator'}</span>
                          <span className="font-mono bg-surface2 px-1.5 py-0.5 rounded">Est: {op.plannedHours}h</span>
                          {op.actualHours>0 && <span className="font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">Act: {Number(op.actualHours).toFixed(1)}h</span>}
                        </div>
                        {op.status==='Rework Required' && <p className="text-xs text-red-500 font-bold mt-1">QC Failed — Rework Required</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      {op.status==='Pending' && <Button variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateOpStatus(op.id,'In Progress')}><Play size={12} className="mr-1.5"/> Start</Button>}
                      {op.status==='In Progress' && <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateOpStatus(op.id,'QC Pending')}><CheckCircle size={12} className="mr-1.5"/> Finish & QC</Button>}
                      {op.status==='QC Pending' && <Button variant="primary" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setShowQcModal(op)}><AlertTriangle size={12} className="mr-1.5"/> Perform QC</Button>}
                      {(op.status==='Rework Required'||op.status==='Completed') && op.qc?.map((q: any) => (
                        <div key={q.id} className={'px-2 py-1 text-[10px] rounded font-bold border ' + (q.status==='Pass'?'bg-green-500/10 text-green-600 border-green-500/20':'bg-red-500/10 text-red-600 border-red-500/20')}>
                          QC {q.status}: {q.notes||q.defectReason||'-'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* QC MODAL */}
      <Modal isOpen={!!showQcModal} onClose={() => setShowQcModal(null)} title="Quality Control Inspection" size="md">
        {showQcModal && (
          <form onSubmit={handleLogQC} className="p-4 space-y-4">
            <p className="text-sm text-secondary border-b border-theme-subtle pb-3">Inspecting: <span className="font-bold text-primary">{showQcModal.operationName}</span></p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Result *</label>
              <select name="status" required className="w-full input-base" onChange={e => {
                const w = document.getElementById('defectWrap');
                if (w) (w as HTMLElement).style.display = e.target.value==='Fail' ? 'block' : 'none';
              }}>
                <option value="">-- Select --</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail (Rework / Scrap)</option>
              </select>
            </div>
            <div id="defectWrap" style={{display:'none'}} className="space-y-1.5">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Defect Reason</label>
              <select name="defectReason" className="w-full input-base">
                <option value="Tolerance/Dimensions">Tolerance/Dimensions mismatch</option>
                <option value="Surface Finish">Surface finish poor</option>
                <option value="Material Flaw">Material flaw / Crack</option>
                <option value="Assembly Error">Assembly error</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Inspector Notes</label>
              <textarea name="notes" className="w-full input-base h-20 resize-none" placeholder="Measurements, findings..."/>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setShowQcModal(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>{submitting?'Saving...':'Submit QC Report'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
