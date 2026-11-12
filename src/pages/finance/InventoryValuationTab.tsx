import React, { useState, useEffect } from 'react';
import { 
  Boxes, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, 
  HelpCircle, Scale, ArrowUpRight, ArrowDownRight, BookOpen, Calendar
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchInventoryValuationSummary, syncInventoryValuation } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

interface ValuationSummary {
  warehouseValuation: number;
  activeItemCount: number;
  totalUnits: number;
  glAssetBalance: number;
  glAccountId: string;
  variance: number;
  isBalanced: boolean;
  lastSync: {
    id: string;
    date: string;
    totalAmount: number;
    description: string;
  } | null;
}

export const InventoryValuationTab: React.FC<{ onSyncComplete?: () => void }> = ({ onSyncComplete }) => {
  const { showConfirm, showError, toast } = useDialog();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<ValuationSummary | null>(null);

  const [syncDate, setSyncDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('Month-End Inventory Valuation Sync (LKAS 2)');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchInventoryValuationSummary();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load inventory valuation summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    if (!data) return;
    if (data.isBalanced || Math.abs(data.variance) < 0.01) {
      toast('Physical warehouse stock and GL Account 1600 are already in sync.', 'info');
      return;
    }

    const varianceFormatted = formatCurrency(Math.abs(data.variance));
    const direction = data.variance > 0 ? 'Surplus (Credit to Direct Material Cost)' : 'Shortage (Debit to Scrap/Shrinkage Loss)';

    const confirmed = await showConfirm(
      `Synchronize General Ledger Account 1600 (Inventory - Raw Materials) with Physical Warehouse Stock?\n\nVariance: ${data.variance > 0 ? '+' : '-'}${varianceFormatted} (${direction})\n\nThis will post an automated journal entry aligning the Balance Sheet without altering existing supplier bills.`,
      'Confirm Inventory Valuation Sync',
      { confirmLabel: 'Sync to GL', cancelLabel: 'Cancel' }
    );

    if (!confirmed) return;

    setSyncing(true);
    try {
      const res = await syncInventoryValuation({
        syncDate,
        notes: notes || 'Month-End Inventory Valuation Sync'
      });

      if (res.success) {
        toast(res.message || 'Inventory valuation synchronized to General Ledger successfully.', 'success');
        await loadData();
        if (onSyncComplete) onSyncComplete();
      } else {
        showError(res.error || 'Failed to sync inventory valuation.', 'Sync Error');
      }
    } catch (err: any) {
      showError(err.message || 'An unexpected error occurred during sync.', 'Error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <GlassCard className="p-4 bg-gradient-to-r from-blue-500/10 via-rex-500/5 to-purple-500/10 border-blue-500/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 mt-0.5">
              <Scale size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                Month-End Inventory Valuation & GL Reconciliation
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  LKAS 2 Compliant
                </Badge>
              </h2>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
                Alphanumeric physical warehouse inventory (quantity × weighted cost) is reconciled with General Ledger 
                <span className="font-semibold text-primary"> Account 1600 (Inventory - Raw Materials)</span>.
                Any variance automatically posts a journal entry (adjusting Direct Material Cost or Scrap Loss) ensuring your Balance Sheet accurately reflects physical assets without disrupting supplier bills or cash flows.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={RefreshCw} 
            onClick={loadData} 
            disabled={loading}
            className="flex-shrink-0 border border-theme-subtle"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </GlassCard>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Physical Warehouse Stock */}
        <GlassCard className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Physical Warehouse Stock</span>
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500">
              <Boxes size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-primary">
              {data ? formatCurrency(data.warehouseValuation) : '...'}
            </div>
            <p className="text-xs text-muted mt-1">
              {data ? `${data.activeItemCount} items (${data.totalUnits} total units in stock)` : 'Calculating inventory...'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-theme-subtle/50 flex items-center justify-between text-[11px] text-muted">
            <span>Source: Active Warehouse Items</span>
            <span className="font-mono">Quantity × Unit Cost</span>
          </div>
        </GlassCard>

        {/* GL Account 1600 Balance */}
        <GlassCard className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">General Ledger (Acc 1600)</span>
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
              <BookOpen size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-primary">
              {data ? formatCurrency(data.glAssetBalance) : '...'}
            </div>
            <p className="text-xs text-muted mt-1">
              Current balance in 1600 - Inventory - Raw Materials
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-theme-subtle/50 flex items-center justify-between text-[11px] text-muted">
            <span>Balance Sheet Asset</span>
            <span className="font-mono">Chart of Accounts</span>
          </div>
        </GlassCard>

        {/* Valuation Variance */}
        <GlassCard className={`p-5 relative overflow-hidden border ${
          !data ? 'border-theme-subtle' :
          data.isBalanced ? 'border-emerald-500/30 bg-emerald-500/5' :
          data.variance > 0 ? 'border-blue-500/30 bg-blue-500/5' :
          'border-rose-500/30 bg-rose-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Variance to Reconcile</span>
            <div className={`p-2 rounded-md ${
              !data ? 'bg-theme-subtle text-muted' :
              data.isBalanced ? 'bg-emerald-500/10 text-emerald-500' :
              data.variance > 0 ? 'bg-blue-500/10 text-blue-500' :
              'bg-rose-500/10 text-rose-500'
            }`}>
              {data?.isBalanced ? (
                <CheckCircle2 size={18} />
              ) : data && data.variance > 0 ? (
                <ArrowUpRight size={18} />
              ) : (
                <ArrowDownRight size={18} />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${
              !data ? 'text-primary' :
              data.isBalanced ? 'text-emerald-600 dark:text-emerald-400' :
              data.variance > 0 ? 'text-blue-600 dark:text-blue-400' :
              'text-rose-600 dark:text-rose-400'
            }`}>
              {data ? `${data.variance > 0 ? '+' : data.variance < 0 ? '-' : ''}${formatCurrency(Math.abs(data.variance))}` : '...'}
            </div>
            <p className="text-xs text-muted mt-1 font-medium">
              {!data ? 'Calculating variance...' :
               data.isBalanced ? '✓ Perfectly Synchronized' :
               data.variance > 0 ? 'Physical Stock Surplus vs GL' :
               'Physical Stock Shortage vs GL'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-theme-subtle/50 flex items-center justify-between text-[11px] text-muted">
            <span>Status</span>
            <span className="font-semibold">
              {data?.isBalanced ? (
                <span className="text-emerald-500">Reconciled</span>
              ) : (
                <span className="text-amber-500">Adjustment Recommended</span>
              )}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Sync Execution Section */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldCheck size={16} className="text-rex-500" />
          Synchronize Valuation to General Ledger
        </h3>
        <p className="text-xs text-muted mb-6 leading-relaxed">
          Posting this adjustment generates an automated Journal Entry (<span className="font-mono text-primary font-semibold">JE-INV-VAL-...</span>).
          {data && data.variance > 0 ? (
            <span> Because physical stock is higher than GL, it debits <strong className="text-primary">1600 (Inventory Asset)</strong> and credits <strong className="text-primary">5100 (Direct Material Cost)</strong>, reducing material expense for the period.</span>
          ) : data && data.variance < 0 ? (
            <span> Because physical stock is lower than GL, it debits <strong className="text-primary">5080 (Inventory Scrap & Shrinkage Loss)</strong> and credits <strong className="text-primary">1600 (Inventory Asset)</strong>.</span>
          ) : (
            <span> Physical stock is already identical to GL Asset 1600. No adjustment is required.</span>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-surface/50 p-4 rounded-lg border border-theme-subtle">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Effective Sync Date</label>
            <input 
              type="date" 
              value={syncDate} 
              onChange={e => setSyncDate(e.target.value)}
              className="w-full input-base"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Journal Audit Reference / Notes</label>
            <input 
              type="text" 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Month-End Stock Valuation Sync"
              className="w-full input-base"
            />
          </div>
          <div>
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={syncing || !data || data.isBalanced || Math.abs(data.variance) < 0.01}
              className={`w-full justify-center ${
                data?.isBalanced 
                  ? 'bg-emerald-600/50 cursor-not-allowed text-white' 
                  : 'bg-rex-600 hover:bg-rex-700 text-white'
              }`}
            >
              {syncing ? 'Synchronizing...' : data?.isBalanced ? '✓ Valuation Balanced' : 'Sync Valuation to GL'}
            </Button>
          </div>
        </div>

        {data?.lastSync && (
          <div className="mt-4 p-3 bg-surface rounded-md border border-theme-subtle flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-rex-500" />
              Latest Inventory Sync Journal: <strong className="text-primary font-mono">{data.lastSync.id}</strong> ({data.lastSync.description})
            </span>
            <span className="font-mono font-medium text-primary">
              {formatDate(data.lastSync.date)} · {formatCurrency(Number(data.lastSync.totalAmount))}
            </span>
          </div>
        )}
      </GlassCard>

      {/* Accounting Workflow Transparency Guide */}
      <GlassCard className="p-5 border border-dashed border-theme-subtle">
        <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
          <HelpCircle size={14} className="text-muted" />
          Financial & Accounting Integrity Guardrails
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted leading-relaxed">
          <div className="p-3 rounded-lg bg-surface/40 border border-theme-subtle/50">
            <p className="font-semibold text-primary mb-1">1. Supplier Bills & Accounts Payable Protected</p>
            <p>
              Your supplier bills continue to charge their selected expense or raw material accounts directly. The valuation sync strictly adjusts closing asset value without touching invoice liabilities or AP sub-ledgers.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-surface/40 border border-theme-subtle/50">
            <p className="font-semibold text-primary mb-1">2. Scrap & Shrinkage Traceability (Acc 5080)</p>
            <p>
              Whenever damaged or obsolete stock is scrapped in the Inventory Stock Ledger, an automated GL debit to <span className="font-semibold text-primary">5080 (Inventory Scrap & Shrinkage Loss)</span> occurs, giving full audit visibility on your P&L.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
