import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  BarChart3, FileText, ShoppingBag, TrendingUp, Calendar, Filter, 
  Download, Printer, RefreshCw, Search, ArrowUpRight, CheckCircle2, 
  Clock, XCircle, Users, ExternalLink, ChevronRight, DollarSign,
  PackageCheck, Truck, Receipt, Sparkles, Building2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchBar } from '@/components/ui/SearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useQuotations, useFinishedGoodsOrders, useCustomers, useLeads } from '@/hooks/useData';
import { useSettings } from '@/contexts/SettingsContext';
import { printElement } from '@/lib/printElement';
import { exportToPdf } from '@/lib/exportToPdf';

type ReportTab = 'orders' | 'quotes' | 'customers';

export const SalesReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { data: rawQuotations = [], loading: loadingQuotes, refetch: refetchQuotes } = useQuotations();
  const { data: rawOrders = [], loading: loadingOrders, refetch: refetchOrders } = useFinishedGoodsOrders();
  const { data: customers = [] } = useCustomers();
  const { data: leads = [] } = useLeads();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('orders');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Date Range (default: This Month)
  const [datePreset, setDatePreset] = useState<'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom'>('this_month');
  
  const getInitialDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    return { firstDay, today };
  };

  const [startDate, setStartDate] = useState(() => getInitialDates().firstDay);
  const [endDate, setEndDate] = useState(() => getInitialDates().today);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Preset Date Handlers
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (preset === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      setStartDate(new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'this_year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  // ─────────────────────────────────────────────────────────────
  // 1. NORMALIZE & PROCESS SALES ORDERS
  // ─────────────────────────────────────────────────────────────
  const processedOrders = useMemo(() => {
    return (rawOrders || []).map((o: any) => {
      const orderDate = o.orderDate || o.createdAt?.slice(0, 10) || '';
      const orderNo = o.orderNo || o.id || '';
      const customer = customers.find((c: any) => c.id === o.customerId) || leads.find((l: any) => l.id === o.customerId);
      const customerName = o.customerName || customer?.company || customer?.name || 'Unknown Client';
      const orderTotal = Number(o.totalPrice || o.total || 0);
      const currency = o.currency || customer?.currency || 'LKR';
      const rate = Number(o.exchangeRate || 1);
      const orderTotalLKR = currency === 'USD' ? orderTotal * rate : orderTotal;
      const status = (o.status || 'pending').toLowerCase();
      const isDispatched = Boolean(o.isDispatched || Number(o.dispatchedQty || 0) >= Number(o.qty || 1));
      const hasInvoice = Boolean(o.invoiceNo || o.invoiceId);
      
      let itemsCount = 0;
      if (Array.isArray(o.items)) itemsCount = o.items.length;
      else if (typeof o.items === 'string') {
        try { itemsCount = JSON.parse(o.items).length; } catch { itemsCount = 1; }
      } else {
        itemsCount = 1;
      }

      return {
        id: o.id,
        orderNo,
        orderDate,
        targetDeliveryDate: o.targetDeliveryDate || '',
        customerId: o.customerId,
        customerName,
        customerPoNo: o.customerPoNo || '',
        quotationNo: o.quotationNo || '',
        status,
        isDispatched,
        dispatchedQty: Number(o.dispatchedQty || 0),
        qty: Number(o.qty || 1),
        hasInvoice,
        invoiceNo: o.invoiceNo || '',
        currency,
        orderTotal,
        orderTotalLKR,
        productName: o.productName || 'Order Items',
        itemsCount,
        notes: o.notes || ''
      };
    });
  }, [rawOrders, customers, leads]);

  // ─────────────────────────────────────────────────────────────
  // 2. NORMALIZE & PROCESS QUOTATIONS
  // ─────────────────────────────────────────────────────────────
  const processedQuotes = useMemo(() => {
    return (rawQuotations || []).map((q: any) => {
      const qData = typeof q.data === 'string' ? (() => { try { return JSON.parse(q.data); } catch { return {}; } })() : (q.data || {});
      const date = q.date || qData.date || q.createdAt?.slice(0, 10) || '';
      const quoteNo = q.quotationNo || q.docNo || qData.quotationNo || q.id || '';
      
      const lead = leads.find((l: any) => l.id === q.leadId || l.id === qData.leadId);
      const cust = customers.find((c: any) => c.id === q.leadId || c.id === (lead as any)?.customerId);
      const customerName = cust?.company || cust?.name || lead?.company || lead?.name || qData.clientCompany || qData.clientName || 'Unknown Client';
      const customerId = cust?.id || lead?.id || q.leadId || '';

      const totalAmount = Number(
        q.totalAmount || 
        qData.grandTotal || 
        qData.totalAmount || 
        qData.custWithVAT || 
        qData.custWithSSCL || 
        qData.custTotal || 
        0
      );

      const currency = q.currency || qData.currency || cust?.currency || (cust?.isForeign ? 'USD' : 'LKR');
      const rate = Number(q.exchangeRate || qData.exchangeRate || (currency === 'USD' ? 310 : 1));
      const totalAmountLKR = currency === 'USD' ? totalAmount * rate : totalAmount;

      const rawStatus = (q.status || 'draft').toLowerCase();
      // Check conversion to Sales Order
      const linkedOrder = processedOrders.find(o => 
        (o.quotationNo && (o.quotationNo === quoteNo || o.quotationNo === q.id)) ||
        o.id === q.id
      );
      const isConvertedToOrder = Boolean(linkedOrder);

      return {
        id: q.id,
        quoteNo,
        date,
        customerId,
        customerName,
        type: q.type || 'Custom Engineering',
        status: rawStatus,
        isConvertedToOrder,
        orderNo: linkedOrder?.orderNo || '',
        customerPoNo: q.customerPoNo || qData.customerPoNo || linkedOrder?.customerPoNo || '',
        currency,
        totalAmount,
        totalAmountLKR,
        approvedBy: q.approvedBy || q.createdByName || 'Staff',
        approvedAt: q.approvedAt || ''
      };
    });
  }, [rawQuotations, processedOrders, leads, customers]);

  // ─────────────────────────────────────────────────────────────
  // 3. FILTER LOGIC
  // ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return processedOrders.filter(o => {
      // Date filter
      if (startDate && o.orderDate < startDate) return false;
      if (endDate && o.orderDate > endDate) return false;

      // Customer filter
      if (selectedCustomerId !== 'all' && o.customerId !== selectedCustomerId) return false;

      // Currency filter
      if (currencyFilter !== 'all' && o.currency !== currencyFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'dispatched' && !o.isDispatched) return false;
        if (statusFilter === 'invoiced' && !o.hasInvoice) return false;
        if (statusFilter === 'pending' && (o.status !== 'pending' && o.status !== 'in_production')) return false;
        if (statusFilter === 'approved' && o.status !== 'approved' && o.status !== 'confirmed') return false;
        if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = 
          o.orderNo.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPoNo.toLowerCase().includes(q) ||
          o.quotationNo.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
  }, [processedOrders, startDate, endDate, selectedCustomerId, currencyFilter, statusFilter, searchQuery]);

  const filteredQuotes = useMemo(() => {
    return processedQuotes.filter(q => {
      // Date filter
      if (startDate && q.date < startDate) return false;
      if (endDate && q.date > endDate) return false;

      // Customer filter
      if (selectedCustomerId !== 'all' && q.customerId !== selectedCustomerId) return false;

      // Currency filter
      if (currencyFilter !== 'all' && q.currency !== currencyFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'converted' && !q.isConvertedToOrder) return false;
        if (statusFilter === 'approved' && q.status !== 'approved') return false;
        if (statusFilter === 'pending' && (q.status !== 'pending' && q.status !== 'draft')) return false;
        if (statusFilter === 'rejected' && q.status !== 'rejected') return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const match = 
          q.quoteNo.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query) ||
          q.customerPoNo.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [processedQuotes, startDate, endDate, selectedCustomerId, currencyFilter, statusFilter, searchQuery]);

  // Customer Summary Data
  const customerSummary = useMemo(() => {
    const map = new Map<string, {
      customerId: string;
      name: string;
      totalQuotes: number;
      convertedQuotes: number;
      totalQuotedLKR: number;
      totalOrders: number;
      totalOrdersLKR: number;
    }>();

    // Group Quotes
    filteredQuotes.forEach(q => {
      const key = q.customerId || q.customerName;
      if (!map.has(key)) {
        map.set(key, {
          customerId: q.customerId,
          name: q.customerName,
          totalQuotes: 0,
          convertedQuotes: 0,
          totalQuotedLKR: 0,
          totalOrders: 0,
          totalOrdersLKR: 0
        });
      }
      const entry = map.get(key)!;
      entry.totalQuotes += 1;
      entry.totalQuotedLKR += q.totalAmountLKR;
      if (q.isConvertedToOrder || q.status === 'approved') {
        entry.convertedQuotes += 1;
      }
    });

    // Group Orders
    filteredOrders.forEach(o => {
      const key = o.customerId || o.customerName;
      if (!map.has(key)) {
        map.set(key, {
          customerId: o.customerId,
          name: o.customerName,
          totalQuotes: 0,
          convertedQuotes: 0,
          totalQuotedLKR: 0,
          totalOrders: 0,
          totalOrdersLKR: 0
        });
      }
      const entry = map.get(key)!;
      entry.totalOrders += 1;
      entry.totalOrdersLKR += o.orderTotalLKR;
    });

    return Array.from(map.values()).sort((a, b) => b.totalOrdersLKR - a.totalOrdersLKR);
  }, [filteredQuotes, filteredOrders]);

  // ─────────────────────────────────────────────────────────────
  // 4. KPI STATS CALCULATION
  // ─────────────────────────────────────────────────────────────
  const orderStats = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalValueLKR = filteredOrders.reduce((acc, o) => acc + o.orderTotalLKR, 0);
    const dispatchedOrders = filteredOrders.filter(o => o.isDispatched);
    const dispatchedValueLKR = dispatchedOrders.reduce((acc, o) => acc + o.orderTotalLKR, 0);
    const invoicedOrders = filteredOrders.filter(o => o.hasInvoice);
    const invoicedValueLKR = invoicedOrders.reduce((acc, o) => acc + o.orderTotalLKR, 0);
    const pendingOrders = filteredOrders.filter(o => !o.isDispatched && o.status !== 'cancelled');
    const pendingValueLKR = pendingOrders.reduce((acc, o) => acc + o.orderTotalLKR, 0);
    const avgOrderValue = totalCount > 0 ? totalValueLKR / totalCount : 0;

    return {
      totalCount,
      totalValueLKR,
      dispatchedCount: dispatchedOrders.length,
      dispatchedValueLKR,
      invoicedCount: invoicedOrders.length,
      invoicedValueLKR,
      pendingCount: pendingOrders.length,
      pendingValueLKR,
      avgOrderValue
    };
  }, [filteredOrders]);

  const quoteStats = useMemo(() => {
    const totalCount = filteredQuotes.length;
    const totalValueLKR = filteredQuotes.reduce((acc, q) => acc + q.totalAmountLKR, 0);
    const convertedQuotes = filteredQuotes.filter(q => q.isConvertedToOrder);
    const convertedValueLKR = convertedQuotes.reduce((acc, q) => acc + q.totalAmountLKR, 0);
    const approvedQuotes = filteredQuotes.filter(q => q.status === 'approved' || q.isConvertedToOrder);
    const conversionRate = totalCount > 0 ? (approvedQuotes.length / totalCount) * 100 : 0;
    const pendingQuotes = filteredQuotes.filter(q => q.status === 'pending' || q.status === 'draft');
    const pendingValueLKR = pendingQuotes.reduce((acc, q) => acc + q.totalAmountLKR, 0);

    return {
      totalCount,
      totalValueLKR,
      convertedCount: convertedQuotes.length,
      convertedValueLKR,
      approvedCount: approvedQuotes.length,
      conversionRate,
      pendingCount: pendingQuotes.length,
      pendingValueLKR
    };
  }, [filteredQuotes]);

  // ─────────────────────────────────────────────────────────────
  // 5. EXPORT TO EXCEL (.xlsx)
  // ─────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateRangeStr = startDate ? `${startDate}_to_${endDate || 'today'}` : 'all_time';

    if (activeTab === 'orders') {
      const rows = filteredOrders.map((o, idx) => ({
        '#': idx + 1,
        'Order No': o.orderNo,
        'Order Date': o.orderDate,
        'Customer': o.customerName,
        'PO Number': o.customerPoNo || 'N/A',
        'Ref Quotation': o.quotationNo || 'N/A',
        'Item/Product': o.productName,
        'Qty': o.qty,
        'Currency': o.currency,
        'Order Total': o.orderTotal,
        'Order Total (LKR)': o.orderTotalLKR,
        'Order Status': o.status.toUpperCase(),
        'Dispatch Status': o.isDispatched ? 'DISPATCHED' : 'PENDING',
        'Invoice Status': o.hasInvoice ? `INVOICED (${o.invoiceNo})` : 'NOT INVOICED'
      }));

      // Totals Row
      rows.push({
        '#': '',
        'Order No': 'TOTALS',
        'Order Date': '',
        'Customer': `${filteredOrders.length} Orders`,
        'PO Number': '',
        'Ref Quotation': '',
        'Item/Product': '',
        'Qty': '',
        'Currency': '',
        'Order Total': '',
        'Order Total (LKR)': orderStats.totalValueLKR,
        'Order Status': '',
        'Dispatch Status': `${orderStats.dispatchedCount} Dispatched`,
        'Invoice Status': `${orderStats.invoicedCount} Invoiced`
      } as any);

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Orders');
      XLSX.writeFile(wb, `Sales_Orders_Report_${dateRangeStr}.xlsx`);
    } else if (activeTab === 'quotes') {
      const rows = filteredQuotes.map((q, idx) => ({
        '#': idx + 1,
        'Quotation No': q.quoteNo,
        'Date': q.date,
        'Customer / Client': q.customerName,
        'Type': q.type,
        'Customer PO': q.customerPoNo || 'N/A',
        'Status': q.status.toUpperCase(),
        'Converted to SO': q.isConvertedToOrder ? `YES (${q.orderNo})` : 'NO',
        'Currency': q.currency,
        'Quoted Amount': q.totalAmount,
        'Quoted Amount (LKR)': q.totalAmountLKR,
        'Approved By': q.approvedBy
      }));

      // Totals Row
      rows.push({
        '#': '',
        'Quotation No': 'TOTALS',
        'Date': '',
        'Customer / Client': `${filteredQuotes.length} Quotations`,
        'Type': '',
        'Customer PO': '',
        'Status': `${quoteStats.approvedCount} Approved`,
        'Converted to SO': `${quoteStats.convertedCount} Converted`,
        'Currency': '',
        'Quoted Amount': '',
        'Quoted Amount (LKR)': quoteStats.totalValueLKR,
        'Approved By': `Rate: ${quoteStats.conversionRate.toFixed(1)}%`
      } as any);

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Quotations Report');
      XLSX.writeFile(wb, `Quotations_Report_${dateRangeStr}.xlsx`);
    } else {
      const rows = customerSummary.map((c, idx) => ({
        '#': idx + 1,
        'Customer Name': c.name,
        'Quotations Issued': c.totalQuotes,
        'Quotations Won': c.convertedQuotes,
        'Conversion Rate %': c.totalQuotes > 0 ? ((c.convertedQuotes / c.totalQuotes) * 100).toFixed(1) + '%' : '0%',
        'Total Quoted (LKR)': c.totalQuotedLKR,
        'Total Sales Orders': c.totalOrders,
        'Total Order Value (LKR)': c.totalOrdersLKR
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Sales Summary');
      XLSX.writeFile(wb, `Customer_Sales_Summary_${dateRangeStr}.xlsx`);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. PRINT & PDF HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    printElement('sales-reports-print-container', `Sales_Report_${activeTab}`);
  };

  const handleExportPDF = () => {
    exportToPdf('sales-reports-print-container', `Sales_Report_${activeTab}_${startDate || 'all'}.pdf`);
  };

  // Paginated Slices
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, currentPage]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customerSummary.slice(start, start + pageSize);
  }, [customerSummary, currentPage]);

  const currentTotalItems = activeTab === 'orders' ? filteredOrders.length : (activeTab === 'quotes' ? filteredQuotes.length : customerSummary.length);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-primary tracking-tight">Sales & Quotations Report Hub</h1>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-semibold uppercase tracking-wider">
                Commercial Intelligence
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Sales order fulfillments, quotation win/loss rates, customer revenue contributions, and Excel/PDF reports.
            </p>
          </div>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => { refetchQuotes(); refetchOrders(); }}
            className="text-xs border border-theme-subtle hover:bg-surface2"
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={exportToExcel}
            className="text-xs border border-theme-subtle text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={FileText}
            onClick={handleExportPDF}
            className="text-xs border border-theme-subtle text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          >
            Export PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
            className="text-xs"
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-theme-subtle pb-1">
        <button
          onClick={() => { setActiveTab('orders'); setCurrentPage(1); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[5px] ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-muted hover:text-primary hover:border-theme-subtle'
          }`}
        >
          <ShoppingBag size={14} />
          Sales Orders Report
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 font-bold">
            {filteredOrders.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('quotes'); setCurrentPage(1); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[5px] ${
            activeTab === 'quotes'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-muted hover:text-primary hover:border-theme-subtle'
          }`}
        >
          <FileText size={14} />
          Quotations & Win-Rate Report
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 font-bold">
            {filteredQuotes.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('customers'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[5px] ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-500/5'
              : 'border-transparent text-muted hover:text-primary hover:border-theme-subtle'
          }`}
        >
          <Users size={14} />
          Customer Revenue Summary
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 font-bold">
            {customerSummary.length}
          </span>
        </button>
      </div>

      {/* ── DATE & FILTER BAR ── */}
      <GlassCard className="p-4 space-y-3">
        {/* Row 1: Date Presets & Date Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted mr-1 flex items-center gap-1">
              <Calendar size={13} /> Period:
            </span>
            {(['this_month', 'last_month', 'this_quarter', 'this_year', 'all'] as const).map(preset => (
              <button
                key={preset}
                onClick={() => handleDatePresetChange(preset)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors font-medium capitalize ${
                  datePreset === preset
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-surface2/60 text-secondary hover:text-primary hover:bg-surface2'
                }`}
              >
                {preset.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
              className="bg-surface border border-theme-subtle px-2 py-1 rounded text-xs text-primary focus:border-blue-500"
            />
            <span className="text-muted font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
              className="bg-surface border border-theme-subtle px-2 py-1 rounded text-xs text-primary focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 2: Search, Status, Customer & Currency Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-theme-subtle/50">
          <div>
            <SearchBar
              value={searchQuery}
              onChange={val => { setSearchQuery(val); setCurrentPage(1); }}
              placeholder={activeTab === 'orders' ? 'Search order no, customer, PO...' : 'Search quote no, customer, PO...'}
              className="text-xs"
            />
          </div>

          <div>
            <select
              value={selectedCustomerId}
              onChange={e => { setSelectedCustomerId(e.target.value); setCurrentPage(1); }}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs text-primary outline-none focus:border-blue-500"
            >
              <option value="all">All Customers / Clients</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs text-primary outline-none focus:border-blue-500"
            >
              {activeTab === 'orders' ? (
                <>
                  <option value="all">All Order Statuses</option>
                  <option value="pending">Pending / In Production</option>
                  <option value="approved">Approved / Confirmed</option>
                  <option value="dispatched">Dispatched / Gate Pass Done</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </>
              ) : activeTab === 'quotes' ? (
                <>
                  <option value="all">All Quotation Statuses</option>
                  <option value="approved">Approved / Won</option>
                  <option value="converted">Converted to Sales Order</option>
                  <option value="pending">Pending Review / Draft</option>
                  <option value="rejected">Rejected / Lost</option>
                </>
              ) : (
                <option value="all">All Clients</option>
              )}
            </select>
          </div>

          <div>
            <select
              value={currencyFilter}
              onChange={e => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-surface border border-theme-subtle px-3 py-1.5 rounded-lg text-xs text-primary outline-none focus:border-blue-500"
            >
              <option value="all">All Currencies (LKR & USD)</option>
              <option value="LKR">LKR (Local)</option>
              <option value="USD">USD (Export)</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* ── KPI METRICS CARDS ── */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <GlassCard className="p-3.5 border-l-4 border-l-blue-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Sales Orders</span>
              <div className="text-2xl font-black text-primary mt-1 font-mono">{orderStats.totalCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Value: <strong className="text-blue-600 font-mono">{formatCurrency(orderStats.totalValueLKR)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Dispatched / Delivered</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{orderStats.dispatchedCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Value: <strong className="text-emerald-600 font-mono">{formatCurrency(orderStats.dispatchedValueLKR)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Pending Fulfillment</span>
              <div className="text-2xl font-black text-amber-500 mt-1 font-mono">{orderStats.pendingCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Backlog: <strong className="text-amber-500 font-mono">{formatCurrency(orderStats.pendingValueLKR)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-purple-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Commercial Invoiced</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">{orderStats.invoicedCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Invoiced: <strong className="text-purple-600 dark:text-purple-400 font-mono">{formatCurrency(orderStats.invoicedValueLKR)}</strong>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <GlassCard className="p-3.5 border-l-4 border-l-blue-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Quotations Issued</span>
              <div className="text-2xl font-black text-primary mt-1 font-mono">{quoteStats.totalCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Quoted: <strong className="text-blue-600 font-mono">{formatCurrency(quoteStats.totalValueLKR)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Win / Conversion Rate</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                {quoteStats.conversionRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Won: <strong className="text-emerald-600 font-mono">{quoteStats.approvedCount} quotes</strong> ({formatCurrency(quoteStats.convertedValueLKR)})
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Converted to Sales Orders</span>
              <div className="text-2xl font-black text-amber-500 mt-1 font-mono">{quoteStats.convertedCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              SO Value: <strong className="text-amber-500 font-mono">{formatCurrency(quoteStats.convertedValueLKR)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-purple-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Pending / In Review</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">{quoteStats.pendingCount}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Pipeline: <strong className="text-purple-600 dark:text-purple-400 font-mono">{formatCurrency(quoteStats.pendingValueLKR)}</strong>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          <GlassCard className="p-3.5 border-l-4 border-l-blue-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Active Clients</span>
              <div className="text-2xl font-black text-primary mt-1 font-mono">{customerSummary.length}</div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Clients with commercial activity in selected period
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Top Client by Revenue</span>
              <div className="text-lg font-black text-emerald-600 mt-1 truncate">
                {customerSummary[0]?.name || 'N/A'}
              </div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Top Value: <strong className="text-emerald-600 font-mono">{formatCurrency(customerSummary[0]?.totalOrdersLKR || 0)}</strong>
            </div>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-purple-500 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Revenue Generated</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
                {formatCurrency(customerSummary.reduce((acc, c) => acc + c.totalOrdersLKR, 0))}
              </div>
            </div>
            <div className="text-[11px] text-muted font-medium mt-2">
              Aggregated across all customer orders
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── MAIN TABLE VIEW ── */}
      <GlassCard className="overflow-hidden">
        {/* Tab 1: Sales Orders Table */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-surface/60 border-b border-theme-subtle text-muted text-[10.5px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-3">Order No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer / Company</th>
                  <th className="py-3 px-3">Customer PO</th>
                  <th className="py-3 px-3">Ref Quotation</th>
                  <th className="py-3 px-3">Product / Scope</th>
                  <th className="py-3 px-3 text-right">Order Value</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Dispatch</th>
                  <th className="py-3 px-3 text-center">Invoice</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-muted">
                      No sales orders found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((o, idx) => {
                    const rowIdx = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={o.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="py-3 px-4 text-muted font-mono">{rowIdx}</td>
                        <td className="py-3 px-3 font-bold font-mono text-primary flex items-center gap-1.5">
                          <ShoppingBag size={13} className="text-blue-500" />
                          {o.orderNo}
                        </td>
                        <td className="py-3 px-3 text-muted">{formatDate(o.orderDate)}</td>
                        <td className="py-3 px-3 font-medium text-primary">
                          <div className="font-semibold text-primary">{o.customerName}</div>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {o.customerPoNo ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/20">
                              PO: {o.customerPoNo}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {o.quotationNo ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {o.quotationNo}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-secondary" title={o.productName}>
                          {o.productName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(o.orderTotal, false, o.currency)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge 
                            variant={
                              o.status === 'approved' || o.status === 'confirmed' ? 'success' :
                              o.status === 'cancelled' ? 'danger' : 'warning'
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {o.isDispatched ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                              <CheckCircle2 size={11} /> Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-medium">
                              <Clock size={11} /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {o.hasInvoice ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 font-bold font-mono">
                              <Receipt size={10} /> {o.invoiceNo || 'Invoiced'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted">No Invoice</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => navigate(`/crm/sales-orders?q=${o.orderNo}`)}
                            className="p-1 hover:bg-surface rounded text-primary hover:text-blue-500 transition-colors"
                            title="View in Sales Orders Hub"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Quotations Table */}
        {activeTab === 'quotes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-surface/60 border-b border-theme-subtle text-muted text-[10.5px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-3">Quotation No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer / Client</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Customer PO</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Converted to SO</th>
                  <th className="py-3 px-3 text-right">Quoted Amount</th>
                  <th className="py-3 px-3">Approved By</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {paginatedQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted">
                      No quotations found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedQuotes.map((q, idx) => {
                    const rowIdx = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={q.id} className="hover:bg-surface2/30 transition-colors">
                        <td className="py-3 px-4 text-muted font-mono">{rowIdx}</td>
                        <td className="py-3 px-3 font-bold font-mono text-primary flex items-center gap-1.5">
                          <FileText size={13} className="text-blue-500" />
                          {q.quoteNo}
                        </td>
                        <td className="py-3 px-3 text-muted">{formatDate(q.date)}</td>
                        <td className="py-3 px-3 font-medium text-primary">
                          {q.customerName}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          <span className="capitalize">{q.type}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {q.customerPoNo ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/20">
                              PO: {q.customerPoNo}
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge 
                            variant={
                              q.status === 'approved' ? 'success' :
                              q.status === 'rejected' ? 'danger' : 'warning'
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {q.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {q.isConvertedToOrder ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-bold font-mono">
                              <CheckCircle2 size={11} /> {q.orderNo || 'Converted'}
                            </span>
                          ) : (
                            <span className="text-muted text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                          {formatCurrency(q.totalAmount, false, q.currency)}
                        </td>
                        <td className="py-3 px-3 text-muted text-[11px]">{q.approvedBy}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => navigate(`/crm/quotations?q=${q.quoteNo}`)}
                            className="p-1 hover:bg-surface rounded text-primary hover:text-blue-500 transition-colors"
                            title="View in Quotations Hub"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Customer Performance Summary */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-surface/60 border-b border-theme-subtle text-muted text-[10.5px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Customer / Organization</th>
                  <th className="py-3 px-4 text-center">Quotations Issued</th>
                  <th className="py-3 px-4 text-center">Quotations Won</th>
                  <th className="py-3 px-4 text-center">Conversion %</th>
                  <th className="py-3 px-4 text-right">Total Quoted (LKR)</th>
                  <th className="py-3 px-4 text-center">Sales Orders Placed</th>
                  <th className="py-3 px-4 text-right">Total Order Revenue (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/40">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted">
                      No customer revenue data for the selected period.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c, idx) => {
                    const rowIdx = (currentPage - 1) * pageSize + idx + 1;
                    const winRate = c.totalQuotes > 0 ? (c.convertedQuotes / c.totalQuotes) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface2/30 transition-colors">
                        <td className="py-3 px-4 text-muted font-mono">{rowIdx}</td>
                        <td className="py-3 px-4 font-bold text-primary flex items-center gap-2">
                          <Building2 size={13} className="text-blue-500" />
                          {c.name}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{c.totalQuotes}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 font-bold">{c.convertedQuotes}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            winRate >= 50 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface2 text-muted'
                          }`}>
                            {winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted">
                          {formatCurrency(c.totalQuotedLKR)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                          {c.totalOrders}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-[13px]">
                          {formatCurrency(c.totalOrdersLKR)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION BAR ── */}
        <div className="p-3 border-t border-theme-subtle flex items-center justify-between">
          <div className="text-xs text-muted">
            Showing {Math.min(currentTotalItems, (currentPage - 1) * pageSize + 1)} to {Math.min(currentTotalItems, currentPage * pageSize)} of {currentTotalItems} records
          </div>
          {currentTotalItems > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalItems={currentTotalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </GlassCard>

      {/* ── PRINT & PDF TEMPLATE (HIDDEN ON SCREEN, VISIBLE ON PRINT) ── */}
      <div id="sales-reports-print-container" style={{ display: 'none' }}>
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>
              {settings?.company_name || 'REX INDUSTRIES (PVT) LTD'}
            </h2>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', textTransform: 'uppercase', color: '#1e3a8a' }}>
              {activeTab === 'orders' ? 'COMMERCIAL SALES ORDERS REPORT' : (activeTab === 'quotes' ? 'QUOTATIONS & WIN-RATE REPORT' : 'CUSTOMER COMMERCIAL SALES SUMMARY')}
            </h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>
              Reporting Period: {startDate ? formatDate(startDate) : 'Beginning'} to {endDate ? formatDate(endDate) : 'Present'} | Generated on: {new Date().toLocaleString()}
            </p>
          </div>

          {/* KPI Summary Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', background: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1' }}>
            {activeTab === 'orders' ? (
              <>
                <div>Total Orders: <strong>{orderStats.totalCount}</strong></div>
                <div>Total Value: <strong>{formatCurrency(orderStats.totalValueLKR)}</strong></div>
                <div>Dispatched: <strong>{orderStats.dispatchedCount} ({formatCurrency(orderStats.dispatchedValueLKR)})</strong></div>
                <div>Invoiced: <strong>{orderStats.invoicedCount} ({formatCurrency(orderStats.invoicedValueLKR)})</strong></div>
              </>
            ) : (
              <>
                <div>Total Quotations: <strong>{quoteStats.totalCount}</strong></div>
                <div>Quoted Value: <strong>{formatCurrency(quoteStats.totalValueLKR)}</strong></div>
                <div>Approved / Won: <strong>{quoteStats.approvedCount}</strong></div>
                <div>Win Rate: <strong>{quoteStats.conversionRate.toFixed(1)}%</strong></div>
              </>
            )}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #000', textAlign: 'center' }}>#</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'left' }}>
                  {activeTab === 'orders' ? 'Order No' : (activeTab === 'quotes' ? 'Quote No' : 'Customer Name')}
                </th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'left' }}>Customer PO</th>
                <th style={{ padding: '6px 6px', borderRight: '1px solid #000', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '6px 6px', textAlign: 'right' }}>Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'orders' ? filteredOrders : filteredQuotes).map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '5px 4px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #000', fontWeight: 'bold' }}>
                    {item.orderNo || item.quoteNo}
                  </td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #000' }}>{formatDate(item.orderDate || item.date)}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #000' }}>{item.customerName}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #000' }}>{item.customerPoNo || '-'}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #000', textAlign: 'center', textTransform: 'uppercase' }}>{item.status}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(item.orderTotalLKR || item.totalAmountLKR)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
