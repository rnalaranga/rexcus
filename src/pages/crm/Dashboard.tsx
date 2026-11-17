import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, FileText, ShoppingBag, Award, Percent,
  Bell, CheckCircle2, AlertCircle, Phone, Mail, Users2,
  CheckSquare, MessageSquare, MapPin, Calendar, ChevronRight, Shield
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import {
  useCustomers,
  useLeads,
  useQuotations,
  useFinishedGoodsOrders,
  useInvoices,
  useFollowups
} from '@/hooks/useData'
import { useAuth } from '@/contexts/AuthContext'
import { relativeTime } from '@/lib/utils'

const ACTIVITY_TYPE_ICONS: Record<string, any> = {
  call: Phone, meeting: Users2, email: Mail, task: CheckSquare,
  whatsapp: MessageSquare, site_visit: MapPin,
}
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: 'text-blue-500', meeting: 'text-purple-500', email: 'text-cyan-500',
  task: 'text-amber-500', whatsapp: 'text-emerald-500', site_visit: 'text-orange-500',
}

const ActivityTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-theme px-3 py-2 text-xs shadow-card">
      <p className="text-muted mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export const CRMDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const { data: customers, loading: cl } = useCustomers()
  const { data: leads, loading: ll } = useLeads()
  const { data: quotations, loading: ql } = useQuotations()
  const { data: orders, loading: ol } = useFinishedGoodsOrders()
  const { data: invoices, loading: il } = useInvoices()
  const { data: followupsRaw } = useFollowups()

  // Admin, CRM Manager, or Finance see all CRM data; other users see only their own
  const canViewAll = useMemo(() => {
    const role = String(user?.role || '').toLowerCase()
    const roleName = String(user?.roleName || '').toLowerCase()
    const username = String(user?.username || '').toLowerCase()
    return Boolean(
      role === 'admin' ||
      username === 'admin' ||
      role === 'manager' ||
      role === 'crm_manager' ||
      role === 'finance' ||
      role === 'finance_manager' ||
      role === 'accounts' ||
      roleName.includes('admin') ||
      roleName.includes('crm manager') ||
      roleName.includes('finance') ||
      can('quotations.view_all')
    )
  }, [user, can])

  const userIdentifiers = useMemo(() => {
    return [user?.id, user?.username, user?.name]
      .filter(Boolean)
      .map(v => String(v).trim().toLowerCase())
  }, [user])

  const belongsToUser = (rec: any): boolean => {
    if (canViewAll) return true
    if (!rec || userIdentifiers.length === 0) return false
    const candidates = [
      rec.createdBy,
      rec.assignedTo,
      rec.salesRep,
      rec.userId,
      rec.ownerId,
      rec.repName
    ]
      .filter(Boolean)
      .map(v => String(v).trim().toLowerCase())
    return candidates.some(c => userIdentifiers.includes(c))
  }

  // Scoped datasets
  const scopedLeads = useMemo(() => (leads || []).filter(belongsToUser), [leads, canViewAll, userIdentifiers])
  const scopedQuotations = useMemo(() => (quotations || []).filter(belongsToUser), [quotations, canViewAll, userIdentifiers])

  const scopedOrderIdsOrQuoteIds = useMemo(() => {
    const qIds = new Set(scopedQuotations.map((q: any) => String(q.id)))
    const qNos = new Set(scopedQuotations.map((q: any) => String(q.quotationNo || q.docNo || '')).filter(Boolean))
    return { qIds, qNos }
  }, [scopedQuotations])

  const scopedOrders = useMemo(() => {
    if (canViewAll) return orders || []
    return (orders || []).filter((o: any) =>
      belongsToUser(o) ||
      (o.quoteId && scopedOrderIdsOrQuoteIds.qIds.has(String(o.quoteId))) ||
      (o.quotationNo && scopedOrderIdsOrQuoteIds.qNos.has(String(o.quotationNo)))
    )
  }, [orders, canViewAll, userIdentifiers, scopedOrderIdsOrQuoteIds])

  const scopedInvoices = useMemo(() => {
    const validInvs = (invoices || []).filter((inv: any) => {
      const invNo = String(inv.invoiceNo || inv.id || '').toUpperCase()
      return !invNo.startsWith('PI-') && !inv.isProforma && inv.invoiceType !== 'proforma' && inv.status !== 'draft'
    })
    if (canViewAll) return validInvs
    const orderNos = new Set(scopedOrders.map((o: any) => String(o.orderNo || o.id)))
    return validInvs.filter((inv: any) =>
      belongsToUser(inv) ||
      (inv.orderNo && orderNos.has(String(inv.orderNo))) ||
      (inv.quoteId && scopedOrderIdsOrQuoteIds.qIds.has(String(inv.quoteId)))
    )
  }, [invoices, canViewAll, scopedOrders, scopedOrderIdsOrQuoteIds, userIdentifiers])

  // Enrich followups with overdue status & scope
  const followups = useMemo(() => {
    const now = new Date()
    return (followupsRaw || [])
      .filter(belongsToUser)
      .map((f: any) => ({
        ...f,
        status: f.status === 'pending' && new Date(f.dueDate) < now ? 'overdue' : f.status
      }))
  }, [followupsRaw, canViewAll, userIdentifiers])

  // Core KPIs (Counts & Rates ONLY — no raw financial amounts)
  const {
    totalLeads,
    openLeads,
    totalQuotations,
    convertedQuotations,
    totalOrders,
    dispatchedOrders,
    winRatePct,
    collectionRatePct,
    monthlyActivity,
    topCustomers,
    leadStages,
    orderStatuses,
    recentQuotations,
    recentOrders,
    repLeaderboard
  } = useMemo(() => {
    const totalLeads = scopedLeads.length
    const openLeads = scopedLeads.filter((l: any) => !['won', 'lost'].includes(String(l.stage || '').toLowerCase())).length

    const totalQuotations = scopedQuotations.length
    const convertedQuotations = scopedQuotations.filter((q: any) => {
      const st = String(q.status || '').toLowerCase()
      return st === 'won' || st === 'po received' || st === 'converted' || Boolean(q.customerPoNo)
    }).length

    const totalOrders = scopedOrders.length
    const dispatchedOrders = scopedOrders.filter((o: any) => o.isDispatched || String(o.status || '').toLowerCase() === 'dispatched').length

    // Win Rate: % of quotations converted (or orders / quotations)
    const winDenominator = totalQuotations > 0 ? totalQuotations : totalLeads
    const winNumerator = totalQuotations > 0 ? Math.max(convertedQuotations, Math.min(totalOrders, totalQuotations)) : totalOrders
    const winRatePct = winDenominator > 0 ? Math.min(100, Math.round((winNumerator / winDenominator) * 1000) / 10) : 0

    // Collection Rate: % of invoiced amount collected (strictly a percentage rate)
    const totalBilled = scopedInvoices.reduce((s: number, inv: any) => s + Number(inv.total || inv.amount || 0), 0)
    const totalCollected = scopedInvoices.reduce((s: number, inv: any) => s + Number(inv.paidAmount || 0), 0)
    const collectionRatePct = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 1000) / 10) : 0

    // 6-Month Activity Trend (Counts only)
    const now = new Date()
    const months: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        leads: 0,
        quotations: 0,
        orders: 0
      })
    }

    const addCount = (dateVal: any, key: 'leads' | 'quotations' | 'orders') => {
      if (!dateVal) return
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return
      const m = months.find(x => x.monthNum === d.getMonth() && x.year === d.getFullYear())
      if (m) m[key] += 1
    }

    scopedLeads.forEach((l: any) => addCount(l.createdAt || l.lastActivity, 'leads'))
    scopedQuotations.forEach((q: any) => addCount(q.date || q.createdAt, 'quotations'))
    scopedOrders.forEach((o: any) => addCount(o.orderDate || o.createdAt, 'orders'))

    // Top Customers by Sales Orders & Quotations count (no financial amounts)
    const custMap = new Map<string, { name: string; orders: number; quotations: number; totalActivity: number }>()
    const custLookup = new Map<string, string>()
    ;(customers || []).forEach((c: any) => {
      if (c.id) custLookup.set(String(c.id), c.company || c.name || 'Customer')
    })

    scopedOrders.forEach((o: any) => {
      const cname = (o.customerCompany || (o.customerId && custLookup.get(String(o.customerId))) || o.customerName || 'Customer').trim()
      const prev = custMap.get(cname) || { name: cname, orders: 0, quotations: 0, totalActivity: 0 }
      prev.orders += 1
      prev.totalActivity += 2
      custMap.set(cname, prev)
    })

    scopedQuotations.forEach((q: any) => {
      const cname = (q.leadCompany || q.customerCompany || (q.leadId && custLookup.get(String(q.leadId))) || q.leadName || q.customerName || 'Customer').trim()
      const prev = custMap.get(cname) || { name: cname, orders: 0, quotations: 0, totalActivity: 0 }
      prev.quotations += 1
      prev.totalActivity += 1
      custMap.set(cname, prev)
    })

    const topCustomers = Array.from(custMap.values())
      .sort((a, b) => b.orders - a.orders || b.quotations - a.quotations)
      .slice(0, 5)

    // Lead Stage Breakdown
    const stageCounts = new Map<string, number>()
    scopedLeads.forEach((l: any) => {
      const st = String(l.stage || 'new').toLowerCase()
      stageCounts.set(st, (stageCounts.get(st) || 0) + 1)
    })
    const leadStages = Array.from(stageCounts.entries())
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value)

    // Sales Order Status Breakdown
    const orderStatusCounts = new Map<string, number>()
    scopedOrders.forEach((o: any) => {
      const st = o.isDispatched ? 'Dispatched' : (o.status || 'Pending')
      orderStatusCounts.set(st, (orderStatusCounts.get(st) || 0) + 1)
    })
    const orderStatuses = Array.from(orderStatusCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Recent Quotations & Orders (latest 5)
    const recentQuotations = [...scopedQuotations]
      .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
      .slice(0, 5)

    const recentOrders = [...scopedOrders]
      .sort((a: any, b: any) => new Date(b.orderDate || b.createdAt || 0).getTime() - new Date(a.orderDate || a.createdAt || 0).getTime())
      .slice(0, 5)

    // Sales Rep Leaderboard (only used when canViewAll is true)
    const repMap = new Map<string, { rep: string; leads: number; quotes: number; orders: number }>()
    const addRep = (name: any, field: 'leads' | 'quotes' | 'orders') => {
      const key = String(name || 'Unassigned').trim() || 'Unassigned'
      const prev = repMap.get(key) || { rep: key, leads: 0, quotes: 0, orders: 0 }
      prev[field] += 1
      repMap.set(key, prev)
    }
    scopedLeads.forEach((l: any) => addRep(l.assignedTo || l.createdBy, 'leads'))
    scopedQuotations.forEach((q: any) => addRep(q.createdBy || q.salesRep, 'quotes'))
    scopedOrders.forEach((o: any) => addRep(o.createdBy || o.salesRep, 'orders'))
    const repLeaderboard = Array.from(repMap.values())
      .map(r => ({
        ...r,
        winRate: r.quotes > 0 ? Math.min(100, Math.round((r.orders / r.quotes) * 1000) / 10) : 0
      }))
      .sort((a, b) => b.orders - a.orders || b.quotes - a.quotes)
      .slice(0, 6)

    return {
      totalLeads,
      openLeads,
      totalQuotations,
      convertedQuotations,
      totalOrders,
      dispatchedOrders,
      winRatePct,
      collectionRatePct,
      monthlyActivity: months,
      topCustomers,
      leadStages,
      orderStatuses,
      recentQuotations,
      recentOrders,
      repLeaderboard
    }
  }, [scopedLeads, scopedQuotations, scopedOrders, scopedInvoices, customers])

  // Followup stats
  const today = new Date().toISOString().slice(0, 10)
  const todayFollowups = followups.filter((f: any) => f.status !== 'done' && f.status !== 'cancelled' && String(f.dueDate).slice(0, 10) === today)
  const overdueFollowups = followups.filter((f: any) => f.status === 'overdue')
  const upcomingFollowups = followups
    .filter((f: any) => f.status === 'pending' && String(f.dueDate).slice(0, 10) > today)
    .slice(0, 5)

  if (cl || ll || ql || ol || il) {
    return <div className="p-8 text-center text-muted animate-pulse text-xs">Loading CRM dashboard...</div>
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Scope Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-theme-subtle">
        <div>
          <h1 className="text-lg font-bold text-primary tracking-tight">CRM Performance Dashboard</h1>
          <p className="text-xs text-muted">
            Leads, Quotations, Sales Orders, Win Rate &amp; Collection Rate overview
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-surface2 border border-theme-subtle text-secondary">
          <Shield size={12} className={canViewAll ? 'text-emerald-500' : 'text-blue-500'} />
          {canViewAll
            ? 'All Team View (Admin / CRM Manager / Finance)'
            : `My Activity (${user?.name || user?.username || 'Sales Rep'})`}
        </div>
      </div>

      {/* KPI Row (Counts & Rates Only — No Financial LKR Amounts) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="My Leads"
          value={totalLeads}
          subtitle={`${openLeads} active in pipeline`}
          icon={Users}
        />
        <StatCard
          title="Quotations"
          value={totalQuotations}
          subtitle={`${convertedQuotations} converted / PO`}
          icon={FileText}
        />
        <StatCard
          title="Sales Orders"
          value={totalOrders}
          subtitle={`${dispatchedOrders} dispatched`}
          icon={ShoppingBag}
        />
        <StatCard
          title="Win Rate"
          value={`${winRatePct}%`}
          subtitle="Quote-to-Order conversion"
          icon={Award}
          variant="glow"
        />
        <StatCard
          title="Collection Rate"
          value={`${collectionRatePct}%`}
          subtitle="Invoiced payment collected"
          icon={Percent}
        />
      </div>

      {/* Charts & Top Customers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-Month Activity Trend */}
        <GlassCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <TrendingUp size={15} className="text-rex-500" />
                6-Month CRM Activity Trend
              </h2>
              <p className="text-xs text-muted mt-0.5">Leads, Quotations &amp; Sales Orders (Counts)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthlyActivity} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ActivityTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="quotations" name="Quotations" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="orders" name="Sales Orders" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top Customers (by Orders & Quotations Count) */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary">Top Customers</h2>
            <button onClick={() => navigate('/crm/customers')} className="text-xs text-rex-500 hover:text-rex-400">
              All →
            </button>
          </div>
          <div className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">No customer activity recorded yet.</p>
            ) : (
              topCustomers.map((c, idx) => (
                <div key={c.name} className="flex items-center justify-between gap-3 py-2 border-b border-theme-subtle last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-rex-500/15 text-rex-600 dark:text-rex-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                      <p className="text-[11px] text-muted">{c.quotations} quote(s)</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {c.orders} order{c.orders !== 1 ? 's' : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Pipeline Stages & Order Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Lead Pipeline Stages</h2>
            <button onClick={() => navigate('/crm/leads')} className="text-xs text-rex-500 hover:text-rex-400">
              View Leads →
            </button>
          </div>
          {leadStages.length === 0 ? (
            <p className="text-xs text-muted py-6 text-center">No leads in pipeline.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadStages} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={3}>
                      {leadStages.map((_, i) => (
                        <Cell key={i} fill={['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2">
                {leadStages.map((st, i) => (
                  <div key={st.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6] }}
                      />
                      <span className="text-secondary font-medium">{st.name}</span>
                    </div>
                    <span className="font-mono font-bold text-primary">
                      {st.value} ({totalLeads > 0 ? Math.round((st.value / totalLeads) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Sales Order Fulfillment Status</h2>
            <button onClick={() => navigate('/crm/sales-orders')} className="text-xs text-rex-500 hover:text-rex-400">
              View Orders →
            </button>
          </div>
          {orderStatuses.length === 0 ? (
            <p className="text-xs text-muted py-6 text-center">No sales orders recorded yet.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {orderStatuses.map((st) => {
                const pct = totalOrders > 0 ? Math.round((st.value / totalOrders) * 100) : 0
                return (
                  <div key={st.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-secondary">{st.name}</span>
                      <span className="font-mono font-bold text-primary">{st.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Quotations & Recent Sales Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Recent Quotations</h2>
            <button onClick={() => navigate('/crm/quotations')} className="text-xs text-rex-500 hover:text-rex-400">
              All Quotations →
            </button>
          </div>
          <div className="space-y-2">
            {recentQuotations.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No quotations yet.</p>
            ) : (
              recentQuotations.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-theme-subtle last:border-0 text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-mono font-bold text-primary">{q.docNo || q.quotationNo || q.id}</div>
                    <div className="text-[11px] text-muted truncate">{q.leadCompany || q.customerCompany || q.leadName || q.customerName || 'Customer'}</div>
                  </div>
                  <Badge value={q.status || 'Draft'} size="sm" />
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Recent Sales Orders</h2>
            <button onClick={() => navigate('/crm/sales-orders')} className="text-xs text-rex-500 hover:text-rex-400">
              All Orders →
            </button>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No sales orders yet.</p>
            ) : (
              recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-theme-subtle last:border-0 text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-mono font-bold text-primary">{o.orderNo || o.id}</div>
                    <div className="text-[11px] text-muted truncate">{o.customerCompany || o.customerName || 'Customer'}</div>
                  </div>
                  <Badge value={o.isDispatched ? 'Dispatched' : (o.status || 'Pending')} size="sm" />
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Team Performance Leaderboard (Admin / CRM Manager / Finance Only) */}
      {canViewAll && repLeaderboard.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-primary">Team CRM Performance</h2>
            <span className="text-[11px] text-muted">Counts &amp; Win Rate %</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-theme-subtle text-[10px] uppercase text-muted">
                  <th className="py-2 px-2">Sales Rep</th>
                  <th className="py-2 px-2 text-right">Leads</th>
                  <th className="py-2 px-2 text-right">Quotations</th>
                  <th className="py-2 px-2 text-right">Sales Orders</th>
                  <th className="py-2 px-2 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/50">
                {repLeaderboard.map(r => (
                  <tr key={r.rep}>
                    <td className="py-2 px-2 font-semibold text-primary">{r.rep}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.leads}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.quotes}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-emerald-500">{r.orders}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-rex-500">{r.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Follow-up Reminders Row */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-rex-500" />
            <h2 className="text-sm font-semibold text-primary">Follow-up Reminders</h2>
            {overdueFollowups.length > 0 && (
              <Badge value={`${overdueFollowups.length} Overdue`} variant="error" size="sm" />
            )}
            {todayFollowups.length > 0 && (
              <Badge value={`${todayFollowups.length} Due Today`} variant="warning" size="sm" />
            )}
          </div>
          <button
            onClick={() => navigate('/crm/followups')}
            className="text-xs text-rex-500 hover:text-rex-400 flex items-center gap-0.5 font-medium"
          >
            View All <ChevronRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {overdueFollowups.length === 0 && todayFollowups.length === 0 && upcomingFollowups.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-muted flex flex-col items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <span>All follow-ups are up to date!</span>
            </div>
          ) : (
            [...overdueFollowups.slice(0, 3), ...todayFollowups.slice(0, 3), ...upcomingFollowups.slice(0, 3)]
              .slice(0, 6)
              .map((f: any) => {
                const Icon = ACTIVITY_TYPE_ICONS[f.type] || Calendar
                const colorClass = ACTIVITY_TYPE_COLORS[f.type] || 'text-muted'
                const isOverdue = f.status === 'overdue'
                const isToday = String(f.dueDate).slice(0, 10) === today
                return (
                  <div
                    key={f.id}
                    onClick={() => navigate('/crm/followups')}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors hover:bg-surface2 ${
                      isOverdue
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : isToday
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-theme-subtle bg-surface/50'
                    }`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center shrink-0 border border-theme-subtle bg-surface ${colorClass}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{f.subject}</p>
                      <p className="text-[11px] text-muted truncate">
                        {f.entityName} • <span className={isOverdue ? 'text-rose-500 font-semibold' : ''}>{relativeTime(f.dueDate)}</span>
                      </p>
                    </div>
                    {isOverdue && <AlertCircle size={13} className="text-rose-500 shrink-0" />}
                  </div>
                )
              })
          )}
        </div>
      </GlassCard>
    </div>
  )
}
