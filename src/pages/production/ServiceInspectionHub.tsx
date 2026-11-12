import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Wrench, Plus, Search, Filter, Layers, Clock, CheckCircle2,
  AlertTriangle, DollarSign, Package, ExternalLink, Printer,
  Eye, Truck, ArrowRight, ShieldCheck, FileText, ChevronRight,
  RotateCcw, Sparkles, Building2, User, Phone, Check, X,
  FileCheck, AlertCircle, Calendar, Hash, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import {
  fetchServiceJobs,
  fetchServiceJobById,
  createServiceJob,
  updateServiceJobDiagnosis,
  createServiceJobQuotation,
  recordServiceJobDecision,
  releaseServiceJobGatePass,
  ServiceInspectionJob,
  fetchCustomers
} from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'

export const ServiceInspectionHub: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSettings()
  const [searchParams] = useSearchParams()

  // Data states
  const [jobs, setJobs] = useState<ServiceInspectionJob[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Tabs
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  // Modals state
  const [showIntakeModal, setShowIntakeModal] = useState(false)
  const [activeJob, setActiveJob] = useState<ServiceInspectionJob | null>(null)
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Submitting loaders
  const [submitting, setSubmitting] = useState(false)

  // Form States for Intake
  const [intakeForm, setIntakeForm] = useState({
    customerId: '',
    customerName: '',
    customerCompany: '',
    contactPhone: '',
    contactPerson: '',
    itemName: '',
    itemCategory: 'Machinery / Equipment',
    modelNo: '',
    serialNo: '',
    customerProblem: '',
    initialCondition: '',
    receivedBy: user?.name || 'Service Desk',
    priority: 'Medium',
    carrier: 'Customer Drop-off',
    vehicleNo: '',
    driverName: '',
    notes: ''
  })

  // Form States for Diagnosis
  const [diagForm, setDiagForm] = useState<{
    findings: string;
    requiredParts: any[];
    requiredOperations: any[];
    estimatedRepairCost: number;
    inspectionFee: number;
    assignedTechnician: string;
    notes: string;
  }>({
    findings: '',
    requiredParts: [],
    requiredOperations: [],
    estimatedRepairCost: 0,
    inspectionFee: 5000,
    assignedTechnician: user?.name || 'Workshop Engineer',
    notes: ''
  })

  // Form States for Customer Decision
  const [decisionForm, setDecisionForm] = useState<{
    decision: 'Approved' | 'Declined';
    feeAction: 'charge' | 'waive';
    notes: string;
  }>({
    decision: 'Approved',
    feeAction: 'charge',
    notes: ''
  })

  // Form States for Outward Release
  const [releaseForm, setReleaseForm] = useState({
    releasedBy: user?.name || 'Security Gate / Dispatch',
    releaseReason: '',
    carrier: 'Customer Self-Pickup',
    vehicleNo: '',
    driverName: '',
    notes: ''
  })

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true)
      const [jobsData, custData] = await Promise.all([
        fetchServiceJobs({ status: statusFilter !== 'all' ? statusFilter : undefined, search }),
        fetchCustomers().catch(() => [])
      ])
      setJobs(jobsData || [])
      setCustomers(custData || [])
    } catch (err) {
      console.error('Failed to load service jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = jobs.length
    const intake = jobs.filter(j => j.status === 'intake' || j.status === 'in_inspection').length
    const quoted = jobs.filter(j => j.status === 'diagnosis_complete' || j.status === 'quoted').length
    const underRepair = jobs.filter(j => j.status === 'approved' || j.status === 'in_repair').length
    const declined = jobs.filter(j => j.status === 'declined').length
    const released = jobs.filter(j => j.status === 'released' || j.status === 'closed').length
    return { total, intake, quoted, underRepair, declined, released }
  }, [jobs])

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (priorityFilter !== 'all' && j.priority !== priorityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const match =
          (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
          (j.customerName && j.customerName.toLowerCase().includes(q)) ||
          (j.itemName && j.itemName.toLowerCase().includes(q)) ||
          (j.serialNo && j.serialNo.toLowerCase().includes(q)) ||
          (j.quotationNo && j.quotationNo.toLowerCase().includes(q)) ||
          (j.inwardGatePassNo && j.inwardGatePassNo.toLowerCase().includes(q)) ||
          (j.outwardGatePassNo && j.outwardGatePassNo.toLowerCase().includes(q)) ||
          (j.salesOrderNo && j.salesOrderNo.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [jobs, search, priorityFilter])

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'intake':
        return <Badge variant="warning" className="bg-amber-500/10 text-amber-500 border border-amber-500/30">Intake / Pending Teardown</Badge>
      case 'in_inspection':
        return <Badge variant="warning" className="bg-amber-600/10 text-amber-400 border border-amber-600/30">Dismantling & Diagnosing</Badge>
      case 'diagnosis_complete':
        return <Badge variant="info" className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Diagnosis Ready</Badge>
      case 'quoted':
        return <Badge variant="info" className="bg-blue-500/10 text-blue-400 border border-blue-500/30">Quoted / Awaiting Decision</Badge>
      case 'approved':
      case 'in_repair':
        return <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Repair In Progress</Badge>
      case 'declined':
        return <Badge variant="danger" className="bg-rose-500/10 text-rose-400 border border-rose-500/30">Declined (Pending Release)</Badge>
      case 'released':
      case 'closed':
        return <Badge variant="secondary" className="bg-slate-500/10 text-slate-400 border border-slate-500/30">Equipment Released</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Handle Intake Submit
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intakeForm.customerName || !intakeForm.itemName) {
      alert('Please provide customer name and equipment item name.')
      return
    }
    try {
      setSubmitting(true)
      await createServiceJob(intakeForm)
      setShowIntakeModal(false)
      setIntakeForm({
        customerId: '',
        customerName: '',
        customerCompany: '',
        contactPhone: '',
        contactPerson: '',
        itemName: '',
        itemCategory: 'Machinery / Equipment',
        modelNo: '',
        serialNo: '',
        customerProblem: '',
        initialCondition: '',
        receivedBy: user?.name || 'Service Desk',
        priority: 'Medium',
        carrier: 'Customer Drop-off',
        vehicleNo: '',
        driverName: '',
        notes: ''
      })
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to record equipment intake')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Diagnosis Modal
  const openDiagnosis = (job: ServiceInspectionJob) => {
    setActiveJob(job)
    let parts = job.requiredParts || []
    if (typeof parts === 'string') {
      try { parts = JSON.parse(parts); } catch (e) { parts = []; }
    }
    let ops = job.requiredOperations || []
    if (typeof ops === 'string') {
      try { ops = JSON.parse(ops); } catch (e) { ops = []; }
    }
    setDiagForm({
      findings: job.findings || '',
      requiredParts: parts.length > 0 ? parts : [{ id: '1', name: '', partNo: '', qty: 1, unitPrice: 0, total: 0, isAvailable: true }],
      requiredOperations: ops.length > 0 ? ops : [{ id: '1', operationName: 'Dismantling & Technical Inspection', machineName: 'Service Bench', estimatedHours: 2, hourlyRate: 1500, total: 3000, description: '' }],
      estimatedRepairCost: Number(job.estimatedRepairCost || 0),
      inspectionFee: Number(job.inspectionFee || 5000),
      assignedTechnician: job.assignedTechnician || user?.name || 'Workshop Engineer',
      notes: ''
    })
    setShowDiagnosisModal(true)
  }

  // Handle Diagnosis Submit
  const handleDiagnosisSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeJob) return
    try {
      setSubmitting(true)
      const partsTotal = diagForm.requiredParts.reduce((acc, p) => acc + (Number(p.qty || 1) * Number(p.unitPrice || 0)), 0)
      const opsTotal = diagForm.requiredOperations.reduce((acc, op) => acc + (Number(op.estimatedHours || 1) * Number(op.hourlyRate || 0)), 0)
      const grandRepair = partsTotal + opsTotal

      await updateServiceJobDiagnosis(activeJob.id, {
        ...diagForm,
        estimatedRepairCost: grandRepair > 0 ? grandRepair : diagForm.estimatedRepairCost
      })
      setShowDiagnosisModal(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to save diagnostic report')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Quote Generation
  const handleCreateQuotation = async (job: ServiceInspectionJob) => {
    if (!confirm(`Generate formal Quotation for Service Job ${job.jobNo}? It will link replacement parts and machining operations.`)) return
    try {
      setSubmitting(true)
      const res = await createServiceJobQuotation(job.id, { createdBy: user?.name || 'Estimator' })
      alert(`Quotation #${res.quotationNo} generated successfully for Rs. ${Number(res.totalAmount).toLocaleString()}!`)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to generate quotation')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Decision Modal
  const openDecision = (job: ServiceInspectionJob) => {
    setActiveJob(job)
    setDecisionForm({
      decision: 'Approved',
      feeAction: 'charge',
      notes: ''
    })
    setShowDecisionModal(true)
  }

  // Handle Decision Submit
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeJob) return
    try {
      setSubmitting(true)
      const res = await recordServiceJobDecision(activeJob.id, {
        decision: decisionForm.decision,
        feeAction: decisionForm.feeAction,
        notes: decisionForm.notes,
        recordedBy: user?.name || 'Service Executive'
      })
      if (decisionForm.decision === 'Approved') {
        alert(`Customer Approved! Sales Order #${res.salesOrderNo} and Work Order #${res.repairWorkOrderId} created and activated!`)
      } else {
        if (res.inspectionInvoiceNo) {
          alert(`Customer Declined. Dismantling & Inspection Fee Invoice #${res.inspectionInvoiceNo} generated.`)
        } else {
          alert(`Customer Declined. Inspection fee waived by management.`)
        }
      }
      setShowDecisionModal(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to process customer decision')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Release Modal
  const openRelease = (job: ServiceInspectionJob) => {
    setActiveJob(job)
    setReleaseForm({
      releasedBy: user?.name || 'Gate Security',
      releaseReason: job.customerDecision === 'Approved' ? 'Repair work completed, tested and handed over' : 'Repair quote declined, dismantled equipment returned to customer',
      carrier: 'Customer Self-Pickup',
      vehicleNo: '',
      driverName: '',
      notes: ''
    })
    setShowReleaseModal(true)
  }

  // Handle Release Submit
  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeJob) return
    try {
      setSubmitting(true)
      const res = await releaseServiceJobGatePass(activeJob.id, releaseForm)
      alert(`Equipment released! Outward Gate Pass #${res.outwardGatePassNo} generated.`)
      setShowReleaseModal(false)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to release equipment')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Traceability Modal
  const openTraceability = async (job: ServiceInspectionJob) => {
    try {
      const fullJob = await fetchServiceJobById(job.id)
      setActiveJob(fullJob)
      setShowTraceabilityModal(true)
    } catch (err) {
      setActiveJob(job)
      setShowTraceabilityModal(true)
    }
  }

  // Open Printable Report
  const openPrint = async (job: ServiceInspectionJob) => {
    try {
      const fullJob = await fetchServiceJobById(job.id)
      setActiveJob(fullJob)
      setShowPrintModal(true)
    } catch (err) {
      setActiveJob(job)
      setShowPrintModal(true)
    }
  }

  // Part Line item management in Diagnosis Form
  const addPartLine = () => {
    setDiagForm(prev => ({
      ...prev,
      requiredParts: [
        ...prev.requiredParts,
        { id: Date.now().toString(), name: '', partNo: '', qty: 1, unitPrice: 0, total: 0, isAvailable: true }
      ]
    }))
  }

  const removePartLine = (index: number) => {
    setDiagForm(prev => ({
      ...prev,
      requiredParts: prev.requiredParts.filter((_, i) => i !== index)
    }))
  }

  const updatePartLine = (index: number, field: string, value: any) => {
    setDiagForm(prev => {
      const updated = [...prev.requiredParts]
      const item = { ...updated[index], [field]: value }
      if (field === 'qty' || field === 'unitPrice') {
        item.total = Number(item.qty || 0) * Number(item.unitPrice || 0)
      }
      updated[index] = item
      return { ...prev, requiredParts: updated }
    })
  }

  // Operation Line item management in Diagnosis Form
  const addOperationLine = () => {
    setDiagForm(prev => ({
      ...prev,
      requiredOperations: [
        ...prev.requiredOperations,
        { id: Date.now().toString(), operationName: '', machineName: '', estimatedHours: 1, hourlyRate: 1200, total: 1200, description: '' }
      ]
    }))
  }

  const removeOperationLine = (index: number) => {
    setDiagForm(prev => ({
      ...prev,
      requiredOperations: prev.requiredOperations.filter((_, i) => i !== index)
    }))
  }

  const updateOperationLine = (index: number, field: string, value: any) => {
    setDiagForm(prev => {
      const updated = [...prev.requiredOperations]
      const item = { ...updated[index], [field]: value }
      if (field === 'estimatedHours' || field === 'hourlyRate') {
        item.total = Number(item.estimatedHours || 0) * Number(item.hourlyRate || 0)
      }
      updated[index] = item
      return { ...prev, requiredOperations: updated }
    })
  }

  // Table Columns
  const columns: Column<ServiceInspectionJob>[] = [
    {
      key: 'jobNo',
      header: 'Job & Machinery',
      render: (_, job) => (
        <div>
          <div className="flex items-center gap-2 font-semibold text-primary">
            <span className="font-mono text-rex-600 dark:text-rex-400 font-bold">{job.jobNo}</span>
            {job.priority === 'High' && <span className="px-1.5 py-0.5 text-[10px] rounded-none bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">High Priority</span>}
          </div>
          <div className="text-sm font-semibold text-secondary mt-0.5">{job.itemName}</div>
          <div className="text-xs text-muted">
            {job.modelNo ? `Model: ${job.modelNo}` : ''} {job.serialNo ? ` | S/N: ${job.serialNo}` : ''}
          </div>
        </div>
      )
    },
    {
      key: 'customerName',
      header: 'Customer Details',
      render: (_, job) => (
        <div>
          <div className="font-semibold text-primary">{job.customerCompany || job.customerName}</div>
          {job.customerCompany && <div className="text-xs text-muted">Attn: {job.customerName}</div>}
          {job.contactPhone && <div className="text-xs text-muted flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-muted shrink-0" />{job.contactPhone}</div>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status & Phase',
      render: (_, job) => (
        <div>
          {renderStatusBadge(job.status)}
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted" />
            Intake: {new Date(job.intakeDate).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'traceability',
      header: 'Traceability Documents',
      render: (_, job) => (
        <div className="space-y-1 text-xs">
          {job.inwardGatePassNo && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-surface2 text-muted border border-theme-subtle font-mono">IN-GP</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{job.inwardGatePassNo}</span>
            </div>
          )}
          {job.quotationNo && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">QUO</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{job.quotationNo}</span>
              <span className="text-muted">({formatCurrency(job.quotationAmount || 0)})</span>
            </div>
          )}
          {job.salesOrderNo && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">SO</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{job.salesOrderNo}</span>
            </div>
          )}
          {job.repairWorkOrderId && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">WO</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{job.repairWorkOrderId}</span>
            </div>
          )}
          {job.inspectionInvoiceNo && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">FEE INV</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{job.inspectionInvoiceNo}</span>
              <span className="text-muted">({formatCurrency(job.inspectionFee || 0)})</span>
            </div>
          )}
          {job.outwardGatePassNo && (
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="text-[10px] px-1 py-0.2 rounded-none bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-mono">OUT-GP</span>
              <span className="font-mono text-green-600 dark:text-green-400 font-semibold">{job.outwardGatePassNo}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'costs',
      header: 'Diagnostic & Fee',
      render: (_, job) => (
        <div className="text-xs">
          {Number(job.estimatedRepairCost) > 0 ? (
            <div>
              <div className="text-muted">Repair Estimate:</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(job.estimatedRepairCost || 0)}</div>
            </div>
          ) : (
            <div className="text-muted italic">Not diagnosed yet</div>
          )}
          <div className="mt-1 text-muted">
            Dismantle Fee: <span className="text-primary font-mono font-semibold">{formatCurrency(job.inspectionFee || 0)}</span>
          </div>
          {job.assignedTechnician && (
            <div className="text-[11px] text-muted mt-0.5">Tech: {job.assignedTechnician}</div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, job) => (
        <div className="flex items-center gap-1 flex-wrap">
          {/* Action 1: Dismantle & Diagnosing / Edit Findings */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2 rounded-none border-theme text-secondary hover:text-primary hover:bg-surface2"
            onClick={() => openDiagnosis(job)}
            title="Record / Edit Dismantling & Technical Assessment Findings"
          >
            <Wrench className="w-3.5 h-3.5 mr-1 text-rex-500" />
            {job.findings ? 'Edit Findings' : 'Dismantle & Diagnose'}
          </Button>

          {/* Action 2: Generate Quotation */}
          {job.findings && !job.quotationNo && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 rounded-none border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              onClick={() => handleCreateQuotation(job)}
              disabled={submitting}
              title="Prepare Formal Quotation for Customer"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Prepare Quote
            </Button>
          )}

          {/* Action 3: Customer Decision */}
          {job.quotationNo && job.customerDecision === 'Pending' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 rounded-none border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={() => openDecision(job)}
              title="Record Customer Decision (Approve or Decline)"
            >
              <FileCheck className="w-3.5 h-3.5 mr-1" />
              Customer Decision
            </Button>
          )}

          {/* Action 4: Outward Gate Pass / Release */}
          {(job.status === 'declined' || job.status === 'in_repair' || job.status === 'approved') && !job.outwardGatePassNo && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 rounded-none border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
              onClick={() => openRelease(job)}
              title="Issue Outward Gate Pass and Release Equipment"
            >
              <Truck className="w-3.5 h-3.5 mr-1" />
              Issue Out-GP
            </Button>
          )}

          {/* Action 5: Traceability Timeline Drawer */}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2 rounded-none text-muted hover:text-primary hover:bg-surface2"
            onClick={() => openTraceability(job)}
            title="Complete Traceability Journey"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-rex-500" />
            Audit Trace
          </Button>

          {/* Action 6: Printable Job Card */}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2 rounded-none text-muted hover:text-primary hover:bg-surface2"
            onClick={() => openPrint(job)}
            title="Print Inspection Job Card & Findings Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Service & Pre-Quotation Inspection Hub
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 font-mono">
              Workshop Teardown
            </span>
          </div>
          <p className="text-sm text-secondary mt-1">
            Manage equipment teardown, technical diagnostic reports, post-inspection quotations, customer approval / decline fees, and gate pass release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowIntakeModal(true)}
            className="rounded-none text-xs font-bold"
          >
            <Plus size={14} className="mr-1.5" />
            New Equipment Intake (In-GP)
          </Button>
        </div>
      </div>

      {/* Workflow Process Stepper Info */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">1. Intake & In-GP</span>
            <span className="text-xs font-mono font-bold text-primary bg-surface2 px-1.5 py-0.5 border border-theme-subtle">{stats.intake}</span>
          </div>
          <div className="text-[11px] text-muted mt-1 leading-snug">Receive machine & generate Inward Gate Pass</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">2. Teardown & Diagnose</span>
            <span className="text-xs font-mono font-bold text-primary bg-surface2 px-1.5 py-0.5 border border-theme-subtle">{jobs.filter(j => j.status === 'diagnosis_complete').length}</span>
          </div>
          <div className="text-[11px] text-muted mt-1 leading-snug">Dismantle, inspect, estimate parts & machining</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">3. Quoted to Customer</span>
            <span className="text-xs font-mono font-bold text-primary bg-surface2 px-1.5 py-0.5 border border-theme-subtle">{jobs.filter(j => j.status === 'quoted').length}</span>
          </div>
          <div className="text-[11px] text-muted mt-1 leading-snug">Formal repair quote sent; awaiting customer decision</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">4. Approved / In Repair</span>
            <span className="text-xs font-mono font-bold text-primary bg-surface2 px-1.5 py-0.5 border border-theme-subtle">{stats.underRepair}</span>
          </div>
          <div className="text-[11px] text-muted mt-1 leading-snug">SO & Work Order active on shop floor</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">5. Declined / Release</span>
            <span className="text-xs font-mono font-bold text-primary bg-surface2 px-1.5 py-0.5 border border-theme-subtle">{stats.declined + stats.released}</span>
          </div>
          <div className="text-[11px] text-muted mt-1 leading-snug">Inspection fee billed / waived & Out-GP issued</div>
        </GlassCard>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface border border-theme-subtle rounded-none overflow-x-auto">
          {[
            { id: 'all', label: 'All Jobs', count: stats.total },
            { id: 'intake', label: 'Intake / In-GP', count: stats.intake },
            { id: 'diagnosis_complete', label: 'Diagnosed', count: jobs.filter(j => j.status === 'diagnosis_complete').length },
            { id: 'quoted', label: 'Quoted', count: jobs.filter(j => j.status === 'quoted').length },
            { id: 'in_repair', label: 'In Repair (SO/WO)', count: stats.underRepair },
            { id: 'declined', label: 'Declined', count: stats.declined },
            { id: 'released', label: 'Released (Out-GP)', count: stats.released }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all rounded-none ${
                statusFilter === tab.id
                  ? 'bg-rex-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-surface2'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1 py-0.2 text-[10px] font-mono ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-surface2 text-muted'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Priority Filter */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Job #, Customer, Machine, S/N, GP #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary placeholder-muted focus:outline-none focus:border-rex-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-secondary focus:outline-none focus:border-rex-500"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <GlassCard className="p-0 overflow-hidden border-theme-subtle rounded-none">
        <DataTable<ServiceInspectionJob>
          columns={columns}
          data={filteredJobs}
          keyExtractor={(job) => job.id || job.jobNo}
          emptyMessage="No service & inspection jobs found matching the current filters."
        />
      </GlassCard>

      {/* MODAL 1: EQUIPMENT INTAKE & INWARD GATE PASS */}
      <Modal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        title="Equipment Intake & Inward Gate Pass (Pre-Quotation Teardown)"
        size="3xl"
      >
        <form onSubmit={handleIntakeSubmit} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-none text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            <span className="font-bold text-amber-800 dark:text-amber-300">Workshop Intake Procedure:</span> When machinery requires dismantling before an accurate repair quotation can be provided, record it here. An <strong className="text-primary font-mono">Inward Gate Pass (GP-XXXX)</strong> will be generated automatically as legal proof of equipment receipt.
          </div>

          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Customer / Organization *</label>
              <input
                type="text"
                required
                placeholder="e.g. Holcim Lanka, DSI, Prima Ceylon"
                value={intakeForm.customerName}
                onChange={(e) => setIntakeForm({ ...intakeForm, customerName: e.target.value })}
                list="customer-suggestions"
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
              <datalist id="customer-suggestions">
                {customers.map((c: any) => (
                  <option key={c.id} value={c.company || c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Contact Person & Phone</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Attn: Eng. Kamal"
                  value={intakeForm.contactPerson}
                  onChange={(e) => setIntakeForm({ ...intakeForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                />
                <input
                  type="text"
                  placeholder="077-xxxxxxx"
                  value={intakeForm.contactPhone}
                  onChange={(e) => setIntakeForm({ ...intakeForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                />
              </div>
            </div>
          </div>

          {/* Equipment Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-secondary mb-1">Equipment Name / Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. 55kW Siemens Electric Induction Motor"
                value={intakeForm.itemName}
                onChange={(e) => setIntakeForm({ ...intakeForm, itemName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Category</label>
              <select
                value={intakeForm.itemCategory}
                onChange={(e) => setIntakeForm({ ...intakeForm, itemCategory: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="Electric Motors">Electric Motors</option>
                <option value="Hydraulic Cylinders & Pumps">Hydraulic Cylinders & Pumps</option>
                <option value="Industrial Gearboxes">Industrial Gearboxes</option>
                <option value="Machining / Fabricated Parts">Machining / Fabricated Parts</option>
                <option value="Valves & Actuators">Valves & Actuators</option>
                <option value="Machinery / Equipment">Other Machinery</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Serial Number (S/N)</label>
              <input
                type="text"
                placeholder="e.g. SN-883921-A"
                value={intakeForm.serialNo}
                onChange={(e) => setIntakeForm({ ...intakeForm, serialNo: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Model / Spec No</label>
              <input
                type="text"
                placeholder="e.g. 1LE1001-1DB2"
                value={intakeForm.modelNo}
                onChange={(e) => setIntakeForm({ ...intakeForm, modelNo: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Priority</label>
              <select
                value={intakeForm.priority}
                onChange={(e) => setIntakeForm({ ...intakeForm, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent (Breakdown)</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Faults & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Customer-Reported Problem / Symptoms</label>
              <textarea
                rows={2}
                placeholder="e.g. Abnormal bearing noise, excessive vibration, tripping breaker above 1200 RPM"
                value={intakeForm.customerProblem}
                onChange={(e) => setIntakeForm({ ...intakeForm, customerProblem: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Initial Physical Condition at Intake</label>
              <textarea
                rows={2}
                placeholder="e.g. Terminal box cover missing, shaft key present, casing oily, external scratches"
                value={intakeForm.initialCondition}
                onChange={(e) => setIntakeForm({ ...intakeForm, initialCondition: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
          </div>

          {/* Inward Gate Pass Delivery Details */}
          <div className="p-3 bg-surface2/60 rounded-none border border-theme-subtle space-y-2">
            <div className="text-xs font-bold text-secondary flex items-center gap-1.5 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-rex-500" />
              Inward Gate Pass & Transporter Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Delivered By / Carrier</label>
                <input
                  type="text"
                  placeholder="e.g. Customer Lorry, Pronto, Courier"
                  value={intakeForm.carrier}
                  onChange={(e) => setIntakeForm({ ...intakeForm, carrier: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Vehicle No</label>
                <input
                  type="text"
                  placeholder="e.g. WP-WP-4521"
                  value={intakeForm.vehicleNo}
                  onChange={(e) => setIntakeForm({ ...intakeForm, vehicleNo: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Driver / Representative Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunil Perera"
                  value={intakeForm.driverName}
                  onChange={(e) => setIntakeForm({ ...intakeForm, driverName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button type="button" variant="ghost" onClick={() => setShowIntakeModal(false)} className="rounded-none text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="rounded-none text-xs font-bold">
              {submitting ? 'Generating Job Card & GP...' : 'Create Service Job & Issue Inward GP'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: DISMANTLING & DIAGNOSTIC FINDINGS */}
      <Modal
        isOpen={showDiagnosisModal}
        onClose={() => setShowDiagnosisModal(false)}
        title={`Dismantling & Technical Assessment - Job #${activeJob?.jobNo}`}
        size="4xl"
      >
        <form onSubmit={handleDiagnosisSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between p-3 bg-surface2/60 rounded-none border border-theme-subtle text-xs">
            <div>
              <span className="text-muted">Equipment:</span> <strong className="text-primary ml-1">{activeJob?.itemName}</strong>
              {activeJob?.serialNo && <span className="text-muted ml-2 font-mono">S/N: {activeJob.serialNo}</span>}
            </div>
            <div>
              <span className="text-muted">Customer:</span> <strong className="text-primary ml-1">{activeJob?.customerName}</strong>
            </div>
          </div>

          {/* Diagnostic Findings */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-secondary">
                Dismantling Findings & Technical Assessment *
              </label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 py-0 border-rex-500/40 text-rex-600 dark:text-rex-400 rounded-none hover:bg-rex-500/10 font-medium"
                  onClick={() => {
                    const current = diagForm.findings || '';
                    const newText = current ? (current.endsWith('\n') ? `${current}• ` : `${current}\n• `) : '• ';
                    setDiagForm({ ...diagForm, findings: newText });
                  }}
                  title="Add a bullet point line"
                >
                  + Add Bullet (•)
                </Button>
              </div>
            </div>
            <textarea
              rows={4}
              required
              placeholder="e.g.&#10;• Drive-end bearing 6312 completely seized.&#10;• Rotor shaft bearing journal worn out by 0.45mm.&#10;• Stator windings show insulation degradation.&#10;• Oil seals cracked."
              value={diagForm.findings}
              onChange={(e) => setDiagForm({ ...diagForm, findings: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.currentTarget;
                  const pos = target.selectionStart;
                  const val = target.value;
                  const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
                  const currentLine = val.substring(lineStart, pos);
                  const bulletMatch = currentLine.match(/^(\s*[•\-\*]\s*)/);
                  if (bulletMatch) {
                    // If current line only contains the bullet symbol and whitespace, clear the bullet on double enter
                    if (currentLine.trim() === '•' || currentLine.trim() === '-' || currentLine.trim() === '*') {
                      e.preventDefault();
                      const before = val.substring(0, lineStart);
                      const after = val.substring(pos);
                      const newVal = before + after;
                      setDiagForm({ ...diagForm, findings: newVal });
                      setTimeout(() => {
                        target.selectionStart = target.selectionEnd = lineStart;
                      }, 0);
                      return;
                    }
                    e.preventDefault();
                    const prefix = bulletMatch[1].startsWith('•') ? '\n• ' : `\n${bulletMatch[1]}`;
                    const before = val.substring(0, pos);
                    const after = val.substring(pos);
                    const newVal = before + prefix + after;
                    setDiagForm({ ...diagForm, findings: newVal });
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = pos + prefix.length;
                    }, 0);
                  }
                }
              }}
              className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 leading-relaxed font-mono"
            />
            <div className="text-[10px] text-muted mt-0.5">
              Press <kbd className="px-1 py-0.5 bg-surface2 border border-theme-subtle rounded text-[9px] font-mono">Enter</kbd> while in a bulleted line to auto-continue next bullet. Click <strong>+ Add Bullet</strong> to start a line.
            </div>
          </div>

          {/* Required Replacement Parts Bill */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 text-rex-500" />
                Required Replacement Parts & Materials
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addPartLine} className="text-xs h-7 rounded-none border-theme">
                + Add Part
              </Button>
            </div>

            <div className="space-y-2">
              {diagForm.requiredParts.map((p, idx) => (
                <div key={p.id || idx} className="grid grid-cols-12 gap-2 items-center bg-surface p-2 rounded-none border border-theme-subtle">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Part Name (e.g. SKF 6312 Deep Groove Ball Bearing)"
                      value={p.name}
                      onChange={(e) => updatePartLine(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Part / SKU No"
                      value={p.partNo}
                      onChange={(e) => updatePartLine(idx, 'partNo', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary font-mono focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={p.qty}
                      onChange={(e) => updatePartLine(idx, 'qty', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary text-center font-bold focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={p.unitPrice}
                      onChange={(e) => updatePartLine(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary text-right font-mono font-bold focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-1 text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.total || 0)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePartLine(idx)}
                      className="text-muted hover:text-rose-500 p-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Machining & Workshop Operations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                <Wrench className="w-3.5 h-3.5 text-rex-500" />
                Required Workshop Machining & Labor Operations
              </label>
              <Button type="button" size="sm" variant="outline" onClick={addOperationLine} className="text-xs h-7 rounded-none border-theme">
                + Add Operation
              </Button>
            </div>

            <div className="space-y-2">
              {diagForm.requiredOperations.map((op, idx) => (
                <div key={op.id || idx} className="grid grid-cols-12 gap-2 items-center bg-surface p-2 rounded-none border border-theme-subtle">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Operation (e.g. Lathe Turning Shaft Journal / Re-sleeving)"
                      value={op.operationName}
                      onChange={(e) => updateOperationLine(idx, 'operationName', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Machine Tool (e.g. Lathe #1)"
                      value={op.machineName}
                      onChange={(e) => updateOperationLine(idx, 'machineName', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Hrs"
                      value={op.estimatedHours}
                      onChange={(e) => updateOperationLine(idx, 'estimatedHours', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary text-center font-bold focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Rate/Hr"
                      value={op.hourlyRate}
                      onChange={(e) => updateOperationLine(idx, 'hourlyRate', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle rounded-none text-primary text-right font-mono font-bold focus:border-rex-500"
                    />
                  </div>
                  <div className="col-span-1 text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(op.total || 0)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeOperationLine(idx)}
                      className="text-muted hover:text-rose-500 p-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standalone Dismantling / Inspection Fee & Technician */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-surface2/60 rounded-none border border-theme-subtle">
            <div>
              <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                Inspection & Dismantling Fee (Applicable if customer declines repair)
              </label>
              <input
                type="number"
                value={diagForm.inspectionFee}
                onChange={(e) => setDiagForm({ ...diagForm, inspectionFee: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary font-mono font-bold focus:outline-none focus:border-rex-500"
              />
              <p className="text-[11px] text-muted mt-1 leading-snug">
                If the customer agrees to the full repair quote, this fee is usually absorbed or credited into the total repair order.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">
                Assigned Technical Lead / Inspector
              </label>
              <input
                type="text"
                value={diagForm.assignedTechnician}
                onChange={(e) => setDiagForm({ ...diagForm, assignedTechnician: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
              <div className="mt-2 text-right">
                <span className="text-xs text-muted">Total Estimated Bill of Repairs: </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(
                    diagForm.requiredParts.reduce((acc, p) => acc + (p.total || 0), 0) +
                    diagForm.requiredOperations.reduce((acc, op) => acc + (op.total || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button type="button" variant="ghost" onClick={() => setShowDiagnosisModal(false)} className="rounded-none text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="rounded-none text-xs font-bold">
              {submitting ? 'Saving Assessment...' : 'Save Diagnosis & Bill of Repairs'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CUSTOMER DECISION (APPROVED VS DECLINED) */}
      <Modal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title={`Record Customer Decision - Job #${activeJob?.jobNo}`}
        size="lg"
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          <div className="p-3 bg-surface2/60 rounded-none border border-theme-subtle text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted">Customer:</span>
              <strong className="text-primary">{activeJob?.customerName}</strong>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted">Quotation No:</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{activeJob?.quotationNo || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Quotation Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatCurrency(activeJob?.quotationAmount || 0)}</span>
            </div>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Customer Decision *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecisionForm({ ...decisionForm, decision: 'Approved' })}
                className={`p-3 rounded-none border text-left flex items-start gap-2.5 transition-all ${
                  decisionForm.decision === 'Approved'
                    ? 'bg-emerald-500/10 border-emerald-500 text-primary shadow-sm'
                    : 'bg-surface border-theme-subtle text-muted hover:text-primary hover:bg-surface2'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${decisionForm.decision === 'Approved' ? 'text-emerald-500' : 'text-muted'}`} />
                <div>
                  <div className="text-xs font-bold text-primary">Customer Agreed (Approved)</div>
                  <div className="text-[11px] text-muted mt-0.5">Proceed with repair; activates Sales Order & Work Order.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecisionForm({ ...decisionForm, decision: 'Declined' })}
                className={`p-3 rounded-none border text-left flex items-start gap-2.5 transition-all ${
                  decisionForm.decision === 'Declined'
                    ? 'bg-rose-500/10 border-rose-500 text-primary shadow-sm'
                    : 'bg-surface border-theme-subtle text-muted hover:text-primary hover:bg-surface2'
                }`}
              >
                <X className={`w-5 h-5 mt-0.5 shrink-0 ${decisionForm.decision === 'Declined' ? 'text-rose-500' : 'text-muted'}`} />
                <div>
                  <div className="text-xs font-bold text-primary">Customer Declined</div>
                  <div className="text-[11px] text-muted mt-0.5">Do not repair; charge inspection fee or waive.</div>
                </div>
              </button>
            </div>
          </div>

          {/* If Declined: Inspection Fee Handling */}
          {decisionForm.decision === 'Declined' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-none space-y-3">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Inspection & Dismantling Fee Settlement (Fee: {formatCurrency(activeJob?.inspectionFee || 0)})
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-surface rounded-none border border-theme-subtle cursor-pointer font-medium text-secondary hover:text-primary">
                  <input
                    type="radio"
                    name="feeAction"
                    checked={decisionForm.feeAction === 'charge'}
                    onChange={() => setDecisionForm({ ...decisionForm, feeAction: 'charge' })}
                  />
                  <span>Charge & Invoice Fee ({formatCurrency(activeJob?.inspectionFee || 0)})</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-surface rounded-none border border-theme-subtle cursor-pointer font-medium text-secondary hover:text-primary">
                  <input
                    type="radio"
                    name="feeAction"
                    checked={decisionForm.feeAction === 'waive'}
                    onChange={() => setDecisionForm({ ...decisionForm, feeAction: 'waive' })}
                  />
                  <span>Waive Fee (Free Inspection)</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Decision Remarks / Customer Reason</label>
            <textarea
              rows={2}
              placeholder={decisionForm.decision === 'Approved' ? 'Customer confirmed via email / PO issued' : 'Customer stated equipment replacement is preferred over repair cost'}
              value={decisionForm.notes}
              onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button type="button" variant="ghost" onClick={() => setShowDecisionModal(false)} className="rounded-none text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className={`rounded-none text-xs font-bold ${decisionForm.decision === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
            >
              {submitting ? 'Updating Decision...' : 'Confirm Decision'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: EQUIPMENT RELEASE & OUTWARD GATE PASS */}
      <Modal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        title={`Issue Outward Gate Pass & Release Equipment - Job #${activeJob?.jobNo}`}
        size="md"
      >
        <form onSubmit={handleReleaseSubmit} className="space-y-4">
          <div className="p-3 bg-surface2/60 rounded-none border border-theme-subtle text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Equipment:</span>
              <strong className="text-primary">{activeJob?.itemName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Status:</span>
              <span className="font-bold text-rex-600 dark:text-rex-400">
                {activeJob?.customerDecision === 'Approved' ? 'Repaired & Quality Checked' : 'Inspected / Repaired Declined'}
              </span>
            </div>
            {activeJob?.inspectionInvoiceNo && (
              <div className="flex justify-between">
                <span className="text-muted">Inspection Invoice:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{activeJob.inspectionInvoiceNo}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Release Reason *</label>
            <input
              type="text"
              required
              value={releaseForm.releaseReason}
              onChange={(e) => setReleaseForm({ ...releaseForm, releaseReason: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Carrier / Transporter</label>
              <input
                type="text"
                placeholder="e.g. Customer Self-Pickup"
                value={releaseForm.carrier}
                onChange={(e) => setReleaseForm({ ...releaseForm, carrier: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Vehicle No</label>
              <input
                type="text"
                placeholder="e.g. WP-CA-8890"
                value={releaseForm.vehicleNo}
                onChange={(e) => setReleaseForm({ ...releaseForm, vehicleNo: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Driver / Collector Name & ID</label>
            <input
              type="text"
              placeholder="e.g. Priyantha (NIC: 841234567V)"
              value={releaseForm.driverName}
              onChange={(e) => setReleaseForm({ ...releaseForm, driverName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Authorizing Officer</label>
            <input
              type="text"
              value={releaseForm.releasedBy}
              onChange={(e) => setReleaseForm({ ...releaseForm, releasedBy: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-none text-primary focus:outline-none focus:border-rex-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button type="button" variant="ghost" onClick={() => setShowReleaseModal(false)} className="rounded-none text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting} className="rounded-none text-xs font-bold">
              {submitting ? 'Releasing...' : 'Generate Outward GP & Release'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: COMPLETE AUDIT & TRACEABILITY JOURNEY */}
      <Modal
        isOpen={showTraceabilityModal}
        onClose={() => setShowTraceabilityModal(false)}
        title={`Complete Traceability Journey - Job #${activeJob?.jobNo}`}
        size="3xl"
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
          {/* Linked Documents Chain */}
          <div className="p-3 bg-surface2/60 rounded-none border border-theme-subtle">
            <div className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">Connected ERP Traceability Chain:</div>
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs font-mono">
              {activeJob?.inwardGatePassNo && (
                <div className="px-2.5 py-1.5 rounded-none bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[10px] text-amber-500 font-sans font-bold">IN-GP:</span> {activeJob.inwardGatePassNo}
                </div>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              <div className="px-2.5 py-1.5 rounded-none bg-rex-500/10 border border-rex-500/30 text-rex-600 dark:text-rex-400 flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[10px] text-rex-500 font-sans font-bold">SRV-JOB:</span> {activeJob?.jobNo}
              </div>
              {activeJob?.quotationNo && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <div className="px-2.5 py-1.5 rounded-none bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[10px] text-blue-500 font-sans font-bold">QUO:</span> {activeJob.quotationNo}
                  </div>
                </>
              )}
              {activeJob?.salesOrderNo && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <div className="px-2.5 py-1.5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[10px] text-emerald-500 font-sans font-bold">SO:</span> {activeJob.salesOrderNo}
                  </div>
                </>
              )}
              {activeJob?.inspectionInvoiceNo && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <div className="px-2.5 py-1.5 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[10px] text-rose-500 font-sans font-bold">FEE INV:</span> {activeJob.inspectionInvoiceNo}
                  </div>
                </>
              )}
              {activeJob?.outwardGatePassNo && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                  <div className="px-2.5 py-1.5 rounded-none bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[10px] text-green-500 font-sans font-bold">OUT-GP:</span> {activeJob.outwardGatePassNo}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Chronological Audit Events</h3>
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-theme-subtle">
              {((activeJob?.timeline as any[]) || []).map((ev: any, idx: number) => (
                <div key={ev.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-rex-500 border-2 border-surface shadow-sm" />
                  <div className="bg-surface p-3 rounded-none border border-theme-subtle">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-primary">{ev.title || ev.action}</div>
                      <div className="text-[11px] text-muted">{new Date(ev.timestamp).toLocaleString()}</div>
                    </div>
                    {ev.description && <p className="text-xs text-secondary mt-1">{ev.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted">
                      {ev.actor && <span>By: <strong className="text-primary">{ev.actor}</strong></span>}
                      {ev.documentNo && (
                        <span className="font-mono text-rex-600 dark:text-rex-400 bg-rex-500/10 px-1.5 py-0.5 rounded-none border border-rex-500/20 font-semibold">
                          {ev.documentType}: {ev.documentNo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      {/* MODAL 6: PRINTABLE INSPECTION REPORT & JOB CARD */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Print Technical Inspection Report & Job Card"
        size="3xl"
      >
        <div className="space-y-4">
          <div id="service-job-print-area" className="p-6 bg-white text-slate-900 rounded-none shadow-sm font-sans space-y-4 text-xs">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {settings?.companyName || 'REX CUS INDUSTRIAL SERVICES'}
                </h2>
                <p className="text-[11px] text-slate-600">Specialized Mechanical & Workshop Engineering</p>
                <p className="text-[10px] text-slate-500">Pre-Quotation Teardown & Diagnostic Inspection Card</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-slate-900">JOB #{activeJob?.jobNo}</div>
                <div className="text-[11px] text-slate-600">Date: {activeJob?.intakeDate ? new Date(activeJob.intakeDate).toLocaleDateString() : 'N/A'}</div>
                {activeJob?.inwardGatePassNo && <div className="text-[10px] text-slate-500">Inward GP: {activeJob.inwardGatePassNo}</div>}
              </div>
            </div>

            {/* Equipment & Customer */}
            <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded-none border border-slate-200">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Customer Details:</div>
                <div className="font-bold text-slate-900">{activeJob?.customerCompany || activeJob?.customerName}</div>
                {activeJob?.contactPerson && <div>Attn: {activeJob.contactPerson}</div>}
                {activeJob?.contactPhone && <div>Tel: {activeJob.contactPhone}</div>}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Equipment Identification:</div>
                <div className="font-bold text-slate-900">{activeJob?.itemName}</div>
                <div>Model: {activeJob?.modelNo || 'N/A'} | S/N: {activeJob?.serialNo || 'N/A'}</div>
                <div>Category: {activeJob?.itemCategory}</div>
              </div>
            </div>

            {/* Initial Condition & Symptoms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Reported Problem:</div>
                <div className="p-2 bg-slate-50 rounded-none border border-slate-200 min-h-[40px]">
                  {activeJob?.customerProblem || 'No specific fault logged.'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Intake Physical Condition:</div>
                <div className="p-2 bg-slate-50 rounded-none border border-slate-200 min-h-[40px]">
                  {activeJob?.initialCondition || 'Standard received condition.'}
                </div>
              </div>
            </div>

            {/* Diagnostic Findings */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Workshop Teardown & Inspection Findings:</div>
              <div className="p-2.5 bg-slate-50 rounded-none border border-slate-200 min-h-[50px] text-xs text-slate-900 leading-relaxed font-sans">
                {activeJob?.findings ? (
                  <ul className="space-y-1">
                    {activeJob.findings.split('\n').filter((l: string) => l.trim().length > 0).map((line: string, i: number) => {
                      const cleanLine = line.replace(/^[\s•\-\*]+\s*/, '');
                      return (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rex-600 font-bold select-none">•</span>
                          <span>{cleanLine}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">Equipment teardown and inspection in progress.</span>
                )}
              </div>
            </div>

            {/* Estimated Repair Cost & Fee */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-3">
              <div>
                <span className="text-slate-600">Applicable Dismantling Fee: </span>
                <strong className="text-slate-900">{formatCurrency(activeJob?.inspectionFee || 0)}</strong>
                <div className="text-[10px] text-slate-500 italic">Charged only if customer declines repair quotation</div>
              </div>
              <div className="text-right">
                <span className="text-slate-600">Estimated Total Repair: </span>
                <strong className="text-sm font-bold text-slate-900">{formatCurrency(activeJob?.estimatedRepairCost || 0)}</strong>
                {activeJob?.quotationNo && (
                  <div className="text-[10px] text-blue-700 font-mono">Quotation #{activeJob.quotationNo}</div>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 text-center text-[10px] text-slate-600">
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">Assigned Technician</div>
                <div>{activeJob?.assignedTechnician || 'Workshop Engineer'}</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">Workshop Supervisor</div>
                <div>Sign & Date</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">Customer Representative</div>
                <div>Sign & Acceptance</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowPrintModal(false)} className="rounded-none text-xs">
              Close
            </Button>
            <Button
              variant="primary"
              className="rounded-none text-xs font-bold"
              onClick={() => {
                const printContent = document.getElementById('service-job-print-area')
                if (!printContent) return
                const win = window.open('', '', 'width=900,height=700')
                if (win) {
                  win.document.write(`
                    <html>
                      <head>
                        <title>Service Job Card #${activeJob?.jobNo}</title>
                        <style>
                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; }
                        </style>
                      </head>
                      <body>${printContent.innerHTML}</body>
                    </html>
                  `)
                  win.document.close()
                  win.focus()
                  win.print()
                }
              }}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print Job Card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
export default ServiceInspectionHub
