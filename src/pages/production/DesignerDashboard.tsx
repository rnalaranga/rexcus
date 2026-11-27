import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Filter,
  Briefcase,
  Factory,
  Package,
  Printer,
  CheckCircle2,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Layers,
  Ruler,
  LayoutGrid,
  List,
  RefreshCw,
  Camera,
  ShoppingBag,
  GitBranch,
  FileCheck,
  ShieldCheck,
  Wrench,
  CornerDownRight,
  Paperclip,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/Modal';
import { useDialog } from '@/components/ui/DialogProvider';
import { QuotationPrintView } from '@/components/QuotationPrintView';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import {
  useQuotations,
  useLeads,
  useCustomers,
  useFinishedGoodsOrders,
} from '@/hooks/useData';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { formatDate } from '@/lib/utils';
import { exportPdf } from '@/lib/exportPdf';
import {
  fetchWorkOrders,
  fetchAllCustomerGRNs,
  createWorkOrder,
} from '@/lib/api';
import { findMatchingSamplePhotos } from '@/lib/samplePhotos';
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete';
import { printElement } from '@/lib/printElement';
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal';
import { Pagination } from '@/components/ui/Pagination';
import { WorkOrderPrintModal } from '@/components/production/WorkOrderPrintModal';
import {
  QuotationAttachmentsGallery,
  QuotationAttachmentItem,
} from '@/components/crm/QuotationAttachmentsGallery';
import { QuotationAttachmentsModal } from '@/components/crm/QuotationAttachmentsModal';

const extractQuoteAttachments = (parsed: any): QuotationAttachmentItem[] => {
  if (!parsed) return [];
  const list: QuotationAttachmentItem[] = [];

  if (Array.isArray(parsed.attachments)) {
    parsed.attachments.forEach((att: any, idx: number) => {
      if (att && (att.dataUrl || att.url)) {
        list.push({
          id: att.id || `quote-att-${idx}`,
          name: att.name || `Quotation Attachment ${idx + 1}`,
          type: att.type,
          dataUrl: att.dataUrl,
          url: att.url,
          source: 'Quotation Specs',
        });
      }
    });
  }

  if (Array.isArray(parsed.boms)) {
    parsed.boms.forEach((bom: any, bIdx: number) => {
      const partName = bom.title || `Part #${bIdx + 1}`;
      if (Array.isArray(bom.attachments)) {
        bom.attachments.forEach((ba: any, aIdx: number) => {
          if (ba && (ba.dataUrl || ba.url)) {
            list.push({
              id: ba.id || `bom-${bIdx}-att-${aIdx}`,
              name: ba.name || `${partName} Drawing ${aIdx + 1}`,
              type: ba.type,
              dataUrl: ba.dataUrl,
              url: ba.url,
              source: `Part #${bIdx + 1}: ${partName}`,
              bomTitle: partName,
            });
          }
        });
      }
    });
  }

  return list;
};

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'accepted':
    case 'won':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'po received':
      return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold';
    case 'po pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold';
    case 'without po':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-bold';
    case 'in production':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
    case 'sent':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
    case 'pending approval':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'rejected':
    case 'lost':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
    default:
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30';
  }
};

export const DesignerDashboard: React.FC = () => {
  const { toast, showConfirm } = useDialog();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const { data: quotations = [], loading, refetch } = useQuotations();
  const { data: leads = [] } = useLeads();
  const { data: customers = [] } = useCustomers();
  const { data: allOrders = [], refetch: refetchOrders } = useFinishedGoodsOrders();

  const [workOrdersList, setWorkOrdersList] = useState<any[]>([]);
  const [allCustomerGrns, setAllCustomerGrns] = useState<any[]>([]);
  const [creatingWoForQuote, setCreatingWoForQuote] = useState<string | null>(null);

  const loadWorkOrdersAndGrns = useCallback(async () => {
    try {
      const [wos, grns] = await Promise.all([
        fetchWorkOrders().catch(() => []),
        fetchAllCustomerGRNs().catch(() => []),
      ]);
      setWorkOrdersList(Array.isArray(wos) ? wos : []);
      setAllCustomerGrns(Array.isArray(grns) ? grns : []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadWorkOrdersAndGrns();
  }, [loadWorkOrdersAndGrns]);

  const handleRefreshAll = () => {
    refetch();
    refetchOrders();
    loadWorkOrdersAndGrns();
  };

  // Search & Filter states (same structure as Quotations.tsx)
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(
    () => searchParams.get('search') || searchParams.get('id') || ''
  );
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'custom' | 'product'>('all');
  const [bomStatusFilter, setBomStatusFilter] = useState<
    'all' | 'pending_bom' | 'bom_planned' | 'in_production' | 'completed'
  >('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Column Sorting
  const [qSortField, setQSortField] = useState<string>('date');
  const [qSortDir, setQSortDir] = useState<'asc' | 'desc'>('desc');

  const handleToggleQSort = (field: string) => {
    if (qSortField === field) {
      setQSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setQSortField(field);
      setQSortDir('asc');
    }
  };

  const renderQSortIndicator = (field: string) => {
    if (qSortField !== field) {
      return <span className="text-muted/40 font-mono ml-1 text-[10px]">↕</span>;
    }
    return (
      <span className="text-rex-600 dark:text-rex-400 font-bold font-mono ml-1 text-[11px]">
        {qSortDir === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Collapse/expand state for Work Order sub-rows (expanded by default!)
  const [collapsedSubRows, setCollapsedSubRows] = useState<Record<string, boolean>>({});

  // Modals (exact same set as Quotations.tsx, minus pricing)
  const [previewData, setPreviewData] = useState<{
    quotation: any;
    type: string;
    lead: any;
  } | null>(null);
  const [viewBomDialog, setViewBomDialog] = useState<any | null>(null);
  const [selectedBomTab, setSelectedBomTab] = useState<number | 'overview'>('overview');
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{
    photos: any[];
    title?: string;
  } | null>(null);
  const [viewAttachmentsModalData, setViewAttachmentsModalData] = useState<{
    quotationNo: string;
    attachments: QuotationAttachmentItem[];
    customerName?: string;
  } | null>(null);
  const [printWorkOrder, setPrintWorkOrder] = useState<any | null>(null);

  const formatAutoMatDimensions = (m: any) => {
    if (!m) return '-';
    const hasThick =
      m.thick !== undefined && m.thick !== '' && m.thick !== null && Number(m.thick) > 0;
    const hasWidth =
      m.width !== undefined && m.width !== '' && m.width !== null && Number(m.width) > 0;
    const hasLength =
      m.length !== undefined && m.length !== '' && m.length !== null && Number(m.length) > 0;
    const hasDia =
      (m.dia !== undefined && m.dia !== '' && m.dia !== null && Number(m.dia) > 0) ||
      (m.shaftDia !== undefined &&
        m.shaftDia !== '' &&
        m.shaftDia !== null &&
        Number(m.shaftDia) > 0);

    if (hasDia) {
      const diaVal = m.dia || m.shaftDia;
      return `Ø ${diaVal} mm × L: ${hasLength ? `${m.length} mm` : '-'}`;
    }
    if (hasThick || hasWidth || hasLength) {
      const parts = [];
      if (hasThick) parts.push(`T: ${m.thick} mm`);
      if (hasWidth) parts.push(`W: ${m.width} mm`);
      if (hasLength) parts.push(`L: ${m.length} mm`);
      return parts.join(' × ');
    }
    if (m.dimensions) return m.dimensions;
    if (m.size) return m.size;
    if (m.spec) return m.spec;
    return '-';
  };

  // Enrich a Work Order with BOM & Machining Route counts
  const enrichWorkOrder = useCallback((wo: any) => {
    let bomList: any[] = [];
    let routeList: any[] = [];
    try {
      bomList = typeof wo.bom === 'string' ? JSON.parse(wo.bom || '[]') : wo.bom || [];
    } catch {
      bomList = [];
    }
    try {
      routeList =
        typeof wo.routes === 'string'
          ? JSON.parse(wo.routes || '[]')
          : wo.routes || wo.operations || [];
    } catch {
      routeList = [];
    }

    let matCount = 0;
    const matNames: string[] = [];
    if (Array.isArray(bomList)) {
      bomList.forEach((entry: any) => {
        if (Array.isArray(entry?.materials)) {
          matCount += entry.materials.length;
          entry.materials.forEach((m: any) => {
            if (m?.material) matNames.push(m.material);
          });
        } else if (entry?.material || entry?.itemId || entry?.name) {
          matCount += 1;
          matNames.push(entry.material || entry.name);
        }
      });
    }

    const routeCount = Array.isArray(routeList) ? routeList.length : 0;
    const isBomPlanned = Boolean(wo.bomAdjusted || matCount > 0 || routeCount > 0);

    return {
      ...wo,
      matCount,
      routeCount,
      matSummary: Array.from(new Set(matNames.filter(Boolean))).slice(0, 3).join(', '),
      isBomPlanned,
    };
  }, []);

  // Open Technical BOM & Dimensions Modal (Price-Free twin of Quotations.tsx Costing modal)
  const openTechnicalBomModal = (group: any, parsed: any, defaultIndex: number = 0) => {
    const bomsList = parsed.boms && parsed.boms.length > 0 ? parsed.boms : [];
    setViewBomDialog({
      quotationNo: group.quoNo,
      customerName: group.leadCompany || group.leadName || 'Customer',
      boms: bomsList,
      custItems: parsed.custItems || parsed.items || [],
      attachments: parsed.attachments || [],
      workOrders: group.linkedWorkOrders || [],
      ...(bomsList.length === 0 ? parsed : {}),
    });
    setSelectedBomTab(bomsList.length > 1 ? 'overview' : defaultIndex);
  };

  // Group Quotations (same grouping logic as Quotations.tsx, filtered to those with Sales Orders / Work Orders)
  const groupedQuotations = useMemo(() => {
    const groups: Record<string, any> = {};

    quotations.forEach((q: any) => {
      if (q.deletedAt) return;

      let parsed: any = q._parsed;
      if (!parsed) {
        try {
          parsed = typeof q.data === 'string' ? JSON.parse(q.data || '{}') : q.data || {};
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {}
          }
          q._parsed = parsed;
        } catch (e) {
          parsed = {};
        }
      }

      const isProd = Boolean(
        q.type === 'product' ||
          q.type === 'product_draft' ||
          parsed.isProductQuotation === true ||
          parsed.quotationCategory === 'product' ||
          String(q.quotationNo || q.docNo || q.id || '').startsWith('PQ')
      );

      const quoNo = q.quotationNo || parsed.quotationNo || q.docNo || parsed.docNo || q.id;
      const numId = String(q.leadId || '').replace(/^LEAD-0*/i, '');
      const lead = leads.find(
        (l: any) =>
          l.id === q.leadId ||
          l.id === parsed.leadId ||
          (numId &&
            (l.id === `LEAD-${numId.padStart(3, '0')}` ||
              String(l.id).replace(/^LEAD-0*/i, '') === numId))
      );
      const cust = customers.find(
        (c: any) =>
          c.id === q.leadId ||
          c.id === parsed.leadId ||
          c.id === q.customerId ||
          (lead?.customerId && c.id === lead.customerId) ||
          (parsed.company &&
            (c.company?.toLowerCase() === parsed.company?.toLowerCase() ||
              c.name?.toLowerCase() === parsed.company?.toLowerCase()))
      );

      const resolvedLeadId = lead?.id || cust?.id || q.leadId || 'WALK-IN';
      const isAutoPregenNo =
        !quoNo ||
        quoNo.startsWith('QT-DRAFT-') ||
        quoNo.startsWith('PQ-DRAFT-') ||
        quoNo === 'QT-2206' ||
        quoNo === 'PQ-2206';

      const groupKey =
        quoNo && !isAutoPregenNo ? `${quoNo}_${resolvedLeadId}` : String(q.id);

      if (!groups[groupKey]) {
        const leadCompany =
          q.leadCompany ||
          cust?.company ||
          lead?.company ||
          parsed.company ||
          parsed.customerCompany ||
          '';
        const leadName =
          q.leadName ||
          cust?.name ||
          lead?.name ||
          parsed.customerName ||
          parsed.attention ||
          'Walk-in Customer';
        const leadEmail =
          parsed.customerEmail || parsed.email || cust?.email || lead?.email || '';
        const leadAddress =
          parsed.customerAddress ||
          parsed.address ||
          q.leadAddress ||
          cust?.address ||
          lead?.address ||
          '';
        const leadVat = parsed.vatNo || q.leadVat || cust?.vat || lead?.vat || '';

        groups[groupKey] = {
          quoNo:
            (isAutoPregenNo ? q.quotationNo || q.docNo || q.id : quoNo) || q.id,
          leadName,
          leadCompany,
          leadEmail,
          leadAddress,
          leadVat,
          leadSvat: '',
          leadId: resolvedLeadId,
          customerId: cust?.id || lead?.customerId || q.customerId,
          isProduct: isProd,
          main: [],
          job: [],
          customer: [],
          latestDate: q.date || q.createdAt || new Date().toISOString(),
        };
      }

      if (q.type === 'job') groups[groupKey].job.push(q);
      else if (q.type === 'customer') groups[groupKey].customer.push(q);
      else groups[groupKey].main.push(q);

      const qDate = q.date || q.createdAt;
      if (qDate && new Date(qDate) > new Date(groups[groupKey].latestDate)) {
        groups[groupKey].latestDate = qDate;
      }
    });

    // Attach linked Sales Orders & Work Orders to each quotation group
    const result: any[] = [];
    const matchedOrderIds = new Set<string>();
    const matchedWoIds = new Set<string>();

    Object.values(groups).forEach((group: any) => {
      if (group.main.length === 0) {
        if (group.customer.length > 0) group.main.push(...group.customer);
        else if (group.job.length > 0) group.main.push(...group.job);
      }
      group.main.sort(
        (a: any, b: any) => (Number(b.version) || 1) - (Number(a.version) || 1)
      );
      const approvedOrReal = group.main.find(
        (m: any) =>
          m.type !== 'draft' &&
          m.type !== 'product_draft' &&
          (m.status || '').toLowerCase() !== 'draft'
      );
      const latestMain = approvedOrReal || group.main[0] || group.customer[0] || group.job[0];
      if (!latestMain) return;

      const allGroupQuoteIds = new Set(
        [...group.main, ...group.customer, ...group.job]
          .map((x: any) => String(x?.id || ''))
          .filter(Boolean)
      );
      const qNoNorm = String(group.quoNo || '').trim().toLowerCase();

      // Match Sales Orders created from this Quotation
      const linkedOrders = allOrders.filter((o: any) => {
        const oQuoteId = String(o.quoteId || o.quotationId || '').trim();
        const oQuoNo = String(o.quotationNo || '').trim().toLowerCase();
        return (
          (oQuoteId && allGroupQuoteIds.has(oQuoteId)) ||
          (qNoNorm && oQuoNo === qNoNorm)
        );
      });
      linkedOrders.forEach((o: any) => matchedOrderIds.add(String(o.id)));

      const linkedSoNumbers = new Set(
        linkedOrders
          .map((o: any) => String(o.orderNo || o.id || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const linkedSoIds = new Set(
        linkedOrders.map((o: any) => String(o.id || '').trim()).filter(Boolean)
      );

      // Match Work Orders linked to this Quotation or its Sales Orders
      const linkedWOs = workOrdersList
        .filter((w: any) => {
          const wQuoteId = String(
            w.sourceQuoteId || w.quoteId || w.quotationId || ''
          ).trim();
          const wQuoNo = String(w.quotationNo || w.sourceQuoteNo || '')
            .trim()
            .toLowerCase();
          const wSoNo = String(w.salesOrderNo || w.orderNo || '')
            .trim()
            .toLowerCase();
          const wSoId = String(w.salesOrderId || '').trim();

          return (
            (wQuoteId && allGroupQuoteIds.has(wQuoteId)) ||
            (qNoNorm && wQuoNo === qNoNorm) ||
            (wSoNo && linkedSoNumbers.has(wSoNo)) ||
            (wSoId && linkedSoIds.has(wSoId))
          );
        })
        .map(enrichWorkOrder);
      linkedWOs.forEach((w: any) => matchedWoIds.add(String(w.id)));

      result.push({
        ...group,
        latestMain,
        linkedOrders,
        linkedWorkOrders: linkedWOs,
      });
    });

    // Also include any Sales Orders (and their Work Orders) that were created directly without a quotation link
    allOrders.forEach((so: any) => {
      if (matchedOrderIds.has(String(so.id))) return;

      const soNoNorm = String(so.orderNo || so.id || '').trim().toLowerCase();
      const linkedWOs = workOrdersList
        .filter((w: any) => {
          if (matchedWoIds.has(String(w.id))) return false;
          const wSoNo = String(w.salesOrderNo || w.orderNo || '')
            .trim()
            .toLowerCase();
          const wSoId = String(w.salesOrderId || '').trim();
          return (
            (soNoNorm && (wSoNo === soNoNorm || wSoNo === `wo-${soNoNorm}`)) ||
            (so.id && wSoId === String(so.id))
          );
        })
        .map(enrichWorkOrder);
      linkedWOs.forEach((w: any) => matchedWoIds.add(String(w.id)));

      let parsedItems: any[] = [];
      try {
        parsedItems =
          typeof so.items === 'string'
            ? JSON.parse(so.items || '[]')
            : Array.isArray(so.items)
            ? so.items
            : [];
      } catch {
        parsedItems = [];
      }
      if (parsedItems.length === 0 && so.productName) {
        parsedItems = [
          {
            desc: so.productName,
            description: so.productName,
            qty: Number(so.qty || 1),
            unit: 'Nos',
          },
        ];
      }

      const syntheticQuote = {
        id: so.quoteId || `SO-Q-${so.id}`,
        quotationNo: so.quotationNo || so.orderNo || so.id,
        version: 1,
        status: so.status || 'Approved',
        date: so.orderDate || so.createdAt || new Date().toISOString(),
        customerPoNo: so.customerPoNo || '',
        data: {
          quotationNo: so.quotationNo || so.orderNo || so.id,
          quoDate: (so.orderDate || so.createdAt || '').slice(0, 10),
          customerName: so.customerCompany || so.customerName || 'Customer',
          subject: so.productName || so.notes || `Sales Order ${so.orderNo || so.id}`,
          custItems: parsedItems,
          boms: [],
        },
      };

      result.push({
        quoNo: so.quotationNo || so.orderNo || so.id,
        leadName: so.customerName || 'Customer',
        leadCompany: so.customerCompany || so.customerName || 'Customer',
        leadEmail: so.customerEmail || '',
        leadAddress: so.deliveryAddress || '',
        leadVat: so.customerVat || '',
        leadSvat: '',
        leadId: so.customerId || 'WALK-IN',
        customerId: so.customerId,
        isProduct: false,
        main: [syntheticQuote],
        job: [],
        customer: [],
        latestDate: so.orderDate || so.createdAt || new Date().toISOString(),
        latestMain: syntheticQuote,
        linkedOrders: [so],
        linkedWorkOrders: linkedWOs,
      });
    });

    return result;
  }, [quotations, leads, customers, allOrders, workOrdersList, enrichWorkOrder]);

  // Quick Create Work Order directly from Designer Dashboard if a Sales Order quotation has no WO yet
  const handleQuickCreateWO = async (group: any) => {
    const latestMain = group.latestMain;
    if (!latestMain) return;
    const confirmed = await showConfirm(
      `Create a Work Order for Quotation ${group.quoNo} so you can plan & adjust its BOM?`,
      'Create Work Order for BOM Planning',
      { confirmLabel: 'Create Work Order' }
    );
    if (!confirmed) return;

    setCreatingWoForQuote(group.quoNo);
    try {
      let parsed: any = {};
      try {
        parsed =
          typeof latestMain.data === 'string'
            ? JSON.parse(latestMain.data || '{}')
            : latestMain.data || {};
      } catch (e) {}

      const linkedOrder = group.linkedOrders?.[0];
      const custItems = parsed.custItems || parsed.items || [];
      const totalQty =
        custItems.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0) ||
        Number(linkedOrder?.qty || 1);

      const created = await createWorkOrder({
        title:
          parsed.subject ||
          custItems[0]?.desc ||
          custItems[0]?.description ||
          `Job for ${group.quoNo}`,
        productName:
          parsed.subject ||
          custItems[0]?.desc ||
          custItems[0]?.description ||
          `Component (${group.quoNo})`,
        customerId: group.customerId || group.leadId,
        customerName: group.leadCompany || group.leadName || 'Customer',
        quotationNo: group.quoNo,
        sourceQuoteId: latestMain.id,
        quoteId: latestMain.id,
        salesOrderNo: linkedOrder?.orderNo || linkedOrder?.id || '',
        salesOrderId: linkedOrder?.id || '',
        jobQty: totalQty,
        status: 'Pending',
        priority: 'Normal',
        bom: parsed.boms || [],
      });

      toast(`Work Order created for ${group.quoNo}`, 'success');
      await loadWorkOrdersAndGrns();
      if (created?.id) {
        navigate(`/production/work-orders/${created.id}/adjust`);
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to create Work Order', 'error');
    } finally {
      setCreatingWoForQuote(null);
    }
  };

  // Status tab counts
  const statusCounts = useMemo(() => {
    const counts = {
      all: groupedQuotations.length,
      pending_bom: 0,
      bom_planned: 0,
      in_production: 0,
      completed: 0,
    };

    groupedQuotations.forEach((g) => {
      const wos = g.linkedWorkOrders || [];
      const hasPendingBom = wos.length === 0 || wos.some((w: any) => !w.isBomPlanned);
      const allBomPlanned = wos.length > 0 && wos.every((w: any) => w.isBomPlanned);
      const isProd = wos.some((w: any) =>
        ['in progress', 'in production', 'started', 'machining'].includes(
          String(w.status || '').toLowerCase()
        )
      );
      const isDone =
        wos.length > 0 &&
        wos.every((w: any) =>
          ['completed', 'finished', 'dispatched'].includes(
            String(w.status || '').toLowerCase()
          )
        );

      if (hasPendingBom) counts.pending_bom++;
      if (allBomPlanned) counts.bom_planned++;
      if (isProd) counts.in_production++;
      if (isDone) counts.completed++;
    });

    return counts;
  }, [groupedQuotations]);

  // KPI Ribbon stats
  const kpiStats = useMemo(() => {
    const allWOs = groupedQuotations.flatMap((g) => g.linkedWorkOrders || []);
    const totalWOs = allWOs.length;
    const plannedWOs = allWOs.filter((w: any) => w.isBomPlanned).length;
    const pendingWOs = Math.max(0, totalWOs - plannedWOs);
    return {
      totalQuotes: groupedQuotations.length,
      totalWOs,
      pendingWOs,
      plannedWOs,
    };
  }, [groupedQuotations]);

  // Filtered & Sorted list
  const filtered = useMemo(() => {
    const list = groupedQuotations.filter((group) => {
      const latestMain = group.latestMain;
      let parsed: any = {};
      try {
        parsed =
          typeof latestMain?.data === 'string'
            ? JSON.parse(latestMain.data || '{}')
            : latestMain?.data || {};
      } catch (e) {}

      if (categoryFilter === 'custom' && group.isProduct) return false;
      if (categoryFilter === 'product' && !group.isProduct) return false;

      const wos = group.linkedWorkOrders || [];
      if (bomStatusFilter === 'pending_bom') {
        const hasPending = wos.length === 0 || wos.some((w: any) => !w.isBomPlanned);
        if (!hasPending) return false;
      } else if (bomStatusFilter === 'bom_planned') {
        const allPlanned = wos.length > 0 && wos.every((w: any) => w.isBomPlanned);
        if (!allPlanned) return false;
      } else if (bomStatusFilter === 'in_production') {
        const isProd = wos.some((w: any) =>
          ['in progress', 'in production', 'started', 'machining'].includes(
            String(w.status || '').toLowerCase()
          )
        );
        if (!isProd) return false;
      } else if (bomStatusFilter === 'completed') {
        const isDone =
          wos.length > 0 &&
          wos.every((w: any) =>
            ['completed', 'finished', 'dispatched'].includes(
              String(w.status || '').toLowerCase()
            )
          );
        if (!isDone) return false;
      }

      if (customerFilter !== 'all') {
        if (
          group.leadId !== customerFilter &&
          group.customerId !== customerFilter
        ) {
          return false;
        }
      }

      if (startDate || endDate) {
        const qDate = (group.latestDate || '').slice(0, 10);
        if (startDate && qDate < startDate) return false;
        if (endDate && qDate > endDate) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchQuote = String(group.quoNo || '').toLowerCase().includes(q);
        const matchCust =
          String(group.leadCompany || '').toLowerCase().includes(q) ||
          String(group.leadName || '').toLowerCase().includes(q);
        const matchSubj = String(parsed.subject || '').toLowerCase().includes(q);
        const matchSo = (group.linkedOrders || []).some(
          (o: any) =>
            String(o.orderNo || o.id || '').toLowerCase().includes(q) ||
            String(o.customerPoNo || '').toLowerCase().includes(q)
        );
        const matchWo = wos.some(
          (w: any) =>
            String(w.orderNo || w.id || '').toLowerCase().includes(q) ||
            String(w.productName || w.partName || w.title || '')
              .toLowerCase()
              .includes(q)
        );
        if (!matchQuote && !matchCust && !matchSubj && !matchSo && !matchWo) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      const dir = qSortDir === 'asc' ? 1 : -1;
      if (qSortField === 'quoNo') {
        return String(a.quoNo || '').localeCompare(String(b.quoNo || '')) * dir;
      }
      if (qSortField === 'customer') {
        return (
          String(a.leadCompany || a.leadName || '').localeCompare(
            String(b.leadCompany || b.leadName || '')
          ) * dir
        );
      }
      if (qSortField === 'items') {
        const aCount = (a.linkedWorkOrders || []).length;
        const bCount = (b.linkedWorkOrders || []).length;
        return (aCount - bCount) * dir;
      }
      if (qSortField === 'status') {
        return (
          String(a.latestMain?.status || '').localeCompare(
            String(b.latestMain?.status || '')
          ) * dir
        );
      }
      const dA = new Date(a.latestDate || 0).getTime();
      const dB = new Date(b.latestDate || 0).getTime();
      return (dA - dB) * dir;
    });
  }, [
    groupedQuotations,
    categoryFilter,
    bomStatusFilter,
    customerFilter,
    startDate,
    endDate,
    search,
    qSortField,
    qSortDir,
  ]);

  const totalQuotations = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalQuotations / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedQuotations = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* ── TOP HEADER (Exact Quotations.tsx style) ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-primary">
              Designer Dashboard — Sales Order Quotations
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 uppercase tracking-wider font-mono">
              BOM & Route Planning Studio
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-none bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck size={12} />
              Technical View (Prices Hidden)
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'quotation' : 'quotations'} with
            Sales Orders &middot; Expand or inspect quotation specs &amp; click{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">Adjust BOM</strong> on
            any Work Order sub-line below
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Factory}
            onClick={() => navigate('/production/work-orders')}
            className="text-xs border border-theme-subtle rounded-none hover:bg-surface2 text-indigo-600 dark:text-indigo-400 h-8"
          >
            All Work Orders
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefreshAll}
            loading={loading}
            className="border border-theme-subtle rounded-none hover:bg-surface2 text-xs h-8"
            title="Refresh Quotations & Work Orders"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI STATS RIBBON (Exact Quotations.tsx style) ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => setBomStatusFilter('all')}
          className="p-3 bg-surface border border-theme-subtle hover:border-rex-500/50 rounded-none flex items-center justify-between cursor-pointer transition-colors shadow-xs"
        >
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Sales Order Quotations
            </span>
            <span className="text-base lg:text-lg font-bold font-mono text-primary mt-0.5 block">
              {kpiStats.totalQuotes}
            </span>
            <span className="text-[11px] text-muted font-mono">
              Converted to Orders
            </span>
          </div>
          <div className="w-9 h-9 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 flex items-center justify-center border border-rex-500/20">
            <FileText size={18} />
          </div>
        </div>

        <div
          onClick={() => setBomStatusFilter('all')}
          className="p-3 bg-surface border border-theme-subtle hover:border-indigo-500/50 rounded-none flex items-center justify-between cursor-pointer transition-colors shadow-xs"
        >
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Linked Work Orders
            </span>
            <span className="text-base lg:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
              {kpiStats.totalWOs}
            </span>
            <span className="text-[11px] text-muted">
              Sub-lines under quotes
            </span>
          </div>
          <div className="w-9 h-9 rounded-none bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Factory size={18} />
          </div>
        </div>

        <div
          onClick={() => setBomStatusFilter('pending_bom')}
          className="p-3 bg-surface border border-theme-subtle hover:border-amber-500/50 rounded-none flex items-center justify-between cursor-pointer transition-colors shadow-xs"
          title="Click to filter quotations with Pending BOM planning"
        >
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Pending BOM Adjustment
            </span>
            <span className="text-base lg:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {kpiStats.pendingWOs}
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Needs BOM &amp; Routes &rarr;
            </span>
          </div>
          <div className="w-9 h-9 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Clock size={18} />
          </div>
        </div>

        <div
          onClick={() => setBomStatusFilter('bom_planned')}
          className="p-3 bg-surface border border-theme-subtle hover:border-emerald-500/50 rounded-none flex items-center justify-between cursor-pointer transition-colors shadow-xs"
          title="Click to filter quotations with BOM & Routes Planned"
        >
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              BOM &amp; Routes Planned
            </span>
            <span className="text-base lg:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {kpiStats.plannedWOs}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Ready for Workshop
            </span>
          </div>
          <div className="w-9 h-9 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* ── COMPREHENSIVE FILTER TOOLBAR (Exact Quotations.tsx style) ─────────── */}
      <GlassCard className="p-3 space-y-3 rounded-none">
        {/* Row 1: Category & Status Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {/* Category Filter Toggle */}
            <div className="flex items-center gap-1 pr-2 border-r border-theme-subtle shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('custom')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                Custom Fabrication
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('product')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'product'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                Product Quotes
              </button>
            </div>

            {(
              [
                { id: 'all', label: 'All Orders', count: statusCounts.all },
                {
                  id: 'pending_bom',
                  label: 'Pending BOM',
                  count: statusCounts.pending_bom,
                },
                {
                  id: 'bom_planned',
                  label: 'BOM Planned',
                  count: statusCounts.bom_planned,
                },
                {
                  id: 'in_production',
                  label: 'In Production',
                  count: statusCounts.in_production,
                },
                { id: 'completed', label: 'Completed', count: statusCounts.completed },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBomStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  bomStatusFilter === tab.id
                    ? 'bg-rex-600 text-white font-bold shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded-none ${
                    bomStatusFilter === tab.id
                      ? 'bg-black/20 text-white'
                      : 'bg-surface2 text-muted'
                  }`}
                >
                  {tab.count || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <SearchBar
              placeholder="Search quote #, SO #, WO #, customer, part..."
              value={search}
              onChange={setSearch}
              className="w-full sm:w-80 shrink-0"
            />
            <div className="flex items-center bg-surface border border-theme-subtle p-0.5 rounded-none shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-surface2 text-primary font-bold shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
                title="Table List View"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-surface2 text-primary font-bold shadow-xs'
                    : 'text-muted hover:text-primary'
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
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">
              Customer:
            </span>
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
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">
              From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">
              To:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
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
            {(bomStatusFilter !== 'all' ||
              categoryFilter !== 'all' ||
              customerFilter !== 'all' ||
              startDate ||
              endDate ||
              search) && (
              <button
                onClick={() => {
                  setBomStatusFilter('all');
                  setCategoryFilter('all');
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

      {/* ── MAIN QUOTATIONS TABLE WITH WORK ORDER SUB-LINES ───────────────────── */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-muted border border-theme-subtle bg-surface">
          <FileText size={32} className="mx-auto mb-2 opacity-30 text-secondary" />
          <p className="text-sm font-medium">
            No Sales Order quotations match your search or filter criteria.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-theme-subtle bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[380px] pb-16 custom-scrollbar">
            <table className="w-full text-left min-w-[1020px]">
              <thead className="bg-surface2/60 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider select-none">
                <tr>
                  <th
                    onClick={() => handleToggleQSort('quoNo')}
                    className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Quote # &amp; Ver</span>
                      {renderQSortIndicator('quoNo')}
                    </div>
                  </th>
                  <th className="px-3.5 py-3">
                    <span>Sales Order &amp; PO</span>
                  </th>
                  <th
                    onClick={() => handleToggleQSort('customer')}
                    className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Customer / Company</span>
                      {renderQSortIndicator('customer')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleQSort('items')}
                    className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Scope, Parts &amp; Dimensions</span>
                      {renderQSortIndicator('items')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleQSort('date')}
                    className="px-3.5 py-3 cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center">
                      <span>Date</span>
                      {renderQSortIndicator('date')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleQSort('status')}
                    className="px-3 py-3 text-center cursor-pointer hover:bg-surface2 hover:text-primary transition-colors"
                  >
                    <div className="flex items-center justify-center">
                      <span>Status</span>
                      {renderQSortIndicator('status')}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center">Traceability</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme-subtle/30 text-xs">
                {paginatedQuotations.map((group) => {
                  const displayQ = group.latestMain;
                  if (!displayQ) return null;

                  let parsed: any = {};
                  try {
                    parsed =
                      typeof displayQ?.data === 'string'
                        ? JSON.parse(displayQ.data || '{}')
                        : displayQ?.data || {};
                  } catch (e) {}

                  const status = displayQ?.status || 'Approved';
                  const quoteOrders: any[] = group.linkedOrders || [];
                  const linkedWOs: any[] = group.linkedWorkOrders || [];
                  const itemsCount =
                    parsed.boms?.length ||
                    parsed.custItems?.length ||
                    parsed.items?.length ||
                    1;
                  const isSubCollapsed = !!collapsedSubRows[group.quoNo];
                  const quoteAttachments = extractQuoteAttachments(parsed);

                  const { photos: matchedPhotos } = findMatchingSamplePhotos(
                    {
                      id: displayQ?.id,
                      quoteId: displayQ?.id,
                      quoNo: group.quoNo,
                      leadId: group.leadId,
                      customerName: group.leadCompany || group.leadName,
                    },
                    allCustomerGrns
                  );
                  const inlinePhotos = Array.isArray(parsed.samplePhotos)
                    ? parsed.samplePhotos
                    : [];
                  const displayPhotos =
                    matchedPhotos.length > 0 ? matchedPhotos : inlinePhotos;

                  // Extract quick stock dimensions summary from BOMs
                  const allDims: string[] = (parsed.boms || [])
                    .flatMap((b: any) =>
                      (b.autoMats || []).map((m: any) => formatAutoMatDimensions(m))
                    )
                    .filter((d: string) => d && d !== '-');

                  return (
                    <React.Fragment key={group.quoNo}>
                      {/* ── PARENT ROW: QUOTATION ROW (Exact Quotations.tsx look, Price-Free) ── */}
                      <tr className="hover:bg-surface2/40 transition-colors bg-surface">
                        {/* Quote # & Version */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSubRows((prev) => ({
                                  ...prev,
                                  [group.quoNo]: !prev[group.quoNo],
                                }))
                              }
                              className="p-0.5 bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle rounded-none transition-colors"
                              title={
                                isSubCollapsed
                                  ? 'Expand Work Order Sub-lines'
                                  : 'Collapse Work Order Sub-lines'
                              }
                            >
                              {isSubCollapsed ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronUp size={12} />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPreviewData({
                                  quotation: displayQ,
                                  type: 'main',
                                  lead: {
                                    name: group.leadName,
                                    company: group.leadCompany,
                                    email: group.leadEmail,
                                    address: group.leadAddress,
                                    vat: group.leadVat,
                                    svat: group.leadSvat,
                                  },
                                })
                              }
                              className="font-mono font-bold text-xs text-rex-600 dark:text-rex-400 hover:underline hover:text-amber-500 cursor-pointer text-left transition-colors whitespace-nowrap"
                              title="Click to preview Quotation (Price-Free Technical Copy)"
                            >
                              {group.quoNo}
                            </button>

                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-surface2 text-muted border border-theme-subtle shrink-0">
                              v{displayQ?.version || 1}
                            </span>

                            {quoteAttachments.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewAttachmentsModalData({
                                    quotationNo: group.quoNo,
                                    attachments: quoteAttachments,
                                    customerName: group.leadCompany || group.leadName,
                                  })
                                }
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                                title="View Technical Drawings & Attachments"
                              >
                                <Paperclip size={10} />
                                {quoteAttachments.length}
                              </button>
                            )}

                            {displayPhotos.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveViewingPhotos({
                                    photos: displayPhotos,
                                    title: `Sample Photos - Quotation ${group.quoNo}`,
                                  })
                                }
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                                title="View Sample Photos"
                              >
                                <Camera size={10} />
                                {displayPhotos.length}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Sales Order & Customer PO */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {quoteOrders.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {quoteOrders.map((so: any) => (
                                  <span
                                    key={so.id}
                                    className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
                                  >
                                    <ShoppingBag size={10} />
                                    {so.orderNo || so.id}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-surface2 text-muted border border-theme-subtle">
                                Direct Production
                              </span>
                            )}

                            {(() => {
                              const poVal =
                                quoteOrders
                                  .map((o: any) => o.customerPoNo)
                                  .find(Boolean) ||
                                displayQ?.customerPoNo ||
                                parsed?.customerPoNo;
                              if (!poVal) return null;
                              return (
                                <span className="font-mono font-semibold inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  <FileCheck size={10} />
                                  PO: #{poVal}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Customer / Company */}
                        <td className="px-3.5 py-2.5 max-w-[220px]">
                          <div className="flex flex-col min-w-0">
                            <span
                              className="font-semibold text-primary truncate"
                              title={group.leadCompany || group.leadName}
                            >
                              {group.leadCompany || group.leadName}
                            </span>
                            {group.leadCompany && group.leadName && (
                              <span className="text-[11px] text-muted truncate">
                                Attn: {group.leadName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Scope, Parts & Dimensions */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                              <Package size={11} className="text-rex-500 shrink-0" />
                              {itemsCount} {itemsCount === 1 ? 'Part / Item' : 'Parts / Items'}
                            </span>

                            <button
                              type="button"
                              onClick={() => openTechnicalBomModal(group, parsed)}
                              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 border border-amber-500/30 rounded-none flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Quoted BOM Parts, Material Dimensions & Machining Hours (No Prices)"
                            >
                              <Ruler size={10} /> BOM &amp; Dimensions
                            </button>

                            {allDims.length > 0 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface2 text-secondary border border-theme-subtle">
                                {allDims[0]}
                                {allDims.length > 1 ? ` +${allDims.length - 1}` : ''}
                              </span>
                            )}
                          </div>
                          {parsed.subject && (
                            <p className="text-[11px] text-muted truncate max-w-[260px] mt-0.5">
                              {parsed.subject}
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-primary block">
                            {formatDate(group.latestDate)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-none border ${getStatusColor(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Traceability Dropdown */}
                        <td className="px-3 py-2.5 text-center">
                          <TraceabilityDropdown
                            title={`Quotation #${group.quoNo}`}
                            traces={(() => {
                              const traces: TraceNode[] = [];
                              quoteOrders.forEach((so: any) => {
                                traces.push({
                                  type: 'order',
                                  title:
                                    quoteOrders.length > 1
                                      ? `Sales Order (${so.orderNo})`
                                      : 'Sales Order',
                                  reference: so.orderNo || so.id,
                                  subtitle: `Customer Order • ${so.customerName || ''}`,
                                  statusBadge: {
                                    label: so.status || 'Active Order',
                                    variant: 'info',
                                  },
                                });
                              });

                              linkedWOs.forEach((wo: any) => {
                                traces.push({
                                  type: 'work_order',
                                  title: `Work Order (${wo.orderNo || wo.id})`,
                                  reference: wo.orderNo || wo.id,
                                  subtitle: wo.isBomPlanned
                                    ? `BOM Planned (${wo.matCount} Mat • ${wo.routeCount} Steps)`
                                    : 'Pending BOM Adjustment',
                                  statusBadge: {
                                    label: wo.isBomPlanned ? 'BOM Planned' : 'BOM Pending',
                                    variant: wo.isBomPlanned ? 'success' : 'warning',
                                  },
                                  navigateUrl: `/production/work-orders/${wo.id}/adjust`,
                                });
                              });

                              return traces;
                            })()}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() =>
                                setPreviewData({
                                  quotation: displayQ,
                                  type: 'main',
                                  lead: {
                                    name: group.leadName,
                                    company: group.leadCompany,
                                    email: group.leadEmail,
                                    address: group.leadAddress,
                                    vat: group.leadVat,
                                    svat: group.leadSvat,
                                  },
                                })
                              }
                              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                              title="View Price-Free Quotation Document"
                            >
                              View Quote
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Ruler}
                              onClick={() => openTechnicalBomModal(group, parsed)}
                              className="h-7 text-xs px-2 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-none hover:bg-amber-500/20 font-semibold"
                              title="View Technical BOM & Dimensions Breakdown"
                            >
                              BOM Specs
                            </Button>

                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSubRows((prev) => ({
                                  ...prev,
                                  [group.quoNo]: !prev[group.quoNo],
                                }))
                              }
                              className="h-7 px-2 text-xs font-mono font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-none flex items-center gap-1 transition-colors"
                              title="Toggle Work Orders Sub-Lines"
                            >
                              <Factory size={12} />
                              <span>WOs ({linkedWOs.length})</span>
                              {isSubCollapsed ? (
                                <ChevronDown size={11} />
                              ) : (
                                <ChevronUp size={11} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── SUB-LINES: WORK ORDERS UNDER THIS QUOTATION (2-line compact sub-rows with Adjust BOM button) ── */}
                      {!isSubCollapsed && (
                        <tr className="bg-surface2/30">
                          <td colSpan={8} className="p-0 border-b border-theme-subtle">
                            <div className="pl-9 pr-4 py-2 space-y-1.5 border-l-4 border-l-indigo-500 bg-indigo-500/[0.02]">
                              {linkedWOs.length === 0 ? (
                                <div className="flex items-center justify-between py-1.5 px-3 bg-surface border border-theme-subtle text-xs">
                                  <div className="flex items-center gap-2 text-muted">
                                    <CornerDownRight size={13} className="text-indigo-500" />
                                    <span>
                                      No Work Order created for{' '}
                                      <strong className="text-primary font-mono">
                                        {group.quoNo}
                                      </strong>{' '}
                                      yet. Create a Work Order to plan &amp; adjust the BOM.
                                    </span>
                                  </div>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={Plus}
                                    loading={creatingWoForQuote === group.quoNo}
                                    onClick={() => handleQuickCreateWO(group)}
                                    className="h-7 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-none"
                                  >
                                    Create WO &amp; Adjust BOM
                                  </Button>
                                </div>
                              ) : (
                                linkedWOs.map((wo: any, wIdx: number) => {
                                  const woNo = wo.orderNo || wo.id;
                                  const woTitle =
                                    wo.productName ||
                                    wo.partName ||
                                    wo.title ||
                                    parsed.subject ||
                                    `Work Order Item #${wIdx + 1}`;
                                  const woQty = Number(wo.jobQty || wo.qty || 1);
                                  const woUom = wo.uom || 'Nos';

                                  return (
                                    <div
                                      key={wo.id || wIdx}
                                      className="px-3 py-2 bg-surface border border-theme-subtle hover:border-indigo-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      {/* Left 2-Line Sub-row Content */}
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <CornerDownRight
                                          size={14}
                                          className="text-indigo-500 shrink-0 mt-0.5"
                                        />
                                        <div className="min-w-0 space-y-0.5">
                                          {/* Sub-Line 1: WO #, Part Name, Qty, BOM Status Badge, Production Status */}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 border border-indigo-500/30">
                                              {woNo}
                                            </span>

                                            <span className="font-bold text-xs text-primary truncate max-w-[340px]">
                                              {woTitle}
                                            </span>

                                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-surface2 text-primary border border-theme-subtle">
                                              Qty: {woQty} {woUom}
                                            </span>

                                            {wo.isBomPlanned ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                                <CheckCircle2 size={10} />
                                                BOM Planned ({wo.matCount} Mat &middot;{' '}
                                                {wo.routeCount} Steps)
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                                <AlertCircle size={10} />
                                                Pending BOM Plan
                                              </span>
                                            )}

                                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                                              {wo.status || 'Pending'}
                                            </span>
                                          </div>

                                          {/* Sub-Line 2: Technical Specs, Quoted Dimensions, Materials & Target Date */}
                                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted">
                                            {wo.salesOrderNo && (
                                              <span>
                                                SO:{' '}
                                                <strong className="font-mono text-secondary">
                                                  {wo.salesOrderNo}
                                                </strong>
                                              </span>
                                            )}
                                            {allDims.length > 0 && (
                                              <span>
                                                Quoted Stock:{' '}
                                                <strong className="font-mono text-secondary">
                                                  {allDims.slice(0, 2).join(' | ')}
                                                </strong>
                                              </span>
                                            )}
                                            {wo.matSummary && (
                                              <span>
                                                WO Materials:{' '}
                                                <strong className="text-secondary">
                                                  {wo.matSummary}
                                                </strong>
                                              </span>
                                            )}
                                            {wo.deadline && (
                                              <span>
                                                Target Date:{' '}
                                                <strong className="font-mono text-secondary">
                                                  {formatDate(wo.deadline)}
                                                </strong>
                                              </span>
                                            )}
                                            {wo.assignedToName && (
                                              <span>
                                                Assigned:{' '}
                                                <strong className="text-secondary">
                                                  {wo.assignedToName}
                                                </strong>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right Actions on Work Order Sub-row: ADJUST BOM */}
                                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          icon={Printer}
                                          onClick={() => setPrintWorkOrder(wo)}
                                          className="h-7 px-2 text-xs border border-theme-subtle rounded-none hover:bg-surface2 text-secondary"
                                          title="Print Work Order Traveler"
                                        >
                                          Traveler
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          icon={Eye}
                                          onClick={() =>
                                            navigate(`/production/work-orders/${wo.id}`)
                                          }
                                          className="h-7 px-2 text-xs border border-theme-subtle rounded-none hover:bg-surface2 text-secondary"
                                          title="Open Work Order Detail Studio"
                                        >
                                          WO Studio
                                        </Button>

                                        <Button
                                          variant="primary"
                                          size="sm"
                                          icon={Wrench}
                                          onClick={() =>
                                            navigate(
                                              `/production/work-orders/${wo.id}/adjust`
                                            )
                                          }
                                          className="h-7 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-none shadow-xs"
                                          title="Adjust Work Order BOM (Mat #1, #2) & Production Routes"
                                        >
                                          Adjust BOM
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
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
        /* ── CARDS VIEW (Exact Quotations.tsx Card Style with Work Order Sub-lines) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {paginatedQuotations.map((group) => {
            const displayQ = group.latestMain;
            if (!displayQ) return null;

            let parsed: any = {};
            try {
              parsed =
                typeof displayQ?.data === 'string'
                  ? JSON.parse(displayQ.data || '{}')
                  : displayQ?.data || {};
            } catch (e) {}

            const status = displayQ?.status || 'Approved';
            const quoteOrders: any[] = group.linkedOrders || [];
            const linkedWOs: any[] = group.linkedWorkOrders || [];
            const itemsCount =
              parsed.boms?.length ||
              parsed.custItems?.length ||
              parsed.items?.length ||
              1;

            return (
              <GlassCard
                key={group.quoNo}
                className="p-3.5 hover:border-rex-500/40 transition-all duration-200 border-theme-subtle rounded-none flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-theme-subtle/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewData({
                            quotation: displayQ,
                            type: 'main',
                            lead: {
                              name: group.leadName,
                              company: group.leadCompany,
                              email: group.leadEmail,
                              address: group.leadAddress,
                              vat: group.leadVat,
                              svat: group.leadSvat,
                            },
                          })
                        }
                        className="font-mono font-bold text-sm text-rex-600 dark:text-rex-400 hover:underline cursor-pointer"
                      >
                        {group.quoNo}
                      </button>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                        v{displayQ?.version || 1}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 border ${getStatusColor(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted shrink-0">
                      {formatDate(group.latestDate)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-primary truncate">
                      {group.leadCompany || group.leadName}
                    </h4>
                    {parsed.subject && (
                      <p className="text-xs text-secondary truncate">{parsed.subject}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {quoteOrders.map((so: any) => (
                      <span
                        key={so.id}
                        className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
                      >
                        <ShoppingBag size={10} />
                        {so.orderNo || so.id}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => openTechnicalBomModal(group, parsed)}
                      className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 border border-amber-500/30 flex items-center gap-1"
                    >
                      <Ruler size={10} /> {itemsCount} Parts / BOM Specs
                    </button>
                  </div>

                  {/* Work Order Sub-Lines inside Card */}
                  <div className="mt-3 pt-2.5 border-t border-theme-subtle space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Linked Work Orders ({linkedWOs.length})
                    </div>
                    {linkedWOs.length === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={() => handleQuickCreateWO(group)}
                        className="w-full h-7 text-xs rounded-none"
                      >
                        Create WO &amp; Adjust BOM
                      </Button>
                    ) : (
                      linkedWOs.map((wo: any) => (
                        <div
                          key={wo.id}
                          className="p-2 bg-surface2/60 border border-theme-subtle flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                {wo.orderNo || wo.id}
                              </span>
                              <span className="text-[10px] font-mono text-muted">
                                Qty: {wo.jobQty || wo.qty || 1}
                              </span>
                            </div>
                            <div className="text-[11px] text-primary truncate">
                              {wo.productName || wo.partName || wo.title}
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Wrench}
                            onClick={() =>
                              navigate(`/production/work-orders/${wo.id}/adjust`)
                            }
                            className="h-7 px-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-none shrink-0"
                          >
                            Adjust BOM
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-theme-subtle/40 flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() =>
                      setPreviewData({
                        quotation: displayQ,
                        type: 'main',
                        lead: {
                          name: group.leadName,
                          company: group.leadCompany,
                          email: group.leadEmail,
                          address: group.leadAddress,
                          vat: group.leadVat,
                          svat: group.leadSvat,
                        },
                      })
                    }
                    className="h-7 text-xs px-2 border border-theme-subtle rounded-none"
                  >
                    View Quote
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Ruler}
                    onClick={() => openTechnicalBomModal(group, parsed)}
                    className="h-7 text-xs px-2 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-none"
                  >
                    BOM Specs
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── PAGINATION ────────────────────────────────────────────────────────── */}
      {totalQuotations > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            totalItems={totalQuotations}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[15, 25, 50, 100]}
            itemLabel="quotations"
          />
        </div>
      )}

      {/* ── MODAL 1: OFFICIAL QUOTATION DOCUMENT PREVIEW (PRICE-FREE) ─────────── */}
      <Modal
        isOpen={!!previewData}
        onClose={() => setPreviewData(null)}
        title={
          previewData
            ? `Technical Quotation Preview — ${
                previewData.quotation?.quotationNo || previewData.quotation?.id || ''
              } (No Pricing)`
            : 'Technical Quotation Preview'
        }
        size="xl"
      >
        {previewData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <QuotationPrintView
              hidePrices={true}
              data={(() => {
                const raw =
                  typeof previewData.quotation.data === 'string'
                    ? JSON.parse(previewData.quotation.data || '{}')
                    : previewData.quotation.data || {};
                const parsed = { ...raw };
                parsed.quotationNo =
                  parsed.quotationNo ||
                  previewData.quotation?.quotationNo ||
                  previewData.quotation?.id ||
                  '';
                parsed.docNo =
                  parsed.docNo || previewData.quotation?.docNo || 'FO/PD/02';
                parsed.status =
                  previewData.quotation?.status || parsed.status || 'Approved';
                if (!parsed.customerAddress && previewData.lead?.address)
                  parsed.customerAddress = previewData.lead.address;
                if (
                  !parsed.customerName &&
                  (previewData.lead?.company || previewData.lead?.name)
                ) {
                  parsed.customerName =
                    previewData.lead.company || previewData.lead.name;
                }
                return parsed;
              })()}
              type={previewData.type}
              lead={previewData.lead}
              settings={settings}
            />

            {/* Technical Drawings & Attachments Gallery inside Preview */}
            {(() => {
              let parsed: any = {};
              try {
                parsed =
                  typeof previewData.quotation?.data === 'string'
                    ? JSON.parse(previewData.quotation.data)
                    : previewData.quotation?.data || {};
              } catch (e) {}
              const atts = extractQuoteAttachments(parsed);
              if (atts.length === 0) return null;
              return (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <QuotationAttachmentsGallery
                    attachments={atts}
                    title="Quotation Attachments & Technical Drawings"
                  />
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-gray-200 pt-6">
              <Button
                variant="ghost"
                onClick={async () => {
                  const quoteNo =
                    previewData?.quotation?.quotationNo ||
                    previewData?.quotation?.id ||
                    'Quote';
                  await exportPdf(
                    'print-section',
                    `Technical_Quotation_${quoteNo}.pdf`
                  );
                }}
                className="bg-gray-100 border border-gray-300 text-gray-800 font-semibold hover:bg-gray-200"
              >
                Export Technical PDF
              </Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() =>
                  printElement(
                    'print-section',
                    `Technical_Quotation_${
                      previewData?.quotation?.quotationNo || 'Spec'
                    }`
                  )
                }
              >
                Print Technical Copy
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 2: MULTI-TAB TECHNICAL BOM & DIMENSIONS STUDIO (Twin of Quotations.tsx Costing Modal, Price-Free) ── */}
      <Modal
        isOpen={!!viewBomDialog}
        onClose={() => setViewBomDialog(null)}
        title={
          viewBomDialog?.quotationNo
            ? `Quoted BOM & Dimensions Specification: ${viewBomDialog.quotationNo} (Price-Free)`
            : 'Quoted BOM & Dimensions'
        }
        size="xl"
      >
        {viewBomDialog &&
          (() => {
            const bomsList: any[] =
              viewBomDialog.boms && viewBomDialog.boms.length > 0
                ? viewBomDialog.boms
                : viewBomDialog.autoMats ||
                  viewBomDialog.manualMats ||
                  viewBomDialog.procState
                ? [viewBomDialog]
                : [];

            const custItemsList: any[] = viewBomDialog.custItems || [];
            const activeBom =
              selectedBomTab === 'overview'
                ? null
                : bomsList[Number(selectedBomTab)] || bomsList[0];

            const allQuoteAttachments: QuotationAttachmentItem[] = [
              ...(viewBomDialog.attachments || []).map((a: any, idx: number) => ({
                id: a.id || `quote-att-${idx}`,
                name: a.name || `Quotation Attachment ${idx + 1}`,
                type: a.type,
                dataUrl: a.dataUrl,
                url: a.url,
                source: 'Quotation Specs',
              })),
              ...bomsList.flatMap((b: any, bIdx: number) =>
                (b.attachments || []).map((ba: any, aIdx: number) => ({
                  id: ba.id || `bom-${bIdx}-att-${aIdx}`,
                  name:
                    ba.name ||
                    `${b.title || `Part #${bIdx + 1}`} Drawing ${aIdx + 1}`,
                  type: ba.type,
                  dataUrl: ba.dataUrl,
                  url: ba.url,
                  source: `Part #${bIdx + 1}: ${b.title || 'BOM Part'}`,
                  bomTitle: b.title || `Part #${bIdx + 1}`,
                }))
              ),
            ];

            return (
              <div className="bg-surface text-primary p-0 flex flex-col h-full rounded-b-none overflow-hidden max-h-[85vh]">
                {/* Header Summary Bar (No Costs / No Margin) */}
                <div className="px-6 py-4 bg-surface2/60 border-b border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Ruler size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-primary font-mono">
                          {viewBomDialog.quotationNo}
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono">
                          {bomsList.length} BOM{' '}
                          {bomsList.length === 1 ? 'Part' : 'Parts'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 uppercase tracking-wider font-mono">
                          Designer Technical Spec
                        </span>
                      </div>
                      <p className="text-xs text-muted font-medium mt-0.5">
                        Customer:{' '}
                        <span className="font-semibold text-secondary">
                          {viewBomDialog.customerName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Jump to Adjust BOM for Linked Work Orders */}
                  {Array.isArray(viewBomDialog.workOrders) &&
                    viewBomDialog.workOrders.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {viewBomDialog.workOrders.map((wo: any) => (
                          <Button
                            key={wo.id}
                            variant="primary"
                            size="sm"
                            icon={Wrench}
                            onClick={() => {
                              setViewBomDialog(null);
                              navigate(`/production/work-orders/${wo.id}/adjust`);
                            }}
                            className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-none"
                          >
                            Adjust BOM ({wo.orderNo || wo.id})
                          </Button>
                        ))}
                      </div>
                    )}
                </div>

                {/* Multi-BOM Navigation Tabs */}
                {bomsList.length > 1 && (
                  <div className="px-6 py-2 bg-surface border-b border-theme-subtle flex items-center gap-2 overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBomTab('overview')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-none uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 ${
                        selectedBomTab === 'overview'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle'
                      }`}
                    >
                      <Layers size={13} /> All Parts Overview ({bomsList.length})
                    </button>

                    {bomsList.map((bom: any, bIdx: number) => {
                      const hasDims = (bom.autoMats || []).some(
                        (m: any) => formatAutoMatDimensions(m) !== '-'
                      );
                      return (
                        <button
                          key={bom.id || bIdx}
                          type="button"
                          onClick={() => setSelectedBomTab(bIdx)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-none transition-colors shrink-0 flex items-center gap-1.5 ${
                            selectedBomTab === bIdx
                              ? 'bg-rex-600 text-white font-bold shadow-xs'
                              : 'bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle'
                          }`}
                        >
                          <span>{bom.title || `Part #${bIdx + 1}`}</span>
                          {hasDims && (
                            <span
                              className={`text-[10px] font-mono px-1 py-0.2 rounded-none ${
                                selectedBomTab === bIdx
                                  ? 'bg-black/20 text-white'
                                  : 'bg-surface text-amber-600 dark:text-amber-400 border border-theme-subtle'
                              }`}
                            >
                              Dims
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                  {/* 1. All Parts Overview Tab (Price-Free) */}
                  {selectedBomTab === 'overview' && bomsList.length > 1 && (
                    <div className="space-y-4">
                      <div className="border border-theme-subtle rounded-none overflow-hidden bg-surface">
                        <div className="px-4 py-3 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers
                              size={14}
                              className="text-amber-600 dark:text-amber-400"
                            />
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                              All Quoted Parts, Materials &amp; Dimensions Summary
                            </h4>
                          </div>
                          <span className="text-xs text-muted font-mono">
                            {bomsList.length} BOM Parts
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Part / Component</th>
                                <th className="px-4 py-2.5">Stock Dimensions</th>
                                <th className="px-4 py-2.5 text-center">
                                  Raw Materials
                                </th>
                                <th className="px-4 py-2.5 text-center">
                                  Bought-Out Items
                                </th>
                                <th className="px-4 py-2.5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle/30 text-xs">
                              {bomsList.map((bom: any, bIdx: number) => {
                                const dimStrs = (bom.autoMats || [])
                                  .map((m: any) => formatAutoMatDimensions(m))
                                  .filter((d: string) => d !== '-');
                                return (
                                  <tr
                                    key={bom.id || bIdx}
                                    className="hover:bg-surface2/30 transition-colors"
                                  >
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-primary">
                                        {bom.title || `Part #${bIdx + 1}`}
                                      </div>
                                      {bom.description && (
                                        <div className="text-[11px] text-muted truncate max-w-xs">
                                          {bom.description}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {dimStrs.length > 0 ? (
                                        <div className="space-y-1">
                                          {dimStrs.map((d: string, di: number) => (
                                            <span
                                              key={di}
                                              className="inline-block text-[11px] font-mono font-medium px-2 py-0.5 bg-surface2 text-primary border border-theme-subtle mr-1.5"
                                            >
                                              {d}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-muted text-[11px] italic">
                                          No dimension specified
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                                      {(bom.autoMats || []).length}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-secondary">
                                      {(bom.manualMats || []).length}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedBomTab(bIdx)}
                                        className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-white hover:bg-amber-600 border border-amber-500/30 transition-colors"
                                      >
                                        Inspect Part &rarr;
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {allQuoteAttachments.length > 0 && (
                        <div className="border border-theme-subtle rounded-none bg-surface p-4 shadow-xs">
                          <QuotationAttachmentsGallery
                            attachments={allQuoteAttachments}
                            title="All Technical Drawings & Quotation Attachments"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Specific BOM Part Tab (Price-Free) */}
                  {activeBom && (
                    <div className="space-y-6">
                      {/* Part Banner with Stock Dimensions */}
                      <div className="p-4 bg-gradient-to-r from-surface2/60 via-surface2/30 to-transparent border border-theme-subtle rounded-none flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-primary">
                              {activeBom.title || 'BOM Part Specification'}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold uppercase">
                              Technical Part Detail
                            </span>
                          </div>
                          {activeBom.description && (
                            <p className="text-xs text-muted mt-1 max-w-2xl">
                              {activeBom.description}
                            </p>
                          )}
                        </div>

                        {(() => {
                          const dimStrs = (activeBom.autoMats || [])
                            .map((m: any) => formatAutoMatDimensions(m))
                            .filter((d: string) => d !== '-');
                          if (dimStrs.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
                                <Ruler size={11} className="text-amber-600" /> Stock
                                Dims:
                              </span>
                              {dimStrs.map((d: string, di: number) => (
                                <span
                                  key={di}
                                  className="text-xs font-mono font-bold px-2.5 py-1 bg-surface text-primary border border-amber-500/40 shadow-xs"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Part Attachments / Drawings */}
                      {activeBom.attachments && activeBom.attachments.length > 0 && (
                        <div className="border border-theme-subtle rounded-none bg-surface p-4 shadow-xs">
                          <QuotationAttachmentsGallery
                            attachments={(activeBom.attachments || []).map(
                              (ba: any, aIdx: number) => ({
                                id: ba.id || `active-bom-att-${aIdx}`,
                                name:
                                  ba.name ||
                                  `${activeBom.title || 'Part'} Drawing ${aIdx + 1}`,
                                type: ba.type,
                                dataUrl: ba.dataUrl,
                                url: ba.url,
                                source: activeBom.title || 'Part Drawing',
                              })
                            )}
                            title={`Technical Drawings & Files: ${
                              activeBom.title || 'Part'
                            }`}
                            compact
                          />
                        </div>
                      )}

                      {/* Plate & Round Shaft Raw Materials Table (Price-Free) */}
                      <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                        <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-blue-500" />
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                              Plate &amp; Round Shaft Raw Materials
                            </h4>
                          </div>
                          <span className="text-[11px] font-mono text-muted">
                            {(activeBom.autoMats || []).length} Blanks / Items
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Material Grade</th>
                                <th className="px-4 py-2.5">Profile Type</th>
                                <th className="px-4 py-2.5">
                                  Dimensions (T &times; W &times; L / &Oslash; &times; L)
                                </th>
                                <th className="px-4 py-2.5 text-right w-24">
                                  Quoted Qty
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle/20 text-xs">
                              {(activeBom.autoMats || []).map((m: any, i: number) => {
                                const isShaft = Boolean(
                                  (m.dia && Number(m.dia) > 0) ||
                                    (m.shaftDia && Number(m.shaftDia) > 0)
                                );
                                const formattedDim = formatAutoMatDimensions(m);

                                return (
                                  <tr
                                    key={i}
                                    className="hover:bg-surface2/30 transition-colors"
                                  >
                                    <td className="px-4 py-2.5 font-bold text-primary">
                                      {m.material || 'Raw Material'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span
                                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-none uppercase ${
                                          isShaft
                                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                        }`}
                                      >
                                        {isShaft ? 'Round Shaft' : 'Plate / Sheet'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-mono font-bold text-primary">
                                      {formattedDim !== '-' ? (
                                        formattedDim
                                      ) : (
                                        <span className="text-muted font-normal italic">
                                          None
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                                      {m.qty || 1}
                                    </td>
                                  </tr>
                                );
                              })}
                              {(!activeBom.autoMats ||
                                activeBom.autoMats.length === 0) && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-4 text-center text-muted italic text-xs"
                                  >
                                    No plate or shaft materials entered for this part.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Manual / Bought-Out Materials Table (Price-Free) */}
                      <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                        <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-amber-500" />
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                              Manual / Bought-Out Materials &amp; Hardware
                            </h4>
                          </div>
                          <span className="text-[11px] font-mono text-muted">
                            {(activeBom.manualMats || []).length} Components
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Material / Hardware</th>
                                <th className="px-4 py-2.5">Dimensions &amp; Spec</th>
                                <th className="px-4 py-2.5 text-right w-24">
                                  Quoted Qty
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle/20 text-xs">
                              {(activeBom.manualMats || []).map(
                                (m: any, i: number) => (
                                  <tr
                                    key={i}
                                    className="hover:bg-surface2/30 transition-colors"
                                  >
                                    <td className="px-4 py-2.5 font-bold text-primary">
                                      {m.material || 'Bought-out Component'}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-secondary">
                                      {m.dimensions || m.spec || m.size || '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                                      {m.qty || 1}
                                    </td>
                                  </tr>
                                )
                              )}
                              {(!activeBom.manualMats ||
                                activeBom.manualMats.length === 0) && (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-4 py-4 text-center text-muted italic text-xs"
                                  >
                                    No manual or bought-out materials added.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Machining & Fabrication Operations (Hours Only — No Rates/Costs) */}
                      {activeBom.procState &&
                        Object.keys(activeBom.procState).length > 0 && (
                          <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                            <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Factory size={14} className="text-rose-500" />
                                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                                  Machining &amp; Fabrication Operations (Planned Hours)
                                </h4>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                                  <tr>
                                    <th className="px-4 py-2.5">
                                      Process / Operation
                                    </th>
                                    <th className="px-4 py-2.5 text-right w-28">
                                      Est. Hrs
                                    </th>
                                    <th className="px-4 py-2.5 text-right w-28">
                                      Setup Time
                                    </th>
                                    <th className="px-4 py-2.5 text-right w-28 text-primary">
                                      Quoted Hrs
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-subtle/20 text-xs">
                                  {Object.keys(activeBom.procState).map(
                                    (k: string) => {
                                      const st = activeBom.procState[k];
                                      if (
                                        !st?.estHr &&
                                        !st?.quoHr &&
                                        !st?.setTime
                                      )
                                        return null;
                                      return (
                                        <tr
                                          key={k}
                                          className="hover:bg-surface2/30 transition-colors"
                                        >
                                          <td className="px-4 py-2.5 font-bold text-rose-600 dark:text-rose-400">
                                            {k}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-mono text-muted">
                                            {st.estHr ? `${st.estHr} hrs` : '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-mono text-muted">
                                            {st.setTime ? `${st.setTime} hrs` : '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-mono text-primary font-bold">
                                            {st.quoHr ? `${st.quoHr} hrs` : '—'}
                                          </td>
                                        </tr>
                                      );
                                    }
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* 3. Fallback if only Customer Line Items exist without BOM (Price-Free) */}
                  {bomsList.length === 0 && custItemsList.length > 0 && (
                    <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                      <div className="px-4 py-3 bg-surface2/40 border-b border-theme-subtle">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                          Quotation Line Items &amp; Technical Specifications
                        </h4>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Item Description</th>
                            <th className="px-4 py-2.5">Dimensions / Specs</th>
                            <th className="px-4 py-2.5 text-right w-28">
                              Order Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-subtle/20 text-xs">
                          {custItemsList.map((item: any, idx: number) => (
                            <tr
                              key={item.id || idx}
                              className="hover:bg-surface2/30 transition-colors"
                            >
                              <td className="px-4 py-2.5 font-semibold text-primary whitespace-pre-line">
                                {item.desc ||
                                  item.description ||
                                  item.name ||
                                  `Item #${idx + 1}`}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-secondary font-medium">
                                {item.dimensions || item.spec || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                                {item.qty || 1} {item.unit || item.uom || ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {bomsList.length <= 1 && allQuoteAttachments.length > 0 && (
                    <div className="border border-theme-subtle rounded-none bg-surface p-4 shadow-xs">
                      <QuotationAttachmentsGallery
                        attachments={allQuoteAttachments}
                        title="Technical Drawings & Attachments"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ── MODAL 3: SAMPLE PHOTO VIEWER ──────────────────────────────────────── */}
      {activeViewingPhotos && (
        <SamplePhotoViewerModal
          isOpen={!!activeViewingPhotos}
          onClose={() => setActiveViewingPhotos(null)}
          photos={activeViewingPhotos.photos}
          title={activeViewingPhotos.title || 'Sample Photos'}
        />
      )}

      {/* ── MODAL 4: ATTACHMENTS VIEWER ───────────────────────────────────────── */}
      {viewAttachmentsModalData && (
        <QuotationAttachmentsModal
          isOpen={!!viewAttachmentsModalData}
          onClose={() => setViewAttachmentsModalData(null)}
          quotationNo={viewAttachmentsModalData.quotationNo}
          customerName={viewAttachmentsModalData.customerName}
          attachments={viewAttachmentsModalData.attachments}
        />
      )}

      {/* ── MODAL 5: WORK ORDER PRINT TRAVELER ────────────────────────────────── */}
      {printWorkOrder && (
        <WorkOrderPrintModal
          isOpen={!!printWorkOrder}
          onClose={() => setPrintWorkOrder(null)}
          workOrder={printWorkOrder}
        />
      )}
    </div>
  );
};
