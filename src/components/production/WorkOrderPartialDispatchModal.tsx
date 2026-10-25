import React, { useState } from 'react'
import { Truck, X, Printer, PackageCheck, AlertCircle, Shield, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { partialDispatchWorkOrder } from '@/lib/api'
import { GatePassPrintView } from '@/components/GatePassPrintView'
import { Modal } from '@/components/ui/Modal'

interface WorkOrderPartialDispatchModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: any
  onSuccess: () => void
}

export const WorkOrderPartialDispatchModal: React.FC<WorkOrderPartialDispatchModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSuccess
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdGatePass, setCreatedGatePass] = useState<any | null>(null)

  const totalJobQty = Math.max(1, Number(workOrder?.jobQty || 1))
  const previouslyDispatched = Number(workOrder?.dispatchedQty || 0)
  const remainingQty = Math.max(0, totalJobQty - previouslyDispatched)

  const [dispatchQty, setDispatchQty] = useState<number>(remainingQty > 0 ? remainingQty : 1)
  const [carrier, setCarrier] = useState('REX Transport')
  const [vehicleNo, setVehicleNo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [destination, setDestination] = useState('')
  const [receivedBy, setReceivedBy] = useState(workOrder?.customer || '')
  const [notes, setNotes] = useState('')

  if (!isOpen || !workOrder) return null

  const calculatedNewCumulative = previouslyDispatched + Number(dispatchQty || 0)
  const calculatedNewRemaining = Math.max(0, totalJobQty - calculatedNewCumulative)
  const isFinalDispatch = calculatedNewRemaining === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const qty = Number(dispatchQty)
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid dispatch quantity greater than 0.')
      return
    }

    if (qty > remainingQty && remainingQty > 0) {
      setErrorMsg(`Dispatch quantity cannot exceed remaining quantity (${remainingQty} pcs).`)
      return
    }

    setSubmitting(true)
    try {
      const res = await partialDispatchWorkOrder(workOrder.id, {
        dispatchQty: qty,
        carrier,
        vehicleNo,
        driverName,
        destination,
        receivedBy,
        notes,
        issuedBy: 'Dispatch Store Keeper'
      })

      if (res && res.error) {
        throw new Error(res.error)
      }

      onSuccess()
      if (res.gatePass) {
        setCreatedGatePass(res.gatePass)
      } else {
        onClose()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record partial dispatch')
    } finally {
      setSubmitting(false)
    }
  }

  // If gate pass was created and ready for printing
  if (createdGatePass) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md">
        <div className="bg-surface border border-theme-subtle w-full max-w-4xl p-6 shadow-2xl rounded-none max-h-[95vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-theme-subtle print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-primary">Dispatch Logged Successfully!</h3>
                <p className="text-xs text-muted">
                  Security Gate Pass & Delivery Note #{createdGatePass.id} generated for {dispatchQty} pcs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => window.print()}
                className="text-xs bg-rex-600 hover:bg-rex-700 text-white font-bold py-1.5 px-4 rounded-none flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Gate Pass / Delivery Note
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedGatePass(null)
                  onClose()
                }}
                className="text-xs py-1.5 px-3 rounded-none border-theme-subtle"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white text-black">
            <GatePassPrintView gatePass={createdGatePass} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md">
      <div className="bg-surface border border-theme-subtle w-full max-w-2xl shadow-2xl rounded-none flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme-subtle bg-surface2/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">
                Record Partial Dispatch / Handover Note
              </h3>
              <p className="text-xs text-muted">
                WO #{workOrder.orderNo || workOrder.id} • {workOrder.customer || 'Customer Order'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Job Progress & Qty Banner */}
          <div className="p-4 bg-surface2/40 border border-theme-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-secondary uppercase tracking-wider">Manufacturing & Dispatch Progress</span>
              <span className="font-mono font-bold text-primary">
                {previouslyDispatched} / {totalJobQty} pcs dispatched ({Math.round((previouslyDispatched / totalJobQty) * 100)}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-surface2 border border-theme-subtle overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((previouslyDispatched / totalJobQty) * 100))}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 font-mono">
              <div className="p-2 bg-surface border border-theme-subtle">
                <span className="block text-[10px] text-muted uppercase font-sans">Total Order</span>
                <span className="font-bold text-primary text-sm">{totalJobQty} pcs</span>
              </div>
              <div className="p-2 bg-surface border border-theme-subtle">
                <span className="block text-[10px] text-muted uppercase font-sans">Prev. Dispatched</span>
                <span className="font-bold text-emerald-500 text-sm">{previouslyDispatched} pcs</span>
              </div>
              <div className="p-2 bg-surface border border-theme-subtle">
                <span className="block text-[10px] text-muted uppercase font-sans">Remaining</span>
                <span className="font-bold text-amber-500 text-sm">{remainingQty} pcs</span>
              </div>
            </div>
          </div>

          {/* Quantity to Dispatch Input */}
          <div className="p-3 bg-rex-500/5 border border-rex-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary uppercase tracking-wide">
                Quantity to Dispatch in this Batch: *
              </label>
              {remainingQty > 0 && (
                <button
                  type="button"
                  onClick={() => setDispatchQty(remainingQty)}
                  className="text-[11px] font-bold text-rex-600 dark:text-rex-400 hover:underline"
                >
                  Dispatch All Remaining ({remainingQty} pcs)
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={remainingQty > 0 ? remainingQty : totalJobQty}
                value={dispatchQty}
                onChange={e => setDispatchQty(Math.max(1, Number(e.target.value)))}
                className="w-36 bg-surface border border-theme-subtle p-2 text-base font-mono font-black text-primary focus:border-rex-500"
                required
              />
              <span className="text-xs font-semibold text-muted">pcs of finished goods</span>
            </div>

            <div className="text-[11px] font-mono text-secondary pt-1">
              After this dispatch: <strong>{calculatedNewCumulative} / {totalJobQty} pcs</strong> will be dispatched. 
              {isFinalDispatch ? (
                <span className="ml-1 text-emerald-500 font-bold">This is the FINAL delivery (100% complete)!</span>
              ) : (
                <span className="ml-1 text-amber-500 font-bold">({calculatedNewRemaining} pcs remaining for next batch)</span>
              )}
            </div>
          </div>

          {/* Transport & Vehicle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Transport Carrier / Method:
              </label>
              <select
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              >
                <option value="REX Transport">REX Dedicated Transport</option>
                <option value="Customer Vehicle">Customer Arranged Vehicle / Pick-up</option>
                <option value="Third-party Courier">Third-Party Courier (Prompt / Pronto / Domex)</option>
                <option value="Hand Delivery">Hand Delivery / Site Tech</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Vehicle Reg Number:
              </label>
              <input
                type="text"
                placeholder="e.g. WP ND-4521"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary uppercase font-mono focus:border-rex-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Driver / Transport Tech:
              </label>
              <input
                type="text"
                placeholder="Name of driver or transporter"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                Handover To / Recipient Contact:
              </label>
              <input
                type="text"
                placeholder="Person receiving goods"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
              Destination / Delivery Site Address:
            </label>
            <input
              type="text"
              placeholder="Factory or warehouse address"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
              Delivery Notes / Security Gate Remarks:
            </label>
            <input
              type="text"
              placeholder="e.g. Part 1 delivery. Balance parts in final grinding."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-surface border border-theme-subtle p-2 text-xs text-primary focus:border-rex-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-theme-subtle">
            <span className="text-[11px] text-muted">
              Auto-creates Security Gate Pass & Delivery Handover Note
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs rounded-none border-theme-subtle"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 rounded-none flex items-center gap-1.5"
              >
                <PackageCheck size={15} />
                {submitting ? 'Generating Pass...' : isFinalDispatch ? 'Confirm Final Dispatch' : `Confirm Partial Dispatch (${dispatchQty} pcs)`}
              </Button>
            </div>
          </div>

        </form>

      </div>
    </div>
  )
}
