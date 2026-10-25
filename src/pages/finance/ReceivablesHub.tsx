import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Plus, Filter, ArrowUpRight, Receipt, FileText, 
  CheckCircle2, Clock, AlertTriangle, CreditCard, DollarSign,
  Building2, ExternalLink, Search, RefreshCw, X
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useInvoices, useCustomers } from '@/hooks/useData';
import { useAccounts } from '@/hooks/useFinance';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { addInvoicePayment, fetchPaymentReceipts } from '@/lib/api';
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal';
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal';
import { ProformaInvoicePrintModal } from '@/components/crm/ProformaInvoicePrintModal';
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner';

type ActiveTab = 'aging' | 'invoices' | 'proformas' | 'receipts';

export const ReceivablesHub: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useDialog();
  const { settings } = useSettings();
  const { data: allInvoices = [], loading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: accounts = [] } = useAccounts();

  const [activeTab, setActiveTab] = useState<ActiveTab>('aging');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [agingData, setAgingData] = useState<any[]>([]);
  const [loadingAging, setLoadingAging] = useState(true);
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  // Proforma Invoice Print Modal State
  const [activePrintProforma, setActivePrintProforma] = useState<any | null>(null);

  // Payment Recording Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Bank Transfer',
    accountId: '',
    reference: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Advance Receipt Modal States
  const [isCreateReceiptOpen, setIsCreateReceiptOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<any | null>(null);

  // Fetch AR Aging Report Data
  const loadAging = useCallback(() => {
    setLoadingAging(true);
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/aging?type=ar`)
      .then(res => res.json())
      .then(res => {
        setAgingData(Array.isArray(res) ? res : []);
        setLoadingAging(false);
      })
      .catch(err => {
        console.error('Failed to load AR aging:', err);
        setAgingData([]);
        setLoadingAging(false);
      });
  }, []);

  // Fetch Payment Receipts List
  const loadReceipts = useCallback(() => {
    setLoadingReceipts(true);
    fetchPaymentReceipts()
      .then(res => {
        setPaymentReceipts(Array.isArray(res) ? res : []);
        setLoadingReceipts(false);
      })
      .catch(err => {
        console.error('Failed to load payment receipts:', err);
        setPaymentReceipts([]);
        setLoadingReceipts(false);
      });
  }, []);

  useEffect(() => {
    loadAging();
    loadReceipts();
  }, [loadAging, loadReceipts]);

  // Outstanding / Unpaid Commercial Invoices (excluding proformas)
  const openInvoices = useMemo(() => {
    return allInvoices.filter((inv: any) => {
      const isProf = Boolean(
        inv.isProforma ||
        inv.invoiceType === 'proforma' ||
        inv.status === 'proforma' ||
        String(inv.id || inv.invoiceNo || '').startsWith('PI-')
      );
      if (isProf) return false;
      const tot = Number(inv.total || inv.amount || 0);
      const paid = Number(inv.paidAmount || 0);
      const isPaid = inv.status === 'paid' || (tot > 0 && paid >= tot);
      return !isPaid && inv.status !== 'draft';
    });
  }, [allInvoices]);

  // Advance Proforma Invoices
  const proformaInvoices = useMemo(() => {
    return allInvoices.filter((inv: any) => {
      return Boolean(
        inv.isProforma ||
        inv.invoiceType === 'proforma' ||
        inv.status === 'proforma' ||
        String(inv.id || inv.invoiceNo || '').startsWith('PI-')
      );
    });
  }, [allInvoices]);

  // Proforma Summary Metrics
  const proformaMetrics = useMemo(() => {
    const totalExpected = proformaInvoices.reduce((s, pi) => s + (Number(pi.total || pi.amount || 0)), 0);
    const totalCollected = proformaInvoices.reduce((s, pi) => s + (Number(pi.paidAmount || 0)), 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);
    const pendingCount = proformaInvoices.filter((pi: any) => {
      const tot = Number(pi.total || pi.amount || 0);
      const paid = Number(pi.paidAmount || 0);
      return !(pi.status === 'paid' || (tot > 0 && paid >= tot));
    }).length;
    return { totalExpected, totalCollected, totalPending, pendingCount };
  }, [proformaInvoices]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalDue = agingData.reduce((s, r) => s + (Number(r.balance) || 0), 0);
    const overdue90 = agingData.reduce((s, r) => s + (Number(r.bucket90plus) || 0), 0);
    const current30 = agingData.reduce((s, r) => s + (Number(r.bucket30) || 0), 0);
    const totalAdvances = paymentReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    return { totalDue, overdue90, current30, totalAdvances };
  }, [agingData, paymentReceipts]);

  // Aging Data Filtering
  const filteredAging = useMemo(() => {
    let list = agingData.filter(r => (r.partyName || '').toLowerCase().includes(search.toLowerCase()));
    if (filterType === 'overdue') list = list.filter(r => Number(r.bucket90plus) > 0);
    return list;
  }, [agingData, search, filterType]);

  // Commercial Invoices Filtering
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return openInvoices.filter((inv: any) => {
      const invNo = (inv.invoiceNo || inv.id || '').toLowerCase();
      const party = (inv.customerName || inv.customerId || '').toLowerCase();
      return !q || invNo.includes(q) || party.includes(q);
    });
  }, [openInvoices, search]);

  // Advance Proformas Filtering
  const filteredProformas = useMemo(() => {
    const q = search.toLowerCase();
    return proformaInvoices.filter((pi: any) => {
      const piNo = (pi.invoiceNo || pi.id || '').toLowerCase();
      const cust = (pi.customerName || pi.customerCompany || pi.customerId || '').toLowerCase();
      const ord = (pi.orderNo || '').toLowerCase();
      const quo = (pi.quotationNo || '').toLowerCase();
      return !q || piNo.includes(q) || cust.includes(q) || ord.includes(q) || quo.includes(q);
    });
  }, [proformaInvoices, search]);

  // Receipts Filtering
  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase();
    return paymentReceipts.filter((rec: any) => {
      const recNo = (rec.receiptNo || rec.id || '').toLowerCase();
      const cust = (rec.customerName || rec.customerCompany || '').toLowerCase();
      const ord = (rec.orderNo || '').toLowerCase();
      const quo = (rec.quotationNo || '').toLowerCase();
      const inv = (rec.invoiceNo || '').toLowerCase();
      return !q || recNo.includes(q) || cust.includes(q) || ord.includes(q) || quo.includes(q) || inv.includes(q);
    });
  }, [paymentReceipts, search]);

  // Enriched Proforma Preview Handler
  const handleOpenPrintProforma = (proforma: any) => {
    if (!proforma) return;
    const matchedCustomer = customers.find((c: any) => 
      c.id === proforma.customerId || 
      c.id === proforma.leadId || 
      (c.name && c.name.toLowerCase() === (proforma.customerName || '').toLowerCase())
    );
    const enriched = {
      ...proforma,
      customerName: proforma.customerName || matchedCustomer?.name || 'Customer',
      customerCompany: proforma.customerCompany || matchedCustomer?.company || proforma.customerName || 'Customer',
      customerAddress: proforma.customerAddress || matchedCustomer?.address || '',
      customerPhone: proforma.customerPhone || matchedCustomer?.phone || '',
      customerEmail: proforma.customerEmail || matchedCustomer?.email || '',
      customerVat: proforma.customerVat || matchedCustomer?.taxNumber || matchedCustomer?.vatNumber || ''
    };
    setActivePrintProforma(enriched);
  };

  // Open Direct Payment Modal for an Invoice
  const handleOpenPaymentModal = (invoice: any) => {
    const invTotal = Number(invoice.total || invoice.amount || 0);
    const invPaid = Number(invoice.paidAmount || 0);
    const balanceDue = Math.max(0, invTotal - invPaid);

    setPaymentModalInvoice(invoice);
    setPaymentForm({
      amount: balanceDue > 0 ? String(balanceDue) : '',
      method: 'Bank Transfer',
      accountId: '',
      reference: '',
      date: new Date().toISOString().slice(0, 10),
      notes: `Settlement for Invoice ${invoice.invoiceNo || invoice.id}`
    });
  };

  // Submit Payment for Invoice
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid payment amount greater than zero', 'error');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await addInvoicePayment(paymentModalInvoice.id, {
        amount: amt,
        method: paymentForm.method,
        accountId: paymentForm.accountId || null,
        reference: paymentForm.reference || null,
        date: paymentForm.date
      });

      if (res && res.error) {
        throw new Error(res.error || 'Failed to record payment');
      }

      toast(`Payment of ${formatCurrency(amt)} recorded successfully for Invoice ${paymentModalInvoice.invoiceNo || paymentModalInvoice.id}!`, 'success');
      if (res && res.receipt) {
        setPrintReceipt(res.receipt);
      }
      setPaymentModalInvoice(null);
      refetchInvoices();
      loadAging();
      loadReceipts();
    } catch (err: any) {
      toast(err?.message || 'Failed to record payment', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Columns: Aging Table
  const agingColumns: Column<any>[] = [
    {
      key: 'customer', header: 'Customer Party', sortable: true,
      render: (_, row) => (
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => row.partyId && row.partyId !== 'WALK-IN' && navigate(`/crm/customers/${row.partyId}`)}
          title="Click to view full Customer Profile & Ledger"
        >
          <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 border border-emerald-500/40 flex items-center justify-center text-white font-bold text-xs rounded-none group-hover:scale-105 transition-transform">
            {row.partyName ? row.partyName.substring(0,2).toUpperCase() : 'CU'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug group-hover:text-emerald-600 transition-colors">
              {row.partyName}
            </p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">Party ID: {row.partyId}</p>
          </div>
        </div>
      )
    },
    { key: 'bucket30', header: '0-30 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket60', header: '31-60 Days', align: 'right', render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90', header: '61-90 Days', align: 'right', render: v => <span className="text-xs text-amber-500 font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90plus', header: '90+ Days (Overdue)', align: 'right', render: v => <span className="text-xs text-red-500 font-bold font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'balance', header: 'Total Outstanding', align: 'right', sortable: true, render: v => <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(Number(v))}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-primary border-theme-subtle hover:bg-surface2"
            onClick={() => row.partyId && row.partyId !== 'WALK-IN' && navigate(`/crm/customers/${row.partyId}`)}
          >
            Ledger
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            onClick={() => {
              // Find first unpaid invoice for this customer
              const custInv = openInvoices.find((i: any) => i.customerId === row.partyId || i.leadId === row.partyId);
              if (custInv) {
                handleOpenPaymentModal(custInv);
              } else {
                setActiveTab('invoices');
                setSearch(row.partyName);
              }
            }}
          >
            Settle Payment
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary tracking-tight">Accounts Receivable (AR)</h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold rounded-none">
                Finance Revenue & Collections
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Live collection tracker, customer aging analysis, invoice settlements, and official payment receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => { loadAging(); loadReceipts(); refetchInvoices(); }}
            className="text-xs border border-theme-subtle hover:bg-surface2"
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => window.print()}
            className="text-xs border border-theme-subtle hover:bg-surface2"
          >
            Export Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Receipt}
            onClick={() => setIsCreateReceiptOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            Issue Advance Receipt
          </Button>
        </div>
      </div>

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={activeTab === 'proformas' ? 3 : 6} />

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total AR Outstanding</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono mt-1">{formatCurrency(metrics.totalDue)}</p>
          <p className="text-[10px] text-muted mt-0.5">{openInvoices.length} outstanding invoices</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Current (0 - 30 Days)</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-blue-500 font-mono mt-1">{formatCurrency(metrics.current30)}</p>
          <p className="text-[10px] text-muted mt-0.5">Within standard trade terms</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Overdue (90+ Days)</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-black text-red-500 font-mono mt-1">{formatCurrency(metrics.overdue90)}</p>
          <p className="text-[10px] text-muted mt-0.5">High priority follow-up</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Advance Proformas</span>
            <FileText size={16} className="text-indigo-500" />
          </div>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">{formatCurrency(proformaMetrics.totalPending)}</p>
          <p className="text-[10px] text-muted mt-0.5">{proformaMetrics.pendingCount} awaiting advance payment</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Advances Collected</span>
            <Receipt size={16} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-500 font-mono mt-1">{formatCurrency(metrics.totalAdvances)}</p>
          <p className="text-[10px] text-muted mt-0.5">{paymentReceipts.length} official vouchers issued</p>
        </GlassCard>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-theme-subtle gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'aging'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            Customer Aging Breakdown ({agingData.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            <FileText size={13} />
            Outstanding Invoices ({openInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('proformas')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'proformas'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            <FileText size={13} className="text-indigo-500" />
            Advance Proformas ({proformaInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'receipts'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            <Receipt size={13} />
            Payment Receipts / Vouchers ({paymentReceipts.length})
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 pb-2">
          <SearchBar placeholder="Search customer, invoice, receipt..." value={search} onChange={setSearch} className="w-64" />
          {activeTab === 'aging' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setFilterType('all')} 
                className={`px-2.5 py-1 text-xs border rounded-none transition-colors ${filterType === 'all' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 font-bold' : 'bg-surface border-theme-subtle text-muted'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('overdue')} 
                className={`px-2.5 py-1 text-xs border rounded-none transition-colors ${filterType === 'overdue' ? 'bg-red-500/15 border-red-500/40 text-red-500 font-bold' : 'bg-surface border-theme-subtle text-muted'}`}
              >
                Overdue (90+)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: CUSTOMER AGING BREAKDOWN */}
      {activeTab === 'aging' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingAging ? (
            <div className="p-12 text-center text-muted animate-pulse">Calculating Accounts Receivable aging breakdown...</div>
          ) : filteredAging.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-primary">No Outstanding Receivables Found</p>
              <p className="text-xs text-muted mt-1">All customer accounts are currently fully settled.</p>
            </div>
          ) : (
            <DataTable columns={agingColumns} data={filteredAging} keyExtractor={row => row.partyId || row.partyName} />
          )}
        </GlassCard>
      )}

      {/* TAB 2: OUTSTANDING INVOICES WITH 1-CLICK SETTLEMENT */}
      {activeTab === 'invoices' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingInvoices ? (
            <div className="p-12 text-center text-muted animate-pulse">Loading open invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-primary">No Unpaid Invoices</p>
              <p className="text-xs text-muted mt-1">All posted sales invoices have been completely collected.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50 text-[10.5px] uppercase tracking-wider text-muted font-bold">
                    <th className="px-4 py-3">Invoice No</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-right">Paid to Date</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle text-xs">
                  {filteredInvoices.map((inv: any) => {
                    const tot = Number(inv.total || inv.amount || 0);
                    const paid = Number(inv.paidAmount || 0);
                    const due = Math.max(0, tot - paid);

                    return (
                      <tr key={inv.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceNo || inv.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {inv.customerName || inv.customerId || 'Customer'}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {formatDate(inv.date)}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(tot)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                          {paid > 0 ? formatCurrency(paid) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(due)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={paid > 0 ? 'warning' : 'default'} size="sm">
                            {paid > 0 ? 'Partially Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs border border-theme-subtle hover:bg-surface2"
                              onClick={() => navigate(`/finance/invoices?search=${encodeURIComponent(inv.invoiceNo || inv.id)}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleOpenPaymentModal(inv)}
                            >
                              Record Payment
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* TAB 3: ADVANCE PROFORMA INVOICES */}
      {activeTab === 'proformas' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingInvoices ? (
            <div className="p-12 text-center text-muted animate-pulse">Loading advance proformas...</div>
          ) : filteredProformas.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={36} className="text-indigo-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-primary">No Advance Proformas Found</p>
              <p className="text-xs text-muted mt-1">Advance proforma invoices created against Sales Orders will appear here for collection tracking.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => navigate('/inventory/finished-goods')}
              >
                Go to Sales Orders Hub
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50 text-[10.5px] uppercase tracking-wider text-muted font-bold">
                    <th className="px-4 py-3">Proforma No</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Linked Sales Order</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Advance Amount</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Advance Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle text-xs">
                  {filteredProformas.map((pi: any) => {
                    const tot = Number(pi.total || pi.amount || 0);
                    const paid = Number(pi.paidAmount || 0);
                    const due = Math.max(0, tot - paid);
                    const isFullyPaid = pi.status === 'paid' || (tot > 0 && paid >= tot);
                    const isPartiallyPaid = !isFullyPaid && paid > 0;

                    return (
                      <tr key={pi.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          <div className="flex items-center gap-1.5">
                            <span>{pi.invoiceNo || pi.id}</span>
                            <span className="px-1 py-0.2 text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                              Proforma
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          <div>
                            {pi.customerName || pi.customerId || 'Customer'}
                            {pi.customerCompany && pi.customerCompany !== pi.customerName && (
                              <p className="text-[10px] text-muted font-normal">{pi.customerCompany}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {pi.orderNo ? (
                            <button
                              onClick={() => navigate(`/inventory/finished-goods?search=${encodeURIComponent(pi.orderNo)}`)}
                              className="inline-flex items-center gap-1 font-mono text-xs text-secondary hover:text-primary hover:underline"
                              title="Click to view Sales Order in Orders Hub"
                            >
                              <span className="px-1.5 py-0.5 bg-surface2 border border-theme-subtle">
                                {pi.orderNo}
                              </span>
                              <ExternalLink size={10} className="opacity-50" />
                            </button>
                          ) : (
                            <span className="text-muted font-mono text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {formatDate(pi.date)}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {pi.dueDate ? formatDate(pi.dueDate) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(tot)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                          {paid > 0 ? formatCurrency(paid) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(due)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={isFullyPaid ? 'success' : isPartiallyPaid ? 'warning' : 'default'}
                            size="sm"
                          >
                            {isFullyPaid ? 'Advance Paid' : isPartiallyPaid ? 'Partially Paid' : 'Awaiting Advance'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={FileText}
                              className="text-xs border border-theme-subtle hover:bg-surface2 text-indigo-600 dark:text-indigo-400"
                              onClick={() => handleOpenPrintProforma(pi)}
                            >
                              View / PDF
                            </Button>
                            {!isFullyPaid && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                onClick={() => handleOpenPaymentModal(pi)}
                              >
                                Record Advance
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* TAB 4: CUSTOMER PAYMENT RECEIPTS (ADVANCE VOUCHERS) */}
      {activeTab === 'receipts' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingReceipts ? (
            <div className="p-12 text-center text-muted animate-pulse">Loading payment receipts...</div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={36} className="text-muted mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-primary">No Payment Receipts Found</p>
              <p className="text-xs text-muted mt-1">Issue official advance payment vouchers against quotations or sales orders.</p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsCreateReceiptOpen(true)}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Issue First Payment Receipt
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50 text-[10.5px] uppercase tracking-wider text-muted font-bold">
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Reference (Quote / Order)</th>
                    <th className="px-4 py-3 text-right">Amount Received</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Deposit Account</th>
                    <th className="px-4 py-3">Received By</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle text-xs">
                  {filteredReceipts.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-surface2/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {rec.receiptNo || rec.id}
                      </td>
                      <td className="px-4 py-3 text-muted font-mono">
                        {formatDate(rec.date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {rec.customerName || rec.customerCompany || 'Customer'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {rec.invoiceNo && (
                            <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                              Inv: {rec.invoiceNo}
                            </span>
                          )}
                          {rec.orderNo && (
                            <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Order: {rec.orderNo}
                            </span>
                          )}
                          {rec.quotationNo && (
                            <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-surface2 text-secondary border border-theme-subtle">
                              Quote: {rec.quotationNo}
                            </span>
                          )}
                          {!rec.invoiceNo && !rec.orderNo && !rec.quotationNo && <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(rec.amount || 0))}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        <span className="px-2 py-0.5 rounded-none bg-surface2 border border-theme-subtle text-[11px] font-medium">
                          {rec.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted font-mono text-[11px]">
                        {rec.accountName || rec.accountId || 'Cash/Bank Account'}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {rec.receivedBy || 'Accounts Officer'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Receipt}
                          onClick={() => setPrintReceipt(rec)}
                          className="text-xs text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          View Voucher
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* RECORD INVOICE PAYMENT MODAL */}
      {paymentModalInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setPaymentModalInvoice(null)}
          title={`Record Customer Payment - ${paymentModalInvoice.invoiceNo || paymentModalInvoice.id}`}
        >
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="p-3 bg-surface2/50 border border-theme-subtle rounded-none flex items-center justify-between text-xs">
              <div>
                <span className="text-muted block text-[10px] font-bold uppercase">Customer</span>
                <span className="font-bold text-primary">{paymentModalInvoice.customerName || paymentModalInvoice.customerId}</span>
              </div>
              <div className="text-right">
                <span className="text-muted block text-[10px] font-bold uppercase">Total Due</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {formatCurrency(Math.max(0, Number(paymentModalInvoice.total || paymentModalInvoice.amount || 0) - Number(paymentModalInvoice.paidAmount || 0)))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Payment Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full input-base text-xs font-mono font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full input-base text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full input-base text-xs cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer (HNB / Commercial / Sampath)</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Advance">Advance Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Deposit Account (Asset)
                </label>
                <select
                  value={paymentForm.accountId}
                  onChange={e => setPaymentForm({ ...paymentForm, accountId: e.target.value })}
                  className="w-full input-base text-xs cursor-pointer"
                >
                  <option value="">Auto-resolve (Cash / Bank)</option>
                  {accounts.filter((a: any) => a.type === 'Asset').map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Reference / Cheque / Bank Slips No
              </label>
              <input
                type="text"
                placeholder="e.g. HNB-TXN-902144 or CHQ-001289"
                value={paymentForm.reference}
                onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                className="w-full input-base text-xs"
              />
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              💡 Submitting will immediately credit Accounts Receivable, debit Bank/Cash in the General Ledger, mark the invoice as <strong>Paid</strong>, and update the Sales Order status.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setPaymentModalInvoice(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submittingPayment}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submittingPayment ? 'Recording...' : 'Confirm Payment & Update GL'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE ADVANCE RECEIPT MODAL */}
      <CreatePaymentReceiptModal
        isOpen={isCreateReceiptOpen}
        onClose={() => setIsCreateReceiptOpen(false)}
        settings={settings}
        onSuccess={(receipt) => {
          loadReceipts();
          loadAging();
          const unboxed = receipt?.receipt || receipt;
          setPrintReceipt(unboxed);
        }}
      />

      {/* PRINT ADVANCE RECEIPT MODAL */}
      <PaymentReceiptPrintModal
        isOpen={Boolean(printReceipt)}
        onClose={() => setPrintReceipt(null)}
        receipt={printReceipt}
        settings={settings}
      />

      {/* PRINT / VIEW PROFORMA INVOICE MODAL */}
      {activePrintProforma && (
        <ProformaInvoicePrintModal
          isOpen={true}
          onClose={() => setActivePrintProforma(null)}
          invoice={activePrintProforma}
          settings={settings}
        />
      )}
    </div>
  );
};
