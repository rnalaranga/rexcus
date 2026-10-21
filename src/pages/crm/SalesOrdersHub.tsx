import React from 'react'
import { ShoppingBag, ArrowLeft, Plus } from 'lucide-react'
import { FinishedGoodsOrdersView } from '@/pages/inventory/FinishedGoodsOrdersView'
import { Badge } from '@/components/ui/Badge'

export const SalesOrdersHub: React.FC = () => {
  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-primary tracking-tight">Sales Orders & Commercial Dispatch</h1>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                CRM Orders
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Approved commercial orders, sales order PDFs, invoice conversions, and security gate pass dispatches.
            </p>
          </div>
        </div>
      </div>

      {/* Main Finished Goods & Sales Orders View */}
      <FinishedGoodsOrdersView />
    </div>
  )
}
