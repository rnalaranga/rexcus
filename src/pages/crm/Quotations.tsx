import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileEdit, Plus, Download, Filter, Briefcase, User, Search, ArrowRight, Trash2, Factory, Package, Printer, Bookmark, CheckCircle2, XCircle, Clock, Send, History, Eye, ChevronDown, ChevronUp } from 'lucide-react'
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
import { useQuotations, useLeads, useCustomers } from '@/hooks/useData'
import { useTaxProfiles } from '@/hooks/useFinance'
import { formatCurrency, formatDate } from '@/lib/utils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { deleteQuotation, updateQuotationStatus, submitQuotationForApproval, approveQuotation, rejectQuotation, createWorkOrder, createInvoice, fetchCustomerGRNs, createCustomerGRN, fetchWorkOrders, createFinishedGoodsOrder, fetchPaymentReceipts } from '@/lib/api'
import { Banknote, Mail, ShoppingBag, Receipt } from 'lucide-react'
import { SendDocumentEmailModal } from '@/components/SendDocumentEmailModal'
import { CreatePaymentReceiptModal } from '@/components/CreatePaymentReceiptModal'
import { PaymentReceiptPrintModal } from '@/components/PaymentReceiptPrintModal'
import { CustomerAutocomplete } from '@/components/ui/CustomerAutocomplete'


export const Quotations: React.FC = () => {
  const { toast, showConfirm } = useDialog();
  const { user, can } = useAuth();
  const canApprove = can('approvals.quotations');

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

  const handleCreateSalesOrder = async (group: any, latestMain: any) => {
    try {
      const quoteData = typeof latestMain.data === 'string' ? JSON.parse(latestMain.data) : (latestMain.data || {});
      const rawItems = quoteData.custItems || quoteData.items || [];
      const itemsList = rawItems.map((ci: any) => ({
        productId: ci.productId || ci.inventoryId || 'CUSTOM-JOB',
        productName: ci.desc || ci.description || ci.name || 'Quoted Item',
        productSku: ci.sku || '',
        description: ci.desc || ci.description || ci.name || '',
        qty: Number(ci.qty) || 1,
        unitPrice: Number(ci.unitPrice) || 0,
        amount: Number(ci.amount) || ((Number(ci.qty) || 1) * Number(ci.unitPrice || 0)),
        uom: ci.uom || ci.unit || 'Nos'
      }));

      // Fallback if no items extracted
      if (itemsList.length === 0) {
        itemsList.push({
          productId: 'CUSTOM-JOB',
          productName: quoteData.subject || `Quotation ${group.quoNo} Job`,
          description: quoteData.subject || `Quotation ${group.quoNo} Machining / Production`,
          qty: 1,
          unitPrice: Number(latestMain.totalAmount || 0),
          amount: Number(latestMain.totalAmount || 0),
          uom: 'Lot'
        });
      }

      const subtotal = Number(quoteData.custTotals?.subtotal) || itemsList.reduce((acc: number, it: any) => acc + it.amount, 0);
      const total = Number(latestMain.totalAmount) || Number(quoteData.custTotals?.total) || subtotal;
      const taxAmount = total - subtotal > 0 ? (total - subtotal) : 0;

      const cust = customers.find((c: any) => c.id === group.leadId);
      const lead = leads.find((l: any) => l.id === group.leadId);
      const custId = cust?.id || (lead as any)?.customerId || (group.leadId?.startsWith('CUST') ? group.leadId : null);

      const soPayload = {
        orderNo: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        quoteId: latestMain.id,
        quotationNo: group.quoNo,
        customerId: custId,
        customerName: group.leadCompany || group.leadName || 'Customer',
        attention: quoteData.attention || latestMain.attention || group.leadContact || (cust as any)?.name || group.leadName || '',
        customerPhone: group.leadPhone || '',
        customerEmail: group.leadEmail || '',
        deliveryAddress: group.leadAddress || quoteData.customerAddress || '',
        paymentTerms: quoteData.custTerms || quoteData.terms || 'Standard Terms',
        orderDate: new Date().toISOString().slice(0, 10),
        targetDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        items: itemsList,
        subtotal,
        taxAmount,
        totalPrice: total,
        status: 'Confirmed',
        notes: `Commercial Sales Order generated from Approved Quotation ${group.quoNo}`
      };

      const res = await createFinishedGoodsOrder(soPayload);
      if (res && res.error) throw new Error(res.error);

      toast(`Sales Order ${soPayload.orderNo} created successfully!`, 'success');
      navigate('/crm/sales-orders');
    } catch (e: any) {
      toast(e?.message || 'Failed to create sales order', 'error');
    }
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
    const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.quotation-action-menu-container')) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])
  const [woDialog, setWoDialog] = useState<{type: 'confirm'|'success'|'error', group?: any, latestMain?: any, msg?: string} | null>(null)
  const [previewData, setPreviewData] = useState<{ quotation: any, type: string, lead: any } | null>(null)
  const [emailModalData, setEmailModalData] = useState<any>(null)
  const [grnDialog, setGrnDialog] = useState<{ group?: any, latestMain?: any, items?: any[], receivedAt?: string, notes?: string } | null>(null)
  const [printGrnData, setPrintGrnData] = useState<{ grn: any, group: any } | null>(null)
  const [viewBomDialog, setViewBomDialog] = useState<any>(null)
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

  const groupedQuotations = useMemo(() => {




  
    const groups: Record<string, { quoNo: string, leadName: string, leadCompany: string, leadEmail?: string, leadAddress: string, leadVat: string, leadSvat: string, leadId: string, main: any[], job: any[], customer: any[], latestDate: string }> = {}
    
    quotations.forEach(q => {
       let parsed: any = {}
       try { parsed = JSON.parse(q.data || '{}') } catch(e){}
       if (q.type === 'product' || q.type === 'product_draft' || parsed.isProductQuotation === true || parsed.quotationCategory === 'product') return;
       const quoNo = parsed.quotationNo || q.id
       
       if (!groups[quoNo]) {
          const cust = customers.find((c: any) => c.id === q.leadId);
          const lead = leads.find((l: any) => l.id === q.leadId);
          const leadCompany = q.leadCompany || cust?.company || lead?.company || '';
          const leadName = q.leadName || cust?.name || lead?.name || parsed.customerName || 'Walk-in Customer';
          const leadEmail = parsed.customerEmail || parsed.email || (cust as any)?.email || (lead as any)?.email || '';
          const leadAddress = parsed.customerAddress || parsed.address || q.leadAddress || cust?.address || (lead as any)?.address || '';
          const leadVat = parsed.vatNo || q.leadVat || cust?.vat || lead?.vat || '';
          const leadSvat = parsed.tinNo || q.leadSvat || cust?.svat || (cust as any)?.tin || lead?.svat || (lead as any)?.tin || '';
          groups[quoNo] = { quoNo, leadName, leadCompany, leadEmail, leadAddress, leadVat, leadSvat, leadId: q.leadId, main: [], job: [], customer: [], latestDate: q.date };
        }
       
       if (q.type === 'main') groups[quoNo].main.push(q)
       else if (q.type === 'job') groups[quoNo].job.push(q)
       else if (q.type === 'customer') groups[quoNo].customer.push(q)
       else groups[quoNo].main.push(q)
       
       if (new Date(q.date) > new Date(groups[quoNo].latestDate)) {
         groups[quoNo].latestDate = q.date
       }
    })
    
    // Sort versions descending within each group
    Object.values(groups).forEach(g => {
      g.main.sort((a, b) => b.version - a.version)
      g.job.sort((a, b) => b.version - a.version)
      g.customer.sort((a, b) => b.version - a.version)
    })
    
    // Sort groups by latest date descending
    return Object.values(groups).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime())
  }, [quotations, customers, leads])

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: groupedQuotations.length,
      draft: 0,
      'pending approval': 0,
      approved: 0,
      sent: 0,
      'in production': 0,
      rejected: 0
    };
    groupedQuotations.forEach(g => {
      const s = (g.main[0]?.status || 'Draft').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [groupedQuotations]);

  // Total Quoted Value
  const totalQuotedValue = useMemo(() => {
    return groupedQuotations.reduce((sum, g) => sum + Number(g.main[0]?.totalAmount || 0), 0);
  }, [groupedQuotations]);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading quotations...</div>

  const filtered = groupedQuotations.filter(g => {
    // Search filter
    const q = search.toLowerCase();
    const searchMatch = !search || [g.quoNo, g.leadName, g.leadCompany].some(v => v?.toLowerCase().includes(q));

    // Status filter
    let statusMatch = true;
    if (statusFilter !== 'all') {
      const latestStatus = (g.main[0]?.status || 'Draft').toLowerCase();
      statusMatch = latestStatus === statusFilter.toLowerCase();
    }

    // Customer filter
    let customerMatch = true;
    if (customerFilter !== 'all') {
      customerMatch = g.leadId === customerFilter;
    }

    // Date range filter
    let dateMatch = true;
    const qDate = (g.latestDate || g.main[0]?.date || '').slice(0, 10);
    if (startDate && qDate) {
      dateMatch = dateMatch && qDate >= startDate;
    }
    if (endDate && qDate) {
      dateMatch = dateMatch && qDate <= endDate;
    }

    return searchMatch && statusMatch && customerMatch && dateMatch;
  })

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
          </div>
          <p className="text-xs text-muted mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'quotation' : 'quotations'}
            {(search || statusFilter !== 'all' || customerFilter !== 'all' || startDate || endDate) && ' (filtered)'} &middot; Total Quoted Value:{' '}
            <span className="font-mono font-bold text-primary">{formatCurrency(totalQuotedValue)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              { id: 'in production', label: 'In Production', count: statusCounts['in production'] },
              { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-none transition-all uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  statusFilter.toLowerCase() === tab.id
                    ? 'bg-rex-600 text-white font-bold shadow-xs'
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

          <SearchBar
            placeholder="Search by quote no, customer, company..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-80 shrink-0"
          />
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

      <div className="space-y-3">
        {filtered.length === 0 && (
           <div className="p-8 text-center text-muted">No quotations match your search.</div>
        )}
        
        {filtered.map((group, idx) => {
          const latestMain = group.main[0];
          // Hide drafts from the main list, as they are shown in the Active Drafts section above
          if (latestMain?.type === 'draft' && !group.job.length && !group.customer.length && group.main.length === 1) return null;
          
          const latestJob = group.job[0];
          const latestCust = group.customer[0];
          
          // Determine parent display info (prefer main, then whatever is available)
          const displayQ = latestMain || latestCust || latestJob;
          if (!displayQ) return null;

          let parsed: any = {};
          try {
            parsed = typeof latestMain?.data === 'string' ? JSON.parse(latestMain.data || '{}') : (latestMain?.data || {});
          } catch (e) {}

          const status = latestMain?.status || 'Draft';
          const existingWO = getExistingWO(group, latestMain);
          const quoteReceipts = getQuoteReceipts(group, latestMain);
          const totalAdv = quoteReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
          const latestRec = quoteReceipts.length > 0 ? quoteReceipts[quoteReceipts.length - 1] : null;
          const sampleGrns = quoteGrns[latestMain?.id] || [];
          const itemsCount = parsed.custItems?.length || parsed.items?.length || parsed.boms?.length || 1;
          const isRevisionsExpanded = !!expandedRevisions[group.quoNo];

          return (
            <GlassCard
              key={group.quoNo}
              className={`p-3.5 hover:border-rex-500/40 transition-all duration-200 border-theme-subtle rounded-none ${
                openActionId === group.quoNo ? 'relative z-50 shadow-2xl' : 'relative z-0'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left Meta */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Checkbox for Final Quote compilation */}
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-rex-500 rounded-none shrink-0"
                      checked={selectedQuotes.includes(group.quoNo)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedQuotes(p => [...p, group.quoNo]);
                        else setSelectedQuotes(p => p.filter(x => x !== group.quoNo));
                      }}
                      title="Select for final quote"
                    />

                    <span className="font-mono font-bold text-sm text-rex-600 dark:text-rex-400">
                      {group.quoNo}
                    </span>

                    <span className={`text-xs uppercase font-semibold px-2.5 py-1 rounded-none border ${getStatusColor(status)}`}>
                      {status}
                    </span>

                    <span className="text-xs font-mono text-muted">
                      v{latestMain?.version || 1} • {formatDate(group.latestDate)}
                    </span>

                    {/* Revisions Toggle */}
                    {group.main.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExpandedRevisions(p => ({ ...p, [group.quoNo]: !p[group.quoNo] }))}
                        className="text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-surface2 hover:bg-surface3 text-muted hover:text-primary border border-theme-subtle transition-colors flex items-center gap-1.5"
                      >
                        {group.main.length} revisions
                        <ChevronDown size={10} className={`transition-transform duration-150 ${isRevisionsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {/* Work Order Badge */}
                    {existingWO && (
                      <button
                        type="button"
                        onClick={() => navigate(`/production/work-orders/${existingWO.id}`)}
                        className="text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 hover:bg-blue-500/20 transition-colors"
                        title="View Work Order"
                      >
                        <Factory size={10} /> WO: {existingWO.orderNo || existingWO.id}
                      </button>
                    )}

                    {/* Advance Payment Receipt Badge */}
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
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                        title={`View / Print Payment Receipt (Advance: ${formatCurrency(totalAdv)})`}
                      >
                        <Receipt size={10} /> Adv: {formatCurrency(totalAdv)}
                      </button>
                    )}

                    {/* Sample GRN Badge */}
                    {sampleGrns.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrintGrnData({ grn: sampleGrns[0], group })}
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded-none bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
                        title="Print Sample GRN"
                      >
                        Sample GRN
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-primary truncate">
                      {group.leadCompany || group.leadName}
                    </span>
                    {group.leadCompany && group.leadName && (
                      <span className="text-muted truncate">• Attn: {group.leadName}</span>
                    )}
                  </div>

                  {parsed.subject && (
                    <p className="text-xs text-secondary truncate max-w-xl">
                      {parsed.subject}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Package size={12} className="text-rex-500" />
                      {itemsCount} {itemsCount === 1 ? 'Quoted Item / BOM' : 'Quoted Items / BOMs'}
                    </span>
                    {parsed.boms && parsed.boms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewBomDialog(parsed.boms[0])}
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Briefcase size={10} /> View Costing
                      </button>
                    )}
                    {(parsed.custValidity || parsed.validity) && (
                      <span>Valid: {parsed.custValidity || parsed.validity}</span>
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
                      {formatCurrency(Number(latestMain?.totalAmount || 0))}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 quotation-action-menu-container ${openActionId === group.quoNo ? 'relative z-50' : 'relative z-0'}`}>
                    {/* Quick 1-click Preview */}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } })}
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
                            ? 'bg-rex-600 text-white border-rex-600'
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
                            idx >= filtered.length - 2 && filtered.length > 2 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                          } w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl z-[9999] py-1.5 text-left rounded-none max-h-[75vh] overflow-y-auto custom-scrollbar`}
                          style={{ minWidth: '256px', boxShadow: '0 12px 32px rgba(0,0,0,0.22), 0 0 1px rgba(0,0,0,0.1)' }}
                        >
                          <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                            Quotation Actions
                          </div>

                          {/* 1. Preview Document */}
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewData({ quotation: latestMain || displayQ, type: 'main', lead: { name: group.leadName, company: group.leadCompany, email: group.leadEmail, address: group.leadAddress, vat: group.leadVat, svat: group.leadSvat } });
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
                              navigate(`/crm/quotations/new/${group.leadId}?quoteId=${(latestMain || displayQ).id}`);
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
                          {(latestMain?.status === 'Approved' || latestMain?.status === 'Sent' || latestMain?.status === 'Accepted' || latestMain?.status === 'In Production') && (
                            <>
                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <div className="px-3.5 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                                Commercial & Production
                              </div>

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
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGrnDialog({ group, latestMain, items: [{ description: '', qty: 1 }] });
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

                          {/* View BOM Costing if available */}
                          {parsed.boms && parsed.boms.length > 0 && (
                            <>
                              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                              <button
                                type="button"
                                onClick={() => {
                                  setViewBomDialog(parsed.boms[0]);
                                  setOpenActionId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors text-left"
                              >
                                <Briefcase size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>View BOM Costing</span>
                              </button>
                            </>
                          )}

                          {/* Approvals Section */}
                          {((latestMain?.status === 'Draft' || !latestMain?.status || latestMain?.status === 'Rejected') || (canApprove && (latestMain?.status === 'Pending Approval' || latestMain?.status === 'Draft'))) && (
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

                              {canApprove && (latestMain?.status === 'Pending Approval' || latestMain?.status === 'Draft') && (
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
                                  onClick={async () => {
                                    setOpenActionId(null);
                                    const reason = prompt('Enter rejection reason:');
                                    if (!reason) return;
                                    try {
                                      await rejectQuotation(latestMain.id, reason);
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

                          {/* Delete Section */}
                          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenActionId(null);
                              if (await showConfirm(`Delete entire quotation group ${group.quoNo}?`, 'Delete Quotation Group', { confirmLabel: 'Delete' })) {
                                for (const q of [...group.main, ...group.job, ...group.customer]) {
                                  await deleteQuotation(q.id);
                                }
                                toast(`Quotation group ${group.quoNo} deleted successfully`, 'success');
                                refetch();
                              }
                            }}
                            className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Trash2 size={14} className="shrink-0 text-rose-500" />
                            <span>Delete Quotation Group</span>
                          </button>
                        </div>
                      )}                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Revisions Panel */}
              {isRevisionsExpanded && group.main.length > 1 && (
                <div className="mt-3 pt-3 border-t border-theme-subtle/50 space-y-1.5 animate-fade-in">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <History size={11} className="text-rex-500" />
                    Quotation Versions ({group.main.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {group.main.map((v: any) => {
                      const isLatest = v.id === latestMain?.id;
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between px-2.5 py-1.5 border text-xs rounded-none transition-colors ${
                            isLatest
                              ? 'bg-rex-500/10 border-rex-500/30 text-primary'
                              : 'bg-surface2/50 border-theme-subtle text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold font-mono text-primary shrink-0">v{v.version}</span>
                            {isLatest && (
                              <span className="text-xs font-semibold bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-none uppercase">
                                Active
                              </span>
                            )}
                            <span className="font-mono text-secondary text-xs font-mono truncate">
                              {formatCurrency(Number(v.totalAmount || 0))}
                            </span>
                            <span className="text-xs text-muted truncate">{formatDate(v.date)}</span>
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
                              onClick={() => navigate(`/crm/quotations/new/${group.leadId}?quoteId=${v.id}`)}
                              className="p-1 text-primary hover:bg-surface rounded-none transition-colors"
                              title={`Edit Version v${v.version}`}
                            >
                              <FileEdit size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await showConfirm(
                                  `Delete Version v${v.version} of quotation ${group.quoNo}?`,
                                  'Delete Version',
                                  { confirmLabel: 'Delete' }
                                );
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
      </div>

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
              <Button 
                variant="primary" 
                icon={Mail} 
                onClick={() => {
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Email Quotation
              </Button>
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.2,
                  filename: `Quotation.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => window.print()}>Print Quotation</Button>
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
      <Modal isOpen={!!viewBomDialog} onClose={() => setViewBomDialog(null)} title={viewBomDialog?.title ? `Costing Details: ${viewBomDialog.title}` : "View Costing Details"} size="xl">
        {viewBomDialog && (
          <div className="bg-surface text-primary p-0 flex flex-col h-full rounded-b-xl overflow-hidden">
             {/* Header Summary Bar */}
             <div className="px-6 py-5 bg-gradient-to-r from-surface2 via-surface2/50 to-transparent border-b border-theme-subtle flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                   <Briefcase size={20} />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-secondary">{viewBomDialog.title || 'Internal BOM Costing'}</p>
                   <p className="text-xs text-muted font-medium mt-0.5">Full Materials & Machining Breakdown</p>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Total Estimated Cost</p>
                 <p className="font-mono font-bold text-primary text-2xl leading-none">{formatCurrency(viewBomDialog.bomTotal || 0)}</p>
               </div>
             </div>

             <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                 {/* Auto Materials */}
                 {viewBomDialog.autoMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-blue-500" />
                       <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Plate / Rod Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-xs uppercase text-muted font-semibold tracking-wider">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5">Dimensions</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-xs">
                         {viewBomDialog.autoMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 font-mono text-muted">{m.width ? `${m.width} x ${m.length}` : `Ø${m.dia} x ${m.length}`}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.platePrice || 0) + Number(m.shaftPrice || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Manual Materials */}
                 {viewBomDialog.manualMats?.length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Package size={14} className="text-amber-500" />
                       <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Manual Materials</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-xs uppercase text-muted font-semibold tracking-wider">
                         <tr><th className="px-4 py-2.5">Material</th><th className="px-4 py-2.5 text-right w-32">Unit Price</th><th className="px-4 py-2.5 text-right w-24">Qty</th><th className="px-4 py-2.5 text-right w-32">Total Cost</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-xs">
                         {viewBomDialog.manualMats.map((m: any, i: number) => (
                           <tr key={i} className="hover:bg-surface/50 transition-colors">
                             <td className="px-4 py-2 font-semibold text-secondary">{m.material}</td>
                             <td className="px-4 py-2 text-right font-mono text-muted">{formatCurrency(m.unitPrice || 0)}</td>
                             <td className="px-4 py-2 text-right font-medium">{m.qty}</td>
                             <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(Number(m.unitPrice || 0)*Number(m.qty || 0))}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}

                 {/* Machining */}
                 {viewBomDialog.procState && Object.keys(viewBomDialog.procState).length > 0 && (
                   <div className="border border-theme-subtle/50 rounded-xl bg-surface/30 shadow-sm overflow-hidden">
                     <div className="px-4 py-3 bg-surface2/30 border-b border-theme-subtle/40 flex items-center gap-2">
                       <Factory size={14} className="text-red-500" />
                       <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Machining Operations</h4>
                     </div>
                     <table className="w-full text-left">
                       <thead className="bg-surface/50 border-b border-theme-subtle/30 text-xs uppercase text-muted font-semibold tracking-wider">
                         <tr><th className="px-4 py-2.5">Process / Operation</th><th className="px-4 py-2.5 text-right w-24">Est. Hrs</th><th className="px-4 py-2.5 text-right w-24">Set Time</th><th className="px-4 py-2.5 text-right w-24 text-primary">Quo. Hrs</th><th className="px-4 py-2.5 text-right w-32">Sub Total</th></tr>
                       </thead>
                       <tbody className="divide-y divide-theme-subtle/20 text-xs">
                         {Object.keys(viewBomDialog.procState).map((k: string) => {
                            const st = viewBomDialog.procState[k];
                            const subTotal = (Number(st.quoHr || 0) * Number(st.hrRate || st.rate || 0)) + (Number(st.setTime || 0) * Number(st.setTimeRate || 0));
                            if (subTotal === 0 && !st.estHr && !st.quoHr && !st.setTime) return null;
                            return (
                              <tr key={k} className="hover:bg-surface/50 transition-colors">
                                <td className="px-4 py-2 font-bold text-red-500/90">{k}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.estHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-muted">{st.setTime || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{st.quoHr || '-'}</td>
                                <td className="px-4 py-2 text-right font-mono text-primary font-bold">{formatCurrency(subTotal)}</td>
                              </tr>
                            )
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
             </div>
          </div>
        )}
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
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setGrnDialog(null)}>Cancel</Button>
              <Button variant="primary" onClick={async () => {
                if (grnDialog?.latestMain) {
                   await createCustomerGRN({
                     quoteId: grnDialog.latestMain.id,
                     quoNo: grnDialog.group.quoNo,
                     leadId: grnDialog.group.leadId,
                     items: JSON.stringify(grnDialog.items),
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
              <Button variant="ghost" onClick={() => {
                const element = document.getElementById('grn-print-section');
                if (!element) return;
                const opt: any = {
                  margin: 0.5,
                  filename: `GRN-${printGrnData.grn.id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(element).save();
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
    </div>
  )
}