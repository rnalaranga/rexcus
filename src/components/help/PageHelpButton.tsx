import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpGuideModal } from './HelpGuideModal'

interface PageHelpButtonProps {
  className?: string
  title?: string
  moduleId?: string
}

export const PageHelpButton: React.FC<PageHelpButtonProps> = ({
  className = '',
  title = 'Help & Workflow Guide',
  moduleId
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={title}
        className={`h-8 px-2.5 rounded-none border border-theme-subtle hover:border-theme bg-surface hover:bg-surface2 text-muted hover:text-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${className}`}
      >
        <span className="font-mono font-bold text-[11px] text-secondary">?</span>
        <span className="text-xs font-semibold hidden md:inline">Help</span>
      </button>

      <HelpGuideModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentPath={location.pathname}
        defaultModuleId={moduleId}
      />
    </>
  )
}
