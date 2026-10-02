import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# ── 1. Replace hardcoded state with profile-driven state ──
old_state = """  const [ssclRate, setSsclRate] = useState(2.5);
  const [vatRate, setVatRate] = useState(18.0);
  const [taxEnabled, setTaxEnabled] = useState(true);
  // Keep taxType for DB compat
  const taxType = taxEnabled ? 'vat_sscl' : 'none';"""

new_state = """  const [taxEnabled, setTaxEnabled] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  // Keep taxType for DB compat
  const taxType = taxEnabled && selectedProfileId ? selectedProfileId : 'none';"""

content = content.replace(old_state, new_state)

# ── 2. Replace calculation logic ──
old_calc = """  // Hardcoded selectedProfile for preview compat
  const selectedProfile = taxEnabled ? { tax1_name: 'SSCL', tax1_rate: ssclRate, tax2_name: 'VAT', tax2_rate: vatRate, tax2_compound: false } : null;

  if (taxEnabled) {
    ssclAmount = subtotal * (ssclRate / 100);
    vatAmount = subtotal * (vatRate / 100);
    taxAmount = ssclAmount + vatAmount;
  }"""

new_calc = """  const selectedProfile = (taxEnabled && selectedProfileId)
    ? taxProfiles?.find((p: any) => p.id === selectedProfileId)
    : null;

  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    ssclAmount = subtotal * t1;
    if (selectedProfile.tax2_compound) {
      vatAmount = (subtotal + ssclAmount) * t2;
    } else {
      vatAmount = subtotal * t2;
    }
    taxAmount = ssclAmount + vatAmount;
  }"""

content = content.replace(old_calc, new_calc)

# ── 3. Replace Invoice Summary card tax section ──
old_summary_tax = """                {/* Tax Toggle */}
                <div className="flex items-center gap-2 border-t border-theme-subtle pt-2">
                  <button onClick={() => setTaxEnabled(t => !t)} className={`w-9 h-5 rounded-full transition-colors ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}>
                    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-xs text-muted font-semibold uppercase tracking-widest">Tax</span>
                </div>
                {taxEnabled && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted font-semibold">SSCL</span>
                        <input type="number" min={0} step={0.1} value={ssclRate} onChange={e => setSsclRate(Number(e.target.value))}
                          className="w-14 text-xs bg-surface border border-theme-subtle rounded px-1.5 py-0.5 text-center font-mono outline-none focus:border-blue-500" />
                        <span className="text-xs text-muted">%</span>
                      </div>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted font-semibold">VAT</span>
                        <input type="number" min={0} step={0.1} value={vatRate} onChange={e => setVatRate(Number(e.target.value))}
                          className="w-14 text-xs bg-surface border border-theme-subtle rounded px-1.5 py-0.5 text-center font-mono outline-none focus:border-blue-500" />
                        <span className="text-xs text-muted">%</span>
                      </div>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                )}"""

new_summary_tax = """                {/* Tax Toggle + Profile Picker */}
                <div className="border-t border-theme-subtle pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTaxEnabled(t => !t)} className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${taxEnabled ? 'bg-blue-500' : 'bg-surface2 border border-theme-subtle'}`}>
                      <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${taxEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-xs text-muted font-semibold uppercase tracking-widest">Tax</span>
                  </div>
                  {taxEnabled && (
                    <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
                      className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors">
                      <option value="">— Select Tax Profile —</option>
                      {taxProfiles?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                {taxEnabled && selectedProfile?.tax2_name && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted font-semibold">{selectedProfile.tax1_name} <span className="text-muted font-normal text-xs">({selectedProfile.tax1_rate}%)</span></span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted font-semibold">{selectedProfile.tax2_name} <span className="text-muted font-normal text-xs">({selectedProfile.tax2_rate}%)</span></span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                )}
                {taxEnabled && selectedProfile && !selectedProfile.tax2_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted font-semibold">{selectedProfile.tax1_name} <span className="text-muted font-normal text-xs">({selectedProfile.tax1_rate}%)</span></span>
                    <span className="font-mono text-sm text-amber-500">{formatCurrency(taxAmount)}</span>
                  </div>
                )}"""

content = content.replace(old_summary_tax, new_summary_tax)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Done - tax now reads from Tax Profiles")
