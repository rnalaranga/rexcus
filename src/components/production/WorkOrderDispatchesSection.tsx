import React, { useState } from 'react'
import { 
  Truck, Plus, Printer, CheckCircle2, AlertCircle, Clock, 
  Package, Calendar, User, FileText, ArrowRight, ShieldCheck 
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { GatePassPrintView } from '@/components/GatePassPrintView'

interface WorkOrderDispatchesSectionProps {
  workOrder: any
  onOpenDispatchModal: () => void
  settings?: any
}

export const WorkOrderDispatchesSection: React.FC<WorkOrderDispatchesSectionProps> = ({
  workOrder,
  onOpenDispatchModal,
  settings
}) => {
  const [printGatePass, setPrintGatePass] = useState<any | null>(null)
  const [loadingGp, setLoadingGp] = useState(false)

  const totalJobQty = Math.max(1, Number(workOrder?.jobQty || 1))
  const previouslyDispatched = Number(workOrder?.dispatchedQty || 0)
  const remainingQty = Math.max(0, totalJobQty - previouslyDispatched)
  const percentDispatched = Math.min(100, Math.round((previouslyDispatched / totalJobQty) * 100))
  const isFullyDispatched = remainingQty === 0 && previouslyDispatched > 0

  // Parse dispatches history
  const dispatchesList: any[] = React.useMemo(() => {
    if (!workOrder) return []
    if (Array.isArray(workOrder.dispatches)) return workOrder.dispatches
    if (typeof workOrder.dispatches === 'string') {
      try {
        return JSON.parse(workOrder.dispatches)
      } catch (e) {
        return []
      }
    }
    return []
  }, [workOrder?.dispatches])

  const handleFetchAndPrintGatePass = async (gpId: string) => {
    if (!gpId) return
    setLoadingGp(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/gate-passes/${gpId}`)
      if (!res.ok) throw new Error('Gate pass not found')
      const gp = await res.json()
      setPrintGatePass(gp)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingGp(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface2/40 p-4 border border-theme-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-primary tracking-wide">
              Incremental Partial Dispatches & Delivery Notes
            </h3>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Log partial production handovers as parts are manufactured. Track batch delivery notes, vehicle details, and security gate passes.
          </p>
        </div>

        <Button
          onClick={onOpenDispatchModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 py-2 px-4 rounded-none shadow-sm"
        >
          <Plus size={15} />
          Record Partial Dispatch
        </Button>
      </div>

      {/* Progress & Overview KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <GlassCard className="p-3.5 border-theme-subtle rounded-none space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted block">Total Order Target</span>
          <div className="text-xl font-mono font-bold text-primary">{totalJobQty} pcs</div>
          <span className="text-[10px] text-muted block">Job #{workOrder.orderNo || workOrder.id}</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted block">Dispatched to Date</span>
          <div className="text-xl font-mono font-bold text-emerald-500">{previouslyDispatched} pcs</div>
          <span className="text-[10px] text-muted block">{dispatchesList.length} dispatch batch(es)</span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted block">Remaining in Workshop</span>
          <div className={`text-xl font-mono font-bold ${remainingQty > 0 ? 'text-amber-500' : 'text-muted'}`}>
            {remainingQty} pcs
          </div>
          <span className="text-[10px] text-muted block">
            {remainingQty === 0 ? 'All finished items handed over' : 'Pending manufacturing / packing'}
          </span>
        </GlassCard>

        <GlassCard className="p-3.5 border-theme-subtle rounded-none space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-muted">Delivery Completion</span>
            <span className="font-mono font-black text-primary">{percentDispatched}%</span>
          </div>
          <div className="w-full h-2.5 bg-surface2 border border-theme-subtle overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isFullyDispatched ? 'bg-emerald-500' : 'bg-rex-600'}`}
              style={{ width: `${percentDispatched}%` }}
            />
          </div>
          <Badge
            variant={isFullyDispatched ? 'success' : previouslyDispatched > 0 ? 'warning' : 'default'}
            size="sm"
            className="w-full justify-center text-center font-bold"
          >
            {isFullyDispatched ? 'Fully Dispatched (100%)' : previouslyDispatched > 0 ? `Partially Dispatched (${previouslyDispatched}/${totalJobQty})` : 'Awaiting First Dispatch'}
          </Badge>
        </GlassCard>
      </div>

      {/* Dispatches Audit Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
          <FileText size={14} className="text-secondary" />
          Dispatch Batches & Handover History ({dispatchesList.length})
        </h4>

        {dispatchesList.length === 0 ? (
          <div className="p-10 text-center bg-surface2/20 border border-dashed border-theme-subtle space-y-3">
            <Truck size={32} className="mx-auto text-muted opacity-40" />
            <div>
              <p className="text-sm font-bold text-primary">No Dispatches Recorded Yet</p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-0.5">
                When units are finished and ready to leave the workshop, record a partial dispatch to generate official Delivery Notes and Security Gate Passes.
              </p>
            </div>
            <Button
              onClick={onOpenDispatchModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-none"
            >
              <Plus size={14} className="mr-1" /> Record First Handover
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-theme-subtle bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface2/60 border-b border-theme-subtle text-left text-muted font-bold text-[11px]">
                  <th className="py-2.5 px-3">Delivery Ref #</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3 text-center">Batch Qty</th>
                  <th className="py-2.5 px-3 text-center">Cumulative Progress</th>
                  <th className="py-2.5 px-3 text-center">Balance Remaining</th>
                  <th className="py-2.5 px-3">Carrier & Transport</th>
                  <th className="py-2.5 px-3">Handover Contact</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Gate Pass / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle">
                {dispatchesList.map((d, idx) => {
                  const isFinal = d.isFinalDispatch || d.remainingQty === 0

                  return (
                    <tr key={d.id || idx} className="hover:bg-surface2/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-primary text-[11px]">
                        {d.dispatchNo || d.id || `DN-${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted text-[11px]">
                        {d.date ? new Date(d.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        +{d.dispatchedQty} pcs
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-primary font-bold">
                        {d.cumulativeQty} / {d.totalJobQty || totalJobQty} pcs
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-500 font-bold">
                        {d.remainingQty} pcs
                      </td>
                      <td className="py-2.5 px-3 text-secondary text-[11px]">
                        <div>{d.carrier || 'REX Transport'}</div>
                        {d.vehicleNo && (
                          <div className="font-mono text-[10px] text-muted">{d.vehicleNo} {d.driverName ? `(${d.driverName})` : ''}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-secondary text-[11px]">
                        <div>{d.receivedBy || workOrder.customer || '-'}</div>
                        {d.destination && (
                          <div className="text-[10px] text-muted truncate max-w-xs">{d.destination}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isFinal 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {isFinal ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {isFinal ? 'Final Delivery' : 'Partial Batch'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchAndPrintGatePass(d.gatePassId || d.id)}
                          disabled={loadingGp}
                          className="text-[11px] py-1 px-2.5 h-auto text-primary hover:bg-surface2 border-theme-subtle rounded-none font-bold inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> Gate Pass ({d.gatePassId || 'Print'})
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Gate Pass Modal */}
      {printGatePass && (
        <Modal
          isOpen={true}
          onClose={() => setPrintGatePass(null)}
          title={`Gate Pass & Delivery Note #${printGatePass.id}`}
          size="4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-subtle print:hidden">
              <span className="text-xs text-muted">
                Official Security & Dispatch Gate Pass for <strong className="text-primary">{printGatePass.customerName}</strong>
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="bg-rex-600 hover:bg-rex-700 text-white font-bold flex items-center gap-1.5 rounded-none text-xs"
              >
                <Printer size={14} /> Print Document
              </Button>
            </div>
            <div className="p-4 bg-white text-black">
              <GatePassPrintView gatePass={printGatePass} settings={settings} />
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
