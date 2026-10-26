import React, { useState, useMemo, useEffect } from 'react'
import { 
  ShieldCheck, Plus, CheckCircle2, AlertTriangle, AlertCircle, 
  RotateCcw, Printer, Edit2, Trash2, Gauge, Check, Search, 
  Layers, Wrench, Sparkles, Filter, ChevronDown, ChevronRight,
  Info, History, CheckSquare, Eye, Sliders, ArrowRight
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { WorkOrderQCInspectionReportModal } from './WorkOrderQCInspectionReportModal'
import { 
  saveWorkOrderQcCheckpoints, 
  logWorkOrderQcMeasurement,
  fetchCalibrationInstruments,
  fetchNcrRecords,
  updateNcrRecord
} from '@/lib/api'

export interface QCMeasurement {
  id: string
  pieceNo: number | string
  measuredValue: number | string
  status: 'Pass' | 'Marginal' | 'Fail'
  measuredBy: string
  measuredAt: string
  remarks?: string
}

export interface QCCheckpoint {
  id: string
  partId?: string | number
  partTitle?: string
  opId?: string | number
  operationName: string
  checkpointNo: string
  parameter: string
  category: 'Dimensional' | 'Surface Roughness' | 'Geometric Tolerance' | 'Thread / Pitch' | 'Hardness' | 'Visual / Cosmetic'
  targetValue?: number | string
  lowerTolerance?: number | string
  upperTolerance?: number | string
  unit: string
  nominalSpec?: string
  instrument: string
  samplingFrequency: string
  inspectorNotes?: string
  latestValue?: number | string
  status?: 'Pending' | 'Pass' | 'Marginal' | 'Fail'
  lastInspectedAt?: string
  lastInspectedBy?: string
  measurements?: QCMeasurement[]
}

interface WorkOrderQCHubProps {
  workOrder: any
  parsedBoms: any[]
  operations: any[]
  reworkLogs: any[]
  qcInspections: any[]
  onRefreshWO: () => void
  onOpenReworkModal?: (rw: any) => void
  initialTargetOp?: { partTitle?: string; opName?: string } | null
}

// Standard Machining Presets
const MACHINING_PRESETS = [
  {
    label: 'Shaft OD (h7 Precision)',
    category: 'Dimensional',
    parameter: 'Shaft Outer Diameter (OD h7)',
    instrument: 'External Micrometer (0-25mm / 25-50mm)',
    targetValue: 50.000,
    lowerTolerance: -0.015,
    upperTolerance: 0.000,
    unit: 'mm',
    samplingFrequency: '100% In-Process',
    nominalSpec: 'Ø50h7 (+0.000 / -0.015 mm)'
  },
  {
    label: 'Bore ID (H7 Clearance/Fit)',
    category: 'Dimensional',
    parameter: 'Bore Inner Diameter (ID H7)',
    instrument: 'Dial Bore Gauge / Inside Micrometer',
    targetValue: 25.000,
    lowerTolerance: 0.000,
    upperTolerance: 0.021,
    unit: 'mm',
    samplingFrequency: '100% In-Process',
    nominalSpec: 'Ø25H7 (+0.021 / -0.000 mm)'
  },
  {
    label: 'Length / Step (±0.05mm)',
    category: 'Dimensional',
    parameter: 'Overall Length / Step Shoulder',
    instrument: 'Digital Vernier Caliper / Height Gauge',
    targetValue: 100.000,
    lowerTolerance: -0.050,
    upperTolerance: 0.050,
    unit: 'mm',
    samplingFrequency: 'First Piece Inspection (FPI)',
    nominalSpec: '100.00 ±0.05 mm'
  },
  {
    label: 'Surface Ground (Ra 0.8 µm)',
    category: 'Surface Roughness',
    parameter: 'Surface Roughness (Ra 0.8 Finish)',
    instrument: 'Surface Roughness Tester (Surftest)',
    targetValue: 0.80,
    lowerTolerance: 0.00,
    upperTolerance: 0.80,
    unit: 'µm',
    samplingFrequency: '1 in 5 Pcs',
    nominalSpec: 'Ra ≤ 0.80 µm'
  },
  {
    label: 'Milled / Turned (Ra 1.6 µm)',
    category: 'Surface Roughness',
    parameter: 'Machined Surface Roughness (Ra 1.6)',
    instrument: 'Surface Roughness Tester / Comparator',
    targetValue: 1.60,
    lowerTolerance: 0.00,
    upperTolerance: 1.60,
    unit: 'µm',
    samplingFrequency: 'First Piece Inspection (FPI)',
    nominalSpec: 'Ra ≤ 1.60 µm'
  },
  {
    label: 'Radial Runout (< 0.015mm)',
    category: 'Geometric Tolerance',
    parameter: 'Concentricity & Radial Runout TIR',
    instrument: 'Dial Test Indicator (DTI) on V-Blocks',
    targetValue: 0.000,
    lowerTolerance: 0.000,
    upperTolerance: 0.015,
    unit: 'mm',
    samplingFrequency: '100% In-Process',
    nominalSpec: 'Runout TIR ≤ 0.015 mm'
  },
  {
    label: 'Thread Profile (Go / No-Go)',
    category: 'Thread / Pitch',
    parameter: 'Thread Pitch & Gauge Fit (6H/6g)',
    instrument: 'Thread Plug / Ring Gauge',
    targetValue: '',
    lowerTolerance: '',
    upperTolerance: '',
    unit: 'Gauge Test',
    samplingFrequency: '100% In-Process',
    nominalSpec: 'Go: Freely Passes / No-Go: Max 1.5 Turns'
  },
  {
    label: 'Case Hardness (58-62 HRC)',
    category: 'Hardness',
    parameter: 'Surface / Core Hardness (HRC)',
    instrument: 'Rockwell Hardness Tester (Diamond Cone)',
    targetValue: 60.0,
    lowerTolerance: -2.0,
    upperTolerance: 2.0,
    unit: 'HRC',
    samplingFrequency: '1 in 5 Pcs',
    nominalSpec: '60 ±2 HRC [58 ~ 62 HRC]'
  },
  {
    label: 'Visual & Deburring',
    category: 'Visual / Cosmetic',
    parameter: 'Edge Deburring, Chamfer & Cleaning',
    instrument: 'Visual 10x Magnifier / Touch',
    targetValue: '',
    lowerTolerance: '',
    upperTolerance: '',
    unit: 'Visual',
    samplingFrequency: '100% Final',
    nominalSpec: 'Completely burr-free, no sharp edges or chips'
  }
]

export const WorkOrderQCHub: React.FC<WorkOrderQCHubProps> = ({
  workOrder,
  parsedBoms,
  operations,
  reworkLogs,
  qcInspections,
  onRefreshWO,
  onOpenReworkModal,
  initialTargetOp
}) => {
  // Checkpoints list loaded from WO
  const checkpoints: QCCheckpoint[] = useMemo(() => {
    if (!workOrder) return []
    if (Array.isArray(workOrder.qcCheckpoints)) return workOrder.qcCheckpoints
    if (typeof workOrder.qcCheckpoints === 'string') {
      try {
        return JSON.parse(workOrder.qcCheckpoints)
      } catch (e) {
        return []
      }
    }
    return []
  }, [workOrder?.qcCheckpoints])

  // UI state
  const [filterPart, setFilterPart] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Pass' | 'Marginal' | 'Fail'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)

  // Add / Edit Checkpoint Modal
  const [showCpModal, setShowCpModal] = useState(false)
  const [editingCpId, setEditingCpId] = useState<string | null>(null)
  const [selectedBomIndex, setSelectedBomIndex] = useState<number>(0)
  const [selectedOpName, setSelectedOpName] = useState<string>('')

  const [cpForm, setCpForm] = useState<{
    checkpointNo: string
    parameter: string
    category: QCCheckpoint['category']
    targetValue: string | number
    lowerTolerance: string | number
    upperTolerance: string | number
    unit: string
    instrument: string
    samplingFrequency: string
    inspectorNotes: string
    nominalSpec: string
  }>({
    checkpointNo: '',
    parameter: '',
    category: 'Dimensional',
    targetValue: '',
    lowerTolerance: '',
    upperTolerance: '',
    unit: 'mm',
    instrument: 'External Micrometer (0-25mm / 25-50mm)',
    samplingFrequency: '100% In-Process',
    inspectorNotes: '',
    nominalSpec: ''
  })

  // Quick Measure Modal / Input
  const [activeMeasureCp, setActiveMeasureCp] = useState<QCCheckpoint | null>(null)
  const [measureValueInput, setMeasureValueInput] = useState('')
  const [measurePieceNo, setMeasurePieceNo] = useState<number>(1)
  const [measureRemarks, setMeasureRemarks] = useState('')
  const [autoReworkOnFail, setAutoReworkOnFail] = useState(true)

  // Calibration & ISO NCR state
  const [instruments, setInstruments] = useState<any[]>([])
  const [ncrList, setNcrList] = useState<any[]>([])
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('')
  const [selectedNcr, setSelectedNcr] = useState<any | null>(null)
  const [ncrDispositionForm, setNcrDispositionForm] = useState({
    disposition: 'Rework',
    dispositionNotes: '',
    dispositionBy: 'Quality Manager',
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    status: 'Dispositioned'
  })

  const loadIsoData = async () => {
    try {
      const [instData, ncrData] = await Promise.all([
        fetchCalibrationInstruments().catch(() => []),
        fetchNcrRecords({ workOrderId: workOrder?.id }).catch(() => [])
      ])
      setInstruments(Array.isArray(instData) ? instData : [])
      setNcrList(Array.isArray(ncrData) ? ncrData : [])
    } catch (e) {
      console.error('Failed to load ISO records', e)
    }
  }

  useEffect(() => {
    loadIsoData()
  }, [workOrder?.id])

  const handleOpenNcrModal = (ncr: any) => {
    setSelectedNcr(ncr)
    setNcrDispositionForm({
      disposition: ncr.disposition || 'Rework',
      dispositionNotes: ncr.dispositionNotes || '',
      dispositionBy: ncr.dispositionBy || 'Quality Manager',
      rootCause: ncr.rootCause || '',
      correctiveAction: ncr.correctiveAction || '',
      preventiveAction: ncr.preventiveAction || '',
      status: ncr.status || 'Dispositioned'
    })
  }

  const handleSaveNcrDisposition = async () => {
    if (!selectedNcr) return
    setSaving(true)
    try {
      await updateNcrRecord(selectedNcr.id, ncrDispositionForm)
      showToast(`NCR #${selectedNcr.ncrNo} disposition updated successfully!`, 'success')
      setSelectedNcr(null)
      loadIsoData()
      onRefreshWO()
    } catch (err: any) {
      showToast(err.message || 'Failed to update NCR', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Pre-fill next Checkpoint No
  const getNextCheckpointNo = () => {
    const count = checkpoints.length + 1
    return `QC-${String(count).padStart(2, '0')}`
  }

  // Open Add Modal for specific BOM part & Operation
  const openAddCheckpointModal = (partTitle?: string, opName?: string) => {
    setEditingCpId(null)
    const nextNo = getNextCheckpointNo()
    
    // Find part index
    let partIdx = 0
    if (partTitle && parsedBoms.length > 0) {
      const idx = parsedBoms.findIndex(b => b.title === partTitle)
      if (idx !== -1) partIdx = idx
    }
    setSelectedBomIndex(partIdx)

    // Set operation
    if (opName) {
      setSelectedOpName(opName)
    } else if (parsedBoms[partIdx]?.machiningOps?.length > 0) {
      setSelectedOpName(parsedBoms[partIdx].machiningOps[0].procName)
    } else if (operations.length > 0) {
      setSelectedOpName(operations[0].operationName)
    } else {
      setSelectedOpName('CNC Machining')
    }

    setCpForm({
      checkpointNo: nextNo,
      parameter: '',
      category: 'Dimensional',
      targetValue: '',
      lowerTolerance: '',
      upperTolerance: '',
      unit: 'mm',
      instrument: 'External Micrometer (0-25mm / 25-50mm)',
      samplingFrequency: '100% In-Process',
      inspectorNotes: '',
      nominalSpec: ''
    })
    setShowCpModal(true)
  }

  // Edit existing Checkpoint
  const openEditCheckpointModal = (cp: QCCheckpoint) => {
    setEditingCpId(cp.id)
    const pIdx = parsedBoms.findIndex(b => b.title === cp.partTitle)
    setSelectedBomIndex(pIdx >= 0 ? pIdx : 0)
    setSelectedOpName(cp.operationName)

    setCpForm({
      checkpointNo: cp.checkpointNo,
      parameter: cp.parameter,
      category: cp.category,
      targetValue: cp.targetValue ?? '',
      lowerTolerance: cp.lowerTolerance ?? '',
      upperTolerance: cp.upperTolerance ?? '',
      unit: cp.unit || 'mm',
      instrument: cp.instrument,
      samplingFrequency: cp.samplingFrequency,
      inspectorNotes: cp.inspectorNotes || '',
      nominalSpec: cp.nominalSpec || ''
    })
    setShowCpModal(true)
  }

  // Apply a Machining Preset
  const applyPreset = (preset: typeof MACHINING_PRESETS[0]) => {
    setCpForm(prev => ({
      ...prev,
      parameter: preset.parameter,
      category: preset.category as any,
      instrument: preset.instrument,
      targetValue: preset.targetValue,
      lowerTolerance: preset.lowerTolerance,
      upperTolerance: preset.upperTolerance,
      unit: preset.unit,
      samplingFrequency: preset.samplingFrequency,
      nominalSpec: preset.nominalSpec
    }))
  }

  // Save / Update Checkpoint
  const handleSaveCheckpoint = async () => {
    if (!cpForm.parameter.trim()) {
      showToast('Please specify an inspection parameter name', 'error')
      return
    }

    const curBom = parsedBoms[selectedBomIndex]
    const partTitle = curBom ? curBom.title : (parsedBoms[0]?.title || 'Main Component')
    const partId = curBom ? curBom.partId : 1

    // Matched operation id
    const matchedOp = operations.find(o => 
      (o.operationName || '').toLowerCase() === selectedOpName.toLowerCase()
    )

    let updatedList: QCCheckpoint[] = []

    if (editingCpId) {
      updatedList = checkpoints.map(cp => {
        if (cp.id === editingCpId) {
          return {
            ...cp,
            partId,
            partTitle,
            operationName: selectedOpName,
            opId: matchedOp?.id || cp.opId,
            checkpointNo: cpForm.checkpointNo,
            parameter: cpForm.parameter,
            category: cpForm.category,
            targetValue: cpForm.targetValue === '' ? undefined : Number(cpForm.targetValue),
            lowerTolerance: cpForm.lowerTolerance === '' ? undefined : Number(cpForm.lowerTolerance),
            upperTolerance: cpForm.upperTolerance === '' ? undefined : Number(cpForm.upperTolerance),
            unit: cpForm.unit,
            instrument: cpForm.instrument,
            samplingFrequency: cpForm.samplingFrequency,
            inspectorNotes: cpForm.inspectorNotes,
            nominalSpec: cpForm.nominalSpec
          }
        }
        return cp
      })
    } else {
      const newCp: QCCheckpoint = {
        id: 'QC-' + Date.now(),
        partId,
        partTitle,
        operationName: selectedOpName,
        opId: matchedOp?.id,
        checkpointNo: cpForm.checkpointNo || getNextCheckpointNo(),
        parameter: cpForm.parameter,
        category: cpForm.category,
        targetValue: cpForm.targetValue === '' ? undefined : Number(cpForm.targetValue),
        lowerTolerance: cpForm.lowerTolerance === '' ? undefined : Number(cpForm.lowerTolerance),
        upperTolerance: cpForm.upperTolerance === '' ? undefined : Number(cpForm.upperTolerance),
        unit: cpForm.unit,
        instrument: cpForm.instrument,
        samplingFrequency: cpForm.samplingFrequency,
        inspectorNotes: cpForm.inspectorNotes,
        nominalSpec: cpForm.nominalSpec,
        status: 'Pending',
        measurements: []
      }
      updatedList = [...checkpoints, newCp]
    }

    setSaving(true)
    try {
      await saveWorkOrderQcCheckpoints(workOrder.id, updatedList)
      showToast(editingCpId ? 'QC Checkpoint updated successfully!' : 'New QC Checkpoint added!', 'success')
      setShowCpModal(false)
      onRefreshWO()
    } catch (err: any) {
      showToast(err.message || 'Failed to save checkpoint', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Checkpoint
  const handleDeleteCheckpoint = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this QC checkpoint?')) return
    const updated = checkpoints.filter(c => c.id !== id)
    setSaving(true)
    try {
      await saveWorkOrderQcCheckpoints(workOrder.id, updated)
      showToast('QC Checkpoint deleted', 'info')
      onRefreshWO()
    } catch (err: any) {
      showToast('Failed to delete checkpoint', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Quick Inline Measurement or Modal Save
  const handleRecordMeasurement = async () => {
    if (!activeMeasureCp) return
    if (measureValueInput.trim() === '') {
      showToast('Please enter the measured value', 'error')
      return
    }

    setSaving(true)
    try {
      const selectedInst = instruments.find(i => i.id === selectedInstrumentId)
      const instRemark = selectedInst ? ` [Gauge Ref: ${selectedInst.toolNo} - ${selectedInst.name}]` : ''
      const combinedRemarks = (measureRemarks.trim() + instRemark).trim()

      const res = await logWorkOrderQcMeasurement(workOrder.id, {
        checkpointId: activeMeasureCp.id,
        pieceNo: measurePieceNo,
        measuredValue: measureValueInput.trim(),
        measuredBy: 'QA Inspector',
        remarks: combinedRemarks,
        autoReworkOnFail
      })

      if (res.success) {
        if (res.measurement?.status === 'Pass') {
          showToast(`Piece #${measurePieceNo} Passed! Within tolerance limits.`, 'success')
        } else if (res.measurement?.status === 'Marginal') {
          showToast(`Piece #${measurePieceNo} Marked Marginal (near limit).`, 'warning')
        } else {
          showToast(`Piece #${measurePieceNo} FAILED tolerance! NCR & Rework ticket generated.`, 'error')
        }
        setActiveMeasureCp(null)
        setMeasureValueInput('')
        setMeasureRemarks('')
        loadIsoData()
        onRefreshWO()
      } else {
        showToast(res.error || 'Failed to record measurement', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error recording measurement', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Metrics rollup
  const totalCheckpoints = checkpoints.length
  const passedCheckpoints = checkpoints.filter(c => c.status === 'Pass').length
  const marginalCheckpoints = checkpoints.filter(c => c.status === 'Marginal').length
  const failedCheckpoints = checkpoints.filter(c => c.status === 'Fail').length
  const pendingCheckpoints = checkpoints.filter(c => !c.status || c.status === 'Pending').length
  const passRate = totalCheckpoints > 0 ? Math.round((passedCheckpoints / totalCheckpoints) * 100) : 0

  // Filtered Checkpoints
  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter(c => {
      // Part Filter
      if (filterPart !== 'ALL' && c.partTitle !== filterPart) return false
      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Pending' && c.status && c.status !== 'Pending') return false
        if (statusFilter !== 'Pending' && c.status !== statusFilter) return false
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesParam = (c.parameter || '').toLowerCase().includes(q)
        const matchesNo = (c.checkpointNo || '').toLowerCase().includes(q)
        const matchesOp = (c.operationName || '').toLowerCase().includes(q)
        const matchesInst = (c.instrument || '').toLowerCase().includes(q)
        if (!matchesParam && !matchesNo && !matchesOp && !matchesInst) return false
      }
      return true
    })
  }, [checkpoints, filterPart, statusFilter, searchQuery])

  // Group filtered checkpoints by BOM Part -> Machining Operation
  const groupedStructure = useMemo(() => {
    const map = new Map<string, Map<string, QCCheckpoint[]>>()
    filteredCheckpoints.forEach(cp => {
      const pTitle = cp.partTitle || 'Main Component'
      const opTitle = cp.operationName || 'Machining Routing'
      if (!map.has(pTitle)) {
        map.set(pTitle, new Map())
      }
      const opMap = map.get(pTitle)!
      if (!opMap.has(opTitle)) {
        opMap.set(opTitle, [])
      }
      opMap.get(opTitle)!.push(cp)
    })
    return map
  }, [filteredCheckpoints])

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`p-3 text-xs font-bold flex items-center justify-between border ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
            : toastMsg.type === 'warning'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
        }`}>
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="text-secondary hover:text-primary">✕</button>
        </div>
      )}

      {/* Header Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface2/40 p-4 border border-theme-subtle">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-rex-600 dark:text-rex-400" />
            <h3 className="text-base font-bold text-primary tracking-wide">
              Machining Quality Control (QC) & Inspection Hub
            </h3>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Define dimensional tolerances, roughness & geometric checkpoints directly linked to BOM machining operations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowReportModal(true)}
            variant="outline"
            className="text-xs font-bold border-theme-subtle flex items-center gap-1.5 py-1.5 px-3 rounded-none text-secondary hover:text-primary"
          >
            <Printer size={14} />
            Inspection Certificate
          </Button>

          <Button
            onClick={() => openAddCheckpointModal()}
            className="bg-rex-600 hover:bg-rex-700 text-white text-xs font-bold flex items-center gap-1.5 py-1.5 px-3.5 rounded-none shadow-sm"
          >
            <Plus size={15} />
            Define QC Point
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard className="p-3 border-theme-subtle rounded-none flex items-center gap-3">
          <div className="p-2 bg-surface2 text-primary border border-theme-subtle">
            <Sliders size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Total Checkpoints</span>
            <span className="text-lg font-mono font-bold text-primary">{totalCheckpoints}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-3 border-theme-subtle rounded-none flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Passed (In Spec)</span>
            <span className="text-lg font-mono font-bold text-emerald-500">{passedCheckpoints}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-3 border-theme-subtle rounded-none flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Marginal Warnings</span>
            <span className="text-lg font-mono font-bold text-amber-500">{marginalCheckpoints}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-3 border-theme-subtle rounded-none flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Failed / Rework</span>
            <span className="text-lg font-mono font-bold text-rose-500">{failedCheckpoints}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-3 border-theme-subtle rounded-none flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 bg-rex-500/10 text-rex-500 border border-rex-500/20">
            <Gauge size={18} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Quality Pass Rate</span>
            <span className="text-lg font-mono font-black text-rex-600 dark:text-rex-400">{passRate}%</span>
          </div>
        </GlassCard>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-surface p-3 border border-theme-subtle">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {(['ALL', 'Pending', 'Pass', 'Marginal', 'Fail'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-bold text-xs transition-colors rounded-none border ${
                statusFilter === st
                  ? 'bg-rex-600 text-white border-rex-600'
                  : 'bg-surface2/50 text-secondary border-theme-subtle hover:text-primary hover:bg-surface2'
              }`}
            >
              {st === 'ALL' ? 'All Checkpoints' : st}
              <span className="ml-1.5 opacity-75 font-mono text-[10px]">
                ({st === 'ALL' 
                  ? checkpoints.length 
                  : st === 'Pending' 
                    ? pendingCheckpoints 
                    : st === 'Pass' 
                      ? passedCheckpoints 
                      : st === 'Marginal' 
                        ? marginalCheckpoints 
                        : failedCheckpoints})
              </span>
            </button>
          ))}
        </div>

        {/* Part & Search Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {parsedBoms.length > 1 && (
            <select
              value={filterPart}
              onChange={e => setFilterPart(e.target.value)}
              className="bg-surface2 border border-theme-subtle px-2.5 py-1 text-xs text-primary focus:outline-none focus:border-rex-500"
            >
              <option value="ALL">All BOM Parts</option>
              {parsedBoms.map((b, i) => (
                <option key={i} value={b.title}>{b.title}</option>
              ))}
            </select>
          )}

          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-2 text-muted" />
            <input
              type="text"
              placeholder="Search parameter, instrument..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface2 border border-theme-subtle pl-8 pr-3 py-1 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-rex-500"
            />
          </div>
        </div>
      </div>

      {/* Main Checkpoint List Grouped by BOM Part & Machining Operations */}
      {checkpoints.length === 0 ? (
        <div className="p-12 text-center bg-surface2/20 border border-dashed border-theme-subtle space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface2 border border-theme-subtle mx-auto flex items-center justify-center text-muted">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary">No QC Checkpoints Defined Yet</h4>
            <p className="text-xs text-muted max-w-md mx-auto mt-1">
              Add inspection checkpoints for each machining operation to ensure first-pass yield and strict tolerance conformance.
            </p>
          </div>
          <Button
            onClick={() => openAddCheckpointModal()}
            className="bg-rex-600 hover:bg-rex-700 text-white text-xs font-bold py-1.5 px-4 rounded-none"
          >
            <Plus size={14} className="mr-1" /> Add First Checkpoint
          </Button>
        </div>
      ) : filteredCheckpoints.length === 0 ? (
        <div className="p-8 text-center bg-surface2/20 border border-dashed border-theme-subtle text-xs text-muted">
          No checkpoints match the active filters.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedStructure.entries()).map(([partTitle, opMap]) => (
            <div key={partTitle} className="space-y-3">
              
              {/* Part Header */}
              <div className="flex items-center justify-between bg-surface2/80 px-4 py-2 border-l-4 border-rex-500 border-y border-r border-theme-subtle">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-rex-600 dark:text-rex-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-primary">{partTitle}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddCheckpointModal(partTitle)}
                  className="text-[11px] py-0.5 px-2 h-auto text-rex-600 dark:text-rex-400 border-theme-subtle hover:bg-rex-500/10 rounded-none font-bold"
                >
                  <Plus size={12} className="mr-1" /> Add Checkpoint to Part
                </Button>
              </div>

              {/* Operations under this part */}
              {Array.from(opMap.entries()).map(([opName, cpList]) => (
                <div key={opName} className="border border-theme-subtle bg-surface ml-0 sm:ml-2">
                  
                  {/* Operation Sub-header */}
                  <div className="flex items-center justify-between p-3 bg-surface2/30 border-b border-theme-subtle">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-secondary" />
                      <span className="font-bold text-xs text-primary">{opName}</span>
                      <span className="text-[11px] text-muted">({cpList.length} inspection gates)</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddCheckpointModal(partTitle, opName)}
                      className="text-[10px] py-0.5 px-2 h-auto text-secondary hover:text-primary border-theme-subtle rounded-none"
                    >
                      <Plus size={11} className="mr-1" /> Add to {opName}
                    </Button>
                  </div>

                  {/* Checkpoints Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface2/50 text-left text-muted font-bold border-b border-theme-subtle text-[11px]">
                          <th className="py-2.5 px-3 w-16">Gate #</th>
                          <th className="py-2.5 px-3">Inspection Parameter</th>
                          <th className="py-2.5 px-3">Instrument / Method</th>
                          <th className="py-2.5 px-3 text-center">Nominal Target</th>
                          <th className="py-2.5 px-3 text-center">Tolerances</th>
                          <th className="py-2.5 px-3 text-center bg-surface2/60">Latest Reading</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-subtle">
                        {cpList.map(cp => {
                          const hasTol = cp.targetValue !== undefined && cp.targetValue !== null && cp.targetValue !== ''
                          const target = Number(cp.targetValue || 0)
                          const lower = Number(cp.lowerTolerance || 0)
                          const upper = Number(cp.upperTolerance || 0)
                          const minVal = (target + lower).toFixed(3)
                          const maxVal = (target + upper).toFixed(3)
                          const unit = cp.unit || 'mm'

                          const isPass = cp.status === 'Pass'
                          const isMarginal = cp.status === 'Marginal'
                          const isFail = cp.status === 'Fail'

                          return (
                            <tr key={cp.id} className="hover:bg-surface2/20 transition-colors">
                              
                              {/* Checkpoint ID */}
                              <td className="py-2.5 px-3 font-mono font-bold text-muted text-[11px]">
                                {cp.checkpointNo}
                              </td>

                              {/* Parameter Name & Category */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-primary flex items-center gap-1.5">
                                  {cp.parameter}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                                  <span className="text-secondary">{cp.category}</span>
                                  <span>•</span>
                                  <span>Freq: {cp.samplingFrequency}</span>
                                  {cp.nominalSpec && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-secondary">{cp.nominalSpec}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Instrument */}
                              <td className="py-2.5 px-3 text-secondary text-[11px]">
                                <span className="inline-flex items-center gap-1 bg-surface2/60 px-1.5 py-0.5 border border-theme-subtle">
                                  <Gauge size={11} className="text-muted" />
                                  {cp.instrument}
                                </span>
                              </td>

                              {/* Nominal */}
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-primary text-[11px]">
                                {hasTol ? `${cp.targetValue} ${unit}` : (cp.nominalSpec || 'Standard')}
                              </td>

                              {/* Tolerances */}
                              <td className="py-2.5 px-3 text-center font-mono text-[10px] text-secondary">
                                {hasTol ? (
                                  <div>
                                    <span className="font-bold text-primary">
                                      {lower >= 0 ? `+${lower}` : lower} / {upper >= 0 ? `+${upper}` : upper}
                                    </span>
                                    <span className="block text-muted text-[9px]">
                                      [{minVal} ~ {maxVal} {unit}]
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>

                              {/* Latest Reading & Visual Bar */}
                              <td className="py-2.5 px-3 text-center font-mono bg-surface2/20">
                                {cp.latestValue !== undefined && cp.latestValue !== null && cp.latestValue !== '' ? (
                                  <div className="space-y-0.5">
                                    <span className={`font-black text-xs ${
                                      isPass ? 'text-emerald-500' : isMarginal ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                      {cp.latestValue} {hasTol ? unit : ''}
                                    </span>
                                    {cp.lastInspectedBy && (
                                      <span className="block text-[9px] text-muted">
                                        by {cp.lastInspectedBy}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted italic text-[11px]">Not measured</span>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="py-2.5 px-3 text-center">
                                {isPass && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                                    <Check size={11} /> Pass
                                  </span>
                                )}
                                {isMarginal && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                                    <AlertTriangle size={11} /> Warning
                                  </span>
                                )}
                                {isFail && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 inline-flex items-center gap-1">
                                    <AlertCircle size={11} /> Rework
                                  </span>
                                )}
                                {!isPass && !isMarginal && !isFail && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-surface2 text-muted border border-theme-subtle">
                                    Pending
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveMeasureCp(cp)
                                      setMeasureValueInput(cp.latestValue !== undefined ? String(cp.latestValue) : '')
                                      setMeasurePieceNo((cp.measurements?.length || 0) + 1)
                                      setMeasureRemarks('')
                                      const matchedInst = instruments.find(inst => 
                                        cp.instrument && (inst.name?.toLowerCase().includes(cp.instrument.toLowerCase().slice(0, 8)) || inst.type?.toLowerCase().includes(cp.instrument.toLowerCase().slice(0, 8)))
                                      )
                                      setSelectedInstrumentId(matchedInst ? matchedInst.id : (instruments[0]?.id || ''))
                                    }}
                                    className="text-[10px] py-1 px-2.5 h-auto bg-rex-600/10 text-rex-600 dark:text-rex-400 border-rex-500/30 hover:bg-rex-600 hover:text-white rounded-none font-bold"
                                  >
                                    Log Reading
                                  </Button>

                                  <button
                                    onClick={() => openEditCheckpointModal(cp)}
                                    title="Edit Checkpoint"
                                    className="p-1 text-muted hover:text-primary transition-colors"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCheckpoint(cp.id)}
                                    title="Delete Checkpoint"
                                    className="p-1 text-muted hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}

            </div>
          ))}
        </div>
      )}

      {/* Rework Tickets Shortcut Section */}
      {reworkLogs.length > 0 && (
        <div className="pt-4 border-t border-theme-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <RotateCcw size={14} className="text-amber-500" />
              Active Rework Tickets Linked to Quality Gates ({reworkLogs.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reworkLogs.map((rw: any) => (
              <GlassCard key={rw.id} className="p-3 border-theme-subtle rounded-none space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-500">Ticket #{rw.id}</span>
                  <Badge 
                    value={rw.status || 'Pending'} 
                    variant={rw.status === 'Resolved' ? 'success' : 'error'} 
                    className="rounded-none"
                  />
                </div>
                <p className="text-xs font-bold text-primary">{rw.defectReason || 'Out of tolerance'}</p>
                {rw.actionTaken && (
                  <p className="text-[11px] text-secondary bg-surface2/50 p-1.5 border border-theme-subtle">
                    <strong>Action:</strong> {rw.actionTaken}
                  </p>
                )}
                {onOpenReworkModal && rw.status !== 'Resolved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenReworkModal(rw)}
                    className="text-[11px] py-1 px-2 h-auto text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none font-bold"
                  >
                    Resolve Rework Ticket
                  </Button>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ISO 8.7 & 10.2: Non-Conformance Reports (NCR) & CAPA Action Hub */}
      <div className="pt-4 border-t border-theme-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-rose-500" />
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              ISO 8.7 & 10.2: Non-Conformance Reports (NCR) & CAPA Hub ({ncrList.length})
            </h4>
          </div>
          <span className="text-[10px] text-muted font-mono">
            Auto-generated on tolerance failure / quarantine
          </span>
        </div>

        {ncrList.length === 0 ? (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>No open Non-Conformance Reports (NCRs) logged for this Work Order. Quality threshold fully compliant.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ncrList.map((ncr: any) => (
              <GlassCard key={ncr.id} className="p-3.5 border-rose-500/20 bg-rose-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-500">{ncr.ncrNo}</span>
                    <Badge 
                      value={ncr.severity || 'Major'} 
                      variant={ncr.severity === 'Critical' ? 'error' : ncr.severity === 'Major' ? 'warning' : 'neutral'} 
                      className="text-[10px] rounded-none py-0.5"
                    />
                  </div>
                  <Badge 
                    value={ncr.status || 'Open'} 
                    variant={ncr.status === 'Closed' ? 'success' : ncr.status === 'Dispositioned' ? 'warning' : 'error'} 
                    className="text-[10px] rounded-none py-0.5"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold text-primary">{ncr.defectDescription || 'Out of specification reading'}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                    <span>Part: {ncr.partTitle || 'Machined Component'}</span>
                    <span>•</span>
                    <span>Qty: {ncr.qtyAffected || 1}</span>
                    {ncr.disposition && (
                      <>
                        <span>•</span>
                        <span className="text-rex-500 font-bold">Disposition: {ncr.disposition}</span>
                      </>
                    )}
                  </div>
                </div>

                {ncr.rootCause && (
                  <div className="text-[11px] bg-surface2/60 p-2 border border-theme-subtle space-y-1">
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">Root Cause / 5-Why:</div>
                    <p className="text-secondary italic line-clamp-2">{ncr.rootCause}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted font-mono">Raised: {ncr.date ? String(ncr.date).slice(0, 10) : ''}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenNcrModal(ncr)}
                    className="text-[11px] py-1 px-2.5 h-auto text-rose-500 border border-rose-500/40 hover:bg-rose-500/10 rounded-none font-bold"
                  >
                    Disposition & 5-Why CAPA
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD / EDIT QC CHECKPOINT ───────────────────────────────── */}
      <Modal
        isOpen={showCpModal}
        onClose={() => setShowCpModal(false)}
        title={editingCpId ? 'Edit Machining QC Checkpoint' : 'Define New QC Checkpoint for Machining Operation'}
        size="lg"
      >
        <div className="space-y-4">
          
          {/* Quick Presets Carousel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-rex-500" />
                1-Click Presets for Machining Tolerances:
              </span>
              <span className="text-[10px] text-muted">Click any preset to auto-fill</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {MACHINING_PRESETS.map((pst, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(pst)}
                  className="text-[10px] px-2.5 py-1 bg-surface2 border border-theme-subtle hover:border-rex-500 hover:text-rex-500 text-secondary transition-colors font-semibold"
                >
                  {pst.label}
                </button>
              ))}
            </div>
          </div>

          {/* Part and Operation Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface2/30 border border-theme-subtle">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Target BOM Part:
              </label>
              <select
                value={selectedBomIndex}
                onChange={e => {
                  const idx = Number(e.target.value)
                  setSelectedBomIndex(idx)
                  const curBom = parsedBoms[idx]
                  if (curBom?.machiningOps?.length > 0) {
                    setSelectedOpName(curBom.machiningOps[0].procName)
                  }
                }}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                {parsedBoms.map((b, i) => (
                  <option key={i} value={i}>{b.title} {b.drawingNo ? `(DWG: ${b.drawingNo})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Machining Operation / Step:
              </label>
              <select
                value={selectedOpName}
                onChange={e => setSelectedOpName(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                {parsedBoms[selectedBomIndex]?.machiningOps?.map((op: any, oIdx: number) => (
                  <option key={oIdx} value={op.procName}>{op.procName}</option>
                ))}
                {operations.map((op: any, oIdx: number) => (
                  <option key={`op-${oIdx}`} value={op.operationName}>{op.operationName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parameters & Tolerances Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Checkpoint Tag / Gate No:
              </label>
              <input
                type="text"
                value={cpForm.checkpointNo}
                onChange={e => setCpForm({ ...cpForm, checkpointNo: e.target.value })}
                placeholder="QC-01"
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary font-mono focus:border-rex-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Inspection Parameter Name: *
              </label>
              <input
                type="text"
                value={cpForm.parameter}
                onChange={e => setCpForm({ ...cpForm, parameter: e.target.value })}
                placeholder="e.g. Shaft Outer Diameter Ø50h7"
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary font-bold focus:border-rex-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Measurement Category:
              </label>
              <select
                value={cpForm.category}
                onChange={e => setCpForm({ ...cpForm, category: e.target.value as any })}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                <option value="Dimensional">Dimensional (OD / ID / Length)</option>
                <option value="Surface Roughness">Surface Roughness (Ra / Rz)</option>
                <option value="Geometric Tolerance">Geometric (Runout / Perpendicularity)</option>
                <option value="Thread / Pitch">Thread / Pitch (Go / No-Go)</option>
                <option value="Hardness">Hardness (HRC / HB)</option>
                <option value="Visual / Cosmetic">Visual / Deburring / Cleanliness</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Measurement Instrument / Tool:
              </label>
              <select
                value={cpForm.instrument}
                onChange={e => setCpForm({ ...cpForm, instrument: e.target.value })}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                <option value="External Micrometer (0-25mm / 25-50mm)">External Micrometer (0-25mm / 25-50mm)</option>
                <option value="Dial Bore Gauge / Inside Micrometer">Dial Bore Gauge / Inside Micrometer</option>
                <option value="Digital Vernier Caliper / Height Gauge">Digital Vernier Caliper / Height Gauge</option>
                <option value="Dial Test Indicator (DTI) on V-Blocks">Dial Test Indicator (DTI) on V-Blocks</option>
                <option value="Surface Roughness Tester (Surftest)">Surface Roughness Tester (Surftest)</option>
                <option value="Thread Plug / Ring Gauge">Thread Plug / Ring Gauge</option>
                <option value="Rockwell Hardness Tester (Diamond Cone)">Rockwell Hardness Tester (Diamond Cone)</option>
                <option value="Coordinate Measuring Machine (CMM)">Coordinate Measuring Machine (CMM)</option>
                <option value="Visual 10x Magnifier / Touch">Visual 10x Magnifier / Touch</option>
              </select>
            </div>
          </div>

          {/* Tolerance Matrix */}
          <div className="p-3 bg-surface2/40 border border-theme-subtle space-y-3">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
              Nominal Value & Upper/Lower Tolerances
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                  Nominal Target:
                </label>
                <input
                  type="number"
                  step="any"
                  value={cpForm.targetValue}
                  onChange={e => setCpForm({ ...cpForm, targetValue: e.target.value })}
                  placeholder="50.000"
                  className="w-full bg-surface border border-theme-subtle p-1.5 text-xs text-primary font-mono focus:border-rex-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                  Lower Tol (-):
                </label>
                <input
                  type="number"
                  step="any"
                  value={cpForm.lowerTolerance}
                  onChange={e => setCpForm({ ...cpForm, lowerTolerance: e.target.value })}
                  placeholder="-0.015"
                  className="w-full bg-surface border border-theme-subtle p-1.5 text-xs text-primary font-mono focus:border-rex-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                  Upper Tol (+):
                </label>
                <input
                  type="number"
                  step="any"
                  value={cpForm.upperTolerance}
                  onChange={e => setCpForm({ ...cpForm, upperTolerance: e.target.value })}
                  placeholder="+0.000"
                  className="w-full bg-surface border border-theme-subtle p-1.5 text-xs text-primary font-mono focus:border-rex-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                  Unit:
                </label>
                <input
                  type="text"
                  value={cpForm.unit}
                  onChange={e => setCpForm({ ...cpForm, unit: e.target.value })}
                  placeholder="mm / µm / HRC"
                  className="w-full bg-surface border border-theme-subtle p-1.5 text-xs text-primary font-mono focus:border-rex-500"
                />
              </div>
            </div>

            {cpForm.targetValue !== '' && cpForm.lowerTolerance !== '' && cpForm.upperTolerance !== '' && (
              <div className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 p-2 border border-emerald-500/20">
                Effective Acceptance Window: [{(Number(cpForm.targetValue) + Number(cpForm.lowerTolerance)).toFixed(3)} {cpForm.unit} ~ {(Number(cpForm.targetValue) + Number(cpForm.upperTolerance)).toFixed(3)} {cpForm.unit}]
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Sampling Frequency:
              </label>
              <select
                value={cpForm.samplingFrequency}
                onChange={e => setCpForm({ ...cpForm, samplingFrequency: e.target.value })}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                <option value="100% In-Process">100% In-Process</option>
                <option value="First Piece Inspection (FPI)">First Piece Inspection (FPI)</option>
                <option value="1 in 5 Pcs">1 in 5 Pcs</option>
                <option value="1 in 10 Pcs">1 in 10 Pcs</option>
                <option value="100% Final Inspection">100% Final Inspection</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Drawing Spec String / Callout:
              </label>
              <input
                type="text"
                value={cpForm.nominalSpec}
                onChange={e => setCpForm({ ...cpForm, nominalSpec: e.target.value })}
                placeholder="e.g. Ø50h7 (+0.000 / -0.015)"
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary font-mono focus:border-rex-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
              Inspector Instructions / Standard Notes:
            </label>
            <input
              type="text"
              value={cpForm.inspectorNotes}
              onChange={e => setCpForm({ ...cpForm, inspectorNotes: e.target.value })}
              placeholder="e.g. Clean mating surfaces before measuring with calibrated micrometer"
              className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-theme-subtle">
            <Button
              variant="outline"
              onClick={() => setShowCpModal(false)}
              className="text-xs rounded-none border-theme-subtle"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCheckpoint}
              disabled={saving}
              className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs py-2 px-4 rounded-none"
            >
              {saving ? 'Saving...' : editingCpId ? 'Update Checkpoint' : 'Save Checkpoint'}
            </Button>
          </div>

        </div>
      </Modal>

      {/* ── MODAL 2: LOG QC MEASUREMENT ────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(activeMeasureCp)}
        onClose={() => setActiveMeasureCp(null)}
        title={activeMeasureCp ? `Record Inspection Reading: ${activeMeasureCp.parameter}` : 'Log Measurement'}
        size="md"
      >
        {activeMeasureCp && (
          <div className="space-y-4">
            
            {/* Checkpoint Details Summary */}
            <div className="p-3 bg-surface2/40 border border-theme-subtle space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Operation:</span>
                <span className="font-bold text-primary">{activeMeasureCp.operationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Part:</span>
                <span className="font-bold text-primary">{activeMeasureCp.partTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Required Instrument:</span>
                <span className="text-secondary font-mono">{activeMeasureCp.instrument}</span>
              </div>
              {activeMeasureCp.targetValue !== undefined && (
                <div className="flex justify-between pt-1 border-t border-theme-subtle font-mono">
                  <span className="text-muted">Target Specification:</span>
                  <span className="font-bold text-emerald-500">
                    {activeMeasureCp.targetValue} {activeMeasureCp.unit} [
                    {(Number(activeMeasureCp.targetValue) + Number(activeMeasureCp.lowerTolerance || 0)).toFixed(3)} ~ {(Number(activeMeasureCp.targetValue) + Number(activeMeasureCp.upperTolerance || 0)).toFixed(3)}
                    ]
                  </span>
                </div>
              )}
            </div>

            {/* Calibrated Tool Selection & ISO 7.1.5 Verification */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Calibrated Instrument (ISO 7.1.5):
                </label>
                {selectedInstrumentId && instruments.find(i => i.id === selectedInstrumentId)?.isExpired && (
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 border border-rose-500/20">
                    CALIBRATION EXPIRED
                  </span>
                )}
              </div>
              <select
                value={selectedInstrumentId}
                onChange={e => setSelectedInstrumentId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500 font-mono"
              >
                <option value="">-- Generic Workshop Instrument --</option>
                {instruments.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    [{inst.toolNo}] {inst.name} {inst.rangeSpec ? `(${inst.rangeSpec})` : ''} - Due: {inst.nextDueDate ? String(inst.nextDueDate).slice(0, 10) : 'N/A'} {inst.isExpired ? '⚠️ [EXPIRED]' : '✅ [Valid]'}
                  </option>
                ))}
              </select>

              {/* Expired Instrument Warning Banner */}
              {selectedInstrumentId && instruments.find(i => i.id === selectedInstrumentId)?.isExpired && (
                <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                  <div>
                    <strong>ISO 7.1.5 Non-Compliance Alert:</strong> This instrument calibration expired on {String(instruments.find(i => i.id === selectedInstrumentId)?.nextDueDate).slice(0, 10)}. Please quarantine this tool and recalibrate before recording certified production readings.
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Sample / Piece No:
                </label>
                <input
                  type="number"
                  min="1"
                  value={measurePieceNo}
                  onChange={e => setMeasurePieceNo(Number(e.target.value) || 1)}
                  className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary font-mono focus:border-rex-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Measured Value: *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={measureValueInput}
                  onChange={e => setMeasureValueInput(e.target.value)}
                  placeholder={activeMeasureCp.targetValue !== undefined ? String(activeMeasureCp.targetValue) : 'e.g. Pass / 49.992'}
                  className="w-full bg-surface border border-theme-subtle p-2 text-sm text-primary font-black font-mono focus:border-rex-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Inspector Remarks / Observation:
              </label>
              <input
                type="text"
                value={measureRemarks}
                onChange={e => setMeasureRemarks(e.target.value)}
                placeholder="Optional notes or tool calibration ref"
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              />
            </div>

            {/* Auto-rework Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autoRework"
                checked={autoReworkOnFail}
                onChange={e => setAutoReworkOnFail(e.target.checked)}
                className="accent-rex-600 rounded-none w-4 h-4"
              />
              <label htmlFor="autoRework" className="text-xs text-secondary cursor-pointer">
                Automatically generate Rework Ticket if reading falls out of tolerance
              </label>
            </div>

            {/* Measurement History for this checkpoint */}
            {activeMeasureCp.measurements && activeMeasureCp.measurements.length > 0 && (
              <div className="pt-2 border-t border-theme-subtle space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Prior Readings on this Gate ({activeMeasureCp.measurements.length}):
                </span>
                <div className="max-h-32 overflow-y-auto divide-y divide-theme-subtle border border-theme-subtle">
                  {activeMeasureCp.measurements.map((m, idx) => (
                    <div key={m.id || idx} className="p-2 text-xs flex items-center justify-between bg-surface2/30">
                      <span className="font-mono text-muted">Piece #{m.pieceNo}</span>
                      <span className="font-mono font-bold text-primary">{m.measuredValue}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                        m.status === 'Pass' ? 'text-emerald-500 bg-emerald-500/10' : m.status === 'Marginal' ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-subtle">
              <Button
                variant="outline"
                onClick={() => setActiveMeasureCp(null)}
                className="text-xs rounded-none border-theme-subtle"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordMeasurement}
                disabled={saving}
                className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs py-2 px-4 rounded-none"
              >
                {saving ? 'Evaluating...' : 'Confirm & Evaluate'}
              </Button>
            </div>

          </div>
        )}
      </Modal>

      {/* ── MODAL 3: PRINTABLE QC CERTIFICATE ───────────────────────────────── */}
      <WorkOrderQCInspectionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        workOrder={workOrder}
        checkpoints={checkpoints}
      />

      {/* ── MODAL 4: ISO 8.7 & 10.2 NCR DISPOSITION & 5-WHY CAPA ─────────────── */}
      <Modal
        isOpen={Boolean(selectedNcr)}
        onClose={() => setSelectedNcr(null)}
        title={selectedNcr ? `ISO 8.7 / 10.2 NCR Disposition: ${selectedNcr.ncrNo}` : 'NCR Disposition'}
        size="lg"
      >
        {selectedNcr && (
          <div className="space-y-4">
            <div className="p-3 bg-surface2/40 border border-theme-subtle space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Defect Description:</span>
                <span className="font-bold text-primary">{selectedNcr.defectDescription}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Work Order / Part:</span>
                <span className="font-mono text-primary">{selectedNcr.workOrderNumber || workOrder.workOrderNumber} • {selectedNcr.partTitle || 'Machined Component'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-theme-subtle">
                <span className="text-muted">Severity & Quantity:</span>
                <span className="font-bold text-rose-500">{selectedNcr.severity || 'Major'} • {selectedNcr.qtyAffected || 1} pcs</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Material Disposition (ISO 8.7):
                </label>
                <select
                  value={ncrDispositionForm.disposition}
                  onChange={e => setNcrDispositionForm({ ...ncrDispositionForm, disposition: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
                >
                  <option value="Rework">Rework to Drawing Specification</option>
                  <option value="Scrap">Scrap / Write-off Non-conforming Material</option>
                  <option value="Customer Concession">Customer Concession (Accept Under Deviation)</option>
                  <option value="Return to Supplier">Return to Raw Material Supplier (RTV)</option>
                  <option value="Pending">Pending Quality Engineering Review</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  NCR Workflow Status:
                </label>
                <select
                  value={ncrDispositionForm.status}
                  onChange={e => setNcrDispositionForm({ ...ncrDispositionForm, status: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
                >
                  <option value="Open">Open (Action Pending)</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Dispositioned">Dispositioned (Action Assigned)</option>
                  <option value="Closed">Closed & Verified Compliant</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Root Cause Analysis (5-Why Method - ISO 10.2):
              </label>
              <textarea
                rows={3}
                value={ncrDispositionForm.rootCause}
                onChange={e => setNcrDispositionForm({ ...ncrDispositionForm, rootCause: e.target.value })}
                placeholder="1. Why did the bore oversize? Carbide insert broke mid-pass. 2. Why did it break? Feed rate spike during rapid traverse. 3. Why?..."
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Corrective Action (Immediate Fix):
                </label>
                <textarea
                  rows={2}
                  value={ncrDispositionForm.correctiveAction}
                  onChange={e => setNcrDispositionForm({ ...ncrDispositionForm, correctiveAction: e.target.value })}
                  placeholder="Immediate correction applied on active setup..."
                  className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Preventive Action (Systemic CAPA):
                </label>
                <textarea
                  rows={2}
                  value={ncrDispositionForm.preventiveAction}
                  onChange={e => setNcrDispositionForm({ ...ncrDispositionForm, preventiveAction: e.target.value })}
                  placeholder="Preventive actions to prevent reoccurrence across all shifts..."
                  className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
              <Button variant="outline" size="sm" onClick={() => setSelectedNcr(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveNcrDisposition} disabled={saving}>
                {saving ? 'Saving...' : 'Save NCR Disposition & CAPA'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
