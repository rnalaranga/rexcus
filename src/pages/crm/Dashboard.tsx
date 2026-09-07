import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, TrendingUp, Briefcase, DollarSign,
  ArrowUpRight, Star, Bell, CheckCircle2, AlertCircle,
  Phone, Mail, Users2, CheckSquare, MessageSquare, MapPin, Calendar, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { useCustomers, useLeads, useDeals, useFollowups } from '@/hooks/useData'
import { formatCurrency, relativeTime } from '@/lib/utils'

const PIE_COLORS = ['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-theme px-3 py-2 text-xs shadow-card">
      <p className="text-muted mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value, true)}
        </p>
      ))}
    </div>
  )
}

const ACTIVITY_TYPE_ICONS: Record<string, any> = {
  call: Phone, meeting: Users2, email: Mail, task: CheckSquare,
  whatsapp: MessageSquare, site_visit: MapPin,
}
const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: 'text-blue-500', meeting: 'text-purple-500', email: 'text-cyan-500',
  task: 'text-amber-500', whatsapp: 'text-emerald-500', site_visit: 'text-orange-500',
}

export const CRMDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { data: customers, loading: cl } = useCustomers()
  const { data: leads, loading: ll } = useLeads()
  const { data: deals, loading: dl } = useDeals()
  const { data: followupsRaw } = useFollowups()

  // Enrich followups with overdue status
  const followups = useMemo(() => {
    const now = new Date()
    return followupsRaw.map((f: any) => ({
      ...f,
      status: f.status === 'pending' && new Date(f.dueDate) < now ? 'overdue' : f.status
    }))
  }, [followupsRaw])

  const {
    totalRevenue, activeCustomers, openLeads, openDeals, pipelineValue,
    monthlyRevenue, dealsByStage
  } = useMemo(() => {
    const totalRevenue    = customers.reduce((s, c) => s + Number(c.totalRevenue || 0), 0)
    const activeCustomers = customers.filter(c => ['active', 'vip'].includes(c.status)).length
    const openLeads       = leads.filter(l => !['won', 'lost'].includes(l.stage)).length
    const openDealsArr    = deals.filter(d => !String(d.stage).includes('closed'))
    const pipelineValue   = openDealsArr.reduce((s, d) => s + Number(d.value || 0), 0)

    const monthlyRevenue = [
      { month: 'Mar', revenue: 1200000, target: 1500000 },
      { month: 'Apr', revenue: 1800000, target: 1600000 },
      { month: 'May', revenue: 2100000, target: 1800000 },
      { month: 'Jun', revenue: 1950000, target: 2000000 },
      { month: 'Jul', revenue: 2800000, target: 2200000 },
      { month: 'Aug', revenue: 3200000, target: 2500000 },
    ]

    const stages = ['open', 'prospecting', 'proposal', 'negotiation', 'contract']
    const dealsByStage = stages.map(st => {
      const stageDeals = openDealsArr.filter(d => d.stage === st)
      return {
        stage: st.charAt(0).toUpperCase() + st.slice(1),
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + Number(d.value || 0), 0)
      }
    }).filter(s => s.count > 0).sort((a, b) => b.value - a.value)

    return { totalRevenue, activeCustomers, openLeads, openDeals: openDealsArr, pipelineValue, monthlyRevenue, dealsByStage }
  }, [customers, leads, deals])

  // Followup stats
  const today = new Date().toISOString().slice(0, 10)
  const todayFollowups = followups.filter((f: any) => f.status !== 'done' && f.status !== 'cancelled' && String(f.dueDate).slice(0, 10) === today)
  const overdueFollowups = followups.filter((f: any) => f.status === 'overdue')
  const upcomingFollowups = followups
    .filter((f: any) => f.status === 'pending' && String(f.dueDate).slice(0, 10) > today)
    .slice(0, 5)

  // Top customers sorted by revenue
  const topCustomers = useMemo(() =>
    [...customers]
      .sort((a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0))
      .slice(0, 5)
  , [customers])

  if (cl || ll || dl) return <div className="p-8 text-center text-muted animate-pulse">Loading data...</div>

  return (
    <div className="space-y-5 animate-fade-in">

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Revenue"    value={formatCurrency(totalRevenue, true)}  subtitle="FY 2026 YTD"                               icon={DollarSign} trend={14.2} trendLabel="vs last year"  variant="glow" />
        <StatCard title="Active Customers" value={activeCustomers}                      subtitle={`${customers.length} total accounts`}      icon={Users}      trend={8}    trendLabel="vs last month" />
        <StatCard title="Open Leads"       value={openLeads}                            subtitle={`${leads.filter(l=>l.priority==='high').length} high priority`} icon={TrendingUp} trend={22} trendLabel="new this month" />
        <StatCard title="Pipeline Value"   value={formatCurrency(pipelineValue, true)} subtitle={`${openDeals.length} active deals`}         icon={Briefcase}  trend={5.8}  trendLabel="vs last month"  variant="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Revenue chart */}
        <GlassCard className="col-span-3 xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-primary">Revenue vs Target</h2>
              <p className="text-xs text-muted mt-0.5">Last 6 months — LKR</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rex-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 inline-block opacity-50" />Target</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#b91c1c" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="month" tick={{ fill: 'rgb(140,145,165)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgb(140,145,165)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1e6).toFixed(0)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#dc2626" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="target"  name="Target"  stroke="rgb(148,163,184)" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Pipeline by stage */}
        <GlassCard className="col-span-3 xl:col-span-1 p-5">
          <h2 className="text-sm font-semibold text-primary mb-1">Pipeline by Stage</h2>
          <p className="text-xs text-muted mb-4">Deal count &amp; value</p>
          {dealsByStage.length === 0 ? (
            <p className="text-xs text-muted italic">No active deals.</p>
          ) : (
            <div className="space-y-3">
              {dealsByStage.map((s, i) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-2 h-2 flex-shrink-0 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-secondary truncate">{s.stage}</span>
                      <span className="text-[11px] text-muted ml-2 flex-shrink-0">{s.count}</span>
                    </div>
                    <div className="h-1 bg-surface2 w-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${Math.min((s.value / (pipelineValue || 1)) * 100, 100)}%`, background: PIE_COLORS[i], opacity: 0.75 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">{formatCurrency(s.value, true)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Bottom Row: Follow-ups + Top Customers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Follow-ups widget */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Bell size={14} className="text-amber-500" /> Follow-ups
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {todayFollowups.length > 0 && <span className="text-amber-500 font-semibold">{todayFollowups.length} due today</span>}
                {overdueFollowups.length > 0 && <span className="text-red-500 font-semibold ml-2">{overdueFollowups.length} overdue</span>}
                {todayFollowups.length === 0 && overdueFollowups.length === 0 && 'All clear ✓'}
              </p>
            </div>
            <button
              onClick={() => navigate('/crm/followups')}
              className="text-[10px] text-rex-600 dark:text-rex-400 hover:text-rex-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
            >View All <ArrowUpRight size={10} /></button>
          </div>

          {/* Overdue */}
          {overdueFollowups.slice(0, 2).map((f: any) => {
            const Icon = ACTIVITY_TYPE_ICONS[f.type] || Bell
            return (
              <div key={f.id} onClick={() => navigate('/crm/followups')} className="flex items-start gap-3 px-3 py-2.5 hover:bg-red-500/5 cursor-pointer border-l-2 border-red-500 mb-1 transition-colors">
                <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary truncate font-medium">{f.subject}</p>
                  <p className="text-[10px] text-red-500">Overdue · {f.relatedName}</p>
                </div>
              </div>
            )
          })}

          {/* Today */}
          {todayFollowups.slice(0, 2).map((f: any) => {
            const Icon = ACTIVITY_TYPE_ICONS[f.type] || Bell
            return (
              <div key={f.id} onClick={() => navigate('/crm/followups')} className="flex items-start gap-3 px-3 py-2.5 hover:bg-amber-500/5 cursor-pointer border-l-2 border-amber-400 mb-1 transition-colors">
                <Icon size={13} className={`${ACTIVITY_TYPE_COLORS[f.type] || 'text-muted'} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary truncate font-medium">{f.subject}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">Today {f.dueTime && `at ${f.dueTime}`} · {f.relatedName}</p>
                </div>
              </div>
            )
          })}

          {/* Upcoming */}
          {upcomingFollowups.slice(0, 3).map((f: any) => {
            const Icon = ACTIVITY_TYPE_ICONS[f.type] || Bell
            return (
              <div key={f.id} onClick={() => navigate('/crm/followups')} className="flex items-start gap-3 px-3 py-2.5 hover:bg-surface2/50 cursor-pointer transition-colors">
                <Icon size={13} className={`${ACTIVITY_TYPE_COLORS[f.type] || 'text-muted'} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-secondary truncate">{f.subject}</p>
                  <p className="text-[10px] text-muted">{String(f.dueDate).slice(0, 10)} · {f.relatedName || '—'}</p>
                </div>
                <CheckCircle2 size={12} className="text-muted hover:text-emerald-500 transition-colors mt-0.5 shrink-0" />
              </div>
            )
          })}

          {overdueFollowups.length === 0 && todayFollowups.length === 0 && upcomingFollowups.length === 0 && (
            <div className="py-8 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2 opacity-50" />
              <p className="text-xs text-muted">No pending activities.</p>
              <button onClick={() => navigate('/crm/followups')} className="text-xs text-rex-500 mt-1 hover:underline">+ Schedule one</button>
            </div>
          )}
        </GlassCard>

        {/* Top Customers */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-primary">Top Customers</h2>
            <button onClick={() => navigate('/crm/customers')} className="text-[10px] text-rex-600 dark:text-rex-400 hover:text-rex-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={10} />
            </button>
          </div>
          <div className="space-y-0.5">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-muted italic py-4 text-center">No customers yet.</p>
            ) : topCustomers.map((c, i) => (
              <div key={c.id} onClick={() => navigate(`/crm/customers/${c.id}`)} className="flex items-center gap-3 px-3 py-2.5 hover:bg-rex-500/4 transition-colors cursor-pointer">
                <span className="text-[10px] text-faint w-4 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-7 h-7 flex-shrink-0 bg-rex-700 border border-rex-600/50 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">
                    {(c.companyName || c.name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary truncate font-medium">{c.companyName || '—'}</p>
                  <p className="text-[10px] text-muted truncate">{c.contactName || c.name || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-rex-600 dark:text-rex-300 font-semibold">{formatCurrency(Number(c.totalRevenue || 0), true)}</p>
                  <Badge variant={c.status === 'vip' ? 'vip' : c.status === 'active' ? 'success' : 'default'} size="sm" className="mt-0.5">{(c.status || 'active').toUpperCase()}</Badge>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard className="p-4 text-center">
          <div className="text-xl font-bold text-primary">{leads.filter((l: any) => l.priority === 'high').length}</div>
          <div className="text-xs text-muted mt-0.5">High Priority Leads</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-xl font-bold text-emerald-500">{deals.filter((d: any) => String(d.stage).includes('won')).length}</div>
          <div className="text-xs text-muted mt-0.5">Deals Won</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-xl font-bold text-amber-500">{followups.filter((f: any) => f.status === 'pending' || f.status === 'overdue').length}</div>
          <div className="text-xs text-muted mt-0.5">Open Activities</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-xl font-bold text-blue-500">{customers.filter((c: any) => c.status === 'vip').length}</div>
          <div className="text-xs text-muted mt-0.5">VIP Customers</div>
        </GlassCard>
      </div>

    </div>
  )
}
