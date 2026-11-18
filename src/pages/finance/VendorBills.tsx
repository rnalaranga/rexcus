import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, Receipt, FileText, CheckCircle2, Clock, 
  AlertCircle, CreditCard, Building2, Download, Paperclip, Eye, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Trash2,
  ChevronDown, ExternalLink, Edit
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { formatCurrency, formatDate, openDataUriOrUrl } from '@/lib/utils';
import { RecordBillPaymentModal } from '@/components/purchasing/RecordBillPaymentModal';
import { MultiBillSettlementModal } from '@/components/purchasing/MultiBillSettlementModal';
import { ViewVendorBillModal } from '@/components/purchasing/ViewVendorBillModal';
import { PaymentVoucherPrintModal } from '@/components/finance/PaymentVoucherPrintModal';
import { deleteBill, getPaymentVouchers } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';
import { PageHelpButton } from '@/components/help/PageHelpButton';
import { useAuth } from '@/contexts/AuthContext';
import { SupplierAutocomplete } from '@/components/ui/SupplierAutocomplete';

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid' | 'overdue';
type SourceFilter = 'all' | 'grn' | 'manual';

export const VendorBills: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm, toast } = useDialog();
  const { user, can } = useAuth();
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  );

  const canManageBills = Boolean(
    isAdmin ||
    can('purchasing.bills.manage') ||
    can('approvals.bills_payments') ||
    user?.role === 'finance_manager' ||
    user?.role === 'accountant'
  );

  const { data: bills = [], loading, refetch } = useBills();
  const { data: suppliers = [] } = useSuppliers();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [printVoucher, setPrintVoucher] = useState<any | null>(null);

  useEffect(() => {
    getPaymentVouchers()
      .then((res: any) => setVouchers(Array.isArray(res) ? res : []))
      .catch(() => setVouchers([]));
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [paymentBill, setPaymentBill] = useState<any | null>(null);
  const [viewingBill, setViewingBill] = useState<any | null>(null);
  const [isSyncingGL, setIsSyncingGL] = useState<boolean>(false);

  const handleSyncGL = async () => {
    try {
      setIsSyncingGL(true);
      const res = await fetch('/api/finance/bills/sync-gl', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Sync Complete! ${data.syncedBills} bills synced, ${data.glEntriesCreated} GL entries updated, Input VAT: Rs. ${Number(data.vatReceivableTotal || 0).toLocaleString()}`, 'success');
        refetch();
      } else {
        toast(data.error || 'Failed to sync bills to GL', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error syncing bills to GL', 'error');
    } finally {
      setIsSyncingGL(false);
    }
  };
  const [showMultiSettlement, setShowMultiSettlement] = useState<boolean>(false);
  const [multiSettlementSupplier, setMultiSettlementSupplier] = useState<any | null>(null);

  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [actionCoords, setActionCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.bill-action-menu-dropdown') && !target.closest('.bill-action-trigger-btn')) {
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

  const getSupplierName = (id: string) => {
    const s = suppliers.find((sp: any) => sp.id === id);
    return s?.company || s?.name || id || 'Unknown Vendor';
  };

  // Distinct Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((b: any) => {
      if (b.billCategory) set.add(b.billCategory);
    });
    return Array.from(set);
  }, [bills]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b: any) => {
      const billTotal = Number(b.amount || b.totalAmount || 0);
      const paid = Number(b.paidAmount || 0);
      const due = Math.max(0, billTotal - paid);
      const isOverdue = due > 0 && b.dueDate && new Date(b.dueDate).getTime() < new Date().setHours(0,0,0,0);

      // Status
      if (statusFilter === 'unpaid' && (due <= 0 || (b.status === 'paid'))) return false;
      if (statusFilter === 'partial' && (paid <= 0 || due <= 0)) return false;
      if (statusFilter === 'paid' && due > 0 && b.status !== 'paid') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      // Source
      const hasGrnOrPo = Boolean(b.grnId || b.poId);
      if (sourceFilter === 'grn' && !hasGrnOrPo) return false;
      if (sourceFilter === 'manual' && hasGrnOrPo) return false;

      // Category
      if (categoryFilter !== 'all' && b.billCategory !== categoryFilter) return false;

      // Supplier
      if (supplierFilter !== 'all' && b.supplierId !== supplierFilter) return false;

      // Date Range
      if (startDate && b.date && b.date.slice(0, 10) < startDate) return false;
      if (endDate && b.date && b.date.slice(0, 10) > endDate) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const sName = getSupplierName(b.supplierId).toLowerCase();
        const bNo = (b.billNo || b.id || '').toLowerCase();
        const invNo = (b.invoiceNo || '').toLowerCase();
        const cat = (b.billCategory || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();
        if (!bNo.includes(q) && !invNo.includes(q) && !sName.includes(q) && !cat.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [bills, search, statusFilter, sourceFilter, categoryFilter, supplierFilter, startDate, endDate, suppliers]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalBills = 0;
    let totalGross = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let overdueCount = 0;

    bills.forEach((b: any) => {
      totalBills++;
      const amt = Number(b.amount || b.totalAmount || 0);
      const paid = Number(b.paidAmount || 0);
      const due = Math.max(0, amt - paid);
      totalGross += amt;
      totalPaid += paid;
      totalDue += due;
      if (due > 0 && b.dueDate && new Date(b.dueDate).getTime() < new Date().setHours(0,0,0,0)) {
        overdueCount++;
      }
    });

    return { totalBills, totalGross, totalPaid, totalDue, overdueCount };
  }, [bills]);

  const handleDeleteBill = async (id: string) => {
    if (await showConfirm('Are you sure you want to delete this vendor bill? This will reverse the Accounts Payable ledger entry.', 'Delete Vendor Bill', { confirmLabel: 'Delete' })) {
      try {
        await deleteBill(id);
        toast('Vendor bill deleted successfully', 'success');
        refetch();
      } catch (err: any) {
        toast(err.message || 'Failed to delete vendor bill', 'error');
      }
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'billNo',
      header: 'Bill No / Date',
      render: (val, row) => (
        <div>
          <div className="font-mono font-bold text-xs text-primary flex items-center gap-1.5">
            <span>{row.billNo || row.id}</span>
            {(row.grnId || row.poId) ? (
              <span className="text-[9.5px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 font-semibold uppercase">
                {row.grnId ? 'GRN' : 'PO'}
              </span>
            ) : (
              <span className="text-[9.5px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold uppercase">
                Direct
              </span>
            )}
          </div>
          <div className="text-[10.5px] text-muted flex items-center gap-1.5 mt-0.5">
            <Calendar size={11} /> {formatDate(row.date)}
          </div>
        </div>
      )
    },
    {
      key: 'supplierId',
      header: 'Vendor / Category',
      render: (val, row) => (
        <div>
          <div className="font-bold text-xs text-primary">{getSupplierName(row.supplierId)}</div>
          <div className="text-[10px] text-muted font-medium mt-0.5 flex items-center gap-1">
            <span className="text-zinc-500">{row.billCategory || 'General Purchase'}</span>
            {row.invoiceNo && <span className="font-mono text-zinc-400">• Inv: {row.invoiceNo}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (val, row) => {
        const amt = Number(row.amount || row.totalAmount || 0);
        const paid = Number(row.paidAmount || 0);
        const due = Math.max(0, amt - paid);
        const isOverdue = due > 0 && row.dueDate && new Date(row.dueDate).getTime() < new Date().setHours(0,0,0,0);
        return (
          <div>
            <div className={`text-xs font-mono font-semibold ${isOverdue ? 'text-rose-500 font-bold' : 'text-secondary'}`}>
              {row.dueDate ? formatDate(row.dueDate) : '-'}
            </div>
            {isOverdue && (
              <span className="text-[9.5px] font-bold text-rose-500 flex items-center gap-0.5 mt-0.5">
                <AlertCircle size={10} /> Overdue
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'amount',
      header: 'Gross Amount',
      align: 'right',
      render: (val, row) => (
        <span className="font-mono font-bold text-xs text-primary">
          {formatCurrency(Number(row.amount || row.totalAmount || 0))}
        </span>
      )
    },
    {
      key: 'paidAmount',
      header: 'Paid / Balance',
      align: 'right',
      render: (val, row) => {
        const total = Number(row.amount || row.totalAmount || 0);
        const paid = Number(row.paidAmount || 0);
        const due = Math.max(0, total - paid);
        return (
          <div className="text-right">
            <div className="text-[11px] font-mono font-semibold text-emerald-600">
              {formatCurrency(paid)}
            </div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${due > 0 ? 'text-amber-500' : 'text-muted'}`}>
              Due: {formatCurrency(due)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => {
        const total = Number(row.amount || row.totalAmount || 0);
        const paid = Number(row.paidAmount || 0);
        const due = Math.max(0, total - paid);
        if (due <= 0 || row.status === 'paid') {
          return <Badge value="Paid" variant="success" size="sm" />;
        }
        if (paid > 0) {
          return <Badge value="Partial" variant="warning" size="sm" />;
        }
        return <Badge value="Unpaid" variant="danger" size="sm" />;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (val, row) => {
        const total = Number(row.amount || row.totalAmount || 0);
        const paid = Number(row.paidAmount || 0);
        const due = Math.max(0, total - paid);
        const isOpen = openActionId === row.id;

        let menuStyle: React.CSSProperties = {};
        if (isOpen && actionCoords) {
          const PADDING = 8;
          const MENU_WIDTH = 210;

          let left = actionCoords.right - MENU_WIDTH;
          if (left < PADDING) left = PADDING;
          if (left + MENU_WIDTH > window.innerWidth - PADDING) {
            left = window.innerWidth - MENU_WIDTH - PADDING;
          }

          const spaceBelow = window.innerHeight - actionCoords.bottom - PADDING;
          const spaceAbove = actionCoords.top - PADDING;
          const openUpwards = spaceBelow < 260 && spaceAbove > spaceBelow;
          const maxHeight = Math.min(380, Math.max(180, (openUpwards ? spaceAbove : spaceBelow) - 10));

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
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            {due > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={CreditCard}
                onClick={() => setPaymentBill(row)}
                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold"
                title="Record Bill Payment"
              >
                Pay Bill
              </Button>
            )}

            <div className="relative inline-block text-left" data-no-row-click="true">
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
                className={`bill-action-trigger-btn relative h-7 px-2.5 text-xs font-semibold border flex items-center gap-1 transition-colors rounded-none cursor-pointer ${
                  isOpen
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-surface hover:bg-surface2 text-primary border-theme-subtle'
                }`}
                title="Bill Actions"
              >
                <span>Actions</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && actionCoords && typeof document !== 'undefined' && createPortal(
                <div
                  data-no-row-click="true"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  style={menuStyle}
                  className="bill-action-menu-dropdown bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl py-1.5 text-left rounded-none animate-in fade-in zoom-in-95 duration-100 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar"
                >
                  <div className="px-3.5 py-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono border-b border-theme-subtle/50 mb-1">
                    Bill Actions (#{row.invoiceNo || row.id})
                  </div>

                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDropdown();
                      setViewingBill(row);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eye size={13} className="text-zinc-400" />
                    <span>View Bill Details</span>
                  </button>

                  <button
                    type="button"
                    data-no-row-click="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeDropdown();
                      navigate(`/purchasing/bill-builder?id=${row.id}`);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit size={13} className="text-zinc-400" />
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
                      className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Paperclip size={13} className="text-blue-500" />
                      <span>View Attached Document</span>
                    </button>
                  )}

                  {paid > 0 && (() => {
                    const matchedVoucher = vouchers.find((v: any) =>
                      v.relatedBillId === row.id ||
                      v.relatedBillNo === row.id ||
                      (row.invoiceNo && v.relatedBillNo === row.invoiceNo) ||
                      (v.description && v.description.includes(row.id))
                    );
                    if (!matchedVoucher) return null;
                    return (
                      <>
                        <button
                          type="button"
                          data-no-row-click="true"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeDropdown();
                            setPrintVoucher(matchedVoucher);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 cursor-pointer transition-colors font-semibold"
                        >
                          <Receipt size={13} className="text-emerald-500" />
                          <span>View Payment Receipt ({matchedVoucher.voucherNo || matchedVoucher.id})</span>
                        </button>
                        {matchedVoucher.depositSlip && (
                          <button
                            type="button"
                            data-no-row-click="true"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeDropdown();
                              openDataUriOrUrl(matchedVoucher.depositSlip, `Payment Slip - ${matchedVoucher.voucherNo || matchedVoucher.id}`);
                            }}
                            className="w-full text-left px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Paperclip size={13} className="text-blue-500" />
                            <span>View Payment Slip</span>
                          </button>
                        )}
                        {matchedVoucher.chequeNo && (
                          <div className="mx-2 my-1 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10.5px] space-y-0.5">
                            <div className="font-bold text-amber-700 dark:text-amber-400 font-mono">
                              Cheque #{matchedVoucher.chequeNo}
                            </div>
                            {matchedVoucher.chequeDate && (
                              <div className="text-zinc-600 dark:text-zinc-400">
                                Chq Date: <span className="font-mono">{formatDate(matchedVoucher.chequeDate)}</span>
                              </div>
                            )}
                            {matchedVoucher.bankName && (
                              <div className="text-zinc-600 dark:text-zinc-400">
                                Bank: {matchedVoucher.bankName}
                              </div>
                            )}
                            {matchedVoucher.chequeStatus && (
                              <div className="text-zinc-600 dark:text-zinc-400">
                                Status: <span className="font-semibold">{matchedVoucher.chequeStatus}</span>
                                {matchedVoucher.realizedDate && ` (${formatDate(matchedVoucher.realizedDate)})`}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {due > 0 && (
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
                      <span>Record Payment</span>
                    </button>
                  )}

                  {isAdmin && (
                    <div className="border-t border-theme-subtle/50 mt-1 pt-1">
                      <button
                        type="button"
                        data-no-row-click="true"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          closeDropdown();
                          handleDeleteBill(row.id);
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors font-medium"
                      >
                        <Trash2 size={13} className="text-rose-500" />
                        <span>Delete Bill</span>
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
              <Receipt className="text-amber-500" size={26} /> Vendor Bills
            </h1>
            <Badge value={`${filteredBills.length} Bills`} size="sm" />
          </div>
          <p className="text-xs text-muted mt-0.5">
            Manage all vendor invoices, utility bills (CEB, Telecom), GRN-linked purchases, and Accounts Payable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton moduleId="vendor-bills" />
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => refetch()}
            loading={loading}
            className="border border-theme-subtle text-xs"
          >
            Refresh
          </Button>
          {canManageBills && (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={handleSyncGL}
              loading={isSyncingGL}
              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs font-semibold"
              title="Post/Sync vendor bill VAT & expenses to GL (VAT Receivables)"
            >
              Sync Bills to VAT / GL
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownRight}
            onClick={() => navigate('/finance/payables')}
            className="border border-theme-subtle text-xs font-semibold"
          >
            Payables Hub
          </Button>
          {canManageBills && (
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
          )}
          {canManageBills && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/purchasing/bill-builder')}
              className="bg-rex-600 hover:bg-rex-700 text-xs font-bold"
            >
              + Create Vendor Bill
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Bills Logged</div>
          <div className="text-lg font-black text-primary font-mono mt-0.5">{metrics.totalBills}</div>
          <div className="text-[11px] text-muted font-mono mt-0.5">{formatCurrency(metrics.totalGross)}</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-emerald-500">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Total Settled</div>
          <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">{formatCurrency(metrics.totalPaid)}</div>
          <div className="text-[11px] text-muted font-mono mt-0.5">Cleared via AP Payments</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Outstanding Balance Due</div>
          <div className="text-lg font-black text-amber-500 font-mono mt-0.5">{formatCurrency(metrics.totalDue)}</div>
          <div className="text-[11px] text-muted font-mono mt-0.5">Pending Vendor Settlements</div>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-rose-500">
          <div className="text-[10px] uppercase font-bold text-muted tracking-wider">Overdue Bills</div>
          <div className="text-lg font-black text-rose-500 font-mono mt-0.5">{metrics.overdueCount}</div>
          <div className="text-[11px] text-rose-600/80 font-mono mt-0.5">Past Due Date</div>
        </GlassCard>
      </div>

      {/* Filter Toolbar */}
      <GlassCard className="p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchBar
            placeholder="Search Bill #, Invoice #, Vendor Name, Notes..."
            value={search}
            onChange={setSearch}
            className="flex-1 min-w-[260px]"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center border border-theme-subtle rounded-lg p-0.5 bg-surface text-xs font-semibold">
              {(['all', 'unpaid', 'partial', 'paid', 'overdue'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded capitalize transition-colors ${
                    statusFilter === s 
                      ? 'bg-amber-500 text-white font-bold' 
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as SourceFilter)}
              className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary"
            >
              <option value="all">All Sources</option>
              <option value="grn">GRN / PO Linked</option>
              <option value="manual">Direct Expenses (CEB/Telco/Rent)</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary"
              >
                <option value="all">All Expense Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Supplier Autocomplete Filter */}
            <div className="w-52">
              <SupplierAutocomplete
                value={supplierFilter === 'all' ? '' : supplierFilter}
                onChange={(sId) => setSupplierFilter(sId || 'all')}
                suppliers={suppliers}
                placeholder="Filter: All Vendors..."
                showClear={true}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-theme-subtle/50 text-xs">
          <span className="text-muted font-bold flex items-center gap-1">
            <Calendar size={12} /> Date Range:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs"
          />
          <span className="text-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-surface border border-theme-subtle rounded px-2 py-1 text-xs"
          />
          {(startDate || endDate || search || statusFilter !== 'all' || sourceFilter !== 'all' || categoryFilter !== 'all' || supplierFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSourceFilter('all');
                setCategoryFilter('all');
                setSupplierFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-rose-500 hover:text-rose-600 h-6 px-2 ml-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Data Table */}
      <GlassCard className="p-0 overflow-hidden">
        {loading && bills.length === 0 ? (
          <div className="p-10 text-center text-muted">Loading vendor bills...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredBills}
            keyExtractor={item => item.id}
            pagination
            itemsPerPage={25}
            itemLabel="vendor bills"
          />
        )}
      </GlassCard>

      {/* Record Bill Payment Modal (Single Bill) */}
      {paymentBill && (
        <RecordBillPaymentModal
          isOpen={Boolean(paymentBill)}
          onClose={() => setPaymentBill(null)}
          bill={paymentBill}
          onSuccess={() => {
            refetch();
            setPaymentBill(null);
          }}
          toast={toast}
        />
      )}

      {/* Multi-Bill Settlement Modal (Bundle / Knock-Off) */}
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
            refetch();
            toast?.('Vendor bills settled successfully!', 'success');
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

      <PaymentVoucherPrintModal
        isOpen={!!printVoucher}
        onClose={() => setPrintVoucher(null)}
        voucher={printVoucher}
      />
    </div>
  );
};
