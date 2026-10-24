import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest, Package, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CustomerGRNPrintView } from '@/components/CustomerGRNPrintView';
import { useSettings } from '@/contexts/SettingsContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { useMaterialRequests, usePurchaseOrders, useGRNs, useBills } from '@/hooks/usePurchasing';
import { useSuppliers } from '@/hooks/useData';
import { fetchAllCustomerGRNs, deleteGRN, deleteCustomerGRN, deleteBill } from '@/lib/api';
import { formatCurrency, relativeTime } from '@/lib/utils';
import { TraceabilityDropdown, TraceNode } from '@/components/TraceabilityDropdown';
import { PageHelpButton } from '@/components/help/PageHelpButton';

type Tab = 'po' | 'mr' | 'grn' | 'bill';
type StatusFilter = 'all' | 'draft' | 'pending' | 'approved' | 'partially_ordered' | 'ordered' | 'partially_received' | 'rejected' | 'sent' | 'received' | 'unpaid' | 'paid';

export const PurchasingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('po');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [grnSourceFilter, setGrnSourceFilter] = useState<'all' | 'vendor' | 'sample'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const { data: mrs, loading: loadingMRs } = useMaterialRequests();
  const { data: pos, loading: loadingPOs } = usePurchaseOrders();
  const { data: grns, loading: loadingGRNs } = useGRNs();
  const { data: bills, loading: loadingBills } = useBills();
  const { data: suppliers } = useSuppliers();

    const { settings } = useSettings();
  const [printGrnData, setPrintGrnData] = useState<any>(null);
  const [custGrns, setCustGrns] = useState<any[]>([]);
  useEffect(() => {
    fetchAllCustomerGRNs().then(setCustGrns).catch(console.error);
  }, []);

  const handleDeleteSupplierGRN = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete GRN ${id}?\n\nThis will revert received stock in inventory and update the PO status.`)) return;
    try {
      await deleteGRN(id);
      window.location.reload();
    } catch (e: any) {
      alert(e.message || 'Failed to delete GRN');
    }
  };

  const handleDeleteCustomerGRN = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete customer sample GRN ${id}?`)) return;
    try {
      await deleteCustomerGRN(id);
      setCustGrns(prev => prev.filter(g => g.id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete customer sample GRN');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete Bill ${id}?\n\nThis will revert the entry in the supplier ledger and recalculate the PO billing status.`)) return;
    try {
      await deleteBill(id);
      window.location.reload();
    } catch (e: any) {
      alert(e.message || 'Failed to delete Bill');
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
    const term = search.toLowerCase();
    const matchSearch = !search || [
      item.id, 
      item.supplierId, 
      getSupplierName(item.supplierId), 
      item.status, 
      item.requestedBy, 
      item.invoiceNo,
      item.quoNo,
      item.customerName,
      item.leadName,
      item.vehicleNo
    ].some(v => v?.toLowerCase().includes(term));

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
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/po-builder/${row.id}`)} className="text-xs uppercase h-7 px-2.5 rounded-none">View</Button>
            {row.status?.toLowerCase() !== 'draft' && row.status?.toLowerCase() !== 'received' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/purchasing/grn-builder?po=${row.id}`)} 
                className={`text-xs uppercase h-7 px-2.5 rounded-none ${row.status?.toLowerCase() === 'partially_received' ? 'text-amber-500 font-bold hover:text-amber-400' : 'text-emerald-500'}`}
              >
                {row.status?.toLowerCase() === 'partially_received' ? 'Receive Balance' : 'GRN'}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/purchasing/bill-builder?po=${row.id}`)} 
              className="text-xs uppercase h-7 px-2.5 rounded-none text-amber-500 hover:text-amber-400 font-semibold border border-amber-500/20"
              title="Record Vendor Invoice for this PO"
            >
              + Bill
            </Button>
          </div>
        )}
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
                navigateUrl: '/production/work-orders'
              });
            });

            const linkedPoList: string[] = Array.isArray(row.poIds) 
              ? row.poIds 
              : (typeof row.poIds === 'string'
                  ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                  : (row.poId ? [row.poId] : []));
            
            linkedPoList.forEach(poNum => {
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
        { key: 'actions', header: '', align: 'right', render: (_, row) => {
          const linkedPoList: string[] = Array.isArray(row.poIds) 
            ? row.poIds 
            : (typeof row.poIds === 'string'
                ? (() => { try { const p = JSON.parse(row.poIds); return Array.isArray(p) ? p : [row.poIds]; } catch { return [row.poIds]; } })()
                : (row.poId ? [row.poId] : []));

          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/mr-builder/${row.id}`)} className="text-xs uppercase h-7 px-2.5 rounded-none">
                View MR
              </Button>
              {row.status?.toLowerCase() !== 'ordered' ? (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => navigate(`/purchasing/po-builder?mr=${row.id}`)} 
                  className={`text-xs uppercase h-7 px-2.5 rounded-none ${row.status === 'partially_ordered' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {row.status === 'partially_ordered' ? 'Order Balance' : 'Create PO'}
                </Button>
              ) : (
                linkedPoList.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/purchasing/po-builder/${linkedPoList[linkedPoList.length - 1]}`)} 
                    className="text-xs uppercase h-7 px-2.5 rounded-none text-emerald-500 hover:text-emerald-400 font-semibold"
                  >
                    {linkedPoList.length > 1 ? `View POs (${linkedPoList.length})` : 'View PO'}
                  </Button>
                )
              )}
            </div>
          );
        }}
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
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <div className="flex justify-end gap-1.5 items-center">
               {row.isCustomerSample ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setPrintGrnData({ grn: row, group: { quoNo: row.quoNo, leadId: row.leadId, leadName: row.customerName || row.leadName } })} className="text-xs uppercase h-7 px-2.5 rounded-none text-blue-500">Print Sample GRN</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomerGRN(row.id)} className="text-xs uppercase h-7 px-2.5 rounded-none text-red-500 hover:text-red-400 hover:bg-red-500/10">Delete</Button>
                  </>
               ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/grn-builder/${row.id}`)} className="text-xs uppercase h-7 px-2.5 rounded-none text-primary">View</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/bill-builder?grn=${row.id}`)} className="text-xs uppercase h-7 px-2.5 rounded-none text-emerald-500">Create Bill</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSupplierGRN(row.id)} className="text-xs uppercase h-7 px-2.5 rounded-none text-red-500 hover:text-red-400 hover:bg-red-500/10">Delete</Button>
                  </>
               )}
            </div>
        )}
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
        key: 'actions', header: '', align: 'right',
        render: (_, row) => (
          <div className="flex justify-end gap-1.5 items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/inventory/suppliers/${row.supplierId}`)} 
              className="text-xs uppercase h-7 px-2.5 rounded-none text-amber-500 font-semibold hover:text-amber-400"
            >
              Pay / Ledger
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDeleteBill(row.id)} 
              className="text-xs uppercase h-7 px-2.5 rounded-none text-red-500 hover:text-red-400 hover:bg-red-500/10"
              title="Delete this bill and revert supplier ledger"
            >
              Delete
            </Button>
          </div>
        )
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Vendor:</span>
                <select
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                  className="bg-surface border border-theme-subtle rounded px-2.5 py-1 text-primary text-xs focus:border-rex-500 outline-none max-w-[180px]"
                >
                  <option value="all">All Vendors ({suppliers.length})</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
    </div>
  );
};


