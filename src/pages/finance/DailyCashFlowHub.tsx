import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, DollarSign,
  Calendar, Search, Filter, Printer, Plus, CheckCircle2,
  Clock, AlertCircle, FileText, Check, X, RefreshCw,
  Building2, Landmark, CreditCard, ChevronRight, User,
  Eye, Download, MoreHorizontal, ArrowUpDown, Upload, Paperclip, ExternalLink, Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { useAccounts } from '@/hooks/useFinance';
import { useSuppliers } from '@/hooks/useData';
import { 
  getDailyCashFlow, getPaymentVouchers, createPaymentVoucher, 
  updateChequeStatus, uploadFileToStorage, realizeChequeToGL, deleteChequeRecord 
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PaymentVoucherPrintModal } from '@/components/finance/PaymentVoucherPrintModal';
import { ChequePrintModal } from '@/components/finance/ChequePrintModal';
import { ChequeRealizationModal } from '@/components/finance/ChequeRealizationModal';
import { CreateChequeModal } from '@/components/finance/CreateChequeModal';

// Helper to convert number to English words for payment vouchers
function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - n) * 100);

  function inWords(val: number): string {
    if (val === 0) return '';
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + ' ' + a[val % 10];
    if (val < 1000) return a[Math.floor(val / 100)] + 'Hundred ' + inWords(val % 100);
    if (val < 100000) return inWords(Math.floor(val / 1000)) + 'Thousand ' + inWords(val % 1000);
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + 'Lakh ' + inWords(val % 100000);
    return inWords(Math.floor(val / 10000000)) + 'Crore ' + inWords(val % 10000000);
  }

  const words = inWords(n).trim();
  const centsPart = cents > 0 ? ` and Cents ${cents}/100` : '';
  return (words ? `Rupees ${words}` : 'Zero Rupees') + centsPart + ' Only';
}

export const DailyCashFlowHub: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast, showError, showConfirm } = useDialog();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter State
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'cheques' | 'transfers' | 'vouchers'>('ledger');
  const [chequeDirectionFilter, setChequeDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<string>('ALL');

  // Data State
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({
    period: {},
    totals: { totalInflow: 0, totalOutflow: 0, netCashFlow: 0 },
    methodBreakdown: {},
    cheques: { inwardPending: { count: 0, amount: 0 }, outwardPending: { count: 0, amount: 0 }, list: [] },
    bankTransfers: { count: 0, amount: 0, list: [] },
    transactions: []
  });

  // Vouchers state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Modal States
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState(false);
  const [activeVoucherForPrint, setActiveVoucherForPrint] = useState<any | null>(null);
  const [activeChequeForPrint, setActiveChequeForPrint] = useState<any | null>(null);
  const [activeChequeForRealize, setActiveChequeForRealize] = useState<any | null>(null);
  const [isCreateChequeModalOpen, setIsCreateChequeModalOpen] = useState(false);
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [viewingSlip, setViewingSlip] = useState<{ url: string; title: string; tx?: any } | null>(null);
  const [isUploadingVoucherSlip, setIsUploadingVoucherSlip] = useState(false);

  // Reference hooks
  const { data: accounts = [] } = useAccounts();
  const { data: suppliers = [] } = useSuppliers();

  // New Voucher Form
  const initialVoucherState = {
    date: todayStr,
    payeeType: 'supplier' as 'supplier' | 'customer' | 'employee' | 'other',
    payeeId: '',
    payeeName: '',
    category: 'Supplier Bill Payment',
    amount: '',
    paymentMethod: 'Cheque' as 'Cash' | 'Cheque' | 'Bank Transfer' | 'Card' | 'Other',
    chequeNo: '',
    chequeDate: todayStr,
    bankName: 'Commercial Bank',
    chequeStatus: 'Pending',
    transactionRef: '',
    bankAccountId: '',
    cashAccountId: '',
    accountId: '',
    relatedBillId: '',
    relatedBillNo: '',
    description: '',
    depositSlip: '',
    preparedBy: user?.name || user?.username || 'Accounts Officer'
  };
  const [voucherForm, setVoucherForm] = useState(initialVoucherState);

  const handleVoucherSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVoucherSlip(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUri = reader.result as string;
      setVoucherForm(prev => ({ ...prev, depositSlip: rawDataUri }));
      try {
        const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'slips');
        if (uploaded && uploaded.url) {
          setVoucherForm(prev => ({ ...prev, depositSlip: uploaded.url }));
        }
      } catch (err) {
        console.warn('Storage upload error, keeping dataUri fallback:', err);
      } finally {
        setIsUploadingVoucherSlip(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Supplier Unpaid Bills for Voucher Form
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [loadingSupplierBills, setLoadingSupplierBills] = useState(false);

  // Filter bank and cash accounts
  const bankAccounts = useMemo(() => {
    return (accounts || []).filter((a: any) => 
      a.subtype === 'Bank' || 
      a.name?.toLowerCase().includes('bank') || 
      a.code?.startsWith('11')
    );
  }, [accounts]);

  const cashAccounts = useMemo(() => {
    return (accounts || []).filter((a: any) => 
      a.subtype === 'Cash' || 
      a.name?.toLowerCase().includes('cash') || 
      a.code === '1000'
    );
  }, [accounts]);

  // Handle Preset Changes
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const d = now.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'week') {
      const first = new Date(now);
      first.setDate(first.getDate() - first.getDay());
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // Fetch Main Cash Flow Data
  const loadCashFlow = async () => {
    setLoading(true);
    try {
      const res = await getDailyCashFlow({
        startDate,
        endDate,
        paymentMethod: methodFilter,
        type: typeFilter
      });
      setData(res || {});
    } catch (err: any) {
      showError(err.message || 'Failed to load cash flow data', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Vouchers
  const loadVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const res = await getPaymentVouchers({ startDate, endDate });
      setVouchers(res?.vouchers || []);
    } catch (err: any) {
      console.warn('Failed to load vouchers:', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    loadCashFlow();
    loadVouchers();
  }, [startDate, endDate, methodFilter, typeFilter]);

  // Load unpaid bills when supplier selected in voucher modal
  useEffect(() => {
    if (voucherForm.payeeType === 'supplier' && voucherForm.payeeId) {
      setLoadingSupplierBills(true);
      fetch(`/api/purchasing/bills?supplierId=${encodeURIComponent(voucherForm.payeeId)}&status=unpaid`)
        .then(r => r.json())
        .then(res => {
          const bills = Array.isArray(res) ? res : (res.bills || []);
          setSupplierBills(bills);
          setLoadingSupplierBills(false);
        })
        .catch(() => {
          setSupplierBills([]);
          setLoadingSupplierBills(false);
        });
    } else {
      setSupplierBills([]);
    }
  }, [voucherForm.payeeType, voucherForm.payeeId]);

  // Summary Totals & Normalized Lists
  const totalInflow = data.totalInflow ?? data.totals?.totalInflow ?? 0;
  const totalOutflow = data.totalOutflow ?? data.totals?.totalOutflow ?? 0;
  const netCashFlow = data.netCashFlow ?? data.totals?.netCashFlow ?? 0;

  const chequesList = useMemo(() => {
    if (Array.isArray(data.cheques)) return data.cheques;
    if (Array.isArray(data.cheques?.list)) return data.cheques.list;
    return [];
  }, [data.cheques]);

  const bankTransfersList = useMemo(() => {
    if (Array.isArray(data.bankTransfers)) return data.bankTransfers;
    if (Array.isArray(data.bankTransfers?.list)) return data.bankTransfers.list;
    return [];
  }, [data.bankTransfers]);

  const inwardPending = useMemo(() => {
    const list = chequesList.filter((c: any) => c.direction === 'IN' && (c.status || 'Pending').toLowerCase() === 'pending');
    return {
      count: list.length,
      amount: list.reduce((a: number, c: any) => a + Number(c.amount || 0), 0)
    };
  }, [chequesList]);

  const outwardPending = useMemo(() => {
    const list = chequesList.filter((c: any) => c.direction === 'OUT' && (c.status || 'Pending').toLowerCase() === 'pending');
    return {
      count: list.length,
      amount: list.reduce((a: number, c: any) => a + Number(c.amount || 0), 0)
    };
  }, [chequesList]);

  const bankTransfersSummary = useMemo(() => {
    return {
      count: bankTransfersList.length,
      amount: bankTransfersList.reduce((a: number, t: any) => a + Number(t.amount || 0), 0)
    };
  }, [bankTransfersList]);

  // Filtered Ledger Transactions by Search
  const filteredTransactions = useMemo(() => {
    const list = data?.transactions || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((t: any) => 
      (t.reference && t.reference.toLowerCase().includes(q)) ||
      (t.refNo && t.refNo.toLowerCase().includes(q)) ||
      (t.partyName && t.partyName.toLowerCase().includes(q)) ||
      (t.particulars && t.particulars.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
      (t.chequeNo && t.chequeNo.toLowerCase().includes(q)) ||
      (t.bankName && t.bankName.toLowerCase().includes(q)) ||
      (t.transactionRef && t.transactionRef.toLowerCase().includes(q))
    );
  }, [data?.transactions, search]);

  // Filtered Cheques
  const filteredCheques = useMemo(() => {
    return chequesList.filter((ch: any) => {
      if (chequeDirectionFilter !== 'ALL' && ch.direction !== chequeDirectionFilter) return false;
      if (chequeStatusFilter !== 'ALL' && ch.status?.toLowerCase() !== chequeStatusFilter.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = (ch.chequeNo && ch.chequeNo.toLowerCase().includes(q)) ||
          (ch.bankName && ch.bankName.toLowerCase().includes(q)) ||
          (ch.partyName && ch.partyName.toLowerCase().includes(q)) ||
          (ch.reference && ch.reference.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [chequesList, chequeDirectionFilter, chequeStatusFilter, search]);

  // Filtered Bank Transfers
  const filteredTransfers = useMemo(() => {
    return bankTransfersList.filter((tr: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (tr.transactionRef && tr.transactionRef.toLowerCase().includes(q)) ||
        (tr.partyName && tr.partyName.toLowerCase().includes(q)) ||
        (tr.bankName && tr.bankName.toLowerCase().includes(q)) ||
        (tr.reference && tr.reference.toLowerCase().includes(q)) ||
        (tr.particulars && tr.particulars.toLowerCase().includes(q));
    });
  }, [bankTransfersList, search]);

  // Handle Cheque Status Update
  const handleUpdateChequeStatus = async (cheque: any, newStatus: string) => {
    setStatusUpdatingId(cheque.id);
    try {
      await updateChequeStatus(cheque.id, newStatus, cheque.sourceTable);
      toast(`Cheque #${cheque.chequeNo} updated to ${newStatus}`, 'success');
      await Promise.all([loadCashFlow(), loadVouchers()]);
    } catch (err: any) {
      showError(err.message || 'Failed to update cheque status', 'Error');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Handle Realize Cheque to GL on realization date
  const handleRealizeCheque = async (payload: { realizedDate: string; realizedAccountId: string; notes?: string }) => {
    if (!activeChequeForRealize) return;
    setStatusUpdatingId(activeChequeForRealize.id);
    try {
      const res = await realizeChequeToGL(activeChequeForRealize.id, payload);
      toast(res.message || `Cheque #${activeChequeForRealize.chequeNo} realized into GL on ${payload.realizedDate}!`, 'success');
      setActiveChequeForRealize(null);
      await Promise.all([loadCashFlow(), loadVouchers()]);
    } catch (err: any) {
      showError(err.message || 'Failed to realize cheque into General Ledger', 'Realization Error');
      throw err;
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Handle Delete Cheque
  const handleDeleteCheque = async (cheque: any) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete Cheque #${cheque.chequeNo} (Rs. ${formatCurrency(cheque.amount)})? This action cannot be undone.`);
    if (!isConfirmed) return;

    setStatusUpdatingId(cheque.id);
    try {
      await deleteChequeRecord(cheque.id);
      toast(`Cheque #${cheque.chequeNo} deleted successfully`, 'success');
      await Promise.all([loadCashFlow(), loadVouchers()]);
    } catch (err: any) {
      showError(err.message || 'Failed to delete cheque', 'Delete Error');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Handle Submit Payment Voucher
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(voucherForm.amount);
    if (!numAmount || numAmount <= 0) {
      showError('Please enter a valid amount greater than 0', 'Validation Error');
      return;
    }
    if (!voucherForm.payeeName.trim()) {
      showError('Please enter or select a Payee Name', 'Validation Error');
      return;
    }
    if (voucherForm.paymentMethod === 'Cheque' && !voucherForm.chequeNo.trim()) {
      showError('Cheque Number is required when payment method is Cheque', 'Validation Error');
      return;
    }

    setIsSubmittingVoucher(true);
    try {
      const res = await createPaymentVoucher({
        ...voucherForm,
        amount: numAmount
      });

      toast(`Payment Voucher ${res.voucherNo} issued successfully!`, 'success');
      setIsVoucherModalOpen(false);
      
      // Auto open print modal for generated voucher
      if (res.voucher) {
        setActiveVoucherForPrint(res.voucher);
      }

      // Reset form
      setVoucherForm(initialVoucherState);

      // Refresh data
      await Promise.all([loadCashFlow(), loadVouchers()]);
    } catch (err: any) {
      showError(err.message || 'Failed to issue voucher', 'Error');
    } finally {
      setIsSubmittingVoucher(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16 w-full">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <span>Finance</span>
            <ChevronRight size={13} />
            <span className="text-secondary font-medium">Daily Cash Flow & Cheques</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <ArrowRightLeft className="text-rex-500" size={24} />
            <span>Daily Cash Flow & Payment Instruments</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time tracking of cash receipts, supplier disbursements, cheque clearances, and bank transfers
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { loadCashFlow(); loadVouchers(); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPrintReportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs border border-white/[0.1] hover:bg-white/[0.05]"
          >
            <Printer size={14} />
            <span>Print Flow Report</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateChequeModalOpen(true)}
            className="flex items-center gap-1.5 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
          >
            <Plus size={14} />
            <span>+ Manual Cheque (In/Out)</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setVoucherForm(initialVoucherState);
              setIsVoucherModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-rex-600 hover:bg-rex-700 text-white font-medium shadow-md shadow-rex-600/20"
          >
            <Plus size={15} />
            <span>Issue Payment Voucher</span>
          </Button>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-surface-secondary/70 p-1 rounded-lg border border-theme text-xs">
            <button
              onClick={() => applyDatePreset('today')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                datePreset === 'today' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyDatePreset('yesterday')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                datePreset === 'yesterday' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => applyDatePreset('week')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                datePreset === 'week' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => applyDatePreset('month')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                datePreset === 'month' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                datePreset === 'custom' ? 'bg-rex-600 text-white shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-surface border border-theme rounded-lg px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-muted" />
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-primary outline-none text-xs font-mono"
              />
              <span className="text-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="bg-transparent text-primary outline-none text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Search & Method Pill Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-theme-subtle">
          <div className="flex items-center gap-1.5 flex-1 min-w-[240px] max-w-md bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-xs">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              placeholder="Search by party, cheque #, bank, reference, voucher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent w-full text-primary placeholder:text-muted outline-none text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-muted hover:text-primary">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">Method:</span>
            {['ALL', 'Cash', 'Cheque', 'Bank Transfer'].map(m => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  methodFilter === m
                    ? 'bg-surface2 border-rex-500/50 text-rex-400 font-semibold shadow-xs'
                    : 'bg-surface border-theme text-secondary hover:text-primary hover:border-theme-subtle'
                }`}
              >
                {m}
              </button>
            ))}

            <div className="h-4 w-px bg-white/[0.08] mx-1" />

            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">Flow:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'IN', label: 'Inflows Only' },
              { id: 'OUT', label: 'Outflows Only' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  typeFilter === f.id
                    ? 'bg-surface2 border-rex-500/50 text-rex-400 font-semibold shadow-xs'
                    : 'bg-surface border-theme text-secondary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Inflow */}
        <GlassCard className="p-3.5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Total Inflow</span>
            <ArrowDownLeft size={14} className="text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {formatCurrency(totalInflow, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">Customer receipts & cash in</span>
        </GlassCard>

        {/* Total Outflow */}
        <GlassCard className="p-3.5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Total Outflow</span>
            <ArrowUpRight size={14} className="text-rose-500" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {formatCurrency(totalOutflow, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">Disbursements & vouchers</span>
        </GlassCard>

        {/* Net Flow */}
        <GlassCard className="p-3.5 border-l-4 border-l-rex-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Net Cash Flow</span>
            <ArrowUpDown size={14} className="text-rex-400" />
          </div>
          <div className={`text-lg font-bold font-mono ${
            netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(netCashFlow, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">Inflows minus outflows</span>
        </GlassCard>

        {/* Cheques In-Hand (Pending) */}
        <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Inward Cheques</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {formatCurrency(inwardPending.amount, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {inwardPending.count} cheques pending deposit
          </span>
        </GlassCard>

        {/* Issued Cheques (Pending) */}
        <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Outward Cheques</span>
            <Landmark size={14} className="text-blue-500" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-400">
            {formatCurrency(outwardPending.amount, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {outwardPending.count} cheques issued to vendors
          </span>
        </GlassCard>

        {/* Bank Transfers */}
        <GlassCard className="p-3.5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-muted text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Bank Transfers</span>
            <CreditCard size={14} className="text-purple-500" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-400">
            {formatCurrency(bankTransfersSummary.amount, true)}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {bankTransfersSummary.count} transfer settlements
          </span>
        </GlassCard>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-b border-theme flex items-center gap-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'ledger'
              ? 'border-rex-500 text-rex-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <ArrowRightLeft size={15} />
          <span>Unified Flow Ledger</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface2 font-mono">
            {filteredTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cheques')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'cheques'
              ? 'border-rex-500 text-rex-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Clock size={15} />
          <span>Cheque Tracker (චෙක්පත්)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
            {(data?.cheques?.list || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'transfers'
              ? 'border-rex-500 text-rex-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <CreditCard size={15} />
          <span>Bank Transfers & SLIPS</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface2 font-mono">
            {(data?.bankTransfers?.list || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'vouchers'
              ? 'border-rex-500 text-rex-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FileText size={15} />
          <span>Payment Vouchers (PV)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface2 font-mono">
            {vouchers.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Unified Flow Ledger */}
      {activeTab === 'ledger' && (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-theme bg-surface2/60 text-secondary uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Reference / Doc #</th>
                  <th className="py-2.5 px-3">Method & Instrument</th>
                  <th className="py-2.5 px-3">Party / Beneficiary</th>
                  <th className="py-2.5 px-3">Particulars / Narration</th>
                  <th className="py-2.5 px-3 text-right">Inflow (LKR)</th>
                  <th className="py-2.5 px-3 text-right">Outflow (LKR)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={24} className="text-muted/60" />
                        <span>No transactions recorded for the selected period and filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx: any, idx: number) => {
                    const isIn = (tx.flowType === 'IN' || tx.type === 'IN');
                    const ref = tx.refNo || tx.reference || '-';
                    const desc = tx.description || tx.particulars || '-';

                    return (
                      <tr key={tx.id || idx} className="hover:bg-surface2/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap text-secondary">
                          <div>{tx.date}</div>
                          {tx.time && <span className="text-[10px] text-muted">{tx.time}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-primary whitespace-nowrap">
                          <div className="font-semibold">{ref}</div>
                          {tx.voucherNo && tx.voucherNo !== ref && (
                            <span className="text-[10px] text-rex-400 block font-normal">PV: {tx.voucherNo}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={tx.paymentMethod === 'Cash' ? 'default' : tx.paymentMethod === 'Cheque' ? 'warning' : 'info'}>
                              {tx.paymentMethod || 'Cash'}
                            </Badge>
                            {tx.depositSlip && (
                              <button
                                type="button"
                                onClick={() => setViewingSlip({ url: tx.depositSlip, title: `${ref} — Bank Deposit Slip`, tx })}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors shadow-xs cursor-pointer"
                                title="View Bank Deposit Slip (තැන්පතු ස්ලිප්පුව බලන්න)"
                              >
                                <Paperclip size={10} />
                                <span>Slip</span>
                              </button>
                            )}
                          </div>
                          {tx.chequeNo && (
                            <div className="text-[10px] font-mono text-muted mt-0.5">
                              CHQ #{tx.chequeNo} {tx.bankName ? `(${tx.bankName})` : ''}
                            </div>
                          )}
                          {tx.transactionRef && (
                            <div className="text-[10px] font-mono text-muted mt-0.5">
                              Ref: {tx.transactionRef}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-primary">
                          <div>{tx.partyName || '-'}</div>
                          {tx.category && (
                            <span className="text-[10px] text-muted block font-normal capitalize">
                              {tx.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-secondary max-w-xs truncate" title={desc}>
                          {desc}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                          {isIn ? formatCurrency(tx.amount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-400 whitespace-nowrap">
                          {!isIn ? formatCurrency(tx.amount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {((tx.paymentMethod || '').toLowerCase().includes('cheque') || tx.chequeNo) ? (
                            <Badge variant={
                              (tx.chequeStatus || 'pending').toLowerCase() === 'cleared' ? 'success' :
                              (tx.chequeStatus || '').toLowerCase() === 'deposited' ? 'info' :
                              (tx.chequeStatus || '').toLowerCase() === 'returned' ? 'danger' : 'warning'
                            }>
                              {tx.chequeStatus || 'Pending'}
                            </Badge>
                          ) : (
                            <Badge variant="success">Settled</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-surface2 font-semibold text-xs border-t-2 border-theme">
                    <td colSpan={5} className="py-3 px-3 text-primary text-right uppercase tracking-wider text-[11px]">
                      Filtered Period Totals:
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(
                        filteredTransactions.filter((t: any) => (t.flowType === 'IN' || t.type === 'IN')).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                      {formatCurrency(
                        filteredTransactions.filter((t: any) => (t.flowType === 'OUT' || t.type === 'OUT')).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </GlassCard>
      )}

      {/* Tab 2: Cheque Tracker */}
      {activeTab === 'cheques' && (
        <div className="space-y-4">
          {/* Subfilters for Cheque Direction & Status */}
          <GlassCard className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">Direction:</span>
              {[
                { id: 'ALL', label: 'All Cheques' },
                { id: 'IN', label: 'Inward (Received from Clients)' },
                { id: 'OUT', label: 'Outward (Issued to Vendors)' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setChequeDirectionFilter(d.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    chequeDirectionFilter === d.id
                      ? 'bg-surface2 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-surface border-theme text-secondary hover:text-primary'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted font-semibold uppercase tracking-wider mr-1">Status:</span>
              {['ALL', 'Pending', 'Deposited', 'Cleared', 'Returned'].map(st => (
                <button
                  key={st}
                  onClick={() => setChequeStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    chequeStatusFilter === st
                      ? 'bg-surface2 border-rex-500/50 text-rex-400 font-semibold'
                      : 'bg-surface border-theme text-secondary hover:text-primary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-theme bg-surface2/60 text-secondary uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Cheque #</th>
                    <th className="py-2.5 px-3">Cheque Date</th>
                    <th className="py-2.5 px-3">Bank Name</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Party / Drawer</th>
                    <th className="py-2.5 px-3">Linked Ref / PV</th>
                    <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action / Printing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-muted">
                        No cheques match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCheques.map((ch: any, idx: number) => {
                      const isInward = ch.direction === 'IN' || String(ch.direction || '').toLowerCase().includes('inward');
                      const isPending = (ch.status || 'Pending').toLowerCase() === 'pending';
                      const isDeposited = (ch.status || '').toLowerCase() === 'deposited';
                      const isCleared = (ch.status || '').toLowerCase() === 'cleared';
                      const isReturned = (ch.status || '').toLowerCase() === 'returned';

                      return (
                        <tr key={ch.id || idx} className="hover:bg-surface2/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">
                            <div className="flex items-center gap-1.5">
                              <span>{ch.chequeNo}</span>
                              <button
                                onClick={() => setActiveChequeForPrint(ch)}
                                className="p-1 hover:bg-emerald-500/10 text-muted hover:text-emerald-600 rounded transition-colors"
                                title="Print CTS Standard Cheque & Voucher"
                              >
                                <Printer size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-secondary whitespace-nowrap">
                            <div>{ch.chequeDate ? ch.chequeDate.slice(0, 10) : '-'}</div>
                            {ch.realizedDate && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Realized: {ch.realizedDate.slice(0, 10)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-secondary">
                            <div>{ch.bankName || 'General Bank'}</div>
                            {ch.branchName && <div className="text-[10px] text-muted">{ch.branchName}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={isInward ? 'success' : 'info'}>
                              {isInward ? 'Inward (Received)' : 'Outward (Issued)'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-primary">
                            {ch.partyName || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted">
                            {ch.reference || ch.voucherNo || ch.refNo || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-primary whitespace-nowrap">
                            {formatCurrency(ch.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant={
                              isCleared ? 'success' :
                              isDeposited ? 'info' :
                              isReturned ? 'danger' : 'warning'
                            }>
                              {ch.status || 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Print Cheque Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveChequeForPrint(ch)}
                                className="h-7 px-2 text-[10px] text-secondary hover:text-primary hover:bg-surface2"
                                title="Print Cheque Leaf & Voucher"
                              >
                                <Printer size={12} className="mr-1" />
                                Print
                              </Button>

                              {/* Realize Cheque into GL on Realization Date */}
                              {!isCleared && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={statusUpdatingId === ch.id}
                                  onClick={() => setActiveChequeForRealize(ch)}
                                  className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  title="Mark Realized on specific date & post to General Ledger"
                                >
                                  <Check size={11} className="mr-1" />
                                  Realize to GL
                                </Button>
                              )}

                              {isInward && isPending && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={statusUpdatingId === ch.id}
                                  onClick={() => handleUpdateChequeStatus(ch, 'Deposited')}
                                  className="h-7 px-2 text-[10px] text-blue-400 hover:bg-blue-500/10"
                                >
                                  Deposited
                                </Button>
                              )}

                              {!isReturned && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={statusUpdatingId === ch.id}
                                  onClick={() => handleUpdateChequeStatus(ch, 'Returned')}
                                  className="h-7 px-2 text-[10px] text-rose-400 hover:bg-rose-500/10"
                                >
                                  <X size={11} className="mr-1" />
                                  Return
                                </Button>
                              )}

                              {(isCleared || isReturned || isDeposited) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={statusUpdatingId === ch.id}
                                  onClick={() => handleUpdateChequeStatus(ch, 'Pending')}
                                  className="h-7 px-1.5 text-[10px] text-muted hover:text-secondary"
                                  title="Revert status to Pending"
                                >
                                  Reset
                                </Button>
                              )}

                              {/* Delete Cheque Button */}
                              <button
                                type="button"
                                disabled={statusUpdatingId === ch.id}
                                onClick={() => handleDeleteCheque(ch)}
                                className="p-1 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete this cheque record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 3: Bank Transfers */}
      {activeTab === 'transfers' && (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-theme bg-surface2/60 text-secondary uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Transfer / Reference Ref #</th>
                  <th className="py-2.5 px-3">Bank / Account</th>
                  <th className="py-2.5 px-3">Party / Beneficiary</th>
                  <th className="py-2.5 px-3">Narration / Particulars</th>
                  <th className="py-2.5 px-3 text-right">Inflow (LKR)</th>
                  <th className="py-2.5 px-3 text-right">Outflow (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
                      No bank transfer settlements found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tr: any, idx: number) => {
                    const isIn = tr.type === 'IN';
                    return (
                      <tr key={tr.id || idx} className="hover:bg-surface2/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-secondary whitespace-nowrap">
                          {tr.date ? tr.date.slice(0, 10) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{tr.transactionRef || tr.reference || '-'}</span>
                            {tr.depositSlip && (
                              <button
                                type="button"
                                onClick={() => setViewingSlip({ url: tr.depositSlip, title: `${tr.transactionRef || tr.reference || 'Transfer'} — Bank Deposit Slip`, tx: tr })}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 transition-colors shadow-xs cursor-pointer"
                                title="View Bank Deposit Slip (තැන්පතු ස්ලිප්පුව බලන්න)"
                              >
                                <Paperclip size={10} />
                                <span>Slip</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-secondary">
                          {tr.bankName || 'Direct Bank Settlement'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary">
                          {tr.partyName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-secondary max-w-sm truncate" title={tr.particulars}>
                          {tr.particulars || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          {isIn ? formatCurrency(tr.amount) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-400">
                          {!isIn ? formatCurrency(tr.amount) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Tab 4: Payment Vouchers */}
      {activeTab === 'vouchers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              Issued general payment vouchers and supplier settlements
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setVoucherForm(initialVoucherState);
                setIsVoucherModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs bg-rex-600 hover:bg-rex-700 text-white"
            >
              <Plus size={14} />
              <span>New Payment Voucher</span>
            </Button>
          </div>

          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-theme bg-surface2/60 text-secondary uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payee / Beneficiary</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Payment Method & Instrument</th>
                    <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted">
                        No payment vouchers issued yet. Click "New Payment Voucher" to record one.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v: any) => (
                      <tr key={v.id} className="hover:bg-surface2/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-rex-400">
                          {v.voucherNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-secondary">
                          {v.date ? v.date.slice(0, 10) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary">
                          {v.payeeName}
                          {v.payeeType && (
                            <span className="text-[10px] text-muted block capitalize font-normal">
                              {v.payeeType}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-secondary">
                          {v.category || 'Disbursement'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={v.paymentMethod === 'Cash' ? 'default' : v.paymentMethod === 'Cheque' ? 'warning' : 'info'}>
                              {v.paymentMethod}
                            </Badge>
                            {v.depositSlip && (
                              <button
                                type="button"
                                onClick={() => setViewingSlip({ url: v.depositSlip, title: `Voucher ${v.voucherNo} — Bank Deposit Slip`, tx: v })}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors shadow-xs cursor-pointer"
                                title="View Bank Deposit Slip (තැන්පතු ස්ලිප්පුව බලන්න)"
                              >
                                <Paperclip size={10} />
                                <span>Slip</span>
                              </button>
                            )}
                          </div>
                          {v.chequeNo && (
                            <span className="text-[10px] font-mono text-muted block mt-0.5">
                              CHQ #{v.chequeNo} ({v.bankName || 'Bank'})
                            </span>
                          )}
                          {v.transactionRef && (
                            <span className="text-[10px] font-mono text-muted block mt-0.5">
                              Ref: {v.transactionRef}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(v.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="success">Paid</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {v.depositSlip && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingSlip({ url: v.depositSlip, title: `Voucher ${v.voucherNo} — Bank Deposit Slip`, tx: v })}
                                className="h-7 px-2 text-xs text-purple-400 hover:bg-purple-500/10 flex items-center gap-1"
                                title="View Bank Deposit Slip"
                              >
                                <Paperclip size={12} />
                                <span>Slip</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveVoucherForPrint(v)}
                              className="h-7 px-2 text-xs text-secondary hover:text-primary flex items-center gap-1"
                            >
                              <Printer size={12} />
                              <span>Print Voucher</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL 1: Issue Payment Voucher Modal */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Issue New Payment Voucher (ගෙවීම් වවුචරයක් නිකුත් කිරීම)"
        size="lg"
      >
        <form onSubmit={handleCreateVoucher} className="space-y-4">
          {/* Header Row: Date & Payee Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Voucher Date *
              </label>
              <input
                type="date"
                required
                value={voucherForm.date}
                onChange={e => setVoucherForm({ ...voucherForm, date: e.target.value })}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Payee Classification *
              </label>
              <select
                value={voucherForm.payeeType}
                onChange={e => {
                  const pt = e.target.value as any;
                  setVoucherForm({
                    ...voucherForm,
                    payeeType: pt,
                    payeeId: '',
                    payeeName: '',
                    category: pt === 'supplier' ? 'Supplier Bill Payment' : pt === 'employee' ? 'Staff Advance / Salary' : 'Operational Expense'
                  });
                }}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
              >
                <option value="supplier">Vendor / Supplier (සැපයුම්කරු)</option>
                <option value="employee">Employee / Staff (සේවක)</option>
                <option value="other">General Expense / Other Party (වෙනත්)</option>
              </select>
            </div>
          </div>

          {/* Payee Selection / Autocomplete */}
          <div>
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Payee / Beneficiary Name *
            </label>
            {voucherForm.payeeType === 'supplier' ? (
              <SupplierAutocomplete
                value={voucherForm.payeeId}
                onChange={(supplierId, supplier) => {
                  setVoucherForm({
                    ...voucherForm,
                    payeeId: supplierId,
                    payeeName: supplier?.name || supplierId,
                    bankName: supplier?.bankName || voucherForm.bankName
                  });
                }}
                placeholder="Type supplier name or company to search..."
                required
              />
            ) : (
              <input
                type="text"
                required
                placeholder="Enter payee / beneficiary full name..."
                value={voucherForm.payeeName}
                onChange={e => setVoucherForm({ ...voucherForm, payeeName: e.target.value })}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
              />
            )}
          </div>

          {/* If Supplier Selected: Load & Display Outstanding Bills */}
          {voucherForm.payeeType === 'supplier' && voucherForm.payeeId && (
            <div className="p-3 bg-surface2/70 border border-amber-500/30 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>Pending Supplier Bills ({supplierBills.length})</span>
                </span>
                {loadingSupplierBills && (
                  <span className="text-[10px] text-muted flex items-center gap-1 animate-pulse">
                    <RefreshCw size={11} className="animate-spin" /> Fetching bills...
                  </span>
                )}
              </div>

              {loadingSupplierBills ? (
                <div className="py-4 text-center text-xs text-muted">
                  Loading supplier's pending bills...
                </div>
              ) : supplierBills.length === 0 ? (
                <div className="text-xs text-muted italic bg-surface/50 p-2 rounded border border-theme">
                  No unpaid or pending bills found for this supplier. (This voucher will be recorded as a general vendor disbursement / advance).
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto border border-theme rounded-lg divide-y divide-theme bg-surface">
                    {supplierBills.map((b: any) => {
                      const total = Number(b.totalAmount || b.amount || 0);
                      const paid = Number(b.paidAmount || 0);
                      const due = Math.max(0, total - paid);
                      const isSelected = voucherForm.relatedBillId === b.id;

                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            if (isSelected) {
                              setVoucherForm({
                                ...voucherForm,
                                relatedBillId: '',
                                relatedBillNo: ''
                              });
                            } else {
                              setVoucherForm({
                                ...voucherForm,
                                relatedBillId: b.id,
                                relatedBillNo: b.invoiceNo || b.id,
                                amount: due > 0 ? due.toString() : total.toString(),
                                description: `Settlement for Supplier Bill #${b.invoiceNo || b.id}`
                              });
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-amber-500/15 border-l-4 border-l-amber-500' 
                              : 'hover:bg-surface2/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary">
                                Bill #{b.invoiceNo || b.id}
                              </span>
                              <Badge variant={isSelected ? 'warning' : 'default'}>
                                {b.status || 'unpaid'}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted block mt-0.5 font-mono">
                              Date: {b.date ? b.date.slice(0, 10) : (b.billDate ? b.billDate.slice(0, 10) : '-')} | Total: {formatCurrency(total)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-muted block uppercase">Due Balance</span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {formatCurrency(due)}
                            </span>
                            <span className="text-[9px] text-rex-400 block mt-0.5 underline">
                              {isSelected ? 'Selected (Click to deselect)' : 'Click to Settle'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {voucherForm.relatedBillId && (
                    <div className="flex items-center justify-between text-xs pt-1 px-1 text-emerald-400">
                      <span>✓ Linked to Bill #{voucherForm.relatedBillNo}</span>
                      <button
                        type="button"
                        onClick={() => setVoucherForm({ ...voucherForm, relatedBillId: '', relatedBillNo: '' })}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        Clear Bill Link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Disbursement Amount (LKR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={voucherForm.amount}
                  onChange={e => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  className="w-full bg-surface border border-theme rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-primary outline-none focus:ring-1 focus:ring-rex-500 font-mono"
                />
              </div>
              {Number(voucherForm.amount) > 0 && (
                <span className="text-[10px] text-muted block mt-1 italic">
                  {numberToWords(Number(voucherForm.amount))}
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Voucher Category *
              </label>
              <select
                value={voucherForm.category}
                onChange={e => setVoucherForm({ ...voucherForm, category: e.target.value })}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
              >
                <option value="Supplier Bill Payment">Supplier Bill Payment</option>
                <option value="Raw Materials Advance">Raw Materials Advance</option>
                <option value="Staff Advance / Salary">Staff Advance / Salary</option>
                <option value="Machinery & Maintenance">Machinery & Maintenance</option>
                <option value="Electricity / Water / Utility">Electricity / Water / Utility</option>
                <option value="Vehicle Fuel & Transport">Vehicle Fuel & Transport</option>
                <option value="Office & Administrative">Office & Administrative</option>
                <option value="Other Disbursement">Other Disbursement</option>
              </select>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cheque', label: 'Cheque (චෙක්පත්)', icon: Clock },
                { id: 'Bank Transfer', label: 'Bank Transfer / SLIPS', icon: Landmark },
                { id: 'Cash', label: 'Cash in Hand (මුදල්)', icon: DollarSign }
              ].map(pm => {
                const Icon = pm.icon;
                const isSelected = voucherForm.paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setVoucherForm({ ...voucherForm, paymentMethod: pm.id as any })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-rex-600 text-white border-rex-600 shadow-sm'
                        : 'bg-surface border-theme text-secondary hover:text-primary hover:border-theme-subtle'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instrument Details: Cheque Fields */}
          {voucherForm.paymentMethod === 'Cheque' && (
            <div className="p-3 bg-surface2/60 border border-amber-500/30 rounded-lg space-y-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Cheque Instrument Details (චෙක්පත් විස්තර):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100452"
                    value={voucherForm.chequeNo}
                    onChange={e => setVoucherForm({ ...voucherForm, chequeNo: e.target.value })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Cheque Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherForm.chequeDate}
                    onChange={e => setVoucherForm({ ...voucherForm, chequeDate: e.target.value })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Drawn Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Commercial Bank"
                    value={voucherForm.bankName}
                    onChange={e => setVoucherForm({ ...voucherForm, bankName: e.target.value })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instrument Details: Bank Transfer Fields */}
          {voucherForm.paymentMethod === 'Bank Transfer' && (
            <div className="p-3 bg-surface2/60 border border-purple-500/30 rounded-lg space-y-3">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                Bank Transfer & Wire Details (පැවරුම් විස්තර):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Transaction / SLIPS Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CEFT-883921 / TRF-091"
                    value={voucherForm.transactionRef}
                    onChange={e => setVoucherForm({ ...voucherForm, transactionRef: e.target.value })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary font-mono outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Paid From Bank Account
                  </label>
                  <select
                    value={voucherForm.bankAccountId}
                    onChange={e => setVoucherForm({ ...voucherForm, bankAccountId: e.target.value })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- Select Bank Account --</option>
                    {bankAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank Transfer Slip Attachment */}
              <div className="pt-2 border-t border-purple-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip size={11} className="text-purple-400" />
                    <span>Bank Deposit Slip / Wire Confirmation (ස්ලිප්පුව අමුණන්න)</span>
                  </label>
                  {voucherForm.depositSlip && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      ✓ Attached
                    </span>
                  )}
                </div>

                {!voucherForm.depositSlip ? (
                  <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-theme hover:border-purple-500/50 rounded-lg bg-surface/50 hover:bg-purple-500/5 transition-all cursor-pointer">
                    <Upload size={14} className="text-secondary" />
                    <span className="text-xs font-medium text-secondary">
                      {isUploadingVoucherSlip ? 'Uploading slip...' : 'Attach Deposit / Transfer Slip (Image / PDF)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={isUploadingVoucherSlip}
                      onChange={handleVoucherSlipUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-surface border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2 truncate">
                      {voucherForm.depositSlip.startsWith('data:image') || /\.(jpg|jpeg|png|webp)($|\?)/i.test(voucherForm.depositSlip) ? (
                        <img src={voucherForm.depositSlip} alt="Slip" className="w-8 h-8 object-cover rounded border border-theme" />
                      ) : (
                        <FileText size={16} className="text-purple-400" />
                      )}
                      <span className="text-xs font-medium truncate">Bank Slip Attached</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingSlip({ url: voucherForm.depositSlip, title: 'Deposit Slip Preview' })}
                        className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
                        title="Preview"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoucherForm(prev => ({ ...prev, depositSlip: '' }))}
                        className="p-1 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
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

          {/* Instrument Details: Cash Account Field */}
          {voucherForm.paymentMethod === 'Cash' && (
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                Drawn from Cash Account (Source)
              </label>
              <select
                value={voucherForm.cashAccountId}
                onChange={e => setVoucherForm({ ...voucherForm, cashAccountId: e.target.value })}
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500"
              >
                <option value="">-- Main Petty Cash / Counter Cash --</option>
                {cashAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name} ({formatCurrency(a.balance || 0)})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted block mt-0.5">
                Will automatically post an OUT cashbook disbursement if selected.
              </span>
            </div>
          )}

          {/* Description & Narration */}
          <div>
            <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
              Description / Payment Narration (විස්තරය)
            </label>
            <textarea
              rows={2}
              placeholder="Provide reason for payment, invoice reference, or authorization details..."
              value={voucherForm.description}
              onChange={e => setVoucherForm({ ...voucherForm, description: e.target.value })}
              className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:ring-1 focus:ring-rex-500 resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsVoucherModalOpen(false)}
              disabled={isSubmittingVoucher}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingVoucher}
              className="bg-rex-600 hover:bg-rex-700 text-white font-medium px-4"
            >
              {isSubmittingVoucher ? 'Generating Voucher...' : 'Generate & Issue Voucher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Printable Payment Voucher View (Standard Half-Page Slip format matching Dispatch Note) */}
      <PaymentVoucherPrintModal
        voucher={activeVoucherForPrint}
        isOpen={!!activeVoucherForPrint}
        onClose={() => setActiveVoucherForPrint(null)}
        settings={settings}
      />

      {/* MODAL 3: Printable Daily Cash Flow Summary Report */}
      <Modal
        isOpen={isPrintReportModalOpen}
        onClose={() => setIsPrintReportModalOpen(false)}
        title="Print Daily Cash Flow & Instrument Report"
        size="lg"
      >
        <div className="space-y-4">
          <div id="rex-cash-flow-report-print" className="bg-white text-slate-900 p-6 rounded-lg border border-slate-300 font-sans text-xs">
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold uppercase">{settings?.companyName || 'REX GROUP'}</h2>
                <h3 className="text-xs uppercase font-semibold text-slate-600">Daily Cash Flow & Settlement Summary</h3>
                <span className="text-[11px] text-slate-500">Period: {startDate} to {endDate}</span>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-600">
                Printed: {new Date().toLocaleString()}
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-200">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Inflows</span>
                <span className="text-base font-mono font-bold text-emerald-700">
                  {formatCurrency(data?.totals?.totalInflow || 0, true)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Outflows</span>
                <span className="text-base font-mono font-bold text-rose-700">
                  {formatCurrency(data?.totals?.totalOutflow || 0, true)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Net Flow</span>
                <span className="text-base font-mono font-bold text-slate-900">
                  {formatCurrency(data?.totals?.netCashFlow || 0, true)}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-3">
              <span className="text-[11px] font-bold uppercase text-slate-700 block mb-2">Itemized Transactions:</span>
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                    <th className="p-1.5 border border-slate-300">Date</th>
                    <th className="p-1.5 border border-slate-300">Reference / Doc</th>
                    <th className="p-1.5 border border-slate-300">Method / Instrument</th>
                    <th className="p-1.5 border border-slate-300">Party</th>
                    <th className="p-1.5 border border-slate-300 text-right">Inflow (LKR)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Outflow (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-1.5 border border-slate-200 font-mono">{tx.date}</td>
                      <td className="p-1.5 border border-slate-200 font-mono">{tx.reference || '-'}</td>
                      <td className="p-1.5 border border-slate-200">
                        {tx.paymentMethod} {tx.chequeNo ? `(#${tx.chequeNo})` : ''}
                      </td>
                      <td className="p-1.5 border border-slate-200">{tx.partyName || '-'}</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {tx.type === 'IN' ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {tx.type === 'OUT' ? formatCurrency(tx.amount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Certification Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
              <div className="border-t border-slate-400 pt-1">
                <span className="text-[10px] uppercase text-slate-500 block">Cashier / Staff</span>
              </div>
              <div className="border-t border-slate-400 pt-1">
                <span className="text-[10px] uppercase text-slate-500 block">Accountant</span>
              </div>
              <div className="border-t border-slate-400 pt-1">
                <span className="text-[10px] uppercase text-slate-500 block">Managing Director</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPrintReportModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const printContents = document.getElementById('rex-cash-flow-report-print')?.innerHTML;
                if (!printContents) return;
                const win = window.open('', '', 'width=900,height=700');
                if (win) {
                  win.document.write(`
                    <html>
                      <head>
                        <title>Cash Flow Report - ${startDate} to ${endDate}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                      </head>
                      <body class="p-6">
                        ${printContents}
                      </body>
                    </html>
                  `);
                  win.document.close();
                  win.focus();
                  setTimeout(() => {
                    win.print();
                    win.close();
                  }, 500);
                }
              }}
              className="bg-rex-600 hover:bg-rex-700 text-white flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print Report</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deposit Slip Viewer Modal */}
      {viewingSlip && (
        <Modal
          isOpen={true}
          onClose={() => setViewingSlip(null)}
          title={viewingSlip.title || "Bank Deposit Slip"}
          size="xl"
        >
          <div className="p-4 space-y-4">
            {/* Context details if tx is present */}
            {viewingSlip.tx && (
              <div className="p-3 bg-surface2/60 border border-theme rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">Transaction / Ref</span>
                  <span className="font-mono font-bold text-primary">
                    {viewingSlip.tx.refNo || viewingSlip.tx.voucherNo || viewingSlip.tx.transactionRef || 'Record'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">Party</span>
                  <span className="font-semibold text-primary">
                    {viewingSlip.tx.partyName || viewingSlip.tx.payeeName || 'Direct'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted block">Payment Method</span>
                  <span className="font-semibold text-secondary">
                    {viewingSlip.tx.paymentMethod || 'Bank Transfer'}
                  </span>
                </div>
                {viewingSlip.tx.amount !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted block">Amount</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(viewingSlip.tx.amount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Slip Preview Area */}
            <div className="border border-theme rounded-lg overflow-hidden bg-background/80 flex items-center justify-center min-h-[300px] max-h-[65vh] p-2">
              {viewingSlip.url.startsWith('data:application/pdf') || viewingSlip.url.endsWith('.pdf') ? (
                <iframe
                  src={viewingSlip.url}
                  title="PDF Slip Preview"
                  className="w-full h-[60vh] border-0 rounded"
                />
              ) : (
                <img
                  src={viewingSlip.url}
                  alt="Bank Deposit Slip"
                  className="max-h-[60vh] max-w-full object-contain mx-auto rounded shadow-md"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-theme-subtle">
              <a
                href={viewingSlip.url}
                target="_blank"
                rel="noopener noreferrer"
                download="deposit-slip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme bg-surface hover:bg-surface2 text-xs font-semibold text-primary transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Open in New Tab / Download</span>
              </a>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingSlip(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cheque Management Modals */}
      {isCreateChequeModalOpen && (
        <CreateChequeModal
          isOpen={isCreateChequeModalOpen}
          onClose={() => setIsCreateChequeModalOpen(false)}
          onSuccess={() => {
            loadCashFlow();
            loadVouchers();
          }}
        />
      )}

      {activeChequeForRealize && (
        <ChequeRealizationModal
          isOpen={!!activeChequeForRealize}
          onClose={() => setActiveChequeForRealize(null)}
          cheque={activeChequeForRealize}
          onConfirmRealize={handleRealizeCheque}
        />
      )}

      {activeChequeForPrint && (
        <ChequePrintModal
          isOpen={!!activeChequeForPrint}
          onClose={() => setActiveChequeForPrint(null)}
          cheque={activeChequeForPrint}
        />
      )}
    </div>
  );
};
