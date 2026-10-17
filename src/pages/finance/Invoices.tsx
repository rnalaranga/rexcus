import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Filter, FileCheck, Trash2, ExternalLink, CheckCircle, Clock, AlertCircle, AlertTriangle, Mail } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { InvoicePreview } from "@/pages/finance/InvoiceBuilder";
import { useInvoices, useLeads, useCustomers, useQuotations } from '@/hooks/useData'
import { useTaxProfiles, useAccounts } from '@/hooks/useFinance'
import { updateInvoice, deleteInvoice } from '@/lib/api'
import { formatCurrency, relativeTime } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'

export const Invoices: React.FC = () => {
  const navigate = useNavigate()
  const { data: invoices, loading, refetch } = useInvoices()
  const { data: leads } = useLeads()
  const { data: customers } = useCustomers()
  const { data: quotations } = useQuotations()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: accounts } = useAccounts()
  const { settings } = useSettings()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewInvoice, setViewInvoice] = useState<any>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)
  
  const [toast, setToast] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash', accountId: '', reference: '' })
  
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
    setSubmitting(true);
    try {
      const { addInvoicePayment } = await import('@/lib/api');
      const res = await addInvoicePayment(viewInvoice.id, {
        ...paymentData,
        amount: pAmount
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
      setPaymentData({ amount: '', method: 'Cash', accountId: '', reference: '' });
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
    if (!inv) return { id: '', name: 'Unknown Customer', company: 'Unknown Company' };
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
          phone: match.phone || ''
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
          phone: match.phone || ''
        };
      }
    }

    // 3. Data from server query join
    if (inv.customerCompany || inv.customerName) {
      return {
        id: custId || '',
        name: inv.customerName || inv.customerCompany || '',
        company: inv.customerCompany || inv.customerName || '',
        email: inv.customerEmail || '',
        phone: inv.customerPhone || ''
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
              phone: cust.phone || ''
            };
          }
          const lead = leads?.find((l: any) => l.id === quo.leadId);
          if (lead) {
            return {
              id: lead.id,
              name: lead.name || lead.company || '',
              company: lead.company || lead.name || '',
              email: lead.email || '',
              phone: lead.phone || ''
            };
          }
        }
        if (quo.leadCompany || quo.leadName) {
          return {
            id: quo.leadId || '',
            name: quo.leadName || quo.leadCompany || '',
            company: quo.leadCompany || quo.leadName || ''
          };
        }
        try {
          const parsed = JSON.parse(quo.data || '{}');
          if (parsed.customerName || parsed.customerCompany) {
            return {
              id: quo.leadId || '',
              name: parsed.customerName || parsed.customerCompany || '',
              company: parsed.customerCompany || parsed.customerName || ''
            };
          }
        } catch (e) {}
      }
    }

    // 5. Attention field
    if (inv.attention && inv.attention.trim()) {
      return {
        id: custId || '',
        name: inv.attention.trim(),
        company: inv.attention.trim()
      };
    }

    // 6. Alphanumeric ID fallback
    if (custId && custId !== 'WALK-IN') {
      return {
        id: custId,
        name: custId,
        company: custId
      };
    }

    return {
      id: '',
      name: 'Walk-in / Direct Customer',
      company: 'Walk-in Customer'
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

    let statusMatch = true;
    if (statusFilter !== 'all') {
      const invStatus = (inv.status || '').toLowerCase();
      if (statusFilter === 'unpaid') {
        statusMatch = !pay.isSettled && invStatus !== 'draft';
      } else if (statusFilter === 'paid') {
        statusMatch = pay.isSettled || invStatus === 'paid';
      } else if (statusFilter === 'partial') {
        statusMatch = pay.paid > 0 && !pay.isSettled;
      } else if (statusFilter === 'overdue') {
        statusMatch = pay.isOverdue || invStatus === 'overdue';
      } else {
        statusMatch = invStatus === statusFilter.toLowerCase();
      }
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
      render: (val: any, item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <FileText size={16} />
          </div>
          <div>
            <div className="font-bold text-primary cursor-pointer hover:text-blue-500 flex items-center gap-1.5" onClick={() => setViewInvoice(item)}>
              <span>{val}</span>
            </div>
            {(item.quotationId || item.quotationNo) && (
              <div className="text-[10px] text-muted font-mono">
                Quote: {item.quotationNo || item.quotationId}
              </div>
            )}
            {item.poNo && (
              <div className="text-[9px] text-muted">
                PO: {item.poNo}
              </div>
            )}
          </div>
        </div>
      )
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
            {formatCurrency(Number(val || item.amount || 0))}
          </span>
          {Number(item.taxAmount || item.tax || 0) > 0 && (
            <div className="text-[10px] text-muted font-mono">
              Tax: {formatCurrency(Number(item.taxAmount || item.tax || 0))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'dueSnapshot', header: 'Payment & Due Snapshot',
      render: (_, item) => {
        const pay = getInvoicePaymentInfo(item);
        
        if (pay.isSettled) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                <CheckCircle size={12} /> Settled
              </span>
              <span className="text-[10px] text-muted font-mono">
                Paid: {formatCurrency(pay.paid || pay.total)}
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
                <span>{formatCurrency(pay.due)}</span>
              </span>
              {pay.isOverdue && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-0.5">
                  <AlertTriangle size={9} /> {pay.overdueDays}d Late
                </span>
              )}
            </div>

            {/* Paid breakdown & mini progress bar */}
            <div className="flex items-center justify-between text-[10px] text-muted font-mono">
              <span>Paid: {formatCurrency(pay.paid)}</span>
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
      key: 'actions', header: '',
      render: (_, item) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-medium" onClick={() => setViewInvoice(item)}>
            View
          </Button>
          <button 
            onClick={() => setDeleteTarget(item.id)} 
            className="p-1.5 text-muted hover:text-red-500 rounded transition-colors"
            title="Delete Invoice"
          >
            <Trash2 size={14} />
          </button>
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
        <div className="flex gap-2">
          <Button variant="primary" icon={Plus} onClick={() => navigate('/finance/invoices/new')}>Create Invoice</Button>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <GlassCard className="p-3 space-y-3">
        {/* Row 1: Status Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'unpaid', 'partial', 'paid', 'overdue', 'draft', 'sent'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider shrink-0 ${
                  statusFilter === s 
                    ? 'bg-rex-500/10 border border-rex-500/35 text-rex-700 dark:text-rex-300 font-bold shadow-xs' 
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                {s === 'partial' ? 'Partially Paid' : s}
              </button>
            ))}
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
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="bg-surface border border-theme-subtle rounded px-2.5 py-1 text-primary text-xs focus:border-rex-500 outline-none max-w-[200px]"
            >
              <option value="all">All Customers ({customers.length})</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
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
          <DataTable columns={columns} data={filteredInvoices} keyExtractor={item => item.id} />
        )}
      </GlassCard>

      {/* Invoice View Modal */}
      {viewInvoice && (
        <Modal isOpen={true} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice.id}`} size="2xl" className="rounded-2xl">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left side: Invoice Preview */}
            <div className="flex-1 bg-[#525659] p-4 lg:p-8 max-h-[85vh] overflow-y-auto flex justify-center border-r border-theme-subtle">
              <div className="shadow-2xl">
              <InvoicePreview 
                template="government"
                docNo={viewInvoice.id}
                date={viewInvoice.date}
                dueDate={viewInvoice.dueDate}
                deliveryDate={viewInvoice.deliveryDate || viewInvoice.date}
                placeOfSupply={viewInvoice.placeOfSupply || ''}
                modeOfPayment={viewInvoice.modeOfPayment || 'Credit'}
                additionalInfo={viewInvoice.additionalInfo || ''}
                attention={viewInvoice.attention || ''}
                quotationNo={viewInvoice.quotationNo || viewInvoice.quotationId || ''}
                dispatchNo={viewInvoice.dispatchNo || ''}
                orderNo={viewInvoice.orderNo || ''}
                poNo={viewInvoice.poNo || ''}
                customer={getCustomerInfo(viewInvoice)}
                customerVat={viewInvoice.customerVat || ''}
                items={viewInvoice.items ? JSON.parse(viewInvoice.items).map((i: any) => ({ 
                  reference: i.reference || '',
                  description: i.desc || i.description, 
                  qty: Number(i.qty), 
                  unitPrice: Number(i.price || i.unitPrice) 
                })) : []}
                subtotal={Number(viewInvoice.subtotal)}
                taxAmount={Number(viewInvoice.taxAmount || viewInvoice.tax || 0)}
                total={Number(viewInvoice.total)}
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
              />
              </div>
            </div>
            
            {/* Right side: Sidebar (Payments & Actions) */}
            <div className="w-full lg:w-80 flex flex-col bg-surface">
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Payment History</h4>
                  {viewInvoice.status !== 'paid' && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 px-2 rounded-md" onClick={() => setShowPaymentModal(true)}>
                      + Record
                    </Button>
                  )}
                </div>
                
                {(() => {
                  const invTotal = Number(viewInvoice.total !== undefined && viewInvoice.total !== null ? viewInvoice.total : (viewInvoice.amount || 0));
                  const invPaid = Number(viewInvoice.paidAmount || 0);
                  const invBalance = Math.max(0, invTotal - invPaid);
                  const paymentList = parsePayments(viewInvoice.payments);
                  return (
                    <>
                      <div className="bg-surface2/60 border border-theme-subtle rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted">
                          <span>Total Amount:</span>
                          <span className="font-mono font-bold text-primary">{formatCurrency(invTotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>Paid to Date:</span>
                          <span className="font-mono font-bold text-emerald-600">{formatCurrency(invPaid)}</span>
                        </div>
                        <div className="flex justify-between text-muted border-t border-theme-subtle/50 pt-1.5">
                          <span className="font-semibold text-secondary">Balance Due:</span>
                          <span className={`font-mono font-bold ${invBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {formatCurrency(invBalance)}
                          </span>
                        </div>
                      </div>

                      {paymentList.length > 0 ? (
                        <div className="space-y-2">
                          {paymentList.map((p: any, i: number) => (
                            <div key={p.id || i} className="bg-surface2 p-3 rounded-xl border border-theme-subtle">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-bold">{p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</p>
                                <span className="font-mono font-bold text-emerald-600 text-xs">{formatCurrency(Number(p.amount) || 0)}</span>
                              </div>
                              <p className="text-[10px] text-muted uppercase">{p.method || 'Cash'} {p.reference ? `- Ref: ${p.reference}` : ''}</p>
                            </div>
                          ))}
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
                
                <div className="grid grid-cols-3 gap-2">
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
                  <Button variant="ghost" className="h-9 text-xs border border-blue-500/30 text-blue-500 hover:bg-blue-500/10" onClick={() => {
                      const content = document.getElementById('invoice-preview');
                      if (!content) return;
                      const win = window.open('', '_blank');
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${viewInvoice.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #fff;
      color: #000;
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      display: block !important;
      width: 100%;
    }
    #invoice-preview {
      width: 210mm !important;
      min-height: 297mm !important;
      padding: 12mm 15mm !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      background: #fff !important;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        background: #fff !important;
      }
      #invoice-preview {
        width: 210mm !important;
        margin: 0 auto !important;
        padding: 12mm 15mm !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  ${content.outerHTML}
</body>
</html>`);
                      win.document.close();
                      win.focus();
                      setTimeout(() => {
                        win.print();
                      }, 350);
                  }}>
                    Print / PDF
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
      {showPaymentModal && viewInvoice && (
        <Modal isOpen={true} onClose={() => setShowPaymentModal(false)} title="Record Payment">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Amount (Rs.)</label>
              <input 
                type="number" 
                value={paymentData.amount}
                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                placeholder={`Balance: ${Math.max(0, (Number(viewInvoice.total !== undefined && viewInvoice.total !== null ? viewInvoice.total : (viewInvoice.amount || 0)) - Number(viewInvoice.paidAmount || 0))).toFixed(2)}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Method</label>
              <select 
                value={paymentData.method}
                onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Deposit To (Bank / Cash Account)</label>
              <select 
                value={paymentData.accountId}
                onChange={e => setPaymentData({ ...paymentData, accountId: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
              >
                <option value="">Default Account (Auto match {paymentData.method})</option>
                {accounts
                  .filter(a => a.type === 'Asset' && (a.subtype === 'Bank' || a.subtype === 'Cash' || a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('cash')))
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code ? `[${a.code}] ` : ''}{a.name} ({a.subtype || 'Asset'} - Rs. {Number(a.balance || 0).toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Reference (Optional)</label>
              <input 
                type="text" 
                value={paymentData.reference}
                onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                placeholder="Txn ID, Cheque No..."
              />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAddPayment} disabled={submitting || !paymentData.amount}>
                {submitting ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Manual Invoice Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Create Blank Invoice" size="lg">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1 uppercase tracking-wider">Customer</label>
                <select
                  value={newInvoiceData.leadId}
                  onChange={e => setNewInvoiceData({ ...newInvoiceData, leadId: e.target.value })}
                  className="w-full bg-surface border border-theme-subtle rounded px-3 py-2 text-primary focus:border-rex-500 focus:ring-1 focus:ring-rex-500 outline-none transition-all"
                >
                  <option value="">Select Customer...</option>
                  {leads.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} - {l.company}</option>
                  ))}
                </select>
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
    </div>
  )
}
