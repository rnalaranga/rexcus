import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Package, PackageCheck, ClipboardList, Scissors, Printer, Download, 
  Search, Filter, CheckCircle2, AlertTriangle, Plus, RefreshCw, 
  FileText, Building, ArrowRight, History, Sparkles, Clock, 
  ChevronRight, Boxes, User, Calendar, Check, X, Layers, Factory,
  ExternalLink, BarChart3, AlertCircle
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  fetchWorkOrders, 
  fetchInventory, 
  fetchQuotations, 
  fetchFullStockLedger, 
  issueMaterialToWorkOrder 
} from '@/lib/api'

type TabType = 'requisitions' | 'direct_issue' | 'history'

interface PlannedBomItem {
  id: string
  workOrderId: string
  workOrderNo: string
  workOrderTitle: string
  customerId: string
  customerName: string
  deadline?: string
  priority?: string
  partTitle: string
  material: string
  spec: string
  profile: string
  dia?: number
  length?: number
  thick?: number
  width?: number
  requiredQty: number
  unit: string
  unitCost: number
  totalCost: number
  invMatch: any
  alreadyIssuedQty: number
  pendingQty: number
  status: 'Pending' | 'Partial' | 'Issued'
  hasStock: boolean
  stockQty: number
  notes?: string
}

export const MaterialIssueHub: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Primary State
  const [activeTab, setActiveTab] = useState<TabType>('requisitions')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Raw Data from APIs
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [stockLedger, setStockLedger] = useState<any[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'issued' | 'shortage'>('all')
  const [woFilter, setWoFilter] = useState<string>('all')

  // Issue Material Modal State
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [selectedBomItem, setSelectedBomItem] = useState<PlannedBomItem | null>(null)
  const [issueForm, setIssueForm] = useState({
    workOrderId: '',
    inventoryId: '',
    materialName: '',
    qty: 1,
    unit: 'pcs',
    unitCost: 0,
    batchRef: '',
    notes: '',
    issuedBy: user?.name || 'Storekeeper',
    date: new Date().toISOString().slice(0, 10)
  })

  // Direct Quick Issue State
  const [directForm, setDirectForm] = useState({
    workOrderId: '',
    inventoryId: '',
    materialName: '',
    qty: 1,
    unit: 'pcs',
    unitCost: 0,
    batchRef: '',
    notes: '',
    issuedBy: user?.name || 'Storekeeper',
    date: new Date().toISOString().slice(0, 10)
  })

  // Printable Goods Issue Note (GIN) Modal
  const [printGinModal, setPrintGinModal] = useState<{
    isOpen: boolean
    job?: any
    items: any[]
    ginNo: string
    date: string
    storekeeper: string
  } | null>(null)

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true)
      const [wosData, invData, quotesData, ledgerData] = await Promise.all([
        fetchWorkOrders().catch(() => []),
        fetchInventory().catch(() => []),
        fetchQuotations().catch(() => []),
        fetchFullStockLedger().catch(() => [])
      ])

      setWorkOrders(Array.isArray(wosData) ? wosData : [])
      setInventory(Array.isArray(invData) ? invData : [])
      setQuotations(Array.isArray(quotesData) ? quotesData : [])
      setStockLedger(Array.isArray(ledgerData) ? ledgerData : [])
    } catch (err) {
      console.error('Error loading material issue data:', err)
      setToastMsg({ type: 'error', text: 'Failed to load inventory and work orders.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Check query params to pre-select a work order if passed
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const woId = params.get('woId')
    if (woId) {
      setWoFilter(woId)
      setDirectForm(prev => ({ ...prev, workOrderId: woId }))
    }
  }, [location.search])

  // Aggregate All Planned BOM Requirements across Work Orders
  const allBomRequirements = useMemo(() => {
    const items: PlannedBomItem[] = []

    workOrders.forEach(wo => {
      // Skip closed or completed work orders if needed, or keep for full audit
      const isClosed = wo.status === 'Completed' || wo.status === 'Closed'
      const issuedList = wo.issuedMaterials || []

      // 1. Direct BOM array saved on work order
      if (Array.isArray(wo.bom) && wo.bom.length > 0) {
        wo.bom.forEach((b: any, bIdx: number) => {
          const reqQty = Number(b.qty || 1)
          const matName = b.material || b.name || 'Raw Material'
          
          // Match inventory
          const invMatch = inventory.find(inv => 
            (inv.name || '').toLowerCase() === matName.toLowerCase() ||
            (inv.sku || '').toLowerCase() === matName.toLowerCase() ||
            (b.inventoryId && inv.id === b.inventoryId)
          )

          // Calculate already issued qty from wo.issuedMaterials
          const alreadyIssuedQty = issuedList
            .filter((im: any) => 
              (im.itemName && im.itemName.toLowerCase() === matName.toLowerCase()) ||
              (im.notes && im.notes.toLowerCase().includes(matName.toLowerCase())) ||
              (invMatch && im.inventoryId === invMatch.id)
            )
            .reduce((sum: number, im: any) => sum + Number(im.qty || 0), 0)

          const pendingQty = Math.max(0, reqQty - alreadyIssuedQty)
          const stockQty = invMatch ? Number(invMatch.quantity || 0) : 0
          const hasStock = stockQty >= (pendingQty > 0 ? pendingQty : reqQty)

          let itemStatus: 'Pending' | 'Partial' | 'Issued' = 'Pending'
          if (alreadyIssuedQty >= reqQty) {
            itemStatus = 'Issued'
          } else if (alreadyIssuedQty > 0) {
            itemStatus = 'Partial'
          }

          items.push({
            id: `wo-bom-${wo.id}-${bIdx}`,
            workOrderId: wo.id,
            workOrderNo: wo.orderNo || wo.id,
            workOrderTitle: wo.title || 'Precision Machining Job',
            customerId: wo.customerId || '',
            customerName: wo.customerName || wo.customer || 'Direct Factory Order',
            deadline: wo.deadline,
            priority: wo.priority || 'Normal',
            partTitle: b.partTitle || `Part BOM ${bIdx + 1}`,
            material: matName,
            spec: b.notes || b.dimensions || b.spec || '',
            profile: b.profile || 'Raw Stock',
            requiredQty: reqQty,
            unit: b.unit || b.uom || 'pcs',
            unitCost: Number(b.unitCost || invMatch?.unitCost || 0),
            totalCost: reqQty * Number(b.unitCost || invMatch?.unitCost || 0),
            invMatch,
            alreadyIssuedQty,
            pendingQty,
            status: itemStatus,
            hasStock,
            stockQty,
            notes: b.notes
          })
        })
      } 
      // 2. Or Quotation BOM if not yet persisted to wo.bom
      else if (wo.quoteId) {
        const linkedQuote = quotations.find(q => q.id === wo.quoteId || q.docNo === wo.quoteId)
        if (linkedQuote) {
          const qData = typeof linkedQuote.data === 'string'
            ? (() => { try { return JSON.parse(linkedQuote.data) } catch (e) { return {} } })()
            : (linkedQuote.data || {})

          if (Array.isArray(qData.boms) && qData.boms.length > 0) {
            qData.boms.forEach((b: any, bIdx: number) => {
              const partTitle = b.title || `BOM Part ${bIdx + 1}`

              // Auto Materials (Bar stocks / plates)
              ;(b.autoMats || []).forEach((m: any, mIdx: number) => {
                const reqQty = Number(m.qty || 1)
                const matName = m.material || 'Raw Stock'
                const specNotes = [
                  m.dia ? `Ø${m.dia}mm` : '',
                  m.thick ? `Thick: ${m.thick}mm` : '',
                  m.width ? `W: ${m.width}mm` : '',
                  m.length ? `L: ${m.length}mm` : ''
                ].filter(Boolean).join(' | ')

                const invMatch = inventory.find(inv => 
                  (inv.name || '').toLowerCase() === matName.toLowerCase() ||
                  (inv.sku || '').toLowerCase() === matName.toLowerCase()
                )

                const alreadyIssuedQty = issuedList
                  .filter((im: any) => 
                    (im.itemName && im.itemName.toLowerCase() === matName.toLowerCase()) ||
                    (im.notes && im.notes.toLowerCase().includes(matName.toLowerCase())) ||
                    (invMatch && im.inventoryId === invMatch.id)
                  )
                  .reduce((sum: number, im: any) => sum + Number(im.qty || 0), 0)

                const pendingQty = Math.max(0, reqQty - alreadyIssuedQty)
                const stockQty = invMatch ? Number(invMatch.quantity || 0) : 0
                const hasStock = stockQty >= (pendingQty > 0 ? pendingQty : reqQty)

                let itemStatus: 'Pending' | 'Partial' | 'Issued' = 'Pending'
                if (alreadyIssuedQty >= reqQty) {
                  itemStatus = 'Issued'
                } else if (alreadyIssuedQty > 0) {
                  itemStatus = 'Partial'
                }

                items.push({
                  id: `quote-auto-${wo.id}-${bIdx}-${mIdx}`,
                  workOrderId: wo.id,
                  workOrderNo: wo.orderNo || wo.id,
                  workOrderTitle: wo.title || 'Precision Machining Job',
                  customerId: wo.customerId || '',
                  customerName: wo.customerName || wo.customer || 'Direct Factory Order',
                  deadline: wo.deadline,
                  priority: wo.priority || 'Normal',
                  partTitle,
                  material: matName,
                  spec: specNotes,
                  profile: m.dia ? 'Round Bar' : (m.thick ? 'Plate / Sheet' : 'Raw Stock'),
                  dia: m.dia,
                  length: m.length,
                  thick: m.thick,
                  width: m.width,
                  requiredQty: reqQty,
                  unit: m.dia ? 'rods' : (m.thick ? 'plates' : 'pcs'),
                  unitCost: Number(m.unitPrice || invMatch?.unitCost || 0),
                  totalCost: reqQty * Number(m.unitPrice || invMatch?.unitCost || 0),
                  invMatch,
                  alreadyIssuedQty,
                  pendingQty,
                  status: itemStatus,
                  hasStock,
                  stockQty,
                  notes: m.notes
                })
              })

              // Manual Materials (Hardware, Fasteners)
              ;(b.manualMats || []).forEach((m: any, mIdx: number) => {
                const reqQty = Number(m.qty || 1)
                const matName = m.material || 'Component'
                const invMatch = inventory.find(inv => 
                  (inv.name || '').toLowerCase() === matName.toLowerCase() ||
                  (inv.sku || '').toLowerCase() === matName.toLowerCase()
                )

                const alreadyIssuedQty = issuedList
                  .filter((im: any) => 
                    (im.itemName && im.itemName.toLowerCase() === matName.toLowerCase()) ||
                    (im.notes && im.notes.toLowerCase().includes(matName.toLowerCase())) ||
                    (invMatch && im.inventoryId === invMatch.id)
                  )
                  .reduce((sum: number, im: any) => sum + Number(im.qty || 0), 0)

                const pendingQty = Math.max(0, reqQty - alreadyIssuedQty)
                const stockQty = invMatch ? Number(invMatch.quantity || 0) : 0
                const hasStock = stockQty >= (pendingQty > 0 ? pendingQty : reqQty)

                let itemStatus: 'Pending' | 'Partial' | 'Issued' = 'Pending'
                if (alreadyIssuedQty >= reqQty) {
                  itemStatus = 'Issued'
                } else if (alreadyIssuedQty > 0) {
                  itemStatus = 'Partial'
                }

                items.push({
                  id: `quote-manual-${wo.id}-${bIdx}-${mIdx}`,
                  workOrderId: wo.id,
                  workOrderNo: wo.orderNo || wo.id,
                  workOrderTitle: wo.title || 'Precision Machining Job',
                  customerId: wo.customerId || '',
                  customerName: wo.customerName || wo.customer || 'Direct Factory Order',
                  deadline: wo.deadline,
                  priority: wo.priority || 'Normal',
                  partTitle,
                  material: matName,
                  spec: m.notes || 'Hardware / Bought-out',
                  profile: 'Bought-out',
                  requiredQty: reqQty,
                  unit: m.unit || 'pcs',
                  unitCost: Number(m.unitPrice || invMatch?.unitCost || 0),
                  totalCost: reqQty * Number(m.unitPrice || invMatch?.unitCost || 0),
                  invMatch,
                  alreadyIssuedQty,
                  pendingQty,
                  status: itemStatus,
                  hasStock,
                  stockQty,
                  notes: m.notes
                })
              })
            })
          }
        }
      }
    })

    return items
  }, [workOrders, inventory, quotations])

  // Filtered Planned BOM Requirements
  const filteredBomItems = useMemo(() => {
    return allBomRequirements.filter(item => {
      // 1. Search
      const q = search.trim().toLowerCase()
      const matchSearch = !q ||
        item.workOrderNo.toLowerCase().includes(q) ||
        item.workOrderTitle.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.spec.toLowerCase().includes(q)

      // 2. Status Filter
      let matchStatus = true
      if (statusFilter === 'pending') {
        matchStatus = item.status === 'Pending'
      } else if (statusFilter === 'partial') {
        matchStatus = item.status === 'Partial'
      } else if (statusFilter === 'issued') {
        matchStatus = item.status === 'Issued'
      } else if (statusFilter === 'shortage') {
        matchStatus = item.pendingQty > 0 && !item.hasStock
      }

      // 3. Work Order Filter
      const matchWo = woFilter === 'all' || item.workOrderId === woFilter

      return matchSearch && matchStatus && matchWo
    })
  }, [allBomRequirements, search, statusFilter, woFilter])

  // Summary Metrics KPIs for Storekeeper
  const storeMetrics = useMemo(() => {
    const totalItems = allBomRequirements.length
    const pendingItems = allBomRequirements.filter(i => i.status !== 'Issued').length
    const shortageItems = allBomRequirements.filter(i => i.pendingQty > 0 && !i.hasStock).length
    
    // Total jobs needing materials
    const jobsNeedingMats = new Set(
      allBomRequirements.filter(i => i.status !== 'Issued').map(i => i.workOrderId)
    ).size

    // All issued records in stock ledger where type === 'OUT'
    const totalIssuedRecords = stockLedger.filter((l: any) => l.type === 'OUT')
    const totalDispatchedValue = totalIssuedRecords.reduce((sum: number, l: any) => sum + Number(l.totalCost || (l.qty * l.unitCost) || 0), 0)

    return {
      jobsNeedingMats,
      pendingItems,
      shortageItems,
      totalIssuedCount: totalIssuedRecords.length,
      totalDispatchedValue
    }
  }, [allBomRequirements, stockLedger])

  // Grouped by Work Order for Accordion / Card View
  const groupedByWorkOrder = useMemo(() => {
    const map = new Map<string, {
      workOrder: any
      items: PlannedBomItem[]
      allIssued: boolean
      hasShortage: boolean
    }>()

    filteredBomItems.forEach(item => {
      if (!map.has(item.workOrderId)) {
        const wo = workOrders.find(w => w.id === item.workOrderId) || {
          id: item.workOrderId,
          orderNo: item.workOrderNo,
          title: item.workOrderTitle,
          customerName: item.customerName
        }
        map.set(item.workOrderId, {
          workOrder: wo,
          items: [],
          allIssued: true,
          hasShortage: false
        })
      }

      const group = map.get(item.workOrderId)!
      group.items.push(item)
      if (item.status !== 'Issued') group.allIssued = false
      if (item.pendingQty > 0 && !item.hasStock) group.hasShortage = true
    })

    return Array.from(map.values())
  }, [filteredBomItems, workOrders])

  // Material Issue Ledger (Dispatches)
  const materialDispatches = useMemo(() => {
    return stockLedger
      .filter((l: any) => l.type === 'OUT')
      .map((l: any) => {
        const wo = workOrders.find(w => w.id === l.reference || w.orderNo === l.reference)
        return {
          ...l,
          workOrder: wo || null,
          workOrderNo: wo ? (wo.orderNo || wo.id) : (l.reference || 'Shopfloor Job'),
          customerName: wo ? wo.customerName : null
        }
      })
      .filter((l: any) => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return (
          (l.materialName || '').toLowerCase().includes(q) ||
          (l.workOrderNo || '').toLowerCase().includes(q) ||
          (l.sku || '').toLowerCase().includes(q) ||
          (l.notes || '').toLowerCase().includes(q) ||
          (l.user || '').toLowerCase().includes(q)
        )
      })
  }, [stockLedger, workOrders, search])

  // Handler: Open Issue Modal for a specific BOM item
  const handleOpenIssueForBom = (item: PlannedBomItem) => {
    setSelectedBomItem(item)
    setIssueForm({
      workOrderId: item.workOrderId,
      inventoryId: item.invMatch ? item.invMatch.id : '',
      materialName: item.material,
      qty: item.pendingQty > 0 ? item.pendingQty : item.requiredQty,
      unit: item.unit,
      unitCost: item.unitCost,
      batchRef: '',
      notes: `Issued against planned requirement for ${item.workOrderNo} (${item.partTitle})`,
      issuedBy: user?.name || 'Storekeeper',
      date: new Date().toISOString().slice(0, 10)
    })
    setShowIssueModal(true)
  }

  // Handler: Submit Issue to Work Order
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueForm.workOrderId) {
      setToastMsg({ type: 'error', text: 'Please select a valid Work Order.' })
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        inventoryId: issueForm.inventoryId || null,
        materialName: issueForm.materialName,
        qty: Number(issueForm.qty),
        unit: issueForm.unit,
        unitCost: Number(issueForm.unitCost),
        notes: [
          issueForm.notes,
          issueForm.batchRef ? `Heat/Batch: ${issueForm.batchRef}` : ''
        ].filter(Boolean).join(' | '),
        user: issueForm.issuedBy || user?.name || 'Storekeeper'
      }

      await issueMaterialToWorkOrder(issueForm.workOrderId, payload)
      setToastMsg({ 
        type: 'success', 
        text: `Successfully issued ${issueForm.qty} ${issueForm.unit} of ${issueForm.materialName} to ${issueForm.workOrderId}.` 
      })

      setShowIssueModal(false)
      loadData()
    } catch (err: any) {
      console.error('Failed to issue material:', err)
      setToastMsg({ type: 'error', text: err.message || 'Failed to issue material to job.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Direct Ad-Hoc Store Issue Submit
  const handleDirectIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directForm.workOrderId) {
      setToastMsg({ type: 'error', text: 'Please select a target Work Order.' })
      return
    }
    if (!directForm.materialName) {
      setToastMsg({ type: 'error', text: 'Please enter a material name or choose from stock.' })
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        inventoryId: directForm.inventoryId || null,
        materialName: directForm.materialName,
        qty: Number(directForm.qty),
        unit: directForm.unit,
        unitCost: Number(directForm.unitCost),
        notes: [
          directForm.notes,
          directForm.batchRef ? `Heat/Batch: ${directForm.batchRef}` : ''
        ].filter(Boolean).join(' | '),
        user: directForm.issuedBy || user?.name || 'Storekeeper'
      }

      await issueMaterialToWorkOrder(directForm.workOrderId, payload)
      setToastMsg({ 
        type: 'success', 
        text: `Direct material issue completed: ${directForm.qty} ${directForm.unit} issued to Work Order.` 
      })

      // Reset form
      setDirectForm({
        workOrderId: '',
        inventoryId: '',
        materialName: '',
        qty: 1,
        unit: 'pcs',
        unitCost: 0,
        batchRef: '',
        notes: '',
        issuedBy: user?.name || 'Storekeeper',
        date: new Date().toISOString().slice(0, 10)
      })

      loadData()
      setActiveTab('history')
    } catch (err: any) {
      console.error('Failed direct issue:', err)
      setToastMsg({ type: 'error', text: err.message || 'Failed to process direct material issue.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handler: Navigate to LinearStockCutStudio for raw bars / remnants
  const handleNavigateToCutStudio = (item: PlannedBomItem) => {
    navigate('/inventory', {
      state: {
        openCutStudioWithJobRef: item.workOrderNo,
        cutMaterial: item.material,
        cutLength: item.length || (item.spec?.match(/L:\s*(\d+(\.\d+)?)/i)?.[1] || null),
        cutQty: item.pendingQty > 0 ? item.pendingQty : item.requiredQty,
        tab: 'linear_remnants'
      }
    })
  }

  // Handler: Print Goods Issue Note (GIN) for a specific dispatch or work order batch
  const handlePrintGin = (dispatch: any) => {
    setPrintGinModal({
      isOpen: true,
      job: dispatch.workOrder,
      items: [dispatch],
      ginNo: dispatch.id || `GIN-${Date.now().toString().slice(-5)}`,
      date: dispatch.date ? new Date(dispatch.date).toLocaleDateString() : new Date().toLocaleDateString(),
      storekeeper: dispatch.user || user?.name || 'Storekeeper'
    })
  }

  const handlePrintBatchGinForJob = (group: { workOrder: any; items: PlannedBomItem[] }) => {
    // Gather all ledger records for this job
    const jobLedgers = stockLedger.filter((l: any) => l.type === 'OUT' && (l.reference === group.workOrder.id || l.reference === group.workOrder.orderNo))
    
    setPrintGinModal({
      isOpen: true,
      job: group.workOrder,
      items: jobLedgers.length > 0 ? jobLedgers : group.items.filter(i => i.status === 'Issued' || i.alreadyIssuedQty > 0),
      ginNo: `GIN-${group.workOrder.orderNo || group.workOrder.id}-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleDateString(),
      storekeeper: user?.name || 'Storekeeper'
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast alert */}
      {toastMsg && (
        <div className={`p-3 rounded-none text-xs font-semibold flex items-center justify-between gap-3 shadow-sm border ${
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

      {/* ── TOP ROLE WORKFLOW GUIDE ──────────────────────────────────────────────── */}
      <div className="bg-surface2/60 border border-theme-subtle p-3 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold uppercase tracking-wider text-muted text-[10px] shrink-0">Factory Workflow:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-none bg-surface border border-theme-subtle text-muted flex items-center gap-1">
              1. Quotation <span className="text-[10px] text-muted">(Sales / Estimator)</span>
            </span>
            <ChevronRight size={12} className="text-muted"/>
            <span className="px-2 py-0.5 rounded-none bg-surface border border-theme-subtle text-muted flex items-center gap-1">
              2. Work Order <span className="text-[10px] text-muted">(Production Planner)</span>
            </span>
            <ChevronRight size={12} className="text-muted"/>
            <span className="px-2.5 py-0.5 rounded-none bg-rex-500/15 border border-rex-500/40 text-rex-600 dark:text-rex-400 font-bold flex items-center gap-1">
              3. Material Issue <span className="text-[10px] font-bold text-rex-600 dark:text-rex-400">(Storekeeper)</span>
            </span>
            <ChevronRight size={12} className="text-muted"/>
            <span className="px-2 py-0.5 rounded-none bg-surface border border-theme-subtle text-muted flex items-center gap-1">
              4. Operations Routing <span className="text-[10px] text-muted">(Shopfloor Machinists)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/inventory')} 
            className="rounded-none text-xs border-theme hover:bg-surface2"
          >
            <Boxes size={13} className="mr-1 text-secondary"/> Main Inventory
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/production')} 
            className="rounded-none text-xs border-theme hover:bg-surface2"
          >
            <Factory size={13} className="mr-1 text-secondary"/> Production Jobs
          </Button>
        </div>
      </div>

      {/* ── HEADER BANNER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              <PackageCheck size={22} className="text-rex-600"/> Material Issue Station
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/30 font-bold">
              Stores & Warehousing
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Storekeeper dispatch terminal — verify BOM requirements, issue stock batches to active jobs, and generate Goods Issue Notes (GIN)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={loading}
            className="rounded-none border-theme text-xs"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`}/> Refresh
          </Button>

          <Button 
            variant="primary" 
            size="sm"
            onClick={() => {
              setActiveTab('direct_issue')
              window.scrollTo({ top: 300, behavior: 'smooth' })
            }}
            className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
          >
            <Plus size={14} className="mr-1.5"/> Direct Material Issue
          </Button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Jobs Awaiting Stock</span>
          <p className="text-xl font-mono font-bold text-primary">{storeMetrics.jobsNeedingMats}</p>
          <span className="text-[10px] text-muted">Active Work Orders</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Pending BOM Items</span>
          <p className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400">{storeMetrics.pendingItems}</p>
          <span className="text-[10px] text-muted">Material lines to issue</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Stock Shortages</span>
          <p className={`text-xl font-mono font-bold ${storeMetrics.shortageItems > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {storeMetrics.shortageItems}
          </p>
          <span className="text-[10px] text-muted">Stock &lt; Required Qty</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Dispatches Logged</span>
          <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">{storeMetrics.totalIssuedCount}</p>
          <span className="text-[10px] text-muted">Total store issue records</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none">
          <span className="text-[10px] text-muted uppercase tracking-wider block font-bold mb-1">Dispatched Value</span>
          <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(storeMetrics.totalDispatchedValue)}
          </p>
          <span className="text-[10px] text-muted">Total material cost issued</span>
        </GlassCard>
      </div>

      {/* ── NAVIGATION TABS ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-theme-subtle pb-2 overflow-x-auto">
        {[
          { id: 'requisitions', label: '1. Work Order Requisitions & BOM Picklist', icon: ClipboardList, count: storeMetrics.pendingItems },
          { id: 'direct_issue', label: '2. Quick Direct Store Issue', icon: Plus },
          { id: 'history', label: '3. Material Issue Ledger (Dispatches)', icon: History, count: storeMetrics.totalIssuedCount }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2 rounded-none text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                isActive 
                  ? 'border-b-2 border-rex-600 text-rex-600 dark:text-rex-400 font-bold bg-rex-500/10 border-rex-500/30 shadow-xs' 
                  : 'bg-surface2/40 text-secondary border-theme-subtle hover:text-primary hover:bg-surface2'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-rex-600 dark:text-rex-400' : 'text-secondary'}/>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-none font-bold ${
                  isActive ? 'bg-rex-600 text-white' : 'bg-surface2 text-muted border border-theme-subtle'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: WORK ORDER REQUISITIONS (BOM PICKLIST) ────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <GlassCard className="p-3 space-y-3 rounded-none border-theme-subtle">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {[
                  { id: 'all', label: 'All Items', count: allBomRequirements.length },
                  { id: 'pending', label: 'Fully Pending', count: allBomRequirements.filter(i => i.status === 'Pending').length },
                  { id: 'partial', label: 'Partially Issued', count: allBomRequirements.filter(i => i.status === 'Partial').length },
                  { id: 'shortage', label: 'Shortage Alert', count: storeMetrics.shortageItems },
                  { id: 'issued', label: 'Completed', count: allBomRequirements.filter(i => i.status === 'Issued').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-none uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === tab.id
                        ? 'border-b-2 border-rex-600 text-rex-600 dark:text-rex-400 font-bold bg-rex-500/10 border-rex-500/30 shadow-xs'
                        : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-mono ${
                      statusFilter === tab.id ? 'bg-rex-600 text-white font-bold' : 'text-muted'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Work Order Select & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-56">
                  <select
                    value={woFilter}
                    onChange={(e) => setWoFilter(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle rounded-none px-2.5 py-1.5 text-primary text-xs font-medium focus:border-rex-600 outline-none"
                  >
                    <option value="all">All Work Orders ({workOrders.length})</option>
                    {workOrders.map(wo => (
                      <option key={wo.id} value={wo.id}>
                        {wo.orderNo || wo.id} - {wo.title?.slice(0, 24)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-64">
                  <SearchBar 
                    value={search} 
                    onChange={setSearch} 
                    placeholder="Search Job #, Material, Customer..." 
                    className="rounded-none"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Grouped Work Orders List */}
          {loading ? (
            <div className="p-16 text-center text-xs text-muted">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-secondary"/>
              Loading work order BOM requirements and inventory matches...
            </div>
          ) : groupedByWorkOrder.length === 0 ? (
            <GlassCard className="p-12 text-center border-dashed border-theme-subtle rounded-none">
              <PackageCheck size={36} className="mx-auto text-muted mb-3 opacity-30" />
              <p className="text-sm font-bold text-secondary">No material requisitions matching your filters</p>
              <p className="text-xs text-muted mt-1">
                Either all active Work Orders have their materials fully issued, or no Work Orders have BOM items defined yet.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setSearch(''); setStatusFilter('all'); setWoFilter('all') }}
                  className="rounded-none text-xs border-theme"
                >
                  Clear Filters
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setActiveTab('direct_issue')}
                  className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
                >
                  <Plus size={13} className="mr-1"/> Direct Store Issue
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {groupedByWorkOrder.map((group) => {
                const wo = group.workOrder
                const items = group.items
                const totalReq = items.length
                const issuedCount = items.filter(i => i.status === 'Issued').length
                const pct = totalReq > 0 ? Math.round((issuedCount / totalReq) * 100) : 0

                return (
                  <GlassCard key={wo.id} className="p-0 border-theme-subtle rounded-none overflow-hidden">
                    {/* Job Card Header */}
                    <div className="p-4 bg-surface2/50 border-b border-theme-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold tracking-wider bg-rex-500/10 text-rex-600 dark:text-rex-400 px-2 py-0.5 rounded-none border border-rex-500/30">
                            {wo.orderNo || wo.id}
                          </span>
                          <span className="text-[10px] text-muted font-mono bg-surface2 px-1.5 py-0.2 rounded-none border border-theme-subtle">
                            Job ID: {wo.id}
                          </span>
                          {wo.customerName && (
                            <span className="text-[11px] font-medium text-secondary flex items-center gap-1">
                              <Building size={11} className="text-secondary"/> {wo.customerName}
                            </span>
                          )}
                          <Badge 
                            value={wo.priority || 'Normal'} 
                            variant={wo.priority === 'Urgent' ? 'error' : wo.priority === 'High' ? 'warning' : 'default'} 
                            className="rounded-none text-[10px]"
                          />
                          {group.hasShortage && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              <AlertTriangle size={10}/> Stock Shortage Detected
                            </span>
                          )}
                          {group.allIssued && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-green-500/10 text-green-600 border border-green-500/20">
                              <CheckCircle2 size={10}/> All Materials Issued
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-primary">
                          {wo.title}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span>Target: <strong className="text-primary font-mono">{wo.jobQty || 1}</strong> pcs</span>
                          {wo.deadline && (
                            <span>Due: <strong className="text-primary">{formatDate(wo.deadline)}</strong></span>
                          )}
                          <span>Total BOM Items: <strong className="text-primary font-mono">{items.length}</strong></span>
                        </div>
                      </div>

                      {/* Fulfillment Progress & Quick GIN Print */}
                      <div className="flex items-center gap-3">
                        <div className="w-36 space-y-1 text-right">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted">Fulfillment:</span>
                            <span className="font-mono font-bold text-primary">{pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-surface2 rounded-none overflow-hidden border border-theme-subtle">
                            <div 
                              className={`h-full transition-all duration-300 ${pct === 100 ? 'bg-green-600' : 'bg-rex-600'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted block">
                            {issuedCount}/{totalReq} Items Issued
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintBatchGinForJob(group)}
                            className="text-xs text-secondary border-theme hover:bg-surface2 rounded-none"
                            title="Print Goods Issue Note (GIN) for this Job"
                          >
                            <Printer size={12} className="mr-1 text-secondary"/> Print GIN
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/production/work-orders/${wo.id}`)}
                            className="text-xs text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none font-bold"
                            title="Open full execution view"
                          >
                            <ExternalLink size={12} className="mr-1"/> Job View
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* BOM Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-surface2/30 border-b border-theme-subtle text-left text-muted font-bold">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Material Description & Spec</th>
                            <th className="py-2.5 px-3">Part Scope</th>
                            <th className="py-2.5 px-3 text-right">Required Qty</th>
                            <th className="py-2.5 px-3 text-right">Already Issued</th>
                            <th className="py-2.5 px-3 text-right">Pending Balance</th>
                            <th className="py-2.5 px-3 text-center">Available Stock</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-subtle">
                          {items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-surface2/20">
                              <td className="py-2 px-3 text-muted font-mono">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-primary block">{item.material}</span>
                                {item.spec && (
                                  <span className="text-[10px] text-muted block font-mono">{item.spec}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-secondary text-[11px]">
                                {item.partTitle}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                                {item.requiredQty} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                {item.alreadyIssuedQty > 0 ? (
                                  <span className="text-emerald-600 font-bold">{item.alreadyIssuedQty} {item.unit}</span>
                                ) : (
                                  <span className="text-muted">0 {item.unit}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {item.pendingQty > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400">{item.pendingQty} {item.unit}</span>
                                ) : (
                                  <span className="text-green-600 flex items-center justify-end gap-1">
                                    <Check size={11}/> Complete
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {item.invMatch ? (
                                  item.hasStock ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-green-500/10 text-green-600 border border-green-500/20">
                                      <Check size={9}/> {item.stockQty} {item.invMatch.uom || item.unit} in Stock
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                      <AlertTriangle size={9}/> Shortage (Stock: {item.stockQty})
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-muted italic">Non-catalog item</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {item.status !== 'Issued' ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenIssueForBom(item)}
                                        className="text-[11px] py-1 px-2.5 h-auto bg-rex-500/10 hover:bg-rex-500/20 text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:border-rex-500/60 rounded-none font-bold inline-flex items-center shadow-xs"
                                        title="Issue material from stock to this job"
                                      >
                                        <Package size={11} className="mr-1 text-rex-600 dark:text-rex-400"/> Issue Material
                                      </Button>

                                      {(item.dia || item.length || item.profile === 'Round Bar') && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleNavigateToCutStudio(item)}
                                          className="text-[11px] py-1 px-2 h-auto text-amber-600 border-amber-500/30 hover:bg-amber-500/10 rounded-none font-bold inline-flex items-center"
                                          title="Cut raw bar or remnant in Linear Cut Studio"
                                        >
                                          <Scissors size={11} className="mr-1"/> Cut in Studio
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-green-600 font-bold inline-flex items-center gap-1">
                                      <Check size={12}/> Fully Dispatched
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: DIRECT AD-HOC STORE ISSUE FORM ─────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'direct_issue' && (
        <GlassCard className="p-6 border-theme-subtle rounded-none space-y-6 max-w-4xl">
          <div className="border-b border-theme-subtle pb-3">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Package size={16} className="text-rex-600"/> Direct Material Issue to Work Order
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Issue ad-hoc raw stock, bolts, hardware, or replacement materials directly to a shop floor job without waiting for engineering BOM edits.
            </p>
          </div>

          <form onSubmit={handleDirectIssueSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Target Work Order *</label>
                <select
                  required
                  value={directForm.workOrderId}
                  onChange={(e) => setDirectForm({ ...directForm, workOrderId: e.target.value })}
                  className="w-full input-base text-xs rounded-none font-bold"
                >
                  <option value="">-- Choose Active Job / Work Order --</option>
                  {workOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>
                      {wo.orderNo || wo.id} - {wo.title} ({wo.customerName || 'Factory Job'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Select from Inventory Catalog</label>
                <select
                  value={directForm.inventoryId}
                  onChange={(e) => {
                    const inv = inventory.find(i => i.id === e.target.value)
                    setDirectForm({
                      ...directForm,
                      inventoryId: e.target.value,
                      materialName: inv ? inv.name : directForm.materialName,
                      unit: inv?.uom || directForm.unit,
                      unitCost: Number(inv?.unitCost || directForm.unitCost)
                    })
                  }}
                  className="w-full input-base text-xs rounded-none"
                >
                  <option value="">-- Choose Stock Item (or type below) --</option>
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.sku}) - Avail: {inv.quantity} {inv.uom} (Rs. {inv.unitCost})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Material Name / Description *</label>
                <input
                  type="text"
                  required
                  value={directForm.materialName}
                  onChange={(e) => setDirectForm({ ...directForm, materialName: e.target.value })}
                  placeholder="e.g. EN24 Round Bar Ø60mm, M16 High-Tensile Bolts..."
                  className="w-full input-base text-xs rounded-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Heat / Batch # / Remnant Tag</label>
                <input
                  type="text"
                  value={directForm.batchRef}
                  onChange={(e) => setDirectForm({ ...directForm, batchRef: e.target.value })}
                  placeholder="e.g. Heat #H-9812, Rack B2-Top"
                  className="w-full input-base text-xs rounded-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Issue Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={directForm.qty}
                  onChange={(e) => setDirectForm({ ...directForm, qty: Number(e.target.value) })}
                  className="w-full input-base text-xs rounded-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={directForm.unit}
                  onChange={(e) => setDirectForm({ ...directForm, unit: e.target.value })}
                  placeholder="pcs, ft, kg, rods..."
                  className="w-full input-base text-xs rounded-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Unit Cost (LKR)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={directForm.unitCost}
                  onChange={(e) => setDirectForm({ ...directForm, unitCost: Number(e.target.value) })}
                  className="w-full input-base text-xs rounded-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Storekeeper Signature / Name</label>
                <input
                  type="text"
                  value={directForm.issuedBy}
                  onChange={(e) => setDirectForm({ ...directForm, issuedBy: e.target.value })}
                  className="w-full input-base text-xs rounded-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Dispatch Notes / Remarks</label>
                <input
                  type="text"
                  value={directForm.notes}
                  onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
                  placeholder="e.g. Cut from 6m stock rod, operator collected"
                  className="w-full input-base text-xs rounded-none"
                />
              </div>
            </div>

            {/* Total Cost Preview */}
            <div className="p-3.5 bg-surface2/60 border border-theme-subtle rounded-none flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Estimated Direct Material Job Charge:</span>
              <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                {formatCurrency(Number(directForm.qty || 1) * Number(directForm.unitCost || 0))}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => setActiveTab('requisitions')} 
                className="rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={submitting} 
                className="rounded-none text-xs font-bold bg-rex-600 hover:bg-rex-700 text-white shadow-xs"
              >
                {submitting ? 'Issuing...' : 'Confirm Dispatch & Deduct Stock'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: MATERIAL ISSUE LEDGER & DISPATCH AUDIT LOG ─────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <GlassCard className="p-3 space-y-3 rounded-none border-theme-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-80">
                <SearchBar 
                  value={search} 
                  onChange={setSearch} 
                  placeholder="Filter dispatches by material, job #, user..." 
                  className="rounded-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-mono">
                  Showing <strong>{materialDispatches.length}</strong> material dispatch records
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadData} 
                  disabled={loading}
                  className="rounded-none text-xs border-theme"
                >
                  <RefreshCw size={12} className={`mr-1 ${loading ? 'animate-spin' : ''}`}/> Refresh
                </Button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-0 border-theme-subtle rounded-none overflow-hidden">
            {materialDispatches.length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">
                <History size={32} className="mx-auto mb-2 opacity-30 text-secondary"/>
                No material issues recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">GIN / Record Ref</th>
                      <th className="py-2.5 px-3">Target Work Order</th>
                      <th className="py-2.5 px-3">Material Description</th>
                      <th className="py-2.5 px-3 text-right">Issued Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Total Cost</th>
                      <th className="py-2.5 px-3">Issued By</th>
                      <th className="py-2.5 px-3">Notes / Batch</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle">
                    {materialDispatches.map((record: any) => {
                      const matCost = Number(record.totalCost || (Number(record.qty || 0) * Number(record.unitCost || 0)))
                      return (
                        <tr key={record.id} className="hover:bg-surface2/20">
                          <td className="py-2.5 px-3 text-muted font-mono whitespace-nowrap">
                            {record.date ? new Date(record.date).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-rex-600 dark:text-rex-400">
                            {record.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-primary block">{record.workOrderNo}</span>
                            {record.customerName && (
                              <span className="text-[10px] text-muted truncate block">{record.customerName}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-primary">
                            {record.materialName || 'Raw Material Stock'}
                            {record.sku && (
                              <span className="text-[10px] text-muted font-mono block">{record.sku}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                            {Number(record.qty).toFixed(1)} {record.unit || record.uom || 'pcs'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted">
                            {formatCurrency(record.unitCost || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(matCost)}
                          </td>
                          <td className="py-2.5 px-3 text-secondary text-[11px]">
                            {record.user || 'Storekeeper'}
                          </td>
                          <td className="py-2.5 px-3 text-muted text-[11px] max-w-xs truncate" title={record.notes}>
                            {record.notes || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintGin(record)}
                              className="text-[11px] py-1 px-2 h-auto text-secondary border-theme hover:bg-surface2 rounded-none inline-flex items-center"
                              title="Print Goods Issue Note (GIN)"
                            >
                              <Printer size={11} className="mr-1"/> Print GIN
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── MODAL: ISSUE MATERIAL FOR SPECIFIC BOM REQUIREMENT ─────────────────────── */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Material to Work Order" size="lg">
        <form onSubmit={handleIssueSubmit} className="p-4 space-y-4">
          {selectedBomItem && (
            <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-none flex items-center justify-between text-xs">
              <div>
                <span className="text-muted block text-[10px] uppercase font-bold">Allocating to Job:</span>
                <span className="font-bold text-primary text-sm font-mono">{selectedBomItem.workOrderNo}</span>
                <span className="text-secondary ml-2 font-semibold">({selectedBomItem.workOrderTitle})</span>
              </div>
              <div className="text-right">
                <span className="text-muted block text-[10px] uppercase font-bold">Planned Qty:</span>
                <span className="font-mono font-bold text-primary">{selectedBomItem.requiredQty} {selectedBomItem.unit}</span>
                <span className="text-muted block text-[10px]">Issued: {selectedBomItem.alreadyIssuedQty} | Pending: {selectedBomItem.pendingQty}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Select from Inventory Catalog</label>
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
                <option value="">-- Choose Stock Item (or custom below) --</option>
                {inventory.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.sku}) - Avail: {inv.quantity} {inv.uom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Material Description *</label>
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
              <label className="block text-xs font-bold text-secondary mb-1">Quantity to Issue *</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Heat / Batch # / Lot Ref</label>
              <input
                type="text"
                value={issueForm.batchRef}
                onChange={(e) => setIssueForm({ ...issueForm, batchRef: e.target.value })}
                placeholder="e.g. Heat batch #2026-X1"
                className="w-full input-base text-xs rounded-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Storekeeper Signature</label>
              <input
                type="text"
                value={issueForm.issuedBy}
                onChange={(e) => setIssueForm({ ...issueForm, issuedBy: e.target.value })}
                className="w-full input-base text-xs rounded-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Store Notes / Remnant Reference</label>
            <input
              type="text"
              value={issueForm.notes}
              onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
              placeholder="e.g. Issued from Rack A-4, operator picked up"
              className="w-full input-base text-xs rounded-none"
            />
          </div>

          <div className="p-3 bg-surface2/60 border border-theme-subtle rounded-none flex items-center justify-between text-xs">
            <span className="text-secondary font-medium">Total Charge to Work Order:</span>
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
              {formatCurrency(Number(issueForm.qty || 1) * Number(issueForm.unitCost || 0))}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setShowIssueModal(false)} className="rounded-none">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting} className="rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold shadow-xs">
              {submitting ? 'Issuing...' : 'Confirm Dispatch & Deduct Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── PRINTABLE GOODS ISSUE NOTE (GIN) MODAL ─────────────────────────────────── */}
      {printGinModal && (
        <Modal 
          isOpen={printGinModal.isOpen} 
          onClose={() => setPrintGinModal(null)} 
          title={`Goods Issue Note: ${printGinModal.ginNo}`} 
          size="lg"
        >
          <div className="p-6 space-y-6 bg-white text-slate-900 font-sans print:p-0">
            {/* GIN Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-rex-700">REX INDUSTRIES (PVT) LTD</h2>
                <p className="text-xs text-slate-600 mt-0.5">Heavy Engineering & Precision Machining Specialists</p>
                <p className="text-[11px] text-slate-500">Workshop & Stores Division, Colombo, Sri Lanka</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 text-xs font-black tracking-widest uppercase bg-slate-900 text-white">
                  GOODS ISSUE NOTE
                </span>
                <p className="text-xs font-mono font-bold mt-1 text-slate-800">GIN #: {printGinModal.ginNo}</p>
                <p className="text-xs text-slate-600">Date: {printGinModal.date}</p>
              </div>
            </div>

            {/* Target Job Details */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-100 border border-slate-300 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Work Order</span>
                <strong className="text-sm font-bold text-slate-900 font-mono">
                  {printGinModal.job?.orderNo || printGinModal.job?.id || 'Shopfloor Job'}
                </strong>
                <p className="text-slate-700 mt-0.5 font-medium">{printGinModal.job?.title || 'Precision Machining'}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer / Department</span>
                <strong className="text-slate-900 font-bold">
                  {printGinModal.job?.customerName || printGinModal.job?.customer || 'In-House Production'}
                </strong>
                <p className="text-slate-600 mt-0.5">Dispatched from: <strong>Main Engineering Stores</strong></p>
              </div>
            </div>

            {/* Materials Table */}
            <div className="border border-slate-300">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-800 text-left">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Material Description</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Unit Rate</th>
                    <th className="py-2 px-3 text-right">Total (LKR)</th>
                    <th className="py-2 px-3">Batch / Heat Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {printGinModal.items.map((it: any, idx: number) => {
                    const itCost = Number(it.totalCost || (Number(it.qty || it.requiredQty || 1) * Number(it.unitCost || 0)))
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {it.materialName || it.material || 'Raw Material'}
                          {it.spec && <span className="block text-[10px] text-slate-500 font-normal">{it.spec}</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {it.qty || it.requiredQty || 1} {it.unit || it.uom || 'pcs'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatCurrency(it.unitCost || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(itCost)}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">
                          {it.notes || it.batchRef || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
                    <td colSpan={4} className="py-2 px-3 text-right uppercase text-[10px]">Total Material Value:</td>
                    <td className="py-2 px-3 text-right font-mono text-sm">
                      {formatCurrency(
                        printGinModal.items.reduce((sum: number, it: any) => sum + Number(it.totalCost || (Number(it.qty || it.requiredQty || 1) * Number(it.unitCost || 0))), 0)
                      )}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Box */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-300 text-xs text-center">
              <div>
                <div className="border-b border-slate-400 pb-12 mb-1.5"/>
                <p className="font-bold text-slate-900">Issued by (Storekeeper)</p>
                <p className="text-[10px] text-slate-500">{printGinModal.storekeeper}</p>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-12 mb-1.5"/>
                <p className="font-bold text-slate-900">Received by (Machinist / Tech)</p>
                <p className="text-[10px] text-slate-500">Name & ID Signature</p>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-12 mb-1.5"/>
                <p className="font-bold text-slate-900">Authorized by (Engineer)</p>
                <p className="text-[10px] text-slate-500">QA / Floor Supervisor</p>
              </div>
            </div>

            {/* Print & Action Controls */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 print:hidden">
              <Button variant="ghost" onClick={() => setPrintGinModal(null)} className="rounded-none">
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()} 
                className="rounded-none bg-slate-900 text-white font-bold"
              >
                <Printer size={13} className="mr-1"/> Print Official GIN Slip
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
