import React, { useState, useEffect, useMemo } from 'react'
import { 
  ArrowLeft, Save, Info, DollarSign, Package, Truck, Layers, Wrench, 
  FileText, CheckCircle2, AlertTriangle, ShieldCheck, Barcode as BarcodeIcon, 
  ExternalLink, Sparkles, Scale, RefreshCw, X, Plus, Image as ImageIcon, MapPin, 
  Hash, Tag, Compass, FileCheck
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

export interface ItemFormStudioProps {
  initialItem?: any | null
  defaultType?: 'raw_material' | 'finished_product' | 'service' | 'company_asset'
  suppliersList: any[]
  onSave: (itemData: any, addAnother?: boolean) => Promise<void>
  onCancel: () => void
}

const CATEGORIES = [
  'Raw Metals & Alloys',
  'Plates & Sheets',
  'Round & Hex Bars',
  'Pipes & Hollow Tubes',
  'Fasteners & Hardware',
  'Tools, Inserts & Cutters',
  'Electrical & Automation',
  'Hydraulics & Pneumatics',
  'Bearings & Bushings',
  'Chemicals, Lubricants & Paints',
  'Packaging & Shipping',
  'Machining & Fabrication Service',
  'General Maintenance Supplies'
]

const SUB_CATEGORIES: Record<string, string[]> = {
  'Raw Metals & Alloys': ['Stainless Steel (SS)', 'Mild Steel (MS)', 'Carbon & Alloy Steel', 'Tool & Die Steel', 'Aluminum Alloys', 'Brass & Bronze', 'Copper', 'Cast Iron'],
  'Plates & Sheets': ['MS Plate', 'SS Plate', 'Aluminum Sheet', 'Shim Stock', 'Chequered Plate'],
  'Round & Hex Bars': ['MS Bright Round', 'SS Bright Round', 'EN8 Round', 'EN24 Round', 'Brass Hex', 'SS Hex'],
  'Pipes & Hollow Tubes': ['Seamless Steel Tube', 'SS Sanitary Pipe', 'Square Hollow Section', 'Rectangular Tube'],
  'Fasteners & Hardware': ['Hex Bolts & Nuts', 'Socket Head Cap Screws', 'Washers & Circlips', 'Studs & Threaded Rods'],
  'Tools, Inserts & Cutters': ['CNC Milling Inserts', 'Carbide End Mills', 'Lathe Turning Tools', 'Drill Bits', 'Taps & Dies'],
  'Electrical & Automation': ['Sensors & Switches', 'Motors & Drives', 'Relays & Contactors', 'Wiring & Cables'],
  'Hydraulics & Pneumatics': ['Hydraulic Fittings', 'Pneumatic Cylinders', 'Valves & Manifolds', 'Hoses & Tubing'],
  'Bearings & Bushings': ['Deep Groove Ball Bearings', 'Tapered Roller Bearings', 'Linear Bearings', 'Bronze Bushings'],
  'Chemicals, Lubricants & Paints': ['Cutting Coolant', 'Hydraulic Oil (ISO 68/46)', 'Epoxy Primer & Paints', 'Grease & Anti-Seize'],
  'Machining & Fabrication Service': ['CNC Turning Service', 'CNC Milling Service', 'Surface Grinding', 'Wire EDM Cutting', 'TIG/MIG Welding', 'Sheet Metal Bending', 'Heat Treatment']
}

const MATERIAL_GRADES = [
  'SS 304', 'SS 316', 'SS 316L', 'SS 410', 'SS 420',
  'MS IS-2062', 'EN8 / 080M40', 'EN19', 'EN24', 'EN31',
  'D2 Tool Steel', 'H13 Die Steel', 'C45 Carbon Steel',
  'Aluminum 6061-T6', 'Aluminum 7075', 'Brass CW614N', 'Phosphor Bronze',
  'Delrin / POM', 'Nylon 66', 'PTFE (Teflon)'
]

const MATERIAL_SHAPES = [
  'Round Bar',
  'Hexagonal Bar',
  'Square Bar',
  'Plate / Sheet',
  'Hollow Pipe / Tube',
  'Angle Bar',
  'Flat Bar',
  'Component / Custom'
]

const UOMS = [
  { value: 'pcs', label: 'Pieces (Pcs)' },
  { value: 'kg', label: 'Kilograms (Kg)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'sheet', label: 'Sheets' },
  { value: 'feet', label: 'Feet (ft)' },
  { value: 'ltr', label: 'Liters (Ltr)' },
  { value: 'hr', label: 'Hours (Hr - Labor/Machining)' },
  { value: 'set', label: 'Sets' },
  { value: 'job', label: 'Per Job' }
]

export const ItemFormStudio: React.FC<ItemFormStudioProps> = ({
  initialItem = null,
  defaultType = 'raw_material',
  suppliersList = [],
  onSave,
  onCancel
}) => {
  const isEditing = !!initialItem?.id

  // Active sub-tab in studio
  const [activeStudioTab, setActiveStudioTab] = useState<'general' | 'specs' | 'stock' | 'pricing' | 'suppliers' | 'quality'>('general')

  // Parse existing specifications if object or string
  let parsedSpecs: any = {}
  try {
    if (initialItem?.specifications) {
      parsedSpecs = typeof initialItem.specifications === 'string' 
        ? JSON.parse(initialItem.specifications) 
        : initialItem.specifications
    }
  } catch (e) {
    parsedSpecs = {}
  }

  // Parse existing suppliers
  let parsedSuppliers: string[] = []
  try {
    if (initialItem?.suppliers) {
      parsedSuppliers = typeof initialItem.suppliers === 'string' 
        ? JSON.parse(initialItem.suppliers) 
        : initialItem.suppliers
    }
  } catch (e) {
    parsedSuppliers = []
  }

  // Form State
  const [formData, setFormData] = useState({
    type: initialItem?.type || defaultType,
    name: initialItem?.name || '',
    sku: initialItem?.sku || '',
    barcode: initialItem?.barcode || '',
    category: initialItem?.category || (defaultType === 'service' ? 'Machining & Fabrication Service' : 'Raw Metals & Alloys'),
    subCategory: initialItem?.subCategory || '',
    description: initialItem?.description || '',
    status: initialItem?.status || 'active',

    // Material & Engineering Specs
    materialGrade: parsedSpecs.materialGrade || initialItem?.materialGrade || '',
    materialShape: parsedSpecs.materialShape || initialItem?.materialShape || 'Round Bar',
    dimDiameter: parsedSpecs.dimDiameter || '',
    dimThickness: parsedSpecs.dimThickness || '',
    dimWidth: parsedSpecs.dimWidth || '',
    dimLength: parsedSpecs.dimLength || '',
    dimWallThickness: parsedSpecs.dimWallThickness || '',
    surfaceFinish: parsedSpecs.surfaceFinish || 'Cold Drawn / Bright',
    toleranceClass: parsedSpecs.toleranceClass || 'Commercial (±0.1mm)',
    density: parsedSpecs.density || '7.85', // g/cm3 standard steel
    unitWeight: parsedSpecs.unitWeight || '',

    // Inventory & Warehouse
    quantity: initialItem?.quantity !== undefined ? String(initialItem.quantity) : '0',
    uom: initialItem?.uom || (defaultType === 'service' ? 'hr' : 'pcs'),
    location: initialItem?.location || '',
    warehouseZone: parsedSpecs.warehouseZone || 'Main Raw Material Yard',
    reorderLevel: initialItem?.reorderLevel !== undefined ? String(initialItem.reorderLevel) : '10',
    safetyStock: initialItem?.safetyStock !== undefined ? String(initialItem.safetyStock) : '5',
    maxStock: initialItem?.maxStock !== undefined ? String(initialItem.maxStock) : '1000',
    reorderBatchQty: initialItem?.reorderBatchQty !== undefined ? String(initialItem.reorderBatchQty) : '50',

    // Pricing & Margins
    unitCost: initialItem?.unitCost !== undefined ? String(initialItem.unitCost) : '',
    unitPrice: initialItem?.unitPrice !== undefined ? String(initialItem.unitPrice) : '',
    taxRate: parsedSpecs.taxRate || '18', // Standard 18% VAT

    // Suppliers & Procurement
    preferredSupplier: initialItem?.preferredSupplier || '',
    supplierPartNo: initialItem?.supplierPartNo || '',
    leadTimeDays: initialItem?.leadTimeDays !== undefined ? String(initialItem.leadTimeDays) : '7',
    suppliers: Array.isArray(parsedSuppliers) ? parsedSuppliers : [],

    // Quality & Files
    imageUrl: initialItem?.imageUrl || '',
    drawingsUrl: initialItem?.drawingsUrl || '',
    qcRequired: parsedSpecs.qcRequired !== undefined ? !!parsedSpecs.qcRequired : true,
    handlingNotes: parsedSpecs.handlingNotes || ''
  })

  const [submitting, setSubmitting] = useState(false)

  // Auto-generate standard SKU helper
  const handleAutoGenerateSku = () => {
    let prefix = 'RM'
    if (formData.type === 'finished_product') prefix = 'PRD'
    else if (formData.type === 'service') prefix = 'SRV'
    else if (formData.type === 'company_asset') prefix = 'AST'

    const catShort = formData.category.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN'
    const rnd = Math.floor(1000 + Math.random() * 9000)
    const genSku = `${prefix}-${catShort}-${rnd}`
    setFormData(prev => ({ ...prev, sku: genSku, barcode: genSku }))
  }

  // Live Theoretical Weight Calculation Helper
  const calcTheoreticalWeight = () => {
    const d = parseFloat(formData.dimDiameter)
    const t = parseFloat(formData.dimThickness)
    const w = parseFloat(formData.dimWidth)
    const l = parseFloat(formData.dimLength) || 1000 // default 1 meter
    const density = parseFloat(formData.density) || 7.85 // g/cm3

    if (formData.materialShape === 'Round Bar' && d > 0) {
      // Volume = pi * (d/2)^2 * l (all in mm) -> mm3 to cm3 is / 1000 -> * density / 1000 is kg
      const radiusCm = (d / 10) / 2
      const lengthCm = l / 10
      const volumeCm3 = Math.PI * radiusCm * radiusCm * lengthCm
      const weightKg = (volumeCm3 * density) / 1000
      setFormData(prev => ({ ...prev, unitWeight: weightKg.toFixed(3) }))
    } else if (formData.materialShape === 'Hexagonal Bar' && d > 0) {
      // Hex area = (3*sqrt(3)/2) * (s^2) where distance across flats is d -> s = d / sqrt(3)
      const dCm = d / 10
      const lengthCm = l / 10
      const areaCm2 = (Math.sqrt(3) / 2) * dCm * dCm
      const volumeCm3 = areaCm2 * lengthCm
      const weightKg = (volumeCm3 * density) / 1000
      setFormData(prev => ({ ...prev, unitWeight: weightKg.toFixed(3) }))
    } else if ((formData.materialShape === 'Plate / Sheet' || formData.materialShape === 'Flat Bar') && t > 0 && w > 0) {
      const tCm = t / 10
      const wCm = w / 10
      const lengthCm = l / 10
      const volumeCm3 = tCm * wCm * lengthCm
      const weightKg = (volumeCm3 * density) / 1000
      setFormData(prev => ({ ...prev, unitWeight: weightKg.toFixed(3) }))
    }
  }

  // Live Margin & Markup Calculations
  const cost = parseFloat(formData.unitCost) || 0
  const price = parseFloat(formData.unitPrice) || 0
  const profit = price - cost
  const marginPct = price > 0 ? (profit / price) * 100 : 0
  const markupPct = cost > 0 ? (profit / cost) * 100 : 0

  // Handle Form Submission
  const handleSaveInternal = async (addAnother: boolean = false) => {
    if (!formData.name.trim()) {
      alert('Item name is required.')
      return
    }

    setSubmitting(true)
    try {
      const specificationsObject = {
        materialGrade: formData.materialGrade,
        materialShape: formData.materialShape,
        dimDiameter: formData.dimDiameter,
        dimThickness: formData.dimThickness,
        dimWidth: formData.dimWidth,
        dimLength: formData.dimLength,
        dimWallThickness: formData.dimWallThickness,
        surfaceFinish: formData.surfaceFinish,
        toleranceClass: formData.toleranceClass,
        density: formData.density,
        unitWeight: formData.unitWeight,
        warehouseZone: formData.warehouseZone,
        taxRate: formData.taxRate,
        qcRequired: formData.qcRequired,
        handlingNotes: formData.handlingNotes
      }

      const payload = {
        id: initialItem?.id || `INV-${Date.now().toString().slice(-6)}`,
        type: formData.type,
        name: formData.name.trim(),
        sku: formData.sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: formData.barcode.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        status: formData.status,
        quantity: formData.type === 'service' ? 0 : Number(formData.quantity || 0),
        uom: formData.uom,
        location: formData.location,
        reorderLevel: Number(formData.reorderLevel || 0),
        safetyStock: Number(formData.safetyStock || 0),
        maxStock: Number(formData.maxStock || 0),
        reorderBatchQty: Number(formData.reorderBatchQty || 0),
        unitCost: Number(formData.unitCost || 0),
        unitPrice: Number(formData.unitPrice || 0),
        preferredSupplier: formData.preferredSupplier,
        supplierPartNo: formData.supplierPartNo,
        leadTimeDays: Number(formData.leadTimeDays || 0),
        suppliers: JSON.stringify(formData.suppliers),
        specifications: JSON.stringify(specificationsObject),
        imageUrl: formData.imageUrl,
        drawingsUrl: formData.drawingsUrl
      }

      await onSave(payload, addAnother)

      if (addAnother) {
        setFormData(prev => ({
          ...prev,
          name: '',
          sku: '',
          barcode: '',
          quantity: '0',
          unitCost: '',
          unitPrice: '',
          description: ''
        }))
        setActiveStudioTab('general')
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Sticky Studio Top Navigation Header */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border border-theme-subtle rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={onCancel}
            type="button"
            className="text-xs font-semibold"
          >
            Back to Inventory
          </Button>

          <div className="h-5 w-px bg-theme-subtle hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight">
                {isEditing ? `Edit Item: ${initialItem.name}` : 'New Inventory Item Studio'}
              </h1>
              {formData.sku && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                  {formData.sku}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              {formData.type === 'raw_material' ? 'Industrial Raw Material & Engineering Stock' :
               formData.type === 'finished_product' ? 'Manufactured Finished Good / Assembly' :
               formData.type === 'service' ? 'Machining Operation / Labor Service' : 'Fixed Asset & Machinery'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            type="button" 
            onClick={onCancel} 
            className="text-xs"
          >
            Cancel
          </Button>

          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={submitting}
              onClick={() => handleSaveInternal(true)}
              className="text-xs font-semibold border border-theme-subtle hidden sm:flex"
            >
              Save & Add Another
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Save}
            disabled={submitting}
            onClick={() => handleSaveInternal(false)}
            className="text-xs font-bold px-4"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Item' : 'Save Item to Stock'}
          </Button>
        </div>
      </div>

      {/* Studio Category Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface2/50 rounded-xl border border-theme-subtle overflow-x-auto custom-scrollbar">
        {[
          { id: 'general', label: '1. Identification & Type', icon: Info },
          { id: 'specs', label: '2. Engineering & Material Specs', icon: Compass, hide: formData.type === 'service' },
          { id: 'stock', label: '3. Inventory & Bin Location', icon: Package, hide: formData.type === 'service' },
          { id: 'pricing', label: '4. Pricing, Cost & Margins', icon: DollarSign },
          { id: 'suppliers', label: '5. Suppliers & Procurement', icon: Truck },
          { id: 'quality', label: '6. Drawings & Quality Notes', icon: FileCheck }
        ].filter(t => !t.hide).map(tab => {
          const Icon = tab.icon
          const isActive = activeStudioTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStudioTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive 
                  ? 'bg-surface text-primary border border-theme-subtle shadow-xs font-bold' 
                  : 'text-muted hover:text-primary hover:bg-surface2/40'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-rex-600' : 'text-muted'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Studio Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns (Main Configuration Panes) */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: GENERAL IDENTIFICATION */}
          {activeStudioTab === 'general' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Info size={16} className="text-rex-600"/> Item Classification & Identity
                  </h2>
                  <span className="text-[11px] text-muted font-mono">STEP 1 OF 6</span>
                </div>

                <div className="space-y-5">
                  {/* Item Classification Type Pill Selector */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-2">Item Domain Type <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'raw_material', label: 'Raw Material', desc: 'Bars, plates, fasteners', icon: Layers },
                        { id: 'finished_product', label: 'Finished Product', desc: 'Ready goods, BOM assemblies', icon: Package },
                        { id: 'service', label: 'Machining / Service', desc: 'Labor hours, job rates', icon: Wrench },
                        { id: 'company_asset', label: 'Company Asset', desc: 'Machines, tools, equipment', icon: Tag }
                      ].map(t => {
                        const Icon = t.icon
                        const isSel = formData.type === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: t.id as any })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSel 
                                ? 'bg-rex-500/10 border-rex-500/40 text-primary shadow-xs ring-1 ring-rex-500/30' 
                                : 'bg-surface2/30 border-theme-subtle text-muted hover:border-theme hover:bg-surface2/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs mb-1">
                              <Icon size={14} className={isSel ? 'text-rex-600' : 'text-muted'} />
                              <span className={isSel ? 'text-primary' : 'text-secondary'}>{t.label}</span>
                            </div>
                            <p className="text-[10px] text-muted">{t.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Item Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">
                      Item Full Descriptive Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full input-base text-sm font-semibold"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Stainless Steel Hex Shaft 32mm x 1000mm (SS304)"
                    />
                    <p className="text-[10px] text-muted mt-1">Specify material grade, shape, and key dimensions for easy workshop search.</p>
                  </div>

                  {/* SKU & Barcode Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-secondary">
                          SKU / Item Code <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoGenerateSku}
                          className="text-[11px] text-rex-600 hover:underline flex items-center gap-1 font-bold"
                        >
                          <Sparkles size={11}/> Auto-Gen SKU
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full input-base font-mono text-xs uppercase"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g. RM-HEX-SS304-032"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Barcode / Scan Code (EAN/QR)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full input-base font-mono text-xs pl-8"
                          value={formData.barcode}
                          onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                          placeholder="Barcode or Serial string..."
                        />
                        <BarcodeIcon size={14} className="absolute left-2.5 top-2.5 text-muted"/>
                      </div>
                    </div>
                  </div>

                  {/* Category & Sub-Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Material Category</label>
                      <select
                        className="w-full input-base text-xs"
                        value={formData.category}
                        onChange={e => {
                          const cat = e.target.value
                          const defaultSub = (SUB_CATEGORIES[cat] && SUB_CATEGORIES[cat][0]) || ''
                          setFormData({ ...formData, category: cat, subCategory: defaultSub })
                        }}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Sub-Category / Family</label>
                      <input
                        type="text"
                        list="sub-cat-list"
                        className="w-full input-base text-xs"
                        value={formData.subCategory}
                        onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                        placeholder="e.g. Stainless Steel or Mild Steel"
                      />
                      <datalist id="sub-cat-list">
                        {(SUB_CATEGORIES[formData.category] || []).map(sub => (
                          <option key={sub} value={sub} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Item Description */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Detailed Description & Internal Notes</label>
                    <textarea
                      rows={3}
                      className="w-full input-base text-xs resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add technical nuances, manufacturer notes, or specific customer references..."
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 2: ENGINEERING & MATERIAL SPECS */}
          {activeStudioTab === 'specs' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Compass size={16} className="text-rex-600"/> Engineering & Physical Dimensions
                  </h2>
                  <span className="text-[11px] text-muted font-mono">METALLURGICAL SPECS</span>
                </div>

                <div className="space-y-5">
                  {/* Grade & Shape Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Material Grade / Alloy Spec</label>
                      <input
                        type="text"
                        list="grade-list"
                        className="w-full input-base text-xs font-mono font-bold"
                        value={formData.materialGrade}
                        onChange={e => setFormData({ ...formData, materialGrade: e.target.value })}
                        placeholder="e.g. SS 304, EN8, MS IS-2062"
                      />
                      <datalist id="grade-list">
                        {MATERIAL_GRADES.map(g => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Profile / Shape</label>
                      <select
                        className="w-full input-base text-xs"
                        value={formData.materialShape}
                        onChange={e => setFormData({ ...formData, materialShape: e.target.value })}
                      >
                        {MATERIAL_SHAPES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dimensional Parameters Box */}
                  <div className="p-4 bg-surface2/30 rounded-xl border border-theme-subtle space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Scale size={14} className="text-amber-500"/> Physical Dimensions (mm)
                      </span>
                      <button
                        type="button"
                        onClick={calcTheoreticalWeight}
                        className="text-[11px] text-rex-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <RefreshCw size={11}/> Calculate Weight
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Diameter (Ø mm)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full input-base text-xs font-mono"
                          value={formData.dimDiameter}
                          onChange={e => setFormData({ ...formData, dimDiameter: e.target.value })}
                          placeholder="e.g. 32"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Thickness (mm)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full input-base text-xs font-mono"
                          value={formData.dimThickness}
                          onChange={e => setFormData({ ...formData, dimThickness: e.target.value })}
                          placeholder="e.g. 10"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Width (mm)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full input-base text-xs font-mono"
                          value={formData.dimWidth}
                          onChange={e => setFormData({ ...formData, dimWidth: e.target.value })}
                          placeholder="e.g. 150"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Length (mm)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full input-base text-xs font-mono"
                          value={formData.dimLength}
                          onChange={e => setFormData({ ...formData, dimLength: e.target.value })}
                          placeholder="e.g. 1000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-theme-subtle/50">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Material Density (g/cm³)</label>
                        <select
                          className="w-full input-base text-xs font-mono"
                          value={formData.density}
                          onChange={e => setFormData({ ...formData, density: e.target.value })}
                        >
                          <option value="7.85">7.85 - Mild Steel / Carbon Steel</option>
                          <option value="7.93">7.93 - Stainless Steel (304/316)</option>
                          <option value="2.70">2.70 - Aluminum Alloys</option>
                          <option value="8.50">8.50 - Brass / Bronze</option>
                          <option value="1.42">1.42 - Delrin / POM Polymer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Calculated Theoretical Unit Weight (kg)</label>
                        <input
                          type="text"
                          className="w-full input-base text-xs font-mono font-bold text-primary"
                          value={formData.unitWeight}
                          onChange={e => setFormData({ ...formData, unitWeight: e.target.value })}
                          placeholder="e.g. 6.31"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Surface & Tolerances */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Surface Finish / Condition</label>
                      <select
                        className="w-full input-base text-xs"
                        value={formData.surfaceFinish}
                        onChange={e => setFormData({ ...formData, surfaceFinish: e.target.value })}
                      >
                        <option value="Cold Drawn / Bright">Cold Drawn / Bright</option>
                        <option value="Hot Rolled / Black">Hot Rolled / Black</option>
                        <option value="Polished #4 Mirror">Polished #4 Mirror</option>
                        <option value="Hard Chrome Plated">Hard Chrome Plated</option>
                        <option value="Annealed & Pickled">Annealed & Pickled</option>
                        <option value="Galvanized / Coated">Galvanized / Coated</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Precision Tolerance Class</label>
                      <select
                        className="w-full input-base text-xs"
                        value={formData.toleranceClass}
                        onChange={e => setFormData({ ...formData, toleranceClass: e.target.value })}
                      >
                        <option value="Commercial (±0.1mm)">Commercial (±0.1mm)</option>
                        <option value="Precision h7 (±0.015mm)">Precision h7 (±0.015mm)</option>
                        <option value="Precision h8 (±0.025mm)">Precision h8 (±0.025mm)</option>
                        <option value="Precision h9 (±0.040mm)">Precision h9 (±0.040mm)</option>
                        <option value="Ground Finish (±0.005mm)">Ground Finish (±0.005mm)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 3: INVENTORY & STORAGE */}
          {activeStudioTab === 'stock' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-rex-600"/> Warehouse Stock & Bin Management
                  </h2>
                  <span className="text-[11px] text-muted font-mono">STORAGE ALLOCATION</span>
                </div>

                <div className="space-y-5">
                  {/* Stock On Hand & UOM */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">
                        Current Initial Stock Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full input-base text-base font-mono font-bold text-primary"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      />
                      <p className="text-[10px] text-muted mt-1">Starting physical balance in the warehouse.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Unit of Measure (UOM) <span className="text-red-500">*</span></label>
                      <select
                        className="w-full input-base text-xs font-bold"
                        value={formData.uom}
                        onChange={e => setFormData({ ...formData, uom: e.target.value })}
                      >
                        {UOMS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bin & Warehouse Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Warehouse Area / Zone</label>
                      <select
                        className="w-full input-base text-xs"
                        value={formData.warehouseZone}
                        onChange={e => setFormData({ ...formData, warehouseZone: e.target.value })}
                      >
                        <option value="Main Raw Material Yard">Main Raw Material Yard</option>
                        <option value="Heavy Steel Rack Storage">Heavy Steel Rack Storage</option>
                        <option value="Fasteners Bin Bay">Fasteners Bin Bay</option>
                        <option value="CNC Tool Crib">CNC Tool Crib</option>
                        <option value="Clean Parts Store">Clean Parts Store</option>
                        <option value="Finished Goods Holding Area">Finished Goods Holding Area</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Precise Rack / Bin Location</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full input-base text-xs pl-8 font-mono"
                          value={formData.location}
                          onChange={e => setFormData({ ...formData, location: e.target.value })}
                          placeholder="e.g. Bay 2 - Rack B-04 - Bin 12"
                        />
                        <MapPin size={14} className="absolute left-2.5 top-2.5 text-muted"/>
                      </div>
                    </div>
                  </div>

                  {/* Stock Thresholds Matrix */}
                  <div className="p-4 bg-surface2/30 rounded-xl border border-theme-subtle space-y-3">
                    <span className="text-xs font-bold text-primary block">Replenishment & Safety Thresholds</span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Reorder Level (Min)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full input-base text-xs font-mono font-bold text-amber-600"
                          value={formData.reorderLevel}
                          onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                          placeholder="e.g. 10"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Safety Buffer Stock</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full input-base text-xs font-mono"
                          value={formData.safetyStock}
                          onChange={e => setFormData({ ...formData, safetyStock: e.target.value })}
                          placeholder="e.g. 5"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Max Storage Capacity</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full input-base text-xs font-mono"
                          value={formData.maxStock}
                          onChange={e => setFormData({ ...formData, maxStock: e.target.value })}
                          placeholder="e.g. 500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-muted mb-1">Default Batch Qty (MOQ)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full input-base text-xs font-mono font-bold"
                          value={formData.reorderBatchQty}
                          onChange={e => setFormData({ ...formData, reorderBatchQty: e.target.value })}
                          placeholder="e.g. 50"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted">
                      When current stock drops below the Reorder Level, an automatic PO replenishment suggestion is raised in Purchasing.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 4: PRICING & MARGINS */}
          {activeStudioTab === 'pricing' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={16} className="text-rex-600"/> Pricing, Valuation & Profit Margins
                  </h2>
                  <span className="text-[11px] text-muted font-mono">FINANCIAL VALUATION</span>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Standard Purchase Cost (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full input-base text-base font-mono font-bold text-primary"
                        value={formData.unitCost}
                        onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-[10px] text-muted mt-1">Acquisition or average unit manufacturing cost.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Standard Unit Selling Price (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full input-base text-base font-mono font-bold text-primary"
                        value={formData.unitPrice}
                        onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-[10px] text-muted mt-1">Base catalog or customer quotation selling price.</p>
                    </div>
                  </div>

                  {/* Real-time Profitability Calculator Card */}
                  <div className="p-4 bg-surface2/40 rounded-xl border border-theme-subtle space-y-3">
                    <span className="text-xs font-bold text-primary block">Real-time Margin & Profitability Metrics</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 bg-surface rounded-lg border border-theme-subtle">
                        <span className="text-[10px] text-muted uppercase font-bold block">Profit per Unit</span>
                        <div className={`text-lg font-bold font-mono mt-1 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(profit)}
                        </div>
                      </div>

                      <div className="p-3 bg-surface rounded-lg border border-theme-subtle">
                        <span className="text-[10px] text-muted uppercase font-bold block">Gross Profit Margin %</span>
                        <div className={`text-lg font-bold font-mono mt-1 ${marginPct >= 20 ? 'text-emerald-500' : marginPct > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                          {marginPct.toFixed(1)}%
                        </div>
                      </div>

                      <div className="p-3 bg-surface rounded-lg border border-theme-subtle">
                        <span className="text-[10px] text-muted uppercase font-bold block">Cost Markup %</span>
                        <div className="text-lg font-bold font-mono mt-1 text-primary">
                          {markupPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tax applicability */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Tax Applicability</label>
                    <select
                      className="w-full input-base text-xs"
                      value={formData.taxRate}
                      onChange={e => setFormData({ ...formData, taxRate: e.target.value })}
                    >
                      <option value="18">Standard VAT 18%</option>
                      <option value="0">0% VAT Exempt</option>
                      <option value="absorbed">VAT & SSCL Absorbed in Price</option>
                    </select>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 5: SUPPLIERS & PROCUREMENT */}
          {activeStudioTab === 'suppliers' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Truck size={16} className="text-rex-600"/> Supplier Relationships & Purchasing
                  </h2>
                  <span className="text-[11px] text-muted font-mono">VENDOR MAPPING</span>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Primary / Preferred Supplier</label>
                      <select
                        className="w-full input-base text-xs font-semibold"
                        value={formData.preferredSupplier}
                        onChange={e => setFormData({ ...formData, preferredSupplier: e.target.value })}
                      >
                        <option value="">-- Select Preferred Vendor --</option>
                        {suppliersList.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name} ({s.code || s.id})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Supplier Part / Catalog Code</label>
                      <input
                        type="text"
                        className="w-full input-base text-xs font-mono"
                        value={formData.supplierPartNo}
                        onChange={e => setFormData({ ...formData, supplierPartNo: e.target.value })}
                        placeholder="e.g. DH-HEX-SS304-IN"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Expected Procurement Lead Time (Days)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full input-base text-xs font-mono"
                      value={formData.leadTimeDays}
                      onChange={e => setFormData({ ...formData, leadTimeDays: e.target.value })}
                      placeholder="e.g. 7"
                    />
                  </div>

                  {/* Approved Secondary Suppliers Multi-tags */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-secondary">Approved Alternate Suppliers</label>
                    
                    <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-surface2/30 rounded-xl border border-theme-subtle">
                      {formData.suppliers.length > 0 ? (
                        formData.suppliers.map(sup => (
                          <Badge key={sup} variant="outline" className="flex items-center gap-1.5 bg-surface text-xs py-1">
                            {sup}
                            <button
                              type="button"
                              className="hover:text-red-500 transition-colors ml-1"
                              onClick={() => setFormData({ ...formData, suppliers: formData.suppliers.filter(s => s !== sup) })}
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted italic self-center">No secondary suppliers linked.</span>
                      )}
                    </div>

                    <select
                      className="w-full input-base text-xs"
                      value=""
                      onChange={e => {
                        const val = e.target.value
                        if (val && !formData.suppliers.includes(val)) {
                          setFormData({ ...formData, suppliers: [...formData.suppliers, val] })
                        }
                      }}
                    >
                      <option value="">+ Add Approved Supplier from Directory...</option>
                      {suppliersList.filter((s: any) => !formData.suppliers.includes(s.name)).map((s: any) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 6: QUALITY & DRAWINGS */}
          {activeStudioTab === 'quality' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-theme-subtle">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <FileCheck size={16} className="text-rex-600"/> Quality Assurance & Technical Files
                  </h2>
                  <span className="text-[11px] text-muted font-mono">COMPLIANCE & CAD</span>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Product Photo / Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        className="flex-1 input-base text-xs"
                        value={formData.imageUrl}
                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://... or /assets/parts/image.jpg"
                      />
                      {formData.imageUrl && (
                        <a
                          href={formData.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-surface2 hover:bg-surface2/80 rounded-lg text-muted hover:text-primary transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Technical Drawing / PDF Spec Sheet URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        className="flex-1 input-base text-xs"
                        value={formData.drawingsUrl}
                        onChange={e => setFormData({ ...formData, drawingsUrl: e.target.value })}
                        placeholder="https://... or file path"
                      />
                      {formData.drawingsUrl && (
                        <a
                          href={formData.drawingsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-surface2 hover:bg-surface2/80 rounded-lg text-muted hover:text-primary transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Quality Inspection Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-surface2/40 rounded-xl border border-theme-subtle">
                    <div>
                      <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-500" /> Quality Inspection Required Upon Receipt
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        Item will be flagged for Quality Control (QC) and Material Test Certificate (MTC) check during GRN creation.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.qcRequired}
                        onChange={e => setFormData({ ...formData, qcRequired: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rex-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Storage & Safe Handling Precautions</label>
                    <textarea
                      rows={2}
                      className="w-full input-base text-xs resize-none"
                      value={formData.handlingNotes}
                      onChange={e => setFormData({ ...formData, handlingNotes: e.target.value })}
                      placeholder="e.g. Keep dry, use nylon slings, do not stack more than 5 bundles high..."
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Right 1 Column (Live Item Summary Card & Quick Meta) */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-5 border-t-4 border-t-rex-600 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Live Stock Card Preview</span>
              <Badge variant={formData.status === 'active' ? 'success' : 'error'} size="sm">
                {formData.status.toUpperCase()}
              </Badge>
            </div>

            {/* Visual Thumbnail or Placeholder */}
            <div className="w-full h-32 rounded-xl bg-surface2/60 border border-theme-subtle flex items-center justify-center overflow-hidden relative">
              {formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Item" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-3">
                  <Package size={32} className="mx-auto text-muted/40 mb-1" />
                  <span className="text-[10px] text-muted block">No image specified</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary line-clamp-2">
                {formData.name || 'Untitled Item'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {formData.sku || 'NO-SKU'}
                </span>
                <span className="text-xs text-muted font-medium">
                  {formData.category}
                </span>
              </div>
            </div>

            <div className="p-3 bg-surface2/40 rounded-xl space-y-2 text-xs border border-theme-subtle">
              <div className="flex justify-between">
                <span className="text-muted">On-Hand Stock:</span>
                <span className="font-mono font-bold text-primary">
                  {formData.quantity} {formData.uom}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Bin Location:</span>
                <span className="font-mono font-medium text-secondary truncate max-w-[140px]">
                  {formData.location || 'Unassigned'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Standard Cost:</span>
                <span className="font-mono text-secondary">
                  {formData.unitCost ? formatCurrency(parseFloat(formData.unitCost)) : '-'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Selling Price:</span>
                <span className="font-mono font-bold text-emerald-500">
                  {formData.unitPrice ? formatCurrency(parseFloat(formData.unitPrice)) : '-'}
                </span>
              </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="space-y-1.5 pt-2 border-t border-theme-subtle">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">Jump to Section</span>
              {[
                { id: 'general', label: '1. Identification' },
                { id: 'specs', label: '2. Metallurgy & Specs' },
                { id: 'stock', label: '3. Warehouse Binning' },
                { id: 'pricing', label: '4. Margins & Valuation' },
                { id: 'suppliers', label: '5. Vendors & Lead Time' },
                { id: 'quality', label: '6. Quality & Files' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStudioTab(s.id as any)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                    activeStudioTab === s.id ? 'bg-rex-600/10 text-rex-600 font-bold' : 'text-muted hover:text-primary hover:bg-surface2/50'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] font-mono opacity-60">→</span>
                </button>
              ))}
            </div>

            {/* Big Action Save */}
            <div className="pt-2">
              <Button
                variant="primary"
                type="button"
                icon={Save}
                disabled={submitting}
                onClick={() => handleSaveInternal(false)}
                className="w-full text-xs font-bold py-2.5"
              >
                {submitting ? 'Saving...' : isEditing ? 'Update Item' : 'Save Item to Stock'}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
