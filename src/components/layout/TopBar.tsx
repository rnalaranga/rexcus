import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Search, ChevronRight, Sun, Moon, X,
  CheckCircle2, TrendingUp, AlertCircle, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/store/theme'

const breadcrumbMap: Record<string, string> = {
  '/crm':           'Dashboard',
  '/crm/customers': 'Customers',
  '/crm/leads':     'Leads',
  '/crm/deals':     'Deals',
  '/crm/contacts':  'Contacts',
}

const notifications = [
  { id: 1, text: 'New deal DEAL-008 requires approval', time: '5m ago',  type: 'alert',   icon: AlertCircle,   color: 'text-rex-500' },
  { id: 2, text: 'Lead LEAD-001 moved to Negotiation',  time: '32m ago', type: 'lead',    icon: TrendingUp,    color: 'text-blue-500' },
  { id: 3, text: 'Malith Senanayake placed new order',  time: '1h ago',  type: 'vip',     icon: Star,          color: 'text-amber-500' },
  { id: 4, text: 'Q3 revenue target reached 98%',       time: '3h ago',  type: 'success', icon: CheckCircle2,  color: 'text-emerald-500' },
]

export const TopBar: React.FC = () => {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { isDark, toggle } = useTheme()

  const [showNotif,  setShowNotif]  = useState(false)
  const [searchVal,  setSearchVal]  = useState('')
  const [searchFocus, setSearchFocus] = useState(false)

  const pathParts = location.pathname.split('/').filter(Boolean)
  const label     = breadcrumbMap[location.pathname] || 'CRM'

  return (
    <header className="glass-topbar flex items-center h-14 px-6 gap-4 flex-shrink-0 z-30 relative">

      {/* ── Left: Breadcrumb ──────────────────────── */}
      <div className="flex items-center gap-1.5 min-w-0 mr-2">
        <span className="text-[10px] text-muted uppercase tracking-[0.15em] font-medium">ERP</span>
        <ChevronRight size={10} className="text-faint" />
        <span className="text-[10px] text-muted uppercase tracking-[0.15em] font-medium">CRM</span>
        {label !== 'Dashboard' && (
          <>
            <ChevronRight size={10} className="text-faint" />
            <span className="text-[10px] text-rex-600 dark:text-rex-400 uppercase tracking-[0.15em] font-semibold">
              {label}
            </span>
          </>
        )}
      </div>

      {/* ── Centre: Page title ───────────────────── */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-primary truncate">{label}</h1>
      </div>

      {/* ── Right toolbar ─────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Search bar */}
        <div className={cn(
          'relative flex items-center transition-all duration-200',
          searchFocus ? 'w-64' : 'w-52',
        )}>
          <Search
            size={13}
            className={cn(
              'absolute left-3 pointer-events-none transition-colors',
              searchFocus ? 'text-rex-500' : 'text-muted',
            )}
          />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            className={cn(
              'input-base w-full pl-8 pr-3 py-1.5 text-xs',
              searchFocus && 'ring-1 ring-rex-500/30',
            )}
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute right-2.5 text-muted hover:text-primary transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-subtle mx-1" />

        {/* Dark / Light toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={cn(
            'flex items-center justify-center w-8 h-8 border transition-all duration-150',
            'border-theme text-muted hover:text-primary hover:border-rex-500/40 hover:bg-rex-500/5',
          )}
        >
          {isDark
            ? <Sun  size={14} className="text-amber-400" />
            : <Moon size={14} />
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className={cn(
              'relative flex items-center justify-center w-8 h-8 border transition-all duration-150',
              showNotif
                ? 'bg-rex-500/10 border-rex-500/40 text-rex-500'
                : 'border-theme text-muted hover:text-primary hover:border-rex-500/40 hover:bg-rex-500/5',
            )}
          >
            <Bell size={14} />
            {/* Unread dot */}
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rex-500 animate-pulse-red"
              style={{ borderRadius: '50%' }}
            />
          </button>

          {/* Dropdown */}
          {showNotif && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotif(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-fade-in glass border border-theme overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle">
                  <p className="text-xs font-semibold text-primary">Notifications</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 uppercase tracking-widest">
                      {notifications.length} New
                    </span>
                    <button
                      onClick={() => setShowNotif(false)}
                      className="text-muted hover:text-primary transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {notifications.map((n, i) => {
                  const Icon = n.icon
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                        'hover:bg-rex-500/5',
                        i < notifications.length - 1 && 'border-b border-theme-subtle',
                      )}
                    >
                      <Icon size={14} className={cn(n.color, 'mt-0.5 flex-shrink-0')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-secondary leading-snug">{n.text}</p>
                        <p className="text-[10px] text-muted mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  )
                })}

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-theme-subtle text-center">
                  <button className="text-[10px] text-rex-600 dark:text-rex-400 hover:text-rex-700 dark:hover:text-rex-300 uppercase tracking-widest font-medium transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-subtle mx-1" />

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="flex flex-col items-end">
            <p className="text-[11px] font-semibold text-primary leading-none">Admin</p>
            <p className="text-[9px] text-muted mt-0.5">admin@rexind.lk</p>
          </div>
          <div className="w-8 h-8 bg-rex-700 border border-rex-600 flex items-center justify-center shadow-glow-red-sm flex-shrink-0">
            <span className="text-[10px] font-bold text-white">AD</span>
          </div>
        </div>
      </div>
    </header>
  )
}
