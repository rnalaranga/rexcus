const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf8');

// Add vat state
content = content.replace(
  "const [logo, setLogo] = useState<string | null>(settings.company_logo || null);",
  "const [logo, setLogo] = useState<string | null>(settings.company_logo || null);\n  const [vatPercent, setVatPercent] = useState<string>(settings.vat_percentage || '18');"
);

// Update save
content = content.replace(
  "await updateSettings({ company_logo: logo || '' });",
  "await updateSettings({ company_logo: logo || '', vat_percentage: vatPercent });"
);

// Enable the second card and change it to Finance Settings
content = content.replace(
  `<GlassCard className="p-6 opacity-50 pointer-events-none">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Company Details</h2>
          <div className="space-y-4">
            <p className="text-xs text-muted">Company details for invoices. (Coming soon)</p>
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Company Name</label>
              <input type="text" disabled className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary text-sm rounded" value="REX INDUSTRIES" />
            </div>
          </div>
        </GlassCard>`,
  `<GlassCard className="p-6">
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
        </GlassCard>`
);

fs.writeFileSync('src/pages/admin/Settings.tsx', content, 'utf8');