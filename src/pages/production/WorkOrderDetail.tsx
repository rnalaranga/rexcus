import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Factory, Plus, Search, Layers, Wrench, Clock, CheckCircle2, 
  AlertTriangle, RotateCcw, DollarSign, Package, ClipboardList, Play, 
  Pause, Check, Scissors, ExternalLink, Trash2, Calendar, Building, 
  RefreshCw, TrendingUp, ShieldCheck, ArrowRight, Printer, Sparkles, 
  User, Cpu, AlertCircle, FileText, ChevronRight, ChevronDown, CheckSquare, PackageCheck, Camera
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
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { WorkOrderQCHub } from '@/components/production/WorkOrderQCHub'
import { WorkOrderDispatchesSection } from '@/components/production/WorkOrderDispatchesSection'
import { WorkOrderPartialDispatchModal } from '@/components/production/WorkOrderPartialDispatchModal'
import { WorkOrderMaterialSubstituteModal } from '@/components/production/WorkOrderMaterialSubstituteModal'
import { WorkOrderFullBomAdjustModal } from '@/components/production/WorkOrderFullBomAdjustModal'
import { WorkOrderPrintModal } from '@/components/production/WorkOrderPrintModal'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'
import { findMatchingSamplePhotos } from '@/lib/samplePhotos'
import { Truck, ArrowLeftRight, Calculator } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type DetailTab = 'bom' | 'routing' | 'materials' | 'qc_rework' | 'dispatches' | 'costing'

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
  const [substituteModalMat, setSubstituteModalMat] = useState<any | null>(null)
  const [targetQcOp, setTargetQcOp] = useState<{ partTitle?: string; opName?: string } | null>(null)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Sub-Modals
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showAddOpModal, setShowAddOpModal] = useState(false)
  const [showQcModal, setShowQcModal] = useState<any | null>(null)
  const [showReworkModal, setShowReworkModal] = useState<any | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAddBomModal, setShowAddBomModal] = useState(false)
  const [showAdjustBomModal, setShowAdjustBomModal] = useState(false)
  const [adjustBomPartIndex, setAdjustBomPartIndex] = useState(0)
  const [showPartialDispatchModal, setShowPartialDispatchModal] = useState(false)
  const [showPrintTravelerModal, setShowPrintTravelerModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [allCustomerGrns, setAllCustomerGrns] = useState<any[]>([])
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)

  useEffect(() => {
    import('@/lib/api').then(({ fetchAllCustomerGRNs }) => {
      fetchAllCustomerGRNs().then(setAllCustomerGrns).catch(() => {});
    });
  }, [])
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

    // 0. If Work Order has its own adjusted multi-part BOM stored in wo.bom
    if (
      Array.isArray(directBomItems) && 
      directBomItems.length > 0 && 
      (directBomItems[0]?.autoMats || directBomItems[0]?.manualMats || directBomItems[0]?.machiningOps || directBomItems[0]?.isCustomAdjusted)
    ) {
      directBomItems.forEach((b: any, bIdx: number) => {
        const partTitle = b.title || `BOM Part ${bIdx + 1}`
        const partDesc = b.description || b.partNo || ''

        const autoMats = (b.autoMats || []).map((m: any, mIdx: number) => {
          const activeMatName = m.material || 'Raw Stock'
          const activeQty = Number(m.qty || 1)
          const activeUnitCost = Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0))
          const activeTotalPrice = Number(m.totalPrice !== undefined ? m.totalPrice : (activeQty * activeUnitCost))
          const activeUnit = m.unit || 'pcs'

          const invMatch = inventory.find(inv => 
            (inv.name || '').toLowerCase() === activeMatName.toLowerCase() ||
            (inv.sku || '').toLowerCase() === activeMatName.toLowerCase() ||
            (m.inventoryId && inv.id === m.inventoryId)
          )

          const alreadyIssued = issuedMaterials.some((im: any) => 
            (im.itemName && (im.itemName.toLowerCase() === activeMatName.toLowerCase())) ||
            (im.notes && im.notes.toLowerCase().includes(activeMatName.toLowerCase())) ||
            (invMatch && im.inventoryId === invMatch.id)
          )

          return {
            id: m.id || `auto-${bIdx}-${mIdx}`,
            material: activeMatName,
            originalMaterial: m.originalMaterial || activeMatName,
            isSubstituted: m.isSubstituted || Boolean(m.substitutionDetails),
            substitutionDetails: m.substitutionDetails,
            substituteRequest: m.substituteRequest,
            spec: m.spec || '',
            profile: m.profile || 'Raw Stock',
            qty: activeQty,
            unit: activeUnit,
            unitPrice: activeUnitCost,
            totalPrice: activeTotalPrice,
            invMatch,
            alreadyIssued,
            notes: m.notes || ''
          }
        })

        const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => {
          const activeMatName = m.material || 'Bought-out Component'
          const activeQty = Number(m.qty || 1)
          const activeUnitCost = Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0))
          const activeTotalPrice = Number(m.totalPrice !== undefined ? m.totalPrice : (activeQty * activeUnitCost))

          const invMatch = inventory.find(inv => 
            (inv.name || '').toLowerCase() === activeMatName.toLowerCase() ||
            (inv.sku || '').toLowerCase() === activeMatName.toLowerCase() ||
            (m.inventoryId && inv.id === m.inventoryId)
          )

          const alreadyIssued = issuedMaterials.some((im: any) => 
            (im.itemName && (im.itemName.toLowerCase() === activeMatName.toLowerCase())) ||
            (im.notes && im.notes.toLowerCase().includes(activeMatName.toLowerCase())) ||
            (invMatch && im.inventoryId === invMatch.id)
          )

          return {
            id: m.id || `manual-${bIdx}-${mIdx}`,
            material: activeMatName,
            originalMaterial: m.originalMaterial || activeMatName,
            isSubstituted: m.isSubstituted || Boolean(m.substitutionDetails),
            substitutionDetails: m.substitutionDetails,
            substituteRequest: m.substituteRequest,
            spec: m.spec || 'Standard Hardware',
            profile: m.profile || 'Bought-out',
            qty: activeQty,
            unit: m.unit || 'pcs',
            unitPrice: activeUnitCost,
            totalPrice: activeTotalPrice,
            invMatch,
            alreadyIssued,
            notes: m.notes || ''
          }
        })

        const machiningOps = (b.machiningOps || []).map((op: any, pIdx: number) => {
          const procName = op.procName || op.operationName || `Operation ${pIdx + 1}`
          const quoHr = Number(op.quoHr || op.plannedHours || 0)
          const estHr = Number(op.estHr !== undefined ? op.estHr : quoHr)
          const setTime = Number(op.setTime || 0)
          const hrRate = Number(op.hrRate || op.hourlyLaborRate || 750)
          const machineRate = Number(op.machineRate || op.hourlyMachineRate || 1200)
          const setTimeRate = Number(op.setTimeRate || hrRate)
          const opCost = Number(op.cost !== undefined ? op.cost : (((estHr > 0 ? estHr : quoHr) * (hrRate + machineRate)) + (setTime * setTimeRate)))

          const matchedOp = operations.find((o: any) => {
            const opNameLower = (o.operationName || '').toLowerCase()
            const procLower = procName.toLowerCase()
            const partLower = partTitle.toLowerCase()
            return (o.id && op.id === o.id) ||
                   (opNameLower.includes(procLower) && (opNameLower.includes(partLower) || opNameLower.includes(`part ${bIdx + 1}`))) ||
                   opNameLower === procLower
          })

          return {
            id: op.id || `proc-${bIdx}-${pIdx}`,
            procName,
            partPrefix: b.title ? `${b.title}: ` : '',
            quoHr,
            estHr,
            setTime,
            hrRate,
            machineRate,
            setTimeRate,
            cost: Math.round(opCost),
            matchedOp
          }
        })

        const matTotal = autoMats.reduce((s: number, m: any) => s + m.totalPrice, 0) +
                         manualMats.reduce((s: number, m: any) => s + m.totalPrice, 0)
        const machTotal = machiningOps.reduce((s: number, p: any) => s + p.cost, 0)
        const totalQuotedHours = machiningOps.reduce((s: number, p: any) => s + p.quoHr, 0)
        const totalEstHours = machiningOps.reduce((s: number, p: any) => s + p.estHr, 0)

        list.push({
          bIdx,
          partId: b.partId || b.id || bIdx + 1,
          title: partTitle,
          description: partDesc,
          drawingNo: b.drawingNo,
          partNo: b.partNo,
          isCustomAdjusted: true,
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

      return list
    }

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

            // Correlate with directBomItems (wo.bom) if material was substituted or changed
            const directMatch = directBomItems.find((d: any) => 
              (d.id && d.id === (m.id || `auto-${bIdx}-${mIdx}`)) ||
              (d.originalMaterial && d.originalMaterial.toLowerCase() === (m.material || '').toLowerCase()) ||
              (d.material && d.material.toLowerCase() === (m.material || '').toLowerCase())
            )

            const activeMatName = directMatch?.material || m.material || 'Raw Stock'
            const activeQty = Number(directMatch?.qty || reqQty)
            const activeUnitCost = Number(directMatch?.unitCost || unitPrice)
            const activeTotalPrice = Number(m.shaftPrice || (activeQty * activeUnitCost))
            const activeUnit = directMatch?.unit || (m.dia ? 'rods' : (m.thick ? 'plates' : 'pcs'))

            // Check inventory match for active material
            const invMatch = inventory.find(inv => 
              (inv.name || '').toLowerCase() === activeMatName.toLowerCase() ||
              (inv.sku || '').toLowerCase() === activeMatName.toLowerCase() ||
              (directMatch?.inventoryId && inv.id === directMatch.inventoryId)
            )

            // Check if already issued in stock ledger
            const alreadyIssued = issuedMaterials.some((im: any) => 
              (im.itemName && (im.itemName.toLowerCase() === activeMatName.toLowerCase())) ||
              (im.notes && im.notes.toLowerCase().includes(activeMatName.toLowerCase())) ||
              (invMatch && im.inventoryId === invMatch.id)
            )

            return {
              id: m.id || `auto-${bIdx}-${mIdx}`,
              material: activeMatName,
              originalMaterial: directMatch?.originalMaterial || m.material,
              isSubstituted: directMatch?.isSubstituted || Boolean(directMatch?.substitutionDetails),
              substitutionDetails: directMatch?.substitutionDetails,
              substituteRequest: directMatch?.substituteRequest,
              spec: specNotes,
              profile,
              dia: m.dia,
              length: m.length,
              thick: m.thick,
              width: m.width,
              density: m.density,
              qty: activeQty,
              unit: activeUnit,
              unitPrice: activeUnitCost,
              totalPrice: activeTotalPrice,
              invMatch,
              alreadyIssued,
              notes: directMatch?.notes || m.notes || ''
            }
          })

          // Manual Materials (Hardware, Fasteners, Bought-out Items)
          const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => {
            const reqQty = Number(m.qty || 1)
            const unitPrice = Number(m.unitPrice || 0)
            const totalPrice = reqQty * unitPrice

            const directMatch = directBomItems.find((d: any) => 
              (d.id && d.id === (m.id || `manual-${bIdx}-${mIdx}`)) ||
              (d.originalMaterial && d.originalMaterial.toLowerCase() === (m.material || '').toLowerCase()) ||
              (d.material && d.material.toLowerCase() === (m.material || '').toLowerCase())
            )

            const activeMatName = directMatch?.material || m.material || 'Bought-out Component'
            const activeQty = Number(directMatch?.qty || reqQty)
            const activeUnitCost = Number(directMatch?.unitCost || unitPrice)
            const activeTotalPrice = activeQty * activeUnitCost

            const invMatch = inventory.find(inv => 
              (inv.name || '').toLowerCase() === activeMatName.toLowerCase() ||
              (inv.sku || '').toLowerCase() === activeMatName.toLowerCase() ||
              (directMatch?.inventoryId && inv.id === directMatch.inventoryId)
            )

            const alreadyIssued = issuedMaterials.some((im: any) => 
              (im.itemName && (im.itemName.toLowerCase() === activeMatName.toLowerCase())) ||
              (im.notes && im.notes.toLowerCase().includes(activeMatName.toLowerCase())) ||
              (invMatch && im.inventoryId === invMatch.id)
            )

            return {
              id: m.id || `manual-${bIdx}-${mIdx}`,
              material: activeMatName,
              originalMaterial: directMatch?.originalMaterial || m.material,
              isSubstituted: directMatch?.isSubstituted || Boolean(directMatch?.substitutionDetails),
              substitutionDetails: directMatch?.substitutionDetails,
              substituteRequest: directMatch?.substituteRequest,
              spec: m.supplier ? `Supplier: ${m.supplier}` : 'Standard Hardware',
              profile: 'Bought-out',
              qty: activeQty,
              unit: directMatch?.unit || 'pcs',
              unitPrice: activeUnitCost,
              totalPrice: activeTotalPrice,
              invMatch,
              alreadyIssued,
              notes: directMatch?.notes || m.supplier || m.notes || ''
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <button 
              onClick={() => navigate('/production')}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold cursor-pointer"
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
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              {wo.title || 'Precision Machining Job'}
            </h1>
            <span className="font-mono text-xs font-bold tracking-wider bg-rex-500/10 text-rex-600 dark:text-rex-400 px-2.5 py-0.5 rounded-none border border-rex-500/30">
              {wo.orderNo || wo.id}
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Selector Pill */}
          <div className="flex items-center border border-theme-subtle bg-surface px-2.5 py-1 rounded-none shadow-2xs">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider mr-1.5 hidden sm:inline">Status:</span>
            <select 
              value={wo.status || 'Pending'} 
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={submitting}
              className="text-xs bg-transparent text-primary font-bold cursor-pointer outline-none border-none py-0.5 pr-2 focus:ring-0"
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
          </div>

          {/* Primary Action Button */}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowIssueModal(true)}
            className="text-xs rounded-none font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
          >
            <Plus size={13} className="mr-1.5"/> Issue Material
          </Button>

          {/* Smart Actions Dropdown */}
          <div className="relative" ref={actionsMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="text-xs rounded-none border-theme hover:bg-surface2 font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <span>Actions</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${showActionsMenu ? 'rotate-180' : ''}`} />
            </Button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-surface border border-theme shadow-xl z-50 py-1.5 text-xs animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-muted tracking-wider border-b border-theme-subtle">
                  Work Order Actions
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowActionsMenu(false)
                    setShowPartialDispatchModal(true)
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                >
                  <Truck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Record Partial Dispatch</span>
                    <span className="text-[10px] text-muted">Generate Delivery Note (DN)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActionsMenu(false)
                    setAdjustBomPartIndex(0)
                    setShowAdjustBomModal(true)
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                >
                  <Calculator size={14} className="text-primary shrink-0" />
                  <div>
                    <span className="font-semibold block">Adjust Full BOM & Costing</span>
                    <span className="text-[10px] text-muted">Edit materials, ops & live recalculate costing</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActionsMenu(false)
                    navigate('/inventory', { state: { openCutStudioWithJobRef: wo.orderNo || wo.id, tab: 'linear_remnants' } })
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                >
                  <Scissors size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="font-semibold block">Open in Cut Studio</span>
                    <span className="text-[10px] text-muted">Linear raw stock & offcut optimizer</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActionsMenu(false)
                    setActiveTab('qc_rework')
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                >
                  <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                  <div>
                    <span className="font-semibold block">QC Inspection & Rework</span>
                    <span className="text-[10px] text-muted">View inspection checkpoints</span>
                  </div>
                </button>

                {operations.length === 0 && grandTotalQuotedMachiningHours > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionsMenu(false)
                      handleSyncAllBomsToFloor()
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                  >
                    <Sparkles size={14} className="text-purple-500 shrink-0" />
                    <div>
                      <span className="font-semibold block">Sync BOM Steps to Floor</span>
                      <span className="text-[10px] text-muted">Create floor routing operations</span>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-theme-subtle" />

                {(() => {
                  const { photos: sPhotos, grns: matchedGrns } = findMatchingSamplePhotos({
                    id: wo?.id,
                    orderNo: wo?.orderNo,
                    quoteId: wo?.sourceQuoteId || wo?.quotationId,
                    quotationNo: wo?.quotationNo || wo?.sourceQuoteNo,
                    leadId: wo?.leadId,
                    customerName: wo?.customerName
                  }, allCustomerGrns);
                  if (sPhotos.length === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        setActiveViewingPhotos({
                          photos: sPhotos,
                          title: `Sample Photos - Work Order #${wo?.orderNo || wo?.id} (${matchedGrns.map(g => g.id).join(', ')})`
                        });
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 cursor-pointer transition-colors"
                    >
                      <Camera size={14} className="text-amber-500 shrink-0" />
                      <div>
                        <span className="font-semibold block">View Sample Photos ({sPhotos.length})</span>
                        <span className="text-[10px] text-muted">Customer physical sample inspection photos</span>
                      </div>
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    setShowActionsMenu(false)
                    setShowPrintTravelerModal(true)
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-surface2 text-primary cursor-pointer transition-colors"
                >
                  <Printer size={14} className="text-muted shrink-0" />
                  <div>
                    <span className="font-semibold block">Print Job Traveler</span>
                    <span className="text-[10px] text-muted">Shop floor routing traveler sheet</span>
                  </div>
                </button>

                {wo.status !== 'Completed' && wo.status !== 'Closed' && (
                  <>
                    <div className="my-1 border-t border-theme-subtle" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false)
                        setShowCompleteModal(true)
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors font-bold"
                    >
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Complete Work Order</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── WORK ORDER PRODUCTION LIFECYCLE STEPPER ─────────────────────────────────── */}
      <div className="w-full bg-surface border border-theme-subtle p-2.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-theme-subtle/50 text-[10px] font-mono uppercase tracking-wider text-muted">
          <span className="flex items-center gap-1.5 font-semibold text-secondary">
            <span className="w-2 h-2 rounded-full bg-rex-500 animate-pulse inline-block" />
            Manufacturing Lifecycle Stepper
          </span>
          <span className="text-secondary font-sans font-medium hidden sm:inline-block">
            Target: <strong className="text-primary font-mono">{wo.jobQty || 1} pcs</strong> · Customer: <strong className="text-primary font-sans">{wo.customerName || 'Standard Order'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            {
              step: 1,
              label: '1. BOM & Spec',
              sub: `${parsedBoms.length} Parts Loaded`,
              isDone: parsedBoms.length > 0,
              isActive: wo.status === 'Draft' || wo.status === 'Pending' || wo.status === 'Released'
            },
            {
              step: 2,
              label: '2. Stores Issuance',
              sub: `${issuedMaterials.length}/${grandTotalPlannedMaterials} Items Issued`,
              isDone: issuedMaterials.length >= grandTotalPlannedMaterials && grandTotalPlannedMaterials > 0,
              isActive: issuedMaterials.length > 0 && issuedMaterials.length < grandTotalPlannedMaterials
            },
            {
              step: 3,
              label: '3. Floor Machining',
              sub: `${operations.filter(o => o.status === 'Completed').length}/${operations.length} Ops Done`,
              isDone: operations.length > 0 && operations.every(o => o.status === 'Completed'),
              isActive: wo.status === 'In Progress' || operations.some(o => o.status === 'In Progress')
            },
            {
              step: 4,
              label: '4. QC Inspection',
              sub: reworkLogs.filter(r => r.status !== 'Resolved').length > 0 ? `${reworkLogs.filter(r => r.status !== 'Resolved').length} Reworks` : 'Inspection Clear',
              isDone: wo.status === 'Completed' || (operations.length > 0 && operations.every(o => o.status === 'Completed')),
              isActive: wo.status === 'QC Pending' || wo.status === 'Rework' || wo.status === 'Rework Required'
            },
            {
              step: 5,
              label: '5. Partial Dispatch',
              sub: `${wo.dispatchedQty || 0}/${wo.jobQty || 1} pcs Delivered`,
              isDone: Number(wo.dispatchedQty || 0) >= Number(wo.jobQty || 1) && Number(wo.jobQty || 1) > 0,
              isActive: Number(wo.dispatchedQty || 0) > 0 && Number(wo.dispatchedQty || 0) < Number(wo.jobQty || 1)
            },
            {
              step: 6,
              label: '6. Job Completion',
              sub: wo.status === 'Completed' || wo.status === 'Closed' ? 'Fully Closed' : 'In Progress',
              isDone: wo.status === 'Completed' || wo.status === 'Closed',
              isActive: wo.status === 'Completed'
            }
          ].map((st) => (
            <div 
              key={st.step}
              className={`p-2 border transition-all rounded-none ${
                st.isActive 
                  ? 'bg-rex-500/10 border-rex-500/50 shadow-2xs ring-1 ring-rex-500/20' 
                  : st.isDone 
                  ? 'bg-emerald-500/5 border-emerald-500/30' 
                  : 'bg-surface2/40 border-theme-subtle text-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-4 h-4 rounded-none flex items-center justify-center font-mono text-[9px] font-bold ${
                  st.isDone 
                    ? 'bg-emerald-600 text-white' 
                    : st.isActive 
                    ? 'bg-rex-600 text-white' 
                    : 'bg-surface2 text-muted border border-theme-subtle'
                }`}>
                  {st.isDone ? <Check size={10}/> : st.step}
                </span>
                <span className={`text-xs font-bold truncate ${st.isActive ? 'text-rex-600 dark:text-rex-400' : st.isDone ? 'text-primary' : 'text-muted'}`}>
                  {st.label}
                </span>
              </div>
              <span className="text-[10px] text-muted block truncate font-mono">
                {st.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4 EXECUTIVE COMMAND COCKPIT CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Production Output & Yield */}
        <GlassCard className="p-3.5 rounded-none border-theme-subtle flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
              Target Quantity & Yield
            </span>
            <button
              type="button"
              onClick={() => setShowPartialDispatchModal(true)}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={10}/> Dispatch
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-extrabold text-primary">
              {wo.jobQty || 1} <span className="text-xs font-sans font-normal text-muted">pcs target</span>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-blue-600 font-bold">{wo.completedQty || 0}</span>
              <span className="text-muted"> / </span>
              <span className="text-emerald-600 font-bold">{wo.dispatchedQty || 0} DN</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-surface2 border border-theme-subtle rounded-none flex overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, ((Number(wo.dispatchedQty) || 0) / (Number(wo.jobQty) || 1)) * 100)}%` }}
                title={`Dispatched: ${wo.dispatchedQty || 0} pcs`}
              />
              <div 
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (((Number(wo.completedQty) || 0) - (Number(wo.dispatchedQty) || 0)) / (Number(wo.jobQty) || 1)) * 100))}%` }}
                title={`In Stores: ${Math.max(0, (Number(wo.completedQty) || 0) - (Number(wo.dispatchedQty) || 0))} pcs`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span className="text-emerald-600 font-bold">{wo.dispatchedQty || 0} Dispatched</span>
              <span className="text-blue-600 font-bold">{wo.completedQty || 0} Machined</span>
              <span>{Math.max(0, (Number(wo.jobQty) || 1) - (Number(wo.completedQty) || 0))} Bal</span>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Materials & Stock Readiness */}
        <GlassCard className="p-3.5 rounded-none border-theme-subtle flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
              Raw Materials Readiness
            </span>
            <button
              type="button"
              onClick={() => setShowIssueModal(true)}
              className="text-[10px] text-rex-600 dark:text-rex-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={10}/> Issue Stock
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-extrabold text-primary">
              {issuedMaterials.length} <span className="text-xs font-sans font-normal text-muted">/ {grandTotalPlannedMaterials} issued</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase rounded-none ${
              issuedMaterials.length >= grandTotalPlannedMaterials && grandTotalPlannedMaterials > 0
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
            }`}>
              {issuedMaterials.length >= grandTotalPlannedMaterials && grandTotalPlannedMaterials > 0 ? '100% Ready' : 'Pending Stores'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-surface2 border border-theme-subtle rounded-none overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${grandTotalPlannedMaterials > 0 ? Math.min(100, (issuedMaterials.length / grandTotalPlannedMaterials) * 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span>Cost: {formatCurrency(cost.materialCost || 0)}</span>
              <span>{parsedBoms.length} BOM Part{parsedBoms.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </GlassCard>

        {/* Card 3: Shopfloor Machining Hours */}
        <GlassCard className="p-3.5 rounded-none border-theme-subtle flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
              Machining Cycle Hours
            </span>
            <span className="text-[10px] font-mono text-muted">
              {cost.progress || 0}% Steps Done
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-extrabold text-primary">
              {operations.reduce((s, o) => s + Number(o.actualHours || 0), 0).toFixed(1)} <span className="text-xs font-sans font-normal text-muted">/ {grandTotalQuotedMachiningHours.toFixed(1)} hrs</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
              {operations.filter(o => o.status === 'Completed').length}/{operations.length} Done
            </span>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-surface2 border border-theme-subtle rounded-none overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${cost.progress || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span>{operations.filter(o => o.status === 'In Progress').length} Machining Now</span>
              <span>{reworkLogs.filter(r => r.status !== 'Resolved').length} Rework Pending</span>
            </div>
          </div>
        </GlassCard>

        {/* Card 4: Financial Cost Rollup & Budget */}
        <GlassCard className="p-3.5 rounded-none border-theme-subtle flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted">
              Actual Cost & Target
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('costing')}
              className="text-[10px] text-rex-600 dark:text-rex-400 font-bold hover:underline cursor-pointer"
            >
              Costing →
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cost.actualTotalCost || 0)}
            </div>
            <span className="text-[10px] font-mono text-muted">
              Target: {formatCurrency(cost.estimatedCost || 0)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full bg-surface2 border border-theme-subtle rounded-none overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${cost.estimatedCost > 0 ? Math.min(100, (Number(cost.actualTotalCost || 0) / Number(cost.estimatedCost)) * 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-secondary">Lab+Mac: {formatCurrency((cost.laborCost || 0) + (cost.machineCost || 0))}</span>
              <span className="text-emerald-600 font-bold">Within Budget</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── MAIN NAVIGATION TABS ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-theme-subtle pb-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'bom', label: '1. Shop Floor Cockpit (BOM & Routing)', icon: ClipboardList, count: parsedBoms.length },
          { id: 'materials', label: '2. Material Ledger', icon: Package, count: issuedMaterials.length },
          { id: 'qc_rework', label: '3. QC Hub', icon: ShieldCheck, count: reworkLogs.filter(r => r.status !== 'Resolved').length },
          { id: 'dispatches', label: '4. Partial Dispatches', icon: Truck, count: Array.isArray(wo.dispatches) ? wo.dispatches.length : (wo.dispatches ? 1 : 0) },
          { id: 'costing', label: '5. Job Costing & Profit', icon: DollarSign }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id || (tab.id === 'bom' && activeTab === 'routing')
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
              <Icon size={14} className={isActive ? 'text-rex-600 dark:text-rex-400' : 'text-muted'}/>
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

      {/* ── TAB 1: SHOP FLOOR COCKPIT (BOM & SHOP FLOOR ROUTING) ───────────────────── */}
      {(activeTab === 'bom' || activeTab === 'routing') && (
        <div className="space-y-6 pt-1">
          {/* Action Ribbon & Sync */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface2/40 p-3 border border-theme-subtle">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-rex-600 shrink-0"/>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-primary">
                  Engineering Bill of Materials & Sequential Shop Floor Routing
                </h3>
                <p className="text-[11px] text-muted">
                  Interactive job card: track raw stock allocation, material substitutions, and live machining step timers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {operations.length === 0 && grandTotalQuotedMachiningHours > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncAllBomsToFloor}
                  disabled={submitting}
                  className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
                >
                  <Sparkles size={13} className="mr-1.5"/> Sync All BOM Steps to Shopfloor
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAdjustBomPartIndex(0)
                  setShowAdjustBomModal(true)
                }}
                className="rounded-none text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center gap-1.5"
              >
                <Calculator size={13} />
                <span>Adjust Full BOM & Costing</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBomModal(true)}
                className="rounded-none text-xs border border-rex-500/40 text-rex-600 dark:text-rex-400 hover:bg-rex-500/10 font-bold"
              >
                <Plus size={13} className="mr-1"/> Add Material
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddOpModal(true)}
                className="rounded-none text-xs border-theme hover:bg-surface2 font-bold"
              >
                <Plus size={13} className="mr-1"/> Add Operation
              </Button>
            </div>
          </div>

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
                <GlassCard key={bom.partId || bIdx} className="p-0 border-theme-subtle rounded-none overflow-hidden space-y-0 shadow-2xs">
                  {/* Part Header */}
                  <div className="p-3.5 bg-surface2/70 border-b border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] text-muted uppercase block">Quoted Machining</span>
                        <strong className="text-primary font-bold">{bom.totalQuotedHours.toFixed(1)} hrs</strong>
                      </div>
                      <div className="text-right border-l border-theme-subtle pl-3">
                        <span className="text-[10px] text-muted uppercase block">Part Est. Total</span>
                        <strong className="text-emerald-600 font-bold">{formatCurrency(bom.bomTotal)}</strong>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjustBomPartIndex(bIdx)
                          setShowAdjustBomModal(true)
                        }}
                        className="h-7 px-2.5 text-xs font-bold flex items-center gap-1.5 border-theme-subtle text-primary hover:bg-surface rounded-none shadow-2xs ml-1"
                      >
                        <Calculator size={13} className="text-primary" />
                        <span>Adjust Part BOM</span>
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* 1. PLANNED MATERIALS TABLE FOR THIS BOM */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <Package size={13} className="text-secondary"/>
                          Raw Materials & Components ({bom.allMaterials.length})
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
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">Material Name & Dimensions</th>
                                <th className="py-2.5 px-3">Type</th>
                                <th className="py-2.5 px-3 text-right">Required Qty</th>
                                <th className="py-2.5 px-3 text-right">Unit Price</th>
                                <th className="py-2.5 px-3 text-right">Subtotal</th>
                                <th className="py-2.5 px-3 text-center">Stock Level</th>
                                <th className="py-2.5 px-3 text-center">Status</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle">
                              {bom.allMaterials.map((mat: any, mIdx: number) => {
                                const inStock = mat.invMatch ? Number(mat.invMatch.quantity || 0) : 0
                                const hasStock = inStock >= mat.qty

                                return (
                                  <tr key={mat.id || mIdx} className="hover:bg-surface2/30 transition-colors">
                                    <td className="py-2.5 px-3 text-muted font-mono">{mIdx + 1}</td>
                                    <td className="py-2.5 px-3 font-semibold text-primary">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span>{mat.material}</span>
                                        {mat.isSubstituted && (
                                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase" title={`Substituted for ${mat.originalMaterial || 'Original'}`}>
                                            Substituted
                                          </span>
                                        )}
                                        {mat.substituteRequest?.status === 'pending_approval' && (
                                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                                            Sub Pending
                                          </span>
                                        )}
                                      </div>
                                      {mat.spec && (
                                        <span className="block text-[10px] text-muted font-mono font-normal">
                                          {mat.spec}
                                        </span>
                                      )}
                                      {mat.substitutionDetails && (
                                        <span className="block text-[9.5px] text-purple-600 dark:text-purple-400 font-mono">
                                          Replaced: {mat.substitutionDetails.originalMaterial} ({mat.substitutionDetails.reason})
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-muted font-mono text-[11px]">
                                      {mat.profile || 'Raw Stock'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                                      {mat.qty} {mat.unit || 'pcs'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-muted">
                                      {formatCurrency(mat.unitPrice || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                                      {formatCurrency(mat.totalPrice || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
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
                                    <td className="py-2.5 px-3 text-center">
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
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                        <Button
                                          variant="primary"
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
                                          className="text-[11px] py-1 px-2.5 h-auto bg-rex-600 hover:bg-rex-700 text-white rounded-none font-bold inline-flex items-center shadow-xs"
                                        >
                                          <Package size={11} className="mr-1"/> Issue Stock
                                        </Button>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const flatIdx = parsedBoms.flatMap(b => b.allMaterials).findIndex(m => m.id === mat.id || (m.material === mat.material && m.spec === mat.spec))
                                            setSubstituteModalMat({
                                              partIndex: bIdx,
                                              materialIndex: mIdx,
                                              flatIndex: flatIdx >= 0 ? flatIdx : mIdx,
                                              material: mat.material,
                                              spec: mat.spec,
                                              qty: mat.qty,
                                              unit: mat.unit,
                                              unitPrice: mat.unitPrice,
                                              inStock,
                                              hasStock,
                                              invMatch: mat.invMatch,
                                              partTitle: bom.title,
                                              substituteRequest: mat.substituteRequest
                                            })
                                          }}
                                          className="text-[11px] py-1 px-2 h-auto text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 rounded-none font-bold inline-flex items-center"
                                          title="Change material or request alternative grade/size from stores"
                                        >
                                          <ArrowLeftRight size={11} className="mr-1 text-indigo-500"/> Alt Material
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
                                          <Scissors size={11} className="mr-1 text-amber-500"/> Cut Studio
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

                    {/* 2. SEQUENTIAL OPERATIONS & SHOP FLOOR ROUTING EXECUTION */}
                    <div className="space-y-2.5 pt-2 border-t border-theme-subtle">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench size={13} className="text-secondary"/>
                          Sequential Machining Operations & Cycle Timers ({bom.machiningOps.length})
                        </h5>
                        <span className="text-xs font-mono text-muted">
                          Total Quoted: <strong className="text-primary font-bold">{bom.totalQuotedHours.toFixed(1)} hrs</strong> | Subtotal: <strong className="text-primary">{formatCurrency(bom.machTotal)}</strong>
                        </span>
                      </div>

                      {bom.machiningOps.length === 0 ? (
                        <div className="p-4 text-center bg-surface2/20 border border-dashed border-theme-subtle text-xs text-muted">
                          No machining hours allocated for this part in quotation.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bom.machiningOps.map((proc: any, pIdx: number) => {
                            const matchedOp = proc.matchedOp
                            const isRunning = matchedOp?.status === 'In Progress'
                            const isDone = matchedOp?.status === 'Completed'
                            const isPaused = matchedOp?.status === 'Paused'
                            const isQcPending = matchedOp?.status === 'QC Pending'
                            const isRework = matchedOp?.status === 'Rework Required'

                            return (
                              <div
                                key={proc.id || pIdx}
                                className={`p-3 border rounded-none transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isRunning 
                                    ? 'bg-blue-500/10 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30' 
                                    : isDone 
                                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                                    : isRework 
                                    ? 'bg-rose-500/5 border-rose-500/40' 
                                    : isQcPending 
                                    ? 'bg-amber-500/5 border-amber-500/40' 
                                    : 'bg-surface border-theme-subtle hover:border-theme'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-7 h-7 rounded-none flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                    isDone 
                                      ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' 
                                      : isRunning 
                                      ? 'bg-blue-500/20 text-blue-600 border border-blue-500/40 animate-pulse' 
                                      : 'bg-surface2 text-muted border border-theme-subtle'
                                  }`}>
                                    {isDone ? <Check size={13}/> : pIdx + 1}
                                  </div>

                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-primary text-xs sm:text-sm">
                                        {proc.procName}
                                      </span>
                                      {isRunning && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-600 border border-blue-500/30 animate-pulse">
                                          <Play size={9} className="fill-blue-500"/> Machining Now (${matchedOp.actualHours || 0}h)
                                        </span>
                                      )}
                                      {isDone && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                          <Check size={9}/> Done (${matchedOp.actualHours || 0}h)
                                        </span>
                                      )}
                                      {isPaused && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                          <Pause size={9}/> Paused
                                        </span>
                                      )}
                                      {isQcPending && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                          <ShieldCheck size={9}/> QC Inspection
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[11px] text-muted font-mono flex-wrap">
                                      <span>Quoted: <strong className="text-primary">{proc.quoHr.toFixed(1)}h</strong></span>
                                      {proc.setTime > 0 && <span>Setup: {proc.setTime.toFixed(1)}h</span>}
                                      <span>Rate: {formatCurrency(proc.hrRate)}/h</span>
                                      <span>Subtotal: <strong className="text-primary">{formatCurrency(proc.cost)}</strong></span>
                                      {matchedOp && (
                                        <span className="text-secondary font-sans font-medium">
                                          (${matchedOp.machineName || 'Machine'} · ${matchedOp.employeeName || 'Tech'})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Live Operation Controls */}
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  {matchedOp ? (
                                    <>
                                      {!isDone && (
                                        <>
                                          {!isRunning ? (
                                            <Button
                                              variant="primary"
                                              size="sm"
                                              onClick={() => handleOpTimerAction(matchedOp.id, 'In Progress')}
                                              disabled={submitting}
                                              className="text-[11px] py-1 px-2.5 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-none font-bold inline-flex items-center"
                                            >
                                              <Play size={11} className="mr-1 fill-white"/> Start Timer
                                            </Button>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleOpTimerAction(matchedOp.id, 'Paused')}
                                              disabled={submitting}
                                              className="text-[11px] py-1 px-2 h-auto text-amber-600 border-amber-500/30 hover:bg-amber-500/10 rounded-none font-bold inline-flex items-center"
                                            >
                                              <Pause size={11} className="mr-1"/> Pause
                                            </Button>
                                          )}

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpTimerAction(matchedOp.id, 'Completed')}
                                            disabled={submitting}
                                            className="text-[11px] py-1 px-2.5 h-auto text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 rounded-none font-bold inline-flex items-center"
                                          >
                                            <Check size={11} className="mr-1"/> Finish Step
                                          </Button>
                                        </>
                                      )}

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setTargetQcOp({ partTitle: bom.title, opName: proc.procName })
                                          setActiveTab('qc_rework')
                                        }}
                                        className="text-[11px] py-1 px-2 h-auto text-muted hover:text-primary border border-theme-subtle rounded-none font-semibold inline-flex items-center"
                                        title="View or record QC inspection checkpoints"
                                      >
                                        <ShieldCheck size={11} className="mr-1 text-blue-500"/> QC
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSyncSingleOpToFloor(proc)}
                                      disabled={submitting}
                                      className="text-[11px] py-1 px-2.5 h-auto text-purple-600 border-purple-500/30 hover:bg-purple-500/10 rounded-none font-bold inline-flex items-center"
                                    >
                                      <Plus size={11} className="mr-1"/> Add to Routing
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      )}

      {/* ── TAB 2: MATERIAL ALLOCATION & STOCK LEDGER ─────────────────────────────── */}
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

            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/inventory/material-issue?woId=${wo.id}`)}
                className="text-xs font-bold text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none"
                title="Open dedicated Storekeeper Material Issue Station"
              >
                <PackageCheck size={13} className="mr-1"/> Stores Issue Station
              </Button>

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
                  {issuedMaterials.map((mat, i) => (
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
        <WorkOrderQCHub
          workOrder={wo}
          parsedBoms={parsedBoms}
          operations={operations}
          reworkLogs={reworkLogs}
          qcInspections={qcInspections}
          onRefreshWO={loadData}
          onOpenReworkModal={(rw: any) => {
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
          initialTargetOp={targetQcOp}
        />
      )}

      {/* ── TAB 5: PARTIAL DISPATCHES & DELIVERY NOTES ─────────────────────────────── */}
      {activeTab === 'dispatches' && (
        <WorkOrderDispatchesSection
          workOrder={wo}
          onOpenDispatchModal={() => setShowPartialDispatchModal(true)}
        />
      )}

      {/* ── TAB 6: JOB COSTING & FINANCIALS ───────────────────────────────────────── */}
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustBomPartIndex(0)
                setShowAdjustBomModal(true)
              }}
              className="rounded-none text-xs font-bold border-theme flex items-center gap-1.5 text-primary hover:bg-surface2 shrink-0"
            >
              <Calculator size={13} className="text-primary" />
              <span>Adjust Full BOM & Costing</span>
            </Button>
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
              <ProductAutocomplete
                value={issueForm.inventoryId}
                onChange={(val, inv) => {
                  setIssueForm({
                    ...issueForm,
                    inventoryId: val,
                    materialName: inv ? inv.name : issueForm.materialName,
                    unit: inv?.uom || issueForm.unit,
                    unitCost: Number(inv?.unitCost || issueForm.unitCost)
                  })
                }}
                products={inventory}
                placeholder="Search catalog stock item..."
                className="rounded-none text-xs"
              />
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
      <WorkOrderPartialDispatchModal
        isOpen={showPartialDispatchModal}
        onClose={() => setShowPartialDispatchModal(false)}
        workOrder={wo}
        onSuccess={loadData}
      />

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

      {/* Change / Request Substitute Material Modal */}
      {substituteModalMat && (
        <WorkOrderMaterialSubstituteModal
          isOpen={true}
          onClose={() => setSubstituteModalMat(null)}
          workOrder={wo}
          item={substituteModalMat}
          inventory={inventory}
          onSuccess={() => {
            loadData()
          }}
          onOpenDirectIssue={(subDetails: any) => {
            setIssueForm({
              inventoryId: subDetails.inventoryId || '',
              materialName: subDetails.materialName,
              qty: subDetails.qty,
              unit: subDetails.unit || 'pcs',
              unitCost: Number(subDetails.unitCost || 0),
              notes: subDetails.notes
            })
            setShowIssueModal(true)
          }}
        />
      )}

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

      {/* ── FULL BOM ADJUSTMENT & DYNAMIC INTERNAL JOB COSTING ENGINE MODAL ──────── */}
      {showAdjustBomModal && (
        <WorkOrderFullBomAdjustModal
          isOpen={showAdjustBomModal}
          onClose={() => setShowAdjustBomModal(false)}
          workOrder={wo}
          initialBoms={parsedBoms}
          initialPartIndex={adjustBomPartIndex}
          onSuccess={(updatedData) => {
            loadData()
            setToastMsg({
              type: 'success',
              text: `Work Order BOM and Internal Job Costing recalculated successfully! New Target Budget: ${formatCurrency(updatedData?.estimatedCost || 0)}`
            })
          }}
        />
      )}

      {/* ── SAMPLE PHOTO LIGHTBOX VIEWER ── */}
      <SamplePhotoViewerModal
        isOpen={!!activeViewingPhotos}
        onClose={() => setActiveViewingPhotos(null)}
        photos={activeViewingPhotos?.photos || []}
        title={activeViewingPhotos?.title || 'Sample Photos'}
      />

      {/* ── PRODUCTION WORK ORDER & JOB TRAVELER PRINT MODAL ──────── */}
      {showPrintTravelerModal && (
        <WorkOrderPrintModal
          isOpen={showPrintTravelerModal}
          onClose={() => setShowPrintTravelerModal(false)}
          workOrder={wo}
        />
      )}
    </div>
  )
}
