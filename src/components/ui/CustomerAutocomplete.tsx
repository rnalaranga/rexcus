import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, User, X, Check, Building2, Phone, Mail } from 'lucide-react'
import { useCustomers, useLeads } from '@/hooks/useData'
import { cn } from '@/lib/utils'

export interface CustomerAutocompleteProps {
  value?: string
  onChange: (customerId: string, customer?: any) => void
  onSelectCustomer?: (customer: any) => void
  customers?: any[]
  leads?: any[]
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  showClear?: boolean
  allOptionLabel?: string
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value = '',
  onChange,
  onSelectCustomer,
  customers: propCustomers,
  leads: propLeads,
  placeholder = 'Type to search customer (name, company, phone)...',
  className = '',
  required = false,
  disabled = false,
  autoFocus = false,
  showClear = true,
  allOptionLabel
}) => {
  const { data: hookCustomers = [] } = useCustomers()
  const { data: hookLeads = [] } = useLeads()

  const allCustomers = propCustomers || hookCustomers
  const allLeads = propLeads || hookLeads

  // Find currently selected customer
  const selected = useMemo(() => {
    if (!value || value === 'all') return null
    return (
      allCustomers.find((c: any) => c.id === value || (c.company && c.company.toLowerCase() === value.toLowerCase()) || (c.name && c.name.toLowerCase() === value.toLowerCase())) ||
      allLeads.find((l: any) => l.id === value || (l.company && l.company.toLowerCase() === value.toLowerCase()) || (l.name && l.name.toLowerCase() === value.toLowerCase())) ||
      null
    )
  }, [value, allCustomers, allLeads])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep display query aligned with selected customer when not actively typing
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

  // Combined searchable list of customers and leads
  const combinedList = useMemo(() => {
    const list: any[] = []
    const seenIds = new Set<string>()

    allCustomers.forEach((c: any) => {
      seenIds.add(c.id)
      list.push({
        ...c,
        isLead: false,
        displayName: c.company || c.name || 'Customer',
        subName: c.company && c.name && c.company !== c.name ? c.name : '',
        badgeText: 'Customer',
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      })
    })

    allLeads.forEach((l: any) => {
      if (!seenIds.has(l.id)) {
        list.push({
          ...l,
          isLead: true,
          displayName: l.company || l.name || 'Lead',
          subName: l.company && l.name && l.company !== l.name ? l.name : '',
          badgeText: l.status || 'Lead',
          badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
        })
      }
    })

    return list
  }, [allCustomers, allLeads])

  // Filter based on query
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return combinedList.slice(0, 10)

    return combinedList.filter((item: any) => {
      const name = (item.name || '').toLowerCase()
      const comp = (item.company || '').toLowerCase()
      const email = (item.email || '').toLowerCase()
      const phone = (item.phone || '').toLowerCase()
      const vat = (item.vat || item.tin || '').toLowerCase()
      const addr = (item.address || '').toLowerCase()
      const id = (item.id || '').toLowerCase()
      return (
        name.includes(q) ||
        comp.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        vat.includes(q) ||
        addr.includes(q) ||
        id.includes(q)
      )
    }).slice(0, 12)
  }, [query, combinedList])

  const handleSelect = (item: any) => {
    onChange(item.id, item)
    if (onSelectCustomer) onSelectCustomer(item)
    setQuery(item.displayName)
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
            selected && 'border-blue-500/40 bg-blue-500/[0.02]',
            className
          )}
        />
        {showClear && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Clear customer selection"
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
            <span>Customer Autocomplete ({filtered.length} found)</span>
            <span className="font-mono">Use ↑↓ & Enter</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-theme-subtle/20">
            {allOptionLabel && (
              <div
                onMouseDown={e => {
                  e.preventDefault()
                  onChange('all', null)
                  setQuery('')
                  setOpen(false)
                }}
                className={cn(
                  'p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors border-b border-theme-subtle/40',
                  (value === 'all' || !value) ? 'bg-blue-500/10 text-blue-600 font-bold' : 'hover:bg-surface2/60 text-primary'
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <User size={13} className="text-muted" />
                  <span>{allOptionLabel}</span>
                </div>
                {(value === 'all' || !value) && <Check size={14} className="text-emerald-500" />}
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No matching customers or leads found for "<strong className="text-primary">{query}</strong>"
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
                        <Building2 size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-primary truncate max-w-[240px]">
                            {item.displayName}
                          </span>
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0', item.badgeColor)}>
                            {item.badgeText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted flex-wrap mt-0.5">
                          {item.subName && (
                            <span className="flex items-center gap-1">
                              <User size={9} /> {item.subName}
                            </span>
                          )}
                          {item.phone && (
                            <span className="font-mono flex items-center gap-1">
                              <Phone size={9} /> {item.phone}
                            </span>
                          )}
                          {item.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={9} /> {item.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-muted">
                      {isSelected ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <span>{item.id}</span>
                      )}
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
