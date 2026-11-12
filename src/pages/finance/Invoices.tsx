import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Search, Plus, Edit3, Filter, FileCheck, Trash2, ExternalLink, CheckCircle, Clock, AlertCircle, AlertTriangle, Mail, Printer, Receipt, Hash, RefreshCw, Upload, Paperclip, Eye, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { InvoicePreview } from "@/pages/finance/InvoiceBuilder";
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { useInvoices, useLeads, useCustomers, useQuotations, useFinishedGoodsOrders, useWorkOrders } from '@/hooks/useData'
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown'
import { useTaxProfiles, useAccounts } from '@/hooks/useFinance'
import { updateInvoice, deleteInvoice, changeInvoiceNumber, uploadFileToStorage } from '@/lib/api'
import { formatCurrency, relativeTime } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner'
import { printElement } from '@/lib/printElement'
import { exportPdf } from '@/lib/exportPdf'

export const Invoices: React.FC = () => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  )
  const canEditInvoice = Boolean(isAdmin || can('finance.invoices.edit'))
  const canRecordPayment = Boolean(
    user?.role === 'finance_manager' ||
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'finance manager' ||
    can('finance.payments.record')
  )
  const { data: invoices, loading, refetch } = useInvoices()
  const { data: leads } = useLeads()
  const { data: customers } = useCustomers()
  const { data: quotations } = useQuotations()
  const { data: allOrders = [] } = useFinishedGoodsOrders()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: accounts } = useAccounts()
  const { settings } = useSettings()
  
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewInvoice, setViewInvoice] = useState<any>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)
  const [printReceiptData, setPrintReceiptData] = useState<any | null>(null)

  useEffect(() => {
    const targetId = searchParams.get('id')
    const searchParam = searchParams.get('search')
    if (searchParam !== null && searchParam !== undefined) {
      setSearch(searchParam)
    } else if (targetId) {
      setSearch(targetId)
    }
    if (targetId && invoices && invoices.length > 0) {
      const targetLower = String(targetId).trim().toLowerCase()
      const found = invoices.find((inv: any) => 
        String(inv.id).trim().toLowerCase() === targetLower || 
        String(inv.invoiceNo || '').trim().toLowerCase() === targetLower
      )
      if (found) {
        setViewInvoice(found)
      }
    }
  }, [searchParams, invoices])
  
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash', accountId: '', reference: '', depositSlip: '' })
  const [isUploadingSlip, setIsUploadingSlip] = useState(false)

  const handleInvoiceSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSlip(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUri = reader.result as string;
      setPaymentData(prev => ({ ...prev, depositSlip: rawDataUri }));
      try {
        const uploaded = await uploadFileToStorage(rawDataUri, file.name, 'slips');
        if (uploaded && uploaded.url) {
          setPaymentData(prev => ({ ...prev, depositSlip: uploaded.url }));
        }
      } catch (err) {
        console.warn('Storage upload error, keeping dataUri fallback:', err);
      } finally {
        setIsUploadingSlip(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const [changeNoModalTarget, setChangeNoModalTarget] = useState<any | null>(null)
  const [newInvoiceNoInput, setNewInvoiceNoInput] = useState('')
  const [isRenumbering, setIsRenumbering] = useState(false)

  const handleOpenChangeNoModal = (inv: any) => {
    setChangeNoModalTarget(inv)
    setNewInvoiceNoInput(inv.invoiceNo || inv.id || '')
  }

  const handleGenerateNextForModal = async () => {
    try {
      const invDate = changeNoModalTarget?.date || new Date().toISOString()
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/invoices/next-number?date=${encodeURIComponent(invDate)}`)
      if (res.ok) {
        const d = await res.json()
        if (d.invoiceNo) {
          setNewInvoiceNoInput(d.invoiceNo)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmitChangeNumber = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!changeNoModalTarget) return
    const cleanNo = newInvoiceNoInput.trim().replace(/\s+/g, '')
    if (!cleanNo) {
      setToast({ type: 'error', msg: 'Please enter a valid invoice number.' })
      return
    }
    const currentId = changeNoModalTarget.id
    if (cleanNo === currentId && cleanNo === (changeNoModalTarget.invoiceNo || currentId)) {
      setChangeNoModalTarget(null)
      return
    }

    setIsRenumbering(true)
    try {
      await changeInvoiceNumber(currentId, cleanNo)
      setToast({ type: 'success', msg: `Invoice number updated to ${cleanNo}` })

      if (viewInvoice && (viewInvoice.id === currentId || viewInvoice.invoiceNo === currentId)) {
        setViewInvoice({
          ...viewInvoice,
          id: cleanNo,
          invoiceNo: cleanNo
        })
      }

      if (typeof refetch === 'function') {
        refetch()
      }

      setChangeNoModalTarget(null)
    } catch (err: any) {
      setToast({ type: 'error', msg: err.message || 'Failed to change invoice number.' })
    } finally {
      setIsRenumbering(false)
    }
  }
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInvoiceData, setNewInvoiceData] = useState({
    leadId: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [{ desc: '', qty: 1, price: 0 }]
  })

  const showToast = (type: 'success'|'error', msg: string) => { 
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateInvoice(id, { status: newStatus })
      refetch()
      showToast('success', `Status updated to ${newStatus}`)
      if (viewInvoice && viewInvoice.id === id) {
        setViewInvoice({ ...viewInvoice, status: newStatus })
      }
    } catch (e) {
      showToast('error', 'Failed to update status')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteInvoice(deleteTarget)
      refetch()
      if (viewInvoice && (viewInvoice.id === deleteTarget || viewInvoice.invoiceNo === deleteTarget)) {
        setViewInvoice(null)
      }
      showToast('success', 'Invoice deleted')
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to delete invoice')
    }
    setDeleteTarget(null)
    setSubmitting(false)
  }

  const parsePayments = (payments: any): any[] => {
    if (!payments) return [];
    if (Array.isArray(payments)) return payments;
    if (typeof payments === 'string' && payments.trim()) {
      try {
        const parsed = JSON.parse(payments);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleAddPayment = async () => {
    if (!viewInvoice || !paymentData.amount) return;
    const pAmount = parseFloat(paymentData.amount);
    if (isNaN(pAmount) || pAmount <= 0) {
      showToast('error', 'Please enter a valid payment amount');
      return;
    }
    if (!canRecordPayment) {
      showToast('error', 'Access Denied: Only the Finance Manager is authorized to record payments on invoices.');
      return;
    }
    setSubmitting(true);
    try {
      const isUSD = Boolean(
        viewInvoice.currency === 'USD' ||
        viewInvoice.currency === '$' ||
        viewInvoice.taxProfileId === 'tp_export_zero_rated' ||
        viewInvoice.isForeign
      );
      const invCurr = isUSD ? 'USD' : (viewInvoice.currency || 'LKR');
      const invRate = Number(viewInvoice.exchangeRate || (isUSD ? 310 : 1));
      const targetAccountId = paymentData.accountId || (isUSD ? (settings?.usd_master_account_id || 'acc_1010') : undefined);

      const { addInvoicePayment } = await import('@/lib/api');
      const res = await addInvoicePayment(viewInvoice.id, {
        ...paymentData,
        amount: pAmount,
        currency: invCurr,
        exchangeRate: invRate,
        accountId: targetAccountId
      });
      
      if (res && res.error) {
        throw new Error(res.error || res.details || 'Failed to record payment');
      }
      
      const existing = parsePayments(viewInvoice.payments);
      const updatedPayments = res.payments || (res.payment ? [...existing, res.payment] : existing);
      const newPaid = res.newPaidAmount !== undefined ? res.newPaidAmount : (Number(viewInvoice.paidAmount || 0) + pAmount);

      const updatedInvoice = { 
        ...viewInvoice, 
        status: res.newStatus || viewInvoice.status, 
        paidAmount: newPaid,
        payments: JSON.stringify(updatedPayments)
      };
      setViewInvoice(updatedInvoice);
      refetch();
      showToast('success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({ amount: '', method: 'Cash', accountId: '', reference: '', depositSlip: '' });
      if (res && res.receipt) {
        setPrintReceiptData({
          ...res.receipt,
          currency: invCurr,
          exchangeRate: invRate
        });
      }
    } catch (e: any) {
      console.error('Record payment error:', e);
      showToast('error', e.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateManualInvoice = async () => {
    if (!newInvoiceData.leadId) {
      showToast('error', 'Please select a customer')
      return
    }
    setSubmitting(true)
    try {
      const items = newInvoiceData.items.map(i => ({ ...i, amount: i.qty * i.price }))
      const subtotal = items.reduce((sum, i) => sum + i.amount, 0)
      
      const payload = {
        id: `INV-${Date.now().toString().slice(-6)}`,
        quotationId: 'Manual',
        leadId: newInvoiceData.leadId,
        date: newInvoiceData.date + ' 00:00:00',
        dueDate: newInvoiceData.dueDate + ' 00:00:00',
        items: JSON.stringify(items),
        subtotal: subtotal,
        tax: 0,
        total: subtotal,
        status: 'draft',
        notes: ''
      }
      const { createInvoice } = await import('@/lib/api');
      await createInvoice(payload)
      showToast('success', 'Manual invoice created')
      setShowCreateModal(false)
      setNewInvoiceData({
        leadId: '',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        items: [{ desc: '', qty: 1, price: 0 }]
      })
      refetch()
    } catch (e) {
      showToast('error', 'Failed to create invoice')
    }
    setSubmitting(false)
  }

  const getCustomerInfo = (inv: any) => {
    if (!inv) return { id: '', name: 'Unknown Customer', company: 'Unknown Company', address: '', phone: '', email: '', vat: '' };
    const custId = inv.customerId || inv.leadId;

    // 1. Direct match in customers
    if (custId && customers && customers.length > 0) {
      const match = customers.find((c: any) => c.id === custId);
      if (match) {
        return {
          id: match.id,
          name: match.name || match.company || 'Customer',
          company: match.company || match.name || '',
          email: match.email || '',
          phone: match.phone || '',
          address: match.address || inv.customerAddress || '',
          vat: match.vat || inv.customerVat || '',
          currency: match.currency || (match.isForeign ? 'USD' : 'LKR'),
          isForeign: Boolean(match.isForeign || match.currency === 'USD')
        };
      }
    }

    // 2. Direct match in leads
    if (custId && leads && leads.length > 0) {
      const match = leads.find((l: any) => l.id === custId);
      if (match) {
        return {
          id: match.id,
          name: match.name || match.company || 'Lead',
          company: match.company || match.name || '',
          email: match.email || '',
          phone: match.phone || '',
          address: match.address || inv.customerAddress || '',
          vat: match.vat || inv.customerVat || '',
          currency: (match as any).currency || ((match as any).isForeign ? 'USD' : 'LKR'),
          isForeign: Boolean((match as any).isForeign || (match as any).currency === 'USD')
        };
      }
    }

    // 3. Data from server query join
    if (inv.customerCompany || inv.customerName || inv.customerAddress) {
      return {
        id: custId || '',
        name: inv.customerName || inv.customerCompany || '',
        company: inv.customerCompany || inv.customerName || '',
        email: inv.customerEmail || '',
        phone: inv.customerPhone || '',
        address: inv.customerAddress || '',
        vat: inv.customerVat || ''
      };
    }

    // 4. Linked quotation lookup
    const qId = inv.quotationNo || inv.quotationId;
    if (qId && quotations && quotations.length > 0) {
      const quo = quotations.find((q: any) => q.id === qId || q.quotationNo === qId);
      if (quo) {
        if (quo.leadId) {
          const cust = customers?.find((c: any) => c.id === quo.leadId);
          if (cust) {
            return {
              id: cust.id,
              name: cust.name || cust.company || '',
              company: cust.company || cust.name || '',
              email: cust.email || '',
              phone: cust.phone || '',
              address: cust.address || inv.customerAddress || '',
              vat: cust.vat || inv.customerVat || ''
            };
          }
          const lead = leads?.find((l: any) => l.id === quo.leadId);
          if (lead) {
            return {
              id: lead.id,
              name: lead.name || lead.company || '',
              company: lead.company || lead.name || '',
              email: lead.email || '',
              phone: lead.phone || '',
              address: lead.address || inv.customerAddress || '',
              vat: lead.vat || inv.customerVat || ''
            };
          }
        }
        if (quo.leadCompany || quo.leadName || quo.leadAddress) {
          return {
            id: quo.leadId || '',
            name: quo.leadName || quo.leadCompany || '',
            company: quo.leadCompany || quo.leadName || '',
            email: quo.leadEmail || '',
            phone: quo.leadPhone || '',
            address: quo.leadAddress || inv.customerAddress || '',
            vat: quo.leadVat || inv.customerVat || ''
          };
        }
        try {
          const parsed = JSON.parse(quo.data || '{}');
          if (parsed.customerName || parsed.customerCompany || parsed.customerAddress) {
            return {
              id: quo.leadId || '',
              name: parsed.customerName || parsed.customerCompany || '',
              company: parsed.customerCompany || parsed.customerName || '',
              email: parsed.customerEmail || '',
              phone: parsed.customerPhone || '',
              address: parsed.customerAddress || parsed.address || inv.customerAddress || '',
              vat: parsed.vatNo || parsed.tinNo || inv.customerVat || ''
            };
          }
        } catch (e) {}
      }
    }

    // 5. Finished goods order lookup (if orderNo)
    if (inv.orderNo && allOrders && allOrders.length > 0) {
      const ord = allOrders.find((o: any) => o.orderNo === inv.orderNo || o.id === inv.orderNo);
      if (ord) {
        return {
          id: ord.customerId || custId || '',
          name: ord.customerName || '',
          company: ord.customerCompany || ord.customerName || '',
          phone: ord.customerPhone || '',
          email: ord.customerEmail || '',
          address: ord.deliveryAddress || inv.customerAddress || '',
          vat: inv.customerVat || ''
        };
      }
    }

    // 6. Attention field
    if (inv.attention && inv.attention.trim()) {
      return {
        id: custId || '',
        name: inv.attention.trim(),
        company: inv.attention.trim(),
        address: inv.customerAddress || '',
        phone: inv.customerPhone || '',
        email: inv.customerEmail || '',
        vat: inv.customerVat || ''
      };
    }

    // 7. Alphanumeric ID fallback
    if (custId && custId !== 'WALK-IN') {
      return {
        id: custId,
        name: custId,
        company: custId,
        address: inv.customerAddress || '',
        phone: inv.customerPhone || '',
        email: inv.customerEmail || '',
        vat: inv.customerVat || ''
      };
    }

    return {
      id: '',
      name: 'Walk-in / Direct Customer',
      company: 'Walk-in Customer',
      address: inv.customerAddress || '',
      phone: inv.customerPhone || '',
      email: inv.customerEmail || '',
      vat: inv.customerVat || ''
    };
  };

  const getInvoicePaymentInfo = (inv: any) => {
    const total = Number(inv.total !== undefined ? inv.total : (inv.amount || 0));
    const paid = Number(inv.paidAmount !== undefined && inv.paidAmount !== null 
      ? inv.paidAmount 
      : parsePayments(inv.payments).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    );
    const due = Math.max(0, total - paid);
    const isSettled = inv.status?.toLowerCase() === 'paid' || (due <= 0.001 && total > 0);
    
    let isOverdue = inv.status?.toLowerCase() === 'overdue';
    let overdueDays = 0;
    if (inv.dueDate && !isSettled) {
      const dueTime = new Date(inv.dueDate).getTime();
      const nowTime = new Date().getTime();
      if (!isNaN(dueTime) && dueTime < nowTime) {
        isOverdue = true;
        overdueDays = Math.max(1, Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24)));
      }
    }
    
    const paidPercent = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : (isSettled ? 100 : 0);

    return {
      total,
      paid,
      due,
      isSettled,
      isOverdue,
      overdueDays,
      paidPercent
    };
  };

  const proformaCount = React.useMemo(() => {
    if (!Array.isArray(invoices)) return 0;
    return invoices.filter((inv: any) => 
      Boolean(inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-'))
    ).length;
  }, [invoices]);

  const customerDuesMap = React.useMemo(() => {
    const map: Record<string, { totalDue: number, unpaidCount: number }> = {};
    if (!Array.isArray(invoices)) return map;

    invoices.forEach(inv => {
      const total = Number(inv.total !== undefined ? inv.total : (inv.amount || 0));
      const paid = Number(inv.paidAmount !== undefined && inv.paidAmount !== null 
        ? inv.paidAmount 
        : parsePayments(inv.payments).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      );
      const due = Math.max(0, total - paid);
      const isPaid = inv.status?.toLowerCase() === 'paid' || (due <= 0.001 && total > 0);

      if (!isPaid && due > 0.01) {
        const cust = getCustomerInfo(inv);
        const keys = [inv.customerId, inv.leadId, cust.id, cust.company, cust.name].filter(Boolean);
        keys.forEach(k => {
          if (!map[k]) map[k] = { totalDue: 0, unpaidCount: 0 };
          map[k].totalDue += due;
          map[k].unpaidCount += 1;
        });
      }
    });
    return map;
  }, [invoices, customers, leads, quotations]);

  const filteredInvoices = invoices.filter(inv => {
    const cust = getCustomerInfo(inv);
    const pay = getInvoicePaymentInfo(inv);
    
    const q = search.toLowerCase();
    const searchMatch = !search || 
      inv.id?.toLowerCase().includes(q) || 
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
      (inv.quotationId && inv.quotationId.toLowerCase().includes(q)) ||
      (inv.quotationNo && inv.quotationNo.toLowerCase().includes(q)) ||
      (inv.poNo && inv.poNo.toLowerCase().includes(q)) ||
      (inv.orderNo && inv.orderNo.toLowerCase().includes(q)) ||
      (inv.attention && inv.attention.toLowerCase().includes(q)) ||
      (cust.name && cust.name.toLowerCase().includes(q)) ||
      (cust.company && cust.company.toLowerCase().includes(q));

    const isProforma = Boolean(inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-'));

    let statusMatch = true;
    if (statusFilter !== 'all') {
      const invStatus = (inv.status || '').toLowerCase();
      if (statusFilter === 'proforma') {
        statusMatch = isProforma;
      } else if (statusFilter === 'unpaid') {
        statusMatch = !isProforma && !pay.isSettled && invStatus !== 'draft';
      } else if (statusFilter === 'paid') {
        statusMatch = !isProforma && (pay.isSettled || invStatus === 'paid');
      } else if (statusFilter === 'partial') {
        statusMatch = !isProforma && pay.paid > 0 && !pay.isSettled;
      } else if (statusFilter === 'overdue') {
        statusMatch = !isProforma && (pay.isOverdue || invStatus === 'overdue');
      } else if (statusFilter === 'draft') {
        statusMatch = !isProforma && invStatus === 'draft';
      } else {
        statusMatch = !isProforma && invStatus === statusFilter.toLowerCase();
      }
    } else {
      // By default ('all'), do NOT show Proforma Invoices in the main tax invoices list
      statusMatch = !isProforma;
    }

    let customerMatch = true;
    if (customerFilter !== 'all') {
      customerMatch = inv.customerId === customerFilter || inv.leadId === customerFilter || cust.id === customerFilter;
    }

    let dateMatch = true;
    const invDate = (inv.date || '').slice(0, 10);
    if (startDate && invDate) {
      dateMatch = dateMatch && invDate >= startDate;
    }
    if (endDate && invDate) {
      dateMatch = dateMatch && invDate <= endDate;
    }

    return searchMatch && statusMatch && customerMatch && dateMatch;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'draft': return <Badge variant="default">Draft</Badge>;
      case 'proforma': return <Badge variant="info">Proforma</Badge>;
      case 'sent': return <Badge variant="info">Sent</Badge>;
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'overdue': return <Badge variant="error">Overdue</Badge>;
      case 'unpaid': return <Badge variant="warning">Unpaid</Badge>;
      case 'partial': case 'partially paid': return <Badge variant="warning">Partial</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'id', header: 'Invoice #', sortable: true,
      render: (val: any, item) => {
        const isUSD = item.currency === 'USD' || item.taxProfileId === 'tp_export_zero_rated';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="font-bold text-primary cursor-pointer hover:text-blue-500 flex items-center gap-1.5" onClick={() => setViewInvoice(item)}>
                {isUSD && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm shadow-blue-500/50" title="USD Foreign Export Invoice" />
                )}
                <span>{item.invoiceNo || val}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenChangeNoModal(item);
                }}
                className="text-muted hover:text-blue-500 p-0.5 rounded transition-colors"
                title="Change Invoice Number"
              >
                <Edit3 size={11} />
              </button>
              {(item.isProforma || item.invoiceType === 'proforma' || String(item.id || '').startsWith('PI-')) && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold uppercase">
                  Proforma
                </span>
              )}
            </div>
            {(item.quotationId || item.quotationNo) && (
              <div className="text-[10px] text-muted font-mono">
                Quote: {item.quotationNo || item.quotationId}
              </div>
            )}
            {item.dispatchNo && (
              <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Dispatch: {item.dispatchNo}
              </div>
            )}
            {item.orderNo && (
              <div className="text-[9px] text-muted font-mono">
                SO: {item.orderNo}
              </div>
            )}
            {item.poNo && (
              <div className="text-[9px] text-muted">
                PO: {item.poNo}
              </div>
            )}
          </div>
        </div>
        );
      }
    },
    {
      key: 'customer', header: 'Customer',
      render: (_, item) => {
        const cust = getCustomerInfo(item);
        const custKey = cust.id || cust.company || cust.name;
        const dues = custKey ? customerDuesMap[custKey] : null;
        const showContact = cust.name && cust.company && cust.name.trim().toLowerCase() !== cust.company.trim().toLowerCase();
        
        return (
          <div className="max-w-[240px]">
            <div 
              className="font-semibold text-primary truncate hover:text-blue-500 cursor-pointer text-sm" 
              onClick={() => cust.id ? navigate(`/crm/customers/${cust.id}`) : setViewInvoice(item)}
              title={cust.company || cust.name}
            >
              {cust.company || cust.name}
            </div>
            {showContact && (
              <div className="text-[11px] text-secondary truncate mt-0.5" title={cust.name}>
                {cust.name}
              </div>
            )}
            {item.attention && item.attention !== cust.name && item.attention !== cust.company && (
              <div className="text-[10px] text-muted truncate">
                Attn: {item.attention}
              </div>
            )}
            {dues && dues.totalDue > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <span 
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  title={`Customer total pending balance: ${formatCurrency(dues.totalDue)} across ${dues.unpaidCount} invoice(s)`}
                >
                  <AlertCircle size={10} className="flex-shrink-0" />
                  <span>Cust. Due: {formatCurrency(dues.totalDue)}</span>
                </span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'date', header: 'Date', sortable: true,
      render: (val: any, item) => {
        const pay = getInvoicePaymentInfo(item);
        return (
          <div>
            <div className="text-secondary text-xs">{val ? new Date(val).toLocaleDateString() : '—'}</div>
            {item.dueDate ? (
              <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${pay.isOverdue ? 'text-rose-500 font-semibold' : 'text-muted'}`}>
                <Clock size={10} />
                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted">{val ? relativeTime(val) : ''}</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'total', header: 'Amount', sortable: true,
      render: (val: any, item) => (
        <div>
          <span className="font-mono font-semibold text-primary text-sm">
            {formatCurrency(Number(val || item.amount || 0), false, item.currency || 'LKR')}
          </span>
          {Number(item.taxAmount || item.tax || 0) > 0 && (
            <div className="text-[10px] text-muted font-mono">
              Tax: {formatCurrency(Number(item.taxAmount || item.tax || 0), false, item.currency || 'LKR')}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'dueSnapshot', header: 'Payment & Due Snapshot',
      render: (_, item) => {
        const pay = getInvoicePaymentInfo(item);
        const invCurr = item.currency || 'LKR';
        
        if (pay.isSettled) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                <CheckCircle size={12} /> Settled
              </span>
              <span className="text-[10px] text-muted font-mono">
                Paid: {formatCurrency(pay.paid || pay.total, false, invCurr)}
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1 min-w-[160px] max-w-[210px]">
            {/* Due badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${
                pay.isOverdue 
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}>
                <span className="text-[9px] uppercase tracking-wider font-sans opacity-75">Due:</span>
                <span>{formatCurrency(pay.due, false, invCurr)}</span>
              </span>
              {pay.isOverdue && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-0.5">
                  <AlertTriangle size={9} /> {pay.overdueDays}d Late
                </span>
              )}
            </div>

            {/* Paid breakdown & mini progress bar */}
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span>Paid: {formatCurrency(pay.paid, false, invCurr)}</span>
              <span>{pay.paidPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-theme-subtle/40 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  pay.isOverdue ? 'bg-rose-500' : pay.paid > 0 ? 'bg-amber-500' : 'bg-blue-500/30'
                }`} 
                style={{ width: `${Math.max(pay.paidPercent, 4)}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    {
      key: 'status', header: 'Status', sortable: true,
      render: (val: any) => getStatusBadge(val)
    },
    {
      key: 'traceability', header: 'Traceability', align: 'center',
      render: (_: any, item: any) => {
        const traces: TraceNode[] = [];

        // 1. Linked Sales / Customer Order
        const linkedOrder = allOrders.find((o: any) => 
          (item.orderNo && o.orderNo === item.orderNo) ||
          (item.orderId && (String(o.id) === String(item.orderId) || String(o.orderNo) === String(item.orderId)))
        );
        if (linkedOrder || item.orderNo) {
          const ordNo = linkedOrder?.orderNo || item.orderNo;
          traces.push({
            type: 'order',
            title: 'Sales Order',
            reference: ordNo,
            subtitle: `Customer: ${linkedOrder?.customerName || item.customer || ''}`,
            statusBadge: { label: linkedOrder?.status || 'Order', variant: 'info' },
            navigateUrl: `/crm/sales-orders?search=${encodeURIComponent(ordNo)}`
          });
        }

        // 2. Linked Quotation
        const quoteNo = item.quotationNo || item.quotationId || linkedOrder?.quotationNo;
        if (quoteNo) {
          traces.push({
            type: 'quotation',
            title: 'Quotation',
            reference: quoteNo,
            subtitle: 'Commercial Quotation',
            statusBadge: { label: 'Quote', variant: 'info' },
            navigateUrl: `/crm/quotations?search=${encodeURIComponent(quoteNo)}`
          });
        }

        // 3. Linked Work Order
        const linkedWo = workOrders.find((w: any) => 
          (item.orderNo && (w.orderNo === item.orderNo || (w.title && w.title.includes(item.orderNo)))) ||
          (quoteNo && ((w.quotationNo && w.quotationNo === quoteNo) || (w.sourceQuoteId && String(w.sourceQuoteId) === String(item.quotationId)))) ||
          (linkedOrder && ((w.orderNo && w.orderNo === linkedOrder.orderNo) || (w.sourceQuoteId && String(w.sourceQuoteId) === String(linkedOrder.quoteId))))
        );
        if (linkedWo) {
          traces.push({
            type: 'work_order',
            title: 'Work Order',
            reference: linkedWo.orderNo || linkedWo.id,
            subtitle: `Production Job • ${linkedWo.title || ''}`,
            statusBadge: { 
              label: linkedWo.status || 'Production', 
              variant: linkedWo.status === 'Completed' ? 'success' : 'warning' 
            },
            navigateUrl: `/production/work-orders?search=${encodeURIComponent(linkedWo.orderNo || linkedWo.id)}`
          });
        }

        // 4. Dispatch / Gate Pass
        const gpNo = item.dispatchNo || linkedOrder?.gatePassNo;
        if (gpNo) {
          traces.push({
            type: 'gate_pass',
            title: 'Security Gate Pass',
            reference: gpNo,
            subtitle: 'Dispatched Goods',
            statusBadge: { label: 'Dispatched', variant: 'success' },
            navigateUrl: '/inventory'
          });
        }

        // 5. Purchase Order (if PO ref exists on invoice)
        if (item.poNo) {
          traces.push({
            type: 'po',
            title: 'Customer PO Ref',
            reference: item.poNo,
            subtitle: 'Client Purchase Order',
            statusBadge: { label: 'Client PO', variant: 'neutral' }
          });
        }

        // 6. Payment Status
        const pay = getInvoicePaymentInfo(item);
        const invCurr = item.currency || linkedOrder?.currency || (item.isForeign ? 'USD' : 'LKR');
        if (pay.paid > 0) {
          traces.push({
            type: 'receipt',
            title: pay.isSettled ? 'Settled Payment' : 'Partial Payment',
            reference: `${formatCurrency(pay.paid, false, invCurr)} Paid`,
            subtitle: pay.isSettled ? 'Paid in Full' : `Remaining Due: ${formatCurrency(pay.due, false, invCurr)}`,
            statusBadge: { 
              label: pay.isSettled ? 'Settled' : 'Part Paid', 
              variant: pay.isSettled ? 'success' : 'warning' 
            },
            onClick: () => setViewInvoice(item)
          });
        }

        return (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
            <TraceabilityDropdown
              title={`Invoice #${item.id}`}
              traces={traces}
            />
          </div>
        );
      }
    },
    {
      key: 'actions', header: '',
      render: (_, item) => (
        <div className="flex gap-1.5 justify-end items-center">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium" onClick={() => setViewInvoice(item)}>
            View
          </Button>
          {canEditInvoice && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs font-medium text-muted hover:text-blue-500" 
              onClick={() => navigate(`/finance/invoices/new?editInvoiceId=${encodeURIComponent(item.id)}`)}
              title="Edit Invoice"
            >
              <Edit3 size={13} />
            </Button>
          )}
          {canEditInvoice && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs font-medium text-muted hover:text-blue-500" 
              onClick={() => handleOpenChangeNoModal(item)}
              title="Change Invoice Number"
            >
              <Hash size={13} />
            </Button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setDeleteTarget(item.id)} 
              className="p-1.5 text-muted hover:text-red-500 rounded transition-colors"
              title="Delete Invoice"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Invoices</h1>
          <p className="text-sm text-secondary mt-1">Manage billing, payments, and view real-time settlement snapshots.</p>
        </div>
        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="finance-invoices" />
          <Button variant="outline" icon={Receipt} onClick={() => navigate('/finance/receivables?tab=receipts')}>
            Receipts Monitor
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/finance/invoices/new')}>Create Invoice</Button>
        </div>
      </div>

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={6} />

      {/* Comprehensive Filter Toolbar */}
      <GlassCard className="p-3 space-y-3">
        {/* Row 1: Status Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'proforma', 'unpaid', 'partial', 'paid', 'overdue', 'draft', 'sent'].map(s => {
              const label = s === 'proforma' 
                ? `Proforma (${proformaCount})` 
                : s === 'partial' 
                ? 'Partially Paid' 
                : s;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-all uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                    statusFilter === s 
                      ? s === 'proforma'
                        ? 'bg-blue-600 text-white border border-blue-600 font-bold shadow-xs'
                        : 'bg-rex-500/10 border border-rex-500/35 text-rex-700 dark:text-rex-300 font-bold shadow-xs' 
                      : s === 'proforma' && proformaCount > 0
                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20'
                        : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Search invoices, customer, quote, PO..." 
            className="w-full sm:w-80" 
          />
        </div>

        {/* Row 2: Customer Filter, Date Range Picker & Clear All */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-theme-subtle text-xs">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-muted shrink-0" />
            <span className="text-muted font-bold uppercase tracking-wider text-[11px]">Customer:</span>
            <div className="w-52">
              <CustomerAutocomplete
                value={customerFilter}
                onChange={(cId) => setCustomerFilter(cId || 'all')}
                customers={customers}
                placeholder="Filter customer..."
                allOptionLabel={`All Customers (${customers.length})`}
                className="py-1 text-xs"
              />
            </div>
          </div>

          <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted font-bold uppercase tracking-wider text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
            <span className="text-muted font-bold uppercase tracking-wider text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                setStartDate(`${y}-${m}-01`);
                setEndDate(now.toISOString().slice(0, 10));
              }}
              className="px-2 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded text-[11px] text-secondary hover:text-primary transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                setStartDate(past.toISOString().slice(0, 10));
                setEndDate(now.toISOString().slice(0, 10));
              }}
              className="px-2 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded text-[11px] text-secondary hover:text-primary transition-colors"
            >
              Last 30 Days
            </button>
            {(statusFilter !== 'all' || customerFilter !== 'all' || startDate || endDate || search) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCustomerFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                }}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded font-semibold text-[11px] transition-colors ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading invoices...</div>
        ) : (
          <DataTable columns={columns} data={filteredInvoices} keyExtractor={item => item.id} pagination itemsPerPage={25} itemLabel="invoices" />
        )}
      </GlassCard>

      {/* Invoice View Modal */}
      {viewInvoice && (
        <Modal isOpen={true} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.invoiceNo || viewInvoice.id}`} size="2xl" className="rounded-2xl">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left side: Invoice Preview */}
            <div className="flex-1 bg-[#525659] p-4 lg:p-8 max-h-[85vh] overflow-y-auto flex justify-center border-r border-theme-subtle">
              <div className="shadow-2xl">
              <InvoicePreview 
                template="government"
                isProforma={Boolean(viewInvoice.isProforma || viewInvoice.invoiceType === 'proforma' || String(viewInvoice.id || '').startsWith('PI-'))}
                invoiceType={viewInvoice.invoiceType || (viewInvoice.isProforma ? 'proforma' : 'tax_invoice')}
                docNo={viewInvoice.invoiceNo || viewInvoice.id}
                date={viewInvoice.date}
                dueDate={viewInvoice.dueDate}
                deliveryDate={viewInvoice.deliveryDate || viewInvoice.date}
                placeOfSupply={viewInvoice.placeOfSupply || 'Negombo'}
                modeOfPayment={viewInvoice.modeOfPayment || 'Credit'}
                additionalInfo={viewInvoice.additionalInfo || ''}
                attention={viewInvoice.attention || ''}
                quotationNo={viewInvoice.quotationNo || viewInvoice.quotationId || ''}
                dispatchNo={viewInvoice.dispatchNo || ''}
                orderNo={viewInvoice.orderNo || ''}
                poNo={viewInvoice.poNo || (() => {
                  const linked = allOrders.find((o: any) => 
                    (viewInvoice.orderNo && o.orderNo === viewInvoice.orderNo) ||
                    (viewInvoice.orderId && (String(o.id) === String(viewInvoice.orderId) || String(o.orderNo) === String(viewInvoice.orderId)))
                  );
                  return linked?.customerPoNo || linked?.poNo || '';
                })()}
                customer={{
                  ...getCustomerInfo(viewInvoice),
                  address: getCustomerInfo(viewInvoice).address || viewInvoice.customerAddress || viewInvoice.deliveryAddress || ''
                }}
                customerAddress={getCustomerInfo(viewInvoice).address || viewInvoice.customerAddress || viewInvoice.deliveryAddress || ''}
                customerPhone={getCustomerInfo(viewInvoice).phone || viewInvoice.customerPhone || ''}
                customerVat={viewInvoice.customerVat || getCustomerInfo(viewInvoice).vat || ''}
                items={viewInvoice.items ? (typeof viewInvoice.items === 'string' ? JSON.parse(viewInvoice.items) : viewInvoice.items).map((i: any) => ({ 
                  reference: i.reference || '',
                  description: i.desc || i.description, 
                  details: i.details,
                  specifications: i.specifications,
                  qty: Number(i.qty), 
                  unitPrice: Number(i.price || i.unitPrice),
                  originalAmount: i.originalAmount,
                  advancePercent: i.advancePercent
                })) : []}
                subtotal={Number(viewInvoice.subtotal)}
                taxAmount={Number(viewInvoice.taxAmount || viewInvoice.tax || 0)}
                total={Number(viewInvoice.total)}
                grossAmount={Number(viewInvoice.grossAmount || 0)}
                isTaxInclusive={Boolean(viewInvoice.isTaxInclusive)}
                hideVatSeparately={Boolean(viewInvoice.hideVatSeparately)}
                notes={viewInvoice.notes || ''}
                company={settings}
                getTaxRate={() => 0}
                taxRates={[]}
                taxType={viewInvoice.taxType}
                taxProfile={taxProfiles?.find((p: any) => p.id === viewInvoice.taxProfileId)}
                taxBreakdown={viewInvoice.taxBreakdown ? (typeof viewInvoice.taxBreakdown === 'string' ? JSON.parse(viewInvoice.taxBreakdown) : viewInvoice.taxBreakdown) : null}
                bankDetails={((): any => {
                  if (viewInvoice.bankDetails) {
                    if (typeof viewInvoice.bankDetails === 'object') return viewInvoice.bankDetails;
                    try { return JSON.parse(viewInvoice.bankDetails); } catch (e) { return viewInvoice.bankDetails; }
                  }
                  if (viewInvoice.bankDetailId === 'none') return 'none';
                  return viewInvoice.bankDetailId || null;
                })()}
                advanceDeducted={Number(viewInvoice.advanceDeducted || 0)}
                receiptNos={viewInvoice.receiptNos || ''}
                {...(() => {
                  const custInfo = getCustomerInfo(viewInvoice);
                  const linkedOrder = (allOrders || []).find((o: any) => 
                    (viewInvoice.orderNo && o.orderNo === viewInvoice.orderNo) ||
                    (viewInvoice.orderId && (String(o.id) === String(viewInvoice.orderId) || String(o.orderNo) === String(viewInvoice.orderId)))
                  );
                  const isForeignExport = Boolean(
                    viewInvoice.currency === 'USD' ||
                    linkedOrder?.currency === 'USD' ||
                    linkedOrder?.isForeign ||
                    viewInvoice.taxProfileId === 'tp_export_zero_rated' ||
                    (custInfo as any)?.isForeign ||
                    (custInfo as any)?.currency === 'USD'
                  );
                  const resolvedCur = isForeignExport ? 'USD' : (viewInvoice.currency || linkedOrder?.currency || (custInfo as any)?.currency || 'LKR');
                  const resolvedRate = Number(viewInvoice.exchangeRate || linkedOrder?.exchangeRate || (resolvedCur === 'USD' ? 310 : 1));

                  const rawDisc = Number(viewInvoice.discount ?? linkedOrder?.discount ?? 0);
                  const rawDiscType = (viewInvoice.discountType || linkedOrder?.discountType || 'percent') as 'percent' | 'amount';
                  const rawDiscAmt = Number(viewInvoice.discountAmount ?? linkedOrder?.discountAmount ?? (rawDiscType === 'amount' ? rawDisc : 0));
                  return {
                    currency: resolvedCur,
                    exchangeRate: resolvedRate,
                    discount: rawDisc,
                    discountType: rawDiscType,
                    discountAmount: rawDiscAmt
                  };
                })()}
              />
              </div>
            </div>
            
            {/* Right side: Sidebar (Payments & Actions) */}
            <div className="w-full lg:w-80 flex flex-col bg-surface">
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Payment History</h4>
                  {viewInvoice.status !== 'paid' && canRecordPayment && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 px-2 rounded-md" 
                      onClick={() => {
                        const isUSD = Boolean(viewInvoice.currency === 'USD' || viewInvoice.currency === '$' || viewInvoice.taxProfileId === 'tp_export_zero_rated' || viewInvoice.isForeign);
                        setPaymentData({
                          amount: '',
                          method: isUSD ? 'Bank Wire / TT' : 'Bank Transfer',
                          accountId: isUSD ? (settings?.usd_master_account_id || 'acc_1010') : '',
                          reference: '',
                          depositSlip: ''
                        });
                        setShowPaymentModal(true);
                      }}
                    >
                      + Record
                    </Button>
                  )}
                </div>
                
                {(() => {
                  const isUSD = Boolean(
                    viewInvoice.currency === 'USD' || 
                    viewInvoice.currency === '$' || 
                    viewInvoice.taxProfileId === 'tp_export_zero_rated' || 
                    viewInvoice.isForeign
                  );
                  const invCurr = isUSD ? 'USD' : (viewInvoice.currency || 'LKR');
                  const invTotal = Number(viewInvoice.total !== undefined && viewInvoice.total !== null ? viewInvoice.total : (viewInvoice.amount || 0));
                  const invPaid = Number(viewInvoice.paidAmount || 0);
                  const invBalance = Math.max(0, invTotal - invPaid);
                  const paymentList = parsePayments(viewInvoice.payments);
                  return (
                    <>
                      <div className="bg-surface2/60 border border-theme-subtle rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted">
                          <span>Total Amount:</span>
                          <span className="font-mono font-bold text-primary">{formatCurrency(invTotal, false, invCurr)}</span>
                        </div>
                        {Number(viewInvoice.discountAmount || 0) > 0 && (
                          <div className="flex justify-between text-muted">
                            <span>Discount:</span>
                            <span className="font-mono font-bold text-rose-500">
                              -{formatCurrency(Number(viewInvoice.discountAmount), false, invCurr)} {viewInvoice.discountType === 'percent' && Number(viewInvoice.discount) > 0 ? `(${viewInvoice.discount}%)` : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted">
                          <span>Paid to Date:</span>
                          <span className="font-mono font-bold text-emerald-600">{formatCurrency(invPaid, false, invCurr)}</span>
                        </div>
                        <div className="flex justify-between text-muted border-t border-theme-subtle/50 pt-1.5">
                          <span className="font-semibold text-secondary">Balance Due:</span>
                          <span className={`font-mono font-bold ${invBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {formatCurrency(invBalance, false, invCurr)}
                          </span>
                        </div>
                      </div>

                      {paymentList.length > 0 ? (
                        <div className="space-y-2">
                          {paymentList.map((p: any, i: number) => {
                            const cust = getCustomerInfo(viewInvoice);
                            const paymentCur = p.currency || invCurr;
                            return (
                              <div key={p.id || i} className="bg-surface2 p-3 rounded-xl border border-theme-subtle flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-bold">{p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</p>
                                    <span className="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(Number(p.amount) || 0, false, paymentCur)}</span>
                                  </div>
                                  <p className="text-[10px] text-muted uppercase">{p.method || 'Cash'} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                                  {p.receiptNo && (
                                    <p className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                      Receipt: {p.receiptNo}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Printer}
                                  className="h-7 text-[11px] px-2 py-0 shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => {
                                    setPrintReceiptData({
                                      receiptNo: p.receiptNo || `REC-${(viewInvoice.invoiceNo || viewInvoice.id).replace(/^INV-/, '')}-${i + 1}`,
                                      invoiceId: viewInvoice.id,
                                      invoiceNo: viewInvoice.invoiceNo || viewInvoice.id,
                                      date: p.date || new Date().toISOString(),
                                      amount: Number(p.amount) || 0,
                                      currency: paymentCur,
                                      exchangeRate: p.exchangeRate || viewInvoice.exchangeRate || (paymentCur === 'USD' ? 310 : 1),
                                      paymentMethod: p.method || 'Cash',
                                      reference: p.reference || '',
                                      accountId: p.accountId,
                                      accountName: p.accountName,
                                      customerId: viewInvoice.customerId || viewInvoice.leadId || '',
                                      customerName: cust.company || cust.name || 'Customer',
                                      customerCompany: cust.company || '',
                                      customerAddress: (cust as any)?.address || '',
                                      customerPhone: cust.phone || '',
                                      customerEmail: cust.email || '',
                                      balanceDue: invBalance
                                    });
                                  }}
                                  title="Print Official Payment Receipt"
                                >
                                  Receipt
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-surface2/50 rounded-xl border border-dashed border-theme-subtle text-center">
                          <p className="text-[11px] text-muted italic">No payments recorded</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Actions Footer */}
              <div className="p-5 border-t border-theme-subtle bg-surface2/30">
                <p className="text-[10px] font-bold text-muted uppercase mb-3">Change Status</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['draft', 'sent', 'paid', 'overdue'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(viewInvoice.id, s)}
                      className={`text-[11px] font-bold uppercase tracking-wider py-1.5 rounded-md whitespace-nowrap border transition-colors ${
                        viewInvoice.status === s 
                          ? 'bg-primary text-surface border-primary' 
                          : 'bg-surface text-muted border-theme-subtle hover:bg-surface2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {canEditInvoice && (
                    <Button 
                      variant="outline" 
                      icon={Edit3}
                      className="h-9 text-xs border border-blue-500/30 text-blue-600 hover:bg-blue-500/10 font-bold"
                      onClick={() => {
                        navigate(`/finance/invoices/new?editInvoiceId=${encodeURIComponent(viewInvoice.id)}`);
                      }}
                    >
                      Edit Invoice
                    </Button>
                  )}
                  {canEditInvoice && (
                    <Button 
                      variant="outline" 
                      icon={Hash}
                      className="h-9 text-xs border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-bold"
                      onClick={() => {
                        handleOpenChangeNoModal(viewInvoice);
                      }}
                    >
                      Change No.
                    </Button>
                  )}
                  <Button 
                    variant="primary" 
                    icon={Mail} 
                    className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() => {
                      const cust = getCustomerInfo(viewInvoice);
                      const invTotal = Number(viewInvoice.total !== undefined && viewInvoice.total !== null ? viewInvoice.total : (viewInvoice.amount || 0));
                      setEmailModalData({
                        documentNumber: viewInvoice.id,
                        customerName: cust.company || cust.name || 'Customer',
                        customerEmail: cust.email || '',
                        totalAmount: invTotal,
                        elementIdToPdf: 'invoice-preview'
                      });
                    }}
                  >
                    Email
                  </Button>
                  <Button 
                    variant="primary" 
                    icon={Printer}
                    className="h-9 text-xs font-bold" 
                    onClick={() => {
                      printElement('invoice-preview', `Invoice_${viewInvoice.invoiceNo || viewInvoice.id || 'INV'}`);
                    }}
                  >
                    Print Invoice
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-9 text-xs border border-blue-500/30 text-blue-500 hover:bg-blue-500/10" 
                    onClick={() => {
                      exportPdf('invoice-preview', `Invoice_${viewInvoice.invoiceNo || viewInvoice.id || 'INV'}.pdf`);
                    }}
                  >
                    Export PDF
                  </Button>
                  <Button variant="ghost" className="h-9 text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={() => setDeleteTarget(viewInvoice.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {emailModalData && (
        <SendDocumentEmailModal
          isOpen={!!emailModalData}
          onClose={() => setEmailModalData(null)}
          documentType="invoice"
          documentNumber={emailModalData.documentNumber}
          customerName={emailModalData.customerName}
          customerEmail={emailModalData.customerEmail}
          totalAmount={emailModalData.totalAmount}
          elementIdToPdf={emailModalData.elementIdToPdf}
        />
      )}

      {/* Change Invoice Number Modal */}
      {changeNoModalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setChangeNoModalTarget(null)}
          title="Change Invoice Number"
        >
          <form onSubmit={handleSubmitChangeNumber} className="p-4 space-y-4">
            <p className="text-xs text-muted">
              Update the invoice number. Linked sales orders, GL journal entries, and payment receipts will be automatically synchronized.
            </p>

            <div className="bg-surface2/60 border border-theme-subtle rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Current Invoice Number:</span>
                <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-surface border border-theme-subtle">
                  {changeNoModalTarget.invoiceNo || changeNoModalTarget.id}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary">New Invoice Number</label>
                <button
                  type="button"
                  onClick={handleGenerateNextForModal}
                  className="text-[10px] font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/20 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Auto Sequence #
                </button>
              </div>
              <input
                type="text"
                value={newInvoiceNoInput}
                onChange={e => setNewInvoiceNoInput(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. 26OCT_REX_00001 or INV-1001"
                className="w-full bg-surface border border-theme-subtle focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-blue-500 outline-none"
                autoFocus
              />
              <p className="text-[10px] text-muted">
                Spaces are stripped automatically. Max 40 characters.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-subtle">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setChangeNoModalTarget(null)}
                disabled={isRenumbering}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isRenumbering || !newInvoiceNoInput.trim()}
              >
                {isRenumbering ? 'Updating...' : 'Save New Number'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
        <div className="p-4">
          <p className="text-sm text-secondary mb-4">
            Are you sure you want to delete this invoice?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDelete} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentModal && viewInvoice && (() => {
        const isUSD = Boolean(
          viewInvoice.currency === 'USD' ||
          viewInvoice.currency === '$' ||
          viewInvoice.taxProfileId === 'tp_export_zero_rated' ||
          viewInvoice.isForeign
        );
        const invCurr = isUSD ? 'USD' : (viewInvoice.currency || 'LKR');
        const invTotal = Number(viewInvoice.total !== undefined && viewInvoice.total !== null ? viewInvoice.total : (viewInvoice.amount || 0));
        const invPaid = Number(viewInvoice.paidAmount || 0);
        const invBalance = Math.max(0, invTotal - invPaid);

        return (
          <Modal isOpen={true} onClose={() => setShowPaymentModal(false)} title={`Record Payment — ${viewInvoice.invoiceNo || viewInvoice.id}`} size="lg">
            <div className="p-6 space-y-4">
              <div className="p-4 bg-surface2/60 border border-theme-subtle rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                <div>
                  <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Customer</span>
                  <span className="font-bold text-primary">{viewInvoice.customerName || viewInvoice.customerCompany || 'Customer'}</span>
                </div>
                {isUSD && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    ★ USD Export Zero-Rated ($)
                  </span>
                )}
                <div className="text-right">
                  <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Balance Due</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatCurrency(invBalance, false, invCurr)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
                  Amount ({isUSD ? '$ USD' : 'Rs. LKR'}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-muted text-xs">
                    {isUSD ? '$' : 'Rs.'}
                  </span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={paymentData.amount}
                    onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full bg-surface border border-theme-subtle rounded-lg pl-10 pr-3 py-2 text-primary font-mono font-bold focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                    placeholder={`Due: ${invBalance.toFixed(2)}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Payment Method</label>
                <select 
                  value={paymentData.method}
                  onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all cursor-pointer"
                >
                  {isUSD ? (
                    <>
                      <option value="Bank Wire / TT">Bank Wire / TT (Foreign Inward Remittance)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                      <option value="Cash">Cash (Foreign Currency)</option>
                    </>
                  ) : (
                    <>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                      <option>Card</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
                  Deposit To ({isUSD ? 'Foreign USD Bank' : 'Bank / Cash Account'})
                </label>
                <select 
                  value={paymentData.accountId}
                  onChange={e => setPaymentData({ ...paymentData, accountId: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">{isUSD ? 'Master USD Account (acc_1010)' : `Default Account (Auto match ${paymentData.method})`}</option>
                  {accounts
                    .filter(a => a.type === 'Asset' && (a.subtype === 'Bank' || a.subtype === 'Cash' || a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('cash')))
                    .sort((a, b) => {
                      if (isUSD) {
                        const aIsUsd = a.id === (settings?.usd_master_account_id || 'acc_1010') || /usd|foreign/i.test(a.name);
                        const bIsUsd = b.id === (settings?.usd_master_account_id || 'acc_1010') || /usd|foreign/i.test(b.name);
                        if (aIsUsd && !bIsUsd) return -1;
                        if (!aIsUsd && bIsUsd) return 1;
                      }
                      return (a.code || '').localeCompare(b.code || '');
                    })
                    .map(a => {
                      const isAccUsd = a.id === (settings?.usd_master_account_id || 'acc_1010') || /usd|foreign/i.test(a.name);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.code ? `[${a.code}] ` : ''}{a.name} ({a.subtype || 'Asset'} — {isAccUsd ? `$ ${Number(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `Rs. ${Number(a.balance || 0).toLocaleString()}`})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Reference (Optional)</label>
                <input 
                  type="text" 
                  value={paymentData.reference}
                  onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle rounded-lg px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                  placeholder={isUSD ? "e.g. TT-WIRE-902144 or USD-REF" : "Txn ID, Cheque No..."}
                />
              </div>

              {/* Bank Deposit / Transfer Slip Attachment */}
              <div className="space-y-1.5 p-3 rounded-lg bg-surface2/60 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Paperclip size={13} className="text-purple-500" /> Bank Deposit / Transfer Slip (බැංකු තැන්පතු ස්ලිප්පුව)
                  </label>
                  {paymentData.depositSlip && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle size={11} /> Attached
                    </span>
                  )}
                </div>

                {!paymentData.depositSlip ? (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-theme-subtle hover:border-purple-500/50 rounded-lg bg-surface/50 hover:bg-purple-500/5 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2 text-secondary group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      <Upload size={16} />
                      <span className="text-xs font-semibold">
                        {isUploadingSlip ? 'Uploading deposit slip...' : 'Attach Deposit Slip (Image / PDF)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted mt-0.5">JPG, PNG, WebP or PDF receipt</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={isUploadingSlip}
                      onChange={handleInvoiceSlipUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-surface border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {paymentData.depositSlip.startsWith('data:image') || /\.(jpg|jpeg|png|webp)($|\?)/i.test(paymentData.depositSlip) ? (
                        <img src={paymentData.depositSlip} alt="Deposit Slip" className="w-10 h-10 object-cover border border-theme-subtle rounded shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-purple-500/10 text-purple-600 flex items-center justify-center rounded shrink-0">
                          <FileText size={18} />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-xs font-bold text-primary block truncate">Bank Deposit Slip Attached</span>
                        <span className="text-[10px] text-muted">Will be visible in Cash Flow</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={paymentData.depositSlip}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-secondary hover:text-primary transition-colors"
                        title="Preview Slip"
                      >
                        <Eye size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setPaymentData(prev => ({ ...prev, depositSlip: '' }))}
                        className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors"
                        title="Remove Slip"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-theme-subtle">
                <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleAddPayment} disabled={submitting || !paymentData.amount}>
                  {submitting ? 'Saving...' : 'Save Payment & Update GL'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Create Manual Invoice Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Create Blank Invoice" size="lg">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Customer</label>
                <CustomerAutocomplete
                  value={newInvoiceData.leadId}
                  onChange={(cId) => setNewInvoiceData({ ...newInvoiceData, leadId: cId })}
                  customers={customers}
                  leads={leads}
                  placeholder="Type to search customer (name, company)..."
                  className="py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={newInvoiceData.date}
                    onChange={e => setNewInvoiceData({ ...newInvoiceData, date: e.target.value })}
                    className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newInvoiceData.dueDate}
                    onChange={e => setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })}
                    className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wider">Line Items</label>
              <div className="space-y-2">
                {newInvoiceData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.desc}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].desc = e.target.value
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="flex-1 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].qty = Number(e.target.value)
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="w-20 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.price}
                      onChange={e => {
                        const newItems = [...newInvoiceData.items]
                        newItems[idx].price = Number(e.target.value)
                        setNewInvoiceData({ ...newInvoiceData, items: newItems })
                      }}
                      className="w-32 bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 outline-none text-sm"
                    />
                    <div className="w-32 py-2 px-3 bg-surface/50 border border-transparent text-right font-mono text-sm">
                      {formatCurrency(item.qty * item.price)}
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 px-2" onClick={() => {
                      const newItems = newInvoiceData.items.filter((_, i) => i !== idx)
                      setNewInvoiceData({ ...newInvoiceData, items: newItems.length ? newItems : [{ desc: '', qty: 1, price: 0 }] })
                    }}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => {
                setNewInvoiceData({ ...newInvoiceData, items: [...newInvoiceData.items, { desc: '', qty: 1, price: 0 }] })
              }}>
                + Add Item
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-theme-subtle">
              <div className="w-64">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="font-mono text-rex-600">
                    {formatCurrency(newInvoiceData.items.reduce((sum, item) => sum + (item.qty * item.price), 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateManualInvoice} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Payment Receipt Modal */}
      <PaymentReceiptPrintModal
        isOpen={!!printReceiptData}
        onClose={() => setPrintReceiptData(null)}
        receipt={printReceiptData}
        settings={settings}
      />
    </div>
  )
}
