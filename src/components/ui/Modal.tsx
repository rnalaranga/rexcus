import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  allowMaximize?: boolean
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className, 
  size = 'md',
  allowMaximize = true
}) => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setIsMaximized(false)
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
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    '4xl': 'max-w-7xl',
    '5xl': 'max-w-[96vw] 2xl:max-w-[1560px]',
    full: 'w-full h-full',
  }

  const hasCustomMaxWidth = className && /\bmax-w-/.test(className)

  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col bg-surface animate-fade-in">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-theme-subtle flex-shrink-0 bg-surface">
          <h2 className="text-sm font-bold text-primary tracking-wide uppercase">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors p-1 hover:bg-surface2 rounded-none">
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-5">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={cn(
        'relative bg-surface border border-theme w-full shadow-2xl animate-fade-in flex flex-col transition-all duration-200 overflow-hidden',
        isMaximized 
          ? 'max-w-[99vw] h-[96vh] max-h-[96vh] rounded-none' 
          : cn('max-h-[92vh] rounded-none', !hasCustomMaxWidth && (sizeClasses[size] || 'max-w-lg')),
        className
      )}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-subtle flex-shrink-0 bg-surface2/30">
          <h2 className="text-sm font-bold text-primary tracking-wide uppercase truncate pr-4">{title}</h2>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {allowMaximize && (
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restore standard size" : "Expand width (Full View)"}
                className="p-1.5 rounded-none text-muted hover:text-primary hover:bg-surface2 transition-colors"
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-none text-muted hover:text-primary hover:bg-surface2 transition-colors"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
