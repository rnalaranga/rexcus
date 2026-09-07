import React, { useState } from 'react'
import { Plus, Search, Filter, Package, Wrench, Edit, Trash2, ArrowLeft, Info, DollarSign, Truck, Save, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useInventory, useSuppliers, useStockLedger } from '@/hooks/useData'
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, addStockLedgerEntry } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type TabType = 'all' | 'product' | 'service'

const StockLedgerView = ({ inventoryId, onUpdate }: { inventoryId: string, onUpdate: () => void }) => {
  const { data: ledger, loading, refetch } = useStockLedger(inventoryId)
  const [type, setType] = useState<'IN'|'OUT'>('IN')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qty || Number(qty) <= 0) return
    setSubmitting(true)
    await addStockLedgerEntry(inventoryId, {
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      type,
      qty: Number(qty),
      notes
    })
    setQty('')
    setNotes('')
    setSubmitting(false)
    refetch()
    onUpdate() // refresh parent inventory list
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Add Stock Entry</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Type</label>
            <select className="w-full input-base" value={type} onChange={e => setType(e.target.value as 'IN'|'OUT')}>
              <option value="IN">Stock In (+)</option>
              <option value="OUT">Stock Out (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Quantity</label>
            <input required type="number" min="0.01" step="0.01" className="w-full input-base" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Notes / Ref</label>
            <input type="text" className="w-full input-base" value={notes} onChange={e => setNotes(e.target.value)} placeholder="PO-123 or Adjustment" />
          </div>
          <Button variant="primary" type="submit" disabled={submitting}>{submitting ? '...' : 'Add Entry'}</Button>
        </form>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-theme-subtle">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Ledger History</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-surface2/50 border-b border-theme-subtle">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase">Date</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase">Type</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase">Notes</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase text-right">Qty</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="p-4 text-center text-xs text-muted">Loading...</td></tr> : null}
            {!loading && ledger.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-xs text-muted">No entries yet.</td></tr> : null}
            {ledger.map((row: any) => (
              <tr key={row.id} className="border-b border-theme-subtle/50 hover:bg-surface2/30 transition-colors">
                <td className="px-4 py-3 text-xs text-secondary">{new Date(row.date).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs"><Badge variant={row.type === 'IN' ? 'success' : 'error'} size="sm">{row.type}</Badge></td>
                <td className="px-4 py-3 text-xs text-secondary">{row.notes || '-'}</td>
                <td className={`px-4 py-3 text-xs text-right font-mono font-medium ${row.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {row.type === 'IN' ? '+' : '-'}{row.qty}
                </td>
                <td className="px-4 py-3 text-xs text-right font-mono font-bold text-primary">{row.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

export const Inventory: React.FC = () => {
  const { data: inventory, loading, refetch } = useInventory()
  const { data: suppliersList } = useSuppliers()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [search, setSearch] = useState('')
  
  const [showForm, setShowForm] = useState(false)
  const [formTab, setFormTab] = useState<'details' | 'ledger'>('details')
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const showToast = (type: 'success'|'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const initialForm = { type: 'product', name: '', sku: '', description: '', unitPrice: '', unitCost: '', quantity: '0', status: 'active', uom: 'pcs', suppliers: [] as string[], location: '', reorderLevel: '0' }
  const [formData, setFormData] = useState(initialForm)

  const filteredData = inventory.filter(item => 
    (activeTab === 'all' || item.type === activeTab) &&
    (item.name.toLowerCase().includes(search.toLowerCase()) || (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())))
  )

  const handleOpenForm = (item?: any) => {
    if (item) {
      let parsedSuppliers: string[] = []
      try {
        if (item.suppliers) parsedSuppliers = JSON.parse(item.suppliers)
      } catch (e) {
        if (typeof item.suppliers === 'string') parsedSuppliers = [item.suppliers]
      }

      setEditId(item.id)
      setFormData({
        type: item.type,
        name: item.name,
        sku: item.sku || '',
        description: item.description || '',
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        quantity: item.quantity,
        status: item.status,
        uom: item.uom || 'pcs',
        suppliers: parsedSuppliers,
        location: item.location || '',
        reorderLevel: item.reorderLevel || '0'
      })
    } else {
      setEditId(null)
      setFormData(initialForm)
    }
    setFormTab('details')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      id: editId || `INV-${Date.now().toString().slice(-6)}`,
      ...formData,
      suppliers: JSON.stringify(formData.suppliers),
      unitPrice: Number(formData.unitPrice),
      unitCost: Number(formData.unitCost),
      quantity: Number(formData.quantity),
      reorderLevel: Number(formData.reorderLevel)
    }

    try {
      if (editId) {
        await updateInventoryItem(editId, payload)
      } else {
        await createInventoryItem(payload)
      }
      refetch()
      setShowForm(false)
      showToast('success', 'Item saved successfully')
    } catch (err) {
      console.error(err)
      showToast('error', 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    await deleteInventoryItem(deleteTarget)
    refetch()
    setShowForm(false)
    setDeleteTarget(null)
    setSubmitting(false)
    showToast('success', 'Item deleted')
  }

  const columns: Column<any>[] = [
    {
      header: 'Item Details',
      key: 'name',
      render: (val: any, item) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${item.type === 'product' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
            {item.type === 'product' ? <Package size={16} /> : <Wrench size={16} />}
          </div>
          <div>
            <div className="font-semibold text-primary">{val}</div>
            {item.sku && <div className="text-[10px] text-muted font-mono">{item.sku}</div>}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      key: 'type',
      render: (val: any) => (
        <Badge variant={val === 'product' ? 'info' : 'warning'}>
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </Badge>
      )
    },
    {
      header: 'Suppliers / Location',
      key: 'suppliers',
      render: (_, item) => {
        let parsed = []
        try { parsed = item.suppliers ? JSON.parse(item.suppliers) : [] } catch (e) {}
        return (
          <div>
            <div className="flex flex-wrap gap-1 mb-1">
              {parsed.length > 0 
                ? parsed.map((s: string) => <span key={s} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">{s}</span>)
                : <span className="text-xs text-secondary">-</span>}
            </div>
            {item.location && <div className="text-[10px] text-muted">Bin: {item.location}</div>}
          </div>
        )
      }
    },
    {
      header: 'Stock / Qty',
      key: 'quantity',
      render: (val: any, item) => item.type === 'product' ? (
        <span className={`font-mono ${Number(val) <= Number(item.reorderLevel || 0) ? 'text-red-500 font-bold' : 'text-secondary'}`}>
          {val} {item.uom} {Number(val) <= Number(item.reorderLevel || 0) && <span className="text-[10px] ml-1">(Low)</span>}
        </span>
      ) : (
        <span className="text-muted text-xs italic">N/A</span>
      )
    },
    {
      header: 'Price (Rs)',
      key: 'unitPrice',
      render: (val: any, item) => (
        <div>
          <span className="font-mono text-secondary">{formatCurrency(val, true)}</span>
          {item.type === 'service' && <span className="text-[10px] text-muted ml-1">/ {item.uom}</span>}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (val: any) => (
        <Badge variant={val === 'active' ? 'success' : 'default'}>{String(val || 'active').toUpperCase()}</Badge>
      )
    },
    {
      header: '',
      key: 'id',
      render: (_, item) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleOpenForm(item)} className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"><Edit size={14}/></button>
          <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
        </div>
      )
    }
  ]

  if (showForm) {
    return (
      <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setShowForm(false)} type="button">Back</Button>
              <h1 className="text-2xl font-bold text-primary tracking-tight">{editId ? "Edit Item" : "Add New Item"}</h1>
            </div>
            
            {editId && formData.type === 'product' && (
              <div className="flex bg-surface2/50 p-1 rounded-lg border border-theme-subtle">
                <button 
                  type="button"
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formTab === 'details' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                  onClick={() => setFormTab('details')}
                >Item Details</button>
                <button 
                  type="button"
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${formTab === 'ledger' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                  onClick={() => setFormTab('ledger')}
                >Stock Ledger</button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              {formTab === 'details' && (
                <Button variant="primary" type="submit" icon={Save} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Item'}
                </Button>
              )}
            </div>
          </div>

          {formTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column (Main Specs) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* General Info Card */}
              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-5 flex items-center gap-2"><Info size={16}/> General Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Item Name *</label>
                    <input required type="text" className="w-full input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. MS Plate 10mm or CNC Milling" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">SKU / Code</label>
                    <input type="text" className="w-full input-base" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. PRD-001" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Description</label>
                    <textarea className="w-full input-base h-24 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed description or dimensions..." />
                  </div>
                </div>
              </GlassCard>

              {/* Pricing Card */}
              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-5 flex items-center gap-2"><DollarSign size={16}/> Pricing details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Selling Price (Rs) *</label>
                    <input required type="number" step="0.01" className="w-full input-base font-mono text-lg" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Cost Price (Rs)</label>
                    <input type="number" step="0.01" className="w-full input-base font-mono text-lg" value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: e.target.value})} placeholder="0.00" />
                  </div>
                </div>
              </GlassCard>

              {/* Inventory Tracking Card */}
              <GlassCard className={`p-6 ${formData.type === 'service' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2"><Package size={16}/> Inventory Tracking</h2>
                  {formData.type === 'service' && <span className="text-xs bg-surface2 px-2 py-1 rounded text-muted">Disabled for Services</span>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Initial Stock</label>
                    <input type="number" className="w-full input-base font-mono" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} disabled={formData.type === 'service'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Reorder Level</label>
                    <input type="number" className="w-full input-base font-mono" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} placeholder="Alert when below..." disabled={formData.type === 'service'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Bin Location</label>
                    <input type="text" className="w-full input-base" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Rack A1" disabled={formData.type === 'service'} />
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column (Meta & Organzation) */}
            <div className="lg:col-span-1 space-y-6">
              
              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-5">Organization</h2>
                <div className="space-y-5">
                  
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">Item Type</label>
                    <div className="flex bg-surface2 p-1 rounded-lg border border-theme-subtle">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, type: 'product'})}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.type === 'product' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                      >Product</button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, type: 'service'})}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${formData.type === 'service' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
                      >Service</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Unit of Measure</label>
                    <select className="w-full input-base" value={formData.uom} onChange={e => setFormData({...formData, uom: e.target.value})}>
                      <option value="pcs">Pieces (Pcs)</option>
                      <option value="kg">Kilograms (Kg)</option>
                      <option value="mm">Millimeters (mm)</option>
                      <option value="m">Meters (m)</option>
                      <option value="hr">Hours (Hr)</option>
                      <option value="job">Per Job</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Status</label>
                    <select className="w-full input-base" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-5 flex items-center gap-2"><Truck size={16}/> Suppliers</h2>
                <div className="space-y-4">
                  
                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-2">
                    {formData.suppliers.length > 0 ? formData.suppliers.map(sup => (
                      <Badge key={sup} variant="outline" className="flex items-center gap-1.5 bg-surface text-xs py-1">
                        {sup}
                        <button 
                          type="button" 
                          className="hover:text-red-500 transition-colors"
                          onClick={() => setFormData({...formData, suppliers: formData.suppliers.filter(s => s !== sup)})}
                        ><X size={12}/></button>
                      </Badge>
                    )) : (
                      <span className="text-xs text-muted italic">No suppliers linked.</span>
                    )}
                  </div>
                  
                  {/* Dropdown to add */}
                  <div>
                    <select 
                      className="w-full input-base text-sm"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !formData.suppliers.includes(val)) {
                          setFormData({...formData, suppliers: [...formData.suppliers, val]});
                        }
                      }}
                    >
                      <option value="">+ Add supplier...</option>
                      {suppliersList.filter((s: any) => !formData.suppliers.includes(s.name)).map((sup: any) => (
                        <option key={sup.id} value={sup.name}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </GlassCard>

            </div>
            </div>
          ) : (
            <StockLedgerView inventoryId={editId!} onUpdate={refetch} />
          )}
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Inventory & Services</h1>
          <p className="text-sm text-secondary mt-1">Manage products, raw materials, and service offerings.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenForm()}>Add New Item</Button>
      </div>

      {/* Tabs & Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-surface2/50 p-1 rounded-lg border border-theme-subtle">
          <button 
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'all' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
            onClick={() => setActiveTab('all')}
          >All Items</button>
          <button 
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'product' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
            onClick={() => setActiveTab('product')}
          >Products</button>
          <button 
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'service' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}`}
            onClick={() => setActiveTab('service')}
          >Services</button>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search inventory..." className="w-64" />
          <Button variant="ghost" icon={Filter}>Filters</Button>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filteredData} keyExtractor={(item: any) => item.id} />
      </GlassCard>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this inventory item?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
