import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Printer, Calendar,
  ChevronLeft, ChevronRight, Search, Trash2, ArrowRightLeft,
  DollarSign, CheckCircle2, Clock, FileText, User, Tag, BookOpen, AlertCircle, Coins,
  Check, X, Camera, ShieldCheck, Smartphone, Upload, Paperclip, Eye
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { useCashbook, useAccounts } from '@/hooks/useFinance';
import { 
  createCashbookEntry, deleteCashbookEntry, approveCashbookEntry, 
  rejectCashbookEntry, setCashbookFloat, CashbookEntry, uploadFileToStorage 
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export const DailyCashbook: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast, showError, showConfirm } = useDialog();

  // Date state (defaults to today)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingFloat, setIsSubmittingFloat] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [viewReceiptModal, setViewReceiptModal] = useState<string | null>(null);

  // Float modal state
  const [floatAmount, setFloatAmount] = useState('');
  const [floatFundingSource, setFloatFundingSource] = useState('acc_1000');
  const [floatNotes, setFloatNotes] = useState('Petty Cash Initial Float / Replenishment');

  // Hook data
  const { data: cashbookData, loading, refetch } = useCashbook(selectedDate, selectedCashAccountId || undefined);
  const { data: allAccounts } = useAccounts();

  // Form state
  const [entryType, setEntryType] = useState<'IN' | 'OUT'>('OUT');
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [entryTime, setEntryTime] = useState<string>(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const [amount, setAmount] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [formCashAccountId, setFormCashAccountId] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cheque' | 'Bank Transfer'>('Cash');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(todayStr);
  const [bankName, setBankName] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [depositSlip, setDepositSlip] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const handleCashbookSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSlip(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUri = reader.result as string;
      setDepositSlip(rawDataUri);
      try {
        const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'slips');
        if (uploaded && uploaded.url) {
          setDepositSlip(uploaded.url);
        }
      } catch (err) {
        console.warn('Storage upload error, keeping dataUri fallback:', err);
      } finally {
        setIsUploadingSlip(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Supplier Settlement state
  const [payeeCategory, setPayeeCategory] = useState<'expense' | 'supplier'>('expense');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [loadingSupplierBills, setLoadingSupplierBills] = useState<boolean>(false);
  const [relatedBillId, setRelatedBillId] = useState<string>('');
  const [relatedBillNo, setRelatedBillNo] = useState<string>('');

  // Fetch unpaid bills when supplier selected
  React.useEffect(() => {
    if (payeeCategory === 'supplier' && selectedSupplierId) {
      setLoadingSupplierBills(true);
      fetch(`/api/purchasing/bills?supplierId=${encodeURIComponent(selectedSupplierId)}&status=unpaid`)
        .then(r => r.json())
        .then(res => {
          const list = Array.isArray(res) ? res : (res.bills || []);
          setSupplierBills(list);
          setLoadingSupplierBills(false);
        })
        .catch(() => {
          setSupplierBills([]);
          setLoadingSupplierBills(false);
        });
    } else {
      setSupplierBills([]);
    }
  }, [payeeCategory, selectedSupplierId]);

  // Keep formCashAccountId synchronized with selected or default cash account
  React.useEffect(() => {
    if (cashbookData?.cashAccount?.id) {
      if (!selectedCashAccountId) {
        setSelectedCashAccountId(cashbookData.cashAccount.id);
      }
      if (!formCashAccountId) {
        setFormCashAccountId(cashbookData.cashAccount.id);
      }
    }
  }, [cashbookData, selectedCashAccountId, formCashAccountId]);

  // Date navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Filter accounts for target selection
  const accountsByType = useMemo(() => {
    const groups: Record<string, any[]> = {
      Expense: [],
      Revenue: [],
      Asset: [],
      Liability: [],
      Equity: []
    };
    (allAccounts || []).forEach(acc => {
      const type = acc.type || 'Expense';
      if (groups[type]) {
        groups[type].push(acc);
      } else {
        groups.Expense.push(acc);
      }
    });
    return groups;
  }, [allAccounts]);

  // Quick preset chips for speedy entry
  const quickExpensePresets = [
    { label: 'Tea & Refreshments', text: 'Daily tea and refreshments', codePrefix: '6' },
    { label: 'Fuel / Traveling', text: 'Vehicle fuel & traveling expenses', codePrefix: '6' },
    { label: 'Office Stationery', text: 'Office supplies & stationery', codePrefix: '6' },
    { label: 'Daily Wages / Labor', text: 'Daily wages payment', codePrefix: '5' },
    { label: 'Vehicle Repairs', text: 'Vehicle maintenance & service', codePrefix: '6' },
    { label: 'Hardware & Consumables', text: 'Factory consumables & small tools', codePrefix: '5' }
  ];

  const quickIncomePresets = [
    { label: 'Customer Cash Advance', text: 'Cash advance from customer', codePrefix: '2' },
    { label: 'Direct Cash Sale', text: 'Direct counter cash sale', codePrefix: '4' },
    { label: 'Scrap / Remnant Sale', text: 'Cash received from scrap metal sale', codePrefix: '4' },
    { label: 'Cash Inflow from Bank', text: 'Cash withdrawn from Commercial Bank', codePrefix: '1' }
  ];

  const applyPreset = (preset: { label: string; text: string; codePrefix: string }) => {
    setParticulars(preset.text);
    // Auto-suggest appropriate account matching prefix
    const matchingAcc = (allAccounts || []).find(a => 
      a.code.startsWith(preset.codePrefix) || 
      a.name.toLowerCase().includes(preset.label.toLowerCase().split(' ')[0])
    );
    if (matchingAcc) {
      setTargetAccountId(matchingAcc.id);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = (presetType: 'IN' | 'OUT' = 'OUT') => {
    setEntryType(presetType);
    setEntryDate(selectedDate);
    setEntryTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setAmount('');
    setParticulars('');
    setPartyName('');
    setReferenceNo('');
    setPaymentMethod('Cash');
    setChequeNo('');
    setChequeDate(selectedDate);
    setBankName('');
    setTransactionRef('');
    setNotes('');
    setPayeeCategory('expense');
    setSelectedSupplierId('');
    setSupplierBills([]);
    setRelatedBillId('');
    setRelatedBillNo('');
    setFormCashAccountId(selectedCashAccountId || (cashbookData?.cashAccount?.id || ''));
    
    // Default account depending on entry type
    if (presetType === 'OUT') {
      const defaultExp = (allAccounts || []).find(a => a.type === 'Expense');
      setTargetAccountId(defaultExp ? defaultExp.id : '');
    } else {
      const defaultRev = (allAccounts || []).find(a => a.type === 'Revenue' || a.subtype === 'Current Liability');
      setTargetAccountId(defaultRev ? defaultRev.id : '');
    }
    setIsAddModalOpen(true);
  };

  // Handle Create Entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Please enter a valid amount greater than 0.', 'Validation Error');
      return;
    }
    if (!particulars.trim()) {
      showError('Particulars / description is required.', 'Validation Error');
      return;
    }
    if (!targetAccountId) {
      showError('Please select a Target Chart of Account.', 'Validation Error');
      return;
    }
    if (!formCashAccountId) {
      showError('Please select the Cash / Bank Account.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCashbookEntry({
        date: entryDate,
        time: entryTime,
        entryType,
        amount: numAmount,
        particulars: particulars.trim(),
        accountId: targetAccountId,
        cashAccountId: formCashAccountId,
        referenceNo: referenceNo.trim() || undefined,
        partyName: partyName.trim() || undefined,
        paymentMethod,
        chequeNo: paymentMethod === 'Cheque' ? (chequeNo.trim() || referenceNo.trim() || undefined) : undefined,
        chequeDate: paymentMethod === 'Cheque' ? (chequeDate || entryDate) : undefined,
        bankName: paymentMethod === 'Cheque' ? (bankName.trim() || undefined) : undefined,
        chequeStatus: paymentMethod === 'Cheque' ? 'Pending' : undefined,
        transactionRef: paymentMethod === 'Bank Transfer' ? (transactionRef.trim() || referenceNo.trim() || undefined) : undefined,
        depositSlip: depositSlip || undefined,
        supplierId: payeeCategory === 'supplier' ? (selectedSupplierId || undefined) : undefined,
        relatedBillId: relatedBillId || undefined,
        createdBy: user?.name || user?.username || 'Cashier',
        notes: notes.trim() || undefined
      });

      toast(`Cash ${entryType === 'IN' ? 'Receipt' : 'Payment'} of ${formatCurrency(numAmount)} recorded successfully!`, 'success');
      setIsAddModalOpen(false);
      refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to record entry', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (entry: CashbookEntry) => {
    const ok = await showConfirm(
      `Are you sure you want to delete this cash entry of ${formatCurrency(entry.amount)} (${entry.particulars})?\n\nThis will automatically revert the GL Journal Entry and update Chart of Account balances.`,
      'Confirm Deletion',
      { confirmLabel: 'Delete & Revert', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteCashbookEntry(entry.id);
      toast('Cashbook entry and linked journal deleted successfully.', 'success');
      refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to delete entry', 'Error');
    }
  };

  // Handle Approve Pending Mobile Entry
  const handleApprovePendingEntry = async (entry: CashbookEntry) => {
    const ok = await showConfirm(
      `Approve cash voucher #${entry.id} of ${formatCurrency(entry.amount)} (${entry.particulars})?\n\n• Submitted By: ${entry.createdByName || entry.createdBy || 'Staff'}\n• Target Account: ${entry.accountName || entry.accountId}\n\nThis will post the double-entry journal to General Ledger and update the Cash balance.`,
      'Approve Cash Voucher',
      { confirmLabel: 'Approve & Post to GL', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    setApprovingId(entry.id);
    try {
      await approveCashbookEntry(entry.id, user?.name || user?.username || 'Finance Approver');
      toast(`Voucher #${entry.id} approved and posted to General Ledger!`, 'success');
      refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to approve voucher', 'Error');
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Reject Pending Mobile Entry
  const handleRejectPendingEntry = async (entry: CashbookEntry) => {
    const reason = window.prompt(`Please enter the rejection reason for voucher #${entry.id}:`, 'Invalid particulars / receipt missing');
    if (reason === null) return;

    setRejectingId(entry.id);
    try {
      await rejectCashbookEntry(entry.id, user?.name || user?.username || 'Finance Approver', reason);
      toast(`Voucher #${entry.id} rejected.`, 'info');
      refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to reject voucher', 'Error');
    } finally {
      setRejectingId(null);
    }
  };

  // Handle Set / Top-Up Petty Cash Float
  const handleSetFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(floatAmount);
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid float amount greater than 0', 'Validation');
      return;
    }
    try {
      setIsSubmittingFloat(true);
      await setCashbookFloat({
        cashAccountId: selectedCashAccountId || (cashbookData?.cashAccount?.id || 'acc_1110'),
        floatAmount: num,
        fundingSourceAccountId: floatFundingSource || undefined,
        notes: floatNotes,
        date: selectedDate,
        createdBy: user?.name || 'Cashier'
      });
      toast(`Successfully set Petty Cash float of ${formatCurrency(num)}!`, 'success');
      setIsFloatModalOpen(false);
      setFloatAmount('');
      refetch();
    } catch (err: any) {
      showError(err.message || 'Failed to set float', 'Error');
    } finally {
      setIsSubmittingFloat(false);
    }
  };

  // Filtered transactions for view
  const filteredEntries = useMemo(() => {
    if (!cashbookData?.entries) return [];
    return cashbookData.entries.filter(e => {
      if (typeFilter !== 'ALL' && e.entryType !== typeFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        e.particulars.toLowerCase().includes(term) ||
        (e.accountName && e.accountName.toLowerCase().includes(term)) ||
        (e.accountCode && e.accountCode.toLowerCase().includes(term)) ||
        (e.partyName && e.partyName.toLowerCase().includes(term)) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(term)) ||
        e.id.toLowerCase().includes(term)
      );
    });
  }, [cashbookData?.entries, typeFilter, search]);

  const openingBalance = cashbookData?.openingBalance || 0;
  const totalIn = cashbookData?.totalIn || 0;
  const totalOut = cashbookData?.totalOut || 0;
  const netMovement = cashbookData?.netMovement || 0;
  const closingBalance = cashbookData?.closingBalance || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Wallet size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary tracking-tight">Daily Cashbook</h1>
                <Badge variant="success" className="text-[11px] font-medium py-0.5 px-2 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  Petty Cash Linked
                </Badge>
              </div>
              <p className="text-xs text-muted">
                LKAS double-entry daily cash receipts & payments synchronized with Petty Cash (1110) & Chart of Accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={Coins}
            onClick={() => setIsFloatModalOpen(true)}
            className="border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-medium"
          >
            Set / Top-Up Float
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => setIsPrintModalOpen(true)}
            className="border border-theme-subtle text-secondary"
          >
            Daily Statement
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowDownLeft}
            onClick={() => handleOpenAddModal('IN')}
            className="border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            Cash In (Receipt)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => handleOpenAddModal('OUT')}
            className="bg-rex-600 hover:bg-rex-700"
          >
            Cash Out (Payment)
          </Button>
        </div>
      </div>

      {/* Date & Account Toolbar */}
      <GlassCard className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Date Navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-surface border border-theme rounded-lg overflow-hidden">
            <button
              onClick={handlePrevDay}
              title="Previous Day"
              className="px-2.5 py-1.5 hover:bg-surface-secondary text-secondary border-r border-theme transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Calendar size={14} className="text-muted" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-primary outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={handleNextDay}
              title="Next Day"
              className="px-2.5 py-1.5 hover:bg-surface-secondary text-secondary border-l border-theme transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleSetToday}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-rex-500/15 border-rex-500/40 text-rex-700 dark:text-rex-300'
                  : 'bg-surface border-theme text-secondary hover:bg-surface-secondary'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleSetYesterday}
              className="px-3 py-1.5 text-xs font-medium rounded-md border bg-surface border-theme text-secondary hover:bg-surface-secondary transition-colors"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Right: Cash Account Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <Wallet size={13} /> Cash Account:
            </span>
            <select
              value={selectedCashAccountId}
              onChange={e => setSelectedCashAccountId(e.target.value)}
              className="text-xs bg-surface border border-theme rounded-lg px-3 py-1.5 text-primary font-medium focus:ring-1 focus:ring-rex-500 outline-none"
            >
              {(cashbookData?.allCashAccounts || []).map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.code === '1110' ? '★ ' : ''}{acc.code} - {acc.name} ({formatCurrency(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <Badge variant="outline" className="text-xs font-mono py-1">
            GL Bal: {formatCurrency(cashbookData?.cashAccount?.balance || 0)}
          </Badge>
        </div>
      </GlassCard>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Opening Balance */}
        <GlassCard className="p-4 border-l-4 border-l-blue-500 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted block uppercase tracking-wider">Opening Balance</span>
            <button
              onClick={() => setIsFloatModalOpen(true)}
              title="Set or Replenish Float"
              className="text-[10px] text-blue-500 hover:text-blue-600 underline font-medium"
            >
              Float Setup
            </button>
          </div>
          <div className="text-xl font-bold text-primary mt-1">
            {formatCurrency(openingBalance)}
          </div>
          <span className="text-[11px] text-muted block mt-0.5">
            {cashbookData?.cashAccount?.name || 'Petty Cash'} at start of day
          </span>
        </GlassCard>

        {/* Cash In */}
        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
              Total Cash In
            </span>
            <ArrowDownLeft size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(totalIn)}
          </div>
          <span className="text-[11px] text-muted block mt-0.5">
            {(cashbookData?.entries || []).filter(e => e.entryType === 'IN').length} Receipts
          </span>
        </GlassCard>

        {/* Cash Out */}
        <GlassCard className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block uppercase tracking-wider">
              Total Cash Out
            </span>
            <ArrowUpRight size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            -{formatCurrency(totalOut)}
          </div>
          <span className="text-[11px] text-muted block mt-0.5">
            {(cashbookData?.entries || []).filter(e => e.entryType === 'OUT').length} Payments
          </span>
        </GlassCard>

        {/* Net Daily Movement */}
        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-medium text-muted block uppercase tracking-wider">Net Movement</span>
          <div className={`text-xl font-bold mt-1 ${netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}
          </div>
          <span className="text-[11px] text-muted block mt-0.5">Net cash flow</span>
        </GlassCard>

        {/* Closing Balance */}
        <GlassCard className="p-4 border-l-4 border-l-rex-600 bg-rex-500/5 col-span-2 md:col-span-1">
          <span className="text-xs font-medium text-rex-700 dark:text-rex-300 block uppercase tracking-wider">
            Closing Balance
          </span>
          <div className="text-xl font-bold text-primary mt-1">
            {formatCurrency(closingBalance)}
          </div>
          <span className="text-[11px] text-muted block mt-0.5">At end of day</span>
        </GlassCard>
      </div>

      {/* Mobile Submissions Pending Finance Approval */}
      {cashbookData?.pendingEntries && cashbookData.pendingEntries.length > 0 && (
        <GlassCard className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Smartphone size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  Mobile Cashbook Submissions Awaiting Approval
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {cashbookData.pendingEntries.length} Pending
                  </span>
                </h3>
                <p className="text-xs text-muted">
                  Review and verify mobile vouchers submitted by staff before posting to General Ledger.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-theme bg-surface">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-secondary/70 border-b border-theme text-muted uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Submitted By</th>
                  <th className="py-2.5 px-4 font-semibold">Particulars / Party</th>
                  <th className="py-2.5 px-4 font-semibold">Target Account</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Receipt</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {cashbookData.pendingEntries.map((pEntry) => {
                  const isReceipt = pEntry.entryType === 'IN';
                  return (
                    <tr key={pEntry.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-semibold text-primary">{String(pEntry.date).slice(0, 10)}</span>
                        <span className="text-[10px] text-muted block">{pEntry.time || '12:00'} • {pEntry.id}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isReceipt
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          {isReceipt ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {isReceipt ? 'Cash In' : 'Cash Out'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-semibold text-primary">
                          <User size={13} className="text-rex-600" />
                          <span>{pEntry.createdByName || pEntry.createdBy || 'Mobile Staff'}</span>
                        </div>
                        <span className="text-[10px] text-muted font-mono flex items-center gap-1">
                          <Smartphone size={10} /> Rex Mobile
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-primary">{pEntry.particulars}</div>
                        {pEntry.partyName && (
                          <div className="text-[11px] text-secondary">Party: {pEntry.partyName}</div>
                        )}
                        {pEntry.referenceNo && (
                          <div className="text-[10px] text-muted font-mono">Ref: {pEntry.referenceNo}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-primary font-mono">{pEntry.accountCode || 'COA'}</div>
                        <div className="text-secondary truncate max-w-[180px]">{pEntry.accountName || pEntry.accountId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sm">
                        <span className={isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {isReceipt ? '+' : '-'}{formatCurrency(pEntry.amount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {pEntry.receiptPhoto ? (
                          <button
                            type="button"
                            onClick={() => setViewReceiptModal(pEntry.receiptPhoto!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 text-xs font-medium transition-colors"
                          >
                            <Camera size={12} /> View Bill
                          </button>
                        ) : (
                          <span className="text-muted text-[11px]">No Photo</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            disabled={approvingId === pEntry.id}
                            onClick={() => handleApprovePendingEntry(pEntry)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1 px-2.5"
                          >
                            {approvingId === pEntry.id ? 'Posting...' : 'Approve'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={X}
                            disabled={rejectingId === pEntry.id}
                            onClick={() => handleRejectPendingEntry(pEntry)}
                            className="border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs py-1 px-2"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Transactions Section */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-theme flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/50">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-primary text-sm">
              Daily Transactions ({filteredEntries.length})
            </h2>
            <span className="text-xs text-muted font-mono">
              [{selectedDate}]
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center bg-surface border border-theme rounded-lg p-0.5">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  typeFilter === 'ALL'
                    ? 'bg-surface-secondary text-primary shadow-sm'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('IN')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  typeFilter === 'IN'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                Receipts (In)
              </button>
              <button
                onClick={() => setTypeFilter('OUT')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  typeFilter === 'OUT'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold shadow-sm'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                Payments (Out)
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search description, account..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-theme rounded-lg text-primary outline-none focus:ring-1 focus:ring-rex-500 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface border-b border-theme text-muted uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Time / Voucher</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Particulars / Description</th>
                <th className="py-2.5 px-4 font-semibold">Target Chart of Account</th>
                <th className="py-2.5 px-3 font-semibold">Party / Ref</th>
                <th className="py-2.5 px-3 font-semibold text-right text-emerald-600 dark:text-emerald-400">Cash In</th>
                <th className="py-2.5 px-3 font-semibold text-right text-rose-600 dark:text-rose-400">Cash Out</th>
                <th className="py-2.5 px-4 font-semibold text-right">Balance</th>
                <th className="py-2.5 px-3 font-semibold text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {/* Opening Balance Row */}
              <tr className="bg-surface-secondary/40 font-semibold text-secondary">
                <td className="py-2.5 px-3 font-mono text-muted">00:00</td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">B/F</Badge>
                </td>
                <td className="py-2.5 px-4" colSpan={2}>
                  <div className="flex items-center gap-1.5 text-primary">
                    <BookOpen size={13} className="text-muted" />
                    <span>Balance Brought Forward (Opening Balance)</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-muted">—</td>
                <td className="py-2.5 px-3 text-right font-mono">—</td>
                <td className="py-2.5 px-3 text-right font-mono">—</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-primary">
                  {formatCurrency(openingBalance)}
                </td>
                <td className="py-2.5 px-3 text-center text-muted">—</td>
              </tr>

              {/* Transaction Rows */}
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted animate-pulse">
                    Loading cashbook transactions...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Wallet size={32} className="text-muted/40" />
                      <p className="text-sm font-medium text-secondary">No cash transactions on this date.</p>
                      <p className="text-xs text-muted">Click below to record a receipt or payment.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Plus}
                          onClick={() => handleOpenAddModal('IN')}
                          className="border border-emerald-500/30 text-emerald-600"
                        >
                          Cash In
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Plus}
                          onClick={() => handleOpenAddModal('OUT')}
                        >
                          Cash Out
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-surface-secondary/50 transition-colors">
                    {/* Time / Voucher */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <Clock size={12} className="text-muted" />
                        <span>{entry.time || '00:00'}</span>
                      </div>
                      <span className="text-[10px] text-muted font-mono block mt-0.5">{entry.id}</span>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3">
                      {entry.entryType === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ArrowDownLeft size={10} /> Cash In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <ArrowUpRight size={10} /> Cash Out
                        </span>
                      )}
                    </td>

                    {/* Particulars */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-primary text-xs">{entry.particulars}</div>
                      {entry.notes && (
                        <div className="text-[11px] text-muted italic mt-0.5 line-clamp-1">
                          {entry.notes}
                        </div>
                      )}
                    </td>

                    {/* Target Chart of Account */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {entry.accountCode || 'COA'}
                        </span>
                        <span className="text-secondary text-xs truncate max-w-[200px]" title={entry.accountName}>
                          {entry.accountName || entry.accountId}
                        </span>
                      </div>
                      <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        entry.accountType === 'Expense' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                        entry.accountType === 'Revenue' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        entry.accountType === 'Asset' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      }`}>
                        {entry.accountType || 'Account'}
                      </span>
                    </td>

                    {/* Party / Reference / Created By */}
                    <td className="py-3 px-3">
                      {entry.partyName ? (
                        <div className="flex items-center gap-1 text-primary text-xs">
                          <User size={11} className="text-muted" />
                          <span className="truncate max-w-[120px]" title={entry.partyName}>{entry.partyName}</span>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px]">—</span>
                      )}
                      {entry.referenceNo && (
                        <div className="text-[10px] text-muted font-mono mt-0.5">
                          Ref: {entry.referenceNo}
                        </div>
                      )}
                      <div className="text-[10px] text-muted font-mono mt-1 flex items-center gap-1 flex-wrap">
                        {entry.source === 'mobile' && <Smartphone size={10} className="text-rex-600" />}
                        <span>By: {entry.createdByName || entry.createdBy || 'Cashier'}</span>
                        {entry.approvedBy && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title={`Approved by ${entry.approvedBy}`}>
                            (✓ {entry.approvedBy})
                          </span>
                        )}
                      </div>
                      {entry.receiptPhoto && (
                        <button
                          type="button"
                          onClick={() => setViewReceiptModal(entry.receiptPhoto!)}
                          className="text-[10px] text-blue-500 hover:text-blue-600 underline flex items-center gap-0.5 mt-0.5"
                        >
                          <Camera size={10} /> Bill Photo
                        </button>
                      )}
                    </td>

                    {/* Cash In Amount */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {entry.entryType === 'IN' ? formatCurrency(entry.amount) : '—'}
                    </td>

                    {/* Cash Out Amount */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                      {entry.entryType === 'OUT' ? formatCurrency(entry.amount) : '—'}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                      {formatCurrency(entry.runningBalance || 0)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        title="Delete entry (reverts GL journal)"
                        className="p-1 rounded text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {/* Day Closing Summary Row */}
              {filteredEntries.length > 0 && (
                <tr className="bg-surface font-semibold text-primary border-t-2 border-theme">
                  <td className="py-3 px-3 font-mono text-muted" colSpan={2}>
                    Day Total
                  </td>
                  <td className="py-3 px-4" colSpan={3}>
                    <div className="text-xs text-muted">
                      Total In: <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalIn)}</span> | 
                      Total Out: <span className="font-semibold text-rose-600 dark:text-rose-400">-{formatCurrency(totalOut)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(totalIn)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{formatCurrency(totalOut)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-primary text-sm">
                    {formatCurrency(closingBalance)}
                  </td>
                  <td className="py-3 px-3 text-center text-muted">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Record Cash Entry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={entryType === 'IN' ? 'Record Cash In (Receipt)' : 'Record Cash Out (Payment)'}
        size="lg"
      >
        <form onSubmit={handleSubmitEntry} className="space-y-4">
          {/* Segmented Type Toggle */}
          <div className="grid grid-cols-2 p-1 bg-surface-secondary rounded-lg gap-1 border border-theme">
            <button
              type="button"
              onClick={() => {
                setEntryType('IN');
                const defaultRev = (allAccounts || []).find(a => a.type === 'Revenue' || a.subtype === 'Current Liability');
                if (defaultRev) setTargetAccountId(defaultRev.id);
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                entryType === 'IN'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              <ArrowDownLeft size={15} /> Cash In (Receipt)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType('OUT');
                const defaultExp = (allAccounts || []).find(a => a.type === 'Expense');
                if (defaultExp) setTargetAccountId(defaultExp.id);
              }}
              className={`py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-all ${
                entryType === 'OUT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              <ArrowUpRight size={15} /> Cash Out (Payment)
            </button>
          </div>

          <div className="p-2.5 rounded-lg text-xs bg-surface border border-theme text-muted flex items-center gap-2">
            <AlertCircle size={14} className={entryType === 'IN' ? 'text-emerald-500' : 'text-rose-500'} />
            {entryType === 'IN' ? (
              <span><strong>Accounting Posting:</strong> Debits Cash Account, Credits Target Account.</span>
            ) : (
              <span><strong>Accounting Posting:</strong> Debits Target Account (Expense/Liability), Credits Cash Account.</span>
            )}
          </div>

          {/* Quick Presets (Only for general entries) */}
          {payeeCategory === 'expense' && (
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                Quick Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(entryType === 'OUT' ? quickExpensePresets : quickIncomePresets).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-1 text-xs rounded-md bg-surface border border-theme text-secondary hover:border-rex-500/40 hover:text-primary transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* If OUT: Allow selecting Supplier Payment */}
          {entryType === 'OUT' && (
            <div className="p-3 bg-surface2/60 border border-theme rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Disbursement Type</span>
                <div className="flex items-center gap-1 bg-surface p-1 rounded-md border border-theme text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPayeeCategory('expense');
                      setSelectedSupplierId('');
                      setSupplierBills([]);
                      setRelatedBillId('');
                      setRelatedBillNo('');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      payeeCategory === 'expense' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Office / General Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayeeCategory('supplier');
                      const payableAcc = (allAccounts || []).find(a => a.code === '2000' || a.name?.toLowerCase().includes('payable'));
                      if (payableAcc) setTargetAccountId(payableAcc.id);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      payeeCategory === 'supplier' ? 'bg-amber-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Supplier Bill Payment (සැපයුම්කරු)
                  </button>
                </div>
              </div>

              {payeeCategory === 'supplier' && (
                <div className="space-y-2.5 pt-2 border-t border-theme-subtle">
                  <div>
                    <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                      Select Supplier *
                    </label>
                    <SupplierAutocomplete
                      value={selectedSupplierId}
                      onChange={(sId, supplier) => {
                        setSelectedSupplierId(sId);
                        setPartyName(supplier?.name || supplier?.company || sId);
                        if (paymentMethod === 'Cheque' && supplier?.bankName) {
                          setBankName(supplier.bankName);
                        }
                      }}
                      placeholder="Type supplier name or company..."
                      required
                    />
                  </div>

                  {/* Supplier Pending Bills List */}
                  {selectedSupplierId && (
                    <div className="p-2.5 bg-surface rounded-lg border border-theme space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle size={13} />
                          <span>Supplier Unpaid Bills ({supplierBills.length})</span>
                        </span>
                        {loadingSupplierBills && (
                          <span className="text-[10px] text-muted animate-pulse">Loading bills...</span>
                        )}
                      </div>

                      {loadingSupplierBills ? (
                        <div className="py-2 text-center text-xs text-muted">
                          Fetching unpaid bills from purchase ledger...
                        </div>
                      ) : supplierBills.length === 0 ? (
                        <div className="text-xs text-muted italic p-1.5">
                          No outstanding bills found for this supplier. (Recording as advance disbursement).
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto divide-y divide-theme border border-theme rounded-md">
                          {supplierBills.map((b: any) => {
                            const total = Number(b.totalAmount || b.amount || 0);
                            const paid = Number(b.paidAmount || 0);
                            const due = Math.max(0, total - paid);
                            const isSelected = relatedBillId === b.id;

                            return (
                              <div
                                key={b.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setRelatedBillId('');
                                    setRelatedBillNo('');
                                  } else {
                                    setRelatedBillId(b.id);
                                    setRelatedBillNo(b.invoiceNo || b.id);
                                    setAmount(due > 0 ? due.toString() : total.toString());
                                    setParticulars(`Cash settlement for Supplier Bill #${b.invoiceNo || b.id}`);
                                    setReferenceNo(b.invoiceNo || b.id);
                                  }
                                }}
                                className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                  isSelected ? 'bg-amber-500/15 border-l-4 border-l-amber-500' : 'hover:bg-surface2/60'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-primary">Bill #{b.invoiceNo || b.id}</span>
                                    <Badge variant={isSelected ? 'warning' : 'default'}>{b.status || 'unpaid'}</Badge>
                                  </div>
                                  <span className="text-[10px] text-muted block font-mono">
                                    Date: {b.date ? b.date.slice(0, 10) : (b.billDate ? b.billDate.slice(0, 10) : '-')} | Total: {formatCurrency(total)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-muted block">Due</span>
                                  <span className="text-xs font-mono font-bold text-amber-400">{formatCurrency(due)}</span>
                                  <span className="text-[9px] text-rex-400 block underline">
                                    {isSelected ? 'Selected (Deselect)' : 'Click to Settle'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date, Time & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Date *</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-sm text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Time</label>
              <input
                type="time"
                value={entryTime}
                onChange={e => setEntryTime(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-sm text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Amount (LKR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-surface border border-theme rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-rex-500"
                />
              </div>
            </div>
          </div>

          {/* Cash Account & Target Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cash Account */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Cash Account (Source / Destination) *
              </label>
              <select
                required
                value={formCashAccountId}
                onChange={e => setFormCashAccountId(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
              >
                {(cashbookData?.allCashAccounts || []).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Chart of Account */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Target Chart of Account * <span className="text-muted font-normal">(Mapping)</span>
              </label>
              <AccountAutocomplete
                value={targetAccountId}
                onChange={val => setTargetAccountId(val)}
                accounts={allAccounts}
                placeholder="Type account code or name to search..."
                required
              />
            </div>
          </div>

          {/* Particulars / Description */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Particulars / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Daily office tea & snacks, Fuel for delivery truck, Advance from customer"
              value={particulars}
              onChange={e => setParticulars(e.target.value)}
              className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-sm text-primary outline-none focus:ring-1 focus:ring-rex-500"
            />
          </div>

          {/* Payment Method Selector & Details */}
          <div className="p-3 bg-surface2/40 border border-theme rounded-lg space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Payment Method / Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Cheque', 'Bank Transfer'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all ${
                      paymentMethod === pm
                        ? 'bg-rex-600 text-white border-rex-600 shadow-xs'
                        : 'bg-surface border-theme text-secondary hover:text-primary'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'Cheque' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-theme-subtle">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Cheque No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100452"
                    value={chequeNo}
                    onChange={e => setChequeNo(e.target.value)}
                    className="w-full bg-surface border border-theme rounded-md px-2.5 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-rex-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={e => setChequeDate(e.target.value)}
                    className="w-full bg-surface border border-theme rounded-md px-2.5 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-rex-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full bg-surface border border-theme rounded-md px-2.5 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'Bank Transfer' && (
              <div className="pt-1.5 border-t border-theme-subtle space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">Transfer / SLIPS Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. CEFT-883921 / TRF-091"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="w-full bg-surface border border-theme rounded-md px-2.5 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-rex-500"
                  />
                </div>
                {/* Deposit Slip Upload */}
                <div className="space-y-1.5 p-2 rounded bg-surface border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                      <Paperclip size={12} className="text-purple-500" /> Bank Deposit Slip / Transfer Receipt
                    </label>
                    {depositSlip && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Attached
                      </span>
                    )}
                  </div>
                  {!depositSlip ? (
                    <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-theme-subtle hover:border-purple-500/50 rounded bg-background/50 hover:bg-purple-500/5 transition-all cursor-pointer">
                      <Upload size={14} className="text-secondary" />
                      <span className="text-[11px] font-medium text-secondary">
                        {isUploadingSlip ? 'Uploading slip...' : 'Attach Deposit Slip (Image / PDF)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={isUploadingSlip}
                        onChange={handleCashbookSlipUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-1.5 bg-background border border-emerald-500/30 rounded">
                      <div className="flex items-center gap-2 truncate">
                        {depositSlip.startsWith('data:image') || /\.(jpg|jpeg|png|webp)($|\?)/i.test(depositSlip) ? (
                          <img src={depositSlip} alt="Slip" className="w-7 h-7 object-cover rounded border" />
                        ) : (
                          <FileText size={15} className="text-purple-500" />
                        )}
                        <span className="text-[11px] font-medium truncate">Slip Attached</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewReceiptModal(depositSlip)}
                          className="p-1 text-secondary hover:text-primary"
                          title="Preview"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositSlip('')}
                          className="p-1 text-rose-500 hover:text-rose-600"
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Party Name & Reference No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Payee / Customer / Employee Name <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sunil Perera, Ceylon Petroleum, Singer"
                value={partyName}
                onChange={e => setPartyName(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-sm text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Reference / Voucher / Bill No. <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BILL-9821, VCH-0045"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-sm text-primary outline-none focus:ring-1 focus:ring-rex-500 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Internal Notes <span className="text-muted font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Any additional remarks or authorization details..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500 resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className={entryType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rex-600 hover:bg-rex-700'}
            >
              {isSubmitting ? 'Posting...' : entryType === 'IN' ? 'Post Cash Receipt' : 'Post Cash Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Statement Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Daily Cashbook Statement"
        size="xl"
      >
        <div className="space-y-6 p-2">
          {/* Printable Container */}
          <div id="cashbook-print-section" className="bg-white text-slate-900 p-6 rounded-lg border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">DAILY CASH STATEMENT & RECONCILIATION</p>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Cash Account: <span className="font-bold">{cashbookData?.cashAccount?.code} - {cashbookData?.cashAccount?.name}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">Date: {selectedDate}</div>
                <div className="text-xs text-slate-500 mt-0.5">Generated: {new Date().toLocaleString()}</div>
                <div className="text-xs text-slate-500">Cashier: {user?.name || 'Administrator'}</div>
              </div>
            </div>

            {/* KPI Summary Block */}
            <div className="grid grid-cols-4 gap-2 my-4 p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Opening Balance</span>
                <span className="text-sm font-bold font-mono text-slate-900">{formatCurrency(openingBalance)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Cash In</span>
                <span className="text-sm font-bold font-mono text-emerald-600">+{formatCurrency(totalIn)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Total Cash Out</span>
                <span className="text-sm font-bold font-mono text-rose-600">-{formatCurrency(totalOut)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Closing Balance</span>
                <span className="text-sm font-bold font-mono text-slate-900">{formatCurrency(closingBalance)}</span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse text-xs mt-4">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px]">
                  <th className="py-2 px-2">Voucher / Time</th>
                  <th className="py-2 px-2">Particulars</th>
                  <th className="py-2 px-2">Target Account</th>
                  <th className="py-2 px-2">Party / Ref</th>
                  <th className="py-2 px-2 text-right">Receipt (In)</th>
                  <th className="py-2 px-2 text-right">Payment (Out)</th>
                  <th className="py-2 px-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr className="bg-slate-50 font-medium">
                  <td className="py-1.5 px-2 font-mono text-slate-500">00:00</td>
                  <td className="py-1.5 px-2" colSpan={3}>Opening Balance Brought Forward</td>
                  <td className="py-1.5 px-2 text-right font-mono">—</td>
                  <td className="py-1.5 px-2 text-right font-mono">—</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold">{formatCurrency(openingBalance)}</td>
                </tr>
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td className="py-1.5 px-2 font-mono text-[11px]">{e.time} ({e.id})</td>
                    <td className="py-1.5 px-2">{e.particulars}</td>
                    <td className="py-1.5 px-2 font-mono text-[11px]">{e.accountCode} - {e.accountName}</td>
                    <td className="py-1.5 px-2 text-[11px]">{e.partyName || e.referenceNo || '—'}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-emerald-700 font-medium">
                      {e.entryType === 'IN' ? formatCurrency(e.amount) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-rose-700 font-medium">
                      {e.entryType === 'OUT' ? formatCurrency(e.amount) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">
                      {formatCurrency(e.runningBalance || 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-400 font-bold bg-slate-50">
                  <td className="py-2 px-2" colSpan={4}>Day Total / Closing Balance</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-700">+{formatCurrency(totalIn)}</td>
                  <td className="py-2 px-2 text-right font-mono text-rose-700">-{formatCurrency(totalOut)}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-900 font-black">{formatCurrency(closingBalance)}</td>
                </tr>
              </tbody>
            </table>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-600">
              <div>
                <div className="border-b border-slate-400 h-8 mb-1" />
                <span className="font-semibold text-slate-800">Cashier</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Prepared By</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8 mb-1" />
                <span className="font-semibold text-slate-800">Accountant</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Verified & Checked</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-8 mb-1" />
                <span className="font-semibold text-slate-800">Finance Manager / Director</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Authorized & Approved</p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPrintModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="bg-rex-600 hover:bg-rex-700"
            >
              Print Statement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Set / Top-Up Petty Cash Float Modal */}
      <Modal
        isOpen={isFloatModalOpen}
        onClose={() => setIsFloatModalOpen(false)}
        title="Set / Top-Up Petty Cash Float"
      >
        <form onSubmit={handleSetFloat} className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">LKAS Double-Entry Imprest Petty Cash Integration</p>
            <p className="text-[11px] leading-relaxed">
              Setting or topping up the float debits <strong>Petty Cash (1110)</strong> and credits your selected funding source (Bank Account or Equity). This automatically updates today's and future opening balances across the Daily Cashbook.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Cash Account
            </label>
            <input
              type="text"
              readOnly
              value={`${cashbookData?.cashAccount?.code || '1110'} - ${cashbookData?.cashAccount?.name || 'Petty Cash'} (Current GL: ${formatCurrency(cashbookData?.cashAccount?.balance || 0)})`}
              className="w-full bg-surface-secondary border border-theme rounded-lg px-3 py-2 text-xs text-secondary font-mono outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Float / Top-Up Amount (LKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">Rs.</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="25000.00"
                value={floatAmount}
                onChange={e => setFloatAmount(e.target.value)}
                className="w-full bg-surface border border-theme rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Funding Source (Offset Account) *
            </label>
            <select
              value={floatFundingSource}
              onChange={e => setFloatFundingSource(e.target.value)}
              className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
            >
              <optgroup label="Bank Accounts (Transfer)">
                {(allAccounts || []).filter(a => a.subtype === 'Bank' || a.name.toLowerCase().includes('bank')).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Equity / Capital (Initial Float)">
                {(allAccounts || []).filter(a => a.type === 'Equity').map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Cash Accounts">
                {(allAccounts || []).filter(a => (a.subtype === 'Cash' || a.name.toLowerCase().includes('cash')) && a.id !== (cashbookData?.cashAccount?.id || 'acc_1110')).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[10px] text-muted mt-1">
              Select <strong>Commercial Bank</strong> for standard bank withdrawal / replenishment, or <strong>Equity</strong> for initial business capital float.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Petty cash monthly float replenishment"
              value={floatNotes}
              onChange={e => setFloatNotes(e.target.value)}
              className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsFloatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={isSubmittingFloat}
              className="bg-rex-600 hover:bg-rex-700 font-medium"
            >
              Confirm & Update Float
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bill / Receipt Photo Preview Modal */}
      {viewReceiptModal && (
        <Modal
          isOpen={!!viewReceiptModal}
          onClose={() => setViewReceiptModal(null)}
          title="Attached Voucher Bill / Receipt Photo"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-black/70 flex items-center justify-center p-2 border border-theme">
              <img src={viewReceiptModal} alt="Voucher Bill Attachment" className="w-full h-auto object-contain max-h-[65vh]" />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewReceiptModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
