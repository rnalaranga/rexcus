import React, { useState, useEffect, useMemo } from 'react';
import { 
  Factory, Calendar, Clock, CheckCircle2, AlertTriangle, User, Users, 
  Wrench, Settings, ArrowRight, Sparkles, Filter, Search, CheckSquare, 
  Square, ChevronRight, RotateCcw, AlertCircle, RefreshCw, Layers, 
  Cpu, Hash, ShieldCheck, Flame, Info, Check, X, ArrowUpRight, 
  BarChart3, TrendingUp, Zap, HelpCircle, ChevronDown
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

export const WorkshopPlanning: React.FC = () => {
  // Data State
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [machineries, setMachineries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Planning Horizon Controls
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftHours, setShiftHours] = useState<number>(8.0);
  const [viewGrouping, setViewGrouping] = useState<'machines' | 'operators'>('machines');

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Selection State for Batch Assignment
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMachineId, setBatchMachineId] = useState('');
  const [batchEmployeeId, setBatchEmployeeId] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // AI Optimizer State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [applyingAi, setApplyingAi] = useState(false);

  // Show Toast helper
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
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

  // Flatten all operations across active work orders
  const allOperations = useMemo(() => {
    const list: any[] = [];
    for (const wo of workOrders) {
      // Exclude completed or closed work orders from active planning
      if (wo.status === 'Completed' || wo.status === 'Closed') continue;

      const ops = Array.isArray(wo.operations) ? wo.operations : [];
      for (const op of ops) {
        list.push({
          ...op,
          parentWo: {
            id: wo.id,
            orderNo: wo.orderNo || wo.id,
            productName: wo.productName || wo.partName || wo.title || 'Component',
            customerName: wo.customerName || wo.customer || 'In-House',
            priority: wo.priority || 'Normal',
            targetDate: wo.targetDate || wo.dueDate || wo.deliveryDate,
            quantity: wo.quantity || wo.qty || 1,
            uom: wo.uom || 'Nos'
          }
        });
      }
    }
    return list;
  }, [workOrders]);

  // Filter operations for Operations Backlog
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

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const opText = `${op.operationName || ''} ${op.parentWo?.orderNo || ''} ${op.parentWo?.productName || ''} ${op.parentWo?.customerName || ''}`.toLowerCase();
        if (!opText.includes(q)) return false;
      }

      return true;
    });
  }, [allOperations, statusFilter, selectedCategory, searchQuery]);

  // Calculate Machine Scheduled Hours & Load for Selected Date
  const machineCapacities = useMemo(() => {
    return machineries.map(machine => {
      // Find all operations scheduled for this machine on selectedDate (or active in progress)
      const scheduledOps = allOperations.filter(op => {
        if (op.machineId !== machine.id) return false;
        if (!op.scheduledStart && !op.scheduledEnd) {
          // If no specific date assigned, check if active/scheduled
          return true;
        }
        const opDate = op.scheduledStart ? op.scheduledStart.slice(0, 10) : '';
        return opDate === selectedDate || !opDate;
      });

      const totalPlannedHours = scheduledOps.reduce((sum, it) => sum + Number(it.plannedHours || 1.5), 0);
      const utilization = Math.min(200, Math.round((totalPlannedHours / shiftHours) * 100));

      return {
        machine,
        operations: scheduledOps,
        totalPlannedHours,
        utilization,
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

      return {
        employee: emp,
        operations: scheduledOps,
        totalPlannedHours,
        utilization,
        isOverloaded: totalPlannedHours > shiftHours
      };
    });
  }, [employees, allOperations, selectedDate, shiftHours]);

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
      overloadedCount
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
      showToast('success', 'Operation unassigned');
      await loadData();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  // ── AI SMART SCHEDULING ENGINE ─────────────────────────────────────────────
  const generateAiSchedule = () => {
    // 1. Group unscheduled operations by operation nature (tooling & setup similarity)
    const unscheduled = allOperations.filter(op => !op.machineId && !op.employeeId);
    
    // Sort unscheduled by priority & due date
    const sorted = [...unscheduled].sort((a, b) => {
      const pMap: any = { Urgent: 3, High: 2, Normal: 1, Low: 0 };
      const pDiff = (pMap[b.parentWo?.priority] || 1) - (pMap[a.parentWo?.priority] || 1);
      if (pDiff !== 0) return pDiff;
      const d1 = new Date(a.parentWo?.targetDate || '2099-01-01').getTime();
      const d2 = new Date(b.parentWo?.targetDate || '2099-01-01').getTime();
      return d1 - d2;
    });

    const suggestions: any[] = [];
    const machineLoadMap = new Map<string, number>();
    for (const m of machineries) machineLoadMap.set(m.id, 0);

    for (const op of sorted) {
      const text = `${op.operationName || ''} ${op.station || ''}`.toLowerCase();
      
      // Match candidate machines based on type
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

      // Pick candidate operator
      let chosenEmployee = employees.find(e => {
        const skills = Array.isArray(e.skills) ? e.skills.join(' ').toLowerCase() : String(e.skills || '').toLowerCase();
        return skills.includes(chosenMachine?.type?.toLowerCase() || '') || skills.includes('machinist');
      }) || employees[0];

      if (chosenMachine && chosenEmployee) {
        const plannedHrs = Number(op.plannedHours || 1.5);
        const curLoad = machineLoadMap.get(chosenMachine.id) || 0;
        machineLoadMap.set(chosenMachine.id, curLoad + plannedHrs);

        suggestions.push({
          operation: op,
          suggestedMachine: chosenMachine,
          suggestedEmployee: chosenEmployee,
          plannedHours: plannedHrs,
          reason: op.parentWo?.priority === 'High' || op.parentWo?.priority === 'Urgent'
            ? `High Priority Order (#${op.parentWo?.orderNo}) scheduled first`
            : `Tooling Batching setup matching ${chosenMachine.name}`
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm font-medium shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── TOP HEADER & SUMMARY BAR ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-theme-subtle pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Factory size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                  Workshop Planning &amp; Job Scheduler
                </h1>
                <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold uppercase tracking-wider rounded-none">
                  AI Planning Studio
                </Badge>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                Aggregate shop floor operations across all active work orders, batch common setups, and optimize machine-operator capacity.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {/* Planning Date Selector */}
          <div className="flex items-center gap-1.5 bg-surface border border-theme-subtle px-2.5 py-1 text-xs text-primary">
            <Calendar size={13} className="text-muted" />
            <span className="font-semibold text-muted text-[11px]">Schedule Date:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer"
            />
          </div>

          {/* Shift Hours */}
          <div className="flex items-center gap-1 bg-surface border border-theme-subtle px-2.5 py-1 text-xs">
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
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
          >
            ⚡ AI Auto-Scheduler
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            className="text-xs"
            title="Refresh shop floor operations"
          >
            Refresh
          </Button>

          <PageHelpButton moduleId="production-planning" />
        </div>
      </div>

      {/* ── TOP KPI METRICS BAR ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Active Work Orders</div>
          <div className="text-xl font-black text-primary mt-1">{summaryMetrics.activeWorkOrdersCount}</div>
          <div className="text-[10px] text-secondary mt-0.5">Manufacturing jobs</div>
        </GlassCard>

        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Operations Backlog</div>
          <div className="text-xl font-black text-amber-500 mt-1">{summaryMetrics.unassignedCount}</div>
          <div className="text-[10px] text-secondary mt-0.5">Unscheduled operations</div>
        </GlassCard>

        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Scheduled Operations</div>
          <div className="text-xl font-black text-emerald-500 mt-1">{summaryMetrics.assignedCount}</div>
          <div className="text-[10px] text-secondary mt-0.5">Allocated to machines</div>
        </GlassCard>

        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Workshop Load</div>
          <div className={`text-xl font-black mt-1 ${
            summaryMetrics.avgUtilization > 90 ? 'text-red-500' : summaryMetrics.avgUtilization > 70 ? 'text-emerald-500' : 'text-blue-500'
          }`}>
            {summaryMetrics.avgUtilization}%
          </div>
          <div className="text-[10px] text-secondary mt-0.5">Capacity utilization</div>
        </GlassCard>

        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Available Machines</div>
          <div className="text-xl font-black text-primary mt-1">{machineries.length}</div>
          <div className="text-[10px] text-secondary mt-0.5">Shop floor stations</div>
        </GlassCard>

        <GlassCard className="p-3 border-theme">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Active Operators</div>
          <div className="text-xl font-black text-primary mt-1">{employees.length}</div>
          <div className="text-[10px] text-secondary mt-0.5">Qualified machinists</div>
        </GlassCard>
      </div>

      {/* ── MAIN WORKSPACE: DUAL PANELS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ════════════════ LEFT PANEL: OPERATIONS POOL (5 COLS) ════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard className="p-4 border-theme">
            {/* Header & Batch Action Button */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-theme-subtle">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <Layers size={15} className="text-rex-500" />
                  Operations Pool (Backlog)
                </h3>
                <p className="text-[11px] text-secondary mt-0.5">
                  Select and batch-allocate operations across Work Orders
                </p>
              </div>

              {selectedOpIds.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Zap}
                  onClick={openBatchAssign}
                  className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs shadow-md animate-pulse"
                >
                  Batch Assign ({selectedOpIds.length})
                </Button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-theme-subtle custom-scrollbar">
              {OP_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-rex-500 text-white border-rex-500 shadow-sm'
                        : 'bg-surface2 border-theme-subtle text-secondary hover:text-primary hover:border-theme'
                    }`}
                  >
                    <Icon size={11} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Status Filters */}
            <div className="flex items-center gap-2 pt-3 pb-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by WO#, component, or operation..."
                  className="w-full bg-surface border border-theme-subtle pl-8 pr-2.5 py-1 text-xs text-primary placeholder-muted outline-none focus:border-rex-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-surface border border-theme-subtle px-2 py-1 text-xs text-primary outline-none"
              >
                <option value="unassigned">Unscheduled</option>
                <option value="assigned">Scheduled</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Select All / Clear Row */}
            <div className="flex items-center justify-between text-[11px] text-muted py-1 px-1">
              <div>
                Showing <strong className="text-primary">{filteredOperations.length}</strong> operation(s)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-rex-600 dark:text-rex-400 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-muted hover:text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Operations Cards Scrollable List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 mt-2 custom-scrollbar">
              {filteredOperations.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs border border-dashed border-theme-subtle">
                  No operations match the selected criteria.
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
                      className={`p-3 border transition-all cursor-pointer select-none text-xs ${
                        isSelected
                          ? 'bg-rex-500/10 border-rex-500 shadow-sm'
                          : 'bg-surface/50 border-theme-subtle hover:border-theme hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSelectOp(op.id); }}
                          className="mt-0.5 text-rex-500"
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-muted" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Top Tag Row */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 bg-surface2 border border-theme-subtle text-primary">
                                {op.parentWo?.orderNo}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-1 py-0.2 border ${
                                op.parentWo?.priority === 'High' || op.parentWo?.priority === 'Urgent'
                                  ? 'border-red-500/30 text-red-500 bg-red-500/10'
                                  : 'border-theme-subtle text-muted bg-surface2'
                              }`}>
                                {op.parentWo?.priority}
                              </span>
                            </div>

                            <span className="font-mono font-bold text-xs text-primary flex items-center gap-1">
                              <Clock size={11} className="text-muted" />
                              {op.plannedHours || 1.5}h
                            </span>
                          </div>

                          {/* Operation Title */}
                          <div className="font-bold text-primary tracking-tight text-xs">
                            Step {op.stepNumber || 10}: {op.operationName || 'Machining Operation'}
                          </div>

                          {/* Work Order Part Info */}
                          <div className="text-[11px] text-muted truncate mt-0.5">
                            Part: <strong className="text-secondary">{op.parentWo?.productName}</strong> &bull; Qty: {op.parentWo?.quantity} {op.parentWo?.uom}
                          </div>

                          {/* Assignment Status Footer */}
                          <div className="mt-2 pt-2 border-t border-theme-subtle/60 flex items-center justify-between text-[10px]">
                            {isAssigned ? (
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                                <CheckCircle2 size={11} className="shrink-0" />
                                <span className="truncate">
                                  {assignedMach?.name || 'Machine'} &bull; {assignedEmp?.name || 'Operator'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-500 font-medium flex items-center gap-1">
                                <AlertTriangle size={11} /> Unscheduled
                              </span>
                            )}

                            <span className="text-muted">
                              Target: {op.parentWo?.targetDate ? formatDate(op.parentWo.targetDate) : 'TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* ════════════════ RIGHT PANEL: CAPACITY & LOAD MATRIX (7 COLS) ════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <GlassCard className="p-4 border-theme">
            {/* Header & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-subtle">
              <div>
                <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-purple-500" />
                  Workshop Load &amp; Machine Allocation Matrix
                </h3>
                <p className="text-[11px] text-secondary mt-0.5">
                  Scheduled capacity for <strong className="text-primary">{formatDate(selectedDate)}</strong> (Shift: {shiftHours}h)
                </p>
              </div>

              {/* View Grouping Pill Toggle */}
              <div className="flex items-center bg-surface2 p-0.5 border border-theme-subtle">
                <button
                  type="button"
                  onClick={() => setViewGrouping('machines')}
                  className={`px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
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
                  className={`px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
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
              <div className="space-y-3.5 pt-3 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
                {machineCapacities.map(({ machine, operations, totalPlannedHours, utilization, isOverloaded }) => {
                  return (
                    <div
                      key={machine.id}
                      className={`p-3.5 border transition-all ${
                        isOverloaded
                          ? 'bg-red-500/5 border-red-500/40'
                          : operations.length > 0
                          ? 'bg-surface/60 border-theme'
                          : 'bg-surface/30 border-theme-subtle'
                      }`}
                    >
                      {/* Machine Title & Capacity Meter */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 flex items-center justify-center font-bold text-xs border ${
                            isOverloaded
                              ? 'bg-red-500/10 text-red-500 border-red-500/30'
                              : 'bg-surface2 text-primary border-theme-subtle'
                          }`}>
                            <Cpu size={14} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-primary text-sm tracking-tight">{machine.name}</h4>
                              <span className="text-[10px] font-mono text-muted uppercase">[{machine.type || 'Machining'}]</span>
                            </div>
                            <span className="text-[10px] text-muted">
                              Model: {machine.model || '-'} &bull; Rate: Rs. {Number(machine.hourlyCost || 0).toLocaleString()}/hr
                            </span>
                          </div>
                        </div>

                        {/* Capacity Percentage Badge */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold">
                            <span className="text-primary">{totalPlannedHours.toFixed(1)}h</span>
                            <span className="text-muted font-normal">/ {shiftHours}h</span>
                            <span className={`px-1.5 py-0.2 text-[10px] font-bold border ${
                              isOverloaded
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : utilization >= 85
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : operations.length > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-surface2 text-muted border-theme-subtle'
                            }`}>
                              {utilization}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Capacity Progress Bar */}
                      <div className="w-full bg-surface2 h-2 overflow-hidden mb-3 border border-theme-subtle/50">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOverloaded
                              ? 'bg-red-500'
                              : utilization >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>

                      {/* Scheduled Operations Chips on this Machine */}
                      {operations.length > 0 ? (
                        <div className="space-y-1.5 pt-2 border-t border-theme-subtle/60">
                          <div className="text-[10px] uppercase font-bold text-muted flex items-center justify-between">
                            <span>Allocated Job Queue ({operations.length} operations):</span>
                            <span>Total: {totalPlannedHours.toFixed(1)} hrs</span>
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
                                    Part: {op.parentWo?.productName} ({op.plannedHours || 1.5}h)
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignOp(op.id)}
                                  className="p-1 text-muted hover:text-red-400 transition-colors"
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
                          No operations scheduled on this machine for {formatDate(selectedDate)} (Available for allocation)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── BY OPERATORS VIEW ── */}
            {viewGrouping === 'operators' && (
              <div className="space-y-3.5 pt-3 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
                {operatorCapacities.map(({ employee, operations, totalPlannedHours, utilization, isOverloaded }) => {
                  return (
                    <div
                      key={employee.id}
                      className={`p-3.5 border transition-all ${
                        isOverloaded
                          ? 'bg-red-500/5 border-red-500/40'
                          : operations.length > 0
                          ? 'bg-surface/60 border-theme'
                          : 'bg-surface/30 border-theme-subtle'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 flex items-center justify-center font-bold text-xs bg-surface2 text-primary border border-theme-subtle">
                            <User size={14} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-primary text-sm tracking-tight">{employee.name}</h4>
                              <span className="text-[10px] font-mono text-muted uppercase">[{employee.role || 'Machinist'}]</span>
                            </div>
                            <span className="text-[10px] text-muted">
                              Skills: {Array.isArray(employee.skills) ? employee.skills.join(', ') : (employee.skills || 'All-round Machinist')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-bold">
                            <span className="text-primary">{totalPlannedHours.toFixed(1)}h</span>
                            <span className="text-muted font-normal">/ {shiftHours}h</span>
                            <span className={`px-1.5 py-0.2 text-[10px] font-bold border ${
                              isOverloaded
                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : 'bg-surface2 text-primary border-theme-subtle'
                            }`}>
                              {utilization}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full bg-surface2 h-2 overflow-hidden mb-3 border border-theme-subtle/50">
                        <div
                          className={`h-full transition-all duration-300 ${isOverloaded ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>

                      {operations.length > 0 ? (
                        <div className="space-y-1.5 pt-2 border-t border-theme-subtle/60">
                          <div className="text-[10px] uppercase font-bold text-muted">
                            Assigned Work ({operations.length} jobs &bull; {totalPlannedHours.toFixed(1)} hrs):
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
                                    Planned: {op.plannedHours || 1.5}h
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignOp(op.id)}
                                  className="p-1 text-muted hover:text-red-400 transition-colors"
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
          </GlassCard>
        </div>
      </div>

      {/* ── MODAL: BATCH ALLOCATION DRAWER ─────────────────────────────────── */}
      {showBatchModal && (
        <Modal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          title={`Batch Allocate (${selectedOpIds.length}) Operations`}
          size="md"
        >
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 leading-relaxed">
              <strong className="block mb-0.5 font-bold">Multi-Order Batch Assignment:</strong>
              Allocate all {selectedOpIds.length} selected operations to a single machine setup &amp; qualified machinist to eliminate changeover downtime.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Target Machine Station <span className="text-rex-500">*</span>
              </label>
              <select
                value={batchMachineId}
                onChange={e => setBatchMachineId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-rex-500 outline-none font-medium"
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
                Assigned Machinist / Operator <span className="text-rex-500">*</span>
              </label>
              <select
                value={batchEmployeeId}
                onChange={e => setBatchEmployeeId(e.target.value)}
                className="w-full bg-surface border border-theme-subtle px-3 py-2 text-primary focus:border-rex-500 outline-none font-medium"
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
                  className="w-full bg-surface border border-theme-subtle px-3 py-1.5 text-primary focus:border-rex-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                  Shift Timing
                </label>
                <select className="w-full bg-surface border border-theme-subtle px-3 py-1.5 text-primary outline-none">
                  <option>Day Shift (08:00 - 17:00)</option>
                  <option>Night Shift (17:00 - 02:00)</option>
                  <option>Overtime / Saturday</option>
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
                className="bg-rex-600 hover:bg-rex-700 text-white font-bold"
              >
                {submittingBatch ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: AI SMART SCHEDULING ASSISTANT ────────────────────────────── */}
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
                <span>AI Automated Production Optimization</span>
              </div>
              The AI heuristic engine analyzed all active Work Orders, grouped common operations by tooling/material setup, matched certified machinists, and balanced daily capacity.
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
                        Suggested: <strong className="text-primary">{item.suggestedMachine.name}</strong> &bull; Operator: <strong className="text-primary">{item.suggestedEmployee.name}</strong>
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
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {applyingAi ? 'Applying Schedule...' : 'Approve & Apply AI Schedule'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
