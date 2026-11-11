import React, { useState, useEffect } from 'react';
import { 
  Plus, Printer, Search, RefreshCw, Eye, X, DollarSign, Clock, FileText, 
  Calendar, Building2, User, CheckCircle2, ArrowRightLeft 
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import { useAccounts } from '@/hooks/useFinance';
import { getPaymentVouchers, createPaymentVoucher } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';
import { useSettings } from '@/contexts/SettingsContext';

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

export const VouchersTab: React.FC = () => {
  const { settings } = useSettings();
  const { data: accounts } = useAccounts();
  const { showError, toast } = useDialog();

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'Cash' | 'Cheque'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'Cash' | 'Cheque'>('Cash');
  const [activePrintVoucher, setActivePrintVoucher] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payeeType, setPayeeType] = useState<'supplier' | 'customer' | 'employee' | 'other'>('supplier');
  const [payeeId, setPayeeId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('Supplier Bill Payment');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [description, setDescription] = useState('');

  // Cheque Fields
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState('Commercial Bank');

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const res = await getPaymentVouchers();
      setVouchers(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const openNewModal = (type: 'Cash' | 'Cheque') => {
    setVoucherType(type);
    setDate(new Date().toISOString().slice(0, 10));
    setPayeeType('supplier');
    setPayeeId('');
    setPayeeName('');
    setAmount('');
    setCategory(type === 'Cash' ? 'Office & Petty Cash' : 'Supplier Bill Payment');
    setDescription('');
    setChequeNo('');
    setChequeDate(new Date().toISOString().slice(0, 10));
    setBankName('Commercial Bank');

    // Default source account
    if (type === 'Cash') {
      const petty = accounts.find(a => a.type === 'Asset' && (a.code === '1110' || a.name?.toLowerCase().includes('petty')));
      setSourceAccountId(petty ? petty.id : '');
    } else {
      const bank = accounts.find(a => a.type === 'Asset' && (a.code === '1000' || a.name?.toLowerCase().includes('bank')));
      setSourceAccountId(bank ? bank.id : '');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      return showError('Please enter a valid amount greater than 0', 'Validation Error');
    }
    if (!payeeName.trim()) {
      return showError('Please select or specify the payee name', 'Validation Error');
    }
    if (voucherType === 'Cheque' && !chequeNo.trim()) {
      return showError('Cheque number is required for Cheque Voucher', 'Validation Error');
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        date,
        payeeType,
        payeeId: payeeId || null,
        payeeName: payeeName.trim(),
        category,
        amount: numAmount,
        paymentMethod: voucherType,
        chequeNo: voucherType === 'Cheque' ? chequeNo.trim() : null,
        chequeDate: voucherType === 'Cheque' ? chequeDate : null,
        bankName: voucherType === 'Cheque' ? bankName.trim() : null,
        bankAccountId: voucherType === 'Cheque' ? (sourceAccountId || null) : null,
        cashAccountId: voucherType === 'Cash' ? (sourceAccountId || null) : null,
        accountId: expenseAccountId || null,
        description: description.trim() || `${voucherType} Voucher Payment to ${payeeName}`
      };

      const res = await createPaymentVoucher(payload);
      toast(`${voucherType} Voucher ${res.voucherNo} issued successfully!`, 'success');
      setIsModalOpen(false);
      if (res.voucher) {
        setActivePrintVoucher(res.voucher);
      }
      loadVouchers();
    } catch (err: any) {
      showError(err.message || 'Failed to issue voucher', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    if (methodFilter !== 'ALL' && v.paymentMethod !== methodFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (v.voucherNo && v.voucherNo.toLowerCase().includes(q)) ||
                    (v.payeeName && v.payeeName.toLowerCase().includes(q)) ||
                    (v.chequeNo && v.chequeNo.toLowerCase().includes(q)) ||
                    (v.description && v.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-theme-subtle">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search size={14} className="text-muted" />
          <input
            type="text"
            placeholder="Search vouchers by #, payee, cheque, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-primary placeholder:text-muted outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted hover:text-primary">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Method Filter Pills */}
          <div className="flex items-center gap-1 bg-surface2/60 p-0.5 rounded border border-theme-subtle text-xs">
            {(['ALL', 'Cash', 'Cheque'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  methodFilter === m
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {m === 'ALL' ? 'All Vouchers' : `${m} Vouchers`}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadVouchers}
            disabled={loading}
            icon={RefreshCw}
            className="text-xs text-secondary"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewModal('Cash')}
            icon={DollarSign}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            + Cash Voucher
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openNewModal('Cheque')}
            icon={Clock}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
          >
            + Cheque Voucher
          </Button>
        </div>
      </div>

      {/* Vouchers Table */}
      <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface2/60 border-b border-theme-subtle text-muted uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3">Voucher #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Payee / Beneficiary</th>
                <th className="p-3">Instrument Details</th>
                <th className="p-3">Category / Notes</th>
                <th className="p-3 text-right">Amount (LKR)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle font-medium">
              {filteredVouchers.map((v: any) => {
                const isCash = v.paymentMethod === 'Cash';
                return (
                  <tr key={v.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      {v.voucherNo || v.id}
                    </td>
                    <td className="p-3 text-secondary font-mono text-[11px]">
                      {v.date ? v.date.slice(0, 10) : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCash
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {isCash ? <DollarSign size={10} /> : <Clock size={10} />}
                        {v.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-primary text-xs">{v.payeeName}</p>
                      <span className="text-[10px] text-muted capitalize">{v.payeeType || 'Other'}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {v.paymentMethod === 'Cheque' ? (
                        <div>
                          <span className="font-bold text-amber-500">Chq: {v.chequeNo || 'N/A'}</span>
                          <p className="text-[10px] text-muted">{v.bankName || 'Bank'} • Due: {v.chequeDate ? v.chequeDate.slice(0, 10) : '-'}</p>
                        </div>
                      ) : (
                        <span className="text-secondary">Cash Payment</span>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="text-xs text-primary truncate max-w-xs">{v.category || '-'}</p>
                      <p className="text-[10px] text-muted truncate max-w-xs">{v.description || '-'}</p>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-sm text-primary">
                      {formatCurrency(Number(v.amount || 0), true)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setActivePrintVoucher(v)}
                        className="p-1.5 hover:bg-surface2 rounded text-secondary hover:text-primary transition-colors"
                        title="Print / View Voucher"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted text-xs">
                    {loading ? 'Loading payment vouchers...' : 'No payment vouchers found. Click "+ Cash Voucher" or "+ Cheque Voucher" to issue one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL: Issue Cash or Cheque Voucher */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Issue ${voucherType} Voucher`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Voucher Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono font-bold focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Payee Classification *</label>
              <select
                value={payeeType}
                onChange={e => {
                  const pt = e.target.value as any;
                  setPayeeType(pt);
                  setPayeeId('');
                  setPayeeName('');
                }}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="supplier">Vendor / Supplier</option>
                <option value="customer">Customer</option>
                <option value="employee">Employee / Staff</option>
                <option value="other">General Expense / Other</option>
              </select>
            </div>
          </div>

          {/* Autocomplete for Payee */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">
              Payee / Beneficiary Name *
            </label>
            {payeeType === 'supplier' ? (
              <SupplierAutocomplete
                value={payeeId}
                onChange={(sId, supp) => {
                  setPayeeId(sId);
                  setPayeeName(supp?.company || supp?.name || sId);
                }}
                placeholder="Type supplier company or name..."
                required
              />
            ) : payeeType === 'customer' ? (
              <CustomerAutocomplete
                value={payeeId}
                onChange={(cId, cust) => {
                  setPayeeId(cId);
                  setPayeeName(cust?.company || cust?.name || cId);
                }}
                placeholder="Type customer name or company..."
                required
              />
            ) : (
              <input
                type="text"
                required
                placeholder="Enter payee full name..."
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded text-xs font-semibold focus:border-primary"
              />
            )}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Disbursement Amount (LKR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-mono font-bold text-primary focus:border-primary"
              />
              {Number(amount) > 0 && (
                <span className="text-[10px] text-muted block mt-0.5 italic truncate">
                  {numberToWords(Number(amount))}
                </span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs font-semibold focus:border-primary"
              >
                <option value="Supplier Bill Payment">Supplier Bill Payment</option>
                <option value="Raw Materials Advance">Raw Materials Advance</option>
                <option value="Office & Petty Cash">Office & Petty Cash</option>
                <option value="Staff Advance / Salary">Staff Advance / Salary</option>
                <option value="Machinery & Maintenance">Machinery & Maintenance</option>
                <option value="Utility / Transport">Utility / Transport</option>
                <option value="Customer Refund">Customer Refund</option>
                <option value="Other Disbursement">Other Disbursement</option>
              </select>
            </div>
          </div>

          {/* Accounts selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Source Account ({voucherType === 'Cash' ? 'Cash/Petty' : 'Bank'}) *
              </label>
              <AccountAutocomplete
                value={sourceAccountId}
                onChange={setSourceAccountId}
                typeFilter="Asset"
                placeholder="Search Cash or Bank account..."
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">
                Expense / Target Account (Optional)
              </label>
              <AccountAutocomplete
                value={expenseAccountId}
                onChange={setExpenseAccountId}
                typeFilter={['Expense', 'Liability', 'Asset']}
                placeholder="Search expense or payable account..."
              />
            </div>
          </div>

          {/* Specific Cheque Fields */}
          {voucherType === 'Cheque' && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                Cheque Instrument Details
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Cheque No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100452"
                    value={chequeNo}
                    onChange={e => setChequeNo(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-mono font-bold focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Cheque Date *</label>
                  <input
                    type="date"
                    required
                    value={chequeDate}
                    onChange={e => setChequeDate(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-mono focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Drawn Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Commercial Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded text-xs font-semibold focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Description / Narration</label>
            <textarea
              rows={2}
              placeholder="Reason for payment, invoice references..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded text-xs resize-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Issuing...' : `Issue ${voucherType} Voucher`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PRINT VIEW MODAL */}
      <Modal
        isOpen={!!activePrintVoucher}
        onClose={() => setActivePrintVoucher(null)}
        title={`Print Voucher - ${activePrintVoucher?.voucherNo || ''}`}
        size="lg"
      >
        {activePrintVoucher && (
          <div className="space-y-4">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #accounting-voucher-print-area, #accounting-voucher-print-area * { visibility: visible; }
                #accounting-voucher-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div id="accounting-voucher-print-area" className="bg-white text-slate-900 p-6 rounded-lg border border-slate-300 shadow-sm font-sans">
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                    {settings?.companyName || 'REX GROUP / REX WIRELESS (PVT) LTD'}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Industrial Zone, Colombo, Sri Lanka | Finance & Accounts Dept
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-slate-900 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider inline-block">
                    {activePrintVoucher.paymentMethod === 'Cheque' ? 'CHEQUE PAYMENT VOUCHER' : 'CASH PAYMENT VOUCHER'}
                  </div>
                  <p className="text-sm font-mono font-bold mt-1 text-slate-900">
                    {activePrintVoucher.voucherNo || activePrintVoucher.id}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Date: {activePrintVoucher.date ? activePrintVoucher.date.slice(0, 10) : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Paid To (Payee):</span>
                  <span className="font-bold text-sm text-slate-900 block mt-0.5">{activePrintVoucher.payeeName}</span>
                  <span className="text-slate-600 text-[11px] capitalize">Category: {activePrintVoucher.category || 'General'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Payment Instrument:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{activePrintVoucher.paymentMethod || 'Cash'}</span>
                  {activePrintVoucher.paymentMethod === 'Cheque' && (
                    <span className="text-slate-700 text-[11px] block font-mono">
                      Chq #{activePrintVoucher.chequeNo} • {activePrintVoucher.bankName} • {activePrintVoucher.chequeDate ? activePrintVoucher.chequeDate.slice(0, 10) : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="py-4 border-b border-slate-200">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold mb-1">Narration & Particulars:</span>
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                  {activePrintVoucher.description || 'Disbursement for official business.'}
                </p>
              </div>

              <div className="py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Amount in Words:</span>
                  <span className="text-xs font-semibold italic text-slate-800">
                    {numberToWords(Number(activePrintVoucher.amount || 0))}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {formatCurrency(Number(activePrintVoucher.amount || 0), true)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Prepared By</div>
                  <span className="text-[10px] text-slate-500 uppercase">Accounts Officer</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Checked & Verified</div>
                  <span className="text-[10px] text-slate-500 uppercase">Finance Manager</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Payee Signature</div>
                  <span className="text-[10px] text-slate-500 uppercase">Received By</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActivePrintVoucher(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                Print Voucher
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
