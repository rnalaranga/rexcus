import React, { useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { Upload, Image as ImageIcon, Save, Trash2 } from 'lucide-react';

export const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [logo, setLogo] = useState<string | null>(settings.company_logo || null);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ company_logo: logo || '' });
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

        <GlassCard className="p-6 opacity-50 pointer-events-none">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Company Details</h2>
          <div className="space-y-4">
            <p className="text-xs text-muted">Company details for invoices. (Coming soon)</p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Company Name</label>
              <input type="text" disabled className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded" value="REX INDUSTRIES" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
