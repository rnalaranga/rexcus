import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, Package, X, Check, AlertTriangle, Layers } from 'lucide-react'
import { useInventory } from '@/hooks/useData'
import { cn, formatCurrency } from '@/lib/utils'

export interface ProductAutocompleteProps {
  value?: string
  onChange: (productId: string, product?: any) => void
  onSelectProduct?: (product: any) => void
  products?: any[]
  filterType?: 'finished_product' | 'raw_material' | 'spare_part' | 'product' | 'all'
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  showStock?: boolean
  showPrice?: boolean
  showClear?: boolean
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value = '',
  onChange,
  onSelectProduct,
  products: propProducts,
  filterType = 'all',
  placeholder = 'Type product name, SKU, or description to search...',
  className = '',
  required = false,
  disabled = false,
  autoFocus = false,
  showStock = true,
  showPrice = true,
  showClear = true
}) => {
  const { data: hookInventory = [] } = useInventory()
  const inventorySource = propProducts || hookInventory

  // Filter based on filterType if specified
  const eligibleProducts = useMemo(() => {
    if (filterType === 'all') return inventorySource
    if (filterType === 'finished_product' || filterType === 'product') {
      return inventorySource.filter((item: any) => 
        item.type === 'finished_product' || item.type === 'product' || item.category === 'Finished Goods'
      )
    }
    if (filterType === 'raw_material') {
      return inventorySource.filter((item: any) => 
        item.type === 'raw_material' || item.type === 'material' || item.category === 'Raw Material'
      )
    }
    if (filterType === 'spare_part') {
      return inventorySource.filter((item: any) => 
        item.type === 'spare_part' || item.category === 'Spare Parts'
      )
    }
    return inventorySource
  }, [inventorySource, filterType])

  // Current selected item
  const selected = useMemo(() => {
    if (!value) return null
    return (
      eligibleProducts.find((p: any) => 
        p.id === value || 
        (p.name && p.name.toLowerCase() === value.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase() === value.toLowerCase())
      ) || null
    )
  }, [value, eligibleProducts])

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selected) {
      setQuery(selected.name || '')
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
          setQuery(selected.name || '')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  // Filter based on user query
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return eligibleProducts.slice(0, 10)

    return eligibleProducts.filter((item: any) => {
      const name = (item.name || '').toLowerCase()
      const sku = (item.sku || '').toLowerCase()
      const desc = (item.description || '').toLowerCase()
      const cat = (item.category || item.type || '').toLowerCase()
      const id = (item.id || '').toLowerCase()
      return (
        name.includes(q) ||
        sku.includes(q) ||
        desc.includes(q) ||
        cat.includes(q) ||
        id.includes(q)
      )
    }).slice(0, 14)
  }, [query, eligibleProducts])

  const handleSelect = (item: any) => {
    onChange(item.id, item)
    if (onSelectProduct) onSelectProduct(item)
    setQuery(item.name)
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
        <Package size={14} className="absolute left-3 text-muted pointer-events-none" />
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
            selected && 'border-emerald-500/40 bg-emerald-500/[0.02]',
            className
          )}
        />
        {showClear && query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-md text-muted hover:text-primary hover:bg-surface2 transition-colors"
            title="Clear product selection"
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
            <span>Product Autocomplete ({filtered.length} found)</span>
            <span className="font-mono">Use ↑↓ & Enter</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-theme-subtle/20">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No products found matching "<strong className="text-primary">{query}</strong>"
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = selected && selected.id === item.id
                const isHighlighted = idx === highlightIdx
                const stockQty = Number(item.quantity ?? item.stock ?? 0)
                const price = Number(item.unitPrice ?? item.price ?? item.unitCost ?? 0)
                const itemType = (item.type || item.category || 'Product').toUpperCase()

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
                      isHighlighted ? 'bg-emerald-500/10 text-emerald-600' : 'hover:bg-surface2/60 text-primary',
                      isSelected && 'bg-emerald-500/15 font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-surface2 border border-theme-subtle flex items-center justify-center shrink-0 text-muted">
                        <Package size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-primary truncate max-w-[220px]">
                            {item.name}
                          </span>
                          {item.sku && (
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface2 text-muted border border-theme-subtle">
                              {item.sku}
                            </span>
                          )}
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-surface2 text-secondary uppercase border border-theme-subtle/50 shrink-0">
                            {itemType}
                          </span>
                        </div>
                        {item.description && (
                          <span className="text-[10px] text-muted truncate mt-0.5 max-w-[300px]">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-0.5 text-right font-mono">
                      {showPrice && (
                        <span className="font-bold text-xs text-primary">
                          {formatCurrency(price)}
                        </span>
                      )}
                      {showStock && (
                        <span className={cn(
                          'text-[9px] font-semibold',
                          stockQty > 0 ? 'text-emerald-500' : 'text-amber-500 flex items-center gap-0.5'
                        )}>
                          {stockQty > 0 ? `${stockQty} ${item.uom || 'pcs'} stock` : 'Out of stock'}
                        </span>
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
