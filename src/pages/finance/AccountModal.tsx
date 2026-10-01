import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createAccount, updateAccount } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { toast, showError } = useDialog();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Asset',
    subtype: '',
    balance: 0
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        type: initialData.type || 'Asset',
        subtype: initialData.subtype || '',
        balance: Number(initialData.balance) || 0
      });
    } else if (isOpen && !initialData) {
      setFormData({ code: '', name: '', type: 'Asset', subtype: '', balance: 0 });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        const res = await updateAccount(initialData.id, formData);
        if (!res.success) throw new Error('Failed to update account');
        toast(`"${formData.name}" account updated successfully!`, 'success');
      } else {
        const payload = { id: crypto.randomUUID(), ...formData };
        const res = await createAccount(payload);
        if (!res.success) throw new Error('Failed to create account');
        toast(`"${formData.name}" account added successfully!`, 'success');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showError('Failed to save account. The account code may already be in use.', 'Save Failed');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Account" : "Add New Account"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Account Code</label>
            <input
              required
              type="text"
              value={formData.code}
              onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-theme rounded-md text-sm text-primary"
              placeholder="e.g. 1000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Account Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-theme rounded-md text-sm text-primary"
              placeholder="e.g. Cash"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Account Type</label>
            <select
              required
              value={formData.type}
              onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-theme rounded-md text-sm text-primary"
            >
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Sub-Type</label>
            <input
              required
              type="text"
              value={formData.subtype}
              onChange={e => setFormData(p => ({ ...p, subtype: e.target.value }))}
              className="w-full px-3 py-2 bg-surface border border-theme rounded-md text-sm text-primary"
              placeholder="e.g. Current Asset"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-secondary">Opening Balance</label>
          <input
            required
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={e => setFormData(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 bg-surface border border-theme rounded-md text-sm text-primary"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
