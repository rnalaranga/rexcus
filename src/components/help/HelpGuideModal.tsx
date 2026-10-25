import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle, X, Search, ChevronRight, ArrowRight, CheckCircle2,
  FileText, ShoppingBag, Receipt, Factory, Package, Truck,
  Users, DollarSign, Shield, Sparkles, Printer, ExternalLink,
  BookOpen, Layers, Info, Check, AlertCircle, Compass, ListOrdered,
  MousePointerClick, CheckSquare, HelpCircle as QuestionIcon
} from 'lucide-react'
import { HELP_GUIDES, HelpGuideItem, getHelpGuideForPath, HelpWorkflowStep, HelpActionItem, HelpHowToStep } from './helpGuideData'
import { Button } from '@/components/ui/Button'

interface HelpGuideModalProps {
  isOpen: boolean
  onClose: () => void
  currentPath?: string
  defaultModuleId?: string
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  currentPath = window.location.pathname,
  defaultModuleId
}) => {
  const navigate = useNavigate()

  // Detected guide based on current active route or explicit defaultModuleId
  const detectedGuide = useMemo(() => {
    if (defaultModuleId) {
      const found = HELP_GUIDES.find(g => g.id === defaultModuleId)
      if (found) return found
    }
    return getHelpGuideForPath(currentPath)
  }, [currentPath, defaultModuleId])
  
  // Selected guide (defaults to current page guide, can be switched by user)
  const [selectedGuideId, setSelectedGuideId] = useState<string>(detectedGuide.id)
  const [activeTab, setActiveTab] = useState<'workflow' | 'howto' | 'actions' | 'faq'>('workflow')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync selected guide when currentPath changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const found = defaultModuleId ? HELP_GUIDES.find(g => g.id === defaultModuleId) : null
      const guide = found || getHelpGuideForPath(currentPath)
      setSelectedGuideId(guide.id)
      setActiveTab('workflow')
      setSearchQuery('')
    }
  }, [isOpen, currentPath, defaultModuleId])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const activeGuide = useMemo(() => {
    return HELP_GUIDES.find(g => g.id === selectedGuideId) || detectedGuide
  }, [selectedGuideId, detectedGuide])

  // Filtered guides list for search
  const filteredGuidesList = useMemo(() => {
    if (!searchQuery.trim()) return HELP_GUIDES
    const q = searchQuery.toLowerCase()
    return HELP_GUIDES.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.actions.some(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    )
  }, [searchQuery])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-5xl h-[88vh] bg-surface border border-theme shadow-2xl flex flex-col rounded-none overflow-hidden text-primary animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar - Clean Subdued Professional Styling */}
        <div className="px-5 py-3.5 bg-surface border-b border-theme-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-surface2 border border-theme-subtle text-primary flex items-center justify-center font-bold text-sm shrink-0">
              <BookOpen size={16} className="text-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-primary tracking-tight">Rex ERP Operational Help & Workflow Guide</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-surface2 text-secondary border border-theme-subtle font-mono uppercase">
                  Active Screen
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Step-by-step instructions, business workflows, button functions & system guides
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="h-7 text-xs px-2 border border-theme-subtle rounded-none hover:bg-surface2 hidden sm:flex"
            >
              Print Guide
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 rounded-none border border-theme-subtle transition-colors cursor-pointer"
              title="Close Guide (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search & Module Navigation Bar */}
        <div className="px-5 py-2.5 bg-surface2/40 border-b border-theme-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Quick Module Switcher Dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 font-mono">Module:</span>
            <select
              value={selectedGuideId}
              onChange={e => setSelectedGuideId(e.target.value)}
              className="bg-surface border border-theme-subtle px-2.5 py-1 text-xs font-semibold text-primary rounded-none outline-none focus:border-theme max-w-sm truncate cursor-pointer"
            >
              {HELP_GUIDES.map(g => (
                <option key={g.id} value={g.id}>
                  {g.category} &rsaquo; {g.title}
                </option>
              ))}
            </select>

            {detectedGuide.id !== selectedGuideId && (
              <button
                type="button"
                onClick={() => setSelectedGuideId(detectedGuide.id)}
                className="text-[11px] font-semibold text-primary underline hover:text-secondary shrink-0 cursor-pointer"
              >
                Reset to Current Window
              </button>
            )}
          </div>

          {/* Quick Filter Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={13} className="absolute left-2.5 top-2 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help topics or actions..."
              className="w-full bg-surface border border-theme-subtle rounded-none pl-8 pr-2.5 py-1 text-xs text-primary outline-none focus:border-theme placeholder:text-muted"
            />
          </div>
        </div>

        {/* Guide Summary Banner */}
        <div className="px-5 py-3 bg-surface border-b border-theme-subtle shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none bg-surface2 text-muted border border-theme-subtle font-mono">
                  {activeGuide.category}
                </span>
                <h3 className="text-base font-bold text-primary">{activeGuide.title}</h3>
              </div>
              <p className="text-xs text-secondary mt-1 max-w-3xl leading-relaxed">
                {activeGuide.summary}
              </p>
            </div>

            {/* View Tabs - Clean Subdued Segmented Control */}
            <div className="flex items-center gap-1 shrink-0 border border-theme-subtle bg-surface2/60 p-0.5 rounded-none self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('workflow')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer ${
                  activeTab === 'workflow'
                    ? 'bg-surface text-primary shadow-xs border border-theme-subtle'
                    : 'text-muted hover:text-primary hover:bg-surface/50 border border-transparent'
                }`}
              >
                🗺️ Lifecycle Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('howto')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer ${
                  activeTab === 'howto'
                    ? 'bg-surface text-primary shadow-xs border border-theme-subtle'
                    : 'text-muted hover:text-primary hover:bg-surface/50 border border-transparent'
                }`}
              >
                📋 How to Do It
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer ${
                  activeTab === 'actions'
                    ? 'bg-surface text-primary shadow-xs border border-theme-subtle'
                    : 'text-muted hover:text-primary hover:bg-surface/50 border border-transparent'
                }`}
              >
                🔘 Buttons & Features ({activeGuide.actions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faq')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-surface text-primary shadow-xs border border-theme-subtle'
                    : 'text-muted hover:text-primary hover:bg-surface/50 border border-transparent'
                }`}
              >
                💡 Tips & FAQ ({activeGuide.tips.length + activeGuide.faq.length})
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-base/30">
          {/* TAB 1: VISUAL WORKFLOW LIFECYCLE FLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-surface border border-theme-subtle p-4 rounded-none">
                <div className="flex items-center justify-between mb-3 border-b border-theme-subtle pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Compass size={16} className="text-secondary" />
                      {activeGuide.workflowDiagram.title}
                    </h4>
                    <p className="text-[11px] text-muted">{activeGuide.workflowDiagram.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted uppercase">
                    {activeGuide.workflowDiagram.steps.length} sequential stages
                  </span>
                </div>

                {/* Subdued Professional Grid Flow Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative">
                  {activeGuide.workflowDiagram.steps.map((step: HelpWorkflowStep) => {
                    return (
                      <div
                        key={step.stepNumber}
                        className="p-3.5 bg-surface border border-theme-subtle hover:border-theme relative rounded-none flex flex-col justify-between transition-all duration-150 hover:shadow-xs"
                      >
                        <div>
                          {/* Step Header */}
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-theme-subtle/50">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-none bg-surface2 text-primary border border-theme-subtle flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                                {step.stepNumber}
                              </span>
                              <h5 className="font-bold text-xs text-primary tracking-tight">{step.title}</h5>
                            </div>

                            {step.statusBadge && (
                              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-none bg-surface2 text-muted border border-theme-subtle uppercase">
                                {step.statusBadge}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-secondary leading-relaxed mb-3">
                            {step.description}
                          </p>
                        </div>

                        {/* Step Footer: Responsible Actor & Next Steps */}
                        <div className="pt-2 border-t border-theme-subtle/40 flex items-center justify-between text-[10px]">
                          <span className="font-medium text-muted flex items-center gap-1 font-mono">
                            👤 {step.actor}
                          </span>

                          {step.nextSteps && step.nextSteps.length > 0 && (
                            <span className="font-bold font-mono text-primary flex items-center gap-1">
                              &rarr; {step.nextSteps[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Related Modules Banner */}
              {activeGuide.relatedModules && activeGuide.relatedModules.length > 0 && (
                <div className="p-3.5 bg-surface border border-theme-subtle rounded-none flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-secondary" />
                    <span className="text-xs font-bold text-primary">Connected System Modules:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeGuide.relatedModules.map((m: { title: string; route: string }, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(m.route);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-surface2 hover:bg-surface text-secondary hover:text-primary border border-theme-subtle rounded-none transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{m.title}</span>
                        <ExternalLink size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP HOW-TO GUIDE ("KOHOMADA KARANNE") */}
          {activeTab === 'howto' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1 font-mono">
                Step-by-Step Operating Instructions:
              </div>

              {activeGuide.howToSteps && activeGuide.howToSteps.length > 0 ? (
                <div className="space-y-3">
                  {activeGuide.howToSteps.map((step: HelpHowToStep, idx: number) => (
                    <div key={idx} className="p-4 bg-surface border border-theme-subtle rounded-none space-y-2">
                      <div className="flex items-center gap-2.5 border-b border-theme-subtle pb-2">
                        <span className="w-5 h-5 rounded-none bg-surface2 border border-theme-subtle text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{step.title}</h4>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {step.instructions.map((inst: string, iIdx: number) => (
                          <div key={iIdx} className="flex items-start gap-2 text-xs text-secondary leading-relaxed">
                            <span className="text-muted shrink-0 mt-0.5">•</span>
                            <span>{inst}</span>
                          </div>
                        ))}
                      </div>
                      {step.importantNote && (
                        <div className="mt-2 p-2 bg-surface2/60 border border-theme-subtle text-[11px] text-muted flex items-start gap-1.5">
                          <Info size={12} className="text-secondary shrink-0 mt-0.5" />
                          <span><strong>Note:</strong> {step.importantNote}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Auto-generated step checklist from workflow stages */
                <div className="space-y-3">
                  {activeGuide.workflowDiagram.steps.map((st: HelpWorkflowStep, idx: number) => (
                    <div key={idx} className="p-4 bg-surface border border-theme-subtle rounded-none space-y-2">
                      <div className="flex items-center justify-between border-b border-theme-subtle pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-none bg-surface2 border border-theme-subtle text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-primary">{st.title}</h4>
                        </div>
                        <span className="text-[10px] font-mono text-muted uppercase">Role: {st.actor}</span>
                      </div>
                      <p className="text-xs text-secondary leading-relaxed">{st.description}</p>
                      {st.nextSteps && st.nextSteps.length > 0 && (
                        <div className="text-[11px] text-muted font-mono pt-1">
                          <strong>Next Stage:</strong> {st.nextSteps.join(' ➔ ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUTTONS & ACTIONS BREAKDOWN ("MONAWADA BUTTON") */}
          {activeTab === 'actions' && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 font-mono">
                Every Action, Button & Menu Item in this Window:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeGuide.actions.map((act: HelpActionItem, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 bg-surface border border-theme-subtle rounded-none space-y-2 hover:border-theme transition-colors shadow-xs"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-theme-subtle">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-secondary shrink-0" />
                        {act.name}
                      </span>
                      {act.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface2 border border-theme-subtle text-muted rounded-none">
                          {act.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">
                      {act.description}
                    </p>

                    <div className="p-2 bg-surface2/40 border border-theme-subtle text-[11px] text-muted">
                      <strong className="text-primary font-semibold font-mono">How to use: </strong>
                      {act.howTo}
                    </div>

                    {act.rolesAllowed && (
                      <div className="text-[10px] text-muted font-mono">
                        <span>Authorized Roles: </span>
                        <span className="font-semibold text-secondary">{act.rolesAllowed}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BEST PRACTICES & FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-5 animate-fade-in">
              {/* Pro Tips Section */}
              <div className="p-4 bg-surface border border-theme-subtle rounded-none space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Sparkles size={13} className="text-secondary" />
                  Operational Best Practices & Tips
                </h4>
                <div className="space-y-2.5">
                  {activeGuide.tips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-secondary">
                      <span className="w-4 h-4 rounded-none bg-surface2 border border-theme-subtle text-primary font-bold flex items-center justify-center shrink-0 text-[10px] font-mono mt-0.5">
                        {i + 1}
                      </span>
                      <p className="leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              {activeGuide.faq.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider font-mono">
                    Frequently Asked Questions:
                  </h4>
                  {activeGuide.faq.map((item: { question: string; answer: string }, i: number) => (
                    <div key={i} className="p-4 bg-surface border border-theme-subtle rounded-none space-y-1.5">
                      <h5 className="font-bold text-xs text-primary flex items-center gap-2">
                        <span className="font-mono text-muted">Q:</span>
                        {item.question}
                      </h5>
                      <p className="text-xs text-secondary pl-5 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-surface2/40 border-t border-theme-subtle flex items-center justify-between text-[11px] text-muted shrink-0">
          <span>Keyboard Shortcut: Press <kbd className="px-1.5 py-0.5 bg-surface border border-theme-subtle rounded-none font-mono text-[10px]">?</kbd> or <kbd className="px-1.5 py-0.5 bg-surface border border-theme-subtle rounded-none font-mono text-[10px]">F1</kbd> to toggle help anywhere</span>
          <Button variant="primary" size="sm" onClick={onClose} className="h-6 text-xs px-3 rounded-none font-bold">
            Close Guide (Esc)
          </Button>
        </div>
      </div>
    </div>
  , document.body)
}
