import React, { useRef, useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { Upload, Image as ImageIcon, Save, Trash2, Cpu, HardDrive, MemoryStick, Wrench, Building2 } from 'lucide-react';
import { CurrencyManager } from '@/components/CurrencyManager';
import { useDialog } from '@/components/ui/DialogProvider';
import { TaxManager } from '@/components/TaxManager';
export const Settings = () => {
  const { toast, showConfirm } = useDialog();
  const { settings, updateSettings } = useSettings();
  const [logo, setLogo] = useState<string | null>(settings.company_logo || null);
  const [saving, setSaving] = useState(false);
  const [fixingDb, setFixingDb] = useState(false);

  const [formData, setFormData] = useState({
    company_name: 'Rex Industries (Pvt) Ltd',
    company_tin: '114106470-7000',
    company_address: 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka',
    company_phone: '0094-31-2233117 / 2233315',
    company_email: 'info@rexgroup.lk',
    company_svat: 'SVAT003857',
    company_web: 'www.rexgroup.lk'
  });

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (settings.company_logo !== undefined) {
        setLogo(settings.company_logo || null);
      }
      setFormData({
        company_name: settings.company_name || settings.companyName || settings.name || 'Rex Industries (Pvt) Ltd',
        company_tin: settings.company_tin || settings.tin || settings.company_vat || settings.companyVat || settings.vat || '114106470-7000',
        company_address: settings.company_address || settings.companyAddress || settings.address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka',
        company_phone: settings.company_phone || settings.companyPhone || settings.phone || '0094-31-2233117 / 2233315',
        company_email: settings.company_email || settings.companyEmail || settings.email || 'info@rexgroup.lk',
        company_svat: settings.company_svat || settings.svat || 'SVAT003857',
        company_web: settings.company_web || settings.web || 'www.rexgroup.lk'
      });
    }
  }, [settings]);

  const [sysStats, setSysStats] = useState<any>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats`)
      .then(res => res.json())
      .then(data => setSysStats(data))
      .catch(console.error);
      
    // Update every 10 seconds
    const interval = setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats`)
        .then(res => res.json())
        .then(data => setSysStats(data))
        .catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  
  const handleFixDb = async () => {
    if (await showConfirm('This will safely scan and synchronize missing database tables and columns (including Customer Samples, Gate Passes, Supplier Registration & VAT, Supplier Ledger & Payables, and Accounting fields). No data will be deleted. Proceed?', 'Fix Database Structure', { confirmLabel: 'Proceed' })) {
      setFixingDb(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings/fix-db`, { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'} 
        });
        const data = await res.json();
        if (data.success) {
          toast(data.message || 'Database structure fixed successfully!', 'success');
        } else {
          toast('Failed to fix DB: ' + data.error, 'error');
        }
      } catch (e: any) {
        toast('Error: ' + e.message, 'error');
      } finally {
        setFixingDb(false);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ 
        company_logo: logo || '',
        company_name: formData.company_name,
        companyName: formData.company_name,
        name: formData.company_name,
        company_tin: formData.company_tin,
        tin: formData.company_tin,
        company_vat: formData.company_tin,
        companyVat: formData.company_tin,
        vat: formData.company_tin,
        company_address: formData.company_address,
        companyAddress: formData.company_address,
        address: formData.company_address,
        company_phone: formData.company_phone,
        companyPhone: formData.company_phone,
        phone: formData.company_phone,
        company_email: formData.company_email,
        companyEmail: formData.company_email,
        email: formData.company_email,
        company_svat: formData.company_svat,
        svat: formData.company_svat,
        company_web: formData.company_web,
        web: formData.company_web
      });
      toast('Settings saved successfully!', 'success');
    } catch (e: any) {
      toast('Failed to save settings: ' + (e.message || 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">System Settings</h1>
          <p className="text-sm text-secondary mt-1">Configure global application preferences, company profile, and invoice branding.</p>
        </div>
        <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Profile & Tax Details */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-rex-500" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Company & Tax Profile</h2>
          </div>
          <p className="text-xs text-muted mb-4">Official business address, TIN, and contact info displayed on Tax Invoices and Quotations.</p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Company / Supplier Name</label>
              <input 
                type="text"
                value={formData.company_name}
                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Rex Industries (Pvt) Ltd"
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
                  Supplier's TIN / VAT <span className="text-rex-500">*</span>
                </label>
                <input 
                  type="text"
                  value={formData.company_tin}
                  onChange={e => setFormData({ ...formData, company_tin: e.target.value })}
                  placeholder="e.g. 114106470-7000"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all font-mono font-bold"
                />
                <p className="text-[10px] text-muted mt-0.5">Appears as Supplier's TIN on Tax Invoices</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">SVAT No. (Optional)</label>
                <input 
                  type="text"
                  value={formData.company_svat}
                  onChange={e => setFormData({ ...formData, company_svat: e.target.value })}
                  placeholder="e.g. SVAT003857"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
                Company Address <span className="text-rex-500">*</span>
              </label>
              <textarea 
                rows={3}
                value={formData.company_address}
                onChange={e => setFormData({ ...formData, company_address: e.target.value })}
                placeholder="e.g. No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka"
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all resize-y"
              />
              <p className="text-[10px] text-muted mt-0.5">Appears under Supplier's Address on Tax Invoices</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Telephone No.</label>
                <input 
                  type="text"
                  value={formData.company_phone}
                  onChange={e => setFormData({ ...formData, company_phone: e.target.value })}
                  placeholder="e.g. 0094-31-2233117 / 2233315"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email"
                  value={formData.company_email}
                  onChange={e => setFormData({ ...formData, company_email: e.target.value })}
                  placeholder="e.g. info@rexgroup.lk"
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Website</label>
              <input 
                type="text"
                value={formData.company_web}
                onChange={e => setFormData({ ...formData, company_web: e.target.value })}
                placeholder="e.g. www.rexgroup.lk"
                className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-xs text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              />
            </div>
          </div>
        </GlassCard>

        {/* Branding & Logo */}
        <GlassCard className="p-6">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Branding & Logo</h2>
          <div className="space-y-4">
            <p className="text-xs text-muted">Upload your company logo. This will be displayed on the sidebar and in PDF documents like invoices and quotations. (Max 2MB)</p>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-theme-subtle rounded-xl p-8 bg-surface/30">
              {logo ? (
                <div className="relative group">
                  <img src={logo} alt="Company Logo" className="max-h-32 object-contain rounded" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <button 
                      onClick={() => setLogo(null)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove Logo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 bg-rex-500/10 text-rex-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ImageIcon size={24} />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-1">No logo uploaded</p>
                  <p className="text-xs text-muted mb-4">PNG, JPG or SVG</p>
                  <Button variant="ghost" className="text-xs" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                    Browse Files
                  </Button>
                </div>
              )}
            </div>
            
            {logo && (
              <div className="flex justify-center">
                <Button variant="ghost" className="text-xs" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                  Change Logo
                </Button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange} 
            />
          </div>
        </GlassCard>

        <div className="col-span-1 md:col-span-2 space-y-6">
          <TaxManager />
          <CurrencyManager />
        </div>
      
        
        <GlassCard className="p-6 col-span-1 md:col-span-2 border-blue-500/30">
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">Server Resources (Live)</h2>
          {sysStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="text-blue-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">CPU Usage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.cpu.percent}%</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(sysStats.cpu.percent, 100)}%` }}></div>
                </div>
              </div>

              {/* RAM */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick className="text-purple-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">RAM Usage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.ram.percent.toFixed(1)}%</span>
                  <span className="text-xs font-mono text-muted mb-1">{formatBytes(sysStats.ram.used)} / {formatBytes(sysStats.ram.total)}</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(sysStats.ram.percent, 100)}%` }}></div>
                </div>
              </div>

              {/* Storage */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="text-emerald-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Storage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.storage.percent.toFixed(1)}%</span>
                  <span className="text-xs font-mono text-muted mb-1">{formatBytes(sysStats.storage.used)} / {formatBytes(sysStats.storage.total)}</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(sysStats.storage.percent, 100)}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-theme-subtle rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-theme-subtle rounded"></div>
                  <div className="h-4 bg-theme-subtle rounded w-5/6"></div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 col-span-1 md:col-span-2 border-emerald-500/30">

          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Database Maintenance</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Fix & Synchronize Database Structure</p>
              <p className="text-xs text-muted mt-1">Safely restore and synchronize missing tables or columns (Gate Passes, Customer Samples, Supplier VAT & Multi-Contacts, Supplier Ledger & Payables, and Accounting fields) without losing any existing data. Use this if you encounter database schema errors.</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleFixDb} 
              disabled={fixingDb}
              className="text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap min-w-[120px] flex items-center justify-center gap-2 font-medium"
            >
              <Wrench className={`w-4 h-4 ${fixingDb ? 'animate-spin' : ''}`} />
              {fixingDb ? 'Fixing DB...' : 'Fix DB'}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
    );

};
