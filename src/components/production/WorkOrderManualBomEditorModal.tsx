import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Wrench,
  Package,
  History,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  Copy,
  GitBranch,
  Hammer,
  Sparkles,
} from 'lucide-react';
import { fetchInventory, adjustWorkOrderFullBom } from '@/lib/api';
import { useMachiningOperations } from '@/hooks/useData';
import { formatCurrency } from '@/lib/utils';

interface WorkOrderManualBomEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  initialBoms: any[];
  linkedQuote?: any;
  machineries?: any[];
  onSuccess: () => void;
}

export interface WoBomMaterial {
  id: string;
  matNumber: string; // e.g., "Mat #1", "Mat #2"
  itemId: string;
  material: string;
  spec: string;
  profile: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface WoBomPart {
  partId: string | number;
  partName: string;
  description?: string;
  drawingNo?: string;
  partNo?: string;
  qty: number;
  materials: WoBomMaterial[];
}

export interface WoRouteStep {
  id: string;
  stepNo: number;
  partIndex: number;
  materialRefs: string[]; // e.g. ["Mat #1", "Mat #2", "Step 1 Part"]
  pieceNote: string; // e.g. "1 කෑල්ලක් (100mm)" or "තව කෑල්ලක්"
  processName: string; // e.g. "Lathe", "Milling", "Welding"
  machineId: string;
  durationValue: number; // e.g. 15
  durationUnit: 'mins' | 'hrs';
  hourlyRate: number;
  instruction: string; // e.g. "Turning & Facing", "Weld assembly"
  matchedOpId?: string;
}

const DEFAULT_PROCESS_OPTIONS = [
  'Cutting / Band Saw',
  'Lathe',
  'CNC Lathe / Turning',
  'Milling',
  'CNC Milling',
  'Drilling',
  'Boring',
  'Grinding',
  'Slotting / Keyway',
  'Welding (MIG / TIG / Arc)',
  'Bending / Pressing',
  'Heat Treatment',
  'Fitting & Assembly',
  'Surface Finish / Painting',
  'QC Inspection',
];

export const WorkOrderManualBomEditorModal: React.FC<WorkOrderManualBomEditorModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  initialBoms,
  linkedQuote,
  machineries = [],
  onSuccess,
}) => {
  const [activeStepTab, setActiveStepTab] = useState<'bom' | 'routes'>('bom');
  const [inventory, setInventory] = useState<any[]>([]);
  const [parts, setParts] = useState<WoBomPart[]>([]);
  const [QuotedParts, setQuotedParts] = useState<WoBomPart[]>([]);
  const [routes, setRoutes] = useState<WoRouteStep[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: rawOperations } = useMachiningOperations();

  // Merge standard shop processes with configured machining operations
  const processCatalog = useMemo(() => {
    const map = new Map<string, number>();
    DEFAULT_PROCESS_OPTIONS.forEach((name) => map.set(name, 1500));
    if (Array.isArray(rawOperations)) {
      rawOperations.forEach((op: any) => {
        if (op?.name) {
          map.set(op.name, Number(op.hrRate || op.rate || 1500));
        }
      });
    }
    return Array.from(map.entries()).map(([name, rate]) => ({ name, rate }));
  }, [rawOperations]);

  // Helper to parse Quoted BOM strictly from linkedQuote or workOrder.originalBomSnapshot
  const extractQuotedBomParts = (): WoBomPart[] => {
    // 1. Try linkedQuote.data.boms first
    if (linkedQuote) {
      const qData =
        typeof linkedQuote.data === 'string'
          ? (() => {
              try {
                return JSON.parse(linkedQuote.data);
              } catch {
                return {};
              }
            })()
          : linkedQuote.data || {};

      if (Array.isArray(qData.boms) && qData.boms.length > 0) {
        let qMatCounter = 1;
        return qData.boms.map((b: any, bIdx: number) => {
          const autoMats = (b.autoMats || []).map((m: any, mIdx: number) => {
            const spec = [
              m.dia ? `Ø${m.dia}mm` : '',
              m.thick ? `Thick: ${m.thick}mm` : '',
              m.width ? `W: ${m.width}mm` : '',
              m.length ? `L: ${m.length}mm` : '',
            ]
              .filter(Boolean)
              .join(' | ');
            const qty = Number(m.qty || 1);
            const unitPrice = Number(m.unitPrice || 0);
            const total = Number(m.shaftPrice || m.platePrice || qty * unitPrice);
            const derivedUnitCost = qty > 0 && total > 0 ? total / qty : unitPrice;
            const matNum = `Mat #${qMatCounter++}`;
            return {
              id: m.id || `q-auto-${bIdx}-${mIdx}`,
              matNumber: matNum,
              itemId: m.inventoryId || m.itemId || '',
              material: m.material || 'Raw Stock',
              spec: m.spec || spec,
              profile: m.dia ? 'Round Bar' : m.thick ? 'Plate / Sheet' : 'Raw Stock',
              qty,
              unit: m.unit || (m.dia ? 'rods' : m.thick ? 'plates' : 'pcs'),
              unitCost: Number(derivedUnitCost.toFixed(2)),
            };
          });

          const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => {
            const matNum = `Mat #${qMatCounter++}`;
            return {
              id: m.id || `q-man-${bIdx}-${mIdx}`,
              matNumber: matNum,
              itemId: m.inventoryId || m.itemId || '',
              material: m.material || 'Bought-out Item',
              spec: m.spec || (m.supplier ? `Supplier: ${m.supplier}` : ''),
              profile: 'Bought-out',
              qty: Number(m.qty || 1),
              unit: m.unit || 'pcs',
              unitCost: Number(m.unitPrice || m.unitCost || 0),
            };
          });

          return {
            partId: b.id || bIdx + 1,
            partName: b.title || `Part ${bIdx + 1}`,
            description: b.description || '',
            drawingNo: b.drawingNo || '',
            partNo: b.partNo || '',
            qty: Number(b.qty || 1),
            materials: [...autoMats, ...manualMats],
          };
        });
      }
    }

    // 2. Fallback to workOrder.originalBomSnapshot if present
    if (workOrder?.originalBomSnapshot) {
      try {
        const snap =
          typeof workOrder.originalBomSnapshot === 'string'
            ? JSON.parse(workOrder.originalBomSnapshot)
            : workOrder.originalBomSnapshot;
        if (Array.isArray(snap) && snap.length > 0) {
          let sCounter = 1;
          return snap.map((b: any, bIdx: number) => {
            const rawMats = b.allMaterials || [...(b.autoMats || []), ...(b.manualMats || []), ...(b.materials || [])];
            return {
              partId: b.partId || b.id || bIdx + 1,
              partName: b.title || b.partName || `Part ${bIdx + 1}`,
              description: b.description || '',
              qty: Number(b.qty || 1),
              materials: rawMats.map((m: any, mIdx: number) => ({
                id: m.id || `snap-${bIdx}-${mIdx}`,
                matNumber: `Mat #${sCounter++}`,
                itemId: m.inventoryId || m.itemId || '',
                material: m.material || m.name || 'Material',
                spec: m.spec || m.notes || '',
                profile: m.profile || 'Raw Stock',
                qty: Number(m.qty || 1),
                unit: m.unit || 'pcs',
                unitCost: Number(m.unitPrice ?? m.unitCost ?? 0),
              })),
            };
          });
        }
      } catch {
        // ignore parse errors
      }
    }

    // 3. Fallback to initialBoms passed from parent
    let iCounter = 1;
    return (initialBoms && initialBoms.length > 0
      ? initialBoms
      : [{ title: workOrder?.productName || workOrder?.title || 'Main Assembly', qty: workOrder?.jobQty || 1 }]
    ).map((b: any, bIdx: number) => {
      const rawMats = b.allMaterials || [...(b.autoMats || []), ...(b.manualMats || []), ...(b.materials || [])];
      return {
        partId: b.partId || b.id || bIdx + 1,
        partName: b.title || b.partName || `Part ${bIdx + 1}`,
        description: b.description || '',
        qty: Number(b.qty || 1),
        materials: rawMats.map((m: any, mIdx: number) => ({
          id: m.id || `init-q-${bIdx}-${mIdx}`,
          matNumber: `Mat #${iCounter++}`,
          itemId: m.inventoryId || m.itemId || '',
          material: m.material || m.name || '',
          spec: m.spec || '',
          profile: m.profile || 'Raw Stock',
          qty: Number(m.qty || 1),
          unit: m.unit || 'pcs',
          unitCost: Number(m.unitPrice ?? m.unitCost ?? 0),
        })),
      };
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveStepTab('bom');

    fetchInventory()
      .then((res: any) => setInventory(Array.isArray(res) ? res : []))
      .catch(() => {});

    // 1. Set Quoted BOM Reference (Left Column)
    const quoted = extractQuotedBomParts();
    setQuotedParts(quoted);

    // 2. Set Editable Work Order BOM (Right Column)
    const sourceBoms =
      initialBoms && initialBoms.length > 0
        ? initialBoms
        : quoted.length > 0
        ? quoted
        : [{ title: workOrder?.productName || workOrder?.title || 'Main Assembly', qty: workOrder?.jobQty || 1 }];

    let matCounter = 1;
    const normalizedParts: WoBomPart[] = sourceBoms.map((b: any, bIdx: number) => {
      const rawMats = b.allMaterials || [...(b.autoMats || []), ...(b.manualMats || []), ...(b.materials || [])];
      const mats: WoBomMaterial[] = rawMats.map((m: any, mIdx: number) => {
        const assignedNum = `Mat #${matCounter++}`;
        return {
          id: m.id || `wo-mat-${bIdx}-${mIdx}`,
          matNumber: assignedNum,
          itemId: m.inventoryId || m.itemId || m.invMatch?.id || '',
          material: m.material || m.name || '',
          spec: m.spec || m.notes || '',
          profile: m.profile || 'Raw Stock',
          qty: Number(m.qty || m.quantity || 1),
          unit: m.unit || 'pcs',
          unitCost: Number(m.unitPrice ?? m.unitCost ?? m.cost ?? 0),
        };
      });

      return {
        partId: b.partId || b.id || bIdx + 1,
        partName: b.title || b.partName || workOrder?.title || `Part ${bIdx + 1}`,
        description: b.description || '',
        drawingNo: b.drawingNo || '',
        partNo: b.partNo || '',
        qty: Number(b.qty || b.quantity || 1),
        materials:
          mats.length > 0
            ? mats
            : [
                {
                  id: `wo-mat-${bIdx}-0`,
                  matNumber: `Mat #${matCounter++}`,
                  itemId: '',
                  material: '',
                  spec: '',
                  profile: 'Raw Stock',
                  qty: 1,
                  unit: 'pcs',
                  unitCost: 0,
                },
              ],
      };
    });

    setParts(normalizedParts);

    // 3. Extract existing Production Routes from initialBoms.machiningOps or workOrder.operations
    const extractedRoutes: WoRouteStep[] = [];
    let stepCounter = 1;

    sourceBoms.forEach((b: any, bIdx: number) => {
      const ops = b.machiningOps || b.operations || [];
      ops.forEach((op: any) => {
        const hrs = Number(op.estHr || op.quoHr || op.plannedHours || 0.25);
        const hasSavedDuration = op.durationValue !== undefined && op.durationUnit !== undefined;
        const isSubHour = hrs > 0 && hrs < 1;
        const durationUnit: 'mins' | 'hrs' = hasSavedDuration
          ? op.durationUnit
          : isSubHour
          ? 'mins'
          : 'mins';
        const durationValue = hasSavedDuration
          ? Number(op.durationValue)
          : Math.max(1, Math.round(hrs * 60));

        const defaultMatRef =
          Array.isArray(op.materialRefs) && op.materialRefs.length > 0
            ? op.materialRefs
            : normalizedParts[bIdx]?.materials?.[0]?.matNumber
            ? [normalizedParts[bIdx].materials[0].matNumber]
            : ['Mat #1'];

        extractedRoutes.push({
          id: op.id || `route-${bIdx}-${stepCounter}`,
          stepNo: stepCounter++,
          partIndex: bIdx,
          materialRefs: defaultMatRef,
          pieceNote: op.pieceNote || op.pieceDetails || '',
          processName: op.procName || op.operationName || 'Lathe',
          machineId: op.machineId || op.matchedOp?.machineId || '',
          durationValue,
          durationUnit,
          hourlyRate: Number(op.hrRate || op.hourlyRate || 1500),
          instruction: op.instruction || '',
          matchedOpId: op.matchedOp?.id || op.matchedOpId || undefined,
        });
      });
    });

    if (extractedRoutes.length === 0 && Array.isArray(workOrder?.operations) && workOrder.operations.length > 0) {
      workOrder.operations.forEach((op: any, idx: number) => {
        const hrs = Number(op.plannedHours || 0.25);
        extractedRoutes.push({
          id: op.id || `route-wo-${idx + 1}`,
          stepNo: idx + 1,
          partIndex: 0,
          materialRefs: ['Mat #1'],
          pieceNote: '',
          processName: op.operationName || 'Lathe',
          machineId: op.machineId || '',
          durationValue: Math.max(1, Math.round(hrs * 60)),
          durationUnit: 'mins',
          hourlyRate: Number(op.hourlyLaborRate || 750) + Number(op.hourlyMachineRate || 1200),
          instruction: op.notes || '',
          matchedOpId: op.id,
        });
      });
    }

    if (extractedRoutes.length === 0) {
      extractedRoutes.push({
        id: `route-init-1`,
        stepNo: 1,
        partIndex: 0,
        materialRefs: ['Mat #1'],
        pieceNote: '1 pc / cut piece',
        processName: 'Lathe',
        machineId: '',
        durationValue: 15,
        durationUnit: 'mins',
        hourlyRate: 1500,
        instruction: '',
      });
    }

    setRoutes(extractedRoutes);
  }, [isOpen, initialBoms, workOrder, linkedQuote]);

  // Flat list of all numbered materials in the Work Order BOM (auto-renumbered Mat #1, Mat #2, ...)
  const numberedMaterials = useMemo(() => {
    const list: (WoBomMaterial & { partIndex: number; matIndex: number; partName: string })[] = [];
    let counter = 1;
    parts.forEach((p, pIdx) => {
      p.materials.forEach((m, mIdx) => {
        list.push({
          ...m,
          matNumber: `Mat #${counter++}`,
          partIndex: pIdx,
          matIndex: mIdx,
          partName: p.partName,
        });
      });
    });
    return list;
  }, [parts]);

  // Helper to get the live Mat # label for a given (pIdx, mIdx)
  const getMatNumber = (pIdx: number, mIdx: number): string => {
    const found = numberedMaterials.find((x) => x.partIndex === pIdx && x.matIndex === mIdx);
    return found ? found.matNumber : `Mat #${mIdx + 1}`;
  };

  // Copy Quoted BOM into Work Order BOM
  const handleCopyFromQuotedBom = () => {
    if (QuotedParts.length === 0) return;
    setParts(JSON.parse(JSON.stringify(QuotedParts)));
  };

  const updatePartField = (pIdx: number, field: keyof WoBomPart, val: any) => {
    setParts((prev) => prev.map((p, i) => (i === pIdx ? { ...p, [field]: val } : p)));
  };

  const handleMaterialChange = (pIdx: number, mIdx: number, field: keyof WoBomMaterial, value: any) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const nextMats = [...p.materials];
        nextMats[mIdx] = { ...nextMats[mIdx], [field]: value };

        if (field === 'itemId' && value) {
          const inv = inventory.find((x) => String(x.id) === String(value));
          if (inv) {
            nextMats[mIdx].material = inv.name;
            nextMats[mIdx].unit = inv.unit || 'pcs';
            nextMats[mIdx].unitCost = Number(inv.costPrice || inv.unitCost || inv.price || 0);
            if (!nextMats[mIdx].spec && inv.sku) {
              nextMats[mIdx].spec = inv.sku;
            }
          }
        }
        return { ...p, materials: nextMats };
      })
    );
  };

  const addMaterialRow = (pIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          materials: [
            ...p.materials,
            {
              id: `wo-mat-${pIdx}-${Date.now()}`,
              matNumber: `Mat #${numberedMaterials.length + 1}`,
              itemId: '',
              material: '',
              spec: '',
              profile: 'Raw Stock',
              qty: 1,
              unit: 'pcs',
              unitCost: 0,
            },
          ],
        };
      })
    );
  };

  const removeMaterialRow = (pIdx: number, mIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          materials: p.materials.filter((_, idx) => idx !== mIdx),
        };
      })
    );
  };

  // Route Step Handlers
  const addRouteStep = () => {
    const nextStepNo = routes.length + 1;
    const defaultRef =
      numberedMaterials.length > 1 && nextStepNo <= numberedMaterials.length
        ? [numberedMaterials[nextStepNo - 1].matNumber]
        : numberedMaterials[0]
        ? [numberedMaterials[0].matNumber]
        : ['Mat #1'];

    setRoutes((prev) => [
      ...prev,
      {
        id: `route-${Date.now()}-${nextStepNo}`,
        stepNo: nextStepNo,
        partIndex: 0,
        materialRefs: defaultRef,
        pieceNote: '',
        processName: nextStepNo === 2 ? 'Milling' : nextStepNo >= 3 ? 'Welding (MIG / TIG / Arc)' : 'Lathe',
        machineId: '',
        durationValue: 15,
        durationUnit: 'mins',
        hourlyRate: 1500,
        instruction: '',
      },
    ]);
  };

  const updateRouteStep = (rIdx: number, field: keyof WoRouteStep, value: any) => {
    setRoutes((prev) =>
      prev.map((r, i) => {
        if (i !== rIdx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'processName') {
          const foundProc = processCatalog.find((p) => p.name.toLowerCase() === String(value).toLowerCase());
          if (foundProc) {
            updated.hourlyRate = foundProc.rate;
          }
        }
        return updated;
      })
    );
  };

  const toggleRouteMaterialRef = (rIdx: number, refLabel: string) => {
    setRoutes((prev) =>
      prev.map((r, i) => {
        if (i !== rIdx) return r;
        const exists = r.materialRefs.includes(refLabel);
        const nextRefs = exists
          ? r.materialRefs.filter((x) => x !== refLabel)
          : [...r.materialRefs, refLabel];
        return { ...r, materialRefs: nextRefs };
      })
    );
  };

  const moveRouteStep = (rIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? rIdx - 1 : rIdx + 1;
    if (targetIdx < 0 || targetIdx >= routes.length) return;
    setRoutes((prev) => {
      const copy = [...prev];
      const temp = copy[rIdx];
      copy[rIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((step, idx) => ({ ...step, stepNo: idx + 1 }));
    });
  };

  const removeRouteStep = (rIdx: number) => {
    setRoutes((prev) =>
      prev
        .filter((_, i) => i !== rIdx)
        .map((step, idx) => ({ ...step, stepNo: idx + 1 }))
    );
  };

  const getStepHours = (step: WoRouteStep): number => {
    const val = Number(step.durationValue || 0);
    return step.durationUnit === 'mins' ? Number((val / 60).toFixed(4)) : val;
  };

  // Totals
  const quotedTotalMatCost = QuotedParts.reduce(
    (sum, p) => sum + p.materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0),
    0
  );

  const totalMatCost = parts.reduce(
    (sum, p) => sum + p.materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0),
    0
  );

  const totalRouteHours = routes.reduce((sum, r) => sum + getStepHours(r), 0);
  const totalRouteMins = routes.reduce(
    (sum, r) => sum + (r.durationUnit === 'mins' ? Number(r.durationValue || 0) : Number(r.durationValue || 0) * 60),
    0
  );
  const totalRouteCost = routes.reduce((sum, r) => sum + getStepHours(r) * Number(r.hourlyRate || 1500), 0);

  // Save & Sync Both Work Order BOM and Routes
  const handleSubmit = async () => {
    setSaving(true);
    try {
      let runningMatNum = 1;

      const formattedBoms = parts.map((p, pIdx) => {
        const validMats = p.materials.filter((m) => (m.material && m.material.trim()) || m.itemId);
        const autoMats: any[] = [];
        const manualMats: any[] = [];

        validMats.forEach((m, mIdx) => {
          const matNumber = `Mat #${runningMatNum++}`;
          const matObj = {
            id: m.id || `auto-${pIdx}-${mIdx}`,
            matNumber,
            inventoryId: m.itemId || undefined,
            material: m.material || 'Raw Material',
            spec: m.spec ? `[${matNumber}] ${m.spec}` : `[${matNumber}]`,
            rawSpec: m.spec || '',
            profile: m.profile || 'Raw Stock',
            qty: Number(m.qty) || 1,
            unit: m.unit || 'pcs',
            unitPrice: Number(m.unitCost) || 0,
            unitCost: Number(m.unitCost) || 0,
            totalPrice: (Number(m.qty) || 1) * (Number(m.unitCost) || 0),
          };
          if (m.profile === 'Bought-out') {
            manualMats.push(matObj);
          } else {
            autoMats.push(matObj);
          }
        });

        // Attach routes belonging to this part (or all routes to Part 0 if single-part/global routing)
        const partRoutes = routes.filter((r) =>
          parts.length === 1 ? true : (r.partIndex ?? 0) === pIdx
        );

        const machiningOps = partRoutes.map((r, rIdx) => {
          const globalStepNo = routes.findIndex((x) => x.id === r.id) + 1 || rIdx + 1;
          const hrs = getStepHours(r);
          const refsLabel = r.materialRefs.length > 0 ? r.materialRefs.join(' + ') : 'Material';
          const durationLabel = `${r.durationValue} ${r.durationUnit}`;
          const pieceText = r.pieceNote ? ` (${r.pieceNote})` : '';
          const instrText = r.instruction ? ` — ${r.instruction}` : '';
          const fullNotes = `[${refsLabel}${pieceText}] → ${r.processName} (${durationLabel})${instrText}`;
          const displayOpName = `Step ${globalStepNo}: ${r.processName} [${refsLabel}]`;

          return {
            id: r.matchedOpId || r.id || `proc-${pIdx}-${rIdx}`,
            matchedOpId: r.matchedOpId,
            stepNo: globalStepNo,
            procName: r.processName,
            displayOpName,
            materialRefs: r.materialRefs,
            pieceNote: r.pieceNote,
            durationValue: r.durationValue,
            durationUnit: r.durationUnit,
            instruction: r.instruction,
            notes: fullNotes,
            quoHr: hrs,
            estHr: hrs,
            plannedHours: hrs,
            setTime: 0,
            hrRate: Number(r.hourlyRate || 1500),
            machineRate: 0,
            machineId: r.machineId || null,
            cost: Math.round(hrs * Number(r.hourlyRate || 1500)),
          };
        });

        return {
          bIdx: pIdx,
          partId: p.partId || pIdx + 1,
          title: p.partName || `Part ${pIdx + 1}`,
          description: p.description || '',
          drawingNo: p.drawingNo || '',
          partNo: p.partNo || '',
          qty: Number(p.qty) || 1,
          isCustomAdjusted: true,
          autoMats,
          manualMats,
          machiningOps,
        };
      });

      await adjustWorkOrderFullBom(workOrder.id, {
        boms: formattedBoms,
        syncRouting: true,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save adjusted Work Order BOM & Routes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Work Order & Routes — ${workOrder?.orderNo || workOrder?.id || ''}`}
      size="full"
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* ── STEP SWITCHER BAR (1. ADJUST BOM | 2. PRODUCTION ROUTES) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface2/50 p-2.5 border border-theme-subtle">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStepTab('bom')}
              className={`px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                activeStepTab === 'bom'
                  ? 'bg-rex-600 text-white border-rex-600 shadow-xs'
                  : 'bg-surface text-secondary border-theme-subtle hover:bg-surface2'
              }`}
            >
              <Package size={14} />
              <span>1. Adjust Work Order BOM (Materials)</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-mono ${
                  activeStepTab === 'bom' ? 'bg-white/20 text-white' : 'bg-surface2 text-muted'
                }`}
              >
                {numberedMaterials.length} Mats
              </span>
            </button>

            <ArrowRight size={14} className="text-muted shrink-0" />

            <button
              type="button"
              onClick={() => setActiveStepTab('routes')}
              className={`px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                activeStepTab === 'routes'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-surface text-secondary border-theme-subtle hover:bg-surface2'
              }`}
            >
              <GitBranch size={14} />
              <span>2. Production Routes (Step-by-Step Flow)</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] font-mono ${
                  activeStepTab === 'routes' ? 'bg-white/20 text-white' : 'bg-surface2 text-muted'
                }`}
              >
                {routes.length} Steps
              </span>
            </button>
          </div>

          <div className="text-xs text-muted flex items-center gap-3 font-mono">
            <span>
              Job: <strong className="text-primary">{workOrder?.title || 'Work Order'}</strong>
            </span>
            <span>|</span>
            <span>
              Batch Qty: <strong className="text-primary">{workOrder?.jobQty || 1} pcs</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================
            STEP 1: ADJUST WORK ORDER BOM (QUOTED BOM ON LEFT, ACTUAL BOM ON RIGHT)
           ======================================================================== */}
        {activeStepTab === 'bom' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[70vh]">
            {/* LEFT (4 COLS): QUOTED BOM REFERENCE (READ-ONLY, MATERIALS ONLY) */}
            <div className="lg:col-span-4 border border-theme-subtle bg-surface2/20 p-3.5 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between border-b border-theme-subtle pb-2.5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <History size={14} className="text-amber-500" /> Quoted BOM (Reference)
                  </h4>
                  <p className="text-[10px] text-muted mt-0.5">
                    Original materials from the linked Quotation (Read-only)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted block uppercase">Quoted Mat. Total</span>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(quotedTotalMatCost)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFromQuotedBom}
                  className="h-7 text-[11px] px-2.5 rounded-none border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold flex items-center gap-1"
                >
                  <Copy size={11} /> Copy Quoted Materials to Work Order BOM
                </Button>
              </div>

              {QuotedParts.map((qp, idx) => (
                <div key={idx} className="border border-theme-subtle bg-surface p-3 space-y-2 text-xs">
                  <div className="font-bold text-primary flex justify-between items-center border-b border-theme-subtle/60 pb-1.5">
                    <span>
                      Part {idx + 1}: {qp.partName}
                    </span>
                    <span className="font-mono text-[11px] text-muted">Qty: {qp.qty}</span>
                  </div>

                  {qp.materials.length > 0 ? (
                    <div className="space-y-1.5">
                      {qp.materials.map((m, i) => (
                        <div
                          key={i}
                          className="p-2 bg-surface2/40 border border-theme-subtle/50 flex items-start justify-between gap-2 text-[11px]"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-bold text-[10px]">
                                {m.matNumber}
                              </span>
                              <span className="font-bold text-primary truncate">
                                {m.material || 'Unnamed Material'}
                              </span>
                            </div>
                            {m.spec && <div className="text-[10px] font-mono text-muted">{m.spec}</div>}
                          </div>
                          <div className="text-right font-mono shrink-0">
                            <div className="font-bold text-primary">
                              {m.qty} {m.unit}
                            </div>
                            <div className="text-[10px] text-muted">
                              {formatCurrency((Number(m.qty) || 0) * (Number(m.unitCost) || 0))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted italic py-2 text-center">
                      No materials listed in Quoted BOM.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* RIGHT (8 COLS): EDITABLE WORK ORDER BOM (MATERIALS ONLY, NUMBERED Mat #1, Mat #2...) */}
            <div className="lg:col-span-8 space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between bg-rex-500/10 px-3.5 py-2.5 border border-rex-500/30">
                <div>
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Layers size={14} className="text-rex-600" />
                    Work Order Production BOM — Actual Materials ({numberedMaterials.length} Items)
                  </div>
                  <p className="text-[10.5px] text-secondary mt-0.5">
                    Each material is automatically assigned a number (<strong>Mat #1, Mat #2...</strong>) to reference in Production Routes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    setParts((p) => [
                      ...p,
                      {
                        partId: p.length + 1,
                        partName: `Part ${p.length + 1}`,
                        qty: 1,
                        materials: [
                          {
                            id: `wo-mat-${p.length}-${Date.now()}`,
                            matNumber: `Mat #${numberedMaterials.length + 1}`,
                            itemId: '',
                            material: '',
                            spec: '',
                            profile: 'Raw Stock',
                            qty: 1,
                            unit: 'pcs',
                            unitCost: 0,
                          },
                        ],
                      },
                    ])
                  }
                  className="h-7 text-[11px] rounded-none font-bold"
                >
                  Add Part / Sub-Assembly
                </Button>
              </div>

              {parts.map((part, pIdx) => (
                <div key={pIdx} className="border border-theme-subtle bg-surface p-3.5 space-y-3">
                  {/* Part Title Header */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-theme-subtle">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="px-2 py-1 text-[11px] font-mono font-bold bg-surface2 text-secondary border border-theme-subtle">
                        Part {pIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={part.partName}
                        onChange={(e) => updatePartField(pIdx, 'partName', e.target.value)}
                        placeholder="Part / Assembly Name"
                        className="px-2.5 py-1 text-xs font-bold border border-theme-subtle bg-surface2/30 text-primary flex-1"
                      />
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted">Part Qty:</span>
                        <input
                          type="number"
                          min={1}
                          value={part.qty}
                          onChange={(e) => updatePartField(pIdx, 'qty', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs font-mono border border-theme-subtle bg-surface2/30 text-primary"
                        />
                      </div>
                    </div>
                    {parts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setParts((prev) => prev.filter((_, i) => i !== pIdx))}
                        className="text-rose-500 hover:text-rose-600 p-1"
                        title="Remove Part"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Materials Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <Package size={13} className="text-rex-600" /> Materials List (No Machine Hours Here)
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={() => addMaterialRow(pIdx)}
                      className="h-7 text-[11px] px-2.5 rounded-none bg-rex-600 hover:bg-rex-700 text-white font-bold"
                    >
                      Add Material
                    </Button>
                  </div>

                  {/* Column Headers */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-1.5 px-2 py-1.5 bg-surface2/60 border border-theme-subtle text-[10px] font-bold uppercase text-muted">
                    <div className="col-span-1">Mat #</div>
                    <div className="col-span-4">Material (Inventory or Custom)</div>
                    <div className="col-span-2">Dimensions / Spec</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-1 text-center">Unit</div>
                    <div className="col-span-2 text-right">Unit Cost</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  {/* Material Rows */}
                  <div className="space-y-2">
                    {part.materials.map((m, mIdx) => {
                      const liveMatNum = getMatNumber(pIdx, mIdx);
                      return (
                        <div
                          key={m.id || mIdx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center text-xs p-2 border border-theme-subtle bg-surface2/20 hover:bg-surface2/40 transition-colors"
                        >
                          {/* Mat # Badge */}
                          <div className="sm:col-span-1 flex items-center">
                            <span className="px-2 py-1 bg-indigo-600 text-white font-mono font-bold text-[11px] tracking-tight shadow-2xs">
                              {liveMatNum}
                            </span>
                          </div>

                          {/* Material Selector + Custom Name */}
                          <div className="sm:col-span-4 space-y-1">
                            <select
                              className="w-full px-2 py-1 border border-theme-subtle bg-surface text-primary text-[11px]"
                              value={m.itemId}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'itemId', e.target.value)}
                            >
                              <option value="">-- Pick from Inventory (or type below) --</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} ({inv.sku || inv.code || 'Stock'}: {inv.quantity ?? 0} {inv.unit || 'pcs'})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Material Name (e.g. EN8 Round Bar / MS Plate)"
                              value={m.material}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'material', e.target.value)}
                              className="w-full px-2 py-1 border border-theme-subtle bg-surface text-primary font-semibold text-xs"
                            />
                          </div>

                          {/* Dimensions / Spec */}
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="e.g. Ø50 x 300mm"
                              value={m.spec}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'spec', e.target.value)}
                              className="w-full px-2 py-1 border border-theme-subtle bg-surface text-primary font-mono text-[11px]"
                            />
                          </div>

                          {/* Qty */}
                          <div className="sm:col-span-1">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Qty"
                              value={m.qty}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'qty', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-theme-subtle bg-surface text-primary font-mono font-bold text-right"
                            />
                          </div>

                          {/* Unit */}
                          <div className="sm:col-span-1">
                            <input
                              type="text"
                              placeholder="Unit"
                              value={m.unit}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'unit', e.target.value)}
                              className="w-full px-1.5 py-1 border border-theme-subtle bg-surface text-primary text-center font-mono text-[11px]"
                            />
                          </div>

                          {/* Unit Cost & Subtotal */}
                          <div className="sm:col-span-2 space-y-0.5">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Unit Cost"
                              value={m.unitCost}
                              onChange={(e) => handleMaterialChange(pIdx, mIdx, 'unitCost', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-theme-subtle bg-surface text-primary font-mono text-right text-[11px]"
                            />
                            <div className="text-[10px] font-mono text-right text-secondary font-bold">
                              = {formatCurrency((Number(m.qty) || 0) * (Number(m.unitCost) || 0))}
                            </div>
                          </div>

                          {/* Delete */}
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeMaterialRow(pIdx, mIdx)}
                              className="text-rose-500 hover:text-rose-600 p-1.5 hover:bg-rose-500/10"
                              title="Remove Material"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {part.materials.length === 0 && (
                      <div className="text-xs text-muted italic py-4 text-center border border-dashed border-theme-subtle">
                        No materials added yet. Click &ldquo;Add Material&rdquo; to add Mat #1.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================
            STEP 2: PRODUCTION ROUTES (STEP-BY-STEP MANUFACTURING FLOW)
           ======================================================================== */}
        {activeStepTab === 'routes' && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Reference Strip of Numbered Materials from Step 1 */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Package size={14} className="text-indigo-500" />
                  Work Order BOM Materials (Available for Route Steps):
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStepTab('bom')}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  ← Edit BOM Materials
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {numberedMaterials.map((m) => (
                  <div
                    key={m.matNumber}
                    className="px-2.5 py-1 bg-surface border border-indigo-500/40 text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-mono font-bold text-[10px]">
                      {m.matNumber}
                    </span>
                    <span className="font-bold text-primary">{m.material || 'Unnamed Material'}</span>
                    {m.spec && <span className="text-[10px] font-mono text-muted">({m.spec})</span>}
                    <span className="text-[10px] font-mono text-secondary font-bold">
                      · {m.qty} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Flow Timeline Chain */}
            {routes.length > 0 && (
              <div className="p-3 bg-surface2/50 border border-theme-subtle space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                  <Sparkles size={12} className="text-blue-500" />
                  Live Manufacturing Route Sequence Preview:
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {routes.map((r, idx) => (
                    <React.Fragment key={r.id}>
                      <div className="px-2.5 py-1.5 bg-surface border border-blue-500/40 text-xs flex items-center gap-1.5 shadow-2xs">
                        <span className="px-1.5 py-0.2 bg-blue-600 text-white font-mono font-bold text-[10px]">
                          Step {idx + 1}
                        </span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          [{r.materialRefs.join(' + ') || 'Mat'}]
                        </span>
                        {r.pieceNote && <span className="text-[10px] text-muted">({r.pieceNote})</span>}
                        <ArrowRight size={11} className="text-muted" />
                        <span className="font-bold text-primary">{r.processName}</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold text-[10px]">
                          {r.durationValue} {r.durationUnit}
                        </span>
                      </div>
                      {idx < routes.length - 1 && <ArrowRight size={14} className="text-blue-500 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Routes Header & Add Step Button */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
                  <GitBranch size={15} className="text-blue-600" />
                  Step-by-Step Shop Floor Routing ({routes.length} Steps)
                </h4>
                <p className="text-[11px] text-muted">
                  Example: Step 1 → Take <strong>Mat #1</strong> → <strong>Lathe (15 mins)</strong> | Step 2 → Take <strong>Mat #2 (or another piece of Mat #1)</strong> → <strong>Milling (20 mins)</strong> | Step 3 → <strong>Step 1 Part + Step 2 Part</strong> → <strong>Welding</strong>
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={addRouteStep}
                className="rounded-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Add Route Step (+ Step {routes.length + 1})
              </Button>
            </div>

            {/* Route Step Cards */}
            <div className="space-y-3">
              {routes.map((route, rIdx) => {
                // Available previous step badges for assembly/welding/subsequent machining
                const previousStepLabels = Array.from({ length: rIdx }, (_, i) => `Step ${i + 1} Part`);

                return (
                  <div
                    key={route.id}
                    className="p-3.5 border border-theme-subtle bg-surface hover:border-blue-500/40 transition-all space-y-3 shadow-2xs"
                  >
                    {/* Top Row: Step Number & Reorder / Delete */}
                    <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-blue-600 text-white font-mono font-bold text-xs">
                          STEP {rIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          {route.materialRefs.length > 0 ? `[${route.materialRefs.join(' + ')}]` : '[Select Material]'}{' '}
                          {route.pieceNote ? `(${route.pieceNote})` : ''} → {route.processName} ({route.durationValue}{' '}
                          {route.durationUnit})
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={rIdx === 0}
                          onClick={() => moveRouteStep(rIdx, 'up')}
                          className="p-1 text-secondary hover:text-primary disabled:opacity-30 border border-theme-subtle bg-surface2/50"
                          title="Move Step Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={rIdx === routes.length - 1}
                          onClick={() => moveRouteStep(rIdx, 'down')}
                          className="p-1 text-secondary hover:text-primary disabled:opacity-30 border border-theme-subtle bg-surface2/50"
                          title="Move Step Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        {routes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRouteStep(rIdx)}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 ml-1"
                            title="Delete Step"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Grid of Step Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                      {/* 1. Material / Part Selection (5 cols) */}
                      <div className="lg:col-span-5 space-y-2">
                        <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                          1. Select Input Material # or Previous Step Part:
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {numberedMaterials.map((m) => {
                            const isSelected = route.materialRefs.includes(m.matNumber);
                            return (
                              <button
                                key={m.matNumber}
                                type="button"
                                onClick={() => toggleRouteMaterialRef(rIdx, m.matNumber)}
                                className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-surface2/60 text-secondary border-theme-subtle hover:border-indigo-500/50'
                                }`}
                                title={`${m.material} (${m.spec || m.qty + ' ' + m.unit})`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{m.matNumber}</span>
                                {m.material && (
                                  <span className="font-sans font-normal text-[10px] max-w-[90px] truncate opacity-90">
                                    ({m.material})
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {previousStepLabels.map((stepLbl) => {
                            const isSelected = route.materialRefs.includes(stepLbl);
                            return (
                              <button
                                key={stepLbl}
                                type="button"
                                onClick={() => toggleRouteMaterialRef(rIdx, stepLbl)}
                                className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                }`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{stepLbl}</span>
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          value={route.pieceNote}
                          onChange={(e) => updateRouteStep(rIdx, 'pieceNote', e.target.value)}
                          placeholder="Piece / Cut details (e.g. 1 pc 100mm cut / another piece from Mat #1 / join parts)"
                          className="w-full px-2.5 py-1.5 text-xs border border-theme-subtle bg-surface2/20 text-primary"
                        />
                      </div>

                      {/* 2. Machine / Process Selection (3 cols) */}
                      <div className="lg:col-span-3 space-y-1.5">
                        <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider">
                          2. Machine / Operation:
                        </label>
                        <select
                          value={
                            processCatalog.some((p) => p.name === route.processName) ? route.processName : '__custom__'
                          }
                          onChange={(e) => {
                            if (e.target.value !== '__custom__') {
                              updateRouteStep(rIdx, 'processName', e.target.value);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-theme-subtle bg-surface text-primary"
                        >
                          {processCatalog.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                          <option value="__custom__">-- Custom Process (Type Below) --</option>
                        </select>

                        <input
                          type="text"
                          value={route.processName}
                          onChange={(e) => updateRouteStep(rIdx, 'processName', e.target.value)}
                          placeholder="Operation Name (e.g. Lathe, Milling, Welding)"
                          className="w-full px-2.5 py-1 text-xs border border-theme-subtle bg-surface2/20 text-primary font-semibold"
                        />

                        {machineries.length > 0 && (
                          <select
                            value={route.machineId}
                            onChange={(e) => updateRouteStep(rIdx, 'machineId', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] border border-theme-subtle bg-surface text-secondary"
                          >
                            <option value="">-- Optional: Specific Shop Machine --</option>
                            {machineries.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.code || m.type || 'Machine'})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* 3. Time / Duration (2 cols) */}
                      <div className="lg:col-span-2 space-y-1.5">
                        <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                          <Clock size={11} className="text-emerald-500" /> 3. Duration / Time:
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min={1}
                            step="any"
                            value={route.durationValue}
                            onChange={(e) => updateRouteStep(rIdx, 'durationValue', Number(e.target.value))}
                            className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold border border-theme-subtle bg-surface text-primary"
                          />
                          <select
                            value={route.durationUnit}
                            onChange={(e) => updateRouteStep(rIdx, 'durationUnit', e.target.value as 'mins' | 'hrs')}
                            className="px-2 py-1.5 text-xs font-bold border border-l-0 border-theme-subtle bg-surface2 text-primary cursor-pointer"
                          >
                            <option value="mins">Mins</option>
                            <option value="hrs">Hrs</option>
                          </select>
                        </div>

                        {/* Quick Time Pills */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {[
                            { label: '15m', val: 15, unit: 'mins' as const },
                            { label: '30m', val: 30, unit: 'mins' as const },
                            { label: '45m', val: 45, unit: 'mins' as const },
                            { label: '1h', val: 1, unit: 'hrs' as const },
                            { label: '2h', val: 2, unit: 'hrs' as const },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                updateRouteStep(rIdx, 'durationValue', preset.val);
                                updateRouteStep(rIdx, 'durationUnit', preset.unit);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-mono bg-surface2 hover:bg-blue-500/20 text-secondary border border-theme-subtle cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Work Instruction / Note (2 cols) */}
                      <div className="lg:col-span-2 space-y-1.5">
                        <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                          <Hammer size={11} className="text-amber-500" /> 4. Work Instruction:
                        </label>
                        <textarea
                          rows={2}
                          value={route.instruction}
                          onChange={(e) => updateRouteStep(rIdx, 'instruction', e.target.value)}
                          placeholder="e.g. Facing & turning / Weld part A & B"
                          className="w-full px-2.5 py-1.5 text-xs border border-theme-subtle bg-surface2/20 text-primary resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={addRouteStep}
                className="rounded-none border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold text-xs px-4"
              >
                + Add Next Route Step (Step {routes.length + 1})
              </Button>
            </div>
          </div>
        )}

        {/* ── FOOTER SUMMARY & ACTIONS ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-theme-subtle">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span>
              Quoted Materials: <strong className="font-mono text-amber-600">{formatCurrency(quotedTotalMatCost)}</strong>
            </span>
            <span>
              Work Order BOM ({numberedMaterials.length} Mats):{' '}
              <strong className="font-mono text-primary">{formatCurrency(totalMatCost)}</strong>
            </span>
            <span>
              Routes ({routes.length} Steps · {Math.round(totalRouteMins)} mins / {totalRouteHours.toFixed(2)} hrs):{' '}
              <strong className="font-mono text-blue-600">{formatCurrency(totalRouteCost)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-none">
              Cancel
            </Button>

            {activeStepTab === 'bom' ? (
              <Button
                variant="primary"
                onClick={() => setActiveStepTab('routes')}
                className="rounded-none bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5"
              >
                <span>Next: Production Routes ({routes.length} Steps)</span>
                <ArrowRight size={14} />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setActiveStepTab('bom')}
                className="rounded-none font-bold flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Back to BOM</span>
              </Button>
            )}

            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {saving ? 'Saving BOM & Routes...' : 'Save Work Order BOM & Routes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
