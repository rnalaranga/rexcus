import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, FileEdit, Plus, Download, Filter, Briefcase, User, Search, ArrowRight, Trash2, RotateCcw, Factory, Package, Printer, Bookmark, CheckCircle2, XCircle, Clock, Send, History, Eye, ChevronDown, ChevronUp, Layers, Ruler, Calculator, TrendingUp, Building2, Sparkles, Maximize2, LayoutGrid, List } from 'lucide-react'
import { X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard'
import { Modal } from '@/components/ui/Modal'
import { useDialog } from '@/components/ui/DialogProvider'
import { QuotationPrintView } from '@/components/QuotationPrintView'
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView'
import { QuotationTemplatesModal } from '@/components/crm/QuotationTemplatesModal'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useQuotations, useLeads, useCustomers, useInvoices, useFinishedGoodsOrders } from '@/hooks/useData'
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown'
import { useTaxProfiles } from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportPdf } from '@/lib/exportPdf'
import { deleteQuotation, updateQuotationStatus, submitQuotationForApproval, approveQuotation, rejectQuotation, createWorkOrder, createInvoice, fetchCustomerGRNs, createCustomerGRN, fetchWorkOrders, createFinishedGoodsOrder, fetchPaymentReceipts } from '@/lib/api'
import { Banknote, Mail, ShoppingBag, Receipt, UserCheck, Shield, Users, GitBranch, FileCheck, Info, ShieldCheck } from 'lucide-react'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal'
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { QuotationStageSnapshotModal } from '@/components/crm/QuotationStageSnapshotModal'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner'
import { printElement } from '@/lib/printElement'
import { SamplePhotoUploadSection } from '@/components/crm/SamplePhotoUploadSection'
import { SamplePhotoViewerModal } from '@/components/crm/SamplePhotoViewerModal'
import { CreateSalesOrderModal } from '@/components/crm/CreateSalesOrderModal'
import { RecordCustomerPoModal } from '@/components/crm/RecordCustomerPoModal'


export const Quotations: React.FC = () => {
  const { toast, showConfirm } = useDialog();
  const { user, can } = useAuth();
  const canApprove = can('approvals.quotations') || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager';
  const canViewAll = can('quotations.view_all') || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales_head' || user?.role === 'crm_manager' || (user?.permissions?.includes('*') ?? false);
  const [salesRepFilter, setSalesRepFilter] = useState<'all' | string>('all');

  const [workOrdersList, setWorkOrdersList] = useState<any[]>([])

  const loadWorkOrders = useCallback(async () => {
    try {
      const wos = await fetchWorkOrders()
      setWorkOrdersList(Array.isArray(wos) ? wos : [])
    } catch(e) {}
  }, [])

  useEffect(() => {
    loadWorkOrders()
  }, [loadWorkOrders])

  const [paymentReceiptsList, setPaymentReceiptsList] = useState<any[]>([])
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [selectedQuoteForReceipt, setSelectedQuoteForReceipt] = useState<any>(null)
  const [activePrintReceipt, setActivePrintReceipt] = useState<any>(null)
  const [printReceiptModalOpen, setPrintReceiptModalOpen] = useState(false)
  const [snapshotModalData, setSnapshotModalData] = useState<any | null>(null)
  const [salesOrderModalData, setSalesOrderModalData] = useState<{ group: any; quotation: any; type?: 'custom' | 'product' } | null>(null)
  const [recordPoModalData, setRecordPoModalData] = useState<{ group: any; quotation: any; type?: 'custom' | 'product'; proceedToSalesOrder?: boolean } | null>(null)

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [rejectionTarget, setRejectionTarget] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadPaymentReceipts = useCallback(async () => {
    try {
      const recs = await fetchPaymentReceipts()
      setPaymentReceiptsList(Array.isArray(recs) ? recs : [])
    } catch(e) {}
  }, [])

  useEffect(() => {
    loadPaymentReceipts()
  }, [loadPaymentReceipts])

  const getQuoteReceipts = (group: any, latestMain: any) => {
    if (!latestMain) return []
    const qNo = String(group.quoNo || latestMain.quotationNo || latestMain.docNo || '').trim().toLowerCase()
    const qId = String(latestMain.id || '').trim()

    return paymentReceiptsList.filter((r: any) => {
      const rQuoteId = String(r.quoteId || r.quotationId || '').trim()
      const rQuoNo = String(r.quotationNo || '').trim().toLowerCase()
      return (
        (qId && rQuoteId && rQuoteId === qId) ||
        (qNo && rQuoNo && rQuoNo === qNo)
      )
    })
  }

  const handleOpenReceiptModal = (group: any, latestMain: any) => {
    setSelectedQuoteForReceipt({
      ...latestMain,
      quotationNo: group.quoNo || latestMain.quotationNo || latestMain.docNo,
      group
    })
    setReceiptModalOpen(true)
  }

  const getExistingWO = (group: any, latestMain: any) => {
    if (!latestMain) return null
    return workOrdersList.find((w: any) => 
      (w.sourceQuoteId && String(w.sourceQuoteId) === String(latestMain.id)) ||
      (w.quoteId && String(w.quoteId) === String(latestMain.id)) ||
      (w.title && group.quoNo && w.title.includes(group.quoNo))
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'PO Received': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 font-bold';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Pending Approval': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      case 'In Production': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  }

  
  const handleCreateWO = (group: any, latestMain: any) => {
    const existing = getExistingWO(group, latestMain);
    if (existing) {
      toast(`A Work Order (${existing.orderNo || existing.id}) already exists for Quotation ${group.quoNo}! Duplicate work orders are not allowed.`, 'warning');
      return;
    }

    // Check if customer registration conditions mandate an advance deposit
    const lead = leads.find((l: any) => l.id === group.leadId);
    const custId = group.leadId || (lead as any)?.customerId;
    const cust = customers.find((c: any) => c.id === custId || (c.name && group.clientName && c.name.toLowerCase() === group.clientName.toLowerCase()));

    const customerRequiresAdvance = Boolean(cust && (cust.requiresAdvance === true || cust.requiresAdvance === 1));

    if (customerRequiresAdvance) {
      const hasAdvance = allInvoices.some((inv: any) => 
        (inv.isProforma || inv.invoiceType === 'proforma' || String(inv.id || inv.invoiceNo || '').startsWith('PI-')) &&
        (String(inv.quotationId) === String(latestMain.id) || String(inv.quotationNo) === String(group.quoNo) || String(inv.orderNo) === String(group.quoNo))
      );

      const hasApprovedOrder = allOrders.some((ord: any) => 
        (String(ord.quoteId) === String(latestMain.id) || String(ord.quotationNo) === String(group.quoNo)) &&
        ord.status === 'Confirmed'
      );

      if (!hasAdvance && !hasApprovedOrder) {
        toast(`Customer "${cust?.company || cust?.name || 'Client'}" requires an advance deposit as per registration conditions. Please issue an Advance Proforma Invoice or obtain Admin approval via Sales Orders before initiating a Work Order.`, 'warning');
        return;
      }
    }

    setWoDialog({ type: 'confirm', group, latestMain });
  }

  const executeCreateWO = async () => {
    if (!woDialog?.group || !woDialog?.latestMain) return;
    try {
      const data = typeof woDialog.latestMain.data === 'string' 
        ? JSON.parse(woDialog.latestMain.data || '{}') 
        : (woDialog.latestMain.data || {});
      
      const operations: any[] = [];
      const bom: any[] = [];

      // 1. Check data.boms array (Modern multi-part BOM structure)
      if (Array.isArray(data.boms) && data.boms.length > 0) {
        data.boms.forEach((b: any, bIdx: number) => {
          const partPrefix = b.title ? `${b.title}: ` : (data.boms.length > 1 ? `Part ${bIdx + 1}: ` : '');

          // Auto Materials (Raw stock rods/plates/shafts)
          (b.autoMats || []).forEach((m: any) => {
            if (m.material) {
              const specNotes = [
                m.length && m.width ? `${m.length}x${m.width}` : m.length ? `L:${m.length}` : '',
                m.thick ? `${m.thick}mm` : m.dia ? `Ø${m.dia}mm` : ''
              ].filter(Boolean).join(' ');
              bom.push({
                material: m.material,
                qty: Number(m.qty) || 1,
                unit: m.dia ? 'rods' : 'plates',
                unitCost: Number(m.unitPrice) || 0,
                notes: `${partPrefix}${specNotes}`.trim()
              });
            }
          });

          // Manual Materials
          (b.manualMats || []).forEach((m: any) => {
            if (m.material) {
              bom.push({
                material: m.material,
                qty: Number(m.qty) || 1,
                unit: 'pcs',
                unitCost: Number(m.unitPrice) || 0,
                notes: `${partPrefix}${m.supplier || ''}`.trim()
              });
            }
          });

          // Machining Operations for this BOM part
          if (b.procState && typeof b.procState === 'object') {
            Object.keys(b.procState).forEach(procName => {
              const op = b.procState[procName];
              const hrs = Number(op?.estHr) || Number(op?.quoHr) || 0;
              if (hrs > 0) {
                operations.push({
                  operationName: `${partPrefix}${procName}`,
                  plannedHours: hrs,
                  hourlyLaborRate: Number(op?.hrRate || 750),
                  hourlyMachineRate: Number(op?.machineRate || 1200)
                });
              }
            });
          }
        });
      }

      // 2. Fallback to root-level autoMats & manualMats (Legacy single-BOM format)
      if (bom.length === 0) {
        const autoMats = data.autoMats || [];
        const manualMats = data.manualMats || [];

        autoMats.forEach((m: any) => {
          if (m.material) {
            bom.push({
              material: m.material,
              qty: Number(m.qty) || 1,
              unit: m.dia ? 'rods' : 'plates',
              unitCost: Number(m.unitPrice) || 0,
              notes: `${m.length}x${m.width} ${m.thick}mm`
            });
          }
        });

        manualMats.forEach((m: any) => {
          if (m.material) {
            bom.push({
              material: m.material,
              qty: Number(m.qty) || 1,
              unit: 'pcs',
              unitCost: Number(m.unitPrice) || 0,
              notes: m.supplier || ''
            });
          }
        });
      }

      // 3. Fallback to root-level procState (Legacy operations format)
      if (operations.length === 0 && data.procState && typeof data.procState === 'object') {
        const procState = data.procState || {};
        Object.keys(procState).forEach(k => {
          const hrs = Number(procState[k].estHr) || Number(procState[k].quoHr) || 0;
          if (hrs > 0) {
            operations.push({
              operationName: k,
              plannedHours: hrs,
              hourlyLaborRate: 750,
              hourlyMachineRate: 1200
            });
          }
        });
      }

      // 4. Fallback for Product Quotations or Itemized Quotations with custItems
      if (bom.length === 0 && Array.isArray(data.custItems)) {
        data.custItems.forEach((ci: any) => {
          if (ci.desc || ci.name) {
            bom.push({
              material: ci.desc || ci.name,
              qty: Number(ci.qty) || 1,
              unit: ci.unit || 'pcs',
              unitCost: Number(ci.unitPrice) || 0,
              notes: ci.notes || 'Product line item'
            });
          }
        });
      }

      // Default operation if operations still empty
      if (operations.length === 0) {
        operations.push({
          operationName: 'Precision Machining & Assembly',
          plannedHours: 2,
          hourlyLaborRate: 750,
          hourlyMachineRate: 1200
        });
      }

      const jobQty = Math.max(1, Number(data.jobQty || (data.custItems && data.custItems[0]?.qty) || (data.items && data.items[0]?.qty) || 1));

      const woData = {
        title: `WO: ${woDialog.group.quoNo} - ${woDialog.group.leadName || 'Customer'}`,
        customerId: woDialog.group.leadId,
        sourceQuoteId: woDialog.latestMain?.id || null,
        priority: 'Medium',
        jobQty,
        operations,
        bom
      };
      
      const res = await createWorkOrder(woData);
      if (res && res.error === 'DUPLICATE') {
        setWoDialog({ type: 'error', msg: `A Work Order already exists (${res.existingId || ''}) for Quotation ${woDialog.group.quoNo}!` });
        return;
      }
      try {
        await updateQuotationStatus(woDialog.latestMain.id, 'In Production');
      } catch (err) {}
      await loadWorkOrders();
      await refetch();
      setWoDialog({ type: 'success', msg: `Work Order successfully created for ${woDialog.group.quoNo}! Quotation status updated to 'In Production'.` });
    } catch(e: any) {
      setWoDialog({ type: 'error', msg: e?.message || 'Failed to create Work Order' });
    }
  }

  
  const handlePaymentRequest = (group: any, latestMain: any) => {
    navigate(`/finance/invoices/new?quoteId=${latestMain.id}`);
  };

  const handleRecordCustomerPo = (group: any, latestMain: any) => {
    setRecordPoModalData({ group, quotation: latestMain, type: 'custom' });
  };

  const handleCreateSalesOrder = (group: any, latestMain: any) => {
    const parsed = latestMain?.parsed || {};
    let qData: any = {};
    try {
      qData = typeof latestMain?.data === 'string' ? JSON.parse(latestMain.data) : (latestMain?.data || {});
    } catch (e) {}

    const hasPo = Boolean(
      (latestMain?.customerPoNo && latestMain.customerPoNo.trim()) ||
      (parsed?.customerPoNo && parsed.customerPoNo.trim()) ||
      (qData?.customerPoNo && qData.customerPoNo.trim()) ||
      latestMain?.status === 'PO Received' ||
      latestMain?.status === 'PO Pending' ||
      latestMain?.status === 'Without PO'
    );

    if (!hasPo) {
      toast('Customer PO is required to create a Sales Order. Please record PO, PO Pending, or Without PO.', 'info');
      setRecordPoModalData({
        group,
        quotation: latestMain,
        type: group.isProduct ? 'product' : 'custom',
        proceedToSalesOrder: true
      });
      return;
    }

    setSalesOrderModalData({ group, quotation: latestMain, type: 'custom' });
  };

  const handleStatusChange = async (id: string, status: string, currentStatus?: string) => {
    if ((status === 'Sent' || status === 'In Production') && currentStatus !== 'Approved') {
      toast('Quotation must be Approved before changing status to Sent or In Production! Please submit for approval first.', 'error');
      return;
    }
    try {
      await updateQuotationStatus(id, status);
      toast(`Status updated to ${status}`, 'success');
      refetch();
    } catch(e: any) {
      toast(e?.message || 'Failed to update status', 'error');
    }
  }

  const navigate = useNavigate()
  const { data: quotations, loading, refetch } = useQuotations()
  const { data: taxProfiles } = useTaxProfiles()
  const { data: leads = [] } = useLeads()
  const { data: customers = [] } = useCustomers()
  const { data: allInvoices = [] } = useInvoices()
  const { data: allOrders = [] } = useFinishedGoodsOrders()
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [actionCoords, setActionCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number; height: number } | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  const [infoCoords, setInfoCoords] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.quotation-action-menu-dropdown') && !target.closest('.quotation-action-trigger-btn')) {
        setOpenActionId(null);
        setActionCoords(null);
      }
      if (!target.closest('.quotation-info-menu-dropdown') && !target.closest('.quotation-info-trigger-btn')) {
        setOpenInfoId(null);
        setInfoCoords(null);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (e.target && ((e.target as HTMLElement).closest?.('.quotation-action-menu-dropdown') || (e.target as HTMLElement).closest?.('.quotation-info-menu-dropdown'))) {
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

  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '')
  
  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('id')
    if (s !== null && s !== undefined) {
      setSearch(s)
    }
  }, [searchParams])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'custom' | 'product'>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [woDialog, setWoDialog] = useState<{type: 'confirm'|'success'|'error', group?: any, latestMain?: any, msg?: string} | null>(null)
  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)
  const [grnDialog, setGrnDialog] = useState<{ group?: any, latestMain?: any, items?: any[], receivedAt?: string, notes?: string, photos?: any[] } | null>(null)
  const [activeViewingPhotos, setActiveViewingPhotos] = useState<{ photos: any[], title?: string } | null>(null)
  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)
  const [viewBomDialog, setViewBomDialog] = useState<any>(null)
  const [selectedBomTab, setSelectedBomTab] = useState<number | 'overview'>('overview')

  const formatAutoMatDimensions = (m: any) => {
    if (!m) return '-';
    const hasThick = m.thick !== undefined && m.thick !== '' && m.thick !== null && Number(m.thick) > 0;
    const hasWidth = m.width !== undefined && m.width !== '' && m.width !== null && Number(m.width) > 0;
    const hasLength = m.length !== undefined && m.length !== '' && m.length !== null && Number(m.length) > 0;
    const hasDia = (m.dia !== undefined && m.dia !== '' && m.dia !== null && Number(m.dia) > 0) ||
                   (m.shaftDia !== undefined && m.shaftDia !== '' && m.shaftDia !== null && Number(m.shaftDia) > 0);

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

  const openCostingModal = (group: any, parsed: any, defaultIndex: number = 0) => {
    const bomsList = parsed.boms && parsed.boms.length > 0 ? parsed.boms : [];
    setViewBomDialog({
      quotationNo: group.quoNo,
      customerName: group.leadCompany || group.leadName || 'Customer',
      boms: bomsList,
      custItems: parsed.custItems || [],
      jobTotals: parsed.jobTotals,
      custTotals: parsed.custTotals,
      totalQuoted: parsed.custTotals?.total || group.main[0]?.totalAmount || 0,
      ...(bomsList.length === 0 ? parsed : {})
    });
    setSelectedBomTab(bomsList.length > 1 ? 'overview' : 0);
  };
  const [quoteGrns, setQuoteGrns] = useState<Record<string, any[]>>({})
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const { settings } = useSettings()
    useEffect(() => {
    import('@/lib/api').then(({ fetchAllCustomerGRNs }) => {
      fetchAllCustomerGRNs().then(grns => {
        if (Array.isArray(grns)) {
           const map: Record<string, any[]> = {};
           grns.forEach((g: any) => {
              if (g.quoteId) {
                if (!map[g.quoteId]) map[g.quoteId] = [];
                map[g.quoteId].push(g);
              }
           });
           setQuoteGrns(map);
        }
      }).catch(() => {});
    });
  }, []); // Remove groupedQuotations dependency, just run once on mount!

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

  const groupedQuotations = useMemo(() => {
    const groups: Record<string, { 
      quoNo: string; 
      leadName: string; 
      leadCompany: string; 
      leadEmail?: string; 
      leadAddress: string; 
      leadVat: string; 
      leadSvat: string; 
      leadId: string; 
      customerId?: string;
      isProduct: boolean;
      isDeleted?: boolean;
      deletedAt?: string;
      deletedBy?: string;
      main: any[]; 
      job: any[]; 
      customer: any[]; 
      latestDate: string; 
      salesRep?: string; 
    }> = {};
    
    quotations.forEach(q => {
      let parsed: any = {};
      try {
        parsed = typeof q.data === "string" ? JSON.parse(q.data || "{}") : (q.data || {});
        if (typeof parsed === "string") {
          try { parsed = JSON.parse(parsed); } catch (e) {}
        }
      } catch (e) {}

      const isProd = Boolean(
        q.type === "product" || 
        q.type === "product_draft" || 
        parsed.isProductQuotation === true || 
        parsed.quotationCategory === "product" ||
        String(q.quotationNo || q.docNo || q.id || "").startsWith("PQ")
      );

      const repName = q.createdByName || parsed.createdByName || parsed.salesRep || parsed.preparedBy || "";
      const repId = q.createdBy || parsed.createdBy || "";
      const repUname = parsed.createdByUsername || "";

      // Access check: If not canViewAll, user can ONLY view their own quotations
      if (!canViewAll) {
        const uid = String(user?.id || "").trim().toLowerCase();
        const uname = String(user?.username || "").trim().toLowerCase();
        const uName = String(user?.name || "").trim().toLowerCase();
        const uPrefix = String(user?.prefix || "").trim().toLowerCase();

        const qCreatedBy = String(repId).trim().toLowerCase();
        const qCreatedByName = String(repName).trim().toLowerCase();
        const qCreatedByUname = String(repUname).trim().toLowerCase();
        const quoNoLower = String(parsed.quotationNo || q.docNo || q.id || "").trim().toLowerCase();

        const isOwn = (uid && qCreatedBy && qCreatedBy === uid) ||
                      (uname && (qCreatedBy === uname || qCreatedByUname === uname)) ||
                      (uName && (qCreatedByName === uName || String(parsed.salesRep || "").toLowerCase() === uName)) ||
                      (uPrefix && quoNoLower.startsWith(uPrefix)) ||
                      (!qCreatedBy && !qCreatedByName); // Don't hide unassigned or legacy quotes

        if (!isOwn) return;
      }

      const quoNo = q.quotationNo || parsed.quotationNo || q.docNo || parsed.docNo || q.id;
      const numId = String(q.leadId || "").replace(/^LEAD-0*/i, "");
      const lead = leads.find((l) => 
        l.id === q.leadId || 
        l.id === parsed.leadId || 
        (numId && (l.id === `LEAD-${numId.padStart(3, "0")}` || String(l.id).replace(/^LEAD-0*/i, "") === numId)) ||
        (q.customerId && l.customerId === q.customerId) ||
        (parsed.company && l.company?.toLowerCase() === parsed.company?.toLowerCase())
      );
      const cust = customers.find((c) => 
        c.id === q.leadId || 
        c.id === parsed.leadId || 
        c.id === q.customerId ||
        (lead?.customerId && c.id === lead.customerId) ||
        (parsed.company && (c.company?.toLowerCase() === parsed.company?.toLowerCase() || c.name?.toLowerCase() === parsed.company?.toLowerCase()))
      );

      const resolvedLeadId = lead?.id || cust?.id || q.leadId || "WALK-IN";
      const isDraft = q.type === "draft" || q.type === "product_draft";
      const isAutoPregenNo = !quoNo || quoNo.startsWith('QT-DRAFT-') || quoNo.startsWith('PQ-DRAFT-') || quoNo === 'QT-2206' || quoNo === 'PQ-2206';

      let groupKey: string;
      if (q.deletedAt) {
        groupKey = `DELETED_${q.id}`;
      } else if (quoNo && !isAutoPregenNo) {
        groupKey = `${quoNo}_${resolvedLeadId}`;
      } else if (isDraft && resolvedLeadId !== 'WALK-IN') {
        groupKey = `DRAFT_${resolvedLeadId}`;
      } else {
        groupKey = q.id;
      }
      
      if (!groups[groupKey]) {
        const leadCompany = q.leadCompany || cust?.company || lead?.company || parsed.company || parsed.customerCompany || "";
        const leadName = q.leadName || cust?.name || lead?.name || parsed.customerName || parsed.attention || "Walk-in Customer";
        const leadEmail = parsed.customerEmail || parsed.email || cust?.email || lead?.email || "";
        const leadAddress = parsed.customerAddress || parsed.address || q.leadAddress || cust?.address || lead?.address || "";
        const leadVat = parsed.vatNo || q.leadVat || cust?.vat || lead?.vat || "";
        const leadSvat = parsed.tinNo || q.leadSvat || cust?.svat || cust?.tin || lead?.svat || lead?.tin || "";

        groups[groupKey] = { 
          quoNo: (isAutoPregenNo ? (q.quotationNo || q.docNo || q.id) : quoNo) || q.id, 
          leadName, 
          leadCompany, 
          leadEmail, 
          leadAddress, 
          leadVat, 
          leadSvat, 
          leadId: resolvedLeadId, 
          customerId: cust?.id || lead?.customerId || q.customerId,
          isProduct: isProd,
          isDeleted: Boolean(q.deletedAt),
          deletedAt: q.deletedAt,
          deletedBy: q.deletedBy,
          main: [], 
          job: [], 
          customer: [], 
          latestDate: q.date || q.createdAt || new Date().toISOString(), 
          salesRep: repName 
        };
      } else {
        const qTime = new Date(q.date || q.createdAt).getTime();
        const existingTime = new Date(groups[groupKey].latestDate).getTime();
        if (!isNaN(qTime) && qTime > existingTime) {
          groups[groupKey].latestDate = q.date || q.createdAt;
          if (quoNo && !isAutoPregenNo) {
            groups[groupKey].quoNo = quoNo;
          }
        }
      }
      
      if (q.deletedAt) {
        if (!groups[groupKey].main.length) groups[groupKey].main.push(q);
      } else if (q.type === "main") {
        if (!groups[groupKey].main.some(m => m.id === q.id)) {
          groups[groupKey].main.push(q);
        }
      } else if (q.type === "job") {
        if (!groups[groupKey].job.some(j => j.id === q.id)) {
          groups[groupKey].job.push(q);
        }
      } else if (q.type === "customer") {
        if (!groups[groupKey].customer.some(c => c.id === q.id)) {
          groups[groupKey].customer.push(q);
          if (!groups[groupKey].main.length) groups[groupKey].main.push(q);
        }
      } else if (isDraft) {
        // Deduplicate drafts: keep only the latest draft for this group
        const existingDraftIdx = groups[groupKey].main.findIndex(m => m.type === 'draft' || m.type === 'product_draft' || m.id === q.id);
        if (existingDraftIdx >= 0) {
          const existingTime = new Date(groups[groupKey].main[existingDraftIdx].date || groups[groupKey].main[existingDraftIdx].createdAt).getTime();
          const qTime = new Date(q.date || q.createdAt).getTime();
          if (qTime >= existingTime) {
            groups[groupKey].main[existingDraftIdx] = q;
          }
        } else {
          groups[groupKey].main.push(q);
        }
      } else {
        if (!groups[groupKey].main.some(m => m.id === q.id)) {
          groups[groupKey].main.push(q);
        }
      }
      
      const qTime = new Date(q.date || q.createdAt).getTime();
      if (!isNaN(qTime) && qTime > new Date(groups[groupKey].latestDate).getTime()) {
        groups[groupKey].latestDate = q.date || q.createdAt;
      }
    });
    
    // Ensure main has at least 1 record for each group
    Object.values(groups).forEach(g => {
      if (g.main.length === 0) {
        if (g.customer.length > 0) g.main.push(...g.customer);
        else if (g.job.length > 0) g.main.push(...g.job);
      }
      g.main.sort((a, b) => (Number(b.version) || 1) - (Number(a.version) || 1));
      g.job.sort((a, b) => (Number(b.version) || 1) - (Number(a.version) || 1));
      g.customer.sort((a, b) => (Number(b.version) || 1) - (Number(a.version) || 1));
    });
    
    // Sort groups by latest date descending
    return Object.values(groups).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [quotations, customers, leads, canViewAll, user])

  // Active Drafts (Custom Engineering)
  const activeDrafts = useMemo(() => {
    return groupedQuotations.filter((g: any) => {
      if (customerFilter !== 'all' && g.leadId !== customerFilter) return false;
      const main0 = g.main[0];
      return main0?.type === 'draft' || (main0?.status || '').toLowerCase() === 'draft';
    });
  }, [groupedQuotations, customerFilter]);

  // Overall KPI stats
  const kpiStats = useMemo(() => {
    let totalQuoted = 0;
    let approvedVal = 0;
    let pendingCount = 0;
    let inProdCount = 0;
    let draftsCount = 0;

    groupedQuotations.forEach(g => {
      const m = g.main[0] || g.customer[0] || g.job[0];
      const val = Number(m?.totalAmount || m?.customAmount || 0);
      totalQuoted += val;
      const st = (m?.status || 'Draft').toLowerCase();
      if (st === 'approved' || st === 'accepted') approvedVal += val;
      if (st === 'pending approval') pendingCount++;
      if (st === 'in production') inProdCount++;
      if (m?.type === 'draft' || st === 'draft') draftsCount++;
    });

    return { totalQuoted, approvedVal, pendingCount, inProdCount, draftsCount };
  }, [groupedQuotations]);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      draft: 0,
      "pending approval": 0,
      "po received": 0,
      approved: 0,
      sent: 0,
      "in production": 0,
      rejected: 0,
      trash: 0
    };
    groupedQuotations.forEach(g => {
      if (categoryFilter !== "all") {
        if (categoryFilter === "product" && !g.isProduct) return;
        if (categoryFilter === "custom" && g.isProduct) return;
      }

      if (g.isDeleted) {
        counts.trash++;
        return;
      }

      const latestMain = g.main[0] || g.customer[0] || g.job[0];
      const isAutoDraft = latestMain?.type === "draft";
      const s = (latestMain?.status || "Draft").toLowerCase();
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
  }, [groupedQuotations, categoryFilter]);

  // Total Quoted Value
  const totalQuotedValue = useMemo(() => {
    return groupedQuotations.reduce((sum, g) => sum + Number((g.main[0] || g.customer[0] || g.job[0])?.totalAmount || 0), 0);
  }, [groupedQuotations]);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading quotations...</div>

  const filtered = groupedQuotations.filter(g => {
    const latestMain = g.main[0] || g.customer[0] || g.job[0];
    const isAutoDraft = latestMain?.type === "draft";

    // Category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "product" && !g.isProduct) return false;
      if (categoryFilter === "custom" && g.isProduct) return false;
    }

    // Search filter
    const q = search.toLowerCase();
    const searchMatch = !search || [g.quoNo, g.leadName, g.leadCompany, g.salesRep].some(v => v?.toLowerCase().includes(q));
    if (!searchMatch) return false;

    // Sales rep filter for management / sales head view
    if (canViewAll && salesRepFilter !== "all") {
      const gRep = (g.salesRep || g.main[0]?.createdByName || "").trim().toLowerCase();
      if (gRep !== salesRepFilter.trim().toLowerCase()) return false;
    }

    // Trash filter vs normal status filters
    if (statusFilter.toLowerCase() === 'trash') {
      if (!g.isDeleted) return false;
    } else {
      if (g.isDeleted) return false;
      const latestStatus = (latestMain?.status || "Draft").toLowerCase();
      const isDraft = isAutoDraft || latestStatus === "draft";
      if (statusFilter === "all") {
        // Hide drafts from the main list so "All" stays clean for confirmed/real quotations
        if (isDraft) return false;
      } else if (statusFilter === "draft") {
        if (!isDraft) return false;
      } else {
        if (latestStatus !== statusFilter.toLowerCase()) return false;
      }
    }

    // Customer filter
    if (customerFilter !== "all") {
      const matchCust = g.leadId === customerFilter ||
        (g.customerId && g.customerId === customerFilter) ||
        (g.leadId && customerFilter && (
          String(g.leadId).replace(/^LEAD-0*/i, '') === String(customerFilter).replace(/^LEAD-0*/i, '')
        ));
      if (!matchCust) return false;
    }

    // Date range filter
    let dateMatch = true;
    const qDate = (g.latestDate || g.main[0]?.date || "").slice(0, 10);
    if (startDate && qDate) {
      dateMatch = dateMatch && qDate >= startDate;
    }
    if (endDate && qDate) {
      dateMatch = dateMatch && qDate <= endDate;
    }

    return searchMatch && dateMatch;
  });

  const renderActionsDropdown = (
    group: any,
    latestMain: any,
    displayQ: any,
    parsed: any,
    existingWO: any,
    sampleGrns: any[],
    idx: number
  ) => {
    const isOpen = openActionId === group.quoNo;

    const hasMaterialChange = Boolean(
      (latestMain?.materialStatus && (
        latestMain.materialStatus.toLowerCase().includes('substitut') ||
        latestMain.materialStatus.toLowerCase().includes('change') ||
        latestMain.materialStatus.toLowerCase().includes('shortage')
      )) ||
      (existingWO?.materialStatus && (
        existingWO.materialStatus.toLowerCase().includes('substitut') ||
        existingWO.materialStatus.toLowerCase().includes('change') ||
        existingWO.materialStatus.toLowerCase().includes('shortage')
      )) ||
      latestMain?.materialAlert ||
      existingWO?.materialAlert
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
          className={`quotation-action-trigger-btn relative h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none cursor-pointer ${
            isOpen
              ? 'bg-rex-600 text-white border-rex-600'
              : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
          }`}
          title={hasMaterialChange ? `⚠️ Material Substituted/Changed: ${existingWO?.materialAlert || latestMain?.materialAlert || 'Workshop substituted material'}` : 'Actions'}
        >
          <span>Actions</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          {hasMaterialChange && (
            <span 
              className="absolute -top-1 -right-1 flex h-2.5 w-2.5" 
              title={existingWO?.materialAlert || latestMain?.materialAlert || "⚠️ Material Substituted / Changed in Workshop"}
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
            className="quotation-action-menu-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1.5 text-left rounded-none overflow-y-auto custom-scrollbar"
          >
            <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
              Quotation Actions
            </div>

            {hasMaterialChange && (
              <div className="mx-2 my-1 p-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-none text-[11px] flex items-start gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="block font-bold">Material Changed / Substituted</strong>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 block line-clamp-2">
                    {existingWO?.materialAlert || latestMain?.materialAlert || existingWO?.materialStatus || 'Alternative material selected on shopfloor'}
                  </span>
                </div>
              </div>
            )}

            {/* Lifecycle Stage Snapshot */}
            <button
              type="button"
              onClick={() => {
                const linkedOrder = allOrders.find((o: any) => (o.quoteId && String(o.quoteId) === String(latestMain?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                const linkedInvoice = allInvoices.find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latestMain?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                const quoteReceipts = getQuoteReceipts(group, latestMain);
                const totalAdv = quoteReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                const latestRec = quoteReceipts[0] || null;

                setSnapshotModalData({
                  group,
                  quotation: latestMain || displayQ,
                  linkedOrder,
                  linkedWorkOrder: existingWO,
                  linkedInvoice,
                  sampleGrns,
                  totalAdvance: totalAdv,
                  latestReceipt: latestRec
                });
                setOpenActionId(null);
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
            >
              <GitBranch size={14} className="text-rex-600 dark:text-rex-400 shrink-0" />
              <div>
                <span className="font-bold block">Stage Snapshot</span>
                <span className="text-[10px] text-muted block">View 6-stage core workflow progress</span>
              </div>
            </button>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

            {/* 1. Preview Document */}
            <button
              type="button"
              onClick={() => {
                setPreviewData({
                  quotation: latestMain || displayQ,
                  type: 'main',
                  lead: {
                    name: group.leadName,
                    company: group.leadCompany,
                    email: group.leadEmail,
                    address: group.leadAddress,
                    vat: group.leadVat,
                    svat: group.leadSvat
                  }
                });
                setOpenActionId(null);
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
            >
              <Eye size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Preview Document</span>
            </button>

            {/* 2. Open in Builder */}
            <button
              type="button"
              onClick={() => {
                const targetId = (latestMain || displayQ)?.id;
                const leadParam = group.leadId || 'WALK-IN';
                const url = group.isProduct
                  ? `/crm/product-quotations/new/${leadParam}?quoteId=${targetId}`
                  : `/crm/quotations/new/${leadParam}?quoteId=${targetId}`;
                navigate(url);
                setOpenActionId(null);
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
            >
              <FileEdit size={14} className="text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span>Edit in Quotation Builder</span>
            </button>

            {/* 3. Send Email */}
            <button
              type="button"
              onClick={() => {
                const isApprovedStatus = ['Approved', 'Sent', 'Accepted', 'In Production', 'PO Received', 'Without PO'].includes(latestMain?.status);
                if (!isApprovedStatus) {
                  toast(`Quotation is currently "${latestMain?.status || 'Draft'}". Must be Approved before emailing customer.`, 'error');
                  return;
                }
                setEmailModalData({
                  documentNumber: group.quoNo,
                  customerEmail: group.leadEmail || '',
                  customerName: group.leadCompany || group.leadName || 'Customer',
                  totalAmount: latestMain?.totalAmount || '0.00',
                  validityDays: parsed.validity || '30',
                  elementIdToPdf: 'print-section'
                });
                setOpenActionId(null);
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
            >
              <Mail size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Send via Email</span>
            </button>

            {/* Commercial & Production Actions */}
            {(latestMain?.status === 'Approved' || latestMain?.status === 'Sent' || latestMain?.status === 'Accepted' || latestMain?.status === 'In Production' || latestMain?.status === 'PO Received') && (
              <>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Commercial & Production
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleRecordCustomerPo(group, latestMain);
                    setOpenActionId(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                >
                  <FileCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>PO Received</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCreateSalesOrder(group, latestMain);
                    setOpenActionId(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors text-left"
                >
                  <ShoppingBag size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Create Sales Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenReceiptModal(group, latestMain);
                    setOpenActionId(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors text-left"
                >
                  <Receipt size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Issue Advance Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handlePaymentRequest(group, latestMain);
                    setOpenActionId(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors text-left"
                >
                  <FileText size={14} className="shrink-0 text-emerald-500" />
                  <span>Generate Tax Invoice</span>
                </button>

                {existingWO ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/production/work-orders/${existingWO.id}`);
                      setOpenActionId(null);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2.5 transition-colors text-left"
                  >
                    <Factory size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span className="truncate">View Work Order ({existingWO.orderNo || existingWO.id})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleCreateWO(group, latestMain);
                      setOpenActionId(null);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2.5 transition-colors text-left"
                  >
                    <Factory size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span>Create Work Order</span>
                  </button>
                )}

                {sampleGrns.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintGrnData({ grn: sampleGrns[0], group });
                        setOpenActionId(null);
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 transition-colors text-left"
                    >
                      <Printer size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
                      <span>Print Sample GRN</span>
                    </button>
                    {(() => {
                      let sPhotos: any[] = [];
                      try {
                        sPhotos = typeof sampleGrns[0].photos === 'string' ? JSON.parse(sampleGrns[0].photos) : (sampleGrns[0].photos || []);
                      } catch(e) {}
                      if (!Array.isArray(sPhotos) || sPhotos.length === 0) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveViewingPhotos({ photos: sPhotos, title: `Sample Photos - ${group.quoNo} (${sampleGrns[0].grnNo || 'GRN'})` });
                            setOpenActionId(null);
                          }}
                          className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left"
                        >
                          <Eye size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>View Sample Photos ({sPhotos.length})</span>
                        </button>
                      );
                    })()}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setGrnDialog({ group, latestMain, items: [{ description: '', qty: 1 }], photos: [] });
                      setOpenActionId(null);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-2.5 transition-colors text-left"
                  >
                    <Package size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
                    <span>Receive Sample (GRN)</span>
                  </button>
                )}
              </>
            )}

            {/* View BOM Costing & Dimensions */}
            {((parsed.boms && parsed.boms.length > 0) || (parsed.custItems && parsed.custItems.length > 0)) && (
              <>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <button
                  type="button"
                  onClick={() => {
                    openCostingModal(group, parsed);
                    setOpenActionId(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left"
                >
                  <Briefcase size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>View Costing & Dimensions</span>
                </button>
              </>
            )}

            {/* Approvals Section */}
            {latestMain?.type !== 'draft' && ((latestMain?.status === 'Draft' || !latestMain?.status || latestMain?.status === 'Rejected') || (canApprove && latestMain?.status === 'Pending Approval')) && (
              <>
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Workflow & Approvals
                </div>

                {(latestMain?.status === 'Draft' || !latestMain?.status || latestMain?.status === 'Rejected') && (
                  <button
                    type="button"
                    onClick={async () => {
                      setOpenActionId(null);
                      try {
                        await submitQuotationForApproval(latestMain.id);
                        toast('Quotation submitted for approval!', 'success');
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

                {canApprove && latestMain?.status === 'Pending Approval' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setOpenActionId(null);
                      try {
                        await approveQuotation(latestMain.id, user?.name || 'Manager');
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

                {canApprove && latestMain?.status === 'Pending Approval' && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionId(null);
                      setRejectionTarget(latestMain);
                      setRejectionReason('');
                      setRejectionModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left"
                  >
                    <XCircle size={14} className="shrink-0 text-rose-600" />
                    <span>Reject Quotation</span>
                  </button>
                )}
              </>
            )}

            {/* Delete Section */}
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
            <button
              type="button"
              onClick={async () => {
                setOpenActionId(null);
                setActionCoords(null);
                if (await showConfirm(`Delete entire quotation group ${group.quoNo}?`, 'Delete Quotation Group', { confirmLabel: 'Delete' })) {
                  for (const q of [...group.main, ...group.job, ...group.customer]) {
                    await deleteQuotation(q.id);
                  }
                  toast(`Quotation group ${group.quoNo} deleted successfully`, 'success');
                  refetch();
                }
              }}
              className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
            >
              <Trash2 size={14} className="shrink-0 text-rose-500" />
              <span>Delete Quotation Group</span>
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  };

  const handleRestoreQuotation = async (quoteId: string, quoteNo: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${quoteId}/restore`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to restore quotation');
      toast(`Quotation ${quoteNo} successfully restored from Trash!`, 'success');
      refetch();
    } catch (err: any) {
      toast(err.message || 'Error restoring quotation', 'error');
    }
  };

  const handlePermanentDelete = async (quoteId: string, quoteNo: string) => {
    if (await showConfirm(`Permanently delete quotation ${quoteNo}? This cannot be undone.`, 'Permanent Deletion', { confirmLabel: 'Delete Forever' })) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/quotations/${quoteId}/permanent`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to permanently delete');
        toast(`Quotation ${quoteNo} permanently deleted`, 'success');
        refetch();
      } catch (err: any) {
        toast(err.message || 'Error deleting quotation', 'error');
      }
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-primary">Custom Engineering Quotations</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 uppercase tracking-wider font-mono">
              BOM & Costing Engine
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
            {filtered.length} {filtered.length === 1 ? 'quotation' : 'quotations'}
            {(search || statusFilter !== 'all' || customerFilter !== 'all' || startDate || endDate) && ' (filtered)'} &middot; Total Quoted Value:{' '}
            <span className="font-mono font-bold text-primary">{formatCurrency(totalQuotedValue)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="crm-quotations" />
          {selectedQuotes.length > 1 && (
            <Button
              variant="primary"
              size="sm"
              icon={FileText}
              onClick={() => {
                const selectedGroups = groupedQuotations.filter(g => selectedQuotes.includes(g.quoNo));
                const leadIds = new Set(selectedGroups.map(g => g.leadId));
                if (leadIds.size > 1) {
                  toast('You can only combine quotations for the SAME customer/lead.', 'error');
                  return;
                }
                const leadId = selectedGroups[0].leadId;
                const query = selectedGroups.map(g => `combine=${encodeURIComponent(g.quoNo)}`).join('&');
                navigate(`/crm/quotations/new/${leadId}?${query}`);
              }}
              className="bg-purple-600 hover:bg-purple-500 border-none text-white shadow-xs rounded-none text-xs h-8"
            >
              Make Final Quote ({selectedQuotes.length})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={Bookmark}
            onClick={() => setShowTemplatesModal(true)}
            className="border border-theme-subtle rounded-none hover:bg-surface2 text-xs h-8"
          >
            Templates
          </Button>
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
            onClick={() => navigate('/crm/quotations/new')}
            className="rounded-none text-xs h-8 font-bold shadow-xs"
          >
            New Quote
          </Button>
        </div>
      </div>

      {/* ── WORKFLOW PIPELINE BANNER ────────────────────────────────────────── */}
      <WorkflowPipelineBanner activeStage={1} />

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-surface border border-theme-subtle rounded-none flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Quoted Value</span>
            <span className="text-base lg:text-lg font-bold font-mono text-primary mt-0.5 block">{formatCurrency(kpiStats.totalQuoted)}</span>
            <span className="text-[11px] text-muted font-mono">{groupedQuotations.length} total quotes</span>
          </div>
          <div className="w-9 h-9 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 flex items-center justify-center border border-rex-500/20">
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
            {/* Category Filter Toggle */}
            <div className="flex items-center gap-1 pr-2 border-r border-theme-subtle shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('custom')}
                className={`px-2 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                Custom
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('product')}
                className={`px-2 py-1 text-[11px] font-bold rounded-none transition-all uppercase tracking-wider ${
                  categoryFilter === 'product'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface border border-theme-subtle text-muted hover:text-primary'
                }`}
              >
                Products
              </button>
            </div>

            {[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'draft', label: 'Draft', count: statusCounts.draft },
              { id: 'pending approval', label: 'Pending Approval', count: statusCounts['pending approval'] },
              { id: 'po received', label: 'PO Received', count: statusCounts['po received'] },
              { id: 'approved', label: 'Approved', count: statusCounts.approved },
              { id: 'sent', label: 'Sent', count: statusCounts.sent },
              { id: 'in production', label: 'In Production', count: statusCounts['in production'] },
              { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
              { id: 'trash', label: '🗑️ Trash', count: statusCounts.trash, isTrash: true },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  statusFilter.toLowerCase() === tab.id
                    ? (tab.isTrash ? 'bg-rose-600 text-white font-bold shadow-xs' : 'bg-rex-600 text-white font-bold shadow-xs')
                    : (tab.isTrash ? 'bg-surface border border-rose-500/30 text-rose-500/80 hover:text-rose-600 hover:border-rose-500' : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme')
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded-none ${
                  statusFilter.toLowerCase() === tab.id ? 'bg-black/20 text-white' : (tab.isTrash ? 'bg-rose-500/10 text-rose-500' : 'bg-surface2 text-muted')
                }`}>
                  {tab.count || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <SearchBar
              placeholder="Search by quote no, customer, company..."
              value={search}
              onChange={setSearch}
              className="w-full sm:w-80 shrink-0"
            />
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
              className="bg-surface border border-theme-subtle rounded-none px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
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

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-muted border border-theme-subtle bg-surface">
          <FileText size={32} className="mx-auto mb-2 opacity-30 text-secondary" />
          <p className="text-sm font-medium">
            {statusFilter === 'draft'
              ? 'No quotation drafts found.'
              : 'No quotations match your search or filter criteria.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-theme-subtle bg-surface shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[380px] pb-28 custom-scrollbar">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-surface2/60 border-b border-theme-subtle text-xs font-semibold text-muted uppercase tracking-wider">
                <tr>
                  <th className="w-9 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 cursor-pointer accent-rex-500 rounded-none shrink-0"
                      checked={filtered.length > 0 && selectedQuotes.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedQuotes(filtered.map(g => g.quoNo));
                        else setSelectedQuotes([]);
                      }}
                      title="Select all"
                    />
                  </th>
                  <th className="px-3.5 py-3">Quote # & Ver</th>
                  <th className="px-3.5 py-3">Customer / Company</th>
                  <th className="px-3.5 py-3">Scope & Items</th>
                  <th className="px-3.5 py-3">Date</th>
                  <th className="px-3.5 py-3 text-right">Quoted Value</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Traceability</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/30 text-xs">
                {filtered.map((group, idx) => {
                  const latestMain = group.main[0];
                  const latestJob = group.job[0];
                  const latestCust = group.customer[0];
                  const displayQ = latestMain || latestCust || latestJob || (group.main && group.main[0]);
                  if (!displayQ) return null;

                  let parsed: any = {};
                  try {
                    parsed = typeof displayQ?.data === 'string' ? JSON.parse(displayQ.data || '{}') : (displayQ?.data || {});
                  } catch (e) {}

                  const status = displayQ?.status || latestMain?.status || 'Draft';
                  const existingWO = getExistingWO(group, displayQ);
                  const quoteReceipts = getQuoteReceipts(group, displayQ);
                  const totalAdv = quoteReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
                  const latestRec = quoteReceipts.length > 0 ? quoteReceipts[quoteReceipts.length - 1] : null;
                  const sampleGrns = quoteGrns[displayQ?.id] || quoteGrns[latestMain?.id] || [];
                  const itemsCount = parsed.custItems?.length || parsed.items?.length || parsed.boms?.length || 1;
                  const isRevisionsExpanded = !!expandedRevisions[group.quoNo];
                  const editUrl = group.isProduct
                    ? `/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${displayQ.id}`
                    : `/crm/quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${displayQ.id}`;

                  const cust = customers.find((c: any) =>
                    (group.leadId && c.leadId && String(c.leadId) === String(group.leadId)) ||
                    (group.leadCompany && c.company && c.company.toLowerCase() === group.leadCompany.toLowerCase()) ||
                    (group.leadName && c.name && c.name.toLowerCase() === group.leadName.toLowerCase())
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
                        {/* Checkbox */}
                        <td className="w-9 px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 cursor-pointer accent-rex-500 rounded-none shrink-0"
                            checked={selectedQuotes.includes(group.quoNo)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuotes(p => [...p, group.quoNo]);
                              else setSelectedQuotes(p => p.filter(x => x !== group.quoNo));
                            }}
                            title="Select for final quote"
                          />
                        </td>

                        {/* Quote # & Version */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate(editUrl)}
                              className="font-mono font-bold text-xs text-rex-600 dark:text-rex-400 hover:underline hover:text-amber-500 cursor-pointer text-left transition-colors whitespace-nowrap"
                              title="Click to open quotation in builder"
                            >
                              {group.quoNo}
                            </button>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-surface2 text-muted border border-theme-subtle shrink-0">
                              v{latestMain?.version || displayQ?.version || 1}
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
                              className={`quotation-info-trigger-btn p-1 rounded-none border transition-colors shrink-0 ${
                                isInfoOpen
                                  ? 'bg-rex-500/20 text-rex-600 dark:text-rex-400 border-rex-500/40'
                                  : 'bg-surface2 hover:bg-surface3 text-muted hover:text-primary border-theme-subtle'
                              }`}
                              title="View Quote Info & Tags"
                            >
                              <Info size={11} className="shrink-0" />
                            </button>
                            {group.main.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setExpandedRevisions(p => ({ ...p, [group.quoNo]: !p[group.quoNo] }))}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle transition-colors flex items-center gap-0.5 shrink-0"
                                title="Toggle version revisions"
                              >
                                {group.main.length} revs
                                <ChevronDown size={9} className={`transition-transform duration-150 ${isRevisionsExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {/* Info Dropdown Portal */}
                          {isInfoOpen && infoCoords && typeof document !== 'undefined' && createPortal(
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={infoMenuStyle}
                              className="quotation-info-menu-dropdown bg-surface dark:bg-zinc-900 border border-theme-subtle shadow-2xl p-3 text-left rounded-none overflow-y-auto custom-scrollbar"
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-theme-subtle">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs text-primary">{group.quoNo}</span>
                                  <span className="text-[10px] font-mono px-1 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                                    v{latestMain?.version || displayQ?.version || 1}
                                  </span>
                                </div>
                                {group.isProduct ? (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                                    Product Quote
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-semibold">
                                    Custom Fabrication
                                  </span>
                                )}
                              </div>

                              {/* Metadata list */}
                              <div className="space-y-2.5 text-xs">
                                {/* Customer PO */}
                                <div className="p-2 bg-surface2/60 border border-theme-subtle">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Customer PO</span>
                                    {(latestMain?.customerPoNo || parsed.customerPoNo) ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 size={9} /> Recorded
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInfoId(null);
                                          setRecordPoModalData({ group, quotation: latestMain, type: 'custom' });
                                        }}
                                        className="text-[10px] font-semibold text-rex-600 dark:text-rex-400 hover:underline cursor-pointer"
                                      >
                                        + Record PO
                                      </button>
                                    )}
                                  </div>
                                  {(latestMain?.customerPoNo || parsed.customerPoNo) ? (
                                    <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                      <FileCheck size={12} className="shrink-0" />
                                      PO: #{latestMain?.customerPoNo || parsed.customerPoNo}
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
                                    {group.leadCompany || group.leadName || 'Direct Customer'}
                                  </div>
                                  {group.leadCompany && group.leadName && (
                                    <div className="text-[11px] text-muted truncate">
                                      Attn: {group.leadName}
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
                                  <span>Revisions: <strong className="text-primary">{group.main.length}</strong></span>
                                  <span>Date: <strong className="text-primary">{formatDate(latestMain?.date || latestMain?.createdAt)}</strong></span>
                                </div>
                              </div>
                            </div>,
                            document.body
                          )}
                        </td>

                        {/* Customer / Company */}
                        <td className="px-3.5 py-2 max-w-[220px]">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-primary truncate" title={group.leadCompany || group.leadName}>
                              {group.leadCompany || group.leadName}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-muted truncate">
                              {group.leadCompany && group.leadName ? (
                                <span>Attn: {group.leadName}</span>
                              ) : null}
                              {(latestMain?.customerPoNo || parsed.customerPoNo) && (
                                <span 
                                  className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-0.5 shrink-0"
                                  title={`Customer PO: ${latestMain?.customerPoNo || parsed.customerPoNo}`}
                                >
                                  <FileCheck size={10} /> PO: {latestMain?.customerPoNo || parsed.customerPoNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Items & Scope */}
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                              <Package size={11} className="text-rex-500 shrink-0" />
                              {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
                            </span>
                            {((parsed.boms && parsed.boms.length > 0) || (parsed.custItems && parsed.custItems.length > 0)) && (
                              <button
                                type="button"
                                onClick={() => openCostingModal(group, parsed)}
                                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 border border-amber-500/30 rounded-none flex items-center gap-1 transition-colors"
                                title="View Costing & Dimensions"
                              >
                                <Briefcase size={10} /> Costing
                              </button>
                            )}
                          </div>
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
                            title={(parsed.custValidity || parsed.validity) ? `Validity: ${parsed.custValidity || parsed.validity}` : undefined}
                          >
                            {formatDate(group.latestDate)}
                          </span>
                        </td>

                        {/* Quoted Total Value */}
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-xs text-primary">
                              {formatCurrency(Number(latestMain?.totalAmount || displayQ?.totalAmount || parsed.total || 0))}
                            </span>
                            {totalAdv > 0 && latestRec && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePrintReceipt({
                                    ...latestRec,
                                    totalQuoted: Number(latestMain?.totalAmount || latestMain?.customAmount || 0)
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
                          {group.isDeleted ? (
                            <div>
                              <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                🗑️ In Trash
                              </span>
                              {group.deletedAt && (
                                <span className="block text-[9px] text-muted font-mono mt-0.5">
                                  {formatDate(group.deletedAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-none border ${getStatusColor(status)}`}>
                                {status}
                              </span>
                              {(latestMain?.materialStatus || existingWO?.materialStatus) && (
                                <div className="mt-1">
                                  <span 
                                    title={latestMain?.materialAlert || existingWO?.materialAlert || 'Material shortage/substitute status'}
                                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 border ${
                                      (latestMain?.materialStatus || existingWO?.materialStatus || '').includes('Shortage') || (latestMain?.materialStatus || existingWO?.materialStatus || '').includes('Pending')
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                        : (latestMain?.materialStatus || existingWO?.materialStatus || '').includes('MR')
                                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    }`}
                                  >
                                    ⚠️ {latestMain?.materialStatus || existingWO?.materialStatus}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Traceability Dropdown with Glowing Light */}
                        <td className="px-3 py-2.5 text-center">
                          <TraceabilityDropdown
                            title={`Quotation #${group.quoNo}`}
                            traces={(() => {
                              const traces: TraceNode[] = [];
                              const linkedOrder = allOrders.find((o: any) => (o.quoteId && String(o.quoteId) === String(latestMain?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                              const linkedInvoice = allInvoices.find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latestMain?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));

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

                              if (sampleGrns.length > 0) {
                                traces.push({
                                  type: 'grn',
                                  title: 'Customer Sample GRN',
                                  reference: sampleGrns[0].grnNo || `GRN (${sampleGrns.length})`,
                                  subtitle: `Received: ${sampleGrns[0].sampleName || 'Sample Material'}`,
                                  statusBadge: { label: 'GRN Received', variant: 'info' },
                                  onClick: () => setPrintGrnData({ grn: sampleGrns[0], group })
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
                                      totalQuoted: Number(latestMain?.totalAmount || latestMain?.customAmount || 0)
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
                          {group.isDeleted ? (
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Eye}
                                onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
                                className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                                title="View Document Preview"
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => handleRestoreQuotation(displayQ.id, group.quoNo)}
                                className="h-7 text-xs px-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-none hover:bg-emerald-500/25 font-bold"
                                title="Restore quotation to active list"
                              >
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                onClick={() => handlePermanentDelete(displayQ.id, group.quoNo)}
                                className="h-7 text-xs px-2 text-rose-500 border border-rose-500/30 rounded-none hover:bg-rose-500/10"
                                title="Delete Permanently"
                              >
                                Delete
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 quotation-action-menu-container">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
                              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                              title="View Document Preview"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={FileEdit}
                              onClick={() => navigate(editUrl)}
                              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2 font-semibold text-primary"
                              title="Edit in Quotation Builder"
                            >
                              Edit
                            </Button>

                            {/* STAGE SNAPSHOT BUTTON */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const linkedOrder = allOrders.find((o: any) => (o.quoteId && String(o.quoteId) === String(latestMain?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                                const linkedInvoice = allInvoices.find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latestMain?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                                setSnapshotModalData({
                                  group,
                                  quotation: latestMain || displayQ,
                                  linkedOrder,
                                  linkedWorkOrder: existingWO,
                                  linkedInvoice,
                                  sampleGrns,
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
                                (latestMain?.materialStatus && (
                                  latestMain.materialStatus.toLowerCase().includes('substitut') ||
                                  latestMain.materialStatus.toLowerCase().includes('change') ||
                                  latestMain.materialStatus.toLowerCase().includes('shortage')
                                )) ||
                                (existingWO?.materialStatus && (
                                  existingWO.materialStatus.toLowerCase().includes('substitut') ||
                                  existingWO.materialStatus.toLowerCase().includes('change') ||
                                  existingWO.materialStatus.toLowerCase().includes('shortage')
                                )) ||
                                latestMain?.materialAlert ||
                                existingWO?.materialAlert
                              ) && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-1 ring-surface"></span>
                                </span>
                              )}
                            </Button>

                            {renderActionsDropdown(group, latestMain, displayQ, parsed, existingWO, sampleGrns, idx)}
                          </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Revisions Row in Table */}
                      {isRevisionsExpanded && group.main.length > 1 && (
                        <tr className="bg-surface2/25">
                          <td colSpan={9} className="px-6 py-3 border-b border-theme-subtle">
                            <div className="space-y-1.5 animate-fade-in">
                              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <History size={11} className="text-rex-500" />
                                Quotation Versions ({group.main.length})
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {group.main.map((v: any) => {
                                  const isLatest = v.id === latestMain?.id;
                                  return (
                                    <div
                                      key={v.id}
                                      className={`flex items-center justify-between px-2.5 py-1.5 border text-xs rounded-none transition-colors ${
                                        isLatest
                                          ? 'bg-rex-500/10 border-rex-500/30 text-primary'
                                          : 'bg-surface border-theme-subtle text-secondary'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-bold font-mono text-primary shrink-0">v{v.version}</span>
                                        {isLatest && (
                                          <span className="text-[10px] font-semibold bg-green-500/20 text-green-600 dark:text-green-400 px-1 py-0.2 rounded-none uppercase">
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
                                          onClick={() => setPreviewData({ quotation: v, type: 'main', lead: { name: group.leadName, company: group.leadCompany, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
                                          className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-none transition-colors"
                                          title={`Preview Version v${v.version}`}
                                        >
                                          <Eye size={12} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const vUrl = group.isProduct
                                              ? `/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${v.id}`
                                              : `/crm/quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${v.id}`;
                                            navigate(vUrl);
                                          }}
                                          className="p-1 text-primary hover:bg-surface2 rounded-none transition-colors"
                                          title={`Edit Version v${v.version}`}
                                        >
                                          <FileEdit size={12} />
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
          {filtered.map((group, idx) => {
            const latestMain = group.main[0];
            const latestJob = group.job[0];
            const latestCust = group.customer[0];
            const displayQ = latestMain || latestCust || latestJob || (group.main && group.main[0]);
            if (!displayQ) return null;

            let parsed: any = {};
            try {
              parsed = typeof displayQ?.data === 'string' ? JSON.parse(displayQ.data || '{}') : (displayQ?.data || {});
            } catch (e) {}

            const status = displayQ?.status || latestMain?.status || 'Draft';
            const existingWO = getExistingWO(group, displayQ);
            const quoteReceipts = getQuoteReceipts(group, displayQ);
            const totalAdv = quoteReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
            const latestRec = quoteReceipts.length > 0 ? quoteReceipts[quoteReceipts.length - 1] : null;
            const sampleGrns = quoteGrns[displayQ?.id] || quoteGrns[latestMain?.id] || [];
            const itemsCount = parsed.custItems?.length || parsed.items?.length || parsed.boms?.length || 1;
            const isRevisionsExpanded = !!expandedRevisions[group.quoNo];
            const editUrl = group.isProduct
              ? `/crm/product-quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${displayQ.id}`
              : `/crm/quotations/new/${group.leadId || 'WALK-IN'}?quoteId=${displayQ.id}`;

            return (
              <GlassCard
                key={group.quoNo}
                className={`p-3.5 hover:border-rex-500/40 transition-all duration-200 border-theme-subtle rounded-none flex flex-col justify-between ${
                  openActionId === group.quoNo ? 'relative z-50 shadow-2xl' : 'relative z-0'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-theme-subtle/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 cursor-pointer accent-rex-500 rounded-none shrink-0"
                        checked={selectedQuotes.includes(group.quoNo)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedQuotes(p => [...p, group.quoNo]);
                          else setSelectedQuotes(p => p.filter(x => x !== group.quoNo));
                        }}
                        title="Select for final quote"
                      />
                      <button
                        type="button"
                        onClick={() => navigate(editUrl)}
                        className="font-mono font-bold text-sm text-rex-600 dark:text-rex-400 hover:underline hover:text-amber-500 transition-colors cursor-pointer text-left"
                        title="Click to open quotation in builder"
                      >
                        {group.quoNo}
                      </button>
                      {group.isProduct ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                          Product
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-semibold">
                          Custom
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface2 text-muted border border-theme-subtle">
                        v{latestMain?.version || displayQ?.version || 1}
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
                    <h4 className="font-bold text-sm text-primary truncate" title={group.leadCompany || group.leadName}>
                      {group.leadCompany || group.leadName}
                    </h4>
                    {group.leadCompany && group.leadName && (
                      <p className="text-xs text-muted truncate">Attn: {group.leadName}</p>
                    )}
                    {parsed.subject && (
                      <p className="text-xs text-secondary truncate mt-1">{parsed.subject}</p>
                    )}
                  </div>

                  {/* Tags & Badges */}
                  <div className="flex items-center gap-2 flex-wrap mt-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary bg-surface2 px-2 py-0.5 border border-theme-subtle">
                      <Package size={11} className="text-rex-500" />
                      {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
                    </span>

                    {((parsed.boms && parsed.boms.length > 0) || (parsed.custItems && parsed.custItems.length > 0)) && (
                      <button
                        type="button"
                        onClick={() => openCostingModal(group, parsed)}
                        className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 border border-amber-500/30 flex items-center gap-1 transition-colors"
                      >
                        <Briefcase size={10} /> Costing
                      </button>
                    )}

                    {existingWO && (
                      <button
                        type="button"
                        onClick={() => navigate(`/production/work-orders/${existingWO.id}`)}
                        className="text-[10px] font-mono font-medium px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1"
                      >
                        <Factory size={10} /> WO: {existingWO.orderNo || existingWO.id}
                      </button>
                    )}

                    {totalAdv > 0 && latestRec && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePrintReceipt({
                            ...latestRec,
                            totalQuoted: Number(latestMain?.totalAmount || latestMain?.customAmount || 0)
                          });
                          setPrintReceiptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                      >
                        <Receipt size={10} /> Adv: {formatCurrency(totalAdv)}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-theme-subtle flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">Total Amount</span>
                    <span className="text-sm font-bold font-mono text-primary block">
                      {formatCurrency(Number(latestMain?.totalAmount || displayQ?.totalAmount || parsed.total || 0))}
                    </span>
                  </div>

                  {group.isDeleted ? (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
                        className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                        title="View Document Preview"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => handleRestoreQuotation(displayQ.id, group.quoNo)}
                        className="h-7 text-xs px-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-none hover:bg-emerald-500/25 font-bold"
                        title="Restore quotation to active list"
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handlePermanentDelete(displayQ.id, group.quoNo)}
                        className="h-7 text-xs px-2 text-rose-500 border border-rose-500/30 rounded-none hover:bg-rose-500/10"
                        title="Delete Permanently"
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 quotation-action-menu-container">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
                      className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2"
                      title="View Document Preview"
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={FileEdit}
                      onClick={() => navigate(editUrl)}
                      className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2 font-semibold text-primary"
                      title="Edit in Builder"
                    >
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const linkedOrder = allOrders.find((o: any) => (o.quoteId && String(o.quoteId) === String(latestMain?.id)) || (o.quotationNo && o.quotationNo === group.quoNo));
                        const linkedInvoice = allInvoices.find((inv: any) => (inv.quotationId && String(inv.quotationId) === String(latestMain?.id)) || (inv.quotationNo && inv.quotationNo === group.quoNo));
                        setSnapshotModalData({
                          group,
                          quotation: latestMain || displayQ,
                          linkedOrder,
                          linkedWorkOrder: existingWO,
                          linkedInvoice,
                          sampleGrns,
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
                        (latestMain?.materialStatus && (
                          latestMain.materialStatus.toLowerCase().includes('substitut') ||
                          latestMain.materialStatus.toLowerCase().includes('change') ||
                          latestMain.materialStatus.toLowerCase().includes('shortage')
                        )) ||
                        (existingWO?.materialStatus && (
                          existingWO.materialStatus.toLowerCase().includes('substitut') ||
                          existingWO.materialStatus.toLowerCase().includes('change') ||
                          existingWO.materialStatus.toLowerCase().includes('shortage')
                        )) ||
                        latestMain?.materialAlert ||
                        existingWO?.materialAlert
                      ) && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 ring-1 ring-surface"></span>
                        </span>
                      )}
                    </Button>

                    {renderActionsDropdown(group, latestMain, displayQ, parsed, existingWO, sampleGrns, idx)}
                  </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!previewData} onClose={() => setPreviewData(null)} title={'Preview - ' + (previewData ? previewData.type.toUpperCase() : '') + ' Quotation'} size="xl">
        {previewData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <QuotationPrintView 
               data={((): any => {
                  const parsed = typeof previewData.quotation.data === 'string' ? JSON.parse(previewData.quotation.data) : previewData.quotation.data;
                  if (parsed.taxEnabled && parsed.selectedProfileId && !parsed.selectedProfile && taxProfiles) {
                      parsed.selectedProfile = taxProfiles.find((p: any) => p.id === parsed.selectedProfileId);
                      if (parsed.selectedProfile) {
                          const t1 = Number(parsed.selectedProfile.tax1_rate) / 100;
                          const t2 = Number(parsed.selectedProfile.tax2_rate) / 100;
                          const cTotal = parsed.custTotals?.total || 0;
                          parsed.custSscl = cTotal * t1;
                          parsed.custVat = parsed.selectedProfile.tax2_compound ? (cTotal + parsed.custSscl) * t2 : cTotal * t2;
                      }
                  }
                  if (!parsed.vatNo && previewData.lead?.vat) parsed.vatNo = previewData.lead.vat;
                  if (!parsed.tinNo && previewData.lead?.svat) parsed.tinNo = previewData.lead.svat;
                  if (!parsed.customerAddress && previewData.lead?.address) parsed.customerAddress = previewData.lead.address;
                  if (!parsed.customerName && (previewData.lead?.company || previewData.lead?.name)) {
                    parsed.customerName = previewData.lead.company || previewData.lead.name;
                  }
                  return parsed;
               })()} 
               type={previewData.type}
               lead={previewData.lead}
               settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
              {(() => {
                const isQuoteApproved = ['Approved', 'Sent', 'Accepted', 'In Production', 'PO Received', 'Without PO'].includes(previewData?.quotation?.status);
                return (
                  <>
                    <Button 
                      variant="primary" 
                      icon={Mail} 
                      disabled={!isQuoteApproved}
                      onClick={() => {
                        if (!isQuoteApproved) {
                          toast(`Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved before emailing.`, 'error');
                          return;
                        }
                        let parsed: any = {};
                        try { parsed = JSON.parse(previewData.quotation?.data || '{}'); } catch(e){}
                        setEmailModalData({
                          documentNumber: parsed.quotationNo || previewData.quotation.id,
                          customerName: previewData.lead?.company || previewData.lead?.name || parsed.customerName || 'Customer',
                          customerEmail: previewData.lead?.email || parsed.customerEmail || '',
                          totalAmount: previewData.quotation.totalAmount || parsed.total || 0,
                          validityDays: parsed.validity || '30',
                          elementIdToPdf: 'print-section'
                        });
                      }} 
                      className={`text-white font-bold text-xs ${!isQuoteApproved ? 'opacity-40 cursor-not-allowed bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-700'}`}
                      title={!isQuoteApproved ? `Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved to email.` : 'Email Quotation'}
                    >
                      Email Quotation
                    </Button>
                    <Button 
                      variant="ghost" 
                      disabled={!isQuoteApproved}
                      onClick={async () => {
                        if (!isQuoteApproved) {
                          toast(`Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved before exporting.`, 'error');
                          return;
                        }
                        const quoteNo = previewData?.quotation?.quotationNo || previewData?.quotation?.id || 'Quote';
                        await exportPdf('print-section', `Quotation_${quoteNo}.pdf`);
                      }} 
                      className={`bg-surface border border-theme-subtle font-semibold ${!isQuoteApproved ? 'opacity-40 cursor-not-allowed text-muted' : 'hover:bg-surface2'}`}
                      title={!isQuoteApproved ? `Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved to export.` : 'Export PDF'}
                    >
                      Export PDF
                    </Button>
                    <Button 
                      variant="primary" 
                      disabled={!isQuoteApproved}
                      onClick={() => {
                        if (!isQuoteApproved) {
                          toast(`Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved before printing.`, 'error');
                          return;
                        }
                        printElement('print-section', previewData?.quotation?.quotationNo || 'Quotation');
                      }}
                      className={!isQuoteApproved ? 'opacity-40 cursor-not-allowed' : ''}
                      title={!isQuoteApproved ? `Quotation status is "${previewData?.quotation?.status || 'Draft'}". Must be Approved to print.` : 'Print Quotation'}
                    >
                      Print Quotation
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {emailModalData && (
        <SendDocumentEmailModal
          isOpen={!!emailModalData}
          onClose={() => setEmailModalData(null)}
          documentType="quotation"
          documentNumber={emailModalData.documentNumber}
          customerName={emailModalData.customerName}
          customerEmail={emailModalData.customerEmail}
          totalAmount={emailModalData.totalAmount}
          validityDays={emailModalData.validityDays}
          elementIdToPdf={emailModalData.elementIdToPdf}
        />
      )}
    
      <Modal isOpen={!!woDialog} onClose={() => setWoDialog(null)} title={woDialog?.type === 'confirm' ? 'Confirm Action' : woDialog?.type === 'success' ? 'Success' : 'Error'} size="md">
        <div className="p-6">
          {woDialog?.type === 'confirm' && (
            <>
              <p className="text-sm text-secondary mb-6">Are you sure you want to create a Work Order from this approved quotation?</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setWoDialog(null)}>Cancel</Button>
                <Button variant="primary" onClick={executeCreateWO}>Create Work Order</Button>
              </div>
            </>
          )}
          {woDialog?.type === 'success' && (
            <>
              <p className="text-sm text-emerald-500 font-medium mb-6">{woDialog.msg}</p>
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setWoDialog(null)}>Close</Button>
              </div>
            </>
          )}
          {woDialog?.type === 'error' && (
            <>
              <p className="text-sm text-red-500 font-medium mb-6">{woDialog.msg}</p>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setWoDialog(null)}>Close</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <Modal 
        isOpen={!!viewBomDialog} 
        onClose={() => setViewBomDialog(null)} 
        title={viewBomDialog?.quotationNo ? `Costing & Dimensions: ${viewBomDialog.quotationNo}` : (viewBomDialog?.title ? `Costing Details: ${viewBomDialog.title}` : "View Costing Details")} 
        size="xl"
      >
        {viewBomDialog && (() => {
          const bomsList: any[] = viewBomDialog.boms && viewBomDialog.boms.length > 0
            ? viewBomDialog.boms
            : (viewBomDialog.autoMats || viewBomDialog.manualMats || viewBomDialog.procState ? [viewBomDialog] : []);
          
          const custItemsList: any[] = viewBomDialog.custItems || [];
          
          // Calculate overall totals
          const totalBomCost = bomsList.reduce((sum: number, b: any) => {
            const autoMatTotal = (b.autoMats || []).reduce((s: number, m: any) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0);
            const manualMatTotal = (b.manualMats || []).reduce((s: number, m: any) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0);
            const machCost = Object.values(b.procState || {}).reduce((s: number, st: any) => {
              const quoHrCost = Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0);
              const setCost = Number(st.setTime || 0) * Number(st.setTimeRate || 0);
              return s + quoHrCost + setCost;
            }, 0);
            return sum + (b.bomTotal ? Number(b.bomTotal) : (autoMatTotal + manualMatTotal + machCost));
          }, 0);

          const totalQuoted = Number(viewBomDialog.totalQuoted || custItemsList.reduce((s: number, i: any) => s + Number(i.qty || 1) * Number(i.unitPrice || 0), 0) || 0);
          const grossProfit = totalQuoted > 0 ? (totalQuoted - totalBomCost) : 0;
          const marginPct = totalQuoted > 0 ? ((grossProfit / totalQuoted) * 100).toFixed(1) : '0';

          const activeBom = selectedBomTab === 'overview' 
            ? null 
            : (bomsList[Number(selectedBomTab)] || bomsList[0]);

          return (
            <div className="bg-surface text-primary p-0 flex flex-col h-full rounded-b-none overflow-hidden max-h-[85vh]">
              {/* Header Summary Bar */}
              <div className="px-6 py-4 bg-surface2/60 border-b border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary font-mono">{viewBomDialog.quotationNo || viewBomDialog.title || 'Quotation Costing'}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono">
                        {bomsList.length} BOM {bomsList.length === 1 ? 'Part' : 'Parts'}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Customer: <span className="font-semibold text-secondary">{viewBomDialog.customerName || 'Standard Client'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="border-r border-theme-subtle pr-4 hidden sm:block">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Est. Production Cost</p>
                    <p className="font-mono font-bold text-primary text-base leading-tight mt-0.5">{formatCurrency(totalBomCost)}</p>
                  </div>
                  {totalQuoted > 0 && (
                    <div className="border-r border-theme-subtle pr-4 hidden sm:block">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Total Quoted Value</p>
                      <p className="font-mono font-bold text-rex-600 dark:text-rex-400 text-base leading-tight mt-0.5">{formatCurrency(totalQuoted)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Estimated Margin</p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <span className={`text-base font-bold font-mono ${Number(marginPct) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {marginPct}%
                      </span>
                      {totalQuoted > 0 && (
                        <span className="text-xs text-muted font-mono">({formatCurrency(grossProfit)})</span>
                      )}
                    </div>
                  </div>
                </div>
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
                    const hasDims = (bom.autoMats || []).some((m: any) => formatAutoMatDimensions(m) !== '-');
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
                          <span className={`text-[10px] font-mono px-1 py-0.2 rounded-none ${selectedBomTab === bIdx ? 'bg-black/20 text-white' : 'bg-surface text-amber-600 dark:text-amber-400 border border-theme-subtle'}`}>
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
                {/* 1. All Parts Overview Tab */}
                {selectedBomTab === 'overview' && bomsList.length > 1 && (
                  <div className="space-y-4">
                    <div className="border border-theme-subtle rounded-none overflow-hidden bg-surface">
                      <div className="px-4 py-3 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-amber-600 dark:text-amber-400" />
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">All Quoted Parts & Dimensions Summary</h4>
                        </div>
                        <span className="text-xs text-muted font-mono">{bomsList.length} Line Items</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Part / Item</th>
                              <th className="px-4 py-2.5">Stock Dimensions</th>
                              <th className="px-4 py-2.5 text-right">Materials Cost</th>
                              <th className="px-4 py-2.5 text-right">Machining Cost</th>
                              <th className="px-4 py-2.5 text-right">Part Total</th>
                              <th className="px-4 py-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/30 text-xs">
                            {bomsList.map((bom: any, bIdx: number) => {
                              const autoMatTotal = (bom.autoMats || []).reduce((s: number, m: any) => s + Number(m.platePrice || 0) + Number(m.shaftPrice || 0), 0);
                              const manualMatTotal = (bom.manualMats || []).reduce((s: number, m: any) => s + Number(m.qty || 0) * Number(m.unitPrice || 0), 0);
                              const machCost = Object.values(bom.procState || {}).reduce((s: number, st: any) => {
                                const quoHrCost = Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0);
                                const setCost = Number(st.setTime || 0) * Number(st.setTimeRate || 0);
                                return s + quoHrCost + setCost;
                              }, 0);
                              const bTotal = bom.bomTotal ? Number(bom.bomTotal) : (autoMatTotal + manualMatTotal + machCost);

                              const dimStrs = (bom.autoMats || []).map((m: any) => formatAutoMatDimensions(m)).filter((d: string) => d !== '-');

                              return (
                                <tr key={bom.id || bIdx} className="hover:bg-surface2/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-primary">{bom.title || `Part #${bIdx + 1}`}</div>
                                    {bom.description && <div className="text-[11px] text-muted truncate max-w-xs">{bom.description}</div>}
                                  </td>
                                  <td className="px-4 py-3">
                                    {dimStrs.length > 0 ? (
                                      <div className="space-y-1">
                                        {dimStrs.map((d: string, di: number) => (
                                          <span key={di} className="inline-block text-[11px] font-mono font-medium px-2 py-0.5 bg-surface2 text-primary border border-theme-subtle mr-1.5">
                                            {d}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-muted text-[11px] italic">No dimension specified</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-medium text-secondary">
                                    {formatCurrency(autoMatTotal + manualMatTotal)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-medium text-secondary">
                                    {formatCurrency(machCost)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                                    {formatCurrency(bTotal)}
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
                  </div>
                )}

                {/* 2. Specific BOM Tab (or Single BOM View) */}
                {activeBom && (
                  <div className="space-y-6">
                    {/* Part Banner with Dimensions Showcase */}
                    <div className="p-4 bg-gradient-to-r from-surface2/60 via-surface2/30 to-transparent border border-theme-subtle rounded-none flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-primary">{activeBom.title || 'Internal BOM Costing'}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold uppercase">
                            Part Detail
                          </span>
                        </div>
                        {activeBom.description && (
                          <p className="text-xs text-muted mt-1 max-w-2xl">{activeBom.description}</p>
                        )}
                      </div>

                      {/* Stock Dimensions Pill */}
                      {(() => {
                        const dimStrs = (activeBom.autoMats || []).map((m: any) => formatAutoMatDimensions(m)).filter((d: string) => d !== '-');
                        if (dimStrs.length === 0) return null;
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
                              <Ruler size={11} className="text-amber-600" /> Stock Dims:
                            </span>
                            {dimStrs.map((d: string, di: number) => (
                              <span key={di} className="text-xs font-mono font-bold px-2.5 py-1 bg-surface text-primary border border-amber-500/40 shadow-xs">
                                {d}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Auto Materials Table (Plates & Round Rods with COMPLETE dimensions) */}
                    <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                      <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-blue-500" />
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                            Plate & Round Shaft Raw Materials
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
                              <th className="px-4 py-2.5">Material</th>
                              <th className="px-4 py-2.5">Type</th>
                              <th className="px-4 py-2.5">Dimensions (T × W × L / Ø × L)</th>
                              <th className="px-4 py-2.5">Supplier</th>
                              <th className="px-4 py-2.5 text-right w-20">Qty</th>
                              <th className="px-4 py-2.5 text-right w-28">Unit Rate</th>
                              <th className="px-4 py-2.5 text-right w-32">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/20 text-xs">
                            {(activeBom.autoMats || []).map((m: any, i: number) => {
                              const isShaft = Boolean((m.dia && Number(m.dia) > 0) || (m.shaftDia && Number(m.shaftDia) > 0));
                              const formattedDim = formatAutoMatDimensions(m);
                              const lineCost = Number(m.platePrice || 0) + Number(m.shaftPrice || 0);

                              return (
                                <tr key={i} className="hover:bg-surface2/30 transition-colors">
                                  <td className="px-4 py-2.5 font-bold text-primary">
                                    {m.material || 'Raw Material'}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-none uppercase ${
                                      isShaft ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    }`}>
                                      {isShaft ? 'Round Shaft' : 'Plate / Sheet'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono font-bold text-primary">
                                    {formattedDim !== '-' ? formattedDim : (
                                      <span className="text-muted font-normal italic">None</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-secondary text-[11px]">
                                    {m.supplier || '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                                    {m.qty || 1}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                                    {m.unitPrice ? formatCurrency(m.unitPrice) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                                    {formatCurrency(lineCost)}
                                  </td>
                                </tr>
                              );
                            })}
                            {(!activeBom.autoMats || activeBom.autoMats.length === 0) && (
                              <tr>
                                <td colSpan={7} className="px-4 py-4 text-center text-muted italic text-xs">
                                  No plate or shaft materials entered for this part.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Manual Materials Table */}
                    <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                      <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-amber-500" />
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                            Manual / Bought-Out Materials & Hardware
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
                              <th className="px-4 py-2.5">Dimensions & Spec</th>
                              <th className="px-4 py-2.5">Supplier</th>
                              <th className="px-4 py-2.5">Price Mode</th>
                              <th className="px-4 py-2.5 text-right w-24">Unit Price</th>
                              <th className="px-4 py-2.5 text-right w-20">Qty</th>
                              <th className="px-4 py-2.5 text-right w-32">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-theme-subtle/20 text-xs">
                            {(activeBom.manualMats || []).map((m: any, i: number) => (
                              <tr key={i} className="hover:bg-surface2/30 transition-colors">
                                <td className="px-4 py-2.5 font-bold text-primary">{m.material || 'Bought-out Component'}</td>
                                <td className="px-4 py-2.5 font-mono text-secondary">{m.dimensions || m.spec || m.size || '—'}</td>
                                <td className="px-4 py-2.5 text-muted text-[11px]">{m.supplier || '—'}</td>
                                <td className="px-4 py-2.5 text-[11px] text-muted uppercase font-mono">{m.priceMode || 'per unit'}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-muted">{formatCurrency(m.unitPrice || 0)}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold">{m.qty || 1}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">{formatCurrency(Number(m.unitPrice || 0) * Number(m.qty || 0))}</td>
                              </tr>
                            ))}
                            {(!activeBom.manualMats || activeBom.manualMats.length === 0) && (
                              <tr>
                                <td colSpan={7} className="px-4 py-4 text-center text-muted italic text-xs">
                                  No manual or bought-out materials added.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Machining Operations Table */}
                    {activeBom.procState && Object.keys(activeBom.procState).length > 0 && (
                      <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                        <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Factory size={14} className="text-rose-500" />
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                              Machining & Fabrication Operations
                            </h4>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Process / Operation</th>
                                <th className="px-4 py-2.5 text-right w-24">Est. Hrs</th>
                                <th className="px-4 py-2.5 text-right w-24">Set Time</th>
                                <th className="px-4 py-2.5 text-right w-24 text-primary">Quo. Hrs</th>
                                <th className="px-4 py-2.5 text-right w-28">Rate / Hr</th>
                                <th className="px-4 py-2.5 text-right w-32">Sub Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-subtle/20 text-xs">
                              {Object.keys(activeBom.procState).map((k: string) => {
                                const st = activeBom.procState[k];
                                const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0));
                                if (subTotal === 0 && !st.estHr && !st.quoHr && !st.setTime) return null;
                                return (
                                  <tr key={k} className="hover:bg-surface2/30 transition-colors">
                                    <td className="px-4 py-2.5 font-bold text-rose-600 dark:text-rose-400">{k}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-muted">{st.estHr || '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-muted">{st.setTime || '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-primary font-bold">{st.quoHr || '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-muted">{formatCurrency(st.hrRate || st.rate || 0)}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-primary font-bold">{formatCurrency(subTotal)}</td>
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

                {/* 3. Fallback if only Customer Line Items exist without BOM */}
                {bomsList.length === 0 && custItemsList.length > 0 && (
                  <div className="border border-theme-subtle rounded-none bg-surface shadow-xs overflow-hidden">
                    <div className="px-4 py-3 bg-surface2/40 border-b border-theme-subtle">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Quotation Customer Line Items & Dimensions</h4>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-surface2/20 border-b border-theme-subtle text-[11px] uppercase text-muted font-semibold tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Item Description</th>
                          <th className="px-4 py-2.5">Dimensions</th>
                          <th className="px-4 py-2.5 text-right w-24">Qty</th>
                          <th className="px-4 py-2.5 text-right w-32">Unit Price</th>
                          <th className="px-4 py-2.5 text-right w-32">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-subtle/20 text-xs">
                        {custItemsList.map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="hover:bg-surface2/30 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-primary whitespace-pre-line">{item.desc || item.description || `Item #${idx + 1}`}</td>
                            <td className="px-4 py-2.5 font-mono text-secondary font-medium">{item.dimensions || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{item.qty || 1}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.unitPrice || 0)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">{formatCurrency(Number(item.qty || 1) * Number(item.unitPrice || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!grnDialog} onClose={() => setGrnDialog(null)} title="Receive Customer Sample (GRN)" size="md">
        <div className="p-6">
          <div className="space-y-4">
                          <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-xs font-bold text-secondary">Items Received (Details/Qty)</label>
                   <Button variant="ghost" size="sm" onClick={() => setGrnDialog(p => p ? { ...p, items: [...(p.items || []), {description: '', qty: 1}] } : null)} className="h-6 text-[10px]"><Plus size={12} className="mr-1"/> Add Item</Button>
                </div>
                <div className="space-y-2">
                   {(grnDialog?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                         <input className="w-full bg-surface border border-theme-subtle rounded p-1.5 text-xs text-primary" placeholder="Item description" value={item.description} onChange={e => {
                            const newItems = [...(grnDialog?.items || [])];
                            newItems[idx].description = e.target.value;
                            setGrnDialog(p => p ? { ...p, items: newItems } : null);
                         }} />
                         <input type="number" className="w-20 bg-surface border border-theme-subtle rounded p-1.5 text-xs text-primary" placeholder="Qty" value={item.qty} onChange={e => {
                            const newItems = [...(grnDialog?.items || [])];
                            newItems[idx].qty = Number(e.target.value);
                            setGrnDialog(p => p ? { ...p, items: newItems } : null);
                         }} />
                         <button type="button" onClick={() => {
                            const newItems = [...(grnDialog?.items || [])];
                            newItems.splice(idx, 1);
                            setGrnDialog(p => p ? { ...p, items: newItems } : null);
                         }} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                      </div>
                   ))}
                </div>
              </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Received Date</label>
              <input 
                type="date"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.receivedAt || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, receivedAt: e.target.value } : null)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Notes / Condition</label>
              <input 
                type="text"
                className="w-full bg-surface border border-theme-subtle rounded p-2 text-sm text-primary"
                value={grnDialog?.notes || ''}
                onChange={e => setGrnDialog(p => p ? { ...p, notes: e.target.value } : null)}
              />
            </div>
            <div>
              <SamplePhotoUploadSection
                photos={grnDialog?.photos || []}
                onChange={photos => setGrnDialog(p => p ? { ...p, photos } : null)}
                maxPhotos={6}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setGrnDialog(null)}>Cancel</Button>
              <Button variant="primary" onClick={async () => {
                if (grnDialog?.latestMain) {
                   await createCustomerGRN({
                     quoteId: grnDialog.latestMain.id,
                     quoNo: grnDialog.group.quoNo,
                     leadId: grnDialog.group.leadId,
                     items: JSON.stringify(grnDialog.items),
                     photos: JSON.stringify(grnDialog.photos || []),
                     receivedAt: grnDialog.receivedAt,
                     receivedBy: 'System', // from auth
                     notes: grnDialog.notes
                   });
                    window.location.reload();
                    setGrnDialog(null);
                }
              }}>Confirm Receipt</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!printGrnData} onClose={() => setPrintGrnData(null)} title="Print Customer GRN" size="xl">
        {printGrnData && (
          <div className="bg-white text-black p-8 max-h-[80vh] overflow-y-auto w-[900px] max-w-full">
            <CustomerGRNPrintView 
               grn={printGrnData.grn} 
               group={printGrnData.group}
               settings={settings}
            />
            <div className="mt-6 flex justify-end gap-3 pb-6 border-t border-theme-subtle pt-6">
              <Button variant="ghost" onClick={async () => {
                const grnNo = printGrnData?.grn?.id || 'GRN';
                await exportPdf('grn-print-section', `Customer_GRN_${grnNo}.pdf`);
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        )}
      </Modal>

      <QuotationTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectForNewQuote={(tpl) => {
          navigate(`/crm/quotations/new?templateId=${tpl.id}`);
        }}
      />


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

      {/* ── QUOTATION LIFECYCLE STAGE SNAPSHOT MODAL ───────────────────────── */}
      {snapshotModalData && (
        <QuotationStageSnapshotModal
          isOpen={!!snapshotModalData}
          onClose={() => setSnapshotModalData(null)}
          group={snapshotModalData.group}
          quotation={snapshotModalData.quotation}
          linkedOrder={snapshotModalData.linkedOrder}
          linkedWorkOrder={snapshotModalData.linkedWorkOrder}
          linkedInvoice={snapshotModalData.linkedInvoice}
          sampleGrns={snapshotModalData.sampleGrns}
          totalAdvance={snapshotModalData.totalAdvance}
          latestReceipt={snapshotModalData.latestReceipt}
          onCreateSalesOrder={() => handleCreateSalesOrder(snapshotModalData.group, snapshotModalData.quotation)}
          onCreateWorkOrder={() => handleCreateWO(snapshotModalData.group, snapshotModalData.quotation)}
          onCreateInvoice={() => handlePaymentRequest(snapshotModalData.group, snapshotModalData.quotation)}
          onIssueReceipt={() => handleOpenReceiptModal(snapshotModalData.group, snapshotModalData.quotation)}
          onPreviewPdf={() => setPreviewData({
            quotation: snapshotModalData.quotation,
            type: 'main',
            lead: {
              name: snapshotModalData.group.leadName,
              company: snapshotModalData.group.leadCompany,
              email: snapshotModalData.group.leadEmail,
              address: snapshotModalData.group.leadAddress,
              vat: snapshotModalData.group.leadVat,
              svat: snapshotModalData.group.leadSvat
            }
          })}
        />
      )}

      {/* ── SAMPLE PHOTO LIGHTBOX VIEWER ── */}
      <SamplePhotoViewerModal
        isOpen={!!activeViewingPhotos}
        onClose={() => setActiveViewingPhotos(null)}
        photos={activeViewingPhotos?.photos || []}
        title={activeViewingPhotos?.title || 'Sample Photos'}
      />

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
    </div>
  )
}