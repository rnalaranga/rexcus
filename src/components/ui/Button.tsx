import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md',
  icon: Icon, iconPosition = 'left', loading = false,
  className, disabled, ...props
}) => {
  const variants = {
    primary: 'bg-rex-700 hover:bg-rex-600 text-white border border-rex-700 shadow-glow-red-sm hover:shadow-glow-red',
    ghost:   'bg-transparent hover:bg-rex-500/6 text-secondary hover:text-primary border border-transparent hover:border-theme',
    danger:  'bg-rex-500/8 hover:bg-rex-500/15 text-rex-600 dark:text-rex-400 border border-rex-500/25 hover:border-rex-500/50',
    outline: 'bg-transparent hover:bg-rex-500/8 text-rex-600 dark:text-rex-400 border border-rex-500/40 hover:border-rex-600',
    subtle:  'bg-surface2 hover:bg-surface text-secondary hover:text-primary border border-theme hover:border-theme',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2.5',
  }
  const iconSizes = { sm: 12, md: 14, lg: 16 }

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin" width={iconSizes[size]} height={iconSizes[size]} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left'  && <Icon size={iconSizes[size]} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={iconSizes[size]} />}
    </button>
  )
}
