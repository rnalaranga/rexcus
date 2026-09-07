import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface AutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: { label: string; value: string; extra?: string }[]
  onSelectOption: (value: string) => void
}

export const Autocomplete: React.FC<AutocompleteProps> = ({ suggestions, onSelectOption, className, value, onChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(e.target as Node)
      const isOutsideList = listRef.current && !listRef.current.contains(e.target as Node)
      if (isOutsideWrapper && isOutsideList) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [isOpen, value]) // Re-calc if value changes too

  const filtered = suggestions.filter(s => s.label.toLowerCase().includes(String(value || '').toLowerCase()))

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        {...props}
        value={value}
        onChange={e => {
          if (onChange) onChange(e)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className={cn('w-full', className)}
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && typeof document !== 'undefined' && createPortal(
        <ul 
          ref={listRef}
          style={{ top: coords.top + 4, left: coords.left, width: coords.width }}
          className="absolute z-50 max-h-48 overflow-y-auto bg-surface border border-theme shadow-glass rounded-lg py-1"
        >
          {filtered.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 text-xs hover:bg-surface2 cursor-pointer flex justify-between items-center text-primary"
              onMouseDown={(e) => {
                e.preventDefault() // Prevents input onBlur
                e.stopPropagation() // Prevents document click outside
                onSelectOption(s.value)
                setIsOpen(false)
              }}
            >
              <span>{s.label}</span>
              {s.extra && <span className="text-[10px] text-muted font-mono">{s.extra}</span>}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
