import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Star, 
  Check, 
  Clock, 
  Truck, 
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { Modal } from '@/components/ui/Modal';

export interface QuotationTermsPreset {
  id: string;
  name: string;
  paymentTerms: string;
  validity: string;
  delivery: string;
  isDefault?: boolean;
}

export const DEFAULT_TERMS_PRESETS: QuotationTermsPreset[] = [
  {
    id: 'tc_std_30d',
    name: 'Standard 30 Days Credit',
    paymentTerms: '30 days from date of delivery',
    validity: '30 Days',
    delivery: '2-3 weeks from confirmed PO',
    isDefault: true
  },
  {
    id: 'tc_50_adv',
    name: '50% Advance + Balance on Delivery',
    paymentTerms: '50% Advance with confirmed PO, balance 50% upon delivery',
    validity: '14 Days',
    delivery: '10-15 working days',
    isDefault: false
  },
  {
    id: 'tc_cod',
    name: 'Immediate Payment on Delivery (COD)',
    paymentTerms: '100% on delivery against invoice',
    validity: '30 Days',
    delivery: '3-5 working days / Ex-stock',
    isDefault: false
  },
  {
    id: 'tc_milestone',
    name: 'Progressive Milestone Payment',
    paymentTerms: '30% Advance, 40% on dispatch, 30% after installation & sign-off',
    validity: '30 Days',
    delivery: '4-6 weeks from approved drawings',
    isDefault: false
  }
];

export const TermsConditionsManager: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { toast, showConfirm } = useDialog();

  const [presets, setPresets] = useState<QuotationTermsPreset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = {
    name: '',
    paymentTerms: '',
    validity: '30 Days',
    delivery: '',
    isDefault: false
  };

  const [form, setForm] = useState(initialForm);

  // Load presets from settings
  useEffect(() => {
    if (settings) {
      if (settings.quotation_terms_presets) {
        try {
          const parsed = JSON.parse(settings.quotation_terms_presets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPresets(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse quotation_terms_presets', e);
        }
      }
      setPresets(DEFAULT_TERMS_PRESETS);
    }
  }, [settings?.quotation_terms_presets]);

  const saveToSettings = async (list: QuotationTermsPreset[]) => {
    setPresets(list);
    await updateSettings({
      quotation_terms_presets: JSON.stringify(list)
    });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      paymentTerms: '30 days from date of invoice',
      validity: '30 Days',
      delivery: '2-3 weeks from confirmed PO',
      isDefault: presets.length === 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (preset: QuotationTermsPreset) => {
    setEditingId(preset.id);
    setForm({
      name: preset.name,
      paymentTerms: preset.paymentTerms || '',
      validity: preset.validity || '30 Days',
      delivery: preset.delivery || '',
      isDefault: !!preset.isDefault
    });
    setIsModalOpen(true);
  };

  const handleSavePreset = async () => {
    if (!form.name.trim()) return toast('Preset Name is required', 'error');
    if (!form.paymentTerms.trim()) return toast('Payment Terms are required', 'error');

    let updated: QuotationTermsPreset[];

    if (editingId) {
      updated = presets.map(p => {
        if (p.id !== editingId) {
          return form.isDefault ? { ...p, isDefault: false } : p;
        }
        return {
          ...p,
          name: form.name.trim(),
          paymentTerms: form.paymentTerms.trim(),
          validity: form.validity.trim() || '30 Days',
          delivery: form.delivery.trim(),
          isDefault: form.isDefault
        };
      });
    } else {
      const newPreset: QuotationTermsPreset = {
        id: `tc_${Date.now()}`,
        name: form.name.trim(),
        paymentTerms: form.paymentTerms.trim(),
        validity: form.validity.trim() || '30 Days',
        delivery: form.delivery.trim(),
        isDefault: form.isDefault || presets.length === 0
      };

      updated = form.isDefault
        ? [...presets.map(p => ({ ...p, isDefault: false })), newPreset]
        : [...presets, newPreset];
    }

    try {
      await saveToSettings(updated);
      toast(editingId ? 'Terms preset updated!' : 'New Terms preset created!', 'success');
      setIsModalOpen(false);
    } catch (e: any) {
      toast('Failed to save terms preset: ' + e.message, 'error');
    }
  };

  const handleToggleDefault = async (id: string) => {
    const updated = presets.map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    try {
      await saveToSettings(updated);
      toast('Default terms preset updated', 'success');
    } catch (e: any) {
      toast('Failed to update default: ' + e.message, 'error');
    }
  };

  const handleDeletePreset = async (preset: QuotationTermsPreset) => {
    if (presets.length <= 1) {
      return toast('You must keep at least one terms preset.', 'error');
    }
    const confirmed = await showConfirm(
      `Are you sure you want to delete "${preset.name}"?`,
      'Delete Terms Preset',
      { confirmLabel: 'Delete' }
    );
    if (!confirmed) return;

    let updated = presets.filter(p => p.id !== preset.id);
    if (preset.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    try {
      await saveToSettings(updated);
      toast('Preset deleted successfully', 'success');
    } catch (e: any) {
      toast('Failed to delete preset: ' + e.message, 'error');
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rex-500" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">
              Quotation Terms & Conditions Presets
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Pre-configure standard Payment terms, Validity periods, and Delivery timelines to quickly select during quotation creation.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleOpenAdd}
          className="text-xs shrink-0"
        >
          Add Terms Preset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`border rounded-xl p-4 transition-all relative flex flex-col justify-between ${
              preset.isDefault
                ? 'border-rex-500/50 bg-rex-500/5 shadow-xs'
                : 'border-theme-subtle hover:border-theme bg-surface/40'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-primary">{preset.name}</h3>
                  {preset.isDefault && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-rex-500 text-white px-1.5 py-0.5 rounded">
                      <Star size={10} className="fill-current" /> Default
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!preset.isDefault && (
                    <button
                      onClick={() => handleToggleDefault(preset.id)}
                      className="p-1 hover:bg-surface2 rounded text-muted hover:text-amber-500 transition-colors"
                      title="Set as Default Preset"
                    >
                      <Star size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(preset)}
                    className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
                    title="Edit Preset"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset)}
                    className="p-1 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors"
                    title="Delete Preset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] mt-3">
                <div className="flex items-start gap-2">
                  <CreditCard size={13} className="text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-muted text-[10px] uppercase block">Payment Terms:</span>
                    <span className="text-primary font-medium">{preset.paymentTerms || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-theme-subtle/40">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-muted block uppercase font-bold">Validity</span>
                      <span className="text-primary font-medium">{preset.validity || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Truck size={12} className="text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[9px] text-muted block uppercase font-bold">Delivery</span>
                      <span className="text-primary font-medium">{preset.delivery || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Terms & Conditions Preset' : 'Create Terms & Conditions Preset'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
              Preset Title / Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Standard 30 Days Credit"
              className="w-full bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs text-primary focus:border-rex-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
              Payment Terms <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              value={form.paymentTerms}
              onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
              placeholder="e.g. 30 days from date of delivery / 50% Advance with confirmed PO"
              className="w-full bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs text-primary focus:border-rex-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Validity
              </label>
              <input
                type="text"
                value={form.validity}
                onChange={e => setForm({ ...form, validity: e.target.value })}
                placeholder="e.g. 30 Days"
                className="w-full bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs text-primary focus:border-rex-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Delivery Timeline
              </label>
              <input
                type="text"
                value={form.delivery}
                onChange={e => setForm({ ...form, delivery: e.target.value })}
                placeholder="e.g. 2-3 weeks from confirmed PO"
                className="w-full bg-surface border border-theme-subtle rounded-xl px-3 py-2 text-xs text-primary focus:border-rex-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-theme-subtle text-rex-500 focus:ring-rex-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-primary">
                Set as Default Terms Preset for new quotations
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={Check} onClick={handleSavePreset}>
              {editingId ? 'Update Preset' : 'Save Preset'}
            </Button>
          </div>
        </div>
      </Modal>
    </GlassCard>
  );
};
