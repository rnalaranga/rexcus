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

    return () => { mounted = false; };
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
    <div className="min-h-screen bg-base text-primary flex flex-col font-sans select-none pb-24">
      {/* Top App Header with Prominent Branding & Large Logo */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-b border-theme px-3.5 h-16 flex items-center justify-between shadow-xs">
        {/* Left: Enhanced Rex Logo & Brand Tag */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-11 px-1.5 py-1 rounded-xl bg-surface2/70 border border-theme flex items-center justify-center shrink-0 shadow-xs">
            <img 
              src={logoSrc} 
              alt={settings?.company_name || 'Rex Industries'} 
              className="h-8 sm:h-9 w-auto max-w-[130px] sm:max-w-[150px] object-contain drop-shadow-xs" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[13px] tracking-wider text-primary font-mono truncate">
                REX ERP
              </span>
              <span className="px-1.5 py-0.2 text-[8px] bg-rex-600 text-white font-extrabold uppercase tracking-widest rounded shadow-xs">
                MOBILE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted truncate mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate max-w-[110px] font-medium text-secondary">
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary bg-surface2 hover:bg-surface border border-theme rounded-xl active:scale-95 transition-all shadow-xs"
            title="Switch to Full Desktop ERP"
          >
            <Monitor size={14} className="text-rex-600" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable View */}
      <main className="flex-1 pt-20 px-3.5 max-w-lg mx-auto w-full animate-fade-in">
        <Outlet />
      </main>

      {/* Bottom Thumb Navigation Bar with Gear Wheel & Polished Branding */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-theme px-2 py-1.5 flex justify-around items-center max-w-lg mx-auto shadow-2xl safe-area-bottom">
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
                  ? 'bg-rex-600/10 text-rex-600 dark:text-rex-400 font-bold scale-[1.03] shadow-xs' 
                  : 'text-muted hover:text-primary active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.4 : 1.9}
                  className={`transition-transform duration-200 ${
                    isActive 
                      ? 'text-rex-600 dark:text-rex-400 drop-shadow-xs' 
                      : 'text-muted group-hover:text-primary'
                  } ${item.to === '/mobile/more' && isActive ? 'rotate-45' : ''}`} 
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-rex-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm shadow-rex-600/50">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight font-medium ${
                isActive ? 'text-rex-700 dark:text-rex-300 font-bold' : 'text-muted'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-rex-600 dark:bg-rex-400 mt-0.5 animate-fade-in shadow-xs"></span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
