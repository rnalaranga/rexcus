import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, BookOpen, X, Check } from 'lucide-react'
import { useAccounts } from '@/hooks/useFinance'
import { cn } from '@/lib/utils'

export interface AccountAutocompleteProps {
  value?: string
  onChange: (accountId: string, account?: any) => void
  onSelectAccount?: (account: any) => void
  accounts?: any[]
  typeFilter?: string | string[]
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  showClear?: boolean
}

export const AccountAutocomplete: React.FC<AccountAutocompleteProps> = ({
  value = '',
  onChange,
  onSelectAccount,
  accounts: propAccounts,
  typeFilter,
  placeholder = 'Type account code or name to search...',
  className = '',
  required = false,
  disabled = false,
  autoFocus = false,
  showClear = true
}) => {
  const { data: hookAccounts = [] } = useAccounts()
  const allAccounts = propAccounts || hookAccounts

  // Filter accounts if typeFilter is specified
  const eligibleAccounts = useMemo(() => {
    if (!typeFilter) return allAccounts
    const filters = Array.isArray(typeFilter) ? typeFilter : [typeFilter]
    return allAccounts.filter((a: any) => filters.includes(a.type))
  }, [allAccounts, typeFilter])

  // Find currently selected account
  const selected = useMemo(() => {
    if (!value) return null
    return eligibleAccounts.find((a: any) => a.id === value || a.code === value) || null
  }, [value, eligibleAccounts])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync display text with selected account
  useEffect(() => {
    if (selected) {
      setQuery(`${selected.code} - ${selected.name}`)
    } else if (!value) {
      setQuery('')
    } else {
      setQuery(value)
    }
  }, [selected, value])

  const updateCoords = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpwards = spaceBelow < 280 && rect.top > 280

      setCoords({
        top: openUpwards ? Math.max(10, rect.top - 280) : rect.bottom,
        left: Math.max(10, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 380) - 10)),
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
          setQuery(`${selected.code} - ${selected.name}`)
        } else if (!value) {
          setQuery('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected, value])

  // Filter accounts based on query (code, name, type, subtype)
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return eligibleAccounts.slice(0, 30)

    return eligibleAccounts.filter((a: any) => {
      const code = String(a.code || '').toLowerCase()
      const name = String(a.name || '').toLowerCase()
      const type = String(a.type || '').toLowerCase()
      const subtype = String(a.subtype || '').toLowerCase()
      const combined = `${code} - ${name}`.toLowerCase()

      return (
        code.includes(q) ||
        name.includes(q) ||
        type.includes(q) ||
        subtype.includes(q) ||
        combined.includes(q)
      )
    }).slice(0, 30)
  }, [query, eligibleAccounts])

  const handleSelect = (account: any) => {
    onChange(account.id, account)
    if (onSelectAccount) onSelectAccount(account)
    setQuery(`${account.code} - ${account.name}`)
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
      if (selected) {
        setQuery(`${selected.code} - ${selected.name}`)
      }
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Expense':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      case 'Revenue':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Asset':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Liability':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Equity':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      default:
        return 'bg-surface2 text-muted border-theme'
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
              onChange('', null)
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full bg-surface border border-theme rounded-lg pl-9 pr-8 py-2 text-xs text-primary font-medium outline-none focus:ring-1 focus:ring-rex-500 transition-all',
            selected && 'border-rex-500/40 bg-rex-500/[0.02]',
            className
          )}
        />
        {showClear && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Clear account selection"
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
            <span>Chart of Accounts ({filtered.length} found)</span>
            <span className="font-mono text-[9px]">↑↓ navigate • ↵ select</span>
          </div>

          <div className="overflow-y-auto divide-y divide-theme-subtle/30 custom-scrollbar flex-1">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No accounts match "{query}".
              </div>
            ) : (
              filtered.map((acc: any, idx: number) => {
                const isSelected = value === acc.id || value === acc.code
                const isHighlighted = idx === highlightIdx

                return (
                  <div
                    key={acc.id}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(acc)
                    }}
                    className={cn(
                      'px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors',
                      isSelected && 'bg-rex-500/10 text-rex-600 dark:text-rex-400 font-semibold',
                      !isSelected && isHighlighted && 'bg-surface2',
                      !isSelected && !isHighlighted && 'hover:bg-surface2'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen size={13} className="text-muted shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-primary">{acc.code}</span>
                          <span className="text-secondary truncate">{acc.name}</span>
                        </div>
                        {acc.subtype && (
                          <div className="text-[10px] text-muted truncate">
                            {acc.subtype}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', getTypeBadgeColor(acc.type))}>
                        {acc.type}
                      </span>
                      {isSelected && <Check size={14} className="text-rex-500 shrink-0" />}
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
