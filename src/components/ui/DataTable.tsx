import React, { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  className?: string
  emptyMessage?: string
  keyExtractor: (row: T) => string
}

export function DataTable<T>({
  columns, data, onRowClick, className,
  emptyMessage = 'No data found', keyExtractor,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = (a as Record<string, unknown>)[sortKey]
    const bv = (b as Record<string, unknown>)[sortKey]
    if (av === bv) return 0
    const cmp = av! < bv! ? -1 : 1
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr className="border-b border-theme-subtle">
            {columns.map(col => (
              <th
                key={String(col.key)}
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 text-left',
                  'text-[10px] font-semibold uppercase tracking-widest text-muted',
                  col.sortable && 'cursor-pointer hover:text-primary select-none transition-colors',
                  col.align === 'right'  && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    sortKey === String(col.key)
                      ? sortDir === 'asc'
                        ? <ChevronUp size={11} className="text-rex-500" />
                        : <ChevronDown size={11} className="text-rex-500" />
                      : <ChevronsUpDown size={11} className="opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map(row => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-theme-subtle transition-colors duration-100 table-row-hover',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map(col => {
                  const rawVal = (row as Record<string, unknown>)[String(col.key)]
                  const cell = col.render ? col.render(rawVal, row) : String(rawVal ?? '—')
                  return (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3 text-sm text-secondary',
                        col.align === 'right'  && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {cell}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
