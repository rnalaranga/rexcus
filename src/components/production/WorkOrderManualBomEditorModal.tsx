import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, CheckCircle2, Wrench, Package, History, Layers } from 'lucide-react';
import { fetchInventory, updateWorkOrder } from '@/lib/api';
import { useMachiningOperations } from '@/hooks/useData';
import { formatCurrency } from '@/lib/utils';

interface WorkOrderManualBomEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  initialBoms: any[];
  onSuccess: () => void;
}

interface BomPart {
  partName: string;
  qty: number;
  materials: any[];
  operations: any[];
}

export const WorkOrderManualBomEditorModal: React.FC<WorkOrderManualBomEditorModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  initialBoms,
  onSuccess,
}) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [parts, setParts] = useState<BomPart[]>([]);
  const [snapshotParts, setSnapshotParts] = useState<BomPart[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: rawOperations } = useMachiningOperations();
  const EXCEL_PROCESSES = useMemo(() => {
    const groups: Record<string, any[]> = {};
    if (rawOperations) {
      rawOperations.forEach((op: any) => {
        if (!groups[op.groupName]) groups[op.groupName] = [];
        groups[op.groupName].push(op);
      });
    }
    return Object.keys(groups).map((k) => ({ group: k, items: groups[k] }));
  }, [rawOperations]);

  useEffect(() => {
    if (!isOpen) return;
    fetchInventory()
      .then((res: any) => setInventory(Array.isArray(res) ? res : []))
      .catch(() => {});

    const normalized: BomPart[] = (initialBoms && initialBoms.length > 0 ? initialBoms : [{ partName: workOrder?.productName || workOrder?.title || 'Main Assembly', qty: workOrder?.qty || 1 }]).map((b: any) => ({
      partName: b.partName || b.name || workOrder?.productName || 'Part',
      qty: Number(b.qty || b.quantity || 1),
      materials: (b.materials || b.items || []).map((m: any) => ({
        itemId: m.itemId || m.id || '',
        name: m.name || m.itemName || '',
        qty: Number(m.qty || m.quantity || 1),
        unit: m.unit || 'pcs',
        unitCost: Number(m.unitCost || m.cost || 0),
      })),
      operations: (b.operations || b.machining || []).map((op: any) => ({
        operationName: op.operationName || op.name || '',
        machineId: op.machineId || '',
        machineName: op.machineName || op.workCenter || '',
        plannedHours: Number(op.plannedHours || op.hours || 1),
        hourlyRate: Number(op.hourlyRate || op.rate || 0),
      })),
    }));

    setSnapshotParts(JSON.parse(JSON.stringify(normalized)));
    setParts(JSON.parse(JSON.stringify(normalized)));
  }, [isOpen, initialBoms, workOrder]);

  const updatePartField = (pIdx: number, field: keyof BomPart, val: any) => {
    setParts((prev) => prev.map((p, i) => (i === pIdx ? { ...p, [field]: val } : p)));
  };

  const handleMaterialChange = (pIdx: number, mIdx: number, field: string, value: any) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const nextMats = [...p.materials];
        nextMats[mIdx] = { ...nextMats[mIdx], [field]: value };
        if (field === 'itemId') {
          const inv = inventory.find((x) => x.id === value);
          if (inv) {
            nextMats[mIdx].name = inv.name;
            nextMats[mIdx].unit = inv.unit || 'pcs';
            nextMats[mIdx].unitCost = Number(inv.costPrice || inv.unitCost || inv.price || 0);
          }
        }
        return { ...p, materials: nextMats };
      })
    );
  };

  const handleProcChange = (pIdx: number, proc: any, field: 'estHr' | 'setTime' | 'quoHr', value: number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const nextOps = [...p.operations];
        const existingIdx = nextOps.findIndex((o) => o.operationName === proc.name);
        const hrRate = Number(proc.hrRate || proc.rate || 0);
        const setTimeRate = Number(proc.setTimeRate || 0);
        if (existingIdx >= 0) {
          const updated = { ...nextOps[existingIdx], [field]: value };
          updated.plannedHours = Number(updated.quoHr || updated.estHr || 0);
          updated.hourlyRate = hrRate;
          updated.setTimeRate = setTimeRate;
          nextOps[existingIdx] = updated;
        } else {
          nextOps.push({
            operationName: proc.name,
            machineName: proc.groupName || '',
            estHr: field === 'estHr' ? value : 0,
            setTime: field === 'setTime' ? value : 0,
            quoHr: field === 'quoHr' ? value : 0,
            plannedHours: field === 'quoHr' || field === 'estHr' ? value : 0,
            hourlyRate: hrRate,
            setTimeRate,
          });
        }
        return { ...p, operations: nextOps };
      })
    );
  };

  const totalMatCost = parts.reduce(
    (sum, p) => sum + p.materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0),
    0
  );
  const totalOpCost = parts.reduce(
    (sum, p) => sum + p.operations.reduce((s, o) => s + (Number(o.plannedHours) || 0) * (Number(o.hourlyRate) || 0), 0),
    0
  );
  const totalHours = parts.reduce(
    (sum, p) => sum + p.operations.reduce((s, o) => s + (Number(o.plannedHours) || 0), 0),
    0
  );

  const snapshotTotalCost = snapshotParts.reduce(
    (sum, p) =>
      sum +
      p.materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0) +
      p.operations.reduce((s, o) => s + (Number(o.plannedHours) || 0) * (Number(o.hourlyRate) || 0), 0),
    0
  );

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cleanedParts = parts.map((p) => ({
        partName: p.partName || 'Part',
        qty: Number(p.qty) || 1,
        materials: p.materials.filter((m) => m.name || m.itemId),
        operations: p.operations.filter((o) => o.operationName || o.machineName),
      }));

      await updateWorkOrder(workOrder.id, {
        bom: JSON.stringify(cleanedParts),
        bomSubmitted: true,
        estimatedCost: totalMatCost + totalOpCost,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit manual BOM:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quotation-Style Manual BOM & Machine Hours Studio" size="full">
      <div className="p-4 sm:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[75vh]">
        {/* LEFT: Editable Quotation-Style BOM */}
        <div className="lg:col-span-8 space-y-4 overflow-y-auto pr-1">
          <div className="flex items-center justify-between bg-surface2/40 px-3 py-2 rounded-lg border border-theme-subtle">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Layers size={14} className="text-blue-500" />
              Editable BOM & Machine Hours ({parts.length} {parts.length === 1 ? 'Part' : 'Parts'})
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() =>
                setParts((p) => [...p, { partName: `Part ${p.length + 1}`, qty: 1, materials: [], operations: [] }])
              }
              className="h-7 text-[11px]"
            >
              Add Part / Assembly
            </Button>
          </div>

          {parts.map((part, pIdx) => (
            <div key={pIdx} className="border border-theme-subtle rounded-lg bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-theme-subtle">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={part.partName}
                    onChange={(e) => updatePartField(pIdx, 'partName', e.target.value)}
                    placeholder="Part / Assembly Name"
                    className="px-2.5 py-1 text-xs font-bold rounded border border-theme-subtle bg-surface2/30 text-primary flex-1"
                  />
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      value={part.qty}
                      onChange={(e) => updatePartField(pIdx, 'qty', Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-mono rounded border border-theme-subtle bg-surface2/30 text-primary"
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

              {/* Materials Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                    <Package size={12} className="text-blue-500" /> Materials
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      updatePartField(pIdx, 'materials', [
                        ...part.materials,
                        { itemId: '', name: '', qty: 1, unit: 'pcs', unitCost: 0 },
                      ])
                    }
                    className="h-6 text-[10px] px-2"
                  >
                    Add Material
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {part.materials.map((m, mIdx) => (
                    <div key={mIdx} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                      <select
                        className="col-span-4 px-2 py-1 rounded border border-theme-subtle bg-surface text-primary"
                        value={m.itemId}
                        onChange={(e) => handleMaterialChange(pIdx, mIdx, 'itemId', e.target.value)}
                      >
                        <option value="">-- Select Item --</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.sku || inv.code || 'No SKU'})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Qty"
                        className="col-span-2 px-2 py-1 rounded border border-theme-subtle bg-surface text-primary font-mono"
                        value={m.qty}
                        onChange={(e) => handleMaterialChange(pIdx, mIdx, 'qty', Number(e.target.value))}
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        className="col-span-1 px-1.5 py-1 rounded border border-theme-subtle bg-surface text-primary text-center"
                        value={m.unit}
                        onChange={(e) => handleMaterialChange(pIdx, mIdx, 'unit', e.target.value)}
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Unit Cost"
                        className="col-span-2 px-2 py-1 rounded border border-theme-subtle bg-surface text-primary font-mono"
                        value={m.unitCost}
                        onChange={(e) => handleMaterialChange(pIdx, mIdx, 'unitCost', Number(e.target.value))}
                      />
                      <div className="col-span-2 text-right font-mono font-semibold text-secondary">
                        {formatCurrency((Number(m.qty) || 0) * (Number(m.unitCost) || 0))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updatePartField(
                            pIdx,
                            'materials',
                            part.materials.filter((_, i) => i !== mIdx)
                          )
                        }
                        className="col-span-1 flex justify-center text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {part.materials.length === 0 && (
                    <div className="text-[11px] text-muted italic py-2 text-center border border-dashed border-theme-subtle rounded">
                      No materials added for this part.
                    </div>
                  )}
                </div>
              </div>

              {/* Machining Operations (Quotation-Style Grouped Table) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                    <Wrench size={12} className="text-amber-500" /> Machining Operations
                  </span>
                </div>
                <div className="overflow-x-auto border border-theme-subtle rounded">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface2/50 border-b border-theme-subtle text-[10px] uppercase tracking-wider text-muted font-bold">
                        <th className="px-3 py-2">Process</th>
                        <th className="px-2 py-2 w-20">Est. Hr</th>
                        <th className="px-2 py-2 w-20">Set Time</th>
                        <th className="px-2 py-2 w-20">Quo. Hr</th>
                        <th className="px-2 py-2 w-44">Rates</th>
                        <th className="px-3 py-2 text-right w-28">Sub Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle/30">
                      {EXCEL_PROCESSES.map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          <tr className="bg-surface2/30">
                            <td colSpan={6} className="px-3 py-1.5 text-[10.5px] font-black text-red-500/90 uppercase tracking-widest">
                              {group.group}
                            </td>
                          </tr>
                          {group.items.map((proc: any) => {
                            const matched = part.operations.find((o) => o.operationName === proc.name) || {};
                            const estHr = Number(matched.estHr ?? matched.plannedHours ?? 0);
                            const setTime = Number(matched.setTime ?? 0);
                            const quoHr = Number(matched.quoHr ?? matched.plannedHours ?? 0);
                            const hrRate = Number(proc.hrRate || proc.rate || 0);
                            const setTimeRate = Number(proc.setTimeRate || 0);
                            const subTotal = quoHr * hrRate + setTime * setTimeRate;

                            return (
                              <tr key={proc.name} className="hover:bg-surface2/20">
                                <td className="px-3 py-1.5 font-medium text-primary">{proc.name}</td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={estHr || ''}
                                    placeholder="-"
                                    onChange={(e) => handleProcChange(pIdx, proc, 'estHr', Number(e.target.value))}
                                    className="w-full px-1.5 py-1 rounded border border-theme-subtle bg-surface text-primary font-mono text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={setTime || ''}
                                    placeholder="-"
                                    onChange={(e) => handleProcChange(pIdx, proc, 'setTime', Number(e.target.value))}
                                    className="w-full px-1.5 py-1 rounded border border-theme-subtle bg-surface text-primary font-mono text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={quoHr || ''}
                                    placeholder="-"
                                    onChange={(e) => handleProcChange(pIdx, proc, 'quoHr', Number(e.target.value))}
                                    className="w-full px-1.5 py-1 rounded border border-theme-subtle bg-surface text-primary font-mono text-xs"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-[11px] font-mono">
                                  <span className="text-amber-600">Rs. {hrRate.toLocaleString()}/hr</span>
                                  <span className="text-muted mx-1">|</span>
                                  <span className="text-blue-600">Rs. {setTimeRate.toLocaleString()}/set</span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono font-semibold text-secondary">
                                  {subTotal > 0 ? formatCurrency(subTotal) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {EXCEL_PROCESSES.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-[11px] text-muted italic py-3 text-center">
                            Loading machining operations...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Current BOM Snapshot (Read-Only) */}
        <div className="lg:col-span-4 border border-theme-subtle rounded-lg bg-surface2/20 p-3 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <History size={14} className="text-emerald-500" /> Current BOM Snapshot
            </h4>
            <span className="text-[11px] font-mono font-bold text-emerald-600">
              {formatCurrency(snapshotTotalCost)}
            </span>
          </div>

          {snapshotParts.map((sp, idx) => (
            <div key={idx} className="border border-theme-subtle rounded bg-surface p-2.5 space-y-2 text-xs">
              <div className="font-bold text-primary flex justify-between">
                <span>{sp.partName}</span>
                <span className="font-mono text-muted">Qty: {sp.qty}</span>
              </div>

              {sp.materials.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted mb-1">Materials</div>
                  <div className="space-y-1">
                    {sp.materials.map((m, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-secondary">
                        <span className="truncate pr-2">
                          {m.name || 'Unnamed'} ({m.qty} {m.unit})
                        </span>
                        <span className="font-mono shrink-0">
                          {formatCurrency((Number(m.qty) || 0) * (Number(m.unitCost) || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sp.operations.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted mb-1">Machine Hours</div>
                  <div className="space-y-1">
                    {sp.operations.map((op, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-secondary">
                        <span className="truncate pr-2">
                          {op.operationName || 'Op'} ({op.plannedHours}h)
                        </span>
                        <span className="font-mono shrink-0">
                          {formatCurrency((Number(op.plannedHours) || 0) * (Number(op.hourlyRate) || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Cost Summary & Submit */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-theme-subtle">
        <div className="flex items-center gap-4 text-xs">
          <span>
            Materials: <strong className="font-mono text-primary">{formatCurrency(totalMatCost)}</strong>
          </span>
          <span>
            Machining ({totalHours}h): <strong className="font-mono text-primary">{formatCurrency(totalOpCost)}</strong>
          </span>
          <span>
            New Total: <strong className="font-mono text-emerald-600 text-sm">{formatCurrency(totalMatCost + totalOpCost)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" icon={CheckCircle2} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Manual BOM to Stores'}
          </Button>
        </div>
      </div>
      </div>
    </Modal>
  );
};
