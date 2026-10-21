import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, Package, Plus, Search, Filter, CheckCircle, 
  Clock, Truck, AlertTriangle, Trash2, Edit, User, Phone, 
  Calendar, DollarSign, ArrowUpRight, CheckCircle2, ChevronRight, X,
  Printer, Eye, FileText, Shield, Download, ExternalLink, Hash, Factory
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SearchBar } from '@/components/ui/SearchBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinishedGoodsOrders, useInventory, useCustomers, useLeads } from '@/hooks/useData'
import { useSettings } from '@/contexts/SettingsContext'
import { useDialog } from '@/components/ui/DialogProvider'
import { SalesOrderPrintView } from '@/components/crm/SalesOrderPrintView'
import { GatePassPrintView } from '@/components/GatePassPrintView'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { 
  createFinishedGoodsOrder, 
  updateFinishedGoodsOrder, 
  dispatchFinishedGoodsOrder, 
  deleteFinishedGoodsOrder,
  createWorkOrder,
  fetchWorkOrders
} from '@/lib/api'

interface FinishedGoodsOrdersViewProps {
  onRefreshProducts?: () => void
  onOpenProductBOM?: (product: any) => void
}

export const FinishedGoodsOrdersView: React.FC<FinishedGoodsOrdersViewProps> = ({
  onRefreshProducts,
  onOpenProductBOM
}) => {
  const navigate = useNavigate()
  const { toast } = useDialog()
  const { settings } = useSettings()
  const { data: orders, loading, refetch } = useFinishedGoodsOrders()
  const { data: inventory, refetch: refetchInventory } = useInventory()
  const { data: customers = [] } = useCustomers()
  const { data: leads = [] } = useLeads()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  
  // Modals for PDF / Print & Dispatch Gate Pass
  const [printOrder, setPrintOrder] = useState<any | null>(null)
  const [printGatePass, setPrintGatePass] = useState<any | null>(null)
  const [dispatchModalOrder, setDispatchModalOrder] = useState<any | null>(null)
  const [dispatchForm, setDispatchForm] = useState({
    carrier: 'REX Transport',
    vehicleNo: '',
    driverName: '',
    destination: '',
    reason: '',
    notes: ''
  })

  // Filter only ready-made finished products from inventory
  const finishedProducts = useMemo(() => {
    return inventory.filter(item => item.type === 'finished_product' || item.type === 'product')
  }, [inventory])

  // Form State for New / Edit Order
  const initialForm = {
    orderNo: '',
    productId: '',
    productName: '',
    productSku: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderDate: new Date().toISOString().slice(0, 10),
    targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    qty: '1',
    unitPrice: '',
    status: 'Pending',
    notes: ''
  }

  const [formData, setFormData] = useState(initialForm)

  const handleOpenCreateModal = (preselectedProduct?: any) => {
    setEditingOrder(null)
    const initialProduct = preselectedProduct || finishedProducts[0]
    setFormData({
      ...initialForm,
      orderNo: `ORD-${Date.now().toString().slice(-5)}`,
      productId: initialProduct?.id || '',
      productName: initialProduct?.name || '',
      productSku: initialProduct?.sku || '',
      unitPrice: initialProduct?.unitPrice ? String(initialProduct.unitPrice) : '0'
    })
    setShowOrderModal(true)
  }

  const handleOpenEditModal = (order: any) => {
    setEditingOrder(order)
    setFormData({
      orderNo: order.orderNo || '',
      productId: order.productId || '',
      productName: order.productName || '',
      productSku: order.productSku || '',
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      orderDate: order.orderDate ? String(order.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      targetDeliveryDate: order.targetDeliveryDate ? String(order.targetDeliveryDate).slice(0, 10) : '',
      qty: String(order.qty || '1'),
      unitPrice: String(order.unitPrice || '0'),
      status: order.status || 'Pending',
      notes: order.notes || ''
    })
    setShowOrderModal(true)
  }

  const handleProductSelect = (pId: string) => {
    const selected = finishedProducts.find(p => p.id === pId)
    if (selected) {
      setFormData(prev => ({
        ...prev,
        productId: selected.id,
        productName: selected.name,
        productSku: selected.sku || '',
        unitPrice: selected.unitPrice ? String(selected.unitPrice) : prev.unitPrice
      }))
    } else {
      setFormData(prev => ({ ...prev, productId: pId }))
    }
  }

  const handleCustomerSelect = (cId: string) => {
    const cust = customers.find(c => c.id === cId) || leads.find(l => l.id === cId)
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.company || cust.name || '',
        customerPhone: cust.phone || prev.customerPhone,
        customerEmail: cust.email || prev.customerEmail
      }))
    }
  }

  const selectedProduct = useMemo(() => {
    return finishedProducts.find(p => p.id === formData.productId)
  }, [finishedProducts, formData.productId])

  const availableStock = Number(selectedProduct?.quantity || 0)
  const requestedQty = Number(formData.qty) || 1
  const hasShortage = requestedQty > availableStock

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productName || !formData.customerName) return
    setSubmitting(true)

    const payload = {
      ...formData,
      qty: Number(formData.qty) || 1,
      unitPrice: Number(formData.unitPrice) || 0,
      totalPrice: (Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0),
      stockStatus: hasShortage ? `Shortage (${requestedQty - availableStock} req)` : 'In Stock'
    }

    try {
      if (editingOrder) {
        await updateFinishedGoodsOrder(editingOrder.id, payload)
      } else {
        await createFinishedGoodsOrder(payload)
      }
      refetch()
      setShowOrderModal(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDispatchModal = (order: any) => {
    setDispatchModalOrder(order)
    setDispatchForm({
      carrier: order.carrier || 'REX Transport',
      vehicleNo: order.vehicleNo || '',
      driverName: order.driverName || '',
      destination: order.deliveryAddress || '',
      reason: `Finished Goods Delivery for Order ${order.orderNo}`,
      notes: order.notes || ''
    })
  }

  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispatchModalOrder) return
    setSubmitting(true)
    try {
      const res = await dispatchFinishedGoodsOrder(dispatchModalOrder.id, dispatchForm)
      if (res && res.error) throw new Error(res.error)

      toast(`Order ${dispatchModalOrder.orderNo} dispatched! Gate Pass ${res.gatePassId || ''} created.`, 'success')
      refetch()
      refetchInventory()
      if (onRefreshProducts) onRefreshProducts()

      if (res.gatePass) {
        setPrintGatePass(res.gatePass)
      }
      setDispatchModalOrder(null)
    } catch (err: any) {
      toast(err?.message || 'Failed to dispatch order', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewGatePass = async (order: any) => {
    const gpId = order.gatePassId || order.gatePassNo
    if (!gpId) {
      toast('No Gate Pass record found for this order', 'warning')
      return
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/gate-passes/${gpId}`)
      if (!res.ok) throw new Error('Gate Pass record not found')
      const gp = await res.json()
      setPrintGatePass(gp)
    } catch (err: any) {
      toast(err?.message || 'Failed to load Gate Pass', 'error')
    }
  }

  const [workOrdersList, setWorkOrdersList] = useState<any[]>([])

  const loadWorkOrders = useCallback(async () => {
    try {
      const wos = await fetchWorkOrders()
      setWorkOrdersList(Array.isArray(wos) ? wos : [])
    } catch (e) {}
  }, [])

  useEffect(() => {
    loadWorkOrders()
  }, [loadWorkOrders])

  const handleCreateWorkOrder = async (order: any, orderItems: any[]) => {
    try {
      const jobQty = Math.max(1, Number(order.qty) || 1)
      const woData = {
        title: `WO: ${order.orderNo} - ${order.customerName}`,
        customerId: order.customerId || null,
        customer: order.customerName,
        orderNo: order.orderNo,
        sourceQuoteId: order.quoteId || null,
        priority: 'Medium',
        jobQty,
        operations: [
          {
            operationName: 'Precision Fabrication & Machining',
            plannedHours: 2,
            hourlyLaborRate: 750,
            hourlyMachineRate: 1200
          }
        ],
        bom: (orderItems && orderItems.length > 0) ? orderItems.map((it: any) => ({
          material: it.description || it.productName || order.productName,
          qty: Number(it.qty) || 1,
          unit: it.uom || 'pcs',
          unitCost: Number(it.unitPrice) || 0,
          notes: `Line item for ${order.orderNo}`
        })) : [
          {
            material: order.productName || 'Order Material',
            qty: jobQty,
            unit: 'pcs',
            unitCost: Number(order.unitPrice) || 0,
            notes: `For Sales Order ${order.orderNo}`
          }
        ]
      }

      const res = await createWorkOrder(woData)
      if (res && res.error === 'DUPLICATE') {
        toast(`A Work Order already exists (${res.existingId || ''}) for ${order.orderNo}!`, 'warning')
        return
      }

      try {
        await updateFinishedGoodsOrder(order.id, { status: 'In Production' })
      } catch (e) {}

      toast(`Work Order successfully created for Sales Order ${order.orderNo}!`, 'success')
      await loadWorkOrders()
      refetch()
    } catch (err: any) {
      toast(err?.message || 'Failed to create Work Order', 'error')
    }
  }

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteFinishedGoodsOrder(deleteTarget.id)
      refetch()
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const q = search.toLowerCase()
      const matchesSearch = !search || (
        (ord.orderNo && ord.orderNo.toLowerCase().includes(q)) ||
        (ord.productName && ord.productName.toLowerCase().includes(q)) ||
        (ord.productSku && ord.productSku.toLowerCase().includes(q)) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
        (ord.customerPhone && ord.customerPhone.toLowerCase().includes(q))
      )

      const matchesStatus = statusFilter === 'all' || ord.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = orders.length
    const pending = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length
    const inProd = orders.filter(o => o.status === 'In Production').length
    const readyOrDispatched = orders.filter(o => o.status === 'Dispatched' || o.isDispatched).length
    const totalRev = orders.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0)

    return { total, pending, inProd, readyOrDispatched, totalRev }
  }, [orders])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Total Orders</span>
            <div className="text-2xl font-mono font-bold text-primary mt-1">{metrics.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Pending / Confirmed</span>
            <div className="text-2xl font-mono font-bold text-amber-500 mt-1">{metrics.pending}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Dispatched & Delivered</span>
            <div className="text-2xl font-mono font-bold text-emerald-500 mt-1">{metrics.readyOrDispatched}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Total Orders Value</span>
            <div className="text-xl font-mono font-bold text-rex-600 mt-1">{formatCurrency(metrics.totalRev)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rex-600/10 text-rex-600 border border-rex-600/20 flex items-center justify-center">
            <DollarSign size={18} />
          </div>
        </GlassCard>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'Pending', 'Confirmed', 'In Production', 'Ready to Dispatch', 'Dispatched'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-all ${
                statusFilter === st
                  ? 'bg-rex-600 text-white shadow-sm'
                  : 'bg-surface hover:bg-surface2 text-secondary border border-theme-subtle'
              }`}
            >
              {st === 'all' ? `All Orders (${orders.length})` : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search order #, product, customer..."
            className="w-64"
          />
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => handleOpenCreateModal()}
            className="whitespace-nowrap"
          >
            New Product Order
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <GlassCard className="p-0 overflow-hidden border border-theme-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-surface2/50 border-b border-theme-subtle text-[10px] font-bold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Product Ordered</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-3 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Price / Total</th>
                <th className="px-3 py-3 text-center">Stock Check</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle/20 text-xs">
              {filteredOrders.map(order => {
                const prod = finishedProducts.find(p => p.id === order.productId)
                const inStockNow = Number(prod?.quantity || 0)
                const isShort = inStockNow < Number(order.qty) && !order.isDispatched

                // Parse items if available
                let orderItems: any[] = []
                if (order.items) {
                  try {
                    orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
                  } catch (e) {
                    orderItems = []
                  }
                }

                // Match linked Work Order if created
                const existingWO = workOrdersList.find((w: any) =>
                  (w.orderNo && (w.orderNo === order.orderNo || w.orderNo.includes(order.orderNo))) ||
                  (w.sourceQuoteId && order.quoteId && String(w.sourceQuoteId) === String(order.quoteId)) ||
                  (w.title && w.title.includes(order.orderNo))
                )

                return (
                  <tr key={order.id} className="hover:bg-surface2/30 transition-colors">
                    {/* Order No, Reference Badges & Dates */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-primary">{order.orderNo}</span>
                          {order.quotationNo && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Linked Quotation">
                              Ref: {order.quotationNo}
                            </span>
                          )}
                          {existingWO && (
                            <span 
                              onClick={() => navigate(`/production/work-orders/${existingWO.id}`)}
                              className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 cursor-pointer hover:bg-blue-500/25 flex items-center gap-0.5" 
                              title="Click to view linked Work Order"
                            >
                              <Factory size={10} /> WO: {existingWO.orderNo || existingWO.id}
                            </span>
                          )}
                          {order.gatePassNo && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title="Gate Pass Issued">
                              GP: {order.gatePassNo}
                            </span>
                          )}
                          {order.invoiceNo && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Invoice Linked">
                              Inv: {order.invoiceNo}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(order.orderDate)}
                          {order.targetDeliveryDate && (
                            <span className="text-secondary font-medium">• Due {formatDate(order.targetDeliveryDate)}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Product & Line Items */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          {prod?.imageUrl ? (
                            <img src={prod.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <Package size={14} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-primary truncate max-w-[200px]" title={order.productName}>
                              {order.productName || (orderItems.length > 0 ? orderItems[0].description : 'Finished Goods')}
                            </span>
                            {orderItems.length > 1 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 border border-blue-500/30">
                                +{orderItems.length - 1} more
                              </span>
                            )}
                          </div>
                          {order.productSku && (
                            <div className="text-[10px] font-mono text-muted">{order.productSku}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary flex items-center gap-1">
                          <User size={12} className="text-muted" />
                          {order.customerName}
                        </span>
                        {order.customerPhone && (
                          <span className="text-[10px] text-muted font-mono flex items-center gap-1 mt-0.5">
                            <Phone size={10} />
                            {order.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono font-bold text-sm text-primary">
                        {order.qty}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col font-mono">
                        <span className="font-bold text-primary">{formatCurrency(order.totalPrice)}</span>
                        {Number(order.unitPrice) > 0 && (
                          <span className="text-[10px] text-muted">@ {formatCurrency(order.unitPrice)}</span>
                        )}
                      </div>
                    </td>

                    {/* Stock Status */}
                    <td className="px-3 py-3 text-center">
                      {order.isDispatched ? (
                        <Badge variant="success" size="sm">
                          Dispatched (-{order.qty})
                        </Badge>
                      ) : isShort ? (
                        <span title={`Stock shortage: only ${inStockNow} in stock`}>
                          <Badge variant="error" size="sm">
                            <AlertTriangle size={10} className="mr-1 inline" /> Shortage
                          </Badge>
                        </span>
                      ) : (
                        <Badge variant="info" size="sm">
                          In Stock ({inStockNow})
                        </Badge>
                      )}
                    </td>

                    {/* Order Status */}
                    <td className="px-3 py-3 text-center">
                      <Badge
                        variant={
                          order.status === 'Dispatched' ? 'success' :
                          order.status === 'In Production' ? 'warning' :
                          order.status === 'Ready to Dispatch' ? 'info' : 'default'
                        }
                        size="sm"
                      >
                        {order.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* PDF / Print Action */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Printer}
                          onClick={() => setPrintOrder(order)}
                          className="h-7 text-xs px-2 border border-theme-subtle text-primary hover:bg-surface2"
                          title="View / Print Sales Order PDF"
                        >
                          PDF
                        </Button>

                        {/* Work Order Action */}
                        {existingWO ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Factory}
                            onClick={() => navigate(`/production/work-orders/${existingWO.id}`)}
                            className="h-7 text-xs px-2 border border-blue-500/30 text-blue-600 hover:bg-blue-500/10 font-mono font-bold"
                            title={`View active Work Order ${existingWO.orderNo || existingWO.id}`}
                          >
                            WO
                          </Button>
                        ) : !order.isDispatched && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Factory}
                            onClick={() => handleCreateWorkOrder(order, orderItems)}
                            className="h-7 text-xs px-2 border border-blue-500/30 text-blue-600 hover:bg-blue-500/10 font-medium"
                            title="Create Work Order for Production"
                          >
                            Work Order
                          </Button>
                        )}

                        {/* Invoice Generation Action */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={FileText}
                          onClick={() => navigate(`/finance/invoices/new?orderId=${order.id}`)}
                          className="h-7 text-xs px-2 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-medium"
                          title="Generate Invoice from Sales Order"
                        >
                          Invoice
                        </Button>

                        {/* Dispatch with Gate Pass */}
                        {!order.isDispatched && order.status !== 'Dispatched' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Truck}
                            onClick={() => handleOpenDispatchModal(order)}
                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            title="Dispatch order and issue Gate Pass"
                          >
                            Dispatch
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Shield}
                            onClick={() => handleViewGatePass(order)}
                            className="h-7 text-xs px-2 border border-purple-500/40 text-purple-600 hover:bg-purple-500/10 font-bold"
                            title="View / Print Gate Pass"
                          >
                            Gate Pass
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(order)}
                          className="p-1.5 hover:bg-surface2 rounded text-muted hover:text-primary transition-colors"
                          title="Edit Order"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(order)}
                          className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-500 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium text-primary">No finished goods orders found</p>
                    <p className="text-xs text-muted mt-0.5">
                      {search ? 'Try adjusting your search criteria.' : 'Create an order to track ready-made product dispatches and customer demand.'}
                    </p>
                    {!search && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Plus}
                        onClick={() => handleOpenCreateModal()}
                        className="mt-3"
                      >
                        Create First Order
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* CREATE / EDIT ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-surface border border-theme-subtle rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-theme-subtle">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <ShoppingCart size={18} className="text-rex-600" />
                {editingOrder ? `Edit Order #${formData.orderNo}` : 'New Finished Product Order'}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface2"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Order #</label>
                  <input
                    type="text"
                    required
                    value={formData.orderNo}
                    onChange={e => setFormData({ ...formData, orderNo: e.target.value })}
                    className="w-full input-base font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Order Date</label>
                  <input
                    type="date"
                    required
                    value={formData.orderDate}
                    onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
                    className="w-full input-base text-xs"
                  />
                </div>

                {/* Product Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Select Finished Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.productId}
                    onChange={e => handleProductSelect(e.target.value)}
                    className="w-full input-base text-xs font-medium"
                  >
                    <option value="">-- Choose Ready-Made Product --</option>
                    {finishedProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || 'No SKU'}) • Stock: {p.quantity || 0} {p.uom || 'pcs'} • Rs. {p.unitPrice || 0}
                      </option>
                    ))}
                  </select>

                  {selectedProduct && (
                    <div className="mt-2 p-2.5 rounded-lg bg-surface2/50 border border-theme-subtle flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-rex-600" />
                        <span>In Stock: <strong className="font-mono text-primary">{availableStock} {selectedProduct.uom || 'pcs'}</strong></span>
                      </div>
                      {hasShortage ? (
                        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                          <AlertTriangle size={13} /> Shortage: {requestedQty - availableStock} needed
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Sufficient Stock Available
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Select Customer / Company
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={e => handleCustomerSelect(e.target.value)}
                    className="w-full input-base text-xs"
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Customer Name / Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Company or Contact Person"
                    className="w-full input-base text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+94 77 123 4567"
                    className="w-full input-base font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Target Delivery Date</label>
                  <input
                    type="date"
                    value={formData.targetDeliveryDate}
                    onChange={e => setFormData({ ...formData, targetDeliveryDate: e.target.value })}
                    className="w-full input-base text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full input-base font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Unit Price (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full input-base font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Order Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full input-base text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Production">In Production</option>
                    <option value="Ready to Dispatch">Ready to Dispatch</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Calculated Total</label>
                  <div className="w-full input-base font-mono font-black text-base text-rex-600 bg-surface2/30">
                    {formatCurrency((Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-secondary mb-1">Order Notes / Delivery Details</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Delivery instructions, batch references, or customer purchase order numbers..."
                    className="w-full input-base text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-subtle">
                <Button variant="ghost" type="button" onClick={() => setShowOrderModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingOrder ? 'Update Order' : 'Create Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH WITH GATE PASS MODAL */}
      {dispatchModalOrder && (
        <Modal
          isOpen={true}
          onClose={() => setDispatchModalOrder(null)}
          title={`Dispatch Order #${dispatchModalOrder.orderNo} & Issue Gate Pass`}
        >
          <form onSubmit={handleConfirmDispatch} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface2/60 border border-theme-subtle text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Customer:</span>
                <span className="font-bold text-primary">{dispatchModalOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Product / Spec:</span>
                <span className="font-semibold text-primary">{dispatchModalOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Order Value:</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(dispatchModalOrder.totalPrice)}</span>
              </div>
              {dispatchModalOrder.quotationNo && (
                <div className="flex justify-between">
                  <span className="text-muted">Quotation Ref:</span>
                  <span className="font-mono text-blue-600">{dispatchModalOrder.quotationNo}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Carrier / Transporter</label>
                  <select
                    value={dispatchForm.carrier}
                    onChange={e => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
                    className="w-full input-base text-xs"
                  >
                    <option value="REX Transport">REX Transport (Internal)</option>
                    <option value="Customer Pickup">Customer Pickup</option>
                    <option value="Courier / Delivery Service">Courier / Delivery Service</option>
                    <option value="Third-Party Lorry / Logistics">Third-Party Lorry / Logistics</option>
                    <option value="Hand Delivery">Hand Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WP CAD-4567 or Self"
                    value={dispatchForm.vehicleNo}
                    onChange={e => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value })}
                    className="w-full input-base text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Driver / Carrier Name</label>
                  <input
                    type="text"
                    placeholder="Driver name / Contact"
                    value={dispatchForm.driverName}
                    onChange={e => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full input-base text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">Destination / Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Factory / site address"
                    value={dispatchForm.destination}
                    onChange={e => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full input-base text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Dispatch Remarks / Gate Pass Notes</label>
                <input
                  type="text"
                  placeholder="Gate Pass delivery notes, batch number, or receiver instructions"
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full input-base text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400">
              💡 Confirming dispatch will auto-generate an official <strong>Gate Pass (GP-XXXX)</strong>, mark order as <strong>Dispatched</strong>, and deduct stock with an OUT entry in the Stock Ledger.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-theme-subtle">
              <Button variant="ghost" type="button" onClick={() => setDispatchModalOrder(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submitting ? 'Processing Dispatch...' : 'Confirm Dispatch & Generate Gate Pass'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SALES ORDER PRINT & PDF VIEW MODAL */}
      {printOrder && (
        <Modal
          isOpen={true}
          onClose={() => setPrintOrder(null)}
          title={`Sales Order Document #${printOrder.orderNo}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
              <div className="text-xs text-muted">
                Official commercial order confirmation for <strong className="text-primary">{printOrder.customerName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => {
                    const el = document.getElementById('sales-order-print-section');
                    if (!el) return;
                    const opt: any = {
                      margin: 0,
                      filename: `Sales_Order_${printOrder.orderNo}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(el).save();
                  }}
                  className="bg-surface2 border border-theme-subtle text-xs hover:bg-surface"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  Print Order
                </Button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex justify-center">
              <SalesOrderPrintView 
                order={printOrder} 
                customer={customers.find(c => c.id === printOrder.customerId) || leads.find(l => l.id === printOrder.customerId)}
                settings={settings} 
              />
            </div>
          </div>
        </Modal>
      )}

      {/* GATE PASS PRINT & VIEW MODAL */}
      {printGatePass && (
        <Modal
          isOpen={true}
          onClose={() => setPrintGatePass(null)}
          title={`Gate Pass Document #${printGatePass.id}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
              <div className="text-xs text-muted">
                Official Security & Dispatch Gate Pass for <strong className="text-primary">{printGatePass.customerName || printGatePass.customerCompany}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Download}
                  onClick={() => {
                    const el = document.getElementById('gatepass-print-section');
                    if (!el) return;
                    const opt: any = {
                      margin: 0,
                      filename: `Gate_Pass_${printGatePass.id}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(el).save();
                  }}
                  className="bg-surface2 border border-theme-subtle text-xs hover:bg-surface"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  Print Gate Pass
                </Button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex justify-center">
              <GatePassPrintView 
                gatePass={printGatePass} 
                settings={settings} 
              />
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          title="Delete Order"
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Are you sure you want to delete Order <strong className="text-primary">{deleteTarget.orderNo}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteOrder}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete Order'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
