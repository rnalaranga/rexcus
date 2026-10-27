import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ShoppingCart, ArrowRight, Package, Plus, Search, Filter, CheckCircle, 
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
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner'
import { printElement } from '@/lib/printElement'
import { exportPdf } from '@/lib/exportPdf'
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

  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')
  const [activeViewTab, setActiveViewTab] = useState<'orders' | 'proformas'>(() => {
    return searchParams.get('tab') === 'proformas' ? 'proformas' : 'orders'
  })

  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('id')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
    const tab = searchParams.get('tab')
    if (tab === 'proformas' && activeViewTab !== 'proformas') {
      setActiveViewTab('proformas')
    } else if (!tab && activeViewTab !== 'orders') {
      setActiveViewTab('orders')
    }
  }, [searchParams])
  // Order Actions Dropdown state
  const [openActionOrderId, setOpenActionOrderId] = useState<string | null>(null)
  const [actionCoords, setActionCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number; height: number } | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.order-action-trigger-btn') && !target.closest('.order-action-menu-dropdown')) {
        setOpenActionOrderId(null)
        setActionCoords(null)
      }
    }
    const handleScrollOrResize = () => {
      setOpenActionOrderId(null)
      setActionCoords(null)
    }
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [])
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
    dispatchQty: 1,
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

  const handleOpenPrintProforma = (proforma: any, order?: any) => {
    if (!proforma) return
    const enriched = {
      ...proforma,
      customerName: proforma.customerName || order?.customerName || order?.customer || '',
      customerCompany: proforma.customerCompany || order?.customerCompany || order?.customerName || order?.customer || '',
      customerAddress: proforma.customerAddress || order?.deliveryAddress || order?.customerAddress || '',
      customerPhone: proforma.customerPhone || order?.customerPhone || order?.phone || '',
      customerEmail: proforma.customerEmail || order?.customerEmail || order?.email || '',
      customerVat: proforma.customerVat || order?.customerVat || '',
      orderNo: proforma.orderNo || order?.orderNo || '',
      quotationNo: proforma.quotationNo || order?.quotationNo || '',
      orderId: proforma.orderId || order?.id || ''
    }
    setActivePrintProforma(enriched)
  }

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
    // Direct navigation to final tax invoice without intrusive receipt prompt
    navigate(`/finance/invoices/new?orderId=${order.id}&soNo=${encodeURIComponent(order.orderNo || '')}`)
  }

  // Filter only ready-made finished products from inventory
  const finishedProducts = useMemo(() => {
    return inventory.filter(item => item.type === 'finished_product' || item.type === 'product')
  }, [inventory])

  // Dedicated list of Proforma Invoices generated against Sales Orders
  const proformaInvoicesList = useMemo(() => {
    return (allInvoices || []).filter((inv: any) => 
      Boolean(inv.isProforma || inv.invoiceType === 'proforma' || inv.status === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-'))
    )
  }, [allInvoices])

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
    const totalOrderQty = Math.max(1, Number(order.qty || 1))
    const prevDispatched = Number(order.dispatchedQty || (order.isDispatched ? totalOrderQty : 0))
    const remainingToDispatch = Math.max(0, totalOrderQty - prevDispatched)

    setDispatchModalOrder(order)
    setDispatchForm({
      dispatchQty: remainingToDispatch > 0 ? remainingToDispatch : 1,
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
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || (
        (ord.orderNo && ord.orderNo.toLowerCase().includes(q)) ||
        (ord.id && String(ord.id).toLowerCase().includes(q)) ||
        (ord.quotationNo && ord.quotationNo.toLowerCase().includes(q)) ||
        (ord.gatePassNo && ord.gatePassNo.toLowerCase().includes(q)) ||
        (ord.invoiceNo && ord.invoiceNo.toLowerCase().includes(q)) ||
        (ord.productName && ord.productName.toLowerCase().includes(q)) ||
        (ord.productSku && ord.productSku.toLowerCase().includes(q)) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
        (ord.attention && ord.attention.toLowerCase().includes(q)) ||
        (ord.customerPhone && ord.customerPhone.toLowerCase().includes(q)) ||
        (ord.notes && ord.notes.toLowerCase().includes(q))
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

  const renderOrderActions = (
    order: any, 
    orderItems: any[], 
    existingWO: any, 
    linkedInvoice: any, 
    linkedProforma: any
  ) => {
    const totalOrdQty = Math.max(1, Number(order.qty || 1))
    const dispatchedQty = Number(order.dispatchedQty || (order.isDispatched ? totalOrdQty : 0))
    const remainingToDispatch = Math.max(0, totalOrdQty - dispatchedQty)
    const isOpen = openActionOrderId === order.id

    let menuStyle: React.CSSProperties = {}
    if (isOpen && actionCoords) {
      const PADDING = 8
      const MENU_WIDTH = 260

      let left = actionCoords.right - MENU_WIDTH
      if (left < PADDING) left = PADDING
      if (left + MENU_WIDTH > window.innerWidth - PADDING) {
        left = window.innerWidth - MENU_WIDTH - PADDING
      }

      const spaceBelow = window.innerHeight - actionCoords.bottom - PADDING
      const spaceAbove = actionCoords.top - PADDING
      const openUpwards = spaceBelow < 340 && spaceAbove > spaceBelow

      menuStyle = {
        position: 'fixed',
        left: `${left}px`,
        width: `${MENU_WIDTH}px`,
        zIndex: 99999,
        maxHeight: openUpwards ? `${Math.min(480, spaceAbove)}px` : `${Math.min(480, spaceBelow)}px`,
        ...(openUpwards 
          ? { bottom: `${window.innerHeight - actionCoords.top + 4}px` } 
          : { top: `${actionCoords.bottom + 4}px` }
        )
      }
    }

    return (
      <div className="flex items-center justify-end gap-1.5">
        {/* Quick Contextual Action */}
        {remainingToDispatch > 0 && !order.isDispatched ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenDispatchModal(order)}
            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none"
            title="Quick Dispatch Remaining Goods & Generate Gate Pass"
          >
            <Truck size={12} className="mr-1" /> Dispatch ({remainingToDispatch})
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon={Printer}
            onClick={() => setPrintOrder(order)}
            className="h-7 px-2 text-muted hover:text-primary border border-theme-subtle rounded-none text-xs"
            title="Print Sales Order PDF"
          >
            Print
          </Button>
        )}

        {/* Dropdown Menu Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (openActionOrderId === order.id) {
              setOpenActionOrderId(null)
              setActionCoords(null)
            } else {
              const rect = e.currentTarget.getBoundingClientRect()
              setOpenActionOrderId(order.id)
              setActionCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
              })
            }
          }}
          className={`order-action-trigger-btn h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none cursor-pointer ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
          }`}
        >
          Actions
          <ChevronDown size={11} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Portal Dropdown Menu */}
        {isOpen && actionCoords && typeof document !== 'undefined' && createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={menuStyle}
            className="order-action-menu-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1 text-left rounded-none overflow-y-auto custom-scrollbar"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider font-mono border-b border-theme-subtle mb-1 flex items-center justify-between">
              <span>Order #{order.orderNo || order.id}</span>
              <span className="text-secondary">{order.status || 'Active'}</span>
            </div>

            {/* 1. Advance Proforma Invoice */}
            {linkedProforma ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleOpenPrintProforma(linkedProforma, order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-blue-600 dark:text-blue-400 font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileText size={13} /> View Advance Proforma
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-500/10 border border-blue-500/20">PI</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  setProformaModalOrder(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-blue-500" /> Create Advance Proforma
                </span>
                <span className="text-[10px] text-muted font-mono">+Proforma</span>
              </button>
            )}

            {/* 2. Work Order in Factory */}
            {existingWO ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  navigate(`/production/work-orders/${existingWO.id}`)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-amber-600 dark:text-amber-400 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Factory size={13} /> View Work Order ({existingWO.status || 'Active'})
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-500/10 border border-amber-500/20">WO</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleCreateWorkOrder(order, orderItems)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <Factory size={13} className="text-amber-500" /> Send to Production (Work Order)
                </span>
                <span className="text-[10px] text-muted font-mono">+WO</span>
              </button>
            )}

            {/* 3. Dispatch & Gate Pass */}
            {remainingToDispatch > 0 && !order.isDispatched ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleOpenDispatchModal(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Truck size={13} /> Record Partial Dispatch
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-500/10 border border-emerald-500/20">{remainingToDispatch} left</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleViewGatePass(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <Truck size={13} className="text-emerald-500" /> View Delivery Gate Pass
                </span>
                <span className="text-[10px] text-muted font-mono">DN/GP</span>
              </button>
            )}

            {/* 4. Final Commercial Invoice */}
            {linkedInvoice || order.invoiceNo ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  navigate(`/finance/invoices?search=${encodeURIComponent(linkedInvoice?.invoiceNo || order.invoiceNo)}`)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-purple-500" /> View Commercial Invoice
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-500/10 border border-purple-500/20">Tax Inv</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleInvoiceClick(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-indigo-500" /> Create Final Tax Invoice
                </span>
                <span className="text-[10px] text-muted font-mono">+Invoice</span>
              </button>
            )}

            <div className="my-1 border-t border-theme-subtle" />

            {/* 5. Print Order PDF */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                setPrintOrder(order)
              }}
              className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-secondary hover:text-primary font-medium"
            >
              <Printer size={13} /> Print Sales Order Document
            </button>

            {/* 6. Edit Order */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                handleOpenEditModal(order)
              }}
              className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-secondary hover:text-primary font-medium"
            >
              <Edit size={13} /> Edit Sales Order Details
            </button>

            {/* 7. Delete Order (if draft / unpaid) */}
            {order.status !== 'Dispatched' && !order.isDispatched && (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  setDeleteTarget(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-500/10 transition-colors text-rose-600 font-medium"
              >
                <Trash2 size={13} /> Delete Sales Order
              </button>
            )}
          </div>,
          document.body
        )}
      </div>
    )
  }

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

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={activeViewTab === 'proformas' ? 3 : 2} className="my-1" />

      {/* ── TOP VIEW SWITCHER TABS: ORDERS vs PROFORMAS ────────────────────── */}
      <div className="flex items-center justify-between border-b border-theme-subtle gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveViewTab('orders')
              setSearchParams({})
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeViewTab === 'orders'
                ? 'border-rex-600 text-rex-600 dark:text-rex-400 bg-rex-500/10'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/40'
            }`}
          >
            <ShoppingCart size={14} />
            <span>Sales Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveViewTab('proformas')
              setSearchParams({ tab: 'proformas' })
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeViewTab === 'proformas'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/40'
            }`}
          >
            <FileText size={14} />
            <span>Advance Proforma Invoices ({proformaInvoicesList.length})</span>
          </button>
        </div>
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
        {activeViewTab === 'proformas' ? (
          <div className="overflow-x-auto min-h-[380px] custom-scrollbar">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-surface2/60 border-b border-theme-subtle font-bold text-muted uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3.5 py-3">Proforma # & Date</th>
                  <th className="px-3.5 py-3">Customer</th>
                  <th className="px-3.5 py-3">Linked Sales Order</th>
                  <th className="px-3.5 py-3 text-right">Advance Amount</th>
                  <th className="px-3.5 py-3 text-center">Tax Profile</th>
                  <th className="px-3.5 py-3 text-center">Advance Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {proformaInvoicesList.map((pi: any, idx: number) => {
                  const linkedSO = orders.find(o => o.orderNo === pi.orderNo || o.id === pi.orderId);

                  return (
                    <tr key={pi.id || idx} className="hover:bg-surface2/30 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block text-xs">
                          {pi.invoiceNo || pi.id}
                        </span>
                        <span className="text-[10px] text-muted font-mono">{formatDate(pi.date || pi.createdAt)}</span>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="font-bold text-primary block">{pi.customerName || pi.customerCompany || 'Customer'}</span>
                        {pi.customerPhone && <span className="text-[10px] text-muted font-mono">{pi.customerPhone}</span>}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="font-mono font-bold text-primary">
                          {pi.orderNo || linkedSO?.orderNo || '-'}
                        </span>
                        {pi.quotationNo && (
                          <span className="block text-[10px] text-muted font-mono">Quote: {pi.quotationNo}</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-right font-mono">
                        <span className="font-bold text-primary block text-xs">{formatCurrency(pi.total || 0)}</span>
                        {pi.advancePercent && (
                          <span className="text-[10px] text-muted">({pi.advancePercent}% advance deposit)</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        <span className="text-[10px] px-2 py-0.5 bg-surface2 border border-theme-subtle font-mono">
                          {pi.taxOption === 'opt1' ? 'VAT & SSCL Absorbed' : pi.taxOption === 'opt2' ? 'SSCL Absorbed + VAT Sep' : 'SSCL & VAT Separate'}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        <Badge variant={pi.paymentStatus === 'paid' ? 'success' : 'info'} size="sm">
                          {pi.paymentStatus === 'paid' ? 'Advance Paid' : 'Awaiting Advance'}
                        </Badge>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenPrintProforma(pi, linkedSO)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-none flex items-center gap-1"
                          >
                            <Printer size={12} /> View / Print Proforma
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {proformaInvoicesList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      <FileText size={28} className="mx-auto mb-2 opacity-30 text-blue-500" />
                      <p className="text-sm font-bold text-primary">No Advance Proforma Invoices Issued</p>
                      <p className="text-xs text-muted mt-0.5">
                        Click "+ Proforma" on any active Sales Order to generate a clean Advance Proforma Invoice with tax options.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
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

                    {/* Qty & Incremental Dispatch Progress */}
                    <td className="px-3 py-2.5 text-center">
                      {(() => {
                        const totalQty = Math.max(1, Number(order.qty || 1));
                        const dispatchedQty = Number(order.dispatchedQty || (order.isDispatched ? totalQty : 0));
                        const pct = Math.min(100, Math.round((dispatchedQty / totalQty) * 100));

                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-xs text-primary">
                              {order.qty} pcs
                            </span>
                            <div className="w-20 h-1.5 bg-surface2 border border-theme-subtle overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted">
                              {dispatchedQty} / {totalQty} dispatched
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Value & Advance Proforma */}
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono font-bold text-xs text-primary">
                          {formatCurrency(order.totalPrice)}
                        </span>
                        {linkedProforma && (
                          <button
                            type="button"
                            onClick={() => handleOpenPrintProforma(linkedProforma, order)}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 flex items-center gap-1 transition-colors"
                            title={`Advance Proforma: ${linkedProforma.invoiceNo || linkedProforma.id}`}
                          >
                            <FileText size={10} /> Proforma: {formatCurrency(Number(linkedProforma.total || 0))}
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
                              navigateUrl: `/production/work-orders?search=${encodeURIComponent(existingWO.orderNo || existingWO.id)}`
                            });
                          }
                          if (linkedProforma) {
                            traces.push({
                              type: 'proforma',
                              title: 'Advance Proforma Invoice',
                              reference: linkedProforma.invoiceNo || linkedProforma.id,
                              subtitle: `Advance Deposit: ${formatCurrency(Number(linkedProforma.total || 0))}`,
                              statusBadge: { label: 'Proforma', variant: 'info' },
                              onClick: () => handleOpenPrintProforma(linkedProforma, order)
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
                      {(order.materialStatus || existingWO?.materialStatus) && (
                        <div className="mt-1">
                          <span
                            title={order.materialAlert || existingWO?.materialAlert || 'Material status notice'}
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 border ${
                              (order.materialStatus || existingWO?.materialStatus || '').includes('Shortage') || (order.materialStatus || existingWO?.materialStatus || '').includes('Pending')
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : (order.materialStatus || existingWO?.materialStatus || '').includes('MR')
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            }`}
                          >
                            ⚠️ {order.materialStatus || existingWO?.materialStatus}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Compact Dropdown Actions */}
                    <td className="px-4 py-2.5 text-right">
                      {renderOrderActions(order, orderItems, existingWO, linkedInvoice, linkedProforma)}
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
        )}
      </GlassCard>

      {/* CREATE / EDIT ORDER MODAL */}
      {showOrderModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
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
      , document.body)}

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

            {/* Partial Dispatch Qty Selector */}
            {(() => {
              const totalOrdQty = Math.max(1, Number(dispatchModalOrder.qty || 1));
              const prevDispatchedQty = Number(dispatchModalOrder.dispatchedQty || (dispatchModalOrder.isDispatched ? totalOrdQty : 0));
              const remainingToDispatch = Math.max(0, totalOrdQty - prevDispatchedQty);

              return (
                <div className="p-3 bg-surface border border-theme-subtle space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-secondary uppercase tracking-wider">Dispatch Batch Quantity</span>
                    <span className="font-mono text-muted">
                      Previously Dispatched: <strong className="text-emerald-500">{prevDispatchedQty} / {totalOrdQty} pcs</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-muted mb-1">Quantity to Handover in this Batch:</label>
                      <input
                        type="number"
                        min="1"
                        max={remainingToDispatch > 0 ? remainingToDispatch : totalOrdQty}
                        value={dispatchForm.dispatchQty}
                        onChange={e => setDispatchForm({ ...dispatchForm, dispatchQty: Math.max(1, Number(e.target.value)) })}
                        className="w-full input-base text-sm font-mono font-bold"
                        required
                      />
                    </div>
                    {remainingToDispatch > 0 && (
                      <button
                        type="button"
                        onClick={() => setDispatchForm({ ...dispatchForm, dispatchQty: remainingToDispatch })}
                        className="text-xs font-bold text-rex-600 dark:text-rex-400 hover:underline pt-4"
                      >
                        All Remaining ({remainingToDispatch} pcs)
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-muted font-mono">
                    After this dispatch: {prevDispatchedQty + Number(dispatchForm.dispatchQty || 0)} / {totalOrdQty} pcs dispatched.
                    {prevDispatchedQty + Number(dispatchForm.dispatchQty || 0) >= totalOrdQty ? (
                      <span className="ml-1 text-emerald-500 font-bold">100% Complete (Final Dispatch)!</span>
                    ) : (
                      <span className="ml-1 text-amber-500 font-bold">({Math.max(0, totalOrdQty - (prevDispatchedQty + Number(dispatchForm.dispatchQty || 0)))} pcs will remain)</span>
                    )}
                  </div>
                </div>
              );
            })()}

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
                  onClick={async () => {
                    await exportPdf('sales-order-print-section', `Sales_Order_${printOrder.orderNo}.pdf`);
                  }}
                  className="bg-surface2 border border-theme-subtle text-xs hover:bg-surface"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('sales-order-print-section', `Sales_Order_${printOrder.orderNo}`)}
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
                  onClick={async () => {
                    await exportPdf('gatepass-print-section', `Gate_Pass_${printGatePass.id}.pdf`);
                  }}
                  className="bg-surface2 border border-theme-subtle text-xs hover:bg-surface"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('gatepass-print-section', `Gate_Pass_${printGatePass.id}`)}
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


    </div>
  )
}
