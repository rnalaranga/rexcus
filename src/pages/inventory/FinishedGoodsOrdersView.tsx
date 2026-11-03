import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ShoppingCart, ArrowRight, Package, Plus, Search, Filter, CheckCircle, 
  Clock, Truck, AlertTriangle, Trash2, Edit, User, Phone, 
  Calendar, DollarSign, ArrowUpRight, CheckCircle2, ChevronRight, ChevronDown, X,
  Printer, Eye, FileText, Shield, Download, ExternalLink, Hash, Factory,
  ShoppingBag, Receipt, UploadCloud, Paperclip, Camera, Maximize2, Minimize2
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SearchBar } from '@/components/ui/SearchBar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useFinishedGoodsOrders, useInventory, useCustomers, useLeads, useQuotations, useInvoices } from '@/hooks/useData'
import { useSettings } from '@/contexts/SettingsContext'
import { useTaxProfiles } from '@/hooks/useFinance'
import { useAuth } from '@/contexts/AuthContext'
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
import { WorkOrderPrintModal } from '@/components/production/WorkOrderPrintModal'
import { printElement } from '@/lib/printElement'
import { exportPdf } from '@/lib/exportPdf'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'
import { findMatchingSamplePhotos } from '@/lib/samplePhotos'
import { RecordCustomerPoModal } from '@/components/crm/RecordCustomerPoModal'
import { ViewCustomerPoModal } from '@/components/crm/ViewCustomerPoModal'
import { openDataUriOrUrl, downloadDataUriOrUrl } from '@/lib/utils'
import { 
  createFinishedGoodsOrder, 
  updateFinishedGoodsOrder, 
  dispatchFinishedGoodsOrder, 
  deleteFinishedGoodsOrder,
  createWorkOrder,
  fetchWorkOrders,
  fetchPaymentReceipts,
  deleteInvoice,
  fetchAllCustomerGRNs,
  fetchNextDocumentNumber
} from '@/lib/api'

interface FinishedGoodsOrdersViewProps {
  onRefreshProducts?: () => void
  onOpenProductBOM?: (product: any) => void
}

const isOrderPoPending = (order: any): boolean => {
  if (!order) return false;
  const po = String(order.customerPoNo || '').trim().toUpperCase();
  if (po === 'PO PENDING' || po === 'PENDING') return true;
  const notes = String(order.notes || '');
  if (/(\[PO Pending\])/i.test(notes) && (!order.customerPoNo || po === 'PO PENDING')) return true;
  return false;
};

export const FinishedGoodsOrdersView: React.FC<FinishedGoodsOrdersViewProps> = ({
  onRefreshProducts,
  onOpenProductBOM
}) => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  )
  const canEditOrder = Boolean(
    isAdmin || 
    (can ? can('approvals.sales_order_edit') : false) || 
    (can ? can('sales_orders.edit') : false) ||
    user?.role === 'manager' ||
    user?.role === 'sales_head'
  );
  const { toast, showConfirm } = useDialog()
  const { settings } = useSettings()
  const { data: orders, loading, refetch } = useFinishedGoodsOrders()
  const { data: inventory, refetch: refetchInventory } = useInventory()
  const { data: customers = [] } = useCustomers()
  const { data: leads = [] } = useLeads()
  const { data: rawQuotations = [] } = useQuotations()
  const { data: allInvoices = [], refetch: refetchInvoices } = useInvoices()
  const { data: taxProfiles = [] } = useTaxProfiles()

    // Sales Orders Table Sorting
  const [orderSortField, setOrderSortField] = useState<string>('orderDate');
  const [orderSortDir, setOrderSortDir] = useState<'asc' | 'desc'>('desc');

  const handleToggleOrderSort = (field: string) => {
    if (orderSortField === field) {
      setOrderSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderSortField(field);
      setOrderSortDir('asc');
    }
  };

  const renderOrderSortIndicator = (field: string) => {
    if (orderSortField !== field) {
      return <span className="text-muted/40 font-mono ml-1 text-[10px]">↕</span>;
    }
    return (
      <span className="text-rex-600 dark:text-rex-400 font-bold font-mono ml-1 text-[11px]">
        {orderSortDir === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

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
  const [printWorkOrderTarget, setPrintWorkOrderTarget] = useState<any | null>(null)
  const [createWoModalOrder, setCreateWoModalOrder] = useState<any | null>(null)
  const [createWoModalItems, setCreateWoModalItems] = useState<any[]>([])
  const [createWoPriority, setCreateWoPriority] = useState<string>('Normal')
  const [createWoJobTitle, setCreateWoJobTitle] = useState<string>('')
  const [createWoNotes, setCreateWoNotes] = useState<string>('')
  const [createWoSubmitting, setCreateWoSubmitting] = useState<boolean>(false)
  const [allCustomerGrns, setAllCustomerGrns] = useState<any[]>([])
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)

  useEffect(() => {
    fetchAllCustomerGRNs().then(setAllCustomerGrns).catch(() => {});
  }, [])
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
  const [isOrderModalExpanded, setIsOrderModalExpanded] = useState(false)
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
    notes: '',
    dispatchItems: [] as any[]
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
  const [viewingPoAttachment, setViewingPoAttachment] = useState<{ url: string; orderNo: string; poNo?: string } | null>(null)
  const [recordPoOrder, setRecordPoOrder] = useState<any | null>(null)
  const [viewPoOrder, setViewPoOrder] = useState<any | null>(null)

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

  const handleDeleteProforma = async (proforma: any) => {
    if (!proforma) return;
    const proformaDocNo = proforma.invoiceNo || proforma.id;
    const confirmed = await showConfirm(
      `Are you sure you want to delete Advance Proforma Invoice "${proformaDocNo}"? This action cannot be undone.`,
      'Delete Advance Proforma'
    );
    if (!confirmed) return;

    try {
      await deleteInvoice(proforma.id || proforma.invoiceNo);
      toast(`Proforma invoice ${proformaDocNo} deleted successfully`, 'success');
      if (activePrintProforma && (activePrintProforma.id === proforma.id || activePrintProforma.invoiceNo === proforma.invoiceNo)) {
        setActivePrintProforma(null);
      }
      refetchInvoices();
    } catch (err: any) {
      console.error('Failed to delete proforma invoice:', err);
      toast(err.message || 'Failed to delete proforma invoice', 'error');
    }
  };

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
      const totalAmt = Number(q.totalAmount || q.customAmount || parsed.custTotals?.withSSCL || parsed.custTotals?.total || 0);

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
    description: '',
    productSku: '',
    uom: 'Nos',
    customerId: '',
    customerName: '',
    attention: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    customerPoNo: '',
    customerPoDate: '',
    customerPoAttachment: '',
    customerPoAttachmentName: '',
    orderDate: new Date().toISOString().slice(0, 10),
    targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    qty: '1',
    unitPrice: '',
    subtotal: 0,
    discount: 0,
    taxAmount: 0,
    taxRate: 0,
    taxProfileId: '',
    totalPrice: 0,
    status: 'Pending Approval',
    notes: '',
    items: [] as any[]
  }

  const [formData, setFormData] = useState(initialForm)

  const handleBulletKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    currentValue: string,
    setValue: (val: string) => void
  ) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursor = textarea.selectionStart;
      const textBeforeCursor = currentValue.substring(0, cursor);
      const currentLine = textBeforeCursor.split('\n').pop() || '';
      if (currentLine.trim() === '•' || currentLine.trim() === '-') {
        e.preventDefault();
        const lineStart = cursor - currentLine.length;
        const textAfterCursor = currentValue.substring(cursor);
        const nextVal = currentValue.substring(0, lineStart) + textAfterCursor;
        setValue(nextVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStart;
        }, 0);
        return;
      }
      if (currentLine.trim().startsWith('•') || currentLine.trim().startsWith('-')) {
        e.preventDefault();
        const prefix = currentLine.trim().startsWith('•') ? '\n• ' : '\n- ';
        const textAfterCursor = currentValue.substring(cursor);
        const nextVal = textBeforeCursor + prefix + textAfterCursor;
        setValue(nextVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursor + prefix.length;
        }, 0);
      }
    }
  };

  const addBulletToText = (currentValue: string): string => {
    if (!currentValue || currentValue.trim() === '') return '• ';
    return currentValue.endsWith('\n') ? `${currentValue}• ` : `${currentValue}\n• `;
  };

  const handlePoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast('File size exceeds 15MB limit', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        customerPoAttachment: reader.result as string,
        customerPoAttachmentName: file.name
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleOpenCreateModal = (preselectedProduct?: any) => {
    setEditingOrder(null)
    const initialProduct = preselectedProduct
    const currentYY = String(new Date().getFullYear()).slice(-2);
    const fallbackOrderNo = `SO-${currentYY}-${Date.now().toString().slice(-4)}`;
    
    if (initialProduct) {
      setFormData({
        ...initialForm,
        orderNo: fallbackOrderNo,
        orderSource: 'ready_made',
        productId: initialProduct?.id || '',
        productName: initialProduct?.name || '',
        description: initialProduct?.description || initialProduct?.specs || '',
        productSku: initialProduct?.sku || '',
        unitPrice: initialProduct?.unitPrice ? String(initialProduct.unitPrice) : '0'
      })
    } else {
      setFormData({
        ...initialForm,
        orderNo: fallbackOrderNo,
        orderSource: 'from_quote'
      })
    }
    setShowOrderModal(true)

    fetchNextDocumentNumber('sales_order', { reserve: false }).then(res => {
      if (res?.formattedNumber) {
        setFormData(prev => {
          // If user has already modified or entered a custom SO number, do NOT overwrite it!
          if (prev.orderNo && prev.orderNo !== fallbackOrderNo) {
            return prev;
          }
          return { ...prev, orderNo: res.formattedNumber };
        });
      }
    }).catch(err => {
      console.warn('Failed to fetch next sales order sequence number:', err);
    });
  }

  const handleOpenEditModal = (order: any) => {
    if (!canEditOrder) {
      toast('Admin approval required to edit or modify confirmed Sales Orders. Contact an administrator.', 'error');
      return;
    }
    setEditingOrder(order)
    let parsedItems: any[] = [];
    if (order.items) {
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (e) {}
    }

    let source: 'from_quote' | 'ready_made' | 'custom_job' = 'ready_made';
    if (order.orderSource) {
      source = order.orderSource;
    } else if (order.quoteId || order.quotationNo) {
      source = 'from_quote';
    } else if (
      order.productId === 'CUSTOM-JOB' || 
      order.productId === 'CUSTOM-ORDER' || 
      String(order.productId || '').startsWith('CUSTOM') || 
      !order.productId ||
      (Array.isArray(parsedItems) && parsedItems.length > 0 && !finishedProducts.some(p => p.id === order.productId))
    ) {
      source = 'custom_job';
    }

    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      parsedItems = parsedItems.map((it: any, idx: number) => ({
        ...it,
        productId: it.productId || `CUSTOM-ITEM-${idx + 1}`,
        productName: it.productName || it.description || order.productName || 'Order Item',
        description: it.description || it.productName || '',
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        amount: Number((Number(it.qty || 1) * Number(it.unitPrice || 0)).toFixed(2)),
        uom: it.uom || order.uom || 'Nos'
      }));
    } else if (source === 'custom_job') {
      parsedItems = [{
        productId: order.productId || 'CUSTOM-ITEM-1',
        productName: order.productName || 'Custom Machining Item',
        description: order.description || order.productName || '',
        qty: Number(order.qty) || 1,
        unitPrice: Number(order.unitPrice) || 0,
        amount: Number((Number(order.qty || 1) * Number(order.unitPrice || 0)).toFixed(2)),
        uom: order.uom || 'Nos'
      }];
    }

    const calculatedItemSum = parsedItems.reduce((acc: number, it: any) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0);
    const ordSubtotal = (source === 'custom_job' || source === 'from_quote') && calculatedItemSum > 0
      ? calculatedItemSum
      : (Number(order.subtotal) || (Number(order.totalPrice || 0) - Number(order.taxAmount || 0)) || calculatedItemSum);

    const ordTaxAmount = Number(order.taxAmount) || 0;
    const ordTotalPrice = Number(order.totalPrice) || Number((ordSubtotal + ordTaxAmount).toFixed(2));
    const ordTaxRate = Number(order.taxRate) || 0;
    const ordTaxProfileId = order.taxProfileId || '';

    setFormData({
      orderNo: order.orderNo || '',
      orderSource: source,
      quoteId: order.quoteId || '',
      quotationNo: order.quotationNo || '',
      productId: order.productId || (source === 'custom_job' ? 'CUSTOM-JOB' : ''),
      productName: order.productName || '',
      description: order.description || (parsedItems[0]?.description) || order.productName || '',
      productSku: order.productSku || '',
      uom: order.uom || 'Nos',
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      attention: order.attention || '',
      customerPhone: order.customerPhone || '',
      customerEmail: order.customerEmail || '',
      deliveryAddress: order.deliveryAddress || '',
      customerPoNo: order.customerPoNo || '',
      customerPoDate: order.customerPoDate ? String(order.customerPoDate).slice(0, 10) : '',
      customerPoAttachment: order.customerPoAttachment || '',
      customerPoAttachmentName: order.customerPoAttachment ? (order.customerPoNo ? `Customer_PO_${order.customerPoNo}` : 'Customer_PO_Document') : '',
      orderDate: order.orderDate ? String(order.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      targetDeliveryDate: order.targetDeliveryDate ? String(order.targetDeliveryDate).slice(0, 10) : '',
      qty: String(order.qty || (parsedItems.reduce((sum, it) => sum + (Number(it.qty) || 1), 0)) || '1'),
      unitPrice: String(order.unitPrice || (parsedItems[0]?.unitPrice ?? '0')),
      subtotal: ordSubtotal,
      discount: 0,
      taxAmount: ordTaxAmount,
      taxRate: ordTaxRate,
      taxProfileId: ordTaxProfileId,
      totalPrice: ordTotalPrice,
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
        const unitP = firstProd?.unitPrice ? Number(firstProd.unitPrice) : (Number(prev.unitPrice) || 0);
        const q = Number(prev.qty) || 1;
        const sub = q * unitP;
        const { taxAmount, totalPrice } = calculateOrderTaxes(sub, prev.taxProfileId, prev.taxRate);
        return {
          ...prev,
          orderSource: src,
          quoteId: '',
          quotationNo: '',
          productId: firstProd?.id || '',
          productName: firstProd?.name || '',
          productSku: firstProd?.sku || '',
          unitPrice: String(unitP),
          items: [],
          subtotal: sub,
          taxAmount,
          totalPrice
        };
      } else {
        const defaultItems = prev.items && prev.items.length > 0 ? prev.items : [{
          productId: 'CUSTOM-ITEM-1',
          productName: 'Custom Machining Item',
          description: prev.description || '',
          qty: 1,
          unitPrice: Number(prev.unitPrice) || 0,
          amount: Number(prev.unitPrice) || 0,
          uom: prev.uom || 'Nos'
        }];
        const subtotal = Number(defaultItems.reduce((acc, x) => acc + (Number(x.amount) || ((Number(x.qty) || 0) * (Number(x.unitPrice) || 0))), 0).toFixed(2));
        const { taxAmount, totalPrice } = calculateOrderTaxes(subtotal, prev.taxProfileId, prev.taxRate);
        return {
          ...prev,
          orderSource: src,
          quoteId: '',
          quotationNo: '',
          productId: 'CUSTOM-JOB',
          productName: prev.productName || '',
          productSku: prev.productSku || '',
          unitPrice: String(defaultItems[0]?.unitPrice || 0),
          uom: prev.uom || 'Nos',
          items: defaultItems,
          subtotal,
          taxAmount,
          totalPrice
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

    const itemsSum = extractedItems.reduce((acc, it) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * Number(it.unitPrice || 0))), 0);
    const quoteSubtotal = Number(parsed.custTotals?.subtotal) || itemsSum;
    const quoteDiscount = Number(parsed.custTotals?.discount || parsed.custDiscountAmount || parsed.discountAmount || 0);
    const netBase = Number(parsed.custTotals?.total) || (quoteSubtotal - quoteDiscount);

    let vatAmount = Number(parsed.custVat || 0);
    let ssclAmount = Number(parsed.custSscl || 0);
    let totalTax = vatAmount + ssclAmount;
    let grandTotal = Number(quote.totalAmount || quote.totalAmt || parsed.custTotals?.withSSCL || 0);

    if (totalTax === 0 && grandTotal > netBase) {
      totalTax = Math.max(0, grandTotal - netBase);
    }
    if (grandTotal === 0) {
      grandTotal = netBase + totalTax;
    }

    const taxProfileId = parsed.selectedProfileId || parsed.taxProfileId || (totalTax > 0 ? 'tp_opt2_sscl_absorbed_vat_sep' : '');
    const taxRate = Number(parsed.selectedProfile?.tax2_rate || (netBase > 0 && totalTax > 0 ? Number(((totalTax / netBase) * 100).toFixed(2)) : 0));

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
      items: extractedItems,
      subtotal: quoteSubtotal,
      discount: quoteDiscount,
      taxAmount: totalTax,
      taxRate,
      taxProfileId,
      totalPrice: grandTotal
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

  const calculateCurrentSubtotal = (f: typeof formData) => {
    if ((f.orderSource === 'from_quote' || f.orderSource === 'custom_job') && f.items && f.items.length > 0) {
      return f.items.reduce((acc: number, it: any) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0);
    }
    return (Number(f.qty) || 1) * (Number(f.unitPrice) || 0);
  };

  const calculateOrderTaxes = useCallback((
    subtotal: number,
    profileId?: string,
    customRate?: number
  ) => {
    const sub = Math.max(0, Number(subtotal) || 0);
    const pId = profileId !== undefined ? profileId : formData.taxProfileId;
    if (!pId || pId === 'none' || pId === 'no_tax') {
      return {
        taxAmount: 0,
        taxRate: 0,
        totalPrice: sub
      };
    }
    if (pId === 'custom') {
      const rate = Math.max(0, Number(customRate !== undefined ? customRate : formData.taxRate) || 0);
      const taxAmount = Number(((sub * rate) / 100).toFixed(2));
      return {
        taxAmount,
        taxRate: rate,
        totalPrice: Number((sub + taxAmount).toFixed(2))
      };
    }

    const profile = taxProfiles?.find((p: any) => p.id === pId);
    if (!profile) {
      if (formData.taxRate > 0) {
        const taxAmount = Number(((sub * formData.taxRate) / 100).toFixed(2));
        return {
          taxAmount,
          taxRate: formData.taxRate,
          totalPrice: Number((sub + taxAmount).toFixed(2))
        };
      }
      return {
        taxAmount: 0,
        taxRate: 0,
        totalPrice: sub
      };
    }

    const t1 = Number(profile.tax1_rate || 0) / 100;
    const t2 = Number(profile.tax2_rate || 0) / 100;
    const sscl = sub * t1;
    const vat = profile.tax2_compound ? (sub + sscl) * t2 : sub * t2;
    const taxAmount = Number((sscl + vat).toFixed(2));
    const effectiveRate = sub > 0 ? Number(((taxAmount / sub) * 100).toFixed(2)) : (Number(profile.tax2_rate) || 0);
    return {
      taxAmount,
      taxRate: effectiveRate,
      totalPrice: Number((sub + taxAmount).toFixed(2))
    };
  }, [taxProfiles, formData.taxProfileId, formData.taxRate]);

  const handleTaxProfileChange = (profileId: string) => {
    setFormData(prev => {
      const currentSub = calculateCurrentSubtotal(prev);
      const { taxAmount, taxRate, totalPrice } = calculateOrderTaxes(currentSub, profileId);
      return {
        ...prev,
        taxProfileId: profileId,
        taxAmount,
        taxRate,
        subtotal: currentSub,
        totalPrice
      };
    });
  };

  const handleCustomTaxRateChange = (rateVal: string) => {
    setFormData(prev => {
      const currentSub = calculateCurrentSubtotal(prev);
      const rate = Math.max(0, Number(rateVal) || 0);
      const taxAmount = Number(((currentSub * rate) / 100).toFixed(2));
      return {
        ...prev,
        taxProfileId: 'custom',
        taxRate: rate,
        taxAmount,
        subtotal: currentSub,
        totalPrice: Number((currentSub + taxAmount).toFixed(2))
      };
    });
  };

  const handleCustomTaxAmountChange = (amtVal: string) => {
    setFormData(prev => {
      const currentSub = calculateCurrentSubtotal(prev);
      const taxAmount = Math.max(0, Number(amtVal) || 0);
      const rate = currentSub > 0 ? Number(((taxAmount / currentSub) * 100).toFixed(2)) : 0;
      return {
        ...prev,
        taxProfileId: 'custom',
        taxRate: rate,
        taxAmount,
        subtotal: currentSub,
        totalPrice: Number((currentSub + taxAmount).toFixed(2))
      };
    });
  };

  const handleItemChangeInOrder = (idx: number, field: string, value: any) => {
    setFormData(prev => {
      const currentItems = (prev.items && prev.items.length > 0) ? [...prev.items] : [{
        productId: 'CUSTOM-ITEM-1',
        productName: 'Custom Machining Item',
        description: '',
        qty: 1,
        unitPrice: 0,
        amount: 0,
        uom: 'Nos'
      }];
      const existing = currentItems[idx] || {
        productId: `CUSTOM-ITEM-${idx + 1}`,
        productName: 'Custom Machining Item',
        description: '',
        qty: 1,
        unitPrice: 0,
        amount: 0,
        uom: 'Nos'
      };
      const it = { ...existing, [field]: value };
      const q = Math.max(0, Number(field === 'qty' ? value : it.qty) || 0);
      const up = Math.max(0, Number(field === 'unitPrice' ? value : it.unitPrice) || 0);
      it.amount = Number((q * up).toFixed(2));

      // Auto-extract a neat single-line product name if user is writing description
      if (field === 'description' && value && (!it.productName || it.productName === 'Custom Machining Item' || it.productName === 'Additional Item')) {
        const firstLine = String(value).split('\n')[0].replace(/^[•\-\*\s]+/, '').trim();
        if (firstLine) it.productName = firstLine.slice(0, 100);
      }

      currentItems[idx] = it;

      const subtotal = Number(currentItems.reduce((acc, x) => acc + (Number(x.amount) || ((Number(x.qty) || 0) * (Number(x.unitPrice) || 0))), 0).toFixed(2));
      const { taxAmount, totalPrice } = calculateOrderTaxes(subtotal, prev.taxProfileId, prev.taxRate);

      const totalQty = currentItems.reduce((acc, x) => acc + (Number(x.qty) || 0), 0);
      const resolvedTitle = (!prev.productName || prev.productName === 'Custom Machining Item') && currentItems[0]?.productName
        ? currentItems[0].productName
        : prev.productName;

      return {
        ...prev,
        productName: resolvedTitle,
        items: currentItems,
        subtotal,
        taxAmount,
        totalPrice,
        qty: String(totalQty || 1),
        unitPrice: currentItems.length === 1 ? String(currentItems[0].unitPrice || 0) : prev.unitPrice
      };
    });
  };

  const handleAddItemToOrder = () => {
    setFormData(prev => {
      const currentItems = (prev.items && prev.items.length > 0) ? [...prev.items] : [{
        productId: 'CUSTOM-ITEM-1',
        productName: 'Custom Machining Item',
        description: '',
        qty: 1,
        unitPrice: 0,
        amount: 0,
        uom: 'Nos'
      }];
      const newItems = [...currentItems, {
        productId: `CUSTOM-ITEM-${currentItems.length + 1}`,
        productName: 'Additional Item',
        description: '',
        qty: 1,
        unitPrice: 0,
        amount: 0,
        uom: 'Nos'
      }];
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItemFromOrder = (idx: number) => {
    setFormData(prev => {
      if ((prev.items || []).length <= 1) return prev;
      const newItems = prev.items.filter((_: any, i: number) => i !== idx);
      const subtotal = Number(newItems.reduce((acc: number, x: any) => acc + (Number(x.amount) || ((Number(x.qty) || 0) * (Number(x.unitPrice) || 0))), 0).toFixed(2));
      const { taxAmount, totalPrice } = calculateOrderTaxes(subtotal, prev.taxProfileId, prev.taxRate);
      const totalQty = newItems.reduce((acc: number, x: any) => acc + (Number(x.qty) || 0), 0);
      return {
        ...prev,
        items: newItems,
        subtotal,
        taxAmount,
        totalPrice,
        qty: String(totalQty || 1),
        unitPrice: newItems.length === 1 ? String(newItems[0].unitPrice || 0) : prev.unitPrice
      };
    });
  };

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
    if (editingOrder && !canEditOrder) {
      toast('Permission denied: Sales order changes require Admin approval.', 'error')
      return
    }
    const resolvedProductName = formData.productName || (formData.items && formData.items.length > 0 ? (formData.items[0].description?.split('\n')[0] || formData.items[0].productName) : '');
    if (!resolvedProductName || !formData.customerName) {
      toast('Please enter customer and order details', 'error');
      return;
    }
    setSubmitting(true)

    // Build items list
    let itemsList: any[] = [];
    if ((formData.orderSource === 'from_quote' || formData.orderSource === 'custom_job') && formData.items && formData.items.length > 0) {
      itemsList = formData.items.map((it: any, idx: number) => {
        const q = Math.max(0, Number(it.qty) || 1);
        const up = Math.max(0, Number(it.unitPrice) || 0);
        return {
          ...it,
          productId: it.productId || `CUSTOM-ITEM-${idx + 1}`,
          productName: it.productName || it.description || resolvedProductName || 'Order Item',
          description: it.description || it.productName || resolvedProductName,
          qty: q,
          unitPrice: up,
          amount: Number((q * up).toFixed(2)),
          uom: it.uom || 'Nos'
        };
      });
    } else if (formData.orderSource === 'ready_made') {
      const q = Math.max(1, Number(formData.qty) || 1);
      const up = Math.max(0, Number(formData.unitPrice) || 0);
      itemsList = [{
        productId: formData.productId,
        productName: formData.productName || resolvedProductName,
        productSku: formData.productSku,
        description: formData.productName || resolvedProductName,
        qty: q,
        unitPrice: up,
        amount: Number((q * up).toFixed(2)),
        uom: selectedProduct?.uom || 'Nos'
      }];
    } else {
      const q = Math.max(1, Number(formData.qty) || 1);
      const up = Math.max(0, Number(formData.unitPrice) || 0);
      itemsList = [{
        productId: 'CUSTOM-JOB',
        productName: formData.productName || resolvedProductName,
        productSku: formData.productSku,
        description: formData.description || formData.productName || resolvedProductName,
        qty: q,
        unitPrice: up,
        amount: Number((q * up).toFixed(2)),
        uom: formData.uom || 'Nos'
      }];
    }

    const itemSum = Number(itemsList.reduce((acc, it) => acc + (Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unitPrice) || 0))), 0).toFixed(2));

    const finalSubtotal = (formData.orderSource === 'custom_job' || formData.orderSource === 'from_quote')
      ? (itemSum > 0 ? itemSum : (Number(formData.subtotal) || 0))
      : (Number(formData.subtotal) || itemSum);

    const { taxAmount: recomputedTax } = calculateOrderTaxes(finalSubtotal, formData.taxProfileId, formData.taxRate);

    const finalTaxAmount = Number(formData.taxAmount) !== undefined && Number(formData.taxAmount) !== null && !isNaN(Number(formData.taxAmount))
      ? Number(formData.taxAmount)
      : recomputedTax;

    const finalTotalPrice = Number((finalSubtotal + finalTaxAmount).toFixed(2));

    const stockStatus = formData.orderSource === 'ready_made'
      ? (hasShortage ? `Shortage (${requestedQty - availableStock} req)` : 'In Stock')
      : (formData.orderSource === 'from_quote' ? 'Quoted Spec' : 'Custom Production');

    const rawOrderNo = (formData.orderNo || '').trim();
    const cleanOrderNo = /^SO-20\d{2}-/i.test(rawOrderNo)
      ? rawOrderNo.replace(/^SO-20(\d{2})-/i, 'SO-$1-')
      : rawOrderNo;

    const totalQty = (formData.orderSource === 'from_quote' || formData.orderSource === 'custom_job') && itemsList.length > 0
      ? itemsList.reduce((sum, it) => sum + (Number(it.qty) || 1), 0)
      : (Number(formData.qty) || 1);

    const primaryUnitPrice = itemsList.length === 1
      ? Number(itemsList[0].unitPrice)
      : (totalQty > 0 ? Number((finalSubtotal / totalQty).toFixed(2)) : (Number(formData.unitPrice) || 0));

    const orderStatus = editingOrder
      ? formData.status
      : (formData.orderSource === 'custom_job' || (!formData.quoteId && !formData.quotationNo) ? 'Pending Approval' : (formData.status || 'Pending Approval'));

    const payload = {
      ...formData,
      status: orderStatus,
      productName: resolvedProductName,
      orderNo: cleanOrderNo || formData.orderNo,
      orderSource: formData.orderSource,
      items: itemsList,
      qty: totalQty,
      unitPrice: primaryUnitPrice,
      subtotal: finalSubtotal,
      taxAmount: finalTaxAmount,
      taxRate: Number(formData.taxRate) || 0,
      taxProfileId: formData.taxProfileId || null,
      totalPrice: finalTotalPrice,
      stockStatus,
      attention: formData.attention || null,
      quoteId: formData.quoteId || null,
      quotationNo: formData.quotationNo || null,
      deliveryAddress: formData.deliveryAddress || null,
      customerPoNo: formData.customerPoNo?.trim() || null,
      customerPoDate: formData.customerPoDate || null,
      customerPoAttachment: formData.customerPoAttachment || null,
      updatedBy: user?.name || user?.username || 'Sales Executive'
    };

    try {
      if (editingOrder) {
        await updateFinishedGoodsOrder(editingOrder.id, payload)
      } else {
        await createFinishedGoodsOrder(payload)
        fetchNextDocumentNumber('sales_order', { reserve: true }).catch(console.error);
      }
      refetch()
      setShowOrderModal(false)
      toast(editingOrder ? 'Sales order updated successfully!' : (orderStatus === 'Pending Approval' ? 'Sales order submitted! Status set to Pending Approval.' : 'Sales order created successfully!'), 'success')
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

    let parsedItems: any[] = []
    if (order.items) {
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      } catch (e) {
        parsedItems = []
      }
    }

    const initialDispatchItems = Array.isArray(parsedItems) && parsedItems.length > 0
      ? parsedItems.map((it: any) => {
          const itTotalQty = Math.max(1, Number(it.qty || 1))
          return {
            ...it,
            totalQty: itTotalQty,
            dispatchQty: itTotalQty
          }
        })
      : []

    setDispatchModalOrder(order)
    setDispatchForm({
      dispatchQty: remainingToDispatch > 0 ? remainingToDispatch : 1,
      carrier: order.carrier || 'REX Transport',
      vehicleNo: order.vehicleNo || '',
      driverName: order.driverName || '',
      destination: order.deliveryAddress || '',
      reason: `Finished Goods Delivery for Order ${order.orderNo}`,
      notes: order.notes || '',
      dispatchItems: initialDispatchItems
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

  const resolveOrderLineItems = (order: any, rawOrderItems: any[]) => {
    if (Array.isArray(rawOrderItems) && rawOrderItems.length > 0) {
      return rawOrderItems.map((it: any) => ({
        description: it.description || it.productName || it.name || order.productName || 'Order Item',
        qty: Number(it.qty) || 1,
        uom: it.uom || 'Nos'
      }));
    }
    const quoteRef = order.quoteId || order.quotationNo;
    const linkedQ = (rawQuotations || []).find((q: any) =>
      (quoteRef && (String(q.id) === String(quoteRef) || String(q.quotationNo) === String(quoteRef))) ||
      (order.orderNo && q.orderNo && String(q.orderNo) === String(order.orderNo))
    );
    if (linkedQ) {
      let parsed: any = {};
      try { parsed = typeof linkedQ.data === 'string' ? JSON.parse(linkedQ.data) : (linkedQ.data || {}) } catch {}
      if (Array.isArray(parsed.custItems) && parsed.custItems.length > 0) {
        return parsed.custItems.map((ci: any) => ({
          description: ci.desc || ci.description || ci.name || 'Quoted Item',
          qty: Number(ci.qty) || 1,
          uom: 'Nos'
        }));
      }
    }
    return [{
      description: order.productName || 'Precision Machined Component as per given instruction',
      qty: Math.max(1, Number(order.qty) || 1),
      uom: 'Nos'
    }];
  };

  const openCreateWorkOrderPrompt = (order: any, rawItems: any[]) => {
    try {
      if (order.status === 'Pending Advance Approval' || order.status === 'Pending Approval') {
        toast(`Sales Order #${order.orderNo} is currently "Pending Approval". Production Work Order cannot be issued until Finance / Management approves the order.`, 'warning');
        return;
      }

      // Check if customer registration requires advance payment
      const cust = customers.find((c: any) => c.id === order.customerId || (c.company && order.customerName && c.company.toLowerCase() === order.customerName.toLowerCase()) || (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())) ||
                   leads.find((l: any) => l.id === order.customerId || (l.company && order.customerName && l.company.toLowerCase() === order.customerName.toLowerCase()) || (l.name && order.customerName && l.name.toLowerCase() === order.customerName.toLowerCase()));

      const customerRequiresAdvance = Boolean(cust && (cust.requiresAdvance === true || cust.requiresAdvance === 1));

      if (customerRequiresAdvance) {
        const hasApprovedWaiver = order.status === 'Confirmed' && order.notes && order.notes.includes('Advance Waiver Approved');

        const hasAdvancePaid = (allInvoices || []).some((inv: any) => 
          (inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-')) &&
          (Number(inv.paidAmount || 0) > 0 || inv.status === 'paid' || inv.status === 'partially_paid') &&
          (
            (inv.orderId && String(inv.orderId) === String(order.id)) ||
            (inv.orderNo && String(inv.orderNo) === String(order.orderNo)) ||
            (order.quoteId && inv.quotationId && String(inv.quotationId) === String(order.quoteId)) ||
            (order.quotationNo && inv.quotationNo && String(inv.quotationNo) === String(order.quotationNo)) ||
            (inv.customerId && String(inv.customerId) === String(order.customerId))
          )
        );

        if (!hasAdvancePaid && !hasApprovedWaiver) {
          toast(`Customer "${order.customerName}" requires advance payment. An advance payment record must be entered in Finance (Receivables) before issuing a Work Order, or obtain Finance Approval.`, 'warning');
          return;
        }
      }

      const resolvedItems = resolveOrderLineItems(order, rawItems);
      setCreateWoModalOrder(order);
      setCreateWoModalItems(resolvedItems);
      setCreateWoJobTitle(`WO: ${order.orderNo} - ${order.customerName}`);
      setCreateWoPriority('Normal');
      setCreateWoNotes(order.notes || '');
    } catch (err: any) {
      toast(err?.message || 'Error preparing Work Order', 'error');
    }
  };

  const submitCreateWorkOrder = async () => {
    if (!createWoModalOrder) return;
    setCreateWoSubmitting(true);
    try {
      const order = createWoModalOrder;
      const jobQty = Math.max(1, Number(order.qty) || (createWoModalItems.reduce((acc, it) => acc + (Number(it.qty) || 1), 0)) || 1);

      const woData = {
        title: createWoJobTitle || `WO: ${order.orderNo} - ${order.customerName}`,
        customerId: order.customerId || null,
        customer: order.customerName,
        orderNo: order.orderNo,
        sourceQuoteId: order.quoteId || null,
        priority: createWoPriority || 'Normal',
        jobQty,
        notes: createWoNotes || null,
        operations: [
          {
            operationName: 'Precision Fabrication & Machining',
            plannedHours: 2,
            hourlyLaborRate: 750,
            hourlyMachineRate: 1200
          }
        ],
        bom: (createWoModalItems && createWoModalItems.length > 0) ? createWoModalItems.map((it: any) => ({
          material: it.description || it.productName || order.productName,
          qty: Number(it.qty) || 1,
          unit: it.uom || 'Nos',
          unitCost: 0,
          notes: it.description || `Line item for ${order.orderNo}`
        })) : [
          {
            material: order.productName || 'Order Material',
            qty: jobQty,
            unit: 'Nos',
            unitCost: 0,
            notes: `For Sales Order ${order.orderNo}`
          }
        ]
      };

      const res = await createWorkOrder(woData);
      if (res && (res.error || !res.success)) {
        if (res.error === 'DUPLICATE') {
          toast(`A Work Order already exists (${res.existingId || ''}) for ${order.orderNo}!`, 'warning');
        } else {
          toast(res.error || res.message || 'Failed to create Work Order', 'error');
        }
        return;
      }

      try {
        await updateFinishedGoodsOrder(order.id, { status: 'In Production' });
      } catch (e) {}

      toast(`Work Order successfully created for Sales Order ${order.orderNo}!`, 'success');
      setCreateWoModalOrder(null);
      await loadWorkOrders();
      refetch();
    } catch (err: any) {
      toast(err?.message || 'Failed to create Work Order', 'error');
    } finally {
      setCreateWoSubmitting(false);
    }
  };

  const handleCreateWorkOrder = async (order: any, orderItems: any[]) => {
    try {
      if (order.status === 'Pending Advance Approval' || order.status === 'Pending Approval') {
        toast(`Sales Order #${order.orderNo} is currently "Pending Approval". Production Work Order cannot be issued until Finance / Management approves the order.`, 'warning');
        return;
      }

      // Check if customer registration requires advance payment
      const cust = customers.find((c: any) => c.id === order.customerId || (c.company && order.customerName && c.company.toLowerCase() === order.customerName.toLowerCase()) || (c.name && order.customerName && c.name.toLowerCase() === order.customerName.toLowerCase())) ||
                   leads.find((l: any) => l.id === order.customerId || (l.company && order.customerName && l.company.toLowerCase() === order.customerName.toLowerCase()) || (l.name && order.customerName && l.name.toLowerCase() === order.customerName.toLowerCase()));

      const customerRequiresAdvance = Boolean(cust && (cust.requiresAdvance === true || cust.requiresAdvance === 1));

      if (customerRequiresAdvance) {
        const hasApprovedWaiver = order.status === 'Confirmed' && order.notes && order.notes.includes('Advance Waiver Approved');

        const hasAdvancePaid = (allInvoices || []).some((inv: any) => 
          (inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-')) &&
          (Number(inv.paidAmount || 0) > 0 || inv.status === 'paid' || inv.status === 'partially_paid') &&
          (
            (inv.orderId && String(inv.orderId) === String(order.id)) ||
            (inv.orderNo && String(inv.orderNo) === String(order.orderNo)) ||
            (order.quoteId && inv.quotationId && String(inv.quotationId) === String(order.quoteId)) ||
            (order.quotationNo && inv.quotationNo && String(inv.quotationNo) === String(order.quotationNo)) ||
            (inv.customerId && String(inv.customerId) === String(order.customerId))
          )
        );

        if (!hasAdvancePaid && !hasApprovedWaiver) {
          toast(`Customer "${order.customerName}" requires advance payment. An advance payment record must be entered in Finance (Receivables) before issuing a Work Order, or obtain Finance Approval.`, 'warning');
          return;
        }
      }

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
      if (res && (res.error || !res.success)) {
        if (res.error === 'DUPLICATE') {
          toast(`A Work Order already exists (${res.existingId || ''}) for ${order.orderNo}!`, 'warning')
        } else {
          toast(res.error || res.message || 'Failed to create Work Order', 'error')
        }
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
      await deleteFinishedGoodsOrder(deleteTarget.id || deleteTarget.orderNo)
      refetch()
      toast(`Sales Order ${deleteTarget.orderNo || deleteTarget.id} deleted successfully!`, 'success')
      setDeleteTarget(null)
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Failed to delete sales order', 'error')
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

  
  // Sorted Orders for Excel-like Column Sorting
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a: any, b: any) => {
      let aVal = a[orderSortField];
      let bVal = b[orderSortField];

      if (orderSortField === 'orderNo') {
        aVal = a.orderNo || a.id || '';
        bVal = b.orderNo || b.id || '';
      } else if (orderSortField === 'customer') {
        aVal = a.customerName || '';
        bVal = b.customerName || '';
      } else if (orderSortField === 'product') {
        aVal = a.productName || '';
        bVal = b.productName || '';
      } else if (orderSortField === 'qty') {
        const qA = Number(a.qty || 0);
        const qB = Number(b.qty || 0);
        return orderSortDir === 'asc' ? qA - qB : qB - qA;
      } else if (orderSortField === 'value') {
        const vA = Number(a.totalPrice || 0);
        const vB = Number(b.totalPrice || 0);
        return orderSortDir === 'asc' ? vA - vB : vB - vA;
      } else if (orderSortField === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else if (orderSortField === 'orderDate') {
        const tA = new Date(a.orderDate || a.createdAt || 0).getTime();
        const tB = new Date(b.orderDate || b.createdAt || 0).getTime();
        return orderSortDir === 'asc' ? tA - tB : tB - tA;
      }

      return orderSortDir === 'asc'
        ? String(aVal || '').localeCompare(String(bVal || ''), undefined, { numeric: true })
        : String(bVal || '').localeCompare(String(aVal || ''), undefined, { numeric: true });
    });
  }, [filteredOrders, orderSortField, orderSortDir]);

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
              <div className="flex items-center justify-between hover:bg-surface2 transition-colors border-b border-theme-subtle/30">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionOrderId(null)
                    handleOpenPrintProforma(linkedProforma, order)
                  }}
                  className="flex-1 px-3 py-2 text-xs flex items-center justify-between text-blue-600 dark:text-blue-400 font-medium text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={13} /> View Advance Proforma
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-500/10 border border-blue-500/20">PI</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenActionOrderId(null)
                      handleDeleteProforma(linkedProforma)
                    }}
                    className="p-2 text-muted hover:text-rose-600 transition-colors"
                    title="Delete Advance Proforma"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
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
              <>
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
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionOrderId(null)
                    setPrintWorkOrderTarget(existingWO)
                  }}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-blue-600 dark:text-blue-400 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Printer size={13} /> Print Work Order (Traveler)
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-500/10 border border-blue-500/20">Print</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  openCreateWorkOrderPrompt(order, orderItems)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <Factory size={13} className="text-amber-500" /> Send to Production (Work Order)
                </span>
                <span className="text-[10px] text-muted font-mono">+WO</span>
              </button>
            )}

            {/* 3. Dispatch & Gate Pass (Direct Dispatch without Work Order) */}
            {remainingToDispatch > 0 && !order.isDispatched ? (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleOpenDispatchModal(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-emerald-600 dark:text-emerald-400 font-bold"
                title="Directly dispatch finished goods and generate security Gate Pass without requiring a Work Order"
              >
                <span className="flex items-center gap-2">
                  <Truck size={13} className="text-emerald-500" /> Dispatch Goods (Issue Gate Pass)
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-500/15 border border-emerald-500/30 font-semibold">{remainingToDispatch} to send</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  handleViewGatePass(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Truck size={13} className="text-emerald-500" /> View / Print Gate Pass (Dispatched)
                </span>
                <span className="text-[10px] text-muted font-mono">Gate Pass</span>
              </button>
            )}

            {/* 4. Commercial Invoices & Dispatch-wise Billing */}
            {(() => {
              let orderDispatches: any[] = [];
              try {
                orderDispatches = typeof order.dispatches === 'string' ? JSON.parse(order.dispatches || '[]') : (order.dispatches || []);
              } catch (e) {
                orderDispatches = [];
              }

              // All linked commercial invoices (for full order or individual partial dispatches)
              const matchedInvs = allInvoices.filter((inv: any) =>
                (!inv.isProforma && inv.invoiceType !== 'proforma' && !inv.invoiceNo?.startsWith('PI-') && !inv.id?.startsWith('PI-')) &&
                (
                  (order.invoiceId && (String(inv.id) === String(order.invoiceId) || String(inv.invoiceNo) === String(order.invoiceId))) ||
                  (order.invoiceNo && (String(inv.invoiceNo) === String(order.invoiceNo) || String(inv.id) === String(order.invoiceNo))) ||
                  (inv.orderNo && order.orderNo && String(inv.orderNo) === String(order.orderNo))
                )
              );

              return (
                <div className="space-y-0.5">
                  {matchedInvs.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionOrderId(null);
                        navigate(`/finance/invoices?search=${encodeURIComponent(matchedInvs[0]?.invoiceNo || order.orderNo)}`);
                      }}
                      className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-purple-600 dark:text-purple-400 font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={13} className="text-purple-500" /> View Invoice{matchedInvs.length > 1 ? `s (${matchedInvs.length})` : ''}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-purple-500/10 border border-purple-500/20">Tax Inv</span>
                    </button>
                  ) : null}

                  {/* Create Invoice Option — full order or latest dispatch */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionOrderId(null);
                      handleInvoiceClick(order);
                    }}
                    className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface2 transition-colors text-indigo-600 dark:text-indigo-400 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={13} className="text-indigo-500" /> {matchedInvs.length > 0 ? '+ Another Dispatch Invoice' : 'Create Tax Invoice'}
                    </span>
                    <span className="text-[10px] text-muted font-mono">+Invoice</span>
                  </button>

                  {/* If order has multiple partial dispatches, provide direct 1-click links for each dispatch */}
                  {orderDispatches.length > 1 && (
                    <div className="px-3 py-1 bg-surface2/30 border-y border-theme-subtle/40 text-[10.5px] space-y-1">
                      <span className="text-muted font-bold block text-[9.5px] uppercase">Bill Specific Partial Dispatch:</span>
                      <div className="flex flex-wrap gap-1">
                        {orderDispatches.map((dp: any, dpIdx: number) => (
                          <button
                            key={dp.id || dpIdx}
                            type="button"
                            onClick={() => {
                              setOpenActionOrderId(null);
                              navigate(`/finance/invoices/new?orderId=${order.id}&soNo=${encodeURIComponent(order.orderNo || '')}&dispatchNo=${encodeURIComponent(dp.gatePassId || dp.dispatchNo || '')}`);
                            }}
                            className="px-1.5 py-0.5 bg-surface border border-theme-subtle hover:border-indigo-400 hover:text-indigo-600 text-[10px] font-mono rounded-none"
                            title={`Create invoice specifically for ${dp.gatePassId || dp.dispatchNo} (${dp.dispatchedQty} pcs)`}
                          >
                            {dp.gatePassId || dp.dispatchNo || `Batch ${dpIdx + 1}`} ({dp.dispatchedQty} pcs)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="my-1 border-t border-theme-subtle" />
            <div className="px-3 py-1 text-[10px] font-bold text-muted uppercase tracking-wider font-mono">
              Print Documents
            </div>

            {/* Print Sales Order */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                setPrintOrder(order)
              }}
              className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-primary font-medium"
            >
              <Printer size={13} className="text-blue-500" /> Print Sales Order Document
            </button>

            {/* Print Work Order (Traveler) - available for all orders */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                const targetWO = existingWO || {
                  id: `WO-${order.orderNo || order.id}`,
                  orderNo: order.orderNo,
                  title: `WO: ${order.orderNo} - ${order.customerName}`,
                  customerName: order.customerName,
                  customer: order.customerName,
                  salesOrderNo: order.orderNo,
                  quoteId: order.quoteId,
                  quotationNo: order.quotationNo,
                  jobQty: Math.max(1, Number(order.qty || 1)),
                  productName: order.productName || (orderItems?.[0]?.description) || 'Precision Component',
                  items: orderItems,
                  status: existingWO?.status || 'Confirmed Order (Factory Traveler)',
                  date: order.orderDate || order.createdAt
                };
                setPrintWorkOrderTarget(targetWO);
              }}
              className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-primary font-medium"
            >
              <Factory size={13} className="text-amber-500" /> Print Work Order (Traveler)
            </button>

            {/* Print Dispatch Note / Gate Pass */}
            <button
              type="button"
              onClick={async () => {
                setOpenActionOrderId(null)
                if (order.gatePassId || order.gatePassNo) {
                  await handleViewGatePass(order)
                } else {
                  const targetGP = {
                    id: order.gatePassNo || `DN-${order.orderNo || order.id}`,
                    type: 'goods_delivery',
                    orderNo: order.orderNo,
                    orderId: order.id,
                    quoNo: order.quotationNo,
                    customerName: order.customerName,
                    customerCompany: order.customerName,
                    attention: order.attention || order.customerName,
                    address: order.deliveryAddress,
                    phone: order.customerPhone,
                    email: order.customerEmail,
                    carrier: order.carrier || 'REX Transport',
                    vehicleNo: order.vehicleNo,
                    driverName: order.driverName,
                    reason: `Finished Goods Delivery for Order ${order.orderNo}`,
                    items: (orderItems && orderItems.length > 0) ? orderItems.map((it) => ({
                      description: it.description || it.productName || order.productName,
                      qty: it.qty || order.qty || 1,
                      unit: it.uom || 'Nos',
                      remarks: `Order #${order.orderNo}`
                    })) : [{
                      description: order.productName || 'Order Items',
                      qty: order.qty || 1,
                      unit: 'Nos',
                      remarks: `Order #${order.orderNo}`
                    }],
                    issuedBy: 'Store Keeper / Dispatch',
                    status: order.isDispatched ? 'Dispatched' : 'Preview / Pending Dispatch',
                    createdAt: order.orderDate || order.createdAt
                  };
                  setPrintGatePass(targetGP);
                }
              }}
              className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-primary font-medium"
            >
              <Truck size={13} className="text-emerald-500" /> Print Dispatch Note / Gate Pass
            </button>

            <div className="my-1 border-t border-theme-subtle" />
{/* 6. Edit Order */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                handleOpenEditModal(order)
              }}
              className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-secondary hover:text-primary font-medium"
            >
              <Edit size={13} /> Edit Sales Order Details{!canEditOrder && ' (Admin Approval Required)'}
            </button>

            {/* View Sample Inspection Photos */}
            {(() => {
              const { photos: sPhotos, grns: matchedGrns } = findMatchingSamplePhotos({
                id: order.id,
                orderNo: order.orderNo,
                quoteId: order.quoteId,
                quotationNo: order.quotationNo,
                leadId: order.leadId,
                customerName: order.customerName
              }, allCustomerGrns);
              if (sPhotos.length === 0) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionOrderId(null);
                    setActionCoords(null);
                    setActiveViewingPhotos({
                      photos: sPhotos,
                      title: `Sample Photos - Sales Order #${order.orderNo || order.id} (${matchedGrns.map((g: any) => g.id).join(', ')})`
                    });
                  }}
                  className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-amber-600 dark:text-amber-400 font-semibold cursor-pointer"
                >
                  <Camera size={13} className="text-amber-500 shrink-0" />
                  <span>View Sample Photos ({sPhotos.length})</span>
                </button>
              );
            })()}

            {/* Record / Attach Customer PO */}
            <button
              type="button"
              onClick={() => {
                setOpenActionOrderId(null)
                setRecordPoOrder(order)
              }}
              className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-blue-600 dark:text-blue-400 font-medium"
            >
              <Paperclip size={13} /> {order.customerPoNo && order.customerPoNo !== 'WITHOUT PO' && !isOrderPoPending(order) ? 'Update Customer PO / Document' : 'Record / Attach Customer PO'}
            </button>

            {/* View PO Details if present */}
            {order.customerPoNo && order.customerPoNo !== 'WITHOUT PO' && (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  setViewPoOrder(order)
                }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <Eye size={13} /> View Customer PO Details
              </button>
            )}

            {/* View PO Attachment if present */}
            {order.customerPoAttachment && (
              <button
                type="button"
                onClick={() => {
                  setOpenActionOrderId(null)
                  setViewingPoAttachment({
                    url: order.customerPoAttachment,
                    orderNo: order.orderNo,
                    poNo: order.customerPoNo
                  })
                }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface2 transition-colors text-blue-600 dark:text-blue-400 font-medium"
              >
                <Paperclip size={13} /> View Customer PO Document
              </button>
            )}

            {/* 7. Delete Order (available for Admin only) */}
            {isAdmin && (
              <>
                <div className="my-1 border-t border-theme-subtle" />
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionOrderId(null)
                    setDeleteTarget(order)
                  }}
                  className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-500/10 transition-colors text-rose-600 font-semibold"
                >
                  <Trash2 size={13} /> Delete Sales Order
                </button>
              </>
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
            {orders.some(o => o.status === 'Pending Approval' || o.status === 'Pending Advance Approval') && (
              <option value="Pending Approval">Pending Approval ({orders.filter(o => o.status === 'Pending Approval' || o.status === 'Pending Advance Approval').length})</option>
            )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenPrintProforma(pi, linkedSO)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-none flex items-center gap-1"
                          >
                            <Printer size={12} /> View / Print Proforma
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProforma(pi)}
                              className="text-xs text-muted hover:text-rose-600 hover:bg-rose-500/10 border border-theme-subtle hover:border-rose-500/30 font-bold py-1 px-2.5 rounded-none flex items-center gap-1 transition-colors"
                              title="Delete Proforma Invoice"
                            >
                              <Trash2 size={12} /> Delete
                            </Button>
                          )}
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
            <thead className="bg-surface2/60 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider select-none">
              <tr>
                <th 
                  onClick={() => handleToggleOrderSort('orderNo')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center">
                    <span>Order # & Date</span>
                    {renderOrderSortIndicator('orderNo')}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleOrderSort('customer')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center">
                    <span>Customer</span>
                    {renderOrderSortIndicator('customer')}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleOrderSort('product')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center">
                    <span>Product Ordered</span>
                    {renderOrderSortIndicator('product')}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleOrderSort('qty')}
                  className="px-3 py-3 text-center cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <span>Qty & Stock</span>
                    {renderOrderSortIndicator('qty')}
                  </div>
                </th>
                <th 
                  onClick={() => handleToggleOrderSort('value')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center justify-end">
                    <span>Value & Advance</span>
                    {renderOrderSortIndicator('value')}
                  </div>
                </th>
                <th className="px-3 py-3 text-center">Traceability</th>
                <th 
                  onClick={() => handleToggleOrderSort('status')}
                  className="px-3 py-3 text-center cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <span>Status</span>
                    {renderOrderSortIndicator('status')}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-subtle/30 text-xs">
              {sortedOrders.map((order, idx) => {
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
                        {(() => {
                          const isPoPending = isOrderPoPending(order);
                          const hasPo = order.customerPoNo && !isPoPending && order.customerPoNo !== 'WITHOUT PO';
                          const isWithoutPo = order.customerPoNo === 'WITHOUT PO';

                          if (isPoPending) {
                            return (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1" title="Customer PO is Pending - Dispatch & Final Invoice Blocked">
                                  <Clock size={10} /> PO Pending
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRecordPoOrder(order);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                                  title="Record and attach customer PO"
                                >
                                  + Attach PO
                                </button>
                              </div>
                            );
                          }

                          if (hasPo) {
                            return (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" title={`Customer PO: ${order.customerPoNo}`}>
                                  PO: {order.customerPoNo}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewPoOrder(order);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
                                  title="View Customer PO Document & Details"
                                >
                                  <Paperclip size={10} /> View PO
                                </button>
                              </div>
                            );
                          }

                          if (isWithoutPo) {
                            return (
                              <span className="text-[10px] font-mono font-semibold px-1 py-0.2 bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30 mt-0.5">
                                Without PO
                              </span>
                            );
                          }

                          return (
                            <div className="mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecordPoOrder(order);
                                }}
                                className="text-[10px] text-muted hover:text-blue-600 hover:underline flex items-center gap-0.5"
                                title="Attach Customer Purchase Order"
                              >
                                + Add PO
                              </button>
                            </div>
                          );
                        })()}
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
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono font-bold text-xs text-primary">
                          {formatCurrency(order.totalPrice)}
                        </span>
                        {Number(order.taxAmount) > 0 ? (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            Incl. Tax: {formatCurrency(order.taxAmount)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-muted">
                            Tax: 0.00
                          </span>
                        )}
                        {linkedProforma && (
                          <button
                            type="button"
                            onClick={() => handleOpenPrintProforma(linkedProforma, order)}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 flex items-center gap-1 transition-colors mt-0.5"
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
                          if (order.customerPoNumber) {
                            traces.push({
                              type: 'po',
                              title: 'Customer PO',
                              reference: order.customerPoNumber,
                              subtitle: 'Customer Purchase Order',
                              statusBadge: { label: 'Customer PO', variant: 'info' }
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
                          (order.status === 'Pending Approval' || order.status === 'Pending Advance Approval') ? 'warning' :
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
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                            title={`Delete Order ${order.orderNo}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        {renderOrderActions(order, orderItems, existingWO, linkedInvoice, linkedProforma)}
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
        )}
      </GlassCard>

      {/* CREATE / EDIT ORDER MODAL */}
      {showOrderModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
          <div className={`relative w-full bg-surface border border-theme-subtle rounded-none shadow-2xl p-4 sm:p-6 transition-all duration-200 overflow-hidden flex flex-col ${
            isOrderModalExpanded
              ? 'max-w-[98vw] h-[96vh] max-h-[96vh]'
              : 'max-w-3xl max-h-[92vh]'
          }`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-theme-subtle shrink-0">
              <h3 className="text-base font-bold text-primary flex items-center gap-2 truncate pr-2">
                <ShoppingBag size={18} className="text-blue-600 shrink-0" />
                <span>{editingOrder ? `Edit Sales Order #${formData.orderNo}` : 'New Sales Order'}</span>
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOrderModalExpanded(!isOrderModalExpanded)}
                  title={isOrderModalExpanded ? "Restore standard size" : "Expand width (Full View)"}
                  className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors cursor-pointer"
                >
                  {isOrderModalExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  title="Close modal"
                  className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-secondary">
                      Sales Order # <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-muted font-medium">Custom / Auto</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.orderNo}
                      onChange={e => setFormData({ ...formData, orderNo: e.target.value })}
                      placeholder="e.g. SO-26-0042 or Custom SO #"
                      className="w-full input-base font-mono text-xs font-bold text-blue-600 dark:text-blue-400 pr-16"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetchNextDocumentNumber('sales_order', { reserve: false });
                          if (res?.formattedNumber) {
                            setFormData(prev => ({ ...prev, orderNo: res.formattedNumber }));
                          }
                        } catch (err) {}
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold text-muted hover:text-primary bg-surface2 hover:bg-surface border border-theme-subtle rounded transition-colors cursor-pointer"
                      title="Reset to Next Auto Sequence Number"
                    >
                      Auto #
                    </button>
                  </div>
                  <p className="text-[10px] text-muted mt-0.5">
                    Custom order number ඇතුළත් කළ හැක, නැතහොත් "Auto #" ඔබන්න.
                  </p>
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
                          <div className="mt-2 border-t border-theme-subtle/50 pt-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <Package size={13} className="text-blue-500" />
                                Quoted Order Line Items ({formData.items.length})
                              </span>
                              <button
                                type="button"
                                onClick={handleAddItemToOrder}
                                className="px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1 transition-colors"
                              >
                                <Plus size={11} /> Add Item
                              </button>
                            </div>

                            <div className="overflow-x-auto border border-theme-subtle bg-surface">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-surface2/60 border-b border-theme-subtle text-[10px] uppercase font-bold text-muted tracking-wider">
                                  <tr>
                                    <th className="px-2.5 py-1.5">Item Description</th>
                                    <th className="px-2 py-1.5 text-right w-20">Qty</th>
                                    <th className="px-2 py-1.5 w-16">Unit</th>
                                    <th className="px-2 py-1.5 text-right w-28">Unit Price</th>
                                    <th className="px-2.5 py-1.5 text-right w-28">Total</th>
                                    <th className="px-1.5 py-1.5 text-center w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-subtle/40">
                                  {formData.items.map((it: any, idx: number) => {
                                    const lTot = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                                    return (
                                      <tr key={idx} className="hover:bg-surface2/20">
                                        <td className="p-1.5">
                                          <div className="relative">
                                            <textarea
                                              rows={2}
                                              value={it.description || it.productName || ''}
                                              onChange={e => handleItemChangeInOrder(idx, 'description', e.target.value)}
                                              onKeyDown={e => handleBulletKeyDown(e, it.description || it.productName || '', val => handleItemChangeInOrder(idx, 'description', val))}
                                              placeholder="Description (Press Enter for • bullet)..."
                                              className="w-full p-1.5 text-xs font-mono bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none leading-relaxed resize-y"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleItemChangeInOrder(idx, 'description', addBulletToText(it.description || it.productName || ''))}
                                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                                              title="Add bullet point"
                                            >
                                              <Plus size={10} /> Add Bullet (•)
                                            </button>
                                          </div>
                                        </td>
                                        <td className="p-1.5 text-right">
                                          <input
                                            type="number"
                                            min="1"
                                            step="any"
                                            value={it.qty}
                                            onChange={e => handleItemChangeInOrder(idx, 'qty', e.target.value)}
                                            className="w-full h-7 px-1 text-right font-mono text-xs font-bold bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                          />
                                        </td>
                                        <td className="p-1.5">
                                          <input
                                            type="text"
                                            value={it.uom || 'Nos'}
                                            onChange={e => handleItemChangeInOrder(idx, 'uom', e.target.value)}
                                            className="w-full h-7 px-1 text-center font-mono text-xs bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                          />
                                        </td>
                                        <td className="p-1.5 text-right">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={it.unitPrice}
                                            onChange={e => handleItemChangeInOrder(idx, 'unitPrice', e.target.value)}
                                            className="w-full h-7 px-1.5 text-right font-mono text-xs font-bold bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                          />
                                        </td>
                                        <td className="p-1.5 text-right font-mono font-bold text-primary text-[11px]">
                                          {formatCurrency(lTot)}
                                        </td>
                                        <td className="p-1.5 text-center">
                                          {formData.items.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveItemFromOrder(idx)}
                                              className="p-1 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                              title="Remove item"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
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
                  <div className="sm:col-span-2 space-y-3">
                    {/* Line Items Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Package size={13} className="text-blue-500" />
                          Order Line Items ({(formData.items || []).length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddItemToOrder}
                          className="px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus size={11} /> Add Item
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-theme-subtle bg-surface">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface2/60 border-b border-theme-subtle text-[10px] uppercase font-bold text-muted tracking-wider">
                            <tr>
                              <th className="px-2.5 py-1.5">Item Description</th>
                              <th className="px-2 py-1.5 text-right w-20">Qty</th>
                              <th className="px-2 py-1.5 w-16">Unit</th>
                              <th className="px-2 py-1.5 text-right w-28">Unit Price</th>
                              <th className="px-2.5 py-1.5 text-right w-28">Total</th>
                              <th className="px-1.5 py-1.5 text-center w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/40">
                            {(formData.items && formData.items.length > 0 ? formData.items : [{
                              productId: 'CUSTOM-ITEM-1',
                              productName: 'Custom Machining Item',
                              description: '',
                              qty: 1,
                              unitPrice: 0,
                              amount: 0,
                              uom: 'Nos'
                            }]).map((it: any, idx: number) => {
                              const lTot = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                              return (
                                <tr key={idx} className="hover:bg-surface2/20">
                                  <td className="p-1.5">
                                    <div className="relative">
                                      <textarea
                                        rows={2}
                                        value={it.description || it.productName || ''}
                                        onChange={e => handleItemChangeInOrder(idx, 'description', e.target.value)}
                                        onKeyDown={e => handleBulletKeyDown(e, it.description || it.productName || '', val => handleItemChangeInOrder(idx, 'description', val))}
                                        placeholder="Description (Press Enter for • bullet)..."
                                        className="w-full p-1.5 text-xs font-mono bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none leading-relaxed resize-y"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleItemChangeInOrder(idx, 'description', addBulletToText(it.description || it.productName || ''))}
                                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                                        title="Add bullet point"
                                      >
                                        <Plus size={10} /> Add Bullet (•)
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-1.5 text-right">
                                    <input
                                      type="number"
                                      min="1"
                                      step="any"
                                      value={it.qty}
                                      onChange={e => handleItemChangeInOrder(idx, 'qty', e.target.value)}
                                      className="w-full h-7 px-1 text-right font-mono text-xs font-bold bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={it.uom || 'Nos'}
                                      onChange={e => handleItemChangeInOrder(idx, 'uom', e.target.value)}
                                      className="w-full h-7 px-1 text-center font-mono text-xs bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5 text-right">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={it.unitPrice}
                                      onChange={e => handleItemChangeInOrder(idx, 'unitPrice', e.target.value)}
                                      className="w-full h-7 px-1.5 text-right font-mono text-xs font-bold bg-surface border border-theme-subtle focus:border-blue-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5 text-right font-mono font-bold text-primary text-[11px]">
                                    {formatCurrency(lTot)}
                                  </td>
                                  <td className="p-1.5 text-center">
                                    {(formData.items || []).length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItemFromOrder(idx)}
                                        className="p-1 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        title="Remove item"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-secondary mb-1">
                          Order Title / Job Scope <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.productName}
                          onChange={e => setFormData({ ...formData, productName: e.target.value })}
                          placeholder="e.g. Stainless Steel Shaft Machining & Fabrication"
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
                    </div>
                  </div>
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

                {formData.orderSource === 'ready_made' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Order Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={formData.qty}
                        onChange={e => {
                          const newQty = e.target.value;
                          setFormData(prev => {
                            const sub = (Number(newQty) || 0) * (Number(prev.unitPrice) || 0);
                            const { taxAmount, totalPrice } = calculateOrderTaxes(sub, prev.taxProfileId, prev.taxRate);
                            return { ...prev, qty: newQty, subtotal: sub, taxAmount, totalPrice };
                          });
                        }}
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
                        onChange={e => {
                          const newPrice = e.target.value;
                          setFormData(prev => {
                            const sub = (Number(prev.qty) || 0) * (Number(newPrice) || 0);
                            const { taxAmount, totalPrice } = calculateOrderTaxes(sub, prev.taxProfileId, prev.taxRate);
                            return { ...prev, unitPrice: newPrice, subtotal: sub, taxAmount, totalPrice };
                          });
                        }}
                        className="w-full input-base font-mono font-bold text-sm"
                      />
                    </div>
                  </>
                )}

                {/* ── TAXES & PRICING CONFIGURATION (APPLY TAXES TO FINAL VALUE) ── */}
                <div className="sm:col-span-2 p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-none space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Apply Taxes to Final Value (බදු සැකසුම්)
                      </span>
                    </div>
                    {formData.taxAmount > 0 && (
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25">
                        +{formatCurrency(formData.taxAmount)} ({formData.taxRate}%)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Tax Profile Dropdown */}
                    <div className={formData.taxProfileId === 'custom' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Tax Profile / Tax Policy
                      </label>
                      <select
                        value={formData.taxProfileId || 'no_tax'}
                        onChange={e => handleTaxProfileChange(e.target.value)}
                        className="w-full input-base text-xs font-medium"
                      >
                        <option value="no_tax">No Tax / 0% (Tax Exempt)</option>
                        {taxProfiles?.map((p: any) => {
                          const t1 = Number(p.tax1_rate || 0);
                          const t2 = Number(p.tax2_rate || 0);
                          const rateLabel = t1 > 0 && t2 > 0 
                            ? `${p.tax1_name || 'SSCL'} ${t1}% + ${p.tax2_name || 'VAT'} ${t2}%`
                            : (t2 > 0 ? `${p.tax2_name || 'VAT'} ${t2}%` : (t1 > 0 ? `${p.tax1_name || 'SSCL'} ${t1}%` : '0%'));
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({rateLabel})
                            </option>
                          );
                        })}
                        <option value="custom">Custom Tax Rate (%) / Amount</option>
                      </select>
                    </div>

                    {/* If Custom, show custom inputs */}
                    {formData.taxProfileId === 'custom' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">
                            Tax Rate (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.taxRate}
                              onChange={e => handleCustomTaxRateChange(e.target.value)}
                              placeholder="e.g. 18"
                              className="w-full input-base font-mono text-xs pr-8"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">
                            Tax Amount (Rs.)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.taxAmount}
                            onChange={e => handleCustomTaxAmountChange(e.target.value)}
                            placeholder="Rs. 0.00"
                            className="w-full input-base font-mono text-xs"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] text-muted block mb-0.5">Applied Tax Status</span>
                        <span className="text-xs font-mono font-semibold text-primary truncate">
                          {formData.taxProfileId && formData.taxProfileId !== 'no_tax' 
                            ? (taxProfiles?.find((p: any) => p.id === formData.taxProfileId)?.name || 'Standard Tax Profile')
                            : 'Tax Exempt (0.00%)'}
                        </span>
                      </div>
                    )}
                  </div>
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
                  <label className="block text-xs font-medium text-secondary mb-1">Financial Summary</label>
                  <div className="w-full p-2.5 bg-surface2/30 border border-theme-subtle font-mono text-xs space-y-1">
                    <div className="flex justify-between text-secondary text-[11px]">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(formData.subtotal || calculateCurrentSubtotal(formData))}
                      </span>
                    </div>
                    {Number(formData.discount || 0) > 0 && (
                      <div className="flex justify-between text-rose-500 text-[11px]">
                        <span>Discount:</span>
                        <span>-{formatCurrency(formData.discount)}</span>
                      </div>
                    )}
                    {Number(formData.taxAmount || 0) > 0 ? (
                      <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                        <span>Taxes ({formData.taxRate > 0 ? `${formData.taxRate}%` : 'VAT / SSCL'}):</span>
                        <span>+{formatCurrency(formData.taxAmount)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-muted text-[10px]">
                        <span>Taxes:</span>
                        <span>Rs. 0.00 (Exempt)</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-rex-600 pt-1 border-t border-theme-subtle">
                      <span>Total Value:</span>
                      <span>
                        {formatCurrency(
                          formData.totalPrice || (
                            (Number(formData.subtotal) || calculateCurrentSubtotal(formData)) + Number(formData.taxAmount || 0)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── CUSTOMER PURCHASE ORDER (PO) SECTION ── */}
                <div className="sm:col-span-2 p-3.5 bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Customer Purchase Order (PO) Details & Document
                      </span>
                    </div>
                    <span className="text-[10px] text-muted font-mono">Customer PO Verification</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Customer PO Number
                      </label>
                      <input
                        type="text"
                        value={formData.customerPoNo}
                        onChange={e => setFormData({ ...formData, customerPoNo: e.target.value })}
                        placeholder="e.g. PO/2026/0891 or CUST-PO-774"
                        className="w-full input-base font-mono text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Customer PO Date
                      </label>
                      <input
                        type="date"
                        value={formData.customerPoDate}
                        onChange={e => setFormData({ ...formData, customerPoDate: e.target.value })}
                        className="w-full input-base text-xs"
                      />
                    </div>
                  </div>

                  {/* PO Document Attachment (Upload) */}
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">
                      Customer PO Attachment (PDF or Image)
                    </label>
                    {formData.customerPoAttachment ? (
                      <div className="flex items-center justify-between p-2.5 bg-surface border border-theme-subtle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                            {formData.customerPoAttachment.startsWith('data:image/') ? (
                              <img src={formData.customerPoAttachment} alt="PO Preview" className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-primary block truncate">
                              {formData.customerPoAttachmentName || (formData.customerPoNo ? `Customer_PO_${formData.customerPoNo}` : 'Customer_PO_Document')}
                            </span>
                            <span className="text-[10px] text-muted font-mono">
                              Document attached • Ready to save
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<iframe src="${formData.customerPoAttachment}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 p-1.5 h-auto flex items-center gap-1"
                            title="View Document"
                          >
                            <Eye size={14} /> View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, customerPoAttachment: '', customerPoAttachmentName: '' })}
                            className="text-xs text-rose-600 hover:text-rose-700 p-1.5 h-auto flex items-center gap-1"
                            title="Remove Attachment"
                          >
                            <Trash2 size={14} /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-theme-subtle hover:border-blue-500 bg-surface2/30 hover:bg-surface2/60 cursor-pointer transition-colors text-center">
                          <UploadCloud size={20} className="text-blue-500 mb-1" />
                          <span className="text-xs font-semibold text-primary">Click to upload Customer PO (PDF, PNG, JPG)</span>
                          <span className="text-[10px] text-muted mt-0.5">Maximum recommended size: 15MB</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={handlePoFileUpload}
                          />
                        </label>
                      </div>
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
              const hasMultiItems = Array.isArray(dispatchForm.dispatchItems) && dispatchForm.dispatchItems.length > 0;

              return (
                <div className="p-3 bg-surface border border-theme-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-secondary uppercase tracking-wider">
                      {hasMultiItems ? 'Item-wise Dispatch Quantities' : 'Dispatch Batch Quantity'}
                    </span>
                    <span className="font-mono text-muted">
                      Total Dispatched So Far: <strong className="text-emerald-500">{prevDispatchedQty} / {totalOrdQty} pcs</strong>
                    </span>
                  </div>

                  {hasMultiItems ? (
                    <div className="border border-theme-subtle overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface2/70 border-b border-theme-subtle text-[10px] font-bold text-muted uppercase">
                          <tr>
                            <th className="px-3 py-2">Item Description</th>
                            <th className="px-2 py-2 text-center w-20">Order Qty</th>
                            <th className="px-2 py-2 text-center w-28">Dispatch Now</th>
                            <th className="px-2 py-2 text-right w-24">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-subtle/40">
                          {dispatchForm.dispatchItems.map((it: any, itIdx: number) => (
                            <tr key={it.id || itIdx} className="hover:bg-surface2/20">
                              <td className="px-3 py-2">
                                <span className="font-semibold text-primary block leading-tight">{it.description || it.productName || 'Order Item'}</span>
                                {it.sku && <span className="text-[10px] text-muted font-mono">{it.sku}</span>}
                              </td>
                              <td className="px-2 py-2 text-center font-mono font-bold text-muted">
                                {it.totalQty || it.qty || 1}
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={it.totalQty || it.qty || 99999}
                                  value={it.dispatchQty !== undefined ? it.dispatchQty : (it.qty || 0)}
                                  onChange={e => {
                                    const val = Math.max(0, Number(e.target.value));
                                    const updatedItems = dispatchForm.dispatchItems.map((item: any, i: number) =>
                                      i === itIdx ? { ...item, dispatchQty: val } : item
                                    );
                                    const sumQty = updatedItems.reduce((acc: number, item: any) => acc + Number(item.dispatchQty || 0), 0);
                                    setDispatchForm({
                                      ...dispatchForm,
                                      dispatchItems: updatedItems,
                                      dispatchQty: sumQty > 0 ? sumQty : 1
                                    });
                                  }}
                                  className="w-full input-base py-1 px-2 text-center text-xs font-mono font-bold"
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-muted font-mono text-[11px]">
                                {it.uom || it.unit || 'pcs'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-2 bg-surface2/40 border-t border-theme-subtle flex items-center justify-between text-[11px]">
                        <span className="text-muted">Total items in this dispatch note: <strong className="text-primary font-mono">{dispatchForm.dispatchQty} pcs</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedItems = dispatchForm.dispatchItems.map((item: any) => ({
                              ...item,
                              dispatchQty: item.totalQty || item.qty || 1
                            }));
                            const sumQty = updatedItems.reduce((acc: number, item: any) => acc + Number(item.dispatchQty || 0), 0);
                            setDispatchForm({
                              ...dispatchForm,
                              dispatchItems: updatedItems,
                              dispatchQty: sumQty
                            });
                          }}
                          className="text-xs font-bold text-rex-600 dark:text-rex-400 hover:underline"
                        >
                          Dispatch All Items (100%)
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}

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

      {/* SAMPLE PHOTO VIEWER LIGHTBOX */}
      <SamplePhotoViewerModal
        isOpen={!!activeViewingPhotos}
        onClose={() => setActiveViewingPhotos(null)}
        photos={activeViewingPhotos?.photos || []}
        title={activeViewingPhotos?.title || 'Sample Photos'}
      />

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

      {/* RECORD CUSTOMER PO MODAL */}
      {recordPoOrder && (
        <RecordCustomerPoModal
          isOpen={Boolean(recordPoOrder)}
          onClose={() => setRecordPoOrder(null)}
          orderData={recordPoOrder}
          onSuccess={async () => {
            setRecordPoOrder(null);
            refetch();
          }}
        />
      )}

      {/* VIEW CUSTOMER PO MODAL */}
      {viewPoOrder && (
        <ViewCustomerPoModal
          isOpen={Boolean(viewPoOrder)}
          onClose={() => setViewPoOrder(null)}
          orderData={viewPoOrder}
          onEditPo={() => {
            const ord = viewPoOrder;
            setViewPoOrder(null);
            setRecordPoOrder(ord);
          }}
        />
      )}

      {/* CUSTOMER PO ATTACHMENT VIEWER MODAL */}
      {viewingPoAttachment && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPoAttachment(null)}
          title={`Customer PO Document - Order #${viewingPoAttachment.orderNo} ${viewingPoAttachment.poNo ? `(PO: ${viewingPoAttachment.poNo})` : ''}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
              <div className="text-xs text-muted">
                Official Customer Purchase Order uploaded for order <strong className="text-primary">{viewingPoAttachment.orderNo}</strong>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPoAttachment.url}
                  download={`Customer_PO_${viewingPoAttachment.poNo || viewingPoAttachment.orderNo}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download size={13} /> Download File
                </a>
              </div>
            </div>

            <div className="bg-surface2 border border-theme-subtle p-2 flex items-center justify-center min-h-[500px] max-h-[75vh] overflow-auto">
              {viewingPoAttachment.url.startsWith('data:image/') ? (
                <img
                  src={viewingPoAttachment.url}
                  alt="Customer PO"
                  className="max-w-full max-h-[70vh] object-contain shadow-md"
                />
              ) : (
                <iframe
                  src={viewingPoAttachment.url}
                  title="Customer PO Document"
                  className="w-full h-[70vh] border-none"
                />
              )}
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

      {/* Work Order Print / Job Traveler Modal */}
      {printWorkOrderTarget && (
        <WorkOrderPrintModal
          isOpen={true}
          onClose={() => setPrintWorkOrderTarget(null)}
          workOrder={printWorkOrderTarget}
          settings={settings}
        />
      )}

      {/* Create Work Order Review Confirmation Modal */}
      {createWoModalOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-surface border border-theme shadow-2xl rounded-none flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle bg-surface2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Factory size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                    Issue Production Work Order
                    <span className="font-mono text-xs px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      SO #${createWoModalOrder.orderNo}
                    </span>
                  </h2>
                  <p className="text-[11px] text-muted">
                    Review quotation line items and specifications before releasing to shop floor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateWoModalOrder(null)}
                className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors rounded-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              {/* Order summary info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface2/60 border border-theme-subtle">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer</span>
                  <span className="font-bold text-primary">${createWoModalOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Quotation Reference</span>
                  <span className="font-mono font-semibold text-secondary">${createWoModalOrder.quotationNo || createWoModalOrder.quoteId || 'Direct'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Customer PO #</span>
                  <span className="font-mono font-semibold text-secondary">${createWoModalOrder.customerPoNo || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Target Delivery</span>
                  <span className="font-mono font-semibold text-secondary">${createWoModalOrder.deliveryDate || 'TBD'}</span>
                </div>
              </div>

              {/* Title & Priority inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                    Job Card Title
                  </label>
                  <input
                    type="text"
                    value={createWoJobTitle}
                    onChange={(e) => setCreateWoJobTitle(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-1.5 text-xs text-primary outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={createWoPriority}
                    onChange={(e) => setCreateWoPriority(e.target.value)}
                    className="w-full bg-surface border border-theme-subtle rounded-none px-3 py-1.5 text-xs text-primary outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Quotation Line Items & Descriptions */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                  Production Scope &amp; Descriptions ({createWoModalItems.length} item{createWoModalItems.length !== 1 ? 's' : ''})
                </label>
                <div className="border border-theme-subtle rounded-none overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface2/80 border-b border-theme-subtle text-[10px] uppercase font-bold text-muted">
                        <th className="py-1.5 px-2 text-center w-8">#</th>
                        <th className="py-1.5 px-3 text-left">Quotation Description &amp; Scope</th>
                        <th className="py-1.5 px-3 text-center w-16">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-subtle">
                      {createWoModalItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface2/40">
                          <td className="py-2 px-2 text-center font-mono text-muted">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-primary whitespace-pre-line leading-relaxed">
                            {item.description}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-primary">
                            {item.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Workshop Instructions / Notes (Optional)
                </label>
                <textarea
                  value={createWoNotes}
                  onChange={(e) => setCreateWoNotes(e.target.value)}
                  placeholder="Special instructions for cutting, tolerances, finishing or delivery packaging..."
                  rows={2}
                  className="w-full bg-surface border border-theme-subtle rounded-none p-2.5 text-xs text-primary outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-theme-subtle bg-surface2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateWoModalOrder(null)}
                disabled={createWoSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Factory}
                onClick={submitCreateWorkOrder}
                loading={createWoSubmitting}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm &amp; Issue Work Order
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proforma Invoice Print / PDF View Modal */}
      {activePrintProforma && (
        <ProformaInvoicePrintModal
          isOpen={true}
          onClose={() => setActivePrintProforma(null)}
          invoice={activePrintProforma}
          settings={settings}
          onDelete={handleDeleteProforma}
        />
      )}


    </div>
  )
}
