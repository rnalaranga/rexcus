import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, ChevronRight } from 'lucide-react'

export interface WorkflowPipelineBannerProps {
  activeStage: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

interface StageConfig {
  id: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  shortLabel: string
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
    shortLabel: 'Quotation',
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
    shortLabel: 'Sales Order',
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
    label: 'Advance Proforma',
    shortLabel: 'Proforma',
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
    shortLabel: 'Work Order',
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
    shortLabel: 'Dispatch & DN',
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
    shortLabel: 'Tax Invoice',
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

  const handleStageClick = (stage: StageConfig) => {
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

      {/* Pipeline Stages Flow - Fully Flex Responsive (No horizontal scroll on desktop) */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-none">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isActive = stage.id === activeStage
          const isPassed = stage.id < activeStage

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => handleStageClick(stage)}
                title={`Navigate to Stage ${stage.id}: ${stage.label}`}
                className={`group flex-1 min-w-0 flex items-center justify-between sm:justify-start gap-1.5 px-2 py-1.5 border text-left transition-all cursor-pointer rounded-none select-none ${
                  isActive
                    ? `${stage.color.activeBg} ${stage.color.activeBorder} shadow-sm ring-1 ring-rex-500/20`
                    : 'bg-surface2/40 hover:bg-surface2 border-theme-subtle hover:border-theme text-secondary'
                }`}
              >
                {/* Stage Number Badge */}
                <span
                  className={`w-4 h-4 rounded-none flex items-center justify-center font-mono text-[9px] font-bold shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? stage.color.badgeBg
                      : isPassed
                      ? 'bg-secondary/15 text-primary border border-secondary/20 font-bold'
                      : 'bg-surface text-muted border border-theme-subtle'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 size={11} className="text-emerald-500" />
                  ) : (
                    stage.id
                  )}
                </span>

                {/* Stage Label */}
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <span
                    className={`text-xs whitespace-nowrap tracking-tight truncate ${
                      isActive
                        ? stage.color.activeText
                        : 'text-primary/90 group-hover:text-primary font-medium'
                    }`}
                  >
                    <span className="hidden xl:inline">{stage.label}</span>
                    <span className="inline xl:hidden">{stage.shortLabel}</span>
                  </span>
                  {isActive && (
                    <span className="text-[8.5px] uppercase tracking-widest font-mono font-bold px-1 py-0.2 rounded-none bg-primary text-surface dark:bg-white dark:text-black hidden sm:inline-block">
                      Active
                    </span>
                  )}
                </div>
              </button>

              {idx < WORKFLOW_STAGES.length - 1 && (
                <ChevronRight
                  size={12}
                  className={`shrink-0 ${
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
