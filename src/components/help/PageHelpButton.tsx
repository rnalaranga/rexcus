import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpGuideModal } from './HelpGuideModal'

interface PageHelpButtonProps {
  className?: string
  title?: string
}

export const PageHelpButton: React.FC<PageHelpButtonProps> = ({
  className = '',
  title = 'Help & Workflow Guide'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={title}
        className={`w-7 h-7 rounded-full border border-theme-subtle hover:border-rex-500/50 hover:bg-rex-500/10 text-muted hover:text-rex-600 dark:hover:text-rex-400 font-bold text-xs flex items-center justify-center transition-all shadow-xs ${className}`}
      >
        ?
      </button>

      <HelpGuideModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentPath={location.pathname}
      />
    </>
  )
}
