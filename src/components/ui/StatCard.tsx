import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'red' | 'glow'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon,
  trend, trendLabel, variant = 'default', className,
}) => {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0
  const isNeutral  = trend === 0

  const isRed = variant === 'red' || variant === 'glow'

  return (
    <div className={cn(
      'stat-card-hover p-5 border transition-all duration-200',
      isRed ? 'glass-red' : 'glass',
      variant === 'glow' && 'shadow-glow-red-sm',
      className,
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1.5">{title}</p>
          <p className={cn(
            'text-2xl font-bold tracking-tight',
            isRed ? 'text-rex-600 dark:text-rex-400' : 'text-primary',
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'flex-shrink-0 p-2.5 ml-3 border',
          isRed
            ? 'bg-rex-500/10 border-rex-500/25'
            : 'bg-surface2 border-theme',
        )}>
          <Icon
            size={18}
            className={isRed ? 'text-rex-600 dark:text-rex-400' : 'text-secondary'}
          />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5',
            isPositive && 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
            isNegative && 'text-rex-600 dark:text-rex-400 bg-rex-500/10',
            isNeutral  && 'text-muted bg-surface2',
          )}>
            {isPositive && <TrendingUp size={11} />}
            {isNegative && <TrendingDown size={11} />}
            {isNeutral  && <Minus size={11} />}
            {isPositive ? '+' : ''}{trend}%
          </div>
          {trendLabel && <span className="text-xs text-muted">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
