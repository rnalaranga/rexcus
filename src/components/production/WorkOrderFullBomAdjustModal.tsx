import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Layers, Wrench, Package, DollarSign, Clock, 
  Sparkles, Check, AlertCircle, RefreshCw, Calculator, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { adjustWorkOrderFullBom } from '@/lib/api';

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

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const initialOverhead = Number(workOrder?.overheadPct !== undefined && workOrder?.overheadPct !== null ? workOrder.overheadPct : 15);
    setOverheadPct(initialOverhead);
    setErrorMsg(null);

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

  // Part Management (Add New Part / Delete Part)
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

      // Enrich parts with calculated totals
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[95vh] flex flex-col bg-surface border border-theme-subtle shadow-2xl rounded-none overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface2/80 border-b border-theme-subtle shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 bg-primary/10 text-primary border border-primary/20">
                <Calculator size={18} />
              </span>
              <h3 className="text-base font-bold text-primary">
                Adjust Work Order BOM & Internal Job Costing
              </h3>
              <Badge variant="outline" className="font-mono text-xs font-bold border-theme-subtle">
                WO: {workOrder?.orderNo || workOrder?.id}
              </Badge>
              {workOrder?.customer && (
                <span className="text-xs text-muted font-medium">
                  Client: {workOrder.customer}
                </span>
              )}
            </div>
            <p className="text-xs text-secondary">
              Modify raw materials, bought-out components, and machining cycle times. Internal Job Costing will dynamically recalculate in real time.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded-none"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ERROR NOTIFICATION IF ANY */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MULTI-PART BOM NAVIGATION TABS */}
        <div className="px-6 pt-3 pb-0 bg-surface border-b border-theme-subtle flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {parts.map((p, pIdx) => {
              const isActive = pIdx === activePartIdx;
              const breakdown = totals.partsBreakdown[pIdx];
              return (
                <div
                  key={p.partId || pIdx}
                  onClick={() => setActivePartIdx(pIdx)}
                  className={`cursor-pointer px-3.5 py-2 text-xs font-medium border transition-all flex items-center gap-2 select-none whitespace-nowrap ${
                    isActive
                      ? 'bg-surface2 border-primary text-primary font-bold shadow-xs'
                      : 'bg-surface border-theme-subtle text-secondary hover:bg-surface2/50'
                  }`}
                >
                  <span className="font-mono text-[11px] px-1.5 py-0.2 bg-surface border border-theme-subtle">
                    Part {pIdx + 1}
                  </span>
                  <span className="truncate max-w-[140px]">{p.title || `Part ${pIdx + 1}`}</span>
                  {breakdown && (
                    <span className="font-mono text-[10px] text-muted">
                      {formatCurrency(breakdown.partTotal)}
                    </span>
                  )}
                  {parts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePart(pIdx);
                      }}
                      className="text-muted hover:text-red-500 ml-1 p-0.5"
                      title="Delete part"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={handleAddNewPart}
              className="px-3 py-2 text-xs text-primary border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-1 whitespace-nowrap"
            >
              <Plus size={13} />
              <span>Add Part / BOM</span>
            </button>
          </div>

          <div className="text-right text-xs font-mono pb-2 hidden sm:block shrink-0">
            <span className="text-muted">Total Parts: </span>
            <strong className="text-primary">{parts.length}</strong>
          </div>
        </div>

        {/* MODAL MAIN CONTENT BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentPart && (
            <>
              {/* PART METADATA CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface2/40 p-4 border border-theme-subtle">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Part Name / Title</label>
                  <input
                    type="text"
                    value={currentPart.title}
                    onChange={e => updatePartField('title', e.target.value)}
                    placeholder="e.g. Flange Pin, Spline Shaft, Bushing..."
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Part Number</label>
                  <input
                    type="text"
                    value={currentPart.partNo || ''}
                    onChange={e => updatePartField('partNo', e.target.value)}
                    placeholder="e.g. PN-0491"
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted uppercase">Drawing No (Dwg)</label>
                  <input
                    type="text"
                    value={currentPart.drawingNo || ''}
                    onChange={e => updatePartField('drawingNo', e.target.value)}
                    placeholder="e.g. DWG-REX-110"
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-primary"
                  />
                </div>
              </div>

              {/* 1. RAW MATERIALS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-primary" />
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      1. Raw Materials ({currentPart.autoMats.length})
                    </h4>
                    <span className="text-[11px] text-muted">
                      (Bars, Plates, Shafts, Castings, Tubes)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddAutoMat}
                    className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary"
                  >
                    <Plus size={13} />
                    <span>Add Material Row</span>
                  </Button>
                </div>

                {currentPart.autoMats.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-theme-subtle text-xs text-muted">
                    No raw materials entered for this part. Click "Add Material Row" to allocate stock.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-theme-subtle">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Material Grade / Name</th>
                          <th className="py-2 px-3">Dimensions / Spec</th>
                          <th className="py-2 px-3 w-28">Profile</th>
                          <th className="py-2 px-3 w-20 text-right">Qty</th>
                          <th className="py-2 px-3 w-20">Unit</th>
                          <th className="py-2 px-3 w-28 text-right">Unit Price (LKR)</th>
                          <th className="py-2 px-3 w-28 text-right">Subtotal</th>
                          <th className="py-2 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-subtle">
                        {currentPart.autoMats.map((mat, mIdx) => {
                          const subtotal = Number(mat.qty || 0) * Number(mat.unitPrice || 0);
                          return (
                            <tr key={mat.id || mIdx} className="hover:bg-surface2/30 transition-colors">
                              <td className="py-2 px-3 font-mono text-[11px] text-muted">{mIdx + 1}</td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.material}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'material', e.target.value)}
                                  placeholder="e.g. EN8, SS304, MS, Aluminum..."
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.spec || ''}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'spec', e.target.value)}
                                  placeholder="e.g. Ø50mm x 250mm, Thick: 12mm"
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary font-mono"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <select
                                  value={mat.profile || 'Round Bar'}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'profile', e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary"
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
                                  value={mat.qty}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.unit}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'unit', e.target.value)}
                                  placeholder="pcs/kg"
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-secondary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="any"
                                  value={mat.unitPrice}
                                  onChange={e => handleUpdateAutoMat(mIdx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-medium text-primary"
                                />
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

              {/* 2. BOUGHT-OUT COMPONENTS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-secondary" />
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      2. Bought-Out Components & Hardware ({currentPart.manualMats.length})
                    </h4>
                    <span className="text-[11px] text-muted">
                      (Fasteners, Bearings, Seals, O-Rings, Hardware)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddManualMat}
                    className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary"
                  >
                    <Plus size={13} />
                    <span>Add Bought-Out Item</span>
                  </Button>
                </div>

                {currentPart.manualMats.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-theme-subtle text-xs text-muted">
                    No bought-out components entered. Click "Add Bought-Out Item" to add standard hardware.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-theme-subtle">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Item / Component Name</th>
                          <th className="py-2 px-3">Specification / Supplier</th>
                          <th className="py-2 px-3 w-20 text-right">Qty</th>
                          <th className="py-2 px-3 w-20">Unit</th>
                          <th className="py-2 px-3 w-28 text-right">Unit Price (LKR)</th>
                          <th className="py-2 px-3 w-28 text-right">Subtotal</th>
                          <th className="py-2 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-subtle">
                        {currentPart.manualMats.map((mat, mIdx) => {
                          const subtotal = Number(mat.qty || 0) * Number(mat.unitPrice || 0);
                          return (
                            <tr key={mat.id || mIdx} className="hover:bg-surface2/30 transition-colors">
                              <td className="py-2 px-3 font-mono text-[11px] text-muted">{mIdx + 1}</td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.material}
                                  onChange={e => handleUpdateManualMat(mIdx, 'material', e.target.value)}
                                  placeholder="e.g. M12x45 Bolt, SKF 6205 Bearing, Oil Seal..."
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.spec || ''}
                                  onChange={e => handleUpdateManualMat(mIdx, 'spec', e.target.value)}
                                  placeholder="e.g. Grade 8.8, Supplier XYZ, Standard"
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-secondary font-mono"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="any"
                                  value={mat.qty}
                                  onChange={e => handleUpdateManualMat(mIdx, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="text"
                                  value={mat.unit}
                                  onChange={e => handleUpdateManualMat(mIdx, 'unit', e.target.value)}
                                  placeholder="pcs/sets"
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-mono text-secondary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="any"
                                  value={mat.unitPrice}
                                  onChange={e => handleUpdateManualMat(mIdx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-medium text-primary"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                                {formatCurrency(subtotal)}
                              </td>
                              <td className="py-1 px-3 text-center">
                                <button
                                  onClick={() => handleDeleteManualMat(mIdx)}
                                  className="text-muted hover:text-red-500 p-1 transition-colors"
                                  title="Delete component row"
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

              {/* 3. MACHINING OPERATIONS & ROUTING SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-primary" />
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                      3. Machining Operations & Cycle Times ({currentPart.machiningOps.length})
                    </h4>
                    <span className="text-[11px] text-muted">
                      (Turning, Milling, Grinding, EDM, Boring, Bench Fitting)
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddOp}
                    className="text-xs h-7 px-2.5 flex items-center gap-1 border-theme-subtle text-primary"
                  >
                    <Plus size={13} />
                    <span>Add Operation Row</span>
                  </Button>
                </div>

                {currentPart.machiningOps.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-theme-subtle text-xs text-muted">
                    No machining operations specified. Click "Add Operation Row" to configure workshop routing steps.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-theme-subtle">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold">
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Operation / Process Name</th>
                          <th className="py-2 px-3 w-24 text-right">Planned (hrs)</th>
                          <th className="py-2 px-3 w-20 text-right">Setup (hrs)</th>
                          <th className="py-2 px-3 w-28 text-right">Labor Rate (LKR)</th>
                          <th className="py-2 px-3 w-28 text-right">Mach Rate (LKR)</th>
                          <th className="py-2 px-3 w-32 text-right">Op Cost</th>
                          <th className="py-2 px-3 w-10 text-center"></th>
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
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-medium text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={op.estHr !== undefined ? op.estHr : op.quoHr}
                                  onChange={e => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    handleUpdateOp(oIdx, 'estHr', val);
                                    handleUpdateOp(oIdx, 'quoHr', val);
                                  }}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono font-bold text-primary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={op.setTime || 0}
                                  onChange={e => handleUpdateOp(oIdx, 'setTime', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono text-secondary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="50"
                                  value={op.hrRate}
                                  onChange={e => handleUpdateOp(oIdx, 'hrRate', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono text-secondary"
                                />
                              </td>
                              <td className="py-1 px-3">
                                <input
                                  type="number"
                                  step="50"
                                  value={op.machineRate}
                                  onChange={e => handleUpdateOp(oIdx, 'machineRate', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-2 py-1 text-xs bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden text-right font-mono text-secondary"
                                />
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
            </>
          )}
        </div>

        {/* MODAL FOOTER: DYNAMIC INTERNAL JOB COSTING ENGINE */}
        <div className="px-6 py-4 bg-surface2/90 border-t border-theme-subtle shrink-0 space-y-3">
          {/* LIVE SUMMARY TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-surface border border-theme-subtle text-xs">
            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">1. Total Materials</span>
              <strong className="text-primary font-mono text-sm block">
                {formatCurrency(totals.grandMatCost)}
              </strong>
            </div>

            <div>
              <span className="text-[10px] text-muted uppercase font-bold block">2. Machining & Labor</span>
              <strong className="text-primary font-mono text-sm block">
                {formatCurrency(totals.grandMachLaborCost)}
              </strong>
              <span className="text-[10px] text-muted font-mono">{totals.grandQuotedHours.toFixed(1)} hrs</span>
            </div>

            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted uppercase font-bold block">3. Overhead</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overheadPct}
                  onChange={e => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-12 px-1 text-[11px] font-mono text-right bg-surface border border-theme-subtle focus:border-primary focus:outline-hidden font-bold"
                />
                <span className="text-[10px] text-muted">%</span>
              </div>
              <strong className="text-secondary font-mono text-sm block">
                {formatCurrency(totals.overheadCost)}
              </strong>
            </div>

            <div className="col-span-2 sm:col-span-2 bg-emerald-500/10 border border-emerald-500/30 p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">
                  New Recalculated Target Budget
                </span>
                {totals.variance !== 0 && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none ${
                    totals.variance > 0 ? 'bg-amber-500/20 text-amber-700' : 'bg-emerald-500/20 text-emerald-700'
                  }`}>
                    {totals.variance > 0 ? `+${formatCurrency(totals.variance)}` : formatCurrency(totals.variance)}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-bold">
                  {formatCurrency(totals.totalEstimatedCost)}
                </strong>
                <span className="text-[11px] text-muted font-mono">
                  Prev: {formatCurrency(totals.prevEstimated)}
                </span>
              </div>
            </div>
          </div>

          {/* SYNC ROUTING CHECKBOX & ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-secondary">
              <input
                type="checkbox"
                checked={syncRouting}
                onChange={e => setSyncRouting(e.target.checked)}
                className="rounded-none border-theme-subtle text-primary focus:ring-0"
              />
              <span>
                Sync updated machining operations into Shop Floor Routing table (<code className="text-[10px]">work_order_operations</code>)
              </span>
            </label>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="text-xs border-theme-subtle"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndRecalculate}
                disabled={saving}
                className="text-xs flex items-center gap-1.5 font-bold shadow-sm"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Recalculating & Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Adjusted BOM & Recalculate Job Costing</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
