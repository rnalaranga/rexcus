import React, { useState } from 'react'
import { Plus, ArrowLeft, Search, Filter, Briefcase, Wrench, Calendar, MapPin, User, Shield, DollarSign, Download, Printer, Tag, Eye, Edit, Trash2, CheckCircle, AlertTriangle, Clock, RefreshCw, BarChart3, LayoutGrid, List, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface AssetDetails {
  serialNumber?: string
  brand?: string
  model?: string
  purchaseDate?: string
  warrantyExpiry?: string
  depreciationMethod?: 'Straight Line' | 'Reducing Balance'
  depreciationRate?: number
  salvageValue?: number
  currentBookValue?: number
  condition?: 'Brand New' | 'Excellent' | 'Good' | 'Fair' | 'Needs Repair' | 'Scrap'
  assignedCustodian?: string
  department?: string
  serviceProvider?: string
  lastServiceDate?: string
  nextServiceDate?: string
  notes?: string
}

interface AssetRegistryHubProps {
  assets: any[]
  loading?: boolean
  onSaveAsset: (assetData: any) => Promise<void>
  onDeleteAsset: (id: string) => Promise<void>
  onRefresh: () => void
  showToast: (type: 'success' | 'error', msg: string) => void
}

const ASSET_CATEGORIES = [
  'Heavy Machinery & Plant',
  'CNC & Precision Lathes',
  'Workshop Power Tools',
  'Welding & Fabrication Equipment',
  'Hydraulic Power Packs & Test Benches',
  'Vehicles & Material Handling',
  'Measurement & QC Instruments',
  'IT & Office Hardware',
  'General Factory Fixtures'
]

export const AssetRegistryHub: React.FC<AssetRegistryHubProps> = ({
  assets,
  loading,
  onSaveAsset,
  onDeleteAsset,
  onRefresh,
  showToast
}) => {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [printAsset, setPrintAsset] = useState<any | null>(null)

  // Form state
  const initialFormState = {
    id: '',
    name: '',
    sku: '', // Asset Tag / Code
    category: 'Heavy Machinery & Plant',
    subCategory: '',
    unitCost: '', // Purchase Cost
    unitPrice: '', // Current Book Value
    quantity: '1',
    uom: 'unit',
    location: '', // Workshop Bay / Area
    status: 'active', // active (Operational), maintenance, idle, decommissioned
    assetDetails: {
      serialNumber: '',
      brand: '',
      model: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      warrantyExpiry: '',
      depreciationMethod: 'Straight Line' as 'Straight Line' | 'Reducing Balance',
      depreciationRate: 10,
      salvageValue: 0,
      currentBookValue: 0,
      condition: 'Good' as AssetDetails['condition'],
      assignedCustodian: '',
      department: 'Production / Machine Shop',
      serviceProvider: '',
      lastServiceDate: '',
      nextServiceDate: '',
      notes: ''
    }
  }

  const [formData, setFormData] = useState(initialFormState)

  const parseAssetDetails = (item: any): AssetDetails => {
    if (!item) return {}
    if (item.assetDetails && typeof item.assetDetails === 'object') return item.assetDetails
    if (typeof item.assetDetails === 'string' && item.assetDetails.trim()) {
      try {
        return JSON.parse(item.assetDetails)
      } catch (e) {
        return {}
      }
    }
    return {}
  }

  // Calculate dynamic depreciation / book value helper
  const calculateBookValue = (cost: number, purchaseDateStr?: string, rate: number = 10, method: string = 'Straight Line'): number => {
    if (!cost || cost <= 0) return 0
    if (!purchaseDateStr) return cost
    try {
      const pDate = new Date(purchaseDateStr)
      const now = new Date()
      const years = Math.max(0, (now.getTime() - pDate.getTime()) / (365.25 * 24 * 3600 * 1000))
      if (method === 'Reducing Balance') {
        const remainingFraction = Math.pow(1 - (rate / 100), years)
        return Math.max(0, Math.round(cost * remainingFraction))
      } else {
        // Straight Line
        const totalDepreciation = cost * (rate / 100) * years
        return Math.max(0, Math.round(cost - totalDepreciation))
      }
    } catch (e) {
      return cost
    }
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    const nextNum = (assets.length + 1).toString().padStart(3, '0')
    setFormData({
      ...initialFormState,
      sku: `AST-${nextNum}`,
      id: `AST-${Date.now().toString().slice(-6)}`
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    const details = parseAssetDetails(item)
    setFormData({
      id: item.id,
      name: item.name || '',
      sku: item.sku || item.id,
      category: item.category || 'Heavy Machinery & Plant',
      subCategory: item.subCategory || '',
      unitCost: String(item.unitCost || ''),
      unitPrice: String(item.unitPrice || ''),
      quantity: String(item.quantity || '1'),
      uom: item.uom || 'unit',
      location: item.location || '',
      status: item.status || 'active',
      assetDetails: {
        serialNumber: details.serialNumber || '',
        brand: details.brand || '',
        model: details.model || '',
        purchaseDate: details.purchaseDate || '',
        warrantyExpiry: details.warrantyExpiry || '',
        depreciationMethod: details.depreciationMethod || 'Straight Line',
        depreciationRate: details.depreciationRate !== undefined ? details.depreciationRate : 10,
        salvageValue: details.salvageValue || 0,
        currentBookValue: details.currentBookValue !== undefined ? details.currentBookValue : Number(item.unitPrice || item.unitCost || 0),
        condition: details.condition || 'Good',
        assignedCustodian: details.assignedCustodian || '',
        department: details.department || 'Production / Machine Shop',
        serviceProvider: details.serviceProvider || '',
        lastServiceDate: details.lastServiceDate || '',
        nextServiceDate: details.nextServiceDate || '',
        notes: details.notes || ''
      }
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('error', 'Asset Name is required')
      return
    }

    setSaving(true)
    try {
      const cost = Number(formData.unitCost) || 0
      const calculatedBook = calculateBookValue(
        cost,
        formData.assetDetails.purchaseDate,
        formData.assetDetails.depreciationRate,
        formData.assetDetails.depreciationMethod
      )

      const payload = {
        id: formData.id || editingItem?.id || `AST-${Date.now().toString().slice(-6)}`,
        type: 'company_asset',
        name: formData.name.trim(),
        sku: formData.sku.trim() || formData.id,
        category: formData.category,
        subCategory: formData.subCategory,
        unitCost: cost,
        unitPrice: calculatedBook, // stores current net book value
        quantity: Number(formData.quantity) || 1,
        uom: formData.uom || 'unit',
        location: formData.location.trim(),
        status: formData.status,
        assetDetails: JSON.stringify({
          ...formData.assetDetails,
          currentBookValue: calculatedBook
        })
      }

      await onSaveAsset(payload)
      showToast('success', editingItem ? 'Asset updated successfully' : 'New asset registered successfully')
      setModalOpen(false)
      onRefresh()
    } catch (err: any) {
      showToast('error', 'Failed saving asset: ' + (err?.message || 'Server error'))
    } finally {
      setSaving(false)
    }
  }

  // Filtered Assets
  const filteredAssets = assets.filter(item => {
    const details = parseAssetDetails(item)
    const q = search.toLowerCase().trim()
    const matchSearch = !q || 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (details.serialNumber && details.serialNumber.toLowerCase().includes(q)) ||
      (details.brand && details.brand.toLowerCase().includes(q)) ||
      (details.model && details.model.toLowerCase().includes(q)) ||
      (details.assignedCustodian && details.assignedCustodian.toLowerCase().includes(q)) ||
      (details.department && details.department.toLowerCase().includes(q))

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchStatus = selectedStatus === 'all' || item.status === selectedStatus

    return matchSearch && matchCategory && matchStatus
  })

  // KPI Computations
  const totalAssetsCount = assets.length
  const totalAcquisitionCost = assets.reduce((sum, item) => sum + (Number(item.unitCost || 0) * Number(item.quantity || 1)), 0)
  const totalNetBookValue = assets.reduce((sum, item) => {
    const details = parseAssetDetails(item)
    const cost = Number(item.unitCost || 0)
    const val = details.currentBookValue !== undefined ? Number(details.currentBookValue) : (Number(item.unitPrice || 0) || cost)
    return sum + val
  }, 0)
  const activeCount = assets.filter(i => i.status === 'active' || !i.status).length
  const maintenanceCount = assets.filter(i => i.status === 'maintenance').length
  const idleCount = assets.filter(i => i.status === 'idle').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm" className="flex items-center gap-1"><CheckCircle size={11}/> In Use / Operational</Badge>
      case 'maintenance':
        return <Badge variant="warning" size="sm" className="flex items-center gap-1"><Wrench size={11}/> Under Maintenance</Badge>
      case 'idle':
        return <Badge variant="default" size="sm" className="flex items-center gap-1"><Clock size={11}/> Idle / Standby</Badge>
      case 'decommissioned':
        return <Badge variant="error" size="sm" className="flex items-center gap-1"><AlertTriangle size={11}/> Decommissioned</Badge>
      default:
        return <Badge variant="success" size="sm">Operational</Badge>
    }
  }

  const getConditionColor = (cond?: string) => {
    switch (cond) {
      case 'Brand New':
      case 'Excellent':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      case 'Good':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'Fair':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
      case 'Needs Repair':
      case 'Scrap':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Asset KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-rex-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Registered Assets</span>
            <div className="p-2 bg-rex-500/10 text-rex-600 rounded-lg"><Briefcase size={18}/></div>
          </div>
          <div className="text-2xl font-black text-primary mt-2">{totalAssetsCount}</div>
          <p className="text-[11px] text-muted mt-1">{activeCount} active in operation</p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Capital Investment (Cost)</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><DollarSign size={18}/></div>
          </div>
          <div className="text-xl font-bold font-mono text-primary mt-2">{formatCurrency(totalAcquisitionCost)}</div>
          <p className="text-[11px] text-muted mt-1">Acquisition purchase value</p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Current Net Book Value</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><BarChart3 size={18}/></div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-2">{formatCurrency(totalNetBookValue)}</div>
          <p className="text-[11px] text-muted mt-1">After cumulative depreciation</p>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Maintenance & Standby</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Wrench size={18}/></div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-xl font-bold text-amber-500">{maintenanceCount} <span className="text-xs font-normal text-muted">Repair</span></div>
            <div className="text-slate-300">|</div>
            <div className="text-xl font-bold text-slate-500">{idleCount} <span className="text-xs font-normal text-muted">Idle</span></div>
          </div>
          <p className="text-[11px] text-muted mt-1">Requires inspection / review</p>
        </GlassCard>
      </div>

      {/* Action Header & Filtering */}
      <GlassCard className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 text-muted" size={15} />
              <input 
                type="text" 
                placeholder="Search tag #, asset name, serial, brand, custodian..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full input-base pl-9 text-xs h-9"
              />
            </div>

            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="input-base text-xs h-9 max-w-[210px]"
            >
              <option value="all">All Categories</option>
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value)}
              className="input-base text-xs h-9 max-w-[170px]"
            >
              <option value="all">All Operational Status</option>
              <option value="active">In Use / Operational</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="idle">Idle / Standby</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface2/60 p-0.5 rounded-lg border border-theme-subtle">
              <button 
                type="button" 
                onClick={() => setViewMode('table')} 
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}
                title="Table View"
              >
                <List size={16}/>
              </button>
              <button 
                type="button" 
                onClick={() => setViewMode('grid')} 
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}
                title="Card Grid View"
              >
                <LayoutGrid size={16}/>
              </button>
            </div>

            <Button 
              variant="primary" 
              size="sm" 
              icon={Plus} 
              onClick={handleOpenAdd}
              className="h-9 font-semibold"
            >
              Register New Asset
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Main Asset View */}
      {viewMode === 'table' ? (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface2/60 border-b border-theme-subtle">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Asset Code / Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Category & Location</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Custodian / Dept</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Status & Condition</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Purchase Cost</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Net Book Value</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/50 text-xs">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted">Loading assets registry...</td></tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted">
                      <Briefcase size={36} className="mx-auto mb-2 opacity-30"/>
                      <p className="font-semibold text-primary">No company assets found</p>
                      <p className="text-xs text-muted mt-1">Register machine tools, vehicles, plant fixtures, or equipment to track depreciation and custody.</p>
                      <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd} className="mt-4">
                        Register First Asset
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map(item => {
                    const details = parseAssetDetails(item)
                    const cost = Number(item.unitCost || 0)
                    const bookVal = details.currentBookValue !== undefined ? Number(details.currentBookValue) : (Number(item.unitPrice || 0) || cost)
                    
                    return (
                      <tr key={item.id} className="hover:bg-surface2/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap">
                              {item.sku || item.id}
                            </span>
                            <div>
                              <div className="font-bold text-primary text-sm">{item.name}</div>
                              <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                                {details.brand && <span>{details.brand}</span>}
                                {details.model && <span>• {details.model}</span>}
                                {details.serialNumber && <span className="font-mono text-[10px] bg-surface2 px-1 rounded">SN: {details.serialNumber}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-secondary font-medium">{item.category || 'General Equipment'}</div>
                          <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-muted"/>
                            {item.location || 'Location not specified'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-primary font-medium flex items-center gap-1">
                            <User size={12} className="text-rex-500"/>
                            {details.assignedCustodian || 'Unassigned'}
                          </div>
                          <div className="text-[11px] text-muted">{details.department || 'General Plant'}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            {getStatusBadge(item.status)}
                            {details.condition && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getConditionColor(details.condition)}`}>
                                {details.condition}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-secondary font-semibold">
                          {cost > 0 ? formatCurrency(cost) : '-'}
                          {details.purchaseDate && (
                            <div className="text-[10px] text-muted font-normal">{details.purchaseDate}</div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(bookVal)}
                          <div className="text-[10px] text-muted font-normal">
                            {details.depreciationRate ? `${details.depreciationRate}% / yr` : 'No dep.'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPrintAsset(item)}
                              className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-rex-600 transition-colors"
                              title="Print Asset Tag / Barcode Card"
                            >
                              <Tag size={15}/>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
                              title="Edit Asset Details"
                            >
                              <Edit size={15}/>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors"
                              title="Delete Asset"
                            >
                              <Trash2 size={15}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map(item => {
            const details = parseAssetDetails(item)
            const cost = Number(item.unitCost || 0)
            const bookVal = details.currentBookValue !== undefined ? Number(details.currentBookValue) : (Number(item.unitPrice || 0) || cost)

            return (
              <GlassCard key={item.id} className="p-4 flex flex-col justify-between hover:border-theme-hover transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {item.sku || item.id}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div>
                    <h3 className="font-bold text-primary text-base">{item.name}</h3>
                    <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                      {details.brand && <span className="font-semibold text-secondary">{details.brand}</span>}
                      {details.model && <span>{details.model}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-surface2/30 p-2.5 rounded-lg border border-theme-subtle/50">
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold block">Location</span>
                      <span className="font-medium text-secondary truncate block">{item.location || 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold block">Custodian</span>
                      <span className="font-medium text-primary truncate block">{details.assignedCustodian || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold block">Acquisition Cost</span>
                      <span className="font-mono font-semibold text-secondary">{formatCurrency(cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold block">Book Value</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(bookVal)}</span>
                    </div>
                  </div>

                  {details.condition && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted text-[11px]">Condition:</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getConditionColor(details.condition)}`}>
                        {details.condition}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-theme-subtle/60 pt-3 mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={Tag} 
                    onClick={() => setPrintAsset(item)}
                    className="h-7 text-xs text-muted hover:text-primary"
                  >
                    Asset Tag
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={Edit} 
                      onClick={() => handleOpenEdit(item)}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Register / Edit Asset In-Page Studio */}
      {modalOpen && (
        <GlassCard className="p-6 mb-6 border-t-4 border-t-rex-600 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-theme-subtle">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setModalOpen(false)}
                type="button"
                className="text-xs font-semibold"
              >
                Back to Asset List
              </Button>
              <div>
                <h3 className="text-base font-bold text-primary">
                  {editingItem ? `Edit Asset: ${editingItem.name}` : "Register New Company Asset Studio"}
                </h3>
                <p className="text-xs text-muted">Fixed asset registry, capitalization, depreciation, and custodian tracking.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving Asset...' : editingItem ? 'Save Asset Changes' : 'Register Asset to Fleet'}
              </Button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Doosan Puma CNC Lathe"
                className="w-full input-base text-xs"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Asset Tag / Code (Unique) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. AST-001 or CNC-01"
                className="w-full input-base text-xs font-mono"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Asset Category</label>
              <select
                className="w-full input-base text-xs"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Operational Status</label>
              <select
                className="w-full input-base text-xs"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">In Use / Operational</option>
                <option value="maintenance">Under Maintenance / Repair</option>
                <option value="idle">Idle / Standby</option>
                <option value="decommissioned">Decommissioned / Disposed</option>
              </select>
            </div>
          </div>

          {/* Machine & Hardware Specifications */}
          <div className="p-3 bg-surface2/30 rounded-lg border border-theme-subtle space-y-3">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-rex-500"/> Machine Specs & Identification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Brand / Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Doosan, Mazak, Bosch"
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.brand}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, brand: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Model Number</label>
                <input
                  type="text"
                  placeholder="e.g. Puma 2600Y"
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.model}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, model: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. SN-982310-A"
                  className="w-full input-base text-xs font-mono"
                  value={formData.assetDetails.serialNumber}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, serialNumber: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Location & Custody */}
          <div className="p-3 bg-surface2/30 rounded-lg border border-theme-subtle space-y-3">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-500"/> Location & Custody
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Workshop Bay / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bay 1 - CNC Shop"
                  className="w-full input-base text-xs"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Assigned Custodian / Operator</label>
                <input
                  type="text"
                  placeholder="e.g. Nimal Perera"
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.assignedCustodian}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, assignedCustodian: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Machine Shop"
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.department}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, department: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Financial & Depreciation Settings */}
          <div className="p-3 bg-surface2/30 rounded-lg border border-theme-subtle space-y-3">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-blue-500"/> Financial Valuation & Depreciation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Purchase Date</label>
                <input
                  type="date"
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.purchaseDate}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, purchaseDate: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Acquisition Cost (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full input-base text-xs font-mono"
                  value={formData.unitCost}
                  onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Depreciation Method</label>
                <select
                  className="w-full input-base text-xs"
                  value={formData.assetDetails.depreciationMethod}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, depreciationMethod: e.target.value as any }
                  })}
                >
                  <option value="Straight Line">Straight Line</option>
                  <option value="Reducing Balance">Reducing Balance</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">Annual Dep. Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="w-full input-base text-xs font-mono"
                  value={formData.assetDetails.depreciationRate}
                  onChange={e => setFormData({
                    ...formData,
                    assetDetails: { ...formData.assetDetails, depreciationRate: Number(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 px-1 bg-surface/50 p-2 rounded">
              <span className="text-muted">Auto-calculated Net Book Value:</span>
              <span className="font-mono font-bold text-emerald-600">
                {formatCurrency(calculateBookValue(
                  Number(formData.unitCost) || 0,
                  formData.assetDetails.purchaseDate,
                  formData.assetDetails.depreciationRate,
                  formData.assetDetails.depreciationMethod
                ))}
              </span>
            </div>
          </div>

          {/* Condition, Warranty & Maintenance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Physical Condition</label>
              <select
                className="w-full input-base text-xs"
                value={formData.assetDetails.condition}
                onChange={e => setFormData({
                  ...formData,
                  assetDetails: { ...formData.assetDetails, condition: e.target.value as any }
                })}
              >
                <option value="Brand New">Brand New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Scrap">Scrap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Warranty Expiry</label>
              <input
                type="date"
                className="w-full input-base text-xs"
                value={formData.assetDetails.warrantyExpiry}
                onChange={e => setFormData({
                  ...formData,
                  assetDetails: { ...formData.assetDetails, warrantyExpiry: e.target.value }
                })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">AMC / Service Provider</label>
              <input
                type="text"
                placeholder="e.g. Agent Name / Contact"
                className="w-full input-base text-xs"
                value={formData.assetDetails.serviceProvider}
                onChange={e => setFormData({
                  ...formData,
                  assetDetails: { ...formData.assetDetails, serviceProvider: e.target.value }
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Maintenance & Asset Notes</label>
            <textarea
              rows={2}
              placeholder="Record asset modifications, special tooling attachments, or servicing remarks..."
              className="w-full input-base text-xs"
              value={formData.assetDetails.notes}
              onChange={e => setFormData({
                ...formData,
                assetDetails: { ...formData.assetDetails, notes: e.target.value }
              })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving Asset...' : editingItem ? 'Save Asset Changes' : 'Register Asset'}
            </Button>
          </div>
        </form>
      </GlassCard>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Asset Deletion"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to remove this asset from the company register? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button 
              variant="primary" 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!deleteConfirmId) return
                await onDeleteAsset(deleteConfirmId)
                showToast('success', 'Asset removed successfully')
                setDeleteConfirmId(null)
                onRefresh()
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset Barcode / Printable Tag Modal */}
      {printAsset && (
        <Modal
          isOpen={!!printAsset}
          onClose={() => setPrintAsset(null)}
          title="Asset Tag & Identification Card"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div id="asset-print-tag" className="bg-white text-slate-900 p-6 rounded-lg border-2 border-slate-900 space-y-3 font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <div>
                  <h3 className="text-sm font-black tracking-widest uppercase">REX INDUSTRIES (PVT) LTD</h3>
                  <span className="text-[10px] text-slate-600 font-bold tracking-wider">OFFICIAL ASSET REGISTRY TAG</span>
                </div>
                <div className="bg-slate-900 text-white px-2.5 py-1 rounded font-mono font-bold text-xs">
                  {printAsset.sku || printAsset.id}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Asset Description</span>
                <h4 className="text-base font-bold text-slate-900">{printAsset.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-200 py-2">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Category</span>
                  <span className="font-semibold">{printAsset.category || 'General Plant'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Location</span>
                  <span className="font-semibold">{printAsset.location || 'Factory Floor'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Serial No</span>
                  <span className="font-mono">{parseAssetDetails(printAsset).serialNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Custodian</span>
                  <span className="font-semibold">{parseAssetDetails(printAsset).assignedCustodian || 'Unassigned'}</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <div className="inline-block p-1 bg-slate-100 rounded border border-slate-300 font-mono text-[10px] tracking-widest font-bold">
                  * {printAsset.sku || printAsset.id} *
                </div>
                <p className="text-[8px] text-slate-500 mt-1">Property of Rex Industries • Unauthorized removal is strictly prohibited</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPrintAsset(null)}>Close</Button>
              <Button 
                variant="primary" 
                icon={Printer}
                onClick={() => {
                  const content = document.getElementById('asset-print-tag');
                  if (!content) return;
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<!DOCTYPE html><html><head><title>Asset Tag - ${printAsset.sku}</title><style>body{margin:20px;font-family:sans-serif;}@page{size:80mm 60mm;margin:0;}</style></head><body>${content.outerHTML}</body></html>`);
                  win.document.close();
                  win.focus();
                  win.print();
                }}
              >
                Print Tag
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
