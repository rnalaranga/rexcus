import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText, Download, PieChart, Landmark, DollarSign, Wallet,
  Calendar, Search, Filter, ArrowDownLeft, ArrowUpRight, Clock,
  Printer, FileSpreadsheet, CheckCircle, AlertTriangle, ChevronRight,
  TrendingUp, TrendingDown, Building2, User, Hash, Layers
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchAdvancedReport, fetchCustomers } from '@/lib/api';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type MainTab = 'invoices' | 'unpaid' | 'cashbook' | 'tax' | 'pnl' | 'bs' | 'tb' | 'exp';

export const FinancialReports: React.FC = () => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<MainTab>('invoices');

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState<string>('2026-11-01'); // Defaults to since Nov 1 as requested!
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Other filters
  const [customerId, setCustomerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cashbookView, setCashbookView] = useState<'by_account' | 'detailed'>('by_account');
  const [search, setSearch] = useState<string>('');

  // Data states
  const [reportData, setReportData] = useState<any>(null);
  const [financialStatementData, setFinancialStatementData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load customer list for dropdown
  useEffect(() => {
    fetchCustomers().then(res => {
      setCustomers(Array.isArray(res) ? res : []);
    }).catch(console.error);
  }, []);

  // Quick Date Range Preset Buttons
  const applyDatePreset = (preset: 'since_nov1' | 'since_oct1' | 'this_month' | 'last_month' | 'today' | 'all_time') => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    if (preset === 'since_nov1') {
      setStartDate(`${currentYear}-11-01`);
      setEndDate(todayStr);
    } else if (preset === 'since_oct1') {
      setStartDate(`${currentYear}-10-01`);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10);
      const lastDayLastMonth = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Fetch report data whenever activeTab or filters change
  useEffect(() => {
    setLoading(true);

    if (['invoices', 'unpaid', 'cashbook', 'tax'].includes(activeTab)) {
      const backendReportType = activeTab === 'unpaid' ? 'unpaid_invoices' : (activeTab === 'tax' ? 'invoices' : activeTab);
      fetchAdvancedReport({
        reportType: backendReportType as any,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: customerId !== 'all' ? customerId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
        .then(res => {
          setReportData(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      // Traditional Financial Statements (pnl, bs, tb, exp)
      const endpoints: Record<string, string> = { pnl: 'pnl', bs: 'balance-sheet', tb: 'trial-balance', exp: 'expenses' };
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/reports/${endpoints[activeTab]}`)
        .then(res => res.json())
        .then(res => {
          setFinancialStatementData(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [activeTab, startDate, endDate, customerId, statusFilter]);

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!search.trim()) return reportData.rows;
    const q = search.toLowerCase();
    return reportData.rows.filter((r: any) => {
      return (
        (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.customerCompany && r.customerCompany.toLowerCase().includes(q)) ||
        (r.poNo && r.poNo.toLowerCase().includes(q)) ||
        (r.particulars && r.particulars.toLowerCase().includes(q)) ||
        (r.accountName && r.accountName.toLowerCase().includes(q)) ||
        (r.accountCode && r.accountCode.toLowerCase().includes(q)) ||
        (r.partyName && r.partyName.toLowerCase().includes(q))
      );
    });
  }, [reportData?.rows, search]);

  // Filtered cashbook account summaries
  const filteredAccountSummaries = useMemo(() => {
    if (!reportData?.accountSummaries) return [];
    if (!search.trim()) return reportData.accountSummaries;
    const q = search.toLowerCase();
    return reportData.accountSummaries.filter((a: any) =>
      a.accountCode.toLowerCase().includes(q) ||
      a.accountName.toLowerCase().includes(q) ||
      a.accountType.toLowerCase().includes(q)
    );
  }, [reportData?.accountSummaries, search]);

  // ==========================================
  // EXPORT TO EXCEL (.xlsx)
  // ==========================================
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const dateRangeLabel = startDate ? `from_${startDate}_to_${endDate || 'today'}` : 'all_time';

      if (activeTab === 'invoices' || activeTab === 'unpaid' || activeTab === 'tax') {
        const excelRows = (filteredRows || []).map((r: any, idx: number) => ({
          '#': idx + 1,
          'Invoice No': r.invoiceNo,
          'Date': r.date,
          'Due Date': r.dueDate || 'N/A',
          'Customer': r.customerName,
          'Company': r.customerCompany || '',
          'Phone': r.customerPhone || '',
          'Customer VAT No': r.customerVat || '',
          'PO No': r.poNo || '',
          'Tax Type': r.taxType,
          'Status': r.status.toUpperCase(),
          'Net Subtotal (LKR)': r.subtotal,
          'SSCL (2.56%)': r.ssclAmount,
          'VAT (18%)': r.vatAmount,
          'Total Tax (LKR)': r.taxAmount,
          'Grand Total (LKR)': r.total,
          'Paid Amount (LKR)': r.paidAmount,
          'Balance Due (LKR)': r.balanceDue,
          'Days Overdue': r.daysOverdue || 0,
          'Aging Bucket': r.agingBucket || ''
        }));

        // Add summary totals row
        excelRows.push({
          '#': '',
          'Invoice No': 'TOTALS',
          'Date': '',
          'Due Date': '',
          'Customer': '',
          'Company': '',
          'Phone': '',
          'Customer VAT No': '',
          'PO No': '',
          'Tax Type': '',
          'Status': `${reportData?.summary?.totalCount || 0} Invoices`,
          'Net Subtotal (LKR)': reportData?.summary?.totalSubtotal || 0,
          'SSCL (2.56%)': reportData?.summary?.totalSscl || 0,
          'VAT (18%)': reportData?.summary?.totalVat || 0,
          'Total Tax (LKR)': reportData?.summary?.totalTax || 0,
          'Grand Total (LKR)': reportData?.summary?.totalGross || 0,
          'Paid Amount (LKR)': reportData?.summary?.totalPaid || 0,
          'Balance Due (LKR)': reportData?.summary?.totalBalanceDue || 0,
          'Days Overdue': '',
          'Aging Bucket': ''
        } as any);

        const ws = XLSX.utils.json_to_sheet(excelRows);
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'unpaid' ? 'Unpaid_Invoices' : 'Invoices_Report');
        XLSX.writeFile(wb, `Rex_Invoices_Report_${dateRangeLabel}.xlsx`);
      } else if (activeTab === 'cashbook') {
        if (cashbookView === 'by_account') {
          const accRows = (filteredAccountSummaries || []).map((a: any, idx: number) => ({
            '#': idx + 1,
            'Account Code': a.accountCode,
            'Chart of Account Name': a.accountName,
            'Account Type': a.accountType,
            'Transactions': a.transactionCount,
            'Total Cash In (Receipts)': a.totalIn,
            'Total Cash Out (Payments)': a.totalOut,
            'Net Movement (LKR)': a.net
          }));
          const ws = XLSX.utils.json_to_sheet(accRows);
          XLSX.utils.book_append_sheet(wb, ws, 'Cash_by_COA');
          XLSX.writeFile(wb, `Rex_Cashbook_By_Account_${dateRangeLabel}.xlsx`);
        } else {
          const cbRows = (filteredRows || []).map((r: any, idx: number) => ({
            '#': idx + 1,
            'Voucher / Ref': r.id,
            'Date': r.date,
            'Time': r.time || '',
            'Type': r.entryType === 'IN' ? 'RECEIPT (IN)' : 'PAYMENT (OUT)',
            'Particulars': r.particulars,
            'Target Account Code': r.accountCode || '',
            'Target Account Name': r.accountName || '',
            'Target Account Type': r.accountType || '',
            'Party / Payee': r.partyName || '',
            'Reference No': r.referenceNo || '',
            'Cash In (LKR)': r.entryType === 'IN' ? r.amount : 0,
            'Cash Out (LKR)': r.entryType === 'OUT' ? r.amount : 0,
            'Running Balance (LKR)': r.runningBalance
          }));
          const ws = XLSX.utils.json_to_sheet(cbRows);
          XLSX.utils.book_append_sheet(wb, ws, 'Cashbook_Ledger');
          XLSX.writeFile(wb, `Rex_Cashbook_Ledger_${dateRangeLabel}.xlsx`);
        }
      }
    } catch (err) {
      console.error('Excel Export failed:', err);
    }
  };

  // ==========================================
  // EXPORT TO PDF (html2pdf.js)
  // ==========================================
  const exportToPdf = () => {
    const element = document.getElementById('report-print-container');
    if (!element) return;
    const isLandscape = ['invoices', 'unpaid', 'cashbook', 'tax'].includes(activeTab);
    const opt: any = {
      margin: 8,
      filename: `Rex_Report_${activeTab}_${startDate || 'all'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary tracking-tight">Executive & Financial Reports</h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold border-rex-500/40 text-rex-600 bg-rex-500/10">
              QuickBooks Suite
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Real-time multi-dimensional reporting: Invoice-wise tax breakdown, AR aging, cashbook movement, and IRD compliance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
            className="border border-theme-subtle text-secondary"
          >
            Print
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={FileSpreadsheet}
            onClick={exportToExcel}
            className="border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
          >
            Export Excel (.xlsx)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={exportToPdf}
            className="bg-rex-600 hover:bg-rex-700 font-semibold"
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-theme">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'invoices'
              ? 'bg-rex-500 text-white border-rex-600 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-rex-500/30'
          }`}
        >
          <FileText size={14} /> Invoice Sales & Tax Register
        </button>

        <button
          onClick={() => setActiveTab('unpaid')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'unpaid'
              ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-rose-500/30'
          }`}
        >
          <Clock size={14} /> Unpaid Invoices & AR Aging
        </button>

        <button
          onClick={() => setActiveTab('cashbook')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cashbook'
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-amber-500/30'
          }`}
        >
          <Wallet size={14} /> Daily Cashbook Movement
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tax'
              ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-blue-500/30'
          }`}
        >
          <Building2 size={14} /> Tax Liability (RAMIS)
        </button>

        <div className="w-px h-6 bg-theme-subtle mx-1 shrink-0" />

        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'pnl' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme text-secondary hover:text-primary'
          }`}
        >
          <PieChart size={13} /> Profit & Loss
        </button>

        <button
          onClick={() => setActiveTab('bs')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'bs' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme text-secondary hover:text-primary'
          }`}
        >
          <Landmark size={13} /> Balance Sheet
        </button>

        <button
          onClick={() => setActiveTab('tb')}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tb' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-theme text-secondary hover:text-primary'
          }`}
        >
          <Layers size={13} /> Trial Balance
        </button>
      </div>

      {/* QuickBooks-Style Dynamic Filter Bar */}
      {['invoices', 'unpaid', 'cashbook', 'tax'].includes(activeTab) && (
        <GlassCard className="p-4 space-y-3">
          {/* Top Row: Quick Preset Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-muted mr-1 flex items-center gap-1">
                <Calendar size={13} /> Quick Presets:
              </span>
              <button
                onClick={() => applyDatePreset('since_nov1')}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors ${
                  startDate === '2026-11-01'
                    ? 'bg-rex-500/20 text-rex-700 dark:text-rex-300 border-rex-500/40'
                    : 'bg-surface border-theme text-secondary hover:bg-surface-secondary'
                }`}
              >
                ⚡ Since Nov 1
              </button>
              <button
                onClick={() => applyDatePreset('since_oct1')}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors ${
                  startDate === '2026-10-01'
                    ? 'bg-rex-500/20 text-rex-700 dark:text-rex-300 border-rex-500/40'
                    : 'bg-surface border-theme text-secondary hover:bg-surface-secondary'
                }`}
              >
                ⚡ Since Oct 1
              </button>
              <button
                onClick={() => applyDatePreset('this_month')}
                className="px-2.5 py-1 text-xs rounded-md font-medium border bg-surface border-theme text-secondary hover:bg-surface-secondary"
              >
                This Month
              </button>
              <button
                onClick={() => applyDatePreset('last_month')}
                className="px-2.5 py-1 text-xs rounded-md font-medium border bg-surface border-theme text-secondary hover:bg-surface-secondary"
              >
                Last Month
              </button>
              <button
                onClick={() => applyDatePreset('today')}
                className="px-2.5 py-1 text-xs rounded-md font-medium border bg-surface border-theme text-secondary hover:bg-surface-secondary"
              >
                Today
              </button>
              <button
                onClick={() => applyDatePreset('all_time')}
                className="px-2.5 py-1 text-xs rounded-md font-medium border bg-surface border-theme text-secondary hover:bg-surface-secondary"
              >
                All Time
              </button>
            </div>

            {/* Cashbook view switcher */}
            {activeTab === 'cashbook' && (
              <div className="flex items-center gap-1 bg-surface border border-theme rounded-lg p-0.5">
                <button
                  onClick={() => setCashbookView('by_account')}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                    cashbookView === 'by_account' ? 'bg-amber-500 text-white' : 'text-muted hover:text-secondary'
                  }`}
                >
                  By Target Chart of Account
                </button>
                <button
                  onClick={() => setCashbookView('detailed')}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                    cashbookView === 'detailed' ? 'bg-amber-500 text-white' : 'text-muted hover:text-secondary'
                  }`}
                >
                  Detailed Transaction Ledger
                </button>
              </div>
            )}
          </div>

          {/* Bottom Row: Detailed Pickers */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-theme">
            {/* Start Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
              />
            </div>

            {/* Customer filter */}
            {['invoices', 'unpaid', 'tax'].includes(activeTab) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Customer:</span>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="text-xs bg-surface border border-theme rounded-lg px-3 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500 max-w-[200px]"
                >
                  <option value="all">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company || c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status filter (only on all invoices tab) */}
            {activeTab === 'invoices' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs bg-surface border border-theme rounded-lg px-3 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="unpaid">Unpaid / Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partially Paid</option>
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search report..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-theme rounded-lg text-primary outline-none focus:ring-1 focus:ring-rex-500 w-52 sm:w-64"
              />
            </div>
          </div>
        </GlassCard>
      )}

      {/* KPI Metric Summary Cards */}
      {['invoices', 'unpaid', 'tax'].includes(activeTab) && reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <GlassCard className="p-3 border-l-4 border-l-blue-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Invoices Count</span>
            <div className="text-lg font-black text-primary mt-1">{reportData.summary.totalCount}</div>
            <span className="text-[10px] text-muted block mt-0.5">Transactions</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-slate-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Net Taxable Subtotal</span>
            <div className="text-lg font-black text-primary mt-1">{formatCurrency(reportData.summary.totalSubtotal)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Before Tax</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Total SSCL (2.56%)</span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(reportData.summary.totalSscl)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Social Security Levy</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-emerald-500">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total VAT (18%)</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(reportData.summary.totalVat)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Value Added Tax</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-purple-500">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Gross Revenue</span>
            <div className="text-lg font-black text-primary mt-1">{formatCurrency(reportData.summary.totalGross)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Total Invoiced</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-rose-500 bg-rose-500/5">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Outstanding Balance Due</span>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(reportData.summary.totalBalanceDue)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Pending Collection</span>
          </GlassCard>
        </div>
      )}

      {/* Cashbook KPI Cards */}
      {activeTab === 'cashbook' && reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <GlassCard className="p-3 border-l-4 border-l-blue-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Opening Balance</span>
            <div className="text-lg font-black text-primary mt-1">{formatCurrency(reportData.summary.openingBalance)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Prior to {startDate || 'all'}</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-emerald-500">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Cash In</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">+{formatCurrency(reportData.summary.totalCashIn)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Receipts</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-rose-500">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Cash Out</span>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">-{formatCurrency(reportData.summary.totalCashOut)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Payments</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Net Cash Movement</span>
            <div className={`text-lg font-black mt-1 ${reportData.summary.netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {reportData.summary.netMovement >= 0 ? '+' : ''}{formatCurrency(reportData.summary.netMovement)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">Net Period Change</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-rex-600 bg-rex-500/5">
            <span className="text-[10px] uppercase font-bold text-rex-700 dark:text-rex-300 block">Closing Balance</span>
            <div className="text-lg font-black text-primary mt-1">{formatCurrency(reportData.summary.closingBalance)}</div>
            <span className="text-[10px] text-muted block mt-0.5">As of {endDate || todayStr}</span>
          </GlassCard>
        </div>
      )}

      {/* Main Report Container (Printable and Viewable) */}
      <GlassCard className="p-0 overflow-hidden shadow-sm">
        <div id="report-print-container" className="bg-white text-slate-900 p-6 md:p-8">
          {/* Printable Executive Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <img src="/rex-logo.png" alt="REX" className="h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {settings?.company_name || settings?.companyName || 'REX INDUSTRIES (PVT) LTD'}
                  </h2>
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
                    {activeTab === 'invoices' && 'INVOICE SALES & TAX BREAKDOWN REGISTER'}
                    {activeTab === 'unpaid' && 'ACCOUNTS RECEIVABLE & UNPAID INVOICES AGING REPORT'}
                    {activeTab === 'cashbook' && 'DAILY CASHBOOK INFLOW & OUTFLOW ANALYSIS'}
                    {activeTab === 'tax' && 'INLAND REVENUE DEPARTMENT (RAMIS) OUTPUT TAX REPORT'}
                    {activeTab === 'pnl' && 'INCOME STATEMENT (PROFIT & LOSS)'}
                    {activeTab === 'bs' && 'STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)'}
                    {activeTab === 'tb' && 'TRIAL BALANCE STATEMENT'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600">
              <div className="font-bold text-slate-900">
                Period: {startDate ? startDate : 'Beginning'} to {endDate ? endDate : 'Current'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Generated: {new Date().toLocaleString()}</div>
              {customerId !== 'all' && (
                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  Customer: {customers.find(c => c.id === customerId)?.company || customerId}
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 animate-pulse text-xs font-semibold">
              Crunching financial figures & generating report...
            </div>
          ) : (
            <>
              {/* 1. INVOICE SALES & TAX REGISTER / UNPAID INVOICES TABLE */}
              {['invoices', 'unpaid', 'tax'].includes(activeTab) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-2">Invoice #</th>
                        <th className="py-2.5 px-2">Date</th>
                        <th className="py-2.5 px-3">Customer / Company</th>
                        <th className="py-2.5 px-2">Customer VAT</th>
                        <th className="py-2.5 px-2">PO / Ref</th>
                        <th className="py-2.5 px-2 text-right">Net Subtotal</th>
                        <th className="py-2.5 px-2 text-right text-amber-700">SSCL (2.56%)</th>
                        <th className="py-2.5 px-2 text-right text-emerald-700">VAT (18%)</th>
                        <th className="py-2.5 px-2 text-right">Total Tax</th>
                        <th className="py-2.5 px-2 text-right font-bold">Total Gross</th>
                        <th className="py-2.5 px-2 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right font-bold text-rose-700">Balance Due</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                            No invoices match the selected date range and filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.invoiceNo}</td>
                            <td className="py-2 px-2 text-slate-600 font-mono text-[11px]">{r.date}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">{r.customerName}</div>
                              {r.customerCompany && (
                                <div className="text-[10px] text-slate-500">{r.customerCompany}</div>
                              )}
                            </td>
                            <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{r.customerVat || '—'}</td>
                            <td className="py-2 px-2 font-mono text-[11px] text-slate-600">{r.poNo || '—'}</td>
                            <td className="py-2 px-2 text-right font-mono">{formatCurrency(r.subtotal)}</td>
                            <td className="py-2 px-2 text-right font-mono text-amber-700 font-medium">
                              {r.ssclAmount > 0 ? formatCurrency(r.ssclAmount) : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700 font-medium">
                              {r.vatAmount > 0 ? formatCurrency(r.vatAmount) : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {r.taxAmount > 0 ? formatCurrency(r.taxAmount) : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(r.total)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-600">
                              {r.paidAmount > 0 ? formatCurrency(r.paidAmount) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                              {formatCurrency(r.balanceDue)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                r.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                r.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                r.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Summary Totals Row */}
                      {filteredRows.length > 0 && reportData?.summary && (
                        <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                          <td className="py-2.5 px-2" colSpan={5}>
                            TOTAL SUMMARY ({reportData.summary.totalCount} Invoices)
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">{formatCurrency(reportData.summary.totalSubtotal)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-700">{formatCurrency(reportData.summary.totalSscl)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(reportData.summary.totalVat)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold">{formatCurrency(reportData.summary.totalTax)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900">{formatCurrency(reportData.summary.totalGross)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(reportData.summary.totalPaid)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 text-sm">{formatCurrency(reportData.summary.totalBalanceDue)}</td>
                          <td className="py-2.5 px-2 text-center">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. CASHBOOK ADVANCED REPORT TABLE */}
              {activeTab === 'cashbook' && (
                <div>
                  {cashbookView === 'by_account' ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Cash Flow Breakdown by Target Chart of Account
                        </h3>
                        <span className="text-xs text-slate-500">
                          Opening Balance: <strong className="text-slate-800">{formatCurrency(reportData?.summary?.openingBalance || 0)}</strong>
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px]">
                            <th className="py-2.5 px-3">Account Code</th>
                            <th className="py-2.5 px-4">Chart of Account Name</th>
                            <th className="py-2.5 px-3">Account Type</th>
                            <th className="py-2.5 px-2 text-center">Tx Count</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">Cash In (Receipts)</th>
                            <th className="py-2.5 px-3 text-right text-rose-700">Cash Out (Payments)</th>
                            <th className="py-2.5 px-4 text-right font-bold">Net Movement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredAccountSummaries.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                No cashbook entries found in this period.
                              </td>
                            </tr>
                          ) : (
                            filteredAccountSummaries.map((acc: any) => (
                              <tr key={acc.accountId} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-mono font-bold text-slate-900">{acc.accountCode}</td>
                                <td className="py-2 px-4 font-semibold text-slate-800">{acc.accountName}</td>
                                <td className="py-2 px-3">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                    {acc.accountType}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-500">{acc.transactionCount}</td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700 font-medium">
                                  {acc.totalIn > 0 ? formatCurrency(acc.totalIn) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700 font-medium">
                                  {acc.totalOut > 0 ? formatCurrency(acc.totalOut) : '—'}
                                </td>
                                <td className={`py-2 px-4 text-right font-mono font-bold ${acc.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {acc.net >= 0 ? '+' : ''}{formatCurrency(acc.net)}
                                </td>
                              </tr>
                            ))
                          )}
                          {filteredAccountSummaries.length > 0 && reportData?.summary && (
                            <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                              <td className="py-2.5 px-3" colSpan={3}>TOTAL PERIOD MOVEMENTS</td>
                              <td className="py-2.5 px-2 text-center font-mono">{reportData.summary.totalTransactions}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">+{formatCurrency(reportData.summary.totalCashIn)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-700">-{formatCurrency(reportData.summary.totalCashOut)}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-sm">
                                {reportData.summary.netMovement >= 0 ? '+' : ''}{formatCurrency(reportData.summary.netMovement)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div>
                      {/* Detailed Line-by-Line Cashbook Ledger */}
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Chronological Cashbook Ledger
                        </h3>
                        <span className="text-xs text-slate-500">
                          Opening Balance: <strong className="text-slate-800">{formatCurrency(reportData?.summary?.openingBalance || 0)}</strong>
                        </span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px]">
                            <th className="py-2 px-2">Date / Time</th>
                            <th className="py-2 px-2">Voucher #</th>
                            <th className="py-2 px-3">Particulars</th>
                            <th className="py-2 px-3">Target Chart of Account</th>
                            <th className="py-2 px-2">Party / Payee</th>
                            <th className="py-2 px-2 text-right text-emerald-700">Cash In</th>
                            <th className="py-2 px-2 text-right text-rose-700">Cash Out</th>
                            <th className="py-2 px-3 text-right font-bold">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr className="bg-slate-50 font-semibold text-slate-700">
                            <td className="py-2 px-2 font-mono text-slate-500">{startDate || 'Start'}</td>
                            <td className="py-2 px-2 font-mono text-slate-500">B/F</td>
                            <td className="py-2 px-3" colSpan={3}>Opening Balance Brought Forward</td>
                            <td className="py-2 px-2 text-right font-mono">—</td>
                            <td className="py-2 px-2 text-right font-mono">—</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(reportData?.summary?.openingBalance || 0)}</td>
                          </tr>
                          {filteredRows.map((r: any) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 font-mono text-slate-600 text-[11px]">{r.date} {r.time}</td>
                              <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.id}</td>
                              <td className="py-2 px-3 font-medium text-slate-800">{r.particulars}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-700">{r.accountCode} - {r.accountName}</td>
                              <td className="py-2 px-2 text-slate-600">{r.partyName || '—'}</td>
                              <td className="py-2 px-2 text-right font-mono text-emerald-700 font-medium">
                                {r.entryType === 'IN' ? formatCurrency(r.amount) : '—'}
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-rose-700 font-medium">
                                {r.entryType === 'OUT' ? formatCurrency(r.amount) : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(r.runningBalance || 0)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                            <td className="py-2.5 px-2" colSpan={5}>PERIOD CLOSING BALANCE</td>
                            <td className="py-2.5 px-2 text-right font-mono text-emerald-700">+{formatCurrency(reportData?.summary?.totalCashIn || 0)}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-rose-700">-{formatCurrency(reportData?.summary?.totalCashOut || 0)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-sm">{formatCurrency(reportData?.summary?.closingBalance || 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. CORE FINANCIAL STATEMENTS (P&L, Balance Sheet, Trial Balance) */}
              {activeTab === 'pnl' && financialStatementData && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-300 pb-1">
                      1. Revenue & Income
                    </h3>
                    <div className="space-y-1.5">
                      {(financialStatementData.revenue || []).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-xs">
                          <span className="font-medium text-slate-800">{acc.code} - {acc.name}</span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-2 font-black border-t-2 border-slate-400 text-slate-900 text-sm">
                        <span>Total Revenue</span>
                        <span className="font-mono">{formatCurrency(financialStatementData.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-300 pb-1">
                      2. Operating Expenses
                    </h3>
                    <div className="space-y-1.5">
                      {(financialStatementData.expenses || []).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-xs">
                          <span className="font-medium text-slate-800">{acc.code} - {acc.name}</span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(acc.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-2 font-black border-t-2 border-slate-400 text-slate-900 text-sm">
                        <span>Total Expenses</span>
                        <span className="font-mono text-rose-700">-{formatCurrency(financialStatementData.totalExpense)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-2 border-slate-900 font-black text-base text-slate-900">
                    <span>NET PROFIT / (LOSS)</span>
                    <span className={`font-mono ${financialStatementData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(financialStatementData.netProfit)}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'bs' && financialStatementData && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-300 pb-1">
                      Assets
                    </h3>
                    {(financialStatementData.assets || []).map((acc: any) => (
                      <div key={acc.id} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-xs">
                        <span className="font-medium text-slate-800">{acc.code} - {acc.name}</span>
                        <span className="font-mono font-bold">{formatCurrency(acc.balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 font-black border-t-2 border-slate-400 text-slate-900 text-sm">
                      <span>Total Assets</span>
                      <span className="font-mono">{formatCurrency(financialStatementData.totalAssets)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-300 pb-1">
                      Liabilities & Equity
                    </h3>
                    <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-xs">
                      <span className="font-medium text-slate-800">Total Liabilities</span>
                      <span className="font-mono font-bold">{formatCurrency(financialStatementData.totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200 text-xs">
                      <span className="font-medium text-slate-800">Total Equity (Including Retained Earnings)</span>
                      <span className="font-mono font-bold">{formatCurrency(financialStatementData.totalEquity)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 font-black border-t-2 border-slate-400 text-slate-900 text-sm">
                      <span>Total Liabilities & Equity</span>
                      <span className="font-mono">{formatCurrency(financialStatementData.totalLiabilities + financialStatementData.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tb' && financialStatementData && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px]">
                      <th className="py-2 px-3">Account Code</th>
                      <th className="py-2 px-4">Account Name</th>
                      <th className="py-2 px-3 text-right">Debit Balance</th>
                      <th className="py-2 px-3 text-right">Credit Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(financialStatementData.accounts || []).map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{acc.code}</td>
                        <td className="py-2 px-4 text-slate-800">{acc.name}</td>
                        <td className="py-2 px-3 text-right font-mono">{acc.debit > 0 ? formatCurrency(acc.debit) : '—'}</td>
                        <td className="py-2 px-3 text-right font-mono">{acc.credit > 0 ? formatCurrency(acc.credit) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                      <td className="py-2.5 px-3" colSpan={2}>TRIAL BALANCE TOTAL</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(financialStatementData.totalDebit)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(financialStatementData.totalCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Verification & Sign-off Block */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 h-8 mb-1" />
              <span className="font-semibold text-slate-800">Finance Executive</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Prepared By</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 mb-1" />
              <span className="font-semibold text-slate-800">Head of Finance / Accountant</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Checked & Verified</p>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 mb-1" />
              <span className="font-semibold text-slate-800">Managing Director</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Authorized & Approved</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
