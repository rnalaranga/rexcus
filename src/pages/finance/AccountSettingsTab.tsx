import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAccounts } from '@/hooks/useFinance';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { 
  Save, 
  RotateCcw, 
  FileText, 
  Receipt, 
  Percent, 
  Package, 
  CheckCircle2, 
  DollarSign,
  ArrowRightLeft
} from 'lucide-react';

interface MappingField {
  key: string;
  label: string;
  description: string;
  typeFilter?: string | string[];
  defaultCode?: string;
  defaultName?: string;
  placeholder?: string;
}

interface MappingSection {
  title: string;
  icon: any;
  description: string;
  fields: MappingField[];
}

const MAPPING_SECTIONS: MappingSection[] = [
  {
    title: 'Customer Invoicing & Receivables (Sales)',
    icon: FileText,
    description: 'Default accounts used when generating customer invoices, debit notes, and tracking credit sales.',
    fields: [
      {
        key: 'default_ar_account_id',
        label: 'Accounts Receivable (Trade Debtors)',
        description: 'Debited when an invoice is issued to a customer on credit.',
        typeFilter: 'Asset',
        defaultCode: '1200',
        defaultName: 'Accounts Receivable'
      },
      {
        key: 'default_sales_account_id',
        label: 'Sales Revenue Account',
        description: 'Credited with net sales amount (excluding taxes) when invoicing products or services.',
        typeFilter: 'Revenue',
        defaultCode: '4000',
        defaultName: 'Sales Revenue'
      },
      {
        key: 'default_customer_advance_account_id',
        label: 'Customer Advances / Unearned Revenue',
        description: 'Credited when advance payment is received prior to final invoice generation.',
        typeFilter: 'Liability',
        defaultCode: '2150',
        defaultName: 'Customer Advances'
      },
      {
        key: 'default_sales_discount_account_id',
        label: 'Sales Discounts Allowed',
        description: 'Debited when settlement or early payment discounts are given to customers.',
        typeFilter: 'Expense',
        defaultCode: '5050',
        defaultName: 'Discounts Allowed'
      }
    ]
  },
  {
    title: 'Vendor Bills & Payables (Purchasing & Expenses)',
    icon: Receipt,
    description: 'Default accounts used when entering supplier bills, material receipts, and operational expenses.',
    fields: [
      {
        key: 'default_ap_account_id',
        label: 'Accounts Payable (Trade Creditors)',
        description: 'Credited with total payable consideration owed to vendors when a bill is approved.',
        typeFilter: 'Liability',
        defaultCode: '2000',
        defaultName: 'Accounts Payable'
      },
      {
        key: 'default_purchase_expense_account_id',
        label: 'Raw Materials / Direct Purchases Expense',
        description: 'Debited for standard inventory item purchases and direct manufacturing materials.',
        typeFilter: 'Expense',
        defaultCode: '5100',
        defaultName: 'Raw Materials & Consumables'
      },
      {
        key: 'default_subcontract_expense_account_id',
        label: 'Subcontracting / Machining Expense',
        description: 'Debited when paying external machine shops or subcontracted services.',
        typeFilter: 'Expense',
        defaultCode: '4002',
        defaultName: 'Subcontract / Outsourcing Expense'
      },
      {
        key: 'default_electricity_account_id',
        label: 'Electricity / Utility Expense',
        description: 'Debited automatically for utility bills (e.g. CEB / Electricity charges).',
        typeFilter: 'Expense',
        defaultCode: '5001',
        defaultName: 'Electricity & Utilities'
      },
      {
        key: 'default_fuel_account_id',
        label: 'Fuel & Diesel Expense',
        description: 'Debited for generator fuel, machinery diesel, and transport fuel bills.',
        typeFilter: 'Expense',
        defaultCode: '5000',
        defaultName: 'Fuel & Diesel Expense'
      },
      {
        key: 'default_maintenance_account_id',
        label: 'Repairs & Machinery Maintenance',
        description: 'Debited for plant, machinery maintenance, and spare parts replacement bills.',
        typeFilter: 'Expense',
        defaultCode: '5002',
        defaultName: 'Repairs & Maintenance'
      }
    ]
  },
  {
    title: 'Taxes & Statutory Levies (IRD Sri Lanka)',
    icon: Percent,
    description: 'Accounts linked to VAT (Value Added Tax) and SSCL (Social Security Contribution Levy).',
    fields: [
      {
        key: 'default_vat_output_account_id',
        label: 'Output VAT Payable (Sales VAT)',
        description: 'Credited with VAT collected on customer sales invoices (Liability).',
        typeFilter: ['Liability', 'Asset'],
        defaultCode: '2210',
        defaultName: 'Output VAT Payable'
      },
      {
        key: 'default_vat_input_account_id',
        label: 'Input VAT Recoverable (Purchase VAT)',
        description: 'Debited with claimable input tax paid on vendor purchases (Asset).',
        typeFilter: ['Asset', 'Expense'],
        defaultCode: '1690',
        defaultName: 'VAT Input Tax Recoverable'
      },
      {
        key: 'default_sscl_payable_account_id',
        label: 'Output SSCL Payable (Sales SSCL)',
        description: 'Credited with SSCL 2.5% payable collected on customer sales (Liability).',
        typeFilter: 'Liability',
        defaultCode: '2220',
        defaultName: 'SSCL Payable'
      },
      {
        key: 'default_sscl_expense_account_id',
        label: 'SSCL Expense (Non-claimable Purchase Tax)',
        description: 'Debited for non-claimable SSCL 2.5% paid on incoming vendor bills (Expense).',
        typeFilter: 'Expense',
        defaultCode: '5010',
        defaultName: 'SSCL Expense (Non-claimable)'
      }
    ]
  },
  {
    title: 'Payments & Treasury (Cash & Banking)',
    icon: DollarSign,
    description: 'Default liquidity accounts when clearing invoice receipts and vendor settlements.',
    fields: [
      {
        key: 'default_bank_account_id',
        label: 'Primary Bank Account (LKR)',
        description: 'Default bank account credited/debited on bank transfer settlements.',
        typeFilter: 'Asset',
        defaultCode: '1000',
        defaultName: 'Bank Account (LKR)'
      },
      {
        key: 'default_cash_account_id',
        label: 'Cash in Hand Account',
        description: 'Default liquidity account for petty cash and counter cash transactions.',
        typeFilter: 'Asset',
        defaultCode: '1100',
        defaultName: 'Cash in Hand'
      },
      {
        key: 'default_usd_bank_account_id',
        label: 'Foreign Currency Account (USD)',
        description: 'Default account for USD settlements and foreign export receipts.',
        typeFilter: 'Asset',
        defaultCode: '1010',
        defaultName: 'USD Foreign Currency Bank Account'
      },
      {
        key: 'default_cheque_clearing_account_id',
        label: 'Cheque In-Transit & Realization Clearing Account (Asset/Liability)',
        description: 'Account holding uncleared cheques until the realization date before final credit to bank.',
        typeFilter: ['Asset', 'Liability'],
        defaultCode: '1050',
        defaultName: 'Cheques In-Transit / Clearing Account'
      }
    ]
  },
  {
    title: 'Inventory, Scrap & Equity',
    icon: Package,
    description: 'Accounts for inventory valuation sync, manufacturing shrinkage, scrap, and opening balances.',
    fields: [
      {
        key: 'default_inventory_asset_account_id',
        label: 'Finished Goods & Stock Inventory Asset',
        description: 'Balance sheet asset representing on-hand raw material and finished stock value.',
        typeFilter: 'Asset',
        defaultCode: '1600',
        defaultName: 'Inventory Asset'
      },
      {
        key: 'default_scrap_income_account_id',
        label: 'Scrap & Waste Sales Income',
        description: 'Income recognized from metallic offcuts, swarf, and workshop scrap recovery.',
        typeFilter: ['Revenue', 'Expense'],
        defaultCode: '5080',
        defaultName: 'Scrap Sales / Shrinkage'
      },
      {
        key: 'default_opening_equity_account_id',
        label: 'Opening Balance Equity / Retained Earnings',
        description: 'Offsetting equity account for historical ledger migrations and opening balances.',
        typeFilter: 'Equity',
        defaultCode: '3900',
        defaultName: 'Retained Earnings / Share Capital'
      }
    ]
  }
];

export const AccountSettingsTab: React.FC = () => {
  const { data: accounts = [], loading: loadingAccounts } = useAccounts();
  const { settings, updateSettings, loading: loadingSettings } = useSettings();
  const { toast, showConfirm } = useDialog();

  const [formState, setFormState] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from settings or fallback to sensible auto-matched accounts
  useEffect(() => {
    if (loadingSettings || loadingAccounts || accounts.length === 0) return;

    const initial: Record<string, string> = {};
    MAPPING_SECTIONS.forEach(sec => {
      sec.fields.forEach(f => {
        const existingVal = settings[f.key];
        if (existingVal) {
          initial[f.key] = existingVal;
        } else {
          const match = accounts.find((a: any) => 
            (f.defaultCode && a.code === f.defaultCode) ||
            (f.defaultName && a.name?.toLowerCase().includes(f.defaultName.toLowerCase()))
          );
          if (match) {
            initial[f.key] = match.id;
          } else {
            initial[f.key] = '';
          }
        }
      });
    });

    setFormState(initial);
    setHasChanges(false);
  }, [settings, accounts, loadingSettings, loadingAccounts]);

  const handleChange = (key: string, accountId: string) => {
    setFormState(prev => {
      const updated = { ...prev, [key]: accountId };
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(formState);
      toast('Default account settings saved successfully!', 'success');
      setHasChanges(false);
    } catch (err: any) {
      toast('Failed to save account settings: ' + (err.message || 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToAuto = async () => {
    const confirmed = await showConfirm(
      'Reset all account links to auto-detected system defaults based on Chart of Accounts codes?',
      'Reset Account Defaults',
      { confirmLabel: 'Reset' }
    );
    if (!confirmed) return;

    const resetValues: Record<string, string> = {};
    MAPPING_SECTIONS.forEach(sec => {
      sec.fields.forEach(f => {
        const match = accounts.find((a: any) => 
          (f.defaultCode && a.code === f.defaultCode) ||
          (f.defaultName && a.name?.toLowerCase().includes(f.defaultName.toLowerCase()))
        );
        resetValues[f.key] = match ? match.id : '';
      });
    });

    setFormState(resetValues);
    setHasChanges(true);
    toast('Account links reset to recommended defaults. Click "Save Changes" to apply.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <GlassCard className="p-4 border-l-4 border-l-rex-500 bg-surface/70">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rex-500/10 text-rex-600 dark:text-rex-400 mt-0.5">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                Default Account Mapping & GL Link Settings
              </h2>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
                Configure which General Ledger accounts in your Chart of Accounts receive automated postings for 
                <strong> Customer Invoices</strong>, <strong>Vendor Bills & Expenses</strong>, <strong>VAT/SSCL Taxes</strong>, 
                and <strong>Payment Settlements</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetToAuto}
              disabled={saving}
              title="Auto-detect matches based on standard COA codes"
            >
              Auto-Link Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={hasChanges ? 'animate-pulse' : ''}
            >
              {saving ? 'Saving...' : hasChanges ? 'Save Changes *' : 'Saved'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Mapping Sections */}
      <div className="grid grid-cols-1 gap-6">
        {MAPPING_SECTIONS.map((section, idx) => {
          const SectionIcon = section.icon;
          return (
            <GlassCard key={idx} className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-theme pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-surface2 text-primary border border-theme">
                    <SectionIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary">{section.title}</h3>
                    <p className="text-xs text-muted">{section.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {section.fields.map(field => {
                  const currentValue = formState[field.key] || '';
                  const selectedAccount = accounts.find((a: any) => a.id === currentValue);

                  return (
                    <div 
                      key={field.key} 
                      className="p-3.5 rounded-lg border border-theme bg-surface2/40 hover:border-rex-500/30 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                            {field.label}
                          </label>
                          {selectedAccount && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rex-500/10 text-rex-600 dark:text-rex-300 border border-rex-500/20">
                              {selectedAccount.code || 'COA'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted mb-2.5 leading-snug">
                          {field.description}
                        </p>
                      </div>

                      <div className="mt-1">
                        <AccountAutocomplete
                          value={currentValue}
                          onChange={(accId) => handleChange(field.key, accId)}
                          typeFilter={field.typeFilter}
                          placeholder={field.placeholder || `Search ${field.label}...`}
                          className="w-full text-xs"
                        />
                        {selectedAccount && (
                          <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                            <span className="truncate">Type: <strong>{selectedAccount.type}</strong> ({selectedAccount.subtype || 'Standard'})</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Linked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Floating Save Bar if changes are unsaved */}
      {hasChanges && (
        <div className="sticky bottom-4 z-20 p-3 bg-surface border border-rex-500/40 rounded-xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span>You have unsaved account mapping changes.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormState(settings);
                setHasChanges(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
