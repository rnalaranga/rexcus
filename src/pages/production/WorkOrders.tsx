import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Factory, Plus, Search, Filter, Layers, Wrench, Clock, CheckCircle2, 
  AlertTriangle, RotateCcw, DollarSign, Package, ClipboardList, Play, 
  Scissors, ExternalLink, Trash2, Kanban, List, Calendar, Building, 
  RefreshCw, TrendingUp, ShieldCheck, ArrowRight, Eye, Sparkles, Printer, Camera
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { fetchWorkOrders, deleteWorkOrder, fetchFinishedGoodsOrders, fetchInvoices, fetchMRs, fetchAllCustomerGRNs } from '@/lib/api'
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown'
import { WorkOrderStudioModal } from '@/components/production/WorkOrderStudioModal'
import { WorkOrderCreateModal } from '@/components/production/WorkOrderCreateModal'
import { WorkOrderPrintModal } from '@/components/production/WorkOrderPrintModal'
import { useSettings } from '@/contexts/SettingsContext'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'
import { findMatchingSamplePhotos } from '@/lib/samplePhotos'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'qc_rework' | 'completed'

export const WorkOrders: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings } = useSettings()

  // Data State
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [mrs, setMrs] = useState<any[]>([])
  const [allCustomerGrns, setAllCustomerGrns] = useState<any[]>([])
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Filter & Search State
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('id')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
  }, [searchParams])

  // Modals
  const [activeStudioWO, setActiveStudioWO] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [printWo, setPrintWo] = useState<any | null>(null)
  const [deleteWoId, setDeleteWoId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch all primary datasets
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [wos, emps, machs, invs, custs, quotes, ords, invcs, matReqs, cGrns] = await Promise.all([
        fetchWorkOrders().catch(() => []),
        fetch(`${API_URL}/hr/employees`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/production/machineries`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/inventory`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/customers`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/quotations`).then(r => r.json()).catch(() => []),
        fetchFinishedGoodsOrders().catch(() => []),
        fetchInvoices().catch(() => []),
        fetchMRs().catch(() => []),
        fetchAllCustomerGRNs().catch(() => [])
      ])
      setAllCustomerGrns(Array.isArray(cGrns) ? cGrns : [])

      setWorkOrders(Array.isArray(wos) ? wos : [])
      setEmployees(Array.isArray(emps) ? emps : [])
      setMachineries(Array.isArray(machs) ? machs : [])
      setInventory(Array.isArray(invs) ? invs : [])
      setCustomers(Array.isArray(custs) ? custs : [])
      setQuotations(Array.isArray(quotes) ? quotes : [])
      setOrders(Array.isArray(ords) ? ords : [])
      setInvoices(Array.isArray(invcs) ? invcs : [])
      setMrs(Array.isArray(matReqs) ? matReqs : [])

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
        (wo.quoteId || '').toLowerCase().includes(q) ||
        (wo.quotationNo || '').toLowerCase().includes(q) ||
        (wo.customerName || '').toLowerCase().includes(q) ||
        (wo.customer || '').toLowerCase().includes(q) ||
        (wo.notes || '').toLowerCase().includes(q)

      // 2. Status filter
      let matchStatus = true
      if (statusFilter === 'planned') {
        matchStatus = wo.status === 'Draft' || wo.status === 'Pending' || wo.status === 'Released' || wo.status === 'Planned'
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

  // Build Traceability Nodes for a Work Order
  const getWorkOrderTraces = (row: any): TraceNode[] => {
    const traces: TraceNode[] = []

    // 1. Linked Quotation
    const quoteNo = row.quotationNo || (row.sourceQuoteId ? quotations.find((q: any) => String(q.id) === String(row.sourceQuoteId))?.quotationNo : null)
    if (quoteNo) {
      traces.push({
        type: 'quotation',
        title: 'Quotation',
        reference: quoteNo,
        subtitle: 'Source Commercial Quote',
        statusBadge: { label: 'Quote', variant: 'info' },
        navigateUrl: `/crm/quotations?search=${encodeURIComponent(quoteNo)}`
      })
    }

    // 2. Linked Customer / Sales Order
    const linkedOrder = orders.find((o: any) => 
      (o.orderNo && (o.orderNo === row.orderNo || (row.title && row.title.includes(o.orderNo)))) ||
      (row.sourceQuoteId && o.quoteId && String(o.quoteId) === String(row.sourceQuoteId))
    )
    if (linkedOrder) {
      traces.push({
        type: 'order',
        title: 'Sales Order',
        reference: linkedOrder.orderNo,
        subtitle: `Customer: ${linkedOrder.customerName || ''}`,
        statusBadge: { label: linkedOrder.status || 'Active Order', variant: 'info' },
        navigateUrl: `/crm/sales-orders?search=${encodeURIComponent(linkedOrder.orderNo)}`
      })

      if (linkedOrder.gatePassNo) {
        traces.push({
          type: 'gate_pass',
          title: 'Gate Pass',
          reference: linkedOrder.gatePassNo,
          subtitle: linkedOrder.isDispatched ? 'Dispatched from Premises' : 'Gate Pass Issued',
          statusBadge: { label: linkedOrder.isDispatched ? 'Dispatched' : 'Gate Pass', variant: 'info' },
          navigateUrl: `/crm/sales-orders?search=${encodeURIComponent(linkedOrder.orderNo)}`
        })
      }
    }

    // 3. Linked Invoices
    const linkedInv = invoices.find((inv: any) => 
      (row.quotationNo && (inv.quotationNo === row.quotationNo || inv.quotationId === row.sourceQuoteId)) ||
      (linkedOrder && (inv.orderNo === linkedOrder.orderNo || inv.orderId === linkedOrder.id))
    )
    if (linkedInv) {
      traces.push({
        type: 'invoice',
        title: 'Tax Invoice',
        reference: linkedInv.invoiceNo || linkedInv.id,
        subtitle: linkedInv.status === 'paid' ? 'Paid in Full' : 'Awaiting Payment',
        statusBadge: { 
          label: linkedInv.status === 'paid' ? 'Paid' : 'Invoice', 
          variant: linkedInv.status === 'paid' ? 'success' : 'warning' 
        },
        navigateUrl: `/finance/invoices?search=${encodeURIComponent(linkedInv.invoiceNo || linkedInv.id)}`
      })
    }

    // 4. Linked Material Requests
    const linkedMrs = mrs.filter((m: any) => 
      m.workOrderId === row.id || m.jobNo === row.orderNo || (row.orderNo && m.notes && m.notes.includes(row.orderNo))
    )
    if (linkedMrs.length > 0) {
      const mrNum = linkedMrs[0].mrNo || linkedMrs[0].id;
      traces.push({
        type: 'mr',
        title: 'Material Request',
        reference: linkedMrs[0].mrNo || `MR (${linkedMrs.length})`,
        subtitle: `Items: ${linkedMrs[0].items?.length || 1} material(s)`,
        statusBadge: { label: 'MR Linked', variant: 'info' },
        navigateUrl: `/purchasing?tab=mr&search=${encodeURIComponent(mrNum)}`
      })
    }

    return traces
  }

  // Data Table Columns (Optimized for 100% viewport width without horizontal scroll)
  const columns: Column<any>[] = [
    {
      key: 'orderNo',
      header: 'Job & Customer',
      sortable: true,
      render: (_: any, row: any) => (
        <div className="py-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-xs text-primary">
              {row.orderNo || row.id}
            </span>
            {row.quotationNo && (
              <span className="text-[9.5px] font-mono font-semibold px-1 py-0.2 bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 rounded-none">
                {row.quotationNo}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-secondary truncate max-w-[200px]" title={row.title}>
            {row.title || 'Precision Machining Job'}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-muted truncate max-w-[200px]" title={row.customerName}>
            <Building size={11} className="text-muted shrink-0" />
            <span className="truncate">{row.customerName || 'Standard / Internal Job'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'currentStep',
      header: 'Step & Machine',
      render: (_: any, row: any) => {
        const ops = row.operations || []
        const currentOp = ops.find((o: any) => o.status === 'In Progress') || ops.find((o: any) => o.status === 'Pending')

        if (!currentOp) {
          return (
            <span className="text-xs text-muted font-mono italic">
              {ops.length > 0 && ops.every((o: any) => o.status === 'Completed') ? 'All Steps Finished' : 'Not Started'}
            </span>
          )
        }

        const isInProgress = currentOp.status === 'In Progress'

        return (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-none ${isInProgress ? 'bg-blue-500 animate-pulse' : 'bg-surface3'}`} />
              <span className="text-xs font-bold text-primary truncate max-w-[140px]" title={currentOp.operationName}>
                {currentOp.operationName}
              </span>
            </div>
            {currentOp.machineName ? (
              <span className="text-[10px] font-mono text-secondary flex items-center gap-1 mt-0.5">
                <Wrench size={10} className="text-muted shrink-0" /> {currentOp.machineName}
              </span>
            ) : (
              <span className="text-[10px] text-muted font-mono block mt-0.5">
                Machine unassigned
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'jobQty',
      header: 'Batch Qty',
      sortable: true,
      render: (_: any, row: any) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-primary">
            <Package size={12} className="text-secondary shrink-0" />
            <span>{row.jobQty || 1} pcs</span>
          </div>
          <div className="text-[10px] font-mono text-muted flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{row.completedQty || 0} done</span>
            {Number(row.scrapQty || 0) > 0 && (
              <span className="text-rose-500 font-bold">• {row.scrapQty} scrap</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'progress',
      header: 'Routing',
      render: (_: any, row: any) => {
        const ops = row.operations || []
        const total = ops.length
        const completed = ops.filter((o: any) => o.status === 'Completed').length
        const pct = row.progress !== undefined ? row.progress : (total > 0 ? Math.round((completed / total) * 100) : 0)

        return (
          <div className="w-24 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-muted">{completed}/{total}</span>
              <span className="font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface2 rounded-none overflow-hidden border border-theme-subtle">
              <div 
                className="h-full bg-blue-600 rounded-none transition-all duration-300" 
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'costing',
      header: 'Cost / Budget',
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
                Tgt: {formatCurrency(budget)}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status & Priority',
      sortable: true,
      render: (v: any, row: any) => {
        const isUrgent = row.priority === 'Urgent'
        const isHigh = row.priority === 'High'
        const deadlineDate = row.deadline ? new Date(row.deadline) : null
        const isOverdue = deadlineDate && deadlineDate < new Date() && row.status !== 'Completed'

        const renderStatus = () => {
          switch (v) {
            case 'Completed':
            case 'Closed':
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-500/20"><CheckCircle2 size={11}/> Done</span>
            case 'In Progress':
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse"><Play size={10} className="fill-blue-500"/> Running</span>
            case 'QC Pending':
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20"><ShieldCheck size={11}/> QC Hold</span>
            case 'Rework':
            case 'Rework Required':
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse"><RotateCcw size={11}/> Rework</span>
            case 'Released':
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20"><ArrowRight size={11}/> Released</span>
            default:
              return <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider bg-surface2 text-muted border border-theme-subtle"><Clock size={11}/> {v || 'Draft'}</span>
          }
        }

        return (
          <div className="space-y-1">
            {renderStatus()}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
              <Badge 
                value={row.priority || 'Normal'} 
                variant={isUrgent ? 'error' : isHigh ? 'warning' : 'default'} 
                className="py-0 px-1 text-[9px] rounded-none"
              />
              {deadlineDate && (
                <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
                  {deadlineDate.toLocaleDateString()} {isOverdue ? '⚠️' : ''}
                </span>
              )}
            </div>
          </div>
        )
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
            className="text-xs font-bold text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none h-7 px-2.5"
          >
            <Eye size={12} className="mr-1 text-rex-600 dark:text-rex-400"/> Studio
          </Button>

          {(() => {
            const { photos: sPhotos, grns: matchedGrns } = findMatchingSamplePhotos({
              id: row.id,
              orderNo: row.orderNo,
              quoteId: row.sourceQuoteId || row.quotationId,
              quotationNo: row.quotationNo || row.sourceQuoteNo,
              leadId: row.leadId,
              customerName: row.customerName
            }, allCustomerGrns);
            if (sPhotos.length === 0) return null;
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveViewingPhotos({
                    photos: sPhotos,
                    title: `Sample Photos - Work Order #${row.orderNo || row.id} (${matchedGrns.map((g: any) => g.id).join(', ')})`
                  });
                }}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 rounded-none h-7 px-2"
                title={`View ${sPhotos.length} Customer Sample Photo(s)`}
              >
                <Camera size={12} className="mr-1 text-amber-500" /> Samples ({sPhotos.length})
              </Button>
            );
          })()}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPrintWo(row)}
            className="text-xs font-semibold text-secondary hover:text-primary border border-theme-subtle hover:bg-surface2 rounded-none h-7 px-2"
            title="Print Job Traveler"
          >
            <Printer size={12} className="mr-1 text-muted"/> Print
          </Button>

          <TraceabilityDropdown
            title={`WO #${row.orderNo || row.id}`}
            traces={getWorkOrderTraces(row)}
          />

          <button 
            type="button" 
            onClick={() => setDeleteWoId(row.id)}
            className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-none transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
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
          <PageHelpButton moduleId="production-work-orders" />
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

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={4} />

      {/* ── TOP 5 KPI METRICS (STANDARD THEME CARDS) ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-xs text-muted uppercase tracking-wider block font-semibold mb-1">Active Jobs</span>
          <p className="text-xl font-mono font-bold text-primary">{metrics.active}</p>
          <span className="text-xs text-muted">{metrics.total} total recorded</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-xs text-muted uppercase tracking-wider block font-semibold mb-1">In Production</span>
          <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">{metrics.inMachining}</p>
          <span className="text-xs text-muted">Floor machining now</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-xs text-muted uppercase tracking-wider block font-semibold mb-1">QC & Rework</span>
          <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">{metrics.qcRework}</p>
          <span className="text-xs text-muted">Attention required</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-xs text-muted uppercase tracking-wider block font-semibold mb-1">Completed</span>
          <p className="text-xl font-mono font-bold text-green-600 dark:text-green-400">{metrics.completed}</p>
          <span className="text-xs text-muted">Signed off & closed</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-xs text-muted uppercase tracking-wider block font-semibold mb-1">Active WIP Value</span>
          <p className="text-base font-mono font-bold text-primary">{formatCurrency(metrics.totalWipCost)}</p>
          <span className="text-xs text-muted">Material + labor + machine</span>
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
                    ? 'border-b-2 border-rex-600 text-rex-600 dark:text-rex-400 font-bold bg-rex-500/10 border-rex-500/30 shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-none font-mono font-medium ${
                  statusFilter === tab.id ? 'bg-rex-600 text-white font-bold' : 'text-muted'
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
              className="bg-surface border border-theme-subtle rounded-none px-2.5 py-1.5 text-primary text-xs font-medium focus:border-primary outline-none"
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
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-secondary"/>
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
                          className="p-4 border-theme-subtle hover:border-theme hover:shadow-md transition-all cursor-pointer space-y-3 rounded-none"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
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
                                <p className="text-xs text-muted truncate flex items-center gap-1.5">
                                  <Building size={10}/> {wo.customerName}
                                </p>
                              ) : <span />}
                              <span className="font-mono text-xs font-semibold text-primary flex items-center gap-1.5 shrink-0 bg-surface2 px-2 py-0.5 rounded-none border border-theme-subtle">
                                <Package size={11} className="text-amber-500"/> {wo.jobQty || 1} pcs
                              </span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted">{completedOps}/{ops.length} Steps</span>
                              <span className="font-mono font-bold text-primary">{wo.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-surface2 rounded-none overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-none transition-all duration-300" 
                                style={{ width: `${wo.progress || 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-xs font-medium">
                            <div onClick={(e) => e.stopPropagation()}>
                              <TraceabilityDropdown
                                title={`Work Order #${wo.orderNo || wo.id}`}
                                traces={getWorkOrderTraces(wo)}
                                compact
                              />
                            </div>
                            <span className="text-muted font-mono">
                              {formatCurrency(cost.actualTotalCost || 0)}
                            </span>
                            {(() => {
                              const { photos: sPhotos, grns: matchedGrns } = findMatchingSamplePhotos({
                                id: wo.id,
                                orderNo: wo.orderNo,
                                quoteId: wo.sourceQuoteId || wo.quotationId,
                                quotationNo: wo.quotationNo || wo.sourceQuoteNo,
                                leadId: wo.leadId,
                                customerName: wo.customerName
                              }, allCustomerGrns);
                              if (sPhotos.length === 0) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveViewingPhotos({
                                      photos: sPhotos,
                                      title: `Sample Photos - Work Order #${wo.orderNo || wo.id} (${matchedGrns.map((g: any) => g.id).join(', ')})`
                                    });
                                  }}
                                  className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                                  title={`View ${sPhotos.length} Customer Sample Photo(s)`}
                                >
                                  <Camera size={10} className="text-amber-500" /> Samples ({sPhotos.length})
                                </button>
                              );
                            })()}
                            <span className="text-rex-600 dark:text-rex-400 hover:underline font-bold flex items-center gap-0.5">
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

      {/* ── WORK ORDER JOB TRAVELER PRINT MODAL ────────────────────────────────────── */}
      <SamplePhotoViewerModal
        isOpen={!!activeViewingPhotos}
        onClose={() => setActiveViewingPhotos(null)}
        photos={activeViewingPhotos?.photos || []}
        title={activeViewingPhotos?.title || 'Sample Photos'}
      />

      {printWo && (
        <WorkOrderPrintModal
          isOpen={!!printWo}
          onClose={() => setPrintWo(null)}
          workOrder={printWo}
          settings={settings}
        />
      )}
    </div>
  )
}
