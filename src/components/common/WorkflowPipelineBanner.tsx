import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'

export interface WorkflowPipelineBannerProps {
  activeStage: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

interface StageConfig {
  id: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  subtitle: string
  path: string
  color: {
    activeBorder: string
    activeBg: string
    activeText: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
}

export const WORKFLOW_STAGES: StageConfig[] = [
  {
    id: 1,
    label: 'Quotation',
    subtitle: 'Costing & Estimates',
    path: '/crm/quotations',
    color: {
      activeBorder: 'border-blue-500/60 dark:border-blue-400/60',
      activeBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      activeText: 'text-blue-700 dark:text-blue-300 font-bold',
      badgeBg: 'bg-blue-500 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-blue-400'
    }
  },
  {
    id: 2,
    label: 'Sales Order (SO)',
    subtitle: 'Confirmed Commercial Orders',
    path: '/crm/sales-orders',
    color: {
      activeBorder: 'border-sky-500/60 dark:border-sky-400/60',
      activeBg: 'bg-sky-500/10 dark:bg-sky-500/15',
      activeText: 'text-sky-700 dark:text-sky-300 font-bold',
      badgeBg: 'bg-sky-500 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-sky-400'
    }
  },
  {
    id: 3,
    label: 'Advance Proforma (Advance)',
    subtitle: 'Advance Billing & Collection',
    path: '/crm/sales-orders?tab=proformas',
    color: {
      activeBorder: 'border-purple-500/60 dark:border-purple-400/60',
      activeBg: 'bg-purple-500/10 dark:bg-purple-500/15',
      activeText: 'text-purple-700 dark:text-purple-300 font-bold',
      badgeBg: 'bg-purple-600 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-purple-400'
    }
  },
  {
    id: 4,
    label: 'Work Order (BOM & Routing)',
    subtitle: 'Shop Floor & Machining',
    path: '/production/work-orders',
    color: {
      activeBorder: 'border-amber-500/60 dark:border-amber-400/60',
      activeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      activeText: 'text-amber-700 dark:text-amber-300 font-bold',
      badgeBg: 'bg-amber-500 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-amber-400'
    }
  },
  {
    id: 5,
    label: 'Partial / Full Dispatch (DN)',
    subtitle: 'Material Issue & Delivery Note',
    path: '/inventory/material-issue',
    color: {
      activeBorder: 'border-teal-500/60 dark:border-teal-400/60',
      activeBg: 'bg-teal-500/10 dark:bg-teal-500/15',
      activeText: 'text-teal-700 dark:text-teal-300 font-bold',
      badgeBg: 'bg-teal-600 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-teal-400'
    }
  },
  {
    id: 6,
    label: 'Final Tax Invoice',
    subtitle: 'Billing & AR Settlement',
    path: '/finance/invoices',
    color: {
      activeBorder: 'border-emerald-500/60 dark:border-emerald-400/60',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      activeText: 'text-emerald-700 dark:text-emerald-300 font-bold',
      badgeBg: 'bg-emerald-600 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-emerald-400'
    }
  }
]

export const WorkflowPipelineBanner: React.FC<WorkflowPipelineBannerProps> = ({
  activeStage,
  className = ''
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleStageClick = (stage: StageConfig) => {
    // If it's stage 3 or 2 and we are on the same page, we can also dispatch event or let query param update
    navigate(stage.path)
  }

  return (
    <div className={`w-full bg-surface border border-theme-subtle p-2 sm:p-2.5 shadow-2xs ${className}`}>
      {/* Top Label & Active Stage Info */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-theme-subtle/50 text-[10px] font-mono uppercase tracking-wider text-muted">
        <span className="flex items-center gap-1.5 font-semibold text-secondary">
          <span className="w-2 h-2 rounded-full bg-rex-500 animate-pulse inline-block" />
          Manufacturing & Commercial Workflow Pipeline
        </span>
        <span className="text-secondary font-sans font-medium hidden sm:inline-block">
          Click any stage to switch views
        </span>
      </div>

      {/* Pipeline Stages Flow */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isActive = stage.id === activeStage
          const isPassed = stage.id < activeStage

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => handleStageClick(stage)}
                title={`Navigate to Stage ${stage.id}: ${stage.label}`}
                className={`group shrink-0 flex items-center gap-2 px-2.5 py-1.5 border text-left transition-all cursor-pointer rounded-none select-none ${
                  isActive
                    ? `${stage.color.activeBg} ${stage.color.activeBorder} shadow-sm ring-1 ring-rex-500/20`
                    : 'bg-surface2/40 hover:bg-surface2 border-theme-subtle hover:border-theme text-secondary'
                }`}
              >
                {/* Stage Number Badge */}
                <span
                  className={`w-5 h-5 rounded-none flex items-center justify-center font-mono text-[10px] font-bold shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? stage.color.badgeBg
                      : isPassed
                      ? 'bg-secondary/15 text-primary border border-secondary/20 font-bold'
                      : 'bg-surface text-muted border border-theme-subtle'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  ) : (
                    stage.id
                  )}
                </span>

                {/* Stage Info */}
                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs whitespace-nowrap tracking-tight font-medium ${
                        isActive
                          ? stage.color.activeText
                          : 'text-primary/90 group-hover:text-primary font-semibold'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] uppercase tracking-widest font-mono font-bold px-1 py-0.2 rounded-none bg-primary text-surface dark:bg-white dark:text-black">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {idx < WORKFLOW_STAGES.length - 1 && (
                <ChevronRight
                  size={14}
                  className={`shrink-0 mx-0.5 ${
                    isPassed ? 'text-emerald-500/70' : 'text-muted/40'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
