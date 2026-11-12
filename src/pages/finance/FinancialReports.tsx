import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText, Download, PieChart, Landmark, DollarSign, Wallet,
  Calendar, Search, Filter, ArrowDownLeft, ArrowUpRight, Clock,
  Printer, FileSpreadsheet, CheckCircle, AlertTriangle, ChevronRight,
  TrendingUp, TrendingDown, Building2, User, Hash, Layers, BookOpen,
  ArrowRight, Receipt
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchAdvancedReport, fetchCustomers, fetchAccountLedgerReport, fetchSuppliers } from '@/lib/api';
import { AccountAutocomplete } from '@/components/ui/AccountAutocomplete';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type MainTab = 'invoices' | 'unpaid' | 'vendor_bills' | 'cashbook' | 'tax' | 'account_ledger' | 'pnl' | 'bs' | 'tb' | 'exp';

export const FinancialReports: React.FC = () => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<MainTab>('invoices');

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [startDate, setStartDate] = useState<string>('2026-11-01'); // Defaults to since Nov 1 as requested!
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Other filters
  const [customerId, setCustomerId] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [billCategory, setBillCategory] = useState<string>('all');
  const [billSource, setBillSource] = useState<string>('all');
  const [agingBucket, setAgingBucket] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cashbookView, setCashbookView] = useState<'by_account' | 'detailed'>('by_account');
  const [search, setSearch] = useState<string>('');

  // Account Ledger filters and data
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [accountLedgerData, setAccountLedgerData] = useState<any>(null);

  // Data states
  const [reportData, setReportData] = useState<any>(null);
  const [financialStatementData, setFinancialStatementData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load customer and supplier lists for dropdowns
  useEffect(() => {
    fetchCustomers().then(res => {
      setCustomers(Array.isArray(res) ? res : []);
    }).catch(console.error);
    fetchSuppliers().then(res => {
      setSuppliers(Array.isArray(res) ? res : []);
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

    if (['invoices', 'unpaid', 'vendor_bills', 'cashbook', 'tax'].includes(activeTab)) {
      const backendReportType = activeTab === 'unpaid' ? 'unpaid_invoices' : (activeTab === 'tax' ? 'invoices' : activeTab);
      fetchAdvancedReport({
        reportType: backendReportType as any,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: customerId !== 'all' ? customerId : undefined,
        supplierId: supplierId !== 'all' ? supplierId : undefined,
        billCategory: billCategory !== 'all' ? billCategory : undefined,
        billSource: billSource !== 'all' ? billSource : undefined,
        agingBucket: agingBucket !== 'all' ? agingBucket : undefined,
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
    } else if (activeTab === 'account_ledger') {
      fetchAccountLedgerReport({
        accountId: selectedAccountId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
        .then(res => {
          setAccountLedgerData(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      // Traditional Financial Statements (pnl, bs, tb, exp)
      const endpoints: Record<string, string> = { pnl: 'pnl', bs: 'balance-sheet', tb: 'trial-balance', exp: 'expenses' };
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/finance/reports/${endpoints[activeTab]}`)
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
  }, [activeTab, startDate, endDate, customerId, supplierId, billCategory, billSource, agingBucket, statusFilter, selectedAccountId]);

  // Filtered rows by search term with client-side fallback breakdown assurance
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    
    // Normalize rows:
    // 1. Exclude any proforma invoices from commercial tax invoices
    let rowsToProcess = reportData.rows.filter((r: any) => {
      if (['invoices', 'unpaid', 'tax'].includes(activeTab)) {
        const invNo = String(r.invoiceNo || r.id || '').toUpperCase();
        if (invNo.startsWith('PI-') || r.isProforma || r.invoiceType === 'proforma') return false;
      }
      return true;
    });

    // 2. Sort by Invoice Number order (e.g. 26NOV_REX_00733, 00732, 00731...)
    if (['invoices', 'unpaid', 'tax'].includes(activeTab)) {
      rowsToProcess = [...rowsToProcess].sort((a: any, b: any) => {
        const noA = String(a.invoiceNo || a.id || '');
        const noB = String(b.invoiceNo || b.id || '');
        return noB.localeCompare(noA, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // 3. Ensure each taxable invoice has Net Cost, SSCL (2.5%), and VAT (18%) computed correctly
    // Sri Lanka Statutory Logic:
    // (Cost + SSCL 2.5%) * 18% = VAT
    // Therefore, where SSCL was not defined separately, the entered Subtotal already includes SSCL 2.5%:
    // Cost = Subtotal / 1.025
    // SSCL = Subtotal - Cost
    // VAT = Subtotal * 0.18 (or stored VAT)
    const normalized = rowsToProcess.map((r: any) => {
      let sub = Number(r.subtotal || 0);
      const gross = Number(r.total || r.totalAmount || 0);
      let sscl = Number(r.ssclAmount || 0);
      let vat = Number(r.vatAmount || 0);
      const storedTax = Number(r.taxAmount || 0);
      const isUSD = String(r.currency || '').toUpperCase() === 'USD' || String(r.taxProfileId || '').includes('export_zero_rated');

      if (isUSD) {
        // Zero-rated Export in USD: NO TAX
        sscl = 0;
        vat = 0;
        sub = gross;
      } else {
        if (storedTax > 0 || vat > 0) {
          const knownVat = (vat > 0 && sscl === 0) ? (storedTax > vat ? storedTax : vat) : storedTax;

          if (sscl === 0 && sub > 0) {
            // Entered subtotal includes SSCL 2.5%:
            const rawCost = sub / 1.025;
            sscl = Math.round((sub - rawCost) * 100) / 100;
            vat = Math.round(knownVat * 100) / 100;
            sub = Math.round(rawCost * 100) / 100;
          }
        } else if (gross > sub && sub > 0) {
          // Difference represents tax
          const diffTax = gross - sub;
          const rawCost = sub / 1.025;
          sscl = Math.round((sub - rawCost) * 100) / 100;
          vat = Math.round(diffTax * 100) / 100;
          sub = Math.round(rawCost * 100) / 100;
        } else if (gross > 0 && sub === gross) {
          // Tax included in total:
          // Gross = Cost * 1.025 * 1.18 = Cost * 1.2095
          const rawCost = gross / 1.2095;
          const ssclBase = rawCost * 0.025;
          const vatBase = (rawCost + ssclBase) * 0.18;
          sscl = Math.round(ssclBase * 100) / 100;
          vat = Math.round(vatBase * 100) / 100;
          sub = Math.round(rawCost * 100) / 100;
        }
      }

      const totalTax = Math.round((sscl + vat) * 100) / 100;

      return {
        ...r,
        subtotal: sub,
        ssclAmount: sscl,
        vatAmount: vat,
        taxAmount: totalTax,
        currency: isUSD ? 'USD' : (r.currency || 'LKR')
      };
    });

    if (!search.trim()) return normalized;
    const q = search.toLowerCase();
    return normalized.filter((r: any) => {
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
  }, [reportData?.rows, search, activeTab]);

  // Filtered account ledger transactions (Single Account mode)
  const filteredLedgerLines = useMemo(() => {
    if (!accountLedgerData?.lines) return [];
    if (!search.trim()) return accountLedgerData.lines;
    const q = search.toLowerCase();
    return accountLedgerData.lines.filter((l: any) =>
      (l.reference && l.reference.toLowerCase().includes(q)) ||
      (l.entryId && l.entryId.toLowerCase().includes(q)) ||
      (l.entryDescription && l.entryDescription.toLowerCase().includes(q)) ||
      (l.lineDescription && l.lineDescription.toLowerCase().includes(q)) ||
      (l.partyName && l.partyName.toLowerCase().includes(q)) ||
      (l.partyId && l.partyId.toLowerCase().includes(q)) ||
      (l.date && String(l.date).toLowerCase().includes(q))
    );
  }, [accountLedgerData?.lines, search]);

  // Filtered account summaries (Summary mode across all COA)
  const filteredSummaryAccounts = useMemo(() => {
    if (!accountLedgerData?.accounts) return [];
    if (!search.trim()) return accountLedgerData.accounts;
    const q = search.toLowerCase();
    return accountLedgerData.accounts.filter((a: any) =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (a.subtype && a.subtype.toLowerCase().includes(q))
    );
  }, [accountLedgerData?.accounts, search]);

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
      } else if (activeTab === 'vendor_bills') {
        const billRows = (filteredRows || []).map((r: any, idx: number) => ({
          '#': idx + 1,
          'Bill No': r.displayNo,
          'Bill Date': r.date ? r.date.slice(0, 10) : '',
          'Due Date': r.dueDate ? r.dueDate.slice(0, 10) : '',
          'Vendor Name': r.resolvedSupplierName,
          'Vendor Invoice Ref': r.invoiceNo || '',
          'Category': r.billCategory || 'General',
          'Source': r.billSource || 'Direct',
          'Net Subtotal (LKR)': r.subtotal || 0,
          'SSCL (LKR)': r.ssclAmount || 0,
          'VAT 18% (LKR)': r.vatAmount || 0,
          'Gross Amount (LKR)': r.totalAmount,
          'Paid Amount (LKR)': r.paidAmount,
          'Balance Due (LKR)': r.balanceDue,
          'Overdue Days': r.overdueDays || 0,
          'Aging Bucket': r.agingBucket || 'Current',
          'Status': r.balanceDue <= 0 ? 'PAID' : r.paidAmount > 0 ? 'PARTIAL' : 'UNPAID'
        }));

        billRows.push({
          '#': '',
          'Bill No': 'TOTALS',
          'Bill Date': '',
          'Due Date': '',
          'Vendor Name': '',
          'Vendor Invoice Ref': '',
          'Category': '',
          'Source': `${reportData?.summary?.totalBills || 0} Bills`,
          'Net Subtotal (LKR)': reportData?.summary?.totalSubtotal || 0,
          'SSCL (LKR)': reportData?.summary?.totalSscl || 0,
          'VAT 18% (LKR)': reportData?.summary?.totalVat || 0,
          'Gross Amount (LKR)': reportData?.summary?.totalGross || 0,
          'Paid Amount (LKR)': reportData?.summary?.totalPaid || 0,
          'Balance Due (LKR)': reportData?.summary?.totalDue || 0,
          'Overdue Days': '',
          'Aging Bucket': '',
          'Status': ''
        } as any);

        const ws = XLSX.utils.json_to_sheet(billRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Vendor_Bills_AP');
        XLSX.writeFile(wb, `Rex_Vendor_Bills_AP_${dateRangeLabel}.xlsx`);
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
      } else if (activeTab === 'account_ledger') {
        if (accountLedgerData?.mode === 'single' && accountLedgerData?.account) {
          const acc = accountLedgerData.account;
          const excelRows = (accountLedgerData.lines || []).map((l: any, idx: number) => ({
            '#': idx + 1,
            'Date': l.date ? String(l.date).slice(0, 10) : '',
            'Reference': l.reference || l.entryId,
            'Particulars': l.entryDescription || l.lineDescription || '',
            'Party': l.partyName || l.partyId || '',
            'Debit (LKR)': Number(l.debit || 0),
            'Credit (LKR)': Number(l.credit || 0),
            'Running Balance (LKR)': Number(l.runningBalance || 0)
          }));

          // Add opening row at top
          excelRows.unshift({
            '#': 0,
            'Date': startDate ? `Prior to ${startDate}` : 'Beginning',
            'Reference': 'OPENING B/F',
            'Particulars': 'Balance Brought Forward',
            'Party': '—',
            'Debit (LKR)': 0,
            'Credit (LKR)': 0,
            'Running Balance (LKR)': Number(accountLedgerData.openingBalance || 0)
          } as any);

          // Add closing totals row at bottom
          excelRows.push({
            '#': '',
            'Date': '',
            'Reference': 'TOTALS & CLOSING C/F',
            'Particulars': `Net Period Movement: ${accountLedgerData.netMovement || 0}`,
            'Party': '',
            'Debit (LKR)': Number(accountLedgerData.totalDebit || 0),
            'Credit (LKR)': Number(accountLedgerData.totalCredit || 0),
            'Running Balance (LKR)': Number(accountLedgerData.closingBalance || 0)
          } as any);

          const ws = XLSX.utils.json_to_sheet(excelRows);
          XLSX.utils.book_append_sheet(wb, ws, `Ledger_${acc.code}`);
          const cleanName = String(acc.name).replace(/[^a-zA-Z0-9]/g, '_');
          XLSX.writeFile(wb, `Rex_Account_Ledger_${acc.code}_${cleanName}_${dateRangeLabel}.xlsx`);
        } else if (accountLedgerData?.mode === 'summary') {
          const summaryRows = (accountLedgerData.accounts || []).map((a: any, idx: number) => ({
            '#': idx + 1,
            'Account Code': a.code,
            'Account Name': a.name,
            'Type': a.type,
            'Subtype': a.subtype || '',
            'Opening Balance': a.openingBalance,
            'Period Debit': a.periodDebit,
            'Period Credit': a.periodCredit,
            'Net Movement': a.periodNet,
            'Closing Balance': a.closingBalance,
            'Transactions': a.txCount
          }));

          const ws = XLSX.utils.json_to_sheet(summaryRows);
          XLSX.utils.book_append_sheet(wb, ws, 'All_Accounts_Summary');
          XLSX.writeFile(wb, `Rex_COA_Summary_${dateRangeLabel}.xlsx`);
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
    const isLandscape = ['invoices', 'unpaid', 'cashbook', 'tax', 'account_ledger'].includes(activeTab);
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
    <div className="space-y-4 animate-fade-in w-full pb-12">
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
          onClick={() => setActiveTab('vendor_bills')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'vendor_bills'
              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-amber-600/30'
          }`}
        >
          <Receipt size={14} /> Vendor Bills & AP Aging
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

        <button
          onClick={() => setActiveTab('account_ledger')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'account_ledger'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-surface border-theme text-secondary hover:text-primary hover:border-indigo-500/30'
          }`}
        >
          <BookOpen size={14} /> Account Ledger (COA)
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
      {['invoices', 'unpaid', 'vendor_bills', 'cashbook', 'tax', 'account_ledger'].includes(activeTab) && (
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

            {/* Account Ledger: Chart of Accounts Autocomplete */}
            {activeTab === 'account_ledger' && (
              <div className="flex-1 min-w-[280px] max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <AccountAutocomplete
                      value={selectedAccountId}
                      onChange={(accId) => setSelectedAccountId(accId)}
                      placeholder="Autocomplete: Type code or name..."
                      showClear={true}
                    />
                  </div>
                  {selectedAccountId && (
                    <button
                      type="button"
                      onClick={() => setSelectedAccountId('')}
                      className="px-2 py-1 text-xs rounded bg-surface2 border border-theme-subtle text-secondary hover:text-primary transition-colors whitespace-nowrap"
                      title="Clear account filter and view all accounts"
                    >
                      All Accounts
                    </button>
                  )}
                </div>
              </div>
            )}

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

            {/* Vendor Bills Filters */}
            {activeTab === 'vendor_bills' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Vendor:</span>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="text-xs bg-surface border border-theme rounded-lg px-3 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500 max-w-[180px]"
                  >
                    <option value="all">All Vendors</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.company || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Category:</span>
                  <select
                    value={billCategory}
                    onChange={e => setBillCategory(e.target.value)}
                    className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500 max-w-[150px]"
                  >
                    <option value="all">All Categories</option>
                    <option value="Raw Material / Inventory">Raw Material</option>
                    <option value="Electricity / CEB">Electricity (CEB)</option>
                    <option value="Water Utility">Water (NWSDB)</option>
                    <option value="Telephone & Internet">Telecom & Internet</option>
                    <option value="Rent & Lease">Rent & Lease</option>
                    <option value="Machining & Subcontract">Subcontract</option>
                    <option value="Machine Maintenance">Maintenance</option>
                    <option value="Fuel & Transport">Fuel & Transport</option>
                    <option value="General Operating Expense">General Expense</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Source:</span>
                  <select
                    value={billSource}
                    onChange={e => setBillSource(e.target.value)}
                    className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
                  >
                    <option value="all">All Sources</option>
                    <option value="grn">GRN / PO Linked</option>
                    <option value="manual">Direct Operating Bills</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unpaid">Unpaid Only</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Fully Settled</option>
                    <option value="overdue">Overdue Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Aging:</span>
                  <select
                    value={agingBucket}
                    onChange={e => setAgingBucket(e.target.value)}
                    className="text-xs bg-surface border border-theme rounded-lg px-2.5 py-1.5 text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500"
                  >
                    <option value="all">All Aging</option>
                    <option value="current">Current (Not Due)</option>
                    <option value="1-30">1-30 Days</option>
                    <option value="31-60">31-60 Days</option>
                    <option value="61-90">61-90 Days</option>
                    <option value="90plus">90+ Days (Critical)</option>
                  </select>
                </div>
              </>
            )}

            {/* Search Input */}
            <div className="relative ml-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder={activeTab === 'account_ledger' ? "Search entry, ref, party..." : "Search report..."}
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

      {/* Vendor Bills AP KPI Cards */}
      {activeTab === 'vendor_bills' && reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <GlassCard className="p-3 border-l-4 border-l-amber-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Vendor Bills</span>
            <div className="text-lg font-black text-primary mt-1">{reportData.summary.totalBills}</div>
            <span className="text-[10px] text-muted block mt-0.5">Total Invoices</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-slate-500">
            <span className="text-[10px] uppercase font-bold text-muted block">Net Taxable Subtotal</span>
            <div className="text-lg font-black text-primary mt-1">{formatCurrency(reportData.summary.totalSubtotal || (reportData.summary.totalGross - (reportData.summary.totalTax || 0)))}</div>
            <span className="text-[10px] text-muted block mt-0.5">Before Tax</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-emerald-500">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Input VAT (18%)</span>
            <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(reportData.summary.totalVat || 0)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Claimable Tax</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-blue-500">
            <span className="text-[10px] uppercase font-bold text-blue-600 block">Gross Invoiced Value</span>
            <div className="text-lg font-black text-blue-600 mt-1">{formatCurrency(reportData.summary.totalGross)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Purchases & Expenses</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-amber-600 bg-amber-500/5">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">Total Accounts Payable</span>
            <div className="text-lg font-black text-amber-600 mt-1">{formatCurrency(reportData.summary.totalDue)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Balance Due to Vendors</span>
          </GlassCard>

          <GlassCard className="p-3 border-l-4 border-l-rose-500 bg-rose-500/5">
            <span className="text-[10px] uppercase font-bold text-rose-600 block">Total Overdue (AP)</span>
            <div className="text-lg font-black text-rose-600 mt-1">{formatCurrency(reportData.summary.totalOverdue)}</div>
            <span className="text-[10px] text-muted block mt-0.5">Past Due Date</span>
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

      {/* Account Ledger KPI Cards */}
      {activeTab === 'account_ledger' && accountLedgerData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {accountLedgerData.mode === 'single' ? (
            <>
              <GlassCard className="p-3 border-l-4 border-l-amber-500">
                <span className="text-[10px] uppercase font-bold text-muted block">Opening Balance</span>
                <div className="text-lg font-black text-primary mt-1">{formatCurrency(accountLedgerData.openingBalance)}</div>
                <span className="text-[10px] text-muted block mt-0.5">B/F Prior to {startDate || 'all'}</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Period Debit</span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">+{formatCurrency(accountLedgerData.totalDebit)}</div>
                <span className="text-[10px] text-muted block mt-0.5">Debit Inflows / Increases</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-rose-500">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Period Credit</span>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">-{formatCurrency(accountLedgerData.totalCredit)}</div>
                <span className="text-[10px] text-muted block mt-0.5">Credit Outflows / Reductions</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-purple-500">
                <span className="text-[10px] uppercase font-bold text-muted block">Net Movement</span>
                <div className={`text-lg font-black mt-1 ${accountLedgerData.netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {accountLedgerData.netMovement >= 0 ? '+' : ''}{formatCurrency(accountLedgerData.netMovement)}
                </div>
                <span className="text-[10px] text-muted block mt-0.5">Period Net Change</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-indigo-600 bg-indigo-500/5">
                <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">Closing Balance</span>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(accountLedgerData.closingBalance)}</div>
                <span className="text-[10px] text-muted block mt-0.5">C/F As of {endDate || todayStr}</span>
              </GlassCard>
            </>
          ) : (
            <>
              <GlassCard className="p-3 border-l-4 border-l-indigo-500">
                <span className="text-[10px] uppercase font-bold text-muted block">Total Accounts</span>
                <div className="text-lg font-black text-primary mt-1">{accountLedgerData.accounts?.length || 0}</div>
                <span className="text-[10px] text-muted block mt-0.5">Chart of Accounts</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-blue-500">
                <span className="text-[10px] uppercase font-bold text-muted block">Period Transactions</span>
                <div className="text-lg font-black text-primary mt-1">{accountLedgerData.grandTotals?.totalTx || 0}</div>
                <span className="text-[10px] text-muted block mt-0.5">Journal Postings</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Total Period Debits</span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(accountLedgerData.grandTotals?.totalDebit || 0)}</div>
                <span className="text-[10px] text-muted block mt-0.5">Across All Accounts</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-rose-500">
                <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Total Period Credits</span>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(accountLedgerData.grandTotals?.totalCredit || 0)}</div>
                <span className="text-[10px] text-muted block mt-0.5">Across All Accounts</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-purple-500 bg-purple-500/5">
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Active Date Range</span>
                <div className="text-sm font-black text-primary mt-1 font-mono">{startDate || 'Start'} to {endDate || 'Now'}</div>
                <span className="text-[10px] text-muted block mt-0.5">Period Filter</span>
              </GlassCard>
            </>
          )}
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
                    {activeTab === 'vendor_bills' && 'ACCOUNTS PAYABLE & VENDOR BILLS AGING REGISTER'}
                    {activeTab === 'cashbook' && 'DAILY CASHBOOK INFLOW & OUTFLOW ANALYSIS'}
                    {activeTab === 'tax' && 'INLAND REVENUE DEPARTMENT (RAMIS) OUTPUT TAX REPORT'}
                    {activeTab === 'account_ledger' && (accountLedgerData?.mode === 'single' ? `GENERAL LEDGER — ${accountLedgerData?.account?.code} ${accountLedgerData?.account?.name?.toUpperCase()}` : 'CHART OF ACCOUNTS — GENERAL LEDGER SUMMARY')}
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
                            <td className="py-2 px-2 text-right font-mono">{formatCurrency(r.subtotal, false, r.currency || 'LKR')}</td>
                            <td className="py-2 px-2 text-right font-mono text-amber-700 font-medium">
                              {r.ssclAmount > 0 ? formatCurrency(r.ssclAmount, false, r.currency || 'LKR') : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700 font-medium">
                              {r.vatAmount > 0 ? formatCurrency(r.vatAmount, false, r.currency || 'LKR') : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {r.taxAmount > 0 ? formatCurrency(r.taxAmount, false, r.currency || 'LKR') : '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(r.total, false, r.currency || 'LKR')}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-600">
                              {r.paidAmount > 0 ? formatCurrency(r.paidAmount, false, r.currency || 'LKR') : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                              {formatCurrency(r.balanceDue, false, r.currency || 'LKR')}
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

              {/* 1.5 VENDOR BILLS REGISTER / AP AGING REPORT TABLE */}
              {activeTab === 'vendor_bills' && (
                <div className="overflow-x-auto">
                  {/* Aging Schedule Summary Bar */}
                  {reportData?.summary?.agingBuckets && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        AP Aging Schedule:
                      </span>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>Current: <strong className="text-slate-800">{formatCurrency(reportData.summary.agingBuckets.current || 0)}</strong></div>
                        <div>1-30d: <strong className="text-amber-600">{formatCurrency(reportData.summary.agingBuckets.days1_30 || 0)}</strong></div>
                        <div>31-60d: <strong className="text-amber-700">{formatCurrency(reportData.summary.agingBuckets.days31_60 || 0)}</strong></div>
                        <div>61-90d: <strong className="text-rose-600">{formatCurrency(reportData.summary.agingBuckets.days61_90 || 0)}</strong></div>
                        <div>90d+: <strong className="text-rose-700 font-black">{formatCurrency(reportData.summary.agingBuckets.days90plus || 0)}</strong></div>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-2">Bill #</th>
                        <th className="py-2.5 px-2">Bill Date</th>
                        <th className="py-2.5 px-2">Due Date</th>
                        <th className="py-2.5 px-3">Vendor / Supplier</th>
                        <th className="py-2.5 px-2">Category</th>
                        <th className="py-2.5 px-2">Source</th>
                        <th className="py-2.5 px-2 text-right">Net Subtotal</th>
                        <th className="py-2.5 px-2 text-right text-amber-700">SSCL</th>
                        <th className="py-2.5 px-2 text-right text-emerald-700">VAT (18%)</th>
                        <th className="py-2.5 px-2 text-right font-bold">Gross Total</th>
                        <th className="py-2.5 px-2 text-right text-emerald-700">Paid</th>
                        <th className="py-2.5 px-3 text-right text-amber-700">Balance Due</th>
                        <th className="py-2.5 px-2 text-center">Aging</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                            No vendor bills found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-2 font-mono font-bold text-slate-900">{r.displayNo}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{r.date ? r.date.slice(0, 10) : '-'}</td>
                            <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                              <span className={r.isOverdue ? 'text-rose-600 font-bold' : ''}>
                                {r.dueDate ? r.dueDate.slice(0, 10) : '-'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{r.resolvedSupplierName}</div>
                              {r.invoiceNo && <div className="text-[10px] text-slate-500 font-mono">Inv: {r.invoiceNo}</div>}
                            </td>
                            <td className="py-2 px-2 text-slate-600 text-[11px]">{r.billCategory || 'General'}</td>
                            <td className="py-2 px-2 text-slate-600 text-[10.5px]">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.grnId || r.poId ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                {r.billSource}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-700">{formatCurrency(r.subtotal || 0)}</td>
                            <td className="py-2 px-2 text-right font-mono text-amber-700">{r.ssclAmount > 0 ? formatCurrency(r.ssclAmount) : '—'}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700 font-semibold">{r.vatAmount > 0 ? formatCurrency(r.vatAmount) : '—'}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(r.totalAmount)}</td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-700">{formatCurrency(r.paidAmount)}</td>
                            <td className="py-2 px-3 text-right font-mono font-black text-amber-700">{formatCurrency(r.balanceDue)}</td>
                            <td className="py-2 px-2 text-center text-[10.5px] font-semibold">
                              <span className={`px-1.5 py-0.5 rounded ${
                                r.agingBucket === 'Current' ? 'bg-emerald-100 text-emerald-800' :
                                r.agingBucket === '1-30 Days' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800 font-bold'
                              }`}>
                                {r.agingBucket}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center uppercase text-[10px] font-bold">
                              <span className={`px-1.5 py-0.5 rounded ${
                                r.balanceDue <= 0 ? 'bg-emerald-100 text-emerald-800' :
                                r.paidAmount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {r.balanceDue <= 0 ? 'Paid' : r.paidAmount > 0 ? 'Partial' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Summary Totals Row */}
                      {filteredRows.length > 0 && reportData?.summary && (
                        <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                          <td className="py-2.5 px-2" colSpan={6}>
                            TOTAL SUMMARY ({reportData.summary.totalBills} Vendor Bills)
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">{formatCurrency(reportData.summary.totalSubtotal || 0)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-amber-700">{formatCurrency(reportData.summary.totalSscl || 0)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-700">{formatCurrency(reportData.summary.totalVat || 0)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-black">{formatCurrency(reportData.summary.totalGross)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(reportData.summary.totalPaid)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700 text-sm">{formatCurrency(reportData.summary.totalDue)}</td>
                          <td className="py-2.5 px-2 text-center" colSpan={2}>—</td>
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

              {/* 2.5 ACCOUNT LEDGER (GENERAL LEDGER REPORT) */}
              {activeTab === 'account_ledger' && accountLedgerData && (
                <div className="space-y-4">
                  {accountLedgerData.mode === 'single' && accountLedgerData.account ? (
                    <div>
                      {/* Single Account Header info */}
                      <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-base text-slate-900">
                                {accountLedgerData.account.code}
                              </span>
                              <span className="font-bold text-base text-slate-900">
                                {accountLedgerData.account.name}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                                {accountLedgerData.account.type}
                              </span>
                              {accountLedgerData.account.subtype && (
                                <span className="text-[10px] text-slate-500">
                                  ({accountLedgerData.account.subtype})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span>Normal Balance: <strong className="text-slate-700">{accountLedgerData.account.type === 'Asset' || accountLedgerData.account.type === 'Expense' ? 'Debit (Dr)' : 'Credit (Cr)'}</strong></span>
                              <span>•</span>
                              <span>Date Range: <strong className="text-slate-700">{startDate ? startDate : 'Beginning'} to {endDate ? endDate : 'Current'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedAccountId('')}
                            className="text-xs px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <ArrowDownLeft size={13} className="rotate-45" /> View All Accounts
                          </button>
                        </div>
                      </div>

                      {/* Line-by-Line General Ledger Table */}
                      <div className="overflow-x-auto border border-slate-300 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[10px]">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Entry / Ref #</th>
                              <th className="py-2.5 px-4">Particulars & Description</th>
                              <th className="py-2.5 px-3">Party / Counterparty</th>
                              <th className="py-2.5 px-3 text-right text-emerald-700">Debit (LKR)</th>
                              <th className="py-2.5 px-3 text-right text-rose-700">Credit (LKR)</th>
                              <th className="py-2.5 px-3 text-right font-bold">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {/* Opening Balance Row */}
                            <tr className="bg-amber-50/70 font-semibold text-slate-700">
                              <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{startDate ? `Prior to ${startDate}` : 'B/F'}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-700">OPENING B/F</td>
                              <td className="py-2.5 px-4 italic text-slate-600">Balance brought forward from prior transactions</td>
                              <td className="py-2.5 px-3 text-slate-400">—</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(accountLedgerData.openingBalance || 0)}
                              </td>
                            </tr>

                            {/* Transaction Rows */}
                            {filteredLedgerLines.map((l: any, idx: number) => {
                              const d = l.date ? String(l.date).slice(0, 10) : '';
                              const ref = l.reference || l.entryId;
                              const desc = l.entryDescription || l.lineDescription || 'Journal Transaction';
                              return (
                                <tr key={l.id || idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{d}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ref}</td>
                                  <td className="py-2.5 px-4 font-medium text-slate-800">
                                    {desc}
                                    {l.lineDescription && l.entryDescription && l.lineDescription !== l.entryDescription && (
                                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{l.lineDescription}</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">{l.partyName || (l.partyId ? `${l.partyType || 'Party'}: ${l.partyId}` : '—')}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                                    {Number(l.debit) > 0 ? formatCurrency(l.debit) : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-medium">
                                    {Number(l.credit) > 0 ? formatCurrency(l.credit) : '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatCurrency(l.runningBalance || 0)}
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredLedgerLines.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                                  No journal transactions found for this account in the selected date range ({startDate || 'Start'} to {endDate || 'Now'}).
                                </td>
                              </tr>
                            )}

                            {/* Closing Totals Row */}
                            <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                              <td className="py-2.5 px-3" colSpan={4}>
                                PERIOD TOTALS & CLOSING BALANCE CARRIED FORWARD (C/F)
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                {formatCurrency(accountLedgerData.totalDebit || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                                {formatCurrency(accountLedgerData.totalCredit || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-indigo-900">
                                {formatCurrency(accountLedgerData.closingBalance || 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* All Accounts Summary Mode */}
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <BookOpen size={13} className="text-indigo-600" /> Chart of Accounts Ledger Summary
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Account-wise opening balance, period movements (debits & credits), and closing balances for {startDate ? startDate : 'Beginning'} to {endDate ? endDate : 'Current'}. Select any account using the autocomplete box above or click &ldquo;View Ledger&rdquo; below.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-300 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[10px]">
                              <th className="py-2.5 px-3">Code</th>
                              <th className="py-2.5 px-3">Account Name</th>
                              <th className="py-2.5 px-2.5">Type & Subtype</th>
                              <th className="py-2.5 px-3 text-right text-slate-600">Opening Balance</th>
                              <th className="py-2.5 px-3 text-right text-emerald-700">Period Debit</th>
                              <th className="py-2.5 px-3 text-right text-rose-700">Period Credit</th>
                              <th className="py-2.5 px-3 text-right text-purple-700">Net Movement</th>
                              <th className="py-2.5 px-3 text-right font-bold">Closing Balance</th>
                              <th className="py-2.5 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredSummaryAccounts.map((acc: any) => (
                              <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-indigo-700">{acc.code}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{acc.name}</td>
                                <td className="py-2 px-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {acc.type}
                                  </span>
                                  {acc.subtype && <span className="text-[10px] text-slate-500 ml-1">({acc.subtype})</span>}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-700 font-medium">
                                  {formatCurrency(acc.openingBalance)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-emerald-700 font-medium">
                                  {acc.periodDebit > 0 ? formatCurrency(acc.periodDebit) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700 font-medium">
                                  {acc.periodCredit > 0 ? formatCurrency(acc.periodCredit) : '—'}
                                </td>
                                <td className={`py-2 px-3 text-right font-mono font-semibold ${acc.periodNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {acc.periodNet !== 0 ? (acc.periodNet > 0 ? `+${formatCurrency(acc.periodNet)}` : formatCurrency(acc.periodNet)) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  {formatCurrency(acc.closingBalance)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAccountId(acc.id)}
                                    className="px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1"
                                  >
                                    View Ledger <ArrowRight size={11} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredSummaryAccounts.length === 0 && (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                                  No accounts found matching search criteria.
                                </td>
                              </tr>
                            )}
                            <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                              <td className="py-2.5 px-3" colSpan={3}>GRAND TOTALS</td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {formatCurrency(accountLedgerData.grandTotals?.totalOpening || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                {formatCurrency(accountLedgerData.grandTotals?.totalDebit || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                                {formatCurrency(accountLedgerData.grandTotals?.totalCredit || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-purple-700">—</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-indigo-900">
                                {formatCurrency(accountLedgerData.grandTotals?.totalClosing || 0)}
                              </td>
                              <td className="py-2.5 px-3"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
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
