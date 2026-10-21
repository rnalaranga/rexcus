import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { 
  Package, DollarSign, Layers, Plus, Trash2, ChevronDown, ChevronUp, 
  ExternalLink, Image as ImageIcon, Upload, X, Save, AlertCircle, 
  Clock, Wrench, FileText, CheckCircle2, TrendingUp, BarChart3, History, ArrowRight, ArrowLeft,
  Camera, Barcode, Tag, Boxes, MapPin, Link2, AlignLeft, Sparkles
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

export interface ProductSparePart {
  id: string | number
  partNo: string
  name: string
  sku?: string
  inventoryId?: string
  qtyPerAssembly: number
  unitPrice: number
  unitCost: number
  uom: string
  stock?: number
  description?: string
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
  isPage?: boolean
  inventoryList?: any[]
}

export const FinishedProductModal: React.FC<FinishedProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  isPage = false,
  inventoryList
}) => {
  const { data: rawOperations } = useMachiningOperations()
  const { data: hookInventory, refetch: refetchInventory } = useInventory()
  const inventory = (inventoryList && inventoryList.length > 0) ? inventoryList : (hookInventory || [])

  // Automatically refresh inventory list when the modal opens
  useEffect(() => {
    if (isOpen) {
      refetchInventory()
    }
  }, [isOpen, refetchInventory])
  
  const [activeTab, setActiveTab] = useState<'info' | 'boms' | 'spare_parts' | 'pricing' | 'ledger'>('info')
  const [spareParts, setSpareParts] = useState<ProductSparePart[]>([])
  const [isSparePart, setIsSparePart] = useState(false)
  const [parentProductId, setParentProductId] = useState('')
  const [partNo, setPartNo] = useState('')
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

      setIsSparePart(Boolean(product.isSparePart || product.category === 'Spare Parts'))
      setParentProductId(product.parentProductId || '')
      setPartNo(product.partNo || '')

      let loadedSpares: ProductSparePart[] = []
      if (product.spareParts) {
        try {
          loadedSpares = typeof product.spareParts === 'string' ? JSON.parse(product.spareParts) : product.spareParts
        } catch (e) {
          loadedSpares = []
        }
      }
      setSpareParts(Array.isArray(loadedSpares) ? loadedSpares : [])
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

  // Filter available ready-made products / machines that a spare part can belong to
  const availableMachines = useMemo(() => {
    return (inventory || []).filter((i: any) => {
      // Exclude spare parts
      const isSpare = Boolean(
        i.isSparePart === 1 || 
        i.isSparePart === '1' || 
        i.isSparePart === true || 
        i.isSparePart === 'true' || 
        i.category === 'Spare Parts'
      )
      if (isSpare) return false

      // Exclude self if editing
      if (product?.id && i.id === product.id) return false

      // Must be a finished good / ready-made machine / standard part
      const isFinished = 
        i.type === 'finished_product' || 
        i.type === 'product' || 
        i.category === 'Standard Parts' || 
        (!i.type && i.category !== 'Raw Metals & Alloys') ||
        (i.category && !['Spare Parts', 'Raw Metals & Alloys', 'Plates & Sheets', 'Round & Hex Bars', 'Pipes & Hollow Tubes'].includes(i.category))

      // Also ensure not raw material or asset or service
      const isOtherType = i.type === 'raw_material' || i.type === 'company_asset' || i.type === 'service'

      return isFinished && !isOtherType
    })
  }, [inventory, product?.id])

  // Merge inventory items that are spare parts of this product
  const matchingInventorySpares = useMemo(() => {
    if (!product?.id) return []
    return (inventory || []).filter((i: any) => i.parentProductId === product.id || (i.isSparePart && i.parentProductId === product.id))
  }, [inventory, product?.id])

  const allProductSpares = useMemo(() => {
    const list: any[] = [...spareParts]
    matchingInventorySpares.forEach((sp: any) => {
      if (!list.some(s => s.id === sp.id || (s.inventoryId && s.inventoryId === sp.id))) {
        list.push({
          id: sp.id,
          partNo: sp.partNo || 'SP',
          name: sp.name,
          sku: sp.sku,
          inventoryId: sp.id,
          qtyPerAssembly: 1,
          unitCost: Number(sp.unitCost || 0),
          unitPrice: Number(sp.unitPrice || 0),
          uom: sp.uom || 'pcs',
          stock: sp.quantity !== undefined ? Number(sp.quantity) : 0,
          description: sp.description,
          imageUrl: sp.imageUrl
        })
      }
    })
    return list
  }, [spareParts, matchingInventorySpares])

  // Spare Parts Helpers
  const populateFromBOM = () => {
    const newSpares: ProductSparePart[] = []
    let partIndex = spareParts.length + 1

    boms.forEach((bom) => {
      (bom.autoMats || []).forEach((m: any) => {
        const matName = m.matName || m.name || `Component ${partIndex}`
        if (!newSpares.some(s => s.name.toLowerCase() === matName.toLowerCase()) && 
            !spareParts.some(s => s.name.toLowerCase() === matName.toLowerCase())) {
          const cost = Number(m.unitPrice || m.cost || 0)
          const sellingPrice = cost > 0 ? Math.round(cost * 1.4) : 0
          newSpares.push({
            id: Date.now() + Math.random(),
            partNo: `SP-${String(partIndex).padStart(2, '0')}`,
            name: matName,
            sku: m.sku || `SPK-${String(partIndex).padStart(3, '0')}`,
            inventoryId: m.inventoryId || m.id,
            qtyPerAssembly: Number(m.reqQty || m.qty || 1),
            unitCost: cost,
            unitPrice: sellingPrice,
            uom: m.uom || 'pcs',
            stock: m.stock !== undefined ? Number(m.stock) : undefined,
            description: `Used in: ${bom.title}`
          })
          partIndex++
        }
      });

      (bom.manualMats || []).forEach((m: any) => {
        const matName = m.matName || m.name || `Part ${partIndex}`
        if (!newSpares.some(s => s.name.toLowerCase() === matName.toLowerCase()) && 
            !spareParts.some(s => s.name.toLowerCase() === matName.toLowerCase())) {
          const cost = Number(m.unitCost || m.cost || 0)
          const sellingPrice = cost > 0 ? Math.round(cost * 1.4) : 0
          newSpares.push({
            id: Date.now() + Math.random(),
            partNo: `SP-${String(partIndex).padStart(2, '0')}`,
            name: matName,
            sku: `SPK-${String(partIndex).padStart(3, '0')}`,
            qtyPerAssembly: Number(m.qty || 1),
            unitCost: cost,
            unitPrice: sellingPrice,
            uom: m.uom || 'pcs',
            description: `Custom BOM part from ${bom.title}`
          })
          partIndex++
        }
      })
    })

    if (newSpares.length === 0) {
      alert('No new materials found in BOMs to import.')
      return
    }

    setSpareParts(prev => [...prev, ...newSpares])
  }

  const addSparePart = () => {
    const nextNum = spareParts.length + 1
    setSpareParts(prev => [
      ...prev,
      {
        id: Date.now(),
        partNo: `SP-${String(nextNum).padStart(2, '0')}`,
        name: '',
        sku: '',
        qtyPerAssembly: 1,
        unitPrice: 0,
        unitCost: 0,
        uom: 'pcs',
        description: ''
      }
    ])
  }

  const updateSparePart = (id: string | number, field: keyof ProductSparePart, val: any) => {
    setSpareParts(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }

  const removeSparePart = (id: string | number) => {
    setSpareParts(prev => prev.filter(p => p.id !== id))
  }

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (!isPage && isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev || 'unset'
      }
    }
  }, [isOpen, isPage])

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
      spareParts: JSON.stringify(spareParts),
      isSparePart: isSparePart ? 1 : 0,
      parentProductId: isSparePart ? parentProductId : null,
      partNo: isSparePart ? partNo : null,
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

  const modalBody = (
    <div className={isPage ? "w-full min-h-[calc(100vh-100px)] flex flex-col animate-fade-in pb-12" : "fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-hidden"}>
      <div 
        className={isPage ? "relative w-full flex-1 bg-surface border border-theme-subtle rounded-2xl shadow-xl flex flex-col overflow-hidden" : "relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-surface border border-theme-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden"}
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-theme-subtle bg-surface2/40 shrink-0">
          <div className="flex items-center gap-3">
            {isPage && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-surface2 rounded-md text-muted hover:text-primary transition-colors border border-theme-subtle flex items-center gap-1.5 text-xs font-semibold mr-1 whitespace-nowrap shrink-0"
                title="Back to Finished Goods"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
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
              className="p-2 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
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
              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
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
            {!isSparePart && (
              <button
                type="button"
                onClick={() => setActiveTab('spare_parts')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                  activeTab === 'spare_parts' 
                    ? 'bg-rex-600 text-white shadow-sm font-bold' 
                    : 'text-muted hover:text-primary hover:bg-surface2'
                }`}
              >
                <Wrench size={14} /> Spare Parts Breakdown ({allProductSpares.length})
                {allProductSpares.length > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${activeTab === 'spare_parts' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 font-bold'}`}>
                    {allProductSpares.length}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
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
                className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
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

          {/* TAB 1: PRODUCT INFO & MEDIA (CLEAN REDESIGN) */}
          {activeTab === 'info' && (
            <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
              
              {/* Product Classification: Machine vs Spare Part */}
              <div className="bg-surface border border-theme-subtle rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-secondary">Item Type:</span>
                  <div className="inline-flex rounded-xl border border-theme-subtle p-0.5 bg-surface2/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSparePart(false);
                        if (category === 'Spare Parts') setCategory('Standard Parts');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        !isSparePart
                          ? 'bg-rex-600 text-white shadow-xs'
                          : 'text-muted hover:text-primary'
                      }`}
                    >
                      <Package size={13} /> Complete Ready-Made Product
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSparePart(true);
                        setCategory('Spare Parts');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSparePart
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : 'text-muted hover:text-primary'
                      }`}
                    >
                      <Wrench size={13} /> Spare Part / Component
                    </button>
                  </div>
                </div>

                {isSparePart && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-secondary">Part No:</label>
                      <input
                        type="text"
                        value={partNo}
                        onChange={e => setPartNo(e.target.value)}
                        placeholder="e.g. SP-01"
                        className="w-24 px-2 py-1 rounded-lg border border-theme-subtle bg-surface text-xs font-mono font-bold text-amber-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-secondary whitespace-nowrap">Belongs to Machine:</label>
                      <select
                        value={parentProductId}
                        onChange={e => setParentProductId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-theme-subtle bg-surface text-xs text-primary font-medium focus:outline-none focus:border-amber-500 min-w-[250px] max-w-[340px]"
                      >
                        <option value="">-- Standalone Spare Part (No Parent Machine) --</option>
                        {availableMachines.length === 0 ? (
                          <option disabled value="__empty__">
                            No Ready-Made Products found
                          </option>
                        ) : (
                          availableMachines.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : `(${p.id})`} {p.category ? `• ${p.category}` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      {availableMachines.length > 0 && (
                        <span className="text-[10px] text-muted font-mono font-semibold whitespace-nowrap">
                          ({availableMachines.length} available)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Core Identification & Photo Card */}
              <div className="bg-surface border border-theme-subtle rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-theme-subtle/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rex-500/10 text-rex-600 flex items-center justify-center font-bold">
                      <Package size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary">Core Identification</h3>
                      <p className="text-[11px] text-muted">Primary product name, catalog code, category, and visual preview</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-rex-500/10 text-rex-600 font-bold border border-rex-500/20">
                    {category}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Compact, elegant Photo Thumbnail / Uploader */}
                  <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-40">
                    <div className="relative group w-36 h-36 rounded-2xl overflow-hidden border-2 border-dashed border-theme-subtle hover:border-rex-500/50 bg-surface2/30 flex flex-col items-center justify-center transition-all shadow-xs">
                      {imageUrl ? (
                        <>
                          <img src={imageUrl} alt={name || 'Product'} className="w-full h-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-xs">
                            <label className="cursor-pointer text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1">
                              <Camera size={12} /> Change
                              <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-3 text-center group-hover:scale-102 transition-transform">
                          <div className="w-10 h-10 rounded-xl bg-rex-500/10 text-rex-500 flex items-center justify-center mb-1.5 group-hover:bg-rex-500/20 transition-colors">
                            <Camera size={18} />
                          </div>
                          <span className="text-xs font-bold text-primary group-hover:text-rex-600 transition-colors">Add Photo</span>
                          <span className="text-[10px] text-muted leading-tight mt-0.5">Click to upload</span>
                          <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                        </label>
                      )}
                    </div>
                    {/* Direct Image URL input */}
                    <div className="w-36">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="Or paste URL..."
                        className="w-full text-[10px] font-mono px-2 py-1 rounded-lg border border-theme-subtle bg-surface focus:outline-none focus:border-rex-500 placeholder:text-muted/40 text-secondary"
                      />
                    </div>
                  </div>

                  {/* Primary Product Inputs (Spacious & Clean) */}
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1.5">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Industrial Hydraulic Cylinder 50×300mm"
                        className="w-full px-4 py-2.5 rounded-xl border border-theme-subtle bg-surface text-primary font-bold text-sm focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all placeholder:font-normal placeholder:text-muted/40"
                      />
                    </div>

                    {/* Product Specifications & Line-by-Line Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-secondary flex items-center gap-1.5">
                          <AlignLeft size={13} className="text-rex-500" />
                          <span>Product Specifications & Description (Line by Line)</span>
                          {description && (
                            <span className="text-[10px] font-semibold text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">
                              {description.split('\n').filter(l => l.trim()).length} lines
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDescription(prev => {
                                if (!prev || prev.trim() === '') return '• '
                                return prev.endsWith('\n') ? `${prev}• ` : `${prev}\n• `
                              })
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rex-600 dark:text-rex-400 bg-rex-500/10 hover:bg-rex-500/20 border border-rex-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Add a new bullet point line"
                          >
                            <Plus size={12} /> Add Bullet (•)
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const textarea = e.currentTarget
                            const cursor = textarea.selectionStart
                            const textBeforeCursor = textarea.value.substring(0, cursor)
                            const currentLine = textBeforeCursor.split('\n').pop() || ''
                            if (currentLine.trim().startsWith('•') || currentLine.trim().startsWith('-')) {
                              e.preventDefault()
                              const prefix = currentLine.trim().startsWith('•') ? '\n• ' : '\n- '
                              const textAfterCursor = textarea.value.substring(cursor)
                              const nextVal = textBeforeCursor + prefix + textAfterCursor
                              setDescription(nextVal)
                              setTimeout(() => {
                                textarea.selectionStart = textarea.selectionEnd = cursor + prefix.length
                              }, 0)
                            }
                          }
                        }}
                        placeholder={`Enter item specifications line-by-line (Press Enter for next line):\n• Bore: 50mm | Stroke: 300mm\n• Working Pressure: 210 Bar\n• Rod Material: Hard Chrome Plated EN8D\n• Finish: Zinc Phosphated & Painted Black`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-theme-subtle bg-surface text-xs font-mono text-primary leading-relaxed focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all resize-y placeholder:text-muted/40 placeholder:font-sans"
                      />
                      <p className="text-[10px] text-muted mt-1 flex items-center justify-between">
                        <span>Each line displays as an individual spec bullet on quotations, invoices & catalogue.</span>
                        <span className="hidden sm:inline text-[9px] text-muted/70">Press <kbd className="px-1 py-0.2 rounded bg-surface2 font-mono border border-theme-subtle">Enter</kbd> to continue bullets</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
                          <Barcode size={13} className="text-muted" /> Product SKU / Code
                        </label>
                        <input
                          type="text"
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          placeholder="e.g. PRD-5302"
                          className="w-full px-3 py-2 rounded-xl border border-theme-subtle bg-surface font-mono font-semibold text-xs text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
                          <Tag size={13} className="text-muted" /> Category
                        </label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-theme-subtle bg-surface font-semibold text-xs text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all cursor-pointer"
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
                        <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
                          <Boxes size={13} className="text-muted" /> Unit of Measure (UOM)
                        </label>
                        <select
                          value={uom}
                          onChange={e => setUom(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-theme-subtle bg-surface font-semibold text-xs text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all cursor-pointer"
                        >
                          <option value="pcs">Pieces (pcs)</option>
                          <option value="sets">Sets (sets)</option>
                          <option value="units">Units (units)</option>
                          <option value="assemblies">Assemblies</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="meters">Meters (m)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Technical Specifications, Storage & Drawings */}
              <div className="bg-surface border border-theme-subtle rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-theme-subtle/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <FileText size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary">Technical Specifications & Storage</h3>
                      <p className="text-[11px] text-muted">Engineering tolerances, drawings folder, and warehouse bin location</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted" /> Storage / Warehouse Bin Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Bay 3 / Rack B-04 / Shelf 2"
                      className="w-full px-3.5 py-2 rounded-xl border border-theme-subtle bg-surface text-xs font-medium text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all placeholder:text-muted/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Link2 size={13} className="text-muted" /> CAD & Engineering Drawings Link</span>
                      {drawingsUrl && (
                        <a href={drawingsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                          Open Link <ExternalLink size={10} />
                        </a>
                      )}
                    </label>
                    <input
                      type="url"
                      value={drawingsUrl}
                      onChange={e => setDrawingsUrl(e.target.value)}
                      placeholder="e.g. https://drive.google.com/drive/folders/..."
                      className="w-full px-3.5 py-2 rounded-xl border border-theme-subtle bg-surface text-xs font-mono text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 shadow-xs transition-all placeholder:text-muted/40"
                    />
                  </div>


                </div>
              </div>

              {/* 3. Real-Time Stock Quantities & Reorder Monitoring */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current Stock Card */}
                <div className="bg-surface border border-theme-subtle rounded-2xl p-4 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-theme-strong transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <Boxes size={14} className="text-rex-600" /> Current Stock
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-surface2 text-muted border border-theme-subtle">
                      In-Hand ({uom})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={initialQty}
                      onChange={e => setInitialQty(e.target.value)}
                      className="w-28 text-2xl font-black font-mono px-3 py-1.5 rounded-xl border border-theme-subtle bg-surface2/50 text-primary focus:bg-surface focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/20 transition-all"
                    />
                    <span className="text-xs font-semibold text-muted">{uom} on-hand</span>
                  </div>
                  <p className="text-[10px] text-muted mt-2">Starting physical inventory count in warehouse</p>
                </div>

                {/* Reorder Threshold Card */}
                <div className="bg-surface border border-theme-subtle rounded-2xl p-4 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-500" /> Reorder Trigger
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Alert Point
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={reorderLevel}
                      onChange={e => setReorderLevel(e.target.value)}
                      className="w-28 text-2xl font-black font-mono px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 focus:bg-surface focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                    <span className="text-xs font-semibold text-muted">min threshold</span>
                  </div>
                  <p className="text-[10px] text-muted mt-2">Alerts when inventory drops below this level</p>
                </div>

                {/* BOM Cost & Pricing Snapshot Card */}
                <div className="bg-surface border border-theme-subtle rounded-2xl p-4 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-500" /> BOM Rollup Cost
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {boms.length} BOM {boms.length === 1 ? 'Part' : 'Parts'}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalBOMCost)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-theme-subtle/40">
                    <span className="text-[10px] text-muted">Estimated manufacturing cost</span>
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('pricing')} 
                      className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      Set Pricing &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Action Banner to Next Step */}
              <div className="bg-gradient-to-r from-rex-500/10 via-surface to-rex-500/5 border border-rex-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rex-600 text-white flex items-center justify-center font-bold shadow-md shadow-rex-600/20 shrink-0">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">Next Step: Configure Bill of Materials (BOM)</h4>
                    <p className="text-[11px] text-muted mt-0.5">Define raw plates/shafts, fasteners, and machining operations to calculate accurate manufacturing cost.</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => setActiveTab('boms')}
                  className="font-bold text-xs px-4 py-2 shrink-0 flex items-center gap-1.5 shadow-md shadow-rex-600/20"
                >
                  Configure BOM Parts <ArrowRight size={14} />
                </Button>
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

          {/* TAB 3: SPARE PARTS BREAKDOWN CATALOG */}
          {activeTab === 'spare_parts' && (
            <div className="space-y-5 animate-fade-in max-w-6xl mx-auto">
              {/* Header card with guidance and auto-populate action */}
              <div className="bg-surface border border-theme-subtle rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span>Spare Parts & Replacement Components Catalog</span>
                      <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {spareParts.length} {spareParts.length === 1 ? 'Part' : 'Parts'} Defined
                      </span>
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Define individual spare parts for this product. Customers can order either the complete product or individual spare parts via Product Quotations.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Sparkles}
                    onClick={populateFromBOM}
                    className="text-xs border-rex-500/30 hover:border-rex-500 text-rex-600 cursor-pointer"
                    title="Scan BOM materials and auto-create spare parts with part numbers"
                  >
                    Auto-Populate from BOM
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={addSparePart}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Add Spare Part
                  </Button>
                </div>
              </div>

              {/* Spare Parts Table */}
              <div className="bg-surface border border-theme-subtle rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-theme-subtle/60 flex items-center justify-between bg-surface2/30">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Exploded Parts List & Standalone Selling Rates
                  </span>
                  <span className="text-[11px] text-muted">
                    Total Parts Value: <strong className="font-mono text-primary">{formatCurrency(allProductSpares.reduce((s, p) => s + (Number(p.unitPrice) || 0), 0))}</strong>
                  </span>
                </div>

                {allProductSpares.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface2 text-muted flex items-center justify-center mx-auto mb-3">
                      <Wrench size={22} className="opacity-50" />
                    </div>
                    <h4 className="text-sm font-bold text-primary">No Spare Parts Defined Yet</h4>
                    <p className="text-xs text-muted max-w-md mx-auto mt-1 mb-4">
                      Add individual replacement parts or click "Auto-Populate from BOM" to quickly convert components from your Bill of Materials into sellable spare parts.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Sparkles}
                        onClick={populateFromBOM}
                        className="text-xs text-rex-600 cursor-pointer"
                      >
                        Auto-Populate from BOM
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={addSparePart}
                        className="text-xs font-bold cursor-pointer"
                      >
                        Add Manual Spare Part
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-theme-subtle bg-surface2/50 text-[10px] font-bold text-muted uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-2 w-10 text-center">Photo</th>
                          <th className="py-2.5 px-3 w-28">Part No. / Ref</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Spare Part Name & Specs</th>
                          <th className="py-2.5 px-3 w-28">SKU</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty/Assy</th>
                          <th className="py-2.5 px-3 w-20 text-center">UOM</th>
                          <th className="py-2.5 px-3 w-28 text-right">Cost (Rs.)</th>
                          <th className="py-2.5 px-3 w-32 text-right">Selling Price (Rs.)</th>
                          <th className="py-2.5 px-3 w-20 text-center">Margin</th>
                          <th className="py-2.5 px-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-subtle/50">
                        {allProductSpares.map((sp: any, idx: number) => {
                          const cost = Number(sp.unitCost || 0)
                          const price = Number(sp.unitPrice || 0)
                          const margin = price > 0 ? ((price - cost) / price) * 100 : 0

                          return (
                            <tr key={sp.id} className="hover:bg-surface2/30 transition-colors">
                              <td className="py-2 px-3 text-center text-muted font-mono text-[10px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <div className="w-8 h-8 rounded-lg border border-theme-subtle overflow-hidden mx-auto bg-surface2 flex items-center justify-center shadow-2xs">
                                  {sp.imageUrl ? (
                                    <img src={sp.imageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Wrench size={12} className="text-amber-500/70" />
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sp.partNo}
                                  onChange={e => updateSparePart(sp.id, 'partNo', e.target.value)}
                                  placeholder="e.g. SP-01"
                                  className="w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-rex-500 font-mono font-bold text-primary outline-none text-xs px-1 py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sp.name}
                                  onChange={e => updateSparePart(sp.id, 'name', e.target.value)}
                                  placeholder="Spare part title / description..."
                                  className="w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-rex-500 font-semibold text-primary outline-none text-xs px-1 py-0.5"
                                />
                                <input
                                  type="text"
                                  value={sp.description || ''}
                                  onChange={e => updateSparePart(sp.id, 'description', e.target.value)}
                                  placeholder="Optional material specs, tolerances, notes..."
                                  className="w-full bg-transparent text-[10px] text-muted outline-none px-1 py-0.2 placeholder:text-muted/30"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={sp.sku || ''}
                                  onChange={e => updateSparePart(sp.id, 'sku', e.target.value)}
                                  placeholder="e.g. PRD-SP-01"
                                  className="w-full bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-rex-500 font-mono text-muted outline-none text-xs px-1 py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={sp.qtyPerAssembly}
                                  onChange={e => updateSparePart(sp.id, 'qtyPerAssembly', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-14 text-center bg-transparent border border-theme-subtle rounded font-mono font-bold text-primary outline-none text-xs py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="text"
                                  value={sp.uom || 'pcs'}
                                  onChange={e => updateSparePart(sp.id, 'uom', e.target.value)}
                                  className="w-14 text-center bg-transparent text-secondary outline-none text-xs py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={sp.unitCost || ''}
                                  onChange={e => updateSparePart(sp.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full text-right bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-rex-500 font-mono text-muted outline-none text-xs px-1 py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={sp.unitPrice || ''}
                                  onChange={e => updateSparePart(sp.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-full text-right bg-transparent border-b border-transparent hover:border-theme-subtle focus:border-rex-500 font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none text-xs px-1 py-0.5"
                                />
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-[10px] font-bold">
                                {price > 0 ? (
                                  <span className={margin >= 20 ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-red-500'}>
                                    {margin.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeSparePart(sp.id)}
                                  className="p-1 hover:bg-red-500/10 text-muted hover:text-red-500 rounded transition-colors"
                                  title="Remove spare part"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FINAL PRICING & MARGIN */}
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

  if (isPage) return modalBody

  return typeof document !== 'undefined' ? createPortal(modalBody, document.body) : null
}
