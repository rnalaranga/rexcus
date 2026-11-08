import { createPortal } from 'react-dom';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Search, Eye, Filter, ArrowLeft, RefreshCw, 
  Building2, CheckCircle2, Clock, AlertTriangle, DollarSign,
  ChevronRight, Calendar, User, Tag, Receipt, X
} from 'lucide-react';
import { useQuotations, useCustomers, useLeads } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { QuotationPrintView } from '@/components/QuotationPrintView';
import { formatCurrency, formatDate } from '@/lib/utils';

export const MobileQuotations: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { data: quotations = [], loading, refetch } = useQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: leads = [] } = useLeads();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'usd' | 'lkr'>('all');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'summary' | 'print'>('summary');

  // Enriched quotations list
  const enrichedQuotes = useMemo(() => {
    return quotations.map((q: any) => {
      let qData: any = {};
      try {
        qData = typeof q.data === 'string' ? JSON.parse(q.data || '{}') : (q.data || {});
      } catch (e) {
        qData = {};
      }

      const quoteNo = q.quotationNo || q.docNo || qData.quotationNo || q.quoNo || q.id;
      const lead = leads.find((l: any) => l.id === q.leadId || l.leadId === q.leadId) || 
                   customers.find((c: any) => c.id === q.leadId);
      const clientName = q.clientName || q.clientCompany || qData.company || qData.customerName || lead?.company || lead?.name || 'Valued Customer';
      const quoteCurrency = String(q.currency || qData.currency || lead?.currency || (lead?.isForeign ? 'USD' : 'LKR')).toUpperCase();
      const isUSD = quoteCurrency === 'USD' || quoteCurrency === '$';
      const amount = Number(q.totalAmount || qData.custTotals?.total || qData.totals?.total || q.customAmount || 0);
      
      const items = (Array.isArray(qData.custItems) && qData.custItems.length > 0)
        ? qData.custItems
        : ((Array.isArray(q.custItems) && q.custItems.length > 0)
            ? q.custItems
            : (qData.items || []));

      return {
        ...q,
        parsedData: qData,
        quoteNo,
        clientName,
        currency: quoteCurrency,
        isUSD,
        amount,
        items,
        lead,
        subject: qData.subject || qData.scope || q.subject || ''
      };
    });
  }, [quotations, leads, customers]);

  // Filtered quotations
  const filteredQuotes = useMemo(() => {
    return enrichedQuotes.filter((q: any) => {
      // Search filter
      if (searchQuery.trim()) {
        const qStr = searchQuery.toLowerCase().trim();
        const matchNo = q.quoteNo?.toLowerCase().includes(qStr);
        const matchClient = q.clientName?.toLowerCase().includes(qStr);
        const matchSubject = q.subject?.toLowerCase().includes(qStr);
        if (!matchNo && !matchClient && !matchSubject) return false;
      }

      // Status chip filter
      if (statusFilter === 'pending') {
        return q.status === 'Pending Approval' || q.status === 'Draft_Pending' || q.editApprovalRequested;
      }
      if (statusFilter === 'approved') {
        return q.status === 'Approved' || q.status === 'Confirmed' || q.status === 'Issued';
      }
      if (statusFilter === 'usd') {
        return q.isUSD;
      }
      if (statusFilter === 'lkr') {
        return !q.isUSD;
      }
      return true;
    });
  }, [enrichedQuotes, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = enrichedQuotes.length;
    const pending = enrichedQuotes.filter((q: any) => q.status === 'Pending Approval' || q.status === 'Draft_Pending' || q.editApprovalRequested).length;
    const approved = enrichedQuotes.filter((q: any) => q.status === 'Approved' || q.status === 'Confirmed' || q.status === 'Issued').length;
    const usdQuotes = enrichedQuotes.filter((q: any) => q.isUSD);
    const usdTotal = usdQuotes.reduce((sum: number, q: any) => sum + q.amount, 0);

    return { total, pending, approved, usdCount: usdQuotes.length, usdTotal };
  }, [enrichedQuotes]);

  // Merged print data for full A4 letterhead view
  const mergedQuotePrintData = useMemo(() => {
    if (!selectedQuote) return null;
    const q = selectedQuote;
    const parsed = selectedQuote.parsedData || {};
    const lead = selectedQuote.lead;

    const merged = {
      ...q,
      ...parsed,
      status: q.status || parsed.status || 'Draft',
      custItems: selectedQuote.items,
      items: selectedQuote.items,
      totalAmount: selectedQuote.amount,
      currency: selectedQuote.currency,
      exchangeRate: q.exchangeRate || parsed.exchangeRate || 1
    };

    if (!merged.customerName && (lead?.company || lead?.name || q.clientName)) {
      merged.customerName = lead?.company || lead?.name || q.clientName;
    }
    if (!merged.customerCompany && (lead?.company || q.clientCompany)) {
      merged.customerCompany = lead?.company || q.clientCompany;
    }
    if (!merged.customerAddress && (lead?.address || q.address)) {
      merged.customerAddress = lead?.address || q.address;
    }
    if (!merged.vatNo && lead?.vat) merged.vatNo = lead.vat;
    if (!merged.tinNo && (lead?.tin || lead?.brNumber)) merged.tinNo = lead.tin || lead.brNumber;

    return merged;
  }, [selectedQuote]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Nav & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/mobile/dashboard')}
            className="p-1.5 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-primary flex items-center gap-1.5">
              Quotations
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface2 text-muted border border-theme-subtle font-mono">
                {enrichedQuotes.length}
              </span>
            </h1>
            <p className="text-[11px] text-muted">
              Browse all commercial quotations & specifications
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-rex-600' : ''} />
        </button>
      </div>

      {/* Mini KPI Snapshot */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-muted block">Total Quotes</span>
          <span className="text-sm font-bold font-mono text-primary">{stats.total}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">Pending</span>
          <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{stats.pending}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">USD Export</span>
          <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{stats.usdCount}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by quote #, client, or scope..."
          className="w-full bg-surface border border-theme rounded-xl pl-9 pr-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500 shadow-xs"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All (${enrichedQuotes.length})` },
          { key: 'pending', label: `Pending (${stats.pending})` },
          { key: 'approved', label: `Approved (${stats.approved})` },
          { key: 'usd', label: `USD (${stats.usdCount})` },
          { key: 'lkr', label: 'LKR' }
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setStatusFilter(chip.key as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === chip.key
                ? 'bg-rex-600 text-white font-bold shadow-xs'
                : 'bg-surface border border-theme text-secondary hover:text-primary'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Quotations List */}
      {filteredQuotes.length > 0 ? (
        <div className="space-y-2.5">
          {filteredQuotes.map((q: any) => {
            const isPending = q.status === 'Pending Approval' || q.status === 'Draft_Pending' || q.editApprovalRequested;
            const isApproved = q.status === 'Approved' || q.status === 'Confirmed' || q.status === 'Issued';

            return (
              <div
                key={q.id}
                onClick={() => {
                  setSelectedQuote(q);
                  setPreviewTab('summary');
                }}
                className="p-3.5 rounded-xl bg-surface border border-theme shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {q.isUSD && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm shadow-blue-500/50" title="USD Currency" />
                      )}
                      <span className="text-xs font-bold font-mono text-primary">
                        {q.quoteNo}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                        isPending 
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30' 
                          : isApproved 
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-surface2 text-muted border border-theme-subtle'
                      }`}>
                        {q.status || 'Draft'}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-primary truncate flex items-center gap-1.5">
                      <Building2 size={13} className="text-muted shrink-0" />
                      {q.clientName}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-rex-600 dark:text-rex-400 block">
                      {formatCurrency(q.amount, false, q.currency)}
                    </span>
                    <span className="text-[9px] text-muted font-mono">
                      {formatDate(q.date || q.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Scope / Subject preview */}
                {q.subject && (
                  <p className="text-[11px] text-secondary truncate">
                    {q.subject}
                  </p>
                )}

                {/* Footer specs & View action */}
                <div className="flex items-center justify-between pt-1 border-t border-theme-subtle/50 text-[11px] text-muted">
                  <span>{q.items?.length || 1} line item{q.items?.length === 1 ? '' : 's'}</span>
                  <span className="text-rex-600 dark:text-rex-400 font-semibold flex items-center gap-0.5">
                    View Details <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-surface border border-theme text-center space-y-2 shadow-xs">
          <FileText size={24} className="mx-auto text-muted" />
          <h3 className="text-sm font-bold text-primary">No Quotations Found</h3>
          <p className="text-xs text-muted">
            {searchQuery ? 'Try matching a different quote # or client name.' : 'No quotations found in this category.'}
          </p>
        </div>
      )}

      {/* ── Quotation Full Preview Modal ── */}
      {selectedQuote && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
            {/* Modal Header */}
            <div className="p-3.5 bg-gradient-to-r from-rex-700 via-rex-600 to-rex-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/20 text-white font-bold">
                    {selectedQuote.status || 'Quotation'}
                  </span>
                  {selectedQuote.isUSD && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500 text-white text-[10px] font-bold font-mono">
                      USD
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold truncate mt-0.5">
                  Quotation #{selectedQuote.quoteNo} — {selectedQuote.clientName}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedQuote(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center border-b border-theme bg-surface2/50 px-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('summary')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  previewTab === 'summary'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <FileText size={13} />
                <span>Summary & Line Items</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('print')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  previewTab === 'print'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <Receipt size={13} />
                <span>Official Letterhead (A4)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 space-y-3.5 flex-1 text-primary">
              {previewTab === 'summary' ? (
                <>
                  {/* Client Info Card */}
                  <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-rex-600 dark:text-rex-400" />
                        {selectedQuote.clientName}
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {formatDate(selectedQuote.date || selectedQuote.createdAt)}
                      </span>
                    </div>
                    {selectedQuote.parsedData?.attention && (
                      <p className="text-[11px] text-secondary">
                        <span className="text-muted">Attn:</span> {selectedQuote.parsedData.attention}
                      </p>
                    )}
                    {selectedQuote.subject && (
                      <p className="text-[11px] text-primary font-medium">
                        <span className="text-muted">Scope/Subject:</span> {selectedQuote.subject}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
                      <span>Quoted Line Items ({selectedQuote.items?.length || 0})</span>
                      <span className="font-mono text-primary font-semibold">{selectedQuote.currency}</span>
                    </h4>

                    {selectedQuote.items?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedQuote.items.map((it: any, idx: number) => {
                          const desc = it.description || it.desc || it.name || it.productName || `Item #${idx + 1}`;
                          const specs = it.specifications || it.specs || it.details || '';
                          const qty = Number(it.qty || it.quantity || 1);
                          const uom = it.uom || it.unit || 'Nos';
                          const unitPrice = Number(it.unitPrice || it.rate || it.price || 0);
                          const lineTotal = Number(it.total || it.amount || (qty * unitPrice));

                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-surface border border-theme-subtle space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="text-[10px] text-muted font-mono font-bold mr-1">#{idx + 1}</span>
                                  <span className="text-xs font-bold text-primary">{desc}</span>
                                </div>
                                <span className="text-xs font-bold font-mono text-primary shrink-0">
                                  {formatCurrency(lineTotal, false, selectedQuote.currency)}
                                </span>
                              </div>

                              {specs && (
                                <p className="text-[10.5px] text-secondary font-mono italic pl-4">
                                  {specs}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-muted pl-4 pt-0.5">
                                <span>{qty} {uom} × {formatCurrency(unitPrice, false, selectedQuote.currency)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-lg bg-surface2 text-xs text-muted">
                        Total quotation value: {formatCurrency(selectedQuote.amount, false, selectedQuote.currency)}
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Totals Box */}
                  <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-secondary">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedQuote.parsedData?.custTotals?.subtotal || selectedQuote.amount, false, selectedQuote.currency)}</span>
                    </div>
                    {Number(selectedQuote.parsedData?.custTotals?.discount || 0) > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedQuote.parsedData.custTotals.discount, false, selectedQuote.currency)}</span>
                      </div>
                    )}
                    {Number(selectedQuote.parsedData?.custTotals?.sscl || 0) > 0 && (
                      <div className="flex justify-between text-secondary">
                        <span>SSCL (2.5%):</span>
                        <span>+{formatCurrency(selectedQuote.parsedData.custTotals.sscl, false, selectedQuote.currency)}</span>
                      </div>
                    )}
                    {Number(selectedQuote.parsedData?.custTotals?.vat || 0) > 0 && (
                      <div className="flex justify-between text-secondary">
                        <span>VAT (18%):</span>
                        <span>+{formatCurrency(selectedQuote.parsedData.custTotals.vat, false, selectedQuote.currency)}</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-theme-subtle flex justify-between font-bold text-sm text-rex-600 dark:text-rex-400">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(selectedQuote.amount, false, selectedQuote.currency)}</span>
                    </div>
                  </div>

                  {/* Commercial Terms & Remarks */}
                  {(selectedQuote.parsedData?.custTerms || selectedQuote.parsedData?.terms || selectedQuote.parsedData?.notes) && (
                    <div className="p-3 rounded-lg bg-surface border border-theme-subtle text-[11px] space-y-1 text-secondary">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Terms & Remarks:</span>
                      <p>{selectedQuote.parsedData?.custTerms || selectedQuote.parsedData?.terms || selectedQuote.parsedData?.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Full Letterhead (A4 Printable Document) */
                <div className="space-y-2">
                  <p className="text-[10.5px] text-muted text-center italic">
                    Swipe horizontally to view full standard A4 letterhead document
                  </p>
                  <div className="p-2 bg-white text-black overflow-x-auto rounded-lg border border-theme-subtle shadow-inner">
                    <div className="min-w-[720px] origin-top-left">
                      {mergedQuotePrintData && (
                        <QuotationPrintView 
                          data={mergedQuotePrintData} 
                          type={selectedQuote.type === 'job' ? 'job' : 'main'} 
                          lead={selectedQuote.lead} 
                          settings={settings} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Sticky Footer */}
            <div className="p-3 bg-surface border-t border-theme flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-surface2 hover:bg-surface border border-theme text-primary text-xs font-bold active:scale-95 transition-all text-center"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      ,
        document.body
      )}
    </div>
  );
};
