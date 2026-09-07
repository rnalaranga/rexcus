import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Briefcase, Contact2,
  Package, Factory, ShoppingCart, DollarSign, Users2, Settings, Zap,
  Building2, Bell, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem  { label: string; path: string; icon: React.ElementType; badge?: number }
interface NavGroup { title: string; items: NavItem[]; active?: boolean }

const navGroups: NavGroup[] = [
  {
    title: 'CRM', active: true,
    items: [
      { label: 'Dashboard',   path: '/crm',            icon: LayoutDashboard },
      { label: 'Customers',   path: '/crm/customers',  icon: Users,      badge: 10 },
      { label: 'Leads',       path: '/crm/leads',      icon: TrendingUp, badge: 10 },
      { label: 'Deals',       path: '/crm/deals',      icon: Briefcase,  badge: 8  },
      { label: 'Contacts',    path: '/crm/contacts',   icon: Contact2 },
      { label: 'Follow-ups',  path: '/crm/followups',  icon: Bell },
    ],
  },
  { title: 'Inventory', active: true, items: [
    { label: 'Stock',       path: '/inventory', icon: Package   },
    { label: 'Suppliers',   path: '/inventory/suppliers', icon: Building2 }
  ] },
  { title: 'Production', items: [{ label: 'Work Orders', path: '/production', icon: Factory  }] },
  { title: 'Sales',      items: [{ label: 'Orders',      path: '/sales',      icon: ShoppingCart }] },
  { title: 'Finance',    active: true, items: [
    { label: 'Invoices',  path: '/finance/invoices', icon: FileText },
    { label: 'Accounting',  path: '/finance',    icon: DollarSign   }
  ] },
  { title: 'HR',         items: [{ label: 'Employees',   path: '/hr',         icon: Users2        }] },
  { title: 'Admin',      active: true, items: [
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Settings', path: '/admin/settings', icon: Settings }
  ] },
]

import { useSettings } from '@/contexts/SettingsContext'

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { settings } = useSettings()

  return (
    <aside className="glass-sidebar flex flex-col h-full w-60 flex-shrink-0 overflow-hidden">

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-theme-subtle">
        {settings.company_logo ? (
          <img src={settings.company_logo} alt="Logo" className="max-h-8 max-w-full object-contain" />
        ) : (
          <>
            <div className="w-8 h-8 bg-rex-700 flex items-center justify-center flex-shrink-0 shadow-glow-red-sm">
              <Zap size={15} className="text-white" fill="currentColor" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-rex-600 dark:text-rex-400 tracking-[0.18em] uppercase leading-none">
                Rex Industries
              </p>
              <p className="text-[9px] text-muted tracking-widest uppercase mt-0.5">Manufacturing ERP</p>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map(group => (
          <div key={group.title} className="mb-5">
            {/* Group label */}
            <div className="flex items-center gap-2 px-3 mb-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-faint">{group.title}</p>
              {!group.active && (
                <span className="ml-auto text-[8px] text-faint uppercase tracking-widest">Soon</span>
              )}
            </div>

            {group.items.map(item => {
              const Icon = item.icon
              const isActive   = location.pathname === item.path ||
                (item.path !== '/crm' && location.pathname.startsWith(item.path))
              const isDisabled = !group.active

              if (isDisabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 px-3 py-2 mb-0.5 opacity-30 cursor-not-allowed"
                  >
                    <Icon size={14} className="text-muted flex-shrink-0" />
                    <span className="text-xs text-muted">{item.label}</span>
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === '/crm'}
                  className={({ isActive: navActive }) => cn(
                    'nav-item flex items-center gap-2.5 px-3 py-2 mb-0.5',
                    (navActive || isActive) && 'nav-item-active',
                  )}
                >
                  {({ isActive: navActive }) => (
                    <>
                      <Icon
                        size={14}
                        className={cn(
                          'flex-shrink-0 transition-colors',
                          (navActive || isActive) ? 'text-rex-600 dark:text-rex-400' : 'text-muted',
                        )}
                      />
                      <span className={cn(
                        'text-xs font-medium flex-1 transition-colors',
                        (navActive || isActive) ? 'text-rex-600 dark:text-rex-300' : 'text-secondary',
                      )}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center',
                          (navActive || isActive)
                            ? 'bg-rex-500/15 text-rex-600 dark:text-rex-300'
                            : 'bg-surface2 text-muted',
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-theme-subtle p-3">
        <div className="flex items-center justify-between px-2 py-2 group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-rex-700 border border-rex-600/50 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{user?.name ? user.name.substring(0,2).toUpperCase() : 'US'}</span>
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-[11px] font-semibold text-primary truncate">{user?.name || 'User'}</p>
              <p className="text-[9px] text-muted truncate">@{user?.username || 'user'}</p>
            </div>
          </div>
          <button onClick={logout} className="p-1.5 rounded bg-surface/50 text-muted hover:text-red-500 transition-colors" title="Logout">
            <Settings size={13} className="hidden" /> {/* Keep Settings imported but unused icon logic */}
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
