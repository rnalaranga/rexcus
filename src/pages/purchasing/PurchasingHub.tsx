import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest, Package, Trash2, ChevronDown, Eye, ShoppingCart, PackageCheck, Printer, Paperclip, Edit } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView';
import { POPrintView } from '@/components/purchasing/POPrintView';
import { MRPrintView } from '@/components/purchasing/MRPrintView';
import { SupplierGRNPrintView } from '@/components/purchasing/SupplierGRNPrintView';
import { GatePassPrintView } from '@/components/GatePassPrintView';
import { useSettings } from '@/contexts/SettingsContext';
import { printElement } from '@/lib/printElement';
import { exportToPdf } from '@/lib/exportToPdf';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useMaterialRequests, usePurchaseOrders, useGRNs, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';
import { fetchAllCustomerGRNs, fetchGatePasses, deleteGatePass, deleteGRN, deleteCustomerGRN, deleteBill, deletePO, deleteMR } from '@/lib/api';
import { formatCurrency, relativeTime, formatDate, openDataUriOrUrl } from '@/lib/utils';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { PageHelpButton } from '@/components/help/PageHelpButton';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/components/ui/DialogProvider';
import { RecordBillPaymentModal } from '@/components/purchasing/RecordBillPaymentModal';
import { RecordPoAdvanceModal } from '@/components/purchasing/RecordPoAdvanceModal';
import { PaymentVoucherPrintModal } from '@/components/finance/PaymentVoucherPrintModal';
import { ViewVendorBillModal } from '@/components/purchasing/ViewVendorBillModal';

type Tab = 'po' | 'mr' | 'grn' | 'bill' | 'gate_pass';
type StatusFilter = 'all' | 'draft' | 'pending' | 'approved' | 'partially_ordered' | 'ordered' | 'partially_received' | 'rejected' | 'sent' | 'received' | 'unpaid' | 'paid';

export const PurchasingHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    if (t === 'mr' || t === 'po' || t === 'grn' || t === 'bill' || t === 'gate_pass') return t as Tab;
    return 'po';
  });
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [grnSourceFilter, setGrnSourceFilter] = useState<'all' | 'vendor' | 'sample'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentBill, setPaymentBill] = useState<any | null>(null);
  const [advancePo, setAdvancePo] = useState<any | null>(null);
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);
  const [viewingBill, setViewingBill] = useState<any | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin') ||
    user?.role === 'superadmin' ||
    user?.role === 'director'
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'mr' || t === 'po' || t === 'grn' || t === 'bill' || t === 'gate_pass') {
      setActiveTab(t as Tab);
    }
    const s = searchParams.get('search') || searchParams.get('id');
    if (s !== null && s !== undefined) {
      setSearch(s);
    }
  }, [searchParams]);

  const { showConfirm, toast } = useDialog();
  const { data: mrs, loading: loadingMRs, refetch: refetchMRs } = useMaterialRequests();
  const { data: pos, loading: loadingPOs, refetch: refetchPOs } = usePurchaseOrders();
  const { data: grns, loading: loadingGRNs, refetch: refetchGRNs } = useGRNs();
  const { data: bills, loading: loadingBills, refetch: refetchBills } = useBills();
  const { data: suppliers } = useSuppliers();

  const { settings } = useSettings();
  const [printGrnData, setPrintGrnData] = useState<any>(null);
  const [printPoData, setPrintPoData] = useState<any>(null);
  const [printMrData, setPrintMrData] = useState<any>(null);
  const [printSupplierGrnData, setPrintSupplierGrnData] = useState<any>(null);
  const [printGatePassData, setPrintGatePassData] = useState<any>(null);
  const [custGrns, setCustGrns] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);

  useEffect(() => {
    fetchAllCustomerGRNs().then(setCustGrns).catch(console.error);
    fetchGatePasses().then(data => setGatePasses(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  const refetchGatePasses = () => {
    fetchGatePasses().then(data => setGatePasses(Array.isArray(data) ? data : [])).catch(console.error);
  };

  const handleDeletePO = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to permanently delete Purchase Order "${id}"?\n\nThis will remove the PO and recalculate fulfillment statuses on linked Material Requests.`,
      'Delete Purchase Order',
      { confirmLabel: 'Delete PO', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deletePO(id);
      toast(`Purchase Order ${id} has been deleted successfully.`, 'success');
      refetchPOs();
      refetchMRs();
    } catch (e: any) {
      toast(e.message || 'Failed to delete Purchase Order', 'error');
    }
  };

  const handleDeleteMR = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Material Request "${id}"?`,
      'Delete Material Request',
      { confirmLabel: 'Delete MR', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteMR(id);
      toast(`Material Request ${id} has been deleted successfully.`, 'success');
      refetchMRs();
    } catch (e: any) {
      toast(e.message || 'Failed to delete Material Request', 'error');
    }
  };

  const handleDeleteSupplierGRN = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Goods Receipt "${id}"?\n\nThis will revert received stock in inventory and update the PO fulfillment status.`,
      'Delete Goods Receipt',
      { confirmLabel: 'Delete GRN', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteGRN(id);
      toast(`GRN ${id} has been deleted and inventory stock reverted.`, 'success');
      refetchGRNs();
      refetchPOs();
    } catch (e: any) {
      toast(e.message || 'Failed to delete GRN', 'error');
    }
  };

  const handleDeleteCustomerGRN = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Customer Sample GRN "${id}"?`,
      'Delete Customer Sample GRN',
      { confirmLabel: 'Delete Sample GRN', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteCustomerGRN(id);
      setCustGrns(prev => prev.filter(g => g.id !== id));
      toast(`Customer Sample GRN ${id} has been deleted.`, 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to delete customer sample GRN', 'error');
    }
  };

  const handleDeleteBill = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to delete Supplier Bill "${id}"?\n\nThis will revert the entry in the supplier ledger and recalculate the PO billing status.`,
      'Delete Supplier Bill',
      { confirmLabel: 'Delete Bill', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteBill(id);
      toast(`Bill ${id} has been deleted successfully.`, 'success');
      refetchBills();
      refetchPOs();
    } catch (e: any) {
      toast(e.message || 'Failed to delete Bill', 'error');
    }
  };

  const handleDeleteGatePass = async (id: string) => {
    const ok = await showConfirm(
      `Are you sure you want to permanently delete Gate Pass "${id}"?`,
      'Delete Gate Pass',
      { confirmLabel: 'Delete GP', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await deleteGatePass(id);
      toast(`Gate Pass ${id} has been deleted successfully.`, 'success');
      refetchGatePasses();
    } catch (e: any) {
      toast(e.message || 'Failed to delete Gate Pass', 'error');
    }
  };

  const getSupplierName = (id: string) => suppliers.find((s: any) => s.id === id)?.name || id;
  const getSupplierContact = (id: string) => suppliers.find((s: any) => s.id === id)?.email || 'N/A';

  const loading = loadingMRs || loadingPOs || loadingGRNs || loadingBills;


  const handleAdd = () => {
    switch (activeTab) {
      case 'po': navigate('/purchasing/po-builder'); break;
      case 'mr': navigate('/purchasing/mr-builder'); break;
      case 'grn': navigate('/purchasing/grn-builder'); break;
      case 'bill': navigate('/purchasing/bill-builder'); break;
      case 'gate_pass': navigate('/inventory?tab=customer_sample'); break;
    }
  };

  const combinedGrns = useMemo(() => {
    const sGrns = grns.map((g: any) => ({ ...g, isCustomerSample: false }));
    const cGrns = custGrns.map((g: any) => ({ ...g, isCustomerSample: true }));
    return [...sGrns, ...cGrns].sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }, [grns, custGrns]);

  const currentData = activeTab === 'po' 
    ? pos 
    : activeTab === 'mr' 
      ? mrs 
      : activeTab === 'grn' 
        ? combinedGrns 
        : activeTab === 'bill' 
          ? bills 
          : gatePasses;

  const filtered = currentData.filter((item: any) => {
    const term = search.trim().toLowerCase();
    const matchSearch = !term || [
      item.id,
      item.mrNo,
      item.poNo,
      item.grnNo,
      item.billNo,
      item.invoiceNo,
      item.orderNo,
      item.jobNo,
      item.workOrderNo,
      item.supplierId, 
      getSupplierName(item.supplierId), 
      item.status, 
      item.requestedBy, 
      item.quoNo,
      item.customerName,
      item.customerCompany,
      item.leadName,
      item.vehicleNo,
      item.carrier,
      item.attention
    ].some(v => v && String(v).toLowerCase().includes(term));

    const matchStatus = statusFilter === 'all' || item.status?.toLowerCase() === statusFilter.toLowerCase();

    let matchSupplier = true;
    if (supplierFilter !== 'all') {
      matchSupplier = item.supplierId === supplierFilter;
    }

    let matchGrnSource = true;
    if (activeTab === 'grn' && grnSourceFilter !== 'all') {
      if (grnSourceFilter === 'sample') {
        matchGrnSource = Boolean(item.isCustomerSample);
      } else if (grnSourceFilter === 'vendor') {
        matchGrnSource = !item.isCustomerSample;
      }
    }

    let matchDate = true;
    const itemDate = (item.date || item.createdAt || item.receivedAt || '').slice(0, 10);
    if (startDate && itemDate) {
      matchDate = matchDate && itemDate >= startDate;
    }
    if (endDate && itemDate) {
      matchDate = matchDate && itemDate <= endDate;
    }

    return matchSearch && matchStatus && matchSupplier && matchGrnSource && matchDate;
  });

  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [actionCoords, setActionCoords] = useState<{ top: number; bottom: number; left: number; right: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.purchasing-action-menu-dropdown') && !target.closest('.purchasing-action-trigger-btn')) {
        setOpenActionId(null);
        setActionCoords(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    const handleScroll = () => {
      setOpenActionId(null);
      setActionCoords(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const renderActionsDropdown = (tab: Tab, row: any) => {
    const isOpen = openActionId === row.id;

    let menuStyle: React.CSSProperties = {};
    if (isOpen && actionCoords) {
      const PADDING = 8;
      const MENU_WIDTH = 220;

      let left = actionCoords.right - MENU_WIDTH;
      if (left < PADDING) left = PADDING;
      if (left + MENU_WIDTH > window.innerWidth - PADDING) {
        left = window.innerWidth - MENU_WIDTH - PADDING;
      }

      const spaceBelow = window.innerHeight - actionCoords.bottom - PADDING;
      const spaceAbove = actionCoords.top - PADDING;
      const openUpwards = spaceBelow < 300 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(480, Math.max(220, (openUpwards ? spaceAbove : spaceBelow) - 10));

      menuStyle = {
        position: 'fixed',
        left: `${left}px`,
        width: `${MENU_WIDTH}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 99999,
        ...(openUpwards 
          ? { bottom: `${window.innerHeight - actionCoords.top + 4}px` } 
          : { top: `${actionCoords.bottom + 4}px` }
        )
      };
    }

    const closeDropdown = () => {
      setOpenActionId(null);
      setActionCoords(null);
    };

    return (
      <div 
        className="relative inline-block text-left" 
        data-no-row-click="true"
        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button
          type="button"
          data-no-row-click="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (openActionId === row.id) {
              closeDropdown();
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setOpenActionId(row.id);
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
          className={`purchasing-action-trigger-btn relative h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none cursor-pointer ${
            isOpen
              ? 'bg-rex-600 text-white border-rex-600'
              : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
          }`}
          title="Actions"
        >
          <span>Actions</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && actionCoords && typeof document !== 'undefined' && createPortal(
          <div
            data-no-row-click="true"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={menuStyle}
            className="purchasing-action-menu-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1.5 text-left rounded-none animate-in fade-in zoom-in-95 duration-100 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar"
          >
            {tab === 'po' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  PO Actions (#{row.id})
                </div>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    const supp = suppliers.find((s: any) => s.id === row.supplierId);
                    setPrintPoData({ po: row, supplier: supp });
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Eye size={13} className="text-zinc-400" />
                  <span>View PO</span>
                </button>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/po-builder/${row.id}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Edit size={13} className="text-indigo-500" />
                  <span>Edit PO</span>
                </button>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    const supp = suppliers.find((s: any) => s.id === row.supplierId);
                    setPrintPoData({ po: row, supplier: supp });
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Printer size={13} className="text-blue-500" />
                  <span>View PDF / Print PO</span>
                </button>

                {row.status?.toLowerCase() !== 'draft' && row.status?.toLowerCase() !== 'received' && (
                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/grn-builder?po=${row.id}`); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <PackageCheck size={13} className="text-emerald-500" />
                    <span>{row.status?.toLowerCase() === 'partially_received' ? 'Receive Balance (GRN)' : 'Receive GRN'}</span>
                  </button>
                )}

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    setAdvancePo(row);
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-bold"
                >
                  <CreditCard size={13} className="text-emerald-500" />
                  <span>Pay Vendor Advance (+ Voucher)</span>
                </button>

                {Array.isArray(row.advanceVouchers) && row.advanceVouchers.length > 0 && (
                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDropdown();
                      const latestV = row.advanceVouchers[row.advanceVouchers.length - 1];
                      setPrintVoucher({
                        ...latestV,
                        payeeName: getSupplierName(row.supplierId),
                        category: 'PO Advance Payment',
                        relatedBillNo: `PO: ${row.id}`,
                      });
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Printer size={13} className="text-purple-500" />
                    <span>Print Advance Voucher ({row.advanceVouchers[row.advanceVouchers.length - 1].voucherNo})</span>
                  </button>
                )}

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/bill-builder?po=${row.id}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <CreditCard size={13} className="text-amber-500" />
                  <span>Record Vendor Bill (+ Bill)</span>
                </button>

                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); handleDeletePO(row.id); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      <span>Delete PO</span>
                    </button>
                  </>
                )}
              </>
            )}

            {tab === 'mr' && (() => {
              const linkedPoList: string[] = Array.isArray(row.poIds) 
                ? row.poIds 
                : (typeof row.poIds === 'string'
                    ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                    : (row.poId ? [row.poId] : []));

              return (
                <>
                  <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                    MR Actions (#{row.id})
                  </div>

                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); setPrintMrData(row); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Eye size={13} className="text-zinc-400" />
                    <span>View MR</span>
                  </button>

                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/mr-builder/${row.id}`); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Edit size={13} className="text-indigo-500" />
                    <span>Edit MR</span>
                  </button>

                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDropdown();
                      setPrintMrData(row);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Printer size={13} className="text-blue-500" />
                    <span>View PDF / Print MR</span>
                  </button>

                  {row.status?.toLowerCase() !== 'ordered' ? (
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/po-builder?mr=${row.id}`); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <ShoppingCart size={13} className="text-blue-500" />
                      <span>{row.status === 'partially_ordered' ? 'Order Balance (PO)' : 'Create PO'}</span>
                    </button>
                  ) : (
                    linkedPoList.length > 0 && (
                      <button
                        type="button"
                        data-no-row-click="true"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/po-builder/${linkedPoList[linkedPoList.length - 1]}`); }}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <ShoppingCart size={13} className="text-emerald-500" />
                        <span>{linkedPoList.length > 1 ? `View POs (${linkedPoList.length})` : 'View PO'}</span>
                      </button>
                    )
                  )}

                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                      <button
                        type="button"
                        data-no-row-click="true"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); handleDeleteMR(row.id); }}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <Trash2 size={13} className="text-rose-500" />
                        <span>Delete MR</span>
                      </button>
                    </>
                  )}
                </>
              );
            })()}

            {tab === 'grn' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  GRN Actions (#{row.id})
                </div>

                {row.isCustomerSample ? (
                  <>
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDropdown();
                        setPrintGrnData({ grn: row, group: { quoNo: row.quoNo, leadId: row.leadId, leadName: row.customerName || row.leadName } });
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <FileText size={13} className="text-blue-500" />
                      <span>View PDF / Print GRN</span>
                    </button>

                    {(row.gatePassId || row.status === 'Dispatched') && (
                      <button
                        type="button"
                        data-no-row-click="true"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          closeDropdown();
                          const foundGp = gatePasses.find((gp: any) => gp.id === row.gatePassId || gp.grnId === row.id) || {
                            id: row.gatePassId || `GP-${row.id}`,
                            customerCompany: row.customerCompany || row.customerName,
                            attention: row.attention,
                            quoNo: row.quoNo,
                            grnId: row.id,
                            items: row.items,
                            issuedDate: row.updatedAt || row.createdAt
                          };
                          setPrintGatePassData(foundGp);
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <Truck size={13} className="text-emerald-500" />
                        <span>View PDF / Print Gate Pass</span>
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                        <button
                          type="button"
                          data-no-row-click="true"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); handleDeleteCustomerGRN(row.id); }}
                          className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                        >
                          <Trash2 size={13} className="text-rose-500" />
                          <span>Delete Sample GRN</span>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDropdown();
                        const supp = suppliers.find((s: any) => s.id === row.supplierId);
                        setPrintSupplierGrnData({ grn: row, supplier: supp });
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Eye size={13} className="text-zinc-400" />
                      <span>View GRN</span>
                    </button>

                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/grn-builder/${row.id}`); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Edit size={13} className="text-indigo-500" />
                      <span>Edit GRN</span>
                    </button>

                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDropdown();
                        const supp = suppliers.find((s: any) => s.id === row.supplierId);
                        setPrintSupplierGrnData({ grn: row, supplier: supp });
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Printer size={13} className="text-blue-500" />
                      <span>View PDF / Print GRN</span>
                    </button>

                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/bill-builder?grn=${row.id}`); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <CreditCard size={13} className="text-emerald-500" />
                      <span>Create Vendor Bill</span>
                    </button>

                    {row.billAttachment && (
                      <button
                        type="button"
                        data-no-row-click="true"
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          closeDropdown(); 
                          openDataUriOrUrl(row.billAttachment, `Vendor Document - ${row.id}`); 
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <Paperclip size={13} className="text-emerald-500" />
                        <span>View Attached Vendor Doc</span>
                      </button>
                    )}

                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                        <button
                          type="button"
                          data-no-row-click="true"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); handleDeleteSupplierGRN(row.id); }}
                          className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                        >
                          <Trash2 size={13} className="text-rose-500" />
                          <span>Delete GRN</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {tab === 'gate_pass' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Gate Pass Actions (#{row.id})
                </div>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    setPrintGatePassData(row);
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Eye size={13} className="text-zinc-400" />
                  <span>View Gate Pass</span>
                </button>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeDropdown();
                    setPrintGatePassData(row);
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Printer size={13} className="text-blue-500" />
                  <span>View PDF / Print Gate Pass</span>
                </button>

                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDropdown();
                        handleDeleteGatePass(row.id);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      <span>Delete Gate Pass</span>
                    </button>
                  </>
                )}
              </>
            )}

            {tab === 'bill' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Bill Actions (#{row.id})
                </div>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); setViewingBill(row); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-primary hover:bg-surface2 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <Eye size={13} className="text-primary" />
                  <span>View Bill Details (Preview)</span>
                </button>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/bill-builder?id=${row.id}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <FileText size={13} className="text-blue-500" />
                  <span>Edit in Bill Builder</span>
                </button>

                {row.billAttachment && (
                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      closeDropdown(); 
                      openDataUriOrUrl(row.billAttachment, `Vendor Bill - ${row.invoiceNo || row.id}`); 
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                  >
                    <Paperclip size={13} className="text-emerald-500" />
                    <span>View Attached Vendor Bill</span>
                  </button>
                )}

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    closeDropdown(); 
                    setPaymentBill(row); 
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <CreditCard size={13} className="text-emerald-500" />
                  <span>Record Bill Payment</span>
                </button>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/inventory/suppliers/${row.supplierId}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <CreditCard size={13} className="text-amber-500" />
                  <span>View Vendor Ledger</span>
                </button>

                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                    <button
                      type="button"
                      data-no-row-click="true"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); handleDeleteBill(row.id); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      <span>Delete Bill</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const parseItemsArray = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  };

  const renderItemPill = (rawItems: any, fallbackLabel = 'Items') => {
    const items = parseItemsArray(rawItems);
    const first = items[0];
    const label = first?.description || first?.name || first?.itemName || first?.materialName || fallbackLabel;
    const extraCount = Math.max(0, items.length - 1);
    return (
      <div className="flex items-center gap-1.5 max-w-[240px]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/5 border border-blue-500/20 text-xs text-primary min-w-0 flex-1">
          <Package size={12} className="text-blue-500 shrink-0" />
          <span className="truncate font-medium">{label}</span>
        </div>
        {extraCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-surface2 border border-theme-subtle text-[10px] font-mono font-bold text-muted shrink-0">
            +{extraCount}
          </span>
        )}
      </div>
    );
  };

  const renderTaxPills = (row: any) => {
    let sscl = 0;
    let vat = 0;
    if (row.taxBreakdown) {
      try {
        const tb = typeof row.taxBreakdown === 'string' ? JSON.parse(row.taxBreakdown) : row.taxBreakdown;
        sscl = Number(tb?.tax1Amount || tb?.sscl || 0);
        vat = Number(tb?.tax2Amount || tb?.vat || 0);
      } catch {}
    }
    if (sscl === 0 && vat === 0 && Number(row.taxAmount || 0) > 0) {
      vat = Number(row.taxAmount || 0);
    }
    if (sscl <= 0 && vat <= 0) return null;
    return (
      <div className="flex items-center justify-end gap-1 flex-wrap mt-1">
        {sscl > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            SSCL: {formatCurrency(sscl, true)}
          </span>
        )}
        {vat > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            VAT: {formatCurrency(vat, true)}
          </span>
        )}
      </div>
    );
  };

  const generateColumns = (): Column<any>[] => {
    if (activeTab === 'po') {
      return [
        {
          key: 'id', header: 'PO # & Date', sortable: true,
          render: (_, row) => {
            const linkedMrList: string[] = Array.isArray(row.mrIds)
              ? row.mrIds
              : (typeof row.mrIds === 'string'
                  ? (() => { try { const m = JSON.parse(row.mrIds); return Array.isArray(m) ? m : [row.mrIds]; } catch { return [row.mrIds]; } })()
                  : (row.mrId ? [row.mrId] : []));
            const poGrns = combinedGrns.filter((g: any) => !g.isCustomerSample && (g.poId === row.id || (Array.isArray(g.poIds) && g.poIds.includes(row.id))));
            return (
              <div className="min-w-0 leading-tight space-y-0.5">
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${row.id}`); }}
                    className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {row.id}
                  </span>
                  {linkedMrList.slice(0, 1).map((mrNum: string) => (
                    <span
                      key={mrNum}
                      onClick={(e) => { e.stopPropagation(); navigate('/purchasing/mr-builder/' + mrNum); }}
                      className="text-[9.5px] bg-surface2 text-secondary hover:text-primary px-1 py-0 font-mono font-bold border border-theme-subtle cursor-pointer"
                      title="View Material Request"
                    >
                      MR:{mrNum}
                    </span>
                  ))}
                  {poGrns.length > 0 ? (
                    poGrns.slice(0, 1).map((g: any) => (
                      <span
                        key={g.id}
                        onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/grn-builder/${g.id}`); }}
                        className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0 font-mono font-bold border border-emerald-500/30 cursor-pointer"
                      >
                        GRN:{g.id}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0 font-mono font-semibold border border-amber-500/25">
                      GRN Pending
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted font-mono">
                  {formatDate(row.date)}{row.expectedDate ? ` • Exp ${formatDate(row.expectedDate)}` : ''}
                </div>
              </div>
            );
          }
        },
        {
          key: 'supplier', header: 'Supplier', sortable: true,
          render: (_, row) => (
            <div className="min-w-0 max-w-[190px]">
              <p className="text-xs font-bold text-primary uppercase truncate">{getSupplierName(row.supplierId)}</p>
              <p className="text-[11px] text-muted truncate mt-0.5">{getSupplierContact(row.supplierId)}</p>
            </div>
          )
        },
        {
          key: 'items', header: 'Items Ordered',
          render: (_, row) => renderItemPill(row.items, 'Purchase Order Items')
        },
        {
          key: 'qty', header: 'Qty & Receipt', align: 'right',
          render: (_, row) => {
            const items = parseItemsArray(row.items);
            const totalQty = items.reduce((s: number, it: any) => s + Number(it.qty || it.quantity || 0), 0);
            const poGrns = combinedGrns.filter((g: any) => !g.isCustomerSample && (g.poId === row.id || (Array.isArray(g.poIds) && g.poIds.includes(row.id))));
            const recQty = poGrns.reduce((s: number, g: any) => {
              const gItems = parseItemsArray(g.items);
              return s + gItems.reduce((gs: number, gi: any) => gs + Number(gi.receivedQty || gi.qty || gi.quantity || 0), 0);
            }, 0);
            return (
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-primary block">{totalQty > 0 ? `${totalQty.toFixed(2)} pcs` : `${items.length} line(s)`}</span>
                <span className="text-[10.5px] text-muted block mt-0.5">
                  {totalQty > 0 ? `${recQty} / ${totalQty} received` : `${poGrns.length} GRN(s)`}
                </span>
              </div>
            );
          }
        },
        {
          key: 'totalAmount', header: 'Value & Tax / Paid', align: 'right', sortable: true,
          render: (v, row) => {
            const matchedBills = bills.filter((b: any) => b.poId === row.id || (row.invoiceNos && row.invoiceNos.includes(b.invoiceNo)));
            const billPaid = matchedBills.reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0);
            const advPaid = Number(row.advancePaid || 0);
            const advVouchers: any[] = Array.isArray(row.advanceVouchers) ? row.advanceVouchers : [];
            const totalPaid = Math.max(billPaid, advPaid);
            return (
              <div className="text-right">
                <span className="text-xs font-black font-mono text-primary block">{formatCurrency(Number(v || 0))}</span>
                {renderTaxPills(row)}
                {advPaid > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (advVouchers.length > 0) {
                        const latestV = advVouchers[advVouchers.length - 1];
                        setPrintVoucher({
                          ...latestV,
                          payeeName: getSupplierName(row.supplierId),
                          category: 'PO Advance Payment',
                          relatedBillNo: `PO: ${row.id}`,
                        });
                      } else {
                        setAdvancePo(row);
                      }
                    }}
                    className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
                    title="Click to View / Print PO Advance Payment Voucher"
                  >
                    Adv Paid: {formatCurrency(advPaid, true)}
                  </button>
                )}
                {billPaid > 0 && billPaid > advPaid && (
                  <span className="inline-block mt-1 ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/25">
                    Paid: {formatCurrency(totalPaid, true)}
                  </span>
                )}
              </div>
            );
          }
        },
        {
          key: 'traceability', header: 'Traceability', align: 'center',
          render: (_: any, row: any) => {
            const traces: TraceNode[] = [];
            const linkedMrList: string[] = Array.isArray(row.mrIds)
              ? row.mrIds
              : (typeof row.mrIds === 'string'
                  ? (() => { try { const m = JSON.parse(row.mrIds); return Array.isArray(m) ? m : [row.mrIds]; } catch { return [row.mrIds]; } })()
                  : (row.mrId ? [row.mrId] : []));
            
            linkedMrList.forEach(mrId => {
              traces.push({
                type: 'mr',
                title: 'Material Request',
                reference: mrId,
                subtitle: 'Source Request',
                statusBadge: { label: 'MR', variant: 'info' },
                navigateUrl: `/purchasing/mr-builder/${mrId}`
              });
            });

            // Linked Work Orders from MRs
            const linkedWos = new Set<string>();
            linkedMrList.forEach(mrId => {
              const mrObj = mrs.find((m: any) => m.id === mrId);
              if (mrObj) {
                if (mrObj.workOrderNo) linkedWos.add(mrObj.workOrderNo);
                if (mrObj.jobNo) linkedWos.add(mrObj.jobNo);
                if (mrObj.workOrderId) linkedWos.add(mrObj.workOrderId);
                if (mrObj.workOrderNos) {
                  try {
                    const wNos = typeof mrObj.workOrderNos === 'string' ? JSON.parse(mrObj.workOrderNos) : mrObj.workOrderNos;
                    if (Array.isArray(wNos)) wNos.forEach((w: string) => linkedWos.add(w));
                  } catch {}
                }
              }
            });
            linkedWos.forEach(woNum => {
              traces.push({
                type: 'work_order',
                title: 'Production Job',
                reference: woNum,
                subtitle: 'Linked Work Order',
                statusBadge: { label: 'WO Linked', variant: 'info' },
                navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
              });
            });

            const matchedGrns = combinedGrns.filter((g: any) => g.poId === row.id || (g.poIds && g.poIds.includes(row.id)));
            matchedGrns.forEach((g: any) => {
              traces.push({
                type: 'grn',
                title: 'Goods Receipt',
                reference: g.id,
                subtitle: `Received: ${g.date || g.createdAt || ''}`,
                statusBadge: { label: g.status || 'Received', variant: 'success' },
                navigateUrl: `/purchasing/grn-builder/${g.id}`
              });
            });

            const matchedBills = bills.filter((b: any) => b.poId === row.id || (row.invoiceNos && row.invoiceNos.includes(b.invoiceNo)));
            matchedBills.forEach((b: any) => {
              const bTotal = Number(b.totalAmount || b.amount || 0);
              const bPaid = Number(b.paidAmount || 0);
              traces.push({
                type: 'bill',
                title: 'Vendor Bill',
                reference: b.invoiceNo || b.id,
                subtitle: `Bill: ${formatCurrency(bTotal)} | Paid: ${formatCurrency(bPaid)}`,
                statusBadge: { label: bPaid >= bTotal - 0.01 && bTotal > 0 ? 'Paid' : bPaid > 0 ? 'Partial Paid' : (b.status || 'Unpaid'), variant: bPaid >= bTotal - 0.01 && bTotal > 0 ? 'success' : 'warning' },
                navigateUrl: `/purchasing/bill-builder/${b.id}`
              });
            });

            const advVouchers: any[] = Array.isArray(row.advanceVouchers) ? row.advanceVouchers : [];
            advVouchers.forEach((v: any) => {
              traces.push({
                type: 'receipt',
                title: 'PO Advance Payment Voucher',
                reference: v.voucherNo || v.id,
                subtitle: `Advance Paid: ${formatCurrency(Number(v.amount || 0))} • ${v.paymentMethod || 'Bank Transfer'}`,
                statusBadge: { label: 'Advance Paid', variant: 'success' },
                onClick: () => setPrintVoucher({
                  ...v,
                  payeeName: getSupplierName(row.supplierId),
                  category: 'PO Advance Payment',
                  relatedBillNo: `PO: ${row.id}`
                })
              });
            });

            return (
              <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                <TraceabilityDropdown
                  title={`Purchase Order #${row.id}`}
                  traces={traces}
                />
              </div>
            );
          }
        },
        {
          key: 'status', header: 'Status', align: 'center',
          render: (v, row) => {
            const matchedBills = bills.filter((b: any) => b.poId === row.id || (row.invoiceNos && row.invoiceNos.includes(b.invoiceNo)));
            const billed = matchedBills.length > 0
              ? matchedBills.reduce((s: number, b: any) => s + Number(b.amount || b.totalAmount || 0), 0)
              : Number(row.billedAmount || 0);
            const billPaid = matchedBills.reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0);
            const advPaid = Number(row.advancePaid || 0);
            const total = Number(row.totalAmount || 0);
            const bStatus = row.billingStatus || (billed >= total - 0.01 && total > 0 ? 'billed' : billed > 0 ? 'partially_billed' : 'unbilled');
            const pStatus = (billPaid >= billed - 0.01 && billed > 0) || (advPaid >= total - 0.01 && total > 0)
              ? 'Paid'
              : (billPaid > 0 || advPaid > 0)
              ? 'Adv / Partial'
              : 'Unpaid';
            return (
              <div className="flex flex-col items-center gap-1">
                <Badge value={String(v)} size="sm" />
                <span className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded border ${
                  bStatus === 'billed'
                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/25'
                    : bStatus === 'partially_billed'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                    : advPaid > 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-surface2 text-muted border-theme-subtle'
                }`}>
                  {bStatus === 'billed'
                    ? `Billed • ${pStatus}`
                    : bStatus === 'partially_billed'
                    ? `Part. Billed • ${pStatus}`
                    : advPaid > 0
                    ? (advPaid >= total - 0.01 && total > 0 ? 'Advance Paid (Full)' : 'Advance Paid')
                    : 'Unbilled'}
                </span>
              </div>
            );
          }
        },
        {
          key: 'actions', header: 'Actions', align: 'right',
          render: (_, row) => (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setAdvancePo(row)}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Pay Vendor Advance & Issue Payment Voucher for this PO"
              >
                <CreditCard size={11} /> Pay Adv
              </button>
              {row.status !== 'received' && (
                <button
                  type="button"
                  onClick={() => navigate(`/purchasing/grn-builder?poId=${encodeURIComponent(row.id)}`)}
                  className="px-2.5 py-1 rounded bg-rex-600 hover:bg-rex-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Truck size={12} /> Receive GRN
                </button>
              )}
              {renderActionsDropdown('po', row)}
            </div>
          )
        }
      ];
    }
    if (activeTab === 'mr') {
      return [
        {
          key: 'id', header: 'MR # & Date', sortable: true,
          render: (_, row) => {
            const linkedWoList: string[] = Array.isArray(row.workOrderNos)
              ? row.workOrderNos
              : (typeof row.workOrderNos === 'string'
                  ? (() => { try { const w = JSON.parse(row.workOrderNos); return Array.isArray(w) ? w : [row.workOrderNos]; } catch { return [row.workOrderNos]; } })()
                  : (row.workOrderNo ? [row.workOrderNo] : []));
            const linkedPoList: string[] = Array.isArray(row.poIds)
              ? row.poIds
              : (typeof row.poIds === 'string'
                  ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                  : (row.poId ? [row.poId] : []));
            return (
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">{row.id}</span>
                  {linkedWoList.slice(0, 2).map((woNum: string) => (
                    <span
                      key={woNum}
                      onClick={(e) => { e.stopPropagation(); navigate('/production/work-orders'); }}
                      className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 font-mono font-bold border border-purple-500/30 cursor-pointer"
                    >
                      WO: {woNum}
                    </span>
                  ))}
                  {linkedPoList.slice(0, 2).map((poNum: string) => (
                    <span
                      key={poNum}
                      onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${poNum}`); }}
                      className="text-[10px] bg-surface2 text-secondary hover:text-primary px-1.5 py-0.5 font-mono font-bold border border-theme-subtle cursor-pointer"
                    >
                      PO: {poNum}
                    </span>
                  ))}
                </div>
                <div className="text-[10.5px] text-muted font-mono">
                  {formatDate(row.date)} • {row.department || 'General'} Dept
                </div>
              </div>
            );
          }
        },
        {
          key: 'requestedBy', header: 'Requester', width: '140px', sortable: true,
          render: v => (
            <div>
              <p className="text-xs font-bold text-primary uppercase truncate">{String(v || 'Staff')}</p>
            </div>
          )
        },
        {
          key: 'items', header: 'Requested Items',
          render: (_, row) => renderItemPill(row.items, 'Material Request Items')
        },
        { key: 'status', header: 'Status', width: '110px', sortable: true, render: v => <Badge value={String(v)} size="sm" /> },
        {
          key: 'fulfillment', header: 'PO / GRN Pipeline', width: '140px',
          render: (_, row) => {
            const linkedPos = pos.filter((p: any) => {
              const pMrIds = Array.isArray(p.mrIds) ? p.mrIds : (typeof p.mrIds === 'string' ? (() => { try { return JSON.parse(p.mrIds || '[]'); } catch { return []; } })() : []);
              return p.mrId === row.id || pMrIds.includes(row.id);
            });
            const linkedGrns = combinedGrns.filter((g: any) => !g.isCustomerSample && linkedPos.some((p: any) => p.id === g.poId));
            return (
              <div className="text-[10.5px] font-mono space-y-0.5">
                <div className={linkedPos.length > 0 ? 'text-blue-500 font-bold' : 'text-muted'}>
                  {linkedPos.length > 0 ? `${linkedPos.length} PO(s) Issued` : 'No PO Yet'}
                </div>
                <div className={linkedGrns.length > 0 ? 'text-emerald-600 font-semibold' : 'text-muted'}>
                  {linkedGrns.length > 0 ? `${linkedGrns.length} GRN Received` : 'Pending GRN'}
                </div>
              </div>
            );
          }
        },
        { key: 'priority', header: 'Priority', width: '90px', sortable: true, render: v => <span className={`text-xs font-semibold uppercase ${v === 'High' ? 'text-red-500' : 'text-muted'}`}>{String(v)}</span> },
        { key: 'date', header: 'Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
        {
          key: 'traceability', header: 'Traceability', align: 'center',
          render: (_: any, row: any) => {
            const traces: TraceNode[] = [];
            const linkedWoList: string[] = Array.isArray(row.workOrderNos)
              ? row.workOrderNos
              : (typeof row.workOrderNos === 'string'
                  ? (() => { try { const w = JSON.parse(row.workOrderNos); return Array.isArray(w) ? w : [row.workOrderNos]; } catch { return [row.workOrderNos]; } })()
                  : (row.workOrderNo ? [row.workOrderNo] : []));
            
            linkedWoList.forEach(woNum => {
              traces.push({
                type: 'work_order',
                title: 'Production Job',
                reference: woNum,
                subtitle: 'Linked Work Order',
                statusBadge: { label: 'WO Linked', variant: 'info' },
                navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
              });
            });

            const linkedPoList: string[] = Array.isArray(row.poIds) 
              ? row.poIds 
              : (typeof row.poIds === 'string'
                  ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                  : (row.poId ? [row.poId] : []));
            
            // Also scan pos array to find any PO referencing this MR
            const allLinkedPoIds = new Set<string>(linkedPoList);
            pos.forEach((p: any) => {
              const pMrIds = Array.isArray(p.mrIds) ? p.mrIds : (typeof p.mrIds === 'string' ? JSON.parse(p.mrIds || '[]') : [p.mrId].filter(Boolean));
              if (p.mrId === row.id || pMrIds.includes(row.id)) {
                allLinkedPoIds.add(p.id);
              }
            });

            Array.from(allLinkedPoIds).forEach(poNum => {
              traces.push({
                type: 'po',
                title: 'Purchase Order',
                reference: poNum,
                subtitle: 'Issued PO',
                statusBadge: { label: 'PO Created', variant: 'success' },
                navigateUrl: `/purchasing/po-builder/${poNum}`
              });
            });

            return (
              <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                <TraceabilityDropdown
                  title={`Material Request #${row.id}`}
                  traces={traces}
                />
              </div>
            );
          }
        },
        { key: 'actions', header: 'Actions', align: 'right', render: (_, row) => renderActionsDropdown('mr', row) }
      ];
    }
    if (activeTab === 'grn') {
      return [
        {
          key: 'id', header: 'GRN # & Date', sortable: true,
          render: (_, row) => {
            const linkedPoList: string[] = Array.isArray(row.poIds)
              ? row.poIds
              : (typeof row.poIds === 'string'
                  ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                  : (row.poId ? [row.poId] : []));
            const rawDate = row.isCustomerSample ? (row.receivedAt || row.createdAt || '') : (row.date || row.createdAt || '');
            return (
              <div className="min-w-0 leading-tight space-y-0.5">
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (row.isCustomerSample) {
                        setPrintGrnData({ grn: row, group: { quoNo: row.quoNo, leadId: row.leadId, leadName: row.customerName || row.leadName } });
                      } else {
                        navigate(`/purchasing/grn-builder/${row.id}`);
                      }
                    }}
                    className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {row.id}
                  </span>
                  {row.isCustomerSample ? (
                    <span className="text-[9.5px] bg-purple-500/10 text-purple-600 dark:text-purple-300 px-1 py-0 font-mono font-bold border border-purple-500/30">
                      {row.quoNo || 'Sample'}
                    </span>
                  ) : linkedPoList.length > 0 ? (
                    linkedPoList.slice(0, 1).map((pNum: string) => (
                      <span
                        key={pNum}
                        onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${pNum}`); }}
                        className="text-[9.5px] bg-surface2 text-secondary hover:text-primary px-1 py-0 font-mono font-bold border border-theme-subtle cursor-pointer"
                      >
                        PO:{pNum}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9.5px] bg-surface2 text-muted px-1 py-0 font-mono border border-theme-subtle">
                      Direct
                    </span>
                  )}
                  {row.billAttachment && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDataUriOrUrl(row.billAttachment, `Vendor Document - ${row.id}`); }}
                      className="inline-flex items-center gap-0.5 px-1 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9.5px] font-bold font-mono cursor-pointer"
                      title="View Attached Vendor Document"
                    >
                      <Paperclip size={9} /> Doc
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-muted font-mono">
                  {rawDate ? formatDate(rawDate) : '-'}
                </div>
              </div>
            );
          }
        },
        {
          key: 'supplier', header: 'Source / Carrier', width: '180px',
          render: (_, row) => (
            <div className="min-w-0 max-w-[175px]">
              <p className="text-xs font-bold text-primary uppercase truncate">
                {row.isCustomerSample ? (row.customerName || row.leadName || 'Customer') : getSupplierName(row.supplierId)}
              </p>
              <p className="text-[10.5px] text-muted font-mono truncate mt-0.5">
                {row.isCustomerSample ? (row.receivedBy || 'System') : (row.vehicleNo || 'Vendor Delivery')}
              </p>
            </div>
          )
        },
        {
          key: 'items', header: 'Items Received',
          render: (_, row) => renderItemPill(row.items, row.isCustomerSample ? 'Customer Sample' : 'Received Items')
        },
        {
          key: 'qty', header: 'Qty Received', align: 'right',
          render: (_, row) => {
            const items = parseItemsArray(row.items);
            const recQty = items.reduce((s: number, it: any) => s + Number(it.receivedQty || it.qty || it.quantity || 0), 0);
            return (
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-primary block">{recQty > 0 ? `${recQty.toFixed(2)} pcs` : `${items.length} line(s)`}</span>
                <span className="text-[10px] text-muted block">{items.length} item(s)</span>
              </div>
            );
          }
        },
        {
          key: 'status', header: 'Status & Billing', align: 'center',
          render: (_, row) => {
            if (row.isCustomerSample) {
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <Badge value="Sample" size="sm" />
                  <span className="text-[9.5px] font-mono text-muted">{row.status || 'Received'}</span>
                </div>
              );
            }
            const matchedBills = bills.filter((b: any) => b.grnId === row.id || (row.poId && b.poId === row.poId));
            const totalB = matchedBills.reduce((s: number, b: any) => s + Number(b.amount || b.totalAmount || 0), 0);
            const totalP = matchedBills.reduce((s: number, b: any) => s + Number(b.paidAmount || 0), 0);
            const isPaid = totalP >= totalB - 0.01 && totalB > 0;
            return (
              <div className="flex flex-col items-center gap-0.5">
                <Badge value={String(row.status || 'Received')} size="sm" />
                {matchedBills.length > 0 ? (
                  <span className={`px-1.5 py-0 text-[9.5px] font-bold rounded border ${
                    isPaid
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/25'
                  }`}>
                    Billed ({matchedBills.length}) • {isPaid ? 'Paid' : totalP > 0 ? 'Part. Paid' : 'Unpaid'}
                  </span>
                ) : (
                  <span className="px-1.5 py-0 text-[9.5px] font-semibold rounded bg-amber-500/10 text-amber-600 border border-amber-500/25">
                    Unbilled
                  </span>
                )}
              </div>
            );
          }
        },
        {
          key: 'traceability', header: 'Traceability', align: 'center',
          render: (_: any, row: any) => {
            const traces: TraceNode[] = [];
            if (row.isCustomerSample) {
              if (row.quoNo) {
                traces.push({
                  type: 'quotation',
                  title: 'Quotation',
                  reference: row.quoNo,
                  subtitle: 'Sample Linked Quote',
                  statusBadge: { label: 'Quote', variant: 'info' },
                  navigateUrl: `/crm/quotations?search=${encodeURIComponent(row.quoNo)}`
                });
              }
            } else {
              const linkedPoList: string[] = Array.isArray(row.poIds)
                ? row.poIds
                : (typeof row.poIds === 'string'
                    ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                    : (row.poId ? [row.poId] : []));

              linkedPoList.forEach(pNum => {
                traces.push({
                  type: 'po',
                  title: 'Purchase Order',
                  reference: pNum,
                  subtitle: 'Inbound PO',
                  statusBadge: { label: 'PO', variant: 'info' },
                  navigateUrl: `/purchasing/po-builder/${pNum}`
                });
              });

              const matchedBills = bills.filter((b: any) => b.grnId === row.id || (row.poId && b.poId === row.poId));
              matchedBills.forEach((b: any) => {
                traces.push({
                  type: 'bill',
                  title: 'Vendor Bill',
                  reference: b.invoiceNo || b.id,
                  subtitle: `Bill: ${formatCurrency(Number(b.totalAmount || b.amount || 0))}`,
                  statusBadge: { label: b.status || 'Billed', variant: 'warning' },
                  navigateUrl: `/purchasing/bill-builder/${b.id}`
                });
              });

              // Linked Work Orders from referenced POs / MRs
              const grnWos = new Set<string>();
              linkedPoList.forEach(pNum => {
                const poObj = pos.find((p: any) => p.id === pNum);
                if (poObj) {
                  const mrList: string[] = Array.isArray(poObj.mrIds)
                    ? poObj.mrIds
                    : (typeof poObj.mrIds === 'string'
                        ? (() => { try { const m = JSON.parse(poObj.mrIds); return Array.isArray(m) ? m : [poObj.mrIds]; } catch { return [poObj.mrIds]; } })()
                        : (poObj.mrId ? [poObj.mrId] : []));
                  mrList.forEach(mNum => {
                    const mrObj = mrs.find((m: any) => m.id === mNum);
                    if (mrObj) {
                      if (mrObj.workOrderNo) grnWos.add(mrObj.workOrderNo);
                      if (mrObj.jobNo) grnWos.add(mrObj.jobNo);
                      if (mrObj.workOrderId) grnWos.add(mrObj.workOrderId);
                    }
                  });
                }
              });

              grnWos.forEach(woNum => {
                traces.push({
                  type: 'work_order',
                  title: 'Production Job',
                  reference: woNum,
                  subtitle: 'Linked Work Order',
                  statusBadge: { label: 'WO Linked', variant: 'info' },
                  navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
                });
              });
            }

            return (
              <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                <TraceabilityDropdown
                  title={`GRN #${row.id}`}
                  traces={traces}
                />
              </div>
            );
          }
        },
        { key: 'actions', header: 'Actions', align: 'right', render: (_, row) => renderActionsDropdown('grn', row) }
      ];
    }
    return [
      {
        key: 'bill', header: 'Supplier Bill', sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-surface2 border border-theme-subtle text-secondary flex items-center justify-center">
              <CreditCard size={14} className="text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted font-mono font-bold">INV: {row.invoiceNo || '-'}</span>
                {row.billAttachment && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDataUriOrUrl(row.billAttachment, `Vendor Bill - ${row.invoiceNo || row.id}`);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                    title={`View Attached Vendor Bill Document (${row.billAttachmentName || 'Document'})`}
                  >
                    <Paperclip size={10} /> Bill Doc
                  </button>
                )}
                {row.poId && (
                  <span 
                    onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${row.poId}`); }}
                    className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                    title={`View Linked Purchase Order ${row.poId}`}
                  >
                    PO: {row.poId}
                  </span>
                )}
                {row.grnId && (
                  <span 
                    onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/grn-builder/${row.grnId}`); }}
                    className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-none font-mono font-bold border border-emerald-500/30 cursor-pointer"
                    title={`View Linked GRN ${row.grnId}`}
                  >
                    GRN: {row.grnId}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
      { key: 'supplier', header: 'Vendor', width: '180px', render: (_, row) => <span className="text-xs font-bold text-primary uppercase truncate block max-w-[170px]">{getSupplierName(row.supplierId)}</span> },
      {
        key: 'items', header: 'Billed Items',
        render: (_, row) => renderItemPill(row.items, row.billCategory || 'Vendor Bill')
      },
      { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
      {
        key: 'amount', header: 'Value & Tax / Paid', align: 'right', sortable: true,
        render: (v, row) => {
          const total = Number(v || 0);
          const paid = Number(row.paidAmount || 0);
          return (
            <div className="text-right">
              <span className="text-xs font-black font-mono text-primary block">{formatCurrency(total, true)}</span>
              {renderTaxPills(row)}
              {paid > 0 && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                  Paid: {formatCurrency(paid, true)}
                </span>
              )}
            </div>
          );
        }
      },
      { key: 'date', header: 'Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
      {
        key: 'traceability', header: 'Traceability', align: 'center',
        render: (_: any, row: any) => {
          const traces: TraceNode[] = [];
          if (row.poId) {
            traces.push({
              type: 'po',
              title: 'Purchase Order',
              reference: row.poId,
              subtitle: 'Procurement Order',
              statusBadge: { label: 'PO Linked', variant: 'info' },
              navigateUrl: `/purchasing/po-builder/${row.poId}`
            });

            const matchedGrns = combinedGrns.filter((g: any) => g.poId === row.poId || g.id === row.grnId);
            matchedGrns.forEach((g: any) => {
              traces.push({
                type: 'grn',
                title: 'Goods Receipt',
                reference: g.id,
                subtitle: `Received: ${g.date || g.createdAt || ''}`,
                statusBadge: { label: g.status || 'GRN', variant: 'success' },
                navigateUrl: `/purchasing/grn-builder/${g.id}`
              });
            });

            // Linked Work Orders via PO -> MR
            const poObj = pos.find((p: any) => p.id === row.poId);
            if (poObj) {
              const mrList: string[] = Array.isArray(poObj.mrIds)
                ? poObj.mrIds
                : (typeof poObj.mrIds === 'string'
                    ? (() => { try { const m = JSON.parse(poObj.mrIds); return Array.isArray(m) ? m : [poObj.mrIds]; } catch { return [poObj.mrIds]; } })()
                    : (poObj.mrId ? [poObj.mrId] : []));
              const billWos = new Set<string>();
              mrList.forEach(mNum => {
                const mrObj = mrs.find((m: any) => m.id === mNum);
                if (mrObj) {
                  if (mrObj.workOrderNo) billWos.add(mrObj.workOrderNo);
                  if (mrObj.jobNo) billWos.add(mrObj.jobNo);
                  if (mrObj.workOrderId) billWos.add(mrObj.workOrderId);
                }
              });
              billWos.forEach(woNum => {
                traces.push({
                  type: 'work_order',
                  title: 'Production Job',
                  reference: woNum,
                  subtitle: 'Linked Work Order',
                  statusBadge: { label: 'WO Linked', variant: 'info' },
                  navigateUrl: `/production/work-orders?search=${encodeURIComponent(woNum)}`
                });
              });
            }
          }

          if (row.supplierId) {
            traces.push({
              type: 'receipt',
              title: 'Vendor Ledger',
              reference: getSupplierName(row.supplierId),
              subtitle: 'Statement & Payments',
              statusBadge: { label: 'Vendor', variant: 'neutral' },
              navigateUrl: `/inventory/suppliers/${row.supplierId}`
            });
          }

          return (
            <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
              <TraceabilityDropdown
                title={`Bill #${row.id}`}
                traces={traces}
              />
            </div>
          );
        }
      },
      {
        key: 'actions', header: 'Actions', align: 'right',
        render: (_, row) => renderActionsDropdown('bill', row)
      }
    ];

    if (activeTab === 'gate_pass') {
      return [
        {
          key: 'id', header: 'Gate Pass # & Date', sortable: true,
          render: (val: any, row: any) => (
            <div className="min-w-0 leading-tight space-y-0.5">
              <div className="flex items-center gap-1 flex-wrap">
                <span
                  onClick={(e) => { e.stopPropagation(); setPrintGatePassData(row); }}
                  className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs hover:underline cursor-pointer"
                >
                  {val}
                </span>
                {(row.quoNo || row.displayQuoNo) && (
                  <span className="text-[9.5px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 py-0 font-mono font-bold border border-blue-500/25">
                    {row.quoNo || row.displayQuoNo}
                  </span>
                )}
                {row.grnId && (
                  <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0 font-mono font-bold border border-emerald-500/30">
                    GRN:{row.grnId}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted font-mono">
                {formatDate(row.issuedDate || row.createdAt)}
              </div>
            </div>
          )
        },
        {
          key: 'customerCompany', header: 'Customer / Consignee',
          render: (val: any, row: any) => (
            <div className="min-w-0 max-w-[190px]">
              <p className="font-bold text-primary text-xs uppercase truncate">{val || row.customerName || 'N/A'}</p>
              <p className="text-[10.5px] text-muted truncate mt-0.5">
                {row.attention ? `Attn: ${row.attention}` : (row.carrier || 'Hand Delivery')}
              </p>
            </div>
          )
        },
        {
          key: 'items', header: 'Dispatched Items',
          render: (val: any) => renderItemPill(val, 'Dispatched Items')
        },
        {
          key: 'qty', header: 'Qty', align: 'right',
          render: (_: any, row: any) => {
            const itemsList = parseItemsArray(row.items);
            const totQty = itemsList.reduce((s: number, it: any) => s + Number(it.qty || it.quantity || 1), 0);
            return (
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-primary block">{totQty > 0 ? `${totQty} nos` : `${itemsList.length} item(s)`}</span>
                <span className="text-[10px] text-muted block">{row.vehicleNo || row.carrier || 'Hand'}</span>
              </div>
            );
          }
        },
        {
          key: 'traceability', header: 'Traceability', align: 'center',
          render: (_: any, row: any) => {
            const traces: TraceNode[] = [];
            if (row.quoNo || row.displayQuoNo) {
              const qNo = row.quoNo || row.displayQuoNo;
              traces.push({
                type: 'quotation',
                title: 'Quotation',
                reference: qNo,
                subtitle: 'Source Quotation',
                statusBadge: { label: 'Quote', variant: 'info' },
                navigateUrl: `/crm/quotations?search=${encodeURIComponent(qNo)}`
              });
            }
            if (row.grnId) {
              traces.push({
                type: 'grn',
                title: 'Sample GRN',
                reference: row.grnId,
                subtitle: 'Linked Receipt',
                statusBadge: { label: 'GRN', variant: 'success' },
                navigateUrl: `/purchasing?tab=grn&search=${encodeURIComponent(row.grnId)}`
              });
            }
            return (
              <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
                <TraceabilityDropdown title={`Gate Pass #${row.id}`} traces={traces} />
              </div>
            );
          }
        },
        {
          key: 'status', header: 'Status', align: 'center', width: '100px',
          render: (v: any) => <Badge variant="success" size="sm">{v || 'Dispatched'}</Badge>
        },
        {
          key: 'actions', header: 'Actions', align: 'right',
          render: (_, row) => (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPrintGatePassData(row)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Printer size={11} /> View PDF
              </button>
              {renderActionsDropdown('gate_pass', row)}
            </div>
          )
        }
      ];
    }
  };

  const getAddLabel = () => {
    switch (activeTab) {
      case 'po': return 'Add Purchase Order';
      case 'mr': return 'Add Material Request';
      case 'grn': return 'Add Receipt (GRN)';
      case 'bill': return 'Add Supplier Bill';
      case 'gate_pass': return 'Issue Outward GP';
    }
  };
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading purchasing data...</div>;


  const getStatusOptions = (): StatusFilter[] => {
    switch (activeTab) {
      case 'mr': return ['all', 'pending', 'approved', 'ordered', 'rejected'];
      case 'po': return ['all', 'draft', 'sent', 'ordered', 'partially_received', 'received'];
      case 'grn': return ['all', 'received'];
      case 'bill': return ['all', 'unpaid', 'paid'];
      case 'gate_pass': return ['all'];
      default: return ['all'];
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Purchasing Hub</h1>
          <p className="text-xs text-muted mt-0.5">
            {pos.length} purchase orders · {mrs.length} material requests ({mrs.filter((m: any) => m.status === 'approved' || m.status === 'pending').length} pending PO) · {grns.length} receipts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="purchasing-hub" />
          <Button variant="ghost" size="sm" icon={Download}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>{getAddLabel()}</Button>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <GlassCard className="p-3 space-y-3">
        {/* Row 1: Type Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-muted flex items-center gap-1.5 font-bold uppercase tracking-wider mr-1">
              <Filter size={12} /> Module:
            </span>
            {(['po', 'mr', 'grn', 'bill'] as Tab[]).map(t => (
              <button 
                key={t} 
                onClick={() => { setActiveTab(t); setStatusFilter('all'); setGrnSourceFilter('all'); }} 
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider shrink-0 ${
                  activeTab === t 
                    ? 'bg-rex-500/10 border border-rex-500/35 text-rex-700 dark:text-rex-300 font-bold shadow-xs' 
                    : 'bg-surface border border-theme-subtle text-muted hover:text-secondary hover:border-theme'
                }`}
              >
                {t === 'grn' ? 'GRN Receipts' : t.toUpperCase()}
              </button>
            ))}
          </div>

          <SearchBar 
            placeholder={`Search ${activeTab.toUpperCase()}, ID, Vendor, Ref...`} 
            value={search} 
            onChange={setSearch} 
            className="w-full sm:w-80" 
          />
        </div>

        {/* Row 2: Status, Source (if GRN), Supplier dropdown, Date Range, Clear */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-theme-subtle text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">Status:</span>
            {getStatusOptions().map(s => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s)} 
                className={`px-2.5 py-1 text-xs border rounded transition-colors shrink-0 ${
                  statusFilter === s 
                    ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300 font-bold' 
                    : 'bg-surface border-theme text-secondary hover:border-rex-500/30'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* GRN Source Toggle (Vendor vs Sample) */}
          {activeTab === 'grn' && (
            <>
              <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">Source:</span>
                {[
                  { id: 'all', label: 'All GRN' },
                  { id: 'vendor', label: 'Vendor Delivery' },
                  { id: 'sample', label: 'Customer Sample' }
                ].map(src => (
                  <button
                    key={src.id}
                    onClick={() => setGrnSourceFilter(src.id as any)}
                    className={`px-2 py-1 text-xs border rounded transition-colors ${
                      grnSourceFilter === src.id
                        ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300 font-bold'
                        : 'bg-surface border-theme text-secondary hover:border-rex-500/30'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Supplier Dropdown (for PO, GRN, Bill) */}
          {activeTab !== 'mr' && (
            <>
              <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />
              <div className="flex items-center gap-1.5 w-52">
                <SupplierAutocomplete
                  value={supplierFilter}
                  onChange={sId => setSupplierFilter(sId || 'all')}
                  suppliers={suppliers}
                  allOptionLabel={`All Vendors (${suppliers.length})`}
                  placeholder="Filter by vendor..."
                  className="text-xs py-1"
                />
              </div>
            </>
          )}

          {/* Date Range */}
          <div className="w-px h-4 bg-theme-subtle mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
            <span className="text-muted font-semibold uppercase tracking-wider text-xs">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-surface border border-theme-subtle rounded px-2 py-1 text-primary text-xs focus:border-rex-500 outline-none"
            />
          </div>

          {/* Quick Presets & Clear */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                setStartDate(`${y}-${m}-01`);
                setEndDate(now.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded-none whitespace-nowrap shrink-0 text-xs font-medium text-secondary hover:text-primary transition-colors"
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
              className="px-2.5 py-1 bg-surface hover:bg-surface2 border border-theme-subtle rounded-none whitespace-nowrap shrink-0 text-xs font-medium text-secondary hover:text-primary transition-colors"
            >
              Last 30 Days
            </button>
            {(statusFilter !== 'all' || supplierFilter !== 'all' || grnSourceFilter !== 'all' || startDate || endDate || search) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSupplierFilter('all');
                  setGrnSourceFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                }}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-none whitespace-nowrap shrink-0 font-semibold text-xs transition-colors ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <DataTable 
          columns={generateColumns()} 
          data={filtered} 
          keyExtractor={row => row.id} 
          pagination
          itemsPerPage={25}
          itemLabel="purchasing records"
          onRowClick={(activeTab === 'po' || activeTab === 'gate_pass') ? undefined : (row => {
            if (openActionId) return;
            if (activeTab === 'grn') {
              if (row.isCustomerSample) {
                setPrintGrnData({ grn: row, group: { quoNo: row.quoNo, leadId: row.leadId, leadName: row.customerName || row.leadName } });
              } else {
                navigate(`/purchasing/grn-builder/${row.id}`);
              }
            } else if (activeTab === 'mr') {
              navigate(`/purchasing/mr-builder/${row.id}`);
            } else if (activeTab === 'bill') {
              navigate(`/purchasing/bill-builder?id=${row.id}`);
            }
          })}
        />
      </GlassCard>

      {/* Printable PO Modal */}
      <Modal isOpen={!!printPoData} onClose={() => setPrintPoData(null)} title={`Purchase Order Document - #${printPoData?.po?.id}`} size="xl">
        {printPoData && (
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">A4 Vector Document Preview</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('po-print-section', `PO_${printPoData.po.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('po-print-section', `PO_${printPoData.po.id}`)}
                >
                  Print PO
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto">
              <POPrintView po={printPoData.po} supplier={printPoData.supplier} settings={settings} />
            </div>
          </div>
        )}
      </Modal>

      {/* Printable MR Modal */}
      <Modal isOpen={!!printMrData} onClose={() => setPrintMrData(null)} title={`Material Requisition Document - #${printMrData?.id}`} size="xl">
        {printMrData && (
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">A4 Vector Document Preview</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('mr-print-section', `MR_${printMrData.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('mr-print-section', `MR_${printMrData.id}`)}
                >
                  Print MR
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto">
              <MRPrintView mr={printMrData} settings={settings} />
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Supplier GRN Modal */}
      <Modal isOpen={!!printSupplierGrnData} onClose={() => setPrintSupplierGrnData(null)} title={`Goods Receipt Note (GRN) - #${printSupplierGrnData?.grn?.id}`} size="xl">
        {printSupplierGrnData && (
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">A4 Vector Document Preview</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('supplier-grn-print-section', `GRN_${printSupplierGrnData.grn.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('supplier-grn-print-section', `GRN_${printSupplierGrnData.grn.id}`)}
                >
                  Print GRN
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto">
              <SupplierGRNPrintView grn={printSupplierGrnData.grn} supplier={printSupplierGrnData.supplier} settings={settings} />
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Customer GRN Modal */}
      <Modal isOpen={!!printGrnData} onClose={() => setPrintGrnData(null)} title="Print Customer Sample GRN" size="xl">
        {printGrnData && (
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">A4 Vector Document Preview</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('grn-print-section', `GRN-${printGrnData.grn.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('grn-print-section', `GRN_${printGrnData.grn.id}`)}
                >
                  Print GRN
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto p-4">
              <CustomerGRNPrintView 
                 grn={printGrnData.grn} 
                 group={printGrnData.group}
                 settings={settings}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Gate Pass Modal */}
      <Modal isOpen={!!printGatePassData} onClose={() => setPrintGatePassData(null)} title={`Gate Pass & Delivery Note - #${printGatePassData?.id}`} size="xl">
        {printGatePassData && (
          <div className="bg-neutral-100 dark:bg-neutral-900 p-4 max-h-[82vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 px-2">
              <span className="text-xs text-muted">Official Security & Dispatch Gate Pass</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToPdf('gatepass-print-section', `GatePass_${printGatePassData.id}.pdf`)}
                  className="bg-surface border border-theme-subtle hover:bg-surface2"
                >
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => printElement('gatepass-print-section', `GatePass_${printGatePassData.id}`)}
                >
                  Print Gate Pass
                </Button>
              </div>
            </div>
            <div className="bg-white shadow-xl rounded-none overflow-hidden mx-auto p-4">
              <GatePassPrintView gatePass={printGatePassData} settings={settings} />
            </div>
          </div>
        )}
      </Modal>

      {/* Direct Bill Payment Modal */}
      {paymentBill && (
        <RecordBillPaymentModal
          isOpen={!!paymentBill}
          onClose={() => setPaymentBill(null)}
          bill={paymentBill}
          toast={toast}
          onSuccess={() => {
            refetchBills();
          }}
        />
      )}

      {/* Quick View Vendor Bill Modal */}
      {viewingBill && (
        <ViewVendorBillModal
          isOpen={Boolean(viewingBill)}
          onClose={() => setViewingBill(null)}
          bill={viewingBill}
          onPayBill={(b) => setPaymentBill(b)}
        />
      )}

      {/* Record PO Advance Payment & Issue Payment Voucher Modal */}
      {advancePo && (
        <RecordPoAdvanceModal
          isOpen={Boolean(advancePo)}
          onClose={() => setAdvancePo(null)}
          po={advancePo}
          supplierName={getSupplierName(advancePo.supplierId)}
          toast={toast}
          onSuccess={() => {
            refetchPOs();
            refetchBills();
          }}
          onPrintVoucher={(v) => setPrintVoucher(v)}
        />
      )}

      {/* Print PO Advance Payment Voucher Modal */}
      <PaymentVoucherPrintModal
        isOpen={Boolean(printVoucher)}
        onClose={() => setPrintVoucher(null)}
        voucher={printVoucher}
      />
    </div>
  );
};


