import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Calendar, Search, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportToExcel';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const TaxReport: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [taxCategory, setTaxCategory] = useState<string>('all');
  const [accountId, setAccountId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const loadReport = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (taxCategory && taxCategory !== 'all') q.set('taxCategory', taxCategory);
    if (accountId && accountId !== 'all') q.set('accountId', accountId);

    const qStr = q.toString() ? `?${q.toString()}` : '';
    fetch(`${API_BASE}/finance/reports/tax${qStr}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
        setPage(1);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, taxCategory, accountId]);

  const applyPreset = (preset: 'this_month' | 'last_month' | 'this_quarter' | 'all_time') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === 'this_month') {
      setStartDate(fmt(new Date(y, m, 1)));
      setEndDate(fmt(now));
    } else if (preset === 'last_month') {
      setStartDate(fmt(new Date(y, m - 1, 1)));
      setEndDate(fmt(new Date(y, m, 0)));
    } else if (preset === 'this_quarter') {
      const qStart = Math.floor(m / 3) * 3;
      setStartDate(fmt(new Date(y, qStart, 1)));
      setEndDate(fmt(now));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredLines = useMemo(() => {
    const lines = data?.taxLines || [];
    if (!search.trim()) return lines;
    const q = search.toLowerCase();
    return lines.filter((l: any) =>
      [l.reference, l.accountCode, l.accountName, l.entryDescription, l.description]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  }, [data?.taxLines, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedLines = useMemo(
    () => filteredLines.slice((page - 1) * pageSize, page * pageSize),
    [filteredLines, page, pageSize]
  );

  const exportPDF = () => {
    const element = document.getElementById('tax-report');
    if (!element) return;
    const opt: any = {
      margin: 10,
      filename: `Tax_VAT_Report_${startDate || 'All'}_${endDate || 'Current'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };

  const handleExportExcel = () => {
    const rows = filteredLines.map((l: any) => ({
      Date: l.date ? String(l.date).slice(0, 10) : '',
      Reference: l.reference || l.entryId,
      'Account Code': l.accountCode || '',
      'Account Name': l.accountName || l.accountId,
      Description: l.entryDescription || l.description || '',
      'Debit (Paid / Claimable)': Number(l.debit || 0),
      'Credit (Collected / Payable)': Number(l.credit || 0)
    }));
    exportToExcel({
      fileName: `Tax_VAT_Report_${startDate || 'All'}_${endDate || 'Current'}`,
      sheetName: 'Tax & VAT Transactions',
      reportTitle: 'REX INDUSTRIES — TAX & VAT REPORT',
      subtitle: `Period: ${startDate || 'Beginning'} to ${endDate || 'Current'} | Category: ${taxCategory.toUpperCase()}`,
      columns: [
        { header: 'Date', key: 'Date', width: 14 },
        { header: 'Reference', key: 'Reference', width: 20 },
        { header: 'Account Code', key: 'Account Code', width: 14 },
        { header: 'Account Name', key: 'Account Name', width: 28 },
        { header: 'Description', key: 'Description', width: 40 },
        { header: 'Debit (Paid / Claimable)', key: 'Debit (Paid / Claimable)', width: 22 },
        { header: 'Credit (Collected / Payable)', key: 'Credit (Collected / Payable)', width: 22 }
      ],
      rows
    });
  };

  const summary = data?.summary || {};
  const invTax = data?.invoiceTaxSummary || {};
  const billTax = data?.billTaxSummary || {};

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Tax & VAT Report (IRD)</h1>
            <p className="text-[11px] text-muted mt-0.5">Output VAT, Input VAT, SSCL & Net Tax Liability breakdown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadReport} disabled={loading}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={handleExportExcel} disabled={filteredLines.length === 0} className="border border-theme-subtle text-emerald-600">
            Export Excel
          </Button>
          <Button variant="ghost" size="sm" icon={Download} onClick={exportPDF} className="bg-rex-600 hover:bg-rex-700 text-white border-transparent">
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-3 border-b border-theme-subtle bg-surface/40 space-y-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted flex items-center gap-1 mr-1">
              <Calendar size={12} /> Quick Period:
            </span>
            <button onClick={() => applyPreset('this_month')} className="px-2.5 py-1 text-[11px] rounded border border-theme-subtle bg-surface hover:bg-surface2 text-primary font-medium">
              This Month
            </button>
            <button onClick={() => applyPreset('last_month')} className="px-2.5 py-1 text-[11px] rounded border border-theme-subtle bg-surface hover:bg-surface2 text-primary font-medium">
              Last Month
            </button>
            <button onClick={() => applyPreset('this_quarter')} className="px-2.5 py-1 text-[11px] rounded border border-theme-subtle bg-surface hover:bg-surface2 text-primary font-medium">
              This Quarter
            </button>
            <button
              onClick={() => applyPreset('all_time')}
              className={`px-2.5 py-1 text-[11px] rounded border font-medium ${!startDate && !endDate ? 'bg-rex-600 text-white border-rex-600' : 'border-theme-subtle bg-surface hover:bg-surface2 text-primary'}`}
            >
              All Time
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted">From:</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted">To:</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-muted" />
              <select value={taxCategory} onChange={e => { setTaxCategory(e.target.value); setAccountId('all'); }} className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs text-primary font-medium">
                <option value="all">All Tax Types (VAT + SSCL)</option>
                <option value="vat">VAT Only (Output & Input)</option>
                <option value="sscl">SSCL Only (2.5%)</option>
                <option value="other">Other Taxes</option>
              </select>
            </div>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs text-primary font-medium max-w-[210px]">
              <option value="all">All Tax Accounts</option>
              {(data?.taxAccounts || []).map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ref, account..."
                className="bg-surface border border-theme-subtle rounded pl-7 pr-2.5 py-1 text-xs text-primary w-44"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* KPI Summary Cards */}
        {!loading && data && (
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3">
            <GlassCard className="p-3.5 border-t-2 border-t-amber-500">
              <span className="text-[10px] uppercase font-bold text-muted block">Output VAT (Sales)</span>
              <span className="text-base font-black font-mono text-primary mt-1 block">{formatCurrency(summary.outputVat || 0)}</span>
            </GlassCard>
            <GlassCard className="p-3.5 border-t-2 border-t-emerald-500">
              <span className="text-[10px] uppercase font-bold text-muted block">Input VAT (Claimable)</span>
              <span className="text-base font-black font-mono text-emerald-600 mt-1 block">-{formatCurrency(summary.inputVat || 0)}</span>
            </GlassCard>
            <GlassCard className="p-3.5 border-t-2 border-t-blue-500">
              <span className="text-[10px] uppercase font-bold text-muted block">Net VAT Payable</span>
              <span className="text-base font-black font-mono text-blue-600 mt-1 block">{formatCurrency(summary.netVatPayable || 0)}</span>
            </GlassCard>
            <GlassCard className="p-3.5 border-t-2 border-t-purple-500">
              <span className="text-[10px] uppercase font-bold text-muted block">SSCL Payable (2.5%)</span>
              <span className="text-base font-black font-mono text-purple-600 mt-1 block">{formatCurrency(summary.ssclPayable || 0)}</span>
              <span className="text-[10px] text-muted block mt-0.5">Exp: {formatCurrency(summary.ssclExpense || 0)}</span>
            </GlassCard>
            <GlassCard className="p-3.5 border-t-2 border-t-rose-500">
              <span className="text-[10px] uppercase font-bold text-muted block">Total Net Tax Liability</span>
              <span className="text-base font-black font-mono text-rose-600 mt-1 block">{formatCurrency(data?.totalTaxPayable || 0)}</span>
            </GlassCard>
          </div>
        )}

        {/* Document Tax Cross-Check Strip */}
        {!loading && data && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
            <GlassCard className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Commercial Invoices ({invTax.count || 0})</span>
                <span className="text-muted">Total Sales: <strong className="font-mono text-primary">{formatCurrency(invTax.totalSales || 0)}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted block">Invoice Tax Recorded</span>
                <span className="font-mono font-bold text-amber-600">{formatCurrency(invTax.totalTax || 0)}</span>
              </div>
            </GlassCard>
            <GlassCard className="p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Vendor Bills ({billTax.count || 0})</span>
                <span className="text-muted">Total Purchases: <strong className="font-mono text-primary">{formatCurrency(billTax.totalPurchases || 0)}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted block">Bill Tax Recorded</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(billTax.totalTax || 0)}</span>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Printable Report Card */}
        <GlassCard className="p-0 max-w-5xl mx-auto overflow-hidden shadow-sm border border-theme-subtle">
          <div className="p-10 bg-white text-black" id="tax-report">
            {loading ? (
              <div className="text-center animate-pulse text-xs font-medium text-gray-500 py-12">Calculating Taxes...</div>
            ) : (
              <div className="space-y-8">
                {/* BRANDED HEADER */}
                <div className="text-center border-b-2 border-black pb-5">
                  <img src="/rex-logo.png" alt="REX" className="h-10 object-contain mx-auto mb-3" />
                  <h2 className="text-xl font-black uppercase tracking-widest text-black">TAX & VAT SUMMARY REPORT</h2>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                    Period: {startDate || 'Beginning'} to {endDate || 'Current'} • Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Tax Accounts Breakdown */}
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-3 text-black border-b border-gray-300 pb-2">
                    Tax Accounts Summary ({data?.taxAccounts?.length || 0} accounts)
                  </h3>
                  {(!data?.taxAccounts || data.taxAccounts.length === 0) ? (
                    <p className="text-xs text-gray-500 py-4">No tax accounts matched the selected filter.</p>
                  ) : (
                    data.taxAccounts.map((acc: any) => {
                      const t = String(acc.type || '').toLowerCase();
                      const roleLabel =
                        t === 'asset' ? '(Claimable / Input)' : t === 'expense' ? '(Non-claimable Expense)' : '(Payable / Output)';
                      return (
                        <div key={acc.id} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                          <span className="font-semibold text-gray-700 text-xs">
                            {acc.code} - {acc.name}
                            <span className="ml-2 text-[10px] font-normal text-gray-500 uppercase">[{acc.taxCategory}]</span>
                          </span>
                          <span className="font-mono text-sm font-bold text-gray-900">
                            {formatCurrency(acc.balance)} <span className="text-[10px] font-normal text-gray-500">{roleLabel}</span>
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div className="flex justify-between items-center py-4 border-t-2 border-b-4 border-double border-black mt-4">
                    <span className="font-black text-sm uppercase tracking-widest">Total Net Tax Liability</span>
                    <span className="font-mono text-lg font-black">{formatCurrency(data?.totalTaxPayable || 0)}</span>
                  </div>
                </div>

                {/* Detailed Tax Transactions */}
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-3 text-black border-b border-gray-300 pb-2">
                    Tax GL Transactions ({filteredLines.length})
                  </h3>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 border-y border-gray-300">
                      <tr>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Date</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Ref</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Account</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px]">Description</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Debit (Paid)</th>
                        <th className="p-2 font-bold uppercase tracking-wider text-[9px] text-right">Credit (Collected)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-gray-500">
                            No tax transactions found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedLines.map((line: any) => (
                          <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 font-mono">{line.date ? String(line.date).slice(0, 10) : '-'}</td>
                            <td className="p-2 font-mono text-[10px]">{line.reference || line.entryId}</td>
                            <td className="p-2">{line.accountCode ? `${line.accountCode} - ${line.accountName || ''}` : (line.accountName || line.accountId)}</td>
                            <td className="p-2 text-gray-600 max-w-xs truncate">{line.entryDescription || line.description || '-'}</td>
                            <td className="p-2 text-right font-mono">{Number(line.debit) > 0 ? formatCurrency(line.debit) : '-'}</td>
                            <td className="p-2 text-right font-mono">{Number(line.credit) > 0 ? formatCurrency(line.credit) : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          {!loading && (
            <div className="px-4 pb-3 bg-surface border-t border-theme-subtle">
              <Pagination
                currentPage={page}
                totalItems={filteredLines.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="tax transactions"
              />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
