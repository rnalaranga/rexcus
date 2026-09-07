import React, { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...', value, onChange, className, size = 'md',
}) => {
  const [internal, setInternal] = useState('')
  const current = value !== undefined ? value : internal

  const handleChange = (v: string) => {
    if (value === undefined) setInternal(v)
    onChange?.(v)
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search
        size={size === 'sm' ? 13 : 14}
        className="absolute left-3 text-muted pointer-events-none"
      />
      <input
        type="text"
        value={current}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'input-base w-full',
          size === 'sm' ? 'pl-8 pr-3 py-1.5 text-xs' : 'pl-9 pr-9 py-2 text-sm',
        )}
      />
      {current && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 text-muted hover:text-primary transition-colors"
        >
          <X size={size === 'sm' ? 11 : 13} />
        </button>
      )}
    </div>
  )
}
