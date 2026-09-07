import React from 'react'
import { cn } from '@/lib/utils'

const variantStyles: Record<string, string> = {
  // Customer status
  active:      'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  inactive:    'bg-surface2 text-muted border border-theme',
  prospect:    'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  vip:         'bg-rex-500/12 text-rex-700 dark:text-rex-300 border border-rex-500/30',

  // Lead/Deal stage
  new:         'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  contacted:   'bg-purple-500/12 text-purple-700 dark:text-purple-400 border border-purple-500/25',
  qualified:   'bg-cyan-500/12 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25',
  proposal:    'bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25',
  negotiation: 'bg-orange-500/12 text-orange-700 dark:text-orange-400 border border-orange-500/25',
  contract:    'bg-indigo-500/12 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25',
  prospecting: 'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  won:         'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  lost:        'bg-rex-500/10 text-rex-700 dark:text-rex-400 border border-rex-500/25',

  // Priority
  critical:    'bg-rex-500/15 text-rex-700 dark:text-rex-300 border border-rex-500/40',
  high:        'bg-orange-500/12 text-orange-700 dark:text-orange-400 border border-orange-500/25',
  medium:      'bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25',
  low:         'bg-surface2 text-muted border border-theme',

  // Segment
  enterprise:  'bg-violet-500/12 text-violet-700 dark:text-violet-400 border border-violet-500/25',
  sme:         'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  retail:      'bg-teal-500/12 text-teal-700 dark:text-teal-400 border border-teal-500/25',

  // Generic
  default:     'bg-surface2 text-secondary border border-theme',
  red:         'bg-rex-500/12 text-rex-700 dark:text-rex-300 border border-rex-500/30',
  green:       'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  yellow:      'bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25',
  blue:        'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  gray:        'bg-surface2 text-muted border border-theme',
  
  // Semantic
  success:     'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  info:        'bg-blue-500/12 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  warning:     'bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25',
  error:       'bg-rex-500/12 text-rex-700 dark:text-rex-300 border border-rex-500/30',
  outline:     'bg-transparent text-secondary border border-theme-subtle',
}

const labelMap: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', prospect: 'Prospect', vip: '⭐ VIP',
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', negotiation: 'Negotiation', contract: 'Contract',
  won: 'Won ✓', lost: 'Lost', closed_won: 'Won ✓', closed_lost: 'Lost', prospecting: 'Prospecting',
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
  enterprise: 'Enterprise', sme: 'SME', retail: 'Retail',
}

interface BadgeProps {
  value?: string
  label?: string
  variant?: string
  className?: string
  size?: 'sm' | 'md'
  children?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ value, label, variant, className, size = 'sm', children }) => {
  const styleKey = variant || value || 'default'
  const style = variantStyles[styleKey] || variantStyles.default
  
  let text: React.ReactNode = children
  
  if (!text) {
    text = label || (value ? labelMap[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : '')
  }

  return (
    <span className={cn(
      'inline-flex items-center font-semibold tracking-wide uppercase rounded',
      size === 'sm' ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1',
      style, className,
    )}>
      {text}
    </span>
  )
}
