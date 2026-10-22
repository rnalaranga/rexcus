import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle, X, Search, ChevronRight, ArrowRight, CheckCircle2,
  FileText, ShoppingBag, Receipt, Factory, Package, Truck,
  Users, DollarSign, Shield, Sparkles, Printer, ExternalLink,
  BookOpen, Layers, Info, Check, AlertCircle, Compass
} from 'lucide-react'
import { HELP_GUIDES, HelpGuideItem, getHelpGuideForPath } from './helpGuideData'
import { Button } from '@/components/ui/Button'

interface HelpGuideModalProps {
  isOpen: boolean
  onClose: () => void
  currentPath?: string
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  currentPath = window.location.pathname
}) => {
  const navigate = useNavigate()

  // Detected guide based on current active route
  const detectedGuide = useMemo(() => getHelpGuideForPath(currentPath), [currentPath])
  
  // Selected guide (defaults to current page guide, can be switched by user)
  const [selectedGuideId, setSelectedGuideId] = useState<string>(detectedGuide.id)
  const [activeTab, setActiveTab] = useState<'workflow' | 'actions' | 'tips' | 'faq'>('workflow')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync selected guide when currentPath changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const guide = getHelpGuideForPath(currentPath)
      setSelectedGuideId(guide.id)
      setActiveTab('workflow')
      setSearchQuery('')
    }
  }, [isOpen, currentPath])

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

  const getStepColorClass = (color: string) => {
    switch (color) {
      case 'emerald':
        return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
      case 'blue':
        return 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400'
      case 'amber':
        return 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
      case 'purple':
        return 'border-purple-500/40 bg-purple-500/5 text-purple-700 dark:text-purple-400'
      case 'indigo':
        return 'border-indigo-500/40 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400'
      case 'rose':
        return 'border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400'
      default:
        return 'border-rex-500/40 bg-rex-500/5 text-rex-700 dark:text-rex-400'
    }
  }

  const getStepNumberBadge = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-600 text-white'
      case 'blue': return 'bg-blue-600 text-white'
      case 'amber': return 'bg-amber-600 text-white'
      case 'purple': return 'bg-purple-600 text-white'
      case 'indigo': return 'bg-indigo-600 text-white'
      case 'rose': return 'bg-rose-600 text-white'
      default: return 'bg-rex-600 text-white'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-5xl h-[88vh] bg-surface border border-theme shadow-2xl flex flex-col rounded-none overflow-hidden text-primary animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-surface2 via-surface to-surface border-b border-theme flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rex-500/15 border border-rex-500/30 text-rex-600 dark:text-rex-400 flex items-center justify-center font-black text-sm shrink-0">
              ?
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-primary tracking-tight">Rex ERP Interactive Help & Workflow Guide</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-none bg-rex-500/10 text-rex-600 dark:text-rex-400 border border-rex-500/20 font-mono">
                  ACTIVE UI
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Visual lifecycle flowcharts, action guides & instructions for every screen
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
              className="p-1.5 text-muted hover:text-primary hover:bg-surface2 rounded-none border border-theme-subtle transition-colors"
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
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0">Module:</span>
            <select
              value={selectedGuideId}
              onChange={e => setSelectedGuideId(e.target.value)}
              className="bg-surface border border-theme-subtle px-2.5 py-1 text-xs font-semibold text-primary rounded-none outline-none focus:border-rex-500 max-w-sm truncate"
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
                className="text-[10px] font-semibold text-rex-600 dark:text-rex-400 underline hover:no-underline shrink-0"
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
              className="w-full bg-surface border border-theme-subtle rounded-none pl-8 pr-2.5 py-1 text-xs text-primary outline-none focus:border-rex-500 placeholder:text-muted"
            />
          </div>
        </div>

        {/* Guide Summary Banner */}
        <div className="px-5 py-3 bg-surface border-b border-theme-subtle shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-none bg-surface2 text-muted border border-theme-subtle">
                  {activeGuide.category}
                </span>
                <h3 className="text-base font-bold text-primary">{activeGuide.title}</h3>
              </div>
              <p className="text-xs text-secondary mt-1 max-w-3xl leading-relaxed">
                {activeGuide.summary}
              </p>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 shrink-0 border border-theme-subtle bg-surface2 p-0.5 rounded-none self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('workflow')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none ${
                  activeTab === 'workflow'
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                🗺️ Workflow Diagram
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none ${
                  activeTab === 'actions'
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                ⚡ Actions & Features ({activeGuide.actions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tips')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none ${
                  activeTab === 'tips'
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                💡 Guide & Tips ({activeGuide.tips.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faq')}
                className={`px-3 py-1 text-xs font-bold transition-all rounded-none ${
                  activeTab === 'faq'
                    ? 'bg-rex-600 text-white shadow-xs'
                    : 'text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                ❓ FAQ ({activeGuide.faq.length})
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-base/50">
          {/* TAB 1: VISUAL WORKFLOW DIAGRAM */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-surface border border-theme-subtle p-4 rounded-none">
                <div className="flex items-center justify-between mb-3 border-b border-theme-subtle pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Compass size={16} className="text-rex-500" />
                      {activeGuide.workflowDiagram.title}
                    </h4>
                    <p className="text-[11px] text-muted">{activeGuide.workflowDiagram.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted uppercase">
                    {activeGuide.workflowDiagram.steps.length} sequential steps
                  </span>
                </div>

                {/* Connected Flow Diagram Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative">
                  {activeGuide.workflowDiagram.steps.map((step, idx) => {
                    const colorStyle = getStepColorClass(step.color)
                    const numberBadge = getStepNumberBadge(step.color)

                    return (
                      <div
                        key={step.stepNumber}
                        className={`p-3.5 border relative rounded-none flex flex-col justify-between transition-all duration-150 hover:shadow-md ${colorStyle}`}
                      >
                        <div>
                          {/* Step Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono shrink-0 shadow-xs ${numberBadge}`}>
                                {step.stepNumber}
                              </span>
                              <h5 className="font-bold text-xs text-primary tracking-tight">{step.title}</h5>
                            </div>

                            {step.statusBadge && (
                              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-none bg-surface border border-theme-subtle uppercase">
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
                          <span className="font-medium text-muted flex items-center gap-1">
                            👤 {step.actor}
                          </span>

                          {step.nextSteps && step.nextSteps.length > 0 && (
                            <span className="font-bold font-mono text-rex-600 dark:text-rex-400 flex items-center gap-1">
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
                    <Layers size={14} className="text-rex-500" />
                    <span className="text-xs font-bold text-primary">Connected System Modules:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeGuide.relatedModules.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(m.route);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-surface2 hover:bg-rex-500/10 text-secondary hover:text-rex-600 border border-theme-subtle hover:border-rex-500/40 rounded-none transition-colors flex items-center gap-1"
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

          {/* TAB 2: ACTIONS & FEATURES GUIDE */}
          {activeTab === 'actions' && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                Every Action, Button & Menu Item in this Window:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeGuide.actions.map((act, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-surface border border-theme-subtle rounded-none space-y-2 hover:border-rex-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-primary font-mono flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
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

                    <div className="p-2 bg-surface2/60 border border-theme-subtle/50 rounded-none text-[11px] text-muted">
                      <strong className="text-primary font-semibold">How to do it: </strong>
                      {act.howTo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRO TIPS & PRACTICAL INSTRUCTIONS */}
          {activeTab === 'tips' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-surface border border-theme-subtle rounded-none space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  Best Practices & Workflow Guidelines
                </h4>
                <div className="space-y-2.5">
                  {activeGuide.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-secondary">
                      <span className="w-4 h-4 rounded-full bg-rex-500/10 text-rex-600 dark:text-rex-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {i + 1}
                      </span>
                      <p className="leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FREQUENTLY ASKED QUESTIONS */}
          {activeTab === 'faq' && (
            <div className="space-y-3 animate-fade-in">
              {activeGuide.faq.map((item, i) => (
                <div key={i} className="p-4 bg-surface border border-theme-subtle rounded-none space-y-1.5">
                  <h5 className="font-bold text-xs text-primary flex items-center gap-2">
                    <span className="text-rex-500 font-black">Q:</span>
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

        {/* Footer */}
        <div className="px-5 py-2.5 bg-surface2/40 border-t border-theme-subtle flex items-center justify-between text-[11px] text-muted shrink-0">
          <span>Keyboard Shortcut: Press <kbd className="px-1.5 py-0.5 bg-surface border border-theme-subtle rounded-none font-mono text-[10px]">?</kbd> or <kbd className="px-1.5 py-0.5 bg-surface border border-theme-subtle rounded-none font-mono text-[10px]">F1</kbd> to toggle help anywhere</span>
          <Button variant="primary" size="sm" onClick={onClose} className="h-6 text-xs px-3 rounded-none font-bold">
            Got it, Close Guide
          </Button>
        </div>
      </div>
    </div>
  )
}
