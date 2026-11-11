/**
 * Map of route paths to dynamic import loaders.
 * Allows instant hover prefetching from Sidebar or TopBar links.
 */
const routeLoaders: Record<string, () => Promise<any>> = {
  // CRM
  '/crm': () => import('@/pages/crm/Dashboard'),
  '/crm/customers': () => import('@/pages/crm/Customers'),
  '/crm/leads': () => import('@/pages/crm/Leads'),
  '/crm/quotations': () => import('@/pages/crm/Quotations'),
  '/crm/product-quotations': () => import('@/pages/crm/ProductQuotations'),
  '/crm/sales-orders': () => import('@/pages/crm/SalesOrdersHub'),
  '/crm/reports': () => import('@/pages/crm/SalesReportsHub'),
  '/crm/deals': () => import('@/pages/crm/Deals'),
  '/crm/contacts': () => import('@/pages/crm/Contacts'),
  '/crm/followups': () => import('@/pages/crm/Followups'),

  // Inventory & Purchasing
  '/inventory': () => import('@/pages/inventory/Inventory'),
  '/inventory/sales-orders': () => import('@/pages/inventory/FinishedGoodsOrdersView'),
  '/inventory/gate-passes': () => import('@/pages/inventory/GatePassesHub'),
  '/inventory/material-issue': () => import('@/pages/inventory/MaterialIssueHub'),
  '/inventory/suppliers': () => import('@/pages/inventory/Suppliers'),
  '/purchasing': () => import('@/pages/purchasing/PurchasingHub'),

  // Production
  '/production': () => import('@/pages/production/WorkOrders'),
  '/production/service-jobs': () => import('@/pages/production/ServiceInspectionHub'),
  '/production/planning': () => import('@/pages/production/WorkshopPlanning'),
  '/production/machinery': () => import('@/pages/production/Machinery'),

  // Finance
  '/finance/dashboard': () => import('@/pages/finance/FinanceDashboard'),
  '/finance/cash-flow': () => import('@/pages/finance/DailyCashFlowHub'),
  '/finance/cashbook': () => import('@/pages/finance/DailyCashbook'),
  '/finance/banking': () => import('@/pages/finance/BankingHub'),
  '/finance/invoices': () => import('@/pages/finance/Invoices'),
  '/finance': () => import('@/pages/finance/AccountingHub'),
  '/finance/receivables': () => import('@/pages/finance/ReceivablesHub'),
  '/finance/vendor-bills': () => import('@/pages/finance/VendorBills'),
  '/finance/payables': () => import('@/pages/finance/PayablesHub'),
  '/finance/reports': () => import('@/pages/finance/FinancialReports'),
  '/finance/tax-report': () => import('@/pages/finance/TaxReport'),

  // HR
  '/hr/employees': () => import('@/pages/hr/Employees'),
  '/hr/skills': () => import('@/pages/hr/Skills'),
  '/hr/report': () => import('@/pages/hr/LaborReport'),

  // Admin
  '/admin/approvals': () => import('@/pages/admin/Approvals'),
  '/admin/users': () => import('@/pages/admin/UserManagement'),
  '/admin/roles': () => import('@/pages/admin/UserManagement'),
  '/admin/variables': () => import('@/pages/admin/VariableSettings'),
  '/admin/settings': () => import('@/pages/admin/Settings')
};

const preloadedRoutes = new Set<string>();

/**
 * Prefetches the code chunk for a given route on hover/touch.
 * When the user clicks the link, the browser already has the chunk in memory/cache,
 * making navigation instantaneous.
 */
export function prefetchRoute(path: string) {
  if (!path) return;
  // Clean hash or query params
  const cleanPath = path.split('?')[0].split('#')[0];
  if (preloadedRoutes.has(cleanPath)) return;

  const loader = routeLoaders[cleanPath];
  if (loader) {
    preloadedRoutes.add(cleanPath);
    loader().catch(() => {
      // Allow retry if failed
      preloadedRoutes.delete(cleanPath);
    });
  }
}
