import React, { useRef, useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { Upload, Image as ImageIcon, Save, Trash2, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { CurrencyManager } from '@/components/CurrencyManager';

export const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [logo, setLogo] = useState<string | null>(settings.company_logo || null);
  const [vatPercent, setVatPercent] = useState<string>(settings.vat_percentage || '18');
  const [saving, setSaving] = useState(false);

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
    if (confirm('This will safely scan and fix missing database tables and columns. No data will be deleted. Proceed?')) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings/fix-db`, { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'} 
        });
        const data = await res.json();
        if (data.success) {
          alert('Database structure fixed successfully!');
        } else {
          alert('Failed to fix DB: ' + data.error);
        }
      } catch (e: any) {
        alert('Error: ' + e.message);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ company_logo: logo || '', vat_percentage: vatPercent });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">System Settings</h1>
          <p className="text-sm text-secondary mt-1">Configure global application preferences and branding.</p>
        </div>
        <Button variant="primary" icon={Save} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <GlassCard className="p-6">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Finance Settings</h2>
          <div className="space-y-4">
            <p className="text-xs text-muted">Configure default tax rates and financial preferences.</p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Global VAT Percentage (%)</label>
              <input 
                type="number" 
                min="0" step="0.01"
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded" 
                value={vatPercent} 
                onChange={(e) => setVatPercent(e.target.value)}
                placeholder="18"
              />
            </div>
          </div>
        </GlassCard>
        
        <div className="col-span-1 md:col-span-2">
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

          <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-4">Database Maintenance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Fix Database Structure</p>
              <p className="text-xs text-muted mt-1">Safely restore missing tables or columns without losing any data. Use this if you encounter database errors.</p>
            </div>
            <Button variant="ghost" onClick={handleFixDb} className="text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20">Fix DB</Button>
          </div>
        </GlassCard>
      </div>
    </div>
    );

};
