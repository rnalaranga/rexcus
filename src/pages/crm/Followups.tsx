import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Phone, Mail, Users, CheckSquare, MessageSquare, MapPin,
  Calendar, Clock, AlertCircle, CheckCircle2, XCircle, Filter,
  ChevronRight, Trash2, Edit, ArrowLeft, Save, Bell, Search
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { useFollowups, useLeads, useDeals, useCustomers } from '@/hooks/useData'
import { createFollowup, updateFollowup, deleteFollowup } from '@/lib/api'

const ACTIVITY_TYPES = [
  { value: 'call',       label: 'Phone Call',   icon: Phone,        color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  { value: 'meeting',    label: 'Meeting',       icon: Users,        color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { value: 'email',      label: 'Email',         icon: Mail,         color: 'text-cyan-500',   bg: 'bg-cyan-500/10' },
  { value: 'task',       label: 'Task / To-Do',  icon: CheckSquare,  color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  { value: 'whatsapp',   label: 'WhatsApp',      icon: MessageSquare,color: 'text-emerald-500',bg: 'bg-emerald-500/10' },
  { value: 'site_visit', label: 'Site Visit',    icon: MapPin,       color: 'text-orange-500', bg: 'bg-orange-500/10' },
]

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'error' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'low',    label: 'Low',    color: 'default' },
]

const STATUS_FILTERS = ['all', 'pending', 'overdue', 'done', 'cancelled'] as const

const initialForm = {
  relatedType: 'lead' as 'lead' | 'deal' | 'customer',
  relatedId: '',
  relatedName: '',
  type: 'call',
  subject: '',
  notes: '',
  dueDate: new Date().toISOString().slice(0, 10),
  dueTime: '09:00',
  priority: 'medium',
  assignedTo: '',
}

export const Followups: React.FC = () => {
  const { data: followups, loading, refetch } = useFollowups()
  const { data: leads } = useLeads()
  const { data: deals } = useDeals()
  const { data: customers } = useCustomers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [outcomeText, setOutcomeText] = useState('')
  const [showOutcome, setShowOutcome] = useState<string | null>(null)

  // Auto-mark overdue
  const enriched = useMemo(() => {
    const now = new Date()
    return followups.map((f: any) => {
      if (f.status === 'pending' && new Date(f.dueDate) < now) {
        return { ...f, status: 'overdue' }
      }
      return f
    })
  }, [followups])

  const filtered = useMemo(() => {
    return enriched.filter((f: any) => {
      const matchSearch = f.subject.toLowerCase().includes(search.toLowerCase()) ||
        (f.relatedName || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || f.status === statusFilter
      const matchType = typeFilter === 'all' || f.type === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [enriched, search, statusFilter, typeFilter])

  // Stats
  const stats = useMemo(() => ({
    today: enriched.filter((f: any) => f.status === 'pending' && f.dueDate?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    overdue: enriched.filter((f: any) => f.status === 'overdue').length,
    pending: enriched.filter((f: any) => f.status === 'pending').length,
    done: enriched.filter((f: any) => f.status === 'done').length,
  }), [enriched])

  const relatedOptions = useMemo(() => {
    if (formData.relatedType === 'lead') return leads.map((l: any) => ({ id: l.id, name: l.name || l.companyName }))
    if (formData.relatedType === 'deal') return deals.map((d: any) => ({ id: d.id, name: d.title }))
    if (formData.relatedType === 'customer') return customers.map((c: any) => ({ id: c.id, name: c.companyName }))
    return []
  }, [formData.relatedType, leads, deals, customers])

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id)
      setFormData({
        relatedType: item.relatedType,
        relatedId: item.relatedId || '',
        relatedName: item.relatedName || '',
        type: item.type,
        subject: item.subject,
        notes: item.notes || '',
        dueDate: (item.dueDate || '').slice(0, 10),
        dueTime: item.dueTime || '09:00',
        priority: item.priority || 'medium',
        assignedTo: item.assignedTo || '',
      })
    } else {
      setEditId(null)
      setFormData(initialForm)
    }
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      ...formData,
      dueDate: formData.dueDate + ' ' + formData.dueTime + ':00',
      status: editId ? undefined : 'pending',
    }
    if (!payload.status) delete payload.status
    if (editId) {
      await updateFollowup(editId, payload)
    } else {
      await createFollowup(payload)
    }
    setSubmitting(false)
    setShowForm(false)
    refetch()
  }

  const handleMarkDone = async (id: string, outcome: string) => {
    await updateFollowup(id, {
      status: 'done',
      outcome,
      completedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    })
    setShowOutcome(null)
    setOutcomeText('')
    refetch()
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  
  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
  }
  
  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteFollowup(deleteTarget)
    refetch()
    setDeleteTarget(null)
  }

  const getTypeInfo = (type: string) => ACTIVITY_TYPES.find(t => t.value === type) || ACTIVITY_TYPES[0]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':  return <Badge variant="info">Pending</Badge>
      case 'overdue':  return <Badge variant="error">Overdue</Badge>
      case 'done':     return <Badge variant="success">Done</Badge>
      case 'cancelled':return <Badge variant="default">Cancelled</Badge>
      default:         return <Badge variant="default">{status}</Badge>
    }
  }

  // --- FORM VIEW ---
  if (showForm) return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setShowForm(false)} type="button">Back</Button>
          <h1 className="text-2xl font-bold text-primary">{editId ? 'Edit Activity' : 'Schedule Activity'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="primary" icon={Save} type="submit" form="followup-form" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Activity'}
          </Button>
        </div>
      </div>

      <form id="followup-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left — main details */}
          <div className="lg:col-span-2 space-y-5">
            <GlassCard className="p-6">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-5">Activity Details</h2>
              <div className="space-y-4">
                {/* Activity type pills */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2">Activity Type</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITY_TYPES.map(t => {
                      const Icon = t.icon
                      return (
                        <button key={t.value} type="button"
                          onClick={() => setFormData({...formData, type: t.value})}
                          className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-all ${formData.type === t.value ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500 shadow-sm' : `border-theme-subtle text-secondary hover:border-theme ${t.bg}`}`}
                        >
                          <Icon size={13}/> {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Subject / Title *</label>
                  <input required type="text" className="w-full input-base text-base"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Follow up on quotation, Schedule factory visit..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Notes / Agenda</label>
                  <textarea className="w-full input-base h-28 resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Meeting agenda, talking points, preparation notes..." />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right — meta */}
          <div className="lg:col-span-1 space-y-5">
            <GlassCard className="p-6">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-5">Schedule & Link</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-secondary mb-1">Due Date *</label>
                    <input required type="date" className="w-full input-base"
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-secondary mb-1">Time</label>
                    <input type="time" className="w-full input-base"
                      value={formData.dueTime}
                      onChange={e => setFormData({...formData, dueTime: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Priority</label>
                  <div className="flex bg-surface2 p-1 rounded-lg border border-theme-subtle">
                    {PRIORITIES.map(p => (
                      <button key={p.value} type="button"
                        onClick={() => setFormData({...formData, priority: p.value})}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.priority === p.value ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Linked To</label>
                  <select className="w-full input-base mb-2" value={formData.relatedType}
                    onChange={e => setFormData({...formData, relatedType: e.target.value as any, relatedId: '', relatedName: ''})}>
                    <option value="lead">Lead</option>
                    <option value="deal">Deal</option>
                    <option value="customer">Customer</option>
                  </select>
                  <select className="w-full input-base" value={formData.relatedId}
                    onChange={e => {
                      const opt = relatedOptions.find((o: any) => o.id === e.target.value)
                      setFormData({...formData, relatedId: e.target.value, relatedName: opt?.name || ''})
                    }}>
                    <option value="">— Select —</option>
                    {relatedOptions.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Assigned To</label>
                  <input type="text" className="w-full input-base"
                    value={formData.assignedTo}
                    onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                    placeholder="Team member name..." />
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </form>
    </div>
  )

  // --- LIST VIEW ---
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Follow-ups & Activities</h1>
          <p className="text-sm text-secondary mt-1">Track calls, meetings, tasks, and all CRM activities.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenForm()}>Schedule Activity</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10"><Bell size={18} className="text-amber-500"/></div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
            <div className="text-xs text-muted">Due Today</div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><AlertCircle size={18} className="text-red-500"/></div>
          <div>
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            <div className="text-xs text-muted">Overdue</div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><Clock size={18} className="text-blue-500"/></div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <div className="text-xs text-muted">Pending</div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 size={18} className="text-emerald-500"/></div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">{stats.done}</div>
            <div className="text-xs text-muted">Completed</div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search activities..." className="w-64"/>

          {/* Status filter */}
          <div className="flex items-center bg-surface2 p-1 rounded-lg border border-theme-subtle">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${statusFilter === s ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${typeFilter === 'all' ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500' : 'border-theme-subtle text-muted hover:border-theme'}`}
            >
              All Types
            </button>
            {ACTIVITY_TYPES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${typeFilter === t.value ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500' : `border-theme-subtle text-muted hover:border-theme ${t.bg}`}`}
                >
                  <Icon size={12}/> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </GlassCard>

      {/* Activity List */}
      {loading ? (
        <div className="py-20 text-center text-muted">Loading activities...</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-20 text-center">
          <Calendar size={40} className="mx-auto text-muted mb-4 opacity-30"/>
          <p className="text-sm text-muted">No activities found.</p>
          <p className="text-xs text-muted mt-1">Schedule your first activity using the button above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const typeInfo = getTypeInfo(item.type)
            const Icon = typeInfo.icon
            const isOverdue = item.status === 'overdue'
            const isDone = item.status === 'done'
            const dueDateStr = (item.dueDate || '').slice(0, 10)
            const isToday = dueDateStr === new Date().toISOString().slice(0, 10)

            return (
              <GlassCard key={item.id} className={`p-4 transition-all ${isOverdue ? 'border border-red-500/30' : isToday && !isDone ? 'border border-amber-500/20' : ''} ${isDone ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${typeInfo.bg}`}>
                    <Icon size={16} className={typeInfo.color}/>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isDone ? 'line-through text-muted' : 'text-primary'}`}>{item.subject}</span>
                          {getStatusBadge(item.status)}
                          <Badge variant={PRIORITIES.find(p => p.value === item.priority)?.color as any || 'default'}>
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {item.relatedName && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <ChevronRight size={10}/>{item.relatedType}: <span className="text-secondary font-medium">{item.relatedName}</span>
                            </span>
                          )}
                          <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted'}`}>
                            <Calendar size={10}/>
                            {dueDateStr} {item.dueTime && `at ${item.dueTime}`}
                            {isToday && !isDone && <span className="text-amber-500 font-bold ml-1">TODAY</span>}
                          </span>
                          {item.assignedTo && (
                            <span className="text-xs text-muted flex items-center gap-1"><Users size={10}/> {item.assignedTo}</span>
                          )}
                        </div>
                        {item.notes && <p className="text-xs text-muted mt-1.5 truncate max-w-2xl">{item.notes}</p>}
                        {item.outcome && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 italic">Outcome: {item.outcome}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!isDone && item.status !== 'cancelled' && (
                          <button
                            onClick={() => { setShowOutcome(item.id); setOutcomeText('') }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded border border-emerald-500/30 transition-colors"
                          ><CheckCircle2 size={12}/> Done</button>
                        )}
                        <button onClick={() => handleOpenForm(item)} className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"><Edit size={13}/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                      </div>
                    </div>

                    {/* Outcome input panel (inline) */}
                    {showOutcome === item.id && (
                      <div className="mt-3 p-3 bg-surface2/50 rounded-lg border border-theme-subtle animate-fade-in">
                        <label className="block text-xs font-medium text-secondary mb-1.5">Add outcome / result (optional)</label>
                        <div className="flex gap-2">
                          <input type="text" className="flex-1 input-base text-xs"
                            value={outcomeText}
                            onChange={e => setOutcomeText(e.target.value)}
                            placeholder="e.g. Customer confirmed interest, follow-up next week..."
                            autoFocus />
                          <button onClick={() => handleMarkDone(item.id, outcomeText)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors">
                            Mark Done
                          </button>
                          <button onClick={() => setShowOutcome(null)} className="px-2 py-1.5 text-muted hover:text-secondary text-xs rounded hover:bg-surface2 transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this activity?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
