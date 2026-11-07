import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { 
  Cloud, Server, KeyRound, Eye, EyeOff, CheckCircle2, 
  AlertCircle, RefreshCw, Database, ExternalLink, ShieldCheck, 
  ArrowUpRight, HardDrive, Check, Sparkles
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/utils';

const API_BASE = getApiBaseUrl();

export const R2StorageSettingsManager: React.FC = () => {
  const { toast, showConfirm } = useDialog();

  const [enabled, setEnabled] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [hasExistingSecret, setHasExistingSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [bucketName, setBucketName] = useState('rexcus-storage');
  const [publicUrl, setPublicUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // Fetch current R2 settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/settings/r2`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(Boolean(data.enabled));
        setAccountId(data.accountId || '');
        setAccessKeyId(data.accessKeyId || '');
        setBucketName(data.bucketName || 'rexcus-storage');
        setPublicUrl(data.publicUrl || '');
        setHasExistingSecret(Boolean(data.hasSecret));
        if (data.hasSecret) {
          setSecretAccessKey('••••••••••••••••••••••••••••••••');
        }
      }
    } catch (err) {
      console.error('Failed to load R2 settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (enabled && (!accountId.trim() || !accessKeyId.trim() || !bucketName.trim())) {
      toast('Please enter Account ID, Access Key ID, and Bucket Name before enabling.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/r2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          accountId: accountId.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.includes('•') ? undefined : secretAccessKey.trim(),
          bucketName: bucketName.trim(),
          publicUrl: publicUrl.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        toast('Cloudflare R2 settings saved successfully!', 'success');
        fetchSettings();
      } else {
        toast('Failed to save settings: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      toast('Error saving R2 settings: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accountId.trim() || !accessKeyId.trim() || !bucketName.trim()) {
      toast('Please fill in Account ID, Access Key ID, and Bucket Name first.', 'error');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/r2/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.includes('•') ? undefined : secretAccessKey.trim(),
          bucketName: bucketName.trim(),
          publicUrl: publicUrl.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast('R2 Connection Verified Successfully!', 'success');
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to connect' });
        toast('R2 Connection Failed: ' + (data.error || ''), 'error');
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Network error' });
      toast('Error connecting to R2: ' + e.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleMigrateFiles = async () => {
    const ok = await showConfirm(
      'This will safely scan the database for existing Base64 files (Customer PO attachments, company logo, drawings), upload them to your Cloudflare R2 bucket, and replace the heavy Base64 data with lean cloud URLs.\n\nOnly successfully verified uploads will be updated. No data will be deleted or harmed. Proceed?',
      'Migrate Existing Files to Cloudflare R2',
      { confirmLabel: 'Start Migration' }
    );

    if (!ok) return;

    setMigrating(true);
    setMigrationResult(null);
    try {
      toast('Scanning database and migrating files to Cloudflare R2...', 'info');
      const res = await fetch(`${API_BASE}/settings/r2/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (data.success) {
        setMigrationResult(data);
        toast(data.message || 'Migration completed successfully!', 'success');
      } else {
        toast('Migration failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      toast('Migration error: ' + e.message, 'error');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <GlassCard className="p-6 col-span-1 xl:col-span-12 border-sky-500/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-none">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                Cloudflare R2 / S3 Object Storage
              </h2>
              {enabled && accountId && bucketName ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <Check size={10} /> Active & Enabled
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Local Fallback Mode
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Zero-egress cloud storage for customer PO documents, invoices, work order drawings, and attachments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-primary">
            <input 
              type="checkbox" 
              checked={enabled} 
              onChange={e => setEnabled(e.target.checked)} 
              className="w-4 h-4 text-sky-600 rounded cursor-pointer"
            />
            Enable Cloudflare R2
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Account ID & Bucket Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
              Cloudflare Account ID <span className="text-rex-500">*</span>
            </label>
            <input 
              type="text"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder="e.g. 8f6b43a912c74e..."
              className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono focus:border-sky-500 outline-none"
            />
            <p className="text-[10px] text-muted mt-0.5">Found on Cloudflare Dashboard URL or right sidebar under "Account ID".</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
              R2 Bucket Name <span className="text-rex-500">*</span>
            </label>
            <input 
              type="text"
              value={bucketName}
              onChange={e => setBucketName(e.target.value)}
              placeholder="e.g. rexcus-storage"
              className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono font-semibold focus:border-sky-500 outline-none"
            />
            <p className="text-[10px] text-muted mt-0.5">The exact name of the bucket you created in Cloudflare R2.</p>
          </div>
        </div>

        {/* Row 2: Access Key ID & Secret Access Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
              R2 Access Key ID <span className="text-rex-500">*</span>
            </label>
            <input 
              type="text"
              value={accessKeyId}
              onChange={e => setAccessKeyId(e.target.value)}
              placeholder="e.g. 7d8904e223f1..."
              className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono focus:border-sky-500 outline-none"
            />
            <p className="text-[10px] text-muted mt-0.5">Generated via Cloudflare R2 &gt; "Manage R2 API Tokens".</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
              R2 Secret Access Key <span className="text-rex-500">*</span>
            </label>
            <div className="relative">
              <input 
                type={showSecret ? 'text' : 'password'}
                value={secretAccessKey}
                onChange={e => setSecretAccessKey(e.target.value)}
                placeholder="Enter secret access key"
                className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 pr-10 text-xs text-primary font-mono focus:border-sky-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              {hasExistingSecret ? 'Key is safely stored. Re-enter only to change.' : 'Never shared publicly.'}
            </p>
          </div>
        </div>

        {/* Row 3: Public Base URL */}
        <div>
          <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
            Public Base URL (Optional but Recommended)
          </label>
          <input 
            type="text"
            value={publicUrl}
            onChange={e => setPublicUrl(e.target.value)}
            placeholder="e.g. https://pub-xxxxxxxx.r2.dev or https://files.rexgroup.lk"
            className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-2 text-xs text-primary font-mono focus:border-sky-500 outline-none"
          />
          <p className="text-[10px] text-muted mt-0.5">
            Cloudflare R2 Bucket &gt; Settings &gt; Public Access &gt; "R2.dev subdomain" URL (allows direct one-click document opening in browser tabs).
          </p>
        </div>

        {/* Test Result Message Box */}
        {testResult && (
          <div className={`p-3 border text-xs flex items-start gap-2 animate-fade-in ${
            testResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}>
            {testResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? 'Connection Succeeded' : 'Connection Failed'}</p>
              <p className="text-[11px] mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Migration Result Box */}
        {migrationResult && (
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-200 text-xs flex items-start gap-2 animate-fade-in">
            <Sparkles size={16} className="text-sky-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Migration Finished</p>
              <p className="text-[11px] mt-0.5">{migrationResult.message}</p>
              {migrationResult.errors && migrationResult.errors.length > 0 && (
                <div className="mt-2 text-[10px] text-rose-500 space-y-0.5">
                  <p className="font-bold">Items skipped due to errors:</p>
                  {migrationResult.errors.map((err: string, i: number) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-theme-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !accountId.trim() || !accessKeyId.trim()}
              className="text-xs border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>

            <Button
              variant="outline"
              onClick={handleMigrateFiles}
              disabled={migrating || !hasExistingSecret && !secretAccessKey.trim()}
              className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
            >
              <HardDrive className={`w-3.5 h-3.5 ${migrating ? 'animate-spin' : ''}`} />
              {migrating ? 'Migrating Files...' : 'Migrate Existing Files to R2'}
            </Button>
          </div>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white min-w-[130px]"
          >
            {saving ? 'Saving...' : 'Save Storage Settings'}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};
