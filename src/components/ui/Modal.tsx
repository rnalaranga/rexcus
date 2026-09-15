import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const isFullscreen = size === 'full'

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'w-full h-full',
  }

  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-surface animate-fade-in">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-theme-subtle flex-shrink-0 bg-surface">
          <h2 className="text-sm font-bold text-primary tracking-wide uppercase">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors p-1 hover:bg-surface2 rounded">
            <X size={18} />
          </button>
        </div>
        {/* Fullscreen body — no padding, children control layout */}
        <div className={cn('flex-1 overflow-hidden flex flex-col', className)}>
          {children}
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={cn(
        `relative bg-surface border border-theme w-full ${sizeClasses[size]} shadow-glass animate-fade-in flex flex-col max-h-[90vh]`,
        className
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-subtle flex-shrink-0">
          <h2 className="text-sm font-bold text-primary tracking-wide uppercase">{title}</h2>
          <button 
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
