import React, { useState, useEffect } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, Activity, Filter, Package, Wrench, Edit, Trash2, ArrowLeft, Info, DollarSign, Truck, Save, X, Download, Upload, Box, Briefcase, Building2, User, Phone, FileText, Printer, Send, CheckCircle, Calendar, ExternalLink, Layers, ShoppingCart, Image as ImageIcon, LayoutGrid, List, Eye, Scissors, PackageCheck } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useInventory, useSuppliers, useStockLedger, useLeads, useFinishedGoodsOrders, useStockRemnants } from '@/hooks/useData'
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, addStockLedgerEntry, fetchAllCustomerGRNs, updateCustomerGRN, fetchGatePasses, createGatePass, deleteGatePass, fetchQuotations, createCustomerGRN } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView'
import { GatePassPrintView } from '@/components/GatePassPrintView'
import { FinishedProductModal } from './FinishedProductModal'
import { FinishedGoodsOrdersView } from './FinishedGoodsOrdersView'
import { AssetRegistryHub } from '@/components/inventory/AssetRegistryHub'
import { StockLedgerHub } from '@/components/inventory/StockLedgerHub'
import { ItemFormStudio } from '@/components/inventory/ItemFormStudio'
import { ItemDetailModal } from '@/components/inventory/ItemDetailModal'
import { LinearStockCutStudio } from '@/components/inventory/LinearStockCutStudio'
import html2pdf from 'html2pdf.js'

type TabType = 'raw_material' | 'finished_product' | 'company_asset' | 'service' | 'customer_sample' | 'stock_ledger' | 'linear_remnants' | 'all'

const StockLedgerView = ({ inventoryId, onUpdate }: { inventoryId: string, onUpdate: () => void }) => {
  const { data: ledger, loading, refetch } = useStockLedger(inventoryId)
  const [type, setType] = useState<'IN'|'OUT'>('IN')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Type</label>
            <select className="w-full input-base" value={type} onChange={e => setType(e.target.value as 'IN'|'OUT')}>
              <option value="IN">Stock In (+)</option>
              <option value="OUT">Stock Out (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Quantity</label>
            <input required type="number" min="0" onKeyDown={e => { if(e.key === '-' || e.key === 'e') e.preventDefault() }} step="0.01" className="w-full input-base" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Notes / Ref</label>
            <input type="text" className="w-full input-base" value={notes} onChange={e => setNotes(e.target.value)} placeholder="PO-123 or Adjustment" />
          </div>
          <Button variant="primary" type="button" onClick={handleAdd} disabled={submitting}>{submitting ? '...' : 'Add Entry'}</Button>
        </div>
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
  const [searchParams] = useSearchParams()
  const { data: inventory, loading, refetch } = useInventory()
  const { data: suppliersList } = useSuppliers()
  const { data: leadsList = [] } = useLeads()
  const [sampleSearchQuery, setSampleSearchQuery] = useState('')
  const { settings } = useSettings()
  const { user, can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('raw_material')

  useEffect(() => {
    if (location.state?.openCutStudioWithJobRef || location.state?.tab === 'linear_remnants') {
      setActiveTab('linear_remnants')
    }
  }, [location.state])
  const [ledgerModalItem, setLedgerModalItem] = useState<any | null>(null)
  const [viewingItem, setViewingItem] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [grns, setGrns] = useState<any[]>([])
  const [gatePasses, setGatePasses] = useState<any[]>([])
  const [quotationsList, setQuotationsList] = useState<any[]>([])
  const [sampleSubTab, setSampleSubTab] = useState<'samples' | 'gate_passes'>('samples')
  const [sampleFilterStatus, setSampleFilterStatus] = useState<'all' | 'in_stock' | 'dispatched'>('all')

  const [finishedSubTab, setFinishedSubTab] = useState<'products' | 'orders'>('products')
  const [fgViewMode, setFgViewMode] = useState<'grid' | 'table'>('grid')
  const [finishedProductModalOpen, setFinishedProductModalOpen] = useState(false)
  const [selectedFinishedProduct, setSelectedFinishedProduct] = useState<any | null>(null)
  const { data: fgOrders = [], refetch: refetchFgOrders } = useFinishedGoodsOrders()
  const { data: stockRemnants = [], refetch: refetchStockRemnants } = useStockRemnants()
  const [selectedLinearItem, setSelectedLinearItem] = useState<any | null>(null)

  const [printGrnData, setPrintGrnData] = useState<any | null>(null)
  const [printGatePassData, setPrintGatePassData] = useState<any | null>(null)
  const [gatePassDialog, setGatePassDialog] = useState<any | null>(null)
  const [receiveSampleOpen, setReceiveSampleOpen] = useState(false)
  const [newSampleData, setNewSampleData] = useState<any>({
    quoteId: '',
    quoNo: '',
    leadId: '',
    customerCompany: '',
    customerName: '',
    items: [{ description: '', qty: 1, unit: 'Nos' }],
    receivedAt: new Date().toISOString().slice(0, 10),
    receivedBy: user?.name || 'System Admin',
    notes: ''
  })

  const loadGrnData = async () => {
    try {
      const [grnList, gpList] = await Promise.all([
        fetchAllCustomerGRNs(),
        fetchGatePasses()
      ]);
      setGrns(Array.isArray(grnList) ? grnList : []);
      setGatePasses(Array.isArray(gpList) ? gpList : []);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    loadGrnData();
    fetchQuotations().then(data => setQuotationsList(Array.isArray(data) ? data : [])).catch(console.error);

    const tabParam = searchParams.get('tab');
    if (tabParam === 'customer_sample') {
      setActiveTab('customer_sample');
    }
    const actionParam = searchParams.get('action');
    const leadIdParam = searchParams.get('leadId');
    const quoteIdParam = searchParams.get('quoteId');
    if (actionParam === 'receive' || leadIdParam || quoteIdParam) {
      setActiveTab('customer_sample');
      setReceiveSampleOpen(true);
      if (leadIdParam) {
        setNewSampleData((prev: any) => ({
          ...prev,
          leadId: leadIdParam,
          customerCompany: searchParams.get('company') || prev.customerCompany,
          customerName: searchParams.get('name') || prev.customerName
        }));
      }
      if (quoteIdParam) {
        setNewSampleData((prev: any) => ({
          ...prev,
          quoteId: quoteIdParam,
          quoNo: searchParams.get('quoNo') || prev.quoNo
        }));
      }
    }
  }, [searchParams]);
  
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [formTab, setFormTab] = useState<'details' | 'ledger'>('details')
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const showToast = (type: 'success'|'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); }

  const handleDownloadTemplate = () => {
    const headers = ['Type(raw_material/finished_product/service/company_asset)', 'Name', 'SKU', 'Description', 'UnitPrice', 'UnitCost', 'Quantity', 'UOM(pcs/kg/m)', 'Location', 'ReorderLevel']
    const row = ['raw_material', 'MS Plate 1/2" (12.7mm)', 'SKU-001', 'Spec: 50×300mm Ø25mm 90°', '1500', '1000', '10', 'pcs', 'Store A', '5']
    const csv = headers.join(',') + '\n' + row.join(',') + '\n'
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_import_template.csv'
    a.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setSubmitting(true)
      const buffer = await file.arrayBuffer()
      let text = ''
      try {
        // Try strict UTF-8 decoding first (standard UTF-8 and UTF-8 with BOM)
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
        text = utf8Decoder.decode(buffer)
      } catch {
        // Fall back to Windows-1252 (ANSI), default encoding for Windows Excel CSV saves
        const winDecoder = new TextDecoder('windows-1252')
        text = winDecoder.decode(buffer)
      }

      // Strip optional UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
      }

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l)
      if (lines.length < 2) {
        setSubmitting(false)
        return showToast('error', 'CSV is empty or invalid')
      }

      let count = 0
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const row: string[] = []
        let cur = ''
        let inQuote = false

        for (let j = 0; j < line.length; j++) {
          const char = line[j]
          if (char === '"') {
            if (inQuote && line[j + 1] === '"') {
              cur += '"'
              j++ // skip escaped quote
            } else {
              inQuote = !inQuote
            }
          } else if (char === ',' && !inQuote) {
            row.push(cur.trim())
            cur = ''
          } else {
            cur += char
          }
        }
        row.push(cur.trim())

        if (row.length < 2) continue

        let typeStr = (row[0] || '').toLowerCase().replace(' ', '_')
        if (!['raw_material', 'finished_product', 'service', 'company_asset'].includes(typeStr)) {
          typeStr = typeStr === 'product' ? 'finished_product' : 'raw_material'
        }
        const type = typeStr
        const name = row[1]
        const sku = row[2] || ''
        const description = row[3] || ''
        const unitPrice = Number(row[4]) || 0
        const unitCost = Number(row[5]) || 0
        const quantity = Number(row[6]) || 0
        const uom = row[7] || 'pcs'
        const location = row[8] || ''
        const reorderLevel = Number(row[9]) || 0

        if (!name) continue

        const res = await createInventoryItem({
          id: `INV-${Date.now().toString().slice(-4)}${i}`,
          type,
          name,
          sku,
          description,
          unitPrice,
          unitCost,
          quantity,
          uom,
          location,
          reorderLevel,
          status: 'active',
          suppliers: JSON.stringify([])
        })
        if (!res.error) count++
        else console.error(res.error)
      }
      setSubmitting(false)
      setShowImport(false)
      showToast('success', `Imported ${count} items successfully`)
      refetch()
    } catch (err: any) {
      setSubmitting(false)
      showToast('error', 'Failed to read CSV: ' + (err?.message || 'Unknown error'))
    }
  }


  const initialForm = { type: 'raw_material', name: '', sku: '', description: '', unitPrice: '', unitCost: '', quantity: '0', status: 'active', uom: 'pcs', suppliers: [] as string[], location: '', reorderLevel: '0' }
  const [formData, setFormData] = useState(initialForm)

  const isItemFinishedProduct = (type: string) => type === 'finished_product' || type === 'product'

  const filteredData = inventory.filter(item => {
    let matchesTab = true;
    if (activeTab === 'raw_material') {
      matchesTab = item.type === 'raw_material' || (!isItemFinishedProduct(item.type) && item.type !== 'company_asset' && item.type !== 'service');
    } else if (activeTab === 'finished_product') {
      matchesTab = isItemFinishedProduct(item.type);
    } else if (activeTab === 'company_asset') {
      matchesTab = item.type === 'company_asset';
    } else if (activeTab === 'service') {
      matchesTab = item.type === 'service';
    } else if (activeTab === 'all') {
      matchesTab = true;
    }

    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      (item.name && item.name.toLowerCase().includes(q)) || 
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q));

    return matchesTab && matchesSearch;
  });

  const handleSaveAsset = async (assetData: any) => {
    if (assetData.id && inventory.some((i: any) => i.id === assetData.id)) {
      await updateInventoryItem(assetData.id, assetData);
    } else {
      await createInventoryItem(assetData);
    }
    refetch();
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteInventoryItem(id);
    refetch();
  };

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
      render: (val: any, item) => {
        let icon = <Box size={16} />;
        let color = 'bg-emerald-500/10 text-emerald-400';
        if (item.type === 'finished_product') { icon = <Package size={16} />; color = 'bg-blue-500/10 text-blue-400'; }
        else if (item.type === 'service') { icon = <Wrench size={16} />; color = 'bg-purple-500/10 text-purple-400'; }
        else if (item.type === 'company_asset') { icon = <Briefcase size={16} />; color = 'bg-amber-500/10 text-amber-400'; }
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${color}`}>
              {icon}
            </div>
            <div>
            <div className="font-semibold text-primary">{val}</div>
            {item.sku && <div className="text-[10px] text-muted font-mono">{item.sku}</div>}
          </div>
        </div>
      )
      }
    },
    {
      header: 'Type',
      key: 'type',
      render: (val: any) => {
        const text = String(val).replace(/_/g, ' ');
        const variant = val === 'raw_material' ? 'success' : val === 'finished_product' ? 'info' : val === 'company_asset' ? 'default' : 'warning';
        return <Badge variant={variant as any}>{text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Badge>;
      }
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
      render: (val: any, item) => item.type !== 'service' ? (
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
          <span className="font-mono text-secondary">{formatCurrency(val)}</span>
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
      header: 'Actions',
      key: 'id',
      render: (_, item) => {
        const isLinearOrRaw = item.type === 'raw_material' || 
          ['shaft', 'bar', 'rod', 'pipe', 'tube', 'angle', 'channel', 'beam', 'plate', 'sheet'].some((k: string) => (item.name || '').toLowerCase().includes(k)) ||
          ['ft', 'feet', 'in', 'inch', 'm', 'mm'].includes((item.uom || '').toLowerCase());

        return (
          <div className="flex items-center justify-end gap-1.5">
            {isLinearOrRaw && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLinearItem(item)
                  setActiveTab('linear_remnants')
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface2/60 hover:bg-surface2 text-secondary hover:text-primary border border-theme-subtle text-xs transition-colors shrink-0"
                title={`Execute Material Issue / Cut for ${item.name}`}
              >
                <Scissors size={12} className="text-muted shrink-0" />
                <span>Material Issue</span>
              </button>
            )}
            {item.type !== 'service' && item.type !== 'company_asset' && (
              <button
                type="button"
                onClick={() => setLedgerModalItem(item)}
                className="p-1 hover:bg-rex-500/10 rounded text-muted hover:text-rex-600 transition-colors"
                title="View Stock Ledger & Movements"
              >
                <Layers size={14}/>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewingItem(item)}
              className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
              title="View Details (Read-only)"
            >
              <Eye size={14}/>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (item.type === 'finished_product') {
                  setSelectedFinishedProduct(item)
                  setFinishedProductModalOpen(true)
                } else {
                  handleOpenForm(item)
                }
              }} 
              className="p-1 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
              title="Edit item"
            >
              <Edit size={14}/>
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors" title="Delete item"><Trash2 size={14}/></button>
          </div>
        )
      }
    }
  ]

  const FinishedProductDescription: React.FC<{ description?: string }> = ({ description }) => {
    const [expanded, setExpanded] = useState(false)
    if (!description) return null

    const lines = String(description)
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return null

    const visibleLines = expanded ? lines : lines.slice(0, 3)
    const hasMore = lines.length > 3

    return (
      <div className="mt-1.5 space-y-0.5 max-w-md">
        {visibleLines.map((line, idx) => {
          const clean = line.startsWith('•') || line.startsWith('-') || line.startsWith('*')
            ? line.replace(/^[•\-\*]\s*/, '')
            : line
          return (
            <div key={idx} className="flex items-start gap-1.5 text-xs text-secondary/90 leading-tight">
              <span className="text-rex-500 font-bold select-none text-[11px] leading-none shrink-0 mt-0.5">•</span>
              <span className="break-words font-medium">{clean}</span>
            </div>
          )
        })}
        {hasMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-[10px] font-semibold text-rex-600 dark:text-rex-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
          >
            {expanded ? '▲ Show less' : `▼ +${lines.length - 3} more specs`}
          </button>
        )}
      </div>
    )
  }

  const finishedProductColumns: Column<any>[] = [
    {
      header: 'Product Details',
      key: 'name',
      render: (val: any, item: any) => (
        <div className="flex items-start gap-3 py-1">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm mt-0.5">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package size={20} />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-primary flex items-center gap-2 flex-wrap">
              <span className="text-sm">{val}</span>
              {item.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-secondary font-medium">
                  {item.category}
                </span>
              )}
            </div>
            {item.sku && (
              <div className="mt-0.5">
                <span className="text-[10px] text-muted font-mono">{item.sku}</span>
              </div>
            )}
            <FinishedProductDescription description={item.description} />
          </div>
        </div>
      )
    },
    {
      header: 'CAD / Drawings',
      key: 'drawingsUrl',
      render: (val: any) => {
        if (!val) return <span className="text-xs text-muted italic">No link</span>
        return (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <ExternalLink size={12} /> Google Drive
          </a>
        )
      }
    },
    {
      header: 'BOMs & Cost Rollup',
      key: 'boms',
      render: (val: any, item: any) => {
        let bomCount = 0
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val
          if (Array.isArray(parsed)) bomCount = parsed.length
        } catch (e) {}

        const unitCost = Number(item.unitCost || 0)
        let spareCount = 0
        try {
          const parsed = typeof item.spareParts === 'string' ? JSON.parse(item.spareParts) : item.spareParts
          if (Array.isArray(parsed)) spareCount = parsed.length
        } catch (e) {}

        return (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-primary">
              {unitCost > 0 ? formatCurrency(unitCost) : '-'}
            </span>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              <Badge variant={bomCount > 0 ? 'info' : 'default'} size="sm">
                <Layers size={10} className="mr-1 inline" />
                {bomCount} {bomCount === 1 ? 'BOM' : 'BOMs'}
              </Badge>
              {spareCount > 0 && (
                <Badge variant="warning" size="sm">
                  <Wrench size={10} className="mr-1 inline" />
                  {spareCount} {spareCount === 1 ? 'Spare' : 'Spares'}
                </Badge>
              )}
            </div>
          </div>
        )
      }
    },
    {
      header: 'Stock in Hand',
      key: 'quantity',
      render: (val: any, item: any) => {
        const qty = Number(val || 0)
        const reorder = Number(item.reorderLevel || 0)
        const isLow = qty <= reorder

        return (
          <div className="flex flex-col">
            <span className={`font-mono font-bold text-sm ${isLow ? 'text-red-500' : 'text-primary'}`}>
              {qty} {item.uom || 'pcs'}
            </span>
            {isLow ? (
              <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
                Low Stock (Alert: {reorder})
              </span>
            ) : (
              <span className="text-[10px] text-muted">Reorder @ {reorder}</span>
            )}
          </div>
        )
      }
    },
    {
      header: 'Final Selling Price',
      key: 'unitPrice',
      render: (val: any, item: any) => {
        const price = Number(val || 0)
        const cost = Number(item.unitCost || 0)
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0

        return (
          <div className="flex flex-col">
            <span className="font-mono font-bold text-primary">{formatCurrency(price)}</span>
            {cost > 0 && price > 0 && (
              <span className={`text-[10px] font-mono font-semibold ${margin >= 20 ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {margin.toFixed(1)}% margin
              </span>
            )}
          </div>
        )
      }
    },
    {
      header: 'Actions',
      key: 'id',
      render: (_: any, item: any) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedLinearItem(item)
              setActiveTab('linear_remnants')
            }}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface2/60 hover:bg-surface2 border border-theme-subtle text-secondary hover:text-primary rounded text-xs transition-colors shrink-0"
            title="Material Issue / Cut Studio"
          >
            <Scissors size={12} className="text-muted shrink-0"/>
            <span className="hidden sm:inline">Material Issue</span>
          </button>
          <button
            type="button"
            onClick={() => setLedgerModalItem(item)}
            className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-rex-600 transition-colors"
            title="Stock Movement Ledger"
          >
            <Layers size={14}/>
          </button>
          <button
            type="button"
            onClick={() => setViewingItem(item)}
            className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
            title="View Product Details (Read-only)"
          >
            <Eye size={14}/>
          </button>
          <Button
            variant="ghost"
            size="sm"
            icon={Layers}
            onClick={() => {
              setSelectedFinishedProduct(item)
              setFinishedProductModalOpen(true)
            }}
            className="h-7 text-xs px-2.5 text-rex-600 hover:text-rex-700 bg-rex-600/10 hover:bg-rex-600/20"
            title="Manage BOMs & Pricing"
          >
            BOMs & Pricing
          </Button>
          <button 
            type="button" 
            onClick={() => {
              setSelectedFinishedProduct(item)
              setFinishedProductModalOpen(true)
            }} 
            className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
            title="Edit Product"
          >
            <Edit size={14}/>
          </button>
          <button 
            type="button" 
            onClick={() => handleDelete(item.id)} 
            className="p-1.5 hover:bg-red-500/20 rounded text-muted hover:text-red-500 transition-colors"
            title="Delete Product"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      )
    }
  ]

  const handleOpenGatePassDialog = (sample: any) => {
    let parsedItems: any[] = [];
    try {
      if (typeof sample.items === 'string' && sample.items.startsWith('[')) {
        parsedItems = JSON.parse(sample.items);
      } else if (Array.isArray(sample.items)) {
        parsedItems = sample.items;
      } else if (sample.items) {
        parsedItems = [{ description: sample.items, qty: 1, unit: 'Nos', remarks: '' }];
      }
    } catch (e) {
      parsedItems = [{ description: String(sample.items || ''), qty: 1, unit: 'Nos', remarks: '' }];
    }

    if (parsedItems.length === 0) {
      parsedItems = [{ description: 'Sample Item', qty: 1, unit: 'Nos', remarks: '' }];
    }

    setGatePassDialog({
      open: true,
      grn: sample,
      customerCompany: sample.customerCompany || sample.companyName || sample.leadCompany || sample.customerName || sample.leadName || '',
      customerName: sample.customerName || sample.leadName || '',
      address: sample.customerAddress || '',
      phone: sample.customerPhone || sample.phone || '',
      email: sample.customerEmail || sample.email || '',
      attention: sample.personName || sample.customerName || sample.leadName || '',
      quoteId: sample.quoteId || '',
      quoNo: sample.displayQuoNo || sample.quoNo || sample.quotationDocNo || '',
      carrier: 'Hand Delivery',
      vehicleNo: '',
      reason: 'Customer sample return after quotation / inspection',
      items: parsedItems.map((it: any) => ({
        description: it.description || it.items || '',
        qty: Number(it.qty || 1),
        unit: it.unit || 'Nos',
        remarks: it.remarks || ''
      })),
      issuedBy: user?.name || 'System Admin',
      issuedDate: new Date().toISOString().slice(0, 10),
      notes: ''
    });
  };

  const handlePrintExistingGatePass = (sample: any) => {
    const gpId = sample.gatePassId || sample.gpId;
    const existing = gatePasses.find(g => g.id === gpId || g.grnId === sample.id);
    if (existing) {
      setPrintGatePassData(existing);
      return;
    }
    const fallbackGp = {
      id: gpId || `GP-${sample.id}`,
      grnId: sample.id,
      quoteId: sample.quoteId,
      quoNo: sample.displayQuoNo || sample.quoNo,
      customerCompany: sample.customerCompany || sample.companyName || sample.leadCompany,
      customerName: sample.customerName || sample.leadName,
      address: sample.customerAddress,
      phone: sample.customerPhone || sample.phone,
      email: sample.customerEmail || sample.email,
      attention: sample.personName || sample.customerName,
      carrier: sample.gpCarrier || 'Hand Delivery',
      vehicleNo: sample.gpVehicleNo || '',
      reason: sample.gpReason || 'Customer Sample Return',
      items: sample.items,
      issuedDate: sample.gpDate || sample.dispatchedAt || sample.createdAt,
      issuedBy: sample.receivedBy || 'System Admin',
      status: 'Dispatched',
      notes: sample.notes
    };
    setPrintGatePassData(fallbackGp);
  };

  const handleSaveGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePassDialog) return;
    setSubmitting(true);
    try {
      const payload = {
        grnId: gatePassDialog.grn?.id,
        quoteId: gatePassDialog.quoteId,
        quoNo: gatePassDialog.quoNo,
        leadId: gatePassDialog.grn?.leadId,
        customerId: gatePassDialog.grn?.customerId,
        customerName: gatePassDialog.customerName,
        customerCompany: gatePassDialog.customerCompany,
        address: gatePassDialog.address,
        phone: gatePassDialog.phone,
        email: gatePassDialog.email,
        attention: gatePassDialog.attention,
        carrier: gatePassDialog.carrier,
        vehicleNo: gatePassDialog.vehicleNo,
        reason: gatePassDialog.reason,
        items: JSON.stringify(gatePassDialog.items),
        issuedBy: gatePassDialog.issuedBy,
        issuedDate: gatePassDialog.issuedDate,
        status: 'Dispatched',
        notes: gatePassDialog.notes
      };

      const res = await createGatePass(payload);
      showToast('success', `Gate Pass ${res.item?.id || ''} created successfully`);
      await loadGrnData();
      setGatePassDialog(null);

      if (res.item) {
        setPrintGatePassData(res.item);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to create gate pass');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGatePass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Gate Pass? This will revert the sample status back to In Hand.')) return;
    try {
      await deleteGatePass(id);
      showToast('success', 'Gate Pass deleted');
      await loadGrnData();
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to delete gate pass');
    }
  };

  const handleCreateSampleGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createCustomerGRN({
        quoteId: newSampleData.quoteId || null,
        quoNo: newSampleData.quoNo || '',
        leadId: newSampleData.leadId || null,
        customerCompany: newSampleData.customerCompany,
        customerName: newSampleData.customerName,
        items: JSON.stringify(newSampleData.items),
        receivedAt: newSampleData.receivedAt,
        receivedBy: newSampleData.receivedBy || user?.name || 'System Admin',
        notes: newSampleData.notes,
        status: 'In Stock'
      });
      showToast('success', 'Customer sample received successfully');
      await loadGrnData();
      setReceiveSampleOpen(false);
      setNewSampleData({
        quoteId: '',
        quoNo: '',
        leadId: '',
        customerCompany: '',
        customerName: '',
        items: [{ description: '', qty: 1, unit: 'Nos' }],
        receivedAt: new Date().toISOString().slice(0, 10),
        receivedBy: user?.name || 'System Admin',
        notes: ''
      });
      if (res.item) {
        setPrintGrnData(res.item);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to receive sample');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGrns = grns.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch = !search || (
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.customerCompany && item.customerCompany.toLowerCase().includes(q)) ||
      (item.leadCompany && item.leadCompany.toLowerCase().includes(q)) ||
      (item.companyName && item.companyName.toLowerCase().includes(q)) ||
      (item.customerName && item.customerName.toLowerCase().includes(q)) ||
      (item.leadName && item.leadName.toLowerCase().includes(q)) ||
      (item.displayQuoNo && item.displayQuoNo.toLowerCase().includes(q)) ||
      (item.quoNo && item.quoNo.toLowerCase().includes(q)) ||
      (item.quotationDocNo && item.quotationDocNo.toLowerCase().includes(q)) ||
      (item.items && item.items.toLowerCase().includes(q)) ||
      (item.gatePassId && item.gatePassId.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );

    if (!matchesSearch) return false;

    if (sampleFilterStatus === 'in_stock') {
      return item.status !== 'Dispatched' && !item.gatePassId;
    }
    if (sampleFilterStatus === 'dispatched') {
      return item.status === 'Dispatched' || !!item.gatePassId;
    }
    return true;
  });

  const filteredGatePasses = gatePasses.filter(item => {
    const q = search.toLowerCase();
    return !search || (
      (item.id && item.id.toLowerCase().includes(q)) ||
      (item.customerCompany && item.customerCompany.toLowerCase().includes(q)) ||
      (item.customerName && item.customerName.toLowerCase().includes(q)) ||
      (item.quoNo && item.quoNo.toLowerCase().includes(q)) ||
      (item.displayQuoNo && item.displayQuoNo.toLowerCase().includes(q)) ||
      (item.grnId && item.grnId.toLowerCase().includes(q)) ||
      (item.carrier && item.carrier.toLowerCase().includes(q)) ||
      (item.vehicleNo && item.vehicleNo.toLowerCase().includes(q)) ||
      (item.items && item.items.toLowerCase().includes(q))
    );
  });

  const customerSampleColumns: Column<any>[] = [
    {
      header: 'Sample GRN',
      key: 'id',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
            <Package size={15} />
          </div>
          <div>
            <span className="font-mono font-bold text-primary text-xs">{val}</span>
            <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
              <Calendar size={10} />
              {formatDate(row.receivedAt || row.createdAt)}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Customer & Company',
      key: 'companyName',
      render: (_: any, row: any) => {
        const comp = row.customerCompany || row.leadCompany || row.companyName;
        const person = row.personName || row.customerName || row.leadName;
        const phone = row.customerPhone || row.phone;
        return (
          <div className="space-y-0.5">
            <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
              <Building2 size={13} className="text-blue-500 flex-shrink-0" />
              <span>{comp || 'Individual / Direct'}</span>
            </div>
            {person && person !== comp && (
              <div className="text-[11px] text-secondary flex items-center gap-1">
                <User size={11} className="text-muted flex-shrink-0" />
                <span>{person}</span>
              </div>
            )}
            {phone && (
              <div className="text-[10px] text-muted font-mono flex items-center gap-1">
                <Phone size={10} className="flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Linked Quotation',
      key: 'quoNo',
      render: (_: any, row: any) => {
        const qNo = row.displayQuoNo || row.quoNo || row.quotationDocNo;
        return (
          <div className="space-y-1">
            {qNo ? (
              <Badge variant="info" className="font-mono text-xs">
                <FileText size={11} className="mr-1 inline" />
                {qNo}
              </Badge>
            ) : (
              <span className="text-xs text-muted italic">No Quotation Linked</span>
            )}
            {row.quotationStatus && (
              <div className="text-[10px] text-secondary">
                Status: <span className="font-medium">{row.quotationStatus}</span>
              </div>
            )}
            {row.quotationTotal ? (
              <div className="text-[10px] text-muted font-mono">
                {formatCurrency(row.quotationTotal)}
              </div>
            ) : null}
          </div>
        );
      }
    },
    {
      header: 'Items Received',
      key: 'items',
      render: (val: any) => {
        let itemsList: any[] = [];
        try {
          if (typeof val === 'string' && val.startsWith('[')) itemsList = JSON.parse(val);
          else if (Array.isArray(val)) itemsList = val;
          else if (val) itemsList = [{ description: val, qty: 1, unit: 'Nos' }];
        } catch (e) {
          itemsList = [{ description: val, qty: 1, unit: 'Nos' }];
        }
        return (
          <div className="space-y-1 max-w-xs">
            {itemsList.map((it: any, idx: number) => {
              const desc = typeof it === 'string'
                ? it
                : typeof it?.description === 'string'
                ? it.description
                : typeof it?.name === 'string'
                ? it.name
                : typeof it?.item === 'string'
                ? it.item
                : typeof it?.items === 'string'
                ? it.items
                : (it && typeof it === 'object' && Object.values(it)[0])
                ? String(Object.values(it)[0])
                : String(it);
              return (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-primary">{desc}</span>
                  <span className="text-[10px] font-mono text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">
                    x{Number(it?.qty || 1)} {it?.unit || 'Nos'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'Sample Status',
      key: 'status',
      render: (_: any, row: any) => {
        const isDispatched = row.status === 'Dispatched' || !!row.gatePassId;
        return isDispatched ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Truck size={12} /> Returned
            </span>
            <div className="text-[10px] text-muted">
              GP: <span className="font-mono font-bold text-primary">{row.gatePassId || row.gpId || 'Issued'}</span>
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle size={12} /> In Hand (In Stock)
          </span>
        );
      }
    },
    {
      header: 'Received By',
      key: 'receivedBy',
      render: (val: any, row: any) => (
        <div>
          <span className="text-xs text-secondary">{val || 'System Admin'}</span>
          {row.notes && <div className="text-[10px] text-muted italic max-w-[120px] truncate" title={row.notes}>{row.notes}</div>}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_: any, row: any) => {
        const isDispatched = row.status === 'Dispatched' || !!row.gatePassId;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              icon={Printer}
              onClick={() => setPrintGrnData(row)}
              className="text-xs h-7 px-2.5 rounded bg-surface hover:bg-surface2 border border-theme-subtle"
              title="Print Sample Goods Receipt Note"
            >
              GRN
            </Button>

            {isDispatched ? (
              <Button
                variant="ghost"
                size="sm"
                icon={FileText}
                onClick={() => handlePrintExistingGatePass(row)}
                className="text-xs h-7 px-2.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20"
                title="Print Gate Pass in Sample Format"
              >
                Print GP
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => handleOpenGatePassDialog(row)}
                className="text-xs h-7 px-2.5 rounded bg-rex-700 hover:bg-rex-600 text-white"
                title="Issue Outward Gate Pass to Return Sample"
              >
                Issue Gate Pass
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const gatePassColumns: Column<any>[] = [
    {
      header: 'Gate Pass No',
      key: 'id',
      render: (val: any, row: any) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
            <Truck size={15} />
          </div>
          <div>
            <span className="font-mono font-bold text-primary text-xs">{val}</span>
            <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
              <Calendar size={10} />
              {formatDate(row.issuedDate || row.createdAt)}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Customer / Consignee',
      key: 'customerCompany',
      render: (val: any, row: any) => (
        <div className="space-y-0.5">
          <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
            <Building2 size={13} className="text-blue-500 flex-shrink-0" />
            <span>{val || row.customerName || 'N/A'}</span>
          </div>
          {row.attention && (
            <div className="text-[11px] text-secondary flex items-center gap-1">
              <User size={11} className="text-muted flex-shrink-0" />
              <span>Attn: {row.attention}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Reference',
      key: 'quoNo',
      render: (_: any, row: any) => (
        <div className="space-y-1">
          {row.quoNo || row.displayQuoNo ? (
            <Badge variant="info" className="font-mono text-xs">
              {row.quoNo || row.displayQuoNo}
            </Badge>
          ) : (
            <span className="text-xs text-muted">-</span>
          )}
          {row.grnId && (
            <div className="text-[10px] text-muted font-mono">
              GRN: {row.grnId}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Carrier / Transport',
      key: 'carrier',
      render: (val: any, row: any) => (
        <div className="text-xs">
          <span className="font-medium text-primary">{val || 'Hand Delivery'}</span>
          {row.vehicleNo && <div className="text-[10px] text-muted font-mono">{row.vehicleNo}</div>}
          <div className="text-[10px] text-gray-500">{row.reason || 'Sample Return'}</div>
        </div>
      )
    },
    {
      header: 'Items Dispatched',
      key: 'items',
      render: (val: any) => {
        let itemsList: any[] = [];
        try {
          if (typeof val === 'string' && val.startsWith('[')) itemsList = JSON.parse(val);
          else if (Array.isArray(val)) itemsList = val;
          else if (val) itemsList = [{ description: val, qty: 1, unit: 'Nos' }];
        } catch (e) {
          itemsList = [{ description: val, qty: 1, unit: 'Nos' }];
        }
        return (
          <div className="space-y-1 max-w-xs">
            {itemsList.map((it: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-primary">{it.description}</span>
                <span className="text-[10px] font-mono text-muted bg-surface2 px-1.5 py-0.5 rounded border border-theme-subtle">
                  x{Number(it.qty || 1)} {it.unit || 'Nos'}
                </span>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Issued By',
      key: 'issuedBy',
      render: (val: any) => <span className="text-xs text-secondary">{val || 'System'}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (val: any) => <Badge variant="success" size="sm">{val || 'Dispatched'}</Badge>
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_: any, row: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={() => setPrintGatePassData(row)}
            className="text-xs h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Print Gate Pass
          </Button>
          <button
            onClick={() => handleDeleteGatePass(row.id)}
            className="p-1.5 hover:bg-red-500/20 text-muted hover:text-red-500 rounded transition-colors"
            title="Delete Gate Pass"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  if (showForm) {
    return (
      <ItemFormStudio
        initialItem={editId ? inventory.find((i: any) => i.id === editId) : null}
        defaultType={activeTab === 'service' ? 'service' : activeTab === 'finished_product' ? 'finished_product' : 'raw_material'}
        suppliersList={suppliersList || []}
        onCancel={() => setShowForm(false)}
        onSave={async (itemData: any, addAnother: boolean = false) => {
          if (editId) {
            await updateInventoryItem(editId, itemData)
            showToast('success', 'Item updated successfully')
          } else {
            await createInventoryItem(itemData)
            showToast('success', 'Item saved to inventory successfully')
          }
          refetch()
          if (!addAnother) {
            setShowForm(false)
          }
        }}
      />
    )
  }

  const inHandCount = grns.filter(g => g.status !== 'Dispatched' && !g.gatePassId).length;
  const dispatchedCount = grns.filter(g => g.status === 'Dispatched' || !!g.gatePassId).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {activeTab === 'customer_sample' 
              ? 'Customer Samples & Gate Passes' 
              : activeTab === 'finished_product'
              ? 'Finished Goods: Products & Orders'
              : activeTab === 'company_asset'
              ? 'Company Asset Registry & Maintenance'
              : activeTab === 'service'
              ? 'Service Offerings & Billing Rates'
              : activeTab === 'stock_ledger'
              ? 'Warehouse Stock Movement & Audit Ledger'
              : 'Raw Materials & Parts Inventory'}
          </h1>
          <p className="text-sm text-secondary mt-1">
            {activeTab === 'customer_sample' 
              ? 'Track customer sample parts, linked quotation details, and manage outward return gate passes.' 
              : activeTab === 'finished_product'
              ? 'Manage manufactured ready-made products, quotation-grade BOM rollups, CAD drawings, and customer orders.'
              : activeTab === 'company_asset'
              ? 'Official company asset register, machine tagging, capital investment, depreciation tracking, and custody.'
              : activeTab === 'service'
              ? 'Manage service offerings, hourly machining labor rates, fabrication charges, and standard billing units.'
              : activeTab === 'stock_ledger'
              ? 'Complete warehouse stock movement audit trail, receipt/dispatch logs, cycle count reconciliation, and valuations.'
              : 'Manage raw materials, steel bars, plates, hydraulic fittings, reorder thresholds, and bin locations.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'customer_sample' ? (
            <Button variant="primary" icon={Plus} onClick={() => setReceiveSampleOpen(true)}>
              Receive Customer Sample
            </Button>
          ) : activeTab === 'finished_product' ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="primary" 
                icon={Plus} 
                onClick={() => {
                  setSelectedFinishedProduct(null)
                  setFinishedProductModalOpen(true)
                }}
              >
                Add Ready-Made Product
              </Button>
            </div>
          ) : activeTab === 'company_asset' ? null : activeTab === 'stock_ledger' ? null : activeTab === 'linear_remnants' ? null : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                icon={PackageCheck}
                onClick={() => navigate('/inventory/material-issue')}
                className="text-xs text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:bg-rex-500/10 rounded-none font-bold"
              >
                Material Issue Station
              </Button>
              <Button variant="ghost" icon={Layers} onClick={() => setActiveTab('stock_ledger')}>Stock Ledger</Button>
              <Button variant="ghost" icon={Scissors} onClick={() => setActiveTab('linear_remnants')}>Cut Studio</Button>
              <Button variant="ghost" icon={Download} onClick={() => setShowImport(true)}>Import Items</Button>
              <Button variant="primary" icon={Plus} onClick={() => handleOpenForm()}>
                {activeTab === 'service' ? 'Add Service' : 'Add Raw Material'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs & Navigation Strip */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-theme-subtle">
          <div className="flex items-center gap-1 overflow-x-auto pb-0 -mb-px custom-scrollbar">
            {[
              { 
                id: 'raw_material' as TabType, 
                label: 'Raw Materials', 
                count: inventory.filter(i => i.type === 'raw_material' || (!isItemFinishedProduct(i.type) && i.type !== 'company_asset' && i.type !== 'service')).length,
                icon: Layers 
              },
              { 
                id: 'linear_remnants' as TabType, 
                label: 'Bar Stock & Offcuts', 
                count: stockRemnants.filter(r => r.status === 'available').length,
                icon: Scissors 
              },
              { 
                id: 'finished_product' as TabType, 
                label: 'Finished Products', 
                count: inventory.filter(i => isItemFinishedProduct(i.type)).length,
                icon: Package 
              },
              { 
                id: 'company_asset' as TabType, 
                label: 'Company Assets', 
                count: inventory.filter(i => i.type === 'company_asset').length,
                icon: Briefcase 
              },
              { 
                id: 'service' as TabType, 
                label: 'Services', 
                count: inventory.filter(i => i.type === 'service').length,
                icon: Wrench 
              },
              { 
                id: 'customer_sample' as TabType, 
                label: 'Customer Samples', 
                count: grns.length,
                icon: FileText 
              },
              { 
                id: 'stock_ledger' as TabType, 
                label: 'Stock Movement Ledger', 
                icon: Activity 
              }
            ].map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button 
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive 
                      ? 'border-rex-600 text-rex-600 dark:text-rex-400 bg-rex-500/5 font-bold' 
                      : 'border-transparent text-muted hover:text-primary hover:bg-surface2/40'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-rex-600 dark:text-rex-400' : 'text-muted'} />
                  <span>{t.label}</span>
                  {t.count !== undefined && (
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold transition-colors ${
                      isActive 
                        ? 'bg-rex-600 text-white' 
                        : 'bg-surface2 text-muted'
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 justify-end pb-2 lg:pb-0">
            <SearchBar 
              value={search} 
              onChange={setSearch} 
              placeholder={activeTab === 'customer_sample' ? "Search quotation, company, sample #..." : activeTab === 'finished_product' ? "Search product name, SKU..." : "Search inventory..."} 
              className="w-72" 
            />
            <Button variant="ghost" icon={Filter}>Filters</Button>
          </div>
        </div>
        {/* Finished Goods Sub-navigation */}
        {activeTab === 'finished_product' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface2/40 p-2 rounded border border-theme-subtle">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFinishedSubTab('products')}
                className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${finishedSubTab === 'products' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}`}
              >
                <Package size={14} /> Ready-Made Products ({inventory.filter(i => isItemFinishedProduct(i.type)).length})
              </button>
              <button
                type="button"
                onClick={() => setFinishedSubTab('orders')}
                className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${finishedSubTab === 'orders' ? 'bg-rex-600 text-white shadow-sm' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}`}
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
          </div>
        )}

        {/* Customer Samples Sub-navigation & Status Filters */}
        {activeTab === 'customer_sample' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface2/40 p-2 rounded border border-theme-subtle">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSampleSubTab('samples')}
                className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${sampleSubTab === 'samples' ? 'bg-rex-700 text-white shadow-sm font-bold' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}`}
              >
                <Package size={14} /> Customer Samples ({grns.length})
              </button>
              <button
                type="button"
                onClick={() => setSampleSubTab('gate_passes')}
                className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${sampleSubTab === 'gate_passes' ? 'bg-rex-700 text-white shadow-sm font-bold' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}`}
              >
                <Truck size={14} /> Outward Gate Passes ({gatePasses.length})
              </button>
            </div>

            {sampleSubTab === 'samples' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted font-medium mr-1">Status Filter:</span>
                {(['all', 'in_stock', 'dispatched'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSampleFilterStatus(st)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded whitespace-nowrap shrink-0 transition-all ${sampleFilterStatus === st ? 'bg-rex-700 text-white shadow-sm font-bold' : 'bg-surface hover:bg-surface2 text-primary border border-theme-subtle'}`}
                  >
                    {st === 'all' ? `All (${grns.length})` : st === 'in_stock' ? `In Hand (${inHandCount})` : `Dispatched (${dispatchedCount})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'company_asset' ? (
        <AssetRegistryHub
          assets={inventory.filter(i => i.type === 'company_asset')}
          loading={loading}
          onSaveAsset={handleSaveAsset}
          onDeleteAsset={handleDeleteAsset}
          onRefresh={refetch}
          showToast={showToast}
        />
      ) : activeTab === 'stock_ledger' ? (
        <StockLedgerHub
          inventoryList={inventory}
          showToast={showToast}
          onUpdateInventory={refetch}
        />
      ) : activeTab === 'linear_remnants' ? (
        <LinearStockCutStudio
          inventoryList={inventory}
          onRefreshInventory={() => {
            refetch()
            refetchStockRemnants()
          }}
          showToast={(type: any, title: string, message?: string) => {
            showToast(type === 'error' ? 'error' : 'success', message ? `${title}: ${message}` : title)
          }}
          initialInventoryId={selectedLinearItem?.id}
          initialJobRef={location.state?.openCutStudioWithJobRef}
          initialSearchTerm={location.state?.cutMaterial}
          initialLength={location.state?.cutLength}
          initialQty={location.state?.cutQty}
          onBackToInventory={() => {
            setSelectedLinearItem(null)
            setActiveTab('raw_material')
          }}
        />
      ) : activeTab === 'finished_product' && finishedSubTab === 'orders' ? (
        <FinishedGoodsOrdersView
          onRefreshProducts={refetch}
          onOpenProductBOM={(prod) => {
            setSelectedFinishedProduct(prod)
            setFinishedProductModalOpen(true)
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Quick Raw Material Metrics if in raw_material tab */}
          {activeTab === 'raw_material' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <GlassCard className="p-3 border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Raw Material Parts</span>
                <div className="text-xl font-black text-primary mt-1">
                  {inventory.filter(i => i.type === 'raw_material' || (!isItemFinishedProduct(i.type) && i.type !== 'company_asset' && i.type !== 'service')).length}
                </div>
                <span className="text-[10px] text-muted">Active material catalog</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-blue-500">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Total Stock Valuation</span>
                <div className="text-lg font-bold font-mono text-primary mt-1">
                  {formatCurrency(
                    inventory
                      .filter(i => i.type === 'raw_material' || (!isItemFinishedProduct(i.type) && i.type !== 'company_asset' && i.type !== 'service'))
                      .reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0)
                  )}
                </div>
                <span className="text-[10px] text-muted">Acquisition value in hand</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-amber-500">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Low Stock Alerts</span>
                <div className="text-lg font-bold text-amber-500 mt-1">
                  {inventory
                    .filter(i => i.type === 'raw_material' || (!isItemFinishedProduct(i.type) && i.type !== 'company_asset' && i.type !== 'service'))
                    .filter(i => Number(i.quantity || 0) <= Number(i.reorderLevel || 0) && Number(i.quantity || 0) > 0).length} Items
                </div>
                <span className="text-[10px] text-muted">At or below reorder level</span>
              </GlassCard>

              <GlassCard className="p-3 border-l-4 border-l-red-500">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Zero Stock / Depleted</span>
                <div className="text-lg font-bold text-red-500 mt-1">
                  {inventory
                    .filter(i => i.type === 'raw_material' || (!isItemFinishedProduct(i.type) && i.type !== 'company_asset' && i.type !== 'service'))
                    .filter(i => Number(i.quantity || 0) <= 0).length} Items
                </div>
                <span className="text-[10px] text-muted">Requires procurement</span>
              </GlassCard>
            </div>
          )}

          <GlassCard className="p-0 overflow-hidden">
            {activeTab === 'customer_sample' ? (
              sampleSubTab === 'samples' ? (
                <DataTable 
                  columns={customerSampleColumns} 
                  data={filteredGrns} 
                  keyExtractor={(item: any) => item.id} 
                  pagination 
                  itemsPerPage={50} 
                />
              ) : (
                <DataTable 
                  columns={gatePassColumns} 
                  data={filteredGatePasses} 
                  keyExtractor={(item: any) => item.id} 
                  pagination 
                  itemsPerPage={50} 
                />
              )
            ) : activeTab === 'finished_product' ? (
              <DataTable 
                columns={finishedProductColumns} 
                data={filteredData} 
                keyExtractor={(item: any) => item.id} 
                pagination 
                itemsPerPage={50} 
              />
            ) : (
              <DataTable columns={columns} data={filteredData} keyExtractor={(item: any) => item.id} pagination itemsPerPage={50} />
            )}
          </GlassCard>
        </div>
      )}

      {/* Read-Only Item Details View Modal */}
      {viewingItem && (
        <ItemDetailModal
          isOpen={!!viewingItem}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={(item) => {
            if (item.type === 'finished_product') {
              setSelectedFinishedProduct(item)
              setFinishedProductModalOpen(true)
            } else {
              handleOpenForm(item)
            }
          }}
          onOpenLedger={(item) => setLedgerModalItem(item)}
          canEdit={can ? can('inventory.items.edit') : true}
        />
      )}

      {/* Individual Item Stock Ledger Modal */}
      {ledgerModalItem && (
        <Modal
          isOpen={!!ledgerModalItem}
          onClose={() => setLedgerModalItem(null)}
          title={`Stock Movement & Audit Ledger: ${ledgerModalItem.name}`}
          size="5xl"
          className="max-w-[96vw] 2xl:max-w-[1560px]"
        >
          <StockLedgerHub
            selectedInventoryItem={ledgerModalItem}
            inventoryList={inventory}
            onClose={() => setLedgerModalItem(null)}
            onUpdateInventory={refetch}
            showToast={showToast}
          />
        </Modal>
      )}

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

      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import Inventory Items">
        <div className="space-y-6 p-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Step 1: Download Template</h3>
            <p className="text-xs text-secondary mb-3">Download the standard CSV template and fill in your product data. Do not change the column headers.</p>
            <Button variant="ghost" icon={Download} onClick={handleDownloadTemplate} className="text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10">Download CSV Template</Button>
          </div>

          <div className="p-4 bg-surface2 rounded-lg border border-theme-subtle">
            <h3 className="text-sm font-bold text-primary mb-2">Step 2: Upload Data</h3>
            <p className="text-xs text-secondary mb-4">Upload the filled CSV file to import items into stock.</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-theme-subtle rounded-lg cursor-pointer hover:bg-surface transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-muted" />
                <p className="mb-2 text-sm text-secondary"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-muted">CSV files only</p>
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={submitting} />
            </label>
            {submitting && <p className="text-xs text-center text-blue-500 font-bold mt-3 animate-pulse">Importing items, please wait...</p>}
          </div>
        </div>
      </Modal>

      {/* Customer GRN Print Modal */}
      <Modal isOpen={!!printGrnData} onClose={() => setPrintGrnData(null)} title="Print Customer Sample GRN" size="xl">
        {printGrnData && (
          <div className="bg-white text-black p-8 max-h-[85vh] overflow-y-auto w-[900px] max-w-full">
            <CustomerGRNPrintView 
              grn={printGrnData} 
              group={{
                leadCompany: printGrnData.customerCompany || printGrnData.leadCompany || printGrnData.companyName,
                leadName: printGrnData.customerName || printGrnData.leadName,
                quoNo: printGrnData.displayQuoNo || printGrnData.quoNo || printGrnData.quotationDocNo,
                address: printGrnData.customerAddress,
                phone: printGrnData.customerPhone || printGrnData.phone,
                email: printGrnData.customerEmail || printGrnData.email
              }}
              settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-gray-200 pt-6">
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('grn-print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.5,
                  filename: `GRN-${printGrnData.id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800">Export PDF</Button>
              <Button variant="primary" onClick={() => window.print()}>Print GRN</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Gate Pass Print Modal (Rex Sample Format) */}
      <Modal isOpen={!!printGatePassData} onClose={() => setPrintGatePassData(null)} title="Print Sample Gate Pass" size="xl">
        {printGatePassData && (
          <div className="bg-white text-black p-8 max-h-[85vh] overflow-y-auto w-[900px] max-w-full">
            <GatePassPrintView 
              gatePass={printGatePassData}
              settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-gray-200 pt-6">
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('gatepass-print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.5,
                  filename: `GatePass-${printGatePassData.id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800">Export PDF</Button>
              <Button variant="primary" onClick={() => window.print()}>Print Gate Pass</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Issue Outward Gate Pass Modal */}
      <Modal isOpen={!!gatePassDialog} onClose={() => setGatePassDialog(null)} title="Issue Outward Gate Pass (Return Customer Sample)" size="lg">
        {gatePassDialog && (
          <form onSubmit={handleSaveGatePass} className="p-6 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-secondary flex items-start gap-2">
              <Truck size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">Creating Outward Gate Pass for Sample Return</p>
                <p className="text-muted mt-0.5">This generates an official Rex Sample Gate Pass document and updates the sample status to Returned / Dispatched.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Customer / Company Name *</label>
                <input 
                  required 
                  type="text" 
                  className="w-full input-base font-semibold" 
                  value={gatePassDialog.customerCompany} 
                  onChange={e => setGatePassDialog({...gatePassDialog, customerCompany: e.target.value})} 
                  placeholder="e.g. Lanka Logistics (Pvt) Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Attention / Contact Person</label>
                <input 
                  type="text" 
                  className="w-full input-base" 
                  value={gatePassDialog.attention} 
                  onChange={e => setGatePassDialog({...gatePassDialog, attention: e.target.value})} 
                  placeholder="e.g. Mr. Nimesh Silva"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Quotation Reference</label>
                <input 
                  type="text" 
                  className="w-full input-base font-mono" 
                  value={gatePassDialog.quoNo} 
                  onChange={e => setGatePassDialog({...gatePassDialog, quoNo: e.target.value})} 
                  placeholder="e.g. QT-163174"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Sample GRN Ref</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full input-base bg-surface2 font-mono text-muted" 
                  value={gatePassDialog.grn?.id || ''} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Dispatch Date *</label>
                <input 
                  required 
                  type="date" 
                  className="w-full input-base" 
                  value={gatePassDialog.issuedDate} 
                  onChange={e => setGatePassDialog({...gatePassDialog, issuedDate: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Carrier / Dispatch Mode *</label>
                <select 
                  className="w-full input-base" 
                  value={gatePassDialog.carrier} 
                  onChange={e => setGatePassDialog({...gatePassDialog, carrier: e.target.value})}
                >
                  <option value="Hand Delivery">Hand Delivery / Direct Handover</option>
                  <option value="Customer Representative">Customer Representative / Pickup</option>
                  <option value="Company Delivery Vehicle">Company Delivery Vehicle</option>
                  <option value="Courier Service">Courier / Transport Service</option>
                  <option value="Driver / Transport">Driver / Third-Party Transport</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Vehicle No / Tracking ID</label>
                <input 
                  type="text" 
                  className="w-full input-base font-mono" 
                  value={gatePassDialog.vehicleNo} 
                  onChange={e => setGatePassDialog({...gatePassDialog, vehicleNo: e.target.value})} 
                  placeholder="e.g. WP CAB-1234 or Tracking #"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Delivery Address</label>
                <input 
                  type="text" 
                  className="w-full input-base" 
                  value={gatePassDialog.address} 
                  onChange={e => setGatePassDialog({...gatePassDialog, address: e.target.value})} 
                  placeholder="Customer address"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Contact Phone</label>
                <input 
                  type="text" 
                  className="w-full input-base" 
                  value={gatePassDialog.phone} 
                  onChange={e => setGatePassDialog({...gatePassDialog, phone: e.target.value})} 
                  placeholder="Contact phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Purpose / Reason</label>
              <input 
                type="text" 
                className="w-full input-base" 
                value={gatePassDialog.reason} 
                onChange={e => setGatePassDialog({...gatePassDialog, reason: e.target.value})} 
                placeholder="e.g. Customer sample returned after quotation / inspection"
              />
            </div>

            {/* Items table */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-secondary">Items to Return / Dispatch</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button"
                  onClick={() => setGatePassDialog((p: any) => p ? { ...p, items: [...p.items, { description: '', qty: 1, unit: 'Nos', remarks: '' }] } : null)} 
                  className="h-6 text-[11px]"
                >
                  <Plus size={12} className="mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-2 border border-theme-subtle rounded-lg p-3 bg-surface2/30">
                {gatePassDialog.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      required 
                      className="flex-1 input-base text-xs py-1.5" 
                      placeholder="Item description" 
                      value={item.description} 
                      onChange={e => {
                        const newItems = [...gatePassDialog.items];
                        newItems[idx].description = e.target.value;
                        setGatePassDialog({...gatePassDialog, items: newItems});
                      }} 
                    />
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      className="w-20 input-base text-xs py-1.5 font-mono text-center" 
                      placeholder="Qty" 
                      value={item.qty} 
                      onChange={e => {
                        const newItems = [...gatePassDialog.items];
                        newItems[idx].qty = Number(e.target.value);
                        setGatePassDialog({...gatePassDialog, items: newItems});
                      }} 
                    />
                    <input 
                      className="w-20 input-base text-xs py-1.5 text-center" 
                      placeholder="Unit" 
                      value={item.unit} 
                      onChange={e => {
                        const newItems = [...gatePassDialog.items];
                        newItems[idx].unit = e.target.value;
                        setGatePassDialog({...gatePassDialog, items: newItems});
                      }} 
                    />
                    <input 
                      className="w-36 input-base text-xs py-1.5" 
                      placeholder="Condition remarks" 
                      value={item.remarks || ''} 
                      onChange={e => {
                        const newItems = [...gatePassDialog.items];
                        newItems[idx].remarks = e.target.value;
                        setGatePassDialog({...gatePassDialog, items: newItems});
                      }} 
                    />
                    {gatePassDialog.items.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const newItems = [...gatePassDialog.items];
                          newItems.splice(idx, 1);
                          setGatePassDialog({...gatePassDialog, items: newItems});
                        }} 
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Additional Instructions / Dispatch Notes</label>
              <textarea 
                className="w-full input-base h-16 resize-none text-xs" 
                value={gatePassDialog.notes} 
                onChange={e => setGatePassDialog({...gatePassDialog, notes: e.target.value})} 
                placeholder="Gate pass instructions, security notes, or return condition..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setGatePassDialog(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting} icon={Send}>
                {submitting ? 'Generating...' : 'Confirm & Generate Gate Pass'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receive Customer Sample Modal */}
      <Modal isOpen={receiveSampleOpen} onClose={() => setReceiveSampleOpen(false)} title="Receive Customer Sample (GRN)" size="lg">
        <form onSubmit={handleCreateSampleGRN} className="p-6 space-y-4">
          {/* Quotation / Lead Search & Link Section */}
          <div className="bg-surface2/40 p-3.5 rounded-lg border border-theme-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-primary flex items-center gap-1.5">
                <Search size={14} className="text-rex-600 dark:text-rex-400" />
                Link Quotation or Lead
              </label>
              {(newSampleData.quoteId || newSampleData.leadId) && (
                <button
                  type="button"
                  onClick={() => {
                    setNewSampleData({
                      ...newSampleData,
                      quoteId: '',
                      quoNo: '',
                      leadId: '',
                      customerCompany: '',
                      customerName: ''
                    });
                    setSampleSearchQuery('');
                  }}
                  className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
                >
                  <X size={12} /> Clear Link
                </button>
              )}
            </div>

            {newSampleData.quoteId || newSampleData.leadId ? (
              <div className="p-3 bg-surface rounded border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {newSampleData.quoteId ? (
                      <Badge variant="info" className="text-xs font-mono font-bold flex items-center gap-1">
                        <FileText size={12} /> {newSampleData.quoNo || newSampleData.quoteId}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs font-mono font-bold flex items-center gap-1">
                        <User size={12} /> Direct Lead Sample
                      </Badge>
                    )}
                    {newSampleData.leadId && (
                      <span className="text-xs text-muted font-mono bg-surface2 px-1.5 py-0.5 rounded">
                        Lead: {newSampleData.leadId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-primary">
                    {newSampleData.customerCompany || 'No Company'} {newSampleData.customerName ? `(${newSampleData.customerName})` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setNewSampleData({
                      ...newSampleData,
                      quoteId: '',
                      quoNo: '',
                      leadId: ''
                    });
                    setSampleSearchQuery('');
                  }}
                  className="text-xs"
                >
                  Change Selection
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={sampleSearchQuery}
                    onChange={e => setSampleSearchQuery(e.target.value)}
                    placeholder="Search by Quotation # (e.g. QUO-...), Lead # (e.g. LEAD-...), or Company name..."
                    className="w-full input-base text-xs pl-9 pr-8 py-2 bg-surface"
                  />
                  {sampleSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSampleSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-muted hover:text-primary"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown List */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-theme-subtle rounded-md p-1.5 bg-surface custom-scrollbar">
                  {/* Matching Quotations */}
                  {quotationsList
                    .filter(q => {
                      if (!sampleSearchQuery.trim()) return true;
                      const s = sampleSearchQuery.toLowerCase();
                      return (
                        (q.docNo && q.docNo.toLowerCase().includes(s)) ||
                        (q.id && q.id.toLowerCase().includes(s)) ||
                        (q.leadId && q.leadId.toLowerCase().includes(s)) ||
                        (q.leadCompany && q.leadCompany.toLowerCase().includes(s)) ||
                        (q.company && q.company.toLowerCase().includes(s)) ||
                        (q.leadName && q.leadName.toLowerCase().includes(s)) ||
                        (q.name && q.name.toLowerCase().includes(s))
                      );
                    })
                    .slice(0, 10)
                    .map(q => (
                      <div
                        key={q.id}
                        onClick={() => {
                          setNewSampleData({
                            ...newSampleData,
                            quoteId: q.id,
                            quoNo: q.docNo || q.id,
                            leadId: q.leadId || '',
                            customerCompany: q.leadCompany || q.company || q.customerCompany || '',
                            customerName: q.leadName || q.name || q.customerName || ''
                          });
                          setSampleSearchQuery('');
                        }}
                        className="p-2 hover:bg-surface2 rounded cursor-pointer transition-colors border border-transparent hover:border-theme-subtle flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rex-600 dark:text-rex-400 bg-rex-50 dark:bg-rex-950/40 px-1.5 py-0.5 rounded border border-rex-200 dark:border-rex-900/50">
                            {q.docNo || q.id}
                          </span>
                          <span className="font-medium text-primary">
                            {q.leadCompany || q.company || 'Customer'}
                          </span>
                          {(q.leadName || q.name) && (
                            <span className="text-muted">
                              ({q.leadName || q.name})
                            </span>
                          )}
                          {q.leadId && (
                            <span className="text-[10px] text-muted font-mono bg-surface2 px-1 py-0.5 rounded">
                              {q.leadId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge size="sm" variant={q.status === 'Won' || q.status === 'Approved' ? 'success' : 'default'}>
                            {q.status || 'Draft'}
                          </Badge>
                          {q.totalAmount ? (
                            <span className="text-[11px] font-mono text-muted">
                              {formatCurrency(Number(q.totalAmount))}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}

                  {/* Matching Leads (Direct Samples before quotation) */}
                  {(leadsList || [])
                    .filter((l: any) => {
                      if (!sampleSearchQuery.trim()) return false;
                      const s = sampleSearchQuery.toLowerCase();
                      return (
                        (l.id && l.id.toLowerCase().includes(s)) ||
                        (l.company && l.company.toLowerCase().includes(s)) ||
                        (l.name && l.name.toLowerCase().includes(s)) ||
                        (l.phone && l.phone.toLowerCase().includes(s))
                      );
                    })
                    .slice(0, 6)
                    .map((l: any) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setNewSampleData({
                            ...newSampleData,
                            quoteId: '',
                            quoNo: '',
                            leadId: l.id,
                            customerCompany: l.company || '',
                            customerName: l.name || ''
                          });
                          setSampleSearchQuery('');
                        }}
                        className="p-2 hover:bg-surface2 rounded cursor-pointer transition-colors border border-dashed border-amber-500/30 flex items-center justify-between gap-3 text-xs bg-amber-500/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {l.id}
                          </span>
                          <span className="font-medium text-primary">
                            {l.company}
                          </span>
                          {l.name && <span className="text-muted">({l.name})</span>}
                        </div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          Direct Lead Sample
                        </span>
                      </div>
                    ))}

                  {/* Fallback option */}
                  <div
                    onClick={() => {
                      setNewSampleData({
                        ...newSampleData,
                        quoteId: '',
                        quoNo: '',
                        leadId: ''
                      });
                      setSampleSearchQuery('');
                    }}
                    className="p-1.5 text-center text-[11px] text-muted hover:text-primary cursor-pointer hover:bg-surface2 rounded transition-colors"
                  >
                    -- Enter sample details directly without linking quote or lead --
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Customer / Company *</label>
              <input
                required
                type="text"
                className="w-full input-base text-xs"
                value={newSampleData.customerCompany}
                onChange={e => setNewSampleData({...newSampleData, customerCompany: e.target.value})}
                placeholder="e.g. Lanka Logistics (Pvt) Ltd"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Contact Person</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                value={newSampleData.customerName}
                onChange={e => setNewSampleData({...newSampleData, customerName: e.target.value})}
                placeholder="e.g. Mr. Nimesh Silva"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Receipt Date *</label>
              <input
                required
                type="date"
                className="w-full input-base text-xs"
                value={newSampleData.receivedAt}
                onChange={e => setNewSampleData({...newSampleData, receivedAt: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Received By</label>
              <input
                type="text"
                className="w-full input-base text-xs"
                value={newSampleData.receivedBy}
                onChange={e => setNewSampleData({...newSampleData, receivedBy: e.target.value})}
                placeholder="Receiver name"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-secondary">Items Received</label>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setNewSampleData({ ...newSampleData, items: [...newSampleData.items, { description: '', qty: 1, unit: 'Nos' }] })}
                className="h-6 text-[10px]"
              >
                <Plus size={12} className="mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {newSampleData.items.map((it: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    required
                    className="flex-1 input-base text-xs py-1.5"
                    placeholder="Item description"
                    value={it.description}
                    onChange={e => {
                      const updated = [...newSampleData.items];
                      updated[idx].description = e.target.value;
                      setNewSampleData({...newSampleData, items: updated});
                    }}
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-20 input-base text-xs py-1.5 font-mono text-center"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={e => {
                      const updated = [...newSampleData.items];
                      updated[idx].qty = Number(e.target.value);
                      setNewSampleData({...newSampleData, items: updated});
                    }}
                  />
                  <input
                    className="w-20 input-base text-xs py-1.5 text-center"
                    placeholder="Unit"
                    value={it.unit}
                    onChange={e => {
                      const updated = [...newSampleData.items];
                      updated[idx].unit = e.target.value;
                      setNewSampleData({...newSampleData, items: updated});
                    }}
                  />
                  {newSampleData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...newSampleData.items];
                        updated.splice(idx, 1);
                        setNewSampleData({...newSampleData, items: updated});
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Notes / Condition</label>
            <input
              type="text"
              className="w-full input-base text-xs"
              value={newSampleData.notes}
              onChange={e => setNewSampleData({...newSampleData, notes: e.target.value})}
              placeholder="e.g. For quotation machining estimation, surface intact..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
            <Button variant="ghost" type="button" onClick={() => setReceiveSampleOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Receipt'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Finished Product Modal (Multi-BOM, Drawings, Pricing & Stock Ledger) */}
      <FinishedProductModal
        isOpen={finishedProductModalOpen}
        onClose={() => setFinishedProductModalOpen(false)}
        product={selectedFinishedProduct}
        onSave={async (prodData) => {
          if (selectedFinishedProduct?.id) {
            await updateInventoryItem(selectedFinishedProduct.id, prodData)
            showToast('success', 'Finished product updated successfully')
          } else {
            await createInventoryItem(prodData)
            showToast('success', 'Finished product created successfully')
          }
          refetch()
        }}
      />
    </div>
  )
}
