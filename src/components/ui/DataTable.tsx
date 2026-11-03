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
  pagination?: boolean
  itemsPerPage?: number
}

export function DataTable<T>({
  columns, data, onRowClick, className,
  emptyMessage = 'No data found', keyExtractor,
  pagination = false, itemsPerPage = 50
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setCurrentPage(1)
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    let av = (a as Record<string, unknown>)[sortKey]
    let bv = (b as Record<string, unknown>)[sortKey]
    if (av === bv) return 0
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1

    // Numeric comparison if both values or numeric strings
    const an = typeof av === 'number' ? av : (typeof av === 'string' && av.trim() !== '' && !isNaN(Number(av)) ? Number(av) : NaN)
    const bn = typeof bv === 'number' ? bv : (typeof bv === 'string' && bv.trim() !== '' && !isNaN(Number(bv)) ? Number(bv) : NaN)
    if (!isNaN(an) && !isNaN(bn)) {
      return sortDir === 'asc' ? an - bn : bn - an
    }

    // Date comparison if valid ISO / date string
    const ad = Date.parse(String(av))
    const bd = Date.parse(String(bv))
    if (!isNaN(ad) && !isNaN(bd) && String(av).includes('-') && String(bv).includes('-')) {
      return sortDir === 'asc' ? ad - bd : bd - ad
    }

    // Natural alphanumeric comparison
    const as = String(av).toLowerCase()
    const bs = String(bv).toLowerCase()
    const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' })
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  const displayData = pagination ? sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : sorted

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-full border-collapse">
          <thead>
            <tr className="border-b border-theme-subtle">
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-left',
                    'text-[10px] font-semibold uppercase tracking-widest text-muted',
                    col.sortable && 'cursor-pointer hover:text-primary select-none transition-colors group',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  title={col.sortable ? `Click to sort by ${col.header} (Excel style)` : undefined}
                >
                  <span className={cn(
                    'inline-flex items-center gap-1.5',
                    col.align === 'right' && 'justify-end',
                    col.align === 'center' && 'justify-center'
                  )}>
                    {col.header}
                    {col.sortable && (
                      sortKey === String(col.key)
                        ? sortDir === 'asc'
                          ? <ChevronUp size={12} className="text-blue-500 font-bold" />
                          : <ChevronDown size={12} className="text-blue-500 font-bold" />
                        : <ChevronsUpDown size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayData.map(row => (
                <tr
                  key={keyExtractor(row)}
                  onClick={(e) => {
                    const target = e.target as HTMLElement | null;
                    if (
                      target && (
                        target.closest('button') ||
                        target.closest('a') ||
                        target.closest('[role="button"]') ||
                        target.closest('input') ||
                        target.closest('select') ||
                        target.closest('.no-row-click')
                      )
                    ) {
                      return;
                    }
                    onRowClick?.(row);
                  }}
                  className={cn(
                    'border-b border-theme-subtle/50 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface2/60'
                  )}
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3 text-xs text-primary',
                        col.align === 'right'  && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key as string], row)
                        : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-theme-subtle text-xs text-muted">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-theme-subtle disabled:opacity-30 hover:bg-surface2"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-theme-subtle disabled:opacity-30 hover:bg-surface2"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
