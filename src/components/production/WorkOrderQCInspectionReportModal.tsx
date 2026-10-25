import React, { useRef } from 'react'
import { createPortal } from 'react-dom';
import { Printer, Download, X, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface WorkOrderQCInspectionReportModalProps {
  isOpen: boolean
  onClose: () => void
  workOrder: any
  checkpoints: any[]
}

export const WorkOrderQCInspectionReportModal: React.FC<WorkOrderQCInspectionReportModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  checkpoints
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !workOrder) return null

  const handlePrint = () => {
    window.print()
  }

  // Summary Metrics
  const totalPoints = checkpoints.length
  const passedPoints = checkpoints.filter(c => c.status === 'Pass').length
  const failedPoints = checkpoints.filter(c => c.status === 'Fail').length
  const marginalPoints = checkpoints.filter(c => c.status === 'Marginal').length
  const pendingPoints = checkpoints.filter(c => !c.status || c.status === 'Pending').length
  const passRate = totalPoints > 0 ? Math.round((passedPoints / totalPoints) * 100) : 0

  const overallDisposition = failedPoints > 0 
    ? 'REWORK REQUIRED / REJECTED' 
    : pendingPoints > 0 
      ? 'INSPECTION IN PROGRESS' 
      : 'CONFORMS TO SPECIFICATIONS (ACCEPTED)'

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      {/* Container */}
      <div className="relative bg-surface border border-theme-subtle w-full max-w-5xl shadow-2xl rounded-none flex flex-col max-h-[92vh]">
        
        {/* Top Action Bar (Screen Only) */}
        <div className="flex items-center justify-between p-4 border-b border-theme-subtle bg-surface2 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-rex-600 dark:text-rex-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide">
                Quality Inspection Certificate & Dimension Sheet
              </h2>
              <p className="text-xs text-muted">
                WO #{workOrder.orderNo || workOrder.id} • {workOrder.customer || 'Internal Manufacturing'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs flex items-center gap-1.5 px-4 py-2 rounded-none"
            >
              <Printer size={15} />
              Print Certificate
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs px-3 py-2 rounded-none border-theme-subtle text-secondary hover:text-primary"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible print:text-black">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                  REX INDUSTRIES (PVT) LTD
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  Precision Engineering, CNC Machining & Industrial Manufacturing
                </p>
                <p className="text-[11px] text-slate-500">
                  Quality Assurance Department • ISO 9001 Compliant Quality Protocol
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-slate-900 px-3 py-1 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Document Type</span>
                  <span className="block text-sm font-black text-slate-900">INSPECTION REPORT</span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-1">
                  Report Ref: QC-{workOrder.orderNo || workOrder.id}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                </div>
                <div className="text-[11px] text-slate-600">
                  Issue Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border border-slate-300 p-4 bg-slate-50 print:bg-transparent">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Work Order No.</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{workOrder.orderNo || workOrder.id}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer / Client</span>
              <span className="font-bold text-slate-900">{workOrder.customer || 'Internal Stock'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Part / Job Title</span>
              <span className="font-bold text-slate-900">{workOrder.title || 'Machined Component'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job / Batch Qty</span>
              <span className="font-mono font-bold text-slate-900">{workOrder.jobQty || 1} Pcs</span>
            </div>
          </div>

          {/* Overall Disposition Banner */}
          <div className={`p-3 border text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
            failedPoints > 0 
              ? 'bg-rose-50 border-rose-300 text-rose-800' 
              : pendingPoints > 0 
                ? 'bg-amber-50 border-amber-300 text-amber-800' 
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            {failedPoints > 0 ? (
              <AlertCircle size={16} className="text-rose-600" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600" />
            )}
            Overall Quality Status: {overallDisposition} (Pass Rate: {passRate}%)
          </div>

          {/* Checkpoints & Tolerance Matrix Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              Machining & Dimensional Inspection Points
            </h3>

            {checkpoints.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No QC checkpoints have been defined for this work order.
              </p>
            ) : (
              <div className="border border-slate-300 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-left font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-2 border-r border-slate-300 w-12 text-center">Item</th>
                      <th className="p-2 border-r border-slate-300">BOM Part / Routing Op</th>
                      <th className="p-2 border-r border-slate-300">Inspection Parameter</th>
                      <th className="p-2 border-r border-slate-300">Gauge / Instrument</th>
                      <th className="p-2 border-r border-slate-300 text-center">Nominal Spec</th>
                      <th className="p-2 border-r border-slate-300 text-center">Tolerance Limits</th>
                      <th className="p-2 border-r border-slate-300 text-center bg-slate-200">Actual Measured</th>
                      <th className="p-2 text-center w-20">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {checkpoints.map((cp, idx) => {
                      const hasTol = cp.targetValue !== undefined && cp.targetValue !== null && cp.targetValue !== ''
                      const minTol = hasTol ? (Number(cp.targetValue) + Number(cp.lowerTolerance || 0)).toFixed(3) : '-'
                      const maxTol = hasTol ? (Number(cp.targetValue) + Number(cp.upperTolerance || 0)).toFixed(3) : '-'
                      const unit = cp.unit || 'mm'
                      const isPass = cp.status === 'Pass'
                      const isFail = cp.status === 'Fail'
                      const isMarginal = cp.status === 'Marginal'

                      return (
                        <tr key={cp.id || idx} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-300 font-mono text-center font-bold text-slate-600">
                            {cp.checkpointNo || `Q${idx + 1}`}
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <div className="font-bold text-slate-900">{cp.partTitle || 'Main Component'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{cp.operationName || 'Machining'}</div>
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <span className="font-bold text-slate-900">{cp.parameter}</span>
                            {cp.category && (
                              <span className="block text-[10px] text-slate-500">{cp.category}</span>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-slate-700">
                            {cp.instrument || 'Caliper / Micrometer'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                            {hasTol ? `${cp.targetValue} ${unit}` : (cp.nominalSpec || 'Standard')}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-700 text-[10px]">
                            {hasTol ? (
                              <span>
                                {cp.lowerTolerance >= 0 ? `+${cp.lowerTolerance}` : cp.lowerTolerance} / {cp.upperTolerance >= 0 ? `+${cp.upperTolerance}` : cp.upperTolerance}
                                <span className="block text-slate-500">[{minTol} ~ {maxTol}]</span>
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-mono font-black text-slate-950 bg-slate-50">
                            {cp.latestValue !== undefined && cp.latestValue !== null && cp.latestValue !== '' ? (
                              <span>{cp.latestValue} {hasTol ? unit : ''}</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Pending</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isPass && (
                              <span className="px-2 py-0.5 font-bold text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300">
                                PASS
                              </span>
                            )}
                            {isMarginal && (
                              <span className="px-2 py-0.5 font-bold text-[10px] text-amber-800 bg-amber-100 border border-amber-300">
                                MARGINAL
                              </span>
                            )}
                            {isFail && (
                              <span className="px-2 py-0.5 font-bold text-[10px] text-rose-800 bg-rose-100 border border-rose-300">
                                FAIL
                              </span>
                            )}
                            {!isPass && !isFail && !isMarginal && (
                              <span className="px-2 py-0.5 font-medium text-[10px] text-slate-500 bg-slate-100">
                                UNCHECKED
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes & Standards Section */}
          <div className="border border-slate-200 p-3 bg-slate-50 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 uppercase tracking-wide block text-[10px]">
              Standard Inspection Guidelines & Traceability:
            </span>
            <p>
              1. All dimensions measured at 20°C ± 2°C reference temperature using calibrated inspection instruments.
            </p>
            <p>
              2. Unless otherwise specified, general machining tolerances conform to ISO 2768-m (Medium).
            </p>
            <p>
              3. Visual inspection confirms all components are deburred, clean, and free of chatter marks, chips, and sharp edges.
            </p>
          </div>

          {/* Sign-off Blocks */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                Inspected By (QC Inspector):
              </span>
              <div className="border-t border-slate-400 pt-1 text-slate-700">
                <span className="block font-bold">Name & Signature</span>
                <span className="text-[10px] text-slate-500">Date: ____ / ____ / 2026</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                Reviewed By (Production Lead / Engineer):
              </span>
              <div className="border-t border-slate-400 pt-1 text-slate-700">
                <span className="block font-bold">Sign & Verification</span>
                <span className="text-[10px] text-slate-500">Date: ____ / ____ / 2026</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                Authorized By (Head of Quality):
              </span>
              <div className="border-t border-slate-400 pt-1 text-slate-700">
                <span className="block font-bold">Official QA Stamp & Approval</span>
                <span className="text-[10px] text-slate-500">Date: ____ / ____ / 2026</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 text-center text-[10px] text-slate-400 border-t border-slate-200">
            REX INDUSTRIES ERP QUALITY MANAGEMENT SYSTEM • GENERATED CERTIFICATE • CONFIDENTIAL
          </div>
        </div>

      </div>
    </div>
  , document.body)
}
