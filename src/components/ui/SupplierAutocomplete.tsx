import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, Truck, X, Check, Building2, Phone, Mail } from 'lucide-react'
import { useSuppliers } from '@/hooks/useData'
import { cn, formatCurrency } from '@/lib/utils'

export interface SupplierAutocompleteProps {
  value?: string
  onChange: (supplierId: string, supplier?: any) => void
  onSelectSupplier?: (supplier: any) => void
  suppliers?: any[]
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  showClear?: boolean
  allOptionLabel?: string
}

export const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
  value = '',
  onChange,
  onSelectSupplier,
  suppliers: propSuppliers,
  placeholder = 'Type to search vendor / supplier (name, contact, phone)...',
  className = '',
  required = false,
  disabled = false,
  autoFocus = false,
  showClear = true,
  allOptionLabel
}) => {
  const { data: hookSuppliers = [] } = useSuppliers()
  const allSuppliers = propSuppliers || hookSuppliers

  // Find currently selected supplier
  const selected = useMemo(() => {
    if (!value || value === 'all') return null
    return (
      allSuppliers.find((s: any) => 
        s.id === value || 
        (s.name && s.name.toLowerCase() === value.toLowerCase()) ||
        (s.company && s.company.toLowerCase() === value.toLowerCase())
      ) || null
    )
  }, [value, allSuppliers])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep display query aligned with selected supplier when not actively typing
  useEffect(() => {
    if (selected) {
      setQuery(selected.company || selected.name || '')
    } else if (!value || value === 'all') {
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
          setQuery(selected.company || selected.name || '')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  // Filter based on query
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return allSuppliers.slice(0, 12)

    return allSuppliers.filter((s: any) => {
      const name = (s.name || '').toLowerCase()
      const comp = (s.company || '').toLowerCase()
      const contact = (s.contactName || s.contactPerson || '').toLowerCase()
      const email = (s.email || '').toLowerCase()
      const phone = (s.phone || '').toLowerCase()
      const vat = (s.vat || s.vatNumber || s.tin || '').toLowerCase()
      const id = (s.id || '').toLowerCase()
      return (
        name.includes(q) ||
        comp.includes(q) ||
        contact.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        vat.includes(q) ||
        id.includes(q)
      )
    }).slice(0, 15)
  }, [query, allSuppliers])

  const handleSelect = (item: any) => {
    onChange(item.id, item)
    if (onSelectSupplier) onSelectSupplier(item)
    setQuery(item.company || item.name || '')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(allOptionLabel ? 'all' : '', null)
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
        <Search size={14} className="absolute left-3 text-muted pointer-events-none" />
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
              onChange(allOptionLabel ? 'all' : '', null)
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full input-base text-xs pl-9 pr-8 py-2 transition-all font-medium',
            selected && 'border-amber-500/40 bg-amber-500/[0.02]',
            className
          )}
        />
        {showClear && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Clear vendor selection"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Floating Suggestions Portal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            top: coords.top + 4,
            left: coords.left,
            width: Math.max(coords.width, 360)
          }}
          className="fixed z-[99999] bg-surface border border-theme-subtle shadow-2xl rounded-xl overflow-hidden max-h-72 flex flex-col animate-fade-in backdrop-blur-xl"
        >
          <div className="p-2 border-b border-theme-subtle/60 bg-surface2/30 flex items-center justify-between text-[10px] text-muted font-bold uppercase tracking-wider">
            <span>Vendor / Supplier Autocomplete ({filtered.length} found)</span>
            <span className="font-mono text-[9px]">↑↓ navigate • ↵ select</span>
          </div>

          <div className="overflow-y-auto divide-y divide-theme-subtle/30 custom-scrollbar flex-1">
            {allOptionLabel && (
              <div
                onMouseDown={() => {
                  onChange('all', null)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'px-3.5 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors',
                  value === 'all' || !value ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold' : 'hover:bg-surface2'
                )}
              >
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-amber-500 shrink-0" />
                  <span>{allOptionLabel}</span>
                </div>
                {(value === 'all' || !value) && <Check size={14} className="text-amber-500" />}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No vendors found matching <span className="font-semibold text-primary">"{query}"</span>
              </div>
            ) : (
              filtered.map((item: any, idx: number) => {
                const isSelected = selected?.id === item.id || value === item.id
                const isHighlighted = idx === highlightIdx
                const displayName = item.company || item.name || 'Vendor'
                const subName = item.company && item.name && item.company !== item.name ? item.name : (item.contactName || item.contactPerson || '')

                return (
                  <div
                    key={item.id || idx}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseDown={() => handleSelect(item)}
                    className={cn(
                      'px-3.5 py-2.5 text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors',
                      isHighlighted && 'bg-surface2',
                      isSelected && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Truck size={13} className="text-amber-500 shrink-0" />
                        <span className="font-bold text-primary truncate text-xs">
                          {displayName}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                          {item.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted mt-1 truncate">
                        {subName && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Building2 size={10} className="text-muted" /> {subName}
                          </span>
                        )}
                        {item.phone && (
                          <span className="flex items-center gap-1 shrink-0 font-mono">
                            <Phone size={10} className="text-muted" /> {item.phone}
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center gap-1 truncate font-mono">
                            <Mail size={10} className="text-muted" /> {item.email}
                          </span>
                        )}
                      </div>

                      {Number(item.outstandingBalance || 0) > 0 && (
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          Payable: {formatCurrency(item.outstandingBalance, true)}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-amber-500 shrink-0" />
                    )}
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
