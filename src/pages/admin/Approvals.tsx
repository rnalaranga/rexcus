import React, { useState } from 'react'
import { CheckSquare, Search, Check, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useCustomers } from '@/hooks/useData'
import { approveCreditLimit } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function Approvals() {
  const { data: customers, refetch } = useCustomers()
  const [processing, setProcessing] = useState<string | null>(null)
  
  const pendingApprovals = customers.filter((c: any) => c.creditLimitStatus === 'pending')

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      await approveCreditLimit(id, 'approved')
      await refetch()
    } catch (e) {
      console.error(e)
    }
    setProcessing(null)
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    try {
      await approveCreditLimit(id, 'rejected')
      await refetch()
    } catch (e) {
      console.error(e)
    }
    setProcessing(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-5 pb-0">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <CheckSquare size={24} className="text-rex-500" />
          Pending Approvals
        </h1>
        <p className="text-sm text-secondary mt-1">Approve or reject requested customer credit limits.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <GlassCard className="max-w-4xl">
          <div className="p-4 border-b border-theme-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest">Credit Limit Requests</h2>
            <Badge value={`${pendingApprovals.length} Pending`} variant="warning" size="sm" />
          </div>
          
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <CheckSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p>No pending approvals at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-theme-subtle">
              {pendingApprovals.map((customer: any) => (
                <div key={customer.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary">{customer.name} {customer.company ? `(${customer.company})` : ''}</h3>
                    <p className="text-xs text-secondary mt-0.5">
                      {customer.segment.toUpperCase()} 
                      <span className="mx-2">•</span> 
                      Current Limit: {formatCurrency(customer.creditLimit || 0)}
                      <span className="mx-2">•</span>
                      Advance: {customer.requiresAdvance ? 'Required' : 'No'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {Number(customer.pendingCreditLimit) > 0 && Number(customer.pendingCreditLimit) !== Number(customer.creditLimit) && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Requested Limit</p>
                        <p className="text-lg font-bold text-amber-500">{formatCurrency(customer.pendingCreditLimit || 0)}</p>
                      </div>
                    )}
                    
                    {customer.pendingRequiresAdvance !== null && Boolean(customer.pendingRequiresAdvance) !== Boolean(customer.requiresAdvance) && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Requested Advance</p>
                        <p className="text-sm font-bold text-amber-500">{customer.pendingRequiresAdvance ? 'Required' : 'Not Required'}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleReject(customer.id)}
                        disabled={processing === customer.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <X size={16} />
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleApprove(customer.id)}
                        disabled={processing === customer.id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Check size={16} className="mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
