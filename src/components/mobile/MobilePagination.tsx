import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export interface MobilePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const MobilePagination: React.FC<MobilePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'items',
  className = ''
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // If there's only 1 page and no page size selector is available, or items fit on 1 page and totalItems <= pageSizeOptions[0], 
  // we still display the neat count if there are multiple items, but hide if totalItems <= 5.
  if (totalPages <= 1 && totalItems <= (pageSizeOptions[0] || 10)) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2.5 rounded-xl bg-surface border border-theme shadow-xs select-none ${className}`}>
      {/* Top / Left: Summary info & Page size selector */}
      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2 text-muted text-[11px]">
        <span>
          Showing <strong className="text-primary font-mono">{startItem}</strong>-
          <strong className="text-primary font-mono">{endItem}</strong> of{' '}
          <strong className="text-primary font-mono">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1">
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-surface2 border border-theme-subtle rounded-md px-1.5 py-1 text-[11px] text-primary font-medium focus:outline-none focus:border-rex-500 cursor-pointer"
              title="Items per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}/pg
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bottom / Right: Navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center sm:justify-end w-full sm:w-auto gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-theme-subtle/50">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className="min-h-[34px] px-2.5 rounded-lg border border-theme-subtle bg-surface2/60 text-primary hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-semibold active:scale-95 transition-all"
            aria-label="Previous Page"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          {/* Page Display / Selector */}
          {totalPages <= 4 ? (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[32px] h-[34px] rounded-lg text-xs font-mono font-bold transition-all ${
                    safePage === p
                      ? 'bg-rex-600 text-white shadow-xs'
                      : 'border border-theme-subtle bg-surface2/40 text-secondary hover:bg-surface2'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative">
              <select
                value={safePage}
                onChange={(e) => onPageChange(Number(e.target.value))}
                className="min-h-[34px] pl-2.5 pr-6 rounded-lg border border-theme-subtle bg-surface2/60 text-primary text-xs font-mono font-bold appearance-none cursor-pointer focus:outline-none focus:border-rex-500"
                title="Jump to page"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    Page {p} / {totalPages}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              />
            </div>
          )}

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className="min-h-[34px] px-2.5 rounded-lg border border-theme-subtle bg-surface2/60 text-primary hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-semibold active:scale-95 transition-all"
            aria-label="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
