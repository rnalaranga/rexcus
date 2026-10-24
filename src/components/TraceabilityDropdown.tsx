import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  Network, ChevronDown, ExternalLink, X, FileText, ShoppingBag, 
  Factory, Truck, Receipt, ShoppingCart, PackageCheck, DollarSign,
  Layers, CheckCircle2, Clock, AlertCircle, Sparkles, ArrowRight
} from 'lucide-react'

export interface TraceNode {
  id?: string
  type: 
    | 'quotation' 
    | 'order' 
    | 'work_order' 
    | 'gate_pass' 
    | 'invoice' 
    | 'receipt' 
    | 'po' 
    | 'grn' 
    | 'bill' 
    | 'mr' 
    | 'other'
  title: string            // e.g. "Work Order", "Quotation", "Tax Invoice"
  reference: string        // e.g. "WO-2026-0012", "QT-902", "INV-102"
  subtitle?: string        // e.g. "Status: In Progress", "Paid in Full", "LKR 45,000"
  statusBadge?: {
    label: string
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral'
  }
  navigateUrl?: string     // e.g. "/production/work-orders/123"
  onClick?: () => void     // custom action handler (e.g. open preview modal)
}

interface TraceabilityDropdownProps {
  title?: string           // Parent record reference (e.g. "Traceability for ORD-1002")
  traces: TraceNode[]
  compact?: boolean
  className?: string
}

export const TraceabilityDropdown: React.FC<TraceabilityDropdownProps> = ({
  title,
  traces = [],
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; openUpwards: boolean } | null>(null)

  const hasTraces = traces.length > 0

  // Calculate portal coordinates
  const calculatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const DROPDOWN_WIDTH = 340
    const ESTIMATED_HEIGHT = Math.min(380, 70 + traces.length * 58)
    const PADDING = 12

    let left = rect.left + rect.width / 2 - DROPDOWN_WIDTH / 2
    if (left < PADDING) left = PADDING
    if (left + DROPDOWN_WIDTH > window.innerWidth - PADDING) {
      left = window.innerWidth - DROPDOWN_WIDTH - PADDING
    }

    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < ESTIMATED_HEIGHT && rect.top > ESTIMATED_HEIGHT

    const top = openUpwards ? rect.top - 6 : rect.bottom + 6

    setCoords({ top, left, openUpwards })
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOpen) {
      setIsOpen(false)
    } else {
      calculatePosition()
      setIsOpen(true)
    }
  }

  // Handle outside click & scroll
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('.traceability-dropdown-portal') && 
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleScrollOrResize = (e: Event) => {
      // Don't close if scrolling inside the dropdown itself
      if (e.target && (e.target as HTMLElement).closest?.('.traceability-dropdown-portal')) {
        return
      }
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  // Get icon and colors for each trace type
  const getTraceMeta = (type: TraceNode['type']) => {
    switch (type) {
      case 'quotation':
        return {
          icon: FileText,
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
          label: 'Quotation'
        }
      case 'order':
        return {
          icon: ShoppingBag,
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
          label: 'Sales Order'
        }
      case 'work_order':
        return {
          icon: Factory,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          label: 'Work Order'
        }
      case 'gate_pass':
        return {
          icon: Truck,
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
          label: 'Gate Pass'
        }
      case 'invoice':
        return {
          icon: Receipt,
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          label: 'Invoice'
        }
      case 'receipt':
        return {
          icon: DollarSign,
          bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
          label: 'Receipt'
        }
      case 'po':
        return {
          icon: ShoppingCart,
          bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
          label: 'PO'
        }
      case 'grn':
        return {
          icon: PackageCheck,
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          label: 'GRN'
        }
      case 'bill':
        return {
          icon: DollarSign,
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
          label: 'Bill'
        }
      case 'mr':
        return {
          icon: Layers,
          bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
          label: 'Material Request'
        }
      default:
        return {
          icon: Network,
          bg: 'bg-surface2 text-primary border-theme-subtle',
          label: 'Record'
        }
    }
  }

  const getBadgeStyle = (variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral') => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      case 'warning':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      case 'danger':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      case 'info':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
      default:
        return 'bg-surface2 text-muted border-theme-subtle'
    }
  }

  return (
    <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Trigger Button with Glowing Light */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded-none border transition-all duration-200 select-none ${
          hasTraces
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.22)] hover:shadow-[0_0_16px_rgba(16,185,129,0.4)]'
            : 'bg-surface2/40 hover:bg-surface2/70 text-muted hover:text-primary border-theme-subtle/80 opacity-70 hover:opacity-100'
        }`}
        title={hasTraces ? `${traces.length} linked trace document(s). Click to view chain.` : 'No linked documents found.'}
      >
        {/* Lamp / Indicator Light */}
        {hasTraces ? (
          <span className="relative flex h-2.5 w-2.5 shrink-0" title="Traces Active">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981,0_0_16px_#10b981]"></span>
          </span>
        ) : (
          <span className="inline-flex rounded-full h-2 w-2 bg-neutral-400/50 dark:bg-neutral-600/50 shrink-0" title="No Traces"></span>
        )}

        {/* Text Label */}
        <span className="text-[11px] font-semibold tracking-tight">
          {hasTraces ? (compact ? `${traces.length}` : `Traces (${traces.length})`) : (compact ? '-' : 'No Traces')}
        </span>

        {/* Dropdown Arrow */}
        <ChevronDown 
          size={11} 
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${hasTraces ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'}`} 
        />
      </button>

      {/* Floating Dropdown via Portal */}
      {isOpen && coords && createPortal(
        <div
          className="traceability-dropdown-portal fixed z-[9999] animate-in fade-in zoom-in-95 duration-150 select-none shadow-2xl"
          style={{
            top: coords.openUpwards ? undefined : coords.top,
            bottom: coords.openUpwards ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: 340
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-surface1/95 backdrop-blur-xl border border-theme-subtle rounded-none shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-3 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {hasTraces ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400"></span>
                  )}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    Traceability Chain
                  </h4>
                  {title && (
                    <p className="text-[10px] text-muted font-mono truncate max-w-[210px]">{title}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-none border ${
                  hasTraces 
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                    : 'bg-surface2 text-muted border-theme-subtle'
                }`}>
                  {traces.length} linked
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded-none"
                  title="Close"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Traces List */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-theme-subtle/50 p-1">
              {!hasTraces ? (
                <div className="py-6 px-4 text-center">
                  <div className="w-8 h-8 mx-auto rounded-none bg-surface2/60 flex items-center justify-center text-muted mb-2 border border-theme-subtle">
                    <Network size={14} />
                  </div>
                  <p className="text-xs font-medium text-secondary">No Linked Records</p>
                  <p className="text-[10px] text-muted mt-0.5">
                    No upstream or downstream documents found in this transaction chain.
                  </p>
                </div>
              ) : (
                traces.map((trace, idx) => {
                  const meta = getTraceMeta(trace.type)
                  const Icon = meta.icon

                  const handleItemClick = () => {
                    setIsOpen(false)
                    if (trace.onClick) {
                      trace.onClick()
                    } else if (trace.navigateUrl) {
                      navigate(trace.navigateUrl)
                    }
                  }

                  const isClickable = !!trace.onClick || !!trace.navigateUrl

                  return (
                    <div
                      key={trace.id || `${trace.type}-${idx}`}
                      onClick={isClickable ? handleItemClick : undefined}
                      className={`group/item p-2.5 flex items-start gap-2.5 transition-colors ${
                        isClickable
                          ? 'hover:bg-primary/5 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-1.5 rounded-none border shrink-0 mt-0.5 ${meta.bg}`}>
                        <Icon size={13} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                            {trace.title || meta.label}
                          </span>
                          {trace.statusBadge && (
                            <span className={`text-[9px] font-mono px-1 py-0.2 rounded-none border font-semibold ${getBadgeStyle(trace.statusBadge.variant)}`}>
                              {trace.statusBadge.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-xs text-primary group-hover/item:text-blue-500 transition-colors">
                            {trace.reference}
                          </span>
                          {isClickable && (
                            <ExternalLink size={10} className="text-muted group-hover/item:text-blue-500 shrink-0 transition-colors" />
                          )}
                        </div>

                        {trace.subtitle && (
                          <p className="text-[11px] text-secondary mt-0.5 truncate">
                            {trace.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {hasTraces && (
              <div className="p-2 bg-surface2/30 border-t border-theme-subtle flex items-center justify-between text-[10px] text-muted">
                <span>Click item to navigate / inspect</span>
                <span className="font-mono flex items-center gap-0.5 text-secondary">
                  Chain flow <ArrowRight size={10} />
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
