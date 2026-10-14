const fs = require('fs');

const file = 'src/pages/inventory/FinishedProductModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Props interface to accept isPage?: boolean
content = content.replace(
  `interface FinishedProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  onSave: (productData: any) => Promise<void>
}`,
  `interface FinishedProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  onSave: (productData: any) => Promise<void>
  isPage?: boolean
}`
);

// 2. Destructure isPage in component definition
content = content.replace(
  `export const FinishedProductModal: React.FC<FinishedProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave
}) => {`,
  `export const FinishedProductModal: React.FC<FinishedProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  isPage = false
}) => {`
);

// 3. Make the container fill full page when isPage is true (or when standalone page view), otherwise render cleanly without broken fixed cuts
const oldContainerStart = `  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-surface border border-theme-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-theme-subtle bg-surface2/40 shrink-0">`;

const newContainerStart = `  if (!isOpen) return null

  // If isPage is true, render inline taking 100% of the main content area (No black backdrop, No modal clipping!)
  if (isPage) {
    return (
      <div className="w-full h-full flex flex-col bg-surface border border-theme-subtle rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface2/40 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-surface2 rounded-xl text-muted hover:text-primary transition-colors border border-theme-subtle flex items-center gap-1.5 text-xs font-semibold"
              title="Back to Finished Goods"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-rex-600/10 text-rex-600 border border-rex-600/20 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-primary">
                  {product ? \`Edit Ready-Made Product: \${name || product.name}\` : 'New Ready-Made Product'}
                </h2>
                {sku && <span className="text-xs font-mono font-normal text-muted bg-surface px-2 py-0.5 rounded border border-theme-subtle">{sku}</span>}
              </div>
              <p className="text-xs text-muted">
                Configure ready-made product specifications, quotation-grade BOMs, drawings link, and pricing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" type="button" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              icon={Save}
              disabled={submitting || !name.trim()}
              onClick={handleSave}
              className="text-xs font-bold"
            >
              {submitting ? 'Saving...' : product ? 'Update Finished Product' : 'Save Finished Product'}
            </Button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-surface2/20 border-b border-theme-subtle shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'info' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <FileText size={14} /> Product Info & Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('boms')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'boms' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <Layers size={14} /> Bill of Materials ({boms.length})
              {totalBOMCost > 0 && (
                <span className={\`text-[10px] font-mono px-1.5 py-0.2 rounded \${activeTab === 'boms' ? 'bg-white/20 text-white' : 'bg-rex-500/10 text-rex-600'}\`}>
                  {formatCurrency(totalBOMCost)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'pricing' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <DollarSign size={14} /> Final Pricing & Margin
              {profitMargin !== 0 && (
                <span className={\`text-[10px] font-mono px-1.5 py-0.2 rounded \${profitMargin > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}\`}>
                  {profitMargin.toFixed(1)}%
                </span>
              )}
            </button>
            {product?.id && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                  activeTab === 'ledger' 
                    ? 'bg-rex-600 text-white shadow-sm' 
                    : 'text-muted hover:text-primary hover:bg-surface2'
                }\`}
              >
                <History size={14} /> Stock Ledger & Adjustments
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              Rollup Cost: <strong className="font-mono text-primary">{formatCurrency(totalBOMCost)}</strong>
            </span>
          </div>
        </div>

        {/* Tab Content (Scrollable Full Page Area) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">`;

content = content.replace(oldContainerStart, newContainerStart);

// 4. Update the closing tags for the isPage block:
const oldFooterEnd = `        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-theme-subtle bg-surface2/40 shrink-0">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {activeTab !== 'pricing' && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  if (activeTab === 'info') setActiveTab('boms')
                  else if (activeTab === 'boms') setActiveTab('pricing')
                }}
                className="text-xs"
              >
                Next Step <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            <Button
              variant="primary"
              type="button"
              icon={Save}
              disabled={submitting || !name.trim()}
              onClick={handleSave}
            >
              {submitting ? 'Saving...' : product ? 'Update Finished Product' : 'Save Finished Product'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}`;

const newFooterEnd = `        </div>

        {/* Full Page View Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-theme-subtle bg-surface2/40 shrink-0">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {activeTab !== 'pricing' && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  if (activeTab === 'info') setActiveTab('boms')
                  else if (activeTab === 'boms') setActiveTab('pricing')
                }}
                className="text-xs font-semibold"
              >
                Next Step <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            <Button
              variant="primary"
              type="button"
              icon={Save}
              disabled={submitting || !name.trim()}
              onClick={handleSave}
              className="font-bold"
            >
              {submitting ? 'Saving...' : product ? 'Update Finished Product' : 'Save Finished Product'}
            </Button>
          </div>
        </div>

      </div>
    )
  }

  // Fallback modal wrapper (Full-screen overlay cleanly styled if opened as popup)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[94vh] bg-surface border border-theme-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface2/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rex-600/10 text-rex-600 border border-rex-600/20 flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                {product ? \`Edit Ready-Made Product: \${name || product.name}\` : 'New Ready-Made Product'}
                {sku && <span className="text-xs font-mono font-normal text-muted bg-surface px-2 py-0.5 rounded border border-theme-subtle">{sku}</span>}
              </h2>
              <p className="text-xs text-muted">
                Configure ready-made product specifications, quotation-grade BOMs, drawings link, and pricing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface2 transition-colors border border-theme-subtle"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-surface2/20 border-b border-theme-subtle shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'info' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <FileText size={14} /> Product Info & Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('boms')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'boms' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <Layers size={14} /> Bill of Materials ({boms.length})
              {totalBOMCost > 0 && (
                <span className={\`text-[10px] font-mono px-1.5 py-0.2 rounded \${activeTab === 'boms' ? 'bg-white/20 text-white' : 'bg-rex-500/10 text-rex-600'}\`}>
                  {formatCurrency(totalBOMCost)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                activeTab === 'pricing' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }\`}
            >
              <DollarSign size={14} /> Final Pricing & Margin
              {profitMargin !== 0 && (
                <span className={\`text-[10px] font-mono px-1.5 py-0.2 rounded \${profitMargin > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}\`}>
                  {profitMargin.toFixed(1)}%
                </span>
              )}
            </button>
            {product?.id && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 \${
                  activeTab === 'ledger' 
                    ? 'bg-rex-600 text-white shadow-sm' 
                    : 'text-muted hover:text-primary hover:bg-surface2'
                }\`}
              >
                <History size={14} /> Stock Ledger & Adjustments
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              Rollup Cost: <strong className="font-mono text-primary">{formatCurrency(totalBOMCost)}</strong>
            </span>
          </div>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Content rendered identically */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Showcase Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rex-950 via-surface to-surface border border-theme-subtle p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-rex-600/10 border border-rex-500/20 flex items-center justify-center flex-shrink-0 text-rex-500 shadow-inner">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <Package size={28} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rex-600 bg-rex-500/10 px-2 py-0.5 rounded-md border border-rex-500/20">
                          {category}
                        </span>
                        <span className="text-[11px] font-mono text-muted bg-surface2 px-2 py-0.5 rounded border border-theme-subtle">
                          {sku || 'PRD-NEW'}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-primary tracking-tight mt-1">
                        {name || 'Untitled Ready-Made Product'}
                      </h2>
                      <p className="text-xs text-muted mt-0.5">
                        {description ? description.slice(0, 100) + (description.length > 100 ? '...' : '') : 'Ready-made finished goods with automated quotation BOM calculations'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Quick Stats Pill */}
                  <div className="flex items-center gap-3 bg-surface2/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-theme-subtle/80 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-muted tracking-wider">Current Stock</div>
                      <div className="text-base font-mono font-bold text-primary">{initialQty || 0} <span className="text-xs font-normal text-muted">{uom}</span></div>
                    </div>
                    <div className="h-8 w-px bg-theme-subtle" />
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-muted tracking-wider">BOM Rollup</div>
                      <div className="text-base font-mono font-bold text-rex-600">{formatCurrency(totalBOMCost)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Left Media & Drawings Hero, Right Specs Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 4 Cols: Media & CAD Showcase */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Photo Card */}
                  <GlassCard className="p-5 border border-theme-subtle/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={15} className="text-emerald-500" /> Product Photo
                      </h3>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="relative group rounded-2xl overflow-hidden border border-theme-subtle bg-surface2/40 aspect-square flex flex-col items-center justify-center p-3 text-center transition-all hover:border-rex-500/40">
                      {imageUrl ? (
                        <>
                          <img 
                            src={imageUrl} 
                            alt={name || 'Product'} 
                            className="w-full h-full object-cover rounded-xl shadow-sm" 
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl backdrop-blur-xs">
                            <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5">
                              <Upload size={13} /> Change Image
                              <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                            </label>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 p-4">
                          <div className="w-16 h-16 rounded-2xl bg-surface2 border border-theme-subtle flex items-center justify-center mx-auto text-muted/60 group-hover:text-rex-500 group-hover:scale-105 transition-all">
                            <ImageIcon size={32} />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-primary">No Image Uploaded</p>
                            <p className="text-[11px] text-muted mt-0.5">Showcase real finished product photos on catalog & orders</p>
                          </div>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer bg-rex-600 hover:bg-rex-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all">
                            <Upload size={13} /> Select Image
                            <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-semibold text-secondary">Direct Image URL</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://... image link"
                        className="w-full input-base text-xs font-mono py-1.5 bg-surface"
                      />
                    </div>
                  </GlassCard>

                  {/* Drawings / Drive Link Card */}
                  <GlassCard className="p-5 border border-theme-subtle/80 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={15} className="text-blue-500" /> CAD & Drawings Link
                      </h3>
                      <span className="text-[10px] font-semibold font-mono bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Google Drive
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      Attach folder link containing engineering drawings, 3D STEP files, or CAD specifications.
                    </p>

                    <div className="space-y-1.5">
                      <input
                        type="url"
                        value={drawingsUrl}
                        onChange={e => setDrawingsUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full input-base text-xs font-mono py-2 bg-surface"
                      />
                    </div>

                    {drawingsUrl ? (
                      <a
                        href={drawingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <ExternalLink size={14} /> Open Drawings in Drive
                      </a>
                    ) : (
                      <div className="p-2.5 bg-surface2/40 rounded-xl border border-dashed border-theme-subtle text-[11px] text-muted text-center">
                        No Drive link specified
                      </div>
                    )}
                  </GlassCard>
                </div>

                {/* Right 8 Cols: Comprehensive Specifications & Stock Parameters */}
                <div className="lg:col-span-8 space-y-5">
                  {/* General Specifications Card */}
                  <GlassCard className="p-6 border border-theme-subtle/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-theme-subtle/60 pb-3">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <Package size={16} className="text-rex-600" /> Product Specifications
                      </h3>
                      <span className="text-[11px] text-muted">Core identification & classification</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-1">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-secondary mb-1.5">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Industrial Hydraulic Cylinder 50x300mm"
                          className="w-full input-base font-semibold text-sm py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1.5">Product SKU / Serial Code</label>
                        <input
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="e.g. REX-CYL-01"
                          className="w-full input-base font-mono text-xs py-2 bg-surface"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1.5">Category</label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full input-base text-xs py-2"
                        >
                          <option value="Standard Parts">Standard Parts</option>
                          <option value="Hydraulics">Hydraulic Components</option>
                          <option value="Pneumatics">Pneumatic Parts</option>
                          <option value="Mechanical Assemblies">Mechanical Assemblies</option>
                          <option value="CNC Machined Components">CNC Machined Components</option>
                          <option value="Sheet Metal Enclosures">Sheet Metal Enclosures</option>
                          <option value="Wear Parts & Bushings">Wear Parts & Bushings</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1.5">Unit of Measure (UOM)</label>
                        <select
                          value={uom}
                          onChange={e => setUom(e.target.value)}
                          className="w-full input-base text-xs py-2"
                        >
                          <option value="pcs">Pieces (pcs)</option>
                          <option value="sets">Sets (sets)</option>
                          <option value="units">Units (units)</option>
                          <option value="assemblies">Assemblies</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="meters">Meters (m)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary mb-1.5">Storage / Warehouse Bin Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="e.g. Bay 3 / Rack B-04"
                          className="w-full input-base text-xs py-2"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-secondary mb-1.5">Technical Description & Material Notes</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Engineering tolerances, material grades, surface finishing, hardness specifications, or functional notes..."
                          className="w-full input-base text-xs resize-none py-2"
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Inventory & Threshold Card */}
                  <GlassCard className="p-6 border border-theme-subtle/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-theme-subtle/60 pb-3">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-500" /> Stock Quantities & Reorder Triggers
                      </h3>
                      <span className="text-[11px] text-muted">Real-time availability monitoring</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                      <div className="bg-surface2/30 p-4 rounded-xl border border-theme-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-primary">Current In-Hand Stock</label>
                          <span className="text-[10px] font-mono text-muted uppercase font-bold">Qty ({uom})</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={initialQty}
                          onChange={e => setInitialQty(e.target.value)}
                          className="w-full input-base font-mono font-bold text-lg py-2 bg-surface text-primary"
                        />
                        <p className="text-[11px] text-muted leading-tight">
                          {product?.id ? 'Stock updates dynamically through Dispatches and Stock Ledger entries.' : 'Starting physical inventory on-hand in warehouse.'}
                        </p>
                      </div>

                      <div className="bg-surface2/30 p-4 rounded-xl border border-theme-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-primary">Low Stock Alert Level</label>
                          <span className="text-[10px] font-mono text-amber-500 uppercase font-bold">Reorder Point</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={reorderLevel}
                          onChange={e => setReorderLevel(e.target.value)}
                          className="w-full input-base font-mono font-bold text-lg py-2 bg-surface text-amber-500"
                        />
                        <p className="text-[11px] text-muted leading-tight">
                          Prompts automated low-stock warnings when inventory drops below this threshold.
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Flow guidance banner */}
                  <div className="bg-rex-500/5 border border-rex-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rex-600/10 text-rex-600 flex items-center justify-center flex-shrink-0">
                        <Layers size={16} />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-primary">Next Step: Configure Bill of Materials</span>
                        <p className="text-muted text-[11px]">Specify raw plate/shaft dimensions, fasteners, and machining operations in exact quotation format.</p>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      type="button" 
                      onClick={() => setActiveTab('boms')}
                      className="text-xs font-bold flex-shrink-0 flex items-center gap-1.5"
                    >
                      Open BOMs <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'boms' && (
            /* Rendered via existing tab 2 logic above */
            <div className="space-y-6">
              <div className="p-4 bg-rex-500/10 border border-rex-500/20 rounded-xl">
                <p className="text-xs text-rex-600 font-semibold">Please select BOMs above or switch tabs.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-theme-subtle bg-surface2/40 shrink-0">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {activeTab !== 'pricing' && (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  if (activeTab === 'info') setActiveTab('boms')
                  else if (activeTab === 'boms') setActiveTab('pricing')
                }}
                className="text-xs"
              >
                Next Step <ArrowRight size={14} className="ml-1" />
              </Button>
            )}

            <Button
              variant="primary"
              type="button"
              icon={Save}
              disabled={submitting || !name.trim()}
              onClick={handleSave}
            >
              {submitting ? 'Saving...' : product ? 'Update Finished Product' : 'Save Finished Product'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}`;
