const fs = require('fs');

const file = 'src/pages/inventory/Inventory.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add LayoutGrid and List to lucide-react imports if not already present
if (!content.includes('LayoutGrid')) {
  content = content.replace(
    "import { Plus, Search, Filter, Package, Wrench, Edit, Trash2, ArrowLeft, Info, DollarSign, Truck, Save, X, Download, Upload, Box, Briefcase, Building2, User, Phone, FileText, Printer, Send, CheckCircle, Calendar, ExternalLink, Layers, ShoppingCart, Image as ImageIcon } from 'lucide-react'",
    "import { Plus, Search, Filter, Package, Wrench, Edit, Trash2, ArrowLeft, Info, DollarSign, Truck, Save, X, Download, Upload, Box, Briefcase, Building2, User, Phone, FileText, Printer, Send, CheckCircle, Calendar, ExternalLink, Layers, ShoppingCart, Image as ImageIcon, LayoutGrid, List } from 'lucide-react'"
  );
}

// 2. Add fgViewMode state right after finishedSubTab
if (!content.includes('fgViewMode')) {
  content = content.replace(
    "const [finishedSubTab, setFinishedSubTab] = useState<'products' | 'orders'>('products')",
    "const [finishedSubTab, setFinishedSubTab] = useState<'products' | 'orders'>('products')\n  const [fgViewMode, setFgViewMode] = useState<'grid' | 'table'>('grid')"
  );
}

// 3. Update the Finished Goods Sub-navigation to include view mode toggle and summary stats
const oldSubNav = `<div className="flex flex-wrap items-center justify-between gap-3 bg-surface2/40 p-2.5 rounded-lg border border-theme-subtle">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFinishedSubTab('products')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 \${finishedSubTab === 'products' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}\`}
              >
                <Package size={14} /> Ready-Made Products ({inventory.filter(i => isItemFinishedProduct(i.type)).length})
              </button>
              <button
                type="button"
                onClick={() => setFinishedSubTab('orders')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 \${finishedSubTab === 'orders' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}\`}
              >
                <ShoppingCart size={14} /> Customer Orders ({fgOrders.length})
              </button>
            </div>

            <div className="text-xs text-muted flex items-center gap-2">
              <span>
                {finishedSubTab === 'products'
                  ? 'Standard ready-made products with multi-BOM cost rollups and Google Drive CAD drawings.'
                  : 'Track customer product orders, delivery deadlines, and one-click stock dispatch.'}
              </span>
            </div>
          </div>`;

const newSubNav = `<div className="flex flex-wrap items-center justify-between gap-3 bg-surface2/40 p-2.5 rounded-xl border border-theme-subtle shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFinishedSubTab('products')}
                className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 \${finishedSubTab === 'products' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}\`}
              >
                <Package size={14} /> Ready-Made Products ({inventory.filter(i => isItemFinishedProduct(i.type)).length})
              </button>
              <button
                type="button"
                onClick={() => setFinishedSubTab('orders')}
                className={\`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 \${finishedSubTab === 'orders' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}\`}
              >
                <ShoppingCart size={14} /> Customer Orders ({fgOrders.length})
              </button>
            </div>

            {finishedSubTab === 'products' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium hidden sm:inline">View:</span>
                <div className="flex items-center bg-surface border border-theme-subtle rounded-lg p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setFgViewMode('grid')}
                    className={\`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 \${fgViewMode === 'grid' ? 'bg-rex-600 text-white shadow-xs' : 'text-muted hover:text-primary'}\`}
                    title="Grid Card View"
                  >
                    <LayoutGrid size={14} />
                    <span className="text-[11px] font-semibold pr-1">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFgViewMode('table')}
                    className={\`p-1.5 rounded-md text-xs transition-all flex items-center gap-1 \${fgViewMode === 'table' ? 'bg-rex-600 text-white shadow-xs' : 'text-muted hover:text-primary'}\`}
                    title="Detailed Table View"
                  >
                    <List size={14} />
                    <span className="text-[11px] font-semibold pr-1">Table</span>
                  </button>
                </div>
              </div>
            )}
          </div>`;

content = content.replace(oldSubNav, newSubNav);

// 4. Update the finished_product render area to support the beautiful Card Grid
const oldFinishedTable = `) : activeTab === 'finished_product' ? (
            <DataTable 
              columns={finishedProductColumns} 
              data={filteredData} 
              keyExtractor={(item: any) => item.id} 
              pagination 
              itemsPerPage={50} 
            />
          ) : (`;

const newFinishedGrid = `) : activeTab === 'finished_product' ? (
            fgViewMode === 'grid' ? (
              <div className="p-6">
                {filteredData.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface2 border border-theme-subtle flex items-center justify-center mx-auto text-muted/50 mb-3">
                      <Package size={32} />
                    </div>
                    <h3 className="text-sm font-bold text-primary">No finished products found</h3>
                    <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                      Create your ready-made standard components with quotation-grade BOMs, drawings, and price rollups.
                    </p>
                    <Button
                      variant="primary"
                      icon={Plus}
                      size="sm"
                      onClick={() => {
                        setSelectedFinishedProduct(null)
                        setFinishedProductModalOpen(true)
                      }}
                      className="mt-4"
                    >
                      Add First Ready-Made Product
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredData.map((item: any) => {
                      let bomCount = 0
                      try {
                        const parsed = typeof item.boms === 'string' ? JSON.parse(item.boms) : item.boms
                        if (Array.isArray(parsed)) bomCount = parsed.length
                      } catch (e) {}

                      const qty = Number(item.quantity || 0)
                      const reorder = Number(item.reorderLevel || 0)
                      const isLow = qty <= reorder
                      const price = Number(item.unitPrice || 0)
                      const cost = Number(item.unitCost || 0)
                      const margin = price > 0 ? ((price - cost) / price) * 100 : 0

                      return (
                        <div
                          key={item.id}
                          className="group relative bg-surface border border-theme-subtle hover:border-rex-500/50 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                        >
                          {/* Accent Top Border */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rex-600 via-rex-500 to-indigo-600 opacity-80" />

                          <div className="space-y-4">
                            {/* Card Header: Thumbnail + Title & Tags */}
                            <div className="flex items-start gap-3.5">
                              <div className="w-16 h-16 rounded-xl bg-surface2 border border-theme-subtle flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={26} className="text-muted/60" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-rex-600 bg-rex-500/10 px-2 py-0.5 rounded border border-rex-500/20">
                                    {item.category || 'Standard Part'}
                                  </span>
                                  {item.sku && (
                                    <span className="text-[10px] font-mono text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">
                                      {item.sku}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-sm text-primary group-hover:text-rex-600 transition-colors mt-1 truncate" title={item.name}>
                                  {item.name}
                                </h3>
                                <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-relaxed">
                                  {item.description || 'No description added.'}
                                </p>
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 bg-surface2/30 p-3 rounded-xl border border-theme-subtle/60">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-muted block">Stock in Hand</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className={\`text-base font-mono font-bold \${isLow ? 'text-red-500' : 'text-primary'}\`}>
                                    {qty}
                                  </span>
                                  <span className="text-[10px] text-muted font-medium">{item.uom || 'pcs'}</span>
                                  {isLow && (
                                    <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1 py-0.2 rounded ml-1">
                                      Low
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] uppercase font-bold text-muted block">BOM Rollup Cost</span>
                                <span className="text-sm font-mono font-bold text-primary mt-0.5 block">
                                  {cost > 0 ? formatCurrency(cost) : '-'}
                                </span>
                              </div>

                              <div className="pt-1.5 border-t border-theme-subtle/50 col-span-2 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted block">Selling Price</span>
                                  <span className="text-sm font-mono font-bold text-rex-600 block">
                                    {price > 0 ? formatCurrency(price) : 'Unpriced'}
                                  </span>
                                </div>
                                {price > 0 && cost > 0 && (
                                  <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-muted block">Gross Margin</span>
                                    <span className={\`text-xs font-mono font-bold \${margin >= 20 ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-red-500'}\`}>
                                      {margin.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Links & Sub-meta */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={bomCount > 0 ? 'info' : 'default'} size="sm" className="font-semibold">
                                  <Layers size={11} className="mr-1 inline" />
                                  {bomCount} {bomCount === 1 ? 'BOM' : 'BOMs'}
                                </Badge>
                                {item.location && (
                                  <span className="text-[10px] text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">
                                    Bin: {item.location}
                                  </span>
                                )}
                              </div>

                              {item.drawingsUrl && (
                                <a
                                  href={item.drawingsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1 hover:underline"
                                  title="Open CAD / Drawings in Google Drive"
                                >
                                  <ExternalLink size={12} /> Drawings
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-theme-subtle">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Layers}
                              onClick={() => {
                                setSelectedFinishedProduct(item)
                                setFinishedProductModalOpen(true)
                              }}
                              className="text-xs font-semibold h-8 text-rex-600 hover:text-rex-700 bg-rex-600/10 hover:bg-rex-600/20 flex-1 justify-center"
                            >
                              BOMs & Pricing
                            </Button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFinishedProduct(item)
                                  setFinishedProductModalOpen(true)
                                }}
                                className="p-2 hover:bg-surface2 rounded-lg text-muted hover:text-primary transition-colors border border-theme-subtle"
                                title="Edit Product"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-muted hover:text-red-500 transition-colors border border-theme-subtle"
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <DataTable 
                columns={finishedProductColumns} 
                data={filteredData} 
                keyExtractor={(item: any) => item.id} 
                pagination 
                itemsPerPage={50} 
              />
            )
          ) : (`;

content = content.replace(oldFinishedTable, newFinishedGrid);

fs.writeFileSync(file, content, 'utf8');
console.log('Inventory.tsx redesign successfully applied!');
