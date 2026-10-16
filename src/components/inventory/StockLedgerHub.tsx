import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, RefreshCw, Printer, Download, Calendar, Layers, Box, AlertTriangle, CheckCircle, FileText, User, MapPin, DollarSign, Scale, Sparkles, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import { fetchFullStockLedger, fetchStockLedger, addStockLedgerEntry, reconcileStock } from '@/lib/api'

interface StockLedgerHubProps {
  selectedInventoryItem?: any | null
  inventoryList?: any[]
  onClose?: () => void
  onUpdateInventory?: () => void
  showToast: (type: 'success' | 'error', msg: string) => void
}

export const StockLedgerHub: React.FC<StockLedgerHubProps> = ({
  selectedInventoryItem = null,
  inventoryList = [],
  onClose,
  onUpdateInventory,
  showToast
}) => {
  const [activeItem, setActiveItem] = useState<any | null>(selectedInventoryItem)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all')

  // Modals
  const [addMovementOpen, setAddMovementOpen] = useState(false)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [printStatementOpen, setPrintStatementOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Movement Form
  const [movementForm, setMovementForm] = useState({
    inventoryId: activeItem?.id || '',
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT' | 'SCRAP' | 'TRANSFER',
    qty: '',
    unitCost: activeItem?.unitCost || '',
    reference: '',
    location: activeItem?.location || '',
    batchNo: '',
    user: 'Store Keeper',
    notes: ''
  })

  // Reconciliation Form
  const [reconcileForm, setReconcileForm] = useState({
    inventoryId: activeItem?.id || '',
    physicalCount: activeItem ? String(activeItem.quantity || 0) : '',
    reference: 'Physical Cycle Count Audit',
    user: 'Store Auditor',
    notes: 'Regular periodic stock audit'
  })

  // Load Data
  const loadLedger = async () => {
    setLoading(true)
    try {
      if (activeItem?.id) {
        const data = await fetchStockLedger(activeItem.id)
        setLedgerEntries(Array.isArray(data) ? data : [])
      } else {
        const data = await fetchFullStockLedger()
        setLedgerEntries(Array.isArray(data) ? data : [])
      }
    } catch (e: any) {
      console.error(e)
      setLedgerEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLedger()
  }, [activeItem])

  useEffect(() => {
    if (selectedInventoryItem) {
      setActiveItem(selectedInventoryItem)
      setMovementForm(prev => ({
        ...prev,
        inventoryId: selectedInventoryItem.id,
        unitCost: selectedInventoryItem.unitCost || '',
        location: selectedInventoryItem.location || ''
      }))
      setReconcileForm(prev => ({
        ...prev,
        inventoryId: selectedInventoryItem.id,
        physicalCount: String(selectedInventoryItem.quantity || 0)
      }))
    }
  }, [selectedInventoryItem])

  // Handle Add Movement
  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetItemId = movementForm.inventoryId || activeItem?.id
    if (!targetItemId) {
      showToast('error', 'Please select an item')
      return
    }
    if (!movementForm.qty || Number(movementForm.qty) <= 0) {
      showToast('error', 'Please enter a valid quantity')
      return
    }

    setSubmitting(true)
    try {
      await addStockLedgerEntry(targetItemId, {
        type: movementForm.type,
        qty: Number(movementForm.qty),
        unitCost: Number(movementForm.unitCost || 0),
        totalCost: Number(movementForm.qty) * Number(movementForm.unitCost || 0),
        reference: movementForm.reference.trim(),
        location: movementForm.location.trim(),
        batchNo: movementForm.batchNo.trim(),
        user: movementForm.user.trim(),
        notes: movementForm.notes.trim(),
        date: new Date().toISOString().slice(0, 19).replace('T', ' ')
      })

      showToast('success', `Stock movement [${movementForm.type}] recorded successfully`)
      setAddMovementOpen(false)
      setMovementForm({
        ...movementForm,
        qty: '',
        reference: '',
        notes: ''
      })
      loadLedger()
      if (onUpdateInventory) onUpdateInventory()
    } catch (err: any) {
      showToast('error', 'Failed recording movement: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Physical Stock Reconciliation
  const handleReconcileStock = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetItemId = reconcileForm.inventoryId || activeItem?.id
    if (!targetItemId) {
      showToast('error', 'Please select an item to reconcile')
      return
    }
    if (reconcileForm.physicalCount === '' || Number(reconcileForm.physicalCount) < 0) {
      showToast('error', 'Please enter a valid physical count')
      return
    }

    setSubmitting(true)
    try {
      const res = await reconcileStock({
        inventoryId: targetItemId,
        physicalCount: Number(reconcileForm.physicalCount),
        reference: reconcileForm.reference.trim(),
        user: reconcileForm.user.trim(),
        notes: reconcileForm.notes.trim()
      })

      showToast('success', `Stock successfully reconciled to ${res.targetCount} (Variance: ${res.variance >= 0 ? '+' : ''}${res.variance})`)
      setReconcileOpen(false)
      loadLedger()
      if (onUpdateInventory) onUpdateInventory()
    } catch (err: any) {
      showToast('error', 'Failed reconciling stock: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter Ledger Entries
  const filteredEntries = ledgerEntries.filter(entry => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q ||
      (entry.materialName && entry.materialName.toLowerCase().includes(q)) ||
      (entry.sku && entry.sku.toLowerCase().includes(q)) ||
      (entry.reference && entry.reference.toLowerCase().includes(q)) ||
      (entry.notes && entry.notes.toLowerCase().includes(q)) ||
      (entry.user && entry.user.toLowerCase().includes(q)) ||
      (entry.batchNo && entry.batchNo.toLowerCase().includes(q))

    const typeUpper = String(entry.type || '').toUpperCase()
    let matchType = true
    if (typeFilter === 'IN') matchType = typeUpper === 'IN' || typeUpper === 'RECEIPT' || typeUpper === 'RETURN'
    else if (typeFilter === 'OUT') matchType = typeUpper === 'OUT' || typeUpper === 'DISPATCH'
    else if (typeFilter === 'ADJUSTMENT') matchType = typeUpper.includes('ADJ') || typeUpper === 'RECONCILE'
    else if (typeFilter === 'SCRAP') matchType = typeUpper === 'SCRAP'
    else if (typeFilter === 'TRANSFER') matchType = typeUpper === 'TRANSFER'

    let matchDate = true
    if (dateFilter !== 'all' && entry.date) {
      const entryTime = new Date(entry.date).getTime()
      const now = new Date().getTime()
      const diffDays = (now - entryTime) / (1000 * 3600 * 24)
      if (dateFilter === 'today') matchDate = diffDays <= 1
      else if (dateFilter === '7days') matchDate = diffDays <= 7
      else if (dateFilter === '30days') matchDate = diffDays <= 30
    }

    return matchSearch && matchType && matchDate
  })

  // KPI calculations
  const totalMovements = ledgerEntries.length
  const totalInflow = ledgerEntries
    .filter(e => {
      const t = String(e.type || '').toUpperCase()
      return t === 'IN' || t === 'RECEIPT' || t === 'ADJUSTMENT_IN'
    })
    .reduce((sum, e) => sum + Number(e.qty || 0), 0)

  const totalOutflow = ledgerEntries
    .filter(e => {
      const t = String(e.type || '').toUpperCase()
      return t === 'OUT' || t === 'SCRAP' || t === 'DISPATCH' || t === 'ADJUSTMENT_OUT'
    })
    .reduce((sum, e) => sum + Number(e.qty || 0), 0)

  const totalValueMovement = ledgerEntries.reduce((sum, e) => sum + (Number(e.totalCost || 0) || (Number(e.qty || 0) * Number(e.unitCost || 0))), 0)

  // Current target item details for reconciliation preview
  const reconcileTargetItem = inventoryList.find(i => i.id === (reconcileForm.inventoryId || activeItem?.id)) || activeItem
  const currentTargetQty = Number(reconcileTargetItem?.quantity || 0)
  const targetCountInput = Number(reconcileForm.physicalCount || 0)
  const countDiscrepancy = targetCountInput - currentTargetQty

  const getTypeBadge = (type: string) => {
    const t = String(type || '').toUpperCase()
    if (t === 'IN' || t === 'RECEIPT') {
      return <Badge variant="success" size="sm" className="flex items-center gap-1"><ArrowDownRight size={11}/> Stock IN</Badge>
    } else if (t === 'OUT' || t === 'DISPATCH') {
      return <Badge variant="error" size="sm" className="flex items-center gap-1"><ArrowUpRight size={11}/> Stock OUT</Badge>
    } else if (t.includes('ADJ') || t === 'RECONCILE') {
      return <Badge variant="warning" size="sm" className="flex items-center gap-1"><Scale size={11}/> Reconciliation</Badge>
    } else if (t === 'SCRAP') {
      return <Badge variant="error" size="sm" className="flex items-center gap-1"><AlertTriangle size={11}/> Scrap / Write-off</Badge>
    } else if (t === 'TRANSFER') {
      return <Badge variant="info" size="sm" className="flex items-center gap-1"><RefreshCw size={11}/> Bin Relocate</Badge>
    }
    return <Badge variant="default" size="sm">{t}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface2/40 p-4 rounded-xl border border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rex-600/10 text-rex-600 rounded-lg">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-primary">
                {activeItem ? `Stock Ledger: ${activeItem.name}` : 'Centralized Warehouse Stock Movement Ledger'}
              </h2>
              {activeItem && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                  {activeItem.sku || activeItem.id}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {activeItem 
                ? `Current Stock Balance: ${activeItem.quantity} ${activeItem.uom || 'pcs'} • Bin: ${activeItem.location || 'N/A'}`
                : 'Real-time movement audit across all inventory parts, raw materials, and finished goods.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveItem(null)}
              className="text-xs h-9 border border-theme-subtle"
            >
              View All Items
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon={Scale}
            onClick={() => setReconcileOpen(true)}
            className="text-xs h-9 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 font-semibold"
          >
            Physical Count Audit
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setAddMovementOpen(true)}
            className="text-xs h-9 font-semibold"
          >
            Record Stock Movement
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => setPrintStatementOpen(true)}
            className="text-xs h-9"
            title="Print Stock Movement Statement"
          >
            Print
          </Button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-muted hover:text-primary rounded-lg hover:bg-surface2 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-rex-600">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Audited Transactions</span>
          <div className="text-2xl font-black text-primary mt-1">{totalMovements}</div>
          <span className="text-[11px] text-muted">Complete audit trail entries</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Total Inflow Volume</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowDownRight size={18}/> +{totalInflow.toLocaleString()} {activeItem?.uom || 'units'}
          </div>
          <span className="text-[11px] text-muted">Purchases & Production intake</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-red-500">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Total Outflow Volume</span>
          <div className="text-xl font-bold font-mono text-red-500 mt-1 flex items-center gap-1">
            <ArrowUpRight size={18}/> -{totalOutflow.toLocaleString()} {activeItem?.uom || 'units'}
          </div>
          <span className="text-[11px] text-muted">Dispatches & WO consumption</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-blue-500">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Gross Valuation Flow</span>
          <div className="text-xl font-bold font-mono text-primary mt-1">
            {formatCurrency(totalValueMovement)}
          </div>
          <span className="text-[11px] text-muted">Inventory cost throughput</span>
        </GlassCard>
      </div>

      {/* Filter and Switcher Toolbar */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 text-muted" size={14} />
              <input
                type="text"
                placeholder="Search ref #, item, batch, auditor, notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full input-base pl-9 text-xs h-8"
              />
            </div>

            {/* Quick Item Switcher Dropdown */}
            {inventoryList.length > 0 && (
              <select
                value={activeItem?.id || ''}
                onChange={e => {
                  const it = inventoryList.find(i => i.id === e.target.value)
                  setActiveItem(it || null)
                }}
                className="input-base text-xs h-8 max-w-[220px]"
              >
                <option value="">All Inventory Items</option>
                {inventoryList.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.sku || i.id})
                  </option>
                ))}
              </select>
            )}

            {/* Movement Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="input-base text-xs h-8 max-w-[160px]"
            >
              <option value="all">All Movements</option>
              <option value="IN">Inflow (+ IN)</option>
              <option value="OUT">Outflow (- OUT)</option>
              <option value="ADJUSTMENT">Reconciliations</option>
              <option value="SCRAP">Scrap / Write-off</option>
              <option value="TRANSFER">Bin Transfer</option>
            </select>

            {/* Date filter */}
            <div className="flex items-center bg-surface2/60 p-0.5 rounded-lg border border-theme-subtle text-xs">
              {(['all', 'today', '7days', '30days'] as const).map(df => (
                <button
                  key={df}
                  type="button"
                  onClick={() => setDateFilter(df)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${dateFilter === df ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                >
                  {df === 'all' ? 'All' : df === 'today' ? 'Today' : df === '7days' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted flex items-center gap-2">
            <span>Showing <strong className="text-primary">{filteredEntries.length}</strong> records</span>
          </div>
        </div>
      </GlassCard>

      {/* Ledger History Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface2/60 border-b border-theme-subtle">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Date & Time</th>
                {!activeItem && <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Item Details</th>}
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Movement Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Reference Doc / PO / WO</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Qty Change</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Running Balance</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider text-right">Unit Rate</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">Storage Bin / Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle/50 text-xs">
              {loading ? (
                <tr><td colSpan={activeItem ? 7 : 8} className="p-8 text-center text-muted">Loading stock ledger movements...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={activeItem ? 7 : 8} className="p-10 text-center text-muted">
                    <Box size={32} className="mx-auto mb-2 opacity-30"/>
                    <p className="font-semibold text-primary">No stock movement entries recorded</p>
                    <p className="text-xs text-muted mt-1">Record a stock receipt, issue, or physical count reconciliation to initiate tracking.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const t = String(entry.type || '').toUpperCase()
                  const isPositive = t === 'IN' || t === 'RECEIPT' || t === 'ADJUSTMENT_IN'
                  const isNegative = t === 'OUT' || t === 'DISPATCH' || t === 'SCRAP' || t === 'ADJUSTMENT_OUT'
                  
                  return (
                    <tr key={entry.id} className="hover:bg-surface2/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-secondary font-medium">
                        {entry.date ? new Date(entry.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>

                      {!activeItem && (
                        <td className="px-4 py-3">
                          <div className="font-bold text-primary">{entry.materialName || 'Item'}</div>
                          {entry.sku && <div className="text-[10px] font-mono text-muted">{entry.sku}</div>}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        {getTypeBadge(entry.type)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface2 text-primary border border-theme-subtle">
                          {entry.reference || 'Manual Entry'}
                        </span>
                        {entry.notes && (
                          <div className="text-[10px] text-muted truncate max-w-xs mt-0.5" title={entry.notes}>
                            {entry.notes}
                          </div>
                        )}
                      </td>

                      <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-primary'}`}>
                        {isPositive ? '+' : isNegative ? '-' : ''}{entry.qty} {entry.unit || activeItem?.uom || ''}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-primary text-sm bg-surface2/20">
                        {entry.balance !== undefined ? entry.balance : '-'} {entry.unit || activeItem?.uom || ''}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-secondary">
                        {Number(entry.unitCost || 0) > 0 ? formatCurrency(entry.unitCost) : '-'}
                      </td>

                      <td className="px-4 py-3 text-secondary">
                        <div className="flex items-center gap-1 text-[11px]">
                          <MapPin size={11} className="text-muted"/>
                          <span>{entry.location || 'Store Floor'}</span>
                        </div>
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <User size={10}/>
                          <span>{entry.user || 'Store Keeper'}</span>
                          {entry.batchNo && <span className="font-mono bg-surface2 px-1 rounded ml-1">Batch: {entry.batchNo}</span>}
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

      {/* Record Stock Movement Modal */}
      <Modal
        isOpen={addMovementOpen}
        onClose={() => setAddMovementOpen(false)}
        title="Record Stock Movement"
        className="max-w-lg"
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Select Inventory Item <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full input-base text-xs"
              value={movementForm.inventoryId}
              onChange={e => {
                const found = inventoryList.find(i => i.id === e.target.value)
                setMovementForm({
                  ...movementForm,
                  inventoryId: e.target.value,
                  unitCost: found?.unitCost || movementForm.unitCost,
                  location: found?.location || movementForm.location
                })
              }}
            >
              <option value="">-- Choose Item --</option>
              {inventoryList.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku || i.id}) - Current: {i.quantity} {i.uom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Movement Type</label>
              <select
                className="w-full input-base text-xs"
                value={movementForm.type}
                onChange={e => setMovementForm({ ...movementForm, type: e.target.value as any })}
              >
                <option value="IN">Stock IN (+ Inward Receipt / PO)</option>
                <option value="OUT">Stock OUT (- Outward / Work Order)</option>
                <option value="ADJUSTMENT">Physical Count Adjustment (+/-)</option>
                <option value="SCRAP">Scrap / Write-off (- Damaged)</option>
                <option value="TRANSFER">Internal Relocation / Bin Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full input-base text-xs font-mono"
                value={movementForm.qty}
                onChange={e => setMovementForm({ ...movementForm, qty: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Unit Purchase Cost (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full input-base text-xs font-mono"
                value={movementForm.unitCost}
                onChange={e => setMovementForm({ ...movementForm, unitCost: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Storage Location / Bay</label>
              <input
                type="text"
                placeholder="e.g. Bay 2, Rack C4"
                className="w-full input-base text-xs"
                value={movementForm.location}
                onChange={e => setMovementForm({ ...movementForm, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Reference Document / Ref #</label>
              <input
                type="text"
                placeholder="e.g. PO-2026-001, WO-04, GRN-12"
                className="w-full input-base text-xs font-mono"
                value={movementForm.reference}
                onChange={e => setMovementForm({ ...movementForm, reference: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Batch / Heat / Lot #</label>
              <input
                type="text"
                placeholder="e.g. BATCH-882"
                className="w-full input-base text-xs font-mono"
                value={movementForm.batchNo}
                onChange={e => setMovementForm({ ...movementForm, batchNo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Operator / Handled By</label>
            <input
              type="text"
              placeholder="e.g. Store Keeper / Nimal"
              className="w-full input-base text-xs"
              value={movementForm.user}
              onChange={e => setMovementForm({ ...movementForm, user: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Movement Notes & Remarks</label>
            <textarea
              rows={2}
              placeholder="Reason for adjustment, supplier inspection notes, or work order allocation..."
              className="w-full input-base text-xs"
              value={movementForm.notes}
              onChange={e => setMovementForm({ ...movementForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setAddMovementOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Recording...' : 'Save Stock Movement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cycle Count / Stock Reconciliation Modal */}
      <Modal
        isOpen={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        title="Physical Cycle Count Stock Reconciliation"
        className="max-w-md"
      >
        <form onSubmit={handleReconcileStock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Select Item to Reconcile <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full input-base text-xs"
              value={reconcileForm.inventoryId}
              onChange={e => setReconcileForm({ ...reconcileForm, inventoryId: e.target.value })}
            >
              <option value="">-- Choose Item --</option>
              {inventoryList.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku || i.id})
                </option>
              ))}
            </select>
          </div>

          {reconcileTargetItem && (
            <div className="bg-surface2/40 p-3 rounded-lg border border-theme-subtle space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Recorded System Stock:</span>
                <span className="font-mono font-bold text-primary">{currentTargetQty} {reconcileTargetItem.uom}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Storage Location:</span>
                <span className="font-medium text-secondary">{reconcileTargetItem.location || 'Store Floor'}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Actual Counted Physical Stock <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter physically counted quantity"
              className="w-full input-base text-sm font-mono font-bold"
              value={reconcileForm.physicalCount}
              onChange={e => setReconcileForm({ ...reconcileForm, physicalCount: e.target.value })}
            />
          </div>

          {/* Variance Preview */}
          {reconcileTargetItem && reconcileForm.physicalCount !== '' && (
            <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${countDiscrepancy === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : countDiscrepancy > 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
              <div className="flex items-center gap-1.5">
                {countDiscrepancy === 0 ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}
                <span>Discrepancy / Variance:</span>
              </div>
              <span className="font-mono text-sm font-bold">
                {countDiscrepancy > 0 ? `+${countDiscrepancy}` : countDiscrepancy} {reconcileTargetItem.uom}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Auditor / Verifier Name</label>
            <input
              type="text"
              className="w-full input-base text-xs"
              value={reconcileForm.user}
              onChange={e => setReconcileForm({ ...reconcileForm, user: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Audit Reference / Session</label>
            <input
              type="text"
              className="w-full input-base text-xs font-mono"
              value={reconcileForm.reference}
              onChange={e => setReconcileForm({ ...reconcileForm, reference: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Audit Remarks / Justification</label>
            <textarea
              rows={2}
              className="w-full input-base text-xs"
              value={reconcileForm.notes}
              onChange={e => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setReconcileOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Reconciling...' : 'Confirm & Adjust Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Stock Statement Modal */}
      {printStatementOpen && (
        <Modal
          isOpen={printStatementOpen}
          onClose={() => setPrintStatementOpen(false)}
          title="Print Stock Movement Audit Statement"
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div id="stock-statement-print" className="bg-white text-slate-900 p-8 rounded-lg border border-slate-200 space-y-4 font-sans">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <h2 className="text-lg font-black tracking-wider uppercase text-slate-900">REX INDUSTRIES (PVT) LTD</h2>
                  <p className="text-xs text-slate-600">Precision Machining • Hydraulics • Metal Fabrication</p>
                  <p className="text-[11px] text-slate-500">Official Stock Movement & Audit Trail Statement</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 block">Date of Statement</span>
                  <span className="font-mono text-xs">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {activeItem && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-500 block">Item Name:</span><strong className="text-slate-900">{activeItem.name}</strong></div>
                  <div><span className="text-slate-500 block">SKU:</span><strong className="font-mono">{activeItem.sku || activeItem.id}</strong></div>
                  <div><span className="text-slate-500 block">Current Balance:</span><strong className="font-mono text-emerald-700">{activeItem.quantity} {activeItem.uom}</strong></div>
                </div>
              )}

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-400 font-bold text-slate-700">
                    <th className="py-2">Date</th>
                    {!activeItem && <th className="py-2">Item</th>}
                    <th className="py-2">Type</th>
                    <th className="py-2">Ref #</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEntries.slice(0, 50).map((r, i) => (
                    <tr key={i} className="py-1">
                      <td className="py-1.5">{new Date(r.date).toLocaleDateString()}</td>
                      {!activeItem && <td className="py-1.5 font-semibold">{r.materialName}</td>}
                      <td className="py-1.5 font-bold">{r.type}</td>
                      <td className="py-1.5 font-mono">{r.reference || '-'}</td>
                      <td className="py-1.5 text-right font-mono">{r.qty}</td>
                      <td className="py-1.5 text-right font-mono font-bold">{r.balance || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 border-t border-slate-300 flex justify-between text-xs text-slate-600">
                <div>Prepared By: ___________________</div>
                <div>Authorized Store Keeper: ___________________</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPrintStatementOpen(false)}>Close</Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() => {
                  const content = document.getElementById('stock-statement-print');
                  if (!content) return;
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<!DOCTYPE html><html><head><title>Stock Statement</title><style>body{margin:20mm;font-family:sans-serif;}@page{size:A4;margin:15mm;}</style></head><body>${content.outerHTML}</body></html>`);
                  win.document.close();
                  win.focus();
                  win.print();
                }}
              >
                Print Statement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
