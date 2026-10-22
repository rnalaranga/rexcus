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

  // Filter search & status
  const filteredGroups = useMemo(() => {
    return groupedQuotes.filter((g: any) => {
      const latest = g.versions[0];
      const status = latest?.status || 'Draft';

      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (customerFilter !== 'all' && g.leadId !== customerFilter) return false;

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
  }, [groupedQuotes, search, statusFilter, customerFilter]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <PackageCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-primary tracking-tight">Product Quotations</h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                Finished Goods
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Commercial quotations for ready-made finished products without requiring BOM configurations
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/crm/product-quotations/new')}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 rounded-none"
          >
            New Product Quotation
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Total Quotes</span>
          <span className="text-2xl font-black font-mono text-primary">{productQuotes.length}</span>
        </GlassCard>
        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Approved</span>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {productQuotes.filter((q: any) => q.status === 'Approved').length}
          </span>
        </GlassCard>
        <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Pending Approval</span>
          <span className="text-2xl font-black font-mono text-amber-600">
            {productQuotes.filter((q: any) => q.status === 'Pending Approval').length}
          </span>
        </GlassCard>
        <GlassCard className="p-4 border-theme-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">Total Pipeline Value</span>
          <span className="text-xl font-black font-mono text-primary">
            {formatCurrency(productQuotes.reduce((sum: number, q: any) => sum + Number(q.totalAmount || 0), 0))}
          </span>
        </GlassCard>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-none bg-surface border border-theme-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by quote #, client, subject..."
            className="w-full bg-surface2 border border-theme-subtle rounded-none pl-9 pr-3 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 transition-all placeholder:text-muted"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface2 border border-theme-subtle rounded-none px-2.5 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Sent">Sent</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Customer filter */}
          <div className="w-52">
            <CustomerAutocomplete
              value={customerFilter}
              onChange={(cId) => setCustomerFilter(cId || 'all')}
              customers={customers}
              placeholder="Filter by customer..."
              allOptionLabel="All Customers"
              className="py-1 text-xs rounded-none"
            />
          </div>
        </div>
      </div>

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
              className="p-3.5 hover:border-emerald-500/40 transition-all duration-200 border-theme-subtle rounded-none"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left Meta */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {group.quoNo}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-none border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      v{latest.version || 1} • {formatDate(group.latestDate)}
                    </span>
                    {group.versions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpandedRevisions(p => ({ ...p, [group.quoNo]: !p[group.quoNo] }))}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-none bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle transition-colors flex items-center gap-1"
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
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-mono"
                        title={`View / Print Payment Receipt (Advance: ${formatCurrency(totalAdv)})`}
                      >
                        <Receipt size={10} /> Adv: {formatCurrency(totalAdv)}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-primary truncate">
                      {group.clientCompany || group.clientName}
                    </span>
                    {group.clientCompany && group.clientName && (
                      <span className="text-muted truncate">• Attn: {group.clientName}</span>
                    )}
                  </div>

                  {parsed.subject && (
                    <p className="text-[11px] text-muted truncate max-w-xl">
                      {parsed.subject}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-muted">
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
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Total Value
                    </span>
                    <span className="text-base lg:text-lg font-black font-mono text-primary">
                      {formatCurrency(Number(latest.totalAmount || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 product-quote-action-container relative">
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
                    <div className="relative inline-block text-left">
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
                            idx >= filteredGroups.length - 2 && filteredGroups.length > 2 ? 'bottom-full mb-1' : 'top-full mt-1'
                          } w-56 bg-surface border border-theme shadow-2xl z-[60] py-1 text-left rounded-none animate-fade-in`}
                        >
                          {/* 1. Preview Document */}
                          <button
                            type="button"
                            onClick={() => { setPreviewData({ quotation: latest, lead: group }); setOpenActionId(null); }}
                            className="w-full px-3 py-2 text-xs text-secondary hover:text-primary hover:bg-surface2 flex items-center gap-2 transition-colors rounded-none"
                          >
                            <Eye size={13} className="text-muted shrink-0" />
                            <span>Preview Document</span>
                          </button>

                          {/* 2. Open in Builder */}
                          <button
                            type="button"
                            onClick={() => { navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`); setOpenActionId(null); }}
                            className="w-full px-3 py-2 text-xs text-secondary hover:text-primary hover:bg-surface2 flex items-center gap-2 transition-colors rounded-none"
                          >
                            <Edit3 size={13} className="text-muted shrink-0" />
                            <span>Edit in Builder</span>
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
                            className="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors rounded-none"
                          >
                            <Mail size={13} className="shrink-0" />
                            <span>Send via Email</span>
                          </button>

                          {/* 4. Sales Order (if Approved/Sent/Accepted) */}
                          {(status === 'Approved' || status === 'Sent' || status === 'Accepted') && (
                            <button
                              type="button"
                              onClick={() => { handleCreateSalesOrder(group, latest); setOpenActionId(null); }}
                              className="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition-colors rounded-none font-semibold"
                            >
                              <ShoppingBag size={13} className="shrink-0" />
                              <span>Create Sales Order</span>
                            </button>
                          )}

                          {/* 5. Advance Payment Receipt */}
                          {(status === 'Approved' || status === 'Sent' || status === 'Accepted') && (
                            <button
                              type="button"
                              onClick={() => { handleOpenReceiptModal(group, latest); setOpenActionId(null); }}
                              className="w-full px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors rounded-none font-semibold"
                            >
                              <Receipt size={13} className="shrink-0" />
                              <span>Issue Advance Receipt</span>
                            </button>
                          )}

                          {/* 6. Invoice */}
                          {(status === 'Approved' || status === 'Sent' || status === 'Accepted') && (
                            <button
                              type="button"
                              onClick={() => { handleCreateInvoice(group, latest); setOpenActionId(null); }}
                              className="w-full px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors rounded-none"
                            >
                              <FileText size={13} className="shrink-0" />
                              <span>Generate Tax Invoice</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-theme-subtle" />

                          {/* Workflow Approval actions */}
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
                              className="w-full px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition-colors rounded-none"
                            >
                              <Send size={13} className="shrink-0" />
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
                              className="w-full px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors rounded-none font-semibold"
                            >
                              <CheckCircle2 size={13} className="shrink-0" />
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
                              className="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors rounded-none"
                            >
                              <XCircle size={13} className="shrink-0" />
                              <span>Reject Quotation</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-theme-subtle" />

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => { handleDelete(latest.id); setOpenActionId(null); }}
                            className="w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-medium rounded-none"
                          >
                            <Trash2 size={13} className="shrink-0" />
                            <span>Delete Quotation</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Revisions Panel */}
              {isRevisionsExpanded && group.versions.length > 1 && (
                <div className="mt-3 pt-3 border-t border-theme-subtle/50 space-y-1.5 animate-fade-in">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
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
                              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded-none uppercase">
                                Active
                              </span>
                            )}
                            <span className="font-mono text-muted text-[11px] truncate">
                              {formatCurrency(Number(v.totalAmount || 0))}
                            </span>
                            <span className="text-[10px] text-muted truncate">{formatDate(v.date)}</span>
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