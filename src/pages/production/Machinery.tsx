import React, { useState, useEffect } from 'react'
import { Download, Plus, Filter, Factory, Wrench, Users, Save, Trash2, Edit, Tag, ArrowRight, ShieldCheck, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import * as api from '@/lib/api'
const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}`

export const Machinery: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'machines'|'categories'|'maintenance'>('categories')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [machines, setMachines] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [assignedOperators, setAssignedOperators] = useState<string[]>([])
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showMachineModal, setShowMachineModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showMntModal, setShowMntModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [newMachinery, setNewMachinery] = useState({ name: '', category: '', model: '', status: 'Active', hourlyCost: '' })
  const [newCategoryName, setNewCategoryName] = useState('')
  
  const [manageMachine, setManageMachine] = useState<any>(null)
  const [manageCategory, setManageCategory] = useState<any>(null)
  const [opForm, setOpForm] = useState({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })
  const [mntForm, setMntForm] = useState({
    machineId: '',
    type: 'Preventive',
    scheduledDate: new Date().toISOString().slice(0, 10),
    performedDate: new Date().toISOString().slice(0, 10),
    performedBy: 'Maintenance Tech',
    description: '',
    downtimeHours: 0,
    partsReplaced: '',
    cost: 0,
    status: 'Completed'
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [machRes, catRes, empRes, opsRes, mntRes] = await Promise.all([
        fetch(`${API_URL}/production/machineries`).then(r => r.json()),
        fetch(`${API_URL}/production/categories`).then(r => r.json()),
        fetch(`${API_URL}/hr/employees`).then(r => r.json()),
        api.fetchMachiningOperations(),
        api.fetchMachineMaintenanceLogs().catch(() => [])
      ])
      setMachines(Array.isArray(machRes) ? machRes : [])
      setCategories(Array.isArray(catRes) ? catRes : [])
      setEmployees(Array.isArray(empRes) ? empRes : [])
      setOperations(Array.isArray(opsRes) ? opsRes : [])
      setMaintenanceLogs(Array.isArray(mntRes) ? mntRes : [])
    } catch(e) {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const fetchAssignedOperators = async (machineId: string) => {
    try {
      const res = await fetch(`${API_URL}/production/machineries/${machineId}/operators`).then(r => r.json())
      setAssignedOperators(Array.isArray(res) ? res.map((e:any) => e.id) : [])
    } catch(e) {}
  }

  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    await fetch(`${API_URL}/production/machineries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'MAC-' + Date.now().toString().slice(-4), ...newMachinery, type: newMachinery.category || categories[0]?.name, hourlyCost: Number(newMachinery.hourlyCost || 0) })
    })
    setSubmitting(false); setShowMachineModal(false)
    setNewMachinery({ name: '', category: '', model: '', status: 'Active', hourlyCost: '' })
    fetchData()
  }

  const handleSaveOperators = async () => {
    if (!manageMachine) return
    try {
      const res = await fetch(`${API_URL}/production/machineries/${manageMachine.id}/operators`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: assignedOperators })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      setManageMachine(null)
      fetchData()
    } catch (err: any) {
      console.error(err);
      alert("DB Error: " + err.message);
    }
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCategoryName) return
    await fetch(`${API_URL}/production/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCategoryName }) })
    setShowCatModal(false); setNewCategoryName(''); fetchData()
  }

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.createMachineMaintenanceLog({
        ...mntForm,
        downtimeHours: Number(mntForm.downtimeHours) || 0,
        cost: Number(mntForm.cost) || 0
      })
      setShowMntModal(false)
      setMntForm({
        machineId: '',
        type: 'Preventive',
        scheduledDate: new Date().toISOString().slice(0, 10),
        performedDate: new Date().toISOString().slice(0, 10),
        performedBy: 'Maintenance Tech',
        description: '',
        downtimeHours: 0,
        partsReplaced: '',
        cost: 0,
        status: 'Completed'
      })
      fetchData()
    } catch (err: any) {
      alert('Failed to save maintenance log: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveOp = async (e: React.FormEvent) => {
    e.preventDefault(); if (!manageCategory) return
    const payload = { machineId: opForm.machineId || null, groupName: manageCategory.name, name: opForm.name, hrRate: Number(opForm.hrRate), setTimeRate: Number(opForm.setTimeRate) }
    if (opForm.id) await api.updateMachiningOperation(opForm.id, payload)
    else await api.createMachiningOperation(payload)
    setOpForm({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })
    const opsRes = await api.fetchMachiningOperations()
    setOperations(Array.isArray(opsRes) ? opsRes : [])
  }

  const handleDeleteOp = async (id: string) => {
    if (!confirm('Delete this operation?')) return
    await api.deleteMachiningOperation(id)
    const opsRes = await api.fetchMachiningOperations()
    setOperations(Array.isArray(opsRes) ? opsRes : [])
  }

  const handleEditOp = (op: any) => setOpForm({ id: op.id, name: op.name, hrRate: String(op.hrRate), setTimeRate: String(op.setTimeRate), machineId: op.machineId || '' })

  let filteredMachines = machines.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.model.toLowerCase().includes(search.toLowerCase()))
  if (filterStatus !== 'All') filteredMachines = filteredMachines.filter(r => r.status === filterStatus)

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Machinery / Work Center', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-rex-700 border border-rex-600/40 flex items-center justify-center flex-shrink-0">
            <Factory size={12} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary truncate">{row.name}</p>
            <p className="text-[10px] text-muted">{row.id}</p>
          </div>
        </div>
      )
    },
    { key: 'type', header: 'Category', render: (v: any) => <span className="text-xs text-secondary truncate">{String(v)}</span> },
    { key: 'model', header: 'Model / Serial', render: (v: any) => <span className="text-[10px] text-muted">{String(v)}</span> },
      { key: 'operators', header: 'Assigned Operators', render: (v: any) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(v) && v.length > 0 ? v.map((op, i) => (
            <Badge key={i} value={op} variant="default" size="sm" />
          )) : <span className="text-[10px] text-muted italic">None</span>}
        </div>
      )},
    { key: 'status', header: 'Status', render: (v: any) => <Badge value={String(v).toUpperCase()} variant={v === 'Active' ? 'success' : v === 'Maintenance' ? 'warning' : 'error'} size="sm" /> },
    { 
      key: 'actions', 
      header: '', 
      align: 'right', 
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Wrench} 
            onClick={() => {
              setMntForm(prev => ({ ...prev, machineId: row.id }))
              setShowMntModal(true)
            }} 
            className="text-xs text-amber-500 hover:text-amber-600"
          >
            Log PM / Breakdown
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Users} 
            onClick={() => { setManageMachine(row); fetchAssignedOperators(row.id) }} 
            className="text-xs"
          >
            Operators
          </Button>
        </div>
      )
    }
  ]

  const currentCategoryOps = manageCategory ? operations.filter(o => o.groupName === manageCategory.name) : []

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex justify-between items-center pb-2">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Machineries & Operations</h1>
          <p className="text-xs text-muted mt-1">{machines.length} physical machines registered across {categories.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-theme-subtle rounded-md overflow-hidden">
            <button onClick={() => setActiveMainTab('categories')} className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeMainTab === 'categories' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400 font-semibold' : 'text-muted hover:text-primary'}`}>Categories</button>
            <button onClick={() => setActiveMainTab('machines')} className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeMainTab === 'machines' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400 font-semibold' : 'text-muted hover:text-primary'}`}>Physical Machines</button>
            <button onClick={() => setActiveMainTab('maintenance')} className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${activeMainTab === 'maintenance' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400 font-semibold' : 'text-muted hover:text-primary'}`}>ISO 7.1.3 Maintenance & TPM</button>
          </div>
          {activeMainTab === 'categories' ? (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCatModal(true)}>Add Category</Button>
          ) : activeMainTab === 'machines' ? (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowMachineModal(true)}>Add Machinery</Button>
          ) : (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowMntModal(true)}>Log Maintenance Ticket</Button>
          )}
        </div>
      </div>

      {activeMainTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {loading && <div className="col-span-full p-10 text-center text-xs text-muted">Loading categories...</div>}
          {!loading && categories.length === 0 && <div className="col-span-full p-10 text-center text-xs text-muted border border-dashed border-theme-subtle rounded-lg">No machine categories found.</div>}
          
          {!loading && categories.map((cat) => {
            const catOps = operations.filter(o => o.groupName === cat.name)
            return (
              <GlassCard key={cat.id} className="p-0 overflow-hidden flex flex-col group hover:shadow-card transition-shadow cursor-pointer" onClick={() => setManageCategory(cat)}>
                <div className="p-4 flex items-start justify-between border-b border-theme-subtle bg-surface2/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-rex-700 border border-rex-600/40 flex items-center justify-center flex-shrink-0">
                      <Wrench size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{cat.name}</p>
                      <p className="text-[10px] text-muted">{catOps.length} sub-operations</p>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">{catOps.length > 0 ? 'ACTIVE' : 'EMPTY'}</Badge>
                </div>
                
                <div className="p-0 flex-1 bg-surface">
                  {catOps.length === 0 ? (
                    <div className="p-5 text-center text-[10px] text-muted">No operations assigned yet.</div>
                  ) : (
                    <div className="divide-y divide-theme-subtle">
                      {catOps.slice(0, 3).map(op => (
                        <div key={op.id} className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-xs font-medium text-secondary truncate pr-4">{op.name}</span>
                          <span className="text-[10px] font-mono text-muted whitespace-nowrap">{formatCurrency(op.hrRate)} / hr</span>
                        </div>
                      ))}
                      {catOps.length > 3 && (
                        <div className="px-4 py-2 text-[10px] text-muted text-center italic bg-surface2/20">
                          + {catOps.length - 3} more operations
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-theme-subtle bg-surface2/50 flex justify-between items-center group-hover:bg-rex-500/5 transition-colors">
                  <span className="text-[10px] text-rex-600 font-semibold uppercase tracking-wider">Manage Rates</span>
                  <ArrowRight size={12} className="text-rex-600 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {activeMainTab === 'machines' && (
        <GlassCard className="overflow-hidden p-0 animate-fade-in">
          <div className="p-4 border-b border-theme-subtle flex flex-wrap items-center justify-between gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search physical machines..." className="w-64"/>
            <div className="flex bg-surface p-1 rounded-md border border-theme-subtle">
              {['All','Active','Maintenance','Broken'].map(status => (
                <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${filterStatus === status ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400 font-semibold' : 'text-muted hover:text-primary'}`}>{status}</button>
              ))}
            </div>
          </div>
          {loading ? <div className="p-10 text-center text-xs text-muted animate-pulse">Loading machineries...</div> : <DataTable columns={columns} data={filteredMachines} keyExtractor={(r) => r.id}/>}
        </GlassCard>
      )}

      {activeMainTab === 'maintenance' && (
        <div className="space-y-4 animate-fade-in">
          {/* TPM Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <GlassCard className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total PM & Breakdown Logs</span>
              <span className="text-2xl font-black text-primary">{maintenanceLogs.length}</span>
              <span className="text-[10px] text-muted block">ISO 7.1.3 Compliance Active</span>
            </GlassCard>
            <GlassCard className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Preventive Maintenance</span>
              <span className="text-2xl font-black text-emerald-500">{maintenanceLogs.filter(m => m.type === 'Preventive').length}</span>
              <span className="text-[10px] text-emerald-500 block">Scheduled PM Routines</span>
            </GlassCard>
            <GlassCard className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Breakdown Tickets</span>
              <span className="text-2xl font-black text-rose-500">{maintenanceLogs.filter(m => m.type === 'Breakdown').length}</span>
              <span className="text-[10px] text-rose-500 block">Unscheduled Downtime</span>
            </GlassCard>
            <GlassCard className="p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Downtime Logged</span>
              <span className="text-2xl font-black text-amber-500">
                {maintenanceLogs.reduce((acc, m) => acc + (Number(m.downtimeHours) || 0), 0).toFixed(1)} hrs
              </span>
              <span className="text-[10px] text-muted block">Cumulative Shopfloor Downtime</span>
            </GlassCard>
          </div>

          <GlassCard className="overflow-hidden p-0">
            <div className="p-4 border-b border-theme-subtle flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-rex-500" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Machine Maintenance & Breakdown Log (ISO 7.1.3)
                </h3>
              </div>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowMntModal(true)}>
                Log Maintenance
              </Button>
            </div>

            {maintenanceLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No maintenance logs recorded yet. Click "Log Maintenance" to record a PM checklist or breakdown event.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface2/50 border-b border-theme-subtle text-[10px] uppercase text-muted tracking-wider">
                      <th className="py-2.5 px-3">Machine</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Scheduled / Performed</th>
                      <th className="py-2.5 px-3">Downtime</th>
                      <th className="py-2.5 px-3">Technician</th>
                      <th className="py-2.5 px-3">Description & Spares</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle">
                    {maintenanceLogs.map(log => {
                      const mach = machines.find(m => m.id === log.machineId)
                      return (
                        <tr key={log.id} className="hover:bg-surface2/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-primary block">{mach?.name || log.machineId}</span>
                            <span className="text-[10px] font-mono text-muted">{log.machineId}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              log.type === 'Preventive' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              log.type === 'Breakdown' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-secondary">
                            <div>Perf: {log.performedDate ? String(log.performedDate).slice(0, 10) : '-'}</div>
                            <div className="text-[10px] text-muted">Sched: {log.scheduledDate ? String(log.scheduledDate).slice(0, 10) : '-'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs font-bold text-primary">
                            {log.downtimeHours ? `${log.downtimeHours} hrs` : '0 hrs'}
                          </td>
                          <td className="py-2.5 px-3 text-secondary">{log.performedBy || 'Technician'}</td>
                          <td className="py-2.5 px-3 text-secondary max-w-xs">
                            <div className="font-medium truncate">{log.description || '-'}</div>
                            {log.partsReplaced && (
                              <div className="text-[10px] text-muted truncate">Parts: {log.partsReplaced}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge 
                              value={log.status || 'Completed'} 
                              variant={log.status === 'Completed' ? 'success' : log.status === 'In-Progress' ? 'warning' : 'default'} 
                              size="sm" 
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* CATEGORY OPERATIONS MODAL */}
      <Modal isOpen={!!manageCategory} onClose={() => { setManageCategory(null); setOpForm({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' }) }} title={`Operations: ${manageCategory?.name}`} size="2xl">
        {manageCategory && (
          <div className="p-0">
            <div className="p-4 bg-surface2/30 border-b border-theme-subtle flex gap-4">
              <form onSubmit={handleSaveOp} className="flex-1 flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-muted mb-1">OPERATION NAME</label>
                  <input required type="text" className="w-full input-base py-1.5 text-sm" value={opForm.name} onChange={e => setOpForm({...opForm, name: e.target.value})}/>
                </div>
                <div className="w-28">
                  <label className="block text-[10px] text-muted mb-1">HR RATE</label>
                  <input required type="number" step="0.01" min="0" className="w-full input-base py-1.5 text-xs font-mono" value={opForm.hrRate} onChange={e => setOpForm({...opForm, hrRate: e.target.value})}/>
                </div>
                
                  <div className="w-24">
                    <label className="block text-[10px] text-muted mb-1">SET TIME</label>
                    <input required type="number" step="0.01" min="0" className="w-full input-base py-1.5 text-xs font-mono" value={opForm.setTimeRate} onChange={e => setOpForm({...opForm, setTimeRate: e.target.value})}/>
                  </div>
                  <div className="w-40">
                    <label className="block text-[10px] text-muted mb-1">PHYSICAL MACHINE</label>
                    <select className="w-full input-base py-1.5 text-xs truncate" value={opForm.machineId} onChange={e => setOpForm({...opForm, machineId: e.target.value})}>
                      <option value="">-- None --</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                <Button variant="primary" size="sm" type="submit" icon={opForm.id ? Save : Plus} className="mb-0.5">{opForm.id ? 'Update' : 'Add'}</Button>
                {opForm.id && <Button variant="ghost" size="sm" onClick={() => setOpForm({ id: '', name: '', hrRate: '', setTimeRate: '', machineId: '' })} type="button" className="mb-0.5">Cancel</Button>}
              </form>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              
                <div className="grid grid-cols-12 px-5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[10px] font-semibold uppercase tracking-widest text-muted sticky top-0">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Assigned Machine</div>
                  <div className="col-span-2 text-right">Hr Rate</div>
                  <div className="col-span-3 text-right">Set Time</div>
                </div>

              <div className="divide-y divide-theme-subtle bg-surface">
                {currentCategoryOps.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">No operations mapped to this category.</div>
                ) : currentCategoryOps.map((op) => (
                  <div key={op.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5 table-row-hover transition-colors">
                    
                      <div className="col-span-4 flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-primary truncate">{op.name}</span>
                      </div>
                      <div className="col-span-3 flex items-center">
                        {op.machineId ? <Badge size="sm" variant="default" value={machines.find(m => m.id === op.machineId)?.name || op.machineId} /> : <span className="text-[10px] text-muted italic">Unassigned</span>}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-secondary font-mono">{formatCurrency(op.hrRate)}</span>
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-4">
                        <span className="text-xs text-secondary font-mono">{formatCurrency(op.setTimeRate)}</span>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{opacity: 1}}>
                        <button onClick={() => handleEditOp(op)} className="p-1.5 hover:bg-surface2 rounded-md text-muted hover:text-primary transition-colors"><Edit size={12}/></button>
                        <button onClick={() => handleDeleteOp(op.id)} className="p-1.5 hover:bg-surface2 rounded-md text-muted hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-theme-subtle bg-surface flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setManageCategory(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* OTHER MODALS */}
      <Modal isOpen={showMachineModal} onClose={() => setShowMachineModal(false)} title="Register Machinery">
        <form onSubmit={handleSaveMachine} className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] text-muted mb-1">MACHINE NAME</label>
            <input required type="text" className="w-full input-base text-sm" value={newMachinery.name} onChange={e => setNewMachinery({...newMachinery, name: e.target.value})}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-muted mb-1">CATEGORY</label>
              <select className="w-full input-base text-sm" value={newMachinery.category} onChange={e => setNewMachinery({...newMachinery, category: e.target.value})}>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-1">MODEL / SERIAL</label>
              <input required type="text" className="w-full input-base text-sm" value={newMachinery.model} onChange={e => setNewMachinery({...newMachinery, model: e.target.value})}/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setShowMachineModal(false)} type="button">Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Register'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="New Category" size="sm">
        <form onSubmit={handleSaveCategory} className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] text-muted mb-1">CATEGORY NAME</label>
            <input required type="text" className="w-full input-base text-sm uppercase" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value.toUpperCase())}/>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setShowCatModal(false)} type="button">Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!manageMachine} onClose={() => setManageMachine(null)} title={`Operators: ${manageMachine?.name}`} size="md">
        {manageMachine && (
          <div className="p-4 space-y-4">
            <div className="max-h-[50vh] overflow-y-auto border border-theme-subtle rounded bg-surface">
              {employees.length === 0 && <div className="p-4 text-xs text-center text-muted">No employees found.</div>}
              {employees.map(emp => {
                const checked = assignedOperators.includes(emp.id)
                return (
                  <label key={emp.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0 border-theme-subtle ${checked ? 'bg-rex-500/5' : 'hover:bg-surface2/50'}`}>
                    <input type="checkbox" className="w-4 h-4 rounded text-rex-700 border-theme-subtle bg-surface focus:ring-rex-700/20" checked={checked}
                      onChange={(e) => { if (e.target.checked) setAssignedOperators([...assignedOperators, emp.id]); else setAssignedOperators(assignedOperators.filter(id => id !== emp.id)) }}/>
                    <div className="w-8 h-8 bg-rex-700 border border-rex-600/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">{emp.name.substring(0,2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary">{emp.name}</p>
                      <p className="text-[10px] text-muted">{emp.role}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-theme-subtle">
              <Button variant="ghost" size="sm" onClick={() => setManageMachine(null)}>Cancel</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveOperators}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MAINTENANCE LOG MODAL */}
      <Modal isOpen={showMntModal} onClose={() => setShowMntModal(false)} title="Log Machine Maintenance / Breakdown (ISO 7.1.3)" size="md">
        <form onSubmit={handleSaveMaintenance} className="space-y-4 p-4">
          <div>
            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Target Machine *</label>
            <select
              required
              className="w-full input-base text-xs font-mono"
              value={mntForm.machineId}
              onChange={e => setMntForm({ ...mntForm, machineId: e.target.value })}
            >
              <option value="">-- Select Machine --</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>[{m.id}] {m.name} - {m.type}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Maintenance Type *</label>
              <select
                className="w-full input-base text-xs"
                value={mntForm.type}
                onChange={e => setMntForm({ ...mntForm, type: e.target.value })}
              >
                <option value="Preventive">Preventive Maintenance (PM)</option>
                <option value="Breakdown">Breakdown Repair</option>
                <option value="Calibration">Spindle / Axis Calibration</option>
                <option value="Lubrication">Oil / Coolant Service</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Status</label>
              <select
                className="w-full input-base text-xs"
                value={mntForm.status}
                onChange={e => setMntForm({ ...mntForm, status: e.target.value })}
              >
                <option value="Completed">Completed</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Date Performed</label>
              <input
                type="date"
                className="w-full input-base text-xs font-mono"
                value={mntForm.performedDate}
                onChange={e => setMntForm({ ...mntForm, performedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Downtime Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="w-full input-base text-xs font-mono"
                value={mntForm.downtimeHours}
                onChange={e => setMntForm({ ...mntForm, downtimeHours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Technician / Performed By</label>
            <input
              type="text"
              className="w-full input-base text-xs"
              value={mntForm.performedBy}
              onChange={e => setMntForm({ ...mntForm, performedBy: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Work Description / Defect Root Cause *</label>
            <textarea
              required
              rows={2}
              className="w-full input-base text-xs resize-none"
              placeholder="e.g. 500-hour spindle oil replacement and axis backlash alignment check..."
              value={mntForm.description}
              onChange={e => setMntForm({ ...mntForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Spare Parts Replaced</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                placeholder="e.g. Timing belt, V-ring seal"
                value={mntForm.partsReplaced}
                onChange={e => setMntForm({ ...mntForm, partsReplaced: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Maintenance Cost (LKR)</label>
              <input
                type="number"
                min="0"
                className="w-full input-base text-xs font-mono"
                value={mntForm.cost}
                onChange={e => setMntForm({ ...mntForm, cost: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowMntModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Maintenance Log'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}