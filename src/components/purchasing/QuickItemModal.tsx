import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Package, Hash, Tag, Layers, DollarSign, AlertCircle } from 'lucide-react';
import { createInventoryItem } from '@/lib/api';

interface QuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newItem: any) => void;
}

export const QuickItemModal: React.FC<QuickItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: 'MAT-' + Date.now().toString().slice(-4),
    category: 'Raw Materials',
    unit: 'Nos',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '5',
    stock: '0',
    description: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      sku: 'MAT-' + Date.now().toString().slice(-4),
      category: 'Raw Materials',
      unit: 'Nos',
      costPrice: '',
      sellingPrice: '',
      reorderLevel: '5',
      stock: '0',
      description: ''
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Item name / material description is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const generatedId = formData.sku.trim() || ('ITEM-' + Date.now().toString().slice(-5));
      const payload = {
        id: generatedId,
        sku: generatedId,
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        uom: formData.unit,
        costPrice: Number(formData.costPrice) || 0,
        unitPrice: Number(formData.costPrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || Number(formData.costPrice) || 0,
        reorderLevel: Number(formData.reorderLevel) || 5,
        minStock: Number(formData.reorderLevel) || 5,
        stock: Number(formData.stock) || 0,
        currentStock: Number(formData.stock) || 0,
        description: formData.description.trim() || formData.name.trim(),
        status: 'Active'
      };

      const res = await createInventoryItem(payload);
      if (res && (res.success || res.id || !res.error)) {
        onSuccess(payload);
        handleClose();
      } else {
        setError(res?.error || 'Failed to create inventory item');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Register New Material / Inventory Item" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-muted uppercase mb-1">
            Material / Item Name <span className="text-rex-500">*</span>
          </label>
          <div className="relative">
            <Package size={13} className="absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. SS304 Round Bar Ø 50mm x 6M"
              className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs font-semibold focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">SKU / Code</label>
            <div className="relative">
              <Hash size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs font-mono font-bold focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded text-xs font-medium focus:border-primary"
            >
              <option value="Raw Materials">Raw Materials (Shafts, Plates, Rods)</option>
              <option value="Hardware">Hardware & Fasteners</option>
              <option value="Consumables">Consumables & Cutting Oils</option>
              <option value="Machinery Parts">Machinery & Tooling Spares</option>
              <option value="Finished Goods">Finished Products</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Unit (UOM)</label>
            <select
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
              className="w-full bg-surface border border-theme-subtle px-2 py-2 rounded text-xs font-semibold focus:border-primary"
            >
              <option value="Nos">Nos (Pieces)</option>
              <option value="Kg">Kg (Kilograms)</option>
              <option value="Meters">Meters (M)</option>
              <option value="Rods">Rods (Lengths)</option>
              <option value="Plates">Plates (Sheets)</option>
              <option value="Liters">Liters</option>
              <option value="Boxes">Boxes</option>
              <option value="Sets">Sets</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Standard Cost (LKR)</label>
            <input
              type="number"
              step="any"
              value={formData.costPrice}
              onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="0.00"
              className="w-full bg-surface border border-theme-subtle px-2.5 py-2 rounded text-xs font-mono font-bold text-right focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Reorder Level</label>
            <input
              type="number"
              value={formData.reorderLevel}
              onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
              className="w-full bg-surface border border-theme-subtle px-2.5 py-2 rounded text-xs font-mono text-center focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-muted uppercase mb-1">Specifications / Notes</label>
          <input
            type="text"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. Grade SS304, Cold drawn, tolerance h9"
            className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create & Select Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
