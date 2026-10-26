import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, Check, AlertTriangle, Package, Warehouse,
  FileText, CheckCircle2, X, Sparkles, Building, Layers
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { changeBomMaterial, reportMaterialShortage } from '@/lib/api';
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  item: {
    partIndex: number;
    materialIndex: number;
    flatIndex?: number;
    material: string;
    spec?: string;
    qty: number;
    unit: string;
    unitPrice: number;
    inStock: number;
    hasStock: boolean;
    invMatch?: any;
    partTitle?: string;
    substituteRequest?: any;
  } | null;
  inventory: any[];
  onSuccess: () => void;
  onOpenDirectIssue?: (substituteDetails: any) => void;
}

export const WorkOrderMaterialSubstituteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  workOrder,
  item,
  inventory,
  onSuccess,
  onOpenDirectIssue
}) => {
  if (!isOpen || !item) return null;

  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [useCustomMaterial, setUseCustomMaterial] = useState<boolean>(false);
  const [substituteMaterial, setSubstituteMaterial] = useState<string>('');
  const [substituteSpec, setSubstituteSpec] = useState<string>('');
  const [substituteQty, setSubstituteQty] = useState<number>(item.qty || 1);
  const [substituteUnit, setSubstituteUnit] = useState<string>(item.unit || 'pcs');
  const [substituteUnitCost, setSubstituteUnitCost] = useState<number>(item.unitPrice || 0);
  
  const [reasonCategory, setReasonCategory] = useState<string>('Using Available Factory Remnant / Alternative Bar Size');
  const [customReasonNotes, setCustomReasonNotes] = useState<string>('');
  const [notifySales, setNotifySales] = useState<boolean>(false);
  const [requestFromStores, setRequestFromStores] = useState<boolean>(true);
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Selected substitute inventory match
  const selectedInvItem = useMemo(() => {
    return inventory.find(inv => inv.id === selectedInvId) || null;
  }, [selectedInvId, inventory]);

  // Handle inventory selection
  const handleSelectInventory = (invId: string) => {
    setSelectedInvId(invId);
    if (!invId) return;
    const found = inventory.find(inv => inv.id === invId);
    if (found) {
      setSubstituteMaterial(found.name || '');
      setSubstituteUnitCost(Number(found.unitCost || 0));
      if (found.unit) setSubstituteUnit(found.unit);
      if (found.category || found.sku) {
        setSubstituteSpec(`SKU: ${found.sku || ''} | Category: ${found.category || ''}`);
      }
    }
  };

  // Direct Change BOM & Send Store Requisition
  const handleDirectChange = async () => {
    const finalMaterialName = (useCustomMaterial ? substituteMaterial : (substituteMaterial || selectedInvItem?.name || '')).trim();
    if (!finalMaterialName) {
      setErrorMsg('Please enter or select a substitute material name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const fullReason = [reasonCategory, customReasonNotes.trim()].filter(Boolean).join(' - ');
      const res = await changeBomMaterial(workOrder.id, {
        bomIndex: item.flatIndex ?? item.materialIndex,
        originalMaterial: item.material,
        newMaterial: finalMaterialName,
        newInventoryId: selectedInvId || undefined,
        newQty: substituteQty,
        newUnit: substituteUnit,
        newUnitCost: substituteUnitCost,
        spec: substituteSpec,
        reason: fullReason,
        changedBy: 'Workshop Personnel',
        requestFromStores: requestFromStores,
        partTitle: item.partTitle
      });

      if (res && res.error) throw new Error(res.error);

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change material in BOM');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit for Department Head Approval
  const handleApprovalRequest = async () => {
    const finalMaterialName = (useCustomMaterial ? substituteMaterial : (substituteMaterial || selectedInvItem?.name || '')).trim();
    if (!finalMaterialName) {
      setErrorMsg('Please enter or select a substitute material name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const fullReason = [reasonCategory, customReasonNotes.trim()].filter(Boolean).join(' - ');
      const res = await reportMaterialShortage(workOrder.id, {
        bomIndex: item.flatIndex ?? item.materialIndex,
        missingMaterial: item.material,
        requiredQty: item.qty,
        currentStock: item.inStock,
        substituteMaterial: finalMaterialName,
        substituteInvId: selectedInvId || undefined,
        substituteQty: substituteQty,
        substituteUnitCost: substituteUnitCost,
        reason: fullReason,
        requestedBy: 'Workshop Personnel',
        notifySales: notifySales
      });

      if (res && res.error) throw new Error(res.error);

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit substitute request');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Issue Alternative Material
  const handleDirectIssueNow = async () => {
    const finalMaterialName = (useCustomMaterial ? substituteMaterial : (substituteMaterial || selectedInvItem?.name || '')).trim();
    if (!finalMaterialName) {
      setErrorMsg('Please enter or select a substitute material name.');
      return;
    }

    // First update the BOM
    await handleDirectChange();
    if (onOpenDirectIssue) {
      onOpenDirectIssue({
        inventoryId: selectedInvId || (selectedInvItem ? selectedInvItem.id : ''),
        materialName: finalMaterialName,
        qty: substituteQty,
        unit: substituteUnit,
        unitCost: substituteUnitCost,
        notes: `Issued substitute material for ${item.material} against ${item.partTitle || 'BOM'}`
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change / Request Alternative Material in BOM"
      className="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Context Banner */}
        <div className="flex items-center justify-between pb-2 border-b border-theme-subtle">
          <div>
            <span className="font-mono text-[10px] text-muted uppercase font-bold block">
              Work Order #{workOrder.orderNo || workOrder.id}
            </span>
            <span className="font-bold text-primary text-sm">
              {item.partTitle || 'Bill of Materials Item'}
            </span>
          </div>
          <Badge variant="subtle" size="sm" className="font-mono text-xs">
            Material #{item.materialIndex + 1}
          </Badge>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded-none font-medium flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. CURRENT QUOTED MATERIAL CARD */}
        <div className="p-3 bg-surface2/50 border border-theme-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-muted uppercase tracking-wider">
              Currently Quoted / Planned Material
            </span>
            {item.hasStock ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <Check size={11} /> In Stock in Stores ({item.inStock} {item.unit})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-none bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle size={11} /> Stores Shortage ({item.inStock} {item.unit} available)
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-bold text-primary text-sm">{item.material}</p>
              {item.spec && <p className="text-[11px] text-muted font-mono">{item.spec}</p>}
            </div>
            <div className="text-right sm:border-l sm:border-theme-subtle sm:pl-3">
              <span className="text-[10px] text-muted uppercase block">Allocated Qty</span>
              <span className="font-mono font-bold text-primary text-xs">
                {item.qty} {item.unit} @ {formatCurrency(item.unitPrice)}
              </span>
            </div>
          </div>

          {item.hasStock && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 bg-emerald-500/10 p-2 border border-emerald-500/20 rounded-none leading-relaxed">
              💡 <strong>Stock Available:</strong> This material is currently in stock in Stores. However, you can change the BOM or request an alternative grade, remnant, or different bar size from Stores below.
            </p>
          )}
        </div>

        {/* 2. ALTERNATIVE / SUBSTITUTE MATERIAL SELECTION */}
        <div className="space-y-3 p-3 bg-surface border border-theme-subtle">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-primary flex items-center gap-1.5">
              <ArrowLeftRight size={13} className="text-indigo-500" />
              Proposed Alternative / Substitute Material <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setUseCustomMaterial(!useCustomMaterial);
                setSelectedInvId('');
              }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              {useCustomMaterial ? '← Select from Stores Catalog' : '+ Enter Custom Material'}
            </button>
          </div>

          {!useCustomMaterial ? (
            <div>
              <ProductAutocomplete
                value={selectedInvId}
                onChange={(val, inv) => {
                  handleSelectInventory(val);
                }}
                products={inventory}
                placeholder="Type to search alternative material / SKU..."
                className="text-xs py-1.5"
              />

              {selectedInvItem && (
                <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/20 text-[11px] flex items-center justify-between">
                  <span className="text-indigo-800 dark:text-indigo-300">
                    Stores Availability for Substitute: <strong>{selectedInvItem.quantity || 0} {selectedInvItem.unit || 'pcs'}</strong> in stock
                  </span>
                  <span className="font-mono font-bold text-primary">
                    Unit Cost: {formatCurrency(selectedInvItem.unitCost || 0)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={substituteMaterial}
                onChange={e => setSubstituteMaterial(e.target.value)}
                placeholder="e.g. SS316L Round Bar Ø50mm or EN8 High Tensile Shaft"
                className="w-full input-base text-xs font-semibold"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div>
              <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                Substitute Specifications / Remnant Dim
              </label>
              <input
                type="text"
                value={substituteSpec}
                onChange={e => setSubstituteSpec(e.target.value)}
                placeholder="e.g. Ø50mm x 550mm or Plate 12mm"
                className="w-full input-base text-xs"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                Required Quantity & Unit <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={substituteQty}
                  onChange={e => setSubstituteQty(Number(e.target.value))}
                  className="w-2/3 input-base text-xs font-mono font-bold"
                />
                <input
                  type="text"
                  value={substituteUnit}
                  onChange={e => setSubstituteUnit(e.target.value)}
                  placeholder="rods/pcs"
                  className="w-1/3 input-base text-xs text-center font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-secondary block mb-1">
                Unit Cost (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                value={substituteUnitCost}
                onChange={e => setSubstituteUnitCost(Number(e.target.value))}
                className="w-full input-base text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 3. REASON FOR SUBSTITUTION */}
        <div className="space-y-2 p-3 bg-surface2/30 border border-theme-subtle">
          <label className="text-xs font-bold text-primary block">
            Reason for Material Change / Stores Request <span className="text-red-500">*</span>
          </label>
          <select
            value={reasonCategory}
            onChange={e => setReasonCategory(e.target.value)}
            className="w-full input-base text-xs cursor-pointer font-medium"
          >
            <option value="Using Available Factory Remnant / Alternative Bar Size">
              Using Available Factory Remnant / Alternative Bar Size
            </option>
            <option value="Alternative Material Grade for Enhanced Specs / Performance">
              Alternative Material Grade for Enhanced Specs / Performance
            </option>
            <option value="Customer Technical Variation / Specification Revision">
              Customer Technical Variation / Specification Revision
            </option>
            <option value="Workshop Process Optimization / Available Machine Tooling">
              Workshop Process Optimization / Available Machine Tooling
            </option>
            <option value="Stores Shortage / Out of Stock">
              Stores Shortage / Out of Stock
            </option>
            <option value="Cost or Scrap Optimization">
              Cost or Scrap Optimization
            </option>
            <option value="Other Engineering Justification">
              Other Custom Engineering Justification
            </option>
          </select>

          <textarea
            value={customReasonNotes}
            onChange={e => setCustomReasonNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes / justification for Storekeeper and Department Head..."
            className="w-full input-base text-xs mt-1"
          />

          <div className="flex items-center gap-4 pt-1 text-[11px] text-secondary">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={requestFromStores}
                onChange={e => setRequestFromStores(e.target.checked)}
                className="rounded-none border-theme"
              />
              <span>Send Store Requisition notification to Storekeeper</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySales}
                onChange={e => setNotifySales(e.target.checked)}
                className="rounded-none border-theme"
              />
              <span>Inform Sales Team (if client specification is affected)</span>
            </label>
          </div>
        </div>

        {/* 4. EXECUTION ACTIONS */}
        <div className="pt-2 border-t border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={handleApprovalRequest}
              className="text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold"
              title="Send to Department Head in Approvals Hub before changing BOM"
            >
              Submit for Dept Head Sign-off
            </Button>

            {selectedInvItem && Number(selectedInvItem.quantity || 0) >= substituteQty && onOpenDirectIssue && (
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleDirectIssueNow}
                className="text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold"
                title="Change BOM and issue this stock right now to the job"
              >
                <Package size={12} className="mr-1" />
                Change & Issue Stock Now
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleDirectChange}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              title="Immediately update BOM material and notify Stores"
            >
              {submitting ? 'Updating...' : 'Direct Change BOM & Request Stores'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
