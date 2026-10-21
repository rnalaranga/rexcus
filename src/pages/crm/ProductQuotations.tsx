import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Eye, Download, Send, CheckCircle2, XCircle, 
  Clock, Trash2, Search, Filter, ArrowRight, Building2, User, 
  PackageCheck, Boxes, Banknote, ShoppingBag, ExternalLink, Mail, Edit3
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
import { deleteQuotation, updateQuotationStatus, createInvoice, createFinishedGoodsOrder } from '@/lib/api'
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
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
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
      <div className="p-3.5 rounded-2xl bg-surface border border-theme-subtle flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by quote #, client, subject..."
            className="w-full bg-surface2 border border-theme-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 transition-all placeholder:text-muted"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface2 border border-theme-subtle rounded-xl px-2.5 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Sent">Sent</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Customer filter */}
          <select
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            className="bg-surface2 border border-theme-subtle rounded-xl px-2.5 py-1.5 text-xs text-primary outline-none focus:border-emerald-500 font-medium max-w-[200px]"
          >
            <option value="all">All Customers</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {filteredGroups.map((group: any) => {
          const latest = group.versions[0];
          const parsed = latest?.parsed || {};
          const status = latest?.status || 'Draft';
          const itemsCount = parsed.custItems?.length || 0;

          return (
            <GlassCard
              key={group.quoNo}
              className="p-4 hover:border-emerald-500/40 transition-all duration-200 border-theme-subtle"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Meta */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {group.quoNo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      v{latest.version || 1} • {formatDate(group.latestDate)}
                    </span>
                    {group.versions.length > 1 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface2 text-muted border border-theme-subtle">
                        {group.versions.length} revisions
                      </span>
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
                <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-theme-subtle">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Total Value
                    </span>
                    <span className="text-lg font-black font-mono text-primary">
                      {formatCurrency(Number(latest.totalAmount || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* View/Edit in Builder */}
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Edit3}
                      onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                    >
                      Open
                    </Button>

                    {/* Preview Modal */}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewData({ quotation: latest, lead: group })}
                      className="h-8 text-xs border border-theme-subtle"
                      title="Preview Quotation Document"
                    >
                      Preview
                    </Button>

                    {/* Email */}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Mail}
                      onClick={() => setEmailModalData({
                        documentNumber: group.quoNo,
                        customerEmail: group.clientEmail || '',
                        customerName: group.clientName || group.clientCompany || 'Customer',
                        totalAmount: latest.totalAmount || latest.parsed?.totalPrice || '0.00',
                        validityDays: latest.parsed?.validityDays || '30',
                        quotation: latest,
                        lead: group
                      })}
                      className="h-8 text-xs border border-theme-subtle text-blue-600 hover:bg-blue-500/10"
                      title="Email to Client"
                    >
                      Email
                    </Button>

                    {/* Sales Order & Invoice */}
                    {status === 'Approved' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ShoppingBag}
                          onClick={() => handleCreateSalesOrder(group, latest)}
                          className="h-8 text-xs border border-blue-500/40 text-blue-600 hover:bg-blue-500/10 font-bold"
                          title="Generate Sales Order from Approved Quote"
                        >
                          Sales Order
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Banknote}
                          onClick={() => handleCreateInvoice(group, latest)}
                          className="h-8 text-xs border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                          title="Generate Invoice from Approved Quote"
                        >
                          Invoice
                        </Button>
                      </>
                    )}

                    {/* Status Select for authorized */}
                    <select
                      value={status}
                      onChange={e => handleStatusChange(latest.id, e.target.value, status)}
                      className="bg-surface border border-theme-subtle rounded-lg px-2 py-1 text-[11px] font-semibold text-primary outline-none focus:border-emerald-500 h-8"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Sent">Sent</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(latest.id)}
                      className="p-2 text-muted/40 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete Quote"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
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
    </div>
  )
}
