import React, { useState, useEffect, useMemo } from 'react'
import { 
  Factory, Layers, Wrench, Clock, CheckCircle2, AlertTriangle, RotateCcw, 
  DollarSign, Package, ClipboardList, Play, Pause, Scissors, FileText, 
  ChevronRight, Plus, Trash2, Edit, ShieldCheck, AlertCircle, ArrowRight, 
  ExternalLink, Printer, Download, User, Cpu, TrendingUp, Calendar, 
  Building, Check, X, RefreshCw, BarChart3, HelpCircle, Activity
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { 
  updateWorkOrderStatus, 
  updateWorkOrderOperationStatus, 
  logOperationQC, 
  issueMaterialToWorkOrder, 
  addWorkOrderOperation, 
  deleteWorkOrderOperation, 
  updateReworkLog, 
  completeWorkOrder, 
  updateWorkOrder
} from '@/lib/api'

interface WorkOrderStudioModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: any
  employees: any[]
  machineries: any[]
  inventory: any[]
  onRefresh: () => void
  onNavigateToCutStudio?: (jobRef: string, inventoryId?: string) => void
  onNavigateToMR?: (mrId: string) => void
}

type StudioTab = 'routing' | 'materials' | 'qc_rework' | 'costing' | 'specs'

export const WorkOrderStudioModal: React.FC<WorkOrderStudioModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  employees,
  machineries,
  inventory,
  onRefresh,
  onNavigateToCutStudio,
  onNavigateToMR
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('routing')
  const [submitting, setSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Sub-Modals
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showAddOpModal, setShowAddOpModal] = useState(false)
  const [showQcModal, setShowQcModal] = useState<any>(null)
  const [showReworkModal, setShowReworkModal] = useState<any>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Direct Material Issue Form
  const [issueForm, setIssueForm] = useState({
    inventoryId: '',
    materialName: '',
    qty: 1,
    unit: 'pcs',
    unitCost: 0,
    notes: ''
  })

  // Add Operation Form
  const [newOpForm, setNewOpForm] = useState({
    operationName: '',
    machineId: '',
    employeeId: '',
    plannedHours: 1,
    hourlyLaborRate: 750,
    hourlyMachineRate: 1200,
    notes: ''
  })

  // QC Form
  const [qcForm, setQcForm] = useState({
    inspectedBy: 'QA Inspector',
    status: 'Pass',
    defectReason: 'Tolerance/Dimensions',
    notes: '',
    sampleQty: 1,
    defectQty: 0,
    severity: 'Normal'
  })

  // Rework Form
  const [reworkForm, setReworkForm] = useState({
    id: '',
    status: 'In Progress',
    actionTaken: '',
    assignedEmployeeId: '',
    machineId: '',
    hours: 1,
    cost: 0,
    notes: '',
    resolvedBy: 'QA Supervisor'
  })

  // Completion Form
  const [completeForm, setCompleteForm] = useState({
    completedQty: 1,
    scrapQty: 0,
    notes: '',
    finalHandoverLocation: 'Finished Goods Bay A'
  })

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMsg({ type, text })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Auto-init completion form with jobQty when WO changes
  useEffect(() => {
    if (workOrder) {
      setCompleteForm({
        completedQty: Number(workOrder.jobQty || 1) - Number(workOrder.scrapQty || 0),
        scrapQty: Number(workOrder.scrapQty || 0),
        notes: '',
        finalHandoverLocation: 'Finished Goods Bay A'
      })
    }
  }, [workOrder])

  if (!isOpen || !workOrder) return null

  const wo = workOrder
  const operations: any[] = wo.operations || []
  const issuedMaterials: any[] = wo.issuedMaterials || []
  const reworkLogs: any[] = wo.reworkLogs || []
  const qcInspections: any[] = wo.qcInspections || []
  const cost = wo.costSummary || {
    materialCost: 0,
    laborCost: 0,
    machineCost: 0,
    reworkCost: 0,
    overheadCost: 0,
    actualTotalCost: 0,
    estimatedCost: 0,
    variance: 0,
    progress: 0
  }

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Closed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 flex items-center gap-1.5"><CheckCircle2 size={12}/> Completed</span>
      case 'In Progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5"><Play size={12} className="fill-blue-500/30"/> In Production</span>
      case 'QC Pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><ShieldCheck size={12}/> QC Inspection</span>
      case 'Rework':
      case 'Rework Required':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse"><RotateCcw size={12}/> Rework In Progress</span>
      case 'Released':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5"><ArrowRight size={12}/> Released</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface2 text-muted border border-theme-subtle flex items-center gap-1.5"><Clock size={12}/> {status || 'Draft'}</span>
    }
  }

  // Change WO status
  const handleStatusChange = async (newStatus: string) => {
    try {
      setSubmitting(true)
      await updateWorkOrderStatus(wo.id, newStatus)
      notify('success', `Work Order status updated to ${newStatus}`)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  // Start / Pause / Complete Operation Timer
  const handleOpTimerAction = async (opId: string, actionStatus: string) => {
    try {
      setSubmitting(true)
      await updateWorkOrderOperationStatus(opId, actionStatus)
      notify('success', `Operation status updated: ${actionStatus}`)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Error updating operation timer')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Issue Material Submit
  const handleIssueMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.materialName && !issueForm.inventoryId) {
      notify('error', 'Please select or name a material to issue.')
      return
    }
    try {
      setSubmitting(true)
      await issueMaterialToWorkOrder(wo.id, issueForm)
      notify('success', `Issued ${issueForm.qty} ${issueForm.unit} of ${issueForm.materialName} to Job #${wo.id}`)
      setShowIssueModal(false)
      setIssueForm({ inventoryId: '', materialName: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' })
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to issue material')
    } finally {
      setSubmitting(false)
    }
  }

  // Add Operation Submit
  const handleAddOpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOpForm.operationName.trim()) {
      notify('error', 'Operation name is required.')
      return
    }
    try {
      setSubmitting(true)
      await addWorkOrderOperation(wo.id, newOpForm)
      notify('success', `Added step: ${newOpForm.operationName}`)
      setShowAddOpModal(false)
      setNewOpForm({
        operationName: '',
        machineId: '',
        employeeId: '',
        plannedHours: 1,
        hourlyLaborRate: 750,
        hourlyMachineRate: 1200,
        notes: ''
      })
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to add operation')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Operation
  const handleDeleteOp = async (opId: string, name: string) => {
    if (!window.confirm(`Delete operation "${name}" from this Work Order?`)) return
    try {
      await deleteWorkOrderOperation(opId)
      notify('info', `Removed operation "${name}"`)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message)
    }
  }

  // Submit QC Inspection
  const handleQcSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showQcModal) return
    try {
      setSubmitting(true)
      const res = await logOperationQC(showQcModal.id, qcForm)
      if (qcForm.status === 'Pass') {
        notify('success', `QC Passed for ${showQcModal.operationName}`)
      } else {
        notify('error', `QC Flagged: ${qcForm.status}. Rework Ticket #${res.reworkId || 'generated'}`)
      }
      setShowQcModal(null)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to save QC report')
    } finally {
      setSubmitting(false)
    }
  }

  // Update Rework Ticket
  const handleReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showReworkModal) return
    try {
      setSubmitting(true)
      await updateReworkLog(showReworkModal.id, reworkForm)
      notify('success', `Rework Ticket #${showReworkModal.id} updated!`)
      setShowReworkModal(null)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to update rework')
    } finally {
      setSubmitting(false)
    }
  }

  // Complete Work Order & Sign-off
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await completeWorkOrder(wo.id, completeForm)
      notify('success', `Work Order #${wo.id} successfully completed and signed off!`)
      setShowCompleteModal(false)
      onRefresh()
    } catch (e: any) {
      notify('error', e.message || 'Failed to complete Work Order')
    } finally {
      setSubmitting(false)
    }
  }

  // Parse BOM rows safely
  let bomItems: any[] = []
  try {
    bomItems = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || [])
  } catch (e) {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-6 pb-2">
        {/* Toast alert */}
        {toastMsg && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-md border ${
            toastMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
            toastMsg.type === 'error' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
          }`}>
            <div className="flex items-center gap-2">
              {toastMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-current opacity-60 hover:opacity-100">
              <X size={14}/>
            </button>
          </div>
        )}

        {/* ── TOP HERO HEADER ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rex-950 to-indigo-950 p-6 text-white border border-rex-500/20 shadow-xl">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-rex-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black tracking-wider bg-rex-500/20 text-rex-300 px-3 py-1 rounded-full border border-rex-400/30">
                  {wo.orderNo || wo.id}
                </span>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  ID: {wo.id}
                </span>
                <Badge 
                  value={wo.priority || 'Normal'} 
                  variant={wo.priority === 'Urgent' ? 'error' : wo.priority === 'High' ? 'warning' : 'default'} 
                />
                {getStatusBadge(wo.status)}
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                {wo.title || 'Precision Machining Job'}
              </h2>

              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                {wo.customerName && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Building size={14} className="text-rex-400"/> {wo.customerName}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-mono">
                  <Package size={14} className="text-amber-400"/> Target: <strong className="text-white">{wo.jobQty || 1}</strong> pcs
                </span>
                {wo.deadline && (
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Calendar size={14} className="text-rose-400"/> Due: {new Date(wo.deadline).toLocaleDateString()}
                  </span>
                )}
                {wo.quoteId && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Quote: {wo.quoteId}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <select 
                value={wo.status || 'Pending'} 
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={submitting}
                className="input-base text-xs py-1.5 px-3 bg-slate-800/90 text-white border-slate-700 rounded-xl font-bold cursor-pointer hover:border-rex-500 transition-colors"
                title="Change Work Order Status"
              >
                <option value="Draft">Draft</option>
                <option value="Released">Released</option>
                <option value="In Progress">In Production</option>
                <option value="QC Pending">QC Inspection</option>
                <option value="Rework">Rework Required</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowIssueModal(true)}
                className="text-xs bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700"
              >
                <Plus size={13} className="mr-1 text-emerald-400"/> Issue Material
              </Button>

              {onNavigateToCutStudio && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onNavigateToCutStudio(wo.id)}
                  className="text-xs bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700"
                  title="Cut raw bars or use offcuts in Cut Studio"
                >
                  <Scissors size={13} className="mr-1 text-amber-400"/> Cut Studio
                </Button>
              )}

              {wo.status !== 'Completed' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setShowCompleteModal(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/30 border-none"
                >
                  <CheckCircle2 size={13} className="mr-1"/> Complete Job
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.print()} 
                className="text-xs text-slate-300 hover:text-white"
                title="Print Job Sheet / Traveler"
              >
                <Printer size={14}/>
              </Button>
            </div>
          </div>

          {/* Quick Progress & Cost Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Floor Progress</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rex-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${cost.progress || 0}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">{cost.progress || 0}%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {cost.completedSteps || 0} / {cost.totalSteps || operations.length} Steps Done
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Direct Material</span>
              <p className="text-sm font-mono font-bold text-white">
                {formatCurrency(cost.materialCost || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{issuedMaterials.length} items logged</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Labor + Machining</span>
              <p className="text-sm font-mono font-bold text-white">
                {formatCurrency((cost.laborCost || 0) + (cost.machineCost || 0))}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Lab: {formatCurrency(cost.laborCost || 0)} | Mac: {formatCurrency(cost.machineCost || 0)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">Total Actual Cost</span>
              <p className="text-base font-mono font-black text-emerald-400">
                {formatCurrency(cost.actualTotalCost || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Target: {formatCurrency(cost.estimatedCost || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* ── NAVIGATION TABS ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-theme-subtle pb-2 overflow-x-auto">
          {[
            { id: 'routing', label: '1. Routing & Shop Floor', icon: Layers, count: operations.length },
            { id: 'materials', label: '2. Material Issue & BOM', icon: Package, count: issuedMaterials.length },
            { id: 'qc_rework', label: '3. QC & Rework Loop', icon: ShieldCheck, count: reworkLogs.filter(r => r.status !== 'Resolved').length },
            { id: 'costing', label: '4. Final Costing Rollup', icon: DollarSign },
            { id: 'specs', label: '5. Specs & Drawings', icon: ClipboardList }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-rex-600 text-white shadow-md shadow-rex-600/20' 
                    : 'text-secondary hover:text-primary hover:bg-surface2/60'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-rex-600 dark:text-rex-400'}/>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface2 text-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── TAB 1: OPERATIONS ROUTING & LIVE EXECUTION TIMERS ─────────────────────── */}
        {activeTab === 'routing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Layers size={16} className="text-rex-600"/>
                  Manufacturing Routing & Step-by-Step Operations
                </h3>
                <p className="text-xs text-muted">
                  Sequential workshop processes with real-time timers, machine scheduling, and operator logging
                </p>
              </div>

              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setShowAddOpModal(true)}
                className="text-xs bg-rex-600 hover:bg-rex-700"
              >
                <Plus size={13} className="mr-1"/> Add Operation Step
              </Button>
            </div>

            {operations.length === 0 ? (
              <GlassCard className="p-12 text-center border-dashed border-theme-subtle">
                <Layers size={36} className="mx-auto text-muted mb-3 opacity-30" />
                <p className="text-sm font-bold text-secondary">No operations defined yet</p>
                <p className="text-xs text-muted mt-1">Add operations like Turning, Milling, Boring, Welding, or QC to this job routing.</p>
                <Button variant="primary" size="sm" onClick={() => setShowAddOpModal(true)} className="mt-4">
                  <Plus size={13} className="mr-1"/> Add First Operation
                </Button>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {operations.map((op, idx) => {
                  const isRunning = op.status === 'In Progress'
                  const isDone = op.status === 'Completed'
                  const isQcPending = op.status === 'QC Pending'
                  const isRework = op.status === 'Rework Required'
                  const isPaused = op.status === 'Paused'

                  const plannedHrs = Number(op.plannedHours || 1)
                  const actualHrs = Number(op.actualHours || 0)
                  const timePct = plannedHrs > 0 ? Math.min(100, Math.round((actualHrs / plannedHrs) * 100)) : 0

                  return (
                    <GlassCard 
                      key={op.id || idx} 
                      className={`p-4 border transition-all ${
                        isRunning ? 'border-blue-500/50 bg-blue-500/5 shadow-md shadow-blue-500/5' :
                        isDone ? 'border-green-500/30 bg-green-500/5' :
                        isRework ? 'border-rose-500/40 bg-rose-500/5' :
                        isQcPending ? 'border-amber-500/40 bg-amber-500/5' :
                        'border-theme-subtle'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Step Sequence & Operation Details */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isDone ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' :
                            isRunning ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse' :
                            isRework ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                            'bg-surface2 text-muted border border-theme-subtle'
                          }`}>
                            {op.stepNumber || idx + 1}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-primary truncate">
                                {op.operationName}
                              </h4>
                              <span className="text-[10px] text-muted font-mono">{op.id}</span>
                              {isDone && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                  <Check size={10}/> Done
                                </span>
                              )}
                              {isRunning && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">
                                  <Play size={10} className="fill-blue-500"/> Machining Now
                                </span>
                              )}
                              {isPaused && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <Pause size={10}/> Paused
                                </span>
                              )}
                              {isQcPending && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <ShieldCheck size={10}/> QC Inspection Ready
                                </span>
                              )}
                              {isRework && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                  <RotateCcw size={10}/> Rework Required
                                </span>
                              )}
                            </div>

                            {/* Assigned Machine & Operator */}
                            <div className="flex items-center gap-4 text-xs text-secondary flex-wrap pt-0.5">
                              <span className="inline-flex items-center gap-1.5">
                                <Cpu size={13} className="text-rex-600"/>
                                <span>{op.machineName || 'Any Available Machine'}</span>
                                {op.machineHourlyCost > 0 && (
                                  <span className="text-[10px] text-muted font-mono">({formatCurrency(op.machineHourlyCost)}/hr)</span>
                                )}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <User size={13} className="text-emerald-600"/>
                                <span>{op.employeeName || 'Unassigned Operator'}</span>
                                {op.employeeHourlyRate > 0 && (
                                  <span className="text-[10px] text-muted font-mono">({formatCurrency(op.employeeHourlyRate)}/hr)</span>
                                )}
                              </span>
                            </div>

                            {op.notes && (
                              <p className="text-[11px] text-muted bg-surface2/40 px-2 py-1 rounded border border-theme-subtle inline-block mt-1">
                                {op.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Planned vs Actual Hours Progress */}
                        <div className="w-full lg:w-48 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted">Actual / Plan</span>
                            <span className="font-mono font-bold text-primary">
                              {actualHrs.toFixed(1)}h / {plannedHrs.toFixed(1)}h
                            </span>
                          </div>
                          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                actualHrs > plannedHrs ? 'bg-rose-500' : 'bg-rex-600'
                              }`}
                              style={{ width: `${timePct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted font-mono">
                            <span>Cost: {formatCurrency((op.actualLaborCost || 0) + (op.actualMachineCost || 0))}</span>
                            <span>{timePct}%</span>
                          </div>
                        </div>

                        {/* Live Timer Controls & Actions */}
                        <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0">
                          {!isDone && (
                            <>
                              {!isRunning ? (
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  onClick={() => handleOpTimerAction(op.id, 'In Progress')}
                                  disabled={submitting}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  title="Start live shopfloor timer"
                                >
                                  <Play size={12} className="mr-1 fill-white"/> Start
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpTimerAction(op.id, 'Paused')}
                                  disabled={submitting}
                                  className="text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                  title="Pause timer"
                                >
                                  <Pause size={12} className="mr-1"/> Pause
                                </Button>
                              )}

                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleOpTimerAction(op.id, 'Completed')}
                                disabled={submitting}
                                className="text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                                title="Mark operation completed"
                              >
                                <Check size={12} className="mr-1"/> Complete
                              </Button>
                            </>
                          )}

                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setShowQcModal(op)
                              setQcForm({
                                inspectedBy: 'QA Inspector',
                                status: 'Pass',
                                defectReason: 'Tolerance/Dimensions',
                                notes: '',
                                sampleQty: 1,
                                defectQty: 0,
                                severity: 'Normal'
                              })
                            }}
                            className="text-xs text-rex-600 border-rex-500/30 hover:bg-rex-500/10"
                            title="Inspect quality and record pass/rework/scrap"
                          >
                            <ShieldCheck size={12} className="mr-1"/> QC
                          </Button>

                          <button 
                            type="button" 
                            onClick={() => handleDeleteOp(op.id, op.operationName)}
                            className="p-1.5 text-muted hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Delete operation"
                          >
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MATERIAL ISSUE & BOM TRACEABILITY ─────────────────────────────── */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Package size={16} className="text-rex-600"/>
                  Material Allocation, Cutting & Traceability Ledger
                </h3>
                <p className="text-xs text-muted">
                  BOM requirements, direct inventory stock issue, and full material traceability linked to Job #{wo.id}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToCutStudio && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onNavigateToCutStudio(wo.id)}
                    className="text-xs font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Scissors size={13} className="mr-1"/> Open Cut Studio
                  </Button>
                )}

                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setShowIssueModal(true)}
                  className="text-xs bg-rex-600 hover:bg-rex-700"
                >
                  <Plus size={13} className="mr-1"/> Issue Material
                </Button>
              </div>
            </div>

            {/* Sub-Section A: Planned BOM Requirements */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                <ClipboardList size={14} className="text-rex-600"/> Planned Bill of Materials (BOM)
              </h4>

              {bomItems.length === 0 ? (
                <div className="p-6 text-center bg-surface2/30 rounded-xl border border-dashed border-theme-subtle text-xs text-muted">
                  No BOM items attached to this work order. You can still issue raw materials directly below.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Material / Component</th>
                        <th className="py-2.5 px-3 text-right">Required Qty</th>
                        <th className="py-2.5 px-3 text-right">Est. Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total Est. Cost</th>
                        <th className="py-2.5 px-3 text-center">Stock Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {bomItems.map((bom, i) => {
                        const invMatch = inventory.find(inv => 
                          (inv.name || '').toLowerCase() === (bom.material || '').toLowerCase() ||
                          (inv.sku || '').toLowerCase() === (bom.material || '').toLowerCase()
                        )
                        const inStock = invMatch ? Number(invMatch.quantity || 0) : 0
                        const reqQty = Number(bom.qty || 1)
                        const hasStock = inStock >= reqQty

                        return (
                          <tr key={i} className="hover:bg-surface2/30">
                            <td className="py-2.5 px-3 text-muted font-mono">{i + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-primary">
                              {bom.material}
                              {bom.notes && <span className="block text-[10px] text-muted">{bom.notes}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {reqQty} {bom.unit || 'pcs'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted">
                              {formatCurrency(bom.unitCost || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                              {formatCurrency(reqQty * Number(bom.unitCost || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {invMatch ? (
                                hasStock ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                    <Check size={9}/> In Stock ({inStock})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                    <AlertTriangle size={9}/> Shortage (Stock: {inStock})
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-muted italic">Non-catalog item</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIssueForm({
                                    inventoryId: invMatch ? invMatch.id : '',
                                    materialName: bom.material,
                                    qty: reqQty,
                                    unit: bom.unit || 'pcs',
                                    unitCost: Number(bom.unitCost || invMatch?.unitCost || 0),
                                    notes: `Issued against BOM requirement for ${bom.material}`
                                  })
                                  setShowIssueModal(true)
                                }}
                                className="text-[11px] py-1 px-2.5 h-auto text-rex-600 border-rex-500/30 hover:bg-rex-500/10"
                              >
                                Issue This
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sub-Section B: Issued Traceability Ledger */}
            <div className="space-y-3 pt-3 border-t border-theme-subtle">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500"/>
                  Actual Materials Consumed & Issued to Job #{wo.id}
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Total Issued: {formatCurrency(cost.materialCost || 0)}
                </span>
              </div>

              {issuedMaterials.length === 0 ? (
                <div className="p-8 text-center bg-surface2/20 rounded-xl border border-dashed border-theme-subtle text-xs text-muted">
                  <Package size={28} className="mx-auto text-muted mb-2 opacity-30"/>
                  No materials issued to this Work Order yet. Use the "Issue Material" or "Cut Studio" buttons to allocate stock.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                        <th className="py-2.5 px-3">Date / Time</th>
                        <th className="py-2.5 px-3">Material Description</th>
                        <th className="py-2.5 px-3 text-right">Qty Issued</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total Incurred</th>
                        <th className="py-2.5 px-3">Issued By</th>
                        <th className="py-2.5 px-3">Audit / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {issuedMaterials.map((mat, i) => {
                        const matCost = Number(mat.totalCost || (Number(mat.qty || 0) * Number(mat.unitCost || 0)))
                        return (
                          <tr key={mat.id || i} className="hover:bg-surface2/30">
                            <td className="py-2.5 px-3 text-muted font-mono whitespace-nowrap">
                              {mat.date ? new Date(mat.date).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-primary">
                              {mat.itemName || mat.notes?.split(':')[1]?.split('(')[0]?.trim() || 'Raw Material Stock'}
                              {mat.itemSku && <span className="block text-[10px] text-muted font-mono">{mat.itemSku}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                              {Number(mat.qty).toFixed(1)} {mat.itemUom || 'pcs'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted">
                              {formatCurrency(mat.unitCost || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(matCost)}
                            </td>
                            <td className="py-2.5 px-3 text-secondary text-[11px]">
                              {mat.user || 'Storekeeper'}
                            </td>
                            <td className="py-2.5 px-3 text-muted text-[11px] max-w-xs truncate" title={mat.notes}>
                              {mat.notes || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface2/60 border-t border-theme-subtle font-bold">
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px] text-muted">Total Direct Material Consumed:</td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(cost.materialCost || 0)}
                        </td>
                        <td colSpan={2}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: QUALITY CONTROL & REWORK MANAGEMENT ───────────────────────────── */}
        {activeTab === 'qc_rework' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <ShieldCheck size={16} className="text-rex-600"/>
                  Quality Inspection & Rework Order Loop
                </h3>
                <p className="text-xs text-muted">
                  Multi-gate inspection reports, defect categorisation, formal Rework Orders, and Cost of Poor Quality (COPQ)
                </p>
              </div>

              {operations.length > 0 && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => {
                    setShowQcModal(operations[0])
                    setQcForm({
                      inspectedBy: 'QA Inspector',
                      status: 'Pass',
                      defectReason: 'Tolerance/Dimensions',
                      notes: '',
                      sampleQty: 1,
                      defectQty: 0,
                      severity: 'Normal'
                    })
                  }}
                  className="text-xs bg-rex-600 hover:bg-rex-700"
                >
                  <ShieldCheck size={13} className="mr-1"/> Record QC Inspection
                </Button>
              )}
            </div>

            {/* Active Rework Tickets Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
                <RotateCcw size={14}/> Active Rework Tickets ({reworkLogs.filter(r => r.status !== 'Resolved').length})
              </h4>

              {reworkLogs.length === 0 ? (
                <div className="p-6 text-center bg-surface2/20 rounded-xl border border-dashed border-theme-subtle text-xs text-muted">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-60"/>
                  Zero defects recorded! No pending rework tickets for this Work Order.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reworkLogs.map((rwk, idx) => {
                    const isResolved = rwk.status === 'Resolved'
                    const rwkCost = Number(rwk.cost || 0) + (Number(rwk.hours || 0) * 800)

                    return (
                      <GlassCard 
                        key={rwk.id || idx}
                        className={`p-4 border transition-all ${
                          isResolved ? 'border-green-500/20 bg-green-500/5' : 'border-rose-500/40 bg-rose-500/5 shadow-md shadow-rose-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-rose-500">{rwk.id}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isResolved ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                                'bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse'
                              }`}>
                                {rwk.status}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-primary mt-1">
                              {rwk.defectCategory || 'Defect Out of Specification'}
                            </h5>
                          </div>

                          <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(rwkCost)}
                          </span>
                        </div>

                        <p className="text-[11px] text-secondary/90 bg-surface2/50 p-2 rounded-lg border border-theme-subtle mb-3">
                          {rwk.reason || 'Operation failed inspection standards.'}
                        </p>

                        {rwk.actionTaken && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mb-3 font-medium">
                            <strong>Action:</strong> {rwk.actionTaken}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-theme-subtle">
                          <span>
                            Tech: {rwk.assignedEmployeeName || 'Workshop Tech'} ({rwk.hours || 0} hrs)
                          </span>

                          {!isResolved && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setShowReworkModal(rwk)
                                setReworkForm({
                                  id: rwk.id,
                                  status: 'Resolved',
                                  actionTaken: rwk.actionTaken || '',
                                  assignedEmployeeId: rwk.assignedEmployeeId || '',
                                  machineId: rwk.machineId || '',
                                  hours: Number(rwk.hours || 1),
                                  cost: Number(rwk.cost || 0),
                                  notes: rwk.notes || '',
                                  resolvedBy: 'QA Supervisor'
                                })
                              }}
                              className="text-[10px] py-1 px-2 h-auto text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              <Check size={11} className="mr-1"/> Resolve Ticket
                            </Button>
                          )}
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              )}
            </div>

            {/* QC Inspection Log */}
            <div className="space-y-3 pt-3 border-t border-theme-subtle">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-rex-600"/> Inspection History Log ({qcInspections.length})
              </h4>

              {qcInspections.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">No inspection records logged yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                        <th className="py-2 px-3">QC #</th>
                        <th className="py-2 px-3">Inspector</th>
                        <th className="py-2 px-3">Result</th>
                        <th className="py-2 px-3">Defect Reason</th>
                        <th className="py-2 px-3 text-right">Sample / Defect Qty</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {qcInspections.map((qc, i) => (
                        <tr key={qc.id || i} className="hover:bg-surface2/30">
                          <td className="py-2 px-3 font-mono font-bold text-rex-600">{qc.id}</td>
                          <td className="py-2 px-3 text-primary">{qc.inspectedBy || 'QA Admin'}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              qc.status === 'Pass' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                              qc.status === 'Scrap' ? 'bg-slate-700 text-white' :
                              'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}>
                              {qc.status === 'Pass' ? <Check size={10}/> : <AlertTriangle size={10}/>} {qc.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-secondary">{qc.defectReason || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {qc.sampleQty || 1} / <span className="text-rose-500 font-bold">{qc.defectQty || 0}</span>
                          </td>
                          <td className="py-2 px-3 text-muted text-[11px] max-w-xs truncate">{qc.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: JOB COSTING & FINANCIAL RECONCILIATION ─────────────────────────── */}
        {activeTab === 'costing' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500"/>
                Real-Time Manufacturing Job Cost Rollup & Reconciliation
              </h3>
              <p className="text-xs text-muted">
                Complete financial rollup matching actual shop floor material issues, operator labor hours, machine overhead, and rework
              </p>
            </div>

            {/* 5 Financial Rollup KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <GlassCard className="p-4 border-theme-subtle">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">1. Direct Materials</span>
                <p className="text-lg font-mono font-black text-primary">
                  {formatCurrency(cost.materialCost || 0)}
                </p>
                <p className="text-[10px] text-muted mt-1">{issuedMaterials.length} items issued from stock</p>
              </GlassCard>

              <GlassCard className="p-4 border-theme-subtle">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">2. Direct Labor</span>
                <p className="text-lg font-mono font-black text-blue-600 dark:text-blue-400">
                  {formatCurrency(cost.laborCost || 0)}
                </p>
                <p className="text-[10px] text-muted mt-1">Operator wage hours logged</p>
              </GlassCard>

              <GlassCard className="p-4 border-theme-subtle">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">3. Machine Operating</span>
                <p className="text-lg font-mono font-black text-purple-600 dark:text-purple-400">
                  {formatCurrency(cost.machineCost || 0)}
                </p>
                <p className="text-[10px] text-muted mt-1">Machine hourly run rate</p>
              </GlassCard>

              <GlassCard className="p-4 border-theme-subtle">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">4. Rework & COPQ</span>
                <p className="text-lg font-mono font-black text-rose-500">
                  {formatCurrency(cost.reworkCost || 0)}
                </p>
                <p className="text-[10px] text-muted mt-1">Cost of Poor Quality</p>
              </GlassCard>

              <GlassCard className="p-4 border-theme-subtle">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">5. Factory Overhead ({cost.overheadPct || 15}%)</span>
                <p className="text-lg font-mono font-black text-amber-500">
                  {formatCurrency(cost.overheadCost || 0)}
                </p>
                <p className="text-[10px] text-muted mt-1">Absorption overhead</p>
              </GlassCard>
            </div>

            {/* Reconciliation Comparison Table */}
            <GlassCard className="p-6 border-theme-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                  <BarChart3 size={16} className="text-rex-600"/> Budget vs Actual Reconciliation
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Variance:</span>
                  <span className={`text-sm font-mono font-bold ${
                    (cost.variance || 0) <= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {(cost.variance || 0) <= 0 ? '-' : '+'}{formatCurrency(Math.abs(cost.variance || 0))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-2 p-4 bg-surface2/40 rounded-xl border border-theme-subtle">
                  <span className="text-[10px] text-muted uppercase font-bold block">Quoted / Budget Target</span>
                  <p className="text-xl font-mono font-bold text-primary">
                    {formatCurrency(cost.estimatedCost || 0)}
                  </p>
                  <p className="text-[11px] text-secondary">
                    Based on initial BOM cost estimation and planned machine routing cycle hours.
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-surface2/40 rounded-xl border border-theme-subtle">
                  <span className="text-[10px] text-muted uppercase font-bold block">Final Incurred Actual Cost</span>
                  <p className="text-xl font-mono font-black text-emerald-500">
                    {formatCurrency(cost.actualTotalCost || 0)}
                  </p>
                  <p className="text-[11px] text-secondary">
                    Total real expenses: Material ({formatCurrency(cost.materialCost)}) + Labor ({formatCurrency(cost.laborCost)}) + Machine ({formatCurrency(cost.machineCost)}) + Rework ({formatCurrency(cost.reworkCost)}).
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-surface2/40 rounded-xl border border-theme-subtle">
                  <span className="text-[10px] text-muted uppercase font-bold block">Unit Cost Per Piece</span>
                  <p className="text-xl font-mono font-bold text-rex-600 dark:text-rex-400">
                    {formatCurrency((cost.actualTotalCost || 0) / Math.max(1, Number(wo.completedQty || wo.jobQty || 1)))}
                  </p>
                  <p className="text-[11px] text-secondary">
                    Based on {wo.completedQty || wo.jobQty || 1} finished parts accepted through QC.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* ── TAB 5: SPECS, DRAWINGS & ATTACHMENTS ──────────────────────────────────── */}
        {activeTab === 'specs' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ClipboardList size={16} className="text-rex-600"/>
                Job Specifications & Technical Documentation
              </h3>
              <p className="text-xs text-muted">
                Drawing blueprints, CAD links, machining tolerances, and customer notes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-5 border-theme-subtle space-y-3">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Technical Specifications & Notes
                </h4>
                <div className="p-3 bg-surface2/40 rounded-xl text-xs text-secondary leading-relaxed border border-theme-subtle min-h-24">
                  {wo.notes || 'No special engineering notes recorded for this work order.'}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div>
                    <span className="text-[10px] text-muted block font-bold">Planned Start</span>
                    <span className="font-mono text-primary">
                      {wo.plannedStartDate ? new Date(wo.plannedStartDate).toLocaleDateString() : 'Not Set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block font-bold">Actual Start Date</span>
                    <span className="font-mono text-primary">
                      {wo.actualStartDate ? new Date(wo.actualStartDate).toLocaleDateString() : 'Pending Release'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block font-bold">Customer Reference</span>
                    <span className="text-primary font-medium">{wo.customerName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block font-bold">Source Quotation</span>
                    <span className="font-mono text-primary">{wo.quoteId || 'Direct Job'}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5 border-theme-subtle space-y-3">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Blueprints & CAD Attachments
                </h4>
                {wo.attachments ? (
                  <div className="p-3 bg-surface2/40 rounded-xl text-xs text-secondary border border-theme-subtle font-mono">
                    {String(wo.attachments)}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-surface2/20 rounded-xl border border-dashed border-theme-subtle text-xs text-muted">
                    <FileText size={28} className="mx-auto text-muted mb-2 opacity-30"/>
                    No CAD drawings attached yet.
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </div>

      {/* ── SUB-MODAL 1: DIRECT MATERIAL ISSUE ───────────────────────────────────── */}
      <Modal 
        isOpen={showIssueModal} 
        onClose={() => setShowIssueModal(false)} 
        title="Direct Material Issue to Work Order" 
        size="md"
      >
        <form onSubmit={handleIssueMaterialSubmit} className="space-y-4 p-1 text-xs">
          <div className="p-3 bg-rex-500/10 border border-rex-500/20 rounded-xl text-rex-600 dark:text-rex-400">
            Issuing stock to Job <strong className="font-mono">#{wo.id}</strong> ({wo.title})
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Select Warehouse Inventory Stock (Optional)
            </label>
            <select
              value={issueForm.inventoryId}
              onChange={(e) => {
                const picked = inventory.find(i => i.id === e.target.value)
                setIssueForm({
                  ...issueForm,
                  inventoryId: e.target.value,
                  materialName: picked ? picked.name : issueForm.materialName,
                  unit: picked?.uom || issueForm.unit,
                  unitCost: Number(picked?.unitCost || issueForm.unitCost)
                })
              }}
              className="w-full input-base text-xs py-2"
            >
              <option value="">-- Or enter custom material below --</option>
              {inventory.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.name} (Stock: {inv.quantity} {inv.uom}) - {formatCurrency(inv.unitCost || 0)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Material Description *
            </label>
            <input 
              type="text" 
              required
              value={issueForm.materialName} 
              onChange={e => setIssueForm({ ...issueForm, materialName: e.target.value })} 
              className="w-full input-base text-xs py-2"
              placeholder="e.g. 50mm EN8 Round Bar, M12 Bolts..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Qty *</label>
              <input 
                type="number" 
                step="0.01" 
                required
                value={issueForm.qty} 
                onChange={e => setIssueForm({ ...issueForm, qty: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Unit</label>
              <input 
                type="text" 
                value={issueForm.unit} 
                onChange={e => setIssueForm({ ...issueForm, unit: e.target.value })} 
                className="w-full input-base text-xs py-2"
                placeholder="pcs, ft, kg..."
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Unit Cost (LKR)</label>
              <input 
                type="number" 
                step="0.01" 
                value={issueForm.unitCost} 
                onChange={e => setIssueForm({ ...issueForm, unitCost: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Notes / Remnant Reference</label>
            <input 
              type="text" 
              value={issueForm.notes} 
              onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} 
              className="w-full input-base text-xs py-2"
              placeholder="e.g. Cut from rack, heat batch #..."
            />
          </div>

          <div className="p-3 bg-surface2/60 rounded-xl flex items-center justify-between font-mono">
            <span className="text-muted">Total Cost to Job:</span>
            <span className="text-sm font-bold text-emerald-500">
              {formatCurrency(Number(issueForm.qty || 1) * Number(issueForm.unitCost || 0))}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowIssueModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Issuing...' : 'Confirm Material Issue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL 2: ADD OPERATION STEP ──────────────────────────────────────── */}
      <Modal 
        isOpen={showAddOpModal} 
        onClose={() => setShowAddOpModal(false)} 
        title="Add Operation Step to Routing" 
        size="md"
      >
        <form onSubmit={handleAddOpSubmit} className="space-y-4 p-1 text-xs">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Operation Name *
            </label>
            <input 
              type="text" 
              required
              value={newOpForm.operationName} 
              onChange={e => setNewOpForm({ ...newOpForm, operationName: e.target.value })} 
              className="w-full input-base text-xs py-2"
              placeholder="e.g. Rough Turning, CNC Milling, Heat Treatment, Welding..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Machine
              </label>
              <select 
                value={newOpForm.machineId} 
                onChange={e => {
                  const mac = machineries.find(m => m.id === e.target.value)
                  setNewOpForm({
                    ...newOpForm,
                    machineId: e.target.value,
                    hourlyMachineRate: mac ? Number(mac.hourlyCost || 1200) : 1200
                  })
                }} 
                className="w-full input-base text-xs py-2"
              >
                <option value="">-- Any Available Machine --</option>
                {machineries.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type || 'Machine'}) - {formatCurrency(m.hourlyCost || 1200)}/hr
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Assigned Operator
              </label>
              <select 
                value={newOpForm.employeeId} 
                onChange={e => {
                  const emp = employees.find(emp => emp.id === e.target.value)
                  setNewOpForm({
                    ...newOpForm,
                    employeeId: e.target.value,
                    hourlyLaborRate: emp ? Number(emp.hourlyRate || 750) : 750
                  })
                }} 
                className="w-full input-base text-xs py-2"
              >
                <option value="">-- Any Operator --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role || 'Operator'}) - {formatCurrency(emp.hourlyRate || 750)}/hr
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Planned Hours *
              </label>
              <input 
                type="number" 
                step="0.25" 
                required
                value={newOpForm.plannedHours} 
                onChange={e => setNewOpForm({ ...newOpForm, plannedHours: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Labor Rate (LKR/hr)
              </label>
              <input 
                type="number" 
                value={newOpForm.hourlyLaborRate} 
                onChange={e => setNewOpForm({ ...newOpForm, hourlyLaborRate: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Machine Rate (LKR/hr)
              </label>
              <input 
                type="number" 
                value={newOpForm.hourlyMachineRate} 
                onChange={e => setNewOpForm({ ...newOpForm, hourlyMachineRate: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Instructions & Tolerances
            </label>
            <textarea 
              value={newOpForm.notes} 
              onChange={e => setNewOpForm({ ...newOpForm, notes: e.target.value })} 
              className="w-full input-base text-xs p-2 h-16 resize-none"
              placeholder="e.g. ±0.02mm runout, Ra 0.8 surface finish..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowAddOpModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Operation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL 3: QC INSPECTION ───────────────────────────────────────────── */}
      <Modal 
        isOpen={!!showQcModal} 
        onClose={() => setShowQcModal(null)} 
        title="Quality Control Inspection Report" 
        size="md"
      >
        {showQcModal && (
          <form onSubmit={handleQcSubmit} className="space-y-4 p-1 text-xs">
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Inspecting Operation</span>
                <span className="font-bold text-primary text-sm">{showQcModal.operationName}</span>
              </div>
              <span className="font-mono text-xs text-muted">Step #{showQcModal.stepNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Inspector Name *
                </label>
                <input 
                  type="text" 
                  required
                  value={qcForm.inspectedBy} 
                  onChange={e => setQcForm({ ...qcForm, inspectedBy: e.target.value })} 
                  className="w-full input-base text-xs py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Inspection Result *
                </label>
                <select 
                  value={qcForm.status} 
                  onChange={e => setQcForm({ ...qcForm, status: e.target.value })} 
                  className="w-full input-base text-xs py-2 font-bold"
                >
                  <option value="Pass">Pass (Approved)</option>
                  <option value="Fail">Fail (Rework Required)</option>
                  <option value="Conditional">Conditional Pass (Minor Deviation)</option>
                  <option value="Scrap">Scrap (Non-Recoverable)</option>
                </select>
              </div>
            </div>

            {qcForm.status !== 'Pass' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle size={14}/> Defect Categorisation
                </span>

                <div>
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                    Defect Category *
                  </label>
                  <select 
                    value={qcForm.defectReason} 
                    onChange={e => setQcForm({ ...qcForm, defectReason: e.target.value })} 
                    className="w-full input-base text-xs py-2"
                  >
                    <option value="Tolerance/Dimensions">Tolerance / Dimensional Out of Spec</option>
                    <option value="Surface Finish">Surface Roughness / Flaw</option>
                    <option value="Material Flaw">Material Flaw / Porosity</option>
                    <option value="Tool Chatter">Tool Chatter / Vibration Runout</option>
                    <option value="Thread/Pitch">Thread / Pitch Defect</option>
                    <option value="Heat Treatment">Hardness / Heat Treatment Mismatch</option>
                    <option value="Other">Other Defect</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Sample Qty</label>
                    <input 
                      type="number" 
                      value={qcForm.sampleQty} 
                      onChange={e => setQcForm({ ...qcForm, sampleQty: Number(e.target.value) })} 
                      className="w-full input-base text-xs py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Defect Qty</label>
                    <input 
                      type="number" 
                      value={qcForm.defectQty} 
                      onChange={e => setQcForm({ ...qcForm, defectQty: Number(e.target.value) })} 
                      className="w-full input-base text-xs py-2 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Inspector Findings & Measurements
              </label>
              <textarea 
                value={qcForm.notes} 
                onChange={e => setQcForm({ ...qcForm, notes: e.target.value })} 
                className="w-full input-base text-xs p-2.5 h-20 resize-none"
                placeholder="Log actual caliper/micrometer readings, roughness values, or root cause remarks..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setShowQcModal(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit QC Report'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── SUB-MODAL 4: RESOLVE REWORK TICKET ───────────────────────────────────── */}
      <Modal 
        isOpen={!!showReworkModal} 
        onClose={() => setShowReworkModal(null)} 
        title="Update / Resolve Rework Order" 
        size="md"
      >
        {showReworkModal && (
          <form onSubmit={handleReworkSubmit} className="space-y-4 p-1 text-xs">
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Ticket Reference</span>
                <span className="font-bold text-rose-500 font-mono text-sm">{showReworkModal.id}</span>
              </div>
              <Badge value={showReworkModal.status} variant="warning" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Status *</label>
                <select 
                  value={reworkForm.status} 
                  onChange={e => setReworkForm({ ...reworkForm, status: e.target.value })} 
                  className="w-full input-base text-xs py-2 font-bold"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved (Ready for Re-Inspection)</option>
                  <option value="Pending">Pending Assignment</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Sign-off Supervisor</label>
                <input 
                  type="text" 
                  value={reworkForm.resolvedBy} 
                  onChange={e => setReworkForm({ ...reworkForm, resolvedBy: e.target.value })} 
                  className="w-full input-base text-xs py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Corrective Action Taken *
              </label>
              <textarea 
                required
                value={reworkForm.actionTaken} 
                onChange={e => setReworkForm({ ...reworkForm, actionTaken: e.target.value })} 
                className="w-full input-base text-xs p-2.5 h-20 resize-none"
                placeholder="Describe corrective machining, re-grinding, weld filling, or adjustments made..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Rework Hours Logged</label>
                <input 
                  type="number" 
                  step="0.25" 
                  value={reworkForm.hours} 
                  onChange={e => setReworkForm({ ...reworkForm, hours: Number(e.target.value) })} 
                  className="w-full input-base text-xs py-2 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Extra Material / Tooling Cost (LKR)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={reworkForm.cost} 
                  onChange={e => setReworkForm({ ...reworkForm, cost: Number(e.target.value) })} 
                  className="w-full input-base text-xs py-2 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setShowReworkModal(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Rework Log'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── SUB-MODAL 5: COMPLETE & HANDOVER JOB ──────────────────────────────────── */}
      <Modal 
        isOpen={showCompleteModal} 
        onClose={() => setShowCompleteModal(false)} 
        title="Complete Work Order & Final Cost Rollup" 
        size="md"
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4 p-1 text-xs">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16}/> Final Manufacturing Sign-Off
            </h4>
            <p className="text-[11px] text-secondary">
              This will mark all operations as completed, calculate the final job costing rollup, and record good quantity produced.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Completed Good Quantity *
              </label>
              <input 
                type="number" 
                required
                value={completeForm.completedQty} 
                onChange={e => setCompleteForm({ ...completeForm, completedQty: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Scrapped Quantity
              </label>
              <input 
                type="number" 
                value={completeForm.scrapQty} 
                onChange={e => setCompleteForm({ ...completeForm, scrapQty: Number(e.target.value) })} 
                className="w-full input-base text-xs py-2 font-mono text-rose-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Handover Location / Next Stage
            </label>
            <input 
              type="text" 
              value={completeForm.finalHandoverLocation} 
              onChange={e => setCompleteForm({ ...completeForm, finalHandoverLocation: e.target.value })} 
              className="w-full input-base text-xs py-2"
              placeholder="e.g. Finished Goods Warehouse Bay A, Packing, Customer Dispatch..."
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
              Final Sign-off Remarks
            </label>
            <textarea 
              value={completeForm.notes} 
              onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} 
              className="w-full input-base text-xs p-2.5 h-20 resize-none"
              placeholder="Inspection certificate #, packaging notes, dispatch readiness..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {submitting ? 'Completing...' : 'Sign Off & Complete Work Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </Modal>
  )
}
