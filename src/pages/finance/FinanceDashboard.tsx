import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Receipt,
  DollarSign,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  FileText,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useFinanceDashboard } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type ForecastScenario = 'base' | 'collections' | 'cost_cut';

const compactLkr = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(Math.round(v));
};

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboard, loading, refetch } = useFinanceDashboard();
  const [scenario, setScenario] = useState<ForecastScenario>('base');
  const [currencies, setCurrencies] = useState<any[]>([]);

  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/currencies`)
      .then(res => res.json())
      .then(data => setCurrencies(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const trendData = useMemo(() => {
    const raw = Array.isArray(dashboard?.monthlyTrend) ? dashboard.monthlyTrend : [];
    return raw.map((m: any) => {
      if (!m.isForecast) return m;
      let rev = Number(m.revenue || 0);
      let exp = Number(m.expenses || 0);
      let cashIn = Number(m.cashIn || 0);
      let cashOut = Number(m.cashOut || 0);

      if (scenario === 'collections') {
        const boost = Math.round((dashboard?.arAgingSummary?.totalOverdue || dashboard?.ar || 0) * 0.15);
        cashIn += boost;
        rev = Math.round(rev * 1.05);
      } else if (scenario === 'cost_cut') {
        exp = Math.round(exp * 0.9);
        cashOut = Math.round(cashOut * 0.9);
      }

      return {
        ...m,
        revenue: rev,
        expenses: exp,
        netProfit: rev - exp,
        cashIn,
        cashOut
      };
    });
  }, [dashboard, scenario]);

  const firstForecastLabel = useMemo(() => {
    const found = trendData.find((m: any) => m.isForecast);
    return found?.label;
  }, [trendData]);

  const agingComparisonData = useMemo(() => {
    const ar = dashboard?.arAgingSummary || {};
    const ap = dashboard?.apAgingSummary || {};
    return [
      { bucket: 'Current', receivables: Math.round(ar.current || 0), payables: Math.round(ap.current || 0) },
      { bucket: '1-30d', receivables: Math.round(ar.days1_30 || 0), payables: Math.round(ap.days1_30 || 0) },
      { bucket: '31-60d', receivables: Math.round(ar.days31_60 || 0), payables: Math.round(ap.days31_60 || 0) },
      { bucket: '61-90d', receivables: Math.round(ar.days61_90 || 0), payables: Math.round(ap.days61_90 || 0) },
      { bucket: '90d+', receivables: Math.round(ar.days90plus || 0), payables: Math.round(ap.days90plus || 0) }
    ];
  }, [dashboard]);

  const expenseBreakdown = useMemo(() => {
    return Array.isArray(dashboard?.expenseBreakdown) ? dashboard.expenseBreakdown : [];
  }, [dashboard]);

  const ai = dashboard?.aiInsights || {};
  const healthScore = Number(ai.healthScore ?? 65);
  const healthBadge =
    healthScore >= 75
      ? { label: 'Strong Liquidity', color: 'text-emerald-500', ring: 'border-emerald-500', bg: 'bg-emerald-500/10' }
      : healthScore >= 55
      ? { label: 'Healthy', color: 'text-blue-500', ring: 'border-blue-500', bg: 'bg-blue-500/10' }
      : healthScore >= 40
      ? { label: 'Watch Cashflow', color: 'text-amber-500', ring: 'border-amber-500', bg: 'bg-amber-500/10' }
      : { label: 'Action Needed', color: 'text-rose-500', ring: 'border-rose-500', bg: 'bg-rose-500/10' };

  const scenarioNextMonthProfit = useMemo(() => {
    const firstEst = trendData.find((m: any) => m.isForecast);
    return firstEst ? firstEst.netProfit : (ai.projectedNextMonthProfit || 0);
  }, [trendData, ai]);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted animate-pulse text-xs font-semibold">
        Analyzing ledgers, cashflow trends &amp; generating AI financial forecasts...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-theme-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary tracking-tight">Finance Executive Dashboard</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sparkles size={11} /> AI Insights Live
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Real-time liquidity, AR/AP aging analytics, cashflow trends &amp; 3-month predictive outlook
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <Button variant="ghost" size="sm" icon={RefreshCw} className="text-xs" onClick={refetch}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" icon={Download} className="text-xs" onClick={() => window.print()}>
            Export Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={FileText}
            onClick={() => navigate('/finance/reports')}
            className="text-xs"
          >
            Reports &amp; Aging
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Receipt}
            onClick={() => navigate('/finance/expense-builder')}
            className="bg-rex-600 hover:bg-rex-700 text-xs"
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CASH */}
          <GlassCard className="p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Total Cash &amp; Bank</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Wallet size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-primary tracking-tight">{formatCurrency(dashboard.cash || 0)}</div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-muted">
              <span>{(dashboard.cashAccounts || []).length} liquid account(s)</span>
              <button
                type="button"
                onClick={() => navigate('/finance/daily-cashflow')}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                Cashbook <ArrowRight size={10} />
              </button>
            </div>
          </GlassCard>

          {/* AR */}
          <GlassCard className="p-5 flex flex-col justify-between border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Receivables (AR)</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <ArrowUpRight size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-primary tracking-tight">{formatCurrency(dashboard.ar || 0)}</div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-rose-500 font-semibold">
                Overdue: {formatCurrency(dashboard.arAgingSummary?.totalOverdue || 0)}
              </span>
              <button
                type="button"
                onClick={() => navigate('/finance/receivables')}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                Collect <ArrowRight size={10} />
              </button>
            </div>
          </GlassCard>

          {/* AP */}
          <GlassCard className="p-5 flex flex-col justify-between border-l-4 border-l-amber-500">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Payables (AP)</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <ArrowDownRight size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-primary tracking-tight">{formatCurrency(dashboard.ap || 0)}</div>
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Overdue: {formatCurrency(dashboard.apAgingSummary?.totalOverdue || 0)}
              </span>
              <button
                type="button"
                onClick={() => navigate('/finance/payables')}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                Settle <ArrowRight size={10} />
              </button>
            </div>
          </GlassCard>

          {/* NET PROFIT */}
          <GlassCard className="p-5 flex flex-col justify-between border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold uppercase text-muted tracking-widest">Net Profit &amp; Margin</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Activity size={15} />
              </div>
            </div>
            <div
              className={`text-2xl font-black tracking-tight ${
                (dashboard.profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(dashboard.profit || 0)}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted mb-1">
                <span>Margin: {ai.profitMarginPct ?? 0}%</span>
                <span>Rev vs Exp</span>
              </div>
              <div className="w-full h-1.5 bg-theme rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${((dashboard.revenue || 0) / (((dashboard.revenue || 0) + (dashboard.expenses || 0)) || 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${((dashboard.expenses || 0) / (((dashboard.revenue || 0) + (dashboard.expenses || 0)) || 1)) * 100}%` }}
                />
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* AI Financial Advisor & Future Suggestions Panel */}
      <GlassCard className="p-5 border border-indigo-500/25 bg-gradient-to-br from-indigo-500/5 via-surface to-emerald-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full border-4 ${healthBadge.ring} ${healthBadge.bg} flex flex-col items-center justify-center shrink-0`}>
              <span className={`text-base font-black leading-none ${healthBadge.color}`}>{healthScore}</span>
              <span className="text-[8px] uppercase font-bold text-muted mt-0.5">Score</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={15} className="text-indigo-500" />
                  AI Financial Forecast &amp; Strategic Suggestions
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${healthBadge.bg} ${healthBadge.color}`}>
                  {healthBadge.label}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Next-Month Projected Revenue:{' '}
                <strong className="text-primary">{formatCurrency(ai.projectedNextMonthRevenue || 0)}</strong>
                {' '}• Projected Net Margin:{' '}
                <strong className={scenarioNextMonthProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {formatCurrency(scenarioNextMonthProfit)}
                </strong>
                {' '}• Cash/AP Coverage:{' '}
                <strong className="text-primary">{ai.cashToApRatio ?? 1}x</strong>
              </p>
            </div>
          </div>

          {/* Interactive What-If Scenario Simulator */}
          <div className="flex items-center gap-1.5 bg-surface2/70 p-1 rounded-lg border border-theme-subtle shrink-0 print:hidden">
            <span className="text-[10px] font-bold uppercase text-muted px-2">What-If:</span>
            {[
              { id: 'base', label: 'Base AI' },
              { id: 'collections', label: '+15% AR Collect' },
              { id: 'cost_cut', label: '-10% Costs' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScenario(opt.id as ForecastScenario)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                  scenario === opt.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestion Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {(ai.suggestions || []).map((s: any) => {
            const style =
              s.severity === 'critical'
                ? { border: 'border-l-rose-500', badge: 'bg-rose-500/10 text-rose-500', Icon: AlertTriangle }
                : s.severity === 'warning'
                ? { border: 'border-l-amber-500', badge: 'bg-amber-500/10 text-amber-500', Icon: Clock }
                : s.severity === 'opportunity'
                ? { border: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500', Icon: Lightbulb }
                : { border: 'border-l-indigo-500', badge: 'bg-indigo-500/10 text-indigo-500', Icon: TrendingUp };
            const Icon = style.Icon;
            return (
              <div
                key={s.id}
                className={`p-3.5 bg-surface/70 rounded-lg border border-theme-subtle border-l-4 ${style.border} flex flex-col justify-between gap-2`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${style.badge}`}>
                      <Icon size={11} /> {s.category}
                    </span>
                    {s.impactAmount ? (
                      <span className="text-[10px] font-mono font-bold text-muted">
                        Impact: {formatCurrency(Math.abs(s.impactAmount))}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xs font-bold text-primary">{s.title}</h3>
                  <p className="text-[11px] text-secondary mt-1 leading-relaxed">{s.detail}</p>
                </div>
                {s.actionPath && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(s.actionPath)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {s.actionLabel || 'Open'} <ArrowRight size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Main Charts Grid (Row 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Revenue vs Expenses & AI 3-Month Forecast */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <TrendingUp size={15} className="text-indigo-500" />
                Revenue, Expenses &amp; 3-Month AI Forecast
              </h2>
              <p className="text-[11px] text-muted">6-month actuals + predictive projection ({scenario === 'base' ? 'Base Trend' : scenario === 'collections' ? '+15% Collection Boost' : '-10% Cost Cut'})</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={compactLkr} tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(Number(value || 0)), name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {firstForecastLabel && (
                  <ReferenceLine
                    x={firstForecastLabel}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    label={{ value: 'AI Forecast →', position: 'top', fontSize: 10, fill: '#6366f1' }}
                  />
                )}
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* 2. Cash Inflow vs Cash Outflow */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Wallet size={15} className="text-emerald-500" />
                Cash Inflow vs Outflow Trend
              </h2>
              <p className="text-[11px] text-muted">Actual cashbook movements &amp; projected liquidity flow</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="cashOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={compactLkr} tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(Number(value || 0)), name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {firstForecastLabel && (
                  <ReferenceLine x={firstForecastLabel} stroke="#6366f1" strokeDasharray="4 4" />
                )}
                <Area type="monotone" dataKey="cashIn" name="Cash In" stroke="#10b981" fill="url(#cashInGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cashOut" name="Cash Out" stroke="#ef4444" fill="url(#cashOutGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Main Charts Grid (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. AR vs AP Aging Comparison */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck size={15} className="text-blue-500" />
                AR vs AP Aging Profile
              </h2>
              <p className="text-[11px] text-muted">Customer Receivables vs Vendor Payables by overdue bucket</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/finance/reports')}
              className="text-[11px] font-bold text-rex-600 dark:text-rex-400 hover:underline"
            >
              Full Aging Report →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={compactLkr} tick={{ fontSize: 10 }} width={48} />
                <Tooltip
                  formatter={(value: any, name: string) => [formatCurrency(Number(value || 0)), name]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="receivables" name="Customer Receivables (AR)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="payables" name="Vendor Payables (AP)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* 4. Expense Category Breakdown */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Receipt size={15} className="text-amber-500" />
                Expense Category Breakdown
              </h2>
              <p className="text-[11px] text-muted">Top cost drivers across vendor bills &amp; operating expenses</p>
            </div>
          </div>
          {expenseBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted">
              No categorized vendor bills recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col sm:flex-row items-center">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {expenseBreakdown.map((_: any, idx: number) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2 pl-2">
                {expenseBreakdown.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="truncate text-secondary font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-primary ml-2 shrink-0">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Bottom Row: Top Debtors, Top Creditors, Bank Accounts & FX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Pending Customer Receivables */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Top Pending Receivables</h2>
            <span className="text-[10px] font-semibold text-blue-500">Customers</span>
          </div>
          <div className="space-y-2.5">
            {(dashboard?.topDebtors || []).length === 0 ? (
              <div className="text-xs text-muted py-4 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> All customer invoices settled.
              </div>
            ) : (
              (dashboard.topDebtors || []).map((d: any) => (
                <div key={d.name} className="flex items-center justify-between p-2 rounded bg-surface2/40 border border-theme-subtle text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-primary truncate">{d.name}</div>
                    <div className="text-[10px] text-muted">
                      {d.count} invoice(s) {d.overdue > 0 ? `• ${formatCurrency(d.overdue)} overdue` : ''}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {formatCurrency(d.due)}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Top Pending Vendor Payables */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Top Pending Payables</h2>
            <span className="text-[10px] font-semibold text-amber-500">Vendors</span>
          </div>
          <div className="space-y-2.5">
            {(dashboard?.topCreditors || []).length === 0 ? (
              <div className="text-xs text-muted py-4 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> No pending vendor bills.
              </div>
            ) : (
              (dashboard.topCreditors || []).map((c: any) => (
                <div key={c.name} className="flex items-center justify-between p-2 rounded bg-surface2/40 border border-theme-subtle text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-primary truncate">{c.name}</div>
                    <div className="text-[10px] text-muted">
                      {c.count} bill(s) {c.overdue > 0 ? `• ${formatCurrency(c.overdue)} overdue` : ''}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {formatCurrency(c.due)}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Liquid Accounts + FX */}
        <GlassCard className="p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Landmark size={13} className="text-emerald-500" /> Bank &amp; Cash Accounts
              </h2>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {(dashboard?.cashAccounts || []).slice(0, 5).map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between text-xs py-1 border-b border-theme-subtle/50 last:border-0">
                  <span className="text-secondary truncate pr-2">{acc.name}</span>
                  <span className="font-mono font-bold text-primary shrink-0">{formatCurrency(acc.balance)}</span>
                </div>
              ))}
              {(dashboard?.cashAccounts || []).length === 0 && (
                <div className="text-xs text-muted">No cash/bank accounts configured.</div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-theme-subtle">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <DollarSign size={12} className="text-emerald-500" /> Live Exchange Rates (Base: LKR)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {currencies.filter(c => c.code !== 'LKR').slice(0, 6).map(c => (
                <div key={c.code} className="p-2 bg-surface/40 rounded border border-theme-subtle text-center">
                  <div className="text-[10px] font-bold text-muted">{c.code}</div>
                  <div className="text-xs font-mono font-bold text-primary mt-0.5">{Number(c.exchangeRate).toFixed(2)}</div>
                </div>
              ))}
              {currencies.filter(c => c.code !== 'LKR').length === 0 && (
                <div className="col-span-3 text-[11px] text-muted">No foreign currencies configured.</div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
