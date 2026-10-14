import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Edit2, Check, Star, Building2, Landmark, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';

export interface CompanyBankAccount {
  id: string;
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  isDefault?: boolean;
}

const DEFAULT_BANK_ACCOUNTS: CompanyBankAccount[] = [
  {
    id: 'bank_hnb',
    bankName: 'Hatton National Bank',
    branchName: 'Negombo',
    accountName: 'Rex Industries (Pvt) Ltd',
    accountNumber: '011010078028',
    swiftCode: 'HNBLLKLX',
    isDefault: true
  },
  {
    id: 'bank_com',
    bankName: 'Commercial Bank of Ceylon',
    branchName: 'Negombo',
    accountName: 'Rex Industries (Pvt) Ltd',
    accountNumber: '100012345678',
    swiftCode: 'CCBLLKLX',
    isDefault: false
  }
];

export const BankDetailsManager: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { toast, showConfirm } = useDialog();

  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = {
    bankName: '',
    branchName: '',
    accountName: settings.company_name || 'Rex Industries (Pvt) Ltd',
    accountNumber: '',
    swiftCode: '',
    isDefault: false
  };

  const [form, setForm] = useState(initialForm);

  // Load from settings or seed
  useEffect(() => {
    if (settings) {
      if (settings.company_bank_details) {
        try {
          const parsed = JSON.parse(settings.company_bank_details);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBankAccounts(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse company_bank_details', e);
        }
      }
      // If none exist yet, fallback to defaults
      setBankAccounts(DEFAULT_BANK_ACCOUNTS);
    }
  }, [settings?.company_bank_details]);

  const saveToSettings = async (list: CompanyBankAccount[]) => {
    setBankAccounts(list);
    await updateSettings({
      company_bank_details: JSON.stringify(list)
    });
  };

  const handleSaveAccount = async () => {
    if (!form.bankName.trim()) return toast('Bank Name is required', 'error');
    if (!form.accountNumber.trim()) return toast('Account Number is required', 'error');

    let updated: CompanyBankAccount[];

    if (editingId) {
      updated = bankAccounts.map(b => {
        if (b.id !== editingId) {
          return form.isDefault ? { ...b, isDefault: false } : b;
        }
        return {
          ...b,
          bankName: form.bankName.trim(),
          branchName: form.branchName.trim(),
          accountName: form.accountName.trim() || 'Rex Industries (Pvt) Ltd',
          accountNumber: form.accountNumber.trim(),
          swiftCode: form.swiftCode.trim(),
          isDefault: form.isDefault
        };
      });
      toast('Bank account updated successfully', 'success');
      setEditingId(null);
    } else {
      const newAcc: CompanyBankAccount = {
        id: 'bank_' + Date.now(),
        bankName: form.bankName.trim(),
        branchName: form.branchName.trim(),
        accountName: form.accountName.trim() || 'Rex Industries (Pvt) Ltd',
        accountNumber: form.accountNumber.trim(),
        swiftCode: form.swiftCode.trim(),
        isDefault: form.isDefault || bankAccounts.length === 0
      };

      if (newAcc.isDefault) {
        updated = [...bankAccounts.map(b => ({ ...b, isDefault: false })), newAcc];
      } else {
        updated = [...bankAccounts, newAcc];
      }
      toast('Bank account added successfully', 'success');
    }

    // Ensure at least one is default if list is not empty
    if (updated.length > 0 && !updated.some(b => b.isDefault)) {
      updated[0].isDefault = true;
    }

    await saveToSettings(updated);
    setForm({
      ...initialForm,
      accountName: settings.company_name || 'Rex Industries (Pvt) Ltd'
    });
  };

  const handleEdit = (acc: CompanyBankAccount) => {
    setEditingId(acc.id);
    setForm({
      bankName: acc.bankName,
      branchName: acc.branchName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      swiftCode: acc.swiftCode || '',
      isDefault: !!acc.isDefault
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      accountName: settings.company_name || 'Rex Industries (Pvt) Ltd'
    });
  };

  const handleSetDefault = async (id: string) => {
    const updated = bankAccounts.map(b => ({
      ...b,
      isDefault: b.id === id
    }));
    await saveToSettings(updated);
    toast('Default bank account updated', 'success');
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('Are you sure you want to delete this bank account?', 'Delete Bank Account', { confirmLabel: 'Delete' })) {
      let updated = bankAccounts.filter(b => b.id !== id);
      if (updated.length > 0 && !updated.some(b => b.isDefault)) {
        updated[0].isDefault = true;
      }
      await saveToSettings(updated);
      toast('Bank account removed', 'success');
      if (editingId === id) handleCancelEdit();
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            <Landmark className="text-rex-500" size={18} /> Company Bank Accounts
          </h2>
          <p className="text-xs text-muted mt-1">
            Configure multiple bank accounts for customer direct remittance and wire transfers. Choose which account to display when creating invoices.
          </p>
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="bg-surface2/50 p-4 rounded-xl border border-theme-subtle mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            {editingId ? 'Edit Bank Account' : 'Add New Bank Account'}
          </span>
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase">Bank Name *</label>
            <input
              placeholder="e.g. Hatton National Bank, Commercial Bank"
              className="input-base w-full py-1.5 text-xs mt-1"
              value={form.bankName}
              onChange={e => setForm({ ...form, bankName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase">Branch Name</label>
            <input
              placeholder="e.g. Negombo, City Office"
              className="input-base w-full py-1.5 text-xs mt-1"
              value={form.branchName}
              onChange={e => setForm({ ...form, branchName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase">Account Name</label>
            <input
              placeholder="e.g. Rex Industries (Pvt) Ltd"
              className="input-base w-full py-1.5 text-xs mt-1"
              value={form.accountName}
              onChange={e => setForm({ ...form, accountName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase">Account Number *</label>
            <input
              placeholder="e.g. 011010078028"
              className="input-base w-full py-1.5 text-xs mt-1 font-mono font-medium"
              value={form.accountNumber}
              onChange={e => setForm({ ...form, accountNumber: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase">SWIFT / Routing Code (Optional)</label>
            <input
              placeholder="e.g. HNBLLKLX"
              className="input-base w-full py-1.5 text-xs mt-1 font-mono"
              value={form.swiftCode}
              onChange={e => setForm({ ...form, swiftCode: e.target.value })}
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded border-theme-subtle text-rex-500 focus:ring-rex-500"
              />
              <span>Set as Default Remittance Account</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-theme-subtle/50">
          {editingId && (
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            icon={editingId ? Check : Plus}
            size="sm"
            onClick={handleSaveAccount}
          >
            {editingId ? 'Update Account' : 'Add Account'}
          </Button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
          Configured Bank Accounts ({bankAccounts.length})
        </label>

        {bankAccounts.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted border border-dashed border-theme-subtle rounded-xl">
            No bank accounts configured yet. Add your first bank account above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.map(acc => (
              <div
                key={acc.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  acc.isDefault
                    ? 'border-rex-500/50 bg-rex-500/5 shadow-sm'
                    : 'border-theme-subtle bg-surface/50 hover:bg-surface'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                        <Landmark size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                          {acc.bankName}
                          {acc.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Default
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted">{acc.branchName ? `${acc.branchName} Branch` : 'General'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!acc.isDefault && (
                        <button
                          onClick={() => handleSetDefault(acc.id)}
                          className="p-1.5 text-muted hover:text-amber-500 rounded-md hover:bg-surface2 transition-colors"
                          title="Set as Default"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-1.5 text-muted hover:text-blue-500 rounded-md hover:bg-surface2 transition-colors"
                        title="Edit Account"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-muted hover:text-red-500 rounded-md hover:bg-surface2 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-surface/60 rounded-lg p-2.5 text-xs space-y-1 border border-theme-subtle/50 mt-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted text-[11px] font-sans">A/C Number:</span>
                      <span className="font-bold text-primary tracking-wider">{acc.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted text-[11px] font-sans">A/C Name:</span>
                      <span className="font-medium text-secondary truncate max-w-[180px]">{acc.accountName}</span>
                    </div>
                    {acc.swiftCode && (
                      <div className="flex justify-between">
                        <span className="text-muted text-[11px] font-sans">SWIFT:</span>
                        <span className="text-muted">{acc.swiftCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
