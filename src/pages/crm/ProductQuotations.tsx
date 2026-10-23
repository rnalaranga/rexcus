import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Eye, Download, Send, CheckCircle2, XCircle, 
  Clock, Trash2, Search, Filter, ArrowRight, Building2, User, 
  PackageCheck, Boxes, Banknote, ShoppingBag, ExternalLink, Mail, Edit3, Receipt,
  ChevronDown, ChevronUp, History
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/DialogProvider'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { useQuotations, useLeads, useCustomers } from '@/hooks/useData'
import { useTaxProfiles } from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteQuotation, updateQuotationStatus, createInvoice, createFinishedGoodsOrder, fetchPaymentReceipts, submitQuotationForApproval, approveQuotation, rejectQuotation } from '@/lib/api'
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal'
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
// @ts-ignore
import html2pdf from 'html2pdf.js'

export const ProductQuotations: React.FC = () => {
  const navigate = useNavigate()
  const { toast, showConfirm } = useDialog()
  const { user, can } = useAuth()
  const canApprove = can('approvals.quotations')
  const { settings } = useSettings()

  const { data: quotations = [], loading, refetch } = useQuotations()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: leads = [] } = useLeads()
  const { data: customers = [] } = useCustomers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [previewData, setPreviewData] = useState<{ quotation: any, lead: any } | null>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)

  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.product-quote-action-container')) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const [paymentReceiptsList, setPaymentReceiptsList] = useState<any[]>([])
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedQuoteForReceipt, setSelectedQuoteForReceipt] = useState<any>(null)
  const [activePrintReceipt, setActivePrintReceipt] = useState<any>(null)
  const [printReceiptModalOpen, setPrintReceiptModalOpen] = useState(false)

  const loadPaymentReceipts = async () => {
    try {
      const recs = await fetchPaymentReceipts();
      setPaymentReceiptsList(Array.isArray(recs) ? recs : []);
    } catch (e) {}
  };

  React.useEffect(() => {
    loadPaymentReceipts();
  }, []);

  const getQuoteReceipts = (group: any, latest: any) => {
    if (!latest) return [];
    const qNo = String(group.quoNo || latest.quotationNo || latest.docNo || '').trim().toLowerCase();
    const qId = String(latest.id || '').trim();

    return paymentReceiptsList.filter((r: any) => {
      const rQuoteId = String(r.quoteId || r.quotationId || '').trim();
      const rQuoNo = String(r.quotationNo || '').trim().toLowerCase();
      return (
        (qId && rQuoteId && rQuoteId === qId) ||
        (qNo && rQuoNo && rQuoNo === qNo)
      );
    });
  };

  const handleOpenReceiptModal = (group: any, latest: any) => {
    setSelectedQuoteForReceipt({
      ...latest,
      quotationNo: group.quoNo || latest.quotationNo || latest.docNo,
      group
    });
    setReceiptModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Pending Approval': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  }

  // Filter ONLY Product Quotations
  const productQuotes = useMemo(() => {
    return quotations.filter((q: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(q.data || '{}'); } catch (e) {}
      return q.type === 'product' || q.type === 'product_draft' || parsed.isProductQuotation === true || parsed.quotationCategory === 'product';
    });
  }, [quotations]);

  // Group by Quotation Number / ID
  const groupedQuotes = useMemo(() => {
    const map: Record<string, any> = {};

    productQuotes.forEach((q: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(q.data || '{}'); } catch (e) {}
      const quoNo = parsed.quotationNo || q.docNo || q.id;

      const cust = customers.find((c: any) => c.id === q.leadId);
      const lead = leads.find((l: any) => l.id === q.leadId);
      const clientCompany = q.leadCompany || cust?.company || lead?.company || parsed.customerCompany || '';
      const clientName = q.leadName || cust?.name || lead?.name || parsed.customerName || 'Walk-in Customer';
      const clientEmail = parsed.customerEmail || (cust as any)?.email || (lead as any)?.email || '';
      const clientAddress = parsed.customerAddress || q.leadAddress || cust?.address || (lead as any)?.address || '';
      const clientVat = parsed.vatNo || q.leadVat || cust?.vat || lead?.vat || '';
      const clientSvat = parsed.tinNo || q.leadSvat || cust?.svat || (cust as any)?.tin || lead?.svat || '';

      if (!map[quoNo]) {
        map[quoNo] = {
          quoNo,
          leadId: q.leadId,
          clientName,
          clientCompany,
          clientEmail,
          clientAddress,
          clientVat,
          clientSvat,
          latestDate: q.date,
          versions: []
        };
      }

      map[quoNo].versions.push({
        ...q,
        parsed
      });

      if (new Date(q.date) > new Date(map[quoNo].latestDate)) {
        map[quoNo].latestDate = q.date;
      }
    });

    // Sort versions descending
    Object.values(map).forEach((g: any) => {
      g.versions.sort((a: any, b: any) => b.version - a.version);
    });

    return Object.values(map).sort((a: any, b: any) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [productQuotes, customers, leads]);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: groupedQuotes.length,
      draft: 0,
      'pending approval': 0,
      approved: 0,
      sent: 0,
      rejected: 0
    };
    groupedQuotes.forEach((g: any) => {
      const s = (g.versions[0]?.status || 'Draft').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [groupedQuotes]);

  // Total Quoted Value
  const totalQuotedValue = useMemo(() => {
    return groupedQuotes.reduce((sum: number, g: any) => sum + Number(g.versions[0]?.totalAmount || 0), 0);
  }, [groupedQuotes]);

  // Filter search, status, customer & date range
  const filteredGroups = useMemo(() => {
    return groupedQuotes.filter((g: any) => {
      const latest = g.versions[0];
      const status = latest?.status || 'Draft';

      if (statusFilter !== 'all' && status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (customerFilter !== 'all' && g.leadId !== customerFilter) return false;

      // Date range filter
      const qDate = (g.latestDate || latest?.date || '').slice(0, 10);
      if (startDate && qDate && qDate < startDate) return false;
      if (endDate && qDate && qDate > endDate) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNo = (g.quoNo || '').toLowerCase().includes(q);
        const matchName = (g.clientName || '').toLowerCase().includes(q);
        const matchComp = (g.clientCompany || '').toLowerCase().includes(q);
        const matchSubj = (latest?.parsed?.subject || '').toLowerCase().includes(q);
        return matchNo || matchName || matchComp || matchSubj;
      }

      return true;
    });
  }, [groupedQuotes, search, statusFilter, customerFilter, startDate, endDate]);

  // Status Change
  const handleStatusChange = async (id: string, newStatus: string, currentStatus?: string) => {
    if (newStatus === 'Sent' && currentStatus !== 'Approved') {
      toast('Quotation must be Approved before marking as Sent. Please approve or submit for approval first.', 'error');
      return;
    }
    try {
      await updateQuotationStatus(id, newStatus);
      toast(`Status updated to ${newStatus}`, 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Failed to update status', 'error');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const ok = await showConfirm('Delete Product Quotation', 'Are you sure you want to delete this product quotation version?');
    if (!ok) return;
    try {
      await deleteQuotation(id);
      toast('Quotation deleted successfully', 'success');
      refetch();
    } catch (e: any) {
      toast(e?.message || 'Failed to delete quotation', 'error');
    }
  };

  // Invoice Generation - Direct navigation without browser prompt
  const handleCreateInvoice = (group: any, latest: any) => {
    navigate(`/finance/invoices/new?quoteId=${latest.id}`);
  };

  // Create Sales Order from Approved Product Quotation
  const handleCreateSalesOrder = async (group: any, latest: any) => {
    try {
      const parsed = latest.parsed || {};
      const rawItems = parsed.custItems || [];
      const itemsList = rawItems.map((ci: any) => ({
        productId: ci.productId || ci.inventoryId || 'CUSTOM-PRODUCT',
        productName: ci.name || ci.description || 'Finished Product',
        productSku: ci.sku || '',
        description: ci.description || ci.name || '',
        qty: Number(ci.qty) || 1,
        unitPrice: Number(ci.unitPrice) || 0,
        amount: Number(ci.amount) || ((Number(ci.qty) || 1) * Number(ci.unitPrice || 0)),
        uom: ci.uom || 'Nos'
      }));

      if (itemsList.length === 0) {
        itemsList.push({
          productId: 'CUSTOM-PRODUCT',
          productName: latest.subject || `Product Quotation ${group.quoNo}`,
          productSku: '',
          description: latest.subject || `Product Quotation ${group.quoNo}`,
          qty: 1,
          unitPrice: Number(latest.totalAmount || 0),
          amount: Number(latest.totalAmount || 0),
          uom: 'Lot'
        });
      }

      const subtotal = Number(parsed.custTotals?.subtotal) || itemsList.reduce((acc: number, it: any) => acc + it.amount, 0);
      const total = Number(latest.totalAmount) || Number(parsed.custTotals?.total) || subtotal;
      const taxAmount = total - subtotal > 0 ? (total - subtotal) : 0;

      const cust = customers.find((c: any) => c.id === group.leadId);
      const lead = leads.find((l: any) => l.id === group.leadId);
      const custId = cust?.id || (lead as any)?.customerId || (group.leadId?.startsWith('CUST') ? group.leadId : null);

      const soPayload = {
        orderNo: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        quoteId: latest.id,
        quotationNo: group.quoNo,
        customerId: custId,
        customerName: group.clientName || group.clientCompany || 'Customer',
        attention: parsed.attention || latest.attention || group.clientContact || (cust as any)?.name || '',
        customerPhone: group.clientPhone || '',
        customerEmail: group.clientEmail || '',
        deliveryAddress: group.clientAddress || parsed.deliveryAddress || '',
        paymentTerms: parsed.custTerms || parsed.paymentTerms || 'Standard Terms',
        orderDate: new Date().toISOString().slice(0, 10),
        targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        items: itemsList,
        subtotal,
        taxAmount,
        totalPrice: total,
        status: 'Confirmed',
        notes: `Commercial Sales Order generated from Approved Product Quotation ${group.quoNo}`
      };

      const res = await createFinishedGoodsOrder(soPayload);
      if (res && res.error) throw new Error(res.error);

      toast(`Sales Order ${soPayload.orderNo} created successfully!`, 'success');
      navigate('/crm/sales-orders');
    } catch (e: any) {
      toast(e?.message || 'Failed to create sales order', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-primary">Product Quotations</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Finished Goods Catalog
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {filteredGroups.length} product {filteredGroups.length === 1 ? 'quotation' : 'quotations'}
            {(search || statusFilter !== 'all' || customerFilter !== 'all' || startDate || endDate) && ' (filtered)'} &middot; Total Quoted Value:{' '}
            <span className="font-mono font-bold text-primary">{formatCurrency(totalQuotedValue)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => window.print()}
            className="border border-theme-subtle rounded-none hover:bg-surface2 text-xs h-8"
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/crm/product-quotations/new')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-none h-8 shadow-xs"
          >
            New Product Quote
          </Button>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar (Unified & Professional) */}
      <GlassCard className="p-3 space-y-3 rounded-none">
        {/* Row 1: Status Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'draft', label: 'Draft', count: statusCounts.draft },
              { id: 'pending approval', label: 'Pending Approval', count: statusCounts['pending approval'] },
              { id: 'approved', label: 'Approved', count: statusCounts.approved },
              { id: 'sent', label: 'Sent', count: statusCounts.sent },
              { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  statusFilter.toLowerCase() === tab.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded-none ${
                  statusFilter.toLowerCase() === tab.id ? 'bg-black/20 text-white' : 'bg-surface2 text-muted'
                }`}>
                  {tab.count || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80 shrink-0">
            <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by quote #, client, subject..."
              className="w-full bg-surface border border-theme-subtle rounded-none pl-9 pr-3 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 transition-all placeholder:text-muted"
            />
          </div>
        </div>

        {/* Row 2: Customer Filter, Date Range & Clear Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-theme-subtle text-xs">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-muted shrink-0" />
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">Customer:</span>
            <div className="w-52">
              <CustomerAutocomplete
                value={customerFilter}
                onChange={(cId) => setCustomerFilter(cId || 'all')}
                customers={customers}
                leads={leads}
                placeholder="Filter customer..."
                allOptionLabel={`All Customers (${customers.length + leads.length})`}
                className="py-1 text-xs rounded-none"
              />
            </div>
          </div>

          <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-emerald-500 outline-none"
            />
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-emerald-500 outline-none"
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
              className="px-2 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded-none text-xs font-medium text-secondary hover:text-primary transition-colors"
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
              className="px-2 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded-none text-xs font-medium text-secondary hover:text-primary transition-colors"
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
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-none font-semibold text-xs transition-colors ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </GlassCard>
      {/* Quotations List */}
      <div className="space-y-3">
        {filteredGroups.map((group: any, idx: number) => {
          const latest = group.versions[0];
          const parsed = latest?.parsed || {};
          const status = latest?.status || 'Draft';
          const itemsCount = parsed.custItems?.length || 0;
          const recs = getQuoteReceipts(group, latest);
          const totalAdv = recs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
          const latestRec = recs.length > 0 ? recs[recs.length - 1] : null;
          const isRevisionsExpanded = !!expandedRevisions[group.quoNo];

          return (
            <GlassCard
              key={group.quoNo}
              className={`p-3.5 hover:border-emerald-500/40 transition-all duration-200 border-theme-subtle rounded-none ${
                openActionId === group.quoNo ? 'relative z-50 shadow-2xl' : 'relative z-0'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left Meta */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {group.quoNo}
                    </span>
                    <span className={`text-xs uppercase font-semibold px-2.5 py-1 rounded-none border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-xs font-mono text-muted">
                      v{latest.version || 1} • {formatDate(group.latestDate)}
                    </span>
                    {group.versions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpandedRevisions(p => ({ ...p, [group.quoNo]: !p[group.quoNo] }))}
                        className="text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle transition-colors flex items-center gap-1.5"
                      >
                        {group.versions.length} revisions
                        <ChevronDown size={10} className={`transition-transform duration-150 ${isRevisionsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {totalAdv > 0 && latestRec && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePrintReceipt({
                            ...latestRec,
                            totalQuoted: Number(latest.totalAmount || latest.customAmount || 0)
                          });
                          setPrintReceiptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                        title={`View / Print Payment Receipt (Advance: ${formatCurrency(totalAdv)})`}
                      >
                        <Receipt size={10} /> Adv: {formatCurrency(totalAdv)}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-primary truncate">
                      {group.clientCompany || group.clientName}
                    </span>
                    {group.clientCompany && group.clientName && (
                      <span className="text-muted truncate">• Attn: {group.clientName}</span>
                    )}
                  </div>

                  {parsed.subject && (
                    <p className="text-xs text-secondary truncate max-w-xl">
                      {parsed.subject}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1 font-medium">
                      <Boxes size={12} className="text-emerald-500" />
                      {itemsCount} {itemsCount === 1 ? 'Product Line' : 'Product Lines'}
                    </span>
                    {parsed.custValidity && (
                      <span>Valid: {parsed.custValidity}</span>
                    )}
                  </div>
                </div>

                {/* Right Financials & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-theme-subtle">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                      Total Value
                    </span>
                    <span className="text-base lg:text-lg font-bold font-mono text-primary">
                      {formatCurrency(Number(latest.totalAmount || 0))}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 product-quote-action-menu-container ${openActionId === group.quoNo ? 'relative z-50' : 'relative z-0'}`}>
                    {/* Quick 1-click Preview */}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewData({ quotation: latest, lead: group })}
                      className="h-7 text-xs border border-theme-subtle rounded-none hover:bg-surface2"
                      title="Preview Quotation Document"
                    >
                      Preview
                    </Button>

                    {/* Actions Dropdown Button */}
                    <div className={`relative inline-block text-left ${openActionId === group.quoNo ? 'z-50' : ''}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionId(openActionId === group.quoNo ? null : group.quoNo);
                        }}
                        className={`h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none ${
                          openActionId === group.quoNo
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
                        }`}
                      >
                        Actions
                        <ChevronDown size={11} className={`transition-transform duration-150 ${openActionId === group.quoNo ? 'rotate-180' : ''}`} />
                      </button>

                      {openActionId === group.quoNo && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 ${
                            idx >= filteredGroups.length - 2 && filteredGroups.length > 2 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                          } w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl z-[9999] py-1.5 text-left rounded-none max-h-[75vh] overflow-y-auto custom-scrollbar`}
                          style={{ minWidth: '256px', boxShadow: '0 12px 32px rgba(0,0,0,0.22), 0 0 1px rgba(0,0,0,0.1)' }}
                        >
                          <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                            Product Quote Actions
                          </div>

                          {/* 1. Preview Document */}
                          <button
                            type="button"
                            onClick={() => { setPreviewData({ quotation: latest, lead: group }); setOpenActionId(null); }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Eye size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Preview Document</span>
                          </button>

                          {/* 2. Open in Builder */}
                          <button
                            type="button"
                            onClick={() => { navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`); setOpenActionId(null); }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Edit3 size={14} className="text-zinc-600 dark:text-zinc-400 shrink-0" />
                            <span>Edit in Quotation Builder</span>
                          </button>

                          {/* 3. Send Email */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmailModalData({
                                documentNumber: group.quoNo,
                                customerEmail: group.clientEmail || '',
                                customerName: group.clientName || group.clientCompany || 'Customer',
                                totalAmount: latest.totalAmount || latest.parsed?.totalPrice || '0.00',
                                validityDays: latest.parsed?.validityDays || '30',
                                quotation: latest,
                                lead: group
                              });
                              setOpenActionId(null);
                            }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Mail size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Send via Email</span>
                          </button>

                          {/* Commercial Actions (If Approved / Sent / Accepted) */}
                          {(status === 'Approved' || status === 'Sent' || status === 'Accepted') && (
                            <>
                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                                Commercial Operations
                              </div>

                              <button
                                type="button"
                                onClick={() => { handleCreateSalesOrder(group, latest); setOpenActionId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <ShoppingBag size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                <span>Create Sales Order</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => { handleOpenReceiptModal(group, latest); setOpenActionId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Receipt size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Issue Advance Receipt</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => { handleCreateInvoice(group, latest); setOpenActionId(null); }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <FileText size={14} className="shrink-0 text-emerald-500" />
                                <span>Generate Tax Invoice</span>
                              </button>
                            </>
                          )}

                          {/* Approval Actions */}
                          {((status === 'Draft' || !status || status === 'Rejected') || (canApprove && (status === 'Pending Approval' || status === 'Draft'))) && (
                            <>
                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                                Workflow & Approvals
                              </div>

                              {(status === 'Draft' || !status || status === 'Rejected') && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenActionId(null);
                                    try {
                                      await submitQuotationForApproval(latest.id);
                                      toast('Submitted for approval', 'success');
                                      refetch();
                                    } catch(err: any) {
                                      toast(err?.message || 'Failed to submit', 'error');
                                    }
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <Send size={14} className="shrink-0 text-amber-500" />
                                  <span>Submit for Approval</span>
                                </button>
                              )}

                              {canApprove && (status === 'Pending Approval' || status === 'Draft') && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenActionId(null);
                                    try {
                                      await approveQuotation(latest.id, user?.name || 'Manager');
                                      toast('Quotation approved successfully!', 'success');
                                      refetch();
                                    } catch(err: any) {
                                      toast(err?.message || 'Failed to approve', 'error');
                                    }
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                  <span>Approve Quotation</span>
                                </button>
                              )}

                              {canApprove && status === 'Pending Approval' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setOpenActionId(null);
                                    const reason = prompt('Enter rejection reason:');
                                    if (!reason) return;
                                    try {
                                      await rejectQuotation(latest.id, reason);
                                      toast('Quotation rejected', 'error');
                                      refetch();
                                    } catch(err: any) {
                                      toast(err?.message || 'Failed to reject', 'error');
                                    }
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left"
                                >
                                  <XCircle size={14} className="shrink-0 text-rose-600" />
                                  <span>Reject Quotation</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Delete Action */}
                          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                          <button
                            type="button"
                            onClick={() => { handleDelete(latest.id); setOpenActionId(null); }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Trash2 size={14} className="shrink-0 text-rose-500" />
                            <span>Delete Quotation</span>
                          </button>
                        </div>
                      )}                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Revisions Panel */}
              {isRevisionsExpanded && group.versions.length > 1 && (
                <div className="mt-3 pt-3 border-t border-theme-subtle/50 space-y-1.5 animate-fade-in">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <History size={11} className="text-emerald-500" />
                    Quotation Versions ({group.versions.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {group.versions.map((v: any) => {
                      const isLatest = v.id === latest.id;
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between px-2.5 py-1.5 border text-xs rounded-none transition-colors ${
                            isLatest
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-primary'
                              : 'bg-surface2/50 border-theme-subtle text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold font-mono text-primary shrink-0">v{v.version}</span>
                            {isLatest && (
                              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-none uppercase">
                                Active
                              </span>
                            )}
                            <span className="font-mono text-secondary text-xs truncate">
                              {formatCurrency(Number(v.totalAmount || 0))}
                            </span>
                            <span className="text-xs text-muted truncate">{formatDate(v.date)}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              onClick={() => setPreviewData({ quotation: v, lead: group })}
                              className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-none transition-colors"
                              title={`Preview Version v${v.version}`}
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${v.id}`)}
                              className="p-1 text-primary hover:bg-surface rounded-none transition-colors"
                              title={`Edit Version v${v.version}`}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await showConfirm(`Delete Version v${v.version} of quotation ${group.quoNo}?`, 'Delete Version', { confirmLabel: 'Delete' });
                                if (ok) {
                                  await deleteQuotation(v.id);
                                  toast(`Version v${v.version} deleted successfully`, 'success');
                                  refetch();
                                }
                              }}
                              className="p-1 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-colors"
                              title={`Delete Version v${v.version}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
        {filteredGroups.length === 0 && !loading && (
          <div className="py-16 text-center space-y-3 bg-surface rounded-2xl border border-dashed border-theme-subtle">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <PackageCheck size={26} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-primary">No Product Quotations Found</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {search || statusFilter !== 'all' 
                  ? 'No quotations match the active search or filters.' 
                  : 'Get started by creating your first sales quotation for finished goods.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/crm/product-quotations/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Create Product Quotation
            </Button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewData && (
        <Modal
          isOpen={Boolean(previewData)}
          onClose={() => setPreviewData(null)}
          title={`Quotation Preview - ${previewData.quotation?.parsed?.quotationNo || previewData.quotation?.id}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex justify-end gap-2 pb-3 border-b border-theme-subtle">
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={() => {
                  const element = document.getElementById('product-quote-list-print');
                  if (element) {
                    html2pdf().from(element).set({
                      margin: 10,
                      filename: `Quotation_${previewData.quotation?.parsed?.quotationNo || 'PQ'}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).save();
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Download PDF
              </Button>
            </div>

            <div id="product-quote-list-print" className="bg-white text-zinc-900 rounded-xl p-6 shadow-sm overflow-x-auto">
              <QuotationPrintView
                data={previewData.quotation.parsed}
                type="main"
                lead={previewData.lead}
                settings={settings}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Email Modal */}
      {emailModalData && (
        <>
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '850px', background: '#fff' }}>
            <div id="product-quote-email-print" className="p-8 bg-white text-zinc-900">
              <QuotationPrintView
                data={emailModalData.quotation?.parsed}
                type="main"
                lead={emailModalData.lead}
                settings={settings}
              />
            </div>
          </div>
          <SendDocumentEmailModal
            isOpen={Boolean(emailModalData)}
            onClose={() => setEmailModalData(null)}
            documentType="quotation"
            documentNumber={emailModalData.documentNumber}
            customerEmail={emailModalData.customerEmail || ''}
            customerName={emailModalData.customerName || 'Customer'}
            totalAmount={emailModalData.totalAmount || '0.00'}
            validityDays={emailModalData.validityDays || '30'}
            elementIdToPdf="product-quote-email-print"
          />
        </>
      )}

      <CreatePaymentReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedQuoteForReceipt(null);
        }}
        quotation={selectedQuoteForReceipt}
        settings={settings}
        onSuccess={(receipt) => {
          loadPaymentReceipts();
          const unboxed = receipt?.receipt || receipt;
          setActivePrintReceipt({
            ...unboxed,
            quotationNo: selectedQuoteForReceipt?.quotationNo || unboxed?.quotationNo,
            totalQuoted: Number(selectedQuoteForReceipt?.totalAmount || selectedQuoteForReceipt?.customAmount || unboxed?.totalQuoted || 0)
          });
          setPrintReceiptModalOpen(true);
        }}
      />

      <PaymentReceiptPrintModal
        isOpen={printReceiptModalOpen}
        onClose={() => {
          setPrintReceiptModalOpen(false);
          setActivePrintReceipt(null);
        }}
        receipt={activePrintReceipt}
        settings={settings}
      />
    </div>
  )
}