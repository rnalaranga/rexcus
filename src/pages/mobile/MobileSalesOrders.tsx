import { createPortal } from 'react-dom';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, Eye, Filter, ArrowLeft, RefreshCw, 
  Building2, CheckCircle2, Clock, AlertTriangle, DollarSign,
  ChevronRight, Calendar, User, Tag, Receipt, X, Package, Truck, FileText
} from 'lucide-react';
import { useFinishedGoodsOrders, useQuotations, useCustomers } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { SalesOrderPrintView } from '@/components/crm/SalesOrderPrintView';
import { MobileA4Preview } from '@/components/mobile/MobileA4Preview';
import { formatCurrency, formatDate } from '@/lib/utils';

export const MobileSalesOrders: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { data: rawOrders = [], loading, refetch } = useFinishedGoodsOrders();
  const { data: quotations = [] } = useQuotations();
  const { data: customers = [] } = useCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'usd' | 'lkr'>('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'details' | 'letterhead'>('details');

  // Enriched Sales Orders
  const orders = useMemo(() => {
    return rawOrders.map((o: any) => {
      let itemsList: any[] = [];
      if (o.items) {
        try {
          itemsList = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        } catch (e) {}
      }

      const linkedQuote = quotations.find((q: any) => 
        (o.quoteId && String(q.id) === String(o.quoteId)) ||
        (o.quotationNo && (String(q.quotationNo) === String(o.quotationNo) || String(q.docNo) === String(o.quotationNo)))
      );

      const linkedCust = customers.find((c: any) => 
        (o.customerId && String(c.id) === String(o.customerId)) ||
        (o.customerName && (c.name?.toLowerCase() === o.customerName?.toLowerCase() || c.company?.toLowerCase() === o.customerName?.toLowerCase()))
      );

      const isUSD = Boolean(
        o.currency === 'USD' || 
        o.currency === '$' ||
        o.taxProfileId === 'tp_export_zero_rated' || 
        o.isForeign || 
        linkedQuote?.currency === 'USD' || 
        linkedCust?.currency === 'USD' || 
        linkedCust?.isForeign
      );

      const currency = isUSD ? 'USD' : (o.currency || 'LKR');
      const totalPrice = Number(o.totalPrice || o.totalAmount || 0);

      return {
        ...o,
        itemsList,
        isUSD,
        currency,
        totalPrice,
        customerDisplay: o.customerName || o.customerCompany || linkedCust?.name || linkedCust?.company || 'Customer',
        linkedQuote,
        linkedCust
      };
    });
  }, [rawOrders, quotations, customers]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      // Search
      if (searchQuery.trim()) {
        const qStr = searchQuery.toLowerCase().trim();
        const matchNo = o.orderNo?.toLowerCase().includes(qStr);
        const matchCust = o.customerDisplay?.toLowerCase().includes(qStr);
        const matchPo = o.customerPoNo?.toLowerCase().includes(qStr);
        const matchProd = o.productName?.toLowerCase().includes(qStr);
        if (!matchNo && !matchCust && !matchPo && !matchProd) return false;
      }

      // Status chip filter
      if (statusFilter === 'confirmed') {
        return o.status === 'Confirmed' || o.status === 'Approved';
      }
      if (statusFilter === 'pending') {
        return o.status === 'Pending Approval' || o.status === 'Pending Advance Approval' || (o.advanceWaiverRequested && !o.advanceWaiverApproved);
      }
      if (statusFilter === 'usd') {
        return o.isUSD;
      }
      if (statusFilter === 'lkr') {
        return !o.isUSD;
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o: any) => o.status === 'Confirmed' || o.status === 'Approved').length;
    const pending = orders.filter((o: any) => o.status === 'Pending Approval' || o.status === 'Pending Advance Approval' || (o.advanceWaiverRequested && !o.advanceWaiverApproved)).length;
    const usdCount = orders.filter((o: any) => o.isUSD).length;

    return { total, confirmed, pending, usdCount };
  }, [orders]);

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Nav & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/mobile/dashboard')}
            className="p-1.5 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-primary flex items-center gap-1.5">
              Sales Orders
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface2 text-muted border border-theme-subtle font-mono">
                {orders.length}
              </span>
            </h1>
            <p className="text-[11px] text-muted">
              Live manufacturing and factory sales orders
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-surface border border-theme text-muted hover:text-primary active:scale-95 transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-rex-600' : ''} />
        </button>
      </div>

      {/* Mini KPI Snapshot */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-muted block">Total Orders</span>
          <span className="text-sm font-bold font-mono text-primary">{stats.total}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Confirmed</span>
          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.confirmed}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface border border-theme text-center shadow-xs">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">USD Export</span>
          <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{stats.usdCount}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by order #, customer, PO #, item..."
          className="w-full bg-surface border border-theme rounded-xl pl-9 pr-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-rex-500 shadow-xs"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All (${orders.length})` },
          { key: 'confirmed', label: `Confirmed (${stats.confirmed})` },
          { key: 'pending', label: `Pending (${stats.pending})` },
          { key: 'usd', label: `USD (${stats.usdCount})` },
          { key: 'lkr', label: 'LKR' }
        ].map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setStatusFilter(chip.key as any)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === chip.key
                ? 'bg-rex-600 text-white font-bold shadow-xs'
                : 'bg-surface border border-theme text-secondary hover:text-primary'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Sales Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-2.5">
          {filteredOrders.map((order: any) => {
            const isConfirmed = order.status === 'Confirmed' || order.status === 'Approved';
            const isPending = order.status === 'Pending Approval' || order.status === 'Pending Advance Approval' || (order.advanceWaiverRequested && !order.advanceWaiverApproved);

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="p-3.5 rounded-xl bg-surface border border-theme shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {order.isUSD && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm shadow-blue-500/50" title="USD Export Order" />
                      )}
                      <span className="text-xs font-bold font-mono text-primary">
                        {order.orderNo || order.id}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                        isConfirmed 
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : isPending
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-surface2 text-muted border border-theme-subtle'
                      }`}>
                        {order.status || 'Active'}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-primary truncate flex items-center gap-1.5">
                      <Building2 size={13} className="text-muted shrink-0" />
                      {order.customerDisplay}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-rex-600 dark:text-rex-400 block">
                      {formatCurrency(order.totalPrice, false, order.currency)}
                    </span>
                    <span className="text-[9px] text-muted font-mono">
                      {formatDate(order.orderDate || order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Product / Scope Preview */}
                <p className="text-[11px] text-secondary truncate">
                  {order.productName || (order.itemsList && order.itemsList[0]?.description) || 'Custom Machined Components'}
                </p>

                {/* Sub-bar: Customer PO & Delivery date */}
                <div className="flex items-center justify-between pt-1 border-t border-theme-subtle/50 text-[11px] text-muted">
                  <div className="flex items-center gap-2 truncate">
                    {order.customerPoNo ? (
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-surface2 border border-theme-subtle text-primary font-semibold truncate max-w-[140px]">
                        PO: {order.customerPoNo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted font-mono italic">No PO Attached</span>
                    )}
                    {order.targetDeliveryDate && (
                      <span className="text-[10px] font-mono">
                        Due: {formatDate(order.targetDeliveryDate)}
                      </span>
                    )}
                  </div>
                  <span className="text-rex-600 dark:text-rex-400 font-semibold flex items-center gap-0.5 shrink-0 ml-2">
                    Details <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-surface border border-theme text-center space-y-2 shadow-xs">
          <ShoppingBag size={24} className="mx-auto text-muted" />
          <h3 className="text-sm font-bold text-primary">No Sales Orders Found</h3>
          <p className="text-xs text-muted">
            {searchQuery ? 'Try matching a different order #, PO # or customer.' : 'No sales orders found in this category.'}
          </p>
        </div>
      )}

      {/* ── Sales Order Detail Modal ── */}
      {selectedOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-surface border border-theme rounded-t-2xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
            {/* Modal Header */}
            <div className="p-3.5 bg-gradient-to-r from-rex-700 via-rex-600 to-rex-700 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/20 text-white font-bold">
                    Sales Order #{selectedOrder.orderNo || selectedOrder.id}
                  </span>
                  {selectedOrder.isUSD && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500 text-white text-[10px] font-bold font-mono">
                      USD
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold truncate mt-0.5">
                  {selectedOrder.customerDisplay}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center border-b border-theme bg-surface2/50 px-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('details')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                  previewTab === 'details'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                Line Items & Specs
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('letterhead')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  previewTab === 'letterhead'
                    ? 'border-rex-600 text-rex-600 dark:text-rex-400'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <FileText size={13} />
                <span>A4 Letterhead Document</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 space-y-3.5 flex-1 text-primary">
              {previewTab === 'letterhead' ? (
                <MobileA4Preview title={`Sales Order #${selectedOrder.orderNo || selectedOrder.id}`}>
                  <SalesOrderPrintView 
                    order={selectedOrder} 
                    customer={customers.find((c: any) => c.id === selectedOrder.customerId || c.company === selectedOrder.customerCompany || c.name === selectedOrder.customerName)} 
                    settings={settings} 
                  />
                </MobileA4Preview>
              ) : (
                <>
              {/* Customer & Dates Info Card */}
              <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-rex-600 dark:text-rex-400" />
                    {selectedOrder.customerDisplay}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedOrder.status === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-surface text-muted'
                  }`}>
                    {selectedOrder.status || 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-muted border-t border-theme-subtle/50">
                  <div>
                    <span className="block text-[9.5px] uppercase font-bold text-muted">Order Date:</span>
                    <span className="text-primary">{formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] uppercase font-bold text-muted">Target Delivery:</span>
                    <span className="text-primary">{formatDate(selectedOrder.targetDeliveryDate) || 'Not set'}</span>
                  </div>
                </div>

                {selectedOrder.customerPoNo && (
                  <div className="pt-1 border-t border-theme-subtle/50 text-[11px]">
                    <span className="text-muted">Customer PO:</span>{' '}
                    <strong className="font-mono text-primary">{selectedOrder.customerPoNo}</strong>
                    {selectedOrder.customerPoDate && (
                      <span className="text-muted ml-2">({formatDate(selectedOrder.customerPoDate)})</span>
                    )}
                  </div>
                )}

                {selectedOrder.deliveryAddress && (
                  <div className="text-[11px] text-secondary">
                    <span className="text-muted">Delivery:</span> {selectedOrder.deliveryAddress}
                  </div>
                )}
              </div>

              {/* Order Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
                  <span>Ordered Line Items ({selectedOrder.itemsList?.length || 1})</span>
                  <span className="font-mono text-primary font-semibold">{selectedOrder.currency}</span>
                </h4>

                {selectedOrder.itemsList && selectedOrder.itemsList.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.itemsList.map((it: any, idx: number) => {
                      const desc = it.description || it.desc || it.productName || it.name || `Item #${idx + 1}`;
                      const specs = it.specifications || it.specs || it.sku || '';
                      const qty = Number(it.qty || 1);
                      const uom = it.uom || 'Nos';
                      const unitPrice = Number(it.unitPrice || 0);
                      const amount = Number(it.amount || (qty * unitPrice));

                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-surface border border-theme-subtle space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] text-muted font-mono font-bold mr-1">#{idx + 1}</span>
                              <span className="text-xs font-bold text-primary">{desc}</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-primary shrink-0">
                              {formatCurrency(amount, false, selectedOrder.currency)}
                            </span>
                          </div>

                          {specs && (
                            <p className="text-[10.5px] text-secondary font-mono italic pl-4">
                              {specs}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-muted pl-4 pt-0.5">
                            <span>{qty} {uom} × {formatCurrency(unitPrice, false, selectedOrder.currency)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface border border-theme-subtle flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-primary">{selectedOrder.productName || 'Machined Goods'}</p>
                      <p className="text-[11px] text-muted font-mono">{Number(selectedOrder.qty || 1)} Nos</p>
                    </div>
                    <span className="font-bold font-mono text-primary">
                      {formatCurrency(selectedOrder.totalPrice, false, selectedOrder.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Summary Box */}
              <div className="p-3 rounded-xl bg-surface2/60 border border-theme-subtle space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-secondary">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(Number(selectedOrder.subtotal || selectedOrder.totalPrice), false, selectedOrder.currency)}</span>
                </div>
                {Number(selectedOrder.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(Number(selectedOrder.discountAmount), false, selectedOrder.currency)}</span>
                  </div>
                )}
                {Number(selectedOrder.taxAmount || 0) > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Tax:</span>
                    <span>+{formatCurrency(Number(selectedOrder.taxAmount), false, selectedOrder.currency)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-theme-subtle flex justify-between font-bold text-sm text-rex-600 dark:text-rex-400">
                  <span>Total Order Value:</span>
                  <span>{formatCurrency(selectedOrder.totalPrice, false, selectedOrder.currency)}</span>
                </div>
              </div>

              {/* Production / Material Status */}
              <div className="p-3 rounded-lg bg-surface border border-theme-subtle text-[11px] space-y-1 text-secondary">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Stock & Production:</span>
                  <span className="font-semibold text-primary">{selectedOrder.stockStatus || 'Standard Production'}</span>
                </div>
                {selectedOrder.materialStatus && (
                  <p className="text-muted"><span className="font-semibold">Material:</span> {selectedOrder.materialStatus}</p>
                )}
                {selectedOrder.notes && (
                  <p className="text-muted pt-1"><span className="font-semibold">Notes:</span> {selectedOrder.notes}</p>
                )}
              </div>
                </>
              )}
            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="p-3 bg-surface border-t border-theme flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-surface2 hover:bg-surface border border-theme text-primary text-xs font-bold active:scale-95 transition-all text-center"
              >
                Close Order Details
              </button>
            </div>
          </div>
        </div>
      ,
        document.body
      )}
    </div>
  );
};
