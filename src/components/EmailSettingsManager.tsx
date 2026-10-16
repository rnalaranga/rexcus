import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { 
  Mail, Send, Server, KeyRound, Eye, EyeOff, CheckCircle2, 
  AlertCircle, RefreshCw, FileText, HelpCircle, ShieldCheck, 
  ExternalLink, Sparkles, Check
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const EmailSettingsManager: React.FC = () => {
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useDialog();

  // Sender Identity
  const [fromName, setFromName] = useState('Rex Industries (Pvt) Ltd');
  const [fromEmail, setFromEmail] = useState('info@rexgroup.lk');
  const [replyTo, setReplyTo] = useState('info@rexgroup.lk');
  const [defaultBcc, setDefaultBcc] = useState('');

  // SMTP Server Configuration
  const [smtpHost, setSmtpHost] = useState('mail.rexgroup.lk');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('info@rexgroup.lk');
  const [smtpPass, setSmtpPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email Templates
  const [quoteSubject, setQuoteSubject] = useState('Quotation #{number} - Rex Industries (Pvt) Ltd');
  const [quoteBody, setQuoteBody] = useState(
    'Dear {customer_name},\n\nPlease find attached Quotation #{number} from Rex Industries (Pvt) Ltd.\n\nValidity: {validity} Days\nTotal Amount: {total}\n\nIf you have any questions or require revisions, please do not hesitate to contact us.\n\nBest regards,\nRex Industries (Pvt) Ltd\nTel: 0094-31-2233117 / 2233315\nEmail: info@rexgroup.lk'
  );
  const [invoiceSubject, setInvoiceSubject] = useState('Tax Invoice #{number} - Rex Industries (Pvt) Ltd');
  const [invoiceBody, setInvoiceBody] = useState(
    'Dear {customer_name},\n\nPlease find attached Tax Invoice #{number} from Rex Industries (Pvt) Ltd.\n\nTotal Due: {total}\n\nThank you for your valued business. Please arrange payment as per our agreed terms.\n\nBest regards,\nFinance & Accounts Department\nRex Industries (Pvt) Ltd'
  );

  // Testing Connection
  const [testRecipient, setTestRecipient] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'smtp' | 'templates'>('smtp');

  // Load from settings
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.smtp_from_name) setFromName(settings.smtp_from_name);
      else if (settings.company_name) setFromName(settings.company_name);

      if (settings.smtp_from_email) {
        setFromEmail(settings.smtp_from_email);
        if (!testRecipient) setTestRecipient(settings.smtp_from_email);
      } else if (settings.company_email) {
        setFromEmail(settings.company_email);
        if (!testRecipient) setTestRecipient(settings.company_email);
      }

      if (settings.smtp_reply_to) setReplyTo(settings.smtp_reply_to);
      if (settings.smtp_bcc) setDefaultBcc(settings.smtp_bcc);

      if (settings.smtp_host) setSmtpHost(settings.smtp_host);
      if (settings.smtp_port) setSmtpPort(settings.smtp_port);
      if (settings.smtp_secure !== undefined) setSmtpSecure(settings.smtp_secure === 'true' || settings.smtp_port === '465');
      if (settings.smtp_user) setSmtpUser(settings.smtp_user);
      if (settings.smtp_pass) setSmtpPass(settings.smtp_pass);

      if (settings.smtp_quote_subject) setQuoteSubject(settings.smtp_quote_subject);
      if (settings.smtp_quote_body) setQuoteBody(settings.smtp_quote_body);
      if (settings.smtp_invoice_subject) setInvoiceSubject(settings.smtp_invoice_subject);
      if (settings.smtp_invoice_body) setInvoiceBody(settings.smtp_invoice_body);
    }
  }, [settings]);

  // Quick preset helper
  const applyPreset = (preset: 'cpanel' | 'gmail' | 'office365') => {
    if (preset === 'cpanel') {
      setSmtpHost('mail.rexgroup.lk');
      setSmtpPort('465');
      setSmtpSecure(true);
      if (!fromEmail || fromEmail.includes('@gmail.com')) setFromEmail('info@rexgroup.lk');
      if (!smtpUser || smtpUser.includes('@gmail.com')) setSmtpUser('info@rexgroup.lk');
      toast('Applied cPanel / Custom Domain SMTP preset (Port 465 SSL)', 'info');
    } else if (preset === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort('465');
      setSmtpSecure(true);
      toast('Applied Gmail / Google Workspace preset. Note: Use a 16-character Google App Password.', 'info');
    } else if (preset === 'office365') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort('587');
      setSmtpSecure(false);
      toast('Applied Microsoft 365 / Outlook preset (Port 587 STARTTLS)', 'info');
    }
  };

  // Test SMTP Connection and send test email
  const handleTestEmail = async () => {
    const targetEmail = testRecipient.trim() || fromEmail.trim();
    if (!targetEmail) {
      toast('Please enter a recipient email address to send the test email', 'error');
      return;
    }
    if (!smtpHost.trim()) {
      toast('Please enter the SMTP Host server address', 'error');
      return;
    }
    if (!smtpUser.trim()) {
      toast('Please enter your SMTP Username / Authentication email', 'error');
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE}/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          secure: smtpSecure,
          user: smtpUser.trim(),
          pass: smtpPass,
          fromEmail: fromEmail.trim() || smtpUser.trim(),
          fromName: fromName.trim(),
          toEmail: targetEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `SMTP verified successfully! Test email delivered to ${targetEmail}.`
        });
        toast('SMTP connection verified and test email sent!', 'success');
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to authenticate with SMTP server. Please verify host, port, username, and password.'
        });
        toast(data.error || 'SMTP Connection Error', 'error');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while attempting to connect to SMTP server.'
      });
      toast('Failed to reach backend server', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Save all email settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        smtp_from_name: fromName.trim(),
        smtp_from_email: fromEmail.trim(),
        smtp_reply_to: replyTo.trim(),
        smtp_bcc: defaultBcc.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort.trim(),
        smtp_secure: smtpSecure ? 'true' : 'false',
        smtp_user: smtpUser.trim(),
        smtp_pass: smtpPass,
        smtp_quote_subject: quoteSubject.trim(),
        smtp_quote_body: quoteBody,
        smtp_invoice_subject: invoiceSubject.trim(),
        smtp_invoice_body: invoiceBody
      });
      toast('Outgoing Email & Sender Settings saved successfully!', 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to save email settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6 border border-theme-subtle rounded-2xl shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-subtle pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Mail size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              Sender Email & Outgoing Mail Server (SMTP)
              <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold">
                Quotations & Invoices
              </span>
            </h2>
            <p className="text-xs text-muted">
              Configure the sender email address, credentials, and message templates used to deliver quotations, invoices, and notices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex p-1 bg-surface2 rounded-xl border border-theme-subtle text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'smtp'
                  ? 'bg-primary text-surface shadow-xs font-semibold'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <Server size={14} /> Server & Sender
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'templates'
                  ? 'bg-primary text-surface shadow-xs font-semibold'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <FileText size={14} /> Document Templates
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || loading}
            className="text-xs font-bold px-4 py-2"
          >
            {saving ? 'Saving...' : 'Save Email Settings'}
          </Button>
        </div>
      </div>

      {activeTab === 'smtp' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="bg-surface2/40 p-4 rounded-xl border border-theme-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500" /> Quick Provider Presets
                </span>
                <p className="text-[11px] text-muted">Auto-fill recommended host and port configurations for common mail servers.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('cpanel')}
                  className="px-3 py-1.5 bg-surface hover:bg-surface2 border border-theme-subtle rounded-lg text-xs font-medium text-primary transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Server size={13} className="text-blue-500" />
                  cPanel / Company Domain
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('gmail')}
                  className="px-3 py-1.5 bg-surface hover:bg-surface2 border border-theme-subtle rounded-lg text-xs font-medium text-primary transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Mail size={13} className="text-red-500" />
                  Google Workspace / Gmail
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('office365')}
                  className="px-3 py-1.5 bg-surface hover:bg-surface2 border border-theme-subtle rounded-lg text-xs font-medium text-primary transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck size={13} className="text-blue-600" />
                  Microsoft 365
                </button>
              </div>
            </div>
          </div>

          {/* Sender Identity Section */}
          <div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Mail size={14} className="text-blue-500" />
              1. Sender Address & Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Sender Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  placeholder="e.g. Rex Industries (Pvt) Ltd"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-muted mt-0.5">Shown in the client's inbox as the sender name.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Sender Email Address (From) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  placeholder="e.g. info@rexgroup.lk or quotations@rexgroup.lk"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-muted mt-0.5">The official email address shown in the "From" header.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={e => setReplyTo(e.target.value)}
                  placeholder="e.g. info@rexgroup.lk"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-muted mt-0.5">When customers click "Reply", responses are directed here.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Default BCC Email (Optional Archive)
                </label>
                <input
                  type="email"
                  value={defaultBcc}
                  onChange={e => setDefaultBcc(e.target.value)}
                  placeholder="e.g. records@rexgroup.lk"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-muted mt-0.5">Silently sends a copy of all outgoing quotes/invoices to this address.</p>
              </div>
            </div>
          </div>

          {/* SMTP Credentials Section */}
          <div className="border-t border-theme-subtle pt-5">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Server size={14} className="text-blue-500" />
              2. Outgoing SMTP Server Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-secondary mb-1">
                  SMTP Host Server <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  placeholder="e.g. mail.rexgroup.lk or smtp.gmail.com"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-muted mt-0.5">Your mail server hostname provided by your hosting or email provider.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  SMTP Port <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={e => {
                      const val = e.target.value;
                      setSmtpPort(val);
                      if (val === '465') setSmtpSecure(true);
                      else if (val === '587' || val === '25') setSmtpSecure(false);
                    }}
                    placeholder="465"
                    className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-xs text-muted whitespace-nowrap">
                    {smtpPort === '465' ? '(SSL)' : smtpPort === '587' ? '(TLS)' : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Security / Encryption
                </label>
                <select
                  value={smtpSecure ? 'ssl' : 'tls'}
                  onChange={e => setSmtpSecure(e.target.value === 'ssl')}
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="ssl">SSL / TLS (Recommended for Port 465)</option>
                  <option value="tls">STARTTLS / Standard (Recommended for Port 587 / 25)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  SMTP Username / Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  placeholder="e.g. info@rexgroup.lk"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  SMTP Password / App Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono pr-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Connection Section */}
          <div className="border-t border-theme-subtle pt-5 bg-surface2/20 p-4 rounded-xl border">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Send size={14} className="text-emerald-500" />
              3. Test Outgoing Email Connection
            </h3>
            <p className="text-xs text-muted mb-3">
              Send a test message to ensure your credentials, SMTP host, and port are accepting connections and delivering emails properly.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={e => setTestRecipient(e.target.value)}
                  placeholder="Enter recipient email (e.g. your personal email address)"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <Button
                variant="ghost"
                onClick={handleTestEmail}
                disabled={testingConnection}
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap min-w-[160px]"
              >
                <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
                {testingConnection ? 'Testing Connection...' : 'Send Test Email'}
              </Button>
            </div>

            {testResult && (
              <div
                className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold mb-0.5">
                    {testResult.success ? 'SMTP Connection Succeeded!' : 'SMTP Connection Failed'}
                  </div>
                  <div className="text-[11px] leading-relaxed font-mono">
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl text-xs text-muted flex items-start gap-2.5">
            <HelpCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary">Available Template Tags:</span>
              <p className="mt-1">
                Use tags like <code className="bg-surface px-1.5 py-0.5 rounded text-blue-500 font-mono font-bold">{'{number}'}</code>,{' '}
                <code className="bg-surface px-1.5 py-0.5 rounded text-blue-500 font-mono font-bold">{'{customer_name}'}</code>,{' '}
                <code className="bg-surface px-1.5 py-0.5 rounded text-blue-500 font-mono font-bold">{'{total}'}</code>, and{' '}
                <code className="bg-surface px-1.5 py-0.5 rounded text-blue-500 font-mono font-bold">{'{validity}'}</code> to automatically format document details when emailing clients.
              </p>
            </div>
          </div>

          {/* Quotation Template */}
          <div className="space-y-3 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} className="text-purple-500" />
                Quotation Email Template
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email Subject</label>
              <input
                type="text"
                value={quoteSubject}
                onChange={e => setQuoteSubject(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email Message Body</label>
              <textarea
                rows={5}
                value={quoteBody}
                onChange={e => setQuoteBody(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-y"
              />
            </div>
          </div>

          {/* Invoice Template */}
          <div className="space-y-3 bg-surface2/30 p-4 rounded-xl border border-theme-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} className="text-emerald-500" />
                Tax Invoice Email Template
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email Subject</label>
              <input
                type="text"
                value={invoiceSubject}
                onChange={e => setInvoiceSubject(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email Message Body</label>
              <textarea
                rows={5}
                value={invoiceBody}
                onChange={e => setInvoiceBody(e.target.value)}
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
