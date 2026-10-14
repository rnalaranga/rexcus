const fs = require('fs');

const replacement = `          {/* TAB 1: PRODUCT INFO & MEDIA (REDESIGNED) */}
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
          )}`;

const file = 'src/pages/inventory/FinishedProductModal.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

// Find line 564 index (563) and line 792 index (791)
const startIdx = lines.findIndex(l => l.includes('{/* TAB 1: PRODUCT INFO & MEDIA */}'));
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes('{/* TAB 2: MULTI-BOM BUILDER')) {
    endIdx = i;
    break;
  }
}

console.log('startIdx:', startIdx, 'endIdx:', endIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const before = lines.slice(0, startIdx).join('\n');
  const after = lines.slice(endIdx).join('\n');
  fs.writeFileSync(file, before + '\n' + replacement + '\n\n' + after, 'utf8');
  console.log('Successfully updated FinishedProductModal.tsx!');
} else {
  console.error('Could not locate indices');
}
