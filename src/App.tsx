import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { NavLoadingProvider } from '@/contexts/NavLoadingContext'
import { RexAIAssistant } from '@/components/ai/RexAIAssistant'
import { MobileLayout } from '@/components/mobile/MobileLayout'

// Static Auth Pages for instant first paint
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'

// Lazy-loaded CRM Pages
const CRMDashboard = lazy(() => import('@/pages/crm/Dashboard').then(m => ({ default: m.CRMDashboard })))
const Customers = lazy(() => import('@/pages/crm/Customers').then(m => ({ default: m.Customers })))
const CustomerDetail = lazy(() => import('@/pages/crm/CustomerDetail').then(m => ({ default: m.CustomerDetail })))
const Leads = lazy(() => import('@/pages/crm/Leads').then(m => ({ default: m.Leads })))
const Quotations = lazy(() => import('@/pages/crm/Quotations').then(m => ({ default: m.Quotations })))
const ProductQuotations = lazy(() => import('@/pages/crm/ProductQuotations').then(m => ({ default: m.ProductQuotations })))
const SalesOrdersHub = lazy(() => import('@/pages/crm/SalesOrdersHub').then(m => ({ default: m.SalesOrdersHub })))
const SalesReportsHub = lazy(() => import('@/pages/crm/SalesReportsHub').then(m => ({ default: m.SalesReportsHub })))
const Deals = lazy(() => import('@/pages/crm/Deals').then(m => ({ default: m.Deals })))
const Contacts = lazy(() => import('@/pages/crm/Contacts').then(m => ({ default: m.Contacts })))
const QuotationBuilder = lazy(() => import('@/pages/crm/QuotationBuilder').then(m => ({ default: m.QuotationBuilder })))
const ProductQuotationBuilder = lazy(() => import('@/pages/crm/ProductQuotationBuilder').then(m => ({ default: m.ProductQuotationBuilder })))
const Followups = lazy(() => import('@/pages/crm/Followups').then(m => ({ default: m.Followups })))

// Lazy-loaded Inventory & Purchasing Pages
const Inventory = lazy(() => import('@/pages/inventory/Inventory').then(m => ({ default: m.Inventory })))
const MaterialIssueHub = lazy(() => import('@/pages/inventory/MaterialIssueHub').then(m => ({ default: m.MaterialIssueHub })))
const GatePassesHub = lazy(() => import('@/pages/inventory/GatePassesHub').then(m => ({ default: m.GatePassesHub })))
const PurchasingHub = lazy(() => import('@/pages/purchasing/PurchasingHub').then(m => ({ default: m.PurchasingHub })))
const POBuilder = lazy(() => import('@/pages/purchasing/POBuilder').then(m => ({ default: m.POBuilder })))
const GRNBuilder = lazy(() => import('@/pages/purchasing/GRNBuilder').then(m => ({ default: m.GRNBuilder })))
const BillBuilder = lazy(() => import('@/pages/purchasing/BillBuilder').then(m => ({ default: m.BillBuilder })))
const MRBuilder = lazy(() => import('@/pages/purchasing/MRBuilder').then(m => ({ default: m.MRBuilder })))
const Suppliers = lazy(() => import('@/pages/inventory/Suppliers').then(m => ({ default: m.Suppliers })))
const SupplierDetail = lazy(() => import('@/pages/inventory/SupplierDetail').then(m => ({ default: m.SupplierDetail })))

// Lazy-loaded Finance Pages
const Invoices = lazy(() => import('@/pages/finance/Invoices').then(m => ({ default: m.Invoices })))
const AccountingHub = lazy(() => import('@/pages/finance/AccountingHub').then(m => ({ default: m.AccountingHub })))
const JournalBuilder = lazy(() => import('@/pages/finance/JournalBuilder').then(m => ({ default: m.JournalBuilder })))
const FinancialReports = lazy(() => import('@/pages/finance/FinancialReports').then(m => ({ default: m.FinancialReports })))
const ExpenseBuilder = lazy(() => import('@/pages/finance/ExpenseBuilder').then(m => ({ default: m.ExpenseBuilder })))
const IncomeBuilder = lazy(() => import('@/pages/finance/IncomeBuilder').then(m => ({ default: m.IncomeBuilder })))
const InvoiceBuilder = lazy(() => import('@/pages/finance/InvoiceBuilder').then(m => ({ default: m.InvoiceBuilder })))
const BankingHub = lazy(() => import('@/pages/finance/BankingHub').then(m => ({ default: m.BankingHub })))
const ARAPManager = lazy(() => import('@/pages/finance/ARAPManager').then(m => ({ default: m.ARAPManager })))
const FixedAssets = lazy(() => import('@/pages/finance/FixedAssets').then(m => ({ default: m.FixedAssets })))
const BankReconciliation = lazy(() => import('@/pages/finance/BankReconciliation').then(m => ({ default: m.BankReconciliation })))
const AgedReports = lazy(() => import('@/pages/finance/AgedReports').then(m => ({ default: m.AgedReports })))
const ReceivablesHub = lazy(() => import('@/pages/finance/ReceivablesHub').then(m => ({ default: m.ReceivablesHub })))
const PayablesHub = lazy(() => import('@/pages/finance/PayablesHub').then(m => ({ default: m.PayablesHub })))
const VendorBills = lazy(() => import('@/pages/finance/VendorBills').then(m => ({ default: m.VendorBills })))
const DailyCashbook = lazy(() => import('@/pages/finance/DailyCashbook').then(m => ({ default: m.DailyCashbook })))
const DailyCashFlowHub = lazy(() => import('@/pages/finance/DailyCashFlowHub').then(m => ({ default: m.DailyCashFlowHub })))
const CostCenters = lazy(() => import('@/pages/finance/CostCenters').then(m => ({ default: m.CostCenters })))
const TaxReport = lazy(() => import('@/pages/finance/TaxReport').then(m => ({ default: m.TaxReport })))
const CustomReportBuilder = lazy(() => import('@/pages/finance/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })))
const FinanceDashboard = lazy(() => import('@/pages/finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })))

// Lazy-loaded Production Pages
const Machinery = lazy(() => import('@/pages/production/Machinery').then(m => ({ default: m.Machinery })))
const WorkshopPlanning = lazy(() => import('@/pages/production/WorkshopPlanning').then(m => ({ default: m.WorkshopPlanning })))
const WorkOrders = lazy(() => import('@/pages/production/WorkOrders').then(m => ({ default: m.WorkOrders })))
const WorkOrderDetail = lazy(() => import('@/pages/production/WorkOrderDetail').then(m => ({ default: m.WorkOrderDetail })))
const ServiceInspectionHub = lazy(() => import('@/pages/production/ServiceInspectionHub').then(m => ({ default: m.ServiceInspectionHub })))

// Lazy-loaded HR Pages
const Employees = lazy(() => import('@/pages/hr/Employees').then(m => ({ default: m.Employees })))
const Skills = lazy(() => import('@/pages/hr/Skills').then(m => ({ default: m.Skills })))
const LaborReport = lazy(() => import('@/pages/hr/LaborReport').then(m => ({ default: m.LaborReport })))

// Lazy-loaded Admin Pages
const UserManagement = lazy(() => import('@/pages/admin/UserManagement').then(m => ({ default: m.UserManagement })))
const Settings = lazy(() => import('@/pages/admin/Settings').then(m => ({ default: m.Settings })))
const VariableSettings = lazy(() => import('@/pages/admin/VariableSettings').then(m => ({ default: m.VariableSettings })))
const Approvals = lazy(() => import('@/pages/admin/Approvals'))

// Lazy-loaded Mobile Pages
const MobileDashboard = lazy(() => import('@/pages/mobile/MobileDashboard').then(m => ({ default: m.MobileDashboard })))
const MobileApprovals = lazy(() => import('@/pages/mobile/MobileApprovals').then(m => ({ default: m.MobileApprovals })))
const MobileCashbook = lazy(() => import('@/pages/mobile/MobileCashbook').then(m => ({ default: m.MobileCashbook })))
const MobileMRHub = lazy(() => import('@/pages/mobile/MobileMRHub').then(m => ({ default: m.MobileMRHub })))
const MobileMore = lazy(() => import('@/pages/mobile/MobileMore').then(m => ({ default: m.MobileMore })))
const MobileQuotations = lazy(() => import('@/pages/mobile/MobileQuotations').then(m => ({ default: m.MobileQuotations })))
const MobileSalesOrders = lazy(() => import('@/pages/mobile/MobileSalesOrders').then(m => ({ default: m.MobileSalesOrders })))

// Smooth Loading Skeleton / Spinner
const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-rex-500/20"></div>
      <div className="absolute inset-0 rounded-full border-4 border-rex-500 border-t-transparent animate-spin"></div>
    </div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary animate-pulse">
      Loading view...
    </p>
  </div>
)

const ComingSoon: React.FC<{ module: string }> = ({ module }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-64">
    <div className="glass-red p-8 text-center max-w-sm">
      <div className="text-3xl mb-3">🛠️</div>
      <h2 className="text-sm font-bold text-rex-600 dark:text-rex-300 uppercase tracking-widest mb-1">{module}</h2>
      <p className="text-xs text-secondary">This module is under construction.</p>
    </div>
  </div>
)

const RootRedirect = () => {
  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
  const pref = typeof window !== 'undefined' ? localStorage.getItem('rex_pref_view') : null;

  if (isMobile && pref !== 'desktop') {
    return <Navigate to="/mobile/dashboard" replace />;
  }
  return <Navigate to="/crm/leads" replace />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        
        <Route path="/" element={<RootRedirect />} />

        {/* Dedicated Mobile Portal Routes */}
        <Route path="/mobile" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/mobile/dashboard" replace />} />
          <Route path="dashboard" element={<MobileDashboard />} />
          <Route path="approvals" element={<MobileApprovals />} />
          <Route path="quotations" element={<MobileQuotations />} />
          <Route path="orders" element={<MobileSalesOrders />} />
          <Route path="cashbook" element={<MobileCashbook />} />
          <Route path="mr" element={<MobileMRHub />} />
          <Route path="more" element={<MobileMore />} />
        </Route>

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* CRM */}
            <Route path="/crm" element={<CRMDashboard />} />
            <Route path="/crm/customers" element={<Customers />} />
            <Route path="/crm/customers/:id" element={<CustomerDetail />} />
            <Route path="/crm/leads" element={<Leads />} />
            <Route path="/crm/deals" element={<Deals />} />
            <Route path="/crm/contacts" element={<Contacts />} />
            <Route path="/crm/followups" element={<Followups />} />
            <Route path="/crm/quotations" element={<Quotations />} />
            <Route path="/crm/quotations/new" element={<QuotationBuilder />} />
            <Route path="/crm/quotations/new/:leadId" element={<QuotationBuilder />} />
            <Route path="/crm/product-quotations" element={<ProductQuotations />} />
            <Route path="/crm/product-quotations/new" element={<ProductQuotationBuilder />} />
            <Route path="/crm/product-quotations/new/:leadId" element={<ProductQuotationBuilder />} />
            <Route path="/crm/sales-orders" element={<SalesOrdersHub />} />
            <Route path="/crm/reports" element={<SalesReportsHub />} />
            <Route path="/crm/sales-reports" element={<Navigate to="/crm/reports" replace />} />

            {/* Direct Navigation & CRM Aliases */}
            <Route path="/customers" element={<Navigate to="/crm/customers" replace />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/contacts" element={<Navigate to="/crm/contacts" replace />} />
            <Route path="/leads" element={<Navigate to="/crm/leads" replace />} />
            <Route path="/deals" element={<Navigate to="/crm/deals" replace />} />
            <Route path="/quotations" element={<Navigate to="/crm/quotations" replace />} />
            <Route path="/product-quotations" element={<Navigate to="/crm/product-quotations" replace />} />
            <Route path="/sales-orders" element={<Navigate to="/crm/sales-orders" replace />} />
            <Route path="/sales-reports" element={<Navigate to="/crm/reports" replace />} />

            {/* Inventory & Purchasing */}
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/gate-passes" element={<GatePassesHub />} />
            <Route path="/gate-passes" element={<Navigate to="/inventory/gate-passes" replace />} />
            <Route path="/inventory/sales-orders" element={<SalesOrdersHub isStoresMode={true} />} />
            <Route path="/inventory/finished-goods" element={<Navigate to="/crm/sales-orders" replace />} />
            <Route path="/inventory/material-issue" element={<MaterialIssueHub />} />
            <Route path="/material-issue" element={<Navigate to="/inventory/material-issue" replace />} />
            <Route path="/inventory/suppliers" element={<Suppliers />} />
            <Route path="/inventory/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/purchasing" element={<PurchasingHub />} />
            <Route path="/purchasing/suppliers" element={<Suppliers />} />
            <Route path="/purchasing/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/suppliers" element={<Navigate to="/inventory/suppliers" replace />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/purchasing/po-builder" element={<POBuilder />} />
            <Route path="/purchasing/mr-builder" element={<MRBuilder />} />
            <Route path="/purchasing/mr-builder/:id" element={<MRBuilder />} />
            <Route path="/purchasing/po-builder/:id" element={<POBuilder />} />
            <Route path="/purchasing/grn-builder" element={<GRNBuilder />} />
            <Route path="/purchasing/grn-builder/:id" element={<GRNBuilder />} />
            <Route path="/purchasing/bill-builder" element={<BillBuilder />} />
            <Route path="/purchasing/bill-builder/:id" element={<BillBuilder />} />

            {/* Finance */}
            <Route path="/finance/invoices" element={<Invoices />} />
            <Route path="/finance/cashbook" element={<DailyCashbook />} />
            <Route path="/finance/cash-flow" element={<DailyCashFlowHub />} />

            {/* Production */}
            <Route path="/production" element={<WorkOrders />} />
            <Route path="/production/work-orders" element={<WorkOrders />} />
            <Route path="/production/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/production/:id" element={<WorkOrderDetail />} />
            <Route path="/production/service-jobs" element={<ServiceInspectionHub />} />
            <Route path="/production/service-inspection" element={<ServiceInspectionHub />} />
            <Route path="/production/planning" element={<WorkshopPlanning />} />
            <Route path="/production/machinery" element={<Machinery />} />
              
            <Route path="/hr/employees" element={<Employees />} />
            <Route path="/hr/skills" element={<Skills />} />
            <Route path="/hr/report" element={<LaborReport />} />
            <Route path="/invoices" element={<Navigate to="/finance/invoices" replace />} />
            <Route path="/finance" element={<AccountingHub />} />
            <Route path="/finance/accounting" element={<AccountingHub />} />
            <Route path="/finance/journal-builder" element={<JournalBuilder />} />
            <Route path="/finance/journal-builder/:id" element={<JournalBuilder />} />
            <Route path="/finance/reports" element={<FinancialReports />} />
            <Route path="/finance/expense-builder" element={<ExpenseBuilder />} />
            <Route path="/finance/income-builder" element={<IncomeBuilder />} />
            <Route path="/finance/invoices/new" element={<InvoiceBuilder />} />
            <Route path="/finance/banking" element={<BankingHub />} />
            <Route path="/finance/ap-ar" element={<ARAPManager />} />
            <Route path="/finance/fixed-assets" element={<FixedAssets />} />
            <Route path="/finance/bank-rec" element={<BankReconciliation />} />
            <Route path="/finance/aged-reports" element={<AgedReports />} />
            <Route path="/finance/receivables" element={<ReceivablesHub />} />
            <Route path="/finance/vendor-bills" element={<VendorBills />} />
            <Route path="/finance/payables" element={<PayablesHub />} />
            <Route path="/finance/cost-centers" element={<CostCenters />} />
            <Route path="/finance/tax-report" element={<TaxReport />} />
            <Route path="/finance/custom-reports" element={<CustomReportBuilder />} />
            <Route path="/finance/dashboard" element={<FinanceDashboard />} />
            <Route path="/hr" element={<ComingSoon module="Human Resources" />} />

            {/* Admin */}
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/roles" element={<UserManagement initialTab="roles" />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/admin/variables" element={<VariableSettings />} />
            <Route path="/admin/serials" element={<VariableSettings />} />
            <Route path="/admin/settings" element={<Settings />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/crm/leads" replace />} />
          </Route>
        </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NavLoadingProvider>
            <AppRoutes />
            <RexAIAssistant />
          </NavLoadingProvider>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App
