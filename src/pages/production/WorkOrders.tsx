import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Factory, Plus, Search, Filter, Layers, Wrench, Clock, CheckCircle2, 
  AlertTriangle, RotateCcw, DollarSign, Package, ClipboardList, Play, 
  Scissors, ExternalLink, Trash2, Kanban, List, Calendar, Building, 
  RefreshCw, TrendingUp, ShieldCheck, ArrowRight, Eye, Sparkles
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { fetchWorkOrders, deleteWorkOrder } from '@/lib/api'
import { WorkOrderStudioModal } from '@/components/production/WorkOrderStudioModal'
import { WorkOrderCreateModal } from '@/components/production/WorkOrderCreateModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'qc_rework' | 'completed'

export const WorkOrders: React.FC = () => {
  const navigate = useNavigate()

  // Data State
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Search State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  // Modals
  const [activeStudioWO, setActiveStudioWO] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteWoId, setDeleteWoId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch all primary datasets
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [wos, emps, machs, invs, custs, quotes] = await Promise.all([
        fetchWorkOrders().catch(() => []),
        fetch(`${API_URL}/hr/employees`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/production/machineries`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/inventory`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/customers`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/quotations`).then(r => r.json()).catch(() => [])
      ])

      setWorkOrders(Array.isArray(wos) ? wos : [])
      setEmployees(Array.isArray(emps) ? emps : [])
      setMachineries(Array.isArray(machs) ? machs : [])
      setInventory(Array.isArray(invs) ? invs : [])
      setCustomers(Array.isArray(custs) ? custs : [])
      setQuotations(Array.isArray(quotes) ? quotes : [])

      // Update active studio WO if one is currently open
      if (activeStudioWO) {
        const refreshed = (wos as any[]).find((w: any) => w.id === activeStudioWO.id)
        if (refreshed) setActiveStudioWO(refreshed)
      }
    } catch (err) {
      console.error('Failed to load production data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Delete Work Order Handler
  const handleDeleteConfirm = async () => {
    if (!deleteWoId) return
    try {
      setDeleting(true)
      await deleteWorkOrder(deleteWoId)
      setDeleteWoId(null)
      loadAllData()
    } catch (err) {
      console.error('Failed to delete work order:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // 1. Search filter
      const q = search.trim().toLowerCase()
      const matchSearch = !q || 
        (wo.title || '').toLowerCase().includes(q) ||
        (wo.id || '').toLowerCase().includes(q) ||
        (wo.orderNo || '').toLowerCase().includes(q) ||
        (wo.customerName || '').toLowerCase().includes(q) ||
        (wo.notes || '').toLowerCase().includes(q)

      // 2. Status filter
      let matchStatus = true
      if (statusFilter === 'planned') {
        matchStatus = wo.status === 'Draft' || wo.status === 'Pending' || wo.status === 'Released'
      } else if (statusFilter === 'in_progress') {
        matchStatus = wo.status === 'In Progress'
      } else if (statusFilter === 'qc_rework') {
        matchStatus = wo.status === 'QC Pending' || wo.status === 'Rework' || wo.status === 'Rework Required'
      } else if (statusFilter === 'completed') {
        matchStatus = wo.status === 'Completed' || wo.status === 'Closed'
      }

      // 3. Priority filter
      const matchPriority = priorityFilter === 'all' || (wo.priority || '').toLowerCase() === priorityFilter.toLowerCase()

      return matchSearch && matchStatus && matchPriority
    })
  }, [workOrders, search, statusFilter, priorityFilter])

  // Summary Metrics KPIs
  const metrics = useMemo(() => {
    const total = workOrders.length
    const active = workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Closed').length
    const inMachining = workOrders.filter(w => w.status === 'In Progress').length
    const qcRework = workOrders.filter(w => 
      w.status === 'QC Pending' || w.status === 'Rework' || 
      (w.reworkLogs && w.reworkLogs.some((r: any) => r.status !== 'Resolved'))
    ).length
    const completed = workOrders.filter(w => w.status === 'Completed' || w.status === 'Closed').length

    const totalWipCost = workOrders
      .filter(w => w.status !== 'Completed' && w.status !== 'Closed')
      .reduce((sum, w) => sum + Number(w.costSummary?.actualTotalCost || 0), 0)

    return { total, active, inMachining, qcRework, completed, totalWipCost }
  }, [workOrders])

  // Data Table Columns
  const columns: Column<any>[] = [
    {
      key: 'orderNo',
      header: 'Job & Work Scope',
      sortable: true,
      render: (_: any, row: any) => {
        const ops = row.operations || []
        const currentOp = ops.find((o: any) => o.status === 'In Progress') || ops.find((o: any) => o.status === 'Pending')

        return (
          <div className="flex items-start gap-3 min-w-0 max-w-md py-1">
            <div className="w-9 h-9 rounded-none bg-rex-600/10 border border-rex-500/20 text-rex-600 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
              <Factory size={16}/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-primary">{row.orderNo || row.id}</span>
                <span className="text-[10px] text-muted font-mono bg-surface2 px-1.5 py-0.2 rounded-none border border-theme-subtle">
                  {row.id}
                </span>
                {row.customerName && (
                  <span className="text-[11px] font-medium text-secondary truncate flex items-center gap-1">
                    <Building size={11} className="text-rex-600"/> {row.customerName}
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-primary truncate hover:text-rex-600 transition-colors mt-0.5">
                {row.title}
              </h4>

              {currentOp && (
                <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-none bg-rex-500 animate-pulse"/>
                  <span>Current: <strong>{currentOp.operationName}</strong></span>
                  {currentOp.machineName && (
                    <span className="text-[10px] text-secondary">({currentOp.machineName})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'jobQty',
      header: 'Batch Quantity',
      sortable: true,
      render: (_: any, row: any) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-mono">
            <Package size={13} className="text-amber-500 shrink-0"/>
            <span className="font-bold text-xs text-primary">{row.jobQty || 1} pcs</span>
          </div>
          <div className="text-[10px] text-muted flex items-center gap-1.5 font-mono">
            <span className="text-emerald-600 font-bold">{row.completedQty || 0} done</span>
            {Number(row.scrapQty || 0) > 0 && <span className="text-rose-500 font-bold">• {row.scrapQty} scrap</span>}
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority & Due',
      sortable: true,
      render: (_: any, row: any) => {
        const isUrgent = row.priority === 'Urgent'
        const isHigh = row.priority === 'High'
        const deadlineDate = row.deadline ? new Date(row.deadline) : null
        const isOverdue = deadlineDate && deadlineDate < new Date() && row.status !== 'Completed'

        return (
          <div className="space-y-1">
            <Badge 
              value={row.priority || 'Normal'} 
              variant={isUrgent ? 'error' : isHigh ? 'warning' : 'default'} 
            />
            {deadlineDate && (
              <span className={`text-[11px] block font-mono ${
                isOverdue ? 'text-rose-500 font-bold' : 'text-muted'
              }`}>
                {deadlineDate.toLocaleDateString()} {isOverdue ? '⚠️ Overdue' : ''}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'progress',
      header: 'Routing Progress',
      render: (_: any, row: any) => {
        const ops = row.operations || []
        const total = ops.length
        const completed = ops.filter((o: any) => o.status === 'Completed').length
        const pct = row.progress !== undefined ? row.progress : (total > 0 ? Math.round((completed / total) * 100) : 0)

        return (
          <div className="w-36 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted font-mono">{completed}/{total} Steps</span>
              <span className="font-mono font-bold text-rex-600 dark:text-rex-400">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface2 rounded-none overflow-hidden">
              <div 
                className="h-full bg-rex-600 rounded-none transition-all duration-300" 
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'materials',
      header: 'Material Issue',
      render: (_: any, row: any) => {
        const issued = row.issuedMaterials || []
        const matCost = row.costSummary?.materialCost || 0

        return (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <Package size={12} className="text-emerald-500"/> {issued.length} Material{issued.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] font-mono text-muted block">
              {formatCurrency(matCost)}
            </span>
          </div>
        )
      }
    },
    {
      key: 'costing',
      header: 'Actual Cost / Budget',
      render: (_: any, row: any) => {
        const cost = row.costSummary || {}
        const actual = Number(cost.actualTotalCost || 0)
        const budget = Number(cost.estimatedCost || 0)

        return (
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              {formatCurrency(actual)}
            </span>
            {budget > 0 && (
              <span className="text-[10px] font-mono text-muted block">
                Target: {formatCurrency(budget)}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v: any) => {
        switch (v) {
          case 'Completed':
          case 'Closed':
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-green-500/10 text-green-600 border border-green-500/20"><CheckCircle2 size={11}/> Completed</span>
          case 'In Progress':
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse"><Play size={10} className="fill-blue-500"/> In Production</span>
          case 'QC Pending':
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20"><ShieldCheck size={11}/> QC Pending</span>
          case 'Rework':
          case 'Rework Required':
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse"><RotateCcw size={11}/> Rework</span>
          case 'Released':
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-purple-500/10 text-purple-600 border border-purple-500/20"><ArrowRight size={11}/> Released</span>
          default:
            return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-none bg-surface2 text-muted border border-theme-subtle"><Clock size={11}/> {v || 'Draft'}</span>
        }
      }
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_: any, row: any) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/production/work-orders/${row.id}`)}
            className="text-xs font-bold text-rex-600 border-rex-500/30 hover:bg-rex-500/10 rounded-none"
          >
            <Eye size={12} className="mr-1"/> Execution Studio
          </Button>

          <button 
            type="button" 
            onClick={() => setDeleteWoId(row.id)}
            className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-none transition-colors border border-transparent hover:border-rose-500/20"
            title="Delete Work Order"
          >
            <Trash2 size={13}/>
          </button>
        </div>
      )
    }
  ]

  // Kanban Columns
  const kanbanStages = [
    { id: 'planned', label: '1. Planned / Released', statuses: ['Draft', 'Pending', 'Released'], color: 'border-purple-500/40 text-purple-600' },
    { id: 'in_progress', label: '2. In Floor Machining', statuses: ['In Progress'], color: 'border-blue-500/40 text-blue-600' },
    { id: 'qc_rework', label: '3. QC & Rework Loop', statuses: ['QC Pending', 'Rework', 'Rework Required'], color: 'border-amber-500/40 text-amber-600' },
    { id: 'completed', label: '4. Completed & Handover', statuses: ['Completed', 'Closed'], color: 'border-emerald-500/40 text-emerald-600' }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── TOP HEADER (STANDARD REX ERP SYSTEM THEME) ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Manufacturing</h1>
          <p className="text-sm text-secondary mt-1">
            Shop floor routing, material traceability, live timers, QC inspection, rework tracking, and job costing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadAllData} 
            disabled={loading}
            className="rounded-none border-theme text-xs"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`}/> Refresh
          </Button>

          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="rounded-none text-xs font-bold"
          >
            <Plus size={14} className="mr-1.5"/> Create Work Order
          </Button>
        </div>
      </div>

      {/* ── TOP 5 KPI METRICS (STANDARD THEME CARDS) ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Active Jobs</span>
          <p className="text-xl font-mono font-bold text-primary">{metrics.active}</p>
          <span className="text-[10px] text-muted">{metrics.total} total recorded</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">In Production</span>
          <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">{metrics.inMachining}</p>
          <span className="text-[10px] text-muted">Floor machining now</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">QC & Rework</span>
          <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">{metrics.qcRework}</p>
          <span className="text-[10px] text-muted">Attention required</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Completed</span>
          <p className="text-xl font-mono font-bold text-green-600 dark:text-green-400">{metrics.completed}</p>
          <span className="text-[10px] text-muted">Signed off & closed</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Active WIP Value</span>
          <p className="text-base font-mono font-bold text-rex-600 dark:text-rex-300">{formatCurrency(metrics.totalWipCost)}</p>
          <span className="text-[10px] text-muted">Material + labor + machine</span>
        </GlassCard>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ─────────────────────────────────────────────── */}
      <GlassCard className="p-3 space-y-3 rounded-none border-theme-subtle">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Filter Pills with Sharp Edges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'All Jobs', count: metrics.total },
              { id: 'planned', label: 'Planned / Released', count: workOrders.filter(w => w.status === 'Draft' || w.status === 'Pending' || w.status === 'Released').length },
              { id: 'in_progress', label: 'In Production', count: metrics.inMachining },
              { id: 'qc_rework', label: 'QC & Rework', count: metrics.qcRework },
              { id: 'completed', label: 'Completed', count: metrics.completed }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-none uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-rex-500/10 border border-rex-500/40 text-rex-700 dark:text-rex-300 font-bold shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-none font-mono ${
                  statusFilter === tab.id ? 'bg-rex-500/20 text-rex-700 dark:text-rex-300 font-bold' : 'text-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & View Switch */}
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchBar 
                value={search} 
                onChange={setSearch} 
                placeholder="Search job #, title, customer..." 
                className="rounded-none"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2.5 py-1.5 text-primary text-xs font-medium focus:border-rex-500 outline-none"
            >
              <option value="all">Priority: All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Table List View"
              >
                <List size={14}/>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-surface2 text-primary font-bold' : 'text-muted hover:text-primary'
                }`}
                title="Kanban Pipeline Board"
              >
                <Kanban size={14}/>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── MAIN CONTENT (TABLE OR KANBAN) ───────────────────────────────────────── */}
      {viewMode === 'list' ? (
        <GlassCard className="p-0 border-theme-subtle overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-xs text-muted">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-rex-600"/>
              Loading work orders and floor operations...
            </div>
          ) : (
            <DataTable
              data={filteredWorkOrders}
              columns={columns}
              keyExtractor={(row: any) => row.id}
              emptyMessage="No work orders matching your filters. Click '+ Create Work Order' to begin a new job."
              onRowClick={(row: any) => navigate(`/production/work-orders/${row.id}`)}
            />
          )}
        </GlassCard>
      ) : (
        /* KANBAN PIPELINE VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kanbanStages.map(stage => {
            const stageWos = filteredWorkOrders.filter(w => stage.statuses.includes(w.status || 'Draft'))

            return (
              <div key={stage.id} className="space-y-3">
                <div className={`p-3 rounded-none bg-surface2/60 border ${stage.color} flex items-center justify-between`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider">{stage.label}</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-none bg-surface border border-theme-subtle">
                    {stageWos.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[400px]">
                  {stageWos.length === 0 ? (
                    <div className="p-8 text-center bg-surface2/20 rounded-none border border-dashed border-theme-subtle text-xs text-muted">
                      No jobs in this stage
                    </div>
                  ) : (
                    stageWos.map(wo => {
                      const cost = wo.costSummary || {}
                      const ops = wo.operations || []
                      const completedOps = ops.filter((o: any) => o.status === 'Completed').length

                      return (
                        <GlassCard
                          key={wo.id}
                          onClick={() => navigate(`/production/work-orders/${wo.id}`)}
                          className="p-4 border-theme-subtle hover:border-rex-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 rounded-none"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-rex-600 dark:text-rex-400">
                              {wo.orderNo || wo.id}
                            </span>
                            <Badge 
                              value={wo.priority || 'Normal'} 
                              variant={wo.priority === 'Urgent' ? 'error' : wo.priority === 'High' ? 'warning' : 'default'} 
                              className="rounded-none"
                            />
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-primary line-clamp-2">{wo.title}</h4>
                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              {wo.customerName ? (
                                <p className="text-[11px] text-muted truncate flex items-center gap-1">
                                  <Building size={10}/> {wo.customerName}
                                </p>
                              ) : <span />}
                              <span className="font-mono text-[10px] font-bold text-primary flex items-center gap-1 shrink-0 bg-surface2 px-1.5 py-0.5 border border-theme-subtle">
                                <Package size={11} className="text-amber-500"/> {wo.jobQty || 1} pcs
                              </span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted">{completedOps}/{ops.length} Steps</span>
                              <span className="font-mono font-bold text-rex-600">{wo.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-surface2 rounded-none overflow-hidden">
                              <div 
                                className="h-full bg-rex-600 rounded-none transition-all duration-300" 
                                style={{ width: `${wo.progress || 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-[11px]">
                            <span className="text-muted font-mono">
                              {formatCurrency(cost.actualTotalCost || 0)}
                            </span>
                            <span className="text-rex-600 dark:text-rex-400 font-bold flex items-center gap-0.5">
                              Studio <ArrowRight size={11}/>
                            </span>
                          </div>
                        </GlassCard>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── EXECUTION STUDIO MODAL ───────────────────────────────────────────────── */}
      <WorkOrderStudioModal
        isOpen={!!activeStudioWO}
        onClose={() => setActiveStudioWO(null)}
        workOrder={activeStudioWO}
        employees={employees}
        machineries={machineries}
        inventory={inventory}
        quotations={quotations}
        onRefresh={loadAllData}
        onNavigateToCutStudio={(target: any) => {
          const ref = typeof target === 'object' ? (target.jobRef || target.orderNo || target.id) : target
          const material = typeof target === 'object' ? target.materialName : null
          const length = typeof target === 'object' ? target.requiredLength : null
          const qty = typeof target === 'object' ? target.requiredQty : null
          navigate('/inventory', { 
            state: { 
              openCutStudioWithJobRef: ref,
              cutMaterial: material,
              cutLength: length,
              cutQty: qty,
              tab: 'linear_remnants' 
            } 
          })
        }}
        onNavigateToMR={(mrId) => {
          navigate(`/purchasing/mr-builder/${mrId}`)
        }}
      />

      {/* ── CREATE WORK ORDER MODAL ──────────────────────────────────────────────── */}
      <WorkOrderCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        customers={customers}
        machineries={machineries}
        employees={employees}
        inventory={inventory}
        quotations={quotations}
        onSuccess={(woId) => {
          loadAllData()
        }}
      />

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────────────── */}
      <Modal isOpen={!!deleteWoId} onClose={() => setDeleteWoId(null)} title="Delete Work Order" size="sm">
        <div className="p-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-none bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <Trash2 size={24}/>
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary">Delete Work Order #{deleteWoId}?</h4>
            <p className="text-xs text-muted mt-1">
              This will permanently delete this work order, operations routing, QC inspection records, and rework tickets.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setDeleteWoId(null)} className="rounded-none">Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-none"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
