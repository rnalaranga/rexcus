import React, { useState, useEffect, useMemo } from 'react';
import { 
  Factory, Calendar, Clock, CheckCircle2, AlertTriangle, User, Users, 
  Wrench, Settings, ArrowRight, Sparkles, Filter, Search, CheckSquare, 
  Square, ChevronRight, RotateCcw, AlertCircle, RefreshCw, Layers, 
  Cpu, Hash, ShieldCheck, Flame, Info, Check, X, ArrowUpRight, 
  BarChart3, TrendingUp, Zap, HelpCircle, ChevronDown, ChevronLeft,
  CalendarDays, SlidersHorizontal, ArrowDownUp, Eye, Play, CheckCheck,
  Maximize2, Minimize2, ListFilter, AlertOctagon, Timer, ShieldAlert
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHelpButton } from '@/components/help/PageHelpButton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Operation Categories for filtering & grouping
export const OP_CATEGORIES = [
  { id: 'all', label: 'All Operations', icon: Layers },
  { id: 'lathe', label: 'Lathe / Turning', match: ['lathe', 'turn', 'facing', 'boring', 'threading'], icon: Wrench },
  { id: 'milling', label: 'CNC Milling / VMC', match: ['mill', 'vmc', 'cnc', 'pocket', 'surface'], icon: Cpu },
  { id: 'drilling', label: 'Drilling & Tapping', match: ['drill', 'tap', 'ream', 'counterbore'], icon: Wrench },
  { id: 'grinding', label: 'Grinding & EDM', match: ['grind', 'edm', 'wire cut', 'polish', 'lap'], icon: Flame },
  { id: 'bench', label: 'Deburr & Bench', match: ['deburr', 'bench', 'clean', 'saw', 'cut'], icon: Settings },
  { id: 'qc', label: 'QC & Inspection', match: ['qc', 'inspect', 'measure', 'check', 'cmm'], icon: ShieldCheck },
];

export type DueDateFilterType = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'next_14' | 'custom';
export type StudioViewMode = 'split' | 'timeline' | 'routing';

// Helper to compute delivery urgency for any date
export function computeDueUrgency(targetDateStr?: string) {
  if (!targetDateStr) {
    return {
      status: 'none' as const,
      label: 'No Due Date',
      color: 'text-muted bg-surface2 border-theme-subtle',
      badgeClass: 'bg-surface2 text-muted border-theme-subtle',
      daysDiff: 999
    };
  }

  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      status: 'overdue' as const,
      label: `Overdue by ${Math.abs(daysDiff)}d`,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
      daysDiff
    };
  }
  if (daysDiff === 0) {
    return {
      status: 'today' as const,
      label: 'Due Today',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/20 border-amber-500/40 animate-pulse',
      badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold',
      daysDiff
    };
  }
  if (daysDiff === 1) {
    return {
      status: 'tomorrow' as const,
      label: 'Due Tomorrow',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold',
      daysDiff
    };
  }
  if (daysDiff <= 7) {
    return {
      status: 'this_week' as const,
      label: `Due in ${daysDiff}d`,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 font-semibold',
      daysDiff
    };
  }
  return {
    status: 'future' as const,
    label: `Due in ${daysDiff}d`,
    color: 'text-secondary bg-surface2 border-theme-subtle',
    badgeClass: 'bg-surface2 text-secondary border-theme-subtle',
    daysDiff
  };
}

export const WorkshopPlanning: React.FC = () => {
  // Data State
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Studio View Mode: Split Board, 7-Day Timeline (Gantt), Routing Pipeline
  const [viewMode, setViewMode] = useState<StudioViewMode>('split');

  // Planning Schedule Horizon Controls
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftHours, setShiftHours] = useState<number>(8.0);
  const [viewGrouping, setViewGrouping] = useState<'machines' | 'operators'>('machines');

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWoFilter, setSelectedWoFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_asc' | 'priority_desc' | 'hours_desc' | 'order_no'>('due_asc');

  // Job Required Date Filters (Core User Requirement)
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Multi-Selection State for Batch Assignment
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMachineId, setBatchMachineId] = useState('');
  const [batchEmployeeId, setBatchEmployeeId] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Single Quick Assign Modal State
  const [quickAssignOp, setQuickAssignOp] = useState<any | null>(null);
  const [quickMachineId, setQuickMachineId] = useState('');
  const [quickEmployeeId, setQuickEmployeeId] = useState('');
  const [quickScheduleDate, setQuickScheduleDate] = useState(selectedDate);
  const [submittingQuick, setSubmittingQuick] = useState(false);

  // AI Optimizer State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAi, setApplyingAi] = useState(false);

  // Show Toast helper
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Day navigation helper
  const handleShiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Load all production planning data
  const loadData = async () => {
    setLoading(true);
    try {
      const [wosRes, machRes, empRes] = await Promise.all([
        fetch(`${API_URL}/production/work-orders`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/production/machineries`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/hr/employees`).then(r => r.json()).catch(() => [])
      ]);

      setWorkOrders(Array.isArray(wosRes) ? wosRes : []);
      setMachineries(Array.isArray(machRes) ? machRes : []);
      setEmployees(Array.isArray(empRes) ? empRes : []);
    } catch (err: any) {
      showToast('error', 'Failed to load workshop planning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync quickScheduleDate when global selectedDate changes
  useEffect(() => {
    setQuickScheduleDate(selectedDate);
  }, [selectedDate]);

  // Flatten all operations across active work orders with enriched parent WO & due urgency
  const allOperations = useMemo(() => {
    const list: any[] = [];
    for (const wo of workOrders) {
      // Exclude completed or closed work orders from active planning
      if (wo.status === 'Completed' || wo.status === 'Closed') continue;

      const ops = Array.isArray(wo.operations) ? wo.operations : [];
      const woTargetDate = wo.targetDate || wo.dueDate || wo.deliveryDate || wo.targetDeliveryDate;
      const urgency = computeDueUrgency(woTargetDate);

      for (const op of ops) {
        list.push({
          ...op,
          urgency,
          parentWo: {
            id: wo.id,
            orderNo: wo.orderNo || wo.id,
            productName: wo.productName || wo.partName || wo.title || 'Component',
            customerName: wo.customerName || wo.customer || 'In-House',
            priority: wo.priority || 'Normal',
            targetDate: woTargetDate,
            quantity: wo.quantity || wo.qty || 1,
            uom: wo.uom || 'Nos',
            status: wo.status || 'In Progress',
            operationsCount: ops.length
          }
        });
      }
    }
    return list;
  }, [workOrders]);

  // Distinct active Work Orders for dropdown
  const activeWorkOrderOptions = useMemo(() => {
    const map = new Map<string, { id: string; orderNo: string; label: string }>();
    allOperations.forEach(op => {
      if (op.parentWo && !map.has(op.parentWo.orderNo)) {
        map.set(op.parentWo.orderNo, {
          id: op.parentWo.id,
          orderNo: op.parentWo.orderNo,
          label: `${op.parentWo.orderNo} - ${op.parentWo.productName} (${op.parentWo.customerName})`
        });
      }
    });
    return Array.from(map.values());
  }, [allOperations]);

  // Filter operations based on Status, Category, Search, Priority, WO, and Job Required Date
  const filteredOperations = useMemo(() => {
    return allOperations.filter(op => {
      // 1. Status Filter
      const isAssigned = Boolean(op.machineId || op.employeeId);
      if (statusFilter === 'unassigned' && isAssigned) return false;
      if (statusFilter === 'assigned' && !isAssigned) return false;

      // 2. Category Filter
      if (selectedCategory !== 'all') {
        const catConfig = OP_CATEGORIES.find(c => c.id === selectedCategory);
        if (catConfig && catConfig.match) {
          const text = `${op.operationName || ''} ${op.station || ''} ${op.notes || ''}`.toLowerCase();
          const matches = catConfig.match.some(m => text.includes(m));
          if (!matches) return false;
        }
      }

      // 3. Work Order Specific Filter
      if (selectedWoFilter !== 'all') {
        if (op.parentWo?.orderNo !== selectedWoFilter) return false;
      }

      // 4. Priority Filter
      if (priorityFilter !== 'all') {
        if ((op.parentWo?.priority || 'Normal').toLowerCase() !== priorityFilter.toLowerCase()) return false;
      }

      // 5. Job Required Date Filter (Crucial User Requirement)
      if (dueDateFilter !== 'all') {
        const days = op.urgency.daysDiff;
        if (dueDateFilter === 'overdue') {
          if (days >= 0 || days === 999) return false;
        } else if (dueDateFilter === 'today') {
          if (days !== 0) return false;
        } else if (dueDateFilter === 'tomorrow') {
          if (days !== 1) return false;
        } else if (dueDateFilter === 'this_week') {
          if (days < 0 || days > 7) return false;
        } else if (dueDateFilter === 'next_14') {
          if (days < 0 || days > 14) return false;
        } else if (dueDateFilter === 'custom') {
          const targetStr = op.parentWo?.targetDate ? op.parentWo.targetDate.slice(0, 10) : '';
          if (!targetStr) return false;
          if (customStartDate && targetStr < customStartDate) return false;
          if (customEndDate && targetStr > customEndDate) return false;
        }
      }

      // 6. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const opText = `${op.operationName || ''} ${op.parentWo?.orderNo || ''} ${op.parentWo?.productName || ''} ${op.parentWo?.customerName || ''}`.toLowerCase();
        if (!opText.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === 'due_asc') {
        return a.urgency.daysDiff - b.urgency.daysDiff;
      }
      if (sortBy === 'priority_desc') {
        const pMap: any = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
        return (pMap[b.parentWo?.priority] || 1) - (pMap[a.parentWo?.priority] || 1);
      }
      if (sortBy === 'hours_desc') {
        return Number(b.plannedHours || 1.5) - Number(a.plannedHours || 1.5);
      }
      if (sortBy === 'order_no') {
        return String(a.parentWo?.orderNo).localeCompare(String(b.parentWo?.orderNo));
      }
      return 0;
    });
  }, [
    allOperations, statusFilter, selectedCategory, searchQuery, 
    selectedWoFilter, priorityFilter, dueDateFilter, customStartDate, 
    customEndDate, sortBy
  ]);

  // Operations categorized count for badge counters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOperations.length };
    OP_CATEGORIES.forEach(c => {
      if (c.id === 'all') return;
      counts[c.id] = allOperations.filter(op => {
        if (!c.match) return false;
        const text = `${op.operationName || ''} ${op.station || ''} ${op.notes || ''}`.toLowerCase();
        return c.match.some(m => text.includes(m));
      }).length;
    });
    return counts;
  }, [allOperations]);

  // Due urgency breakdown counts for quick filter buttons
  const urgencyCounts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let tomorrow = 0;
    let thisWeek = 0;
    let next14 = 0;

    allOperations.forEach(op => {
      const d = op.urgency.daysDiff;
      if (d < 0) overdue++;
      if (d === 0) today++;
      if (d === 1) tomorrow++;
      if (d >= 0 && d <= 7) thisWeek++;
      if (d >= 0 && d <= 14) next14++;
    });

    return { overdue, today, tomorrow, thisWeek, next14 };
  }, [allOperations]);

  // Calculate Machine Scheduled Hours & Load for Selected Date
  const machineCapacities = useMemo(() => {
    return machineries.map(machine => {
      const scheduledOps = allOperations.filter(op => {
        if (op.machineId !== machine.id) return false;
        const opDate = op.scheduledStart ? op.scheduledStart.slice(0, 10) : '';
        return opDate === selectedDate || !opDate;
      });

      const totalPlannedHours = scheduledOps.reduce((sum, it) => sum + Number(it.plannedHours || 1.5), 0);
      const utilization = Math.min(200, Math.round((totalPlannedHours / shiftHours) * 100));
      const remainingHours = Math.max(0, shiftHours - totalPlannedHours);

      return {
        machine,
        operations: scheduledOps,
        totalPlannedHours,
        utilization,
        remainingHours,
        isOverloaded: totalPlannedHours > shiftHours
      };
    });
  }, [machineries, allOperations, selectedDate, shiftHours]);

  // Calculate Operator Scheduled Hours
  const operatorCapacities = useMemo(() => {
    return employees.map(emp => {
      const scheduledOps = allOperations.filter(op => {
        if (op.employeeId !== emp.id) return false;
        const opDate = op.scheduledStart ? op.scheduledStart.slice(0, 10) : '';
        return opDate === selectedDate || !opDate;
      });

      const totalPlannedHours = scheduledOps.reduce((sum, it) => sum + Number(it.plannedHours || 1.5), 0);
      const utilization = Math.min(200, Math.round((totalPlannedHours / shiftHours) * 100));
      const remainingHours = Math.max(0, shiftHours - totalPlannedHours);

      return {
        employee: emp,
        operations: scheduledOps,
        totalPlannedHours,
        utilization,
        remainingHours,
        isOverloaded: totalPlannedHours > shiftHours
      };
    });
  }, [employees, allOperations, selectedDate, shiftHours]);

  // 7-Day Timeline Days Generator (starting from selectedDate)
  const next7Days = useMemo(() => {
    const list: string[] = [];
    const base = new Date(selectedDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, [selectedDate]);

  // Overall Workshop Summary Metrics
  const summaryMetrics = useMemo(() => {
    const unassignedCount = allOperations.filter(op => !op.machineId && !op.employeeId).length;
    const assignedCount = allOperations.filter(op => op.machineId || op.employeeId).length;
    const totalOps = allOperations.length;

    const totalWorkshopCapacity = machineries.length * shiftHours;
    const totalScheduledHours = machineCapacities.reduce((sum, m) => sum + m.totalPlannedHours, 0);
    const avgUtilization = totalWorkshopCapacity > 0 ? Math.round((totalScheduledHours / totalWorkshopCapacity) * 100) : 0;
    const overloadedCount = machineCapacities.filter(m => m.isOverloaded).length;

    return {
      activeWorkOrdersCount: workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Closed').length,
      unassignedCount,
      assignedCount,
      totalOps,
      avgUtilization,
      overloadedCount,
      totalScheduledHours
    };
  }, [allOperations, workOrders, machineries, shiftHours, machineCapacities]);

  // Multi-Selection Toggle
  const toggleSelectOp = (opId: string) => {
    setSelectedOpIds(prev => 
      prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredOperations.map(op => op.id);
    setSelectedOpIds(ids);
  };

  const clearSelection = () => {
    setSelectedOpIds([]);
  };

  // Open Batch Assignment Drawer
  const openBatchAssign = () => {
    if (selectedOpIds.length === 0) return;
    
    // Auto-suggest machine if all selected ops belong to a single category
    const selectedOps = allOperations.filter(op => selectedOpIds.includes(op.id));
    const firstOpName = (selectedOps[0]?.operationName || '').toLowerCase();

    let suggestedMach = machineries.find(m => {
      const type = (m.type || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      if (firstOpName.includes('lathe') || firstOpName.includes('turn')) return type.includes('lathe') || name.includes('lathe');
      if (firstOpName.includes('mill') || firstOpName.includes('vmc')) return type.includes('mill') || name.includes('vmc');
      if (firstOpName.includes('drill')) return type.includes('drill') || name.includes('drill');
      if (firstOpName.includes('grind')) return type.includes('grind') || name.includes('grind');
      return false;
    });

    setBatchMachineId(suggestedMach ? suggestedMach.id : (machineries[0]?.id || ''));
    setBatchEmployeeId(employees[0]?.id || '');
    setShowBatchModal(true);
  };

  // Execute Batch Assignment via API
  const handleExecuteBatchAssign = async () => {
    if (selectedOpIds.length === 0) return;
    setSubmittingBatch(true);

    try {
      const res = await fetch(`${API_URL}/production/operations/batch-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationIds: selectedOpIds,
          machineId: batchMachineId || null,
          employeeId: batchEmployeeId || null,
          scheduledDate: selectedDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign operations');

      showToast('success', `Allocated ${selectedOpIds.length} operations successfully!`);
      setShowBatchModal(false);
      setSelectedOpIds([]);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Open Single Operation Quick Assign
  const handleOpenQuickAssign = (op: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickAssignOp(op);
    setQuickScheduleDate(selectedDate);

    // Auto-detect best matching machine
    const opText = `${op.operationName || ''} ${op.station || ''}`.toLowerCase();
    const suggestedMach = machineries.find(m => {
      const type = (m.type || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      if (opText.includes('lathe') || opText.includes('turn')) return type.includes('lathe') || name.includes('lathe');
      if (opText.includes('mill') || opText.includes('vmc')) return type.includes('mill') || name.includes('vmc');
      if (opText.includes('drill')) return type.includes('drill') || name.includes('drill');
      if (opText.includes('grind')) return type.includes('grind') || name.includes('grind');
      return false;
    }) || machineries[0];

    setQuickMachineId(op.machineId || suggestedMach?.id || '');
    setQuickEmployeeId(op.employeeId || employees[0]?.id || '');
  };

  // Execute Single Quick Assign
  const handleSaveQuickAssign = async () => {
    if (!quickAssignOp) return;
    setSubmittingQuick(true);
    try {
      const res = await fetch(`${API_URL}/production/operations/${quickAssignOp.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: quickMachineId || null,
          employeeId: quickEmployeeId || null,
          scheduledStart: `${quickScheduleDate} 08:00:00`,
          scheduledEnd: `${quickScheduleDate} 17:00:00`
        })
      });
      if (!res.ok) throw new Error('Failed to update assignment');
      showToast('success', `Operation allocated to ${machineries.find(m => m.id === quickMachineId)?.name || 'station'}`);
      setQuickAssignOp(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSubmittingQuick(false);
    }
  };

  // Unassign single operation
  const handleUnassignOp = async (opId: string) => {
    try {
      const res = await fetch(`${API_URL}/production/operations/${opId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: null,
          employeeId: null,
          scheduledStart: null,
          scheduledEnd: null
        })
      });
      if (!res.ok) throw new Error('Failed to unassign');
      showToast('success', 'Operation unassigned to backlog');
      await loadData();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // ── AI SMART SCHEDULING ENGINE ─────────────────────────────────────────────
  const generateAiSchedule = () => {
    const unscheduled = allOperations.filter(op => !op.machineId && !op.employeeId);
    
    // Prioritize Overdue -> Urgent Priority -> Delivery Date -> Duration
    const sorted = [...unscheduled].sort((a, b) => {
      // 1. Overdue first
      if (a.urgency.daysDiff < 0 && b.urgency.daysDiff >= 0) return -1;
      if (b.urgency.daysDiff < 0 && a.urgency.daysDiff >= 0) return 1;

      // 2. Priority
      const pMap: any = { Urgent: 4, High: 3, Normal: 2, Low: 1 };
      const pDiff = (pMap[b.parentWo?.priority] || 1) - (pMap[a.parentWo?.priority] || 1);
      if (pDiff !== 0) return pDiff;

      // 3. Soonest Required Date
      const d1 = new Date(a.parentWo?.targetDate || '2099-01-01').getTime();
      const d2 = new Date(b.parentWo?.targetDate || '2099-01-01').getTime();
      return d1 - d2;
    });

    const suggestions: any[] = [];
    const machineLoadMap = new Map<string, number>();
    for (const m of machineries) machineLoadMap.set(m.id, 0);

    for (const op of sorted) {
      const text = `${op.operationName || ''} ${op.station || ''}`.toLowerCase();
      
      let candidateMachines = machineries.filter(m => {
        const type = (m.type || '').toLowerCase();
        const name = (m.name || '').toLowerCase();
        if (text.includes('lathe') || text.includes('turn') || text.includes('facing')) {
          return type.includes('lathe') || name.includes('lathe');
        }
        if (text.includes('mill') || text.includes('vmc') || text.includes('pocket')) {
          return type.includes('mill') || name.includes('vmc');
        }
        if (text.includes('drill') || text.includes('tap')) {
          return type.includes('drill') || name.includes('drill') || type.includes('mill');
        }
        if (text.includes('grind') || text.includes('surface')) {
          return type.includes('grind') || name.includes('grind');
        }
        return true;
      });

      if (candidateMachines.length === 0) candidateMachines = machineries;

      // Pick machine with lowest projected load
      candidateMachines.sort((a, b) => (machineLoadMap.get(a.id) || 0) - (machineLoadMap.get(b.id) || 0));
      const chosenMachine = candidateMachines[0];

      // Pick certified machinist
      let chosenEmployee = employees.find(e => {
        const skills = Array.isArray(e.skills) ? e.skills.join(' ').toLowerCase() : String(e.skills || '').toLowerCase();
        return skills.includes(chosenMachine?.type?.toLowerCase() || '') || skills.includes('machinist');
      }) || employees[0];

      if (chosenMachine && chosenEmployee) {
        const plannedHrs = Number(op.plannedHours || 1.5);
        const curLoad = machineLoadMap.get(chosenMachine.id) || 0;
        machineLoadMap.set(chosenMachine.id, curLoad + plannedHrs);

        let reason = `Tooling setup match for ${chosenMachine.name}`;
        if (op.urgency.daysDiff < 0) {
          reason = `🚨 Critical Overdue order (#${op.parentWo?.orderNo}) prioritized first`;
        } else if (op.urgency.daysDiff === 0) {
          reason = `⚠️ Required Today: Express slot assigned`;
        } else if (op.parentWo?.priority === 'Urgent' || op.parentWo?.priority === 'High') {
          reason = `High Priority Job Order allocated to primary station`;
        }

        suggestions.push({
          operation: op,
          suggestedMachine: chosenMachine,
          suggestedEmployee: chosenEmployee,
          plannedHours: plannedHrs,
          reason
        });
      }
    }

    setAiSuggestions(suggestions);
    setShowAiModal(true);
  };

  // Apply all AI Suggestions
  const handleApplyAiSchedule = async () => {
    if (aiSuggestions.length === 0) return;
    setApplyingAi(true);

    try {
      for (const item of aiSuggestions) {
        await fetch(`${API_URL}/production/operations/${item.operation.id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machineId: item.suggestedMachine.id,
            employeeId: item.suggestedEmployee.id,
            scheduledStart: `${selectedDate} 08:00:00`,
            scheduledEnd: `${selectedDate} 17:00:00`
          })
        });
      }

      showToast('success', `Applied AI smart schedule for ${aiSuggestions.length} operations!`);
      setShowAiModal(false);
      await loadData();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setApplyingAi(false);
    }
  };

  // Selected batch total planned hours
  const selectedBatchHours = useMemo(() => {
    return allOperations
      .filter(op => selectedOpIds.includes(op.id))
      .reduce((sum, op) => sum + Number(op.plannedHours || 1.5), 0);
  }, [allOperations, selectedOpIds]);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 text-xs font-bold shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md'
            : 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── TOP EXECUTIVE BANNER & HORIZON BAR ──────────────────────────────── */}
      <div className="bg-surface border border-theme-subtle p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Factory size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Workshop Planning &amp; Job Scheduler
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Precision Shopfloor Studio
                </span>
                {urgencyCounts.overdue > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                    <ShieldAlert size={12} />
                    {urgencyCounts.overdue} Overdue Operations
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Optimize machine centers, batch common lathe/milling setups, and align daily production with customer required dates.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls: Horizon Date & Studio Views */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Navigation with Arrows */}
          <div className="flex items-center bg-surface2 border border-theme-subtle">
            <button
              type="button"
              onClick={() => handleShiftDay(-1)}
              className="p-1.5 hover:bg-surface text-secondary hover:text-primary transition-colors border-r border-theme-subtle"
              title="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-purple-500" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => handleShiftDay(1)}
              className="p-1.5 hover:bg-surface text-secondary hover:text-primary transition-colors border-l border-theme-subtle"
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="px-2 py-1 text-[11px] font-bold text-muted hover:text-primary border-l border-theme-subtle bg-surface/50 hover:bg-surface"
              title="Reset to Today"
            >
              Today
            </button>
          </div>

          {/* Shift Hours */}
          <div className="flex items-center gap-1 bg-surface2 border border-theme-subtle px-2.5 py-1 text-xs">
            <Clock size={13} className="text-muted" />
            <select
              value={shiftHours}
              onChange={e => setShiftHours(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer"
            >
              <option value={8.0}>Day Shift (8 hrs)</option>
              <option value={10.0}>Extended (10 hrs)</option>
              <option value={16.0}>Double Shift (16 hrs)</option>
              <option value={24.0}>24h Continuous</option>
            </select>
          </div>

          {/* ⚡ AI Auto-Scheduler Button */}
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={generateAiSchedule}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20"
          >
            ⚡ AI Smart Scheduler
          </Button>

          {/* View Switcher Pills */}
          <div className="flex items-center bg-surface2 p-0.5 border border-theme-subtle">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-primary text-surface shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
              title="Split Planning: Backlog on Left, Stations on Right"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Split Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-primary text-surface shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
              title="7-Day Machine Timeline & Load Matrix"
            >
              <CalendarDays size={13} />
              <span className="hidden sm:inline">7-Day Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('routing')}
              className={`px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'routing'
                  ? 'bg-primary text-surface shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
              title="Work Order Routing & Step Progress"
            >
              <ListFilter size={13} />
              <span className="hidden sm:inline">WO Routing</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            className="text-xs h-8 border-theme-subtle"
            title="Refresh shop floor operations"
          >
            Refresh
          </Button>

          <PageHelpButton moduleId="production-planning" />
        </div>
      </div>

      {/* ── TOP KPI METRICS BAR ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Overdue Card (Clickable) */}
        <div 
          onClick={() => setDueDateFilter(dueDateFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-3 border transition-all cursor-pointer select-none ${
            dueDateFilter === 'overdue'
              ? 'bg-rose-500/15 border-rose-500 shadow-md ring-2 ring-rose-500/30'
              : urgencyCounts.overdue > 0
              ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10'
              : 'bg-surface border-theme-subtle'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Overdue Jobs
            </span>
            <AlertOctagon size={13} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {urgencyCounts.overdue}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {dueDateFilter === 'overdue' ? 'Active Filter • Click to clear' : 'Past required date'}
          </div>
        </div>

        {/* Due This Week (Clickable) */}
        <div 
          onClick={() => setDueDateFilter(dueDateFilter === 'this_week' ? 'all' : 'this_week')}
          className={`p-3 border transition-all cursor-pointer select-none ${
            dueDateFilter === 'this_week'
              ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-500/30'
              : 'bg-surface border-theme-subtle hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Due Next 7 Days
            </span>
            <Timer size={13} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {urgencyCounts.thisWeek}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {dueDateFilter === 'this_week' ? 'Active Filter • Click to clear' : 'Expiring this week'}
          </div>
        </div>

        {/* Backlog */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'unassigned' ? 'all' : 'unassigned')}
          className={`p-3 border transition-all cursor-pointer select-none ${
            statusFilter === 'unassigned'
              ? 'bg-purple-500/15 border-purple-500 shadow-md ring-2 ring-purple-500/30'
              : 'bg-surface border-theme-subtle hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Operations Backlog</span>
            <Layers size={13} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-primary mt-1">
            {summaryMetrics.unassignedCount}
          </div>
          <div className="text-[10px] text-secondary mt-0.5">Unscheduled operations</div>
        </div>

        {/* Scheduled Operations */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'assigned' ? 'all' : 'assigned')}
          className={`p-3 border transition-all cursor-pointer select-none ${
            statusFilter === 'assigned'
              ? 'bg-emerald-500/15 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
              : 'bg-surface border-theme-subtle hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Scheduled for Today</span>
            <CheckCircle2 size={13} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryMetrics.assignedCount}
          </div>
          <div className="text-[10px] text-muted mt-0.5">{summaryMetrics.totalScheduledHours.toFixed(1)} hrs planned</div>
        </div>

        {/* Workshop Load */}
        <div className="p-3 border border-theme-subtle bg-surface">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Workshop Station Load</span>
            <BarChart3 size={13} className="text-muted" />
          </div>
          <div className={`text-2xl font-black mt-1 ${
            summaryMetrics.avgUtilization > 95 ? 'text-rose-500' : summaryMetrics.avgUtilization > 75 ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {summaryMetrics.avgUtilization}%
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {summaryMetrics.overloadedCount > 0 ? (
              <span className="text-rose-500 font-bold">{summaryMetrics.overloadedCount} overloaded station(s)</span>
            ) : (
              <span>Balanced capacity</span>
            )}
          </div>
        </div>

        {/* Machine Centers Available */}
        <div className="p-3 border border-theme-subtle bg-surface">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Station Centers</span>
            <Cpu size={13} className="text-muted" />
          </div>
          <div className="text-2xl font-black text-primary mt-1">
            {machineries.length} <span className="text-xs text-muted font-normal">/ {employees.length} ops</span>
          </div>
          <div className="text-[10px] text-muted mt-0.5">Machines &bull; Qualified machinists</div>
        </div>
      </div>

      {/* ── REQUIRED DATE & MULTI-DIMENSION FILTER TOOLBAR ─────────────────── */}
      <div className="p-4 bg-surface border border-theme-subtle space-y-3.5 shadow-xs">
        {/* Row 1: Job Required Date Filtering Pills (The Core Request) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-theme-subtle pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
              <CalendarDays size={14} className="text-purple-500" />
              Job Required Date Filter:
            </span>

            {[
              { id: 'all', label: 'All Dates', count: allOperations.length },
              { id: 'overdue', label: '🚨 Overdue', count: urgencyCounts.overdue, alert: urgencyCounts.overdue > 0 },
              { id: 'today', label: 'Due Today', count: urgencyCounts.today, alert: urgencyCounts.today > 0 },
              { id: 'tomorrow', label: 'Due Tomorrow', count: urgencyCounts.tomorrow },
              { id: 'this_week', label: 'Due This Week (7d)', count: urgencyCounts.thisWeek },
              { id: 'next_14', label: 'Next 14 Days', count: urgencyCounts.next14 },
              { id: 'custom', label: 'Custom Range...', count: null }
            ].map(f => {
              const isSelected = dueDateFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDueDateFilter(f.id as DueDateFilterType)}
                  className={`px-2.5 py-1 text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : f.alert
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      : 'bg-surface2 border-theme-subtle text-secondary hover:text-primary hover:border-theme'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count !== null && (
                    <span className={`text-[10px] font-mono px-1 py-0.1 border ${
                      isSelected 
                        ? 'bg-white/20 text-white border-white/30' 
                        : 'bg-surface text-muted border-theme-subtle'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Inputs if 'custom' is active */}
          {dueDateFilter === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap bg-surface2 px-3 py-1.5 border border-theme-subtle animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-muted uppercase">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-surface border border-theme-subtle px-2 py-0.5 text-xs text-primary font-bold outline-none"
              />
              <span className="text-[11px] font-bold text-muted uppercase">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-surface border border-theme-subtle px-2 py-0.5 text-xs text-primary font-bold outline-none"
              />
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                  className="text-xs text-muted hover:text-primary"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Operation Category Pills with Counter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-xs font-bold text-muted uppercase tracking-wider shrink-0 mr-1">
            Operation Process:
          </span>
          {OP_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-primary text-surface border-primary shadow-xs'
                    : 'bg-surface2 border-theme-subtle text-secondary hover:text-primary hover:border-theme'
                }`}
              >
                <Icon size={12} />
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1 py-0.1 border ${
                  isSelected ? 'bg-white/20 text-white border-white/20' : 'bg-surface text-muted border-theme-subtle'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Search, Work Order, Priority & Sort Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Search input */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search WO#, part name, customer..."
              className="w-full bg-surface2 border border-theme-subtle pl-8 pr-7 py-1.5 text-xs text-primary placeholder-muted outline-none focus:border-purple-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2.5 text-muted hover:text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter by Specific Work Order */}
          <div className="flex items-center gap-1.5 bg-surface2 border border-theme-subtle px-2 py-1">
            <span className="text-[10px] font-bold text-muted uppercase shrink-0">WO:</span>
            <select
              value={selectedWoFilter}
              onChange={e => setSelectedWoFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer w-full truncate"
            >
              <option value="all">All Active Work Orders ({activeWorkOrderOptions.length})</option>
              {activeWorkOrderOptions.map(opt => (
                <option key={opt.orderNo} value={opt.orderNo}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-surface2 border border-theme-subtle px-2 py-1">
            <span className="text-[10px] font-bold text-muted uppercase shrink-0">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer w-full"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🚨 Urgent Priority</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-surface2 border border-theme-subtle px-2 py-1">
            <span className="text-[10px] font-bold text-muted uppercase shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer w-full"
            >
              <option value="unassigned">Unscheduled Backlog</option>
              <option value="assigned">Scheduled to Stations</option>
              <option value="all">All (Backlog &amp; Scheduled)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-surface2 border border-theme-subtle px-2 py-1">
            <ArrowDownUp size={12} className="text-muted shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer w-full"
            >
              <option value="due_asc">Required Date (Soonest First)</option>
              <option value="priority_desc">Priority (Urgent First)</option>
              <option value="hours_desc">Cycle Hours (Longest First)</option>
              <option value="order_no">Work Order Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── MAIN STUDIO VIEW 1: SPLIT PLANNING BOARD (DUAL PANELS) ───────── */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════════════════ LEFT PANEL: OPERATIONS POOL (5 COLS) ════════════════ */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-surface border border-theme-subtle p-4 shadow-sm space-y-3">
              {/* Header & Batch Action Button */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-theme-subtle">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <Layers size={15} className="text-purple-500" />
                    Operations Pool ({filteredOperations.length})
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Select jobs to batch-assign onto machine setups or click &ldquo;Assign&rdquo; for express routing.
                  </p>
                </div>

                {selectedOpIds.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Zap}
                    onClick={openBatchAssign}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 animate-pulse shrink-0"
                  >
                    Batch Assign ({selectedOpIds.length} ops &bull; {selectedBatchHours.toFixed(1)}h)
                  </Button>
                )}
              </div>

              {/* Selection Summary & Select All Row */}
              <div className="flex items-center justify-between text-xs text-muted py-1 px-1 bg-surface2/50 border border-theme-subtle">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
                  >
                    Select All ({filteredOperations.length})
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-muted hover:text-primary hover:underline"
                  >
                    Clear ({selectedOpIds.length})
                  </button>
                </div>
                <div className="font-mono text-[11px] text-secondary">
                  Total Pool: <strong className="text-primary">{filteredOperations.reduce((s, it) => s + Number(it.plannedHours || 1.5), 0).toFixed(1)} hrs</strong>
                </div>
              </div>

              {/* Operations Cards Scrollable List */}
              <div className="space-y-2.5 max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredOperations.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs border border-dashed border-theme-subtle bg-surface2/20">
                    No operations match the selected filters or required date range.
                  </div>
                ) : (
                  filteredOperations.map(op => {
                    const isSelected = selectedOpIds.includes(op.id);
                    const isAssigned = Boolean(op.machineId || op.employeeId);
                    const assignedMach = machineries.find(m => m.id === op.machineId);
                    const assignedEmp = employees.find(e => e.id === op.employeeId);

                    return (
                      <div
                        key={op.id}
                        onClick={() => toggleSelectOp(op.id)}
                        className={`p-3.5 border transition-all cursor-pointer select-none text-xs relative ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500/30'
                            : isAssigned
                            ? 'bg-surface border-theme-subtle hover:border-theme'
                            : 'bg-surface border-theme-subtle hover:border-purple-500/50 hover:bg-surface2/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelectOp(op.id); }}
                            className="mt-0.5 text-purple-600 dark:text-purple-400 shrink-0"
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-muted" />}
                          </button>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Top Meta Bar */}
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 bg-surface2 border border-theme-subtle text-primary">
                                  {op.parentWo?.orderNo}
                                </span>
                                
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 border ${
                                  op.parentWo?.priority === 'Urgent'
                                    ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/15 animate-pulse'
                                    : op.parentWo?.priority === 'High'
                                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/15'
                                    : 'border-theme-subtle text-muted bg-surface2'
                                }`}>
                                  {op.parentWo?.priority}
                                </span>

                                {/* Delivery Urgency Badge (Required Date) */}
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 border ${op.urgency.badgeClass}`}>
                                  {op.urgency.label}
                                </span>
                              </div>

                              <span className="font-mono font-bold text-xs text-primary flex items-center gap-1 px-1.5 py-0.5 bg-surface2 border border-theme-subtle">
                                <Clock size={11} className="text-purple-500" />
                                {op.plannedHours || 1.5}h
                              </span>
                            </div>

                            {/* Operation Process Title */}
                            <div>
                              <div className="font-bold text-primary tracking-tight text-xs flex items-center gap-1.5">
                                <span className="text-purple-600 dark:text-purple-400 font-mono">Step {op.stepNumber || 10}:</span>
                                <span>{op.operationName || 'Machining Operation'}</span>
                              </div>
                              <div className="text-[11px] text-muted truncate mt-0.5">
                                Part: <strong className="text-secondary">{op.parentWo?.productName}</strong> &bull; Qty: {op.parentWo?.quantity} {op.parentWo?.uom}
                              </div>
                              <div className="text-[10px] text-muted truncate">
                                Client: <span className="text-primary font-medium">{op.parentWo?.customerName}</span>
                              </div>
                            </div>

                            {/* Footer: Assignment Status & Express Action */}
                            <div className="pt-2 border-t border-theme-subtle flex items-center justify-between text-[11px] gap-2">
                              {isAssigned ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold truncate">
                                  <CheckCircle2 size={12} className="shrink-0" />
                                  <span className="truncate">
                                    {assignedMach?.name || 'Machine'} &bull; {assignedEmp?.name || 'Operator'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-500 font-semibold flex items-center gap-1">
                                  <AlertTriangle size={11} /> Unscheduled Backlog
                                </span>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                {isAssigned ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleUnassignOp(op.id); }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-theme-subtle transition-colors"
                                    title="Unassign operation"
                                  >
                                    Unassign
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenQuickAssign(op, e)}
                                    className="px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all flex items-center gap-1"
                                  >
                                    <Zap size={10} /> Assign Station
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ════════════════ RIGHT PANEL: CAPACITY & LOAD MATRIX (7 COLS) ════════════════ */}
          <div className="lg:col-span-7 space-y-3">
            <div className="bg-surface border border-theme-subtle p-4 shadow-sm space-y-3">
              {/* Header & Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-theme-subtle">
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <BarChart3 size={15} className="text-purple-500" />
                    Workshop Load &amp; Machine Allocation Matrix
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Scheduled capacity for <strong className="text-primary">{formatDate(selectedDate)}</strong> ({shiftHours}h Shift Horizon)
                  </p>
                </div>

                {/* View Grouping Pill Toggle */}
                <div className="flex items-center bg-surface2 p-0.5 border border-theme-subtle">
                  <button
                    type="button"
                    onClick={() => setViewGrouping('machines')}
                    className={`px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewGrouping === 'machines'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    <Cpu size={12} />
                    By Machines ({machineries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewGrouping('operators')}
                    className={`px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewGrouping === 'operators'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-muted hover:text-primary'
                    }`}
                  >
                    <Users size={12} />
                    By Operators ({employees.length})
                  </button>
                </div>
              </div>

              {/* ── BY MACHINES VIEW ── */}
              {viewGrouping === 'machines' && (
                <div className="space-y-3 pt-1 max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
                  {machineCapacities.map(({ machine, operations, totalPlannedHours, utilization, remainingHours, isOverloaded }) => {
                    return (
                      <div
                        key={machine.id}
                        className={`p-4 border transition-all ${
                          isOverloaded
                            ? 'bg-rose-500/5 border-rose-500/40 shadow-xs'
                            : operations.length > 0
                            ? 'bg-surface border-theme shadow-xs'
                            : 'bg-surface2/30 border-theme-subtle'
                        }`}
                      >
                        {/* Machine Title & Capacity Meter */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-9 h-9 flex items-center justify-center font-bold text-xs border ${
                              isOverloaded
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                : 'bg-surface2 text-primary border-theme-subtle'
                            }`}>
                              <Cpu size={16} className={isOverloaded ? 'text-rose-500' : 'text-purple-500'} />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-primary text-sm tracking-tight">{machine.name}</h4>
                                <span className="text-[10px] font-mono text-muted uppercase bg-surface2 px-1.5 py-0.2 border border-theme-subtle">
                                  {machine.type || 'Center'}
                                </span>
                                {machine.status && machine.status !== 'Active' && (
                                  <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 border border-amber-500/20">
                                    {machine.status}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted">
                                Model: {machine.model || '-'} &bull; Rate: Rs. {Number(machine.hourlyCost || 0).toLocaleString()}/hr
                              </span>
                            </div>
                          </div>

                          {/* Capacity Percentage Badge */}
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold">
                              <span className="text-primary">{totalPlannedHours.toFixed(1)}h</span>
                              <span className="text-muted font-normal">/ {shiftHours}h</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                                isOverloaded
                                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse'
                                  : utilization >= 85
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                  : operations.length > 0
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-surface2 text-muted border-theme-subtle'
                              }`}>
                                {utilization}% Loaded
                              </span>
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {isOverloaded ? (
                                <strong className="text-rose-500 font-bold">+{(totalPlannedHours - shiftHours).toFixed(1)}h Overtime Warning</strong>
                              ) : (
                                <span>{remainingHours.toFixed(1)}h capacity available</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Visual Capacity Progress Bar */}
                        <div className="w-full bg-surface2 h-2.5 overflow-hidden mb-3 border border-theme-subtle">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOverloaded
                                ? 'bg-rose-500'
                                : utilization >= 85
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>

                        {/* Scheduled Operations Chips on this Machine */}
                        {operations.length > 0 ? (
                          <div className="space-y-1.5 pt-2 border-t border-theme-subtle">
                            <div className="text-[10px] uppercase font-bold text-muted flex items-center justify-between">
                              <span>Allocated Job Queue ({operations.length} operations):</span>
                              <span className="font-mono text-primary font-bold">{totalPlannedHours.toFixed(1)} hrs total</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {operations.map(op => {
                                const opUrgency = op.urgency || computeDueUrgency(op.parentWo?.targetDate);
                                return (
                                  <div
                                    key={op.id}
                                    className="p-2.5 bg-surface2/70 border border-theme-subtle flex items-center justify-between gap-1 text-[11px]"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-primary truncate">
                                          {op.parentWo?.orderNo}: Step {op.stepNumber || 10} - {op.operationName}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-muted truncate mt-0.5">
                                        Part: {op.parentWo?.productName} ({op.plannedHours || 1.5}h) &bull; <span className={`font-semibold ${opUrgency.color}`}>{opUrgency.label}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignOp(op.id)}
                                      className="p-1 text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                                      title="Unassign operation"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted italic text-center py-2.5 bg-surface2/30 border border-dashed border-theme-subtle">
                            Station idle for {formatDate(selectedDate)} ({shiftHours}h Available for assignment)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── BY OPERATORS VIEW ── */}
              {viewGrouping === 'operators' && (
                <div className="space-y-3 pt-1 max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
                  {operatorCapacities.map(({ employee, operations, totalPlannedHours, utilization, remainingHours, isOverloaded }) => {
                    return (
                      <div
                        key={employee.id}
                        className={`p-4 border transition-all ${
                          isOverloaded
                            ? 'bg-rose-500/5 border-rose-500/40 shadow-xs'
                            : operations.length > 0
                            ? 'bg-surface border-theme shadow-xs'
                            : 'bg-surface2/30 border-theme-subtle'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 flex items-center justify-center font-bold text-xs bg-surface2 text-primary border border-theme-subtle">
                              <User size={16} className="text-purple-500" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-primary text-sm tracking-tight">{employee.name}</h4>
                                <span className="text-[10px] font-mono text-muted uppercase bg-surface2 px-1.5 py-0.2 border border-theme-subtle">
                                  {employee.role || 'Machinist'}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted">
                                Skills: {Array.isArray(employee.skills) ? employee.skills.join(', ') : (employee.skills || 'All-round Machinist')}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold">
                              <span className="text-primary">{totalPlannedHours.toFixed(1)}h</span>
                              <span className="text-muted font-normal">/ {shiftHours}h</span>
                              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                                isOverloaded
                                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                                  : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              }`}>
                                {utilization}% Loaded
                              </span>
                            </div>
                            <div className="text-[10px] text-muted mt-0.5">
                              {remainingHours.toFixed(1)}h remaining shift availability
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-surface2 h-2.5 overflow-hidden mb-3 border border-theme-subtle">
                          <div
                            className={`h-full transition-all duration-300 ${isOverloaded ? 'bg-rose-500' : 'bg-purple-600'}`}
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>

                        {operations.length > 0 ? (
                          <div className="space-y-1.5 pt-2 border-t border-theme-subtle">
                            <div className="text-[10px] uppercase font-bold text-muted">
                              Allocated Work ({operations.length} jobs &bull; {totalPlannedHours.toFixed(1)} hrs):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {operations.map(op => (
                                <div
                                  key={op.id}
                                  className="p-2 bg-surface2/60 border border-theme-subtle flex items-center justify-between gap-1 text-[11px]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-primary truncate">
                                      {op.parentWo?.orderNo}: {op.operationName}
                                    </div>
                                    <div className="text-[10px] text-muted truncate">
                                      Planned: {op.plannedHours || 1.5}h &bull; Part: {op.parentWo?.productName}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignOp(op.id)}
                                    className="p-1 text-muted hover:text-rose-500 transition-colors"
                                    title="Unassign operation"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted italic text-center py-2 bg-surface2/30 border border-dashed border-theme-subtle">
                            No operations assigned to this machinist for {formatDate(selectedDate)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN STUDIO VIEW 2: 7-DAY MACHINE TIMELINE (GANTT VIEW) ──────── */}
      {viewMode === 'timeline' && (
        <div className="bg-surface border border-theme-subtle p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-theme-subtle">
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <CalendarDays size={18} className="text-purple-500" />
                7-Day Station Capacity Timeline &amp; Machine Gantt View
              </h3>
              <p className="text-xs text-muted">
                Visual day-by-day load distribution across all workstation centers starting from <strong className="text-primary">{formatDate(selectedDate)}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Shift Horizon: <strong className="text-primary">{shiftHours}h/day</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto border border-theme-subtle">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface2/80 border-b border-theme-subtle text-left">
                  <th className="p-3 font-bold text-primary w-48 border-r border-theme-subtle">Station Center</th>
                  {next7Days.map((dayStr, idx) => {
                    const d = new Date(dayStr);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const isToday = dayStr === new Date().toISOString().slice(0, 10);
                    return (
                      <th key={dayStr} className={`p-2.5 font-bold text-center border-r border-theme-subtle last:border-r-0 ${
                        isToday ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'text-primary'
                      }`}>
                        <div className="uppercase text-[10px] text-muted tracking-wider">{dayName}</div>
                        <div className="text-xs font-black">{dayStr.slice(5)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle">
                {machineries.map(machine => {
                  return (
                    <tr key={machine.id} className="hover:bg-surface2/30 transition-colors">
                      {/* Station Info Cell */}
                      <td className="p-3 border-r border-theme-subtle bg-surface align-top">
                        <div className="font-bold text-primary tracking-tight">{machine.name}</div>
                        <div className="text-[10px] text-muted uppercase font-mono">{machine.type || 'Machine'}</div>
                        <div className="text-[10px] text-secondary mt-1">Rs. {Number(machine.hourlyCost || 0).toLocaleString()}/hr</div>
                      </td>

                      {/* 7 Days Columns */}
                      {next7Days.map(dayStr => {
                        const dayOps = allOperations.filter(op => {
                          if (op.machineId !== machine.id) return false;
                          const opDate = op.scheduledStart ? op.scheduledStart.slice(0, 10) : '';
                          return opDate === dayStr;
                        });

                        const dayHrs = dayOps.reduce((s, it) => s + Number(it.plannedHours || 1.5), 0);
                        const dayUtil = Math.round((dayHrs / shiftHours) * 100);
                        const isOverloaded = dayHrs > shiftHours;

                        return (
                          <td 
                            key={dayStr} 
                            className={`p-2 border-r border-theme-subtle last:border-r-0 align-top transition-colors ${
                              isOverloaded ? 'bg-rose-500/5' : dayOps.length > 0 ? 'bg-surface' : 'bg-surface2/20'
                            }`}
                          >
                            {/* Day Header Status Bar */}
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                              <span className="font-bold text-primary">{dayHrs.toFixed(1)}h</span>
                              <span className={`px-1 py-0.2 font-bold text-[9px] border ${
                                isOverloaded
                                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                                  : dayHrs > 0
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'text-muted border-theme-subtle bg-surface'
                              }`}>
                                {dayUtil}%
                              </span>
                            </div>

                            {/* Mini Load Bar */}
                            <div className="w-full bg-surface2 h-1.5 overflow-hidden mb-2 border border-theme-subtle">
                              <div
                                className={`h-full ${isOverloaded ? 'bg-rose-500' : 'bg-purple-600'}`}
                                style={{ width: `${Math.min(100, dayUtil)}%` }}
                              />
                            </div>

                            {/* Scheduled Badges */}
                            <div className="space-y-1">
                              {dayOps.map(op => (
                                <div
                                  key={op.id}
                                  className="p-1 bg-surface2 border border-theme-subtle text-[10px] flex items-center justify-between gap-1 group"
                                >
                                  <span className="font-mono font-bold text-primary truncate" title={`${op.parentWo?.orderNo}: ${op.operationName}`}>
                                    {op.parentWo?.orderNo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignOp(op.id)}
                                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity"
                                    title="Unassign"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              {dayOps.length === 0 && (
                                <div className="text-[10px] text-muted italic text-center py-2">
                                  Free
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MAIN STUDIO VIEW 3: WORK ORDER ROUTING PIPELINE ──────────────── */}
      {viewMode === 'routing' && (
        <div className="bg-surface border border-theme-subtle p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-theme-subtle">
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <ListFilter size={18} className="text-purple-500" />
                Work Order Routing Pipeline &amp; Progressive Chain
              </h3>
              <p className="text-xs text-muted">
                Sequential progress of every manufacturing step from rough stock machining to final inspection.
              </p>
            </div>
            <div className="text-xs text-muted">
              Active Orders: <strong className="text-primary">{workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Closed').length}</strong>
            </div>
          </div>

          <div className="space-y-4">
            {workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Closed').map(wo => {
              const woOps = Array.isArray(wo.operations) ? wo.operations : [];
              const urgency = computeDueUrgency(wo.targetDate || wo.dueDate || wo.deliveryDate);
              const completedOpsCount = woOps.filter((o: any) => o.status === 'Completed' || o.status === 'Done').length;
              const progressPct = woOps.length > 0 ? Math.round((completedOpsCount / woOps.length) * 100) : 0;

              return (
                <div key={wo.id} className="p-4 bg-surface2/30 border border-theme-subtle space-y-3">
                  {/* WO Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-theme-subtle">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-surface px-2 py-0.5 border border-theme-subtle text-primary">
                        WO #{wo.orderNo || wo.id}
                      </span>
                      <h4 className="font-bold text-sm text-primary">
                        {wo.productName || wo.title || 'Component Assembly'}
                      </h4>
                      <span className="text-xs text-muted">
                        &bull; Qty: <strong className="text-secondary">{wo.quantity || wo.qty || 1} {wo.uom || 'Nos'}</strong>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 border ${urgency.badgeClass}`}>
                        {urgency.label} ({wo.targetDate ? formatDate(wo.targetDate) : 'No Target Date'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Progress: <strong className="text-primary">{completedOpsCount}/{woOps.length} Steps ({progressPct}%)</strong></span>
                    </div>
                  </div>

                  {/* Horizontal Sequential Stepper */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {woOps.map((op: any, oIdx: number) => {
                      const isAssigned = Boolean(op.machineId || op.employeeId);
                      const mach = machineries.find(m => m.id === op.machineId);
                      const isDone = op.status === 'Completed' || op.status === 'Done';

                      return (
                        <div
                          key={op.id || oIdx}
                          className={`p-3 border text-xs space-y-1.5 relative ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : isAssigned
                              ? 'bg-surface border-theme'
                              : 'bg-surface2 border-dashed border-theme-subtle'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">Step {op.stepNumber || (oIdx + 1) * 10}</span>
                            <span className="font-mono">{op.plannedHours || 1.5} hrs</span>
                          </div>

                          <div className="font-bold text-primary tracking-tight truncate">
                            {op.operationName || 'Machining'}
                          </div>

                          <div className="pt-1.5 border-t border-theme-subtle flex items-center justify-between text-[10px]">
                            {isDone ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle2 size={11} /> Completed
                              </span>
                            ) : isAssigned ? (
                              <span className="text-primary font-medium truncate">
                                {mach?.name || 'Assigned'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleOpenQuickAssign({ ...op, parentWo: wo }, e)}
                                className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                              >
                                + Assign Station
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL 1: BATCH ALLOCATION DRAWER ───────────────────────────────── */}
      {showBatchModal && (
        <Modal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          title={`Batch Allocate (${selectedOpIds.length}) Operations`}
          size="md"
        >
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 leading-relaxed">
              <strong className="block mb-0.5 font-bold">Multi-Order Batch Assignment:</strong>
              Allocate all {selectedOpIds.length} selected operations ({selectedBatchHours.toFixed(1)} planned hrs) to a single machine setup &amp; qualified machinist to eliminate tooling changeover downtime.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Target Machine Station <span className="text-purple-500">*</span>
              </label>
              <select
                value={batchMachineId}
                onChange={e => setBatchMachineId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-purple-500 outline-none font-bold"
              >
                {machineries.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type || 'Machine'}) &bull; Status: {m.status || 'Active'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Assigned Machinist / Operator <span className="text-purple-500">*</span>
              </label>
              <select
                value={batchEmployeeId}
                onChange={e => setBatchEmployeeId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-purple-500 outline-none font-bold"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role || 'Machinist'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-surface border border-theme-subtle px-3 py-1.5 text-primary focus:border-purple-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Shift Timing
                </label>
                <select className="w-full bg-surface border border-theme-subtle px-3 py-1.5 text-primary outline-none">
                  <option>Day Shift (08:00 - 17:00)</option>
                  <option>Night Shift (17:00 - 02:00)</option>
                  <option>Overtime / Weekend</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setShowBatchModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteBatchAssign}
                disabled={submittingBatch}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {submittingBatch ? 'Allocating...' : `Confirm Allocation (${selectedOpIds.length} Ops)`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: SINGLE OPERATION QUICK ASSIGN MODAL ───────────────────── */}
      {quickAssignOp && (
        <Modal
          isOpen={Boolean(quickAssignOp)}
          onClose={() => setQuickAssignOp(null)}
          title={`Assign Operation: ${quickAssignOp.operationName}`}
          size="md"
        >
          <div className="p-5 space-y-4 text-xs">
            {/* Quick Context Card */}
            <div className="p-3 bg-surface2/60 border border-theme-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">WO #{quickAssignOp.parentWo?.orderNo}</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{quickAssignOp.plannedHours || 1.5} hrs planned</span>
              </div>
              <div className="font-bold text-primary text-xs">{quickAssignOp.parentWo?.productName}</div>
              <div className="text-[11px] text-muted">Client: {quickAssignOp.parentWo?.customerName}</div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Select Machine Center <span className="text-purple-500">*</span>
              </label>
              <select
                value={quickMachineId}
                onChange={e => setQuickMachineId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-purple-500 outline-none font-bold"
              >
                {machineries.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type || 'Center'}) &bull; Status: {m.status || 'Active'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Select Qualified Machinist <span className="text-purple-500">*</span>
              </label>
              <select
                value={quickEmployeeId}
                onChange={e => setQuickEmployeeId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-purple-500 outline-none font-bold"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role || 'Machinist'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Schedule Target Date
              </label>
              <input
                type="date"
                value={quickScheduleDate}
                onChange={e => setQuickScheduleDate(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-1.5 text-primary focus:border-purple-500 outline-none font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-subtle">
              <Button variant="ghost" onClick={() => setQuickAssignOp(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveQuickAssign}
                disabled={submittingQuick}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {submittingQuick ? 'Saving...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: AI SMART SCHEDULING ASSISTANT ─────────────────────────── */}
      {showAiModal && (
        <Modal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          title="⚡ AI Smart Workshop Scheduling Assistant"
          size="lg"
        >
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-purple-600 dark:text-purple-300">
                <Sparkles size={16} />
                <span>AI Automated Production Optimization Engine</span>
              </div>
              The AI scheduling heuristic analyzed all active Work Orders, grouped common operations by tooling/material setup, matched certified machinists, prioritized soonest customer delivery dates, and balanced daily capacity across machine centers.
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
              {aiSuggestions.length === 0 ? (
                <div className="p-6 text-center text-muted border border-dashed border-theme-subtle">
                  All current operations are already scheduled! No pending optimizations needed.
                </div>
              ) : (
                aiSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface border border-theme-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-primary text-xs flex items-center gap-1.5">
                        <span className="font-mono bg-surface2 px-1.5 py-0.2 border border-theme-subtle">
                          {item.operation.parentWo?.orderNo}
                        </span>
                        <span>{item.operation.operationName}</span>
                      </div>
                      <div className="text-[11px] text-secondary mt-0.5">
                        Suggested Station: <strong className="text-primary">{item.suggestedMachine.name}</strong> &bull; Operator: <strong className="text-primary">{item.suggestedEmployee.name}</strong>
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        &bull; {item.reason}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-primary px-2 py-1 bg-surface2 border border-theme-subtle inline-block">
                        {item.plannedHours} hrs
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-theme-subtle">
              <span className="text-muted text-[11px]">
                {aiSuggestions.length} operations will be scheduled for <strong className="text-primary">{formatDate(selectedDate)}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setShowAiModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApplyAiSchedule}
                  disabled={applyingAi || aiSuggestions.length === 0}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {applyingAi ? 'Applying Schedule...' : `Approve & Apply AI Schedule (${aiSuggestions.length} Ops)`}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
