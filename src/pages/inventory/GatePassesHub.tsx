import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Truck, Search, Filter, Printer, Download, Plus, Eye, Trash2, 
  RefreshCw, CheckCircle2, Clock, Calendar, ArrowUpRight, FileText, 
  ShoppingBag, Factory, AlertCircle, Shield
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { fetchGatePasses, deleteGatePass, fetchWorkOrders, fetchAllCustomerGRNs } from '@/lib/api';
import { useQuotations, useFinishedGoodsOrders, useInvoices } from '@/hooks/useData';
import { GatePassPrintModal } from '@/components/GatePassPrintModal';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { WorkflowPipelineBanner } from '@/components/common/WorkflowPipelineBanner';

type SortField = 'id' | 'createdAt' | 'customer' | 'orderNo' | 'carrier' | 'type';
type SortDir = 'asc' | 'desc';

export const GatePassesHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  );
  const { toast, showConfirm } = useDialog();
  const { settings } = useSettings();

  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState<'all' | 'goods_delivery' | 'sample'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_month'>('all');
  
  // Sorting state (Excel-like)
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Print modal
  const [printGatePass, setPrintGatePass] = useState<any | null>(null);

  // Traceability data
  const { data: allQuotations = [] } = useQuotations();
  const { data: allSalesOrders = [] } = useFinishedGoodsOrders();
  const { data: allInvoices = [] } = useInvoices();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [customerGrns, setCustomerGrns] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gps, wos, grns] = await Promise.all([
        fetchGatePasses(),
        fetchWorkOrders().catch(() => []),
        fetchAllCustomerGRNs().catch(() => [])
      ]);
      setGatePasses(Array.isArray(gps) ? gps : []);
      setWorkOrders(Array.isArray(wos) ? wos : []);
      setCustomerGrns(Array.isArray(grns) ? grns : []);
    } catch (e: any) {
      console.error('Failed to load gate passes:', e);
      toast(e.message || 'Failed to load gate passes', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = async (gp: any) => {
    const docNo = gp.id || gp.gatePassNo;
    const confirmed = await showConfirm(
      `Are you sure you want to delete Security Gate Pass "${docNo}"? This cannot be undone.`,
      'Delete Gate Pass'
    );
    if (!confirmed) return;

    try {
      await deleteGatePass(gp.id);
      toast(`Gate Pass ${docNo} deleted successfully`, 'success');
      setGatePasses(prev => prev.filter(g => g.id !== gp.id));
    } catch (err: any) {
      toast(err.message || 'Failed to delete gate pass', 'error');
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = gatePasses.length;
    const goodsDelivery = gatePasses.filter(g => g.type === 'goods_delivery' || g.type === 'sales_delivery').length;
    const samples = gatePasses.filter(g => g.type !== 'goods_delivery' && g.type !== 'sales_delivery').length;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = gatePasses.filter(g => (g.issuedDate || g.createdAt || '').startsWith(currentMonth)).length;

    return { total, goodsDelivery, samples, thisMonth };
  }, [gatePasses]);

  // Filtering & Sorting
  const filteredAndSortedGatePasses = useMemo(() => {
    let list = gatePasses.filter(gp => {
      // Type filter
      if (typeFilter === 'goods_delivery' && gp.type !== 'goods_delivery' && gp.type !== 'sales_delivery') return false;
      if (typeFilter === 'sample' && (gp.type === 'goods_delivery' || gp.type === 'sales_delivery')) return false;

      // Date filter
      const itemDate = (gp.issuedDate || gp.createdAt || '').slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      if (dateFilter === 'today' && itemDate !== todayStr) return false;
      if (dateFilter === 'this_month') {
        const curMonth = todayStr.slice(0, 7);
        if (!itemDate.startsWith(curMonth)) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesNo = String(gp.id || gp.gatePassNo || '').toLowerCase().includes(q);
        const matchesCust = String(gp.customerName || gp.customerCompany || gp.companyName || '').toLowerCase().includes(q);
        const matchesCarrier = String(gp.carrier || gp.vehicleNo || gp.driverName || '').toLowerCase().includes(q);
        const matchesOrder = String(gp.orderNo || gp.orderId || gp.quoNo || gp.displayQuoNo || '').toLowerCase().includes(q);
        const matchesItems = String(gp.items || gp.description || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesCust && !matchesCarrier && !matchesOrder && !matchesItems) return false;
      }

      return true;
    });

    // Sort
    list.sort((a, b) => {
      let av: any = '';
      let bv: any = '';

      switch (sortField) {
        case 'id':
          av = a.id || a.gatePassNo || '';
          bv = b.id || b.gatePassNo || '';
          break;
        case 'createdAt':
          av = a.issuedDate || a.createdAt || '';
          bv = b.issuedDate || b.createdAt || '';
          break;
        case 'customer':
          av = a.customerName || a.customerCompany || a.companyName || '';
          bv = b.customerName || b.customerCompany || b.companyName || '';
          break;
        case 'orderNo':
          av = a.orderNo || a.quoNo || '';
          bv = b.orderNo || b.quoNo || '';
          break;
        case 'carrier':
          av = a.carrier || a.vehicleNo || '';
          bv = b.carrier || b.vehicleNo || '';
          break;
        case 'type':
          av = a.type || '';
          bv = b.type || '';
          break;
      }

      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [gatePasses, typeFilter, dateFilter, search, sortField, sortDir]);

  // Build Traceability Nodes for a Gate Pass
  const getGatePassTraces = useCallback((gp: any): TraceNode[] => {
    const traces: TraceNode[] = [];
    const gpNo = gp.id || gp.gatePassNo;
    const soRef = String(gp.orderNo || '').trim().toLowerCase();
    const qRef = String(gp.quoNo || gp.quotationDocNo || gp.displayQuoNo || '').trim().toLowerCase();
    const grnRef = String(gp.grnId || '').trim().toLowerCase();

    // 1. Linked Sales Order
    const matchedSo = allSalesOrders.find((so: any) =>
      (so.orderNo && soRef && String(so.orderNo).toLowerCase() === soRef) ||
      (so.id && (String(so.id) === String(gp.orderId) || String(so.id).toLowerCase() === soRef)) ||
      (so.gatePassId && so.gatePassId === gpNo) ||
      (so.gatePassNo && so.gatePassNo === gpNo)
    );
    if (matchedSo) {
      traces.push({
        type: 'order',
        title: 'Sales Order',
        reference: matchedSo.orderNo || matchedSo.id,
        subtitle: `${matchedSo.customerName} • Qty: ${matchedSo.qty || 1} pcs`,
        statusBadge: {
          label: matchedSo.isDispatched ? 'Dispatched' : 'Active Order',
          variant: matchedSo.isDispatched ? 'success' : 'info'
        },
        navigateUrl: `/crm/sales-orders?search=${encodeURIComponent(matchedSo.orderNo || matchedSo.id)}`
      });
    }

    // 2. Linked Work Order
    const matchedWo = workOrders.find((wo: any) =>
      (wo.orderNo && soRef && String(wo.orderNo).toLowerCase() === soRef) ||
      (wo.salesOrderNo && soRef && String(wo.salesOrderNo).toLowerCase() === soRef) ||
      (wo.id && String(wo.id) === String(gp.orderId)) ||
      (matchedSo?.orderNo && wo.orderNo && String(wo.orderNo).toLowerCase() === String(matchedSo.orderNo).toLowerCase()) ||
      (matchedSo?.orderNo && wo.salesOrderNo && String(wo.salesOrderNo).toLowerCase() === String(matchedSo.orderNo).toLowerCase()) ||
      (matchedSo?.orderNo && wo.title && String(wo.title).toLowerCase().includes(String(matchedSo.orderNo).toLowerCase()))
    );
    if (matchedWo) {
      traces.push({
        type: 'work_order',
        title: 'Work Order (Traveler)',
        reference: matchedWo.orderNo || matchedWo.id,
        subtitle: `Job Qty: ${matchedWo.jobQty || 1} pcs • Status: ${matchedWo.status || 'Active'}`,
        statusBadge: {
          label: matchedWo.status || 'In Production',
          variant: matchedWo.status === 'Completed' ? 'success' : 'warning'
        },
        navigateUrl: `/production/work-orders/${matchedWo.id}`
      });
    }

    // 3. Linked Quotation
    const matchedQuote = allQuotations.find((q: any) =>
      (q.quotationNo && qRef && String(q.quotationNo).toLowerCase() === qRef) ||
      (q.id && qRef && String(q.id).toLowerCase() === qRef) ||
      (matchedSo?.quotationNo && q.quotationNo && String(q.quotationNo).toLowerCase() === String(matchedSo.quotationNo).toLowerCase()) ||
      (matchedSo?.quoteId && q.id && String(q.id).toLowerCase() === String(matchedSo.quoteId).toLowerCase())
    );
    if (matchedQuote) {
      traces.push({
        type: 'quotation',
        title: 'Commercial Quotation',
        reference: matchedQuote.quotationNo || matchedQuote.id,
        subtitle: `Client: ${matchedQuote.customerCompany || matchedQuote.customerName || 'Customer'}`,
        statusBadge: {
          label: matchedQuote.status || 'Approved',
          variant: 'info'
        },
        navigateUrl: `/crm/quotations?search=${encodeURIComponent(matchedQuote.quotationNo || matchedQuote.id)}`
      });
    }

    // 4. Linked Customer Sample GRN
    const matchedGrn = customerGrns.find((grn: any) =>
      (grn.id && grnRef && String(grn.id).toLowerCase() === grnRef) ||
      (grn.grnNo && grnRef && String(grn.grnNo).toLowerCase() === grnRef) ||
      (gp.grnId && String(grn.id) === String(gp.grnId))
    );
    if (matchedGrn) {
      traces.push({
        type: 'grn',
        title: 'Sample GRN',
        reference: matchedGrn.grnNo || matchedGrn.id,
        subtitle: `Received: ${matchedGrn.sampleName || matchedGrn.items || 'Sample Item'}`,
        statusBadge: {
          label: matchedGrn.status || 'Received',
          variant: 'neutral'
        },
        navigateUrl: `/inventory?tab=customer_sample&search=${encodeURIComponent(matchedGrn.grnNo || matchedGrn.id)}`
      });
    }

    // 5. Linked Commercial Invoices
    const matchedInvoices = allInvoices.filter((inv: any) =>
      (inv.dispatchNo && (inv.dispatchNo === gpNo || inv.dispatchNo === gp.id)) ||
      (matchedSo && (inv.orderNo === matchedSo.orderNo || inv.orderId === matchedSo.id)) ||
      (gp.orderNo && inv.orderNo && String(inv.orderNo).toLowerCase() === soRef)
    );
    matchedInvoices.forEach((inv: any) => {
      traces.push({
        type: inv.isProforma ? 'proforma' : 'invoice',
        title: inv.isProforma ? 'Advance Proforma Invoice' : 'Tax Invoice',
        reference: inv.invoiceNo || inv.id,
        subtitle: `Total: LKR ${Number(inv.total || inv.grandTotal || 0).toLocaleString()} • Status: ${inv.status || 'Issued'}`,
        statusBadge: {
          label: inv.status || 'Issued',
          variant: inv.status === 'paid' ? 'success' : 'warning'
        },
        navigateUrl: `/finance/invoices?search=${encodeURIComponent(inv.invoiceNo || inv.id)}`
      });
    });

    return traces;
  }, [allQuotations, allSalesOrders, allInvoices, workOrders, customerGrns]);

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Workflow Navigation Banner */}
      <WorkflowPipelineBanner 
        activeStage={5}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary tracking-tight">Security Gate Passes & Dispatch</h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold rounded-none">
                Stores & Logistics
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Official dispatch documentation, security gate outward passes, consignment tracking, and live cross-module traceability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            className="text-xs border border-theme-subtle hover:bg-surface2"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={ShoppingBag}
            onClick={() => navigate('/crm/sales-orders')}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            Dispatch From Sales Orders
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Total Passes Issued</span>
            <div className="text-2xl font-mono font-bold text-primary mt-1">{metrics.total}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <Truck size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Goods Deliveries</span>
            <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">{metrics.goodsDelivery}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Sample Outward</span>
            <div className="text-2xl font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">{metrics.samples}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
            <FileText size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Dispatches This Month</span>
            <div className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">{metrics.thisMonth}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center">
            <Calendar size={18} />
          </div>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBar 
            placeholder="Search Gate Pass #, Consignee, Vehicle, SO #..." 
            value={search} 
            onChange={setSearch} 
            className="w-full sm:w-80" 
          />

          <div className="flex items-center gap-1 bg-surface border border-theme-subtle p-1">
            <span className="text-[10px] text-muted uppercase font-bold px-2">Type:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${typeFilter === 'all' ? 'bg-emerald-500/15 text-emerald-600 font-bold' : 'text-muted hover:text-primary'}`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setTypeFilter('goods_delivery')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${typeFilter === 'goods_delivery' ? 'bg-emerald-500/15 text-emerald-600 font-bold' : 'text-muted hover:text-primary'}`}
            >
              Goods Delivery ({metrics.goodsDelivery})
            </button>
            <button
              onClick={() => setTypeFilter('sample')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${typeFilter === 'sample' ? 'bg-sky-500/15 text-sky-600 font-bold' : 'text-muted hover:text-primary'}`}
            >
              Samples ({metrics.samples})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-surface border border-theme-subtle p-1">
            <span className="text-[10px] text-muted uppercase font-bold px-2">Period:</span>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${dateFilter === 'all' ? 'bg-primary text-surface font-bold' : 'text-muted hover:text-primary'}`}
            >
              All
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${dateFilter === 'today' ? 'bg-primary text-surface font-bold' : 'text-muted hover:text-primary'}`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${dateFilter === 'this_month' ? 'bg-primary text-surface font-bold' : 'text-muted hover:text-primary'}`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Gate Passes Table */}
      <GlassCard className="overflow-hidden p-0 border border-theme-subtle shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-muted animate-pulse">Loading Gate Passes & Dispatch Logs...</div>
        ) : filteredAndSortedGatePasses.length === 0 ? (
          <div className="p-16 text-center">
            <Truck size={40} className="text-muted mx-auto mb-3 opacity-40" />
            <p className="text-base font-bold text-primary">No Security Gate Passes Found</p>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              Gate passes are generated when dispatching finished goods against Sales Orders or outward customer samples.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/crm/sales-orders')}
              className="mt-4 text-xs"
            >
              Go to Sales Orders Hub
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1050px] border-collapse">
              <thead className="bg-surface2/60 border-b border-theme-subtle text-[11px] font-semibold text-muted uppercase tracking-wider">
                <tr>
                  {/* Gate Pass # & Date */}
                  <th 
                    onClick={() => handleSort('id')}
                    className="px-4 py-3 cursor-pointer hover:text-primary select-none transition-colors"
                    title="Sort by Gate Pass # (Excel style)"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Gate Pass # & Date
                      {sortField === 'id' ? (
                        <span className="text-blue-500 font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-30">↕</span>
                      )}
                    </span>
                  </th>

                  {/* Consignee */}
                  <th 
                    onClick={() => handleSort('customer')}
                    className="px-4 py-3 cursor-pointer hover:text-primary select-none transition-colors"
                    title="Sort by Customer (Excel style)"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Customer / Consignee
                      {sortField === 'customer' ? (
                        <span className="text-blue-500 font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-30">↕</span>
                      )}
                    </span>
                  </th>

                  {/* Type */}
                  <th 
                    onClick={() => handleSort('type')}
                    className="px-3.5 py-3 cursor-pointer hover:text-primary select-none transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Pass Type
                      {sortField === 'type' ? (
                        <span className="text-blue-500 font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-30">↕</span>
                      )}
                    </span>
                  </th>

                  {/* References */}
                  <th 
                    onClick={() => handleSort('orderNo')}
                    className="px-3.5 py-3 cursor-pointer hover:text-primary select-none transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Order / Job Ref
                      {sortField === 'orderNo' ? (
                        <span className="text-blue-500 font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-30">↕</span>
                      )}
                    </span>
                  </th>

                  {/* Logistics / Carrier */}
                  <th 
                    onClick={() => handleSort('carrier')}
                    className="px-3.5 py-3 cursor-pointer hover:text-primary select-none transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Carrier & Vehicle
                      {sortField === 'carrier' ? (
                        <span className="text-blue-500 font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="opacity-30">↕</span>
                      )}
                    </span>
                  </th>

                  {/* Dispatched Summary */}
                  <th className="px-3.5 py-3">Dispatched Items</th>

                  {/* Live Traceability */}
                  <th className="px-3 py-3 text-center">Traceability</th>

                  {/* Actions */}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme-subtle/30 text-xs">
                {filteredAndSortedGatePasses.map((gp: any) => {
                  const isGoodsDelivery = gp.type === 'goods_delivery' || gp.type === 'sales_delivery';
                  const traces = getGatePassTraces(gp);

                  // Extract items preview
                  let itemsText = '';
                  try {
                    if (typeof gp.items === 'string') {
                      if (gp.items.startsWith('[') || gp.items.startsWith('{')) {
                        const parsed = JSON.parse(gp.items);
                        const arr = Array.isArray(parsed) ? parsed : [parsed];
                        itemsText = arr.map((it: any) => `${it.qty || 1} ${it.unit || 'pcs'} ${it.description || it.productName || 'Item'}`).join(', ');
                      } else {
                        itemsText = gp.items;
                      }
                    } else if (Array.isArray(gp.items)) {
                      itemsText = gp.items.map((it: any) => `${it.qty || 1} ${it.unit || 'pcs'} ${it.description || it.productName || 'Item'}`).join(', ');
                    }
                  } catch (e) {
                    itemsText = gp.description || '-';
                  }

                  const custName = gp.customerName || gp.customerCompany || gp.companyName || gp.leadCompany || 'Customer Consignee';

                  return (
                    <tr key={gp.id} className="hover:bg-surface2/40 transition-colors">
                      {/* Gate Pass # & Date */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {gp.id || gp.gatePassNo}
                          </span>
                          <span className="text-[11px] text-muted font-mono mt-0.5 flex items-center gap-1">
                            <Clock size={11} className="shrink-0" />
                            {formatDate(gp.issuedDate || gp.createdAt || gp.date)}
                          </span>
                        </div>
                      </td>

                      {/* Customer / Consignee */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-primary truncate" title={custName}>
                            {custName}
                          </span>
                          {gp.attention && (
                            <span className="text-[11px] text-muted truncate">
                              Attn: {gp.attention}
                            </span>
                          )}
                          {gp.address && (
                            <span className="text-[10px] text-muted truncate font-mono">
                              {gp.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pass Type */}
                      <td className="px-3.5 py-3">
                        <Badge 
                          className={`text-[10px] font-semibold rounded-none ${
                            isGoodsDelivery 
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                              : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {isGoodsDelivery ? 'Goods Delivery' : 'Sample Outward'}
                        </Badge>
                      </td>

                      {/* References */}
                      <td className="px-3.5 py-3 font-mono">
                        <div className="flex flex-col gap-0.5">
                          {gp.orderNo && (
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400" title="Sales Order Reference">
                              SO: {gp.orderNo}
                            </span>
                          )}
                          {(gp.quoNo || gp.quotationDocNo || gp.displayQuoNo) && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold" title="Quotation Reference">
                              QUO: {gp.quoNo || gp.quotationDocNo || gp.displayQuoNo}
                            </span>
                          )}
                          {gp.grnId && (
                            <span className="text-[10px] text-muted" title="Customer Sample GRN">
                              GRN: {gp.grnId}
                            </span>
                          )}
                          {!gp.orderNo && !gp.quoNo && !gp.grnId && (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Carrier & Vehicle */}
                      <td className="px-3.5 py-3">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-primary">{gp.carrier || 'Hand Delivery'}</span>
                          {gp.vehicleNo && (
                            <span className="text-muted font-mono text-[10px]">{gp.vehicleNo}</span>
                          )}
                          {gp.driverName && (
                            <span className="text-muted text-[10px]">Driver: {gp.driverName}</span>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-3.5 py-3 max-w-[240px]">
                        <p className="text-[11px] text-primary truncate" title={itemsText || gp.description}>
                          {itemsText || gp.description || 'Finished Goods'}
                        </p>
                      </td>

                      {/* Traceability */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <TraceabilityDropdown 
                            title={`Traceability for Gate Pass ${gp.id || gp.gatePassNo}`}
                            traces={traces}
                            compact
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(() => {
                            const gpNo = gp.passNo || gp.id;
                            const hasInvoice = allInvoices.some((inv: any) =>
                              (!inv.isProforma && inv.invoiceType !== 'proforma' && !inv.invoiceNo?.startsWith('PI-') && !inv.id?.startsWith('PI-')) &&
                              (
                                (inv.dispatchNo && (inv.dispatchNo === gpNo || inv.dispatchNo === gp.id)) ||
                                (inv.gatePassId && (inv.gatePassId === gp.id || inv.gatePassId === gpNo))
                              )
                            );

                            if (gp.type !== 'goods_delivery' || hasInvoice) {
                              return null;
                            }

                            return (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={FileText}
                              onClick={() => {
                                const qParam = new URLSearchParams();
                                if (gp.orderId) qParam.set('orderId', gp.orderId);
                                if (gp.orderNo) qParam.set('soNo', gp.orderNo);
                                if (gp.passNo || gp.id) qParam.set('dispatchNo', gp.passNo || gp.id);
                                if (gp.id) qParam.set('gatePassId', gp.id);
                                navigate(`/finance/invoices/new?${qParam.toString()}`);
                              }}
                              className="text-xs border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold py-1 px-2.5 rounded-none flex items-center gap-1"
                              title="Create Tax Invoice for this specific Dispatch Note"
                            >
                              Create Invoice
                            </Button>
                            );
                          })()}
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Printer}
                            onClick={() => setPrintGatePass(gp)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-none flex items-center gap-1"
                          >
                            Print Gate Pass
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(gp)}
                              className="text-xs text-muted hover:text-rose-600 hover:bg-rose-500/10 p-1.5 h-auto rounded-none transition-colors"
                              title="Delete Gate Pass"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Printable Gate Pass Modal */}
      {printGatePass && (
        <GatePassPrintModal
          isOpen={Boolean(printGatePass)}
          onClose={() => setPrintGatePass(null)}
          gatePass={printGatePass}
          settings={settings}
        />
      )}
    </div>
  );
};
