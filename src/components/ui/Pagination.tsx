import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [15, 25, 50, 100],
  itemLabel = 'items'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers to show with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface border border-theme-subtle text-xs text-muted select-none mt-3">
      {/* Left: Item Range & Page Size Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span>
          Showing <strong className="text-primary font-mono">{startItem}</strong> to{' '}
          <strong className="text-primary font-mono">{endItem}</strong> of{' '}
          <strong className="text-primary font-mono">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-theme-subtle">
            <span className="text-[11px]">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-surface2 border border-theme-subtle rounded px-2 py-0.5 text-xs text-primary font-medium focus:outline-none focus:border-rex-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          className="p-1.5 rounded border border-theme-subtle hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed text-primary transition-colors"
          title="First Page"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          className="px-2.5 py-1 rounded border border-theme-subtle hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center gap-1 transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline text-[11px] font-medium">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                type="button"
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded text-xs font-mono font-medium transition-all ${
                  safePage === p
                    ? 'bg-rex-600 text-white font-bold shadow-xs'
                    : 'border border-theme-subtle hover:bg-surface2 text-primary'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={`dots-${idx}`} className="px-1.5 text-muted/60 select-none">
                ...
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          className="px-2.5 py-1 rounded border border-theme-subtle hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center gap-1 transition-colors"
          title="Next Page"
        >
          <span className="hidden sm:inline text-[11px] font-medium">Next</span>
          <ChevronRight size={13} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          className="p-1.5 rounded border border-theme-subtle hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed text-primary transition-colors"
          title="Last Page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
