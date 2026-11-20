import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Phone, Mail, Users, CheckSquare, MessageSquare, MapPin,
  Calendar, Clock, AlertCircle, CheckCircle2,
  ChevronRight, Trash2, Edit, ArrowLeft, Save, Bell,
  Sparkles, Zap, ChevronDown, ChevronUp, ExternalLink, RotateCw
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import {
  useFollowups,
  useLeads,
  useDeals,
  useCustomers,
  useFinishedGoodsOrders,
  useInvoices,
  useQuotations,
  invalidateDataCache,
} from '@/hooks/useData'
import { useAuth } from '@/contexts/AuthContext'
import { useDialog } from '@/components/ui/DialogProvider'
import { createFollowup, updateFollowup, deleteFollowup } from '@/lib/api'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import {
  analyzeCustomerIntelligence,
  buildAIFollowupRecommendations,
  AICustomerProfile,
} from '@/lib/aiCustomerIntelligence'
import { AICustomerBadge, AICustomerInsightPanel } from '@/components/crm/AICustomerBadge'
import { formatCurrency } from '@/lib/utils'

const ACTIVITY_TYPES = [
  { value: 'call',       label: 'Phone Call',   icon: Phone,         color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  { value: 'whatsapp',   label: 'WhatsApp',     icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'meeting',    label: 'Meeting',      icon: Users,         color: 'text-purple-500',  bg: 'bg-purple-500/10' },
  { value: 'email',      label: 'Email',        icon: Mail,          color: 'text-cyan-500',    bg: 'bg-cyan-500/10' },
  { value: 'site_visit', label: 'Site Visit',   icon: MapPin,        color: 'text-orange-500',  bg: 'bg-orange-500/10' },
  { value: 'task',       label: 'Task / To-Do', icon: CheckSquare,   color: 'text-amber-500',   bg: 'bg-amber-500/10' },
]

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'error' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'low',    label: 'Low',    color: 'default' },
]

const STATUS_FILTERS = ['all', 'pending', 'overdue', 'done', 'cancelled'] as const

const normalizeTypeKey = (raw: any): string => {
  const t = String(raw || 'call').trim().toLowerCase()
  if (t === 'phone call' || t === 'quotation follow-up' || t === 'quotation follow up') return 'call'
  if (t === 'site visit') return 'site_visit'
  if (t === 'task / to-do' || t === 'todo') return 'task'
  if (['call', 'whatsapp', 'meeting', 'email', 'site_visit', 'task'].includes(t)) return t
  return 'call'
}

const normalizePriorityKey = (raw: any): string => {
  const p = String(raw || 'medium').trim().toLowerCase()
  if (p === 'urgent' || p === 'high') return 'high'
  if (p === 'low') return 'low'
  return 'medium'
}

const normalizeStatusKey = (f: any, todayStr: string): string => {
  const raw = String(f?.status || 'pending').trim().toLowerCase()
  if (raw === 'completed' || raw === 'done') return 'done'
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled'
  if (raw === 'overdue') return 'overdue'
  const dueDateStr = String(f?.dueDate || '').slice(0, 10)
  if (dueDateStr && dueDateStr < todayStr) return 'overdue'
  return 'pending'
}

const addDaysIso = (baseDateStr: string | undefined, days: number): string => {
  const d = baseDateStr && /^\d{4}-\d{2}-\d{2}/.test(baseDateStr)
    ? new Date(`${baseDateStr.slice(0, 10)}T12:00:00`)
    : new Date()
  if (isNaN(d.getTime())) {
    const now = new Date()
    now.setDate(now.getDate() + days)
    return now.toISOString().slice(0, 10)
  }
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const initialForm = {
  relatedType: 'lead' as 'lead' | 'deal' | 'customer',
  relatedId: '',
  relatedName: '',
  type: 'call',
  subject: '',
  notes: '',
  dueDate: new Date().toISOString().slice(0, 10),
  dueTime: '09:30',
  priority: 'medium',
  assignedTo: '',
}

export const Followups: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useDialog()
  const { data: followups = [], loading, refetch } = useFollowups()
  const { data: leads = [] } = useLeads()
  const { data: deals = [] } = useDeals()
  const { data: customers = [] } = useCustomers()
  const { data: salesOrders = [] } = useFinishedGoodsOrders()
  const { data: invoices = [] } = useInvoices()
  const { data: quotations = [] } = useQuotations()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAiQueue, setShowAiQueue] = useState(true)
  const [quickSchedulingId, setQuickSchedulingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [outcomeText, setOutcomeText] = useState('')
  const [showOutcome, setShowOutcome] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)

  const aiContext = useMemo(() => ({
    customers: customers || [],
    salesOrders: salesOrders || [],
    invoices: invoices || [],
    quotations: quotations || [],
    leads: leads || [],
    followups: followups || [],
  }), [customers, salesOrders, invoices, quotations, leads, followups])

  const aiQueue = useMemo(() => {
    return buildAIFollowupRecommendations(leads || [], aiContext)
  }, [leads, aiContext])

  // Normalize & auto-mark overdue
  const enriched = useMemo(() => {
    return (followups || []).map((f: any) => ({
      ...f,
      subject: f.subject || f.title || 'Follow-up Activity',
      type: normalizeTypeKey(f.type),
      priority: normalizePriorityKey(f.priority),
      status: normalizeStatusKey(f, todayStr),
    }))
  }, [followups, todayStr])

  const resolveEntityForItem = (item: any) => {
    const relType = String(item?.relatedType || 'lead').toLowerCase()
    const relId = String(item?.relatedId || '').trim()
    const relName = String(item?.relatedName || '').trim().toLowerCase()

    let matchedLead = relId ? leads.find((l: any) => String(l.id) === relId) : null
    if (!matchedLead && relName) {
      matchedLead = leads.find(
        (l: any) =>
          String(l.company || '').trim().toLowerCase() === relName ||
          String(l.name || '').trim().toLowerCase() === relName
      )
    }

    let matchedCustomer =
      (relType === 'customer' && relId ? customers.find((c: any) => String(c.id) === relId) : null) ||
      (matchedLead?.customerId ? customers.find((c: any) => String(c.id) === String(matchedLead.customerId)) : null)

    if (!matchedCustomer && relName) {
      matchedCustomer = customers.find(
        (c: any) => String(c.company || '').trim().toLowerCase() === relName
      )
    }

    const entity = matchedLead || matchedCustomer || {
      id: relId,
      customerId: relType === 'customer' ? relId : undefined,
      company: item?.relatedName || '',
      name: item?.relatedName || '',
    }

    const profile = analyzeCustomerIntelligence(entity, aiContext)
    return { matchedLead, matchedCustomer, entity, profile }
  }

  const profileByFollowupId = useMemo(() => {
    const map: Record<string, { matchedLead: any; matchedCustomer: any; profile: AICustomerProfile }> = {}
    enriched.forEach((f: any) => {
      const resolved = resolveEntityForItem(f)
      map[String(f.id)] = {
        matchedLead: resolved.matchedLead,
        matchedCustomer: resolved.matchedCustomer,
        profile: resolved.profile,
      }
    })
    return map
  }, [enriched, leads, customers, aiContext])

  const selectedFormProfile = useMemo(() => {
    if (!formData.relatedId && !formData.relatedName) return null
    if (formData.relatedType === 'lead') {
      const l = leads.find((x: any) => String(x.id) === String(formData.relatedId))
      if (l) return analyzeCustomerIntelligence(l, aiContext)
    } else if (formData.relatedType === 'customer') {
      const c = customers.find((x: any) => String(x.id) === String(formData.relatedId))
      if (c) return analyzeCustomerIntelligence({ ...c, customerId: c.id }, aiContext)
    }
    return analyzeCustomerIntelligence(
      {
        id: formData.relatedId,
        customerId: formData.relatedType === 'customer' ? formData.relatedId : undefined,
        company: formData.relatedName,
        name: formData.relatedName,
      },
      aiContext
    )
  }, [formData.relatedType, formData.relatedId, formData.relatedName, leads, customers, aiContext])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((f: any) => {
      const subj = String(f.subject || '').toLowerCase()
      const rel = String(f.relatedName || '').toLowerCase()
      const note = String(f.notes || '').toLowerCase()
      const matchSearch = !q || subj.includes(q) || rel.includes(q) || note.includes(q)
      const matchStatus = statusFilter === 'all' || f.status === statusFilter
      const matchType = typeFilter === 'all' || f.type === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [enriched, search, statusFilter, typeFilter])

  // Stats
  const stats = useMemo(() => ({
    today: enriched.filter((f: any) => f.status === 'pending' && String(f.dueDate || '').slice(0, 10) === todayStr).length,
    overdue: enriched.filter((f: any) => f.status === 'overdue').length,
    pending: enriched.filter((f: any) => f.status === 'pending').length,
    done: enriched.filter((f: any) => f.status === 'done').length,
  }), [enriched, todayStr])

  const relatedOptions = useMemo(() => {
    if (formData.relatedType === 'lead') return leads.map((l: any) => ({ id: l.id, name: l.company || l.name }))
    if (formData.relatedType === 'deal') return deals.map((d: any) => ({ id: d.id, name: d.title }))
    if (formData.relatedType === 'customer') return customers.map((c: any) => ({ id: c.id, name: c.company || c.name }))
    return []
  }, [formData.relatedType, leads, deals, customers])

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditId(item.id)
      setFormData({
        relatedType: (item.relatedType || 'lead') as any,
        relatedId: item.relatedId || '',
        relatedName: item.relatedName || '',
        type: normalizeTypeKey(item.type),
        subject: item.subject || item.title || '',
        notes: item.notes || '',
        dueDate: (item.dueDate || '').slice(0, 10) || todayStr,
        dueTime: item.dueTime || '09:30',
        priority: normalizePriorityKey(item.priority),
        assignedTo: item.assignedTo || user?.name || '',
      })
    } else {
      setEditId(null)
      setFormData({
        ...initialForm,
        dueDate: new Date().toISOString().slice(0, 10),
        assignedTo: user?.name || '',
      })
    }
    setShowForm(true)
  }

  const handleOpenAiPrefilledForm = (
    leadOrEntity: any,
    profile: AICustomerProfile,
    relatedType: 'lead' | 'customer' | 'deal' = 'lead'
  ) => {
    const rec = profile.recommendedFollowup
    setEditId(null)
    setFormData({
      relatedType,
      relatedId: leadOrEntity?.id || '',
      relatedName: leadOrEntity?.company || leadOrEntity?.name || profile.companyName,
      type: rec.type,
      subject: rec.subject,
      notes: rec.notes,
      dueDate: rec.dueDate,
      dueTime: rec.dueTime || '09:30',
      priority: rec.priority,
      assignedTo: leadOrEntity?.assignedTo || user?.name || '',
    })
    setShowForm(true)
  }

  const handleOneClickScheduleAI = async (lead: any, profile: AICustomerProfile) => {
    try {
      setQuickSchedulingId(String(lead.id))
      const rec = profile.recommendedFollowup
      await createFollowup({
        relatedType: 'lead',
        relatedId: lead.id,
        relatedName: lead.company || lead.name,
        type: rec.type,
        subject: rec.subject,
        notes: rec.notes,
        dueDate: `${rec.dueDate} ${rec.dueTime || '09:30'}:00`,
        dueTime: rec.dueTime || '09:30',
        priority: rec.priority,
        assignedTo: lead.assignedTo || user?.name || '',
        status: 'pending',
      })
      invalidateDataCache('followups')
      await refetch()
      toast(`AI Follow-up scheduled for ${lead.company || lead.name} (${rec.dueDate})`, 'success')
    } catch (err: any) {
      toast(err?.message || 'Failed to schedule AI follow-up', 'error')
    } finally {
      setQuickSchedulingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        subject: formData.subject.trim() || 'Follow-up Activity',
        dueDate: `${formData.dueDate} ${formData.dueTime || '09:30'}:00`,
        status: editId ? undefined : 'pending',
      }
      if (!payload.status) delete payload.status
      if (editId) {
        await updateFollowup(editId, payload)
        toast('Activity updated successfully!', 'success')
      } else {
        await createFollowup(payload)
        toast('Follow-up scheduled successfully!', 'success')
      }
      invalidateDataCache('followups')
      setShowForm(false)
      await refetch()
    } catch (err: any) {
      toast(err?.message || 'Failed to save activity', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkDone = async (item: any, outcome: string, chainNext = false) => {
    try {
      await updateFollowup(item.id, {
        status: 'done',
        outcome: outcome.trim(),
        completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      invalidateDataCache('followups')
      setShowOutcome(null)
      setOutcomeText('')
      await refetch()
      toast('Follow-up marked as done!', 'success')

      if (chainNext) {
        const info = profileByFollowupId[String(item.id)]
        const nextDate = addDaysIso(todayStr, 3)
        setEditId(null)
        setFormData({
          relatedType: (item.relatedType || 'lead') as any,
          relatedId: item.relatedId || '',
          relatedName: item.relatedName || '',
          type: info?.profile?.recommendedFollowup?.type || normalizeTypeKey(item.type),
          subject: `Next Follow-up: ${item.relatedName || item.subject}`,
          notes: outcome.trim()
            ? `Previous outcome: ${outcome.trim()}\nNext action: Check PO / customer decision.`
            : (info?.profile?.recommendedFollowup?.notes || ''),
          dueDate: nextDate,
          dueTime: '09:30',
          priority: info?.profile?.recommendedFollowup?.priority || normalizePriorityKey(item.priority),
          assignedTo: item.assignedTo || user?.name || '',
        })
        setShowForm(true)
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to mark follow-up done', 'error')
    }
  }

  const handleQuickReschedule = async (item: any, days: number) => {
    try {
      const nextDate = addDaysIso(todayStr, days)
      await updateFollowup(item.id, {
        dueDate: `${nextDate} ${item.dueTime || '09:30'}:00`,
        status: 'pending',
      })
      invalidateDataCache('followups')
      await refetch()
      toast(`Rescheduled to ${nextDate}`, 'success')
    } catch (err: any) {
      toast(err?.message || 'Failed to reschedule', 'error')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteFollowup(deleteTarget)
      invalidateDataCache('followups')
      await refetch()
      toast('Activity deleted', 'info')
    } catch (err: any) {
      toast(err?.message || 'Failed to delete', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const getTypeInfo = (type: string) =>
    ACTIVITY_TYPES.find((t) => t.value === normalizeTypeKey(type)) || ACTIVITY_TYPES[0]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':   return <Badge variant="info">Pending</Badge>
      case 'overdue':   return <Badge variant="error">Overdue</Badge>
      case 'done':      return <Badge variant="success">Done</Badge>
      case 'cancelled': return <Badge variant="default">Cancelled</Badge>
      default:          return <Badge variant="default">{status}</Badge>
    }
  }

  // --- FORM VIEW ---
  if (showForm) return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setShowForm(false)} type="button">Back</Button>
          <h1 className="text-2xl font-bold text-primary">{editId ? 'Edit Activity' : 'Schedule Smart Follow-up'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="primary" icon={Save} type="submit" form="followup-form" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Activity'}
          </Button>
        </div>
      </div>

      {selectedFormProfile && (
        <AICustomerInsightPanel
          profile={selectedFormProfile}
          actionLabel="Auto-Fill AI Suggestion"
          onApplyFollowup={(rec) => {
            setFormData((prev) => ({
              ...prev,
              type: rec.type,
              priority: rec.priority,
              dueDate: rec.dueDate,
              dueTime: rec.dueTime || '09:30',
              subject: rec.subject,
              notes: rec.notes,
            }))
            toast('AI-recommended follow-up plan applied!', 'success')
          }}
        />
      )}

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
                          onClick={() => setFormData({ ...formData, type: t.value })}
                          className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-all cursor-pointer ${formData.type === t.value ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500 shadow-sm font-bold' : `border-theme-subtle text-secondary hover:border-theme ${t.bg}`}`}
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
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Follow up on quotation, Confirm PO date..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Notes / AI Talking Points</label>
                  <textarea className="w-full input-base h-32 resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Meeting agenda, customer history points, quotation objections..." />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right — meta */}
          <div className="lg:col-span-1 space-y-5">
            <GlassCard className="p-6">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-5">Schedule &amp; Link</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-secondary mb-1">Due Date *</label>
                    <input required type="date" className="w-full input-base"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        { label: 'Today', d: 0 },
                        { label: 'Tomorrow', d: 1 },
                        { label: '+3d', d: 3 },
                        { label: '+7d', d: 7 },
                      ].map(q => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, dueDate: addDaysIso(todayStr, q.d) }))}
                          className="px-2 py-0.5 text-[10px] font-bold rounded bg-surface2 hover:bg-rex-500/15 hover:text-rex-600 border border-theme-subtle cursor-pointer"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-secondary mb-1">Time</label>
                    <input type="time" className="w-full input-base"
                      value={formData.dueTime}
                      onChange={e => setFormData({ ...formData, dueTime: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Priority</label>
                  <div className="flex bg-surface2 p-1 rounded-lg border border-theme-subtle">
                    {PRIORITIES.map(p => (
                      <button key={p.value} type="button"
                        onClick={() => setFormData({ ...formData, priority: p.value })}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${formData.priority === p.value ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Linked To</label>
                  <select className="w-full input-base mb-2" value={formData.relatedType}
                    onChange={e => setFormData({ ...formData, relatedType: e.target.value as any, relatedId: '', relatedName: '' })}>
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                    <option value="deal">Deal</option>
                  </select>
                  {formData.relatedType === 'customer' || formData.relatedType === 'lead' ? (
                    <CustomerAutocomplete
                      value={formData.relatedId}
                      onChange={(cId, c) => {
                        setFormData({
                          ...formData,
                          relatedId: cId,
                          relatedName: c ? (c.company || c.name || '') : ''
                        })
                      }}
                      customers={formData.relatedType === 'customer' ? customers : []}
                      leads={formData.relatedType === 'lead' ? leads : []}
                      placeholder={formData.relatedType === 'customer' ? 'Search customer...' : 'Search lead...'}
                      className="text-xs"
                    />
                  ) : (
                    <select className="w-full input-base" value={formData.relatedId}
                      onChange={e => {
                        const opt = relatedOptions.find((o: any) => o.id === e.target.value)
                        setFormData({ ...formData, relatedId: e.target.value, relatedName: opt?.name || '' })
                      }}>
                      <option value="">— Select Deal —</option>
                      {relatedOptions.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Assigned To</label>
                  <input type="text" className="w-full input-base"
                    value={formData.assignedTo}
                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Follow-ups &amp; AI Priority Queue</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/30 flex items-center gap-1">
              <Sparkles size={11} /> AI Enabled
            </span>
          </div>
          <p className="text-sm text-secondary mt-1">
            Track calls, reminders, past-customer history scores, and AI-prioritized follow-ups across Leads &amp; Customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={ExternalLink} onClick={() => navigate('/crm/leads')}>
            Leads Pipeline
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => handleOpenForm()}>
            Schedule Activity
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard
          onClick={() => setStatusFilter('pending')}
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 transition-colors"
        >
          <div className="p-2 rounded-lg bg-amber-500/10"><Bell size={18} className="text-amber-500"/></div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
            <div className="text-xs text-muted">Due Today</div>
          </div>
        </GlassCard>
        <GlassCard
          onClick={() => setStatusFilter('overdue')}
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-red-500/40 transition-colors"
        >
          <div className="p-2 rounded-lg bg-red-500/10"><AlertCircle size={18} className="text-red-500"/></div>
          <div>
            <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            <div className="text-xs text-muted">Overdue</div>
          </div>
        </GlassCard>
        <GlassCard
          onClick={() => setStatusFilter('pending')}
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-blue-500/40 transition-colors"
        >
          <div className="p-2 rounded-lg bg-blue-500/10"><Clock size={18} className="text-blue-500"/></div>
          <div>
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <div className="text-xs text-muted">Pending</div>
          </div>
        </GlassCard>
        <GlassCard
          onClick={() => setStatusFilter('done')}
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-500/40 transition-colors"
        >
          <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 size={18} className="text-emerald-500"/></div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">{stats.done}</div>
            <div className="text-xs text-muted">Completed</div>
          </div>
        </GlassCard>
      </div>

      {/* ✨ AI SMART FOLLOW-UP COMMAND CENTER */}
      <GlassCard className="p-4 border-rex-500/30 bg-gradient-to-br from-rex-500/5 via-surface to-surface space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rex-500/15 text-rex-600 dark:text-rex-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                AI Smart Follow-up Command Queue
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface border border-theme-subtle text-rex-600 dark:text-rex-300">
                  {aiQueue.length} Leads Suggested
                </span>
              </h2>
              <p className="text-[11px] text-secondary">
                Analyzes past customer sales orders, invoices, repeat loyalty, and idle aging days to prioritize today&apos;s best calls.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiQueue(v => !v)}
            className="px-2.5 py-1 text-xs font-semibold bg-surface border border-theme-subtle rounded-lg text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
          >
            {showAiQueue ? <><ChevronUp size={13} /> Hide Queue</> : <><ChevronDown size={13} /> Show Queue</>}
          </button>
        </div>

        {showAiQueue && (
          aiQueue.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted bg-surface/60 border border-dashed border-theme-subtle rounded-lg">
              All active pipeline leads either have future follow-ups scheduled or are recently updated.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiQueue.slice(0, 6).map(({ lead, profile, urgencyTag, urgencyLabel }) => {
                const cleanPhone = String(lead.phone || '').replace(/[^0-9]/g, '')
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone}` : null
                const isBusy = quickSchedulingId === String(lead.id)

                return (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl bg-surface border border-theme-subtle hover:border-rex-500/40 transition-all flex flex-col justify-between gap-2.5 shadow-xs"
                  >
                    <div className="space-y-2">
                      {/* Header: Company + Relationship Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-primary truncate">{lead.company || lead.name}</span>
                            <AICustomerBadge
                              profile={profile}
                              variant="pill"
                              onQuickFollowup={() => handleOpenAiPrefilledForm(lead, profile, 'lead')}
                            />
                          </div>
                          <p className="text-[10.5px] text-muted mt-0.5 truncate">
                            {lead.name} • Stage: <span className="uppercase font-semibold text-secondary">{lead.stage}</span>
                            {Number(lead.value || 0) > 0 && ` • ${formatCurrency(lead.value)}`}
                          </p>
                        </div>
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          urgencyTag === 'overdue_followup' || urgencyTag === 'critical_aging'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        }`}>
                          {urgencyLabel}
                        </span>
                      </div>

                      {/* Compact Icon + Short-Word Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-primary font-bold">
                          {profile.ordersCount} Orders • {formatCurrency(profile.totalSalesRevenue)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rex-500/10 border border-rex-500/25 text-rex-600 dark:text-rex-400 font-bold uppercase flex items-center gap-1">
                          <Zap size={10} /> {profile.recommendedFollowup.type} • {profile.recommendedFollowup.dueDate.slice(5)}
                        </span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-theme-subtle">
                      <div className="flex items-center gap-1">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/25 transition-colors"
                            title={`Call ${lead.phone}`}
                          >
                            <Phone size={12} />
                          </a>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/25 transition-colors"
                            title="Open WhatsApp"
                          >
                            <MessageSquare size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/leads?search=${encodeURIComponent(lead.id)}`)}
                          className="p-1.5 rounded bg-surface2 hover:bg-surface text-muted hover:text-primary border border-theme-subtle transition-colors cursor-pointer"
                          title="Open Lead in Pipeline"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAiPrefilledForm(lead, profile, 'lead')}
                          className="px-2 py-1 text-[10.5px] font-semibold bg-surface2 hover:bg-surface text-primary border border-theme-subtle rounded transition-colors cursor-pointer"
                        >
                          Customize
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleOneClickScheduleAI(lead, profile)}
                          className="px-2.5 py-1 text-[10.5px] font-bold bg-rex-600 hover:bg-rex-700 text-white rounded flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Schedule ${profile.recommendedFollowup.type} on ${profile.recommendedFollowup.dueDate}`}
                        >
                          <Zap size={11} />
                          <span>{isBusy ? 'Saving...' : '1-Click AI'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </GlassCard>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search subject, lead, company, notes..." className="w-64"/>

          {/* Status filter */}
          <div className="flex items-center bg-surface2 p-1 rounded-lg border border-theme-subtle">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer ${statusFilter === s ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${typeFilter === 'all' ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500' : 'border-theme-subtle text-muted hover:border-theme'}`}
            >
              All Types
            </button>
            {ACTIVITY_TYPES.map(t => {
              const Icon = t.icon
              return (
                <button key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${typeFilter === t.value ? 'bg-rex-500/15 text-rex-600 dark:text-rex-400 border-rex-500' : `border-theme-subtle text-muted hover:border-theme ${t.bg}`}`}
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
          <p className="text-xs text-muted mt-1">Schedule a follow-up from the AI Queue above or click &quot;Schedule Activity&quot;.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const typeInfo = getTypeInfo(item.type)
            const Icon = typeInfo.icon
            const isOverdue = item.status === 'overdue'
            const isDone = item.status === 'done'
            const dueDateStr = String(item.dueDate || '').slice(0, 10)
            const isToday = dueDateStr === todayStr

            const info = profileByFollowupId[String(item.id)]
            const aiProfile = info?.profile
            const phone = aiProfile?.phone || info?.matchedLead?.phone || info?.matchedCustomer?.phone || ''
            const cleanPhone = String(phone).replace(/[^0-9]/g, '')
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone}` : null

            return (
              <GlassCard key={item.id} className={`p-4 transition-all ${isOverdue ? 'border border-red-500/30' : isToday && !isDone ? 'border border-amber-500/30' : ''} ${isDone ? 'opacity-65' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${typeInfo.bg}`}>
                    <Icon size={16} className={typeInfo.color}/>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${isDone ? 'line-through text-muted' : 'text-primary'}`}>{item.subject}</span>
                          {getStatusBadge(item.status)}
                          <Badge variant={PRIORITIES.find(p => p.value === item.priority)?.color as any || 'default'}>
                            {item.priority}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {item.relatedName && (
                            <span className="text-xs text-muted flex items-center gap-1.5">
                              <ChevronRight size={10}/>{item.relatedType}:
                              <span
                                className="text-secondary font-semibold hover:text-rex-600 cursor-pointer hover:underline"
                                onClick={() => {
                                  if (item.relatedType === 'lead' && item.relatedId) {
                                    navigate(`/crm/leads?search=${encodeURIComponent(item.relatedId)}`)
                                  } else if (item.relatedType === 'customer' && item.relatedId) {
                                    navigate(`/crm/customers/${item.relatedId}`)
                                  }
                                }}
                              >
                                {item.relatedName}
                              </span>
                              {aiProfile && (
                                <AICustomerBadge
                                  profile={aiProfile}
                                  variant="pill"
                                  onQuickFollowup={() =>
                                    handleOpenAiPrefilledForm(
                                      info?.matchedLead || info?.matchedCustomer || { id: item.relatedId, company: item.relatedName },
                                      aiProfile,
                                      (item.relatedType || 'lead') as any
                                    )
                                  }
                                />
                              )}
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

                        {item.notes && <p className="text-xs text-secondary mt-1 line-clamp-1">{item.notes}</p>}

                        {/* Compact Icon + Short-Word History Chip on active follow-ups */}
                        {!isDone && item.status !== 'cancelled' && aiProfile && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-rex-500/8 border border-rex-500/20 text-rex-600 dark:text-rex-400 font-bold flex items-center gap-1">
                              <Sparkles size={10} />
                              {aiProfile.ordersCount > 0
                                ? `${aiProfile.ordersCount} Orders • ${formatCurrency(aiProfile.totalSalesRevenue)}`
                                : 'New Prospect'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-secondary font-semibold uppercase flex items-center gap-1">
                              <Zap size={10} className="text-amber-500" /> {aiProfile.recommendedFollowup.type}
                            </span>
                          </div>
                        )}

                        {item.outcome && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 italic font-medium">Outcome: {item.outcome}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        {!isDone && item.status !== 'cancelled' && (
                          <>
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/25 transition-colors"
                                title={`Call ${phone}`}
                              >
                                <Phone size={12} />
                              </a>
                            )}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/25 transition-colors"
                                title="WhatsApp Chat"
                              >
                                <MessageSquare size={12} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleQuickReschedule(item, 1)}
                              className="px-1.5 py-1 text-[10px] font-bold text-secondary hover:text-primary bg-surface2 hover:bg-surface rounded border border-theme-subtle transition-colors cursor-pointer"
                              title="Snooze to Tomorrow (+1d)"
                            >
                              +1d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickReschedule(item, 3)}
                              className="px-1.5 py-1 text-[10px] font-bold text-secondary hover:text-primary bg-surface2 hover:bg-surface rounded border border-theme-subtle transition-colors cursor-pointer"
                              title="Snooze +3 Days"
                            >
                              +3d
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowOutcome(item.id); setOutcomeText('') }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded border border-emerald-500/30 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={12}/> Done
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => handleOpenForm(item)} className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors cursor-pointer"><Edit size={13}/></button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={13}/></button>
                      </div>
                    </div>

                    {/* Outcome input panel (inline) with Follow-up Chaining */}
                    {showOutcome === item.id && (
                      <div className="mt-3 p-3 bg-surface2/60 rounded-lg border border-theme-subtle animate-fade-in space-y-2">
                        <label className="block text-xs font-semibold text-secondary">Add outcome / customer feedback (optional)</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" className="flex-1 input-base text-xs"
                            value={outcomeText}
                            onChange={e => setOutcomeText(e.target.value)}
                            placeholder="e.g. Customer confirmed interest, will issue PO next week..."
                            autoFocus />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMarkDone(item, outcomeText, false)}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              Mark Done
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkDone(item, outcomeText, true)}
                              className="px-3 py-1.5 bg-rex-600 text-white text-xs font-semibold rounded hover:bg-rex-700 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCw size={11} /> Done &amp; Schedule Next
                            </button>
                            <button type="button" onClick={() => setShowOutcome(null)} className="px-2 py-1.5 text-muted hover:text-secondary text-xs rounded hover:bg-surface2 transition-colors cursor-pointer">
                              Cancel
                            </button>
                          </div>
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
