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
import { Suppliers } from '@/pages/inventory/Suppliers'
import { SupplierDetail } from '@/pages/inventory/SupplierDetail'
import { Invoices } from '@/pages/finance/Invoices'
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
          <Route path="/inventory/suppliers" element={<Suppliers />} />
          <Route path="/inventory/suppliers/:id" element={<SupplierDetail />} />

          {/* Finance */}
          <Route path="/finance/invoices" element={<Invoices />} />

          {/* Placeholder modules */}
          <Route path="/production" element={<ComingSoon module="Production Planning" />} />
          <Route path="/sales" element={<ComingSoon module="Sales & Orders" />} />
          <Route path="/finance" element={<ComingSoon module="Finance & Accounting" />} />
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


