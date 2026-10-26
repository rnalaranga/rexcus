import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Building2, User, Phone, Mail, MapPin, FileText, CreditCard, ShieldCheck } from 'lucide-react';
import { createSupplier } from '@/lib/api';

interface QuickSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSupplier: any) => void;
}

export const QuickSupplierModal: React.FC<QuickSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    category: 'Raw Materials',
    paymentTerms: 'Net 30 Days',
    vat: '',
    svat: '',
    brNumber: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      category: 'Raw Materials',
      paymentTerms: 'Net 30 Days',
      vat: '',
      svat: '',
      brNumber: '',
      notes: ''
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
      setError('Vendor / Company name is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        id: 'SUP-' + Date.now().toString().slice(-5),
        name: formData.name.trim(),
        company: formData.name.trim(),
        contactPerson: formData.contactName.trim() || formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        category: formData.category,
        paymentTerms: formData.paymentTerms,
        vat: formData.vat.trim(),
        svat: formData.svat.trim(),
        brNumber: formData.brNumber.trim(),
        status: 'Active',
        notes: formData.notes.trim()
      };

      const res = await createSupplier(payload);
      if (res && (res.success || res.id || !res.error)) {
        onSuccess(payload);
        handleClose();
      } else {
        setError(res?.error || 'Failed to create vendor');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Register New Vendor / Supplier" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 rounded text-xs">
            {error}
          </div>
        )}

        {/* Company & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">
              Vendor / Company Name <span className="text-rex-500">*</span>
            </label>
            <div className="relative">
              <Building2 size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Lanka Steel Mills (Pvt) Ltd"
                className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs font-semibold focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Contact Person</label>
            <div className="relative">
              <User size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Mr. Sunimal Fernando"
                className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs focus:border-primary"
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
              <option value="Raw Materials">Raw Materials (Steel/Aluminium/Brass)</option>
              <option value="Hardware & Tools">Hardware, Cutters & Tools</option>
              <option value="Machinery & Spares">Machinery & Spare Parts</option>
              <option value="Consumables">Consumables & Lubricants</option>
              <option value="Services & Subcontracting">Services & Subcontracting</option>
              <option value="Packaging">Packaging</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Phone Number</label>
            <div className="relative">
              <Phone size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+94 11 234 5678"
                className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs font-mono focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail size={13} className="absolute left-2.5 top-2.5 text-muted" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="sales@vendor.lk"
                className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase mb-1">Factory / Office Address</label>
          <div className="relative">
            <MapPin size={13} className="absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. No. 45, Industrial Zone, Ekala, Ja-Ela"
              className="w-full bg-surface border border-theme-subtle pl-8 pr-3 py-2 rounded text-xs focus:border-primary"
            />
          </div>
        </div>

        {/* Tax & Financial Info */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-theme-subtle">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payment Terms</label>
            <select
              value={formData.paymentTerms}
              onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
              className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs"
            >
              <option value="Net 30 Days">Net 30 Days</option>
              <option value="Net 15 Days">Net 15 Days</option>
              <option value="Net 60 Days">Net 60 Days</option>
              <option value="Cash on Delivery">Cash on Delivery (COD)</option>
              <option value="Advance Required">100% Advance</option>
              <option value="Immediate">Immediate Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">VAT No</label>
            <input
              type="text"
              value={formData.vat}
              onChange={e => setFormData({ ...formData, vat: e.target.value })}
              placeholder="e.g. 102345678"
              className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">SVAT No</label>
            <input
              type="text"
              value={formData.svat}
              onChange={e => setFormData({ ...formData, svat: e.target.value })}
              placeholder="e.g. SVAT-0098"
              className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">BR Number</label>
            <input
              type="text"
              value={formData.brNumber}
              onChange={e => setFormData({ ...formData, brNumber: e.target.value })}
              placeholder="e.g. PV 123456"
              className="w-full bg-surface border border-theme-subtle px-2.5 py-1.5 rounded text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register & Select Vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
