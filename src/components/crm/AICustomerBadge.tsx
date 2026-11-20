import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  UserCheck,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Calendar,
  Bell,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import { AICustomerProfile, CustomerRelationshipTier } from '@/lib/aiCustomerIntelligence';
import { formatCurrency } from '@/lib/utils';

const TIER_STYLES: Record<
  CustomerRelationshipTier,
  {
    badgeCls: string;
    iconBgCls: string;
    accentTextCls: string;
    headerBgCls: string;
    Icon: React.ComponentType<any>;
  }
> = {
  vip_partner: {
    badgeCls:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25',
    iconBgCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    accentTextCls: 'text-emerald-600 dark:text-emerald-400',
    headerBgCls: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30',
    Icon: Award,
  },
  past_buyer: {
    badgeCls:
      'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/25',
    iconBgCls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    accentTextCls: 'text-blue-600 dark:text-blue-400',
    headerBgCls: 'bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/30',
    Icon: UserCheck,
  },
  needs_care: {
    badgeCls:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25',
    iconBgCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    accentTextCls: 'text-amber-600 dark:text-amber-400',
    headerBgCls: 'bg-gradient-to-r from-amber-500/15 via-rose-500/5 to-transparent border-amber-500/30',
    Icon: AlertTriangle,
  },
  new_prospect: {
    badgeCls:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
    iconBgCls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    accentTextCls: 'text-purple-600 dark:text-purple-400',
    headerBgCls: 'bg-gradient-to-r from-purple-500/15 via-indigo-500/5 to-transparent border-purple-500/30',
    Icon: Sparkles,
  },
};

interface AICustomerBadgeProps {
  profile: AICustomerProfile;
  variant?: 'icon' | 'pill';
  onQuickFollowup?: (profile: AICustomerProfile) => void;
  className?: string;
}

export const AICustomerBadge: React.FC<AICustomerBadgeProps> = ({
  profile,
  variant = 'icon',
  onQuickFollowup,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const style = TIER_STYLES[profile.tier];
  const TierIcon = style.Icon;

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popWidth = 340;
    const popHeight = 310;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popWidth - 12);
    }
    let top = rect.bottom + 6;
    if (top + popHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popHeight - 6);
    }
    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updateCoords();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 180);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.ai-customer-popover') && triggerRef.current && !triggerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateCoords();
          setOpen((prev) => !prev);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={`${profile.badgeLabel} — ${profile.sinhalaTag} (${profile.ordersCount} orders, ${formatCurrency(profile.totalSalesRevenue)})`}
        className={`inline-flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
          variant === 'icon'
            ? 'w-5 h-5 rounded-md'
            : 'gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none'
        } ${style.badgeCls} ${className}`}
      >
        <TierIcon size={variant === 'icon' ? 11 : 10} className="shrink-0" />
        {variant === 'pill' && (
          <span className="truncate max-w-[115px]">{profile.shortLabel}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="ai-customer-popover fixed z-[190] w-[340px] max-w-[calc(100vw-24px)] bg-surface border border-theme-subtle rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (closeTimerRef.current) {
                window.clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className={`px-3.5 py-2.5 border-b ${style.headerBgCls} flex items-start justify-between gap-2`}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <TierIcon size={13} className={style.accentTextCls} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${style.accentTextCls}`}>
                    {profile.badgeLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface/90 border border-theme-subtle text-primary">
                    {profile.trustScore}% Trust
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-primary mt-1 leading-snug">
                  {profile.sinhalaTag}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-0.5 text-muted hover:text-primary rounded"
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2.5 text-xs">
              {/* 3-Column Sales Snapshot */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-surface2/60 border border-theme-subtle">
                  <p className="text-[9px] font-bold uppercase text-muted">Past Orders</p>
                  <p className="text-xs font-mono font-bold text-primary mt-0.5">
                    {profile.ordersCount}
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-surface2/60 border border-theme-subtle">
                  <p className="text-[9px] font-bold uppercase text-muted">Past Sales</p>
                  <p className="text-[11px] font-mono font-bold text-rex-600 dark:text-rex-300 mt-0.5 truncate">
                    {formatCurrency(profile.totalSalesRevenue)}
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-surface2/60 border border-theme-subtle">
                  <p className="text-[9px] font-bold uppercase text-muted">Win / Lost</p>
                  <p className="text-xs font-mono font-bold text-primary mt-0.5">
                    <span className="text-emerald-600">{profile.wonLeadsCount}W</span>
                    <span className="text-muted mx-0.5">/</span>
                    <span className="text-rose-500">{profile.lostLeadsCount}L</span>
                  </p>
                </div>
              </div>

              {/* Relationship Summary */}
              <p className="text-[11px] text-secondary leading-relaxed">
                {profile.relationshipSummary}
              </p>

              {/* AI Suggestion Box */}
              <div className="p-2.5 rounded-lg bg-rex-500/8 border border-rex-500/25 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rex-600 dark:text-rex-400">
                  <Sparkles size={11} />
                  <span>AI Sales Suggestion</span>
                </div>
                <p className="text-[11px] text-primary leading-relaxed font-medium">
                  {profile.aiSuggestion}
                </p>
              </div>

              {/* Next Follow-up status */}
              {profile.nextFollowup && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/25 text-[10.5px]">
                  <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 truncate">
                    <Calendar size={11} className="shrink-0" />
                    Next: {String(profile.nextFollowup.dueDate || '').slice(0, 10)} — {profile.nextFollowup.subject}
                  </span>
                </div>
              )}

              {/* Quick Schedule Button */}
              {onQuickFollowup && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onQuickFollowup(profile);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-rex-600 hover:bg-rex-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Zap size={12} />
                  <span>Schedule AI Follow-up ({profile.recommendedFollowup.type.toUpperCase()})</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

interface AICustomerInsightPanelProps {
  profile: AICustomerProfile;
  onApplyFollowup?: (rec: AICustomerProfile['recommendedFollowup']) => void;
  actionLabel?: string;
  compact?: boolean;
}

export const AICustomerInsightPanel: React.FC<AICustomerInsightPanelProps> = ({
  profile,
  onApplyFollowup,
  actionLabel,
  compact = false,
}) => {
  const style = TIER_STYLES[profile.tier];
  const TierIcon = style.Icon;

  return (
    <div className={`border rounded-xl overflow-hidden bg-surface ${style.headerBgCls}`}>
      <div className={`${compact ? 'p-3' : 'p-3.5'} space-y-2.5`}>
        {/* Top Row: Tier Badge + Sinhala Tag + Trust Score */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBgCls}`}>
              <TierIcon size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-bold uppercase tracking-wider ${style.accentTextCls}`}>
                  {profile.badgeLabel}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface border border-theme-subtle text-primary flex items-center gap-1">
                  <ShieldCheck size={10} className="text-emerald-500" />
                  {profile.trustScore}% Trust
                </span>
                {profile.isRegisteredCustomer && profile.matchedCustomerId && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-secondary">
                    {profile.matchedCustomerId}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-primary mt-0.5">
                {profile.sinhalaTag}
              </p>
            </div>
          </div>

          {/* Past Sales Compact Pills */}
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono">
            <span className="px-2 py-0.5 rounded bg-surface border border-theme-subtle text-primary font-bold flex items-center gap-1">
              <ShoppingBag size={10} className="text-rex-500" />
              {profile.ordersCount} Orders
            </span>
            <span className="px-2 py-0.5 rounded bg-surface border border-theme-subtle text-rex-600 dark:text-rex-300 font-bold">
              {formatCurrency(profile.totalSalesRevenue)}
            </span>
          </div>
        </div>

        {!compact && (
          <p className="text-[11px] text-secondary leading-relaxed">
            {profile.relationshipSummary}
          </p>
        )}

        {/* AI Suggestion Banner */}
        <div className="p-2.5 rounded-lg bg-surface/90 border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rex-600 dark:text-rex-400">
              <Sparkles size={11} />
              <span>AI Sales &amp; Follow-up Recommendation</span>
            </div>
            <p className="text-[11.5px] text-primary leading-snug font-medium">
              {profile.aiSuggestion}
            </p>
          </div>
          {onApplyFollowup && (
            <button
              type="button"
              onClick={() => onApplyFollowup(profile.recommendedFollowup)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-rex-600 hover:bg-rex-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Bell size={12} />
              <span>{actionLabel || 'Schedule AI Follow-up'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
