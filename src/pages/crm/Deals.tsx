import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, DollarSign, Target, Briefcase, Users, Bell } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useDeals, useCustomers, useFollowups } from '@/hooks/useData'
import { createDeal, updateDeal, deleteDeal } from '@/lib/api'
import { formatCurrency, formatDate, relativeTime, toMySQLDate } from '@/lib/utils'

const stageFilters = [
  { label: 'All',         value: 'all'        },
  { label: 'Open',        value: 'open'       },
  { label: 'Prospecting', value: 'prospecting'},
  { label: 'Proposal',    value: 'proposal'   },
  { label: 'Negotiation', value: 'negotiation'},
  { label: 'Contract',    value: 'contract'   },
  { label: 'Won âœ“',       value: 'closed_won' },
  { label: 'Lost',        value: 'closed_lost'},
]

export const Deals: React.FC = () => {
  const navigate = useNavigate()
  const { data: deals, loading: dl, refetch } = useDeals()
  const { data: customers, loading: cl } = useCustomers()
  const { data: allFollowups } = useFollowups()
  const [search, setSearch]           = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '', customerId: '', product: '', value: '', probability: '50', priority: 'medium', expectedClose: '', stage: 'open'
  })

  if (dl || cl) return <div className="p-8 text-center text-muted animate-pulse">Loading deals...</div>

  const openCreateModal = () => {
    setEditId(null)
    setFormData({ title: '', customerId: '', product: '', value: '', probability: '50', priority: 'medium', expectedClose: '', stage: 'open' })
    setIsModalOpen(true)
  }

  const openEditModal = (deal: any) => {
    setEditId(deal.id)
    setFormData({
      title: deal.title,
      customerId: deal.customerId,
      product: deal.product,
      value: String(deal.value),
      probability: String(deal.probability),
      priority: deal.priority,
      expectedClose: deal.expectedClose ? deal.expectedClose.split('T')[0] : '',
      stage: deal.stage
    })
    setIsModalOpen(true)
  }

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const selectedCustomer = customers.find(c => c.id === formData.customerId)
    
    if (editId) {
      const updatedDeal = {
        title: formData.title,
        customerId: formData.customerId,
        customerName: selectedCustomer ? selectedCustomer.name : 'Unknown',
        company: selectedCustomer ? selectedCustomer.company : 'Unknown',
        value: Number(formData.value) || 0,
        stage: formData.stage,
        probability: Number(formData.probability) || 50,
        priority: formData.priority,
        expectedClose: formData.expectedClose ? toMySQLDate(new Date(formData.expectedClose)) : toMySQLDate(new Date()),
        product: formData.product,
        lastUpdated: toMySQLDate(new Date())
      }
      await updateDeal(editId, updatedDeal)
    } else {
      const newDeal = {
        id: 'DEAL-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        title: formData.title,
        customerId: formData.customerId,
        customerName: selectedCustomer ? selectedCustomer.name : 'Unknown',
        company: selectedCustomer ? selectedCustomer.company : 'Unknown',
        value: Number(formData.value) || 0,
        stage: formData.stage,
        probability: Number(formData.probability) || 50,
        priority: formData.priority,
        expectedClose: formData.expectedClose ? toMySQLDate(new Date(formData.expectedClose)) : toMySQLDate(new Date()),
        owner: 'System Admin',
        product: formData.product,
        lastUpdated: toMySQLDate(new Date())
      }
      await createDeal(newDeal)
    }
    
    await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
  }



  const handleDelete = async () => {
    if (!editId) return
    setDeleteTarget(editId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    await deleteDeal(deleteTarget)
    await refetch()
    setSubmitting(false)
    setIsModalOpen(false)
    setDeleteTarget(null)
  }

  const getByStage = (s: string) =>
    s === 'open' ? deals.filter(d => !d.stage.includes('closed')) :
    s === 'all'  ? deals : deals.filter(d => d.stage === s)

  const filtered = deals.filter(d => {
    const ms = [d.title, d.company, d.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
    const mf = stageFilter === 'all' || (stageFilter === 'open' ? !d.stage.includes('closed') : d.stage === stageFilter)
    return ms && mf
  })

  const openDeals  = deals.filter(d => !d.stage.includes('closed'))
  const wonDeals   = deals.filter(d => d.stage === 'closed_won')
  const pipelineV  = openDeals.reduce((s, d) => s + Number(d.value), 0)
  const weightedV  = openDeals.reduce((s, d) => s + Number(d.value) * Number(d.probability) / 100, 0)
  const wonValue   = wonDeals.reduce((s, d) => s + Number(d.value), 0)

  const columns: Column<any>[] = [
    {
      key: 'title', header: 'Deal', sortable: true,
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-primary leading-snug">{row.title}</p>
          <p className="text-[10px] text-muted mt-0.5">{row.product}</p>
        </div>
      ),
    },
    { key: 'id',      header: 'ID',       width: '100px', render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
    {
      key: 'company', header: 'Customer',
      render: (_, row) => (
        <div>
          <p className="text-xs text-secondary">{row.company}</p>
          <p className="text-[10px] text-muted">{row.customerName}</p>
        </div>
      ),
    },
    { key: 'stage',    header: 'Stage',    sortable: true, width: '130px', render: v => <Badge value={String(v).replace('closed_', '')} size="sm" /> },
    { key: 'priority', header: 'Priority', width: '90px',  render: v => <Badge value={String(v)} /> },
    {
      key: 'value', header: 'Value', sortable: true, align: 'right', width: '120px',
      render: v => <span className="text-sm font-bold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span>,
    },
    {
      key: 'probability', header: 'Prob.', align: 'center', width: '80px',
      render: (v) => (
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-semibold ${Number(v) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : Number(v) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
            {String(v)}%
          </span>
          <div className="w-10 h-0.5 bg-surface2">
            <div className="h-full bg-rex-500" style={{ width: `${v}%`, opacity: 0.55 }} />
          </div>
        </div>
      ),
    },
    { key: 'expectedClose', header: 'Close Date', sortable: true, width: '110px', render: v => <span className="text-xs text-muted">{formatDate(String(v))}</span> },
    { key: 'owner',         header: 'Owner',       width: '100px',              render: v => <span className="text-xs text-muted">{String(v).split(' ')[0]}</span> },
    { key: 'lastUpdated',   header: 'Updated',     sortable: true, width: '90px', render: v => <span className="text-xs text-muted">{relativeTime(String(v))}</span> },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Deal Management</h1>
          <p className="text-xs text-muted mt-0.5">Track and manage your sales pipeline</p>
        </div>
        <SearchBar placeholder="Search deals..." value={search} onChange={setSearch} size="sm" className="w-64" />
        <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>New Deal</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total Pipeline"    value={formatCurrency(pipelineV, true)} subtitle={`${openDeals.length} open deals`}       icon={Briefcase}  trend={5.8}  trendLabel="vs last month" variant="glow" />
        <StatCard title="Weighted Pipeline" value={formatCurrency(weightedV, true)} subtitle="Probability-adjusted"                   icon={Target} />
        <StatCard title="Closed Won"        value={formatCurrency(wonValue,  true)} subtitle={`${wonDeals.length} deals won`}         icon={TrendingUp} trend={18}   trendLabel="vs last quarter" />
        <StatCard title="Win Rate"          value={`${Math.round(wonDeals.length / deals.length * 100)}%`} subtitle={`${wonDeals.length} of ${deals.length} deals`} icon={DollarSign} variant="red" />
      </div>

      {/* Stage filter + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {stageFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStageFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium border transition-all ${
              stageFilter === f.value
                ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300'
                : 'bg-surface border-theme text-secondary hover:border-rex-500/30 hover:text-primary'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[9px] opacity-60">{getByStage(f.value).length}</span>
          </button>
        ))}
        <div className="ml-auto">
          <SearchBar placeholder="Search deals..." value={search} onChange={setSearch} size="sm" className="w-52" />
        </div>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-3 border-b border-theme-subtle flex items-center justify-between">
          <span className="text-xs text-muted">
            Showing <span className="text-primary font-medium">{filtered.length}</span> deals Â·{' '}
            <span className="text-rex-600 dark:text-rex-400 font-medium">{formatCurrency(filtered.reduce((s, d) => s + Number(d.value), 0), true)} total</span>
          </span>
        </div>
        <DataTable columns={columns} data={filtered} keyExtractor={r => r.id} onRowClick={openEditModal} emptyMessage="No deals match your filter." />
      </GlassCard>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Deal" : "Create New Deal"} size="lg">
        {customers.length === 0 ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rex-500/10 text-rex-500 rounded-full flex items-center justify-center mb-2">
              <Users size={24} />
            </div>
            <h3 className="text-sm font-bold text-primary">No Customers Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              You need to have at least one customer account before creating a deal. Please add a customer first.
            </p>
            <div className="pt-2">
              <Button variant="primary" onClick={() => { setIsModalOpen(false); navigate('/crm/customers'); }}>
                Go to Customers
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveDeal} className="space-y-6">
            {/* Section: Deal Overview */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <Briefcase size={14} className="text-rex-500" />
                Deal Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Deal Title <span className="text-rex-500">*</span></label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full input-base" placeholder="e.g. Q4 Bulk Order" />
                </div>
                
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Associated Customer <span className="text-rex-500">*</span></label>
                  <select required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full input-base">
                    <option value="" disabled>Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Product / Service</label>
                  <input value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} className="w-full input-base" placeholder="e.g. Industrial Materials" />
                </div>
              </div>
            </div>

            {/* Section: Value & Timeline */}
            <div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 pb-2 border-b border-theme-subtle flex items-center gap-2">
                <Target size={14} className="text-rex-500" />
                Value & Timeline
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Deal Value (Rs.) <span className="text-rex-500">*</span></label>
                  <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full input-base" placeholder="500000" />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Win Probability (%)</label>
                  <input type="number" min="0" max="100" value={formData.probability} onChange={e => setFormData({...formData, probability: e.target.value})} className="w-full input-base" placeholder="50" />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Expected Close Date</label>
                  <input type="date" value={formData.expectedClose} onChange={e => setFormData({...formData, expectedClose: e.target.value})} className="w-full input-base" />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full input-base">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                {editId && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Deal Stage</label>
                    <select value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})} className="w-full input-base">
                      {stageFilters.filter(s => s.value !== 'all').map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  {allFollowups.filter((f: any) => f.relatedType === 'deal' && f.relatedId === editId).length === 0 ? (
                    <p className="text-[10px] text-muted italic">No follow-ups linked to this deal.</p>
                  ) : (
                    allFollowups.filter((f: any) => f.relatedType === 'deal' && f.relatedId === editId).slice(0, 3).map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-2 bg-surface2 rounded border border-theme-subtle">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-secondary truncate">{f.subject}</p>
                          <p className="text-[9px] text-muted">{f.status.toUpperCase()} Â· Due: {String(f.dueDate).slice(0, 10)} {f.dueTime}</p>
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

            <div className="pt-4 flex items-center justify-between border-t border-theme-subtle">
              {editId ? (
                <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Deal</Button>
              ) : <div />}
              <div className="flex gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : (editId ? 'Save Changes' : 'Create Deal')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this deal?
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


