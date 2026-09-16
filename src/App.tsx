import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CRMDashboard } from '@/pages/crm/Dashboard'
import { Customers } from '@/pages/crm/Customers'
import { CustomerDetail } from '@/pages/crm/CustomerDetail'
import { Leads } from '@/pages/crm/Leads'
import { Quotations } from '@/pages/crm/Quotations'
import { Deals } from '@/pages/crm/Deals'
import { Contacts } from '@/pages/crm/Contacts'
import { QuotationBuilder } from '@/pages/crm/QuotationBuilder'
import { Followups } from '@/pages/crm/Followups'
import { Inventory } from '@/pages/inventory/Inventory'
import { PurchasingHub } from '@/pages/purchasing/PurchasingHub'
import { POBuilder } from '@/pages/purchasing/POBuilder'
import { GRNBuilder } from '@/pages/purchasing/GRNBuilder'
import { BillBuilder } from '@/pages/purchasing/BillBuilder'
import { MRBuilder } from '@/pages/purchasing/MRBuilder'
import { Suppliers } from '@/pages/inventory/Suppliers'
import { SupplierDetail } from '@/pages/inventory/SupplierDetail'
import { Invoices } from '@/pages/finance/Invoices'
import { AccountingHub } from '@/pages/finance/AccountingHub'
import { JournalBuilder } from '@/pages/finance/JournalBuilder'
import { FinancialReports } from '@/pages/finance/FinancialReports'
import { ExpenseBuilder } from '@/pages/finance/ExpenseBuilder'
import { ARAPManager } from '@/pages/finance/ARAPManager'
import { FixedAssets } from '@/pages/finance/FixedAssets'
import { BankReconciliation } from '@/pages/finance/BankReconciliation'
import { AgedReports } from '@/pages/finance/AgedReports'
import { ReceivablesHub } from '@/pages/finance/ReceivablesHub'
import { PayablesHub } from '@/pages/finance/PayablesHub'
import { Machinery } from '@/pages/production/Machinery'

import { WorkOrders } from '@/pages/production/WorkOrders'
import { Employees } from '@/pages/hr/Employees'
import { Skills } from '@/pages/hr/Skills'
import { LaborReport } from '@/pages/hr/LaborReport'
import { CostCenters } from '@/pages/finance/CostCenters'
import { TaxReport } from '@/pages/finance/TaxReport'
import { CustomReportBuilder } from '@/pages/finance/CustomReportBuilder'
import { FinanceDashboard } from '@/pages/finance/FinanceDashboard'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { UserManagement } from '@/pages/admin/UserManagement'
import { Settings } from '@/pages/admin/Settings'

const ComingSoon: React.FC<{ module: string }> = ({ module }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-64">
    <div className="glass-red p-8 text-center max-w-sm">
      <div className="text-3xl mb-3">ðŸ› ï¸</div>
      <h2 className="text-sm font-bold text-rex-600 dark:text-rex-300 uppercase tracking-widest mb-1">{module}</h2>
      <p className="text-xs text-secondary">This module is under construction.</p>
    </div>
  </div>
)

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      
      <Route path="/" element={<Navigate to="/crm/leads" replace />} />
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
          <Route path="/crm/quotations/new/:leadId" element={<QuotationBuilder />} />

          {/* Inventory */}
          <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchasing" element={<PurchasingHub />} />
            <Route path="/purchasing/po-builder" element={<POBuilder />} />
            <Route path="/purchasing/mr-builder" element={<MRBuilder />} />
            <Route path="/purchasing/po-builder/:id" element={<POBuilder />} />
            <Route path="/purchasing/grn-builder" element={<GRNBuilder />} />
            <Route path="/purchasing/bill-builder" element={<BillBuilder />} />
          <Route path="/inventory/suppliers" element={<Suppliers />} />
          <Route path="/inventory/suppliers/:id" element={<SupplierDetail />} />

          {/* Finance */}
          <Route path="/finance/invoices" element={<Invoices />} />

          {/* Placeholder modules */}
          <Route path="/production" element={<WorkOrders />} />
          <Route path="/production/machinery" element={<Machinery />} />
            
          <Route path="/hr/employees" element={<Employees />} />
          <Route path="/hr/skills" element={<Skills />} />
          <Route path="/hr/report" element={<LaborReport />} />
          <Route path="/sales" element={<ComingSoon module="Sales & Orders" />} />
          <Route path="/finance" element={<AccountingHub />} />
            <Route path="/finance/journal-builder" element={<JournalBuilder />} />
            <Route path="/finance/reports" element={<FinancialReports />} />
            <Route path="/finance/expense-builder" element={<ExpenseBuilder />} />
            <Route path="/finance/ap-ar" element={<ARAPManager />} />
            <Route path="/finance/fixed-assets" element={<FixedAssets />} />
            <Route path="/finance/bank-rec" element={<BankReconciliation />} />
            <Route path="/finance/aged-reports" element={<AgedReports />} />
            <Route path="/finance/receivables" element={<ReceivablesHub />} />
            <Route path="/finance/payables" element={<PayablesHub />} />
            <Route path="/finance/cost-centers" element={<CostCenters />} />
            <Route path="/finance/tax-report" element={<TaxReport />} />
            <Route path="/finance/custom-reports" element={<CustomReportBuilder />} />
            <Route path="/finance/dashboard" element={<FinanceDashboard />} />
          <Route path="/hr" element={<ComingSoon module="Human Resources" />} />

          {/* Admin */}
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/settings" element={<Settings />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/crm/leads" replace />} />
        </Route>
      </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}

export default App



