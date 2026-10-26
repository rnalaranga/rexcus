import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Layers, Wrench, Package, DollarSign, Clock, 
  Sparkles, Check, AlertCircle, RefreshCw, Calculator, ArrowRight,
  ArrowLeft, Search, Copy, Lock, Shield, ChevronRight, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { adjustWorkOrderFullBom } from '@/lib/api';
import { useInventory } from '@/hooks/useData';
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete';

export interface BomAdjustPart {
  partId?: string | number;
  title: string;
  partNo?: string;
  drawingNo?: string;
  description?: string;
  autoMats: {
    id?: string;
    material: string;
    spec?: string;
    profile?: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice?: number;
    notes?: string;
  }[];
  manualMats: {
    id?: string;
    material: string;
    spec?: string;
    profile?: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice?: number;
    notes?: string;
  }[];
  machiningOps: {
    id?: string;
    procName: string;
    quoHr: number;
    estHr?: number;
    setTime?: number;
    hrRate: number;
    machineRate: number;
    setTimeRate?: number;
    cost?: number;
  }[];
}

interface WorkOrderFullBomAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  initialBoms: any[];
  initialPartIndex?: number;
  onSuccess: (updatedData?: any) => void;
}

export const WorkOrderFullBomAdjustModal: React.FC<WorkOrderFullBomAdjustModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  initialBoms,
  initialPartIndex = 0,
  onSuccess
}) => {
  const [parts, setParts] = useState<BomAdjustPart[]>([]);
  const [activePartIdx, setActivePartIdx] = useState<number>(0);
  const [overheadPct, setOverheadPct] = useState<number>(15);
  const [syncRouting, setSyncRouting] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchPartQuery, setSearchPartQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'mats' | 'ops'>('all');
  const { data: inventory = [] } = useInventory();
  const partListRef = useRef<HTMLDivElement>(null);

  // Initialize form state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const initialOverhead = Number(workOrder?.overheadPct !== undefined && workOrder?.overheadPct !== null ? workOrder.overheadPct : 15);
    setOverheadPct(initialOverhead);
    setErrorMsg(null);
    setSearchPartQuery('');
    setFilterMode('all');

    if (Array.isArray(initialBoms) && initialBoms.length > 0) {
      const clonedParts: BomAdjustPart[] = initialBoms.map((b, idx) => ({
        partId: b.partId || b.id || `part-${idx + 1}`,
        title: b.title || `BOM Part ${idx + 1}`,
        partNo: b.partNo || '',
        drawingNo: b.drawingNo || '',
        description: b.description || '',
        autoMats: Array.isArray(b.autoMats) && b.autoMats.length > 0
          ? b.autoMats.map((m: any, mIdx: number) => ({
              id: m.id || `auto-${idx}-${mIdx}`,
              material: m.material || 'Raw Stock',
              spec: m.spec || '',
              profile: m.profile || (m.dia ? 'Round Bar' : 'Plate / Sheet'),
              qty: Number(m.qty || 1),
              unit: m.unit || 'pcs',
              unitPrice: Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0)),
              notes: m.notes || ''
            }))
          : (Array.isArray(b.allMaterials) && (!b.manualMats || b.manualMats.length === 0)
              ? b.allMaterials.map((m: any, mIdx: number) => ({
                  id: m.id || `auto-${idx}-${mIdx}`,
                  material: m.material || 'Raw Stock',
                  spec: m.spec || '',
                  profile: m.profile || 'Raw Stock',
                  qty: Number(m.qty || 1),
                  unit: m.unit || 'pcs',
                  unitPrice: Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0)),
                  notes: m.notes || ''
                }))
              : []),
        manualMats: Array.isArray(b.manualMats)
          ? b.manualMats.map((m: any, mIdx: number) => ({
              id: m.id || `manual-${idx}-${mIdx}`,
              material: m.material || 'Bought-out Component',
              spec: m.spec || 'Standard Hardware',
              profile: m.profile || 'Bought-out',
              qty: Number(m.qty || 1),
              unit: m.unit || 'pcs',
              unitPrice: Number(m.unitPrice !== undefined ? m.unitPrice : (m.unitCost || 0)),
              notes: m.notes || ''
            }))
          : [],
        machiningOps: Array.isArray(b.machiningOps)
          ? b.machiningOps.map((op: any, oIdx: number) => ({
              id: op.id || `proc-${idx}-${oIdx}`,
              procName: op.procName || op.operationName || `Operation ${oIdx + 1}`,
              quoHr: Number(op.quoHr || op.plannedHours || 0),
              estHr: Number(op.estHr !== undefined ? op.estHr : (op.quoHr || op.plannedHours || 0)),
              setTime: Number(op.setTime || 0),
              hrRate: Number(op.hrRate || op.hourlyLaborRate || 750),
              machineRate: Number(op.machineRate || op.hourlyMachineRate || 1200),
              setTimeRate: Number(op.setTimeRate || op.hrRate || 750)
            }))
          : []
      }));

      setParts(clonedParts);
      setActivePartIdx(Math.min(initialPartIndex, clonedParts.length - 1));
    } else {
      // Default single fallback part
      setParts([{
        partId: 'part-1',
        title: workOrder?.title || 'Main Manufactured Part',
        partNo: '',
        drawingNo: '',
        description: 'Standard Work Order Bill of Materials',
        autoMats: [],
        manualMats: [],
        machiningOps: []
      }]);
      setActivePartIdx(0);
    }
  }, [isOpen, initialBoms, workOrder, initialPartIndex]);

  // Keyboard shortcut support: Esc to close, Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAndRecalculate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, parts, overheadPct, syncRouting]);

  // LIVE CALCULATIONS
  const currentPart = parts[activePartIdx] || parts[0];

  // Helper calculation for single operation cost
  const calcOpCost = (op: { quoHr: number; estHr?: number; setTime?: number; hrRate: number; machineRate: number; setTimeRate?: number }) => {
    const effectiveHrs = Number(op.estHr !== undefined && op.estHr > 0 ? op.estHr : (op.quoHr || 0));
    const setTime = Number(op.setTime || 0);
    const laborRate = Number(op.hrRate || 750);
    const machRate = Number(op.machineRate || 1200);
    const setTimeRate = Number(op.setTimeRate || laborRate);
    return (effectiveHrs * (laborRate + machRate)) + (setTime * setTimeRate);
  };

  // Grand totals across all parts
  const totals = useMemo(() => {
    let grandMatCost = 0;
    let grandMachLaborCost = 0;
    let grandQuotedHours = 0;

    const partsBreakdown = parts.map(p => {
      const autoMatTotal = (p.autoMats || []).reduce((sum, m) => sum + (Number(m.qty || 0) * Number(m.unitPrice || 0)), 0);
      const manualMatTotal = (p.manualMats || []).reduce((sum, m) => sum + (Number(m.qty || 0) * Number(m.unitPrice || 0)), 0);
      const partMatCost = autoMatTotal + manualMatTotal;

      const partMachLaborCost = (p.machiningOps || []).reduce((sum, op) => sum + calcOpCost(op), 0);
      const partHours = (p.machiningOps || []).reduce((sum, op) => sum + Number(op.estHr !== undefined && op.estHr > 0 ? op.estHr : (op.quoHr || 0)), 0);

      grandMatCost += partMatCost;
      grandMachLaborCost += partMachLaborCost;
      grandQuotedHours += partHours;

      return {
        autoMatTotal,
        manualMatTotal,
        partMatCost,
        partMachLaborCost,
        partTotal: partMatCost + partMachLaborCost,
        partHours
      };
    });

    const safeOverheadPct = Number(overheadPct || 0);
    const overheadCost = Math.round((grandMatCost + grandMachLaborCost) * (safeOverheadPct / 100));
    const totalEstimatedCost = Math.round(grandMatCost + grandMachLaborCost + overheadCost);

    const prevEstimated = Number(workOrder?.estimatedCost || 0);
    const variance = totalEstimatedCost - prevEstimated;

    return {
      grandMatCost,
      grandMachLaborCost,
      grandQuotedHours,
      overheadCost,
      totalEstimatedCost,
      partsBreakdown,
      prevEstimated,
      variance
    };
  }, [parts, overheadPct, workOrder]);

  // Filtered Parts for 20-30 BOMs search navigation
  const filteredParts = useMemo(() => {
    const q = searchPartQuery.trim().toLowerCase();
    return parts.map((part, originalIdx) => ({ part, originalIdx })).filter(({ part }) => {
      const matchesSearch = !q || 
        part.title.toLowerCase().includes(q) ||
        (part.partNo || '').toLowerCase().includes(q) ||
        (part.drawingNo || '').toLowerCase().includes(q) ||
        (part.description || '').toLowerCase().includes(q) ||
        part.autoMats.some(m => m.material.toLowerCase().includes(q) || (m.spec || '').toLowerCase().includes(q)) ||
        part.manualMats.some(m => m.material.toLowerCase().includes(q)) ||
        part.machiningOps.some(o => o.procName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterMode === 'mats') {
        return (part.autoMats.length + part.manualMats.length) > 0;
      }
      if (filterMode === 'ops') {
        return part.machiningOps.length > 0;
      }
      return true;
    });
  }, [parts, searchPartQuery, filterMode]);

  if (!isOpen) return null;

  // Mutation Handlers for Active Part
  const updatePartField = (field: keyof BomAdjustPart, val: any) => {
    setParts(prev => {
      const copy = [...prev];
      copy[activePartIdx] = { ...copy[activePartIdx], [field]: val };
      return copy;
    });
  };

  // Raw Material Row Actions
  const handleAddAutoMat = () => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.autoMats = [
        ...part.autoMats,
        {
          id: `auto-${activePartIdx}-${Date.now()}`,
          material: '',
          spec: '',
          profile: 'Round Bar',
          qty: 1,
          unit: 'pcs',
          unitPrice: 0,
          notes: ''
        }
      ];
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleUpdateAutoMat = (mIdx: number, field: string, val: any) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      const mats = [...part.autoMats];
      mats[mIdx] = { ...mats[mIdx], [field]: val };
      part.autoMats = mats;
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleDeleteAutoMat = (mIdx: number) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.autoMats = part.autoMats.filter((_, i) => i !== mIdx);
      copy[activePartIdx] = part;
      return copy;
    });
  };

  // Bought-Out Components Row Actions
  const handleAddManualMat = () => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.manualMats = [
        ...part.manualMats,
        {
          id: `manual-${activePartIdx}-${Date.now()}`,
          material: '',
          spec: '',
          profile: 'Bought-out',
          qty: 1,
          unit: 'pcs',
          unitPrice: 0,
          notes: ''
        }
      ];
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleUpdateManualMat = (mIdx: number, field: string, val: any) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      const mats = [...part.manualMats];
      mats[mIdx] = { ...mats[mIdx], [field]: val };
      part.manualMats = mats;
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleDeleteManualMat = (mIdx: number) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.manualMats = part.manualMats.filter((_, i) => i !== mIdx);
      copy[activePartIdx] = part;
      return copy;
    });
  };

  // Machining Operations Row Actions
  const handleAddOp = () => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.machiningOps = [
        ...part.machiningOps,
        {
          id: `proc-${activePartIdx}-${Date.now()}`,
          procName: '',
          quoHr: 1,
          estHr: 1,
          setTime: 0,
          hrRate: 750,
          machineRate: 1200,
          setTimeRate: 750
        }
      ];
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleUpdateOp = (oIdx: number, field: string, val: any) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      const ops = [...part.machiningOps];
      ops[oIdx] = { ...ops[oIdx], [field]: val };
      part.machiningOps = ops;
      copy[activePartIdx] = part;
      return copy;
    });
  };

  const handleDeleteOp = (oIdx: number) => {
    setParts(prev => {
      const copy = [...prev];
      const part = { ...copy[activePartIdx] };
      part.machiningOps = part.machiningOps.filter((_, i) => i !== oIdx);
      copy[activePartIdx] = part;
      return copy;
    });
  };

  // Part Management (Add New Part / Clone Part / Delete Part)
  const handleAddNewPart = () => {
    const newIdx = parts.length + 1;
    const newPart: BomAdjustPart = {
      partId: `part-${Date.now()}`,
      title: `BOM Part ${newIdx}`,
      partNo: '',
      drawingNo: '',
      description: '',
      autoMats: [],
      manualMats: [],
      machiningOps: []
    };
    setParts(prev => [...prev, newPart]);
    setActivePartIdx(parts.length);
  };

  const handleClonePart = (pIdx: number) => {
    const source = parts[pIdx];
    if (!source) return;
    const cloned: BomAdjustPart = {
      ...source,
      partId: `part-${Date.now()}`,
      title: `${source.title} (Copy)`,
      autoMats: source.autoMats.map((m, mIdx) => ({ ...m, id: `auto-${Date.now()}-${mIdx}` })),
      manualMats: source.manualMats.map((m, mIdx) => ({ ...m, id: `manual-${Date.now()}-${mIdx}` })),
      machiningOps: source.machiningOps.map((op, oIdx) => ({ ...op, id: `proc-${Date.now()}-${oIdx}` }))
    };
    setParts(prev => [...prev, cloned]);
    setActivePartIdx(parts.length);
  };

  const handleDeletePart = (pIdx: number) => {
    if (parts.length <= 1) {
      alert('A work order must have at least one BOM part.');
      return;
    }
    if (!confirm(`Are you sure you want to remove Part ${pIdx + 1} (${parts[pIdx].title})?`)) return;
    setParts(prev => prev.filter((_, i) => i !== pIdx));
    setActivePartIdx(prev => Math.max(0, prev > 0 ? prev - 1 : 0));
  };

  // SAVE & RECALCULATE JOB COSTING
  const handleSaveAndRecalculate = async () => {
    setSaving(true);
    setErrorMsg(null);

    try {
      // Validate that each part has a title
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].title.trim()) {
          setErrorMsg(`Part #${i + 1} must have a title or name.`);
          setActivePartIdx(i);
          setSaving(false);
          return;
        }
      }

      // Enrich parts with calculated totals (rates are protected/preserved)
      const enrichedParts = parts.map((p, idx) => {
        const autoMats = (p.autoMats || []).map((m, mIdx) => ({
          ...m,
          id: m.id || `auto-${idx}-${mIdx}`,
          qty: Number(m.qty || 1),
          unitPrice: Number(m.unitPrice || 0),
          totalPrice: Number(m.qty || 1) * Number(m.unitPrice || 0)
        }));

        const manualMats = (p.manualMats || []).map((m, mIdx) => ({
          ...m,
          id: m.id || `manual-${idx}-${mIdx}`,
          qty: Number(m.qty || 1),
          unitPrice: Number(m.unitPrice || 0),
          totalPrice: Number(m.qty || 1) * Number(m.unitPrice || 0)
        }));

        const machiningOps = (p.machiningOps || []).map((op, oIdx) => {
          const effectiveHours = Number(op.estHr !== undefined && op.estHr > 0 ? op.estHr : (op.quoHr || 0));
          const opCost = calcOpCost(op);
          return {
            ...op,
            id: op.id || `proc-${idx}-${oIdx}`,
            quoHr: Number(op.quoHr || 0),
            estHr: effectiveHours,
            cost: Math.round(opCost)
          };
        });

        const matTotal = autoMats.reduce((s, m) => s + m.totalPrice, 0) + manualMats.reduce((s, m) => s + m.totalPrice, 0);
        const machTotal = machiningOps.reduce((s, op) => s + (op.cost || 0), 0);
        const totalQuotedHours = machiningOps.reduce((s, op) => s + Number(op.quoHr || 0), 0);

        return {
          ...p,
          partId: p.partId || `part-${idx + 1}`,
          autoMats,
          manualMats,
          allMaterials: [...autoMats, ...manualMats],
          machiningOps,
          matTotal,
          machTotal,
          bomTotal: matTotal + machTotal,
          totalQuotedHours
        };
      });

      const response = await adjustWorkOrderFullBom(workOrder.id, {
        boms: enrichedParts,
        overheadPct: Number(overheadPct || 15),
        syncRouting
      });

      if (response.success) {
        onSuccess(response);
        onClose();
      } else {
        setErrorMsg(response.error || 'Failed to update Work Order BOM');
      }
    } catch (err: any) {
      console.error('Error saving adjusted BOM:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const activePartBreakdown = totals.partsBreakdown[activePartIdx] || {
    autoMatTotal: 0,
    manualMatTotal: 0,
    partMatCost: 0,
    partMachLaborCost: 0,
    partTotal: 0,
    partHours: 0
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-surface text-primary animate-fade-in overflow-hidden select-none">
      
      {/* ── 1. TOP STUDIO HEADER (FULL SCREEN WORKSPACE) ────────────────────── */}
      <header className="h-14 bg-surface2/80 border-b border-theme-subtle px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary transition-colors py-1.5 px-2.5 border border-theme-subtle bg-surface hover:bg-surface2 shrink-0 rounded-none shadow-2xs"
            title="Return to Work Order detail view"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to WO</span>
          </button>

          <div className="h-4 w-px bg-theme-subtle hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-none bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-primary truncate">
                  BOM Engineering & Job Costing Studio
                </h1>
                <Badge variant="outline" className="font-mono text-xs font-bold border-theme-subtle bg-surface">
                  WO: {workOrder?.orderNo || workOrder?.id}
                </Badge>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {parts.length} BOM Parts
                </span>
              </div>
              <p className="text-[11px] text-muted truncate hidden md:block">
                Precision BOM component editing with locked cost database rates & dynamic live costing recalculation.
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Status & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Target Budget Counter */}
          <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-surface border border-theme-subtle rounded-none">
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted">Target Internal Budget</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.totalEstimatedCost)}
              </span>
              {totals.variance !== 0 && (
                <span className={`text-[10px] font-mono font-bold ${totals.variance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  ({totals.variance > 0 ? `+${formatCurrency(totals.variance)}` : formatCurrency(totals.variance)})
                </span>
              )}
            </div>
          </div>

          {/* Locked Rates Security Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
            <Lock size={12} className="shrink-0" />
            <span>Unit Rates Protected (Read-Only)</span>
          </div>

          {/* Primary Save Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAndRecalculate}
            disabled={saving}
            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm rounded-none px-3.5"
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Recalculating...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Apply to Work Order</span>
              </>
            )}
          </Button>

          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded-none"
            aria-label="Close studio"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ERROR BANNER IF ANY */}
      {errorMsg && (
        <div className="px-6 py-2.5 bg-red-500/10 border-b border-red-500/30 text-red-600 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 2. STUDIO MAIN BODY: 2-PANEL MASTER-DETAIL ARCHITECTURE ──────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* ── LEFT PANEL: 20-30 PARTS MASTER NAVIGATOR ──────────────────────── */}
        <aside className="w-80 sm:w-88 md:w-96 bg-surface2/40 border-r border-theme-subtle flex flex-col shrink-0 h-full overflow-hidden">
          
          {/* Navigator Header & Search */}
          <div className="p-3 border-b border-theme-subtle bg-surface space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-secondary" />
                <span>BOM Parts Directory</span>
              </span>
              <span className="text-[11px] font-mono text-muted">
                {filteredParts.length} of {parts.length} parts
              </span>
            </div>

            {/* Fast search input for 20-30 parts */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchPartQuery}
                onChange={e => setSearchPartQuery(e.target.value)}
                placeholder="Search part name, dwg, part #..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface2 border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary rounded-none"
              />
              {searchPartQuery && (
                <button
                  onClick={() => setSearchPartQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 text-[10px]">
              {(['all', 'mats', 'ops'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-2 py-0.5 border font-semibold uppercase tracking-wider transition-colors ${
                    filterMode === mode
                      ? 'bg-primary text-surface border-primary font-bold'
                      : 'bg-surface text-muted border-theme-subtle hover:bg-surface2'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'mats' ? 'Materials' : 'Machining'}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Parts List */}
          <div ref={partListRef} className="flex-1 overflow-y-auto divide-y divide-theme-subtle">
            {filteredParts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <Package size={28} className="mx-auto opacity-40 mb-1" />
                <p className="font-semibold text-primary">No matching BOM parts</p>
                <p className="text-[11px]">Try clearing search filter "{searchPartQuery}"</p>
              </div>
            ) : (
              filteredParts.map(({ part, originalIdx }) => {
                const isActive = originalIdx === activePartIdx;
                const breakdown = totals.partsBreakdown[originalIdx];
                const totalMats = part.autoMats.length + part.manualMats.length;
                const totalOps = part.machiningOps.length;

                return (
                  <div
                    key={part.partId || originalIdx}
                    onClick={() => setActivePartIdx(originalIdx)}
                    className={`p-3 cursor-pointer transition-all border-l-4 group relative flex items-start justify-between gap-2 select-none ${
                      isActive
                        ? 'bg-surface border-l-emerald-600 shadow-sm'
                        : 'hover:bg-surface/60 border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 ${
                          isActive 
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                            : 'bg-surface2 text-muted border border-theme-subtle'
                        }`}>
                          #{String(originalIdx + 1).padStart(2, '0')}
                        </span>
                        <h4 className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-primary' : 'text-secondary group-hover:text-primary'}`}>
                          {part.title || `BOM Part ${originalIdx + 1}`}
                        </h4>
                      </div>

                      {/* Part No / Drawing Reference */}
                      {(part.drawingNo || part.partNo) && (
                        <div className="text-[10px] font-mono text-muted truncate flex items-center gap-2">
                          {part.drawingNo && <span>Dwg: {part.drawingNo}</span>}
                          {part.partNo && <span>P/N: {part.partNo}</span>}
                        </div>
                      )}

                      {/* Item counts & subtotal */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted">
                          {totalMats} mats • {totalOps} ops
                        </span>
                        {breakdown && (
                          <span className={`text-[11px] font-mono font-bold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'}`}>
                            {formatCurrency(breakdown.partTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover actions for part (Clone / Delete) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClonePart(originalIdx);
                        }}
                        className="p-1 text-muted hover:text-primary hover:bg-surface2 border border-theme-subtle rounded-none"
                        title="Clone / Duplicate this part"
                      >
                        <Copy size={11} />
                      </button>
                      {parts.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePart(originalIdx);
                          }}
                          className="p-1 text-muted hover:text-red-600 hover:bg-surface2 border border-theme-subtle rounded-none"
                          title="Delete part"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Pinned Action: Add New Part */}
          <div className="p-3 border-t border-theme-subtle bg-surface shrink-0">
            <button
              onClick={handleAddNewPart}
              className="w-full py-2 px-3 text-xs font-bold text-primary bg-surface border border-dashed border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 rounded-none"
            >
              <Plus size={14} className="text-primary" />
              <span>Add New BOM Part</span>
            </button>
          </div>
        </aside>

        {/* ── RIGHT PANEL: ACTIVE PART WORKSPACE ────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-surface">
          
          {/* Workspace Sub-Header: Active Part Info & Quick Traversal */}
          <div className="px-6 py-3 border-b border-theme-subtle bg-surface2/30 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-primary text-surface rounded-none shrink-0">
                Part {activePartIdx + 1} of {parts.length}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-primary truncate">
                  {currentPart.title}
                </h2>
                <div className="text-[11px] text-muted flex items-center gap-2">
                  <span>Part Cost: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(activePartBreakdown.partTotal)}</strong></span>
                  <span>•</span>
                  <span>Hours: <strong className="font-mono text-secondary">{activePartBreakdown.partHours.toFixed(1)} hrs</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Part Prev / Next Navigator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={activePartIdx <= 0}
                onClick={() => setActivePartIdx(prev => Math.max(0, prev - 1))}
                className="h-7 px-2.5 text-xs border-theme-subtle flex items-center gap-1 rounded-none"
              >
                <ArrowLeft size={12} />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={activePartIdx >= parts.length - 1}
                onClick={() => setActivePartIdx(prev => Math.min(parts.length - 1, prev + 1))}
                className="h-7 px-2.5 text-xs border-theme-subtle flex items-center gap-1 rounded-none"
              >
                <span className="hidden sm:inline">Next</span>
                <ArrowRight size={12} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClonePart(activePartIdx)}
                className="h-7 px-2.5 text-xs border-theme-subtle flex items-center gap-1 rounded-none ml-1 text-secondary hover:text-primary"
                title="Duplicate this part BOM"
              >
                <Copy size={12} />
                <span className="hidden md:inline">Duplicate</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Workspace Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* PART METADATA CARD */}
            <div className="p-4 bg-surface2/40 border border-theme-subtle grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Part Name / Component Title *</label>
                <input
                  type="text"
                  value={currentPart.title}
                  onChange={e => updatePartField('title', e.target.value)}
                  placeholder="e.g. Main Shaft, Lower Flange..."
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-bold text-primary rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Internal Part No (P/N)</label>
                <input
                  type="text"
                  value={currentPart.partNo || ''}
                  onChange={e => updatePartField('partNo', e.target.value)}
                  placeholder="e.g. PRT-0045"
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-primary rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted uppercase">Drawing No (Dwg Ref)</label>
                <input
                  type="text"
                  value={currentPart.drawingNo || ''}
                  onChange={e => updatePartField('drawingNo', e.target.value)}
                  placeholder="e.g. DWG-REX-110"
                  className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-primary rounded-none"
                />
              </div>
            </div>

            {/* 1. RAW MATERIALS SECTION (RATES PROTECTED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Package size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                      1. Raw Materials ({currentPart.autoMats.length})
                    </h3>
                    <p className="text-[10px] text-muted">
                      Bars, Plates, Shafts, Castings, Tubes • Unit prices are locked & protected by cost database.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAutoMat}
                  className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary rounded-none"
                >
                  <Plus size={13} />
                  <span>Add Material</span>
                </Button>
              </div>

              {currentPart.autoMats.length === 0 ? (
                <div className="p-5 text-center border border-dashed border-theme-subtle text-xs text-muted bg-surface2/20">
                  No raw materials allocated for this part. Click "Add Material" to define stock requirements.
                </div>
              ) : (
                <div className="overflow-x-auto border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/70 border-b border-theme-subtle text-left text-muted font-bold text-[10.5px] uppercase">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Material Grade / Name</th>
                        <th className="py-2.5 px-3">Dimensions / Spec</th>
                        <th className="py-2.5 px-3 w-32">Profile</th>
                        <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
                        <th className="py-2.5 px-3 w-20">Unit</th>
                        <th className="py-2.5 px-3 w-36 text-right">
                          <span className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400" title="Locked standard unit cost">
                            <Lock size={10} /> Unit Rate (LKR)
                          </span>
                        </th>
                        <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {currentPart.autoMats.map((mat, mIdx) => {
                        const subtotal = Number(mat.qty || 0) * Number(mat.unitPrice || 0);
                        return (
                          <tr key={mat.id || mIdx} className="hover:bg-surface2/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted">{mIdx + 1}</td>
                            <td className="py-1 px-3">
                              <ProductAutocomplete
                                value={mat.material}
                                onChange={(val, inv) => {
                                  handleUpdateAutoMat(mIdx, 'material', inv ? inv.name : val);
                                  if (inv) {
                                    if (inv.uom) handleUpdateAutoMat(mIdx, 'unit', inv.uom);
                                    if (inv.unitCost) handleUpdateAutoMat(mIdx, 'unitPrice', Number(inv.unitCost));
                                  }
                                }}
                                products={inventory}
                                placeholder="Search raw material / grade..."
                                className="text-xs py-1"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={mat.spec || ''}
                                onChange={e => handleUpdateAutoMat(mIdx, 'spec', e.target.value)}
                                placeholder="e.g. Ø50mm x 250mm, Thick: 12mm"
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary font-mono rounded-none"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <select
                                value={mat.profile || 'Round Bar'}
                                onChange={e => handleUpdateAutoMat(mIdx, 'profile', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary rounded-none"
                              >
                                <option value="Round Bar">Round Bar</option>
                                <option value="Plate / Sheet">Plate / Sheet</option>
                                <option value="Hollow Tube">Hollow Tube</option>
                                <option value="Hexagon Bar">Hexagon Bar</option>
                                <option value="Square Bar">Square Bar</option>
                                <option value="Casting / Block">Casting / Block</option>
                                <option value="Raw Stock">Raw Stock</option>
                              </select>
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={mat.qty}
                                onChange={e => handleUpdateAutoMat(mIdx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary rounded-none"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={mat.unit}
                                onChange={e => handleUpdateAutoMat(mIdx, 'unit', e.target.value)}
                                placeholder="pcs/kg"
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-secondary rounded-none"
                              />
                            </td>
                            {/* LOCKED READ-ONLY RATE */}
                            <td className="py-1 px-3">
                              <div 
                                className="px-2.5 py-1 text-xs bg-surface2/60 border border-theme-subtle text-right font-mono font-semibold text-muted flex items-center justify-end gap-1 cursor-not-allowed select-none"
                                title="Standard unit rate is locked and cannot be edited by operators"
                              >
                                <Lock size={10} className="text-amber-500/70" />
                                <span>{formatCurrency(Number(mat.unitPrice || 0))}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button
                                onClick={() => handleDeleteAutoMat(mIdx)}
                                className="text-muted hover:text-red-500 p-1 transition-colors"
                                title="Delete material row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. BOUGHT-OUT / HARDWARE COMPONENTS (RATES PROTECTED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                      2. Bought-Out / Hardware Components ({currentPart.manualMats.length})
                    </h3>
                    <p className="text-[10px] text-muted">
                      Fasteners, Bearings, Seals, O-Rings, Circlips, Commercial Fittings • Rates locked.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddManualMat}
                  className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary rounded-none"
                >
                  <Plus size={13} />
                  <span>Add Hardware Item</span>
                </Button>
              </div>

              {currentPart.manualMats.length === 0 ? (
                <div className="p-5 text-center border border-dashed border-theme-subtle text-xs text-muted bg-surface2/20">
                  No bought-out hardware required for this part.
                </div>
              ) : (
                <div className="overflow-x-auto border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/70 border-b border-theme-subtle text-left text-muted font-bold text-[10.5px] uppercase">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Component / Hardware Item</th>
                        <th className="py-2.5 px-3">Specification / Part Reference</th>
                        <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
                        <th className="py-2.5 px-3 w-20">Unit</th>
                        <th className="py-2.5 px-3 w-36 text-right">
                          <span className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400" title="Locked standard unit cost">
                            <Lock size={10} /> Unit Rate (LKR)
                          </span>
                        </th>
                        <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {currentPart.manualMats.map((mat, mIdx) => {
                        const subtotal = Number(mat.qty || 0) * Number(mat.unitPrice || 0);
                        return (
                          <tr key={mat.id || mIdx} className="hover:bg-surface2/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted">{mIdx + 1}</td>
                            <td className="py-1 px-3">
                              <ProductAutocomplete
                                value={mat.material}
                                onChange={(val, inv) => {
                                  handleUpdateManualMat(mIdx, 'material', inv ? inv.name : val);
                                  if (inv) {
                                    if (inv.uom) handleUpdateManualMat(mIdx, 'unit', inv.uom);
                                    if (inv.unitCost) handleUpdateManualMat(mIdx, 'unitPrice', Number(inv.unitCost));
                                  }
                                }}
                                products={inventory}
                                placeholder="Search hardware / component..."
                                className="text-xs py-1"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={mat.spec || ''}
                                onChange={e => handleUpdateManualMat(mIdx, 'spec', e.target.value)}
                                placeholder="e.g. Grade 8.8, SKF Standard"
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary font-mono rounded-none"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={mat.qty}
                                onChange={e => handleUpdateManualMat(mIdx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary rounded-none"
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={mat.unit}
                                onChange={e => handleUpdateManualMat(mIdx, 'unit', e.target.value)}
                                placeholder="pcs/sets"
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-secondary rounded-none"
                              />
                            </td>
                            {/* LOCKED READ-ONLY RATE */}
                            <td className="py-1 px-3">
                              <div 
                                className="px-2.5 py-1 text-xs bg-surface2/60 border border-theme-subtle text-right font-mono font-semibold text-muted flex items-center justify-end gap-1 cursor-not-allowed select-none"
                                title="Standard hardware rate is locked"
                              >
                                <Lock size={10} className="text-amber-500/70" />
                                <span>{formatCurrency(Number(mat.unitPrice || 0))}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button
                                onClick={() => handleDeleteManualMat(mIdx)}
                                className="text-muted hover:text-red-500 p-1 transition-colors"
                                title="Delete hardware row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. MACHINING OPERATIONS & ROUTING CYCLE TIMES (HOURLY RATES PROTECTED) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Wrench size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                      3. Machining Operations & Cycle Hours ({currentPart.machiningOps.length})
                    </h3>
                    <p className="text-[10px] text-muted">
                      Adjust planned machining hours and setup time. Machine & labor hourly rates are locked.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddOp}
                  className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary rounded-none"
                >
                  <Plus size={13} />
                  <span>Add Machining Operation</span>
                </Button>
              </div>

              {currentPart.machiningOps.length === 0 ? (
                <div className="p-5 text-center border border-dashed border-theme-subtle text-xs text-muted bg-surface2/20">
                  No machining operations specified. Click "Add Machining Operation" to allocate shop routing.
                </div>
              ) : (
                <div className="overflow-x-auto border border-theme-subtle">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/70 border-b border-theme-subtle text-left text-muted font-bold text-[10.5px] uppercase">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Operation / Process Description</th>
                        <th className="py-2.5 px-3 w-28 text-right">Cycle Hrs</th>
                        <th className="py-2.5 px-3 w-28 text-right">Setup Hrs</th>
                        <th className="py-2.5 px-3 w-36 text-right">
                          <span className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400" title="Standard labor hourly rate is locked">
                            <Lock size={10} /> Labor/Hr (LKR)
                          </span>
                        </th>
                        <th className="py-2.5 px-3 w-36 text-right">
                          <span className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400" title="Standard machine hourly rate is locked">
                            <Lock size={10} /> Machine/Hr (LKR)
                          </span>
                        </th>
                        <th className="py-2.5 px-3 w-32 text-right">Total Cost</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {currentPart.machiningOps.map((op, oIdx) => {
                        const opCost = calcOpCost(op);
                        return (
                          <tr key={op.id || oIdx} className="hover:bg-surface2/30 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-muted">{oIdx + 1}</td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                value={op.procName}
                                onChange={e => handleUpdateOp(oIdx, 'procName', e.target.value)}
                                placeholder="e.g. CNC Lathe Turning, Cylindrical Grinding..."
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary rounded-none"
                              />
                            </td>
                            {/* CYCLE TIME (EDITABLE) */}
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={op.estHr !== undefined ? op.estHr : op.quoHr}
                                onChange={e => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  handleUpdateOp(oIdx, 'estHr', val);
                                  handleUpdateOp(oIdx, 'quoHr', val);
                                }}
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary rounded-none"
                              />
                            </td>
                            {/* SETUP TIME (EDITABLE) */}
                            <td className="py-1 px-3">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={op.setTime || 0}
                                onChange={e => handleUpdateOp(oIdx, 'setTime', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono text-secondary rounded-none"
                              />
                            </td>
                            {/* LOCKED LABOR RATE */}
                            <td className="py-1 px-3">
                              <div 
                                className="px-2.5 py-1 text-xs bg-surface2/60 border border-theme-subtle text-right font-mono font-semibold text-muted flex items-center justify-end gap-1 cursor-not-allowed select-none"
                                title="Standard shop labor hourly rate is locked"
                              >
                                <Lock size={10} className="text-amber-500/70" />
                                <span>{formatCurrency(Number(op.hrRate || 750))}</span>
                              </div>
                            </td>
                            {/* LOCKED MACHINE RATE */}
                            <td className="py-1 px-3">
                              <div 
                                className="px-2.5 py-1 text-xs bg-surface2/60 border border-theme-subtle text-right font-mono font-semibold text-muted flex items-center justify-end gap-1 cursor-not-allowed select-none"
                                title="Standard machine hour rate is locked"
                              >
                                <Lock size={10} className="text-amber-500/70" />
                                <span>{formatCurrency(Number(op.machineRate || 1200))}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {formatCurrency(opCost)}
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button
                                onClick={() => handleDeleteOp(oIdx)}
                                className="text-muted hover:text-red-500 p-1 transition-colors"
                                title="Delete operation row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PART COST SUMMARY TILE */}
            <div className="p-4 bg-surface2/50 border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Materials Subtotal</span>
                  <span className="font-mono font-bold text-primary text-sm">{formatCurrency(activePartBreakdown.partMatCost)}</span>
                </div>
                <div className="h-6 w-px bg-theme-subtle" />
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Machining Subtotal</span>
                  <span className="font-mono font-bold text-primary text-sm">{formatCurrency(activePartBreakdown.partMachLaborCost)}</span>
                </div>
                <div className="h-6 w-px bg-theme-subtle" />
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Planned Hours</span>
                  <span className="font-mono font-bold text-secondary text-sm">{activePartBreakdown.partHours.toFixed(1)} hrs</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted uppercase font-bold block">Part #{activePartIdx + 1} Internal Cost</span>
                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activePartBreakdown.partTotal)}
                </span>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── 3. BOTTOM COMMAND BAR: LIVE INTERNAL JOB COSTING ENGINE ──────────── */}
      <footer className="bg-surface2 border-t border-theme-subtle px-4 sm:px-6 py-2.5 shrink-0 z-20 space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Live KPI metrics */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs overflow-x-auto pb-1 lg:pb-0">
            <div>
              <span className="text-[9.5px] text-muted uppercase font-bold block">1. Total Materials</span>
              <strong className="text-primary font-mono text-sm block">
                {formatCurrency(totals.grandMatCost)}
              </strong>
            </div>

            <div className="h-6 w-px bg-theme-subtle shrink-0" />

            <div>
              <span className="text-[9.5px] text-muted uppercase font-bold block">2. Machining ({totals.grandQuotedHours.toFixed(1)}h)</span>
              <strong className="text-primary font-mono text-sm block">
                {formatCurrency(totals.grandMachLaborCost)}
              </strong>
            </div>

            <div className="h-6 w-px bg-theme-subtle shrink-0" />

            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9.5px] text-muted uppercase font-bold block">3. Factory Overhead</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overheadPct}
                  onChange={e => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-10 px-1 py-0 text-[10px] font-mono text-right bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-bold"
                />
                <span className="text-[10px] text-muted">%</span>
              </div>
              <strong className="text-secondary font-mono text-sm block">
                {formatCurrency(totals.overheadCost)}
              </strong>
            </div>

            <div className="h-6 w-px bg-theme-subtle shrink-0" />

            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 flex items-center gap-3">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                  New Target Internal Budget
                </span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-base font-black">
                  {formatCurrency(totals.totalEstimatedCost)}
                </strong>
              </div>
              {totals.variance !== 0 && (
                <span className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 ${
                  totals.variance > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {totals.variance > 0 ? `+${formatCurrency(totals.variance)}` : formatCurrency(totals.variance)}
                </span>
              )}
            </div>
          </div>

          {/* Sync Routing Toggle & Action Buttons */}
          <div className="flex items-center gap-3 justify-end flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-secondary mr-2">
              <input
                type="checkbox"
                checked={syncRouting}
                onChange={e => setSyncRouting(e.target.checked)}
                className="rounded-none border-theme-subtle text-primary focus:ring-0"
              />
              <span className="text-[11px] font-medium">Sync with Shop Operations Routing</span>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="text-xs border-theme-subtle h-8 px-3 rounded-none"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAndRecalculate}
              disabled={saving}
              className="text-xs flex items-center gap-1.5 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 rounded-none"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Recalculating...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Apply & Recalculate Work Order</span>
                </>
              )}
            </Button>
          </div>

        </div>
      </footer>

    </div>
  ,
    document.body
  );
};
