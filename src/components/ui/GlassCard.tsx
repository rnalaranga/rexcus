import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'red' | 'dark'
  hover?: boolean
  onClick?: () => void
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, className, variant = 'default', hover = false, onClick,
}) => {
  const variants = {
    default: 'glass',
    red:     'glass-red',
    dark:    'glass',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        variants[variant],
        hover && 'cursor-pointer transition-all duration-200 hover:border-rex-500/30 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
