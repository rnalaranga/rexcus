import React from 'react'
import { ShoppingBag } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { FinishedGoodsOrdersView } from '@/pages/inventory/FinishedGoodsOrdersView'
import { Badge } from '@/components/ui/Badge'
import { PageHelpButton } from '@/components/help/PageHelpButton'
import { useAuth } from '@/contexts/AuthContext'

interface SalesOrdersHubProps {
  isStoresMode?: boolean
}

export const SalesOrdersHub: React.FC<SalesOrdersHubProps> = ({ isStoresMode = false }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const isStoreRole = Boolean(
    isStoresMode ||
    location.pathname.startsWith('/inventory/sales-orders') ||
    searchParams.get('view') === 'stores' ||
    user?.role === 'store_keeper' ||
    user?.role === 'store_assistant' ||
    user?.roleName?.toLowerCase().includes('store') ||
    user?.roleName?.toLowerCase().includes('warehouse')
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-primary tracking-tight">
                {isStoreRole ? 'Sales Orders for Stores' : 'Sales Orders & Commercial Dispatch'}
              </h1>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-semibold uppercase tracking-wider rounded-none">
                {isStoreRole ? 'Stores Dispatch' : 'CRM Orders'}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {isStoreRole 
                ? 'Store dispatch station for client sales orders, security gate passes and delivery quantities.'
                : 'Approved commercial orders, sales order PDFs, invoice conversions, and security gate pass dispatches.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton moduleId={isStoreRole ? 'inventory-sales-orders' : 'crm-sales-orders'} />
        </div>
      </div>

      {/* Main Finished Goods & Sales Orders View */}
      <FinishedGoodsOrdersView isStoresView={isStoreRole} />
    </div>
  )
}
