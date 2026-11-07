import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, Wallet, PackageCheck, 
  Settings, Monitor, LogOut, Bell, Shield, ChevronRight, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useQuotations, useCustomers, useFinishedGoodsOrders } from '@/hooks/useData';
import { fetchSubstituteRequests, fetchPendingCashbookEntries } from '@/lib/api';

export const MobileLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  // Pending count for approvals badge
  const { data: quotations = [] } = useQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useFinishedGoodsOrders();
  const [subCount, setSubCount] = useState(0);
  const [cashCount, setCashCount] = useState(0);

  useEffect(() => {
    // Set mobile phone status bar / browser header to Rex Red
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const prevColor = themeMeta?.getAttribute('content') || '#dc2626';
    if (themeMeta) {
      themeMeta.setAttribute('content', '#dc2626');
    }

    let mounted = true;
    fetchSubstituteRequests()
      .then(res => {
        if (mounted && Array.isArray(res)) {
          setSubCount(res.filter((s: any) => s.status === 'PENDING' || s.status === 'pending').length);
        }
      })
      .catch(() => {});

    fetchPendingCashbookEntries()
      .then(res => {
        if (mounted && Array.isArray(res)) {
          setCashCount(res.length);
        }
      })
      .catch(() => {});

    return () => { 
      mounted = false; 
    };
  }, [location.pathname]);

  const pendingQuotes = (quotations || []).filter((q: any) => 
    q.status === 'Pending Approval' || q.status === 'Draft_Pending' || q.editApprovalRequested
  ).length;
  const pendingOrders = (orders || []).filter((o: any) => 
    o.advanceWaiverRequested && !o.advanceWaiverApproved
  ).length;
  const pendingCredit = (customers || []).filter((c: any) => 
    c.creditLimitRequested && !c.creditLimitApproved
  ).length;

  const totalPendingApprovals = pendingQuotes + pendingOrders + pendingCredit + subCount + cashCount;

  const handleSwitchToDesktop = () => {
    localStorage.setItem('rex_pref_view', 'desktop');
    navigate('/crm/leads');
  };

  const logoSrc = settings?.company_logo || '/rex-logo.png';

  const navItems = [
    { to: '/mobile/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { 
      to: '/mobile/approvals', 
      icon: CheckSquare, 
      label: 'Approvals', 
      badge: totalPendingApprovals > 0 ? totalPendingApprovals : undefined 
    },
    { to: '/mobile/cashbook', icon: Wallet, label: 'Cashbook' },
    { to: '/mobile/mr', icon: PackageCheck, label: 'MR Hub' },
    { to: '/mobile/more', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-base text-primary font-sans overflow-hidden">
      {/* Top App Header with Rex Red Crown (Flows from Phone Notification/Status Bar) */}
      <header className="shrink-0 z-40 bg-gradient-to-r from-rex-700 via-rex-600 to-rex-700 text-white shadow-md border-b border-rex-800/40 px-3.5 pt-[env(safe-area-inset-top,0px)]">
        <div className="h-16 flex items-center justify-between">
          {/* Left: Enhanced Rex Logo on crisp white rounded card & Brand Tag */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-11 px-2 py-1 rounded-xl bg-white shadow-sm border border-white/90 flex items-center justify-center shrink-0">
              <img 
                src={logoSrc} 
                alt={settings?.company_name || 'Rex Industries'} 
                className="h-8 sm:h-9 w-auto max-w-[130px] sm:max-w-[150px] object-contain drop-shadow-xs" 
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[13px] tracking-wider text-white font-mono truncate">
                  REX ERP
                </span>
                <span className="px-1.5 py-0.2 text-[8px] bg-white/20 text-white font-extrabold uppercase tracking-widest rounded border border-white/30 shadow-xs">
                  MOBILE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/85 truncate mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate max-w-[110px] font-medium text-white/95">
                  {user?.name || 'Authorized'}
                </span>
              </div>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSwitchToDesktop}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl active:scale-95 transition-all shadow-xs backdrop-blur-xs"
              title="Switch to Full Desktop ERP"
            >
              <Monitor size={14} className="text-white" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable View with Momentum Scrolling */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain px-3.5 pt-3 pb-6 max-w-lg mx-auto w-full animate-fade-in [-webkit-overflow-scrolling:touch]">
        <Outlet />
      </main>

      {/* Bottom Thumb Navigation Bar styled in Desktop Sidebar Theme (#0f0f10) */}
      <nav className="shrink-0 z-30 bg-[#0f0f10] border-t border-white/[0.08] px-2 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] flex justify-around items-center max-w-lg mx-auto shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
            (item.to === '/mobile/dashboard' && (location.pathname === '/mobile' || location.pathname === '/mobile/'));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-white/[0.08] text-rex-500 font-bold scale-[1.03] shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.4 : 1.9}
                  className={`transition-transform duration-200 ${
                    isActive 
                      ? 'text-rex-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]' 
                      : 'text-zinc-400'
                  } ${item.to === '/mobile/more' && isActive ? 'rotate-45' : ''}`} 
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-rex-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rex-600/70">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                isActive ? 'text-zinc-100 font-bold' : 'text-zinc-400'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-rex-500 mt-0.5 animate-fade-in shadow-[0_0_6px_#e11d48]"></span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
