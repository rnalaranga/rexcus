import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, FileText, Briefcase, Contact2, Bell,
  Package, Building2, ShoppingCart, Factory, Settings, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Users2, Zap, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, LogOut, UserCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'

interface NavItem {
  label: string
  path: string
  icon: React.FC<any>
  badge?: number
}

interface NavGroup {
  title: string
  icon: React.FC<any>
  items: NavItem[]
  active?: boolean
}

const navGroups: NavGroup[] = [
  {
    title: 'CRM', icon: Users, active: true,
    items: [
      { label: 'Dashboard',  path: '/crm',            icon: LayoutDashboard },
      { label: 'Customers',  path: '/crm/customers',  icon: Users },
      { label: 'Leads',      path: '/crm/leads',      icon: TrendingUp },
      { label: 'Quotations', path: '/crm/quotations', icon: FileText },
      { label: 'Deals',      path: '/crm/deals',      icon: Briefcase },
      { label: 'Contacts',   path: '/crm/contacts',   icon: Contact2 },
      { label: 'Follow-ups', path: '/crm/followups',  icon: Bell },
    ],
  },
  {
    title: 'Inventory', icon: Package, active: true,
    items: [
      { label: 'Stock',      path: '/inventory',           icon: Package },
      { label: 'Suppliers',  path: '/inventory/suppliers', icon: Building2 },
      { label: 'Purchasing', path: '/purchasing',           icon: ShoppingCart },
    ],
  },
  {
    title: 'Production', icon: Factory, active: true,
    items: [
      { label: 'Work Orders', path: '/production',           icon: Factory },
      { label: 'Machinery',   path: '/production/machinery', icon: Settings },
    ],
  },
  {
    title: 'Finance', icon: DollarSign, active: true,
    items: [
      { label: 'Dashboard',    path: '/finance/dashboard',     icon: BarChart3 },
      { label: 'Invoices',     path: '/finance/invoices',      icon: FileText },
      { label: 'Accounting',   path: '/finance',               icon: DollarSign },
      { label: 'Receivables',  path: '/finance/receivables',   icon: ArrowUpRight },
      { label: 'Payables',     path: '/finance/payables',      icon: ArrowDownRight },
      { label: 'Reports',      path: '/finance/reports',       icon: BarChart3 },
      { label: 'Tax Report',   path: '/finance/tax-report',    icon: BarChart3 },
    ],
  },
  {
    title: 'HR', icon: Users2, active: true,
    items: [
      { label: 'Employees',    path: '/hr/employees', icon: Users2 },
      { label: 'Skills',       path: '/hr/skills',    icon: FileText },
      { label: 'Labor Report', path: '/hr/report',    icon: BarChart3 },
    ],
  },
  {
    title: 'Admin', icon: Settings, active: true,
    items: [
      { label: 'Users',    path: '/admin/users',    icon: Users },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { settings } = useSettings()

  const [collapsed, setCollapsed] = useState(false)
  // Track which groups are open; default all active groups open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    navGroups.forEach(g => { if (g.active) init[g.title] = true })
    return init
  })

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const isGroupActive = (group: NavGroup) =>
    group.items.some(item =>
      location.pathname === item.path ||
      (item.path !== '/crm' && location.pathname.startsWith(item.path))
    )

  return (
    <aside
      className={cn(
        'flex flex-col h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
        'bg-[#0f0f10] border-r border-white/[0.06]',
        collapsed ? 'w-[56px]' : 'w-[220px]'
      )}
    >
      {/* Brand */}
      <div className={cn(
        'flex items-center border-b border-white/[0.06] flex-shrink-0',
        collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-4 py-4'
      )}>
        {settings.company_logo && !collapsed ? (
          <img src={settings.company_logo} alt="Logo" className="max-h-7 max-w-full object-contain" />
        ) : (
          <div className="w-7 h-7 bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-zinc-300" fill="currentColor" />
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-zinc-200 tracking-[0.15em] uppercase leading-none">
              Rex Industries
            </p>
            <p className="text-[8px] text-zinc-500 tracking-widest uppercase mt-0.5">Manufacturing ERP</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {navGroups.map(group => {
          const GroupIcon = group.icon
          const groupActive = isGroupActive(group)
          const isOpen = openGroups[group.title]

          if (!group.active) return null

          return (
            <div key={group.title} className="mb-0.5">
              {/* Group header */}
              <button
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false)
                    setOpenGroups(prev => ({ ...prev, [group.title]: true }))
                  } else {
                    toggleGroup(group.title)
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 transition-colors duration-150 group',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
                  groupActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                title={collapsed ? group.title : undefined}
              >
                <GroupIcon
                  size={15}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    groupActive ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-[0.15em] flex-1 text-left',
                      groupActive ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
                    )}>
                      {group.title}
                    </span>
                    {isOpen
                      ? <ChevronUp size={11} className="text-zinc-500 flex-shrink-0" />
                      : <ChevronDown size={11} className="text-zinc-500 flex-shrink-0" />
                    }
                  </>
                )}
                {collapsed && groupActive && (
                  <div className="absolute left-0 w-0.5 h-6 bg-zinc-400 rounded-r" />
                )}
              </button>

              {/* Sub-items */}
              {!collapsed && isOpen && (
                <div className="pb-1">
                  {group.items.map(item => {
                    const Icon = item.icon
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== '/crm' && item.path !== '/finance' && location.pathname.startsWith(item.path))

                    return (
                      <NavLink
                        key={item.label}
                        to={item.path}
                        end={item.path === '/crm' || item.path === '/finance'}
                        className={({ isActive: navActive }) => cn(
                          'flex items-center gap-2.5 mx-2 px-3 py-1.5 mb-0.5 rounded transition-all duration-150 group',
                          (navActive || isActive)
                            ? 'bg-white/[0.09] text-white'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                        )}
                      >
                        {({ isActive: navActive }) => (
                          <>
                            <Icon
                              size={13}
                              className={cn(
                                'flex-shrink-0 transition-colors',
                                (navActive || isActive) ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
                              )}
                            />
                            <span className={cn(
                              'text-[11px] font-medium flex-1 truncate',
                              (navActive || isActive) ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                            )}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                                (navActive || isActive)
                                  ? 'bg-white/10 text-zinc-200'
                                  : 'bg-white/[0.05] text-zinc-500'
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
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.06] flex-shrink-0">
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'w-full flex items-center gap-2.5 py-2.5 text-zinc-600 hover:text-zinc-300 transition-colors group',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={14} className="group-hover:text-zinc-300 transition-colors" />
            : <>
                <ChevronLeft size={14} className="group-hover:text-zinc-300 transition-colors" />
                <span className="text-[10px] tracking-wider uppercase">Collapse</span>
              </>
          }
        </button>

        {/* User footer */}
        <div className={cn(
          'flex items-center border-t border-white/[0.06] py-3',
          collapsed ? 'justify-center px-0 flex-col gap-2' : 'px-3 gap-2.5'
        )}>
          <div className="w-7 h-7 bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-zinc-300">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-300 truncate">{user?.name || 'User'}</p>
              <p className="text-[9px] text-zinc-600 truncate">@{user?.username || 'user'}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
