import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { 
  Package, DollarSign, Layers, Plus, Trash2, ChevronDown, ChevronUp, 
  ExternalLink, Image as ImageIcon, Upload, X, Save, AlertCircle, 
  Clock, Wrench, FileText, CheckCircle2, TrendingUp, BarChart3, History, ArrowRight
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInventory, useMachiningOperations, useStockLedger } from '@/hooks/useData'
import { addStockLedgerEntry } from '@/lib/api'

const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-primary px-2 py-1.5 text-xs outline-none transition-all placeholder:text-muted/30 text-primary"

interface MatSearchProps {
  value: string
  onChange: (val: string) => void
  onSelect: (name: string, unitPrice?: number) => void
  inventory: any[]
  className?: string
}

const MatSearchInput: React.FC<MatSearchProps> = ({ value, onChange, onSelect, inventory, className = '' }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  
  const filtered = useMemo(() => {
    if (!value || value.trim().length === 0) return inventory.slice(0, 8)
    const q = value.toLowerCase()
    return inventory.filter(item => 
      (item.name || '').toLowerCase().includes(q) || 
      (item.sku || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [value, inventory])

  useEffect(() => {
    const handler = (e: MouseEvent) => { 
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) 
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full">
      <input 
        type="text" 
        value={value} 
        className={`${tableInputClass} ${className}`}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} 
        autoComplete="off" 
        placeholder="Search material..." 
      />
      {open && filtered.length > 0 && createPortal(
        <ul 
          style={{ 
            top: (wrapRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY, 
            left: (wrapRef.current?.getBoundingClientRect().left || 0) + window.scrollX, 
            width: wrapRef.current?.getBoundingClientRect().width, 
            minWidth: '220px' 
          }} 
          className="absolute z-[99999] mt-1 bg-surface border border-theme-subtle/60 shadow-2xl rounded-xl py-1 max-h-48 overflow-y-auto"
        >
          {filtered.map((item, i) => (
            <li 
              key={i} 
              className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center transition-colors"
              onMouseDown={e => { 
                e.preventDefault(); 
                onSelect(item.name, item.unitCost || item.unitPrice || 0); 
                onChange(item.name); 
                setOpen(false); 
              }}
            >
              <div className="flex flex-col">
                <span className="text-primary font-medium">{item.name}</span>
                {item.sku && <span className="text-[10px] text-muted font-mono">{item.sku}</span>}
              </div>
              {(item.unitCost > 0 || item.unitPrice > 0) && (
                <span className="text-[10px] text-emerald-500 font-mono font-medium ml-2">
                  Rs. {item.unitCost || item.unitPrice}
                </span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

export interface ProductBOM {
  id: number
  title: string
  description?: string
  drawingsUrl?: string
  collapsed: boolean
  autoCollapsed?: boolean
  manualCollapsed?: boolean
  machiningCollapsed?: boolean
  autoMats: any[]
  manualMats: any[]
  procState: Record<string, { estHr: string; setTime: string; quoHr: string; hrRate?: number; setTimeRate?: number; rate?: number }>
}

interface FinishedProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  onSave: (productData: any) => Promise<void>
}

export const FinishedProductModal: React.FC<FinishedProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave
}) => {
  const { data: rawOperations } = useMachiningOperations()
  const { data: inventory } = useInventory()
  
  const [activeTab, setActiveTab] = useState<'info' | 'boms' | 'pricing' | 'ledger'>('info')
  const [submitting, setSubmitting] = useState(false)

  // Basic Product Info
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('Standard Parts')
  const [uom, setUom] = useState('pcs')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [drawingsUrl, setDrawingsUrl] = useState('')
  const [location, setLocation] = useState('')
  const [reorderLevel, setReorderLevel] = useState('5')
  const [initialQty, setInitialQty] = useState('0')
  const [sellingPrice, setSellingPrice] = useState('')

  // Multi BOMs
  const [boms, setBoms] = useState<ProductBOM[]>([])

  // Machining Operations catalog
  const EXCEL_PROCESSES = useMemo(() => {
    const groups: Record<string, any[]> = {}
    if (rawOperations) {
      rawOperations.forEach((op: any) => {
        if (!groups[op.groupName]) groups[op.groupName] = []
        groups[op.groupName].push(op)
      })
    }
    return Object.keys(groups).map(k => ({ group: k, items: groups[k] }))
  }, [rawOperations])

  const initProcState = () => {
    const init: any = {}
    EXCEL_PROCESSES.forEach(g => g.items.forEach(i => {
      init[i.name] = { estHr: '', setTime: '', quoHr: '', hrRate: i.hrRate, setTimeRate: i.setTimeRate, rate: i.hrRate }
    }))
    return init
  }

  // Populate state on open / edit
  useEffect(() => {
    if (product) {
      setName(product.name || '')
      setSku(product.sku || '')
      setCategory(product.category || 'Standard Parts')
      setUom(product.uom || 'pcs')
      setDescription(product.description || '')
      setImageUrl(product.imageUrl || '')
      setDrawingsUrl(product.drawingsUrl || '')
      setLocation(product.location || '')
      setReorderLevel(String(product.reorderLevel || '5'))
      setInitialQty(String(product.quantity || '0'))
      setSellingPrice(String(product.unitPrice || ''))

      let loadedBoms: ProductBOM[] = []
      if (product.boms) {
        try {
          loadedBoms = typeof product.boms === 'string' ? JSON.parse(product.boms) : product.boms
        } catch (e) {
          loadedBoms = []
        }
      }
      setBoms(Array.isArray(loadedBoms) ? loadedBoms : [])
    } else {
      setName('')
      setSku(`PRD-${Date.now().toString().slice(-4)}`)
      setCategory('Standard Parts')
      setUom('pcs')
      setDescription('')
      setImageUrl('')
      setDrawingsUrl('')
      setLocation('')
      setReorderLevel('5')
      setInitialQty('0')
      setSellingPrice('')
      setBoms([
        {
          id: Date.now(),
          title: 'BOM Sub-Assembly 1',
          description: '',
          drawingsUrl: '',
          collapsed: false,
          autoCollapsed: false,
          manualCollapsed: false,
          machiningCollapsed: false,
          autoMats: [],
          manualMats: [],
          procState: initProcState()
        }
      ])
    }
    setActiveTab('info')
  }, [product, isOpen])

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  // BOM Management Handlers
  const addBOM = () => {
    setBoms(prev => [
      ...prev,
      {
        id: Date.now(),
        title: `BOM Sub-Assembly ${prev.length + 1}`,
        description: '',
        drawingsUrl: '',
        collapsed: false,
        autoCollapsed: false,
        manualCollapsed: false,
        machiningCollapsed: false,
        autoMats: [],
        manualMats: [],
        procState: initProcState()
      }
    ])
  }

  const updateBOM = (bomId: number, updates: Partial<ProductBOM>) => {
    setBoms(prev => prev.map(b => b.id === bomId ? { ...b, ...updates } : b))
  }

  const removeBOM = (bomId: number) => {
    setBoms(prev => prev.filter(b => b.id !== bomId))
  }

  const addAutoMat = (bomId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b
      return {
        ...b,
        autoMats: [
          ...b.autoMats,
          { id: Date.now(), material: '', width: '', length: '', supplier: '', thick: '', dia: '', qty: 1, unitPrice: 0, platePrice: 0, shaftPrice: 0 }
        ]
      }
    }))
  }

  const updateAutoMat = (bomId: number, matId: number, field: string, val: any) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b
      const newAutoMats = b.autoMats.map(m => {
        if (m.id !== matId) return m
        const nm = { ...m, [field]: val }
        const matName = (nm.material || '').toLowerCase()
        const isRod = matName.includes('rod') || matName.includes('shaft') || Boolean(nm.dia)
        
        const qty = Number(nm.qty) || 0
        const up = Number(nm.unitPrice) || 0
        const density = 0.00000785 // Steel density in kg/mm³
        
        let price = qty * up
        if (isRod && nm.dia && nm.length) {
          price = Math.PI * Math.pow(Number(nm.dia) / 2, 2) * Number(nm.length) * density * up * qty
        } else if (!isRod && nm.width && nm.length && nm.thick) {
          price = Number(nm.width) * Number(nm.length) * Number(nm.thick) * density * up * qty
        }
        
        nm.shaftPrice = isRod ? Number(price.toFixed(2)) : 0
        nm.platePrice = !isRod ? Number(price.toFixed(2)) : 0
        return nm
      })
      return { ...b, autoMats: newAutoMats }
    }))
  }

  const removeAutoMat = (bomId: number, matId: number) => {
    setBoms(prev => prev.map(b => b.id === bomId ? { ...b, autoMats: b.autoMats.filter(m => m.id !== matId) } : b))
  }

  const addManualMat = (bomId: number) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b
      return {
        ...b,
        manualMats: [
          ...b.manualMats,
          { id: Date.now(), material: '', supplier: '', priceMode: '-', qty: 1, unitPrice: 0 }
        ]
      }
    }))
  }

  const updateManualMat = (bomId: number, matId: number, field: string, val: any) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b
      return {
        ...b,
        manualMats: b.manualMats.map(m => m.id === matId ? { ...m, [field]: val } : m)
      }
    }))
  }

  const removeManualMat = (bomId: number, matId: number) => {
    setBoms(prev => prev.map(b => b.id === bomId ? { ...b, manualMats: b.manualMats.filter(m => m.id !== matId) } : b))
  }

  const handleProcChange = (bomId: number, procName: string, field: string, val: string) => {
    setBoms(prev => prev.map(b => {
      if (b.id !== bomId) return b
      return {
        ...b,
        procState: {
          ...b.procState,
          [procName]: {
            ...b.procState[procName],
            [field]: val
          }
        }
      }
    }))
  }

  // Cost rollups
  const bomCalculations = useMemo(() => {
    let grandMaterials = 0
    let grandMachining = 0

    const perBom = boms.map(b => {
      const autoTotal = (b.autoMats || []).reduce((s, m) => s + (Number(m.platePrice) || 0) + (Number(m.shaftPrice) || 0), 0)
      const manualTotal = (b.manualMats || []).reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitPrice) || 0), 0)
      const matTotal = autoTotal + manualTotal

      let machTotal = 0
      if (b.procState) {
        machTotal = Object.values(b.procState).reduce((s, p: any) => {
          const quoHr = Number(p.quoHr || 0)
          const hrRate = Number(p.hrRate || p.rate || 0)
          const setTime = Number(p.setTime || 0)
          const setTimeRate = Number(p.setTimeRate || 0)
          return s + (quoHr * hrRate) + (setTime * setTimeRate)
        }, 0)
      }

      grandMaterials += matTotal
      grandMachining += machTotal

      return {
        id: b.id,
        materialsTotal: matTotal,
        machiningTotal: machTotal,
        bomTotal: matTotal + machTotal
      }
    })

    const grandTotal = grandMaterials + grandMachining
    return {
      perBom,
      grandMaterials,
      grandMachining,
      grandTotal
    }
  }, [boms])

  // Pricing & Margins
  const unitSellingPrice = Number(sellingPrice) || 0
  const totalBOMCost = bomCalculations.grandTotal
  const grossProfit = unitSellingPrice - totalBOMCost
  const profitMargin = unitSellingPrice > 0 ? (grossProfit / unitSellingPrice) * 100 : 0

  // Ledger state for editing existing item
  const { data: ledger, refetch: refetchLedger } = useStockLedger(product?.id || '')
  const [ledgerType, setLedgerType] = useState<'IN' | 'OUT'>('IN')
  const [ledgerQty, setLedgerQty] = useState('')
  const [ledgerNotes, setLedgerNotes] = useState('')
  const [ledgerSubmitting, setLedgerSubmitting] = useState(false)

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product?.id || !ledgerQty || Number(ledgerQty) <= 0) return
    setLedgerSubmitting(true)
    try {
      await addStockLedgerEntry(product.id, {
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        type: ledgerType,
        qty: Number(ledgerQty),
        notes: ledgerNotes || 'Manual stock adjustment'
      })
      setLedgerQty('')
      setLedgerNotes('')
      refetchLedger()
    } catch (err) {
      console.error(err)
    } finally {
      setLedgerSubmitting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)

    const payload = {
      id: product?.id || `PRD-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      sku: sku.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      type: 'finished_product',
      category,
      uom: uom || 'pcs',
      description,
      imageUrl,
      drawingsUrl,
      location,
      reorderLevel: Number(reorderLevel) || 0,
      quantity: Number(initialQty) || 0,
      unitPrice: unitSellingPrice, // Final selling price
      unitCost: totalBOMCost,       // Cost rollup from all BOMs
      boms: JSON.stringify(boms),
      status: 'active'
    }

    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-surface border border-theme-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-theme-subtle bg-surface2/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rex-600/10 text-rex-600 border border-rex-600/20 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                {product ? `Edit Ready-Made Product: ${name || product.name}` : 'New Ready-Made Product'}
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
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface2 transition-colors"
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'info' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }`}
            >
              <FileText size={14} /> Product Info & Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('boms')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'boms' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }`}
            >
              <Layers size={14} /> Bill of Materials ({boms.length})
              {totalBOMCost > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${activeTab === 'boms' ? 'bg-white/20 text-white' : 'bg-rex-500/10 text-rex-600'}`}>
                  {formatCurrency(totalBOMCost)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pricing' 
                  ? 'bg-rex-600 text-white shadow-sm' 
                  : 'text-muted hover:text-primary hover:bg-surface2'
              }`}
            >
              <DollarSign size={14} /> Final Pricing & Margin
              {profitMargin !== 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${profitMargin > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              )}
            </button>
            {product?.id && (
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'ledger' 
                    ? 'bg-rex-600 text-white shadow-sm' 
                    : 'text-muted hover:text-primary hover:bg-surface2'
                }`}
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

          {/* TAB 1: PRODUCT INFO & MEDIA */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: General Product Specs */}
                <div className="lg:col-span-2 space-y-5">
                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={15} className="text-rex-600" /> General Specifications
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-secondary mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Industrial Hydraulic Cylinder 50x300mm"
                          className="w-full input-base font-medium text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Product SKU / Code</label>
                        <input
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="e.g. REX-CYL-01"
                          className="w-full input-base font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Category</label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full input-base text-xs"
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
                        <label className="block text-xs font-medium text-secondary mb-1">Unit of Measure (UOM)</label>
                        <select
                          value={uom}
                          onChange={e => setUom(e.target.value)}
                          className="w-full input-base text-xs"
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
                        <label className="block text-xs font-medium text-secondary mb-1">Storage / Bin Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="e.g. Rack B-04 / Finished Goods Bay"
                          className="w-full input-base text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-secondary mb-1">Detailed Description & Features</label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Detailed specifications, material grades, surface finishes, or functional requirements..."
                          className="w-full input-base text-xs resize-none"
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Stock Tracking */}
                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={15} className="text-blue-500" /> Inventory & Stock Levels
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Current Stock in Hand</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={initialQty}
                          onChange={e => setInitialQty(e.target.value)}
                          className="w-full input-base font-mono font-bold text-sm"
                        />
                        <p className="text-[10px] text-muted mt-1">
                          {product?.id ? 'Stock is updated via Stock Ledger entries or Order Dispatches.' : 'Initial quantity to put in stock upon creation.'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary mb-1">Low Stock Alert Level (Reorder Level)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={reorderLevel}
                          onChange={e => setReorderLevel(e.target.value)}
                          className="w-full input-base font-mono text-sm"
                        />
                        <p className="text-[10px] text-muted mt-1">Triggers low stock badge if stock falls below this quantity.</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Right: Product Image & Google Drive Drawings */}
                <div className="space-y-5">
                  {/* Product Photo */}
                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-emerald-500" /> Product Image
                    </h3>

                    <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-theme-subtle rounded-xl bg-surface2/30">
                      {imageUrl ? (
                        <div className="relative w-full aspect-square max-h-48 rounded-lg overflow-hidden border border-theme-subtle group">
                          <img 
                            src={imageUrl} 
                            alt={name || 'Product'} 
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            title="Remove image"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-muted">
                          <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
                          <p className="text-xs">No product image uploaded</p>
                          <p className="text-[10px] text-muted/70 mt-0.5">Upload a photo or paste an image URL below</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-secondary">Upload Image File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-rex-600/10 file:text-rex-600 hover:file:bg-rex-600/20 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-secondary">Or Paste Image URL</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full input-base text-xs font-mono"
                      />
                    </div>
                  </GlassCard>

                  {/* Google Drive Drawings Link */}
                  <GlassCard className="p-5 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText size={15} className="text-amber-500" /> BOM / CAD Drawings URL
                      </span>
                      <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono">Google Drive</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Google Drive Folder / Drawing URL
                      </label>
                      <input
                        type="url"
                        value={drawingsUrl}
                        onChange={e => setDrawingsUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full input-base text-xs font-mono"
                      />
                    </div>

                    {drawingsUrl ? (
                      <a
                        href={drawingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink size={14} /> Open Drawing on Google Drive
                      </a>
                    ) : (
                      <p className="text-[11px] text-muted italic">
                        Paste your shared Google Drive link for drawings, blueprints, or CAD files here.
                      </p>
                    )}
                  </GlassCard>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-BOM BUILDER (EXACT QUOTATION BOM FORMAT) */}
          {activeTab === 'boms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Layers size={17} className="text-rex-600" /> Bill of Materials (BOM) Breakdown
                  </h3>
                  <p className="text-xs text-muted">
                    Exact Quotation BOM format: plates/rods with steel density pricing, manual materials, and machining operations.
                  </p>
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={addBOM}>
                  Add BOM Part / Sub-Assembly
                </Button>
              </div>

              {boms.map((bom, bomIdx) => {
                const autoMatTotal = (bom.autoMats || []).reduce((s, m) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0)
                const manualMatTotal = (bom.manualMats || []).reduce((s, m) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0)
                let machCost = 0
                if (bom.procState) {
                  machCost = Object.values(bom.procState).reduce((s, p: any) => {
                    const quoHr = Number(p.quoHr || 0)
                    const hrRate = Number(p.hrRate || p.rate || 0)
                    const setTime = Number(p.setTime || 0)
                    const setTimeRate = Number(p.setTimeRate || 0)
                    return s + (quoHr * hrRate) + (setTime * setTimeRate)
                  }, 0)
                }
                const bomTotal = autoMatTotal + manualMatTotal + machCost

                return (
                  <GlassCard key={bom.id} className="p-0 overflow-hidden border border-theme-subtle">
                    {/* BOM Card Header */}
                    <div className="flex items-center justify-between p-4 bg-surface2/60 border-b border-theme-subtle cursor-pointer select-none">
                      <div className="flex items-center gap-3 flex-1">
                        <button 
                          type="button"
                          onClick={() => updateBOM(bom.id, { collapsed: !bom.collapsed })} 
                          className="p-1 hover:bg-surface rounded text-muted hover:text-primary"
                        >
                          {bom.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                        <div className="flex flex-col gap-1 w-full max-w-md">
                          <input 
                            type="text" 
                            value={bom.title} 
                            onChange={e => updateBOM(bom.id, { title: e.target.value })} 
                            className="bg-transparent font-bold text-primary outline-none focus:border-b focus:border-rex-500 w-full text-sm" 
                            onClick={e => e.stopPropagation()}
                            placeholder="BOM Title (e.g. Main Shaft Sub-assembly)"
                          />
                          <input 
                            type="text" 
                            value={bom.description || ''} 
                            onChange={e => updateBOM(bom.id, { description: e.target.value })} 
                            className="bg-transparent text-xs text-muted outline-none focus:border-b focus:border-rex-500 w-full" 
                            onClick={e => e.stopPropagation()}
                            placeholder="Optional BOM description or notes..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* BOM Drawing URL */}
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="url"
                            value={bom.drawingsUrl || ''}
                            onChange={e => updateBOM(bom.id, { drawingsUrl: e.target.value })}
                            placeholder="Drive drawing URL..."
                            className="bg-surface text-[11px] font-mono px-2 py-1 rounded border border-theme-subtle w-44"
                          />
                          {bom.drawingsUrl && (
                            <a
                              href={bom.drawingsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded border border-blue-500/20"
                              title="Open drawing in Google Drive"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold bg-rex-500/10 text-rex-600 px-3 py-1 rounded-lg border border-rex-500/20">
                          {formatCurrency(bomTotal)}
                        </span>

                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeBOM(bom.id); }} 
                          className="text-red-500/60 hover:text-red-500 p-1.5 rounded transition-colors hover:bg-red-500/10"
                          title="Delete BOM"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {!bom.collapsed && (
                      <div className="p-5 space-y-5 bg-surface/50">

                        {/* SECTION A: Plate or Rod Sizes (mm) */}
                        <div className="border border-theme-subtle/60 rounded-xl bg-surface/40 shadow-sm overflow-hidden">
                          <div 
                            className="flex justify-between items-center px-4 py-2.5 bg-surface2/50 border-b border-theme-subtle/50 cursor-pointer"
                            onClick={() => updateBOM(bom.id, { autoCollapsed: !bom.autoCollapsed })}
                          >
                            <div className="flex items-center gap-2.5">
                              <button type="button" className="p-1 rounded text-muted hover:text-primary">
                                {bom.autoCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                              </button>
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                                Plate or Rod Sizes (mm) — Steel Density (0.00000785 kg/mm³)
                              </h4>
                              {(bom.autoMats || []).length > 0 && (
                                <span className="text-[10px] font-mono bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded font-bold">
                                  {bom.autoMats.length} items
                                </span>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              icon={Plus} 
                              className="h-7 text-xs bg-surface border border-theme-subtle"
                              onClick={(e) => { e.stopPropagation(); addAutoMat(bom.id); }}
                            >
                              Add Raw Material Row
                            </Button>
                          </div>

                          <div className={`overflow-x-auto ${bom.autoCollapsed ? 'hidden' : 'block'}`}>
                            <table className="w-full text-left min-w-[880px]">
                              <thead>
                                <tr className="bg-surface2/30 border-b border-theme-subtle/40 text-[10px] uppercase tracking-wider text-muted font-bold">
                                  <th className="px-4 py-2">Material</th>
                                  <th className="px-3 py-2 w-20">Width</th>
                                  <th className="px-3 py-2 w-20">Length</th>
                                  <th className="px-3 py-2 w-32">Supplier</th>
                                  <th className="px-3 py-2 w-20">Thick</th>
                                  <th className="px-3 py-2 w-20">Dia Ø</th>
                                  <th className="px-3 py-2 w-16">Qty</th>
                                  <th className="px-3 py-2 w-24">Unit Price</th>
                                  <th className="px-4 py-2 text-right">Plate Rs</th>
                                  <th className="px-4 py-2 text-right">Shaft Rs</th>
                                  <th className="px-3 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(bom.autoMats || []).map((mat) => (
                                  <tr key={mat.id} className="border-b border-theme-subtle/20 hover:bg-surface2/30 group">
                                    <td className="p-0">
                                      <MatSearchInput
                                        value={mat.material}
                                        onChange={v => updateAutoMat(bom.id, mat.id, 'material', v)}
                                        onSelect={(mName, mPrice) => { 
                                          updateAutoMat(bom.id, mat.id, 'material', mName); 
                                          if (mPrice) updateAutoMat(bom.id, mat.id, 'unitPrice', mPrice);
                                        }}
                                        inventory={inventory}
                                        className="w-full min-w-[130px]"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.width} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'width', e.target.value)} 
                                        placeholder="mm"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.length} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'length', e.target.value)} 
                                        placeholder="mm"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="text" 
                                        className={tableInputClass} 
                                        value={mat.supplier} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'supplier', e.target.value)} 
                                        placeholder="Supplier"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.thick} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'thick', e.target.value)} 
                                        placeholder="Thick"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.dia} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'dia', e.target.value)} 
                                        placeholder="Dia Ø"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="1" 
                                        className={tableInputClass} 
                                        value={mat.qty} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'qty', e.target.value)} 
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.unitPrice} 
                                        onChange={e => updateAutoMat(bom.id, mat.id, 'unitPrice', e.target.value)} 
                                        placeholder="Rate"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-primary">
                                      {mat.platePrice > 0 ? formatCurrency(mat.platePrice) : <span className="text-muted/30">-</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-primary">
                                      {mat.shaftPrice > 0 ? formatCurrency(mat.shaftPrice) : <span className="text-muted/30">-</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button 
                                        type="button"
                                        onClick={() => removeAutoMat(bom.id, mat.id)} 
                                        className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {(!bom.autoMats || bom.autoMats.length === 0) && (
                                  <tr>
                                    <td colSpan={11} className="py-4 text-center text-xs text-muted italic">
                                      No plate or rod materials added. Click "Add Raw Material Row" to specify plate/rod dimensions.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* SECTION B: Manually Calculated Materials */}
                        <div className="border border-theme-subtle/60 rounded-xl bg-surface/40 shadow-sm overflow-hidden">
                          <div 
                            className="flex justify-between items-center px-4 py-2.5 bg-surface2/50 border-b border-theme-subtle/50 cursor-pointer"
                            onClick={() => updateBOM(bom.id, { manualCollapsed: !bom.manualCollapsed })}
                          >
                            <div className="flex items-center gap-2.5">
                              <button type="button" className="p-1 rounded text-muted hover:text-primary">
                                {bom.manualCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                              </button>
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                                Manually Calculated Materials (Hardware, Fasteners, Seals, Bushings)
                              </h4>
                              {(bom.manualMats || []).length > 0 && (
                                <span className="text-[10px] font-mono bg-rex-500/10 text-rex-600 px-2 py-0.5 rounded font-bold">
                                  {bom.manualMats.length} items
                                </span>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              icon={Plus} 
                              className="h-7 text-xs bg-surface border border-theme-subtle"
                              onClick={(e) => { e.stopPropagation(); addManualMat(bom.id); }}
                            >
                              Add Material Row
                            </Button>
                          </div>

                          <div className={`overflow-x-auto ${bom.manualCollapsed ? 'hidden' : 'block'}`}>
                            <table className="w-full text-left min-w-[700px]">
                              <thead>
                                <tr className="bg-surface2/30 border-b border-theme-subtle/40 text-[10px] uppercase tracking-wider text-muted font-bold">
                                  <th className="px-4 py-2">Material / Part</th>
                                  <th className="px-3 py-2">Supplier</th>
                                  <th className="px-3 py-2 w-28">Price Mode</th>
                                  <th className="px-3 py-2 w-24">Unit Price</th>
                                  <th className="px-3 py-2 w-20">Qty</th>
                                  <th className="px-4 py-2 text-right">Price</th>
                                  <th className="px-3 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(bom.manualMats || []).map((mat) => (
                                  <tr key={mat.id} className="border-b border-theme-subtle/20 hover:bg-surface2/30 group">
                                    <td className="p-0">
                                      <MatSearchInput
                                        value={mat.material}
                                        onChange={v => updateManualMat(bom.id, mat.id, 'material', v)}
                                        onSelect={(mName, mPrice) => { 
                                          updateManualMat(bom.id, mat.id, 'material', mName); 
                                          if (mPrice) updateManualMat(bom.id, mat.id, 'unitPrice', mPrice);
                                        }}
                                        inventory={inventory}
                                        className="w-full min-w-[130px]"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="text" 
                                        className={tableInputClass} 
                                        value={mat.supplier} 
                                        onChange={e => updateManualMat(bom.id, mat.id, 'supplier', e.target.value)} 
                                        placeholder="Supplier"
                                      />
                                    </td>
                                    <td className="p-0">
                                      <select 
                                        className={tableInputClass} 
                                        value={mat.priceMode} 
                                        onChange={e => updateManualMat(bom.id, mat.id, 'priceMode', e.target.value)}
                                      >
                                        <option value="-">-</option>
                                        <option value="per kg">per kg</option>
                                        <option value="per unit">per unit</option>
                                        <option value="lump sum">lump sum</option>
                                      </select>
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        className={tableInputClass} 
                                        value={mat.unitPrice} 
                                        onChange={e => updateManualMat(bom.id, mat.id, 'unitPrice', e.target.value)} 
                                      />
                                    </td>
                                    <td className="p-0">
                                      <input 
                                        type="number" 
                                        min="1" 
                                        className={tableInputClass} 
                                        value={mat.qty} 
                                        onChange={e => updateManualMat(bom.id, mat.id, 'qty', e.target.value)} 
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-primary">
                                      {(mat.unitPrice * mat.qty) > 0 ? formatCurrency(mat.unitPrice * mat.qty) : <span className="text-muted/30">-</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button 
                                        type="button"
                                        onClick={() => removeManualMat(bom.id, mat.id)} 
                                        className="text-muted/50 hover:text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {(!bom.manualMats || bom.manualMats.length === 0) && (
                                  <tr>
                                    <td colSpan={7} className="py-4 text-center text-xs text-muted italic">
                                      No manual materials added yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* SECTION C: Machining Operations */}
                        <div className="border border-theme-subtle/60 rounded-xl bg-surface/40 shadow-sm overflow-hidden">
                          <div 
                            className="flex justify-between items-center px-4 py-2.5 bg-surface2/50 border-b border-theme-subtle/50 cursor-pointer"
                            onClick={() => updateBOM(bom.id, { machiningCollapsed: !bom.machiningCollapsed })}
                          >
                            <div className="flex items-center gap-2.5">
                              <button type="button" className="p-1 rounded text-muted hover:text-primary">
                                {bom.machiningCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                              </button>
                              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                                Machining Operations & Setup Times
                              </h4>
                            </div>
                            <span className="text-xs font-mono text-muted">
                              Machining Subtotal: <strong className="text-primary">{formatCurrency(machCost)}</strong>
                            </span>
                          </div>

                          <div className={`overflow-x-auto ${bom.machiningCollapsed ? 'hidden' : 'block'}`}>
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-surface2/30 border-b border-theme-subtle/40 text-[10px] uppercase tracking-wider text-muted font-bold">
                                  <th className="px-4 py-2">Process</th>
                                  <th className="px-3 py-2 w-24">Est. Hr</th>
                                  <th className="px-3 py-2 w-24">Set Time</th>
                                  <th className="px-3 py-2 w-24">Quo. Hr</th>
                                  <th className="px-3 py-2 w-52">Rates</th>
                                  <th className="px-4 py-2 text-right w-32">Sub Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-theme-subtle/20">
                                {EXCEL_PROCESSES.map((group, gIdx) => (
                                  <React.Fragment key={gIdx}>
                                    <tr className="bg-surface2/30">
                                      <td colSpan={6} className="px-4 py-1.5 text-[10.5px] font-black text-red-500 uppercase tracking-widest">
                                        {group.group}
                                      </td>
                                    </tr>
                                    {group.items.map(proc => {
                                      const st = bom.procState?.[proc.name]
                                      if (!st) return null
                                      const hrRate = Number(st.hrRate || proc.hrRate || proc.rate || 0)
                                      const setTimeRate = Number(st.setTimeRate || proc.setTimeRate || 0)
                                      const lineTotal = (Number(st.quoHr || 0) * hrRate) + (Number(st.setTime || 0) * setTimeRate)
                                      return (
                                        <tr key={proc.name} className="hover:bg-primary/5 transition-colors group">
                                          <td className="pl-6 pr-4 py-1.5 text-xs text-secondary font-medium">
                                            {proc.name}
                                          </td>
                                          <td className="p-0 border-r border-theme-subtle/10">
                                            <input 
                                              type="number" 
                                              min="0" 
                                              step="0.1" 
                                              className={tableInputClass} 
                                              value={st.estHr} 
                                              onChange={e => handleProcChange(bom.id, proc.name, 'estHr', e.target.value)} 
                                              placeholder="-"
                                            />
                                          </td>
                                          <td className="p-0 border-r border-theme-subtle/10">
                                            <input 
                                              type="number" 
                                              min="0" 
                                              step="0.1" 
                                              className={tableInputClass} 
                                              value={st.setTime} 
                                              onChange={e => handleProcChange(bom.id, proc.name, 'setTime', e.target.value)} 
                                              placeholder="-"
                                            />
                                          </td>
                                          <td className="p-0 border-r border-theme-subtle/10">
                                            <input 
                                              type="number" 
                                              min="0" 
                                              step="0.1" 
                                              className={`${tableInputClass} font-bold text-primary`} 
                                              value={st.quoHr} 
                                              onChange={e => handleProcChange(bom.id, proc.name, 'quoHr', e.target.value)} 
                                              placeholder="-"
                                            />
                                          </td>
                                          <td className="px-3 py-1.5 text-[10px] text-muted font-mono whitespace-nowrap border-r border-theme-subtle/10">
                                            <div className="flex gap-2 justify-end">
                                              <span className="text-amber-600 font-medium">Rs. {hrRate.toLocaleString()}/hr</span>
                                              <span className="text-theme-subtle">|</span>
                                              <span className="text-blue-500 font-medium">Rs. {setTimeRate.toLocaleString()}/set</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-1.5 text-right font-mono text-xs font-semibold">
                                            {lineTotal > 0 ? <span className="text-primary">{formatCurrency(lineTotal)}</span> : <span className="text-muted/30">-</span>}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* BOM Summary Footer */}
                        <div className="flex justify-between items-center p-3 bg-surface2/60 rounded-xl border border-theme-subtle">
                          <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                            {bom.title} — Part Cost Rollup
                          </span>
                          <div className="flex items-center gap-6 text-xs font-mono">
                            <div>
                              <span className="text-muted mr-1.5">Materials:</span>
                              <strong className="text-primary">{formatCurrency(autoMatTotal + manualMatTotal)}</strong>
                            </div>
                            <div>
                              <span className="text-muted mr-1.5">Machining:</span>
                              <strong className="text-primary">{formatCurrency(machCost)}</strong>
                            </div>
                            <div className="bg-rex-600/10 text-rex-600 px-3 py-1 rounded-lg border border-rex-600/20 font-bold">
                              <span>Part Total: {formatCurrency(bomTotal)}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </GlassCard>
                )
              })}

              {boms.length === 0 && (
                <div className="p-8 border-2 border-dashed border-theme-subtle rounded-2xl text-center text-muted space-y-3">
                  <Layers size={36} className="mx-auto opacity-40 text-rex-600" />
                  <p className="text-sm font-medium text-primary">No BOM parts added yet</p>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    Ready-made products can contain one or multiple BOM parts (assemblies, sub-assemblies, shafts, casings) with full quotation-grade material & machining rates.
                  </p>
                  <Button variant="primary" size="sm" icon={Plus} onClick={addBOM} className="mt-2">
                    Add First BOM Part
                  </Button>
                </div>
              )}

              {boms.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-surface2/70 border border-theme-subtle rounded-xl">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-secondary">
                      All BOMs Manufacturing Cost Rollup ({boms.length} BOM Part{boms.length > 1 ? 's' : ''})
                    </span>
                    <div className="text-[11px] text-muted mt-0.5">
                      Raw Materials: {formatCurrency(bomCalculations.grandMaterials)} • Machining: {formatCurrency(bomCalculations.grandMachining)}
                    </div>
                  </div>
                  <span className="text-xl font-mono font-black text-rex-600">
                    {formatCurrency(totalBOMCost)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FINAL PRICING & MARGIN */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 text-center">
                  <span className="text-xs text-muted block mb-1">Total BOM Cost (Rollup)</span>
                  <span className="text-2xl font-mono font-black text-primary">{formatCurrency(totalBOMCost)}</span>
                  <span className="text-[10px] text-muted block mt-1">Materials + Machining</span>
                </GlassCard>

                <GlassCard className="p-4 text-center">
                  <span className="text-xs text-muted block mb-1">Selling Price (Unit)</span>
                  <span className="text-2xl font-mono font-black text-rex-600">
                    {unitSellingPrice > 0 ? formatCurrency(unitSellingPrice) : 'Not Set'}
                  </span>
                  <span className="text-[10px] text-muted block mt-1">Per {uom}</span>
                </GlassCard>

                <GlassCard className="p-4 text-center">
                  <span className="text-xs text-muted block mb-1">Expected Profit Margin</span>
                  <span className={`text-2xl font-mono font-black ${grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {unitSellingPrice > 0 ? `${profitMargin.toFixed(1)}%` : '0%'}
                  </span>
                  <span className="text-[10px] text-muted block mt-1">
                    {grossProfit >= 0 ? `+${formatCurrency(grossProfit)} profit` : `${formatCurrency(grossProfit)} loss`}
                  </span>
                </GlassCard>
              </div>

              <GlassCard className="p-6 space-y-5">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <DollarSign size={16} className="text-rex-600" /> Selling Price Configuration
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Final Unit Selling Price (Rs) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-xs">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={sellingPrice}
                        onChange={e => setSellingPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full input-base pl-9 font-mono font-bold text-base text-primary"
                      />
                    </div>
                    <p className="text-[10px] text-muted mt-1">
                      Final quoted or retail selling price per {uom} for customer orders.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Quick Markup Helper</label>
                    <div className="flex items-center gap-2">
                      {[15, 25, 35, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const priceWithMarkup = totalBOMCost * (1 + pct / 100)
                            setSellingPrice(priceWithMarkup.toFixed(2))
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-surface border border-theme-subtle hover:border-primary/50 rounded-lg text-secondary hover:text-primary transition-all flex-1"
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted mt-1">
                      Click to auto-calculate price using BOM cost markup.
                    </p>
                  </div>
                </div>

                {/* Profitability Breakdown */}
                <div className="p-4 bg-surface2/50 rounded-xl border border-theme-subtle space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">Manufacturing Cost (BOMs):</span>
                    <span className="font-mono font-medium text-primary">{formatCurrency(totalBOMCost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary">Unit Gross Profit:</span>
                    <span className={`font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-theme-subtle">
                    <span className="font-bold text-primary">Profit Margin:</span>
                    <span className={`font-mono font-black ${profitMargin >= 20 ? 'text-emerald-500' : profitMargin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 4: STOCK LEDGER (WHEN EDITING ITEM) */}
          {activeTab === 'ledger' && product?.id && (
            <div className="space-y-6">
              {/* Add Adjustment Form */}
              <GlassCard className="p-5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <History size={15} className="text-rex-600" /> Record Stock In / Out Adjustment
                </h3>
                <form onSubmit={handleAddLedgerEntry} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Transaction Type</label>
                    <select
                      className="w-full input-base text-xs font-bold"
                      value={ledgerType}
                      onChange={e => setLedgerType(e.target.value as 'IN' | 'OUT')}
                    >
                      <option value="IN">Stock In (+)</option>
                      <option value="OUT">Stock Out (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Quantity ({uom})</label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full input-base font-mono text-xs"
                      value={ledgerQty}
                      onChange={e => setLedgerQty(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Reference / Reason</label>
                    <input
                      type="text"
                      className="w-full input-base text-xs"
                      value={ledgerNotes}
                      onChange={e => setLedgerNotes(e.target.value)}
                      placeholder="e.g. Production Batch #4, Audit adjustment"
                    />
                  </div>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={ledgerSubmitting || !ledgerQty}
                    className="h-9 text-xs"
                  >
                    {ledgerSubmitting ? 'Recording...' : 'Add Ledger Entry'}
                  </Button>
                </form>
              </GlassCard>

              {/* Ledger History Table */}
              <GlassCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-theme-subtle flex justify-between items-center bg-surface2/30">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Stock Movement Ledger History
                  </h4>
                  <span className="text-xs font-mono text-muted">
                    Current Stock: <strong className="text-primary">{initialQty} {uom}</strong>
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-surface2/50 border-b border-theme-subtle">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase">Date & Time</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase">Type</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase">Reference / Notes</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase text-right">Qty</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-subtle/20">
                    {ledger.map((row: any) => (
                      <tr key={row.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-secondary">{new Date(row.date).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <Badge variant={row.type === 'IN' ? 'success' : 'error'} size="sm">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-secondary font-medium">{row.notes || row.reference || '-'}</td>
                        <td className={`px-4 py-2.5 text-xs text-right font-mono font-bold ${row.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {row.type === 'IN' ? '+' : '-'}{row.qty}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-primary">{row.balance}</td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-muted italic">
                          No stock ledger movements recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </GlassCard>
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
}
