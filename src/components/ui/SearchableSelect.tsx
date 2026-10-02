import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  group?: string;
  extra?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ value, onChange, options, placeholder = 'Select...', className }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open, search]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  // Grouping
  const grouped = filtered.reduce((acc, curr) => {
    const g = curr.group || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(curr);
    return acc;
  }, {} as Record<string, Option[]>);

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle px-3 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className={cn('truncate', !selectedOption && 'text-muted/70')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-muted flex-shrink-0 ml-2" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          style={{ top: coords.top + 4, left: coords.left, minWidth: Math.max(coords.width, 350) }}
          className="absolute z-[99999] bg-surface border border-theme shadow-glass rounded-xl overflow-hidden flex flex-col max-h-[350px]"
        >
          <div className="p-2 border-b border-theme-subtle bg-surface/50">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-white dark:bg-zinc-900 border border-theme-subtle rounded text-xs py-1.5 pl-7 pr-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {Object.keys(grouped).length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">No options found.</div>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, opts]) => (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-secondary bg-surface2/50 rounded sticky top-0 backdrop-blur-md">
                    {group}
                  </div>
                  <div className="mt-1">
                    {opts.map(o => (
                      <button
                        key={o.value}
                        onClick={() => {
                          onChange(o.value);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between group/opt hover:bg-blue-500/10 hover:text-blue-600',
                          value === o.value ? 'bg-blue-500/10 text-blue-600 font-semibold' : 'text-primary'
                        )}
                      >
                        <span className="truncate pr-2">{o.label}</span>
                        {o.extra && <span className="text-[10px] opacity-40 font-mono group-hover/opt:opacity-100 flex-shrink-0">{o.extra}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
