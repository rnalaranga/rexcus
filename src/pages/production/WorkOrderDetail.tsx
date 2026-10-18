import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Factory, Plus, Search, Layers, Wrench, Clock, CheckCircle2, 
  AlertTriangle, RotateCcw, DollarSign, Package, ClipboardList, Play, 
  Pause, Check, Scissors, ExternalLink, Trash2, Calendar, Building, 
  RefreshCw, TrendingUp, ShieldCheck, ArrowRight, Printer, Sparkles, 
  User, Cpu, AlertCircle, FileText, ChevronRight, ChevronDown, CheckSquare
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { 
  fetchWorkOrderById, 
  fetchWorkOrders, 
  updateWorkOrder, 
  updateWorkOrderStatus, 
  updateWorkOrderOperationStatus, 
  addWorkOrderOperation, 
  deleteWorkOrderOperation, 
  issueMaterialToWorkOrder, 
  logOperationQC, 
  updateReworkLog, 
  completeWorkOrder, 
  fetchQuotations 
} from '@/lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type DetailTab = 'bom' | 'routing' | 'materials' | 'qc_rework' | 'costing'

export const WorkOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Primary State
  const [workOrder, setWorkOrder] = useState<any>(null)
  const [quotations, setQuotations] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [machineries, setMachineries] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('bom')
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Sub-Modals
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showAddOpModal, setShowAddOpModal] = useState(false)
  const [showQcModal, setShowQcModal] = useState<any | null>(null)
  const [showReworkModal, setShowReworkModal] = useState<any | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAddBomModal, setShowAddBomModal] = useState(false)

  // Issue Material Form
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

  // Add BOM Form
  const [addBomForm, setAddBomForm] = useState({
    material: '',
    qty: 1,
    unit: 'pcs',
    unitCost: 0,
    notes: ''
  })

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMsg({ type, text })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Load Work Order & Supporting Datasets
  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [woRes, quotesRes, empsRes, machsRes, invRes] = await Promise.all([
        fetchWorkOrderById(id).catch(async () => {
          const list = await fetchWorkOrders().catch(() => [])
          return list.find((w: any) => w.id === id || w.orderNo === id) || null
        }),
        fetchQuotations().catch(() => []),
        fetch(`${API_URL}/hr/employees`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/production/machineries`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/inventory`).then(r => r.json()).catch(() => [])
      ])

      setWorkOrder(woRes)
      setQuotations(Array.isArray(quotesRes) ? quotesRes : [])
      setEmployees(Array.isArray(empsRes) ? empsRes : [])
      setMachineries(Array.isArray(machsRes) ? machsRes : [])
      setInventory(Array.isArray(invRes) ? invRes : [])

      if (woRes) {
        setCompleteForm({
          completedQty: Number(woRes.jobQty || 1) - Number(woRes.scrapQty || 0),
          scrapQty: Number(woRes.scrapQty || 0),
          notes: '',
          finalHandoverLocation: 'Finished Goods Bay A'
        })
      }
    } catch (err: any) {
      console.error('Error loading work order detail:', err)
      notify('error', 'Failed to load work order data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const wo = workOrder || {}
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
    progress: 0,
    completedSteps: 0,
    totalSteps: 0
  }

  // Linked Quotation Resolution
  const linkedQuote = useMemo(() => {
    if (!quotations || quotations.length === 0 || !wo.id) return null
    return quotations.find((q: any) => {
      const qData = typeof q.data === 'string' ? (() => { try { return JSON.parse(q.data) } catch(e) { return {} } })() : (q.data || {})
      
      const qId = String(q.id || '').trim().toLowerCase()
      const qQuoNo = String(q.quotationNo || qData.quotationNo || '').trim().toLowerCase()
      const qDocNo = String(q.docNo || qData.docNo || '').trim().toLowerCase()

      const woQuoteId = String(wo.quoteId || wo.sourceQuoteId || '').trim().toLowerCase()
      const woTitle = String(wo.title || '').trim().toLowerCase()
      const woOrder = String(wo.orderNo || '').trim().toLowerCase()

      // 1. Direct ID or Quotation Number match
      if (woQuoteId) {
        if (qId === woQuoteId) return true
        if (qQuoNo && qQuoNo === woQuoteId) return true
        if (qDocNo && qDocNo === woQuoteId) return true
      }

      // 2. Contains in WO Title or Order No
      if (qId && (woTitle.includes(qId) || woOrder.includes(qId))) return true
      if (qQuoNo && (woTitle.includes(qQuoNo) || woOrder.includes(qQuoNo))) return true
      if (qDocNo && (woTitle.includes(qDocNo) || woOrder.includes(qDocNo))) return true

      // 3. Token match: QT-XXXXX, QUO-XXXXX, AD-XXXXX, Q-XXXXX
      const match = (woTitle + ' ' + woOrder + ' ' + woQuoteId).match(/(qt-\d+)|(quo-\d+)|(ad-\d+)|(q-\d+)/i)
      if (match) {
        const token = match[0].toLowerCase()
        if (qId.includes(token) || (qQuoNo && qQuoNo.includes(token)) || (qDocNo && qDocNo.includes(token))) return true
      }

      // 4. Quotation No digits token (e.g. 0596)
      if (qQuoNo && qQuoNo.length >= 3 && (woTitle.includes(qQuoNo) || woOrder.includes(qQuoNo))) return true

      return false
    })
  }, [quotations, wo])

  // Direct BOM items stored on the work order
  const directBomItems: any[] = useMemo(() => {
    try {
      return typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : (wo.bom || [])
    } catch (e) {
      return []
    }
  }, [wo.bom])

  // BOM BY BOM DETAILED BREAKDOWN (Core Requirement)
  // Extracts BOMs, raw materials (autoMats), bought-out (manualMats), and machining operations (procState)
  const parsedBoms = useMemo(() => {
    const list: any[] = []

    if (linkedQuote) {
      const data = typeof linkedQuote.data === 'string'
        ? (() => { try { return JSON.parse(linkedQuote.data) } catch(e) { return {} } })()
        : (linkedQuote.data || {})

      // 1. Multi-part BOMs in Quotation
      if (Array.isArray(data.boms) && data.boms.length > 0) {
        data.boms.forEach((b: any, bIdx: number) => {
          const partTitle = b.title || `BOM Part ${bIdx + 1}`
          const partDesc = b.description || b.partNo || ''

          // Auto Materials (Bars, Plates, Shafts, Tubes)
          const autoMats = (b.autoMats || []).map((m: any, mIdx: number) => {
            const specNotes = [
              m.dia ? `Ø${m.dia}mm` : '',
              m.thick ? `Thick: ${m.thick}mm` : '',
              m.width ? `W: ${m.width}mm` : '',
              m.length ? `L: ${m.length}mm` : ''
            ].filter(Boolean).join(' | ')

            const profile = m.dia ? 'Round Bar' : (m.thick ? 'Plate / Sheet' : 'Raw Stock')
            const reqQty = Number(m.qty || 1)
            const unitPrice = Number(m.unitPrice || 0)
            const totalPrice = Number(m.shaftPrice || (reqQty * unitPrice))

            // Check inventory match
            const invMatch = inventory.find(inv => 
              (inv.name || '').toLowerCase() === (m.material || '').toLowerCase() ||
              (inv.sku || '').toLowerCase() === (m.material || '').toLowerCase()
            )

            // Check if already issued in stock ledger
            const alreadyIssued = issuedMaterials.some((im: any) => 
              (im.itemName && (im.itemName.toLowerCase() === (m.material || '').toLowerCase())) ||
              (im.notes && im.notes.toLowerCase().includes((m.material || '').toLowerCase()))
            )

            return {
              id: m.id || `auto-${bIdx}-${mIdx}`,
              material: m.material || 'Raw Stock',
              spec: specNotes,
              profile,
              dia: m.dia,
              length: m.length,
              thick: m.thick,
              width: m.width,
              density: m.density,
              qty: reqQty,
              unit: m.dia ? 'rods' : (m.thick ? 'plates' : 'pcs'),
              unitPrice,
              totalPrice,
              invMatch,
              alreadyIssued,
              notes: m.notes || ''
            }
          })

          // Manual Materials (Hardware, Fasteners, Bought-out Items)
          const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => {
            const reqQty = Number(m.qty || 1)
            const unitPrice = Number(m.unitPrice || 0)
            const totalPrice = reqQty * unitPrice

            const invMatch = inventory.find(inv => 
              (inv.name || '').toLowerCase() === (m.material || '').toLowerCase() ||
              (inv.sku || '').toLowerCase() === (m.material || '').toLowerCase()
            )

            const alreadyIssued = issuedMaterials.some((im: any) => 
              (im.itemName && (im.itemName.toLowerCase() === (m.material || '').toLowerCase())) ||
              (im.notes && im.notes.toLowerCase().includes((m.material || '').toLowerCase()))
            )

            return {
              id: m.id || `manual-${bIdx}-${mIdx}`,
              material: m.material || 'Bought-out Component',
              spec: m.supplier ? `Supplier: ${m.supplier}` : 'Standard Hardware',
              profile: 'Bought-out',
              qty: reqQty,
              unit: 'pcs',
              unitPrice,
              totalPrice,
              invMatch,
              alreadyIssued,
              notes: m.supplier || m.notes || ''
            }
          })

          // Machining Operations & Hours from procState
          const machiningOps: any[] = []
          if (b.procState && typeof b.procState === 'object') {
            Object.keys(b.procState).forEach((procName, pIdx) => {
              const p = b.procState[procName]
              const quoHr = Number(p?.quoHr || 0)
              const estHr = Number(p?.estHr || 0)
              const setTime = Number(p?.setTime || 0)
              const hrRate = Number(p?.hrRate || p?.rate || 0)
              const setTimeRate = Number(p?.setTimeRate || 0)

              if (quoHr > 0 || estHr > 0 || setTime > 0) {
                const effectiveHours = estHr > 0 ? estHr : quoHr
                const opCost = (effectiveHours * hrRate) + (setTime * setTimeRate)

                // Match with active floor operations on work order
                const matchedOp = operations.find((op: any) => {
                  const opNameLower = (op.operationName || '').toLowerCase()
                  const procLower = procName.toLowerCase()
                  const partLower = partTitle.toLowerCase()
                  return (opNameLower.includes(procLower) && (opNameLower.includes(partLower) || opNameLower.includes(`part ${bIdx + 1}`) || data.boms.length === 1)) ||
                         opNameLower === procLower
                })

                machiningOps.push({
                  id: `proc-${bIdx}-${pIdx}`,
                  procName,
                  partPrefix: data.boms.length > 1 ? `${partTitle}: ` : '',
                  quoHr,
                  estHr,
                  setTime,
                  hrRate: hrRate || 750,
                  setTimeRate,
                  cost: opCost,
                  matchedOp
                })
              }
            })
          }

          const matTotal = autoMats.reduce((s: number, m: any) => s + m.totalPrice, 0) +
                           manualMats.reduce((s: number, m: any) => s + m.totalPrice, 0)
          const machTotal = machiningOps.reduce((s: number, p: any) => s + p.cost, 0)
          const totalQuotedHours = machiningOps.reduce((s: number, p: any) => s + p.quoHr, 0)
          const totalEstHours = machiningOps.reduce((s: number, p: any) => s + p.estHr, 0)

          list.push({
            bIdx,
            partId: b.id || bIdx + 1,
            title: partTitle,
            description: partDesc,
            drawingNo: b.drawingNo,
            partNo: b.partNo,
            autoMats,
            manualMats,
            allMaterials: [...autoMats, ...manualMats],
            machiningOps,
            matTotal,
            machTotal,
            bomTotal: matTotal + machTotal,
            totalQuotedHours,
            totalEstHours
          })
        })
      }
    }

    // 2. Direct Work Order BOM or Fallback
    if (list.length === 0 && directBomItems.length > 0) {
      const allMats = directBomItems.map((m: any, mIdx: number) => {
        const reqQty = Number(m.qty || 1)
        const unitCost = Number(m.unitCost || 0)
        const invMatch = inventory.find(inv => 
          (inv.name || '').toLowerCase() === (m.material || '').toLowerCase() ||
          (inv.sku || '').toLowerCase() === (m.material || '').toLowerCase()
        )
        const alreadyIssued = issuedMaterials.some((im: any) => 
          (im.itemName && (im.itemName.toLowerCase() === (m.material || '').toLowerCase())) ||
          (im.notes && im.notes.toLowerCase().includes((m.material || '').toLowerCase()))
        )

        return {
          id: `direct-${mIdx}`,
          material: m.material,
          spec: m.notes || 'Direct Allocated Material',
          profile: m.unit || 'pcs',
          qty: reqQty,
          unit: m.unit || 'pcs',
          unitPrice: unitCost,
          totalPrice: reqQty * unitCost,
          invMatch,
          alreadyIssued,
          notes: m.notes || ''
        }
      })

      const matTotal = allMats.reduce((s: number, m: any) => s + m.totalPrice, 0)

      list.push({
        bIdx: 0,
        partId: 1,
        title: 'Bill of Materials (Work Order Direct)',
        description: 'Allocated materials and routing steps for this manufacturing order',
        autoMats: allMats,
        manualMats: [],
        allMaterials: allMats,
        machiningOps: operations.map((op: any, oIdx: number) => ({
          id: op.id || `op-${oIdx}`,
          procName: op.operationName,
          partPrefix: '',
          quoHr: Number(op.plannedHours || 1),
          estHr: Number(op.plannedHours || 1),
          setTime: 0,
          hrRate: Number(op.hourlyLaborRate || 750),
          setTimeRate: 0,
          cost: Number(op.plannedHours || 1) * (Number(op.hourlyLaborRate || 750) + Number(op.hourlyMachineRate || 1200)),
          matchedOp: op
        })),
        matTotal,
        machTotal: operations.reduce((acc: number, o: any) => acc + (Number(o.plannedHours || 1) * 1950), 0),
        bomTotal: matTotal,
        totalQuotedHours: operations.reduce((acc: number, o: any) => acc + Number(o.plannedHours || 0), 0),
        totalEstHours: operations.reduce((acc: number, o: any) => acc + Number(o.plannedHours || 0), 0)
      })
    }

    return list
  }, [linkedQuote, wo.bom, operations, inventory, issuedMaterials, directBomItems])

  // Total Quoted Machining Hours across all BOMs
  const grandTotalQuotedMachiningHours = useMemo(() => {
    return parsedBoms.reduce((acc: number, b: any) => acc + (b.totalQuotedHours || 0), 0)
  }, [parsedBoms])

  // Total Planned Materials across all BOMs
  const grandTotalPlannedMaterials = useMemo(() => {
    return parsedBoms.reduce((acc: number, b: any) => acc + (b.allMaterials?.length || 0), 0)
  }, [parsedBoms])

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Closed':
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 flex items-center gap-1.5"><CheckCircle2 size={12}/> Completed</span>
      case 'In Progress':
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5"><Play size={12} className="fill-blue-500/30"/> In Production</span>
      case 'QC Pending':
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><ShieldCheck size={12}/> QC Inspection</span>
      case 'Rework':
      case 'Rework Required':
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse"><RotateCcw size={12}/> Rework In Progress</span>
      case 'Released':
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5"><ArrowRight size={12}/> Released</span>
      default:
        return <span className="px-2.5 py-1 rounded-none text-xs font-bold bg-surface2 text-muted border border-theme-subtle flex items-center gap-1.5"><Clock size={12}/> {status || 'Draft'}</span>
    }
  }

  // Handle Status Update
  const handleStatusChange = async (newStatus: string) => {
    try {
      setSubmitting(true)
      await updateWorkOrderStatus(wo.id, newStatus)
      notify('success', `Work Order status updated to ${newStatus}`)
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  // Operation Timer Action
  const handleOpTimerAction = async (opId: string, actionStatus: string) => {
    try {
      setSubmitting(true)
      await updateWorkOrderOperationStatus(opId, actionStatus)
      notify('success', `Operation timer: ${actionStatus}`)
      loadData()
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
      loadData()
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
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to add operation')
    } finally {
      setSubmitting(false)
    }
  }

  // Sync Single Process to Floor Routing
  const handleSyncSingleOpToFloor = async (proc: any) => {
    try {
      setSubmitting(true)
      const opName = `${proc.partPrefix || ''}${proc.procName}`
      await addWorkOrderOperation(wo.id, {
        operationName: opName,
        plannedHours: proc.quoHr || proc.estHr || 1,
        hourlyLaborRate: proc.hrRate || 750,
        hourlyMachineRate: 1200,
        notes: `Quoted hours: ${proc.quoHr}h | Setup: ${proc.setTime}h`
      })
      notify('success', `Synced ${opName} to Shopfloor Routing!`)
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to sync operation')
    } finally {
      setSubmitting(false)
    }
  }

  // Sync All Operations from all BOMs to Floor Routing
  const handleSyncAllBomsToFloor = async () => {
    try {
      setSubmitting(true)
      let count = 0
      for (const b of parsedBoms) {
        for (const proc of b.machiningOps) {
          if (!proc.matchedOp) {
            const opName = `${proc.partPrefix || ''}${proc.procName}`
            await addWorkOrderOperation(wo.id, {
              operationName: opName,
              plannedHours: proc.quoHr || proc.estHr || 1,
              hourlyLaborRate: proc.hrRate || 750,
              hourlyMachineRate: 1200,
              notes: `Quoted hours: ${proc.quoHr}h | Setup: ${proc.setTime}h`
            })
            count++
          }
        }
      }
      notify('success', `Synced ${count} quotation process step(s) to Shopfloor Routing!`)
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to sync operations')
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
      loadData()
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
      loadData()
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
      loadData()
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
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to complete Work Order')
    } finally {
      setSubmitting(false)
    }
  }

  // Save BOM to Work Order
  const handleSaveBOMToWorkOrder = async (bomsToSave: any[]) => {
    try {
      setSubmitting(true)
      await updateWorkOrder(wo.id, { bom: bomsToSave })
      notify('success', `Saved ${bomsToSave.length} BOM requirement(s) to Work Order #${wo.id}`)
      loadData()
    } catch (e: any) {
      notify('error', e.message || 'Failed to save BOM')
    } finally {
      setSubmitting(false)
    }
  }

  // Add Manual BOM Material Submit
  const handleAddBomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addBomForm.material.trim()) {
      notify('error', 'Material name is required')
      return
    }
    const currentDirect = directBomItems.length > 0 ? directBomItems : (parsedBoms[0]?.allMaterials || [])
    const updated = [...currentDirect, { ...addBomForm }]
    await handleSaveBOMToWorkOrder(updated)
    setShowAddBomModal(false)
    setAddBomForm({ material: '', qty: 1, unit: 'pcs', unitCost: 0, notes: '' })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw size={36} className="animate-spin text-secondary"/>
        <p className="text-sm font-bold text-secondary">Loading Work Order #{id} & Engineering BOM...</p>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle size={48} className="mx-auto text-amber-500"/>
        <h2 className="text-xl font-bold text-primary">Work Order Not Found</h2>
        <p className="text-xs text-muted">The requested work order #{id} could not be located in the database.</p>
        <Button variant="primary" onClick={() => navigate('/production')} className="rounded-none">
          <ArrowLeft size={14} className="mr-1.5"/> Return to Work Orders
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-none shadow-lg border text-xs font-bold flex items-center gap-2 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          toastMsg.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
          'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-theme'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── BREADCRUMBS & TOP NAVIGATION BAR ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <button 
              onClick={() => navigate('/production')}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
            >
              <ArrowLeft size={13}/> Work Orders
            </button>
            <span>/</span>
            <span className="font-mono font-bold text-primary">{wo.orderNo || wo.id}</span>
            {linkedQuote && (
              <>
                <span>/</span>
                <span className="text-muted flex items-center gap-1">
                  Quote: <strong className="text-secondary font-mono">{linkedQuote.data?.quotationNo || linkedQuote.docNo || linkedQuote.id}</strong>
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2.5">
            {wo.title || 'Precision Machining Job'}
          </h1>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={wo.status || 'Pending'} 
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={submitting}
            className="input-base text-xs py-1.5 px-3 bg-surface2 text-primary border-theme-subtle rounded-none font-bold cursor-pointer hover:border-theme transition-colors"
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
            className="text-xs rounded-none border border-rex-500/40 text-rex-600 dark:text-rex-400 hover:bg-rex-500/10 font-bold"
          >
            <Plus size={13} className="mr-1"/> Issue Material
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/inventory', { state: { openCutStudioWithJobRef: wo.orderNo || wo.id, tab: 'linear_remnants' } })}
            className="text-xs rounded-none border border-theme text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
            title="Cut raw bars or use offcuts in Cut Studio"
          >
            <Scissors size={13} className="mr-1 text-amber-500"/> Cut Studio
          </Button>

          {wo.status !== 'Completed' && (
            <Button 
              size="sm" 
              onClick={() => setShowCompleteModal(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none border-none"
            >
              <CheckCircle2 size={13} className="mr-1"/> Complete Job
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.print()} 
            className="text-xs text-muted hover:text-primary rounded-none border border-theme-subtle"
            title="Print Job Sheet / Traveler"
          >
            <Printer size={14}/>
          </Button>
        </div>
      </div>

      {/* ── TOP HERO SUMMARY BANNER (FULL WIDTH THEMED) ─────────────────────────── */}
      <GlassCard className="p-4 rounded-none border-theme-subtle space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs font-bold tracking-wider bg-rex-500/10 text-rex-600 dark:text-rex-400 px-3 py-1 rounded-none border border-rex-500/30">
              {wo.orderNo || wo.id}
            </span>
            <span className="font-mono text-[11px] text-muted bg-surface2 px-2 py-0.5 rounded-none border border-theme-subtle">
              ID: {wo.id}
            </span>
            <Badge 
              value={wo.priority || 'Normal'} 
              variant={wo.priority === 'Urgent' ? 'error' : wo.priority === 'High' ? 'warning' : 'default'} 
              className="rounded-none"
            />
            {getStatusBadge(wo.status)}

            {wo.customerName && (
              <span className="flex items-center gap-1.5 text-xs text-secondary font-medium ml-2">
                <Building size={14} className="text-secondary"/> {wo.customerName}
              </span>
            )}

            <span className="flex items-center gap-1.5 text-xs text-secondary font-mono ml-2">
              <Package size={14} className="text-amber-500"/> Target: <strong className="text-primary">{wo.jobQty || 1}</strong> pcs
              {Number(wo.completedQty || 0) > 0 && <span className="text-emerald-600 font-bold ml-1">({wo.completedQty} done)</span>}
              {Number(wo.scrapQty || 0) > 0 && <span className="text-rose-500 font-bold ml-1">({wo.scrapQty} scrap)</span>}
            </span>

            {wo.deadline && (
              <span className="flex items-center gap-1.5 text-xs text-secondary ml-2">
                <Calendar size={14} className="text-secondary"/> Due: {new Date(wo.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-muted uppercase tracking-wider block font-bold">Planned BOM Breakdown</span>
              <span className="text-xs font-bold text-primary">
                {parsedBoms.length} Part{parsedBoms.length !== 1 ? 's' : ''} | {grandTotalPlannedMaterials} Materials | {grandTotalQuotedMachiningHours.toFixed(1)} Quoted Hrs
              </span>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="pt-3 border-t border-theme-subtle grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-surface2/50 p-2.5 border border-theme-subtle rounded-none">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Floor Progress</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface2 border border-theme-subtle rounded-none overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${cost.progress || 0}%` }}
                />
              </div>
              <span className="font-mono font-bold text-primary text-xs">{cost.progress || 0}%</span>
            </div>
            <span className="text-[10px] text-muted mt-0.5 block">
              {cost.completedSteps || 0} / {cost.totalSteps || operations.length} Steps Done
            </span>
          </div>

          <div className="bg-surface2/50 p-2.5 border border-theme-subtle rounded-none">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Direct Material Cost</span>
            <p className="text-sm font-mono font-bold text-primary">
              {formatCurrency(cost.materialCost || 0)}
            </p>
            <span className="text-[10px] text-muted mt-0.5 block">{issuedMaterials.length} items logged</span>
          </div>

          <div className="bg-surface2/50 p-2.5 border border-theme-subtle rounded-none">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Labor + Machining</span>
            <p className="text-sm font-mono font-bold text-primary">
              {formatCurrency((cost.laborCost || 0) + (cost.machineCost || 0))}
            </p>
            <span className="text-[10px] text-muted mt-0.5 block">
              Lab: {formatCurrency(cost.laborCost || 0)} | Mac: {formatCurrency(cost.machineCost || 0)}
            </span>
          </div>

          <div className="bg-surface2/50 p-2.5 border border-theme-subtle rounded-none">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Actual Total Cost</span>
            <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cost.actualTotalCost || 0)}
            </p>
            <span className="text-[10px] text-muted mt-0.5 block">
              Target: {formatCurrency(cost.estimatedCost || 0)}
            </span>
          </div>

          <div className="bg-surface2/50 p-2.5 border border-theme-subtle rounded-none">
            <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Quoted Machining</span>
            <p className="text-sm font-mono font-bold text-primary">
              {grandTotalQuotedMachiningHours.toFixed(1)} hrs
            </p>
            <span className="text-[10px] text-muted mt-0.5 block">
              {operations.reduce((s: number, o: any) => s + Number(o.actualHours || 0), 0).toFixed(1)} hrs logged
            </span>
          </div>
        </div>
      </GlassCard>

      {/* ── MAIN NAVIGATION TABS (SHARP EDGES, FLAT THEME) ───────────────────────── */}
      <div className="flex items-center gap-1 border-b border-theme-subtle pb-0 overflow-x-auto">
        {[
          { id: 'bom', label: '1. BOM & Machining Plan', icon: ClipboardList, count: parsedBoms.length },
          { id: 'routing', label: '2. Shop Floor Routing & Timers', icon: Layers, count: operations.length },
          { id: 'materials', label: '3. Material Issuance Ledger', icon: Package, count: issuedMaterials.length },
          { id: 'qc_rework', label: '4. QC & Rework Loop', icon: ShieldCheck, count: reworkLogs.filter(r => r.status !== 'Resolved').length },
          { id: 'costing', label: '5. Job Costing & Financials', icon: DollarSign }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`px-4 py-2.5 rounded-none text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border-b-2 ${
                isActive 
                  ? 'border-rex-600 text-rex-600 dark:text-rex-400 font-bold bg-rex-500/10' 
                  : 'border-transparent text-muted hover:text-primary hover:bg-surface2/30'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-rex-600' : 'text-muted'}/>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-none font-mono font-bold ${
                  isActive ? 'bg-rex-600 text-white' : 'bg-surface2 text-muted border border-theme-subtle'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── TAB 1: BOM BY BOM BREAKDOWN (MATERIALS & MACHINING HOURS) ─────────────── */}
      {activeTab === 'bom' && (
        <div className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ClipboardList size={16} className="text-rex-600"/>
                Engineering Bill of Materials & Quoted Machining Hours (BOM by BOM)
              </h3>
              <p className="text-xs text-muted">
                Structured multi-part quotation specifications, raw materials, cutting parameters, and machining operations.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {operations.length === 0 && grandTotalQuotedMachiningHours > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncAllBomsToFloor}
                  disabled={submitting}
                  className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white inline-flex items-center shadow-xs"
                >
                  <Sparkles size={13} className="mr-1.5"/> Sync All BOM Steps to Shopfloor
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBomModal(true)}
                className="rounded-none text-xs border border-rex-500/40 text-rex-600 dark:text-rex-400 hover:bg-rex-500/10 font-bold inline-flex items-center"
              >
                <Plus size={13} className="mr-1"/> Add Material / Component
              </Button>
            </div>
          </div>

          {/* Quotation Link Callout Banner */}
          {linkedQuote && (
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-amber-500 shrink-0"/>
                <div>
                  <strong className="text-primary font-bold">Linked Quotation ({linkedQuote?.data?.quotationNo || linkedQuote?.docNo || linkedQuote?.id}):</strong>
                  <span className="text-secondary ml-1.5">
                    Loaded {parsedBoms.length} BOM part(s) with {grandTotalPlannedMaterials} materials and {grandTotalQuotedMachiningHours.toFixed(1)} quoted machining hours.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/crm/quotations`)}
                  className="rounded-none text-xs border border-theme text-primary hover:bg-surface2"
                >
                  <ExternalLink size={12} className="mr-1"/> View Quotation
                </Button>
              </div>
            </div>
          )}

          {/* BOM BY BOM CARDS LOOP */}
          {parsedBoms.length === 0 ? (
            <div className="p-12 text-center bg-surface2/30 rounded-none border border-dashed border-theme-subtle text-xs text-muted space-y-3">
              <ClipboardList size={36} className="mx-auto text-muted/60"/>
              <div>
                <p className="font-semibold text-primary">No BOM parts found for this work order.</p>
                <p className="text-secondary text-[11px] mt-0.5">
                  You can add BOM materials manually or sync directly from linked quotations.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBomModal(true)}
                className="rounded-none text-xs font-bold border-theme inline-flex items-center gap-1.5"
              >
                <Plus size={13}/> Add BOM Requirement
              </Button>
            </div>
          ) : (
            parsedBoms.map((bom, bIdx) => {
              return (
                <GlassCard key={bom.partId || bIdx} className="p-0 border-theme-subtle rounded-none overflow-hidden space-y-0">
                  {/* Part Header */}
                  <div className="p-4 bg-surface2/70 border-b border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-surface text-secondary px-2.5 py-0.5 rounded-none border border-theme-subtle">
                          Part {bIdx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-primary">
                          {bom.title}
                        </h4>
                        {bom.drawingNo && (
                          <span className="font-mono text-[11px] text-muted bg-surface px-2 py-0.5 rounded-none border border-theme-subtle">
                            Dwg: {bom.drawingNo}
                          </span>
                        )}
                        {bom.partNo && (
                          <span className="font-mono text-[11px] text-muted bg-surface px-2 py-0.5 rounded-none border border-theme-subtle">
                            Part #: {bom.partNo}
                          </span>
                        )}
                      </div>
                      {bom.description && (
                        <p className="text-xs text-secondary">{bom.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-muted uppercase block">Part Quoted Hours</span>
                        <strong className="text-primary font-bold">{bom.totalQuotedHours.toFixed(1)} hrs</strong>
                      </div>
                      <div className="text-right border-l border-theme-subtle pl-4">
                        <span className="text-[10px] text-muted uppercase block">Part Est. Total</span>
                        <strong className="text-emerald-600 font-bold">{formatCurrency(bom.bomTotal)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* 1. PLANNED MATERIALS TABLE FOR THIS BOM */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <Package size={13} className="text-secondary"/>
                          Planned Materials & Stock Requirements ({bom.allMaterials.length})
                        </h5>
                        <span className="text-xs font-mono text-muted">
                          Subtotal: <strong className="text-primary">{formatCurrency(bom.matTotal)}</strong>
                        </span>
                      </div>

                      {bom.allMaterials.length === 0 ? (
                        <div className="p-4 text-center bg-surface2/20 border border-dashed border-theme-subtle text-xs text-muted">
                          No materials specified for this part.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-theme-subtle rounded-none">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Material Name & Dimensions</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3 text-right">Required Qty</th>
                                <th className="py-2 px-3 text-right">Est. Unit Cost</th>
                                <th className="py-2 px-3 text-right">Total Cost</th>
                                <th className="py-2 px-3 text-center">Stock Level</th>
                                <th className="py-2 px-3 text-center">Status</th>
                                <th className="py-2 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle">
                              {bom.allMaterials.map((mat: any, mIdx: number) => {
                                const inStock = mat.invMatch ? Number(mat.invMatch.quantity || 0) : 0
                                const hasStock = inStock >= mat.qty

                                return (
                                  <tr key={mat.id || mIdx} className="hover:bg-surface2/30">
                                    <td className="py-2 px-3 text-muted font-mono">{mIdx + 1}</td>
                                    <td className="py-2 px-3 font-semibold text-primary">
                                      {mat.material}
                                      {mat.spec && (
                                        <span className="block text-[10px] text-muted font-mono font-normal">
                                          {mat.spec}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-muted font-mono text-[11px]">
                                      {mat.profile || 'Raw Stock'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold">
                                      {mat.qty} {mat.unit || 'pcs'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-muted">
                                      {formatCurrency(mat.unitPrice || 0)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                                      {formatCurrency(mat.totalPrice || 0)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {mat.invMatch ? (
                                        hasStock ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                            <Check size={9}/> In Stock ({inStock})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            <AlertTriangle size={9}/> Shortage ({inStock})
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[10px] text-muted italic">Non-catalog</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {mat.alreadyIssued ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                          <CheckCircle2 size={10}/> Issued
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-muted px-2 py-0.5 rounded-none bg-surface2 border border-theme-subtle">
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setIssueForm({
                                              inventoryId: mat.invMatch ? mat.invMatch.id : '',
                                              materialName: mat.material,
                                              qty: mat.qty,
                                              unit: mat.unit || 'pcs',
                                              unitCost: Number(mat.unitPrice || mat.invMatch?.unitCost || 0),
                                              notes: `Issued against ${bom.title}: ${mat.material}`
                                            })
                                            setShowIssueModal(true)
                                          }}
                                          className="text-[11px] py-1 px-2.5 h-auto border border-rex-500/40 text-rex-600 dark:text-rex-400 hover:bg-rex-500/10 rounded-none font-bold inline-flex items-center"
                                          title="Issue this material directly to this job"
                                        >
                                          <Package size={11} className="mr-1"/> Issue Material
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            navigate('/inventory', {
                                              state: {
                                                openCutStudioWithJobRef: wo.orderNo || wo.id,
                                                cutMaterial: mat.material,
                                                cutLength: mat.length || mat.spec?.match(/L:\s*(\d+(\.\d+)?)/i)?.[1] || null,
                                                cutQty: mat.qty,
                                                tab: 'linear_remnants'
                                              }
                                            })
                                          }}
                                          className="text-[11px] py-1 px-2 h-auto text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded-none font-semibold inline-flex items-center"
                                          title="Cut raw bars or use offcuts in Cut Studio"
                                        >
                                          <Scissors size={11} className="mr-1 text-amber-500"/> Cut & Issue
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* 2. QUOTATION MACHINING HOURS & PROCESSES FOR THIS BOM */}
                    <div className="space-y-2.5 pt-2 border-t border-theme-subtle">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench size={13} className="text-secondary"/>
                          Quoted Machining Operations & Cycle Times ({bom.machiningOps.length})
                        </h5>
                        <span className="text-xs font-mono text-muted">
                          Machining Hours: <strong className="text-primary font-bold">{bom.totalQuotedHours.toFixed(1)} hrs</strong> | Subtotal: <strong className="text-primary">{formatCurrency(bom.machTotal)}</strong>
                        </span>
                      </div>

                      {bom.machiningOps.length === 0 ? (
                        <div className="p-4 text-center bg-surface2/20 border border-dashed border-theme-subtle text-xs text-muted">
                          No machining hours allocated for this part in quotation.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-theme-subtle rounded-none">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                                <th className="py-2 px-3">Process / Operation</th>
                                <th className="py-2 px-3 text-right">Quoted Machining Hours</th>
                                <th className="py-2 px-3 text-right">Est. Floor Hours</th>
                                <th className="py-2 px-3 text-right">Setup Time</th>
                                <th className="py-2 px-3 text-right">Hourly Rate</th>
                                <th className="py-2 px-3 text-right">Subtotal Cost</th>
                                <th className="py-2 px-3 text-center">Floor Status</th>
                                <th className="py-2 px-3">Assigned Machine / Tech</th>
                                <th className="py-2 px-3 text-right">Floor Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle">
                              {bom.machiningOps.map((proc: any, pIdx: number) => {
                                const matchedOp = proc.matchedOp
                                const isRunning = matchedOp?.status === 'In Progress'
                                const isDone = matchedOp?.status === 'Completed'
                                const isPaused = matchedOp?.status === 'Paused'

                                return (
                                  <tr key={proc.id || pIdx} className={`hover:bg-surface2/30 ${isRunning ? 'bg-blue-500/5' : ''}`}>
                                    <td className="py-2.5 px-3 font-bold text-primary flex items-center gap-1.5">
                                      <Wrench size={12} className="text-secondary shrink-0"/>
                                      <span>{proc.procName}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                                      {proc.quoHr.toFixed(1)} hrs
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-muted">
                                      {proc.estHr > 0 ? `${proc.estHr.toFixed(1)} hrs` : '-'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-muted">
                                      {proc.setTime > 0 ? `${proc.setTime.toFixed(1)} hrs` : '-'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-muted">
                                      {formatCurrency(proc.hrRate)}/hr
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                                      {formatCurrency(proc.cost)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {matchedOp ? (
                                        isDone ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-green-500/10 text-green-600 border border-green-500/20">
                                            <Check size={10}/> Done
                                          </span>
                                        ) : isRunning ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">
                                            <Play size={9} className="fill-blue-500"/> Machining Now ({matchedOp.actualHours}h)
                                          </span>
                                        ) : isPaused ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            <Pause size={9}/> Paused
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-surface2 text-muted border border-theme-subtle">
                                            <Clock size={9}/> Pending
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[10px] text-muted italic">Not in routing</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-secondary text-[11px]">
                                      {matchedOp ? (
                                        <div className="space-y-0.5">
                                          <span className="block truncate font-medium text-primary">
                                            {matchedOp.machineName || 'Any Machine'}
                                          </span>
                                          <span className="block text-[10px] text-muted truncate">
                                            {matchedOp.employeeName || 'Unassigned Tech'}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-muted text-[10px]">Unscheduled</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      {matchedOp ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          {!isDone && (
                                            <>
                                              {!isRunning ? (
                                                <Button
                                                  variant="primary"
                                                  size="sm"
                                                  onClick={() => handleOpTimerAction(matchedOp.id, 'In Progress')}
                                                  disabled={submitting}
                                                  className="text-[11px] py-1 px-2 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-none border-none"
                                                  title="Start floor timer"
                                                >
                                                  <Play size={10} className="mr-1 fill-white"/> Start
                                                </Button>
                                              ) : (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleOpTimerAction(matchedOp.id, 'Paused')}
                                                  disabled={submitting}
                                                  className="text-[11px] py-1 px-2 h-auto text-amber-600 border border-amber-500/30 hover:bg-amber-500/10 rounded-none"
                                                  title="Pause timer"
                                                >
                                                  <Pause size={10} className="mr-1"/> Pause
                                                </Button>
                                              )}

                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpTimerAction(matchedOp.id, 'Completed')}
                                                disabled={submitting}
                                                className="text-[11px] py-1 px-2 h-auto text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-none font-semibold"
                                                title="Complete operation"
                                              >
                                                <Check size={10} className="mr-1"/> Complete
                                              </Button>
                                            </>
                                          )}

                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setShowQcModal(matchedOp)
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
                                            className="text-[11px] py-1 px-2 h-auto text-secondary border border-theme hover:bg-surface2 rounded-none"
                                            title="QC inspection"
                                          >
                                            <ShieldCheck size={10}/>
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => handleSyncSingleOpToFloor(proc)}
                                          disabled={submitting}
                                          className="text-[11px] py-1 px-2.5 h-auto bg-rex-600 hover:bg-rex-700 text-white rounded-none font-bold inline-flex items-center shadow-xs"
                                          title="Add this quotation machining process to active shop floor routing"
                                        >
                                          <Plus size={10} className="mr-1"/> Add to Routing
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Part Summary Footer */}
                  <div className="p-3 bg-surface2/40 border-t border-theme-subtle flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Part Total: <strong className="text-primary">{bom.allMaterials.length} Materials</strong> | <strong className="text-primary">{bom.machiningOps.length} Operations</strong>
                    </span>
                    <div className="flex items-center gap-4 font-mono font-bold">
                      <span className="text-muted">Materials: {formatCurrency(bom.matTotal)}</span>
                      <span className="text-secondary">Machining: {formatCurrency(bom.machTotal)}</span>
                      <span className="text-emerald-600 font-black pl-3 border-l border-theme-subtle">
                        Part Total: {formatCurrency(bom.bomTotal)}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      )}


      {/* ── TAB 2: SHOP FLOOR ROUTING & TIMERS ─────────────────────────────────────── */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Layers size={16} className="text-secondary"/>
                Manufacturing Routing & Step-by-Step Operations
              </h3>
              <p className="text-xs text-muted">
                Sequential workshop processes with real-time timers, machine scheduling, and operator logging.
              </p>
            </div>

            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowAddOpModal(true)}
              className="text-xs bg-rex-600 hover:bg-rex-700 text-white rounded-none font-bold shadow-xs"
            >
              <Plus size={13} className="mr-1"/> Add Operation Step
            </Button>
          </div>

          {operations.length === 0 ? (
            <GlassCard className="p-12 text-center border-dashed border-theme-subtle rounded-none space-y-3">
              <Layers size={36} className="mx-auto text-muted/60" />
              <div>
                <p className="text-sm font-bold text-primary">No routing steps defined for this job yet.</p>
                <p className="text-xs text-muted mt-0.5">
                  Load operations from quotation BOM or add manual steps.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                {grandTotalQuotedMachiningHours > 0 && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSyncAllBomsToFloor} 
                    disabled={submitting}
                    className="bg-rex-600 hover:bg-rex-700 text-white font-bold rounded-none shadow-xs"
                  >
                    <Sparkles size={13} className="mr-1.5"/> Load Steps from Quotation BOM
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowAddOpModal(true)} className="rounded-none font-semibold">
                  <Plus size={13} className="mr-1"/> Add Operation Manually
                </Button>
              </div>
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
                    className={`p-4 border rounded-none transition-all ${
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
                        <div className={`w-8 h-8 rounded-none flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-green-500/10 text-green-600 border border-green-500/20">
                                <Check size={10}/> Done
                              </span>
                            )}
                            {isRunning && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse">
                                <Play size={10} className="fill-blue-500"/> Machining Now
                              </span>
                            )}
                            {isPaused && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <Pause size={10}/> Paused
                              </span>
                            )}
                            {isQcPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <ShieldCheck size={10}/> QC Inspection Ready
                              </span>
                            )}
                            {isRework && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                <RotateCcw size={10}/> Rework Required
                              </span>
                            )}
                          </div>

                          {/* Assigned Machine & Operator */}
                          <div className="flex items-center gap-4 text-xs text-secondary flex-wrap pt-0.5">
                            <span className="inline-flex items-center gap-1.5">
                              <Cpu size={13} className="text-secondary"/>
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
                            <p className="text-[11px] text-muted bg-surface2/40 px-2 py-1 rounded-none border border-theme-subtle inline-block mt-1">
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
                        <div className="h-1.5 bg-surface2 rounded-none overflow-hidden border border-theme-subtle">
                          <div 
                            className={`h-full rounded-none transition-all ${
                              actualHrs > plannedHrs ? 'bg-rose-500' : 'bg-blue-600'
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
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-none font-bold"
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
                                className="text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10 rounded-none font-bold"
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
                              className="text-xs text-green-600 border-green-500/30 hover:bg-green-500/10 rounded-none font-bold"
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
                          className="text-xs text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none font-bold"
                          title="Inspect quality and record pass/rework/scrap"
                        >
                          <ShieldCheck size={12} className="mr-1"/> QC
                        </Button>

                        <button 
                          type="button" 
                          onClick={() => handleDeleteOp(op.id, op.operationName)}
                          className="p-1.5 text-muted hover:text-rose-500 rounded-none hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
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

      {/* ── TAB 3: MATERIAL ISSUANCE & STOCK LEDGER ──────────────────────────────── */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Package size={16} className="text-secondary"/>
                Material Allocation, Cutting & Stock Ledger Traceability
              </h3>
              <p className="text-xs text-muted">
                Audit trail of all raw materials issued from inventory with batch/lot references and costing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/inventory', { state: { openCutStudioWithJobRef: wo.orderNo || wo.id, tab: 'linear_remnants' } })}
                className="text-xs font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10 rounded-none"
              >
                <Scissors size={13} className="mr-1"/> Open Cut Studio
              </Button>

              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setShowIssueModal(true)}
                className="text-xs bg-rex-600 hover:bg-rex-700 text-white rounded-none font-bold shadow-xs"
              >
                <Plus size={13} className="mr-1"/> Direct Issue Material
              </Button>
            </div>
          </div>

          {issuedMaterials.length === 0 ? (
            <div className="p-12 text-center bg-surface2/30 rounded-none border border-dashed border-theme-subtle text-xs text-muted space-y-3">
              <Package size={36} className="mx-auto text-muted/60"/>
              <div>
                <p className="font-semibold text-primary">No materials issued from stock yet.</p>
                <p className="text-secondary text-[11px] mt-0.5">
                  Click 'Direct Issue Material' or use 'Cut & Issue' from BOM to log material consumption.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowIssueModal(true)}
                className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
              >
                <Plus size={13} className="mr-1"/> Direct Issue Material
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-none border border-theme-subtle">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Material Description</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3">Notes / Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle">
                  {issuedMaterials.map((mat: any, i: number) => (
                    <tr key={mat.id || i} className="hover:bg-surface2/30">
                      <td className="py-2.5 px-3 font-mono text-muted">
                        {mat.date ? new Date(mat.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-primary">
                        {mat.itemName || mat.materialName || 'Raw Material'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted text-[11px]">
                        {mat.itemSku || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                        {mat.quantity} {mat.itemUom || mat.unit || 'pcs'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted">
                        {formatCurrency(mat.unitCost || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(mat.totalCost || (Number(mat.quantity || 1) * Number(mat.unitCost || 0)))}
                      </td>
                      <td className="py-2.5 px-3 text-muted">
                        {mat.notes || mat.reference || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: QC INSPECTION & REWORK LOOP ─────────────────────────────────────── */}
      {activeTab === 'qc_rework' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck size={16} className="text-secondary"/>
                Quality Control (QC) Gates & Rework Ticket Tracking
              </h3>
              <p className="text-xs text-muted">
                Inspection reports, defect logging, rework tickets, and supervisor sign-offs.
              </p>
            </div>
          </div>

          {/* Rework Tickets Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <RotateCcw size={14} className="text-amber-500"/> Active Rework Tickets ({reworkLogs.length})
            </h4>

            {reworkLogs.length === 0 ? (
              <div className="p-8 text-center bg-surface2/30 rounded-none border border-dashed border-theme-subtle text-xs text-muted">
                No rework tickets logged for this work order. High first-pass yield!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reworkLogs.map((rw: any) => (
                  <GlassCard key={rw.id} className="p-3.5 border-theme-subtle rounded-none space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-500">Ticket #{rw.id}</span>
                      <Badge 
                        value={rw.status || 'Pending'} 
                        variant={rw.status === 'Resolved' ? 'success' : 'error'} 
                        className="rounded-none"
                      />
                    </div>
                    <p className="text-xs font-bold text-primary">{rw.defectReason || 'Quality Defect'}</p>
                    {rw.actionTaken && (
                      <p className="text-[11px] text-secondary bg-surface2/50 p-1.5 rounded-none border border-theme-subtle">
                        <strong>Action:</strong> {rw.actionTaken}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-theme-subtle">
                      <span>Rework Cost: {formatCurrency(rw.cost || 0)}</span>
                      {rw.status !== 'Resolved' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setShowReworkModal(rw)
                            setReworkForm({
                              id: rw.id,
                              status: 'Resolved',
                              actionTaken: rw.actionTaken || '',
                              assignedEmployeeId: rw.assignedEmployeeId || '',
                              machineId: rw.machineId || '',
                              hours: rw.hours || 1,
                              cost: rw.cost || 0,
                              notes: rw.notes || '',
                              resolvedBy: 'QA Supervisor'
                            })
                          }}
                          className="text-[11px] py-1 px-2 h-auto text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none font-bold"
                        >
                          Resolve Ticket
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* QC Inspection Audit Trail */}
          <div className="space-y-3 pt-4 border-t border-theme-subtle">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={14} className="text-secondary"/> QC Inspection Log ({qcInspections.length})
            </h4>

            {qcInspections.length === 0 ? (
              <div className="p-8 text-center bg-surface2/30 rounded-none border border-dashed border-theme-subtle text-xs text-muted">
                No QC inspections logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-none border border-theme-subtle">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Operation / Step</th>
                      <th className="py-2.5 px-3">Inspector</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Sample / Defect Qty</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle">
                    {qcInspections.map((qc: any, i: number) => (
                      <tr key={qc.id || i} className="hover:bg-surface2/30">
                        <td className="py-2.5 px-3 font-mono text-muted">
                          {qc.createdAt ? new Date(qc.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-primary">
                          {qc.operationName || qc.operationId || 'Operation'}
                        </td>
                        <td className="py-2.5 px-3 text-secondary">
                          {qc.inspectedBy || 'QA Inspector'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-none font-bold text-[10px] inline-flex items-center gap-1 ${
                            qc.status === 'Pass' 
                              ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          }`}>
                            {qc.status === 'Pass' ? <Check size={10}/> : <AlertTriangle size={10}/>}
                            {qc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {qc.sampleQty || 1} sample / <strong className="text-rose-500">{qc.defectQty || 0}</strong> defect
                        </td>
                        <td className="py-2.5 px-3 text-muted">
                          {qc.notes || qc.defectReason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: JOB COSTING & FINANCIALS ───────────────────────────────────────── */}
      {activeTab === 'costing' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <DollarSign size={16} className="text-secondary"/>
                Manufacturing Cost Rollup & Variance Financials
              </h3>
              <p className="text-xs text-muted">
                Material + Labor + Machine + Rework cost analysis against estimated target.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-4 border-theme-subtle rounded-none space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">1. Material Cost Rollup</span>
              <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(cost.materialCost || 0)}</p>
              <span className="text-xs text-muted block">{issuedMaterials.length} items logged in Stock Ledger</span>
            </GlassCard>

            <GlassCard className="p-4 border-theme-subtle rounded-none space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">2. Machining & Labor Cost</span>
              <p className="text-2xl font-mono font-bold text-primary">
                {formatCurrency((cost.laborCost || 0) + (cost.machineCost || 0))}
              </p>
              <div className="text-xs text-muted space-y-0.5">
                <div className="flex justify-between">
                  <span>Labor Cost:</span>
                  <span className="font-mono">{formatCurrency(cost.laborCost || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Machine Wear & Power:</span>
                  <span className="font-mono">{formatCurrency(cost.machineCost || 0)}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 border-theme-subtle rounded-none space-y-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">3. Total Actual vs Target</span>
              <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cost.actualTotalCost || 0)}
              </p>
              <div className="text-xs text-muted space-y-0.5">
                <div className="flex justify-between">
                  <span>Estimated Budget:</span>
                  <span className="font-mono">{formatCurrency(cost.estimatedCost || 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Variance:</span>
                  <span className={`font-mono ${cost.variance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {cost.variance > 0 ? `+${formatCurrency(cost.variance)} (Over)` : `${formatCurrency(cost.variance)} (Under)`}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── SUB-MODAL: DIRECT MATERIAL ISSUE (WITH QUOTE QUICK SELECTOR) ─────────── */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Direct Material Issue to Work Order" size="lg">
        <form onSubmit={handleIssueMaterialSubmit} className="p-4 space-y-4">
          {/* Quick BOM material selector */}
          {parsedBoms.length > 0 && (
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-none space-y-2">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-secondary"/> Select from Planned BOM Requirements
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
                {parsedBoms.flatMap(b => b.allMaterials).map((bomMat: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIssueForm({
                        inventoryId: bomMat.invMatch ? bomMat.invMatch.id : '',
                        materialName: bomMat.material,
                        qty: bomMat.qty,
                        unit: bomMat.unit || 'pcs',
                        unitCost: Number(bomMat.unitPrice || bomMat.invMatch?.unitCost || 0),
                        notes: `Issued for ${bomMat.material}`
                      })
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-surface border border-theme-subtle hover:border-rex-500/50 hover:bg-rex-500/5 rounded-none text-left transition-colors cursor-pointer truncate max-w-xs"
                    title={bomMat.material}
                  >
                    <strong className="text-primary">{bomMat.material}</strong>
                    <span className="text-muted ml-1">({bomMat.qty} {bomMat.unit})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Select Inventory Stock Item</label>
              <select
                value={issueForm.inventoryId}
                onChange={(e) => {
                  const inv = inventory.find(i => i.id === e.target.value)
                  setIssueForm({
                    ...issueForm,
                    inventoryId: e.target.value,
                    materialName: inv ? inv.name : issueForm.materialName,
                    unit: inv?.uom || issueForm.unit,
                    unitCost: Number(inv?.unitCost || issueForm.unitCost)
                  })
                }}
                className="w-full input-base text-xs rounded-none"
              >
                <option value="">-- Choose from Catalog --</option>
                {inventory.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.sku}) - Avail: {inv.quantity} {inv.uom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Material / Custom Name</label>
              <input
                type="text"
                value={issueForm.materialName}
                onChange={(e) => setIssueForm({ ...issueForm, materialName: e.target.value })}
                placeholder="e.g. EN24 Round Bar Ø50mm"
                className="w-full input-base text-xs rounded-none font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Issue Quantity</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={issueForm.qty}
                onChange={(e) => setIssueForm({ ...issueForm, qty: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Unit</label>
              <input
                type="text"
                value={issueForm.unit}
                onChange={(e) => setIssueForm({ ...issueForm, unit: e.target.value })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Unit Cost (LKR)</label>
              <input
                type="number"
                step="any"
                value={issueForm.unitCost}
                onChange={(e) => setIssueForm({ ...issueForm, unitCost: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Notes / Lot Reference</label>
            <input
              type="text"
              value={issueForm.notes}
              onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
              placeholder="e.g. Heat batch #2026-X1"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowIssueModal(false)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold shadow-xs">
              {submitting ? 'Issuing...' : 'Confirm Issue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL: ADD OPERATION STEP ────────────────────────────────────────── */}
      <Modal isOpen={showAddOpModal} onClose={() => setShowAddOpModal(false)} title="Add Operation Step" size="md">
        <form onSubmit={handleAddOpSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Operation / Process Name *</label>
            <input
              type="text"
              value={newOpForm.operationName}
              onChange={(e) => setNewOpForm({ ...newOpForm, operationName: e.target.value })}
              placeholder="e.g. Turning, CNC Milling, Surface Grinding"
              className="w-full input-base text-xs rounded-none font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Assign Machine</label>
              <select
                value={newOpForm.machineId}
                onChange={(e) => setNewOpForm({ ...newOpForm, machineId: e.target.value })}
                className="w-full input-base text-xs rounded-none"
              >
                <option value="">-- Any Available Machine --</option>
                {machineries.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Assign Technician / Operator</label>
              <select
                value={newOpForm.employeeId}
                onChange={(e) => setNewOpForm({ ...newOpForm, employeeId: e.target.value })}
                className="w-full input-base text-xs rounded-none"
              >
                <option value="">-- Unassigned --</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role || 'Operator'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Planned Hours</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={newOpForm.plannedHours}
                onChange={(e) => setNewOpForm({ ...newOpForm, plannedHours: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Labor Rate (LKR/h)</label>
              <input
                type="number"
                value={newOpForm.hourlyLaborRate}
                onChange={(e) => setNewOpForm({ ...newOpForm, hourlyLaborRate: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Machine Rate (LKR/h)</label>
              <input
                type="number"
                value={newOpForm.hourlyMachineRate}
                onChange={(e) => setNewOpForm({ ...newOpForm, hourlyMachineRate: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={newOpForm.notes}
              onChange={(e) => setNewOpForm({ ...newOpForm, notes: e.target.value })}
              placeholder="e.g. Maintain tolerance +/- 0.02mm"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowAddOpModal(false)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold shadow-xs">
              {submitting ? 'Adding...' : 'Add Operation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL: QC INSPECTION ─────────────────────────────────────────────── */}
      <Modal isOpen={!!showQcModal} onClose={() => setShowQcModal(null)} title={`QC Inspection: ${showQcModal?.operationName}`} size="md">
        <form onSubmit={handleQcSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Inspection Status</label>
              <select
                value={qcForm.status}
                onChange={(e) => setQcForm({ ...qcForm, status: e.target.value })}
                className="w-full input-base text-xs rounded-none font-bold"
              >
                <option value="Pass">Pass (Meets Spec)</option>
                <option value="Rework">Rework Required</option>
                <option value="Scrap">Scrap / Reject</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Inspector Name</label>
              <input
                type="text"
                value={qcForm.inspectedBy}
                onChange={(e) => setQcForm({ ...qcForm, inspectedBy: e.target.value })}
                className="w-full input-base text-xs rounded-none"
              />
            </div>
          </div>

          {qcForm.status !== 'Pass' && (
            <div className="grid grid-cols-2 gap-3 bg-rose-500/5 p-3 border border-rose-500/20 rounded-none">
              <div>
                <label className="block text-xs font-bold text-rose-500 mb-1">Defect Reason</label>
                <input
                  type="text"
                  value={qcForm.defectReason}
                  onChange={(e) => setQcForm({ ...qcForm, defectReason: e.target.value })}
                  placeholder="e.g. Dimensions out of tolerance"
                  className="w-full input-base text-xs rounded-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-500 mb-1">Defect Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={qcForm.defectQty}
                  onChange={(e) => setQcForm({ ...qcForm, defectQty: Number(e.target.value) })}
                  className="w-full input-base text-xs rounded-none font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Inspection Notes / Measurement Report</label>
            <textarea
              rows={3}
              value={qcForm.notes}
              onChange={(e) => setQcForm({ ...qcForm, notes: e.target.value })}
              placeholder="e.g. Bore measured 45.01mm (spec 45.00 +/- 0.02mm)"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowQcModal(null)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold shadow-xs">
              {submitting ? 'Saving...' : 'Save Inspection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL: REWORK TICKET RESOLUTION ───────────────────────────────────── */}
      <Modal isOpen={!!showReworkModal} onClose={() => setShowReworkModal(null)} title={`Resolve Rework Ticket #${showReworkModal?.id}`} size="md">
        <form onSubmit={handleReworkSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Action Taken / Corrective Measures</label>
            <textarea
              rows={3}
              value={reworkForm.actionTaken}
              onChange={(e) => setReworkForm({ ...reworkForm, actionTaken: e.target.value })}
              placeholder="e.g. Skim cut applied on lathe to bring OD down to 44.98mm"
              className="w-full input-base text-xs rounded-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Rework Hours</label>
              <input
                type="number"
                step="0.1"
                value={reworkForm.hours}
                onChange={(e) => setReworkForm({ ...reworkForm, hours: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Rework Cost (LKR)</label>
              <input
                type="number"
                value={reworkForm.cost}
                onChange={(e) => setReworkForm({ ...reworkForm, cost: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowReworkModal(null)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {submitting ? 'Resolving...' : 'Sign-off Rework'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL: COMPLETE WORK ORDER ───────────────────────────────────────── */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title={`Complete Work Order #${wo.id}`} size="md">
        <form onSubmit={handleCompleteSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-none text-xs text-secondary">
            Signing off will mark all shop floor operations as complete, freeze costs, and record finished batch into Finished Goods Inventory.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Completed Good Qty</label>
              <input
                type="number"
                min="0"
                value={completeForm.completedQty}
                onChange={(e) => setCompleteForm({ ...completeForm, completedQty: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono font-bold text-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Scrapped Qty</label>
              <input
                type="number"
                min="0"
                value={completeForm.scrapQty}
                onChange={(e) => setCompleteForm({ ...completeForm, scrapQty: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono font-bold text-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Handover Bay / Location</label>
            <input
              type="text"
              value={completeForm.finalHandoverLocation}
              onChange={(e) => setCompleteForm({ ...completeForm, finalHandoverLocation: e.target.value })}
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Completion Notes</label>
            <input
              type="text"
              value={completeForm.notes}
              onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              placeholder="e.g. Final inspection passed 100%"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowCompleteModal(false)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {submitting ? 'Finalizing...' : 'Confirm Job Completion'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── SUB-MODAL: ADD MANUAL BOM REQUIREMENT ─────────────────────────────────── */}
      <Modal isOpen={showAddBomModal} onClose={() => setShowAddBomModal(false)} title="Add BOM Material Requirement" size="md">
        <form onSubmit={handleAddBomSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Material Name *</label>
            <input
              type="text"
              value={addBomForm.material}
              onChange={(e) => setAddBomForm({ ...addBomForm, material: e.target.value })}
              placeholder="e.g. Mild Steel Plate 12mm"
              className="w-full input-base text-xs rounded-none font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Required Qty</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={addBomForm.qty}
                onChange={(e) => setAddBomForm({ ...addBomForm, qty: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Unit</label>
              <input
                type="text"
                value={addBomForm.unit}
                onChange={(e) => setAddBomForm({ ...addBomForm, unit: e.target.value })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Unit Cost (LKR)</label>
              <input
                type="number"
                step="any"
                value={addBomForm.unitCost}
                onChange={(e) => setAddBomForm({ ...addBomForm, unitCost: Number(e.target.value) })}
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Dimensions / Spec Notes</label>
            <input
              type="text"
              value={addBomForm.notes}
              onChange={(e) => setAddBomForm({ ...addBomForm, notes: e.target.value })}
              placeholder="e.g. 500x300mm, Grade 43A"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowAddBomModal(false)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold shadow-xs">
              {submitting ? 'Adding...' : 'Add BOM Requirement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
