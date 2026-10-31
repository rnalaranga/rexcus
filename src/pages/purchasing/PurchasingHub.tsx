import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest, Package, Trash2, ChevronDown, Eye, ShoppingCart, PackageCheck, Printer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView';
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
import { fetchAllCustomerGRNs, deleteGRN, deleteCustomerGRN, deleteBill, deletePO, deleteMR } from '@/lib/api';
import { formatCurrency, relativeTime } from '@/lib/utils';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { PageHelpButton } from '@/components/help/PageHelpButton';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/components/ui/DialogProvider';

type Tab = 'po' | 'mr' | 'grn' | 'bill';
type StatusFilter = 'all' | 'draft' | 'pending' | 'approved' | 'partially_ordered' | 'ordered' | 'partially_received' | 'rejected' | 'sent' | 'received' | 'unpaid' | 'paid';

export const PurchasingHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    if (t === 'mr' || t === 'po' || t === 'grn' || t === 'bill') return t as Tab;
    return 'po';
  });
  const [search, setSearch] = useState(() => searchParams.get('search') || searchParams.get('id') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [grnSourceFilter, setGrnSourceFilter] = useState<'all' | 'vendor' | 'sample'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    if (t === 'mr' || t === 'po' || t === 'grn' || t === 'bill') {
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
  const [custGrns, setCustGrns] = useState<any[]>([]);
  useEffect(() => {
    fetchAllCustomerGRNs().then(setCustGrns).catch(console.error);
  }, []);

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

  const getSupplierName = (id: string) => suppliers.find((s: any) => s.id === id)?.name || id;
  const getSupplierContact = (id: string) => suppliers.find((s: any) => s.id === id)?.email || 'N/A';

  const loading = loadingMRs || loadingPOs || loadingGRNs || loadingBills;


  const handleAdd = () => {
    switch (activeTab) {
      case 'po': navigate('/purchasing/po-builder'); break;
      case 'mr': navigate('/purchasing/mr-builder'); break;
      case 'grn': navigate('/purchasing/grn-builder'); break;
      case 'bill': navigate('/purchasing/bill-builder'); break;
    }
  };

  const combinedGrns = useMemo(() => {
    const sGrns = grns.map((g: any) => ({ ...g, isCustomerSample: false }));
    const cGrns = custGrns.map((g: any) => ({ ...g, isCustomerSample: true }));
    return [...sGrns, ...cGrns].sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }, [grns, custGrns]);

  const currentData = activeTab === 'po' ? pos : activeTab === 'mr' ? mrs : activeTab === 'grn' ? combinedGrns : bills;

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
      item.leadName,
      item.vehicleNo
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
      const openUpwards = spaceBelow < 240 && spaceAbove > spaceBelow;

      menuStyle = {
        position: 'fixed',
        left: `${left}px`,
        width: `${MENU_WIDTH}px`,
        zIndex: 99999,
        maxHeight: openUpwards ? `${Math.min(380, spaceAbove)}px` : `${Math.min(380, spaceBelow)}px`,
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
            className="purchasing-action-menu-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1.5 text-left rounded-none overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
            {tab === 'po' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  PO Actions (#{row.id})
                </div>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/po-builder/${row.id}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Eye size={13} className="text-zinc-400" />
                  <span>View / Edit PO</span>
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
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/mr-builder/${row.id}`); }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eye size={13} className="text-zinc-400" />
                    <span>View MR</span>
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
                      <Printer size={13} className="text-blue-500" />
                      <span>Print Sample GRN</span>
                    </button>

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
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/purchasing/grn-builder/${row.id}`); }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Eye size={13} className="text-zinc-400" />
                      <span>View GRN Details</span>
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

            {tab === 'bill' && (
              <>
                <div className="px-3.5 py-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  Bill Actions (#{row.id})
                </div>

                <button
                  type="button"
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); navigate(`/inventory/suppliers/${row.supplierId}`); }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <CreditCard size={13} className="text-amber-500" />
                  <span>Supplier Ledger / Pay</span>
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

  const generateColumns = (): Column<any>[] => {
    if (activeTab === 'po') {
      return [
        {
          key: 'supplier', header: 'Vendor / PO', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-surface2 border border-theme-subtle text-secondary flex items-center justify-center">
                <FileText size={14} className="text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{getSupplierName(row.supplierId)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted font-mono">{row.id}</span>
                  {(() => {
                    const linkedMrList: string[] = Array.isArray(row.mrIds)
                      ? row.mrIds
                      : (typeof row.mrIds === 'string'
                          ? (() => { try { const m = JSON.parse(row.mrIds); return Array.isArray(m) ? m : [row.mrIds]; } catch { return [row.mrIds]; } })()
                          : (row.mrId ? [row.mrId] : []));
                    return linkedMrList.map((mrNum: string) => (
                      <span 
                        key={mrNum}
                        onClick={(e) => { e.stopPropagation(); navigate('/purchasing/mr-builder/' + mrNum); }}
                        className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                        title="View Originating Material Request"
                      >
                        MR: {mrNum}
                      </span>
                    ));
                  })()}
                  {(() => {
                    const invList: string[] = Array.isArray(row.invoiceNos)
                      ? row.invoiceNos
                      : (typeof row.invoiceNos === 'string'
                          ? (() => { try { const p = JSON.parse(row.invoiceNos); return Array.isArray(p) ? p : [row.invoiceNos]; } catch { return [row.invoiceNos]; } })()
                          : []);
                    if (invList.length === 0) return null;
                    return invList.map((invNum: string) => (
                      <span 
                        key={invNum}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('bill'); setSearch(invNum); }}
                        className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                        title={`Vendor Invoice ${invNum}`}
                      >
                        INV: {invNum}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )
        },
        { key: 'contact', header: 'Contact', width: '160px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierContact(row.supplierId)}</span> },
        { key: 'status', header: 'Receipt Status', width: '110px', render: v => <Badge value={String(v)} size="sm" /> },
        { 
          key: 'billingStatus', header: 'Invoicing', width: '130px', 
          render: (_, row) => {
            const billed = Number(row.billedAmount || 0);
            const total = Number(row.totalAmount || 0);
            const bStatus = row.billingStatus || (billed >= total - 0.01 && total > 0 ? 'billed' : billed > 0 ? 'partially_billed' : 'unbilled');
            return (
              <div>
                <Badge 
                  value={bStatus === 'billed' ? 'Fully Billed' : bStatus === 'partially_billed' ? 'Partially Billed' : 'Unbilled'} 
                  size="sm" 
                />
                {billed > 0 && (
                  <div className="text-xs text-muted font-mono mt-0.5">
                    {formatCurrency(billed, true)} / {formatCurrency(total, true)}
                  </div>
                )}
              </div>
            );
          }
        },
        { key: 'totalAmount', header: 'Amount', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300 font-mono">{formatCurrency(Number(v), true)}</span> },
        { key: 'date', header: 'Order Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
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
              traces.push({
                type: 'bill',
                title: 'Vendor Bill',
                reference: b.invoiceNo || b.id,
                subtitle: `Bill: ${formatCurrency(Number(b.totalAmount || b.amount || 0))}`,
                statusBadge: { label: b.status || 'Billed', variant: 'warning' },
                navigateUrl: `/purchasing/bill-builder/${b.id}`
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
        { key: 'actions', header: 'Actions', align: 'right', render: (_, row) => renderActionsDropdown('po', row) }
      ];
    }
    if (activeTab === 'mr') {
      return [
        {
          key: 'mr', header: 'Material Request', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-surface2 border border-theme-subtle text-secondary flex items-center justify-center">
                <GitPullRequest size={14} className="text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted">{row.department} Dept</span>
                  {(() => {
                    const linkedWoList: string[] = Array.isArray(row.workOrderNos)
                      ? row.workOrderNos
                      : (typeof row.workOrderNos === 'string'
                          ? (() => { try { const w = JSON.parse(row.workOrderNos); return Array.isArray(w) ? w : [row.workOrderNos]; } catch { return [row.workOrderNos]; } })()
                          : (row.workOrderNo ? [row.workOrderNo] : []));
                    return linkedWoList.map((woNum: string) => (
                      <span 
                        key={woNum}
                        onClick={(e) => { e.stopPropagation(); navigate('/production/work-orders'); }}
                        className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:text-purple-400 px-2 py-0.5 rounded-none font-mono border border-purple-500/30 cursor-pointer font-medium"
                        title={`Linked Work Order ${woNum}`}
                      >
                        WO: {woNum}
                      </span>
                    ));
                  })()}
                  {(() => {
                    const linkedPoList: string[] = Array.isArray(row.poIds) 
                      ? row.poIds 
                      : (typeof row.poIds === 'string'
                          ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                          : (row.poId ? [row.poId] : []));
                    return (
                      <div className="flex items-center gap-1 flex-wrap">
                        {linkedPoList.map((poNum: string) => (
                          <span 
                            key={poNum}
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${poNum}`); }}
                            className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                            title={`View Purchase Order ${poNum}`}
                          >
                            PO: {poNum}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )
        },
        { key: 'requestedBy', header: 'Requester', width: '150px', render: v => <span className="text-xs text-secondary">{String(v)}</span> },
        { key: 'status', header: 'Status', width: '120px', render: v => <Badge value={String(v)} size="sm" /> },
        { key: 'priority', header: 'Priority', width: '90px', render: v => <span className={`text-xs font-semibold uppercase ${v === 'High' ? 'text-red-500' : 'text-muted'}`}>{String(v)}</span> },
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
          key: 'grn', header: 'Goods Receipt (GRN)', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 bg-surface2 border border-theme-subtle text-secondary flex items-center justify-center`}>
                {row.isCustomerSample ? <Package size={14} className="text-secondary" /> : <Truck size={14} className="text-secondary" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                {(() => {
                    if (row.isCustomerSample) {
                      return <p className="text-xs text-muted truncate mt-0.5 font-mono">Ref: {row.quoNo || row.leadId || 'Customer Sample'}</p>;
                    }
                    const linkedPoList: string[] = Array.isArray(row.poIds)
                      ? row.poIds
                      : (typeof row.poIds === 'string'
                          ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                          : (row.poId ? [row.poId] : []));
                    return (
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="text-xs text-muted font-mono">PO:</span>
                        {linkedPoList.length > 0 ? linkedPoList.map((pNum: string) => (
                          <span 
                            key={pNum}
                            onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${pNum}`); }}
                            className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                          >
                            {pNum}
                          </span>
                        )) : <span className="text-xs bg-surface2 text-secondary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle font-bold">Direct Receipt</span>}
                      </div>
                    );
                  })()}
              </div>
            </div>
          )
        },
        { key: 'supplier', header: 'Source', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{row.isCustomerSample ? (row.customerName || row.leadName || 'Customer') : getSupplierName(row.supplierId)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: (_, row) => row.isCustomerSample ? <Badge value="Sample" size="sm" /> : <Badge value={String(row.status)} size="sm" /> },
        { key: 'vehicleNo', header: 'Carrier / Receiver', width: '120px', render: (_, row) => <span className="text-xs text-muted font-mono">{row.isCustomerSample ? (row.receivedBy || 'System') : String(row.vehicleNo)}</span> },
        { key: 'date', header: 'Receipt Date', sortable: true, render: (_, row) => <span className="text-xs text-muted">{(row.isCustomerSample ? (row.receivedAt || row.createdAt || '') : (row.date || row.createdAt || '')).split('T')[0]}</span> },
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
                {row.poId && (
                  <span 
                    onClick={(e) => { e.stopPropagation(); navigate(`/purchasing/po-builder/${row.poId}`); }}
                    className="text-xs bg-surface2 text-secondary hover:text-primary px-2 py-0.5 rounded-none font-mono font-medium border border-theme-subtle cursor-pointer font-bold"
                    title={`View Linked Purchase Order ${row.poId}`}
                  >
                    PO: {row.poId}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      },
      { key: 'supplier', header: 'Vendor', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierName(row.supplierId)}</span> },
      { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
      { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300 font-mono">{formatCurrency(Number(v), true)}</span> },
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
  };

  const getAddLabel = () => {
    switch (activeTab) {
      case 'po': return 'Add Purchase Order';
      case 'mr': return 'Add Material Request';
      case 'grn': return 'Add Receipt (GRN)';
      case 'bill': return 'Add Supplier Bill';
    }
  };
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading purchasing data...</div>;


  const getStatusOptions = (): StatusFilter[] => {
    switch (activeTab) {
      case 'mr': return ['all', 'pending', 'approved', 'ordered', 'rejected'];
      case 'po': return ['all', 'draft', 'sent', 'ordered', 'partially_received', 'received'];
      case 'grn': return ['all', 'received'];
      case 'bill': return ['all', 'unpaid', 'paid'];
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
          onRowClick={row => {
            if (openActionId) return;
            if (activeTab === 'grn') {
              if (row.isCustomerSample) {
                setPrintGrnData({ grn: row, group: { quoNo: row.quoNo, leadId: row.leadId, leadName: row.customerName || row.leadName } });
              } else {
                navigate(`/purchasing/grn-builder/${row.id}`);
              }
            } else if (activeTab === 'po') {
              navigate(`/purchasing/po-builder/${row.id}`);
            } else if (activeTab === 'mr') {
              navigate(`/purchasing/mr-builder/${row.id}`);
            } else if (activeTab === 'bill') {
              navigate(`/purchasing/bill-builder?grn=${row.grnId || row.id}`);
            }
          }}
        />
      </GlassCard>

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
                exportToPdf('grn-print-section', `GRN-${printGrnData.grn.id}.pdf`);
              }} className="bg-surface border border-theme-subtle hover:bg-surface2">Export PDF</Button>
              <Button variant="primary" onClick={() => printElement('grn-print-section', `GRN_${printGrnData.grn.id}`)}>Print</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


