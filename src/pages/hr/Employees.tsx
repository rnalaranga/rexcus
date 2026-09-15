import React, { useState, useEffect } from 'react'
import { Download, Plus, Filter, Users, Edit, Trash2, Shield, Factory, Settings, Award } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [skillsMaster, setSkillsMaster] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('All')
  
  const [showModal, setShowModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showSkillsModal, setShowSkillsModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '', role: 'Operator', phone: '', email: '', status: 'Active'
  })
  const [assignData, setAssignData] = useState<{empId: string, machineIds: string[]}>({ empId: '', machineIds: [] })
  const [assignSkillsData, setAssignSkillsData] = useState<{empId: string, skillIds: string[]}>({ empId: '', skillIds: [] })

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empRes, machRes, skillsRes] = await Promise.all([
        fetch(`${API}/hr/employees`).then(r => r.json()),
        fetch(`${API}/production/machineries`).then(r => r.json()),
        fetch(`${API}/hr/skills`).then(r => r.json())
      ])
      setEmployees(Array.isArray(empRes) ? empRes : [])
      setMachineries(Array.isArray(machRes) ? machRes : [])
      setSkillsMaster(Array.isArray(skillsRes) ? skillsRes : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenForm = (emp?: any) => {
    if (emp) {
      setEditId(emp.id)
      setFormData({
        name: emp.name,
        role: emp.role,
        phone: emp.phone || '',
        email: emp.email || '',
        status: emp.status
      })
    } else {
      setEditId(null)
      setFormData({ name: '', role: 'Operator', phone: '', email: '', status: 'Active' })
    }
    setShowModal(true)
  }

  const handleOpenAssign = (emp: any) => {
    setAssignData({ empId: emp.id, machineIds: emp.machineIds || [] })
    setShowAssignModal(true)
  }

  const handleOpenSkillsAssign = (emp: any) => {
    setAssignSkillsData({ empId: emp.id, skillIds: emp.skillIds || [] })
    setShowSkillsModal(true)
  }

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      id: editId || 'EMP-' + Date.now().toString().slice(-4),
      ...formData
    }

    try {
      await fetch(`${API}/hr/employees${editId ? `/${editId}` : ''}`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      setShowModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch(`${API}/hr/employees/${assignData.empId}/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineIds: assignData.machineIds })
      })
      setShowAssignModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch(`${API}/hr/employees/${assignSkillsData.empId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillIds: assignSkillsData.skillIds })
      })
      setShowSkillsModal(false)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) return
    await fetch(`${API}/hr/employees/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const toggleMachine = (mId: string) => {
    setAssignData(prev => ({
      ...prev,
      machineIds: prev.machineIds.includes(mId) 
        ? prev.machineIds.filter(id => id !== mId)
        : [...prev.machineIds, mId]
    }))
  }

  const toggleSkill = (sId: string) => {
    setAssignSkillsData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(sId) 
        ? prev.skillIds.filter(id => id !== sId)
        : [...prev.skillIds, sId]
    }))
  }

  let filteredData = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.role.toLowerCase().includes(search.toLowerCase())
  )
  if (filterRole !== 'All') {
    filteredData = filteredData.filter(e => e.role === filterRole)
  }

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Employee', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
            <Users size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">{row.id}</p>
          </div>
        </div>
      )
    },
    { key: 'role', header: 'Role', render: (v: any) => <span className="text-xs font-semibold text-secondary">{String(v)}</span> },
    { key: 'contact', header: 'Contact', render: (_: any, row: any) => (
      <div>
        <div className="text-xs text-primary">{row.phone || '-'}</div>
        <div className="text-[10px] text-muted">{row.email || '-'}</div>
      </div>
    )},
    {
      key: 'skills', header: 'Verified Skills', 
      render: (_: any, row: any) => {
        const sIds = row.skillIds || []
        if (!sIds.length) return <span className="text-xs text-muted">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {sIds.map((sId: string) => {
              const skill = skillsMaster.find(s => s.id === sId)
              return (
                <span key={sId} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[9px] rounded font-semibold whitespace-nowrap">
                  {skill ? skill.name : sId}
                </span>
              )
            })}
          </div>
        )
      }
    },
    {
      key: 'assignedMachines', header: 'Assigned Machines',
      render: (_: any, row: any) => {
        const mIds = row.machineIds || []
        if (!mIds.length) return <span className="text-xs text-muted">Unassigned</span>
        return (
          <div className="flex flex-wrap gap-1">
            {mIds.map((mId: string) => {
              const mach = machineries.find(m => m.id === mId)
              return (
                <span key={mId} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] rounded font-semibold whitespace-nowrap flex items-center gap-1">
                  <Factory size={8}/> {mach ? mach.name : mId}
                </span>
              )
            })}
          </div>
        )
      }
    },
    { key: 'status', header: 'Status', render: (v: any) => <Badge value={String(v).toUpperCase()} variant={v === 'Active' ? 'success' : 'default'} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_: any, row: any) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => handleOpenSkillsAssign(row)} className="p-1.5 hover:bg-blue-500/10 rounded text-blue-500 transition-colors" title="Verify Skills"><Award size={14}/></button>
          <button onClick={() => handleOpenAssign(row)} className="p-1.5 hover:bg-amber-500/10 rounded text-amber-500 transition-colors" title="Assign Machines"><Settings size={14}/></button>
          <button onClick={() => handleOpenForm(row)} className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"><Edit size={14}/></button>
          <button onClick={() => handleDelete(row.id)} className="p-1.5 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ]

  const uniqueRoles = ['All', ...new Set(employees.map(e => e.role))]

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Employees & Operators</h1>
          <p className="text-xs text-muted mt-0.5">{employees.length} total staff members registered</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenForm()}>Add Employee</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search by name or role..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Role:</span>
        {uniqueRoles.map((r: any) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-2.5 py-1 text-xs border transition-colors ${filterRole === r ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}
          >
            {r}
          </button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
        {loading
          ? <div className="p-10 text-center animate-pulse text-xs text-muted font-medium">Loading employees...</div>
          : <DataTable columns={columns} data={filteredData} keyExtractor={row => row.id} emptyMessage="No employees found." />
        }
      </GlassCard>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Employee" : "Add New Employee"} size="lg">
        <form onSubmit={handleSaveEmployee} className="space-y-6">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Shield size={14} className="text-rex-500" /> Staff Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Full Name *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Sunil Perera" />
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Designation / Role *</label>
                <input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full input-base" placeholder="e.g. Senior Operator" />
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="07X XXX XXXX" />
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="sunil@rex.lk" />
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full input-base">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN SKILLS MODAL */}
      <Modal isOpen={showSkillsModal} onClose={() => setShowSkillsModal(false)} title="Verify Employee Skills" size="md">
        <form onSubmit={handleSaveSkills} className="space-y-4 p-2">
          <p className="text-xs text-secondary mb-4">Select the standardized skills this employee is verified for.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {skillsMaster.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 border border-theme-subtle rounded-lg bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                <input 
                  type="checkbox" 
                  checked={assignSkillsData.skillIds.includes(s.id)}
                  onChange={() => toggleSkill(s.id)}
                  className="w-4 h-4 text-rex-600 rounded border-theme"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-primary">{s.name}</div>
                  <div className="text-[10px] text-muted">{s.category}</div>
                </div>
              </label>
            ))}
            {skillsMaster.length === 0 && <div className="text-sm text-muted text-center py-4">No skills defined in the master list.</div>}
          </div>
          <div className="pt-4 border-t border-theme-subtle flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setShowSkillsModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Verified Skills'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN MACHINES MODAL */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Machines" size="md">
        <form onSubmit={handleSaveAssignments} className="space-y-4 p-2">
          <p className="text-xs text-secondary mb-4">Select the machineries this employee is assigned to operate.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {machineries.map(m => (
              <label key={m.id} className="flex items-center gap-3 p-3 border border-theme-subtle rounded-lg bg-surface/50 cursor-pointer hover:bg-surface transition-colors">
                <input 
                  type="checkbox" 
                  checked={assignData.machineIds.includes(m.id)}
                  onChange={() => toggleMachine(m.id)}
                  className="w-4 h-4 text-rex-600 rounded border-theme"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-primary">{m.name}</div>
                  <div className="text-[10px] text-muted">{m.type} &middot; {m.model}</div>
                </div>
              </label>
            ))}
            {machineries.length === 0 && <div className="text-sm text-muted text-center py-4">No machineries available.</div>}
          </div>
          <div className="pt-4 border-t border-theme-subtle flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
