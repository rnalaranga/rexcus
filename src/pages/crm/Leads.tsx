import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter, LayoutGrid, List, User, Phone, FileText, Bell, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useLeads, useFollowups } from '@/hooks/useData'
import { createLead, updateLead, deleteLead, fetchQuotations, deleteQuotation, createInvoice } from '@/lib/api'
import { formatCurrency, relativeTime, toMySQLDate } from '@/lib/utils'

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}

type ViewMode = 'kanban' | 'list'

export const Leads: React.FC = () => {
  const navigate = useNavigate()
  const { data: leads, loading, refetch } = useLeads()
  const { data: allFollowups } = useFollowups()
  const [view, setView]     = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Custom Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'lead' | 'quotation', id: string | number } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new'
  })

  const [leadQuotations, setLeadQuotations] = React.useState<any[]>([])
  React.useEffect(() => {
    if (editId) {
      fetchQuotations(editId).then(setLeadQuotations).catch(console.error)
    } else {
      setLeadQuotations([])
    }
  }, [editId])

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading leads...</div>

  const openCreateModal = () => {
    setEditId(null)
    setFormData({ name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new' })
    setIsModalOpen(true)
  }

  const openEditModal = (lead: any) => {
    setEditId(lead.id)
    setFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      priority: lead.priority,
      value: String(lead.value),
      stage: lead.stage
    })
    setIsModalOpen(true)
  }

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    if (editId) {
      // Update existing lead
      const updatedLead = {
        ...formData,
        value: Number(formData.value) || 0,
        lastActivity: toMySQLDate(new Date())
      }
      await updateLead(editId, updatedLead)
    } else {
      // Create new lead
      const newLead = {
        id: 'LEAD-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        ...formData,
        value: Number(formData.value) || 0,
        probability: 10,
        assignedTo: 'System Admin',
        lastActivity: toMySQLDate(new Date())
      }
      await createLead(newLead)
    }
    
    await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
  }

  const handleDelete = async () => {
    if (!editId) return
    setDeleteTarget({ type: 'lead', id: editId })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    
    if (deleteTarget.type === 'lead') {
      await deleteLead(deleteTarget.id as string)
      await refetch()
      setIsModalOpen(false)
    } else if (deleteTarget.type === 'quotation') {
      await deleteQuotation(deleteTarget.id as number)
      const fresh = await fetchQuotations(editId!)
      setLeadQuotations(fresh)
    }
    
    setSubmitting(false)
    setDeleteTarget(null)
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stage === targetStage) return
    
    // Optimistic UI update could go here, but since it's local, simple refetch is fine
    // We just do the API call in background and refetch
    await updateLead(leadId, { ...lead, stage: targetStage, lastActivity: toMySQLDate(new Date()) })
    await refetch()
  }

  const filtered = leads.filter(l =>
    [l.name, l.company, l.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Lead', sortable: true,
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-primary">{row.name}</p>
          <p className="text-[10px] text-muted">{row.company}</p>
        </div>
      ),
    },
    { key: 'id',       header: 'ID',       width: '100px', render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
    { key: 'stage',    header: 'Stage',    width: '120px', render: v => <Badge value={String(v)} /> },
    { key: 'priority', header: 'Priority', width: '90px',  render: v => <Badge value={String(v)} /> },
    { key: 'source',   header: 'Source',   render: v => <span className="text-xs text-muted">{String(v).replace(/_/g, ' ')}</span> },
    {
      key: 'value', header: 'Value', sortable: true, align: 'right', width: '120px',
      render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'probability', header: 'Prob.', align: 'center', width: '70px',
      render: v => (
        <span className={`text-xs font-medium ${Number(v) >= 70 ? 'text-emerald-600 dark:text-emerald-400' : Number(v) >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
          {String(v)}%
        </span>
      ),
    },
    { key: 'assignedTo',   header: 'Owner',    render: v => <span className="text-xs text-muted">{String(v).split(' ')[0]}</span> },
    { key: 'lastActivity', header: 'Activity', sortable: true, width: '100px', render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
  ]

  const stageColorBorder: Record<string, string> = {
    won: 'border-b-2 border-b-emerald-500',
    lost: 'border-b-2 border-b-slate-400 opacity-60',
    negotiation: 'border-b-2 border-b-rex-500',
    new: 'border-b-2 border-b-blue-400',
    contacted: 'border-b-2 border-b-purple-400',
    qualified: 'border-b-2 border-b-cyan-400',
    proposal: 'border-b-2 border-b-amber-400',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Lead Management</h1>
          <p className="text-xs text-muted mt-0.5">
            {leads.filter(l => !['won', 'lost'].includes(l.stage)).length} active leads ·{' '}
            <span className="text-rex-600 dark:text-rex-400 font-medium">{formatCurrency(
              leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((s, l) => s + Number(l.value), 0), true
            )} pipeline</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-theme">
            <button onClick={() => setView('kanban')} className={`p-2 transition-colors ${view === 'kanban' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView('list')}   className={`p-2 transition-colors ${view === 'list'   ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}`}>
              <List size={14} />
            </button>
          </div>
          <SearchBar placeholder="Search leads..." value={search} onChange={setSearch} size="sm" className="w-48" />
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>Add Lead</Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage)
            const stageValue = stageLeads.reduce((s, l) => s + Number(l.value), 0)
            return (
              <div 
                key={stage} 
                className="flex-shrink-0 w-56"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column header */}
                <div className={`glass px-3 py-2.5 mb-2 ${stageColorBorder[stage] || 'border-b-2 border-b-theme'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">{STAGE_LABELS[stage]}</span>
                    <span className="text-[10px] bg-surface2 text-muted px-1.5 py-0.5 font-medium">{stageLeads.length}</span>
                  </div>
                  {stageValue > 0 && <p className="text-[9px] text-muted mt-0.5">{formatCurrency(stageValue)}</p>}
                </div>

                <div className="space-y-2 min-h-[200px]">
                  {stageLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      className="kanban-card p-3 cursor-pointer" 
                      onClick={() => openEditModal(lead)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-xs font-medium text-primary leading-snug flex-1 mr-1">{lead.name}</p>
                        <Badge value={lead.priority} size="sm" />
                      </div>
                      <p className="text-[10px] text-muted mb-2 truncate">{lead.company}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-rex-600 dark:text-rex-300 font-semibold">{formatCurrency(lead.value)}</span>
                        <span className="text-[10px] text-muted">{lead.probability}%</span>
                      </div>
                      <div className="mt-1.5 h-0.5 bg-surface2">
                        <div className="h-full bg-rex-500" style={{ width: `${lead.probability}%`, opacity: 0.6 }} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] text-faint">{lead.assignedTo.split(' ')[0]}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/crm/followups') }}
                            className="text-[9px] text-muted hover:text-amber-500 transition-colors flex items-center gap-0.5"
                          ><Bell size={9}/></button>
                          <span className="text-[9px] text-faint">{relativeTime(lead.lastActivity)}</span>
                        </div>
                      </div>
                      {lead.stage === 'qualified' && (
                        <div className="mt-2 pt-2 border-t border-theme-subtle">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full text-[10px] h-6 py-0 flex items-center justify-center gap-1"
                            onClick={(e) => { e.stopPropagation(); navigate(`/crm/quotations/new/${lead.id}`); }}
                          >
                            <FileText size={10} /> Create Quote
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="py-6 text-center"><p className="text-[10px] text-faint">No leads</p></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-3 border-b border-theme-subtle flex items-center justify-between">
            <span className="text-xs text-muted">Showing <span className="text-primary font-medium">{filtered.length}</span> leads</span>
            <button className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"><Filter size={11} /> Filters</button>
          </div>
          <DataTable columns={columns} data={filtered} keyExtractor={r => r.id} onRowClick={openEditModal} emptyMessage="No leads found." />
        </GlassCard>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Lead" : "Create New Lead"} size="lg">
        <form onSubmit={handleSaveLead} className="space-y-6">
          
          {/* Section: Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <User size={14} className="text-rex-500" />
              Lead Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Lead Full Name <span className="text-rex-500">*</span></label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full input-base" placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company</label>
                <input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full input-base" placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Estimated Value (Rs.) <span className="text-rex-500">*</span></label>
                <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full input-base" placeholder="100000" />
              </div>
            </div>
          </div>

          {/* Section: Contact & Priority */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
              <Phone size={14} className="text-rex-500" />
              Contact Details & Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full input-base" placeholder="jane@example.com" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full input-base" placeholder="+94 7X XXX XXXX" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Priority</label>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full input-base">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Stage</label>
                <select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full input-base">
                  {STAGES.map(s => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Linked Follow-ups (Only visible in edit mode) */}
          {editId && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Bell size={14} className="text-amber-500" />
                  Linked Activities
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/crm/followups')}
                  className="text-[10px] text-rex-500 hover:underline"
                >
                  Manage Activities
                </button>
              </div>
              <div className="space-y-2">
                {allFollowups.filter((f: any) => f.relatedType === 'lead' && f.relatedId === editId).length === 0 ? (
                  <p className="text-[10px] text-muted italic">No follow-ups linked to this lead.</p>
                ) : (
                  allFollowups.filter((f: any) => f.relatedType === 'lead' && f.relatedId === editId).slice(0, 3).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-surface2 rounded border border-theme-subtle">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-secondary truncate">{f.subject}</p>
                        <p className="text-[9px] text-muted">{f.status.toUpperCase()} · Due: {String(f.dueDate).slice(0, 10)} {f.dueTime}</p>
                      </div>
                      <Badge variant={f.status === 'done' ? 'success' : f.status === 'overdue' ? 'error' : 'info'} size="sm">
                        {f.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Section: Saved Quotations */}
          {editId && (
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-subtle">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  Saved Quotations
                </h3>
                <button
                  type="button"
                  onClick={() => navigate(`/crm/quotations/new/${editId}`)}
                  className="text-[10px] text-rex-500 hover:underline"
                >
                  + New Quotation
                </button>
              </div>
              <div className="space-y-2">
                {leadQuotations.length === 0 ? (
                  <p className="text-[10px] text-muted italic">No quotations saved for this lead.</p>
                ) : (
                  (() => {
                    const seenTypes = new Set<string>()
                    return leadQuotations.map((q: any) => {
                      const isLatest = !seenTypes.has(q.type)
                      if (isLatest) seenTypes.add(q.type)

                      return (
                        <div key={q.id} className={`flex items-center justify-between p-2.5 rounded border ${isLatest ? 'bg-rex-500/5 border-rex-500/20' : 'bg-surface2 border-theme-subtle'}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-[11px] font-bold ${isLatest ? 'text-primary' : 'text-secondary'}`}>
                                {q.id}
                              </p>
                              <span className={`text-[9px] px-1.5 py-0.5 border rounded font-bold uppercase ${q.type === 'job' ? 'bg-amber-100 border-amber-200 text-amber-700' : q.type === 'customer' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-rex-500/10 border-rex-500/20 text-rex-600'}`}>
                                {q.type === 'job' ? 'Job Quote' : q.type === 'customer' ? 'Customer Quote' : 'Main Quote'}
                              </span>
                              {isLatest && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold uppercase animate-pulse">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-muted mt-1">
                              <span>{new Date(q.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              <span>•</span>
                              <span>{relativeTime(q.date)}</span>
                              <span>•</span>
                              <span className="font-semibold">{formatCurrency(Number(q.totalAmount))}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {q.type === 'customer' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 py-0 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                                onClick={async () => {
                                  try {
                                    const payload = {
                                      id: `INV-${Date.now().toString().slice(-6)}`,
                                      quotationId: q.id,
                                      leadId: editId,
                                      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                                      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
                                      items: '[]',
                                      subtotal: Number(q.totalAmount),
                                      tax: 0,
                                      total: Number(q.totalAmount),
                                      status: 'draft',
                                      notes: 'Generated from Quotation'
                                    }
                                    await createInvoice(payload);
                                    navigate('/finance/invoices');
                                  } catch (e) {
                                    console.error('Failed to create invoice', e);
                                  }
                                }}
                              >
                                Invoice
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-6 py-0 px-2"
                              onClick={() => navigate(`/crm/quotations/new/${editId}`)}
                            >
                              View
                            </Button>
                            <button
                              type="button"
                              className="h-6 w-6 flex items-center justify-center text-muted hover:text-red-500 transition-colors"
                              onClick={() => setDeleteTarget({ type: 'quotation', id: q.id })}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-theme-subtle">
            {editId ? (
              <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editId ? 'Save Changes' : 'Create Lead')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
