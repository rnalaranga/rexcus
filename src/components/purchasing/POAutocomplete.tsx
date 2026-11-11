import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShoppingCart, X, Check, Calendar, DollarSign, Layers } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export interface POOption {
  id: string;
  supplierId?: string;
  supplierName?: string;
  totalAmount?: number;
  billedAmount?: number;
  unbilledBalance?: number;
  date?: string;
  billingStatus?: string;
  notes?: string;
  itemsSummary?: string;
}

export interface POAutocompleteProps {
  value?: string | string[]; // Single PO id or array of PO ids
  onChange: (poId: string | string[], selectedPOs?: POOption[]) => void;
  pos: any[];
  bills?: any[];
  supplierId?: string;
  filterUnbilledOnly?: boolean;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const POAutocomplete: React.FC<POAutocompleteProps> = ({
  value,
  onChange,
  pos = [],
  bills = [],
  supplierId,
  filterUnbilledOnly = false,
  multiple = false,
  placeholder = 'Search & select Purchase Order(s)...',
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute enriched PO records with real-time billing calculations
  const enrichedPOs = useMemo(() => {
    return pos.map((p: any) => {
      const pBills = bills.filter((b: any) => {
        if (b.poId === p.id) return true;
        if (Array.isArray(b.poIds) && b.poIds.includes(p.id)) return true;
        if (typeof b.poIds === 'string' && b.poIds.includes(p.id)) return true;
        return false;
      });

      const totalAmount = Number(p.totalAmount || 0);
      const billedAmount = pBills.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      const unbilledBalance = Math.max(0, Number((totalAmount - billedAmount).toFixed(2)));

      let billingStatus = 'Unbilled';
      if (billedAmount >= totalAmount - 0.01 && totalAmount > 0) {
        billingStatus = 'Fully Billed';
      } else if (billedAmount > 0) {
        billingStatus = 'Partially Billed';
      }

      // Quick summary of items in PO
      let itemsSummary = '';
      try {
        const parsed = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsSummary = parsed.map((it: any) => it.desc || it.name || it.inventoryId).filter(Boolean).slice(0, 3).join(', ');
        }
      } catch {
        itemsSummary = '';
      }

      return {
        id: p.id,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        totalAmount,
        billedAmount,
        unbilledBalance,
        date: p.date ? p.date.split('T')[0] : '',
        billingStatus,
        notes: p.notes,
        itemsSummary
      };
    });
  }, [pos, bills]);

  // Selected array of IDs
  const selectedIds = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }, [value]);

  // Selected PO objects
  const selectedPOs = useMemo(() => {
    return enrichedPOs.filter(p => selectedIds.includes(p.id));
  }, [enrichedPOs, selectedIds]);

  // Filter available POs based on supplierId and filterUnbilledOnly
  const filteredList = useMemo(() => {
    let list = enrichedPOs;

    // Filter by supplier if provided
    if (supplierId) {
      list = list.filter(p => p.supplierId === supplierId);
    }

    // Filter unbilled if enabled
    if (filterUnbilledOnly) {
      list = list.filter(p => p.unbilledBalance > 0.01);
    }

    // Filter by search query
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => 
        p.id.toLowerCase().includes(q) ||
        (p.itemsSummary && p.itemsSummary.toLowerCase().includes(q)) ||
        (p.date && p.date.includes(q)) ||
        String(p.totalAmount).includes(q)
      );
    }

    return list;
  }, [enrichedPOs, supplierId, filterUnbilledOnly, query]);

  // Dropdown portal coordinates
  useEffect(() => {
    if (open && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 360)
      });
    }
  }, [open, query]);

  // Handle outside click
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, []);

  const handleTogglePO = (poId: string) => {
    if (multiple) {
      let updated: string[];
      if (selectedIds.includes(poId)) {
        updated = selectedIds.filter(id => id !== poId);
      } else {
        updated = [...selectedIds, poId];
      }
      const updatedObjs = enrichedPOs.filter(p => updated.includes(p.id));
      onChange(updated, updatedObjs);
    } else {
      const isSame = selectedIds.includes(poId);
      const nextId = isSame ? '' : poId;
      const nextObj = isSame ? [] : enrichedPOs.filter(p => p.id === nextId);
      onChange(nextId, nextObj);
      setOpen(false);
    }
  };

  const handleRemoveSingle = (poId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      const updated = selectedIds.filter(id => id !== poId);
      const updatedObjs = enrichedPOs.filter(p => updated.includes(p.id));
      onChange(updated, updatedObjs);
    } else {
      onChange('', []);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Input container / tags display */}
      <div 
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "min-h-[38px] w-full bg-surface border border-theme-subtle rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors focus-within:border-amber-500",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        <ShoppingCart size={14} className="text-muted shrink-0 mr-1" />

        {/* Selected PO Badges */}
        {selectedPOs.map(p => (
          <span 
            key={p.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold"
          >
            <span>{p.id}</span>
            <span className="text-[10px] text-muted font-normal">({formatCurrency(p.unbilledBalance || p.totalAmount, true)})</span>
            {!disabled && (
              <button 
                type="button" 
                onClick={(e) => handleRemoveSingle(p.id, e)}
                className="hover:text-rose-500 p-0.5"
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}

        {/* Search input field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selectedPOs.length === 0 ? placeholder : (multiple ? 'Add another PO...' : '')}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-primary placeholder:text-muted py-0.5"
        />

        {selectedPOs.length > 0 && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(multiple ? [] : '', []);
              setQuery('');
            }}
            className="text-muted hover:text-rose-500 p-1"
            title="Clear all selected"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown Menu via Portal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          style={{ top: coords.top + 4, left: coords.left, width: coords.width }}
          className="fixed z-[9999] bg-surface border border-theme shadow-2xl rounded-xl overflow-hidden max-h-72 flex flex-col backdrop-blur-md"
        >
          {/* Header info */}
          <div className="px-3 py-2 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between text-[11px] text-muted">
            <span className="font-semibold uppercase tracking-wider">
              {supplierId ? 'Vendor Purchase Orders' : 'All Purchase Orders'} ({filteredList.length})
            </span>
            {filterUnbilledOnly && (
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Unbilled / Open Balances Only
              </span>
            )}
          </div>

          {/* List items */}
          <div className="overflow-y-auto divide-y divide-theme-subtle max-h-60">
            {filteredList.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                No matching purchase orders found.
              </div>
            ) : (
              filteredList.map(po => {
                const isSelected = selectedIds.includes(po.id);
                return (
                  <div
                    key={po.id}
                    onClick={() => handleTogglePO(po.id)}
                    className={cn(
                      "p-2.5 px-3 hover:bg-surface2 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs",
                      isSelected && "bg-amber-500/10 hover:bg-amber-500/15"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-primary">{po.id}</span>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase",
                          po.billingStatus === 'Unbilled' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          po.billingStatus === 'Partially Billed' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                          {po.billingStatus}
                        </span>
                        {po.date && (
                          <span className="text-[10px] text-muted font-mono">{po.date}</span>
                        )}
                      </div>

                      {po.itemsSummary && (
                        <p className="text-[11px] text-muted truncate mt-0.5">
                          {po.itemsSummary}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-primary">
                        {formatCurrency(po.totalAmount, true)}
                      </div>
                      <div className="text-[10px] text-emerald-500 font-mono">
                        Open: {formatCurrency(po.unbilledBalance, true)}
                      </div>
                    </div>

                    <div className={cn(
                      "w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors",
                      isSelected ? "bg-amber-500 border-amber-500 text-white" : "border-theme-subtle text-transparent"
                    )}>
                      <Check size={11} className={isSelected ? 'block' : 'opacity-0'} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
