import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  UserCheck, Shield, Users, FileText, AlertCircle, Camera, Plus, Eye, Download, Send, CheckCircle2, XCircle, 
  Clock, Trash2, Search, Filter, ArrowRight, Building2, User, 
  PackageCheck, Boxes, Banknote, ShoppingBag, ExternalLink, Mail, Edit3, Receipt,
  ChevronDown, ChevronUp, History, TrendingUp, FileEdit, Package, LayoutGrid, List, FileCheck, Info, ShieldCheck
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/DialogProvider'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'
import { findMatchingSamplePhotos } from '@/lib/samplePhotos'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { useQuotations, useLeads, useCustomers, useInvoices, useFinishedGoodsOrders, useWorkOrders } from '@/hooks/useData'
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown'
import { useTaxProfiles } from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteQuotation, updateQuotationStatus, createInvoice, createFinishedGoodsOrder, fetchPaymentReceipts, submitQuotationForApproval, approveQuotation, rejectQuotation, fetchAllCustomerGRNs } from '@/lib/api'
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal'
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { QuotationStageSnapshotModal } from '@/components/crm/QuotationStageSnapshotModal'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { GitBranch } from 'lucide-react'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner'
import { printElement } from '@/lib/printElement'
import { exportPdf } from '@/lib/exportPdf'
import { CreateSalesOrderModal } from '@/components/crm/CreateSalesOrderModal'
import { RecordCustomerPoModal } from '@/components/crm/RecordCustomerPoModal'
import { CreateAdvanceProformaModal } from '@/components/crm/CreateAdvanceProformaModal'
import { ProformaInvoicePrintModal } from '@/components/crm/ProformaInvoicePrintModal'
import { FileSpreadsheet } from 'lucide-react'

export const ProductQuotations: React.FC = () => {
  const navigate = useNavigate()
  const { toast, showConfirm } = useDialog()
  const [advanceProformaModalOrder, setAdvanceProformaModalOrder] = useState<any | null>(null)
  const [activePrintProforma, setActivePrintProforma] = useState<any | null>(null)
  const { user, can } = useAuth()
  const canApprove = can('approvals.quotations') || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager'
  const canViewAll = can('quotations.view_all') || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager' || (user?.permissions?.includes('*') ?? false)
  const [salesRepFilter, setSalesRepFilter] = useState<'all' | string>('all')
  const { settings } = useSettings()

  const { data: quotations = [], loading, refetch } = useQuotations()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: leads = [] } = useLeads()
  const { data: customers = [] } = useCustomers()
  const { data: allInvoices = [] } = useInvoices()
  const { data: allOrders = [] } = useFinishedGoodsOrders()
  const { data: workOrders = [] } = useWorkOrders()

  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')

  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('id')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
  }, [searchParams])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [previewData, setPreviewData] = useState<{ quotation: any, lead: any } | null>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)
  const [allCustomerGrns, setAllCustomerGrns] = useState<any[]>([])
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)

  useEffect(() => {
    fetchAllCustomerGRNs().then(setAllCustomerGrns).catch(() => {});
  }, [])

  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [actionCoords, setActionCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number; height: number } | null>(null)
  const [openInfoId, setOpenInfoId] = useState<string | null>(null)
  const [infoCoords, setInfoCoords] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null)
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({})
  const [snapshotModalData, setSnapshotModalData] = useState<any | null>(null)
  const [salesOrderModalData, setSalesOrderModalData] = useState<{ group: any; quotation: any; type?: 'custom' | 'product' } | null>(null)
  const [recordPoModalData, setRecordPoModalData] = useState<{ group: any; quotation: any; type?: 'custom' | 'product'; proceedToSalesOrder?: boolean } | null>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-quote-action-menu') && !target.closest('.product-quote-action-btn')) {
        setOpenActionId(null);
        setActionCoords(null);
      }
      if (!target.closest('.product-quotation-info-menu-dropdown') && !target.closest('.product-quotation-info-trigger-btn')) {
        setOpenInfoId(null);
        setInfoCoords(null);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (e.target && ((e.target as HTMLElement).closest?.('.product-quote-action-menu') || (e.target as HTMLElement).closest?.('.product-quotation-info-menu-dropdown'))) {
        return;
      }
      setOpenActionId(null);
      setActionCoords(null);
      setOpenInfoId(null);
      setInfoCoords(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const [paymentReceiptsList, setPaymentReceiptsList] = useState<any[]>([])
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedQuoteForReceipt, setSelectedQuoteForReceipt] = useState<any>(null)
  const [activePrintReceipt, setActivePrintReceipt] = useState<any>(null)
  const [printReceiptModalOpen, setPrintReceiptModalOpen] = useState(false)

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [rejectionTarget, setRejectionTarget] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')

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
      case 'PO Received': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Pending Approval': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  }

  // Filter ONLY Product Quotations
  const salesRepOptions = useMemo(() => {
    const reps = new Set<string>();
    quotations.forEach((q: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(q.data || '{}'); } catch(e){}
      const rep = q.createdByName || parsed.createdByName || parsed.salesRep || parsed.preparedBy;
      if (rep && typeof rep === 'string' && rep.trim()) {
        reps.add(rep.trim());
      }
    });
    return Array.from(reps);
  }, [quotations]);

  const productQuotes = useMemo(() => {
    return quotations.filter((q: any) => {
      if (q.deletedAt) return false;
      let parsed: any = {};
      try { parsed = JSON.parse(q.data || '{}'); } catch (e) {}
      const isProduct = q.type === 'product' || 
                        q.type === 'product_draft' || 
                        parsed.isProductQuotation === true || 
                        parsed.quotationCategory === 'product' ||
                        String(q.quotationNo || q.docNo || parsed.quotationNo || q.id || '').startsWith('PQ');
      if (!isProduct) return false;

      // Access check: If not canViewAll, user can ONLY view their own quotations
      if (!canViewAll) {
        const uid = String(user?.id || '').trim().toLowerCase();
        const uname = String(user?.username || '').trim().toLowerCase();
        const uName = String(user?.name || '').trim().toLowerCase();
        const uPrefix = String(user?.prefix || '').trim().toLowerCase();

        const qCreatedBy = String(q.createdBy || parsed.createdBy || '').trim().toLowerCase();
        const qCreatedByName = String(q.createdByName || parsed.createdByName || '').trim().toLowerCase();
        const qCreatedByUname = String(parsed.createdByUsername || '').trim().toLowerCase();
        const qSalesRep = String(parsed.salesRep || parsed.preparedBy || '').trim().toLowerCase();
        const quoNoLower = String(parsed.quotationNo || q.docNo || q.id || '').trim().toLowerCase();

        const isOwn = (uid && qCreatedBy && qCreatedBy === uid) ||
                      (uname && (qCreatedBy === uname || qCreatedByUname === uname)) ||
                      (uName && (qCreatedByName === uName || qSalesRep === uName)) ||
                      (uPrefix && quoNoLower.startsWith(uPrefix)) ||
                      (!qCreatedBy && !qCreatedByName);

        if (!isOwn) return false;
      }

      return true;
    });
  }, [quotations, canViewAll, user]);

  // Group by Quotation Number / ID
  const groupedQuotes = useMemo(() => {
    const map: Record<string, any> = {};

    productQuotes.forEach((q: any) => {
      let parsed: any = {};
      try { parsed = JSON.parse(q.data || '{}'); } catch (e) {}
      const quoNo = parsed.quotationNo || q.docNo || q.id;

      const numId = String(q.leadId || "").replace(/^LEAD-0*/i, "");
      const lead = leads.find((l: any) => 
        l.id === q.leadId || 
        l.id === parsed.leadId || 
        (numId && (l.id === `LEAD-${numId.padStart(3, "0")}` || String(l.id).replace(/^LEAD-0*/i, "") === numId))
      );
      const cust = customers.find((c: any) => 
        c.id === q.leadId || 
        c.id === parsed.leadId || 
        c.id === q.customerId ||
        (lead?.customerId && c.id === lead.customerId) ||
        (parsed.company && (c.company?.toLowerCase() === parsed.company?.toLowerCase() || c.name?.toLowerCase() === parsed.company?.toLowerCase()))
      );

      const clientCompany = q.leadCompany || cust?.company || lead?.company || parsed.customerCompany || '';
      const clientName = q.leadName || cust?.name || lead?.name || parsed.customerName || 'Walk-in Customer';
      const clientEmail = parsed.customerEmail || (cust as any)?.email || (lead as any)?.email || '';
      const clientAddress = parsed.customerAddress || q.leadAddress || cust?.address || (lead as any)?.address || '';
      const clientVat = parsed.vatNo || q.leadVat || cust?.vat || lead?.vat || '';
      const clientSvat = parsed.tinNo || q.leadSvat || cust?.svat || (cust as any)?.tin || lead?.svat || '';
      const resolvedLeadId = lead?.id || cust?.id || q.leadId || "WALK-IN";

      const isDraft = q.type === "product_draft" || q.type === "draft";
      const isAutoPregenNo = !quoNo || quoNo.startsWith('PQ-DRAFT-') || quoNo.startsWith('QT-DRAFT-') || quoNo === 'PQ-2206' || quoNo === 'QT-2206';

      let groupKey: string;
      if (quoNo && !isAutoPregenNo) {
        groupKey = `${quoNo}_${resolvedLeadId}`;
      } else if (isDraft && resolvedLeadId !== 'WALK-IN') {
        groupKey = `PQ_DRAFT_${resolvedLeadId}`;
      } else {
        groupKey = q.id;
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          quoNo: (isAutoPregenNo ? (parsed.quotationNo || q.docNo || q.id) : quoNo) || q.id,
          leadId: resolvedLeadId,
          customerId: cust?.id || lead?.customerId || q.customerId,
          clientName,
          clientCompany,
          clientEmail,
          clientAddress,
          clientVat,
          clientSvat,
          latestDate: q.date,
          salesRep: q.createdByName || parsed.createdByName || parsed.salesRep || parsed.preparedBy || '',
          versions: []
        };
      } else {
        const qTime = new Date(q.date).getTime();
        const existingTime = new Date(map[groupKey].latestDate).getTime();
        if (!isNaN(qTime) && qTime > existingTime) {
          map[groupKey].latestDate = q.date;
          if (quoNo && !isAutoPregenNo) {
            map[groupKey].quoNo = quoNo;
          }
        }
      }

      // Deduplicate versions: if it's a draft, replace any older draft in versions
      const existingIdx = map[groupKey].versions.findIndex((v: any) => v.id === q.id || (isDraft && (v.type === 'product_draft' || v.type === 'draft')));
      if (existingIdx >= 0) {
        const existingTime = new Date(map[groupKey].versions[existingIdx].date).getTime();
        const qTime = new Date(q.date).getTime();
        if (qTime >= existingTime) {
          map[groupKey].versions[existingIdx] = { ...q, parsed };
        }
      } else {
        map[groupKey].versions.push({
          ...q,
          parsed
        });
      }

      if (new Date(q.date) > new Date(map[groupKey].latestDate)) {
        map[groupKey].latestDate = q.date;
      }
    });

    // Sort versions descending
    Object.values(map).forEach((g: any) => {
      g.versions.sort((a: any, b: any) => b.version - a.version);
    });

    return Object.values(map).sort((a: any, b: any) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [productQuotes, customers, leads]);

  // Active Finished Goods Drafts
  const activeDrafts = useMemo(() => {
    return groupedQuotes.filter((g: any) => {
      if (customerFilter !== 'all' && g.leadId !== customerFilter) return false;
      const latest = g.versions[0];
      return latest?.type === 'product_draft' || (latest?.status || '').toLowerCase() === 'draft';
    });
  }, [groupedQuotes, customerFilter]);

  // Overall KPI stats
  const kpiStats = useMemo(() => {
    let totalQuoted = 0;
    let approvedVal = 0;
    let pendingCount = 0;
    let draftsCount = 0;

    groupedQuotes.forEach((g: any) => {
      const latest = g.versions[0];
      const val = Number(latest?.totalAmount || 0);
      totalQuoted += val;
      const st = (latest?.status || 'Draft').toLowerCase();
      if (st === 'approved' || st === 'accepted') approvedVal += val;
      if (st === 'pending approval') pendingCount++;
      if (latest?.type === 'product_draft' || st === 'draft') draftsCount++;
    });

    return { totalQuoted, approvedVal, pendingCount, draftsCount };
  }, [groupedQuotes]);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      draft: 0,
      'pending approval': 0,
      approved: 0,
      sent: 0,
      rejected: 0
    };
    groupedQuotes.forEach((g: any) => {
      const latest = g.versions[0];
      const isAutoDraft = latest?.type === 'product_draft';
      const s = (latest?.status || 'Draft').toLowerCase();
      const isDraft = isAutoDraft || s === 'draft';

      if (!isDraft) {
        counts.all++;
      }
      if (isDraft) {
        counts.draft++;
      } else if (counts[s] !== undefined) {
        counts[s]++;
      }
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
      const isAutoDraft = latest?.type === 'product_draft';
      const s = status.toLowerCase();
      const isDraft = isAutoDraft || s === 'draft';

      // 1. Status filter
      if (statusFilter === 'all') {
        if (isDraft) return false;
      } else if (statusFilter === 'draft') {
        if (!isDraft) return false;
      } else {
        if (s !== statusFilter.toLowerCase()) return false;
      }

      // 2. Customer filter
      if (customerFilter !== 'all') {
        const matchCust = g.leadId === customerFilter ||
          (g.customerId && g.customerId === customerFilter) ||
          (g.leadId && customerFilter && (
            String(g.leadId).replace(/^LEAD-0*/i, '') === String(customerFilter).replace(/^LEAD-0*/i, '')
          ));
        if (!matchCust) return false;
      }

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
  const handleDelete = async (group: any, latest: any) => {
    const qLabel = group?.quoNo || latest?.quotationNo || latest?.id;
    const isDraft = latest?.type === 'product_draft' || latest?.type === 'draft' || latest?.status === 'Draft';
    const msg = isDraft 
      ? `Are you sure you want to delete product quotation draft "${qLabel}"?`
      : `Are you sure you want to delete product quotation "${qLabel}"?`;

    const ok = await showConfirm(msg, 'Delete Product Quotation', { confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      const idsToDelete = (group?.versions && group.versions.length > 0)
        ? group.versions.map((v: any) => v.id).filter(Boolean)
        : [latest?.id].filter(Boolean);

      for (const id of idsToDelete) {
        await deleteQuotation(id);
      }
      toast(`${isDraft ? 'Draft' : 'Quotation'} deleted successfully`, 'success');
      await refetch();
    } catch (e: any) {
      toast(e?.message || 'Failed to delete quotation', 'error');
    }
  };

  // Advance Proforma Invoice Generation
  const handleGenerateAdvanceProforma = (group: any, latest: any) => {
    let quoteData: any = {};
    try {
      quoteData = typeof latest?.data === 'string' ? JSON.parse(latest.data || '{}') : (latest?.data || {});
    } catch(e) {}

    const quoteTotal = Number(
      latest?.totalPrice || 
      latest?.totalAmount || 
      quoteData?.custWithSSCL || 
      quoteData?.custTotal || 
      0
    );

    const lead = leads.find((l: any) => l.id === group?.leadId);
    const custId = group?.leadId || (lead as any)?.customerId;
    const cust = customers.find((c: any) => c.id === custId || (c.company && group?.clientName && c.company.toLowerCase() === group.clientName.toLowerCase()) || (c.name && group?.clientName && c.name.toLowerCase() === group.clientName.toLowerCase()));

    const targetOrder = {
      id: latest?.id,
      orderNo: group?.quoNo || latest?.quotationNo || latest?.docNo,
      quotationNo: group?.quoNo || latest?.quotationNo || latest?.docNo,
      quoteId: latest?.id,
      customerId: cust?.id || group?.leadId || null,
      matchedCustomerId: cust?.id || group?.leadId || null,
      customerName: cust?.name || group?.clientName || latest?.leadName || 'Valued Customer',
      customerCompany: cust?.company || group?.clientName || latest?.leadCompany || cust?.name || 'Valued Customer',
      deliveryAddress: cust?.address || group?.address || latest?.address || '',
      customerAddress: cust?.address || group?.address || latest?.address || '',
      customerPhone: cust?.phone || group?.phone || latest?.phone || '',
      customerEmail: cust?.email || group?.email || latest?.email || '',
      customerVat: cust?.vat || '',
      totalPrice: quoteTotal,
      totalAmount: quoteTotal,
      taxProfileId: quoteData?.taxProfileId || null,
      items: quoteData?.custItems || quoteData?.items || [],
      productName: quoteData?.subject || `Product Quotation #${group?.quoNo}`,
      targetDeliveryDate: quoteData?.deliveryDate || quoteData?.targetDeliveryDate || null,
      notes: quoteData?.notes || `Product Quotation #${group?.quoNo} Advance Payment`
    };

    setAdvanceProformaModalOrder(targetOrder);
  };

  // Invoice Generation - Direct navigation without browser prompt
  const handleCreateInvoice = (group: any, latest: any) => {
    navigate(`/finance/invoices/new?quoteId=${latest.id}`);
  };

  // Record Customer PO for Product Quotation
  const handleRecordCustomerPo = (group: any, latest: any) => {
    setRecordPoModalData({ group, quotation: latest, type: 'product' });
  };

  // Create Sales Order from Approved Product Quotation
  const handleCreateSalesOrder = (group: any, latest: any) => {
    const parsed = latest?.parsed || {};
    const hasPo = Boolean(
      (latest?.customerPoNo && latest.customerPoNo.trim()) ||
      (parsed?.customerPoNo && parsed.customerPoNo.trim()) ||
      latest?.status === 'PO Received' ||
      latest?.status === 'PO Pending' ||
      latest?.status === 'Without PO'
    );

    if (!hasPo) {
      toast('Customer PO is required to create a Sales Order. Please record PO, PO Pending, or Without PO.', 'info');
      setRecordPoModalData({
        group,
        quotation: latest,
        type: 'product',
        proceedToSalesOrder: true
      });
      return;
    }

    setSalesOrderModalData({ group, quotation: latest, type: 'product' });
  };

  const renderActionsDropdown = (group: any, latest: any, status: string, idx: number) => {
    const isOpen = openActionId === group.quoNo;

    const linkedWo = workOrders.find((w: any) => 
      (w.quoteId && (String(w.quoteId) === String(latest?.id) || String(w.quoteId) === String(group.quoNo))) ||
      (w.orderNo && group.quoNo && w.orderNo.includes(group.quoNo))
    );

    const hasMaterialChange = Boolean(
      (latest?.materialStatus && (
        latest.materialStatus.toLowerCase().includes('substitut') ||
        latest.materialStatus.toLowerCase().includes('change') ||
        latest.materialStatus.toLowerCase().includes('shortage')
      )) ||
      (linkedWo?.materialStatus && (
        linkedWo.materialStatus.toLowerCase().includes('substitut') ||
        linkedWo.materialStatus.toLowerCase().includes('change') ||
        linkedWo.materialStatus.toLowerCase().includes('shortage')
      )) ||
      latest?.materialAlert ||
      linkedWo?.materialAlert
    );

    let menuStyle: React.CSSProperties = {};
    if (isOpen && actionCoords) {
      const PADDING = 8;
      const MENU_WIDTH = 260;

      let left = actionCoords.right - MENU_WIDTH;
      if (left < PADDING) left = PADDING;
      if (left + MENU_WIDTH > window.innerWidth - PADDING) {
        left = window.innerWidth - MENU_WIDTH - PADDING;
      }

      const spaceBelow = window.innerHeight - actionCoords.bottom - PADDING;
      const spaceAbove = actionCoords.top - PADDING;
      const openUpwards = spaceBelow < 340 && spaceAbove > spaceBelow;

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
      };
    }

    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (openActionId === group.quoNo) {
              setOpenActionId(null);
              setActionCoords(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setOpenActionId(group.quoNo);
              setActionCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
              });
            }
          }}
          className={`product-quote-action-btn relative h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none cursor-pointer ${
            isOpen
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
          }`}
          title={hasMaterialChange ? `⚠️ Material Substituted/Changed: ${linkedWo?.materialAlert || latest?.materialAlert || 'Workshop substituted material'}` : 'Actions'}
        >
          <span>Actions</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          {hasMaterialChange && (
            <span 
              className="absolute -top-1 -right-1 flex h-2.5 w-2.5" 
              title={linkedWo?.materialAlert || latest?.materialAlert || "⚠️ Material Substituted / Changed in Workshop"}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ring-2 ring-surface"></span>
            </span>
          )}
        </button>

        {isOpen && actionCoords && typeof document !== 'undefined' && createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={menuStyle}
            className="product-quote-action-menu bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1.5 text-left rounded-none overflow-y-auto custom-scrollbar"
          >
            <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
              Product Quote Actions
            </div>

            {hasMaterialChange && (
              <div className="mx-2 my-1 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-none text-[11px] flex items-start gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="block font-bold">Material Changed / Substituted</strong>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 block line-clamp-2">
                    {linkedWo?.materialAlert || latest?.materialAlert || linkedWo?.materialStatus || 'Alternative material selected on shopfloor'}
                  </span>
                </div>
              </div>
            )}

            {/* Lifecycle Stage Snapshot */}
            <button
              type="button"
              onClick={() => {
                const linkedOrder = (allOrders || []).find((o: any) => (o.quoteId && String(o.quoteId) === String(latest?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                const linkedInvoice = (allInvoices || []).find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latest?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                const allRecs = paymentReceiptsList.filter((r: any) => (r.quoteId && String(r.quoteId) === String(latest?.id)) || (r.quotationNo && r.quotationNo === group.quoNo));
                const totalAdv = allRecs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                const latestRec = allRecs[0] || null;

                setSnapshotModalData({
                  group,
                  quotation: latest,
                  linkedOrder,
                  linkedWorkOrder: linkedWo,
                  linkedInvoice,
                  totalAdvance: totalAdv,
                  latestReceipt: latestRec
                });
                setOpenActionId(null);
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
            >
              <GitBranch size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block">Stage Snapshot</span>
                <span className="text-[10px] text-muted block">View 6-stage core workflow progress</span>
              </div>
            </button>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

            {/* 1. Preview Document */}
            <button
              type="button"
              onClick={() => { setPreviewData({ quotation: latest, lead: group }); setOpenActionId(null); setActionCoords(null); }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
            >
              <Eye size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Preview Document</span>
            </button>

            {/* 2. Open in Builder */}
            <button
              type="button"
              onClick={() => { navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`); setOpenActionId(null); setActionCoords(null); }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
            >
              <Edit3 size={14} className="text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span>Edit in Quotation Builder</span>
            </button>

            {/* View Sample Photos */}
            {(() => {
              const { photos: sPhotos, grns: matchedGrns } = findMatchingSamplePhotos({
                id: latest?.id,
                quoteId: latest?.id,
                quoNo: group.quoNo,
                leadId: group.leadId,
                customerName: group.clientName || group.leadCompany || group.leadName
              }, allCustomerGrns);
              if (sPhotos.length === 0) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewingPhotos({
                      photos: sPhotos,
                      title: `Sample Photos - Quotation ${group.quoNo} (${matchedGrns.map(g => g.id).join(', ')})`
                    });
                    setOpenActionId(null);
                    setActionCoords(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <Camera size={14} className="shrink-0 text-amber-500" />
                  <span>View Sample Photos ({sPhotos.length})</span>
                </button>
              );
            })()}

            {/* 3. Send Email */}
            <button
              type="button"
              disabled={latest?.status === 'Pending Approval' || status === 'Pending Approval'}
              onClick={() => {
                if (latest?.status === 'Pending Approval' || status === 'Pending Approval') {
                  alert(`Quotation ${group.quoNo} has been sent for approval and is currently "Pending Approval". It cannot be emailed until formally approved.`);
                  return;
                }
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
                setActionCoords(null);
              }}
              className={`w-full px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors text-left ${
                (latest?.status === 'Pending Approval' || status === 'Pending Approval')
                  ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/50'
                  : 'text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
              }`}
              title={(latest?.status === 'Pending Approval' || status === 'Pending Approval') ? 'Cannot email: Quotation is Pending Approval' : 'Send Quotation via Email'}
            >
              <Mail size={14} className={(latest?.status === 'Pending Approval' || status === 'Pending Approval') ? 'text-zinc-400 shrink-0' : 'text-indigo-600 dark:text-indigo-400 shrink-0'} />
              <span>Send via Email</span>
              {(latest?.status === 'Pending Approval' || status === 'Pending Approval') && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Pending Approval
                </span>
              )}
            </button>

            {/* Commercial Actions (If Approved / Sent / Accepted / PO Received) */}
            {(status === 'Approved' || status === 'Sent' || status === 'Accepted' || status === 'PO Received') && (
              <>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Commercial Operations
                </div>

                <button
                  type="button"
                  onClick={() => { handleRecordCustomerPo(group, latest); setOpenActionId(null); setActionCoords(null); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <FileCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>PO Received</span>
                </button>

                <button
                  type="button"
                  onClick={() => { handleCreateSalesOrder(group, latest); setOpenActionId(null); setActionCoords(null); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <ShoppingBag size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Create Sales Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => { handleGenerateAdvanceProforma(group, latest); setOpenActionId(null); setActionCoords(null); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="shrink-0 text-amber-500" />
                  <span>Generate Advance Proforma</span>
                </button>

                <button
                  type="button"
                  onClick={() => { handleOpenReceiptModal(group, latest); setOpenActionId(null); setActionCoords(null); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <Receipt size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Issue Advance Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => { handleCreateInvoice(group, latest); setOpenActionId(null); setActionCoords(null); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                >
                  <FileText size={14} className="shrink-0 text-emerald-500" />
                  <span>Generate Tax Invoice</span>
                </button>
              </>
            )}

            {/* Approval Actions */}
            {latest?.type !== 'draft' && latest?.type !== 'product_draft' && ((status === 'Draft' || !status || status === 'Rejected') || (canApprove && status === 'Pending Approval')) && (
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
                      setActionCoords(null);
                      try {
                        await submitQuotationForApproval(latest.id);
                        toast('Submitted for approval', 'success');
                        refetch();
                      } catch(err: any) {
                        toast(err?.message || 'Failed to submit', 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                  >
                    <Send size={14} className="shrink-0 text-amber-500" />
                    <span>Submit for Approval</span>
                  </button>
                )}

                {canApprove && status === 'Pending Approval' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setOpenActionId(null);
                      setActionCoords(null);
                      try {
                        await approveQuotation(latest.id, user?.name || 'Manager');
                        toast('Quotation approved successfully!', 'success');
                        refetch();
                      } catch(err: any) {
                        toast(err?.message || 'Failed to approve', 'error');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    <span>Approve Quotation</span>
                  </button>
                )}

                {canApprove && status === 'Pending Approval' && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionId(null);
                      setActionCoords(null);
                      setRejectionTarget(latest);
                      setRejectionReason('');
                      setRejectionModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
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
              onClick={() => { handleDelete(group, latest); setOpenActionId(null); setActionCoords(null); }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
            >
              <Trash2 size={14} className="shrink-0 text-rose-500" />
              <span>Delete Quotation</span>
            </button>
          </div>,
          document.body
        )}
      </div>
    );
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
            {!canViewAll ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Your account permissions only permit viewing quotations created by you">
                <UserCheck size={12} />
                My Quotations ({user?.name || user?.username})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Full sales management visibility across all team members">
                <Shield size={12} />
                All Team Quotes
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {filteredGroups.length} product {filteredGroups.length === 1 ? 'quotation' : 'quotations'}
            {(search || statusFilter !== 'all' || customerFilter !== 'all' || startDate || endDate) && ' (filtered)'} &middot; Total Quoted Value:{' '}
            <span className="font-mono font-bold text-primary">{formatCurrency(totalQuotedValue)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="crm-product-quotations" />
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

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={1} />

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-surface border border-theme-subtle rounded-none flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Product Quoted</span>
            <span className="text-base lg:text-lg font-bold font-mono text-primary mt-0.5 block">{formatCurrency(kpiStats.totalQuoted)}</span>
            <span className="text-[11px] text-muted font-mono">{groupedQuotes.length} total quotes</span>
          </div>
          <div className="w-9 h-9 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="p-3 bg-surface border border-theme-subtle rounded-none flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Approved / Won</span>
            <span className="text-base lg:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">{formatCurrency(kpiStats.approvedVal)}</span>
            <span className="text-[11px] text-muted">Confirmed orders</span>
          </div>
          <div className="w-9 h-9 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="p-3 bg-surface border border-theme-subtle rounded-none flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Pending Approval</span>
            <span className="text-base lg:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">{kpiStats.pendingCount}</span>
            <span className="text-[11px] text-muted">Awaiting review</span>
          </div>
          <div className="w-9 h-9 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock size={18} />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('draft')}
          className="p-3 bg-surface border border-theme-subtle hover:border-orange-500/50 rounded-none flex items-center justify-between cursor-pointer transition-colors shadow-xs"
          title="Click to view drafts"
        >
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Active Drafts</span>
            <span className="text-base lg:text-lg font-bold font-mono text-orange-600 dark:text-orange-400 mt-0.5 block">{kpiStats.draftsCount}</span>
            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Ready to resume &rarr;</span>
          </div>
          <div className="w-9 h-9 rounded-none bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
            <FileEdit size={18} />
          </div>
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

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
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
            <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-surface2 text-primary font-bold shadow-xs' : 'text-muted hover:text-primary'
                }`}
                title="Table List View"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-surface2 text-primary font-bold shadow-xs' : 'text-muted hover:text-primary'
                }`}
                title="Cards View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
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

          {canViewAll && salesRepOptions.length > 0 && (
            <>
              <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-muted shrink-0" />
                <span className="text-muted font-semibold uppercase tracking-wider text-xs">Sales Rep:</span>
                <select
                  value={salesRepFilter}
                  onChange={e => setSalesRepFilter(e.target.value)}
                  className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
                >
                  <option value="all">All Reps ({salesRepOptions.length})</option>
                  {salesRepOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </>
          )}

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
      {filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-muted border border-theme-subtle bg-surface">
          <PackageCheck size={32} className="mx-auto mb-2 opacity-30 text-emerald-500" />
          <p className="text-sm font-medium">
            {statusFilter === 'draft'
              ? 'No product quotation drafts found.'
              : 'No product quotations match your search or filter criteria.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-theme-subtle bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[380px] pb-28 custom-scrollbar">
            <table className="w-full text-left min-w-[950px]">
              <thead className="bg-surface2/60 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">Quote # & Ver</th>
                  <th className="px-3.5 py-3">Customer / Client</th>
                  <th className="px-3.5 py-3">Catalog Items</th>
                  <th className="px-3.5 py-3">Date</th>
                  <th className="px-3.5 py-3 text-right">Quoted Value</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/30 text-xs">
                {filteredGroups.map((group: any, idx: number) => {
                  const latest = group.versions[0];
                  const parsed = latest?.parsed || {};
                  const status = latest?.status || 'Draft';
                  const itemsCount = parsed.custItems?.length || 0;
                  const recs = getQuoteReceipts(group, latest);
                  const totalAdv = recs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                  const latestRec = recs.length > 0 ? recs[recs.length - 1] : null;
                  const isRevisionsExpanded = !!expandedRevisions[group.quoNo];

                  const cust = customers.find((c: any) =>
                    (group.leadId && c.leadId && String(c.leadId) === String(group.leadId)) ||
                    (group.clientCompany && c.company && c.company.toLowerCase() === group.clientCompany.toLowerCase()) ||
                    (group.clientName && c.name && c.name.toLowerCase() === group.clientName.toLowerCase())
                  );
                  const customerRequiresAdvance = Boolean(cust && (cust.requiresAdvance === true || cust.requiresAdvance === 1));

                  const isInfoOpen = openInfoId === group.quoNo;
                  let infoMenuStyle: React.CSSProperties = {};
                  if (isInfoOpen && infoCoords) {
                    const PADDING = 8;
                    const MENU_WIDTH = 290;

                    let left = infoCoords.left;
                    if (left + MENU_WIDTH > window.innerWidth - PADDING) {
                      left = window.innerWidth - MENU_WIDTH - PADDING;
                    }
                    if (left < PADDING) left = PADDING;

                    const spaceBelow = window.innerHeight - infoCoords.bottom - PADDING;
                    const spaceAbove = infoCoords.top - PADDING;
                    const openUpwards = spaceBelow < 300 && spaceAbove > spaceBelow;

                    infoMenuStyle = {
                      position: 'fixed',
                      left: `${left}px`,
                      width: `${MENU_WIDTH}px`,
                      zIndex: 99999,
                      maxHeight: openUpwards ? `${Math.min(420, spaceAbove)}px` : `${Math.min(420, spaceBelow)}px`,
                      ...(openUpwards 
                        ? { bottom: `${window.innerHeight - infoCoords.top + 4}px` } 
                        : { top: `${infoCoords.bottom + 4}px` }
                      )
                    };
                  }

                  return (
                    <React.Fragment key={group.quoNo}>
                      <tr className={`hover:bg-surface2/40 transition-colors ${openActionId === group.quoNo ? 'relative z-50 bg-surface2/60' : 'relative z-0'}`}>
                        {/* Quote # & Version */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`)}
                              className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:underline hover:text-amber-500 cursor-pointer text-left transition-colors whitespace-nowrap"
                              title="Click to open quotation in builder"
                            >
                              {group.quoNo}
                            </button>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-surface2 text-muted border border-theme-subtle shrink-0">
                              v{latest?.version || 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openInfoId === group.quoNo) {
                                  setOpenInfoId(null);
                                  setInfoCoords(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setOpenInfoId(group.quoNo);
                                  setInfoCoords({
                                    top: rect.top,
                                    bottom: rect.bottom,
                                    left: rect.left,
                                    right: rect.right,
                                  });
                                }
                              }}
                              className={`product-quotation-info-trigger-btn p-1 rounded-none border transition-colors shrink-0 ${
                                isInfoOpen
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                  : 'bg-surface2 hover:bg-surface3 text-muted hover:text-primary border-theme-subtle'
                              }`}
                              title="View Quote Info & Tags"
                            >
                              <Info size={11} className="shrink-0" />
                            </button>
                            {group.versions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setExpandedRevisions(p => ({ ...p, [group.quoNo]: !p[group.quoNo] }))}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle transition-colors flex items-center gap-0.5 shrink-0"
                                title="Toggle version revisions"
                              >
                                {group.versions.length} revs
                                <ChevronDown size={9} className={`transition-transform duration-150 ${isRevisionsExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {/* Info Dropdown Portal */}
                          {isInfoOpen && infoCoords && typeof document !== 'undefined' && createPortal(
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={infoMenuStyle}
                              className="product-quotation-info-menu-dropdown bg-surface dark:bg-zinc-900 border border-theme-subtle shadow-2xl p-3 text-left rounded-none overflow-y-auto custom-scrollbar"
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-theme-subtle">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs text-primary">{group.quoNo}</span>
                                  <span className="text-[10px] font-mono px-1 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                                    v{latest?.version || 1}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                                  Product Quote
                                </span>
                              </div>

                              {/* Metadata list */}
                              <div className="space-y-2.5 text-xs">
                                {/* Customer PO */}
                                <div className="p-2 bg-surface2/60 border border-theme-subtle">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Customer PO</span>
                                    {(latest?.customerPoNo || parsed.customerPoNo) ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 size={9} /> Recorded
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInfoId(null);
                                          setRecordPoModalData({ group, quotation: latest, type: 'product' });
                                        }}
                                        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                      >
                                        + Record PO
                                      </button>
                                    )}
                                  </div>
                                  {(latest?.customerPoNo || parsed.customerPoNo) ? (
                                    <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                      <FileCheck size={12} className="shrink-0" />
                                      PO: #{latest?.customerPoNo || parsed.customerPoNo}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-muted italic">
                                      No PO attached yet
                                    </div>
                                  )}
                                </div>

                                {/* Customer Terms & Registration */}
                                <div>
                                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">Customer / Client</span>
                                  <div className="font-semibold text-primary text-xs truncate">
                                    {group.clientCompany || group.clientName || 'Direct Customer'}
                                  </div>
                                  {group.clientCompany && group.clientName && (
                                    <div className="text-[11px] text-muted truncate">
                                      Attn: {group.clientName}
                                    </div>
                                  )}
                                  <div className="mt-1">
                                    {customerRequiresAdvance ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/20 font-medium">
                                        ⚠️ Advance Required (Registration)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20 font-medium">
                                        ✓ No Advance Required (Direct Order)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Revisions & Date */}
                                <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-[11px] text-muted">
                                  <span>Revisions: <strong className="text-primary">{group.versions.length}</strong></span>
                                  <span>Date: <strong className="text-primary">{formatDate(latest?.date || latest?.createdAt)}</strong></span>
                                </div>
                              </div>
                            </div>,
                            document.body
                          )}
                        </td>

                        {/* Customer / Client */}
                        <td className="px-3.5 py-2 max-w-[220px]">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-primary truncate" title={group.clientCompany || group.clientName}>
                              {group.clientCompany || group.clientName}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-muted truncate">
                              {group.clientCompany && group.clientName ? (
                                <span>Attn: {group.clientName}</span>
                              ) : null}
                              {(latest?.customerPoNo || parsed.customerPoNo) && (
                                <span 
                                  className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-0.5 shrink-0"
                                  title={`Customer PO: ${latest?.customerPoNo || parsed.customerPoNo}`}
                                >
                                  <FileCheck size={10} /> PO: {latest?.customerPoNo || parsed.customerPoNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Catalog Items */}
                        <td className="px-3.5 py-2.5">
                          {parsed.custItems && parsed.custItems.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {parsed.custItems.slice(0, 2).map((item: any, iIdx: number) => (
                                <span key={iIdx} className="text-[10px] font-medium px-1.5 py-0.2 bg-surface2 text-secondary border border-theme-subtle flex items-center gap-1 truncate max-w-[170px]" title={item.name || item.desc}>
                                  <Package size={10} className="text-emerald-500 shrink-0" />
                                  <span className="truncate">{item.name || item.desc || 'Product'}</span>
                                  <span className="font-mono text-muted">×{item.qty || 1}</span>
                                </span>
                              ))}
                              {parsed.custItems.length > 2 && (
                                <span className="text-[10px] font-mono text-muted px-1.5 py-0.2 bg-surface2 border border-theme-subtle">
                                  +{parsed.custItems.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted italic">Finished Goods</span>
                          )}
                          {parsed.subject && (
                            <p className="text-[11px] text-muted truncate max-w-[200px] mt-0.5">
                              {parsed.subject}
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span 
                            className="font-mono text-[11px] text-primary block" 
                            title={parsed.custValidity ? `Validity: ${parsed.custValidity}` : undefined}
                          >
                            {formatDate(group.latestDate)}
                          </span>
                        </td>

                        {/* Total Quoted Value */}
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-xs text-primary">
                              {formatCurrency(Number(latest.totalAmount || 0))}
                            </span>
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
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors mt-0.5"
                                title={`View Advance Payment: ${formatCurrency(totalAdv)}`}
                              >
                                <Receipt size={9} /> Adv: {formatCurrency(totalAdv)}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-none border ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>

                        {/* Traceability Dropdown with Glowing Lamp */}
                        <td className="px-3 py-2.5 text-center">
                          <TraceabilityDropdown
                            title={`Product Quote #${group.quoNo}`}
                            traces={(() => {
                              const traces: TraceNode[] = [];
                              const linkedOrder = allOrders.find((o: any) => (o.quoteId && String(o.quoteId) === String(latest?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                              const linkedWo = workOrders.find((w: any) => 
                                (w.sourceQuoteId && String(w.sourceQuoteId) === String(latest?.id)) || 
                                (w.quoteId && String(w.quoteId) === String(latest?.id)) || 
                                (w.title && group.quoNo && w.title.includes(group.quoNo)) || 
                                (w.orderNo && group.quoNo && w.orderNo.includes(group.quoNo))
                              );
                              const linkedInvoice = allInvoices.find((inv: any) => 
                                (inv.quotationId && String(inv.quotationId) === String(latest?.id)) || 
                                (inv.quotationNo && inv.quotationNo === group.quoNo)
                              );

                              if (linkedOrder) {
                                traces.push({
                                  type: 'order',
                                  title: 'Sales Order',
                                  reference: linkedOrder.orderNo,
                                  subtitle: `Customer Order • ${linkedOrder.customerName || ''}`,
                                  statusBadge: { label: linkedOrder.status || 'Active Order', variant: 'info' },
                                  navigateUrl: `/crm/sales-orders?search=${encodeURIComponent(linkedOrder.orderNo)}`
                                });
                              }

                              if (linkedWo) {
                                traces.push({
                                  type: 'work_order',
                                  title: 'Work Order',
                                  reference: linkedWo.orderNo || linkedWo.id,
                                  subtitle: `Production Job • ${linkedWo.title || ''}`,
                                  statusBadge: { 
                                    label: linkedWo.status || 'In Production', 
                                    variant: linkedWo.status === 'Completed' ? 'success' : 'warning' 
                                  },
                                  navigateUrl: `/production/work-orders?search=${encodeURIComponent(linkedWo.orderNo || linkedWo.id)}`
                                });
                              }

                              if (linkedInvoice) {
                                traces.push({
                                  type: 'invoice',
                                  title: 'Tax Invoice',
                                  reference: linkedInvoice.invoiceNo || linkedInvoice.id,
                                  subtitle: linkedInvoice.status === 'paid' ? 'Paid in Full' : 'Awaiting Payment',
                                  statusBadge: { 
                                    label: linkedInvoice.status === 'paid' ? 'Paid' : 'Invoice', 
                                    variant: linkedInvoice.status === 'paid' ? 'success' : 'warning' 
                                  },
                                  navigateUrl: `/finance/invoices?search=${encodeURIComponent(linkedInvoice.invoiceNo || linkedInvoice.id)}`
                                });
                              }

                              if (totalAdv > 0 && latestRec) {
                                traces.push({
                                  type: 'receipt',
                                  title: 'Advance Payment',
                                  reference: latestRec.receiptNo || 'Payment Receipt',
                                  subtitle: `Advance: ${formatCurrency(totalAdv)}`,
                                  statusBadge: { label: 'Advance Paid', variant: 'success' },
                                  onClick: () => {
                                    setActivePrintReceipt({
                                      ...latestRec,
                                      totalQuoted: Number(latest.totalAmount || latest.customAmount || 0)
                                    });
                                    setPrintReceiptModalOpen(true);
                                  }
                                });
                              }

                              return traces;
                            })()}
                          />
                        </td>

                        {/* Actions */}
                        <td className={`px-4 py-2.5 text-right ${openActionId === group.quoNo ? 'relative z-50' : 'relative z-0'}`}>
                          <div className="flex items-center justify-end gap-1.5 product-quote-action-menu-container">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => setPreviewData({ quotation: latest, lead: group })}
                              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                              title="View Document Preview"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit3}
                              onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`)}
                              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                              title="Edit in Quotation Builder"
                            >
                              Edit
                            </Button>

                            {/* STAGE SNAPSHOT BUTTON */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const linkedWo = workOrders.find((w: any) => 
                                  (w.quoteId && (String(w.quoteId) === String(latest?.id) || String(w.quoteId) === String(group.quoNo))) ||
                                  (w.orderNo && group.quoNo && w.orderNo.includes(group.quoNo))
                                );
                                const linkedOrder = (allOrders || []).find((o: any) => (o.quoteId && String(o.quoteId) === String(latest?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                                const linkedInvoice = (allInvoices || []).find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latest?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                                const allRecs = paymentReceiptsList.filter((r: any) => (r.quoteId && String(r.quoteId) === String(latest?.id)) || (r.quotationNo && r.quotationNo === group.quoNo));
                                const totalAdv = allRecs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                                const latestRec = allRecs[0] || null;

                                setSnapshotModalData({
                                  group,
                                  quotation: latest,
                                  linkedOrder,
                                  linkedWorkOrder: linkedWo,
                                  linkedInvoice,
                                  totalAdvance: totalAdv,
                                  latestReceipt: latestRec
                                });
                              }}
                              className="relative h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2 flex items-center gap-1 text-secondary hover:text-primary font-medium"
                              title="View Lifecycle Stage Snapshot"
                            >
                              <GitBranch size={13} className="text-secondary shrink-0" />
                              <span className="hidden xl:inline">Stage</span>
                              {Boolean(
                                (latest?.materialStatus && (
                                  latest.materialStatus.toLowerCase().includes('substitut') ||
                                  latest.materialStatus.toLowerCase().includes('change') ||
                                  latest.materialStatus.toLowerCase().includes('shortage')
                                )) ||
                                latest?.materialAlert
                              ) && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-1 ring-surface"></span>
                                </span>
                              )}
                            </Button>

                            {renderActionsDropdown(group, latest, status, idx)}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Revisions Row in Table */}
                      {isRevisionsExpanded && group.versions.length > 1 && (
                        <tr className="bg-surface2/25">
                          <td colSpan={8} className="px-6 py-3 border-b border-theme-subtle">
                            <div className="space-y-1.5 animate-fade-in">
                              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <History size={11} className="text-emerald-500" />
                                Quotation Versions ({group.versions.length})
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {group.versions.map((v: any) => {
                                  const isLatest = v.id === latest.id;
                                  return (
                                    <div
                                      key={v.id}
                                      className={`flex items-center justify-between px-2.5 py-1.5 border text-xs rounded-none transition-colors ${
                                        isLatest
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-primary'
                                          : 'bg-surface border-theme-subtle text-secondary'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-bold font-mono text-primary shrink-0">v{v.version}</span>
                                        {isLatest && (
                                          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded-none uppercase">
                                            Active
                                          </span>
                                        )}
                                        <span className="font-mono text-secondary text-xs truncate">
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
                                          className="p-1 text-primary hover:bg-surface2 rounded-none transition-colors"
                                          title={`Edit Version v${v.version}`}
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
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
                className={`p-3.5 hover:border-emerald-500/40 transition-all duration-200 border-theme-subtle rounded-none flex flex-col justify-between ${
                  openActionId === group.quoNo ? 'relative z-50 shadow-2xl' : 'relative z-0'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-theme-subtle/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`)}
                        className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 hover:underline hover:text-amber-500 cursor-pointer text-left transition-colors"
                        title="Click to open quotation in builder"
                      >
                        {group.quoNo}
                      </button>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                        v{latest?.version || 1}
                      </span>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 border ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {formatDate(group.latestDate)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-primary truncate" title={group.clientCompany || group.clientName}>
                      {group.clientCompany || group.clientName}
                    </h4>
                    {group.clientCompany && group.clientName && (
                      <p className="text-xs text-muted truncate">Attn: {group.clientName}</p>
                    )}
                    {parsed.subject && (
                      <p className="text-xs text-secondary truncate mt-1">{parsed.subject}</p>
                    )}
                  </div>

                  {/* Catalog items */}
                  {parsed.custItems && parsed.custItems.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {parsed.custItems.slice(0, 3).map((item: any, iIdx: number) => (
                        <span key={iIdx} className="text-[10px] font-medium px-1.5 py-0.5 bg-surface2 text-secondary border border-theme-subtle flex items-center gap-1 truncate max-w-[200px]" title={item.name || item.desc}>
                          <Package size={10} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{item.name || item.desc || 'Product'}</span>
                          <span className="text-[10px] font-mono text-muted">×{item.qty || 1}</span>
                        </span>
                      ))}
                      {parsed.custItems.length > 3 && (
                        <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 bg-surface2 border border-theme-subtle">
                          +{parsed.custItems.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {totalAdv > 0 && latestRec && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePrintReceipt({
                            ...latestRec,
                            totalQuoted: Number(latest.totalAmount || latest.customAmount || 0)
                          });
                          setPrintReceiptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      >
                        <Receipt size={10} /> Adv: {formatCurrency(totalAdv)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-theme-subtle flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">Total Value</span>
                    <span className="text-sm font-bold font-mono text-primary block">
                      {formatCurrency(Number(latest.totalAmount || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 product-quote-action-menu-container">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewData({ quotation: latest, lead: group })}
                      className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                      title="View Document Preview"
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Edit3}
                      onClick={() => navigate(`/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${latest.id}`)}
                      className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                      title="Edit in Builder"
                    >
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const linkedWo = workOrders.find((w: any) => 
                          (w.quoteId && (String(w.quoteId) === String(latest?.id) || String(w.quoteId) === String(group.quoNo))) ||
                          (w.orderNo && group.quoNo && w.orderNo.includes(group.quoNo))
                        );
                        const linkedOrder = (allOrders || []).find((o: any) => (o.quoteId && String(o.quoteId) === String(latest?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                        const linkedInvoice = (allInvoices || []).find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latest?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                        const allRecs = paymentReceiptsList.filter((r: any) => (r.quoteId && String(r.quoteId) === String(latest?.id)) || (r.quotationNo && r.quotationNo === group.quoNo));
                        const totalAdv = allRecs.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                        const latestRec = allRecs[0] || null;

                        setSnapshotModalData({
                          group,
                          quotation: latest,
                          linkedOrder,
                          linkedWorkOrder: linkedWo,
                          linkedInvoice,
                          totalAdvance: totalAdv,
                          latestReceipt: latestRec
                        });
                      }}
                      className="relative h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2 flex items-center gap-1 text-secondary hover:text-primary font-medium"
                      title="View Lifecycle Stage Snapshot"
                    >
                      <GitBranch size={13} className="text-secondary shrink-0" />
                      <span>Stage</span>
                      {Boolean(
                        (latest?.materialStatus && (
                          latest.materialStatus.toLowerCase().includes('substitut') ||
                          latest.materialStatus.toLowerCase().includes('change') ||
                          latest.materialStatus.toLowerCase().includes('shortage')
                        )) ||
                        latest?.materialAlert
                      ) && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-1 ring-surface"></span>
                        </span>
                      )}
                    </Button>

                    {renderActionsDropdown(group, latest, status, idx)}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <Modal
          isOpen={Boolean(previewData)}
          onClose={() => setPreviewData(null)}
          title={`Quotation Preview - ${previewData.quotation?.parsed?.quotationNo || previewData.quotation?.id}`}
          size="4xl"
        >
          <div className="space-y-4">
            {previewData.quotation?.status === 'Pending Approval' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Approval Required:</strong> This quotation has been sent for approval and is currently <strong>Pending Approval</strong>. Downloading PDF and printing are locked until it is formally approved.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pb-3 border-b border-theme-subtle">
              <Button
                variant="ghost"
                size="sm"
                icon={Download}
                disabled={previewData.quotation?.status === 'Pending Approval'}
                onClick={async () => {
                  if (previewData.quotation?.status === 'Pending Approval') {
                    alert('This quotation is currently Pending Approval and cannot be downloaded until approved.');
                    return;
                  }
                  const el = document.getElementById('print-section') || document.getElementById('product-quote-list-print');
                  if (el) {
                    const quoteNo = previewData.quotation?.parsed?.quotationNo || previewData.quotation?.id || 'PQ';
                    await exportPdf(el, `Quotation_${quoteNo}.pdf`);
                  }
                }}
                className={`text-xs font-semibold ${previewData.quotation?.status === 'Pending Approval' ? 'opacity-50 cursor-not-allowed bg-surface border border-theme-subtle' : 'bg-surface border border-theme-subtle hover:bg-surface2'}`}
              >
                Download PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={previewData.quotation?.status === 'Pending Approval'}
                onClick={() => {
                  if (previewData.quotation?.status === 'Pending Approval') {
                    alert('This quotation is currently Pending Approval and cannot be printed until approved.');
                    return;
                  }
                  printElement('print-section', previewData.quotation?.parsed?.quotationNo || 'Product_Quotation');
                }}
                className={`font-bold text-xs ${previewData.quotation?.status === 'Pending Approval' ? 'opacity-50 cursor-not-allowed bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                Print Quotation
              </Button>
            </div>

            <div id="product-quote-list-print" className="bg-white text-black p-2 overflow-x-auto">
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

      {/* Sample Photos Lightbox Viewer */}
      <SamplePhotoViewerModal
        isOpen={!!activeViewingPhotos}
        onClose={() => setActiveViewingPhotos(null)}
        photos={activeViewingPhotos?.photos || []}
        title={activeViewingPhotos?.title || 'Sample Photos'}
      />

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

      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRejectionTarget(null);
          setRejectionReason('');
        }}
        title="Reject Quotation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-secondary">
            Please enter the reason or return notes for rejecting quotation <span className="font-mono font-semibold text-primary">{rejectionTarget?.quotationNo || rejectionTarget?.docNo || rejectionTarget?.id}</span>.
          </p>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Rejection Reason / Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Price margin requires revision / Delivery timeline unsuitable..."
              className="w-full text-xs p-2.5 bg-surface2 border border-theme-subtle rounded-none focus:outline-none focus:border-rose-500 text-primary resize-none"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-subtle">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejectionModalOpen(false);
                setRejectionTarget(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!rejectionReason.trim()}
              onClick={async () => {
                if (!rejectionTarget || !rejectionReason.trim()) return;
                try {
                  await rejectQuotation(rejectionTarget.id, rejectionReason.trim());
                  toast('Quotation rejected with notes', 'info');
                  setRejectionModalOpen(false);
                  setRejectionTarget(null);
                  setRejectionReason('');
                  refetch();
                } catch(err: any) {
                  toast(err?.message || 'Failed to reject quotation', 'error');
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── PRODUCT QUOTATION LIFECYCLE STAGE SNAPSHOT MODAL ─────────────── */}
      {snapshotModalData && (
        <QuotationStageSnapshotModal
          isOpen={!!snapshotModalData}
          onClose={() => setSnapshotModalData(null)}
          group={snapshotModalData.group}
          quotation={snapshotModalData.quotation}
          linkedOrder={snapshotModalData.linkedOrder}
          linkedWorkOrder={snapshotModalData.linkedWorkOrder}
          linkedInvoice={snapshotModalData.linkedInvoice}
          totalAdvance={snapshotModalData.totalAdvance}
          latestReceipt={snapshotModalData.latestReceipt}
          onCreateSalesOrder={() => handleCreateSalesOrder(snapshotModalData.group, snapshotModalData.quotation)}
          onGenerateAdvanceProforma={() => handleGenerateAdvanceProforma(snapshotModalData.group, snapshotModalData.quotation)}
          onPreviewPdf={() => setPreviewData({
            quotation: snapshotModalData.quotation,
            lead: snapshotModalData.group
          })}
        />
      )}

      {/* ── CREATE SALES ORDER MODAL WITH CUSTOMER PO ── */}
      <CreateSalesOrderModal
        isOpen={Boolean(salesOrderModalData)}
        onClose={() => setSalesOrderModalData(null)}
        quotationData={salesOrderModalData}
      />

      {/* ── RECORD CUSTOMER PO MODAL ── */}
      <RecordCustomerPoModal
        isOpen={Boolean(recordPoModalData)}
        onClose={() => setRecordPoModalData(null)}
        quotationData={recordPoModalData}
        onSuccess={(updatedQuote, proceedToSalesOrder) => {
          refetch();
          if (recordPoModalData && (proceedToSalesOrder || recordPoModalData.proceedToSalesOrder)) {
            const enrichedQuote = {
              ...recordPoModalData.quotation,
              ...(updatedQuote || {}),
              customerPoNo: updatedQuote?.customerPoNo || recordPoModalData.quotation?.customerPoNo
            };
            setSalesOrderModalData({
              group: recordPoModalData.group,
              quotation: enrichedQuote,
              type: recordPoModalData.type
            });
          }
        }}
      />
      {/* ── CREATE ADVANCE PROFORMA INVOICE MODAL ── */}
      {advanceProformaModalOrder && (
        <CreateAdvanceProformaModal
          isOpen={true}
          onClose={() => setAdvanceProformaModalOrder(null)}
          order={advanceProformaModalOrder}
          settings={settings}
          onSuccess={(inv) => {
            setAdvanceProformaModalOrder(null);
            setActivePrintProforma(inv);
            refetch();
            toast('Advance Proforma Invoice generated successfully!', 'success');
          }}
        />
      )}

      {/* ── PRINT / VIEW PROFORMA INVOICE MODAL ── */}
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