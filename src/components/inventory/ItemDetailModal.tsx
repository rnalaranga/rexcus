import React, { useState } from 'react'
import { 
  Box, Package, Wrench, Briefcase, Layers, Edit, ExternalLink, 
  MapPin, Barcode as BarcodeIcon, AlertTriangle, 
  CheckCircle2, DollarSign, Truck, Copy, Check, FileText,
  Clock, Hash, Sparkles, Scale, Compass, ShieldCheck
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'

export interface ItemDetailModalProps {
  item: any | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (item: any) => void
  onOpenLedger?: (item: any) => void
  canEdit?: boolean
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onOpenLedger,
  canEdit = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'suppliers' | 'bom' | 'spare_parts'>('overview')

  const sparePartsList = React.useMemo(() => {
    if (!item?.spareParts) return []
    try {
      const parsed = typeof item.spareParts === 'string' ? JSON.parse(item.spareParts) : item.spareParts
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }, [item?.spareParts])
  const [copiedSku, setCopiedSku] = useState(false)

  if (!item) return null

  // Parse specifications
  let specs: any = {}
  try {
    if (item.specifications) {
      specs = typeof item.specifications === 'string' ? JSON.parse(item.specifications) : item.specifications
    }
  } catch (e) {
    specs = {}
  }

  // Parse suppliers
  let suppliersList: string[] = []
  try {
    if (item.suppliers) {
      const parsed = typeof item.suppliers === 'string' ? JSON.parse(item.suppliers) : item.suppliers
      if (Array.isArray(parsed)) suppliersList = parsed
    }
  } catch (e) {}

  // Parse BOMs
  let bomsList: any[] = []
  try {
    if (item.boms) {
      const parsed = typeof item.boms === 'string' ? JSON.parse(item.boms) : item.boms
      if (Array.isArray(parsed)) bomsList = parsed
    }
  } catch (e) {}

  const qty = Number(item.quantity || 0)
  const reorder = Number(item.reorderLevel || 0)
  const isLowStock = item.type !== 'service' && qty <= reorder
  const unitCost = Number(item.unitCost || 0)
  const unitPrice = Number(item.unitPrice || 0)
  const totalValuation = qty * unitCost
  const margin = unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : 0

  const handleCopySku = () => {
    if (!item.sku) return
    navigator.clipboard.writeText(item.sku)
    setCopiedSku(true)
    setTimeout(() => setCopiedSku(false), 2000)
  }

  const getTypeIcon = () => {
    switch (item.type) {
      case 'finished_product': return <Package size={18} className="text-blue-400" />
      case 'service': return <Wrench size={18} className="text-purple-400" />
      case 'company_asset': return <Briefcase size={18} className="text-amber-400" />
      default: return <Box size={18} className="text-emerald-400" />
    }
  }

  const getTypeBadgeVariant = () => {
    switch (item.type) {
      case 'finished_product': return 'info'
      case 'service': return 'warning'
      case 'company_asset': return 'default'
      default: return 'success'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="4xl"
      className="max-w-[95vw] lg:max-w-4xl p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-theme-subtle bg-surface/50">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-surface2 border border-theme flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  getTypeIcon()
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant={getTypeBadgeVariant()} size="sm">
                    {String(item.type || 'raw_material').replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={item.status === 'inactive' ? 'default' : 'success'} size="sm">
                    {String(item.status || 'active').toUpperCase()}
                  </Badge>
                  {isLowStock && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle size={10} /> Low Stock
                    </span>
                  )}
                  {item.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface2 text-secondary border border-theme-subtle">
                      {item.category}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-primary tracking-tight leading-snug">
                  {item.name}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                  {item.sku && (
                    <button
                      type="button"
                      onClick={handleCopySku}
                      className="inline-flex items-center gap-1 font-mono text-secondary hover:text-primary transition-colors bg-surface2/60 px-1.5 py-0.5 rounded border border-theme-subtle"
                      title="Click to copy SKU"
                    >
                      <span>SKU: {item.sku}</span>
                      {copiedSku ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  )}
                  {item.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-muted" /> Bin: <strong className="text-secondary">{item.location}</strong>
                    </span>
                  )}
                  {item.barcode && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <BarcodeIcon size={12} className="text-muted" /> {item.barcode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onOpenLedger && item.type !== 'service' && item.type !== 'company_asset' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Layers}
                  onClick={() => onOpenLedger(item)}
                  title="Inspect detailed stock ledger history"
                >
                  Ledger
                </Button>
              )}
              {canEdit && onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Edit}
                  onClick={() => {
                    onClose()
                    onEdit(item)
                  }}
                >
                  Edit Item
                </Button>
              )}
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-theme-subtle">
            <div className="bg-surface/40 p-3 rounded-lg border border-theme-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                Stock On Hand
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold font-mono ${isLowStock ? 'text-red-400' : 'text-primary'}`}>
                  {item.type === 'service' ? 'N/A' : qty}
                </span>
                {item.type !== 'service' && (
                  <span className="text-xs text-secondary font-medium">{item.uom || 'pcs'}</span>
                )}
              </div>
              {item.type !== 'service' && (
                <span className="text-[10px] text-muted block mt-0.5">
                  Threshold: {reorder} {item.uom || 'pcs'}
                </span>
              )}
            </div>

            <div className="bg-surface/40 p-3 rounded-lg border border-theme-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                Standard Unit Cost
              </span>
              <div className="text-xl font-bold font-mono text-primary">
                {unitCost > 0 ? formatCurrency(unitCost) : '—'}
              </div>
              <span className="text-[10px] text-muted block mt-0.5">
                Total Val: {totalValuation > 0 ? formatCurrency(totalValuation) : '—'}
              </span>
            </div>

            <div className="bg-surface/40 p-3 rounded-lg border border-theme-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                Selling Price
              </span>
              <div className="text-xl font-bold font-mono text-primary">
                {unitPrice > 0 ? formatCurrency(unitPrice) : '—'}
              </div>
              <span className="text-[10px] text-muted block mt-0.5">
                {item.type === 'service' ? `Per ${item.uom || 'hr'}` : 'Base commercial rate'}
              </span>
            </div>

            <div className="bg-surface/40 p-3 rounded-lg border border-theme-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5">
                Gross Margin
              </span>
              <div className={`text-xl font-bold font-mono ${margin >= 20 ? 'text-emerald-400' : margin > 0 ? 'text-amber-400' : 'text-secondary'}`}>
                {unitPrice > 0 && unitCost > 0 ? `${margin.toFixed(1)}%` : '—'}
              </div>
              <span className="text-[10px] text-muted block mt-0.5">
                Markup: {unitCost > 0 && unitPrice > unitCost ? formatCurrency(unitPrice - unitCost) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-theme-subtle bg-surface2/30">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-rex-500 text-rex-500 bg-rex-500/5'
                : 'border-transparent text-muted hover:text-primary hover:border-theme'
            }`}
          >
            Overview & Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'stock'
                ? 'border-rex-500 text-rex-500 bg-rex-500/5'
                : 'border-transparent text-muted hover:text-primary hover:border-theme'
            }`}
          >
            Inventory & Warehouse
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'suppliers'
                ? 'border-rex-500 text-rex-500 bg-rex-500/5'
                : 'border-transparent text-muted hover:text-primary hover:border-theme'
            }`}
          >
            Suppliers
            {suppliersList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-secondary font-mono">
                {suppliersList.length}
              </span>
            )}
          </button>
          {(item.type === 'finished_product' || bomsList.length > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab('bom')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'bom'
                  ? 'border-rex-500 text-rex-500 bg-rex-500/5'
                  : 'border-transparent text-muted hover:text-primary hover:border-theme'
              }`}
            >
              BOM & Components
              {bomsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono">
                  {bomsList.length}
                </span>
              )}
            </button>
          )}
          {(item.type === 'finished_product' || sparePartsList.length > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab('spare_parts')}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'spare_parts'
                  ? 'border-rex-500 text-rex-500 bg-rex-500/5'
                  : 'border-transparent text-muted hover:text-primary hover:border-theme'
              }`}
            >
              <Wrench size={12} className="mr-0.5" />
              Spare Parts
              {sparePartsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-500 font-mono">
                  {sparePartsList.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description & Specifications */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Description & Specifications</h3>
                <div className="p-4 rounded-xl bg-surface/40 border border-theme-subtle text-sm text-secondary leading-relaxed">
                  {item.description ? (
                    <div className="space-y-1.5">
                      {String(item.description)
                        .split('\n')
                        .map(l => l.trim())
                        .filter(Boolean)
                        .map((line, idx) => {
                          const clean = line.startsWith('•') || line.startsWith('-') || line.startsWith('*')
                            ? line.replace(/^[•\-\*]\s*/, '')
                            : line
                          return (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-rex-500 font-bold text-xs mt-0.5 select-none">•</span>
                              <span className="text-primary font-medium">{clean}</span>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <span className="italic text-muted">No description provided for this item.</span>
                  )}
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                  <Compass size={13} className="text-rex-400" />
                  Engineering & Material Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Material Grade</span>
                    <span className="text-sm font-semibold text-primary mt-0.5 block">
                      {specs.grade || item.grade || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Material Shape</span>
                    <span className="text-sm font-semibold text-primary mt-0.5 block">
                      {specs.shape || item.shape || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Dimensions</span>
                    <span className="text-sm font-mono font-semibold text-primary mt-0.5 block">
                      {specs.dimensions || item.dimensions || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Hardness / Temper</span>
                    <span className="text-sm font-semibold text-primary mt-0.5 block">
                      {specs.hardness || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Surface Finish</span>
                    <span className="text-sm font-semibold text-primary mt-0.5 block">
                      {specs.surfaceFinish || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface/30 border border-theme-subtle rounded-lg">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Standard / Specification</span>
                    <span className="text-sm font-mono text-primary mt-0.5 block">
                      {specs.standard || item.standard || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawings & External Resources */}
              {(item.drawingsUrl || item.datasheetUrl) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                    <FileText size={13} className="text-blue-400" />
                    Engineering Drawings & Datasheets
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {item.drawingsUrl && (
                      <a
                        href={item.drawingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink size={13} />
                        View CAD Drawings / Drive Folder
                      </a>
                    )}
                    {item.datasheetUrl && (
                      <a
                        href={item.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink size={13} />
                        Technical Datasheet & Spec PDF
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVENTORY & WAREHOUSE */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Physical Stock Quantity</span>
                  <div className="text-2xl font-bold font-mono text-primary mt-1">
                    {item.type === 'service' ? 'N/A' : qty} {item.uom}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Live balance across warehouse</span>
                </div>

                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Reorder Alert Threshold</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {reorder} {item.uom}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Triggers purchasing reorder alert</span>
                </div>

                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Warehouse Bin Location</span>
                  <div className="text-lg font-bold text-primary mt-1 flex items-center gap-1.5">
                    <MapPin size={16} className="text-rex-400" />
                    {item.location || <span className="text-muted font-normal italic">Unassigned</span>}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Racks, Shelves, or Floor Pallet</span>
                </div>

                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Safety Stock (Buffer)</span>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    {item.safetyStock ? `${item.safetyStock} ${item.uom}` : '—'}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Minimum buffer inventory</span>
                </div>

                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Max Storage Capacity</span>
                  <div className="text-xl font-bold font-mono text-primary mt-1">
                    {item.maxStock ? `${item.maxStock} ${item.uom}` : '—'}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Maximum capacity threshold</span>
                </div>

                <div className="p-4 bg-surface/30 border border-theme-subtle rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Procurement Lead Time</span>
                  <div className="text-xl font-bold text-primary mt-1 flex items-center gap-1">
                    <Clock size={16} className="text-muted" />
                    {item.leadTimeDays ? `${item.leadTimeDays} Days` : '—'}
                  </div>
                  <span className="text-xs text-muted mt-1 block">Standard vendor delivery time</span>
                </div>
              </div>

              {/* Stock Ledger History Link Banner */}
              {onOpenLedger && item.type !== 'service' && item.type !== 'company_asset' && (
                <div className="p-4 rounded-lg bg-rex-500/5 border border-rex-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary">Need Audit Trail & In/Out Movements?</h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Review all historical GRN receipts, production issue slips, manual adjustments, and gate passes.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Layers}
                    onClick={() => onOpenLedger(item)}
                  >
                    Open Stock Ledger
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUPPLIERS */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Associated Suppliers & Vendors ({suppliersList.length})
                </h3>
              </div>

              {suppliersList.length === 0 ? (
                <div className="p-8 text-center bg-surface/20 border border-theme-subtle rounded-lg text-muted text-sm">
                  <Truck size={24} className="mx-auto mb-2 opacity-40" />
                  No suppliers currently mapped to this item.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suppliersList.map((sup, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-surface/30 border border-theme-subtle rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface2 border border-theme-subtle flex items-center justify-center text-muted">
                          <Truck size={14} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-primary block">{sup}</span>
                          <span className="text-[10px] text-muted">Authorized Vendor</span>
                        </div>
                      </div>
                      <Badge variant="outline" size="sm">Active Source</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SPARE PARTS BREAKDOWN */}
          {activeTab === 'spare_parts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Wrench size={13} className="text-amber-500" />
                    Spare Parts & Replacement Components ({sparePartsList.length})
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Individual sellable spare parts configured for this ready-made product.
                  </p>
                </div>
              </div>

              {sparePartsList.length === 0 ? (
                <div className="p-8 text-center bg-surface/20 border border-theme-subtle rounded-lg text-muted text-sm">
                  <Wrench size={24} className="mx-auto mb-2 opacity-40 text-amber-500" />
                  No individual spare parts defined for this product yet.
                </div>
              ) : (
                <div className="border border-theme-subtle rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface2/60 border-b border-theme-subtle">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase text-center w-12">#</th>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase">Part No.</th>
                        <th className="px-4 py-2.5 font-semibold text-muted uppercase">Part Name & Specs</th>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase">SKU</th>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase text-center">Qty / Assy</th>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase text-right">Cost</th>
                        <th className="px-4 py-2.5 font-semibold text-muted uppercase text-right">Selling Price</th>
                        <th className="px-3 py-2.5 font-semibold text-muted uppercase text-center">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {sparePartsList.map((sp: any, idx: number) => {
                        const cost = Number(sp.unitCost || 0)
                        const price = Number(sp.unitPrice || 0)
                        const margin = price > 0 ? ((price - cost) / price) * 100 : 0

                        return (
                          <tr key={idx} className="hover:bg-surface/30 transition-colors">
                            <td className="px-3 py-2.5 font-mono text-muted text-center text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-amber-600">
                              {sp.partNo || `SP-${idx + 1}`}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-primary">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-surface2 border border-theme-subtle flex items-center justify-center overflow-hidden shrink-0 mt-0.5 shadow-xs">
                                  {sp.imageUrl ? (
                                    <img src={sp.imageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Wrench size={14} className="text-amber-500/70" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-primary">{sp.name}</div>
                                  {sp.description && (
                                    <div className="text-[10px] text-muted whitespace-pre-line space-y-0.5 mt-0.5">
                                      {sp.description.split('\n').map((l: string, i: number) => (
                                        <div key={i}>{l}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted">
                              {sp.sku || '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-center text-secondary">
                              {sp.qtyPerAssembly || 1} {sp.uom || 'pcs'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-secondary text-right">
                              {cost > 0 ? formatCurrency(cost) : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">
                              {price > 0 ? formatCurrency(price) : '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-center text-[10px] font-bold">
                              {price > 0 ? (
                                <span className={margin >= 20 ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-red-500'}>
                                  {margin.toFixed(0)}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOM & COMPONENTS */}
          {activeTab === 'bom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Bill of Materials Components ({bomsList.length})
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Components and raw materials consumed in assembling one unit of this product.
                  </p>
                </div>
              </div>

              {bomsList.length === 0 ? (
                <div className="p-8 text-center bg-surface/20 border border-theme-subtle rounded-lg text-muted text-sm">
                  <Package size={24} className="mx-auto mb-2 opacity-40" />
                  No BOM components defined for this finished product.
                </div>
              ) : (
                <div className="border border-theme-subtle rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface2/60 border-b border-theme-subtle">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-muted uppercase">Component</th>
                        <th className="px-4 py-3 font-semibold text-muted uppercase text-right">Qty Needed</th>
                        <th className="px-4 py-3 font-semibold text-muted uppercase text-right">Unit Cost</th>
                        <th className="px-4 py-3 font-semibold text-muted uppercase text-right">Extended Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {bomsList.map((bom: any, idx: number) => {
                        const bomQty = Number(bom.quantity || bom.qty || 1)
                        const bomCost = Number(bom.unitCost || bom.cost || 0)
                        const subtotal = bomQty * bomCost

                        return (
                          <tr key={idx} className="hover:bg-surface/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-primary">
                              {bom.itemName || bom.name || `Component #${idx + 1}`}
                            </td>
                            <td className="px-4 py-3 font-mono text-secondary text-right">
                              {bomQty} {bom.uom || ''}
                            </td>
                            <td className="px-4 py-3 font-mono text-secondary text-right">
                              {bomCost > 0 ? formatCurrency(bomCost) : '—'}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-primary text-right">
                              {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-theme-subtle bg-surface/80 flex items-center justify-between">
          <div className="text-xs text-muted">
            Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '—'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {canEdit && onEdit && (
              <Button
                variant="primary"
                icon={Edit}
                onClick={() => {
                  onClose()
                  onEdit(item)
                }}
              >
                Edit Item
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
