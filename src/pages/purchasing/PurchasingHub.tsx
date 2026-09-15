import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useMaterialRequests, usePurchaseOrders, useGRNs, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { formatCurrency, relativeTime } from '@/lib/utils';

type Tab = 'po' | 'mr' | 'grn' | 'bill';
type StatusFilter = 'all' | 'draft' | 'pending' | 'sent' | 'received' | 'unpaid' | 'paid';

export const PurchasingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('po');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const navigate = useNavigate();

  const { data: mrs, loading: loadingMRs } = useMaterialRequests();
  const { data: pos, loading: loadingPOs } = usePurchaseOrders();
  const { data: grns, loading: loadingGRNs } = useGRNs();
  const { data: bills, loading: loadingBills } = useBills();
  const { data: suppliers } = useSuppliers();

  const getSupplierName = (id: string) => suppliers.find((s: any) => s.id === id)?.name || id;
  const getSupplierContact = (id: string) => suppliers.find((s: any) => s.id === id)?.email || 'N/A';

  const loading = loadingMRs || loadingPOs || loadingGRNs || loadingBills;
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading purchasing data...</div>;

  const handleAdd = () => {
    switch (activeTab) {
      case 'po': navigate('/purchasing/po-builder'); break;
      case 'mr': navigate('/purchasing/mr-builder'); break;
      case 'grn': navigate('/purchasing/grn-builder'); break;
      case 'bill': navigate('/purchasing/bill-builder'); break;
    }
  };

  const currentData = activeTab === 'po' ? pos : activeTab === 'mr' ? mrs : activeTab === 'grn' ? grns : bills;

  const filtered = currentData.filter((item: any) => {
    const term = search.toLowerCase();
    const matchSearch = [item.id, item.supplierId, getSupplierName(item.supplierId), item.status, item.requestedBy, item.invoiceNo].some(v => v?.toLowerCase().includes(term));
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const generateColumns = (): Column<any>[] => {
    if (activeTab === 'po') {
      return [
        {
          key: 'supplier', header: 'Vendor / PO', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-rex-700 border border-rex-600/40 flex items-center justify-center">
                <FileText size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{getSupplierName(row.supplierId)}</p>
                <p className="text-[10px] text-muted truncate mt-0.5 font-mono">{row.id}</p>
              </div>
            </div>
          )
        },
        { key: 'contact', header: 'Contact', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierContact(row.supplierId)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
        { key: 'totalAmount', header: 'Amount', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span> },
        { key: 'date', header: 'Order Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/po-builder/${row.id}`)} className="text-[10px] uppercase h-6">View</Button>
        )}
      ];
    }
    if (activeTab === 'mr') {
      return [
        {
          key: 'mr', header: 'Material Request', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-blue-600 border border-blue-500/40 flex items-center justify-center">
                <GitPullRequest size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <p className="text-[10px] text-muted truncate mt-0.5">{row.department} Dept</p>
              </div>
            </div>
          )
        },
        { key: 'requestedBy', header: 'Requester', width: '150px', render: v => <span className="text-xs text-secondary">{String(v)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
        { key: 'priority', header: 'Priority', width: '90px', render: v => <span className={`text-[10px] font-bold uppercase ${v === 'High' ? 'text-red-500' : 'text-muted'}`}>{String(v)}</span> },
        { key: 'date', header: 'Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/po-builder?mr=${row.id}`)} className="text-[10px] uppercase h-6">Create PO</Button>
        )}
      ];
    }
    if (activeTab === 'grn') {
      return [
        {
          key: 'grn', header: 'Goods Receipt (GRN)', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 border border-emerald-500/40 flex items-center justify-center">
                <Truck size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <p className="text-[10px] text-muted truncate mt-0.5 font-mono">Ref: {row.poId}</p>
              </div>
            </div>
          )
        },
        { key: 'supplier', header: 'Vendor', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierName(row.supplierId)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
        { key: 'vehicleNo', header: 'Carrier', width: '120px', render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
        { key: 'date', header: 'Receipt Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/bill-builder?grn=${row.id}`)} className="text-[10px] uppercase h-6 text-emerald-500">Create Bill</Button>
        )}
      ];
    }
    return [
      {
        key: 'bill', header: 'Supplier Bill', sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center">
              <CreditCard size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
              <p className="text-[10px] text-muted truncate mt-0.5 font-mono">INV: {row.invoiceNo}</p>
            </div>
          </div>
        )
      },
      { key: 'supplier', header: 'Vendor', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierName(row.supplierId)}</span> },
      { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
      { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: v => <span className="text-xs font-semibold text-rex-600 dark:text-rex-300">{formatCurrency(Number(v), true)}</span> },
      { key: 'date', header: 'Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Purchasing Hub</h1>
          <p className="text-xs text-muted mt-0.5">{pos.length} total orders · {grns.length} receipts · {mrs.length} requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Download}>Export</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>{getAddLabel()}</Button>
        </div>
      </div>

      <GlassCard className="p-2 flex items-center gap-2 flex-wrap">
        <SearchBar placeholder="Search ID, Vendor, Invoice..." value={search} onChange={setSearch} className="w-80" />
        <div className="w-px h-6 bg-theme-subtle mx-2" />
        
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Type:</span>
        {(['po', 'mr', 'grn', 'bill'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-2.5 py-1 text-xs border transition-colors ${activeTab === t ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>{t.toUpperCase()}</button>
        ))}

        <div className="w-px h-6 bg-theme-subtle mx-2" />
        
        <span className="text-xs text-muted flex items-center gap-1.5"><Filter size={12} /> Status:</span>
        {(['all', 'draft', 'sent', 'received', 'unpaid', 'paid'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 text-xs border transition-colors ${statusFilter === s ? 'bg-rex-500/10 border-rex-500/35 text-rex-700 dark:text-rex-300' : 'bg-surface border-theme text-secondary hover:border-rex-500/30'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <DataTable columns={generateColumns()} data={filtered} keyExtractor={row => row.id} />
      </GlassCard>
    </div>
  );
};

