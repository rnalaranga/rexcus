import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, Package, Plus, Search, Filter, CheckCircle, 
  Clock, Truck, AlertTriangle, Trash2, Edit, User, Phone, 
  Calendar, DollarSign, ArrowUpRight, CheckCircle2, ChevronRight, ChevronDown, X,
  Printer, Eye, FileText, Shield, Download, ExternalLink, Hash, Factory,
  ShoppingBag, Receipt
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SearchBar } from '@/components/ui/SearchBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinishedGoodsOrders, useInventory, useCustomers, useLeads, useQuotations, useInvoices } from '@/hooks/useData'
import { useSettings } from '@/contexts/SettingsContext'
import { useDialog } from '@/components/ui/DialogProvider'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { ProductAutocomplete } from '@/components/ui/ProductAutocomplete'
import { QuotationAutocomplete } from '@/components/ui/QuotationAutocomplete'
import { SalesOrderPrintView } from '@/components/crm/SalesOrderPrintView'
import { GatePassPrintView } from '@/components/GatePassPrintView'
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown'
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal'
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { CreateAdvanceProformaModal } from '@/components/crm/CreateAdvanceProformaModal'
import { ProformaInvoicePrintModal } from '@/components/crm/ProformaInvoicePrintModal'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { 
  createFinishedGoodsOrder, 
  updateFinishedGoodsOrder, 
  dispatchFinishedGoodsOrder, 
  deleteFinishedGoodsOrder,
  createWorkOrder,
  fetchWorkOrders,
  fetchPaymentReceipts
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
  const { data: rawQuotations = [] } = useQuotations()
  const { data: allInvoices = [] } = useInvoices()

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

  // Payment Receipts state
  const [paymentReceiptsList, setPaymentReceiptsList] = useState<any[]>([])
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null)
  const [printReceiptModalOpen, setPrintReceiptModalOpen] = useState(false)
  const [activePrintReceipt, setActivePrintReceipt] = useState<any | null>(null)
  const [preInvoicePromptOrder, setPreInvoicePromptOrder] = useState<any | null>(null)
  const [proformaModalOrder, setProformaModalOrder] = useState<any | null>(null)
  const [activePrintProforma, setActivePrintProforma] = useState<any | null>(null)

  const loadPaymentReceipts = useCallback(async () => {
    try {
      const recs = await fetchPaymentReceipts()
      if (Array.isArray(recs)) {
        setPaymentReceiptsList(recs)
      }
    } catch (err) {
      console.error('Failed to load payment receipts in Sales Orders:', err)
    }
  }, [])

  useEffect(() => {
    loadPaymentReceipts()
  }, [loadPaymentReceipts])

  const getOrderReceipts = useCallback((order: any) => {
    if (!order) return []
    const oNo = String(order.orderNo || '').trim().toLowerCase()
    const qNo = String(order.quotationNo || '').trim().toLowerCase()
    const oId = String(order.id || '').trim()
    const qId = String(order.quoteId || order.quotationId || '').trim()

    return paymentReceiptsList.filter((r: any) => {
      const rOrderNo = String(r.orderNo || '').trim().toLowerCase()
      const rQuoNo = String(r.quotationNo || '').trim().toLowerCase()
      const rOrderId = String(r.orderId || '').trim()
      const rQuoteId = String(r.quoteId || r.quotationId || '').trim()

      return (
        (oId && rOrderId && rOrderId === oId) ||
        (oNo && rOrderNo && rOrderNo === oNo) ||
        (qNo && rQuoNo && rQuoNo === qNo) ||
        (qId && rQuoteId && rQuoteId === qId)
      )
    })
  }, [paymentReceiptsList])

  const handleOpenReceiptModal = (order: any) => {
    setSelectedOrderForReceipt(order)
    setReceiptModalOpen(true)
  }

  const handleInvoiceClick = (order: any) => {
    if (order.invoiceNo || order.invoiceId) {
      navigate(`/finance/invoices?search=${encodeURIComponent(order.invoiceNo || order.invoiceId)}`)
      return
    }
    const recs = getOrderReceipts(order)
    if (recs.length === 0) {
      setPreInvoicePromptOrder(order)
    } else {
      navigate(`/finance/invoices/new?orderId=${order.id}`)
    }
  }

  // Filter only ready-made finished products from inventory
  const finishedProducts = useMemo(() => {
    return inventory.filter(item => item.type === 'finished_product' || item.type === 'product')
  }, [inventory])

  // Normalized list of all quotations (Engineering + Product) for order conversion
  const availableQuotations = useMemo(() => {
    return (rawQuotations || []).map((q: any) => {
      let parsed: any = {};
      try {
        parsed = typeof q.data === 'string' ? JSON.parse(q.data) : (q.data || {});
      } catch (e) {}

      const isProd = q.type === 'product' || q.type === 'product_draft' || parsed.isProductQuotation === true || parsed.quotationCategory === 'product';
      const quoteTypeLabel = isProd ? 'Product Quotation' : 'Engineering Quotation';
      const qNo = q.quotationNo || q.docNo || parsed.quotationNo || q.quoNo || q.id;
      const custName = q.leadCompany || q.leadName || parsed.customerCompany || parsed.customerName || 'Customer';
      const totalAmt = Number(q.totalAmount || q.customAmount || parsed.custTotals?.total || 0);

      const rawItems = parsed.custItems || parsed.items || parsed.jobItems || [];
      const itemsCount = Array.isArray(rawItems) ? rawItems.length : 1;

      return {
        ...q,
        parsed,
        isProd,
        quoteTypeLabel,
        displayNo: qNo,
        customerDisplayName: custName,
        totalAmt,
        itemsCount
      };
    });
  }, [rawQuotations]);

  // Form State for New / Edit Order
  const initialForm = {
    orderNo: '',
    orderSource: 'from_quote' as 'from_quote' | 'ready_made' | 'custom_job',
    quoteId: '',
    quotationNo: '',
    productId: '',
    productName: '',
    productSku: '',
    uom: 'Nos',
    customerId: '',
    customerName: '',
    attention: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    orderDate: new Date().toISOString().slice(0, 10),
    targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    qty: '1',
    unitPrice: '',
    status: 'Confirmed',
    notes: '',
    items: [] as any[]
  }

  const [formData, setFormData] = useState(initialForm)

  const handleOpenCreateModal = (preselectedProduct?: any) => {
    setEditingOrder(null)
    const initialProduct = preselectedProduct
    if (initialProduct) {
      setFormData({
        ...initialForm,
        orderNo: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        orderSource: 'ready_made',
        productId: initialProduct?.id || '',
        productName: initialProduct?.name || '',
        productSku: initialProduct?.sku || '',
        unitPrice: initialProduct?.unitPrice ? String(initialProduct.unitPrice) : '0'
      })
    } else {
      setFormData({
        ...initialForm,
        orderNo: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        orderSource: 'from_quote'
      })
    }
    setShowOrderModal(true)
  }

  const handleOpenEditModal = (order: any) => {
    setEditingOrder(order)
    let parsedItems: any[] = [];
    if (order.items) {
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (e) {}
    }

    let source: 'from_quote' | 'ready_made' | 'custom_job' = 'ready_made';
    if (order.quoteId || order.quotationNo) {
      source = 'from_quote';
    } else if (order.productId === 'CUSTOM-JOB' || order.productId === 'CUSTOM-ORDER' || (!order.productId && order.productName)) {
      source = 'custom_job';
    }

    setFormData({
      orderNo: order.orderNo || '',
      orderSource: source,
      quoteId: order.quoteId || '',
      quotationNo: order.quotationNo || '',
      productId: order.productId || '',
      productName: order.productName || '',
      productSku: order.productSku || '',
      uom: order.uom || 'Nos',
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      attention: order.attention || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      deliveryAddress: order.deliveryAddress || '',
      orderDate: order.orderDate ? String(order.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      targetDeliveryDate: order.targetDeliveryDate ? String(order.targetDeliveryDate).slice(0, 10) : '',
      qty: String(order.qty || '1'),
      unitPrice: String(order.unitPrice || '0'),
      status: order.status || 'Confirmed',
      notes: order.notes || '',
      items: parsedItems
    })
    setShowOrderModal(true)
  }

  const handleSourceChange = (src: 'from_quote' | 'ready_made' | 'custom_job') => {
    setFormData(prev => {
      if (src === 'from_quote') {
        return {
          ...prev,
          orderSource: src,
          productId: 'QUOTED-ITEM',
          productSku: '',
          items: []
        };
      } else if (src === 'ready_made') {
        const firstProd = finishedProducts[0];
        return {
          ...prev,
          orderSource: src,
          quoteId: '',
          quotationNo: '',
          productId: firstProd?.id || '',
          productName: firstProd?.name || '',
          productSku: firstProd?.sku || '',
          unitPrice: firstProd?.unitPrice ? String(firstProd.unitPrice) : prev.unitPrice,
          items: []
        };
      } else {
        return {
          ...prev,
          orderSource: src,
          quoteId: '',
          quotationNo: '',
          productId: 'CUSTOM-JOB',
          productName: '',
          productSku: '',
          unitPrice: '',
          uom: 'Nos',
          items: []
        };
      }
    });
  };

  const handleQuoteSelect = (qId: string) => {
    const quote = availableQuotations.find(q => String(q.id) === String(qId));
    if (!quote) {
      setFormData(prev => ({
        ...prev,
        quoteId: '',
        quotationNo: '',
        items: []
      }));
      return;
    }

    const parsed = quote.parsed || {};
    const custId = quote.matchedCustomerId || quote.leadId || parsed.leadId || '';
    const custName = quote.leadCompany || quote.leadName || parsed.customerCompany || parsed.customerName || '';
    const attn = parsed.attention || quote.attention || quote.leadContact || (parsed.customerName && parsed.customerName !== custName ? parsed.customerName : '') || '';
    const custPhone = quote.leadPhone || '';
    const custEmail = quote.leadEmail || '';
    const deliveryAddr = quote.leadAddress || parsed.customerAddress || parsed.deliveryAddress || '';
    const terms = parsed.custTerms || parsed.paymentTerms || parsed.terms || 'Standard Terms';

    // Extract Line items
    const rawItems = parsed.custItems || parsed.items || [];
    const extractedItems: any[] = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      rawItems.forEach((it: any) => {
        const desc = it.desc || it.description || it.name || it.text || '';
        if (!desc && !it.unitPrice && !it.amount) return;
        extractedItems.push({
          productId: it.productId || it.inventoryId || (quote.isProd ? 'PRODUCT-ITEM' : 'CUSTOM-JOB'),
          productName: it.name || desc,
          productSku: it.sku || '',
          description: desc,
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice ?? it.price ?? 0),
          amount: Number(it.amount) || ((Number(it.qty) || 1) * Number(it.unitPrice ?? it.price ?? 0)),
          uom: it.uom || it.unit || 'Nos'
        });
      });
    }

    if (extractedItems.length === 0) {
      if (Array.isArray(parsed.jobItems) && parsed.jobItems.length > 0) {
        const jiText = parsed.jobItems.map((j: any) => j.text || j.desc || '').filter(Boolean).join(', ');
        extractedItems.push({
          productId: 'CUSTOM-JOB',
          productName: parsed.subject || `Quotation ${quote.displayNo}`,
          productSku: '',
          description: (parsed.subject ? `${parsed.subject} - ` : '') + (jiText || 'Custom Machining Job'),
          qty: Number(parsed.jobQty) || 1,
          unitPrice: Number(quote.totalAmt || 0),
          amount: Number(quote.totalAmt || 0),
          uom: 'Lot'
        });
      } else {
        extractedItems.push({
          productId: quote.isProd ? 'PRODUCT-ITEM' : 'CUSTOM-JOB',
          productName: parsed.subject || `Quotation ${quote.displayNo}`,
          productSku: '',
          description: parsed.subject || `Quotation ${quote.displayNo}`,
          qty: 1,
          unitPrice: Number(quote.totalAmt || 0),
          amount: Number(quote.totalAmt || 0),
          uom: 'Lot'
        });
      }
    }

    const primaryDesc = extractedItems[0]?.description || extractedItems[0]?.productName || parsed.subject || `Quotation ${quote.displayNo}`;
    const primaryPrice = extractedItems.length === 1 ? extractedItems[0].unitPrice : quote.totalAmt;
    const primaryQty = extractedItems.length === 1 ? extractedItems[0].qty : 1;

    setFormData(prev => ({
      ...prev,
      quoteId: quote.id,
      quotationNo: quote.displayNo,
      customerId: custId || prev.customerId,
      customerName: custName || prev.customerName,
      attention: attn || prev.attention,
      customerPhone: custPhone || prev.customerPhone,
      customerEmail: custEmail || prev.customerEmail,
      deliveryAddress: deliveryAddr || prev.deliveryAddress,
      notes: `Sales Order created from ${quote.quoteTypeLabel} ${quote.displayNo}. Terms: ${terms}`,
      productName: primaryDesc,
      productSku: extractedItems[0]?.productSku || '',
      productId: extractedItems[0]?.productId || (quote.isProd ? 'PRODUCT-ITEM' : 'CUSTOM-JOB'),
      qty: String(primaryQty),
      unitPrice: String(primaryPrice),
      items: extractedItems
    }));
  };

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

  const handleCustomerSelect = (cId: string, custObj?: any) => {
    const cust = custObj || customers.find(c => c.id === cId) || leads.find(l => l.id === cId)
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.company || cust.name || '',
        attention: cust.attention || cust.contactPerson || (cust.company && cust.name && cust.company !== cust.name ? cust.name : prev.attention),
        customerPhone: cust.phone || prev.customerPhone,
        customerEmail: cust.email || prev.customerEmail,
        deliveryAddress: cust.address || prev.deliveryAddress
      }))
    }
  }

  const selectedProduct = useMemo(() => {
    return finishedProducts.find(p => p.id === formData.productId)
  }, [finishedProducts, formData.productId])

  const selectedQuotation = useMemo(() => {
    return availableQuotations.find(q => String(q.id) === String(formData.quoteId));
  }, [availableQuotations, formData.quoteId]);

  const availableStock = Number(selectedProduct?.quantity || 0)
  const requestedQty = Number(formData.qty) || 1
  const hasShortage = formData.orderSource === 'ready_made' && requestedQty > availableStock

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.productName || !formData.customerName) return
    setSubmitting(true)

    // Build items list
    let itemsList: any[] = [];
    if (formData.orderSource === 'from_quote' && formData.items && formData.items.length > 0) {
      itemsList = formData.items;
    } else if (formData.orderSource === 'ready_made') {
      itemsList = [{
        productId: formData.productId,
        productName: formData.productName,
        productSku: formData.productSku,
        description: formData.productName,
        qty: Number(formData.qty) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        amount: (Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0),
        uom: selectedProduct?.uom || 'Nos'
      }];
    } else {
      itemsList = [{
        productId: 'CUSTOM-JOB',
        productName: formData.productName,
        productSku: formData.productSku,
        description: formData.productName,
        qty: Number(formData.qty) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        amount: (Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0),
        uom: formData.uom || 'Nos'
      }];
    }

    const calculatedTotal = itemsList.length > 1 && formData.orderSource === 'from_quote'
      ? itemsList.reduce((acc, it) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0)
      : (Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0);

    const stockStatus = formData.orderSource === 'ready_made'
      ? (hasShortage ? `Shortage (${requestedQty - availableStock} req)` : 'In Stock')
      : (formData.orderSource === 'from_quote' ? 'Quoted Spec' : 'Custom Production');

    const payload = {
      ...formData,
      items: itemsList,
      qty: itemsList.length > 1 && formData.orderSource === 'from_quote'
        ? itemsList.reduce((sum, it) => sum + (Number(it.qty) || 1), 0)
        : (Number(formData.qty) || 1),
      unitPrice: Number(formData.unitPrice) || 0,
      subtotal: calculatedTotal,
      totalPrice: calculatedTotal,
      stockStatus,
      attention: formData.attention || null,
      quoteId: formData.quoteId || null,
      quotationNo: formData.quotationNo || null,
      deliveryAddress: formData.deliveryAddress || null
    };

    try {
      if (editingOrder) {
        await updateFinishedGoodsOrder(editingOrder.id, payload)
      } else {
        await createFinishedGoodsOrder(payload)
      }
      refetch()
      setShowOrderModal(false)
      toast(editingOrder ? 'Sales order updated successfully!' : 'Sales order created successfully!', 'success')
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to save sales order', 'error')
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

  const [openActionOrderId, setOpenActionOrderId] = useState<string | number | null>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.order-action-menu-container')) {
        setOpenActionOrderId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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
        (ord.attention && ord.attention.toLowerCase().includes(q)) ||
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
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Pending / Confirmed</span>
            <div className="text-2xl font-mono font-bold text-amber-500 mt-1">{metrics.pending}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <Clock size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Dispatched & Delivered</span>
            <div className="text-2xl font-mono font-bold text-emerald-500 mt-1">{metrics.readyOrDispatched}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Total Orders Value</span>
            <div className="text-xl font-mono font-bold text-rex-600 mt-1">{formatCurrency(metrics.totalRev)}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <DollarSign size={18} />
          </div>
        </GlassCard>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted font-medium flex items-center gap-1.5">
            <Filter size={13} /> Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-surface border border-theme-subtle text-primary rounded-none focus:outline-none focus:border-rex-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Orders ({orders.length})</option>
            <option value="Pending">Pending ({orders.filter(o => o.status === 'Pending').length})</option>
            <option value="Confirmed">Confirmed ({orders.filter(o => o.status === 'Confirmed').length})</option>
            <option value="In Production">In Production ({orders.filter(o => o.status === 'In Production').length})</option>
            <option value="Ready to Dispatch">Ready to Dispatch ({orders.filter(o => o.status === 'Ready to Dispatch').length})</option>
            <option value="Dispatched">Dispatched ({orders.filter(o => o.status === 'Dispatched' || o.isDispatched).length})</option>
          </select>
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
            New Sales Order
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <GlassCard className="p-0 border border-theme-subtle">
        <div className="overflow-x-auto min-h-[380px] pb-28 custom-scrollbar">
          <table className="w-full text-left min-w-[980px]">
            <thead className="bg-surface2/60 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">Order # & Date</th>
                <th className="px-3.5 py-3">Customer</th>
                <th className="px-3.5 py-3">Product Ordered</th>
                <th className="px-3 py-3 text-center">Qty & Stock</th>
                <th className="px-3.5 py-3 text-right">Value & Advance</th>
                <th className="px-3 py-3 text-center">Traceability</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle/30 text-xs">
              {filteredOrders.map((order, idx) => {
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

                const recs = getOrderReceipts(order);
                const totalAdv = recs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                const latestRec = recs.length > 0 ? recs[recs.length - 1] : null;

                const linkedProforma = allInvoices.find((inv: any) =>
                  (inv.isProforma || inv.invoiceType === 'proforma' || inv.status === 'proforma' || inv.invoiceNo?.startsWith('PI-') || inv.id?.startsWith('PI-')) &&
                  (
                    (order.orderNo && inv.orderNo && String(inv.orderNo) === String(order.orderNo)) ||
                    (order.id && inv.orderId && String(inv.orderId) === String(order.id)) ||
                    (order.quotationNo && inv.quotationNo && String(inv.quotationNo) === String(order.quotationNo))
                  )
                );

                const linkedInvoice = allInvoices.find((inv: any) =>
                  (!inv.isProforma && inv.invoiceType !== 'proforma' && !inv.invoiceNo?.startsWith('PI-') && !inv.id?.startsWith('PI-')) &&
                  (
                    (order.invoiceId && (String(inv.id) === String(order.invoiceId) || String(inv.invoiceNo) === String(order.invoiceId))) ||
                    (order.invoiceNo && (String(inv.invoiceNo) === String(order.invoiceNo) || String(inv.id) === String(order.invoiceNo))) ||
                    (inv.orderNo && order.orderNo && String(inv.orderNo) === String(order.orderNo))
                  )
                );
                const isInvoicePaid = linkedInvoice?.status === 'paid' || order.paymentStatus === 'Paid';
                const isInvoicePartPaid = linkedInvoice?.status === 'partially_paid' || order.paymentStatus === 'Partially Paid';

                return (
                  <tr key={order.id} className={`hover:bg-surface2/40 transition-colors ${openActionOrderId === order.id ? 'relative z-50 bg-surface2/60' : 'relative z-0'}`}>
                    {/* Order No & Dates */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {order.orderNo}
                        </span>
                        <div className="text-[11px] text-muted flex items-center gap-1 font-mono mt-0.5">
                          <Calendar size={10} className="shrink-0" />
                          <span>{formatDate(order.orderDate)}</span>
                          {order.targetDeliveryDate && (
                            <span className="text-secondary font-medium">• Due {formatDate(order.targetDeliveryDate)}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-3.5 py-2.5 max-w-[200px]">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-primary truncate" title={order.customerName}>
                          {order.customerName}
                        </span>
                        {order.attention && (
                          <span className="text-[11px] text-muted truncate">
                            Attn: {order.attention}
                          </span>
                        )}
                        {order.customerPhone && (
                          <span className="text-[10px] text-muted font-mono flex items-center gap-1 mt-0.5">
                            <Phone size={9} /> {order.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Product & Line Items */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-none bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                          {prod?.imageUrl ? (
                            <img src={prod.imageUrl} alt="" className="w-full h-full object-cover rounded-none" />
                          ) : (
                            <Package size={13} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-primary truncate max-w-[180px]" title={order.productName}>
                              {order.productName || (orderItems.length > 0 ? orderItems[0].description : 'Finished Goods')}
                            </span>
                            {orderItems.length > 1 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                +{orderItems.length - 1}
                              </span>
                            )}
                          </div>
                          {order.productSku && (
                            <span className="text-[10px] font-mono text-muted block">{order.productSku}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Qty & Stock */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono font-bold text-xs text-primary">
                          {order.qty} pcs
                        </span>
                        {order.isDispatched ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            Dispatched
                          </span>
                        ) : isShort ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-none bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5" title={`Shortage: only ${inStockNow} in stock`}>
                            <AlertTriangle size={9} /> Shortage ({inStockNow})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-none bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                            In Stock ({inStockNow})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Value & Advance */}
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-xs text-primary">
                          {formatCurrency(order.totalPrice)}
                        </span>
                        {Number(order.unitPrice) > 0 && (
                          <span className="text-[10px] text-muted font-mono">@ {formatCurrency(order.unitPrice)}</span>
                        )}
                        {linkedProforma && (
                          <button
                            type="button"
                            onClick={() => setActivePrintProforma(linkedProforma)}
                            className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors flex items-center gap-0.5 mt-0.5"
                            title={`Advance Proforma Invoice: ${linkedProforma.invoiceNo || linkedProforma.id}`}
                          >
                            <FileText size={9} /> Proforma: {formatCurrency(Number(linkedProforma.total || 0))}
                          </button>
                        )}
                        {totalAdv > 0 && latestRec && (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePrintReceipt({
                                ...latestRec,
                                orderNo: order.orderNo,
                                totalQuoted: Number(order.totalPrice || 0)
                              });
                              setPrintReceiptModalOpen(true);
                            }}
                            className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors flex items-center gap-0.5 mt-0.5"
                            title={`Advance Paid: ${formatCurrency(totalAdv)}`}
                          >
                            <Receipt size={9} /> Adv: {formatCurrency(totalAdv)}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Traceability Dropdown with Glowing Lamp */}
                    <td className="px-3 py-2.5 text-center">
                      <TraceabilityDropdown
                        title={`Order #${order.orderNo}`}
                        traces={(() => {
                          const traces: TraceNode[] = [];
                          if (order.quotationNo) {
                            traces.push({
                              type: 'quotation',
                              title: 'Quotation',
                              reference: order.quotationNo,
                              subtitle: 'Linked commercial quotation',
                              statusBadge: { label: 'Quote', variant: 'info' },
                              navigateUrl: `/crm/quotations?search=${encodeURIComponent(order.quotationNo)}`
                            });
                          }
                          if (existingWO) {
                            traces.push({
                              type: 'work_order',
                              title: 'Work Order',
                              reference: existingWO.orderNo || existingWO.id,
                              subtitle: `Production Job • ${existingWO.title || ''}`,
                              statusBadge: { 
                                label: existingWO.status || 'In Production', 
                                variant: existingWO.status === 'Completed' ? 'success' : 'warning' 
                              },
                              navigateUrl: `/production/work-orders/${existingWO.id}`
                            });
                          }
                          if (linkedProforma) {
                            traces.push({
                              type: 'proforma',
                              title: 'Advance Proforma Invoice',
                              reference: linkedProforma.invoiceNo || linkedProforma.id,
                              subtitle: `Advance Deposit: ${formatCurrency(Number(linkedProforma.total || 0))}`,
                              statusBadge: { label: 'Proforma', variant: 'info' },
                              onClick: () => setActivePrintProforma(linkedProforma)
                            });
                          }
                          if (order.gatePassNo) {
                            traces.push({
                              type: 'gate_pass',
                              title: 'Security Gate Pass',
                              reference: order.gatePassNo,
                              subtitle: order.isDispatched ? 'Dispatched from Premises' : 'Gate Pass Issued',
                              statusBadge: { 
                                label: order.isDispatched ? 'Dispatched' : 'Gate Pass', 
                                variant: order.isDispatched ? 'success' : 'info' 
                              },
                              onClick: () => handleViewGatePass(order)
                            });
                          }
                          if (order.invoiceNo || linkedInvoice) {
                            const invNo = linkedInvoice?.invoiceNo || order.invoiceNo;
                            traces.push({
                              type: 'invoice',
                              title: 'Tax Invoice',
                              reference: invNo,
                              subtitle: isInvoicePaid ? 'Payment Confirmed in Full' : (isInvoicePartPaid ? `Partially Paid: ${formatCurrency(linkedInvoice?.paidAmount || 0)}` : 'Awaiting Payment'),
                              statusBadge: { 
                                label: isInvoicePaid ? 'Paid' : isInvoicePartPaid ? 'Part Paid' : 'Unpaid', 
                                variant: isInvoicePaid ? 'success' : isInvoicePartPaid ? 'warning' : 'danger' 
                              },
                              navigateUrl: `/finance/invoices?search=${encodeURIComponent(invNo)}`
                            });
                          }
                          if (totalAdv > 0 && latestRec) {
                            traces.push({
                              type: 'receipt',
                              title: 'Advance Payment',
                              reference: latestRec.receiptNo || 'Payment Receipt',
                              subtitle: `Advance Paid: ${formatCurrency(totalAdv)}`,
                              statusBadge: { label: 'Advance Paid', variant: 'success' },
                              onClick: () => {
                                setActivePrintReceipt({
                                  ...latestRec,
                                  orderNo: order.orderNo,
                                  totalQuoted: Number(order.totalPrice || 0)
                                });
                                setPrintReceiptModalOpen(true);
                              }
                            });
                          }
                          return traces;
                        })()}
                      />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
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
                    <td className={`px-4 py-2.5 text-right ${openActionOrderId === order.id ? 'relative z-50' : 'relative z-0'}`}>
                      <div className={`flex items-center justify-end gap-1.5 order-action-menu-container ${openActionOrderId === order.id ? 'relative z-50' : 'relative z-0'}`}>
                        {/* Quick 1-click Print PDF */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Printer}
                          onClick={() => setPrintOrder(order)}
                          className="h-7 text-xs px-2 border border-theme-subtle text-primary hover:bg-surface2 rounded-none"
                          title="View / Print Sales Order PDF"
                        >
                          PDF
                        </Button>

                        {/* Actions Dropdown Button */}
                        <div className={`relative inline-block text-left ${openActionOrderId === order.id ? 'z-50' : ''}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionOrderId(openActionOrderId === order.id ? null : order.id);
                            }}
                            className={`h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none ${
                              openActionOrderId === order.id
                                ? 'bg-rex-600 text-white border-rex-600'
                                : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
                            }`}
                          >
                            Actions
                            <ChevronDown size={11} className={`transition-transform duration-150 ${openActionOrderId === order.id ? 'rotate-180' : ''}`} />
                          </button>

                          {openActionOrderId === order.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-0 ${
                                idx >= filteredOrders.length - 2 && filteredOrders.length > 2 ? 'bottom-full mb-1' : 'top-full mt-1'
                              } w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl z-[9999] max-h-[75vh] overflow-y-auto custom-scrollbar py-1.5 text-left rounded-none animate-fade-in`}
                            >
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                Order Documents
                              </div>

                              {/* 1. View / Print PDF */}
                              <button
                                type="button"
                                onClick={() => { setPrintOrder(order); setOpenActionOrderId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Printer size={14} className="text-zinc-500 shrink-0" />
                                <span>Print Sales Order PDF</span>
                              </button>

                              {/* 2. Invoice */}
                              {linkedInvoice || order.invoiceNo ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate(`/finance/invoices?search=${encodeURIComponent(linkedInvoice?.invoiceNo || order.invoiceNo)}`);
                                    setOpenActionOrderId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <FileText size={14} className="shrink-0 text-emerald-600" />
                                  <span>View Invoice ({linkedInvoice?.invoiceNo || order.invoiceNo})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { handleInvoiceClick(order); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <FileText size={14} className="shrink-0 text-emerald-600" />
                                  <span>Generate Invoice</span>
                                </button>
                              )}

                              {/* 2.5 Advance Proforma Invoice */}
                              {linkedProforma ? (
                                <button
                                  type="button"
                                  onClick={() => { setActivePrintProforma(linkedProforma); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <FileText size={14} className="shrink-0 text-blue-600" />
                                  <span>View Proforma Invoice ({linkedProforma.invoiceNo || linkedProforma.id})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setProformaModalOrder(order); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <FileText size={14} className="shrink-0 text-blue-600" />
                                  <span>Create Advance Proforma Invoice</span>
                                </button>
                              )}

                              {/* 3. Advance Payment Receipt */}
                              <button
                                type="button"
                                onClick={() => { handleOpenReceiptModal(order); setOpenActionOrderId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Receipt size={14} className="shrink-0 text-emerald-600" />
                                <span>Issue Advance Receipt</span>
                              </button>

                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                Operations & Dispatch
                              </div>

                              {/* 4. Work Order */}
                              {existingWO ? (
                                <button
                                  type="button"
                                  onClick={() => { navigate(`/production/work-orders/${existingWO.id}`); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <Factory size={14} className="shrink-0 text-blue-600" />
                                  <span className="truncate">View Work Order ({existingWO.orderNo || existingWO.id})</span>
                                </button>
                              ) : !order.isDispatched ? (
                                <button
                                  type="button"
                                  onClick={() => { handleCreateWorkOrder(order, orderItems); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <Factory size={14} className="shrink-0 text-blue-600" />
                                  <span>Create Work Order</span>
                                </button>
                              ) : null}

                              {/* 5. Dispatch / Gate Pass */}
                              {!order.isDispatched && order.status !== 'Dispatched' ? (
                                <button
                                  type="button"
                                  onClick={() => { handleOpenDispatchModal(order); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <Truck size={14} className="text-emerald-500 shrink-0" />
                                  <span>Dispatch & Gate Pass</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { handleViewGatePass(order); setOpenActionOrderId(null); }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <Shield size={14} className="shrink-0 text-purple-600" />
                                  <span>View Gate Pass ({order.gatePassNo || 'Issued'})</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                Order Management
                              </div>

                              {/* 6. Edit Order */}
                              <button
                                type="button"
                                onClick={() => { handleOpenEditModal(order); setOpenActionOrderId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Edit size={14} className="text-zinc-500 shrink-0" />
                                <span>Edit Order</span>
                              </button>

                              {/* 7. Delete Order */}
                              <button
                                type="button"
                                onClick={() => { setDeleteTarget(order); setOpenActionOrderId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Trash2 size={14} className="shrink-0 text-rose-500" />
                                <span>Delete Order</span>
                              </button>
                            </div>
                          )}
                        </div>
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
          <div className="relative w-full max-w-2xl bg-surface border border-theme-subtle rounded-none shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-theme-subtle">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <ShoppingBag size={18} className="text-blue-600" />
                {editingOrder ? `Edit Sales Order #${formData.orderNo}` : 'New Sales Order'}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1.5 rounded-none text-muted hover:text-primary hover:bg-surface2"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4">
              {/* Order Source / Category Switcher */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">
                  Order Source / Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSourceChange('from_quote')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-xs font-bold transition-all ${
                      formData.orderSource === 'from_quote'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-surface2/50 text-secondary border-theme-subtle hover:bg-surface2 hover:text-primary'
                    }`}
                  >
                    <FileText size={14} />
                    <span>From Quotation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSourceChange('ready_made')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-xs font-bold transition-all ${
                      formData.orderSource === 'ready_made'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-surface2/50 text-secondary border-theme-subtle hover:bg-surface2 hover:text-primary'
                    }`}
                  >
                    <Package size={14} />
                    <span>Ready-Made Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSourceChange('custom_job')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-none border text-xs font-bold transition-all ${
                      formData.orderSource === 'custom_job'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-surface2/50 text-secondary border-theme-subtle hover:bg-surface2 hover:text-primary'
                    }`}
                  >
                    <Factory size={14} />
                    <span>Custom Machining / Job</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Sales Order #</label>
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

                {/* 1. FROM QUOTATION PICKER */}
                {formData.orderSource === 'from_quote' && (
                  <div className="sm:col-span-2 space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Select Approved / Sent Quotation (Autocomplete) <span className="text-red-500">*</span>
                      </label>
                      <QuotationAutocomplete
                        value={formData.quoteId}
                        onChange={(qId) => handleQuoteSelect(qId)}
                        quotations={availableQuotations}
                        placeholder="Type quotation # (AHSQ, PROD) or customer name to autocomplete..."
                      />
                    </div>

                    {selectedQuotation && (
                      <div className="p-3 rounded-none bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-none text-xs font-semibold uppercase tracking-wider ${
                              selectedQuotation.isProd 
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30' 
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                            }`}>
                              {selectedQuotation.quoteTypeLabel}
                            </span>
                            <span className="font-mono font-bold text-primary">{selectedQuotation.displayNo}</span>
                            <span className="text-muted">• {selectedQuotation.customerDisplayName}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            Total: {formatCurrency(selectedQuotation.totalAmt)}
                          </span>
                        </div>

                        {formData.items && formData.items.length > 0 && (
                          <div className="mt-1 border-t border-theme-subtle/50 pt-2">
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                              Quoted Items ({formData.items.length})
                            </span>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {formData.items.map((it: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between py-0.5 text-xs">
                                  <span className="truncate max-w-[320px] text-secondary font-medium">
                                    • {it.description || it.productName}
                                  </span>
                                  <span className="font-mono text-muted shrink-0">
                                    {it.qty} {it.uom || 'Nos'} × Rs. {Number(it.unitPrice || 0).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Order Title / Job Summary <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.productName}
                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                        placeholder="Quoted order description"
                        className="w-full input-base text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* 2. READY-MADE PRODUCT PICKER */}
                {formData.orderSource === 'ready_made' && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-secondary mb-1">
                      Search Finished Product (Autocomplete) <span className="text-red-500">*</span>
                    </label>
                    <ProductAutocomplete
                      value={formData.productId}
                      onChange={(pId) => handleProductSelect(pId)}
                      products={finishedProducts}
                      filterType="finished_product"
                      placeholder="Type product name, SKU, or specs to autocomplete..."
                    />

                    {selectedProduct && (
                      <div className="mt-2 p-2.5 rounded-none bg-surface2/50 border border-theme-subtle flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-rex-600" />
                          <span>In Stock: <strong className="font-mono text-primary">{availableStock} {selectedProduct.uom || 'pcs'}</strong></span>
                        </div>
                        {hasShortage ? (
                          <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> Shortage: {requestedQty - availableStock} needed
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Sufficient Stock Available
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CUSTOM MACHINING / JOB ENTRY */}
                {formData.orderSource === 'custom_job' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Custom Machining / Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.productName}
                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                        placeholder="e.g. Stainless Steel Shaft Machining & Keyway (Drawing #DR-401)"
                        className="w-full input-base text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Drawing / Job Code (SKU)</label>
                      <input
                        type="text"
                        value={formData.productSku}
                        onChange={e => setFormData({ ...formData, productSku: e.target.value })}
                        placeholder="e.g. JOB-DR-401"
                        className="w-full input-base font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Unit of Measure (UOM)</label>
                      <select
                        value={formData.uom}
                        onChange={e => setFormData({ ...formData, uom: e.target.value })}
                        className="w-full input-base text-xs font-medium"
                      >
                        <option value="Nos">Nos</option>
                        <option value="Sets">Sets</option>
                        <option value="Lots">Lots</option>
                        <option value="Meters">Meters</option>
                        <option value="Kg">Kg</option>
                        <option value="Pcs">Pcs</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Customer Details */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Search Customer / Company (Autocomplete) <span className="text-red-500">*</span>
                  </label>
                  <CustomerAutocomplete
                    value={formData.customerId || formData.customerName}
                    onChange={(cId, cust) => {
                      if (cust) {
                        handleCustomerSelect(cust.id, cust);
                      } else {
                        setFormData(prev => ({ ...prev, customerId: cId, customerName: cId }));
                      }
                    }}
                    customers={customers}
                    leads={leads}
                    placeholder="Type customer company name, contact, phone to autocomplete..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Attention / Contact Person (Attn)
                  </label>
                  <input
                    type="text"
                    value={formData.attention}
                    onChange={e => setFormData({ ...formData, attention: e.target.value })}
                    placeholder="e.g. Mr. Nimal Perera (Procurement Manager)"
                    className="w-full input-base text-xs font-medium"
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-secondary mb-1">Delivery Address / Destination</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress}
                    onChange={e => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    placeholder="Site delivery address or client warehouse location"
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
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="In Production">In Production</option>
                    <option value="Ready to Dispatch">Ready to Dispatch</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Calculated Total</label>
                  <div className="w-full input-base font-mono font-bold text-base text-rex-600 bg-surface2/30">
                    {formatCurrency(
                      formData.orderSource === 'from_quote' && formData.items && formData.items.length > 1
                        ? formData.items.reduce((acc: number, it: any) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0)
                        : (Number(formData.qty) || 1) * (Number(formData.unitPrice) || 0)
                    )}
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
                  {submitting ? 'Saving...' : editingOrder ? 'Update Sales Order' : 'Create Sales Order'}
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
            <div className="p-3.5 rounded-none bg-surface2/60 border border-theme-subtle text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted">Customer:</span>
                <span className="font-bold text-primary">{dispatchModalOrder.customerName}</span>
              </div>
              {dispatchModalOrder.attention && (
                <div className="flex justify-between">
                  <span className="text-muted">Attention (Attn):</span>
                  <span className="font-semibold text-primary">{dispatchModalOrder.attention}</span>
                </div>
              )}
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
                    Vehicle Number <span className="text-muted text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WP CAD-4567 or Hand Delivery (Optional)"
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

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-none text-xs text-amber-700 dark:text-amber-400">
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

            <div className="max-h-[75vh] overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-900 rounded-none flex justify-center">
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

            <div className="max-h-[75vh] overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-900 rounded-none flex justify-center">
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

      {/* Advance Payment Receipt Creation Modal */}
      <CreatePaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false)
          setSelectedOrderForReceipt(null)
        }}
        order={selectedOrderForReceipt}
        settings={settings}
        onSuccess={(receipt) => {
          loadPaymentReceipts()
          const unboxed = receipt?.receipt || receipt
          setActivePrintReceipt({
            ...unboxed,
            orderNo: selectedOrderForReceipt?.orderNo || unboxed?.orderNo,
            totalQuoted: Number(selectedOrderForReceipt?.totalPrice || unboxed?.totalQuoted || 0)
          })
          setPrintReceiptModalOpen(true)
        }}
      />

      {/* Advance Payment Receipt Print Modal */}
      <PaymentReceiptPrintModal
        isOpen={printReceiptModalOpen}
        onClose={() => {
          setPrintReceiptModalOpen(false)
          setActivePrintReceipt(null)
        }}
        receipt={activePrintReceipt}
        settings={settings}
      />

      {/* Create Advance Proforma Invoice Modal */}
      {proformaModalOrder && (
        <CreateAdvanceProformaModal
          isOpen={true}
          onClose={() => setProformaModalOrder(null)}
          order={proformaModalOrder}
          settings={settings}
          onSuccess={(inv) => {
            setActivePrintProforma(inv);
          }}
        />
      )}

      {/* Proforma Invoice Print / PDF View Modal */}
      {activePrintProforma && (
        <ProformaInvoicePrintModal
          isOpen={true}
          onClose={() => setActivePrintProforma(null)}
          invoice={activePrintProforma}
          settings={settings}
        />
      )}

      {/* Pre-Invoice Advance Payment Recommendation Modal */}
      {preInvoicePromptOrder && (
        <Modal
          isOpen={true}
          onClose={() => setPreInvoicePromptOrder(null)}
          title="Advance Payment Receipt Recommendation"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-none flex items-start gap-3">
              <div className="w-9 h-9 rounded-none bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Receipt size={18} />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  No Advance Payment Receipt Found for {preInvoicePromptOrder.orderNo}
                </div>
                <p className="text-muted leading-relaxed">
                  In Rex ERP and Sri Lanka tax accounting, customer advance payments received prior to final dispatch should be acknowledged via an official <strong>Advance Payment Receipt</strong> before issuing the final tax invoice. The advance will then be automatically credited and deducted on the final invoice.
                </p>
              </div>
            </div>

            <div className="bg-surface2/40 border border-theme-subtle rounded-none p-3 text-xs flex justify-between items-center">
              <div>
                <div className="text-muted text-xs font-medium">Sales Order</div>
                <div className="font-mono font-bold text-primary">{preInvoicePromptOrder.orderNo}</div>
              </div>
              <div>
                <div className="text-muted text-xs font-medium">Customer</div>
                <div className="font-semibold text-primary">{preInvoicePromptOrder.customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-muted text-xs font-medium">Total Consideration</div>
                <div className="font-mono font-bold text-emerald-600">{formatCurrency(preInvoicePromptOrder.totalPrice || 0)}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const target = preInvoicePromptOrder
                  setPreInvoicePromptOrder(null)
                  navigate(`/finance/invoices/new?orderId=${target.id}`)
                }}
                className="text-xs text-muted hover:text-primary w-full sm:w-auto"
              >
                Skip & Proceed to Final Invoice
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileText}
                onClick={() => {
                  const target = preInvoicePromptOrder
                  setPreInvoicePromptOrder(null)
                  setProformaModalOrder(target)
                }}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold w-full sm:w-auto"
              >
                Create Advance Proforma Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Receipt}
                onClick={() => {
                  const target = preInvoicePromptOrder
                  setPreInvoicePromptOrder(null)
                  handleOpenReceiptModal(target)
                }}
                className="text-xs border-theme-subtle text-secondary hover:text-primary w-full sm:w-auto"
              >
                Issue Advance Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
