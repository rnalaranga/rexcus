import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Monitor, Download, Shield, LogOut, Moon, Sun, 
  ExternalLink, Smartphone, Server, CheckCircle2, ChevronRight, HelpCircle,
  FileText, ShoppingBag, CheckSquare, Wallet, PackageCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export const MobileMore: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dbStatus, setDbStatus] = useState<string>('Online (Ready)');

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      alert('To install on iOS / Safari: Tap the Share button in Safari and select "Add to Home Screen". On Chrome: Tap the three dots menu and choose "Install App" or "Add to Home screen".');
    }
  };

  const handleSwitchToDesktop = () => {
    localStorage.setItem('rex_pref_view', 'desktop');
    navigate('/crm/leads');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Brand Hero Card with Large Logo */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-surface to-surface2/80 border border-theme flex flex-col items-center justify-center text-center shadow-xs space-y-2">
        <div className="p-2 rounded-xl bg-surface border border-theme shadow-xs flex items-center justify-center">
          <img 
            src={settings?.company_logo || '/rex-logo.png'} 
            alt={settings?.company_name || 'Rex Industries'} 
            className="h-12 w-auto max-w-[220px] object-contain drop-shadow-xs" 
          />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-extrabold text-primary tracking-wide">
            {settings?.company_name || 'Rex Industries (Pvt) Ltd'}
          </h2>
          <p className="text-[10px] text-muted font-mono uppercase tracking-wider">
            Industrial Engineering & Manufacturing ERP
          </p>
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rex-600/10 text-rex-600 dark:text-rex-400 border border-rex-600/25 uppercase tracking-wider">
            Mobile Edition v1.2
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Synced
          </span>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-4 rounded-xl bg-surface border border-theme flex items-center gap-3.5 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rex-600 to-rex-700 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
          {user?.name?.slice(0, 2).toUpperCase() || 'RX'}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-primary truncate">
            {user?.name || 'Administrator'}
          </h2>
          <p className="text-xs text-muted font-mono truncate">
            @{user?.username || 'user'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-rex-600/15 text-rex-600 border border-rex-600/30 uppercase tracking-wider">
              {user?.role || 'Staff'}
            </span>
            <span className="text-[10px] text-secondary font-medium">
              {settings.company_name || 'Rex Industries (Pvt) Ltd'}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Modules Navigation */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block px-1">
          Operations & Commercial Records
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* Quotations */}
          <button
            type="button"
            onClick={() => navigate('/mobile/quotations')}
            className="p-3 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center gap-2.5 active:scale-95 transition-all text-left shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-rex-600/10 text-rex-600 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Quotations</span>
              <span className="text-[10px] text-muted">All Quotes</span>
            </div>
          </button>

          {/* Sales Orders */}
          <button
            type="button"
            onClick={() => navigate('/mobile/orders')}
            className="p-3 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center gap-2.5 active:scale-95 transition-all text-left shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Sales Orders</span>
              <span className="text-[10px] text-muted">Factory Orders</span>
            </div>
          </button>

          {/* Approvals */}
          <button
            type="button"
            onClick={() => navigate('/mobile/approvals')}
            className="p-3 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center gap-2.5 active:scale-95 transition-all text-left shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <CheckSquare size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Approvals</span>
              <span className="text-[10px] text-muted">Sign-off Hub</span>
            </div>
          </button>

          {/* Cashbook */}
          <button
            type="button"
            onClick={() => navigate('/mobile/cashbook')}
            className="p-3 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center gap-2.5 active:scale-95 transition-all text-left shadow-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet size={16} />
            </div>
            <div>
              <span className="text-xs font-bold block text-primary">Cashbook</span>
              <span className="text-[10px] text-muted">Cash Vouchers</span>
            </div>
          </button>
        </div>
      </div>

      {/* Primary Actions Group */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block px-1">
          App Modes & Access
        </span>

        {/* Switch to Desktop */}
        <button
          type="button"
          onClick={handleSwitchToDesktop}
          className="w-full p-3.5 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center justify-between active:scale-[0.99] transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Monitor size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block text-primary">
                Full Desktop ERP
              </span>
              <span className="text-[10px] text-muted">
                Access full dense tables, reports & advanced modules
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>

        {/* PWA Install Button */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full p-3.5 rounded-xl bg-surface border border-theme hover:bg-surface2 flex items-center justify-between active:scale-[0.99] transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block text-primary">
                {isInstalled ? 'App Installed on Home Screen' : 'Install Rex Mobile (PWA)'}
              </span>
              <span className="text-[10px] text-muted">
                {isInstalled ? 'Standalone mobile app active' : 'Add icon to home screen for 1-tap app launch'}
              </span>
            </div>
          </div>
          <Download size={16} className="text-emerald-600" />
        </button>
      </div>

      {/* System Health Status */}
      <div className="p-3.5 rounded-xl bg-surface border border-theme space-y-2 shadow-sm">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
          Connectivity & Diagnostics
        </span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary flex items-center gap-1.5">
            <Server size={14} className="text-blue-500" />
            Backend API:
          </span>
          <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> Connected
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary flex items-center gap-1.5">
            <Shield size={14} className="text-purple-500" />
            Security & Auth:
          </span>
          <span className="font-mono text-primary font-medium">
            Active Session
          </span>
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Are you sure you want to log out from Rex Mobile?')) {
            logout();
          }
        }}
        className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 hover:bg-red-500/15 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
      >
        <LogOut size={16} />
        <span>Log Out</span>
      </button>

      {/* Footer Branding */}
      <div className="text-center pt-2">
        <p className="text-[10px] font-mono text-muted uppercase">
          {settings.company_name || 'Rex Industries (Pvt) Ltd'} — Mobile Portal v1.0
        </p>
      </div>
    </div>
  );
};
