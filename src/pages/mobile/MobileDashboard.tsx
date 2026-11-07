import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, CheckSquare, 
  PackageCheck, AlertTriangle, ArrowRight, ShieldCheck, Clock,
  DollarSign, FileText, Plus, RefreshCw, ChevronRight, Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDashboard, useCashbook } from '@/hooks/useFinance';
import { useQuotations, useCustomers, useFinishedGoodsOrders } from '@/hooks/useData';
import { formatCurrency, formatDate } from '@/lib/utils';

export const MobileDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: finData, loading: finLoading, refetch: refetchFin } = useFinanceDashboard();
  const { data: cashbookData, loading: cashLoading, refetch: refetchCash } = useCashbook(todayStr);

  const { data: quotations = [] } = useQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useFinishedGoodsOrders();

  // Pending Approvals Calculation
  const pendingQuotes = (quotations || []).filter((q: any) => 
    q.status === 'Pending Approval' || q.status === 'Draft_Pending' || q.editApprovalRequested
  ).length;
  const pendingOrders = (orders || []).filter((o: any) => 
    o.advanceWaiverRequested && !o.advanceWaiverApproved
  ).length;
  const pendingCredit = (customers || []).filter((c: any) => 
    c.creditLimitRequested && !c.creditLimitApproved
  ).length;
  const pendingCash = (cashbookData?.pendingEntries || []).length;
  const totalPending = pendingQuotes + pendingOrders + pendingCredit + pendingCash;

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cashInHand = Number(cashbookData?.closingBalance ?? (finData?.cash || 0));
  const receivables = Number(finData?.ar || 0);
  const payables = Number(finData?.ap || 0);
  const revenue = Number(finData?.revenue || 0);

  const handleRefresh = () => {
    refetchFin();
    refetchCash();
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Welcome Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-primary flex items-center gap-1.5">
            {greeting}, {user?.name?.split(' ')[0] || 'Sir'}
            <span className="inline-block animate-wave text-base">👋</span>
          </h1>
          <p className="text-xs text-muted font-mono">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all shadow-xs"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={finLoading || cashLoading ? 'animate-spin text-rex-600' : ''} />
        </button>
      </div>

      {/* Pending Approvals Callout Banner */}
      {totalPending > 0 ? (
        <div 
          onClick={() => navigate('/mobile/approvals')}
          className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle size={20} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                  {totalPending} Action{totalPending > 1 ? 's' : ''} Required
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/25 text-amber-900 dark:text-amber-200">
                  Pending
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Quotations, cash vouchers, advance waivers & credit limits awaiting your sign-off.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>All operational requests are approved and up to date!</span>
        </div>
      )}

      {/* 2x2 Executive Financial Snapshot */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Cash in Hand */}
        <div 
          onClick={() => navigate('/mobile/cashbook')}
          className="p-3.5 rounded-xl bg-surface border border-theme active:border-emerald-500/50 transition-all flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-[11px] font-semibold tracking-tight">Cash in Hand</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet size={13} />
            </div>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(cashInHand)}
            </div>
            <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5 font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(cashbookData?.totalIn || 0, true)}</span>
              <span>/</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">-{formatCurrency(cashbookData?.totalOut || 0, true)}</span>
            </div>
          </div>
        </div>

        {/* Receivables (Market Due) */}
        <div className="p-3.5 rounded-xl bg-surface border border-theme flex flex-col justify-between shadow-xs hover:shadow-sm">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-[11px] font-semibold tracking-tight">Receivables (AR)</span>
            <div className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowDownLeft size={13} />
            </div>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tight">
              {formatCurrency(receivables)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Market Collections Due
            </span>
          </div>
        </div>

        {/* Payables (Suppliers) */}
        <div className="p-3.5 rounded-xl bg-surface border border-theme flex flex-col justify-between shadow-xs hover:shadow-sm">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-[11px] font-semibold tracking-tight">Payables (AP)</span>
            <div className="w-6 h-6 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={13} />
            </div>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(payables)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Supplier Liabilities
            </span>
          </div>
        </div>

        {/* Revenue */}
        <div className="p-3.5 rounded-xl bg-surface border border-theme flex flex-col justify-between shadow-xs hover:shadow-sm">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-[11px] font-semibold tracking-tight">Period Revenue</span>
            <div className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp size={13} />
            </div>
          </div>
          <div>
            <div className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight">
              {formatCurrency(revenue)}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Invoiced Sales Total
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/mobile/cashbook?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-theme hover:border-emerald-500/40 text-primary active:scale-95 transition-all text-left shadow-xs hover:shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Plus size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Add Cash Entry</span>
              <span className="text-[10px] text-muted">Payment or Receipt</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/mobile/mr?action=new')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-theme hover:border-blue-500/40 text-primary active:scale-95 transition-all text-left shadow-xs hover:shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <PackageCheck size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Request Material</span>
              <span className="text-[10px] text-muted">Material Requisition</span>
            </div>
          </button>
        </div>
      </div>

      {/* Today's Cashbook Recent 3 Entries */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Today's Cashbook Activity
          </h3>
          <button
            type="button"
            onClick={() => navigate('/mobile/cashbook')}
            className="text-[11px] text-rex-600 dark:text-rex-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            View All ({cashbookData?.entries?.length || 0})
            <ChevronRight size={12} />
          </button>
        </div>

        {cashbookData?.entries && cashbookData.entries.length > 0 ? (
          <div className="space-y-1.5">
            {cashbookData.entries.slice(0, 3).map((entry: any, idx: number) => {
              const isReceipt = entry.entryType === 'RECEIPT' || entry.type === 'IN';
              return (
                <div 
                  key={entry.id || idx}
                  className="p-2.5 rounded-lg bg-surface border border-theme flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isReceipt ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {isReceipt ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">
                        {entry.particulars || entry.description || (isReceipt ? 'Cash Receipt' : 'Cash Expense')}
                      </p>
                      <p className="text-[10px] text-muted font-mono">
                        {entry.time || 'Today'} • {entry.targetAccountName || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-bold font-mono shrink-0 ml-2 ${
                    isReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {isReceipt ? '+' : '-'}{formatCurrency(entry.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface border border-theme text-center text-xs text-muted shadow-xs">
            No cash transactions recorded yet today.
          </div>
        )}
      </div>
    </div>
  );
};
