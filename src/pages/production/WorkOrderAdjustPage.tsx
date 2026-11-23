import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowDownCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Wrench,
  Package,
  History,
  Layers,
  Clock,
  Copy,
  GitBranch,
  Hammer,
  Search,
  Check,
  Building,
  FileText,
  ChevronRight,
  AlertTriangle,
  Cpu,
  Flag,
  Play,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  fetchWorkOrderById,
  fetchWorkOrders,
  fetchQuotations,
  fetchInventory,
  adjustWorkOrderFullBom,
} from '@/lib/api';
import { useMachiningOperations } from '@/hooks/useData';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface WoBomMaterial {
  id: string;
  matNumber: string; // "Mat #1", "Mat #2"
  itemId: string;
  material: string;
  spec: string;
  profile: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface WoBomPart {
  partId: string | number;
  partName: string;
  description?: string;
  drawingNo?: string;
  partNo?: string;
  qty: number;
  materials: WoBomMaterial[];
}

export interface QuotedProcessHour {
  partName: string;
  processName: string;
  quotedHours: number;
  estHours: number;
  setupHours: number;
}

export interface WoRouteStep {
  id: string;
  stepNo: number;
  partIndex: number;
  materialRefs: string[]; // e.g. ["Mat #1", "Mat #2", "Step 1 Part"]
  pieceNote: string;
  processName: string;
  machineId: string;
  machineName?: string;
  durationValue: number;
  durationUnit: 'mins' | 'hrs';
  hourlyRate: number;
  instruction: string;
  matchedOpId?: string;
}

const DEFAULT_PROCESS_OPTIONS = [
  { name: 'Cutting / Band Saw', group: 'MATERIAL PREP', rate: 1200 },
  { name: 'Lathe Turning', group: 'TURNING', rate: 1500 },
  { name: 'CNC Lathe / Turning', group: 'TURNING', rate: 2500 },
  { name: 'Milling', group: 'MILLING', rate: 1600 },
  { name: 'CNC Milling', group: 'MILLING', rate: 2800 },
  { name: 'Drilling / Tapping', group: 'DRILLING', rate: 1000 },
  { name: 'Boring', group: 'MACHINING', rate: 1800 },
  { name: 'Surface / Cylindrical Grinding', group: 'GRINDING', rate: 1800 },
  { name: 'Slotting / Keyway', group: 'MACHINING', rate: 1500 },
  { name: 'Welding (MIG / TIG / Arc)', group: 'FABRICATION & WELDING', rate: 1500 },
  { name: 'Bending / Pressing', group: 'FABRICATION & WELDING', rate: 1400 },
  { name: 'Heat Treatment', group: 'TREATMENT', rate: 2000 },
  { name: 'Fitting & Sub-Assembly', group: 'ASSEMBLY', rate: 1200 },
  { name: 'Surface Finish / Painting', group: 'FINISHING', rate: 1200 },
  { name: 'Final QC Inspection', group: 'QUALITY CONTROL', rate: 1000 },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. PORTAL AUTOCOMPLETE FOR INVENTORY MATERIALS (NO COST DISPLAYED)
 * ───────────────────────────────────────────────────────────────────────────── */
interface MaterialAutocompleteInputProps {
  value: string;
  inventory: any[];
  onChangeText: (text: string) => void;
  onSelectInventoryItem: (item: any) => void;
  placeholder?: string;
}

const MaterialAutocompleteInput: React.FC<MaterialAutocompleteInputProps> = ({
  value,
  inventory,
  onChangeText,
  onSelectInventoryItem,
  placeholder = 'Search inventory or type custom material...',
}) => {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return inventory.slice(0, 10);
    return inventory
      .filter(
        (item) =>
          (item.name || '').toLowerCase().includes(q) ||
          (item.sku || '').toLowerCase().includes(q) ||
          (item.code || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [value, inventory]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rect = wrapRef.current?.getBoundingClientRect();

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-rex-500/80 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            setHighlightIdx(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || filtered.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIdx((prev) => (prev + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = filtered[highlightIdx];
              if (chosen) {
                onSelectInventoryItem(chosen);
                setOpen(false);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/10 transition-all"
        />
      </div>

      {open &&
        filtered.length > 0 &&
        rect &&
        createPortal(
          <div
            style={{
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
              width: Math.max(rect.width, 340),
            }}
            className="fixed z-[99999] bg-surface border border-theme-subtle shadow-2xl rounded-xl py-1.5 max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted border-b border-theme-subtle/50 flex justify-between">
              <span>Inventory Material</span>
              <span>Available Stock</span>
            </div>
            {filtered.map((item, idx) => {
              const stock = Number(item.quantity ?? item.stock ?? 0);
              const isHighlighted = idx === highlightIdx;
              return (
                <div
                  key={item.id || idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectInventoryItem(item);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isHighlighted ? 'bg-rex-500/10 text-primary' : 'hover:bg-surface2/70 text-primary'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-primary truncate flex items-center gap-1.5">
                      <Package size={12} className="text-rex-500 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="text-[10px] text-muted font-mono flex items-center gap-2 mt-0.5">
                      {item.sku && <span>SKU: {item.sku}</span>}
                      {item.category && <span>• {item.category}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-block ${
                        stock > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface2 text-muted border border-theme-subtle'
                      }`}
                    >
                      {stock} {item.unit || 'pcs'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. PORTAL AUTOCOMPLETE FOR MACHINING OPERATIONS (SHOWS QUOTED HRS IF ANY, NO COST)
 * ───────────────────────────────────────────────────────────────────────────── */
interface ProcessAutocompleteInputProps {
  value: string;
  processes: { name: string; group: string; rate: number }[];
  quotedProcessHours: QuotedProcessHour[];
  onChange: (name: string, rate?: number) => void;
  placeholder?: string;
}

const ProcessAutocompleteInput: React.FC<ProcessAutocompleteInputProps> = ({
  value,
  processes,
  quotedProcessHours,
  onChange,
  placeholder = 'Search process (e.g. Lathe, Milling, Welding)...',
}) => {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(
      (p) => p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
    );
  }, [value, processes]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rect = wrapRef.current?.getBoundingClientRect();

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <Wrench size={13} className="absolute left-2.5 text-rex-500 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlightIdx(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || filtered.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIdx((prev) => (prev + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = filtered[highlightIdx];
              if (chosen) {
                onChange(chosen.name, chosen.rate);
                setOpen(false);
              }
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500 focus:ring-2 focus:ring-rex-500/10 transition-all"
        />
      </div>

      {open &&
        filtered.length > 0 &&
        rect &&
        createPortal(
          <div
            style={{
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
              width: Math.max(rect.width, 300),
            }}
            className="fixed z-[99999] bg-surface border border-theme-subtle shadow-2xl rounded-xl py-1.5 max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted border-b border-theme-subtle/50 flex justify-between">
              <span>Operation / Machine Process</span>
              <span>Quoted Hrs</span>
            </div>
            {filtered.map((proc, idx) => {
              const isHighlighted = idx === highlightIdx;
              const matchedQuoted = quotedProcessHours.find(
                (qh) =>
                  qh.processName.toLowerCase() === proc.name.toLowerCase() ||
                  proc.name.toLowerCase().includes(qh.processName.toLowerCase()) ||
                  qh.processName.toLowerCase().includes(proc.name.toLowerCase())
              );
              return (
                <div
                  key={proc.name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(proc.name, proc.rate);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    isHighlighted ? 'bg-rex-500/10 text-primary' : 'hover:bg-surface2/70 text-primary'
                  }`}
                >
                  <div>
                    <div className="font-bold text-primary">{proc.name}</div>
                    <div className="text-[10px] font-mono text-muted uppercase">{proc.group}</div>
                  </div>
                  {matchedQuoted ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-[10px] font-mono font-bold">
                      Quoted: {matchedQuoted.quotedHours}h ({Math.round(matchedQuoted.quotedHours * 60)}m)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted">Standard Op</span>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. PORTAL AUTOCOMPLETE FOR SHOP FLOOR MACHINE SELECTION
 * ───────────────────────────────────────────────────────────────────────────── */
interface MachineAutocompleteInputProps {
  machineId: string;
  machineries: any[];
  onSelectMachine: (machineId: string, machineName: string) => void;
}

const MachineAutocompleteInput: React.FC<MachineAutocompleteInputProps> = ({
  machineId,
  machineries,
  onSelectMachine,
}) => {
  const selectedMachine = useMemo(
    () => machineries.find((m) => String(m.id) === String(machineId)),
    [machineId, machineries]
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedMachine ? `${selectedMachine.name}` : '');
  }, [selectedMachine]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return machineries;
    return machineries.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.code || '').toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q)
    );
  }, [query, machineries]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rect = wrapRef.current?.getBoundingClientRect();

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative flex items-center">
        <Cpu size={12} className="absolute left-2.5 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) onSelectMachine('', '');
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Optional: Assign specific shop machine..."
          className="w-full pl-8 pr-3 py-1 text-[11px] bg-surface border border-theme-subtle rounded-lg text-secondary focus:outline-none focus:border-rex-500 transition-all"
        />
      </div>

      {open &&
        filtered.length > 0 &&
        rect &&
        createPortal(
          <div
            style={{
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
              width: Math.max(rect.width, 260),
            }}
            className="fixed z-[99999] bg-surface border border-theme-subtle shadow-2xl rounded-xl py-1 max-h-52 overflow-y-auto"
          >
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectMachine('', '');
                setQuery('');
                setOpen(false);
              }}
              className="px-3 py-1.5 text-[11px] text-muted hover:bg-surface2 cursor-pointer border-b border-theme-subtle/40"
            >
              -- Unassigned / Any Available Machine --
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectMachine(m.id, m.name);
                  setQuery(m.name);
                  setOpen(false);
                }}
                className="px-3 py-1.5 text-xs hover:bg-surface2 cursor-pointer flex items-center justify-between"
              >
                <span className="font-semibold text-primary">{m.name}</span>
                <span className="text-[10px] font-mono text-muted">{m.code || m.type || 'Machine'}</span>
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * MAIN FULL-PAGE WORK ORDER BOM & FLOWCHART ROUTES STUDIO (REFINED ACCENT UI)
 * ───────────────────────────────────────────────────────────────────────────── */
export const WorkOrderAdjustPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'bom' | 'routes'>('bom');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [workOrder, setWorkOrder] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);

  const [parts, setParts] = useState<WoBomPart[]>([]);
  const [quotedParts, setQuotedParts] = useState<WoBomPart[]>([]);
  const [quotedProcessHours, setQuotedProcessHours] = useState<QuotedProcessHour[]>([]);
  const [routes, setRoutes] = useState<WoRouteStep[]>([]);

  const { data: rawOperations } = useMachiningOperations();

  // Resolve linked quotation
  const linkedQuote = useMemo(() => {
    if (!quotations.length || !workOrder) return null;
    return quotations.find((q: any) => {
      const qData =
        typeof q.data === 'string'
          ? (() => {
              try {
                return JSON.parse(q.data);
              } catch {
                return {};
              }
            })()
          : q.data || {};
      const qId = String(q.id || '').trim().toLowerCase();
      const qQuoNo = String(q.quotationNo || qData.quotationNo || '').trim().toLowerCase();
      const qDocNo = String(q.docNo || qData.docNo || '').trim().toLowerCase();
      const woQuoteId = String(workOrder.quoteId || workOrder.sourceQuoteId || '').trim().toLowerCase();
      const woQuoNo = String(workOrder.quotationNo || workOrder.sourceQuoteNo || '').trim().toLowerCase();
      const woTitle = String(workOrder.title || '').trim().toLowerCase();

      if (woQuoteId && (qId === woQuoteId || qQuoNo === woQuoteId || qDocNo === woQuoteId)) return true;
      if (woQuoNo && (qQuoNo === woQuoNo || qDocNo === woQuoNo || qId === woQuoNo)) return true;
      if (qQuoNo && qQuoNo.length >= 3 && woTitle.includes(qQuoNo)) return true;
      return false;
    });
  }, [quotations, workOrder]);

  const processCatalog = useMemo(() => {
    const map = new Map<string, { name: string; group: string; rate: number }>();
    DEFAULT_PROCESS_OPTIONS.forEach((p) => map.set(p.name, p));
    if (Array.isArray(rawOperations)) {
      rawOperations.forEach((op: any) => {
        if (op?.name) {
          map.set(op.name, {
            name: op.name,
            group: op.groupName || 'MACHINING',
            rate: Number(op.hrRate || op.rate || 1500),
          });
        }
      });
    }
    quotedProcessHours.forEach((qh) => {
      if (qh.processName && !map.has(qh.processName)) {
        map.set(qh.processName, {
          name: qh.processName,
          group: 'QUOTED OPERATION',
          rate: 1500,
        });
      }
    });
    return Array.from(map.values());
  }, [rawOperations, quotedProcessHours]);

  const notify = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load Work Order, Quotations, Inventory & Machineries
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchWorkOrderById(id).catch(async () => {
        const list = await fetchWorkOrders().catch(() => []);
        return list.find((w: any) => w.id === id || w.orderNo === id) || null;
      }),
      fetchQuotations().catch(() => []),
      fetchInventory().catch(() => []),
      fetch(`${API_URL}/production/machineries`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([woRes, quotesRes, invRes, machsRes]) => {
        setWorkOrder(woRes);
        setQuotations(Array.isArray(quotesRes) ? quotesRes : []);
        setInventory(Array.isArray(invRes) ? invRes : []);
        setMachineries(Array.isArray(machsRes) ? machsRes : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Populate Quoted BOM, Quoted Machine Hours, Editable Work Order BOM & Routes
  useEffect(() => {
    if (!workOrder) return;

    const extractedQuotedHrs: QuotedProcessHour[] = [];

    const extractQuoted = (): WoBomPart[] => {
      if (linkedQuote) {
        const qData =
          typeof linkedQuote.data === 'string'
            ? (() => {
                try {
                  return JSON.parse(linkedQuote.data);
                } catch {
                  return {};
                }
              })()
            : linkedQuote.data || {};

        if (Array.isArray(qData.boms) && qData.boms.length > 0) {
          let qMatCounter = 1;
          return qData.boms.map((b: any, bIdx: number) => {
            const pTitle = b.title || `Part ${bIdx + 1}`;

            if (b.procState && typeof b.procState === 'object') {
              Object.keys(b.procState).forEach((procName) => {
                const st = b.procState[procName];
                const quoHr = Number(st?.quoHr || 0);
                const estHr = Number(st?.estHr || 0);
                const setTime = Number(st?.setTime || 0);
                if (quoHr > 0 || estHr > 0 || setTime > 0) {
                  extractedQuotedHrs.push({
                    partName: pTitle,
                    processName: procName,
                    quotedHours: quoHr > 0 ? quoHr : estHr,
                    estHours: estHr > 0 ? estHr : quoHr,
                    setupHours: setTime,
                  });
                }
              });
            } else if (Array.isArray(b.machiningOps)) {
              b.machiningOps.forEach((op: any) => {
                const quoHr = Number(op.quoHr || op.plannedHours || 0);
                const estHr = Number(op.estHr || quoHr || 0);
                if (quoHr > 0 || estHr > 0) {
                  extractedQuotedHrs.push({
                    partName: pTitle,
                    processName: op.procName || op.operationName || 'Machining',
                    quotedHours: quoHr > 0 ? quoHr : estHr,
                    estHours: estHr,
                    setupHours: Number(op.setTime || 0),
                  });
                }
              });
            }

            const autoMats = (b.autoMats || []).map((m: any, mIdx: number) => {
              const spec = [
                m.dia ? `Ø${m.dia}mm` : '',
                m.thick ? `Thick: ${m.thick}mm` : '',
                m.width ? `W: ${m.width}mm` : '',
                m.length ? `L: ${m.length}mm` : '',
              ]
                .filter(Boolean)
                .join(' | ');
              const qty = Number(m.qty || 1);
              const unitPrice = Number(m.unitPrice || 0);
              const total = Number(m.shaftPrice || m.platePrice || qty * unitPrice);
              const derivedUnitCost = qty > 0 && total > 0 ? total / qty : unitPrice;
              return {
                id: m.id || `q-auto-${bIdx}-${mIdx}`,
                matNumber: `Q-Mat #${qMatCounter++}`,
                itemId: m.inventoryId || '',
                material: m.material || 'Raw Stock',
                spec: m.spec || spec,
                profile: m.dia ? 'Round Bar' : m.thick ? 'Plate / Sheet' : 'Raw Stock',
                qty,
                unit: m.unit || (m.dia ? 'rods' : m.thick ? 'plates' : 'pcs'),
                unitCost: Number(derivedUnitCost.toFixed(2)),
              };
            });

            const manualMats = (b.manualMats || []).map((m: any, mIdx: number) => ({
              id: m.id || `q-man-${bIdx}-${mIdx}`,
              matNumber: `Q-Mat #${qMatCounter++}`,
              itemId: m.inventoryId || '',
              material: m.material || 'Bought-out Component',
              spec: m.spec || (m.supplier ? `Supplier: ${m.supplier}` : ''),
              profile: 'Bought-out',
              qty: Number(m.qty || 1),
              unit: m.unit || 'pcs',
              unitCost: Number(m.unitPrice || m.unitCost || 0),
            }));

            return {
              partId: b.id || bIdx + 1,
              partName: pTitle,
              description: b.description || '',
              drawingNo: b.drawingNo || '',
              partNo: b.partNo || '',
              qty: Number(b.qty || 1),
              materials: [...autoMats, ...manualMats],
            };
          });
        }
      }

      if (workOrder.originalBomSnapshot) {
        try {
          const snap =
            typeof workOrder.originalBomSnapshot === 'string'
              ? JSON.parse(workOrder.originalBomSnapshot)
              : workOrder.originalBomSnapshot;
          if (Array.isArray(snap) && snap.length > 0) {
            let sCounter = 1;
            return snap.map((b: any, bIdx: number) => {
              const pTitle = b.title || b.partName || `Part ${bIdx + 1}`;
              (b.machiningOps || b.operations || []).forEach((op: any) => {
                const hrs = Number(op.quoHr || op.estHr || op.plannedHours || 0);
                if (hrs > 0) {
                  extractedQuotedHrs.push({
                    partName: pTitle,
                    processName: op.procName || op.operationName || 'Operation',
                    quotedHours: hrs,
                    estHours: hrs,
                    setupHours: Number(op.setTime || 0),
                  });
                }
              });
              const rawMats =
                b.allMaterials || [...(b.autoMats || []), ...(b.manualMats || []), ...(b.materials || [])];
              return {
                partId: b.partId || b.id || bIdx + 1,
                partName: pTitle,
                qty: Number(b.qty || 1),
                materials: rawMats.map((m: any, mIdx: number) => ({
                  id: m.id || `snap-${bIdx}-${mIdx}`,
                  matNumber: `Q-Mat #${sCounter++}`,
                  itemId: m.inventoryId || m.itemId || '',
                  material: m.material || m.name || 'Material',
                  spec: m.rawSpec || m.spec || m.notes || '',
                  profile: m.profile || 'Raw Stock',
                  qty: Number(m.qty || 1),
                  unit: m.unit || 'pcs',
                  unitCost: Number(m.unitPrice ?? m.unitCost ?? 0),
                })),
              };
            });
          }
        } catch {
          // ignore
        }
      }
      return [];
    };

    const quoted = extractQuoted();
    setQuotedParts(quoted);
    setQuotedProcessHours(extractedQuotedHrs);

    let directBom: any[] = [];
    try {
      directBom =
        typeof workOrder.bom === 'string' ? JSON.parse(workOrder.bom || '[]') : workOrder.bom || [];
    } catch {
      directBom = [];
    }

    let matCounter = 1;
    let builtParts: WoBomPart[] = [];

    if (
      Array.isArray(directBom) &&
      directBom.length > 0 &&
      (directBom[0]?.autoMats || directBom[0]?.manualMats || directBom[0]?.materials)
    ) {
      builtParts = directBom.map((b: any, bIdx: number) => {
        const rawMats = [...(b.autoMats || []), ...(b.manualMats || []), ...(b.materials || [])];
        return {
          partId: b.partId || b.id || bIdx + 1,
          partName: b.title || b.partName || `Part ${bIdx + 1}`,
          description: b.description || '',
          drawingNo: b.drawingNo || '',
          partNo: b.partNo || '',
          qty: Number(b.qty || 1),
          materials: rawMats.map((m: any, mIdx: number) => ({
            id: m.id || `wo-mat-${bIdx}-${mIdx}`,
            matNumber: `Mat #${matCounter++}`,
            itemId: m.inventoryId || m.itemId || '',
            material: m.material || m.name || '',
            spec: m.rawSpec !== undefined ? m.rawSpec : String(m.spec || '').replace(/^\[Mat #\d+\]\s*/, ''),
            profile: m.profile || 'Raw Stock',
            qty: Number(m.qty || 1),
            unit: m.unit || 'pcs',
            unitCost: Number(m.unitPrice ?? m.unitCost ?? 0),
          })),
        };
      });
    } else if (Array.isArray(directBom) && directBom.length > 0) {
      builtParts = [
        {
          partId: 1,
          partName: workOrder.title || 'Main Job Assembly',
          qty: Number(workOrder.jobQty || 1),
          materials: directBom.map((m: any, mIdx: number) => ({
            id: m.id || `wo-flat-${mIdx}`,
            matNumber: `Mat #${matCounter++}`,
            itemId: m.inventoryId || m.itemId || '',
            material: m.material || m.name || '',
            spec: m.spec || m.notes || '',
            profile: m.profile || 'Raw Stock',
            qty: Number(m.qty || 1),
            unit: m.unit || 'pcs',
            unitCost: Number(m.unitPrice ?? m.unitCost ?? 0),
          })),
        },
      ];
    } else if (quoted.length > 0) {
      builtParts = quoted.map((qp, bIdx) => ({
        ...qp,
        materials: qp.materials.map((m, mIdx) => ({
          ...m,
          id: `wo-from-q-${bIdx}-${mIdx}`,
          matNumber: `Mat #${matCounter++}`,
        })),
      }));
    } else {
      builtParts = [
        {
          partId: 1,
          partName: workOrder.title || 'Main Assembly',
          qty: Number(workOrder.jobQty || 1),
          materials: [
            {
              id: `wo-mat-0-0`,
              matNumber: 'Mat #1',
              itemId: '',
              material: '',
              spec: '',
              profile: 'Raw Stock',
              qty: 1,
              unit: 'pcs',
              unitCost: 0,
            },
          ],
        },
      ];
    }

    setParts(builtParts);

    // 3. Parse existing Routes
    const extractedRoutes: WoRouteStep[] = [];
    let stepCounter = 1;

    if (
      Array.isArray(directBom) &&
      directBom.some((b: any) => Array.isArray(b?.machiningOps) && b.machiningOps.length > 0)
    ) {
      directBom.forEach((b: any, bIdx: number) => {
        (b.machiningOps || []).forEach((op: any) => {
          const hrs = Number(op.estHr || op.quoHr || op.plannedHours || 0.25);
          const hasDuration = op.durationValue !== undefined && op.durationUnit !== undefined;
          extractedRoutes.push({
            id: op.id || `route-${bIdx}-${stepCounter}`,
            stepNo: stepCounter++,
            partIndex: bIdx,
            materialRefs:
              Array.isArray(op.materialRefs) && op.materialRefs.length > 0 ? op.materialRefs : ['Mat #1'],
            pieceNote: op.pieceNote || '',
            processName: op.procName || op.operationName || 'Lathe Turning',
            machineId: op.machineId || '',
            durationValue: hasDuration ? Number(op.durationValue) : Math.max(1, Math.round(hrs * 60)),
            durationUnit: hasDuration ? op.durationUnit : 'mins',
            hourlyRate: Number(op.hrRate || 1500),
            instruction: op.instruction || '',
            matchedOpId: op.matchedOpId || op.id,
          });
        });
      });
    } else if (Array.isArray(workOrder.operations) && workOrder.operations.length > 0) {
      workOrder.operations.forEach((op: any, idx: number) => {
        const hrs = Number(op.plannedHours || 0.25);
        extractedRoutes.push({
          id: op.id || `route-op-${idx + 1}`,
          stepNo: idx + 1,
          partIndex: 0,
          materialRefs: ['Mat #1'],
          pieceNote: '',
          processName: op.operationName || 'Lathe Turning',
          machineId: op.machineId || '',
          durationValue: Math.max(1, Math.round(hrs * 60)),
          durationUnit: 'mins',
          hourlyRate: Number(op.hourlyLaborRate || 750) + Number(op.hourlyMachineRate || 750),
          instruction: op.notes || '',
          matchedOpId: op.id,
        });
      });
    } else if (extractedQuotedHrs.length > 0) {
      extractedQuotedHrs.forEach((qh, idx) => {
        const mins = Math.max(1, Math.round(qh.quotedHours * 60));
        extractedRoutes.push({
          id: `route-q-${idx + 1}`,
          stepNo: idx + 1,
          partIndex: 0,
          materialRefs: ['Mat #1'],
          pieceNote: '',
          processName: qh.processName,
          machineId: '',
          durationValue: mins,
          durationUnit: 'mins',
          hourlyRate: 1500,
          instruction: '',
        });
      });
    }

    if (extractedRoutes.length === 0) {
      extractedRoutes.push({
        id: 'route-init-1',
        stepNo: 1,
        partIndex: 0,
        materialRefs: ['Mat #1'],
        pieceNote: '1 pc / cut piece',
        processName: 'Lathe Turning',
        machineId: '',
        durationValue: 15,
        durationUnit: 'mins',
        hourlyRate: 1500,
        instruction: '',
      });
    }

    setRoutes(extractedRoutes);
  }, [workOrder, linkedQuote]);

  // Flat numbered list of all Work Order BOM Materials (Mat #1, Mat #2, ...)
  const numberedMaterials = useMemo(() => {
    const list: (WoBomMaterial & { partIndex: number; matIndex: number; partName: string })[] = [];
    let counter = 1;
    parts.forEach((p, pIdx) => {
      p.materials.forEach((m, mIdx) => {
        list.push({
          ...m,
          matNumber: `Mat #${counter++}`,
          partIndex: pIdx,
          matIndex: mIdx,
          partName: p.partName,
        });
      });
    });
    return list;
  }, [parts]);

  const getMatNumber = (pIdx: number, mIdx: number): string => {
    const found = numberedMaterials.find((x) => x.partIndex === pIdx && x.matIndex === mIdx);
    return found ? found.matNumber : `Mat #${mIdx + 1}`;
  };

  const handleCopyAllQuoted = () => {
    if (quotedParts.length === 0) return;
    let c = 1;
    setParts(
      quotedParts.map((qp, bIdx) => ({
        ...qp,
        materials: qp.materials.map((m, mIdx) => ({
          ...m,
          id: `wo-copy-${bIdx}-${mIdx}-${Date.now()}`,
          matNumber: `Mat #${c++}`,
        })),
      }))
    );
    notify('success', 'Copied all Quoted BOM materials into Work Order BOM');
  };

  const handleCopySingleQuotedMaterial = (qm: WoBomMaterial) => {
    setParts((prev) => {
      const next = [...prev];
      if (next.length === 0) {
        next.push({
          partId: 1,
          partName: workOrder?.title || 'Main Assembly',
          qty: 1,
          materials: [],
        });
      }
      const firstMats = next[0].materials;
      if (firstMats.length === 1 && !firstMats[0].material.trim()) {
        next[0] = {
          ...next[0],
          materials: [
            {
              ...qm,
              id: `wo-single-${Date.now()}`,
              matNumber: 'Mat #1',
            },
          ],
        };
      } else {
        next[0] = {
          ...next[0],
          materials: [
            ...firstMats,
            {
              ...qm,
              id: `wo-single-${Date.now()}`,
              matNumber: `Mat #${numberedMaterials.length + 1}`,
            },
          ],
        };
      }
      return next;
    });
    notify('success', `Added "${qm.material}" to Work Order BOM`);
  };

  const updatePartField = (pIdx: number, field: keyof WoBomPart, val: any) => {
    setParts((prev) => prev.map((p, i) => (i === pIdx ? { ...p, [field]: val } : p)));
  };

  const handleMaterialChange = (pIdx: number, mIdx: number, field: keyof WoBomMaterial, value: any) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const nextMats = [...p.materials];
        nextMats[mIdx] = { ...nextMats[mIdx], [field]: value };
        return { ...p, materials: nextMats };
      })
    );
  };

  const handleSelectInventoryForMaterial = (pIdx: number, mIdx: number, invItem: any) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const nextMats = [...p.materials];
        nextMats[mIdx] = {
          ...nextMats[mIdx],
          itemId: invItem.id || '',
          material: invItem.name || '',
          unit: invItem.unit || nextMats[mIdx].unit || 'pcs',
          unitCost: Number(invItem.costPrice || invItem.unitCost || invItem.price || 0),
          spec: nextMats[mIdx].spec || invItem.sku || '',
        };
        return { ...p, materials: nextMats };
      })
    );
  };

  const addMaterialRow = (pIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          materials: [
            ...p.materials,
            {
              id: `wo-mat-${pIdx}-${Date.now()}`,
              matNumber: `Mat #${numberedMaterials.length + 1}`,
              itemId: '',
              material: '',
              spec: '',
              profile: 'Raw Stock',
              qty: 1,
              unit: 'pcs',
              unitCost: 0,
            },
          ],
        };
      })
    );
  };

  const removeMaterialRow = (pIdx: number, mIdx: number) => {
    setParts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          materials: p.materials.filter((_, idx) => idx !== mIdx),
        };
      })
    );
  };

  // Route Step Handlers
  const insertRouteStepAt = (insertIndex: number, presetProcessName?: string, presetHours?: number) => {
    setRoutes((prev) => {
      const nextStepNo = insertIndex + 1;
      const defaultRef =
        numberedMaterials.length > 1 && nextStepNo <= numberedMaterials.length
          ? [numberedMaterials[nextStepNo - 1].matNumber]
          : numberedMaterials[0]
          ? [numberedMaterials[0].matNumber]
          : ['Mat #1'];

      const newStep: WoRouteStep = {
        id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stepNo: nextStepNo,
        partIndex: 0,
        materialRefs: defaultRef,
        pieceNote: '',
        processName:
          presetProcessName ||
          (nextStepNo === 2
            ? 'Milling'
            : nextStepNo >= 3
            ? 'Welding (MIG / TIG / Arc)'
            : 'Lathe Turning'),
        machineId: '',
        durationValue: presetHours ? Math.max(1, Math.round(presetHours * 60)) : 15,
        durationUnit: 'mins',
        hourlyRate: 1500,
        instruction: '',
      };

      const copy = [...prev];
      copy.splice(insertIndex, 0, newStep);
      return copy.map((step, idx) => ({ ...step, stepNo: idx + 1 }));
    });
  };

  const updateRouteStep = (rIdx: number, field: keyof WoRouteStep, value: any) => {
    setRoutes((prev) =>
      prev.map((r, i) => {
        if (i !== rIdx) return r;
        return { ...r, [field]: value };
      })
    );
  };

  const toggleRouteMaterialRef = (rIdx: number, refLabel: string) => {
    setRoutes((prev) =>
      prev.map((r, i) => {
        if (i !== rIdx) return r;
        const exists = r.materialRefs.includes(refLabel);
        const nextRefs = exists
          ? r.materialRefs.filter((x) => x !== refLabel)
          : [...r.materialRefs, refLabel];
        return { ...r, materialRefs: nextRefs };
      })
    );
  };

  const moveRouteStep = (rIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? rIdx - 1 : rIdx + 1;
    if (targetIdx < 0 || targetIdx >= routes.length) return;
    setRoutes((prev) => {
      const copy = [...prev];
      const temp = copy[rIdx];
      copy[rIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((step, idx) => ({ ...step, stepNo: idx + 1 }));
    });
  };

  const removeRouteStep = (rIdx: number) => {
    setRoutes((prev) =>
      prev
        .filter((_, i) => i !== rIdx)
        .map((step, idx) => ({ ...step, stepNo: idx + 1 }))
    );
  };

  const getStepHours = (step: WoRouteStep): number => {
    const val = Number(step.durationValue || 0);
    return step.durationUnit === 'mins' ? Number((val / 60).toFixed(4)) : val;
  };

  // Time & Material Count Summaries (No Cost Displayed)
  const totalQuotedMaterialCount = quotedParts.reduce((s, p) => s + p.materials.length, 0);
  const totalQuotedHours = quotedProcessHours.reduce((s, q) => s + Number(q.quotedHours || 0), 0);
  const totalQuotedMins = Math.round(totalQuotedHours * 60);

  const totalRouteHours = routes.reduce((sum, r) => sum + getStepHours(r), 0);
  const totalRouteMins = routes.reduce(
    (sum, r) =>
      sum + (r.durationUnit === 'mins' ? Number(r.durationValue || 0) : Number(r.durationValue || 0) * 60),
    0
  );

  const getQuotedHourForProcess = (procName: string): QuotedProcessHour | undefined => {
    if (!procName) return undefined;
    const pLow = procName.toLowerCase();
    return quotedProcessHours.find(
      (qh) =>
        qh.processName.toLowerCase() === pLow ||
        pLow.includes(qh.processName.toLowerCase()) ||
        qh.processName.toLowerCase().includes(pLow)
    );
  };

  // Submit & Sync
  const handleSaveAll = async () => {
    if (!workOrder?.id) return;
    setSaving(true);
    try {
      let runningMatNum = 1;

      const formattedBoms = parts.map((p, pIdx) => {
        const validMats = p.materials.filter((m) => (m.material && m.material.trim()) || m.itemId);
        const autoMats: any[] = [];
        const manualMats: any[] = [];

        validMats.forEach((m, mIdx) => {
          const matNumber = `Mat #${runningMatNum++}`;
          const matObj = {
            id: m.id || `auto-${pIdx}-${mIdx}`,
            matNumber,
            inventoryId: m.itemId || undefined,
            material: m.material || 'Raw Material',
            spec: m.spec ? `[${matNumber}] ${m.spec}` : `[${matNumber}]`,
            rawSpec: m.spec || '',
            profile: m.profile || 'Raw Stock',
            qty: Number(m.qty) || 1,
            unit: m.unit || 'pcs',
            unitPrice: Number(m.unitCost) || 0,
            unitCost: Number(m.unitCost) || 0,
            totalPrice: (Number(m.qty) || 1) * (Number(m.unitCost) || 0),
          };
          if (m.profile === 'Bought-out') {
            manualMats.push(matObj);
          } else {
            autoMats.push(matObj);
          }
        });

        const partRoutes = routes.filter((r) => (parts.length === 1 ? true : (r.partIndex ?? 0) === pIdx));

        const machiningOps = partRoutes.map((r, rIdx) => {
          const globalStepNo = routes.findIndex((x) => x.id === r.id) + 1 || rIdx + 1;
          const hrs = getStepHours(r);
          const refsLabel = r.materialRefs.length > 0 ? r.materialRefs.join(' + ') : 'Material';
          const durationLabel = `${r.durationValue} ${r.durationUnit}`;
          const pieceText = r.pieceNote ? ` (${r.pieceNote})` : '';
          const instrText = r.instruction ? ` — ${r.instruction}` : '';
          const fullNotes = `[${refsLabel}${pieceText}] → ${r.processName} (${durationLabel})${instrText}`;
          const displayOpName = `Step ${globalStepNo}: ${r.processName} [${refsLabel}]`;

          return {
            id: r.matchedOpId || r.id || `proc-${pIdx}-${rIdx}`,
            matchedOpId: r.matchedOpId,
            stepNo: globalStepNo,
            procName: r.processName,
            displayOpName,
            materialRefs: r.materialRefs,
            pieceNote: r.pieceNote,
            durationValue: r.durationValue,
            durationUnit: r.durationUnit,
            instruction: r.instruction,
            notes: fullNotes,
            quoHr: hrs,
            estHr: hrs,
            plannedHours: hrs,
            setTime: 0,
            hrRate: Number(r.hourlyRate || 1500),
            machineRate: 0,
            machineId: r.machineId || null,
            cost: Math.round(hrs * Number(r.hourlyRate || 1500)),
          };
        });

        return {
          bIdx: pIdx,
          partId: p.partId || pIdx + 1,
          title: p.partName || `Part ${pIdx + 1}`,
          description: p.description || '',
          drawingNo: p.drawingNo || '',
          partNo: p.partNo || '',
          qty: Number(p.qty) || 1,
          isCustomAdjusted: true,
          autoMats,
          manualMats,
          machiningOps,
        };
      });

      await adjustWorkOrderFullBom(workOrder.id, {
        boms: formattedBoms,
        syncRouting: true,
      });

      notify('success', 'Work Order BOM & Production Routes saved and synced!');
      setTimeout(() => {
        navigate(`/production/work-orders/${workOrder.id}`);
      }, 600);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to save Work Order BOM & Routes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-muted animate-pulse">
        Loading Work Order Studio...
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-bold text-primary">Work Order not found.</p>
        <Button variant="primary" onClick={() => navigate('/production/work-orders')}>
          Back to Work Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── TOP HEADER BAR & BREADCRUMBS ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface border border-theme-subtle border-l-4 border-l-rex-500 rounded-xl p-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/production/work-orders')}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <ArrowLeft size={13} /> Work Orders
            </button>
            <ChevronRight size={12} />
            <button
              type="button"
              onClick={() => navigate(`/production/work-orders/${workOrder.id}`)}
              className="hover:text-primary font-mono font-bold text-secondary cursor-pointer"
            >
              {workOrder.orderNo || workOrder.id}
            </button>
            <ChevronRight size={12} />
            <span className="font-bold text-rex-600 dark:text-rex-400">Adjust Work Order & Routes</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight">
              {workOrder.title || 'Precision Engineering Work Order'}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/25 rounded-md">
              {workOrder.orderNo || workOrder.id}
            </span>
            {workOrder.customerName && (
              <span className="text-xs text-secondary flex items-center gap-1 bg-surface2 px-2.5 py-0.5 rounded-md border border-theme-subtle">
                <Building size={12} className="text-rex-500" /> {workOrder.customerName}
              </span>
            )}
            {linkedQuote && (
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/25">
                <FileText size={12} /> Quote: {linkedQuote.quotationNo || linkedQuote.docNo || linkedQuote.id}
              </span>
            )}
            <span className="text-xs font-mono font-bold text-secondary bg-surface2 px-2.5 py-0.5 rounded-md border border-theme-subtle">
              Batch Qty: {workOrder.jobQty || 1} pcs
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/production/work-orders/${workOrder.id}`)}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs px-4 shadow-sm"
          >
            {saving ? 'Saving & Syncing...' : 'Save Work Order BOM & Routes'}
          </Button>
        </div>
      </div>

      {/* ── 2-STEP WIZARD NAVIGATION RIBBON ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveStepTab('bom')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeStepTab === 'bom'
              ? 'bg-gradient-to-r from-rex-500/10 via-surface to-surface border-rex-500/60 shadow-sm ring-1 ring-rex-500/20'
              : 'bg-surface border-theme-subtle hover:bg-surface2/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all ${
                activeStepTab === 'bom'
                  ? 'bg-rex-600 text-white shadow-sm ring-4 ring-rex-500/15'
                  : 'bg-surface2 text-muted border border-theme-subtle'
              }`}
            >
              1
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-primary">
                Step 1: Adjust Work Order BOM (Materials)
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Compare with Quoted BOM & assign numbered materials (Mat #1, Mat #2...)
              </p>
            </div>
          </div>
          <div className="text-right font-mono shrink-0 pl-2">
            <span className="px-2 py-0.5 rounded bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 text-xs font-bold inline-block">
              {numberedMaterials.length} Materials
            </span>
            <span className="text-[10.5px] text-muted block mt-0.5">
              Quoted: {totalQuotedMaterialCount} items
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStepTab('routes')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeStepTab === 'routes'
              ? 'bg-gradient-to-r from-rex-500/10 via-surface to-surface border-rex-500/60 shadow-sm ring-1 ring-rex-500/20'
              : 'bg-surface border-theme-subtle hover:bg-surface2/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-all ${
                activeStepTab === 'routes'
                  ? 'bg-rex-600 text-white shadow-sm ring-4 ring-rex-500/15'
                  : 'bg-surface2 text-muted border border-theme-subtle'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-primary">
                Step 2: Production Routes Flowchart
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Step-by-step routing flowchart with Quoted Machine Hours vs Planned Route Hours
              </p>
            </div>
          </div>
          <div className="text-right font-mono shrink-0 pl-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-block">
              {routes.length} Steps ({totalRouteHours.toFixed(2)}h)
            </span>
            <span className="text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
              Quoted: {totalQuotedHours.toFixed(2)} hrs ({totalQuotedMins}m)
            </span>
          </div>
        </button>
      </div>

      {/* ============================================================================
          STEP 1 VIEW: QUOTED BOM (SIDE PANEL) + WORK ORDER BOM EDITOR
         ============================================================================ */}
      {activeStepTab === 'bom' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT 4 COLS: QUOTED BOM REFERENCE PANEL */}
          <GlassCard className="xl:col-span-4 p-0 overflow-hidden border-theme-subtle rounded-xl shadow-sm">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 via-surface2/50 to-transparent border-b border-theme-subtle flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <History size={14} className="text-amber-500" /> Quoted BOM (Reference)
                </h3>
                <p className="text-[10.5px] text-muted mt-0.5">
                  Materials & dimensions specified in Quotation
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono font-bold text-xs">
                {totalQuotedMaterialCount} Items
              </span>
            </div>

            <div className="p-3.5 space-y-3 max-h-[68vh] overflow-y-auto">
              {quotedParts.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllQuoted}
                    className="h-7 text-[11px] px-2.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy All Quoted Materials
                  </Button>
                </div>
              )}

              {quotedParts.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted border border-dashed border-theme-subtle rounded-xl">
                  No linked Quoted BOM found for this Work Order. Build the Work Order BOM directly on the right.
                </div>
              ) : (
                quotedParts.map((qp, qIdx) => (
                  <div
                    key={qIdx}
                    className="border border-theme-subtle rounded-xl bg-surface overflow-hidden shadow-2xs"
                  >
                    <div className="px-3 py-2 bg-surface2/60 border-b border-theme-subtle flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">
                        Part {qIdx + 1}: {qp.partName}
                      </span>
                      <span className="font-mono text-[11px] text-muted">Part Qty: {qp.qty}</span>
                    </div>

                    <div className="divide-y divide-theme-subtle/50">
                      {qp.materials.length === 0 ? (
                        <div className="p-3 text-[11px] text-muted italic text-center">
                          No materials in this quoted part.
                        </div>
                      ) : (
                        qp.materials.map((qm, mIdx) => (
                          <div
                            key={mIdx}
                            className="p-2.5 hover:bg-surface2/30 transition-colors flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-bold text-[10px]">
                                  {qm.matNumber}
                                </span>
                                <span className="font-bold text-primary truncate">{qm.material}</span>
                              </div>
                              {qm.spec && (
                                <div className="text-[10.5px] font-mono text-muted">{qm.spec}</div>
                              )}
                              <div className="text-[10.5px] font-mono text-secondary">
                                {qm.profile} • Qty: <strong className="text-primary">{qm.qty} {qm.unit}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopySingleQuotedMaterial(qm)}
                              className="px-2.5 py-1 rounded-lg bg-rex-500/10 hover:bg-rex-500/20 border border-rex-500/25 text-[10px] font-bold text-rex-600 dark:text-rex-400 shrink-0 cursor-pointer transition-all flex items-center gap-1"
                              title="Add this material to Work Order BOM"
                            >
                              <Plus size={11} /> Use
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* RIGHT 8 COLS: EDITABLE WORK ORDER BOM */}
          <div className="xl:col-span-8 space-y-4">
            <GlassCard className="p-0 overflow-hidden border-theme-subtle rounded-xl shadow-sm">
              <div className="px-5 py-3.5 bg-gradient-to-r from-rex-500/10 via-surface2/50 to-transparent border-b border-theme-subtle flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-primary flex items-center gap-2">
                    <Layers size={16} className="text-rex-500" />
                    Work Order Production BOM (Materials Only)
                  </h2>
                  <p className="text-[11px] text-muted mt-0.5">
                    Search materials from Inventory or type custom sizes. Each row gets a <strong>Mat #</strong> for the Routes Flowchart.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    setParts((prev) => [
                      ...prev,
                      {
                        partId: prev.length + 1,
                        partName: `Sub-Assembly / Part ${prev.length + 1}`,
                        qty: 1,
                        materials: [
                          {
                            id: `wo-mat-${prev.length}-${Date.now()}`,
                            matNumber: `Mat #${numberedMaterials.length + 1}`,
                            itemId: '',
                            material: '',
                            spec: '',
                            profile: 'Raw Stock',
                            qty: 1,
                            unit: 'pcs',
                            unitCost: 0,
                          },
                        ],
                      },
                    ])
                  }
                  className="h-8 text-xs font-semibold"
                >
                  Add Part Group
                </Button>
              </div>

              <div className="p-4 space-y-5">
                {parts.map((part, pIdx) => (
                  <div
                    key={pIdx}
                    className="border border-theme-subtle border-l-4 border-l-rex-500 rounded-xl bg-surface overflow-hidden shadow-2xs"
                  >
                    {/* Part Group Header */}
                    <div className="px-4 py-2.5 bg-surface2/40 border-b border-theme-subtle flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                        <span className="px-2.5 py-1 rounded-md bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 font-mono text-xs font-bold">
                          Part {pIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={part.partName}
                          onChange={(e) => updatePartField(pIdx, 'partName', e.target.value)}
                          placeholder="Part / Assembly Name..."
                          className="px-3 py-1 text-xs font-bold bg-surface border border-theme-subtle rounded-lg text-primary flex-1 focus:outline-none focus:border-rex-500"
                        />
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted font-medium">Part Qty:</span>
                          <input
                            type="number"
                            min={1}
                            value={part.qty}
                            onChange={(e) => updatePartField(pIdx, 'qty', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-mono font-bold bg-surface border border-theme-subtle rounded-lg text-primary text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Plus}
                          onClick={() => addMaterialRow(pIdx)}
                          className="h-7 text-[11px] font-bold border-rex-500/30 text-rex-600 dark:text-rex-400 hover:bg-rex-500/10"
                        >
                          Add Material (+ Mat #{numberedMaterials.length + 1})
                        </Button>
                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setParts((prev) => prev.filter((_, i) => i !== pIdx))}
                            className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Part Group"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Materials Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[660px]">
                        <thead>
                          <tr className="bg-surface2/25 border-b border-theme-subtle text-[10px] uppercase tracking-wider text-muted font-bold">
                            <th className="px-3 py-2.5 w-24">Mat #</th>
                            <th className="px-3 py-2.5 min-w-[260px]">Material (Inventory Autocomplete)</th>
                            <th className="px-2 py-2.5 w-36">Profile / Type</th>
                            <th className="px-2 py-2.5 w-52">Dimensions / Spec</th>
                            <th className="px-2 py-2.5 w-24 text-right">Required Qty</th>
                            <th className="px-2 py-2.5 w-24 text-center">Unit</th>
                            <th className="px-2 py-2.5 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-subtle/40">
                          {part.materials.map((m, mIdx) => {
                            const liveMatNum = getMatNumber(pIdx, mIdx);
                            return (
                              <tr
                                key={m.id || mIdx}
                                className="hover:bg-surface2/20 transition-colors group"
                              >
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/25 font-mono font-extrabold text-xs">
                                    {liveMatNum}
                                  </span>
                                </td>

                                <td className="px-3 py-2">
                                  <MaterialAutocompleteInput
                                    value={m.material}
                                    inventory={inventory}
                                    onChangeText={(txt) =>
                                      handleMaterialChange(pIdx, mIdx, 'material', txt)
                                    }
                                    onSelectInventoryItem={(item) =>
                                      handleSelectInventoryForMaterial(pIdx, mIdx, item)
                                    }
                                  />
                                </td>

                                <td className="px-2 py-2">
                                  <select
                                    value={m.profile}
                                    onChange={(e) =>
                                      handleMaterialChange(pIdx, mIdx, 'profile', e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-surface border border-theme-subtle rounded-lg text-secondary font-medium focus:outline-none focus:border-rex-500"
                                  >
                                    <option value="Raw Stock">Raw Stock</option>
                                    <option value="Round Bar">Round Bar / Shaft</option>
                                    <option value="Plate / Sheet">Plate / Sheet</option>
                                    <option value="Hollow / Tube">Hollow / Tube</option>
                                    <option value="Bought-out">Bought-out / Hardware</option>
                                  </select>
                                </td>

                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={m.spec}
                                    onChange={(e) =>
                                      handleMaterialChange(pIdx, mIdx, 'spec', e.target.value)
                                    }
                                    placeholder="e.g. Ø50 x 300mm"
                                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500"
                                  />
                                </td>

                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={m.qty}
                                    onChange={(e) =>
                                      handleMaterialChange(pIdx, mIdx, 'qty', Number(e.target.value))
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-right bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500"
                                  />
                                </td>

                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={m.unit}
                                    onChange={(e) =>
                                      handleMaterialChange(pIdx, mIdx, 'unit', e.target.value)
                                    }
                                    placeholder="pcs"
                                    className="w-full px-2 py-1.5 text-xs font-mono text-center bg-surface border border-theme-subtle rounded-lg text-secondary focus:outline-none focus:border-rex-500"
                                  />
                                </td>

                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeMaterialRow(pIdx, mIdx)}
                                    className="p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Remove Material"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Bottom Bar of Step 1 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-theme-subtle">
                  <div className="text-xs text-muted">
                    Total Work Order BOM Materials:{' '}
                    <strong className="font-mono text-rex-600 dark:text-rex-400">{numberedMaterials.length} Items</strong>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setActiveStepTab('routes')}
                    className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs px-5 py-2 flex items-center gap-2 shadow-sm"
                  >
                    <span>Next: Production Routes Flowchart (Step 2)</span>
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ============================================================================
          STEP 2 VIEW: POLISHED FLOWCHART + QUOTED MACHINE HOURS
         ============================================================================ */}
      {activeStepTab === 'routes' && (
        <div className="space-y-5">
          {/* ── TOP REFERENCE GRID: 1. QUOTED MACHINE HOURS | 2. BOM MATERIALS PALETTE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Quoted Machine Hours Reference Panel (6 cols) */}
            <GlassCard className="lg:col-span-6 p-4 rounded-xl border-theme-subtle border-l-4 border-l-amber-500 bg-surface space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-theme-subtle pb-2.5">
                <div className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" />
                  <span>Quoted Machine Hours (Reference)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-bold">
                    Quoted: {totalQuotedHours.toFixed(2)} hrs ({totalQuotedMins}m)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold">
                    Planned: {totalRouteHours.toFixed(2)} hrs ({Math.round(totalRouteMins)}m)
                  </span>
                </div>
              </div>

              {quotedProcessHours.length === 0 ? (
                <div className="text-xs text-muted italic py-1.5">
                  No specific machine hours were entered in the linked Quotation. You can add route steps below.
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {quotedProcessHours.map((qh, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-surface2/40 border border-theme-subtle flex items-center gap-2 text-xs"
                    >
                      <Wrench size={12} className="text-amber-500 shrink-0" />
                      <span className="font-semibold text-primary">{qh.processName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-bold text-[11px]">
                        {qh.quotedHours}h ({Math.round(qh.quotedHours * 60)}m)
                      </span>
                      <button
                        type="button"
                        onClick={() => insertRouteStepAt(routes.length, qh.processName, qh.quotedHours)}
                        className="ml-1 px-2 py-0.5 rounded bg-rex-500/10 hover:bg-rex-500/20 text-rex-600 dark:text-rex-400 border border-rex-500/25 font-bold text-[10px] cursor-pointer transition-colors"
                        title="Add as a Flowchart Step"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Numbered Materials Palette Strip (6 cols) */}
            <GlassCard className="lg:col-span-6 p-4 rounded-xl border-theme-subtle border-l-4 border-l-rex-500 bg-surface space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-theme-subtle pb-2.5">
                <div className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-rex-500" />
                  <span>Work Order BOM Materials ({numberedMaterials.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStepTab('bom')}
                  className="text-xs font-bold text-rex-600 dark:text-rex-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft size={12} /> Edit BOM Materials
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {numberedMaterials.map((m) => (
                  <div
                    key={m.matNumber}
                    className="px-2.5 py-1.5 rounded-lg bg-surface2/40 border border-theme-subtle flex items-center gap-2 text-xs"
                  >
                    <span className="px-2 py-0.5 rounded bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/25 font-mono font-bold text-[11px]">
                      {m.matNumber}
                    </span>
                    <span className="font-semibold text-primary">{m.material || 'Unnamed Material'}</span>
                    {m.spec && <span className="text-[11px] font-mono text-muted">({m.spec})</span>}
                    <span className="text-[11px] font-mono text-secondary">
                      • {m.qty} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ── HORIZONTAL VISUAL FLOWCHART DIAGRAM OVERVIEW ────────────────────────── */}
          <GlassCard className="p-4 rounded-xl border-theme-subtle bg-surface space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <Sparkles size={14} className="text-rex-500" />
                <span>Process Flowchart Overview</span>
              </div>
              <span className="text-xs font-mono text-muted">
                Total Planned: <strong className="text-emerald-600 dark:text-emerald-400">{Math.round(totalRouteMins)} mins ({totalRouteHours.toFixed(2)} hrs)</strong>
                {totalQuotedHours > 0 && (
                  <>
                    {' '}
                    • Quoted: <strong className="text-amber-600 dark:text-amber-400">{totalQuotedHours.toFixed(2)} hrs</strong>
                  </>
                )}
              </span>
            </div>

            {/* Connected Horizontal Flowchart Nodes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
              {/* Start Node */}
              <div className="px-3 py-2 rounded-lg bg-rex-600 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs">
                <Play size={11} className="fill-white" />
                <span>RAW STOCK</span>
              </div>

              {routes.map((r, idx) => (
                <React.Fragment key={r.id}>
                  <div className="flex items-center shrink-0 text-rex-500/60">
                    <div className="w-5 h-0.5 bg-rex-500/40" />
                    <ArrowRight size={13} className="-ml-1" />
                  </div>

                  {/* Process Flowchart Node */}
                  <div className="p-2.5 rounded-xl bg-surface2/40 border border-theme-subtle border-t-2 border-t-rex-500 shrink-0 min-w-[180px] space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 font-mono font-bold text-[10px]">
                        STEP {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-semibold text-[10px]">
                        {r.durationValue} {r.durationUnit}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-primary truncate">
                      {r.processName || 'Operation'}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {r.materialRefs.map((ref) => (
                        <span
                          key={ref}
                          className="px-1.5 py-0.2 rounded bg-surface text-secondary border border-theme-subtle text-[9.5px] font-mono font-semibold"
                        >
                          {ref}
                        </span>
                      ))}
                      {r.pieceNote && (
                        <span className="text-[9.5px] text-muted truncate max-w-[110px]">
                          ({r.pieceNote})
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}

              <div className="flex items-center shrink-0 text-emerald-500/60">
                <div className="w-5 h-0.5 bg-emerald-500/40" />
                <ArrowRight size={13} className="-ml-1" />
              </div>

              {/* Finish Node */}
              <div className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs">
                <Flag size={11} />
                <span>FINISHED PART</span>
              </div>
            </div>
          </GlassCard>

          {/* ── INTERACTIVE VERTICAL FLOWCHART BUILDER ─────────────────────────────── */}
          <div className="relative pl-4 sm:pl-8 space-y-0">
            {/* Vertical Flowchart Spine */}
            <div className="absolute left-7 sm:left-11 top-6 bottom-12 w-0.5 bg-gradient-to-b from-rex-500/40 via-rex-500/25 to-emerald-500/40 pointer-events-none" />

            {/* START FLOWCHART NODE */}
            <div className="relative flex items-center gap-4 pb-4">
              <div className="w-7 h-7 rounded-full bg-rex-600 text-white flex items-center justify-center z-10 shrink-0 shadow-xs ring-4 ring-rex-500/15">
                <Package size={13} />
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-surface border border-theme-subtle text-xs font-semibold text-secondary flex items-center gap-2 flex-wrap shadow-2xs">
                <span className="font-bold text-rex-600 dark:text-rex-400">START:</span>
                <span>Raw Materials Issued from Stores</span>
                <span className="font-mono text-[11px] text-muted">
                  ({numberedMaterials.map((m) => m.matNumber).join(', ')})
                </span>
              </div>
            </div>

            {/* FLOWCHART STEP NODES */}
            {routes.map((route, rIdx) => {
              const previousStepLabels = Array.from(
                { length: rIdx },
                (_, i) => `Step ${i + 1} Part`
              );
              const matchedQuotedOp = getQuotedHourForProcess(route.processName);

              return (
                <React.Fragment key={route.id}>
                  <div className="relative flex items-start gap-3 sm:gap-5">
                    {/* Flowchart Node Circle on the Spine */}
                    <div className="w-7 h-7 rounded-full bg-rex-600 text-white font-mono font-bold text-xs flex items-center justify-center z-10 shrink-0 mt-5 shadow-xs ring-4 ring-rex-500/15">
                      {rIdx + 1}
                    </div>

                    {/* Flowchart Step Node Box */}
                    <div className="flex-1 rounded-xl border border-theme-subtle border-l-4 border-l-rex-500 bg-surface hover:border-rex-500/40 transition-all shadow-sm overflow-hidden">
                      {/* Step Node Top Bar */}
                      <div className="px-4 py-2.5 bg-gradient-to-r from-rex-500/10 via-surface2/40 to-transparent border-b border-theme-subtle flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded bg-rex-600 text-white font-mono font-bold text-xs shadow-2xs">
                            STEP {rIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <span className="font-mono text-rex-600 dark:text-rex-400">
                              {route.materialRefs.length > 0
                                ? `[${route.materialRefs.join(' + ')}]`
                                : '[Pick Material]'}
                            </span>
                            {route.pieceNote && (
                              <span className="text-muted font-normal">({route.pieceNote})</span>
                            )}
                            <ArrowRight size={13} className="text-muted" />
                            <span>{route.processName || 'Operation'}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono font-bold text-xs">
                            {route.durationValue} {route.durationUnit}
                          </span>
                          {matchedQuotedOp && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono font-semibold text-[11px]">
                              Quoted: {matchedQuotedOp.quotedHours}h ({Math.round(matchedQuotedOp.quotedHours * 60)}m)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-surface2 text-secondary border border-theme-subtle mr-1">
                            Output → Step {rIdx + 1} Part
                          </span>
                          <button
                            type="button"
                            disabled={rIdx === 0}
                            onClick={() => moveRouteStep(rIdx, 'up')}
                            className="p-1.5 rounded-lg text-secondary hover:text-primary disabled:opacity-30 border border-theme-subtle bg-surface cursor-pointer"
                            title="Move Step Up"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={rIdx === routes.length - 1}
                            onClick={() => moveRouteStep(rIdx, 'down')}
                            className="p-1.5 rounded-lg text-secondary hover:text-primary disabled:opacity-30 border border-theme-subtle bg-surface cursor-pointer"
                            title="Move Step Down"
                          >
                            <ArrowDown size={13} />
                          </button>
                          {routes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRouteStep(rIdx)}
                              className="p-1.5 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-theme-subtle ml-1 cursor-pointer"
                              title="Delete Step"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Flowchart Node Body: 3 Connected Stages (INPUT -> PROCESS & TIME -> INSTRUCTION) */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* STAGE A: INPUT MATERIAL / PREVIOUS STEP PART (5 cols) */}
                        <div className="lg:col-span-5 p-3 rounded-xl bg-surface2/25 border border-theme-subtle space-y-2.5">
                          <label className="block text-[10.5px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <Package size={12} className="text-rex-500" /> A. Input Material # or Previous Step Part
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {numberedMaterials.map((m) => {
                              const isSelected = route.materialRefs.includes(m.matNumber);
                              return (
                                <button
                                  key={m.matNumber}
                                  type="button"
                                  onClick={() => toggleRouteMaterialRef(rIdx, m.matNumber)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-rex-600 text-white border-rex-600 shadow-2xs'
                                      : 'bg-surface text-secondary border-theme-subtle hover:border-rex-500/40'
                                  }`}
                                  title={`${m.material} (${m.spec || m.qty + ' ' + m.unit})`}
                                >
                                  {isSelected ? <Check size={11} /> : <Plus size={11} />}
                                  <span>{m.matNumber}</span>
                                  {m.material && (
                                    <span className="font-sans font-normal text-[10.5px] max-w-[110px] truncate opacity-90">
                                      ({m.material})
                                    </span>
                                  )}
                                </button>
                              );
                            })}

                            {previousStepLabels.map((stepLbl) => {
                              const isSelected = route.materialRefs.includes(stepLbl);
                              return (
                                <button
                                  key={stepLbl}
                                  type="button"
                                  onClick={() => toggleRouteMaterialRef(rIdx, stepLbl)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15'
                                  }`}
                                >
                                  {isSelected ? <Check size={11} /> : <Plus size={11} />}
                                  <span>{stepLbl}</span>
                                </button>
                              );
                            })}
                          </div>

                          <input
                            type="text"
                            value={route.pieceNote}
                            onChange={(e) => updateRouteStep(rIdx, 'pieceNote', e.target.value)}
                            placeholder="Piece / Cut Note (e.g. 1 pc 150mm cut / another piece from Mat #1 / weld parts)"
                            className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500"
                          />
                        </div>

                        {/* STAGE B: MACHINE / OPERATION & DURATION (4 cols) */}
                        <div className="lg:col-span-4 p-3 rounded-xl bg-surface2/25 border border-theme-subtle space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10.5px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                              <Wrench size={12} className="text-rex-500" /> B. Machine Operation & Cycle Time
                            </label>
                            {matchedQuotedOp && (
                              <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                                Quoted: {matchedQuotedOp.quotedHours}h
                              </span>
                            )}
                          </div>

                          <ProcessAutocompleteInput
                            value={route.processName}
                            processes={processCatalog}
                            quotedProcessHours={quotedProcessHours}
                            onChange={(name, rate) => {
                              updateRouteStep(rIdx, 'processName', name);
                              if (rate !== undefined) {
                                updateRouteStep(rIdx, 'hourlyRate', rate);
                              }
                            }}
                          />

                          {machineries.length > 0 && (
                            <MachineAutocompleteInput
                              machineId={route.machineId}
                              machineries={machineries}
                              onSelectMachine={(mId, mName) => {
                                updateRouteStep(rIdx, 'machineId', mId);
                                updateRouteStep(rIdx, 'machineName', mName);
                              }}
                            />
                          )}

                          {/* Time Input + Quick Presets */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center">
                              <input
                                type="number"
                                min={1}
                                step="any"
                                value={route.durationValue}
                                onChange={(e) =>
                                  updateRouteStep(rIdx, 'durationValue', Number(e.target.value))
                                }
                                className="w-20 px-2.5 py-1 text-xs font-mono font-bold bg-surface border border-theme-subtle rounded-l-lg text-primary focus:outline-none focus:border-rex-500"
                              />
                              <select
                                value={route.durationUnit}
                                onChange={(e) =>
                                  updateRouteStep(
                                    rIdx,
                                    'durationUnit',
                                    e.target.value as 'mins' | 'hrs'
                                  )
                                }
                                className="px-2 py-1 text-xs font-bold bg-surface2 border border-l-0 border-theme-subtle rounded-r-lg text-primary cursor-pointer"
                              >
                                <option value="mins">Mins</option>
                                <option value="hrs">Hrs</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              {[
                                { label: '15m', val: 15, unit: 'mins' as const },
                                { label: '30m', val: 30, unit: 'mins' as const },
                                { label: '45m', val: 45, unit: 'mins' as const },
                                { label: '1h', val: 1, unit: 'hrs' as const },
                                { label: '2h', val: 2, unit: 'hrs' as const },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    updateRouteStep(rIdx, 'durationValue', preset.val);
                                    updateRouteStep(rIdx, 'durationUnit', preset.unit);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                                    route.durationValue === preset.val &&
                                    route.durationUnit === preset.unit
                                      ? 'bg-rex-600 text-white border-rex-600 font-bold'
                                      : 'bg-surface hover:bg-surface2 text-secondary border-theme-subtle'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* STAGE C: WORK INSTRUCTION & STEP OUTPUT (3 cols) */}
                        <div className="lg:col-span-3 p-3 rounded-xl bg-surface2/25 border border-theme-subtle space-y-2">
                          <label className="block text-[10.5px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                            <Hammer size={12} className="text-amber-500" /> C. Work Instruction
                          </label>
                          <textarea
                            rows={3}
                            value={route.instruction}
                            onChange={(e) => updateRouteStep(rIdx, 'instruction', e.target.value)}
                            placeholder="e.g. Facing & turning Ø50 to Ø45mm / Mill keyway / TIG Weld Step 1 & Step 2 parts together"
                            className="w-full px-2.5 py-1.5 text-xs bg-surface border border-theme-subtle rounded-lg text-primary resize-none focus:outline-none focus:border-rex-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FLOWCHART VERTICAL CONNECTOR ARROW + INSERT STEP BUTTON */}
                  <div className="relative flex items-center gap-4 py-2.5 pl-9 sm:pl-12">
                    <div className="flex items-center gap-2 text-muted">
                      <ArrowDownCircle size={16} className="text-rex-500 bg-surface rounded-full" />
                      <span className="text-[11px] font-mono text-muted">
                        Flows to {rIdx < routes.length - 1 ? `Step ${rIdx + 2}` : 'Final Inspection & Completion'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => insertRouteStepAt(rIdx + 1)}
                      className="px-2.5 py-0.5 rounded-full bg-surface border border-dashed border-rex-500/40 hover:border-rex-500 hover:bg-rex-500/10 text-[10.5px] font-semibold text-rex-600 dark:text-rex-400 cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Plus size={11} /> Insert Step Here
                    </button>
                  </div>
                </React.Fragment>
              );
            })}

            {/* END FLOWCHART NODE */}
            <div className="relative flex items-center justify-between gap-4 pt-1 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center z-10 shrink-0 shadow-xs ring-4 ring-emerald-500/15">
                  <CheckCircle2 size={14} />
                </div>
                <div className="px-4 py-2 rounded-xl bg-surface border border-theme-subtle border-l-4 border-l-emerald-500 text-xs font-semibold text-secondary flex items-center gap-3 flex-wrap shadow-2xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">FINISH:</span>
                  <span>Completed Part / Assembly Ready for QC & Dispatch</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono font-bold text-[11px]">
                    Planned: {Math.round(totalRouteMins)} mins ({totalRouteHours.toFixed(2)} hrs)
                  </span>
                  {totalQuotedHours > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono font-semibold text-[11px]">
                      Quoted: {totalQuotedHours.toFixed(2)} hrs ({totalQuotedMins} mins)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveStepTab('bom')}
                  className="text-xs font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back to Step 1 (BOM)
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs px-6 py-2 shadow-sm"
                >
                  {saving ? 'Saving & Syncing...' : 'Save Work Order BOM & Routes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
