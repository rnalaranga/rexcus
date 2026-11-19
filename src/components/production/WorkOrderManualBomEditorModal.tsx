import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, CheckCircle2, Wrench, Package } from 'lucide-react';
import { fetchInventory, updateWorkOrder } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface WorkOrderManualBomEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  initialBoms: any[];
  onSuccess: () => void;
}

export const WorkOrderManualBomEditorModal: React.FC<WorkOrderManualBomEditorModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  initialBoms,
  onSuccess,
}) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchInventory().then((res: any) => setInventory(Array.isArray(res) ? res : [])).catch(() => {});
    fetch('/api/machines').then((r) => r.json()).then((res: any) => setMachines(Array.isArray(res) ? res : [])).catch(() => {});

    // Flatten initial materials & operations from BOMs
    const flatMats: any[] = [];
    const flatOps: any[] = [];
    (initialBoms || []).forEach((b: any) => {
      (b.materials || b.items || []).forEach((m: any) => {
        flatMats.push({
          itemId: m.itemId || m.id || '',
          name: m.name || m.itemName || '',
          qty: Number(m.qty || m.quantity || 1),
          unit: m.unit || 'pcs',
          unitCost: Number(m.unitCost || m.cost || 0),
        });
      });
      (b.operations || b.machining || []).forEach((op: any) => {
        flatOps.push({
          operationName: op.operationName || op.name || '',
          machineId: op.machineId || '',
          machineName: op.machineName || op.workCenter || '',
          plannedHours: Number(op.plannedHours || op.hours || 1),
          hourlyRate: Number(op.hourlyRate || op.rate || 0),
        });
      });
    });

    setMaterials(flatMats.length > 0 ? flatMats : [{ itemId: '', name: '', qty: 1, unit: 'pcs', unitCost: 0 }]);
    setOperations(flatOps.length > 0 ? flatOps : [{ operationName: '', machineId: '', machineName: '', plannedHours: 1, hourlyRate: 0 }]);
  }, [isOpen, initialBoms]);

  const handleMaterialChange = (idx: number, field: string, value: any) => {
    setMaterials((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'itemId') {
        const inv = inventory.find((i) => i.id === value);
        if (inv) {
          next[idx].name = inv.name;
          next[idx].unit = inv.unit || 'pcs';
          next[idx].unitCost = Number(inv.costPrice || inv.unitCost || inv.price || 0);
        }
      }
      return next;
    });
  };

  const handleOpChange = (idx: number, field: string, value: any) => {
    setOperations((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'machineId') {
        const m = machines.find((x) => x.id === value);
        if (m) {
          next[idx].machineName = m.name;
          next[idx].hourlyRate = Number(m.hourlyRate || m.ratePerHour || 0);
        }
      }
      return next;
    });
  };

  const totalMatCost = materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0);
  const totalOpCost = operations.reduce((s, o) => s + (Number(o.plannedHours) || 0) * (Number(o.hourlyRate) || 0), 0);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cleanMats = materials.filter((m) => m.name || m.itemId);
      const cleanOps = operations.filter((o) => o.operationName || o.machineName);

      const updatedBom = [
        {
          partName: workOrder?.productName || workOrder?.title || 'Manual BOM',
          materials: cleanMats,
          operations: cleanOps,
        },
      ];

      await updateWorkOrder(workOrder.id, {
        bom: JSON.stringify(updatedBom),
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
    <Modal isOpen={isOpen} onClose={onClose} title="Manual BOM & Machine Hours (Quotation Style)" size="xl">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Materials Section */}
        <div className="border border-theme-subtle rounded-lg p-3 bg-surface2/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Package size={14} className="text-blue-500" /> Required Materials
            </h4>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setMaterials((p) => [...p, { itemId: '', name: '', qty: 1, unit: 'pcs', unitCost: 0 }])}
              className="h-7 text-[11px]"
            >
              Add Material
            </Button>
          </div>

          <div className="space-y-2">
            {materials.map((m, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                <select
                  className="col-span-5 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary"
                  value={m.itemId}
                  onChange={(e) => handleMaterialChange(idx, 'itemId', e.target.value)}
                >
                  <option value="">-- Select Inventory Item --</option>
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
                  className="col-span-2 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary font-mono"
                  value={m.qty}
                  onChange={(e) => handleMaterialChange(idx, 'qty', Number(e.target.value))}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  className="col-span-2 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary"
                  value={m.unit}
                  onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                />
                <div className="col-span-2 text-right font-mono font-semibold text-secondary">
                  {formatCurrency((Number(m.qty) || 0) * (Number(m.unitCost) || 0))}
                </div>
                <button
                  type="button"
                  onClick={() => setMaterials((p) => p.filter((_, i) => i !== idx))}
                  className="col-span-1 flex justify-center text-rose-500 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Machine Hours / Operations Section */}
        <div className="border border-theme-subtle rounded-lg p-3 bg-surface2/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Wrench size={14} className="text-amber-500" /> Machine Hours & Operations
            </h4>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() =>
                setOperations((p) => [...p, { operationName: '', machineId: '', machineName: '', plannedHours: 1, hourlyRate: 0 }])
              }
              className="h-7 text-[11px]"
            >
              Add Operation
            </Button>
          </div>

          <div className="space-y-2">
            {operations.map((op, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                <input
                  type="text"
                  placeholder="Operation (e.g. Turning, Milling)"
                  className="col-span-4 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary"
                  value={op.operationName}
                  onChange={(e) => handleOpChange(idx, 'operationName', e.target.value)}
                />
                <select
                  className="col-span-3 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary"
                  value={op.machineId}
                  onChange={(e) => handleOpChange(idx, 'machineId', e.target.value)}
                >
                  <option value="">-- Select Machine --</option>
                  {machines.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="Hours"
                  className="col-span-2 px-2 py-1.5 rounded border border-theme-subtle bg-surface text-primary font-mono"
                  value={op.plannedHours}
                  onChange={(e) => handleOpChange(idx, 'plannedHours', Number(e.target.value))}
                />
                <div className="col-span-2 text-right font-mono font-semibold text-secondary">
                  {formatCurrency((Number(op.plannedHours) || 0) * (Number(op.hourlyRate) || 0))}
                </div>
                <button
                  type="button"
                  onClick={() => setOperations((p) => p.filter((_, i) => i !== idx))}
                  className="col-span-1 flex justify-center text-rose-500 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-subtle">
          <div className="text-xs text-muted">
            Est. Total: <span className="font-mono font-bold text-primary">{formatCurrency(totalMatCost + totalOpCost)}</span>
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
