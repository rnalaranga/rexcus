import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Scissors,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  Edit3,
  Printer,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Package,
  Layers,
  Check,
  X,
  Info,
  Tag,
  Warehouse,
  History,
  AlertCircle,
  Lock,
  ShieldAlert,
  Wrench
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useStockRemnants } from '@/hooks/useData'
import {
  executeCutIssue,
  createStockRemnant,
  updateStockRemnant,
  deleteStockRemnant,
  fetchWorkOrders
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

export const formatLinearDisplay = (val: number | string, currentUnit: string) => {
  const num = Number(val) || 0
  const u = (currentUnit || 'ft').toLowerCase()
  if (u === 'ft' || u === 'feet') {
    const totalInches = Math.round(num * 12)
    const f = Math.floor(totalInches / 12)
    const i = totalInches % 12
    if (i === 0) return `${f} ft (${totalInches} in)`
    return `${f} ft ${i} in (${totalInches} in)`
  }
  if (u === 'in' || u === 'inch' || u === 'inches') {
    const totalInches = Math.round(num)
    const f = Math.floor(totalInches / 12)
    const i = totalInches % 12
    if (f === 0) return `${totalInches} in`
    return `${totalInches} in (${f} ft ${i} in)`
  }
  if (u === 'mm') {
    const inches = (num / 25.4).toFixed(1)
    return `${num} mm (~${inches}")`
  }
  if (u === 'm') {
    const totalInches = Math.round(num * 39.3701)
    const f = Math.floor(totalInches / 12)
    const i = totalInches % 12
    return `${num.toFixed(2)} m (${f} ft ${i} in)`
  }
  return `${num} ${currentUnit}`
}

interface LinearStockCutStudioProps {
  inventoryList: any[]
  onRefreshInventory?: () => void
  showToast?: (type: any, title: string, message?: string) => void
  initialInventoryId?: string
  onBackToInventory?: () => void
}

export const LinearStockCutStudio: React.FC<LinearStockCutStudioProps> = ({
  inventoryList,
  onRefreshInventory,
  showToast = () => {},
  initialInventoryId,
  onBackToInventory
}) => {
  // 1. Data Hooks
  const { data: remnants = [], loading: remnantsLoading, refetch: refetchRemnants } = useStockRemnants()

  // Fetch Work Orders for Job Reference Dropdown
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoadingWorkOrders(true)
    fetchWorkOrders()
      .then((data: any) => {
        if (isMounted && Array.isArray(data)) {
          setWorkOrders(data)
        }
      })
      .catch((err) => console.error('Failed to load work orders for studio:', err))
      .finally(() => {
        if (isMounted) setLoadingWorkOrders(false)
      })
    return () => { isMounted = false }
  }, [])

  // 2. Linear inventory candidates (raw materials or bars, rods, shafts, pipes, plates)
  const linearItems = useMemo(() => {
    return inventoryList.filter(item => {
      const typeMatch = item.type === 'raw_material' || !item.type
      const name = (item.name || '').toLowerCase()
      const uom = (item.uom || '').toLowerCase()
      const linearKeywords = ['shaft', 'bar', 'rod', 'pipe', 'tube', 'angle', 'channel', 'beam', 'wire', 'cable', 'sheet', 'plate']
      const linearUoms = ['ft', 'feet', 'm', 'meter', 'meters', 'mm', 'inch', 'in', 'length', 'pcs']
      const keywordHit = linearKeywords.some(k => name.includes(k))
      const uomHit = linearUoms.includes(uom)
      return typeMatch || keywordHit || uomHit
    })
  }, [inventoryList])

  // 3. Studio Cut Planning State
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(
    initialInventoryId || (linearItems.length > 0 ? linearItems[0].id : '')
  )
  const selectedInventoryItem = useMemo(() => {
    return inventoryList.find(i => i.id === selectedInventoryId)
  }, [inventoryList, selectedInventoryId])

  // Custom or auto parameters
  const [materialName, setMaterialName] = useState<string>('8mm Mild Steel Shaft')
  const [standardBarLength, setStandardBarLength] = useState<number>(12)
  const [unit, setUnit] = useState<string>('ft')
  const [dimension, setDimension] = useState<string>('8mm Round')
  const [profileType, setProfileType] = useState<string>('round_shaft')

  // When inventory item is picked, pre-populate standard attributes
  const handleSelectInventory = (itemId: string) => {
    setSelectedInventoryId(itemId)
    const item = inventoryList.find(i => i.id === itemId)
    if (item) {
      setMaterialName(item.name || 'Linear Bar')
      const itemUom = (item.uom || '').toLowerCase()
      if (['ft', 'feet'].includes(itemUom)) {
        setUnit('ft')
        setStandardBarLength(12)
        setSawKerf(0.01)
      } else if (['in', 'inch', 'inches'].includes(itemUom)) {
        setUnit('in')
        setStandardBarLength(144)
        setSawKerf(0.125)
      } else if (['m', 'meter', 'meters'].includes(itemUom)) {
        setUnit('m')
        setStandardBarLength(6)
        setSawKerf(0.003)
      } else if (itemUom === 'mm') {
        setUnit('mm')
        setStandardBarLength(6000)
        setSawKerf(3)
      }
      // Heuristic extraction for dimensions if present (e.g. "8mm", "12mm")
      const dimMatch = item.name.match(/\b\d+(\.\d+)?\s*(mm|inch|"|cm)\b/i)
      if (dimMatch) {
        setDimension(dimMatch[0])
      }
    }
  }

  // Sync initialInventoryId when passed or changed externally
  useEffect(() => {
    if (initialInventoryId) {
      handleSelectInventory(initialInventoryId)
    }
  }, [initialInventoryId])

  // Required cut inputs with 1-inch precision support
  const [requiredLength, setRequiredLength] = useState<number>(4)
  const [cutFeet, setCutFeet] = useState<number>(4)
  const [cutInches, setCutInches] = useState<number>(0)
  const [cutQuantity, setCutQuantity] = useState<number>(1)
  const [sawKerf, setSawKerf] = useState<number>(0.01) // blade kerf (~1/8" in ft)

  // STRICT REQUIREMENT: Job Number / Work Order # is strictly mandatory for Material Issue!
  const [jobRef, setJobRef] = useState<string>('')
  const [manualJobMode, setManualJobMode] = useState<boolean>(false)

  const [selectedSourceType, setSelectedSourceType] = useState<'remnant' | 'full_bar'>('remnant')
  const [selectedRemnantId, setSelectedRemnantId] = useState<string>('')
  const [targetLocation, setTargetLocation] = useState<string>('Rack-A2 (Offcuts Shelf)')

  // Handlers for 1-inch and feet/inches precision
  const handleFeetChange = (val: number) => {
    const f = Math.max(0, val)
    setCutFeet(f)
    const totalFt = Number((f + (cutInches / 12)).toFixed(4))
    setRequiredLength(totalFt)
  }

  const handleInchesChange = (val: number) => {
    const i = Math.max(0, Math.min(11, val))
    setCutInches(i)
    const totalFt = Number((cutFeet + (i / 12)).toFixed(4))
    setRequiredLength(totalFt)
  }

  const handleDirectLengthChange = (val: number) => {
    const len = Math.max(0.01, val)
    setRequiredLength(len)
    if (unit === 'ft') {
      const totalIn = Math.round(len * 12)
      setCutFeet(Math.floor(totalIn / 12))
      setCutInches(totalIn % 12)
    }
  }

  const handleAdjustInches = (deltaInches: number) => {
    if (unit === 'ft') {
      const currentIn = Math.max(1, Math.round((cutFeet * 12 + cutInches) + deltaInches))
      const f = Math.floor(currentIn / 12)
      const i = currentIn % 12
      setCutFeet(f)
      setCutInches(i)
      setRequiredLength(Number((currentIn / 12).toFixed(4)))
    } else if (unit === 'in') {
      setRequiredLength(Math.max(1, Math.round(requiredLength + deltaInches)))
    } else {
      setRequiredLength(Math.max(0.1, Number((requiredLength + (deltaInches * (unit === 'mm' ? 25.4 : 0.0254))).toFixed(2))))
    }
  }

  const handleUnitChange = (newUnit: string) => {
    if (newUnit === unit) return
    const prevUnit = unit
    setUnit(newUnit)

    if (prevUnit === 'ft' && newUnit === 'in') {
      const inVal = Math.round(requiredLength * 12)
      setRequiredLength(inVal)
      setStandardBarLength(Math.round(standardBarLength * 12))
      setSawKerf(0.125)
    } else if (prevUnit === 'in' && newUnit === 'ft') {
      const ftVal = Number((requiredLength / 12).toFixed(4))
      setRequiredLength(ftVal)
      setCutFeet(Math.floor(ftVal))
      setCutInches(Math.round((ftVal - Math.floor(ftVal)) * 12))
      setStandardBarLength(Number((standardBarLength / 12).toFixed(2)))
      setSawKerf(0.01)
    } else if (newUnit === 'in') {
      setSawKerf(0.125)
    } else if (newUnit === 'ft') {
      setSawKerf(0.01)
    } else if (newUnit === 'mm') {
      setSawKerf(3)
    } else if (newUnit === 'm') {
      setSawKerf(0.003)
    }
  }

  // Modals state
  const [isAddRemnantModalOpen, setIsAddRemnantModalOpen] = useState(false)
  const [isCutSuccessModalOpen, setIsCutSuccessModalOpen] = useState(false)
  const [lastCutResult, setLastCutResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Remnant rack search and filters
  const [rackFilterMaterial, setRackFilterMaterial] = useState<string>('all')
  const [rackSearch, setRackSearch] = useState<string>('')

  // 4. Relevant Remnants for Selected Material
  const materialRemnants = useMemo(() => {
    return remnants.filter(r => {
      if (r.status !== 'available') return false
      // Match by inventoryId or fuzzy materialName
      if (selectedInventoryId && r.inventoryId === selectedInventoryId) return true
      const rName = (r.materialName || '').toLowerCase().trim()
      const sName = (materialName || '').toLowerCase().trim()
      return rName === sName || rName.includes(sName) || sName.includes(rName)
    })
  }, [remnants, selectedInventoryId, materialName])

  // 5. Intelligent Remnant Recommendation (Best-Fit Algorithm)
  // Total cut length including saw kerf
  const totalCutNeeded = useMemo(() => {
    const len = Number(requiredLength) || 0
    const qty = Number(cutQuantity) || 1
    const kerf = Number(sawKerf) || 0
    return (len * qty) + (kerf * qty)
  }, [requiredLength, cutQuantity, sawKerf])

  const { recommendedRemnant, usableRemnants, tooShortRemnants } = useMemo(() => {
    const usable: any[] = []
    const tooShort: any[] = []

    materialRemnants.forEach(r => {
      const rLen = Number(r.length)
      if (rLen >= totalCutNeeded) {
        usable.push(r)
      } else {
        tooShort.push(r)
      }
    })

    // Sort usable by length ASCENDING (Best-Fit: smallest piece that can satisfy the cut)
    // This minimizes material fragmentation and leaves longer pieces intact!
    usable.sort((a, b) => Number(a.length) - Number(b.length))
    // Sort too short by length DESCENDING
    tooShort.sort((a, b) => Number(b.length) - Number(a.length))

    return {
      recommendedRemnant: usable.length > 0 ? usable[0] : null,
      usableRemnants: usable,
      tooShortRemnants: tooShort
    }
  }, [materialRemnants, totalCutNeeded])

  // Auto-sync selection with recommended remnant if available and not user-locked
  React.useEffect(() => {
    if (recommendedRemnant) {
      setSelectedSourceType('remnant')
      setSelectedRemnantId(recommendedRemnant.id)
    } else {
      setSelectedSourceType('full_bar')
      setSelectedRemnantId('')
    }
  }, [recommendedRemnant?.id])

  // Active chosen source piece length
  const activeSourceRemnant = useMemo(() => {
    return materialRemnants.find(r => r.id === selectedRemnantId)
  }, [materialRemnants, selectedRemnantId])

  const activeSourceLength = useMemo(() => {
    if (selectedSourceType === 'remnant' && activeSourceRemnant) {
      return Number(activeSourceRemnant.length)
    }
    return Number(standardBarLength) || 12
  }, [selectedSourceType, activeSourceRemnant, standardBarLength])

  // Calculated leftover remnant length
  const leftoverRemnantLength = useMemo(() => {
    const leftover = activeSourceLength - totalCutNeeded
    return leftover > 0.001 ? Number(leftover.toFixed(2)) : 0
  }, [activeSourceLength, totalCutNeeded])

  // Visual bar calculations
  const visualTotalLength = Number(standardBarLength) || 12
  const priorConsumedLength = useMemo(() => {
    if (selectedSourceType === 'remnant' && activeSourceRemnant) {
      const orig = Number(activeSourceRemnant.standardLength) || visualTotalLength
      return Math.max(0, orig - Number(activeSourceRemnant.length))
    }
    return 0
  }, [selectedSourceType, activeSourceRemnant, visualTotalLength])

  // Percentages for visual bar
  const visualScale = visualTotalLength > 0 ? visualTotalLength : 12
  const pctPriorConsumed = (priorConsumedLength / visualScale) * 100
  const pctCutIssued = (Math.min(totalCutNeeded, activeSourceLength) / visualScale) * 100
  const pctLeftover = (leftoverRemnantLength / visualScale) * 100

  // 6. Handle Execute Cut & Issue
  const handleExecuteCut = async () => {
    const trimmedJob = (jobRef || '').trim()
    if (!trimmedJob) {
      showToast('error', 'Job Number Mandatory', 'A valid Job / Work Order # is strictly required to execute Material Issue.')
      return
    }

    if (totalCutNeeded <= 0) {
      showToast('error', 'Invalid Cut Length', 'Please enter a valid cut length greater than 0.')
      return
    }

    if (selectedSourceType === 'remnant') {
      if (!selectedRemnantId) {
        showToast('error', 'Select Remnant', 'Please pick an offcut piece to cut from.')
        return
      }
      if (activeSourceLength < totalCutNeeded) {
        showToast('error', 'Insufficient Length', `Selected remnant (${formatLinearDisplay(activeSourceLength, unit)}) is shorter than required cut (${formatLinearDisplay(totalCutNeeded, unit)}).`)
        return
      }
    } else {
      // Full bar cut
      if (standardBarLength < totalCutNeeded) {
        showToast('error', 'Bar Too Short', `Standard full bar (${formatLinearDisplay(standardBarLength, unit)}) is shorter than required cut (${formatLinearDisplay(totalCutNeeded, unit)}).`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        inventoryId: selectedInventoryId || null,
        materialName: materialName,
        sourceType: selectedSourceType,
        cutMode: selectedSourceType === 'remnant' ? 'from_remnant' : 'from_full_bar',
        sourceRemnantId: selectedSourceType === 'remnant' ? selectedRemnantId : null,
        remnantId: selectedSourceType === 'remnant' ? selectedRemnantId : null,
        standardLength: standardBarLength,
        cutLength: requiredLength,
        requiredLength: requiredLength,
        cutQty: cutQuantity,
        sawKerf: sawKerf,
        kerfLoss: sawKerf,
        unit: unit,
        dimension: dimension,
        profileType: profileType,
        location: targetLocation,
        jobRef: trimmedJob,
        notes: `Material Issued: ${formatLinearDisplay(requiredLength, unit)} x ${cutQuantity} pcs for Job #${trimmedJob}`
      }

      const res = await executeCutIssue(payload)
      if (res.success) {
        showToast('success', 'Material Issued Successfully!', res.message)
        setLastCutResult({
          ...res,
          materialName,
          unit,
          jobRef: trimmedJob,
          cutLengthDisplay: formatLinearDisplay(requiredLength, unit),
          leftoverDisplay: formatLinearDisplay(res.leftoverLength, unit),
          targetLocation
        })
        setIsCutSuccessModalOpen(true)
        refetchRemnants()
        if (onRefreshInventory) onRefreshInventory()
      } else {
        showToast('error', 'Cut Failed', res.message || res.error || 'Error processing cut issue.')
      }
    } catch (err: any) {
      console.error('Error executing cut issue:', err)
      showToast('error', 'Server Error', err.message || 'Failed to communicate with inventory service.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 7. Manual Remnant Creation Form State
  const [manualMaterial, setManualMaterial] = useState('')
  const [manualLength, setManualLength] = useState<number>(8)
  const [manualStandardLen, setManualStandardLen] = useState<number>(12)
  const [manualUnit, setManualUnit] = useState('ft')
  const [manualDimension, setManualDimension] = useState('8mm Round')
  const [manualLocation, setManualLocation] = useState('Rack-A2 (Offcuts Shelf)')
  const [manualNotes, setManualNotes] = useState('')

  const handleCreateManualRemnant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualMaterial || manualLength <= 0) {
      showToast('error', 'Invalid Input', 'Please enter a valid material name and length.')
      return
    }

    try {
      const payload = {
        inventoryId: selectedInventoryId || null,
        materialName: manualMaterial,
        length: manualLength,
        standardLength: manualStandardLen,
        unit: manualUnit,
        dimension: manualDimension,
        location: manualLocation,
        profileType: profileType,
        jobRef: 'Manual Entry',
        notes: manualNotes,
        status: 'available'
      }
      await createStockRemnant(payload)
      showToast('success', 'Offcut Added', `${manualLength} ${manualUnit} remnant logged to ${manualLocation}.`)
      setIsAddRemnantModalOpen(false)
      refetchRemnants()
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to save offcut remnant.')
    }
  }

  // 8. Delete / Scrap Remnant
  const handleDeleteRemnant = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove or scrap remnant "${name}"?`)) return
    try {
      await deleteStockRemnant(id)
      showToast('info', 'Remnant Removed', 'Offcut piece removed from rack records.')
      refetchRemnants()
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message)
    }
  }

  // Filtered Rack Remnants Table
  const filteredRackRemnants = useMemo(() => {
    return remnants.filter(r => {
      const matchMat = rackFilterMaterial === 'all' || (r.materialName || '').toLowerCase().includes(rackFilterMaterial.toLowerCase())
      const matchSearch = rackSearch === '' || 
        (r.materialName || '').toLowerCase().includes(rackSearch.toLowerCase()) ||
        (r.location || '').toLowerCase().includes(rackSearch.toLowerCase()) ||
        (r.dimension || '').toLowerCase().includes(rackSearch.toLowerCase())
      return matchMat && matchSearch
    })
  }, [remnants, rackFilterMaterial, rackSearch])

  return (
    <div className="space-y-6">
      {/* ── TOP HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-rex-950 to-indigo-950 p-6 text-white border border-rex-500/20 shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-rex-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rex-500/20 border border-rex-400/30 text-rex-300 text-xs font-semibold">
              <Scissors size={14} className="text-emerald-400" />
              <span>Smart Bar Stock Cut & Offcut Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Linear Stock & Remnant Optimizer
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Eliminate scrap and preserve full raw material bars. Intelligently matches incoming cut requirements with cataloged remnant offcuts, providing real-time 2D visual simulation of the cut bar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onBackToInventory && (
              <Button
                variant="outline"
                icon={ArrowLeft}
                onClick={onBackToInventory}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur"
              >
                Back to Inventory
              </Button>
            )}
            <Button
              variant="outline"
              icon={Plus}
              onClick={() => {
                setManualMaterial(materialName)
                setManualStandardLen(standardBarLength)
                setManualUnit(unit)
                setManualDimension(dimension)
                setIsAddRemnantModalOpen(true)
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur"
            >
              Log Workshop Offcut
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => {
                refetchRemnants()
                if (onRefreshInventory) onRefreshInventory()
              }}
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Scenario Spotlight: 8mm Shaft Example */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span className="font-semibold text-slate-200">Active Preset:</span>
            <span className="font-mono px-2 py-0.5 rounded bg-white/10 text-white">
              {materialName} ({formatLinearDisplay(standardBarLength, unit)} Std)
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Active Offcuts in Rack: <strong className="text-emerald-400">{materialRemnants.length} pieces</strong></span>
            <span>•</span>
            <span>Total Cataloged Remnants: <strong className="text-rex-300">{remnants.filter(r => r.status === 'available').length} pieces</strong></span>
          </div>
        </div>
      </div>

      {/* ── MAIN STUDIO GRID: PLANNER ON LEFT, VISUAL GRAPHIC ON RIGHT ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: CUT SPECIFICATION & SMART SOURCE SELECTION (5 COLS) ─── */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 border-rex-500/20 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-theme-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rex-500/10 text-rex-600 dark:text-rex-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Bar Stock & Cut Details</h3>
                  <p className="text-xs text-muted">1-Inch Precision Cutting & Mandatory Job Ref</p>
                </div>
              </div>
              <Badge variant="info" size="sm">
                Unit: {unit.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-4 mt-5">
              {/* Material Dropdown / Quick Selector */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Material / Raw Stock Item
                </label>
                <div className="flex gap-2">
                  <select
                    className="w-full input-base text-xs font-medium"
                    value={selectedInventoryId}
                    onChange={(e) => handleSelectInventory(e.target.value)}
                  >
                    <option value="">-- Custom / Direct Linear Item --</option>
                    {linearItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity || 0} {item.uom || 'bars'} in stock)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Material Name & Dimension Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Material Name</label>
                  <input
                    type="text"
                    className="w-full input-base text-xs"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder="e.g. 8mm Shaft"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Dimension / Profile</label>
                  <input
                    type="text"
                    className="w-full input-base text-xs"
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value)}
                    placeholder="e.g. 8mm Round, 25x25mm"
                  />
                </div>
              </div>

              {/* Standard Bar Length & Unit */}
              <div className="grid grid-cols-2 gap-3 bg-surface2/40 p-3 rounded-lg border border-theme-subtle">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">
                    Standard Bar Length
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      className="w-full input-base text-xs font-mono font-bold pr-10"
                      value={standardBarLength}
                      onChange={(e) => setStandardBarLength(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                      {unit}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted font-mono mt-0.5 block">
                    = {formatLinearDisplay(standardBarLength, unit)}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Length Unit</label>
                  <select
                    className="w-full input-base text-xs font-semibold"
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                  >
                    <option value="ft">Feet (ft) - 1" Precision</option>
                    <option value="in">Inches (in) - Exact Inches</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="m">Meters (m)</option>
                  </select>
                  <span className="text-[10px] text-muted font-mono mt-0.5 block">
                    {unit === 'ft' ? '1 ft = 12 in' : unit === 'in' ? 'Exact 1-inch steps' : `${unit} standard`}
                  </span>
                </div>
              </div>

              {/* ── REQUIRED CUT PARAMETERS (1-INCH PRECISION & DUAL UNIT SUPPORT) ── */}
              <div className="p-4 rounded-xl bg-rex-500/5 border border-rex-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rex-600 dark:text-rex-400 flex items-center gap-1.5">
                    <Scissors size={14} /> Cut Requirements (1-Inch Precision)
                  </span>
                  <span className="text-[11px] text-muted">
                    Total: <strong className="text-primary font-mono">{formatLinearDisplay(totalCutNeeded, unit)}</strong>
                  </span>
                </div>

                {/* Dual Feet & Inches Input when unit is 'ft' */}
                {unit === 'ft' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                          Feet (ft)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          className="w-full input-base text-xs font-mono font-bold text-rex-600"
                          value={cutFeet}
                          onChange={(e) => handleFeetChange(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                          Inches (in) <span className="text-emerald-500 font-semibold">[0 - 11]</span>
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="11"
                          className="w-full input-base text-xs font-mono font-bold text-emerald-600"
                          value={cutInches}
                          onChange={(e) => handleInchesChange(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Quick 1-Inch Stepper Buttons */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[10px] text-muted font-mono font-bold">1" Steps:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustInches(-1)}
                          className="px-2 py-0.5 rounded bg-surface2 hover:bg-surface2/80 text-[11px] font-mono border border-theme-subtle"
                          title="Subtract 1 inch"
                        >
                          -1"
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustInches(1)}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[11px] font-mono font-bold border border-emerald-500/30"
                          title="Add 1 inch"
                        >
                          +1"
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustInches(6)}
                          className="px-2 py-0.5 rounded bg-surface2 hover:bg-surface2/80 text-[11px] font-mono border border-theme-subtle"
                          title="Add 6 inches"
                        >
                          +6"
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustInches(12)}
                          className="px-2 py-0.5 rounded bg-surface2 hover:bg-surface2/80 text-[11px] font-mono border border-theme-subtle"
                          title="Add 12 inches (1 foot)"
                        >
                          +1 ft
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-secondary flex items-center justify-between pt-0.5">
                      <span>Decimal: <strong>{requiredLength.toFixed(2)} ft</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        = {Math.round((cutFeet * 12) + cutInches)} inches
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Single Unit Input (Inches / mm / m) */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                          Cut Length ({unit}) *
                        </label>
                        <input
                          type="number"
                          step={unit === 'in' ? '1' : '0.01'}
                          min="0.01"
                          className="w-full input-base text-xs font-mono font-bold text-rex-600"
                          value={requiredLength}
                          onChange={(e) => handleDirectLengthChange(Number(e.target.value))}
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 pb-2">
                          = {formatLinearDisplay(requiredLength, unit)}
                        </span>
                      </div>
                    </div>

                    {unit === 'in' && (
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-[10px] text-muted font-mono font-bold">1" Steps:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustInches(-1)}
                            className="px-2 py-0.5 rounded bg-surface2 text-[11px] font-mono border border-theme-subtle"
                          >
                            -1"
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustInches(1)}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[11px] font-mono font-bold border border-emerald-500/30"
                          >
                            +1"
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustInches(6)}
                            className="px-2 py-0.5 rounded bg-surface2 text-[11px] font-mono border border-theme-subtle"
                          >
                            +6"
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustInches(12)}
                            className="px-2 py-0.5 rounded bg-surface2 text-[11px] font-mono border border-theme-subtle"
                          >
                            +12"
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity & Saw Kerf */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-theme-subtle/50">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                      Quantity (Pieces to Cut)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full input-base text-xs font-mono font-bold"
                      value={cutQuantity}
                      onChange={(e) => setCutQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted mb-1">
                      Blade Saw Kerf ({unit})
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-full input-base text-xs font-mono"
                      value={sawKerf}
                      onChange={(e) => setSawKerf(Number(e.target.value))}
                      title="Blade width loss during cutting"
                    />
                  </div>
                </div>

                {/* ── STRICT MANDATORY JOB NUMBER / WORK ORDER REFERENCE ── */}
                <div className="pt-3 border-t border-theme-subtle/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-secondary">
                      Job / Work Order # <span className="text-red-500 font-bold">* MANDATORY</span>
                    </label>
                    {jobRef.trim() ? (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Job Linked
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <AlertTriangle size={12} /> Required to Issue
                      </span>
                    )}
                  </div>

                  {/* Dropdown of Active Work Orders */}
                  <select
                    className={`w-full input-base text-xs font-semibold ${
                      !jobRef.trim() ? 'border-red-500/70 bg-red-500/5 focus:border-red-500' : ''
                    }`}
                    value={
                      workOrders.some(wo => wo.id === jobRef || `${wo.id} - ${wo.title}` === jobRef)
                        ? jobRef
                        : (jobRef ? '__custom__' : '')
                    }
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setManualJobMode(true)
                      } else {
                        setJobRef(e.target.value)
                        setManualJobMode(false)
                      }
                    }}
                  >
                    <option value="">-- Select Active Work Order / Job * --</option>
                    {workOrders.map((wo: any) => (
                      <option key={wo.id} value={`${wo.id} - ${wo.title || 'Work Order'}`}>
                        {wo.id}: {wo.title || 'Work Order'} {wo.customerName ? `(${wo.customerName})` : ''}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Type Manual Job #</option>
                  </select>

                  {/* Manual Entry or Direct Job Text */}
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full input-base text-xs font-mono font-bold pr-8 ${
                        !jobRef.trim()
                          ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 placeholder:text-red-400/60'
                          : 'text-primary'
                      }`}
                      value={jobRef}
                      onChange={(e) => setJobRef(e.target.value)}
                      placeholder="Enter Job # (e.g. WO-8821, JOB-402) *"
                    />
                    {!jobRef.trim() && (
                      <Lock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                    )}
                  </div>

                  {!jobRef.trim() && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-600 dark:text-red-400 flex items-start gap-1.5 leading-tight">
                      <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Material Issue Blocked:</strong> A Job Number / Work Order is strictly mandatory. Stock cannot be cut or issued without a valid job reference.
                      </span>
                    </div>
                  )}

                  {/* Return Location */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-medium text-secondary mb-1">Return Remnant Location</label>
                    <input
                      type="text"
                      className="w-full input-base text-xs"
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      placeholder="Rack Shelf A-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── SOURCE SELECTION: RECOMMENDATION BANNER & OFF-CUT CANDIDATES ── */}
          <GlassCard className="p-6 border-rex-500/20 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Smart Source Selection</h3>
                  <p className="text-xs text-muted">Auto-recommends best-fit remnant to save new bars</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* Recommendation Callout */}
              {recommendedRemnant ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <Sparkles size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Smart Remnant Recommended!
                        </span>
                        <Badge variant="success" size="sm">Saves 1 Full Bar</Badge>
                      </div>
                      <p className="text-xs text-secondary leading-relaxed">
                        Found an offcut of <strong className="font-mono text-primary font-bold">{recommendedRemnant.length} {unit}</strong> (Location: {recommendedRemnant.location || 'Rack'}). 
                        Cutting <strong className="font-mono text-primary">{requiredLength} {unit}</strong> from this will leave a <strong className="font-mono text-teal-600 dark:text-teal-400 font-bold">{(Number(recommendedRemnant.length) - totalCutNeeded).toFixed(2)} {unit}</strong> offcut for future jobs.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        No Matching Offcut Available
                      </span>
                      <p className="text-xs text-secondary mt-0.5">
                        No offcut in stock is long enough for this cut ({totalCutNeeded} {unit}). You can cut from a fresh full bar ({standardBarLength} {unit}), and the leftover ({leftoverRemnantLength} {unit}) will be saved to your offcut rack automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSourceType('remnant')}
                  disabled={usableRemnants.length === 0}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedSourceType === 'remnant'
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-theme-subtle bg-surface2/30 hover:bg-surface2/60 opacity-80'
                  } ${usableRemnants.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Scissors size={14} className="text-emerald-500" /> Cut From Offcut
                    </span>
                    {selectedSourceType === 'remnant' && <Check size={14} className="text-emerald-500" />}
                  </div>
                  <span className="text-[11px] text-muted mt-2 font-mono">
                    {usableRemnants.length} usable pieces in rack
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSourceType('full_bar')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedSourceType === 'full_bar'
                      ? 'border-rex-600 bg-rex-500/10 ring-2 ring-rex-500/20 shadow-sm'
                      : 'border-theme-subtle bg-surface2/30 hover:bg-surface2/60'
                  } cursor-pointer`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Package size={14} className="text-rex-600" /> Cut Fresh Full Bar
                    </span>
                    {selectedSourceType === 'full_bar' && <Check size={14} className="text-rex-600" />}
                  </div>
                  <span className="text-[11px] text-muted mt-2 font-mono">
                    Std: {standardBarLength} {unit}
                  </span>
                </button>
              </div>

              {/* Usable Remnants Picker List */}
              {selectedSourceType === 'remnant' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-[11px] font-semibold text-secondary">
                    Select Target Offcut Piece:
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {usableRemnants.map(rem => {
                      const isSelected = selectedRemnantId === rem.id
                      const remLen = Number(rem.length)
                      const afterCut = (remLen - totalCutNeeded).toFixed(2)

                      return (
                        <div
                          key={rem.id}
                          onClick={() => setSelectedRemnantId(rem.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-primary font-semibold shadow-xs'
                              : 'bg-surface hover:bg-surface2 border-theme-subtle text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted'}`}>
                              {isSelected && <Check size={10} />}
                            </div>
                            <div>
                              <div className="font-mono font-bold text-primary flex items-center gap-1.5">
                                <span>{formatLinearDisplay(rem.length, rem.unit || unit)}</span>
                                {rem.id === recommendedRemnant?.id && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-white font-bold uppercase">
                                    Best Fit
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted">
                                Loc: {rem.location || 'Rack'} • Ref: {rem.jobRef || rem.sourceBarId || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {formatLinearDisplay(afterCut, unit)} leftover
                            </span>
                            <span className="block text-[9px] text-muted">will return to rack</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Too Short Pieces Notice (Explains why e.g. 3ft piece is excluded when 4ft needed) */}
              {tooShortRemnants.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider block mb-1">
                    Offcuts in rack too short for this cut ({tooShortRemnants.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tooShortRemnants.map(r => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface2 text-muted border border-theme-subtle text-[11px] font-mono"
                        title={`Too short: Has ${formatLinearDisplay(r.length, r.unit || unit)}, needed ${formatLinearDisplay(totalCutNeeded, unit)}`}
                      >
                        <X size={10} className="text-red-400" />
                        {formatLinearDisplay(r.length, r.unit || unit)} ({r.location || 'Rack'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE 2D GRAPHICS & SIMULATION (7 COLS) ──────── */}
        <div className="lg:col-span-7 space-y-6">

          {/* ── 2D VISUAL CUT SIMULATOR CANVAS ───────────────────────────────── */}
          <GlassCard className="p-6 border-rex-500/20 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-theme-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      Interactive 2D Cut Simulation
                    </h3>
                    <p className="text-xs text-muted">1-Inch calibrated visual representation of cut segment & leftover remnant</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary">Scale:</span>
                <Badge variant="default" size="sm">
                  0 to {formatLinearDisplay(activeSourceLength, unit)}
                </Badge>
              </div>
            </div>

            {/* ── GRAPHIC BAR CONTAINER ── */}
            <div className="mt-8 mb-6 px-2">

              {/* Top Ruler / Scale Markings */}
              <div className="relative w-full h-7 mb-2 select-none">
                <div className="absolute top-0 left-0 right-0 h-2 border-b border-slate-400/40" />
                {/* 5 Tick marks across the bar */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((fraction, idx) => {
                  const val = activeSourceLength * fraction
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${fraction * 100}%` }}
                    >
                      <div className="w-px h-3 bg-slate-400/60" />
                      <span className="text-[10px] font-mono text-muted mt-1 whitespace-nowrap">
                        {fraction === 0 ? '0' : formatLinearDisplay(val, unit)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 2D Cut Bar Rendering */}
              <div className="relative w-full h-18 sm:h-22 rounded-xl bg-slate-800 shadow-inner overflow-hidden border-2 border-slate-700/80 p-1 flex">

                {/* Segment 1: Cut Piece (Vibrant Emerald / Green) */}
                <div
                  className="relative h-full rounded-l-lg bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white flex flex-col justify-center items-center px-2 shadow-md transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalCutNeeded / activeSourceLength) * 100)}%` }}
                >
                  <div className="flex items-center gap-1 font-bold text-xs sm:text-sm drop-shadow-sm truncate">
                    <Scissors size={14} className="shrink-0" />
                    <span>CUT: {formatLinearDisplay(requiredLength, unit)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-100 font-mono truncate max-w-full">
                    {jobRef ? `Job #${jobRef}` : '⚠️ Job Ref Required'}
                  </span>
                  {/* Subtle diagonal shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                </div>

                {/* Saw Kerf Cut Divider line (Blade width loss) */}
                {sawKerf > 0 && (
                  <div
                    className="relative h-full w-1.5 bg-amber-400 shadow-sm flex items-center justify-center shrink-0"
                    title={`Kerf Loss: ${sawKerf} ${unit}`}
                  >
                    <div className="w-full h-full bg-amber-500/80 animate-pulse" />
                  </div>
                )}

                {/* Segment 2: Leftover Remnant (Cyan / Sky Blue) */}
                {leftoverRemnantLength > 0 ? (
                  <div
                    className="relative h-full flex-1 rounded-r-lg bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-700 text-white flex flex-col justify-center items-center px-2 shadow-inner transition-all duration-300"
                  >
                    <div className="flex items-center gap-1 font-bold text-xs sm:text-sm drop-shadow-sm truncate">
                      <Warehouse size={14} className="shrink-0" />
                      <span>LEFTOVER: {formatLinearDisplay(leftoverRemnantLength, unit)}</span>
                    </div>
                    <span className="text-[10px] text-sky-100 font-mono truncate max-w-full">
                      Returns to {targetLocation}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="h-full flex-1 rounded-r-lg bg-slate-700/60 flex items-center justify-center text-[11px] text-slate-400 font-mono">
                    Zero Remnant (Exact Bar Consumed)
                  </div>
                )}
              </div>

              {/* Graphic Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-xs" />
                    <span className="text-secondary font-medium">Issued Cut ({formatLinearDisplay(requiredLength, unit)})</span>
                  </div>
                  {sawKerf > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block shadow-xs" />
                      <span className="text-secondary font-medium">Blade Kerf ({sawKerf} {unit})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-cyan-600 inline-block shadow-xs" />
                    <span className="text-secondary font-medium">Re-usable Remnant ({formatLinearDisplay(leftoverRemnantLength, unit)})</span>
                  </div>
                </div>

                <span className="text-muted font-mono text-[11px]">
                  Total Source: {formatLinearDisplay(activeSourceLength, unit)}
                </span>
              </div>
            </div>

            {/* ── KEY METRICS CARDS: YIELD & SAVINGS ───────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-theme-subtle">
              <div className="p-3 rounded-xl bg-surface2/40 border border-theme-subtle">
                <span className="text-[10px] uppercase font-bold text-muted block">Required Cut</span>
                <span className="text-base font-bold font-mono text-primary mt-0.5 block truncate">
                  {formatLinearDisplay(requiredLength, unit)}
                </span>
                <span className="text-[10px] text-muted">Qty: {cutQuantity} pcs</span>
              </div>

              <div className="p-3 rounded-xl bg-surface2/40 border border-theme-subtle">
                <span className="text-[10px] uppercase font-bold text-muted block">Source Bar</span>
                <span className="text-base font-bold font-mono text-primary mt-0.5 block truncate">
                  {formatLinearDisplay(activeSourceLength, unit)}
                </span>
                <span className="text-[10px] text-emerald-500 font-semibold">
                  {selectedSourceType === 'remnant' ? '★ Offcut Re-used' : 'Fresh Full Bar'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface2/40 border border-theme-subtle">
                <span className="text-[10px] uppercase font-bold text-muted block">New Remnant</span>
                <span className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 block truncate">
                  {formatLinearDisplay(leftoverRemnantLength, unit)}
                </span>
                <span className="text-[10px] text-muted">To offcut rack</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                  Full Bars Saved
                </span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {selectedSourceType === 'remnant' ? '1 Full Bar' : '0 (New Cut)'}
                </span>
                <span className="text-[10px] text-emerald-600/80 font-medium">
                  {selectedSourceType === 'remnant' ? '100% Bar Conserved' : '1 bar deducted'}
                </span>
              </div>
            </div>

            {/* ── ACTION TRIGGER BUTTON ───────────────────────────────────────── */}
            <div className="mt-6 pt-5 border-t border-theme-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-secondary max-w-md">
                {!jobRef.trim() ? (
                  <span className="text-red-500 font-bold flex items-center gap-1.5">
                    <ShieldAlert size={16} className="shrink-0 text-red-500" />
                    <span>A Job Number / Work Order is strictly required before issuing material.</span>
                  </span>
                ) : (
                  <span>
                    Ready to issue for <strong className="text-primary font-mono font-bold">Job #{jobRef}</strong>:
                    Cutting <strong className="text-emerald-500 font-mono font-bold">{formatLinearDisplay(requiredLength, unit)}</strong> of <strong className="text-primary">{materialName}</strong>.
                    {selectedSourceType === 'remnant'
                      ? ` Offcut will be updated to ${formatLinearDisplay(leftoverRemnantLength, unit)}.`
                      : ` Full bar deducted & new ${formatLinearDisplay(leftoverRemnantLength, unit)} offcut saved.`}
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                icon={!jobRef.trim() ? Lock : Scissors}
                onClick={handleExecuteCut}
                disabled={isSubmitting || totalCutNeeded <= 0 || !jobRef.trim()}
                className={`w-full sm:w-auto px-6 font-bold shadow-lg transition-all ${
                  !jobRef.trim()
                    ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-300 border border-slate-600'
                    : 'bg-rex-600 hover:bg-rex-700 shadow-rex-600/20 text-white'
                }`}
                title={!jobRef.trim() ? 'Job Number / Work Order is strictly mandatory' : 'Execute Cut & Issue Material'}
              >
                {isSubmitting
                  ? 'Cutting & Logging...'
                  : !jobRef.trim()
                  ? '🔒 Job # Required to Issue'
                  : '✂️ Execute Cut & Issue'}
              </Button>
            </div>
          </GlassCard>

          {/* ── WORKSHOP OFFCUT RACK INVENTORY TABLE ────────────────────────── */}
          <GlassCard className="p-6 border-rex-500/20 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Warehouse size={16} className="text-rex-600" />
                  Workshop Remnant & Offcut Rack Catalog
                </h3>
                <p className="text-xs text-muted">All active offcut pieces currently available for production</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={rackSearch}
                    onChange={(e) => setRackSearch(e.target.value)}
                    placeholder="Search rack offcuts..."
                    className="input-base text-xs pl-8 py-1.5 w-44"
                  />
                </div>
              </div>
            </div>

            {/* Remnant Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface2/50 border-b border-theme-subtle text-[10px] font-semibold text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Material & Spec</th>
                    <th className="px-3 py-2.5">Offcut Length</th>
                    <th className="px-3 py-2.5">Rack Location</th>
                    <th className="px-3 py-2.5">Source / Job</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle/50 text-xs">
                  {remnantsLoading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted text-xs">Loading remnant rack data...</td>
                    </tr>
                  ) : filteredRackRemnants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted text-xs">
                        No offcut pieces found in catalog. You can log one with "Log Workshop Offcut".
                      </td>
                    </tr>
                  ) : (
                    filteredRackRemnants.map((r: any) => {
                      const isMatchingCurrentStudio = (selectedInventoryId && r.inventoryId === selectedInventoryId) ||
                        (r.materialName || '').toLowerCase() === materialName.toLowerCase()

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-surface2/40 transition-colors ${
                            isMatchingCurrentStudio ? 'bg-rex-500/5' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-primary">{r.materialName}</div>
                            <div className="text-[10px] text-muted font-mono">{r.dimension || 'Standard Profile'}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatLinearDisplay(r.length, r.unit)}
                            </span>
                            <span className="text-[10px] text-muted ml-1.5">
                              (Std: {formatLinearDisplay(r.standardLength || standardBarLength, r.unit)})
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface2 border border-theme-subtle text-[11px] text-secondary">
                              <Warehouse size={11} className="text-muted" />
                              {r.location || 'Rack Shelf'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted text-[11px]">
                            {r.jobRef || r.sourceBarId || 'Cut Offcut'}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant={r.status === 'available' ? 'success' : 'default'} size="sm">
                              {r.status === 'available' ? 'Available' : r.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setMaterialName(r.materialName)
                                  if (r.dimension) setDimension(r.dimension)
                                  if (r.unit) handleUnitChange(r.unit)
                                  if (r.standardLength) setStandardBarLength(Number(r.standardLength))
                                  if (r.inventoryId) setSelectedInventoryId(r.inventoryId)
                                  setSelectedSourceType('remnant')
                                  setSelectedRemnantId(r.id)
                                  showToast('info', 'Loaded to Studio', `Offcut ${formatLinearDisplay(r.length, r.unit)} loaded for cutting.`)
                                }}
                                className="px-2 py-1 rounded bg-rex-600/10 hover:bg-rex-600/20 text-rex-600 text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Use in Cut Studio"
                              >
                                <Scissors size={11} /> Use Now
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRemnant(r.id, `${r.materialName} (${r.length} ${r.unit})`)}
                                className="p-1 hover:bg-red-500/10 text-muted hover:text-red-500 rounded transition-colors"
                                title="Delete / Scrap Offcut"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── MODAL: MANUAL OFFCUT LOGGING ────────────────────────────────────────── */}
      <Modal
        isOpen={isAddRemnantModalOpen}
        onClose={() => setIsAddRemnantModalOpen(false)}
        title="Log Workshop Offcut / Remnant Piece"
        size="md"
      >
        <form onSubmit={handleCreateManualRemnant} className="space-y-4">
          <div className="p-3 rounded-lg bg-surface2/50 text-xs text-secondary leading-relaxed">
            Record physical offcut pieces found in your workshop racks or cut stations so the system can suggest them for future job cuts.
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Material Description *</label>
            <input
              required
              type="text"
              className="w-full input-base text-xs"
              value={manualMaterial}
              onChange={(e) => setManualMaterial(e.target.value)}
              placeholder="e.g. 8mm Mild Steel Shaft"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Offcut Length *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                className="w-full input-base text-xs font-mono font-bold"
                value={manualLength}
                onChange={(e) => setManualLength(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Unit</label>
              <select
                className="w-full input-base text-xs"
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
              >
                <option value="ft">Feet (ft)</option>
                <option value="m">Meters (m)</option>
                <option value="mm">Millimeters (mm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Original Bar Length</label>
              <input
                type="number"
                step="0.01"
                className="w-full input-base text-xs font-mono"
                value={manualStandardLen}
                onChange={(e) => setManualStandardLen(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Dimension / Profile</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                value={manualDimension}
                onChange={(e) => setManualDimension(e.target.value)}
                placeholder="e.g. 8mm Round"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Rack / Storage Location</label>
            <input
              type="text"
              className="w-full input-base text-xs"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g. Rack A-3 (Offcuts Bin)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Notes / Condition</label>
            <textarea
              rows={2}
              className="w-full input-base text-xs"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g. Good condition, straight, deburred"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setIsAddRemnantModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={CheckCircle2}>
              Save Offcut to Rack
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CUT SLIP & EXECUTION SUCCESS CONFIRMATION ────────────────────── */}
      {lastCutResult && (
        <Modal
          isOpen={isCutSuccessModalOpen}
          onClose={() => setIsCutSuccessModalOpen(false)}
          title="Cut & Issue Slip"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Cut Issued & Stock Updated!
                </h4>
                <p className="text-xs text-secondary mt-0.5">
                  Audit ledger entry recorded and remnant rack inventory updated.
                </p>
              </div>
            </div>

            {/* Printable Slip Card */}
            <div className="p-4 rounded-xl bg-surface border border-theme-subtle font-mono text-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-theme-subtle">
                <span className="font-bold text-primary">CUT TICKET SLIP</span>
                <span className="text-muted text-[10px]">{new Date().toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted block text-[10px]">MATERIAL:</span>
                  <span className="font-bold text-primary">{materialName}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">JOB / WORK ORDER:</span>
                  <span className="font-bold text-rex-600">{jobRef || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">ISSUED CUT PIECE:</span>
                  <span className="font-bold text-emerald-600">
                    {lastCutResult.cutLengthDisplay || `${lastCutResult.cutLength} ${lastCutResult.unit}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">SOURCE USED:</span>
                  <span className="font-bold text-primary uppercase">{lastCutResult.sourceType}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">NEW OFFCUT RETURN:</span>
                  <span className="font-bold text-cyan-600">
                    {lastCutResult.leftoverDisplay || `${lastCutResult.leftoverLength} ${lastCutResult.unit}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">RETURN RACK:</span>
                  <span className="font-bold text-primary">{targetLocation}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                icon={Printer}
                onClick={() => window.print()}
              >
                Print Slip
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsCutSuccessModalOpen(false)}
              >
                Done / Next Cut
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
