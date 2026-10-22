import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, FileText, X, Check } from 'lucide-react'
import { useQuotations } from '@/hooks/useData'
import { cn, formatCurrency } from '@/lib/utils'

export interface QuotationAutocompleteProps {
  value?: string
  onChange: (quoteId: string, quote?: any) => void
  onSelectQuotation?: (quote: any) => void
  quotations?: any[]
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  showClear?: boolean
}

export const QuotationAutocomplete: React.FC<QuotationAutocompleteProps> = ({
  value = '',
  onChange,
  onSelectQuotation,
  quotations: propQuotations,
  placeholder = 'Type to search quotation # (AHSQ, PROD) or customer...',
  className = '',
  required = false,
  disabled = false,
  autoFocus = false,
  showClear = true
}) => {
  const { data: hookQuotations = [] } = useQuotations()
  const rawList = propQuotations || hookQuotations

  // Normalized list of quotations
  const availableQuotations = useMemo(() => {
    return (rawList || []).map((q: any) => {
      let parsed: any = {}
      try {
        parsed = typeof q.data === 'string' ? JSON.parse(q.data) : (q.data || {})
      } catch (e) {}

      const isProd = q.type === 'product' || q.type === 'product_draft' || parsed.isProductQuotation === true || parsed.quotationCategory === 'product'
      const quoteTypeLabel = isProd ? 'Product Quotation' : 'Engineering Quotation'
      const qNo = q.quotationNo || q.docNo || parsed.quotationNo || q.quoNo || q.id
      const custName = q.leadCompany || q.leadName || parsed.customerCompany || parsed.customerName || 'Customer'
      const totalAmt = Number(q.totalAmount || q.customAmount || parsed.custTotals?.total || 0)

      return {
        ...q,
        parsed,
        isProd,
        quoteTypeLabel,
        displayNo: qNo,
        customerDisplayName: custName,
        totalAmt
      }
    })
  }, [rawList])

  const selected = useMemo(() => {
    if (!value) return null
    return (
      availableQuotations.find((q: any) =>
        String(q.id) === String(value) ||
        String(q.displayNo).toLowerCase() === String(value).toLowerCase()
      ) || null
    )
  }, [value, availableQuotations])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.displayNo} • ${selected.customerDisplayName}`)
    } else if (!value) {
      setQuery('')
    } else {
      setQuery(value)
    }
  }, [selected, value])

  const updateCoords = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  useEffect(() => {
    if (open) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, true)
      return () => {
        window.removeEventListener('resize', updateCoords)
        window.removeEventListener('scroll', updateCoords, true)
      }
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (selected) {
          setQuery(`${selected.displayNo} • ${selected.customerDisplayName}`)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return availableQuotations.slice(0, 10)

    return availableQuotations.filter((item: any) => {
      const no = (item.displayNo || '').toLowerCase()
      const cust = (item.customerDisplayName || '').toLowerCase()
      const subj = (item.parsed?.subject || item.subject || '').toLowerCase()
      const id = (item.id || '').toLowerCase()
      return no.includes(q) || cust.includes(q) || subj.includes(q) || id.includes(q)
    }).slice(0, 12)
  }, [query, availableQuotations])

  const handleSelect = (item: any) => {
    onChange(item.id, item)
    if (onSelectQuotation) onSelectQuotation(item)
    setQuery(`${item.displayNo} • ${item.customerDisplayName}`)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', null)
    setQuery('')
    setOpen(false)
    if (inputRef.current) inputRef.current.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        updateCoords()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => (prev + 1 < filtered.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightIdx]) {
        handleSelect(filtered[highlightIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <FileText size={14} className="absolute left-3 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          required={required && !value}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true)
            updateCoords()
          }}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlightIdx(0)
            updateCoords()
            if (!e.target.value) {
              onChange('', null)
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full input-base text-xs pl-9 pr-8 py-2 transition-all font-medium',
            selected && 'border-blue-500/40 bg-blue-500/[0.02]',
            className
          )}
        />
        {showClear && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Clear quotation selection"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            top: coords.top + 4,
            left: coords.left,
            width: Math.max(coords.width, 380)
          }}
          className="fixed z-[99999] bg-surface border border-theme-subtle shadow-2xl rounded-xl overflow-hidden max-h-72 flex flex-col animate-fade-in backdrop-blur-xl"
        >
          <div className="p-2 border-b border-theme-subtle/60 bg-surface2/30 flex items-center justify-between text-[10px] text-muted font-bold uppercase tracking-wider">
            <span>Quotation Autocomplete ({filtered.length} found)</span>
            <span className="font-mono">Use ↑↓ & Enter</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-theme-subtle/20">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No quotations found matching "<strong className="text-primary">{query}</strong>"
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = selected && selected.id === item.id
                const isHighlighted = idx === highlightIdx

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseDown={e => {
                      e.preventDefault()
                      handleSelect(item)
                    }}
                    className={cn(
                      'p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors',
                      isHighlighted ? 'bg-blue-500/10 text-blue-600' : 'hover:bg-surface2/60 text-primary',
                      isSelected && 'bg-blue-500/15 font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-surface2 border border-theme-subtle flex items-center justify-center shrink-0 text-muted">
                        <FileText size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-primary">
                            {item.displayNo}
                          </span>
                          <span className={cn(
                            'text-[8px] font-bold px-1.5 py-0.2 rounded border shrink-0',
                            item.isProd 
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' 
                              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                          )}>
                            {item.isProd ? 'Product Quote' : 'Engineering'}
                          </span>
                          <span className="text-[9px] font-semibold text-muted font-mono">
                            ({item.status || 'Draft'})
                          </span>
                        </div>
                        <span className="text-[11px] text-secondary font-medium truncate mt-0.5 max-w-[260px]">
                          {item.customerDisplayName}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5 text-right font-mono">
                      <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.totalAmt)}
                      </span>
                      {isSelected && <Check size={14} className="text-emerald-500" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
