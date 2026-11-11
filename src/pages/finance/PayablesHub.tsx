import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Plus, Filter, ArrowDownRight, FileText, ShoppingCart, 
  Truck, CheckCircle2, Clock, AlertCircle, RefreshCw, ExternalLink,
  Building2, Search, DollarSign, CreditCard, BarChart3
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useBills, usePurchaseOrders, useGRNs, useMaterialRequests } from '@/hooks/usePurchasing';
import { useSuppliers, useWorkOrders } from '@/hooks/useData';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { RecordBillPaymentModal } from '@/components/purchasing/RecordBillPaymentModal';
import { MultiBillSettlementModal } from '@/components/purchasing/MultiBillSettlementModal';
import { useDialog } from '@/components/ui/DialogProvider';

type ActiveTab = 'aging' | 'bills' | 'pos';
type SortDir = 'asc' | 'desc';

export const PayablesHub: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useDialog();
  const [activeTab, setActiveTab] = useState<ActiveTab>('aging');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [agingData, setAgingData] = useState<any[]>([]);
  const [loadingAging, setLoadingAging] = useState(true);
  const [paymentBill, setPaymentBill] = useState<any | null>(null);
  const [showMultiSettlement, setShowMultiSettlement] = useState<boolean>(false);
  const [multiSettlementSupplier, setMultiSettlementSupplier] = useState<any | null>(null);

  // Purchasing hooks
  const { data: bills = [], loading: loadingBills, refetch: refetchBills } = useBills();
  const { data: pos = [], loading: loadingPOs, refetch: refetchPOs } = usePurchaseOrders();
  const { data: grns = [] } = useGRNs();
  const { data: mrs = [] } = useMaterialRequests();
  const { data: suppliers = [] } = useSuppliers();
  const { data: workOrders = [] } = useWorkOrders();

  // Sorting states
  const [billSortField, setBillSortField] = useState<string>('billNo');
  const [billSortDir, setBillSortDir] = useState<SortDir>('desc');
  const [poSortField, setPoSortField] = useState<string>('poNo');
  const [poSortDir, setPoSortDir] = useState<SortDir>('desc');

  const loadAging = useCallback(() => {
    setLoadingAging(true);
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/finance/reports/aging?type=ap`)
      .then(res => res.json())
      .then(res => { setAgingData(Array.isArray(res) ? res : []); setLoadingAging(false); })
      .catch((e) => { console.error(e); setLoadingAging(false); });
  }, []);

  useEffect(() => {
    loadAging();
  }, [loadAging]);

  const handleBillSort = (field: string) => {
    if (billSortField === field) setBillSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setBillSortField(field); setBillSortDir('asc'); }
  };

  const handlePoSort = (field: string) => {
    if (poSortField === field) setPoSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setPoSortField(field); setPoSortDir('asc'); }
  };

  // Helper supplier names
  const getSupplierName = (id: string) => {
    const s = suppliers.find((sp: any) => sp.id === id);
    return s?.company || s?.name || id || 'Supplier';
  };

  // Filter Aging
  let filteredAging = agingData.filter(r => (r.partyName || '').toLowerCase().includes(search.toLowerCase()));
  if (filterType === 'overdue') filteredAging = filteredAging.filter(r => Number(r.bucket90plus) > 0);

  const totalPayable = agingData.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const totalOverdue = agingData.reduce((s, r) => s + (Number(r.bucket90plus) || 0), 0);

  // Filter & Sort Bills
  const filteredAndSortedBills = useMemo(() => {
    const q = search.toLowerCase();
    let list = bills.filter((b: any) => {
      const bId = String(b.id || '').toLowerCase();
      const invNo = String(b.invoiceNo || '').toLowerCase();
      const supp = String(getSupplierName(b.supplierId) || '').toLowerCase();
      const po = String(b.poId || '').toLowerCase();
      return !q || bId.includes(q) || invNo.includes(q) || supp.includes(q) || po.includes(q);
    });

    list.sort((a: any, b: any) => {
      let av: any = a[billSortField] ?? '';
      let bv: any = b[billSortField] ?? '';
      if (billSortField === 'supplier') {
        av = getSupplierName(a.supplierId);
        bv = getSupplierName(b.supplierId);
      }
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn) && typeof av !== 'boolean') {
        return billSortDir === 'asc' ? an - bn : bn - an;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
      return billSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [bills, search, billSortField, billSortDir, suppliers]);

  // Filter & Sort POs
  const filteredAndSortedPOs = useMemo(() => {
    const q = search.toLowerCase();
    let list = pos.filter((p: any) => {
      const pId = String(p.id || '').toLowerCase();
      const supp = String(getSupplierName(p.supplierId) || '').toLowerCase();
      const mr = String(p.mrId || p.mrIds || '').toLowerCase();
      return !q || pId.includes(q) || supp.includes(q) || mr.includes(q);
    });

    list.sort((a: any, b: any) => {
      let av: any = a[poSortField] ?? '';
      let bv: any = b[poSortField] ?? '';
      if (poSortField === 'supplier') {
        av = getSupplierName(a.supplierId);
        bv = getSupplierName(b.supplierId);
      }
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn) && typeof av !== 'boolean') {
        return poSortDir === 'asc' ? an - bn : bn - an;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
      return poSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [pos, search, poSortField, poSortDir, suppliers]);

  // Traceability for Supplier Bill
  const getBillTraces = (bill: any): TraceNode[] => {
    const traces: TraceNode[] = [];
    const suppName = getSupplierName(bill.supplierId);

    // 1. Linked Supplier
    if (bill.supplierId) {
      traces.push({
        type: 'other',
        title: 'Supplier Account',
        reference: suppName,
        subtitle: `Supplier ID: ${bill.supplierId}`,
        statusBadge: { label: 'Vendor', variant: 'neutral' },
        navigateUrl: `/inventory/suppliers/${bill.supplierId}`
      });
    }

    // 2. Linked Purchase Order
    if (bill.poId) {
      const matchedPo = pos.find((p: any) => p.id === bill.poId);
      traces.push({
        type: 'po',
        title: 'Purchase Order',
        reference: bill.poId,
        subtitle: matchedPo ? `Total: ${formatCurrency(Number(matchedPo.totalAmount || 0))} • Status: ${matchedPo.status || 'Active'}` : 'Linked PO',
        statusBadge: { label: matchedPo?.status || 'PO Issued', variant: 'info' },
        navigateUrl: `/purchasing/po-builder/${bill.poId}`
      });
    }

    // 3. Linked GRN
    if (bill.grnId) {
      const matchedGrn = grns.find((g: any) => g.id === bill.grnId);
      traces.push({
        type: 'grn',
        title: 'Goods Receipt Note',
        reference: bill.grnId,
        subtitle: matchedGrn ? `Received: ${matchedGrn.carrier || 'Stores Receipt'}` : 'Receipt Log',
        statusBadge: { label: 'GRN Received', variant: 'success' },
        navigateUrl: `/purchasing?tab=grn&search=${encodeURIComponent(bill.grnId)}`
      });
    }

    // 4. Linked Work Orders (via PO / MR)
    const linkedPoObj = bill.poId ? pos.find((p: any) => p.id === bill.poId) : null;
    const billMrList: string[] = linkedPoObj ? (Array.isArray(linkedPoObj.mrIds)
      ? linkedPoObj.mrIds
      : (typeof linkedPoObj.mrIds === 'string'
          ? (() => { try { const m = JSON.parse(linkedPoObj.mrIds); return Array.isArray(m) ? m : [linkedPoObj.mrIds]; } catch { return [linkedPoObj.mrIds]; } })()
          : (linkedPoObj.mrId ? [linkedPoObj.mrId] : []))) : [];
    
    const billWos = new Set<string>();
    billMrList.forEach(mId => {
      const mrObj = mrs.find((m: any) => m.id === mId);
      if (mrObj) {
        if (mrObj.workOrderNo) billWos.add(mrObj.workOrderNo);
        if (mrObj.jobNo) billWos.add(mrObj.jobNo);
        if (mrObj.workOrderId) billWos.add(mrObj.workOrderId);
      }
    });

    billWos.forEach(woNum => {
      const matchedWo = workOrders.find((w: any) => w.orderNo === woNum || w.id === woNum);
      traces.push({
        type: 'work_order',
        title: 'Work Order',
        reference: woNum,
        subtitle: matchedWo?.title ? `Job • ${matchedWo.title}` : 'Linked Job Traveler',
        statusBadge: { label: matchedWo?.status || 'WO Linked', variant: 'info' },
        navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
      });
    });

    return traces;
  };

  // Traceability for Purchase Order
  const getPoTraces = (po: any): TraceNode[] => {
    const traces: TraceNode[] = [];
    const suppName = getSupplierName(po.supplierId);

    // 1. Linked Supplier
    if (po.supplierId) {
      traces.push({
        type: 'other',
        title: 'Supplier Account',
        reference: suppName,
        subtitle: `Supplier ID: ${po.supplierId}`,
        statusBadge: { label: 'Vendor', variant: 'neutral' },
        navigateUrl: `/inventory/suppliers/${po.supplierId}`
      });
    }

    // 2. Linked Material Requests & Work Orders
    const linkedMrList: string[] = Array.isArray(po.mrIds)
      ? po.mrIds
      : (typeof po.mrIds === 'string'
          ? (() => { try { const m = JSON.parse(po.mrIds); return Array.isArray(m) ? m : [po.mrIds]; } catch { return [po.mrIds]; } })()
          : (po.mrId ? [po.mrId] : []));

    const poWos = new Set<string>();
    linkedMrList.forEach(mrNum => {
      traces.push({
        type: 'mr',
        title: 'Material Request',
        reference: mrNum,
        subtitle: 'Originating Requisition',
        statusBadge: { label: 'MR Linked', variant: 'info' },
        navigateUrl: `/purchasing/mr-builder/${mrNum}`
      });

      const mrObj = mrs.find((m: any) => m.id === mrNum);
      if (mrObj) {
        if (mrObj.workOrderNo) poWos.add(mrObj.workOrderNo);
        if (mrObj.jobNo) poWos.add(mrObj.jobNo);
        if (mrObj.workOrderId) poWos.add(mrObj.workOrderId);
      }
    });

    poWos.forEach(woNum => {
      const matchedWo = workOrders.find((w: any) => w.orderNo === woNum || w.id === woNum);
      traces.push({
        type: 'work_order',
        title: 'Work Order',
        reference: woNum,
        subtitle: matchedWo?.title ? `Job • ${matchedWo.title}` : 'Linked Job Traveler',
        statusBadge: { label: matchedWo?.status || 'WO Linked', variant: 'info' },
        navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
      });
    });

    // 3. Linked GRNs
    const matchedGrns = grns.filter((g: any) => g.poId === po.id || (po.grnNos && po.grnNos.includes(g.id)));
    matchedGrns.forEach(g => {
      traces.push({
        type: 'grn',
        title: 'Goods Received Note',
        reference: g.id,
        subtitle: `Carrier: ${g.carrier || 'Delivery'}`,
        statusBadge: { label: 'Received', variant: 'success' },
        navigateUrl: `/purchasing?tab=grn&search=${encodeURIComponent(g.id)}`
      });
    });

    // 4. Linked Supplier Bills
    const matchedBills = bills.filter((b: any) => b.poId === po.id || (po.invoiceNos && po.invoiceNos.includes(b.invoiceNo)));
    matchedBills.forEach(b => {
      traces.push({
        type: 'bill',
        title: 'Supplier Invoice / Bill',
        reference: b.invoiceNo || b.id,
        subtitle: `Amount: ${formatCurrency(Number(b.totalAmount || 0))} • Status: ${b.status || 'Pending'}`,
        statusBadge: { label: b.status === 'paid' ? 'Paid' : 'Unpaid', variant: b.status === 'paid' ? 'success' : 'warning' },
        navigateUrl: `/purchasing/bill-builder/${b.id}`
      });
    });

    return traces;
  };

  const agingColumns: Column<any>[] = [
    {
      key: 'partyName', header: 'Supplier', sortable: true,
      render: (_, row) => (
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate(`/inventory/suppliers/${row.partyId}`)}
          title="Click to view Supplier Profile & Ledger"
        >
          <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs rounded-none group-hover:scale-105 transition-transform">
            {row.partyName ? row.partyName.substring(0,2).toUpperCase() : 'SU'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug group-hover:text-amber-600 transition-colors">{row.partyName}</p>
            <p className="text-[10px] text-muted truncate mt-0.5 font-mono">Supplier ID: {row.partyId}</p>
          </div>
        </div>
      )
    },
    { key: 'bucket30', header: '0-30 Days', align: 'right', sortable: true, render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket60', header: '31-60 Days', align: 'right', sortable: true, render: v => <span className="text-xs text-muted font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90', header: '61-90 Days', align: 'right', sortable: true, render: v => <span className="text-xs text-amber-500 font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'bucket90plus', header: '90+ Days (Overdue)', align: 'right', sortable: true, render: v => <span className="text-xs text-red-500 font-bold font-mono">{Number(v) > 0 ? formatCurrency(Number(v)) : '-'}</span> },
    { key: 'balance', header: 'Total Outstanding', align: 'right', sortable: true, render: v => <span className="text-sm font-black text-amber-600 font-mono">{formatCurrency(Number(v))}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-600 border border-amber-500/30 hover:bg-amber-500/10 text-xs font-semibold rounded-none" 
            onClick={(e) => {
              e.stopPropagation();
              const supp = suppliers.find((s: any) => s.id === row.partyId || s.name === row.partyName || s.company === row.partyName) || { id: row.partyId, company: row.partyName, name: row.partyName };
              setMultiSettlementSupplier(supp);
              setShowMultiSettlement(true);
            }}
          >
            Pay / Settle
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-500/10 text-xs font-medium rounded-none px-2" 
            title="View Supplier Profile / Ledger"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inventory/suppliers/${row.partyId}`);
            }}
          >
            Ledger
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ArrowDownRight size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary tracking-tight">Accounts Payable (AP)</h1>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold rounded-none">
                Supplier Bills & Liabilities
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Live vendor aging breakdown, unpaid supplier bills, purchase orders liabilities, and cross-module traceability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => { loadAging(); refetchBills(); refetchPOs(); }}
            className="text-xs border border-theme-subtle hover:bg-surface2"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={BarChart3}
            onClick={() => navigate('/finance/reports?tab=vendor_bills')}
            className="text-xs border-theme-subtle text-amber-600 font-bold"
          >
            AP Aging Reports
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={CreditCard}
            onClick={() => {
              setMultiSettlementSupplier(null);
              setShowMultiSettlement(true);
            }}
            className="text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20"
          >
            Pay Multiple Bills
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/purchasing/bill-builder')}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            + New Supplier Bill
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Total Payables Due</span>
            <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(totalPayable)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-none bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
            <DollarSign size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Overdue (90+ Days)</span>
            <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(totalOverdue)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-none bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Supplier Bills</span>
            <div className="text-2xl font-mono font-bold text-primary mt-1">{bills.length}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-surface2 text-secondary border border-theme-subtle flex items-center justify-center">
            <FileText size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted font-medium">Active Purchase Orders</span>
            <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">{pos.length}</div>
          </div>
          <div className="w-10 h-10 rounded-none bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
        </GlassCard>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-theme-subtle">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'aging'
                ? 'border-amber-500 text-amber-600 bg-amber-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            Supplier Aging Breakdown ({agingData.length})
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'bills'
                ? 'border-amber-500 text-amber-600 bg-amber-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            <FileText size={13} />
            Supplier Bills & Payables ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pos'
                ? 'border-blue-500 text-blue-600 bg-blue-500/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface2/50'
            }`}
          >
            <ShoppingCart size={13} />
            Purchase Orders ({pos.length})
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 pb-2">
          <SearchBar placeholder="Search supplier, bill, PO..." value={search} onChange={setSearch} className="w-64" />
          {activeTab === 'aging' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setFilterType('all')} 
                className={`px-2.5 py-1 text-xs border rounded-none transition-colors ${filterType === 'all' ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 font-bold' : 'bg-surface border-theme-subtle text-muted'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('overdue')} 
                className={`px-2.5 py-1 text-xs border rounded-none transition-colors ${filterType === 'overdue' ? 'bg-red-500/15 border-red-500/40 text-red-500 font-bold' : 'bg-surface border-theme-subtle text-muted'}`}
              >
                Overdue (90+)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: SUPPLIER AGING BREAKDOWN */}
      {activeTab === 'aging' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingAging ? (
            <div className="p-12 text-center text-muted animate-pulse">Calculating Accounts Payable aging breakdown...</div>
          ) : filteredAging.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-primary">No Outstanding Payables Found</p>
              <p className="text-xs text-muted mt-1">All supplier accounts and vendor bills are settled.</p>
            </div>
          ) : (
            <DataTable columns={agingColumns} data={filteredAging} keyExtractor={row => row.partyId || row.partyName} />
          )}
        </GlassCard>
      )}

      {/* TAB 2: SUPPLIER BILLS & TRACEABILITY */}
      {activeTab === 'bills' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingBills ? (
            <div className="p-12 text-center text-muted animate-pulse">Loading supplier bills...</div>
          ) : filteredAndSortedBills.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={36} className="text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-primary">No Supplier Bills Recorded</p>
              <p className="text-xs text-muted mt-1">Click "+ New Supplier Bill" to enter incoming vendor invoices against POs or direct expenses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50 text-[10.5px] uppercase tracking-wider text-muted font-bold">
                    <th 
                      onClick={() => handleBillSort('invoiceNo')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Bill / Invoice # {billSortField === 'invoiceNo' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleBillSort('supplier')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Supplier {billSortField === 'supplier' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleBillSort('poId')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      PO Reference {billSortField === 'poId' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleBillSort('date')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Bill Date {billSortField === 'date' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleBillSort('dueDate')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Due Date {billSortField === 'dueDate' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleBillSort('totalAmount')} 
                      className="px-4 py-3 text-right cursor-pointer hover:text-primary select-none"
                    >
                      Total Amount {billSortField === 'totalAmount' ? (billSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="px-4 py-3 text-center">Payment Status</th>
                    <th className="px-4 py-3 text-center">Traceability</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle text-xs">
                  {filteredAndSortedBills.map((b: any) => {
                    const traces = getBillTraces(b);
                    const suppName = getSupplierName(b.supplierId);
                    const tot = Number(b.totalAmount || 0);

                    return (
                      <tr key={b.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {b.invoiceNo || b.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          <button
                            onClick={() => navigate(`/inventory/suppliers/${b.supplierId}`)}
                            className="hover:text-amber-600 hover:underline text-left"
                          >
                            {suppName}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {b.poId ? (
                            <button
                              onClick={() => navigate(`/purchasing/po-builder/${b.poId}`)}
                              className="text-blue-600 hover:underline"
                            >
                              PO: {b.poId}
                            </button>
                          ) : (
                            <span className="text-muted">Direct Bill</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {formatDate(b.date || b.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {b.dueDate ? formatDate(b.dueDate) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(tot)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={b.status === 'paid' ? 'success' : 'warning'} size="sm">
                            {b.status === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <TraceabilityDropdown 
                              title={`Traceability for Bill ${b.invoiceNo || b.id}`}
                              traces={traces}
                              compact
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs border border-theme-subtle hover:bg-surface2"
                              onClick={() => navigate(`/purchasing/bill-builder/${b.id}`)}
                            >
                              View
                            </Button>
                            {b.status !== 'paid' && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 py-1 px-2.5 rounded-none"
                                onClick={() => setPaymentBill(b)}
                              >
                                <CreditCard size={12} />
                                <span>Pay</span>
                              </Button>
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
      )}

      {/* TAB 3: PURCHASE ORDERS WITH TRACEABILITY */}
      {activeTab === 'pos' && (
        <GlassCard className="overflow-hidden p-0 border border-theme-subtle">
          {loadingPOs ? (
            <div className="p-12 text-center text-muted animate-pulse">Loading purchase orders...</div>
          ) : filteredAndSortedPOs.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart size={36} className="text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-primary">No Purchase Orders Found</p>
              <p className="text-xs text-muted mt-1">Purchase orders issued to vendors will appear here with live billing and delivery status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/50 text-[10.5px] uppercase tracking-wider text-muted font-bold">
                    <th 
                      onClick={() => handlePoSort('id')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      PO # {poSortField === 'id' ? (poSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handlePoSort('supplier')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Supplier {poSortField === 'supplier' ? (poSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handlePoSort('date')} 
                      className="px-4 py-3 cursor-pointer hover:text-primary select-none"
                    >
                      Order Date {poSortField === 'date' ? (poSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handlePoSort('totalAmount')} 
                      className="px-4 py-3 text-right cursor-pointer hover:text-primary select-none"
                    >
                      PO Value {poSortField === 'totalAmount' ? (poSortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="px-4 py-3 text-center">Receipt Status</th>
                    <th className="px-4 py-3 text-center">Invoicing</th>
                    <th className="px-4 py-3 text-center">Traceability</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-subtle text-xs">
                  {filteredAndSortedPOs.map((p: any) => {
                    const traces = getPoTraces(p);
                    const suppName = getSupplierName(p.supplierId);
                    const tot = Number(p.totalAmount || 0);

                    return (
                      <tr key={p.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {p.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          <button
                            onClick={() => navigate(`/inventory/suppliers/${p.supplierId}`)}
                            className="hover:text-blue-600 hover:underline text-left"
                          >
                            {suppName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted font-mono">
                          {formatDate(p.date || p.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(tot)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={p.status || 'Active'} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={p.billingStatus || 'Unbilled'} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <TraceabilityDropdown 
                              title={`Traceability for PO #${p.id}`}
                              traces={traces}
                              compact
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs border border-theme-subtle hover:bg-surface2"
                            onClick={() => navigate(`/purchasing/po-builder/${p.id}`)}
                          >
                            View PO
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Direct Bill Payment Modal */}
      {paymentBill && (
        <RecordBillPaymentModal
          isOpen={!!paymentBill}
          onClose={() => setPaymentBill(null)}
          bill={paymentBill}
          toast={toast}
          onSuccess={() => {
            refetchBills();
            loadAging();
          }}
        />
      )}

      {/* Multi-Bill Consolidated Settlement Modal */}
      {showMultiSettlement && (
        <MultiBillSettlementModal
          isOpen={showMultiSettlement}
          onClose={() => {
            setShowMultiSettlement(false);
            setMultiSettlementSupplier(null);
          }}
          supplier={multiSettlementSupplier}
          allSuppliers={suppliers}
          openBills={bills}
          onSuccess={() => {
            refetchBills();
            loadAging();
            toast?.('Vendor bills settled successfully!', 'success');
          }}
        />
      )}
    </div>
  );
};
