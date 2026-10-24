import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, Search, ChevronRight, Sun, Moon, X,
  CheckCircle2, TrendingUp, AlertCircle, AlertTriangle, Star, Banknote,
  Users, FileText, Package, Wrench, Truck, Building2, CheckCheck, Clock,
  ArrowRight, ShieldAlert, Sparkles, Loader2, Check, Shield, Contact2, PackageCheck, HelpCircle
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { HelpGuideModal } from '@/components/help/HelpGuideModal'
import { useTheme } from '@/store/theme'
import { useCurrencies } from '@/hooks/useFinance'

const breadcrumbMap: Record<string, string> = {
  '/crm':             'Dashboard',
  '/crm/customers':   'Customers',
  '/crm/leads':       'Leads',
  '/crm/quotations':  'Quotations',
  '/crm/deals':       'Deals',
  '/crm/contacts':    'Contacts',
  '/crm/followups':   'Follow-ups',
  '/inventory':       'Stock & Finished Goods',
  '/inventory/material-issue': 'Material Issue & Store Dispatch',
  '/inventory/suppliers': 'Suppliers',
  '/purchasing':      'Purchasing & GRN',
  '/purchasing/suppliers': 'Suppliers',
  '/production':      'Production & Work Orders',
  '/finance':         'Finance Dashboard',
  '/finance/invoices':'Invoices',
  '/finance/banking': 'Banking',
  '/finance/accounting': 'Accounting',
  '/finance/receivables': 'Receivables',
  '/finance/payables': 'Payables',
  '/finance/reports': 'Reports',
  '/admin/settings':  'Settings',
  '/admin/users':     'Users',
  '/admin/roles':     'Roles & Permissions',
}

interface QuickPage {
  title: string
  path: string
  category: string
  desc: string
  icon: any
}

const QUICK_PAGES: QuickPage[] = [
  { title: 'Invoices', path: '/finance/invoices', category: 'Finance', desc: 'Invoices, payments, and settlements', icon: FileText },
  { title: 'Quotations', path: '/crm/quotations', category: 'CRM', desc: 'Create and track customer quotes', icon: FileText },
  { title: 'Customers', path: '/crm/customers', category: 'CRM', desc: 'Directory, credit limits & accounts', icon: Users },
  { title: 'Contact Directory', path: '/crm/contacts', category: 'CRM', desc: 'All customer contacts & decision makers', icon: Contact2 },
  { title: 'Leads & Inquiries', path: '/crm/leads', category: 'CRM', desc: 'Manage incoming leads & pipeline', icon: TrendingUp },
  { title: 'Stock & Inventory', path: '/inventory', category: 'Inventory', desc: 'Raw materials and finished goods', icon: Package },
  { title: 'Material Issue Station', path: '/inventory/material-issue', category: 'Inventory', desc: 'Issue raw materials & BOM items to Work Orders', icon: PackageCheck },
  { title: 'Suppliers & Vendors', path: '/inventory/suppliers', category: 'Purchasing', desc: 'Supplier database & ledger', icon: Truck },
  { title: 'Production Jobs', path: '/production', category: 'Production', desc: 'Work orders and machine planning', icon: Wrench },
  { title: 'Purchasing & GRN', path: '/purchasing', category: 'Purchasing', desc: 'Purchase orders, bills & GRNs', icon: Truck },
  { title: 'Banking & Cash', path: '/finance/banking', category: 'Finance', desc: 'Bank accounts and statement feeds', icon: Banknote },
  { title: 'General Accounting', path: '/finance/accounting', category: 'Finance', desc: 'Chart of accounts and journals', icon: Building2 },
  { title: 'Roles & Permissions', path: '/admin/roles', category: 'Admin', desc: 'User roles & permission matrix', icon: Shield },
  { title: 'System Settings', path: '/admin/settings', category: 'Admin', desc: 'Company VAT, profile & preferences', icon: Building2 },
]

const NOTIFS_STORAGE_KEY = 'rex_read_notifications';

export const TopBar: React.FC = () => {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { isDark, toggle } = useTheme()

  const [showNotif,  setShowNotif]  = useState(false)
  const [showHelp,   setShowHelp]   = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault()
        setShowHelp(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')
  const [notificationsList, setNotificationsList] = useState<any[]>([])
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Global search state
  const [searchVal,  setSearchVal]  = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    customers?: any[]
    contacts?: any[]
    invoices?: any[]
    quotations?: any[]
    workOrders?: any[]
    inventory?: any[]
    suppliers?: any[]
  }>({})

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifContainerRef = useRef<HTMLDivElement>(null)

  const [sysStats, setSysStats] = useState<any>(null)
  const { data: currencies } = useCurrencies()

  // 1. Fetch system stats
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats`)
      .then(res => res.json())
      .then(setSysStats)
      .catch(() => {})
      
    const interval = setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats`)
        .then(res => res.json())
        .then(setSysStats)
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // 2. Fetch notifications
  const fetchNotifications = () => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotificationsList(data)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 20000)
    return () => clearInterval(interval)
  }, [])

  // 3. Global keyboard shortcuts: Cmd+K / Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setSearchFocus(true)
      }
      if (e.key === 'Escape') {
        setSearchFocus(false)
        setShowNotif(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 4. Click outside to close search and notifications
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocus(false)
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 5. Debounced global search
  useEffect(() => {
    const q = searchVal.trim()
    if (!q) {
      setSearchResults({})
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          setSearchResults(data || {})
          setIsSearching(false)
        })
        .catch(() => setIsSearching(false))
    }, 200)

    return () => clearTimeout(timer)
  }, [searchVal])

  // Notifications Helpers
  const markAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setReadIds(prev => {
      if (prev.includes(id)) return prev
      const updated = [...prev, id]
      try { localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const markAllAsRead = () => {
    const allIds = notificationsList.map(n => n.id)
    setReadIds(allIds)
    try { localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(allIds)); } catch {}
  }

  const unreadCount = notificationsList.filter(n => !readIds.includes(n.id)).length
  const displayedNotifs = notificationsList.filter(n => notifFilter === 'all' || !readIds.includes(n.id))

  // Search Results filtering
  const filteredQuickPages = React.useMemo(() => {
    if (!searchVal.trim()) return QUICK_PAGES
    const q = searchVal.toLowerCase()
    return QUICK_PAGES.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    )
  }, [searchVal])

  const totalResultsCount =
    (searchResults.customers?.length || 0) +
    (searchResults.contacts?.length || 0) +
    (searchResults.invoices?.length || 0) +
    (searchResults.quotations?.length || 0) +
    (searchResults.workOrders?.length || 0) +
    (searchResults.inventory?.length || 0) +
    (searchResults.suppliers?.length || 0) +
    (searchVal.trim() ? filteredQuickPages.length : 0)

  const handleSelectResult = (path: string) => {
    navigate(path)
    setSearchFocus(false)
    setSearchVal('')
  }

  const pathParts = location.pathname.split('/').filter(Boolean)
  const rootSection = (pathParts[0] || 'crm').toUpperCase()
  const label     = breadcrumbMap[location.pathname] || (pathParts[pathParts.length - 1] ? (pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1)) : 'Dashboard')

  return (
    <header className="glass-topbar flex items-center h-14 px-6 gap-4 flex-shrink-0 z-30 relative">

      {/* ── Left: Breadcrumb ──────────────────────── */}
      <div className="flex items-center gap-1.5 min-w-0 mr-2">
        <span className="text-[10px] text-muted uppercase tracking-[0.15em] font-medium">ERP</span>
        <ChevronRight size={10} className="text-faint" />
        <span className="text-[10px] text-muted uppercase tracking-[0.15em] font-medium">{rootSection}</span>
        {label !== 'Dashboard' && label.toUpperCase() !== rootSection && (
          <>
            <ChevronRight size={10} className="text-faint" />
            <span className="text-[10px] text-rex-600 dark:text-rex-400 uppercase tracking-[0.15em] font-semibold truncate max-w-[160px]">
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

        {/* Currency Rates */}
        {currencies && currencies.length > 0 && (
          <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-1 bg-surface/50 border border-theme-subtle rounded text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            {currencies.filter((c: any) => !c.isBase).map((c: any, idx: number) => (
              <React.Fragment key={c.code}>
                <div className="flex items-center gap-1.5 text-emerald-500/90" title={`${c.name} Exchange Rate`}>
                  <Banknote size={12} />
                  <span>{c.code}</span>
                  <span>{Number(c.exchangeRate).toFixed(2)}</span>
                </div>
                {idx < currencies.filter((c: any) => !c.isBase).length - 1 && <div className="w-px h-3 bg-theme-subtle"></div>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* System Stats Mini */}
        {sysStats && (
          <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-1 bg-surface/50 border border-theme-subtle rounded text-[9px] font-mono font-bold text-muted uppercase tracking-wider">
            {sysStats.network && (
              <>
                <div className="flex items-center gap-1.5 text-blue-500" title="Internet Speed (Download)">
                  <span>NET</span>
                  <span>{sysStats.network.download} MBPS</span>
                </div>
                <div className="w-px h-3 bg-theme-subtle"></div>
              </>
            )}
            <div className="flex items-center gap-1.5" title="CPU Usage">
              <span>CPU</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(sysStats.cpu.percent, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title="RAM Usage">
              <span>RAM</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${Math.min(sysStats.ram.percent, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title="Disk Usage">
              <span>DSK</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(sysStats.storage.percent, 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Global Search Bar & Dropdown ───────────────────────── */}
        <div ref={searchContainerRef} className="relative">
          <div className={cn(
            'relative flex items-center transition-all duration-200',
            searchFocus ? 'w-64 sm:w-80' : 'w-48 sm:w-56',
          )}>
            <Search
              size={13}
              className={cn(
                'absolute left-3 pointer-events-none transition-colors',
                searchFocus ? 'text-rex-500' : 'text-muted',
              )}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search anything... (⌘K)"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              className={cn(
                'input-base w-full pl-8 pr-8 py-1.5 text-xs rounded-lg transition-all',
                searchFocus ? 'ring-2 ring-rex-500/30 border-rex-500 bg-surface' : 'bg-surface/60',
              )}
            />
            {isSearching ? (
              <Loader2 size={12} className="absolute right-2.5 text-rex-500 animate-spin" />
            ) : searchVal ? (
              <button
                onClick={() => { setSearchVal(''); searchInputRef.current?.focus() }}
                className="absolute right-2.5 text-muted hover:text-primary transition-colors p-0.5"
                title="Clear"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono text-muted/80 bg-theme-subtle/50 rounded border border-theme-subtle pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown Panel */}
          {searchFocus && (
            <div className="absolute right-0 sm:left-auto top-full mt-2 w-[340px] sm:w-[460px] z-50 animate-fade-in bg-surface border border-theme-subtle shadow-2xl rounded-xl overflow-hidden backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-theme-subtle bg-surface2/40 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium text-secondary">
                  <Sparkles size={13} className="text-rex-500" />
                  <span>{searchVal.trim() ? `Search results (${totalResultsCount})` : 'Quick Navigation & Shortcuts'}</span>
                </div>
                <span className="text-[10px] text-muted font-mono">ESC to close</span>
              </div>

              {/* Scrollable Results */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-theme-subtle/40">
                {/* 1. Quick Navigation Pages */}
                {filteredQuickPages.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">Pages & Modules</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {filteredQuickPages.slice(0, searchVal.trim() ? 4 : 6).map((page) => {
                        const Icon = page.icon
                        return (
                          <div
                            key={page.path}
                            onClick={() => handleSelectResult(page.path)}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-rex-500/10 cursor-pointer transition-colors group"
                          >
                            <div className="w-7 h-7 rounded bg-surface2 flex items-center justify-center text-muted group-hover:text-rex-500 flex-shrink-0 transition-colors">
                              <Icon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-primary truncate group-hover:text-rex-600 dark:group-hover:text-rex-400">{page.title}</p>
                              <p className="text-[10px] text-muted truncate">{page.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Customers */}
                {searchResults.customers && searchResults.customers.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Customers ({searchResults.customers.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/crm/customers')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.customers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectResult(`/crm/customers/${c.id}`)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(c.company || c.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary truncate">{c.company || c.name}</p>
                              <p className="text-[10px] text-muted truncate">{c.name && c.company ? c.name : (c.email || c.phone || c.id)}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted flex-shrink-0 ml-2">Customer →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2b. Contacts */}
                {searchResults.contacts && searchResults.contacts.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Contacts ({searchResults.contacts.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/crm/contacts')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.contacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          onClick={() => handleSelectResult(contact.customerId ? `/crm/customers/${contact.customerId}` : '/crm/contacts')}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(contact.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary truncate">{contact.name}</p>
                              <p className="text-[10px] text-muted truncate">
                                {contact.role} · {contact.company || contact.email || contact.phone || ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted flex-shrink-0 ml-2">Contact →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Invoices */}
                {searchResults.invoices && searchResults.invoices.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Invoices ({searchResults.invoices.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/finance/invoices')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.invoices.map(inv => (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectResult('/finance/invoices')}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                              <FileText size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-primary">{inv.invoiceNo || inv.id}</span>
                                {inv.status && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono bg-theme-subtle text-secondary">
                                    {inv.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted truncate">
                                {inv.quotationId ? `Quote: ${inv.quotationId}` : ''} {inv.dueDate ? `· Due: ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-semibold text-primary ml-2 flex-shrink-0">
                            {formatCurrency(Number(inv.total || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Quotations */}
                {searchResults.quotations && searchResults.quotations.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Quotations ({searchResults.quotations.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/crm/quotations')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.quotations.map(quo => {
                        let parsed: any = {}
                        try { parsed = JSON.parse(quo.data || '{}') } catch {}
                        const quoNo = parsed.quotationNo || quo.id
                        return (
                          <div
                            key={quo.id}
                            onClick={() => handleSelectResult('/crm/quotations')}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                                <FileText size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-primary truncate">{quoNo}</p>
                                <p className="text-[10px] text-muted truncate">{parsed.customerName || parsed.customerCompany || quo.leadId || 'Quotation'}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-semibold text-primary ml-2 flex-shrink-0">
                              {quo.totalAmount ? formatCurrency(Number(quo.totalAmount)) : 'Draft'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Work Orders */}
                {searchResults.workOrders && searchResults.workOrders.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Work Orders ({searchResults.workOrders.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/production')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.workOrders.map(wo => (
                        <div
                          key={wo.id}
                          onClick={() => handleSelectResult('/production')}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                              <Wrench size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-primary truncate">{wo.orderNo || wo.id}</p>
                              <p className="text-[10px] text-muted truncate">{wo.title || wo.customer || 'Production Order'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold bg-theme-subtle text-secondary">
                            {wo.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Inventory Items */}
                {searchResults.inventory && searchResults.inventory.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Inventory & Products ({searchResults.inventory.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/inventory')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.inventory.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult('/inventory')}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                              <Package size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary truncate">{item.name}</p>
                              <p className="text-[10px] text-muted font-mono truncate">{item.sku} · {item.category || 'General'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-500 ml-2 flex-shrink-0">
                            Qty: {item.quantity || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Suppliers */}
                {searchResults.suppliers && searchResults.suppliers.length > 0 && (
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                      <span>Suppliers ({searchResults.suppliers.length})</span>
                      <span className="text-[9px] text-blue-500 cursor-pointer" onClick={() => handleSelectResult('/inventory/suppliers')}>View All</span>
                    </p>
                    <div className="space-y-1">
                      {searchResults.suppliers.map(sup => (
                        <div
                          key={sup.id}
                          onClick={() => handleSelectResult(`/inventory/suppliers/${sup.id}`)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-cyan-500/10 text-cyan-500 flex items-center justify-center flex-shrink-0">
                              <Truck size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary truncate">{sup.name}</p>
                              <p className="text-[10px] text-muted truncate">{sup.email || sup.phone || 'Supplier'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted">Vendor →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Empty State */}
                {searchVal.trim() && totalResultsCount === 0 && !isSearching && (
                  <div className="p-8 text-center text-muted">
                    <Search size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-primary">No matching records found</p>
                    <p className="text-[11px] text-muted mt-1">Try searching by Customer, Invoice #, Quote #, or Item SKU.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-theme-subtle bg-surface2/30 flex items-center justify-between text-[10px] text-muted">
                <span>Press <kbd className="px-1 py-0.5 bg-surface border border-theme-subtle rounded font-mono">↵</kbd> to open selection</span>
                <span className="text-rex-600 dark:text-rex-400 font-medium">Rex ERP Global Search</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-subtle mx-1" />

        {/* Dark / Light toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-150',
            'border-theme-subtle text-muted hover:text-primary hover:border-rex-500/40 hover:bg-rex-500/5',
          )}
        >
          {isDark
            ? <Sun  size={14} className="text-amber-400" />
            : <Moon size={14} />
          }
        </button>

        {/* ── Notification Button & Popover ───────────────────────── */}
        <div ref={notifContainerRef} className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            title="System Notifications & Alerts"
            className={cn(
              'relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150',
              showNotif
                ? 'bg-rex-500/10 border-rex-500/40 text-rex-500 shadow-sm'
                : 'border-theme-subtle text-muted hover:text-primary hover:border-rex-500/40 hover:bg-rex-500/5',
            )}
          >
            <Bell size={14} />
            {/* Unread badge & pulsing dot */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-surface animate-in zoom-in-50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 animate-fade-in bg-surface border border-theme-subtle shadow-2xl rounded-xl overflow-hidden backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle bg-surface2/40">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-primary tracking-tight">Notifications</p>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                      {unreadCount} Unread
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      All Caught Up
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-medium text-rex-600 dark:text-rex-400 hover:text-rex-700 flex items-center gap-1 transition-colors"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={12} />
                      <span>Read All</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotif(false)}
                    className="text-muted hover:text-primary transition-colors p-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Tabs: All / Unread */}
              <div className="flex items-center border-b border-theme-subtle px-3 py-1.5 bg-surface gap-2 text-xs">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors',
                    notifFilter === 'all' ? 'bg-surface2 text-primary font-bold shadow-xs' : 'text-muted hover:text-secondary'
                  )}
                >
                  All ({notificationsList.length})
                </button>
                <button
                  onClick={() => setNotifFilter('unread')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors',
                    notifFilter === 'unread' ? 'bg-surface2 text-primary font-bold shadow-xs' : 'text-muted hover:text-secondary'
                  )}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-theme-subtle/50">
                {displayedNotifs.length > 0 ? (
                  displayedNotifs.map((n) => {
                    const isRead = readIds.includes(n.id)
                    let IconComponent = AlertCircle
                    let iconColor = 'text-blue-500 bg-blue-500/10'

                    if (n.type === 'invoice' || n.severity === 'error') {
                      IconComponent = AlertTriangle
                      iconColor = 'text-rose-500 bg-rose-500/10'
                    } else if (n.type === 'material_shortage') {
                      IconComponent = AlertTriangle
                      iconColor = 'text-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30'
                    } else if (n.type === 'material_mr') {
                      IconComponent = Package
                      iconColor = 'text-cyan-500 bg-cyan-500/15 ring-1 ring-cyan-500/30'
                    } else if (n.type === 'inventory' || n.severity === 'warning') {
                      IconComponent = Package
                      iconColor = 'text-amber-500 bg-amber-500/10'
                    } else if (n.type === 'approval') {
                      IconComponent = ShieldAlert
                      iconColor = 'text-indigo-500 bg-indigo-500/10'
                    } else if (n.type === 'production') {
                      IconComponent = Wrench
                      iconColor = 'text-purple-500 bg-purple-500/10'
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id)
                          if (n.link) navigate(n.link)
                          setShowNotif(false)
                        }}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors relative group',
                          isRead ? 'opacity-70 hover:opacity-100 hover:bg-surface2/50' : 'bg-rex-500/5 hover:bg-rex-500/10',
                        )}
                      >
                        {/* Status Icon */}
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', iconColor)}>
                          <IconComponent size={14} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn('text-xs leading-snug truncate', isRead ? 'text-secondary font-medium' : 'text-primary font-bold')}>
                              {n.title}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-rex-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-secondary/90 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {n.time}
                            </span>
                            {n.link && (
                              <span className="text-rex-600 dark:text-rex-400 group-hover:underline">
                                View details →
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mark read button on hover */}
                        {!isRead && (
                          <button
                            onClick={(e) => markAsRead(n.id, e)}
                            title="Mark as read"
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-emerald-500 rounded transition-opacity"
                          >
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 text-center text-muted">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                    <p className="text-xs font-semibold text-primary">All caught up!</p>
                    <p className="text-[11px] text-muted mt-1">
                      {notifFilter === 'unread' ? 'You have no unread notifications.' : 'No system notifications at this time.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-theme-subtle bg-surface2/30 flex items-center justify-between">
                <span className="text-[10px] text-muted">Auto-updates in real-time</span>
                <button
                  onClick={() => {
                    navigate('/finance/invoices')
                    setShowNotif(false)
                  }}
                  className="text-[10px] font-semibold text-rex-600 dark:text-rex-400 hover:underline uppercase tracking-wider"
                >
                  Manage Invoices
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-subtle mx-1" />

        {/* ── Interactive UI Help Guide Button (Circular ? mark) ── */}
        <button
          onClick={() => setShowHelp(true)}
          title="Interactive Page & Workflow Guide (Click or press '?' or F1)"
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-150',
            'border-theme-subtle text-muted hover:text-rex-600 dark:hover:text-rex-400 hover:border-rex-500/50 hover:bg-rex-500/10 font-bold text-xs shadow-xs',
            showHelp && 'border-rex-500 text-rex-600 bg-rex-500/10'
          )}
        >
          <span className="font-bold text-xs select-none">?</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-theme-subtle mx-1" />

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group" onClick={() => navigate('/admin/settings')}>
          <div className="flex flex-col items-end">
            <p className="text-[11px] font-semibold text-primary leading-none group-hover:text-rex-500 transition-colors">Admin</p>
            <p className="text-[9px] text-muted mt-0.5">admin@rexind.lk</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rex-700 border border-rex-600 flex items-center justify-center shadow-glow-red-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <span className="text-[10px] font-bold text-white">AD</span>
          </div>
        </div>
      </div>
          {/* Interactive Page Help & Workflow Guide Modal */}
      <HelpGuideModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        currentPath={location.pathname}
      />
    </header>
  )
}

