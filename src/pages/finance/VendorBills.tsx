import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, Receipt, FileText, CheckCircle2, Clock, 
  AlertCircle, CreditCard, Building2, Download, Paperclip, Eye, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Trash2
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
import { deleteBill } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';
import { PageHelpButton } from '@/components/help/PageHelpButton';
import { useAuth } from '@/contexts/AuthContext';

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid' | 'overdue';
type SourceFilter = 'all' | 'grn' | 'manual';

export const VendorBills: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirm, toast } = useDialog();
  const { user } = useAuth();
  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.roleName?.toLowerCase() === 'admin' ||
    user?.roleName?.toLowerCase().includes('administrator') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin')
  );

  const { data: bills = [], loading, refetch } = useBills();
  const { data: suppliers = [] } = useSuppliers();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [paymentBill, setPaymentBill] = useState<any | null>(null);
  const [showMultiSettlement, setShowMultiSettlement] = useState<boolean>(false);
  const [multiSettlementSupplier, setMultiSettlementSupplier] = useState<any | null>(null);

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
            {row.billAttachment && (
              <Button
                variant="outline"
                size="sm"
                icon={Paperclip}
                onClick={() => openDataUriOrUrl(row.billAttachment, `Vendor Bill - ${row.invoiceNo || row.id}`)}
                className="h-7 text-xs px-2 text-blue-600 hover:bg-blue-500/10"
                title="View Vendor Document"
              >
                Doc
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => navigate(`/purchasing/bill-builder?id=${row.id}`)}
              className="h-7 text-xs px-2 text-zinc-600 hover:bg-surface2"
              title="View / Edit Bill"
            >
              Edit
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => handleDeleteBill(row.id)}
                className="h-7 text-xs px-2 text-rose-500 hover:bg-rose-500/10"
                title="Delete Bill"
              />
            )}
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
          <Button
            variant="outline"
            size="sm"
            icon={ArrowDownRight}
            onClick={() => navigate('/finance/payables')}
            className="border border-theme-subtle text-xs font-semibold"
          >
            Payables Hub
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
            className="bg-rex-600 hover:bg-rex-700 text-xs font-bold"
          >
            + Create Vendor Bill
          </Button>
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

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 text-xs font-semibold text-secondary max-w-[160px]"
            >
              <option value="all">All Vendors</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.company || s.name}</option>
              ))}
            </select>
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
    </div>
  );
};
